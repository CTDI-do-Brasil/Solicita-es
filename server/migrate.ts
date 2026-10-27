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
