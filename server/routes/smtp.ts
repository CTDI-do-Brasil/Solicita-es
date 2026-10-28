import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { 
  getActiveSmtpConfig, 
  resetTransporterCache, 
  verifySmtpConnection, 
  sendEmail, 
  SmtpConfig 
} from '../mailer';

const router = Router();

// Garantir cabeçalho Content-Type: application/json em todas as respostas da rota
router.use((_req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// GET /api/smtp-config - Retorna a configuração atual do SMTP
router.get('/', async (_req: Request, res: Response) => {
  try {
    const config = await getActiveSmtpConfig(true);
    res.json({
      enabled: config.enabled,
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.user,
      hasPassword: Boolean(config.pass),
      from: config.from,
      testRecipient: config.testRecipient,
    });
  } catch (error: any) {
    console.error('[SMTP Config] Erro ao carregar configurações:', error.message);
    res.status(500).json({ error: 'Erro ao buscar configurações SMTP', details: error.message });
  }
});

// POST /api/smtp-config - Salva as configurações de SMTP no PostgreSQL
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      enabled = true,
      host = 'srv-captain--mail',
      port = 25,
      secure = false,
      user = '',
      pass = '',
      from = 'Nexus CTDI <nexus@ctdibrasil.com.br>',
      testRecipient = 'apongeluppi@ctdi.com',
    } = req.body;

    // Se o usuário não enviou nova senha, busca a senha atual para manter
    let finalPass = pass;
    if (!finalPass) {
      const current = await getActiveSmtpConfig();
      finalPass = current.pass;
    }

    await pool.query(
      `INSERT INTO smtp_settings (id, enabled, host, port, secure, user_account, pass_account, from_name, test_recipient, updated_at)
       VALUES ('default', $1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (id) DO UPDATE SET
         enabled = EXCLUDED.enabled,
         host = EXCLUDED.host,
         port = EXCLUDED.port,
         secure = EXCLUDED.secure,
         user_account = EXCLUDED.user_account,
         pass_account = EXCLUDED.pass_account,
         from_name = EXCLUDED.from_name,
         test_recipient = EXCLUDED.test_recipient,
         updated_at = NOW()`,
      [Boolean(enabled), host, parseInt(String(port), 10) || 25, Boolean(secure), user, finalPass, from, testRecipient]
    );

    // Invalida cache de transporte do Nodemailer para usar as novas configurações
    resetTransporterCache();

    console.log(`[SMTP Config] Configurações SMTP salvas com sucesso no banco: Host ${host}:${port}, De: ${from}`);

    res.json({
      success: true,
      message: 'Configurações do Servidor SMTP salvas com sucesso no banco de dados!',
    });
  } catch (error: any) {
    console.error('[SMTP Config] Erro ao salvar configurações:', error.message);
    res.status(500).json({ error: 'Erro ao salvar configurações SMTP no banco de dados', details: error.message });
  }
});

// POST /api/smtp-config/test - Testa a conexão SMTP e envia um e-mail de teste
router.post('/test', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const current = await getActiveSmtpConfig();

    const testConfig: SmtpConfig = {
      enabled: true,
      host: body.host || current.host || 'srv-captain--mail',
      port: parseInt(String(body.port || current.port || 25), 10),
      secure: body.secure !== undefined ? Boolean(body.secure) : current.secure,
      user: body.user !== undefined ? body.user : current.user,
      pass: body.pass !== undefined && body.pass !== '' ? body.pass : current.pass,
      from: body.from || current.from || 'Nexus CTDI <nexus@ctdibrasil.com.br>',
      testRecipient: body.testRecipient || current.testRecipient || 'apongeluppi@ctdi.com',
    };

    if (!testConfig.testRecipient) {
      return res.json({
        success: false,
        error: 'Informe o E-mail Destinatário de Teste para prosseguir com a verificação.',
      });
    }

    if (!testConfig.host) {
      return res.json({
        success: false,
        error: 'Informe o Host / Servidor SMTP.',
      });
    }

    // 1. Testa a conexão com o servidor SMTP (com fallback automático para porta 25 se 587 dar timeout)
    const verifyResult = await verifySmtpConnection(testConfig);
    if (!verifyResult.ok) {
      return res.json({
        success: false,
        error: `Falha ao conectar ao servidor SMTP (${testConfig.host}:${testConfig.port}): ${verifyResult.message}`,
        details: verifyResult.details,
      });
    }

    // Se o teste detectou um container/porta ativa (ex: srv-captain--mail:25 ou mail.ctdibrasil.com.br:25), utiliza ela
    if (verifyResult.activeHost) testConfig.host = verifyResult.activeHost;
    if (verifyResult.activePort) testConfig.port = verifyResult.activePort;

    // 2. Dispara e-mail de teste (formato limpo compatível com filtros corporativos Microsoft 365 / EOP)
    const sentTimestamp = new Date().toLocaleString('pt-BR');
    const emailSent = await sendEmail(
      {
        to: testConfig.testRecipient,
        subject: `[Nexus CTDI] Teste de Conexao SMTP (${new Date().toLocaleTimeString('pt-BR')})`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #1E293B;">
            <h2 style="color: #2563EB;">Teste de Conexão SMTP - Nexus CTDI</h2>
            <p>Parabéns! O serviço de e-mail do Nexus foi configurado com sucesso e está comunicando perfeitamente com o servidor de disparo no CapRover.</p>
            <p style="font-size: 12px; color: #64748B;">Enviado em: ${sentTimestamp} | Porta ativa: ${testConfig.port}</p>
          </div>
        `,
        text: `Teste de Conexão SMTP - Nexus CTDI. O serviço de e-mail foi configurado com sucesso. Enviado em: ${sentTimestamp}.`,
      },
      testConfig
    );

    if (!emailSent) {
      return res.json({
        success: false,
        error: `Conexão SMTP validada, mas a entrega do e-mail de teste para ${testConfig.testRecipient} falhou. Verifique se o endereço é permitido pelo servidor.`,
      });
    }

    // Salva automaticamente a rota validada no banco para garantir funcionamento imediato
    try {
      await pool.query(
        `INSERT INTO smtp_settings (id, enabled, host, port, secure, user_account, pass_account, from_name, test_recipient, updated_at)
         VALUES ('default', $1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (id) DO UPDATE SET
           enabled = EXCLUDED.enabled,
           host = EXCLUDED.host,
           port = EXCLUDED.port,
           secure = EXCLUDED.secure,
           user_account = EXCLUDED.user_account,
           pass_account = EXCLUDED.pass_account,
           from_name = EXCLUDED.from_name,
           test_recipient = EXCLUDED.test_recipient,
           updated_at = NOW()`,
        [true, testConfig.host, testConfig.port, testConfig.secure, testConfig.user, testConfig.pass, testConfig.from, testConfig.testRecipient]
      );
      resetTransporterCache();
    } catch {
      // Ignora erro silenciosamente caso o banco não esteja acessível no momento
    }

    res.json({
      success: true,
      activeHost: testConfig.host,
      activePort: testConfig.port,
      message: `Conexão com servidor ${testConfig.host}:${testConfig.port} confirmada e e-mail de teste entregue para ${testConfig.testRecipient}!`,
    });
  } catch (error: any) {
    console.error('[SMTP Config] Erro ao testar SMTP:', error.message);
    res.json({
      success: false,
      error: `Erro durante o teste de SMTP: ${error.message}`,
    });
  }
});

export default router;
