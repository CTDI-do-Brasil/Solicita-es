import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { pool } from './db';
import dotenv from 'dotenv';

dotenv.config();

// Configurações do SMTP a partir do .env (valores padrão)
const SMTP_HOST = process.env.SMTP_HOST || 'mail.ctdibrasil.com.br';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || '';
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
      cachedConfig = {
        enabled: row.enabled ?? true,
        host: row.host || SMTP_HOST,
        port: parseInt(row.port || String(SMTP_PORT), 10),
        secure: Boolean(row.secure),
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
  cachedConfig = null;
  transporter = null;
}

export function createTransporterForConfig(cfg: SmtpConfig): Transporter {
  const transportConfig: any = {
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure || cfg.port === 465,
    connectionTimeout: 10000,
    greetingTimeout: 8000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: false, // Compatibilidade com certificados internos do CapRover
    },
  };

  if (cfg.user && cfg.pass) {
    transportConfig.auth = {
      user: cfg.user,
      pass: cfg.pass,
    };
  }

  if (cfg.port === 25 || process.env.SMTP_IGNORE_TLS === 'true') {
    transportConfig.ignoreTLS = true;
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

  const client = createTransporterForConfig(cfg);

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

    // Se falhou por autenticação na porta 25 (rede interna Docker), tenta testar modo relay sem auth
    if (cfg.port === 25 && (error.code === 'EAUTH' || error.responseCode === 535 || error.message?.includes('AUTH'))) {
      try {
        console.log('[Nexus Mailer] Tentando fallback para relay interno sem autenticação na porta 25...');
        const noAuthTransport = nodemailer.createTransport({
          host: cfg.host,
          port: 25,
          secure: false,
          ignoreTLS: true,
          connectionTimeout: 10000,
          greetingTimeout: 8000,
          socketTimeout: 15000,
        });
        await noAuthTransport.verify();
        if (!customConfig) {
          transporter = noAuthTransport;
        }
        return { 
          ok: true, 
          message: 'Conexão SMTP estabelecida com sucesso (modo relay interno sem autenticação na porta 25)!',
          activeHost: cfg.host,
          activePort: 25,
        };
      } catch (innerErr: any) {
        console.error('[Nexus Mailer] Fallback sem auth também falhou:', innerErr.message);
      }
    }

    // Se falhou por timeout ou erro de rede (comum no CapRover quando se tenta host externo em vez de container interno)
    const isNetworkError = error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.message?.includes('Timeout');
    if (isNetworkError) {
      const candidates = [
        { host: 'srv-captain--mail', port: 25 },
        { host: 'srv-captain--mailserver', port: 25 },
        { host: 'mail.ctdibrasil.com.br', port: 25 },
        { host: 'srv-captain--mail', port: 587 },
        { host: 'srv-captain--mailserver', port: 587 },
      ];

      for (const cand of candidates) {
        if (cand.host === cfg.host && cand.port === cfg.port) continue;
        try {
          console.log(`[Nexus Mailer] Tentando fallback automático para container interno ${cand.host}:${cand.port}...`);
          const fbConfig: any = {
            host: cand.host,
            port: cand.port,
            secure: false,
            ignoreTLS: true,
            connectionTimeout: 5000,
            greetingTimeout: 4000,
            socketTimeout: 8000,
            tls: { rejectUnauthorized: false },
          };
          if (cand.port !== 25 && cfg.user && cfg.pass) {
            fbConfig.auth = { user: cfg.user, pass: cfg.pass };
          }
          const fbTransport = nodemailer.createTransport(fbConfig);
          await fbTransport.verify();
          console.log(`[Nexus Mailer] Fallback automático para ${cand.host}:${cand.port} CONECTADO COM SUCESSO!`);
          if (!customConfig) {
            transporter = fbTransport;
          }
          return {
            ok: true,
            message: `Conexão SMTP estabelecida com sucesso via rede interna do CapRover (${cand.host}:${cand.port})!`,
            activeHost: cand.host,
            activePort: cand.port,
          };
        } catch {
          // Continua testando o próximo candidato
        }
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

  // Modo de teste / homologação: redireciona todos os e-mails para o destinatário configurado
  const overrideTarget = process.env.EMAIL_OVERRIDE_TO || cfg.testRecipient;
  const isOverride = Boolean(overrideTarget);
  const recipients = isOverride ? [overrideTarget] : originalRecipients;

  let finalSubject = subject;
  let finalHtml = html;

  if (isOverride) {
    finalSubject = `[TESTE -> ${originalRecipients.join(', ')}] ${subject}`;
    const testBanner = `
      <div style="background-color: #FEF3C7; border: 2px dashed #F59E0B; padding: 12px 16px; margin: 0 0 20px 0; border-radius: 8px; font-family: sans-serif; font-size: 13px; color: #92400E; text-align: left;">
        <div style="font-weight: 800; color: #B45309; text-transform: uppercase; font-size: 12px; margin-bottom: 4px;">
          ⚠️ MODO DE HOMOLOGAÇÃO / TESTE ATIVO
        </div>
        <div><strong>Destinatário(s) que receberia(m) em Produção:</strong> <span style="color: #1E3A8A; font-weight: bold;">${originalRecipients.join(', ')}</span></div>
        <div style="font-size: 11px; color: #78350F; margin-top: 4px;">Redirecionado para <code>${overrideTarget}</code> conforme configurações SMTP do sistema.</div>
      </div>
    `;
    finalHtml = html.replace('<!-- Título da Solicitação -->', `${testBanner}\n              <!-- Título da Solicitação -->`);
  }

  let client = customConfig ? createTransporterForConfig(cfg) : getTransporter();
  if (!client) {
    client = createTransporterForConfig(cfg);
    if (!customConfig) transporter = client;
  }

  try {
    const info = await client.sendMail({
      from: cfg.from || SMTP_FROM,
      to: recipients.join(', '),
      subject: finalSubject,
      html: finalHtml,
      text: text || finalSubject,
    });
    console.log(`[Nexus Mailer] E-mail enviado com sucesso! ID: ${info.messageId} | Para: ${recipients.join(', ')}${isOverride ? ` (Original: ${originalRecipients.join(', ')})` : ''}`);
    return true;
  } catch (error: any) {
    console.error(`[Nexus Mailer] Falha ao enviar e-mail para ${recipients.join(', ')}:`, error.message);
    return false;
  }
}

// Helpers de formatação
function formatCurrency(val?: number): string {
  if (val === undefined || val === null || isNaN(val)) return 'R$ 0,00';
  return Number(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Layout Base de E-mail HTML Responsivo
function buildEmailTemplate(params: {
  headerTitle: string;
  headerSubtitle: string;
  badgeText: string;
  badgeBgColor?: string;
  badgeTextColor?: string;
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

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.headerTitle}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Container Principal -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);">
          
          <!-- Cabeçalho -->
          <tr>
            <td style="background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%); padding: 32px 30px; text-align: left;">
              <div style="font-size: 13px; font-weight: 700; color: #93C5FD; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                NEXUS CTDI
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #FFFFFF; line-height: 1.3;">
                ${params.headerTitle}
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 14px; color: #DBEAFE;">
                ${params.headerSubtitle}
              </p>
            </td>
          </tr>

          <!-- Corpo do E-mail -->
          <tr>
            <td style="padding: 28px 30px;">
              
              <!-- Badge de Status e Código -->
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid #E2E8F0; padding-bottom: 16px;">
                <span style="font-size: 18px; font-weight: 800; color: #1E293B;">
                  ${params.requestCode}
                </span>
                <span style="display: inline-block; padding: 6px 14px; background-color: ${badgeBg}; color: ${badgeColor}; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${params.badgeText}
                </span>
              </div>

              <!-- Título da Solicitação -->
              <div style="background-color: #F8FAFC; border-left: 4px solid #2563EB; border-radius: 6px; padding: 14px 18px; margin-bottom: 22px;">
                <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748B; margin-bottom: 4px;">
                  Título da Solicitação
                </div>
                <div style="font-size: 15px; font-weight: 700; color: #0F172A;">
                  ${params.requestTitle}
                </div>
              </div>

              <!-- Tabela de Detalhes -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 22px; font-size: 13px; line-height: 1.6;">
                ${params.detailsHtml}
              </table>

              <!-- Seção de Itens / Cotação se houver -->
              ${params.itemsHtml}

              <!-- Observações adicionais se houver -->
              ${params.observationsHtml || ''}

              <!-- Botão de Ação -->
              <div style="text-align: center; margin: 32px 0 16px 0;">
                <a href="${params.actionUrl}" target="_blank" style="display: inline-block; background-color: #2563EB; color: #FFFFFF; font-weight: 700; font-size: 14px; padding: 14px 28px; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);">
                  ${params.actionText} &rarr;
                </a>
              </div>

              <div style="text-align: center; font-size: 11px; color: #94A3B8; margin-top: 8px;">
                Link direto: <a href="${params.actionUrl}" style="color: #2563EB; text-decoration: underline;">${params.actionUrl}</a>
              </div>

            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 20px 30px; border-top: 1px solid #E2E8F0; text-align: center; font-size: 12px; color: #64748B;">
              <p style="margin: 0 0 6px 0; font-weight: 600; color: #475569;">
                Nexus CTDI
              </p>
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">
                Este é um e-mail automático gerado pela plataforma Nexus da CTDI Brasil. Por favor, não responda diretamente a esta mensagem.
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
  if (EMAIL_OVERRIDE_TO) {
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
  if (EMAIL_OVERRIDE_TO) {
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

  if (EMAIL_OVERRIDE_TO) {
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
export async function notifyManagerNewRequest(request: any) {
  const gestorEmails = await getManagerEmailsBySector(request.sector);
  if (gestorEmails.length === 0) {
    console.warn(`[Nexus Mailer] Nenhum gestor cadastrado para o setor "${request.sector}".`);
    return;
  }

  const itemsList = Array.isArray(request.items) && request.items.length > 0
    ? request.items.map((it: any) => `<li><strong>${it.name || 'Item'}</strong> &bull; Qtd: ${it.quantity} ${it.unit || 'un'} ${it.description ? `- <em>${it.description}</em>` : ''}</li>`).join('')
    : `<li>${request.title} &bull; Qtd: ${request.quantity || 1} ${request.unit || 'un'}</li>`;

  const detailsHtml = `
    <tr>
      <td style="padding: 6px 0; color: #64748B; width: 140px; font-weight: 600;">Código:</td>
      <td style="padding: 6px 0; color: #0F172A; font-weight: 700;">${request.code}</td>
    </tr>
    <tr>
      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Setor:</td>
      <td style="padding: 6px 0; color: #0F172A;">${request.sector}</td>
    </tr>
    <tr>
      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Solicitante:</td>
      <td style="padding: 6px 0; color: #0F172A; font-weight: 600;">${request.requesterName}</td>
    </tr>
    <tr>
      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Prioridade:</td>
      <td style="padding: 6px 0; color: #0F172A; text-transform: uppercase; font-weight: 700;">${request.priority || 'Média'}</td>
    </tr>
    ${request.reason ? `
    <tr>
      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Justificativa:</td>
      <td style="padding: 6px 0; color: #0F172A;">${request.reason}</td>
    </tr>
    ` : ''}
  `;

  const itemsHtml = `
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 18px; margin-top: 14px;">
      <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748B; margin-bottom: 8px;">
        Itens da Solicitação
      </div>
      <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155; line-height: 1.6;">
        ${itemsList}
      </ul>
    </div>
  `;

  const html = buildEmailTemplate({
    headerTitle: 'Nova Solicitação de Compra',
    headerSubtitle: `Um colaborador do setor de ${request.sector} abriu uma nova solicitação e aguarda sua aprovação.`,
    badgeText: 'Aguardando Aprovação do Gestor',
    badgeBgColor: '#EAB308',
    badgeTextColor: '#000000',
    requestCode: request.code,
    requestTitle: request.title,
    detailsHtml,
    itemsHtml,
    actionText: 'Acessar e Avaliar Solicitação',
    actionUrl: `${APP_URL}`,
  });

  await sendEmail({
    to: gestorEmails,
    subject: `[Nexus] Nova Solicitação de Compra ${request.code} - Setor ${request.sector}`,
    html,
  });
}

/**
 * GATILHO 2: Gestor aprova -> Compras recebe e-mail de aviso
 */
export async function notifyPurchasingManagerApproved(request: any) {
  const purchasingEmails = await getPurchasingEmails();
  if (purchasingEmails.length === 0) {
    console.warn('[Nexus Mailer] Nenhum usuário de compras encontrado para notificação.');
    return;
  }

  const itemsList = Array.isArray(request.items) && request.items.length > 0
    ? request.items.map((it: any) => `<li><strong>${it.name || 'Item'}</strong> &bull; Qtd: ${it.quantity} ${it.unit || 'un'}</li>`).join('')
    : `<li>${request.title} &bull; Qtd: ${request.quantity || 1} ${request.unit || 'un'}</li>`;

  const detailsHtml = `
    <tr>
      <td style="padding: 6px 0; color: #64748B; width: 140px; font-weight: 600;">Código:</td>
      <td style="padding: 6px 0; color: #0F172A; font-weight: 700;">${request.code}</td>
    </tr>
    <tr>
      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Setor Requisitante:</td>
      <td style="padding: 6px 0; color: #0F172A;">${request.sector}</td>
    </tr>
    <tr>
      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Solicitante:</td>
      <td style="padding: 6px 0; color: #0F172A;">${request.requesterName}</td>
    </tr>
    <tr>
      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Aprovado por:</td>
      <td style="padding: 6px 0; color: #16A34A; font-weight: 700;">${request.managerApprovedBy || 'Gestor do Setor'}</td>
    </tr>
    ${request.managerNotes ? `
    <tr>
      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Parecer do Gestor:</td>
      <td style="padding: 6px 0; color: #0F172A; font-style: italic;">"${request.managerNotes}"</td>
    </tr>
    ` : ''}
    <tr>
      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Prioridade:</td>
      <td style="padding: 6px 0; color: #0F172A; text-transform: uppercase; font-weight: 700;">${request.priority || 'Média'}</td>
    </tr>
  `;

  const itemsHtml = `
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 18px; margin-top: 14px;">
      <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748B; margin-bottom: 8px;">
        Itens a Cotar
      </div>
      <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155; line-height: 1.6;">
        ${itemsList}
      </ul>
    </div>
  `;

  const html = buildEmailTemplate({
    headerTitle: 'Solicitação Aprovada pelo Gestor',
    headerSubtitle: `A solicitação foi aprovada pela gerência do setor de ${request.sector}.`,
    badgeText: 'Recebido em Compras',
    badgeBgColor: '#0284C7',
    badgeTextColor: '#FFFFFF',
    requestCode: request.code,
    requestTitle: request.title,
    detailsHtml,
    itemsHtml,
    actionText: 'Iniciar Cotação em Compras',
    actionUrl: `${APP_URL}`,
  });

  await sendEmail({
    to: purchasingEmails,
    subject: `[Nexus] Solicitação Aprovada ${request.code} - Pronta para Cotação (${request.sector})`,
    html,
  });
}

/**
 * GATILHO 3: Compras faz a solicitação / avança esteira -> Aprovadores recebem e-mail na sua vez
 * (Opção A: Fernando -> Eduardo -> Luiz)
 */
export async function notifyCurrentApprover(request: any, approverName: string) {
  const approverEmails = await getApproverEmailByName(approverName);
  if (approverEmails.length === 0) {
    console.warn(`[Nexus Mailer] Nenhum e-mail encontrado para o aprovador ${approverName}.`);
    return;
  }

  const roleText = 
    approverName === 'Fernando' ? '1º Aprovador (Suprimentos / Operações)' :
    approverName === 'Eduardo' ? '2º Aprovador (Financeiro / Controladoria)' :
    '3º Aprovador (Diretoria Executiva / CEO)';

  const detailsHtml = `
    <tr>
      <td style="padding: 6px 0; color: #64748B; width: 140px; font-weight: 600;">Código:</td>
      <td style="padding: 6px 0; color: #0F172A; font-weight: 700;">${request.code}</td>
    </tr>
    <tr>
      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Setor:</td>
      <td style="padding: 6px 0; color: #0F172A;">${request.sector}</td>
    </tr>
    <tr>
      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Fornecedor:</td>
      <td style="padding: 6px 0; color: #0F172A; font-weight: 700;">${request.supplier || 'Definido na Cotação'}</td>
    </tr>
    <tr>
      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Valor Total:</td>
      <td style="padding: 6px 0; color: #047857; font-size: 16px; font-weight: 800;">${formatCurrency(request.totalPrice)}</td>
    </tr>
    ${request.paymentTerms ? `
    <tr>
      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Prazo Pagamento:</td>
      <td style="padding: 6px 0; color: #0F172A;">${request.paymentTerms}</td>
    </tr>
    ` : ''}
    ${request.deliveryDeadline ? `
    <tr>
      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Prazo Entrega:</td>
      <td style="padding: 6px 0; color: #0F172A;">${request.deliveryDeadline}</td>
    </tr>
    ` : ''}
    <tr>
      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Comprador:</td>
      <td style="padding: 6px 0; color: #0F172A;">${request.purchasedBy || 'Setor de Compras'}</td>
    </tr>
  `;

  const html = buildEmailTemplate({
    headerTitle: `Solicitação para sua Aprovação (${approverName})`,
    headerSubtitle: `O Setor de Compras formalizou a proposta comercial e a solicitação aguarda sua aprovação como ${roleText}.`,
    badgeText: `Aguardando Parecer: ${approverName}`,
    badgeBgColor: '#7C3AED',
    badgeTextColor: '#FFFFFF',
    requestCode: request.code,
    requestTitle: request.title,
    detailsHtml,
    itemsHtml: '',
    actionText: 'Avaliar e Aprovar no Nexus',
    actionUrl: `${APP_URL}`,
    observationsHtml: request.purchasingNotes ? `
      <div style="background-color: #F8FAFC; border-left: 3px solid #7C3AED; padding: 10px 14px; margin-top: 14px; font-size: 12px; color: #475569;">
        <strong>Observações de Compras:</strong> ${request.purchasingNotes}
      </div>
    ` : undefined,
  });

  await sendEmail({
    to: approverEmails,
    subject: `[Nexus] Pedido para Aprovação de Diretoria ${request.code} - ${approverName}`,
    html,
  });
}

/**
 * GATILHO 4: Aprovadores aprovam (100% concluído) -> Compras recebe e-mail de aviso
 */
export async function notifyPurchasingFullyApproved(request: any) {
  const purchasingEmails = await getPurchasingEmails();
  if (purchasingEmails.length === 0) {
    console.warn('[Nexus Mailer] Nenhum e-mail de compras encontrado para notificação final.');
    return;
  }

  const detailsHtml = `
    <tr>
      <td style="padding: 6px 0; color: #64748B; width: 140px; font-weight: 600;">Código:</td>
      <td style="padding: 6px 0; color: #0F172A; font-weight: 700;">${request.code}</td>
    </tr>
    <tr>
      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Setor Solicitante:</td>
      <td style="padding: 6px 0; color: #0F172A;">${request.sector}</td>
    </tr>
    <tr>
      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Fornecedor:</td>
      <td style="padding: 6px 0; color: #0F172A; font-weight: 700;">${request.supplier || '-'}</td>
    </tr>
    <tr>
      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Valor Total Aprovado:</td>
      <td style="padding: 6px 0; color: #16A34A; font-size: 17px; font-weight: 800;">${formatCurrency(request.totalPrice)}</td>
    </tr>
    <tr>
      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Aprovado por:</td>
      <td style="padding: 6px 0; color: #0F172A; font-weight: 700;">Fernando Silva, Eduardo Costa e Luiz Carlos</td>
    </tr>
  `;

  const html = buildEmailTemplate({
    headerTitle: 'Pedido 100% Aprovado pela Diretoria!',
    headerSubtitle: 'A cadeia de aprovação executiva foi concluída com sucesso. O pedido está liberado para emissão e compra.',
    badgeText: '100% Aprovado - Liberado',
    badgeBgColor: '#16A34A',
    badgeTextColor: '#FFFFFF',
    requestCode: request.code,
    requestTitle: request.title,
    detailsHtml,
    itemsHtml: '',
    actionText: 'Emitir Pedido e Finalizar Compra',
    actionUrl: `${APP_URL}`,
  });

  await sendEmail({
    to: purchasingEmails,
    subject: `[Nexus] Pedido 100% APROVADO ${request.code} - Liberado para Emissão de Compra`,
    html,
  });
}

/**
 * Notificação em caso de reprovação (Gestor ou Aprovadores)
 */
export async function notifyRequestRejected(request: any, rejectedBy: string, reason: string) {
  const recipients: string[] = [];
  
  // Avisar o solicitante
  const requesterEmail = await getRequesterEmail(request.requesterId);
  if (requesterEmail) recipients.push(requesterEmail);

  // Avisar Compras também caso tenha sido reprovado na alçada de aprovadores
  if (request.purchaseStatus === 'reprovado_aprovadores') {
    const purchasingEmails = await getPurchasingEmails();
    recipients.push(...purchasingEmails);
  }

  if (recipients.length === 0) return;

  const detailsHtml = `
    <tr>
      <td style="padding: 6px 0; color: #64748B; width: 140px; font-weight: 600;">Código:</td>
      <td style="padding: 6px 0; color: #0F172A; font-weight: 700;">${request.code}</td>
    </tr>
    <tr>
      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Setor:</td>
      <td style="padding: 6px 0; color: #0F172A;">${request.sector}</td>
    </tr>
    <tr>
      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Reprovado por:</td>
      <td style="padding: 6px 0; color: #DC2626; font-weight: 700;">${rejectedBy}</td>
    </tr>
    <tr>
      <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Motivo:</td>
      <td style="padding: 6px 0; color: #DC2626; font-style: italic;">"${reason}"</td>
    </tr>
  `;

  const html = buildEmailTemplate({
    headerTitle: 'Solicitação de Compra Reprovada',
    headerSubtitle: 'A solicitação não foi aprovada na etapa atual de avaliação.',
    badgeText: 'Reprovado',
    badgeBgColor: '#DC2626',
    badgeTextColor: '#FFFFFF',
    requestCode: request.code,
    requestTitle: request.title,
    detailsHtml,
    itemsHtml: '',
    actionText: 'Ver Detalhes no Nexus',
    actionUrl: `${APP_URL}`,
  });

  await sendEmail({
    to: recipients,
    subject: `[Nexus] Solicitação Reprovada ${request.code} - ${request.title}`,
    html,
  });
}
