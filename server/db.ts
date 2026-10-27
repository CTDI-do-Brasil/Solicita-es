import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Configuração flexível: suporta DATABASE_URL completa ou variáveis separadas
const getPoolConfig = (): PoolConfig => {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : undefined,
    };
  }

  return {
    host: process.env.PGHOST || 'srv-captain--db-postgres',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 'nexus',
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
};

export const pool = new Pool(getPoolConfig());

pool.on('error', (err) => {
  console.error('[PostgreSQL] Erro inesperado no pool de conexões:', err);
});

export async function testConnection(): Promise<boolean> {
  try {
    const res = await pool.query('SELECT NOW() as current_time, current_database() as db_name');
    console.log(`[PostgreSQL] Conectado com sucesso ao banco "${res.rows[0].db_name}" em ${res.rows[0].current_time}`);
    return true;
  } catch (error: any) {
    console.warn(`[PostgreSQL] Não foi possível conectar ao banco de dados (${error.message}). Verifique as variáveis de ambiente em .env.`);
    return false;
  }
}
