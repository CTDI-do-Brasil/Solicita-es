import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { pool } from './db';
import dotenv from 'dotenv';

dotenv.config();

// Configurações do SMTP a partir do .env (valores padrão otimizados para CapRover / Poste.io)
const SMTP_HOST = process.env.SMTP_HOST || 'srv-captain--mail';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '25', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || 'nexus@ctdibrasil.com.br';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || `"Nexus CTDI" <${SMTP_USER || 'nexus@ctdibrasil.com.br'}>`;
const APP_URL = process.env.APP_URL || 'https://nexus.ctdibrasil.com.br';
const EMAIL_COMPRAS_FALLBACK = process.env.EMAIL_COMPRAS || '';
const EMAIL_OVERRIDE_TO = process.env.EMAIL_OVERRIDE_TO || '';

export interface SmtpConfig {
  id?: string;
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  testRecipient: string;
}

let cachedConfig: SmtpConfig | null = null;
let transporter: Transporter | null = null;

export async function getActiveSmtpConfig(forceReload = false): Promise<SmtpConfig> {
  if (cachedConfig && !forceReload) {
    return cachedConfig;
  }

  // Tentar carregar as configurações salvas na tabela smtp_settings do PostgreSQL
  try {
    const res = await pool.query('SELECT * FROM smtp_settings WHERE id = $1 LIMIT 1', ['default']);
    if (res.rows && res.rows.length > 0) {
      const row = res.rows[0];
      const dbHost = row.host || SMTP_HOST;
      const dbPort = parseInt(row.port || String(SMTP_PORT), 10);

      // Se o banco estava com o seed antigo (mail.ctdibrasil.com.br:587) que sofre timeout no Haraka, ajusta para a porta 25 / .env
      const isLegacySeed = dbHost === 'mail.ctdibrasil.com.br' && dbPort === 587;

      cachedConfig = {
        enabled: row.enabled ?? true,
        host: isLegacySeed ? SMTP_HOST : dbHost,
        port: isLegacySeed ? SMTP_PORT : dbPort,
        secure: isLegacySeed ? false : Boolean(row.secure),
        user: row.user_account || SMTP_USER,
        pass: row.pass_account || SMTP_PASS,
        from: row.from_name || SMTP_FROM,
        testRecipient: row.test_recipient || EMAIL_OVERRIDE_TO || 'apongeluppi@ctdi.com',
      };
      return cachedConfig;
    }
  } catch (err: any) {
    // Se tabela ainda não existir ou banco inacessível no momento, usa fallback
  }

  cachedConfig = {
    enabled: process.env.SMTP_ENABLED !== 'false',
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    user: SMTP_USER,
    pass: SMTP_PASS,
    from: SMTP_FROM,
    testRecipient: EMAIL_OVERRIDE_TO || 'apongeluppi@ctdi.com',
  };
  return cachedConfig;
}

export function resetTransporterCache() {
  if (transporter) {
    try {
      transporter.close();
    } catch {
      // ignora erro ao fechar pool antigo
    }
  }
  cachedConfig = null;
  transporter = null;
}

export function createTransporterForConfig(cfg: SmtpConfig): Transporter {
  const isPort25 = cfg.port === 25;
  const transportConfig: any = {
    pool: true,
    maxConnections: 1,
    maxMessages: 100,
    name: 'nexus.ctdibrasil.com.br',
    host: cfg.host,
    port: cfg.port,
    secure: !isPort25 && (cfg.secure || cfg.port === 465),
    connectionTimeout: 20000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    tls: {
      rejectUnauthorized: false, // Compatibilidade com certificados internos do CapRover
    },
  };

  if (isPort25 || process.env.SMTP_IGNORE_TLS === 'true') {
    transportConfig.ignoreTLS = true;
  } else if (cfg.user && cfg.pass) {
    transportConfig.auth = {
      user: cfg.user,
      pass: cfg.pass,
    };
  }

  return nodemailer.createTransport(transportConfig);
}

export function isSmtpConfigured(): boolean {
  if (cachedConfig) {
    return Boolean(cachedConfig.host && (cachedConfig.port === 25 || cachedConfig.user));
  }
  return Boolean(SMTP_HOST && (SMTP_PORT === 25 || SMTP_USER));
}

