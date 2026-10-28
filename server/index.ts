import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import requestsRouter from './routes/requests';
import usersRouter from './routes/users';
import versionsRouter from './routes/versions';
import { pool, testConnection } from './db';
import { runAutoMigrations } from './migrate';
import { isSmtpConfigured, verifySmtpConnection, sendEmail } from './mailer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/api/health', async (_req, res) => {
  const dbConnected = await testConnection();
  res.json({
    status: 'ok',
    database: dbConnected ? 'connected' : 'disconnected',
    smtp: isSmtpConfigured() ? 'configured' : 'unconfigured',
    serverTime: new Date().toISOString(),
  });
});

// Verificação e Teste de Envio de E-mail
app.get('/api/mail/status', async (_req, res) => {
  const result = await verifySmtpConnection();
  res.json({
    configured: isSmtpConfigured(),
    ...result,
  });
});

app.post('/api/mail/test', async (req, res) => {
  const { to } = req.body;
  if (!to) {
    return res.status(400).json({ error: 'Campo "to" (destinatário) é obrigatório' });
  }

  const result = await verifySmtpConnection();
  if (!result.ok) {
    return res.status(400).json({
      error: 'Conexão SMTP não configurada ou falhou.',
      details: result.message,
    });
  }

  const success = await sendEmail({
    to,
    subject: '[Nexus CTDI] Teste de Disparo de E-mail Automático',
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #1E293B;">
        <h2 style="color: #2563EB;">Teste de Envio de E-mail - Nexus CTDI</h2>
        <p>Parabéns! O serviço de e-mail do Nexus foi configurado com sucesso e está comunicando perfeitamente com a plataforma de envio no CapRover.</p>
        <p style="font-size: 12px; color: #64748B;">Enviado em: ${new Date().toLocaleString('pt-BR')}</p>
      </div>
    `,
    text: 'Parabéns! O serviço de e-mail do Nexus está funcionando corretamente.',
  });

  res.json({
    success,
    message: success ? `E-mail de teste enviado para ${to}` : `Falha ao enviar e-mail para ${to}`,
  });
});

app.post('/api/mail/test-full-flow', async (_req, res) => {
  const result = await verifySmtpConnection();
  if (!result.ok) {
    return res.status(400).json({
      error: 'Conexão SMTP não configurada ou falhou.',
      details: result.message,
    });
  }

  const {
    notifyManagerNewRequest,
    notifyPurchasingManagerApproved,
    notifyCurrentApprover,
    notifyPurchasingFullyApproved,
    notifyRequestRejected,
  } = await import('./mailer');

  const mockRequest = {
    id: 'req-teste-full',
    code: 'S99999',
    title: 'Estação de Retrabalho BGA Avançada com Visão Computacional',
    description: 'Equipamento corporativo para manutenção e reparo de placas eletrônicas multilayer.',
    reason: 'Reposição de equipamento obsoleto para linha de produção da CTDI.',
    quantity: 1,
    unit: 'un',
    priority: 'alta',
    requesterId: 'user-colaborador-01',
    requesterName: 'Roberto Albuquerque (Analista de TI/Engenharia)',
    sector: 'TI',
    supplier: 'TecnoTools Equipamentos Industriais S/A',
    unitPrice: 35000,
    totalPrice: 35000,
    paymentTerms: 'Faturado 30/60/90 Dias',
    deliveryDeadline: '15 dias úteis',
    purchasedBy: 'Alexandre Fontes (Compras)',
    purchasingNotes: 'Fornecedor homologado com menor prazo de entrega e 2 anos de garantia.',
    items: [
      { name: 'Estação BGA OptiVision 4K', quantity: 1, unit: 'un', description: 'Visão óptica de alta precisão' },
      { name: 'Kit de Acessórios SMD', quantity: 5, unit: 'kit' },
    ],
  };

  try {
    // 1. Gestor
    await notifyManagerNewRequest(mockRequest);
    // 2. Compras
    await notifyPurchasingManagerApproved({
      ...mockRequest,
      managerApprovalStatus: 'aprovado',
      managerApprovedBy: 'Marcelo Santos (Gestor de TI)',
      managerNotes: 'Aprovado integralmente com prioridade alta.',
    });
    // 3. Aprovador Fernando
    await notifyCurrentApprover(mockRequest, 'Fernando');
    // 4. Aprovador Eduardo
    await notifyCurrentApprover(mockRequest, 'Eduardo');
    // 5. Aprovador Luiz
    await notifyCurrentApprover(mockRequest, 'Luiz');
    // 6. Compras 100% aprovado
    await notifyPurchasingFullyApproved(mockRequest);

    res.json({
      success: true,
      message: 'Todos os e-mails das etapas foram disparados com sucesso!',
      target: process.env.EMAIL_OVERRIDE_TO || 'Destinatários padrão',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Rotas de API
app.use('/api/requests', requestsRouter);
app.use('/api/users', usersRouter);
app.use('/api/versions', versionsRouter);

// Servir frontend compilado em ambiente de produção (CapRover / Docker)
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

app.get('*', (_req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).send('Nexus API Server is running. Frontend build not found.');
    }
  });
});

app.listen(PORT, async () => {
  console.log(`[Nexus Server] Servidor backend rodando na porta ${PORT}`);
  console.log(`[Nexus Server] Endpoint de Saúde: http://localhost:${PORT}/api/health`);
  
  // Tentar migração automática em segundo plano
  runAutoMigrations().catch((err) => {
    console.warn('[Nexus Server] Aviso ao verificar banco:', err.message);
  });
});

export default app;
