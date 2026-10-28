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
      host = 'mail.ctdibrasil.com.br',
      port = 587,
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
      [Boolean(enabled), host, parseInt(String(port), 10) || 587, Boolean(secure), user, finalPass, from, testRecipient]
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
      host: body.host || current.host || 'mail.ctdibrasil.com.br',
      port: parseInt(String(body.port || current.port || 587), 10),
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

    // Alerta caso a porta seja autenticada (587 ou 465) e não haja senha fornecida
    if ((testConfig.port === 587 || testConfig.port === 465) && (!testConfig.user || !testConfig.pass)) {
      return res.json({
        success: false,
        error: `Para a porta ${testConfig.port}, é obrigatório informar o Usuário e a Senha da conta do Poste.io. Digite a senha antes de testar.`,
      });
    }

    // 1. Testa a conexão e autenticação com o servidor SMTP
    const verifyResult = await verifySmtpConnection(testConfig);
    if (!verifyResult.ok) {
      return res.json({
        success: false,
        error: `Falha ao conectar ao servidor SMTP (${testConfig.host}:${testConfig.port}): ${verifyResult.message}`,
        details: verifyResult.details,
      });
    }

    // Se o teste detectou um container interno alternativo (ex: srv-captain--mail ou porta 25), utiliza ele
    if (verifyResult.activeHost) testConfig.host = verifyResult.activeHost;
    if (verifyResult.activePort) testConfig.port = verifyResult.activePort;

    // 2. Dispara e-mail de teste
    const emailSent = await sendEmail(
      {
        to: testConfig.testRecipient,
        subject: '[Nexus CTDI] Teste de Conexão SMTP Realizado com Sucesso!',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0;">
            <div style="background: linear-gradient(135deg, #002d5b 0%, #004b91 100%); padding: 24px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;">NEXUS CTDI</h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #93C5FD;">Teste de Conectividade do Servidor de E-mail (SMTP)</p>
            </div>
            
            <div style="padding: 24px; color: #1E293B; line-height: 1.6;">
              <div style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;">
                <p style="margin: 0; font-weight: bold; color: #065F46; font-size: 14px;">✅ Conexão Estabelecida com Sucesso!</p>
                <p style="margin: 4px 0 0 0; color: #047857; font-size: 13px;">O Nexus CTDI comunicou-se com sucesso com o servidor de e-mail e os disparos automáticos estão prontos para operar.</p>
              </div>

              <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 12px;">
                <tr style="border-bottom: 1px solid #F1F5F9;">
                  <td style="padding: 8px 0; color: #64748B; font-weight: 600; width: 140px;">Servidor SMTP:</td>
                  <td style="padding: 8px 0; color: #0F172A; font-family: monospace;">${testConfig.host}:${testConfig.port}</td>
                </tr>
                <tr style="border-bottom: 1px solid #F1F5F9;">
                  <td style="padding: 8px 0; color: #64748B; font-weight: 600;">Remetente (From):</td>
                  <td style="padding: 8px 0; color: #0F172A;">${testConfig.from}</td>
                </tr>
                <tr style="border-bottom: 1px solid #F1F5F9;">
                  <td style="padding: 8px 0; color: #64748B; font-weight: 600;">Conta Autenticada:</td>
                  <td style="padding: 8px 0; color: #0F172A; font-family: monospace;">${testConfig.user || '(Sem autenticação / relay interno)'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748B; font-weight: 600;">Data do Teste:</td>
                  <td style="padding: 8px 0; color: #0F172A;">${new Date().toLocaleString('pt-BR')}</td>
                </tr>
              </table>
            </div>

            <div style="background-color: #F8FAFC; padding: 14px 24px; text-align: center; border-top: 1px solid #E2E8F0; font-size: 11px; color: #64748B;">
              Nexus CTDI — Sistema de Gestão de Suprimentos & Solicitações Corporativas
            </div>
          </div>
        `,
        text: `Teste de Conexão SMTP Nexus CTDI realizado com sucesso em ${testConfig.host}:${testConfig.port}.`,
      },
      testConfig
    );

    if (!emailSent) {
      return res.json({
        success: false,
        error: `Conexão SMTP validada, mas a entrega do e-mail de teste para ${testConfig.testRecipient} falhou. Verifique se o endereço é permitido pelo servidor.`,
      });
    }

    res.json({
      success: true,
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
