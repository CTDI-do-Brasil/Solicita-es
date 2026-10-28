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

      -- Desacopla constraint estrita de chave estrangeira para permitir que requisições salvem mesmo se o usuário ainda não tiver sido sincronizado
      ALTER TABLE purchase_requests DROP CONSTRAINT IF EXISTS purchase_requests_requester_id_fkey;
    `);

    // Inserir usuários padrão (Gestores dos Setores, Compras e Aprovadores) no banco para que as consultas de e-mail e papéis funcionem perfeitamente
    const seedUsers = [
      { id: 'user-master-dev', name: 'Desenvolvedor Master', email: 'dev@empresa.com', role: 'master', sector: 'TI', position: 'Desenvolvedor & Administrador' },
      { id: 'user-gestor-prod', name: 'Carlos Alberto Silveira', email: 'carlos.producao@ctdibrasil.com.br', role: 'gestor', sector: 'Produção', position: 'Gerente de Produção' },
      { id: 'user-gestor-ti', name: 'Lucas Barreto', email: 'lucas.ti@ctdibrasil.com.br', role: 'gestor', sector: 'TI', position: 'Gerente de TI' },
      { id: 'user-gestor-fin', name: 'Roberto Vianna', email: 'roberto.financeiro@ctdibrasil.com.br', role: 'gestor', sector: 'Financeiro', position: 'Gerente Financeiro' },
      { id: 'user-gestor-rh', name: 'Fernanda Nogueira', email: 'fernanda.rh@ctdibrasil.com.br', role: 'gestor', sector: 'RH', position: 'Gerente de RH' },
      { id: 'user-gestor-adm', name: 'Helena Matos', email: 'helena.adm@ctdibrasil.com.br', role: 'gestor', sector: 'Administrativo', position: 'Gerente Administrativa' },
      { id: 'user-gestor-eng', name: 'Patrícia Albuquerque', email: 'patricia.engenharia@ctdibrasil.com.br', role: 'gestor', sector: 'Engenharia', position: 'Gerente de Engenharia' },
      { id: 'user-gestor-fisc', name: 'Mariana Duarte', email: 'mariana.fiscal@ctdibrasil.com.br', role: 'gestor', sector: 'Fiscal', position: 'Gerente Fiscal' },
      { id: 'user-gestor-ehs', name: 'Eduardo Guimarães', email: 'eduardo.ehs@ctdibrasil.com.br', role: 'gestor', sector: 'EHS', position: 'Gerente de EHS' },
      { id: 'user-gestor-manut', name: 'Marcos Aurélio', email: 'marcos.manutencao@ctdibrasil.com.br', role: 'gestor', sector: 'Manutenção', position: 'Gerente de Manutenção' },
      // Setor de Compras
      { id: 'user-compras-coord', name: 'Alexandre Fontes', email: 'alexandre.compras@ctdibrasil.com.br', role: 'gestor', sector: 'Compras', position: 'Coordenador de Compras' },
      { id: 'user-compras-buyer', name: 'Juliana Paes', email: 'compras@ctdibrasil.com.br', role: 'compras', sector: 'Compras', position: 'Compradora Corporativa' },
      // Aprovadores
      { id: 'user-aprovador-fernando', name: 'Fernando Silva', email: 'fernando.aprovador@ctdibrasil.com.br', role: 'aprovador', sector: 'Compras', position: '1º Aprovador - Suprimentos' },
      { id: 'user-aprovador-eduardo', name: 'Eduardo Costa', email: 'eduardo.aprovador@ctdibrasil.com.br', role: 'aprovador', sector: 'Financeiro', position: '2º Aprovador - Financeiro' },
      { id: 'user-aprovador-luiz', name: 'Luiz Carlos', email: 'luiz.aprovador@ctdibrasil.com.br', role: 'aprovador', sector: 'Administrativo', position: '3º Aprovador - Diretoria' },
    ];

    for (const u of seedUsers) {
      await pool.query(
        `INSERT INTO users (id, name, email, role, sector, position, password)
         VALUES ($1, $2, $3, $4, $5, $6, '123456')
         ON CONFLICT (id) DO UPDATE SET
           role = EXCLUDED.role,
           sector = EXCLUDED.sector,
           position = EXCLUDED.position`,
        [u.id, u.name, u.email, u.role, u.sector, u.position]
      );
    }

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