export function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  if (!cachedConfig) {
    cachedConfig = {
      enabled: process.env.SMTP_ENABLED !== 'false',
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      user: SMTP_USER,
      pass: SMTP_PASS,
      from: SMTP_FROM,
      testRecipient: EMAIL_OVERRIDE_TO || 'apongeluppi@ctdi.com',
    };
  }
  if (!cachedConfig.host) return null;
  transporter = createTransporterForConfig(cachedConfig);
  return transporter;
}

// Verificação de conexão com o servidor SMTP
export async function verifySmtpConnection(customConfig?: SmtpConfig): Promise<{ ok: boolean; message: string; details?: any; activeHost?: string; activePort?: number }> {
  const cfg = customConfig || await getActiveSmtpConfig();
  if (!cfg.host) {
    return {
      ok: false,
      message: 'SMTP não configurado. Preencha o campo Host / Servidor SMTP.',
    };
  }

  const client = (!customConfig && transporter) ? transporter : createTransporterForConfig(cfg);

  try {
    await client.verify();
    if (!customConfig) {
      transporter = client;
    }
    return { 
      ok: true, 
      message: `Conexão SMTP com ${cfg.host}:${cfg.port} estabelecida com sucesso!`,
      activeHost: cfg.host,
      activePort: cfg.port,
    };
  } catch (error: any) {
    console.error(`[Nexus Mailer] Erro ao verificar conexão SMTP (${cfg.host}:${cfg.port}):`, error.message);

    // Tenta candidatos alternativos na porta 25 (funciona tanto dentro do CapRover via srv-captain--mail quanto externamente via mail.ctdibrasil.com.br)
    const candidates = [
      { host: cfg.host, port: 25 },
      { host: 'srv-captain--mail', port: 25 },
      { host: 'mail.ctdibrasil.com.br', port: 25 },
      { host: 'srv-captain--mailserver', port: 25 },
    ];

    const seen = new Set<string>();
    for (const cand of candidates) {
      const key = `${cand.host}:${cand.port}`;
      if (seen.has(key)) continue;
      seen.add(key);

      try {
        console.log(`[Nexus Mailer] Tentando rota SMTP direta em ${cand.host}:${cand.port}...`);
        const fbTransport = nodemailer.createTransport({
          pool: true,
          maxConnections: 1,
          maxMessages: 100,
          name: 'nexus.ctdibrasil.com.br',
          host: cand.host,
          port: cand.port,
          secure: false,
          ignoreTLS: true,
          connectionTimeout: 20000,
          greetingTimeout: 15000,
          socketTimeout: 30000,
          tls: { rejectUnauthorized: false },
        });
        await fbTransport.verify();
        console.log(`[Nexus Mailer] Rota SMTP ${cand.host}:${cand.port} CONECTADA COM SUCESSO!`);
        if (!customConfig) {
          transporter = fbTransport;
          if (cachedConfig) {
            cachedConfig.host = cand.host;
            cachedConfig.port = cand.port;
            cachedConfig.secure = false;
          }
        }
        return {
          ok: true,
          message: `Conexão SMTP estabelecida com sucesso (${cand.host}:${cand.port})!`,
          activeHost: cand.host,
          activePort: cand.port,
        };
      } catch {
        // Continua testando o próximo candidato
      }
    }

    return {
      ok: false,
      message: `Erro ao conectar ao SMTP (${cfg.host}:${cfg.port}): ${error.message}`,
      details: {
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        user: cfg.user,
        error: error.message,
        code: error.code,
        command: error.command,
      },
    };
  }
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h1|h2|h3)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&bull;/gi, '•')
    .replace(/&rarr;/gi, '->')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(
  { to, subject, html, text }: SendEmailParams,
  customConfig?: SmtpConfig
): Promise<boolean> {
  const cfg = customConfig || await getActiveSmtpConfig();

  if (!cfg.enabled) {
    console.log('[Nexus Mailer] Disparo externo de e-mails desabilitado nas configurações SMTP.');
    return false;
  }

  const originalRecipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (originalRecipients.length === 0) {
    console.warn('[Nexus Mailer] Nenhum destinatário especificado para o e-mail:', subject);
    return false;
  }

  // Modo de teste / homologação: redireciona todos os e-mails para o destinatário configurado mantendo o layout original intacto
  const overrideTarget = process.env.EMAIL_OVERRIDE_TO || cfg.testRecipient;
  const isSameAsOverride =
    originalRecipients.length === 1 &&
    overrideTarget &&
    originalRecipients[0].toLowerCase().trim() === overrideTarget.toLowerCase().trim();
  const isOverride = Boolean(overrideTarget) && !isSameAsOverride;
  const recipients = overrideTarget ? [overrideTarget] : originalRecipients;

  const finalSubject = subject;
  const finalHtml = html;
  const finalText = text || htmlToPlainText(finalHtml) || finalSubject;

  const rawFrom = cfg.from || SMTP_FROM;
  const formattedFrom = rawFrom.includes('<') && !rawFrom.startsWith('"')
    ? `"${rawFrom.split('<')[0].trim()}" <${rawFrom.split('<')[1]}`
    : rawFrom;

  const mailOptions = {
    from: formattedFrom,
    to: recipients.join(', '),
    subject: finalSubject,
    html: finalHtml,
    text: finalText,
    messageId: `<nexus-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@ctdibrasil.com.br>`,
  };

  let client = customConfig ? createTransporterForConfig(cfg) : getTransporter();
  if (!client) {
    client = createTransporterForConfig(cfg);
    if (!customConfig) transporter = client;
  }

  try {
    const info = await client.sendMail(mailOptions);
    console.log(`[Nexus Mailer] E-mail enviado com sucesso! ID: ${info.messageId} | Resp: ${info.response} | Para: ${recipients.join(', ')}${isOverride ? ` (Original: ${originalRecipients.join(', ')})` : ''}`);
    return true;
  } catch (error: any) {
    console.warn(`[Nexus Mailer] Primeira tentativa falhou (${cfg.host}:${cfg.port} - ${error.message}). Tentando rota alternativa na porta 25...`);
    try {
      const verifyRes = await verifySmtpConnection(customConfig);
      if (verifyRes.ok && verifyRes.activeHost && verifyRes.activePort) {
        const fallbackCfg: SmtpConfig = {
          ...cfg,
          host: verifyRes.activeHost,
          port: verifyRes.activePort,
          secure: false,
        };
        const fbClient = (!customConfig && transporter) ? transporter : createTransporterForConfig(fallbackCfg);
        if (!customConfig) transporter = fbClient;
        const retryInfo = await fbClient.sendMail(mailOptions);
        console.log(`[Nexus Mailer] E-mail enviado via fallback (${fallbackCfg.host}:${fallbackCfg.port})! ID: ${retryInfo.messageId} | Para: ${recipients.join(', ')}`);
        return true;
      }
    } catch (retryErr: any) {
      console.error(`[Nexus Mailer] Falha definitiva ao enviar e-mail para ${recipients.join(', ')}:`, retryErr.message);
    }
    return false;
  }
}

