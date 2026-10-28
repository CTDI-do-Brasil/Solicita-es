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
        host VARCHAR(255) NOT NULL DEFAULT 'mail.ctdibrasil.com.br',
        port INT NOT NULL DEFAULT 587,
        secure BOOLEAN NOT NULL DEFAULT false,
        user_account VARCHAR(255) NOT NULL DEFAULT 'nexus@ctdibrasil.com.br',
        pass_account VARCHAR(255) NOT NULL DEFAULT '',
        from_name VARCHAR(255) NOT NULL DEFAULT 'Nexus CTDI <nexus@ctdibrasil.com.br>',
        test_recipient VARCHAR(255) NOT NULL DEFAULT 'apongeluppi@ctdi.com',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE smtp_settings ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT true;
      ALTER TABLE smtp_settings ADD COLUMN IF NOT EXISTS host VARCHAR(255) NOT NULL DEFAULT 'mail.ctdibrasil.com.br';
      ALTER TABLE smtp_settings ADD COLUMN IF NOT EXISTS port INT NOT NULL DEFAULT 587;
      ALTER TABLE smtp_settings ADD COLUMN IF NOT EXISTS secure BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE smtp_settings ADD COLUMN IF NOT EXISTS user_account VARCHAR(255) NOT NULL DEFAULT 'nexus@ctdibrasil.com.br';
      ALTER TABLE smtp_settings ADD COLUMN IF NOT EXISTS pass_account VARCHAR(255) NOT NULL DEFAULT '';
      ALTER TABLE smtp_settings ADD COLUMN IF NOT EXISTS from_name VARCHAR(255) NOT NULL DEFAULT 'Nexus CTDI <nexus@ctdibrasil.com.br>';
      ALTER TABLE smtp_settings ADD COLUMN IF NOT EXISTS test_recipient VARCHAR(255) NOT NULL DEFAULT 'apongeluppi@ctdi.com';
      ALTER TABLE smtp_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    `);

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
