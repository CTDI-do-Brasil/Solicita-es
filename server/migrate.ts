import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool, testConnection } from './db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runAutoMigrations() {
  const isConnected = await testConnection();
  if (!isConnected) {
    console.log('[PostgreSQL] Conexão com o banco não disponível no momento. O servidor responderá, mas certifique-se de configurar as credenciais.');
    return;
  }

  try {
    let sqlPath = path.resolve(__dirname, '../database/init_nexus.sql');
    if (!fs.existsSync(sqlPath)) {
      sqlPath = path.resolve(__dirname, '../database/init_smartbuy.sql');
    }
    if (!fs.existsSync(sqlPath)) {
      console.warn('[PostgreSQL] Arquivo SQL não encontrado em:', sqlPath);
      return;
    }

    const sql = fs.readFileSync(sqlPath, 'utf-8');
    const dbName = process.env.PGDATABASE || 'nexus';
    console.log(`[PostgreSQL] Executando script DDL / Seed em ${dbName}...`);
    await pool.query(sql);

    // Garantir criação e integridade da tabela de configurações SMTP
    await pool.query(`
      CREATE TABLE IF NOT EXISTS smtp_settings (
        id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
        enabled BOOLEAN NOT NULL DEFAULT true,
        host VARCHAR(255) NOT NULL DEFAULT 'srv-captain--mail',
        port INT NOT NULL DEFAULT 25,
        secure BOOLEAN NOT NULL DEFAULT false,
        user_account VARCHAR(255) NOT NULL DEFAULT 'nexus@ctdibrasil.com.br',
        pass_account VARCHAR(255) NOT NULL DEFAULT '',
        from_name VARCHAR(255) NOT NULL DEFAULT 'Nexus CTDI <nexus@ctdibrasil.com.br>',
        test_recipient VARCHAR(255) NOT NULL DEFAULT 'apongeluppi@ctdi.com',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE smtp_settings ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT true;
      ALTER TABLE smtp_settings ADD COLUMN IF NOT EXISTS host VARCHAR(255) NOT NULL DEFAULT 'srv-captain--mail';
      ALTER TABLE smtp_settings ADD COLUMN IF NOT EXISTS port INT NOT NULL DEFAULT 25;
      ALTER TABLE smtp_settings ADD COLUMN IF NOT EXISTS secure BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE smtp_settings ADD COLUMN IF NOT EXISTS user_account VARCHAR(255) NOT NULL DEFAULT 'nexus@ctdibrasil.com.br';
      ALTER TABLE smtp_settings ADD COLUMN IF NOT EXISTS pass_account VARCHAR(255) NOT NULL DEFAULT '';
      ALTER TABLE smtp_settings ADD COLUMN IF NOT EXISTS from_name VARCHAR(255) NOT NULL DEFAULT 'Nexus CTDI <nexus@ctdibrasil.com.br>';
      ALTER TABLE smtp_settings ADD COLUMN IF NOT EXISTS test_recipient VARCHAR(255) NOT NULL DEFAULT 'apongeluppi@ctdi.com';
      ALTER TABLE smtp_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    `);

    // Sincronizar registro inicial com variáveis de ambiente do CapRover e corrigir seeds antigos que apontavam para mail.ctdibrasil.com.br:587
    const envHost = process.env.SMTP_HOST || 'srv-captain--mail';
    const envPort = parseInt(process.env.SMTP_PORT || '25', 10);
    const envSecure = process.env.SMTP_SECURE === 'true' || envPort === 465;
    const envUser = process.env.SMTP_USER || 'nexus@ctdibrasil.com.br';
    const envPass = process.env.SMTP_PASS || '';
    const envFrom = process.env.SMTP_FROM || 'Nexus CTDI <nexus@ctdibrasil.com.br>';
    const envTest = process.env.EMAIL_OVERRIDE_TO || 'apongeluppi@ctdi.com';

    await pool.query(
      `INSERT INTO smtp_settings (id, enabled, host, port, secure, user_account, pass_account, from_name, test_recipient, updated_at)
       VALUES ('default', true, $1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (id) DO UPDATE SET
         host = CASE WHEN smtp_settings.host = 'mail.ctdibrasil.com.br' AND smtp_settings.port = 587 THEN EXCLUDED.host ELSE smtp_settings.host END,
         port = CASE WHEN smtp_settings.host = 'mail.ctdibrasil.com.br' AND smtp_settings.port = 587 THEN EXCLUDED.port ELSE smtp_settings.port END,
         pass_account = CASE WHEN smtp_settings.pass_account = '' AND EXCLUDED.pass_account <> '' THEN EXCLUDED.pass_account ELSE smtp_settings.pass_account END,
         updated_at = NOW()`,
      [envHost, envPort, envSecure, envUser, envPass, envFrom, envTest]
    );

    console.log(`[PostgreSQL] Migração e estrutura inicial do banco ${dbName} validadas com sucesso!`);
  } catch (error: any) {
    console.error('[PostgreSQL] Erro ao executar migração automática:', error.message);
  }
}

if (process.argv[1] && (process.argv[1].includes('migrate') || process.argv[1] === fileURLToPath(import.meta.url))) {
  runAutoMigrations().then(() => {
    pool.end();
  });
}