// Helpers de formatação
function formatCurrency(val?: number): string {
  if (val === undefined || val === null || isNaN(val)) return 'R$ 0,00';
  return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Layout Base de E-mail HTML 100% Compatível com Microsoft Outlook Desktop (Word Engine), Gmail e Webmail
function buildEmailTemplate(params: {
  headerTitle: string;
  headerSubtitle: string;
  badgeText: string;
  badgeBgColor?: string;
  badgeTextColor?: string;
  buttonBgColor?: string;
  requestTitle: string;
  requestCode: string;
  itemsHtml: string;
  detailsHtml: string;
  actionText: string;
  actionUrl: string;
  observationsHtml?: string;
}): string {
  const badgeBg = params.badgeBgColor || '#3B82F6';
  const badgeColor = params.badgeTextColor || '#FFFFFF';
  const buttonBg = params.buttonBgColor || '#2563EB';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.headerTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#F1F5F9" style="background-color: #F1F5F9;">
    <tr>
      <td align="center" style="padding: 30px 10px;">
        <!-- Container Principal -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" bgcolor="#FFFFFF" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden;">
          
          <!-- Cabeçalho Azul Escuro (Compatível com Outlook Desktop via bgcolor="#1E3A8A") -->
          <tr>
            <td bgcolor="#1E3A8A" style="background-color: #1E3A8A; background-image: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%); padding: 28px 30px; text-align: left;">
              <div style="font-size: 11px; font-weight: 700; color: #93C5FD; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; font-family: 'Segoe UI', Arial, sans-serif;">
                NEXUS CTDI
              </div>
              <h1 style="margin: 0; font-size: 21px; font-weight: 800; color: #FFFFFF; line-height: 1.3; font-family: 'Segoe UI', Arial, sans-serif;">
                ${params.headerTitle}
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #DBEAFE; line-height: 1.4; font-family: 'Segoe UI', Arial, sans-serif;">
                ${params.headerSubtitle}
              </p>
            </td>
          </tr>

          <!-- Corpo do E-mail -->
          <tr>
            <td bgcolor="#FFFFFF" style="background-color: #FFFFFF; padding: 26px 30px;">
              
              <!-- Linha de Código (Esquerda) e Badge de Status (Direita) em Tabela 2 Colunas para Outlook -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-bottom: 1px solid #E2E8F0; margin-bottom: 18px;">
                <tr>
                  <td align="left" valign="middle" style="padding-bottom: 14px; font-size: 18px; font-weight: 800; color: #0F172A; font-family: 'Segoe UI', Arial, sans-serif;">
                    ${params.requestCode}
                  </td>
                  <td align="right" valign="middle" style="padding-bottom: 14px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td bgcolor="${badgeBg}" style="background-color: ${badgeBg}; color: ${badgeColor}; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; font-family: 'Segoe UI', Arial, sans-serif;">
                          ${params.badgeText}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Título da Solicitação em Tabela para fundo sólido no Outlook -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 18px;">
                <tr>
                  <td bgcolor="#F8FAFC" style="background-color: #F8FAFC; border-left: 4px solid #2563EB; padding: 12px 16px; border-radius: 0 6px 6px 0;">
                    <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: #64748B; margin-bottom: 4px; font-family: 'Segoe UI', Arial, sans-serif;">
                      Título da Solicitação
                    </div>
                    <div style="font-size: 15px; font-weight: 700; color: #0F172A; font-family: 'Segoe UI', Arial, sans-serif;">
                      ${params.requestTitle}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Tabela de Detalhes -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 18px; font-size: 13px; line-height: 1.5; font-family: 'Segoe UI', Arial, sans-serif;">
                ${params.detailsHtml}
              </table>

              <!-- Seção de Itens / Cotação se houver -->
              ${params.itemsHtml}

              <!-- Observações adicionais se houver -->
              ${params.observationsHtml || ''}

              <!-- Botão de Ação (Tabela com bgcolor e padding na <td> para renderização perfeita no Outlook Desktop) -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 24px auto 10px auto;">
                <tr>
                  <td align="center" bgcolor="${buttonBg}" style="background-color: ${buttonBg}; border-radius: 8px; padding: 12px 28px;">
                    <a href="${params.actionUrl}" target="_blank" style="color: #FFFFFF; font-size: 13px; font-weight: 700; text-decoration: none; display: inline-block; font-family: 'Segoe UI', Arial, sans-serif;">
                      ${params.actionText} &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <div style="text-align: center; font-size: 11px; color: #94A3B8; margin-bottom: 6px; font-family: 'Segoe UI', Arial, sans-serif;">
                Link direto: <a href="${params.actionUrl}" target="_blank" style="color: #2563EB; text-decoration: underline;">${params.actionUrl}</a>
              </div>

            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td bgcolor="#F8FAFC" style="background-color: #F8FAFC; padding: 18px 30px; border-top: 1px solid #E2E8F0; text-align: center; font-size: 11px; color: #64748B; font-family: 'Segoe UI', Arial, sans-serif;">
              <p style="margin: 0 0 4px 0; font-weight: 700; color: #334155;">
                Nexus &bull; Sistema Integrado de Compras e Suprimentos
              </p>
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">
                Mensagem gerada automaticamente pela CTDI Brasil. Não responda a este e-mail.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ==============================================================================
// CONSULTAS DE DESTINATÁRIOS NO BANCO DE DADOS
// ==============================================================================

// Busca e-mails dos Gestores do Setor
export async function getManagerEmailsBySector(sector: string): Promise<string[]> {
  try {
    const res = await pool.query(
      "SELECT email FROM users WHERE sector = $1 AND role = 'gestor'",
      [sector]
    );
    const emails = res.rows.map((r: any) => r.email).filter(Boolean);
    if (emails.length > 0) return emails;
  } catch (err: any) {
    console.error('[Nexus Mailer] Erro ao consultar gestores do setor:', err.message);
  }

  // Fallback se não houver gestor cadastrado no banco ainda (ou em modo de teste)
  const cfg = await getActiveSmtpConfig();
  if (EMAIL_OVERRIDE_TO || cfg.testRecipient) {
    return [`gestor.${sector.toLowerCase().replace(/\s+/g, '')}@ctdibrasil.com.br`];
  }
  return [];
}

// Busca e-mails de todos os usuários do Setor de Compras
export async function getPurchasingEmails(): Promise<string[]> {
  try {
    const res = await pool.query(
      "SELECT email FROM users WHERE role = 'compras' OR sector = 'Compras'"
    );
    const emails = res.rows.map((r: any) => r.email).filter(Boolean);
    if (emails.length > 0) return emails;
  } catch (err: any) {
    console.error('[Nexus Mailer] Erro ao consultar usuários de compras:', err.message);
  }

  if (EMAIL_COMPRAS_FALLBACK) {
    return [EMAIL_COMPRAS_FALLBACK];
  }
  const cfg = await getActiveSmtpConfig();
  if (EMAIL_OVERRIDE_TO || cfg.testRecipient) {
    return ['compras@ctdibrasil.com.br'];
  }
  return [];
}

// Busca e-mail do aprovador específico (Fernando, Eduardo ou Luiz)
export async function getApproverEmailByName(approverName: string): Promise<string[]> {
  try {
    const namePattern = `%${approverName.toLowerCase()}%`;
    const res = await pool.query(
      "SELECT email FROM users WHERE role = 'aprovador' AND LOWER(name) LIKE $1",
      [namePattern]
    );
    const emails = res.rows.map((r: any) => r.email).filter(Boolean);
    if (emails.length > 0) return emails;
  } catch (err: any) {
    console.error(`[Nexus Mailer] Erro ao consultar aprovador ${approverName}:`, err.message);
  }

  // Fallback por variável de ambiente se não encontrado no banco
  const envKey = `EMAIL_APROVADOR_${approverName.toUpperCase()}`;
  const fallback = process.env[envKey];
  if (fallback) return [fallback];

  const cfg = await getActiveSmtpConfig();
  if (EMAIL_OVERRIDE_TO || cfg.testRecipient) {
    return [`${approverName.toLowerCase()}.aprovador@ctdibrasil.com.br`];
  }
  return [];
}

// Busca e-mail do solicitante original
export async function getRequesterEmail(requesterId?: string): Promise<string | null> {
  if (!requesterId) return null;
  try {
    const res = await pool.query('SELECT email FROM users WHERE id = $1', [requesterId]);
    return res.rows[0]?.email || null;
  } catch {
    return null;
  }
}

// ==============================================================================
// GATILHOS DO WORKFLOW DE DISPARO
// ==============================================================================

/**
 * GATILHO 1: Colaborador solicita -> Gestor do setor recebe e-mail de aviso
 */
export async function notifyManagerNewRequest(request: any): Promise<boolean> {
  const gestorEmails = await getManagerEmailsBySector(request.sector);
  if (gestorEmails.length === 0) {
    console.warn(`[Nexus Mailer] Nenhum gestor cadastrado para o setor "${request.sector}".`);
    return false;
  }

  const itemsList = Array.isArray(request.items) && request.items.length > 0
    ? request.items.map((it: any) => `<li style="margin-bottom: 4px;"><strong>${it.name || 'Item'}</strong> &bull; Qtd: ${it.quantity} ${it.unit || 'un'} ${it.description ? `- <em>${it.description}</em>` : ''}</li>`).join('')
    : `<li style="margin-bottom: 4px;">${request.title} &bull; Qtd: ${request.quantity || 1} ${request.unit || 'un'}</li>`;

  const detailsHtml = `
    <tr>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #64748B; width: 150px; font-weight: 600;">Código:</td>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #0F172A; font-weight: 700;">${request.code}</td>
    </tr>
    <tr>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #64748B; font-weight: 600;">Setor da Área:</td>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #1D4ED8; font-weight: 600;">${request.sector}</td>
    </tr>
    <tr>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #64748B; font-weight: 600;">Colaborador Solicitante:</td>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #0F172A; font-weight: 600;">${request.requesterName}</td>
    </tr>
    <tr>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #64748B; font-weight: 600;">Prioridade:</td>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #B45309; text-transform: uppercase; font-weight: 700;">${request.priority || 'Média'}</td>
    </tr>
    ${request.reason ? `
    <tr>
      <td style="padding: 7px 0; color: #64748B; font-weight: 600;">Justificativa:</td>
      <td style="padding: 7px 0; color: #334155;">${request.reason}</td>
    </tr>
    ` : ''}
  `;

  const itemsHtml = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 10px; margin-bottom: 16px;">
      <tr>
        <td bgcolor="#F8FAFC" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 18px;">
          <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: #64748B; margin-bottom: 8px; font-family: 'Segoe UI', Arial, sans-serif;">
            Itens Solicitados
          </div>
          <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #334155; line-height: 1.6; font-family: 'Segoe UI', Arial, sans-serif;">
            ${itemsList}
          </ul>
        </td>
      </tr>
    </table>
  `;

  const html = buildEmailTemplate({
    headerTitle: 'Nova Solicitação de Compra',
    headerSubtitle: `Um colaborador do setor de ${request.sector} abriu uma nova solicitação e aguarda sua aprovação.`,
    badgeText: 'Aguardando Parecer do Gestor',
    badgeBgColor: '#FBBF24',
    badgeTextColor: '#0F172A',
    buttonBgColor: '#2563EB',
    requestCode: request.code,
    requestTitle: request.title,
    detailsHtml,
    itemsHtml,
    actionText: 'Acessar e Avaliar Solicitação',
    actionUrl: `${APP_URL}`,
  });

  return await sendEmail({
    to: gestorEmails,
    subject: `[Nexus] Nova Solicitação de Compra ${request.code} - Setor ${request.sector}`,
    html,
  });
}

/**
 * GATILHO 2: Gestor aprova -> Compras recebe e-mail de aviso
 */
export async function notifyPurchasingManagerApproved(request: any): Promise<boolean> {
  const purchasingEmails = await getPurchasingEmails();
  if (purchasingEmails.length === 0) {
    console.warn('[Nexus Mailer] Nenhum usuário de compras encontrado para notificação.');
    return false;
  }

  const itemsList = Array.isArray(request.items) && request.items.length > 0
    ? request.items.map((it: any) => `<li style="margin-bottom: 4px;"><strong>${it.name || 'Item'}</strong> &bull; Qtd: ${it.quantity} ${it.unit || 'un'}</li>`).join('')
    : `<li style="margin-bottom: 4px;">${request.title} &bull; Qtd: ${request.quantity || 1} ${request.unit || 'un'}</li>`;

  const detailsHtml = `
    <tr>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #64748B; width: 150px; font-weight: 600;">Código:</td>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #0F172A; font-weight: 700;">${request.code}</td>
    </tr>
    <tr>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #64748B; font-weight: 600;">Setor Requisitante:</td>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #0F172A; font-weight: 600;">${request.sector}</td>
    </tr>
    <tr>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #64748B; font-weight: 600;">Solicitante:</td>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #334155;">${request.requesterName}</td>
    </tr>
    <tr>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #64748B; font-weight: 600;">Aprovado pelo Gestor:</td>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #059669; font-weight: 700;">${request.managerApprovedBy || 'Gestor do Setor'}</td>
    </tr>
    ${request.managerNotes ? `
    <tr>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #64748B; font-weight: 600;">Parecer do Gestor:</td>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #475569; font-style: italic;">"${request.managerNotes}"</td>
    </tr>
    ` : ''}
    <tr>
      <td style="padding: 7px 0; color: #64748B; font-weight: 600;">Prioridade:</td>
      <td style="padding: 7px 0; color: #DC2626; text-transform: uppercase; font-weight: 700;">${request.priority || 'Média'}</td>
    </tr>
  `;

  const itemsHtml = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 10px; margin-bottom: 16px;">
      <tr>
        <td bgcolor="#F8FAFC" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 18px;">
          <div style="font-size: 10px; text-transform: uppercase; font-weight: 700; color: #64748B; margin-bottom: 8px; font-family: 'Segoe UI', Arial, sans-serif;">
            Itens Solicitados
          </div>
          <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #334155; line-height: 1.6; font-family: 'Segoe UI', Arial, sans-serif;">
            ${itemsList}
          </ul>
        </td>
      </tr>
    </table>
  `;

  const html = buildEmailTemplate({
    headerTitle: 'Solicitação Aprovada pelo Gestor',
    headerSubtitle: `A gerência de ${request.sector} aprovou a solicitação.`,
    badgeText: 'Aguardando Cotação',
    badgeBgColor: '#FACC15',
    badgeTextColor: '#0F172A',
    buttonBgColor: '#0284C7',
    requestCode: request.code,
    requestTitle: request.title,
    detailsHtml,
    itemsHtml,
    actionText: 'Iniciar Cotação em Compras',
    actionUrl: `${APP_URL}`,
  });

  return await sendEmail({
    to: purchasingEmails,
    subject: `[Nexus] Solicitação Aprovada ${request.code} - Pronta para Cotação (${request.sector})`,
    html,
  });
}

/**
 * GATILHO 3: Compras faz a solicitação / avança esteira -> Aprovadores recebem e-mail na sua vez
 * (Opção A: Fernando -> Eduardo -> Luiz)
 */
export async function notifyCurrentApprover(request: any, approverName: string): Promise<boolean> {
  const approverEmails = await getApproverEmailByName(approverName);
  if (approverEmails.length === 0) {
    console.warn(`[Nexus Mailer] Nenhum e-mail encontrado para o aprovador ${approverName}.`);
    return false;
  }

  const orderLabel =
    approverName === 'Fernando' ? '1º Aprovador' :
    approverName === 'Eduardo' ? '2º Aprovador' :
    '3º Aprovador';

  const detailsHtml = `
    <tr>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #64748B; width: 150px; font-weight: 600;">Código:</td>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #0F172A; font-weight: 700;">${request.code}</td>
    </tr>
    <tr>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #64748B; font-weight: 600;">Setor:</td>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #0F172A; font-weight: 600;">${request.sector}</td>
    </tr>
    <tr>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #64748B; font-weight: 600;">Fornecedor Selecionado:</td>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #0F172A; font-weight: 700;">${request.supplier || 'Definido na Cotação'}</td>
    </tr>
    <tr>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #64748B; font-weight: 600;">Valor Total Cotado:</td>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #059669; font-size: 15px; font-weight: 800;">${formatCurrency(request.totalPrice)}</td>
    </tr>
    ${request.paymentTerms ? `
    <tr>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #64748B; font-weight: 600;">Condição de Pagamento:</td>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #0F172A; font-weight: 500;">${request.paymentTerms}</td>
    </tr>
    ` : ''}
    ${request.deliveryDeadline ? `
    <tr>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #64748B; font-weight: 600;">Prazo de Entrega:</td>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #334155;">${request.deliveryDeadline}</td>
    </tr>
    ` : ''}
    <tr>
      <td style="padding: 7px 0; color: #64748B; font-weight: 600;">Comprador Responsável:</td>
      <td style="padding: 7px 0; color: #334155;">${request.purchasedBy || 'Setor de Compras'}</td>
    </tr>
  `;

  const html = buildEmailTemplate({
    headerTitle: `Solicitação para sua Aprovação (${approverName})`,
    headerSubtitle: 'O Setor de Compras formalizou a proposta comercial e o pedido aguarda sua análise executiva.',
    badgeText: `Aguardando ${orderLabel} (${approverName})`,
    badgeBgColor: '#9333EA',
    badgeTextColor: '#FFFFFF',
    buttonBgColor: '#9333EA',
    requestCode: request.code,
    requestTitle: request.title,
    detailsHtml,
    itemsHtml: '',
    actionText: 'Avaliar e Aprovar no Nexus',
    actionUrl: `${APP_URL}`,
    observationsHtml: request.purchasingNotes ? `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 10px; margin-bottom: 16px;">
        <tr>
          <td bgcolor="#F8FAFC" style="background-color: #F8FAFC; border-left: 4px solid #9333EA; padding: 12px 16px; font-size: 12px; color: #334155; font-family: 'Segoe UI', Arial, sans-serif;">
            <strong>Observação:</strong> ${request.purchasingNotes}
          </td>
        </tr>
      </table>
    ` : undefined,
  });

  return await sendEmail({
    to: approverEmails,
    subject: `[Nexus] Pedido para Aprovação de Diretoria ${request.code} - ${approverName}`,
    html,
  });
}

/**
 * GATILHO 4: Aprovadores aprovam (100% concluído) -> Compras recebe e-mail de aviso
 */
export async function notifyPurchasingFullyApproved(request: any): Promise<boolean> {
  const purchasingEmails = await getPurchasingEmails();
  if (purchasingEmails.length === 0) {
    console.warn('[Nexus Mailer] Nenhum e-mail de compras encontrado para notificação final.');
    return false;
  }

  const detailsHtml = `
    <tr>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #64748B; width: 150px; font-weight: 600;">Código:</td>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #0F172A; font-weight: 700;">${request.code}</td>
    </tr>
    <tr>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #64748B; font-weight: 600;">Setor Solicitante:</td>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #0F172A; font-weight: 600;">${request.sector}</td>
    </tr>
    <tr>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #64748B; font-weight: 600;">Fornecedor Homologado:</td>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #0F172A; font-weight: 700;">${request.supplier || '-'}</td>
    </tr>
    <tr>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #64748B; font-weight: 600;">Valor Aprovado:</td>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #059669; font-size: 16px; font-weight: 800;">${formatCurrency(request.totalPrice)}</td>
    </tr>
    <tr>
      <td style="padding: 7px 0; color: #64748B; font-weight: 600;">Aprovado por:</td>
      <td style="padding: 7px 0; color: #0F172A; font-weight: 700;">Fernando Silva, Eduardo Costa e Luiz Carlos (100%)</td>
    </tr>
  `;

  const html = buildEmailTemplate({
    headerTitle: 'Pedido 100% Aprovado pela Diretoria!',
    headerSubtitle: 'A cadeia de aprovação executiva foi concluída com sucesso. O pedido está liberado para compra.',
    badgeText: '100% Aprovado - Liberado',
    badgeBgColor: '#059669',
    badgeTextColor: '#FFFFFF',
    buttonBgColor: '#059669',
    requestCode: request.code,
    requestTitle: request.title,
    detailsHtml,
    itemsHtml: '',
    actionText: 'Emitir Pedido e Finalizar Compra',
    actionUrl: `${APP_URL}`,
  });

  return await sendEmail({
    to: purchasingEmails,
    subject: `[Nexus] Pedido 100% APROVADO ${request.code} - Liberado para Emissão de Compra`,
    html,
  });
}

/**
 * Notificação em caso de reprovação (Gestor ou Aprovadores)
 */
export async function notifyRequestRejected(request: any, rejectedBy: string, reason: string): Promise<boolean> {
  const recipients: string[] = [];
  
  // Avisar o solicitante
  const requesterEmail = await getRequesterEmail(request.requesterId);
  if (requesterEmail) recipients.push(requesterEmail);

  // Avisar Compras também caso tenha sido reprovado na alçada de aprovadores
  if (request.purchaseStatus === 'reprovado_aprovadores') {
    const purchasingEmails = await getPurchasingEmails();
    recipients.push(...purchasingEmails);
  }

  if (recipients.length === 0) return false;

  const detailsHtml = `
    <tr>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #64748B; width: 150px; font-weight: 600;">Código:</td>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #0F172A; font-weight: 700;">${request.code}</td>
    </tr>
    <tr>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #64748B; font-weight: 600;">Setor:</td>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #0F172A;">${request.sector}</td>
    </tr>
    <tr>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #64748B; font-weight: 600;">Reprovado por:</td>
      <td style="padding: 7px 0; border-bottom: 1px solid #F1F5F9; color: #DC2626; font-weight: 700;">${rejectedBy}</td>
    </tr>
    <tr>
      <td style="padding: 7px 0; color: #64748B; font-weight: 600;">Motivo:</td>
      <td style="padding: 7px 0; color: #DC2626; font-style: italic;">"${reason}"</td>
    </tr>
  `;

  const html = buildEmailTemplate({
    headerTitle: 'Solicitação de Compra Reprovada',
    headerSubtitle: 'A solicitação não foi aprovada na etapa atual de avaliação.',
    badgeText: 'Reprovado',
    badgeBgColor: '#DC2626',
    badgeTextColor: '#FFFFFF',
    buttonBgColor: '#DC2626',
    requestCode: request.code,
    requestTitle: request.title,
    detailsHtml,
    itemsHtml: '',
    actionText: 'Ver Detalhes no Nexus',
    actionUrl: `${APP_URL}`,
  });

  return await sendEmail({
    to: recipients,
    subject: `[Nexus] Solicitação Reprovada ${request.code} - ${request.title}`,
    html,
  });
}
