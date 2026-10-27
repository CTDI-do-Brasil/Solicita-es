-- ==============================================================================
-- SCHEMA E SEED COMPLETO - SISTEMA SMARTBUY (POSTGRESQL)
-- Banco de Dados: SmartBuy
-- Host interno CapRover: srv-captain--db-postgres
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE USUÁRIOS
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL, -- 'gestor', 'colaborador', 'compras', 'master', 'aprovador'
    sector VARCHAR(50) NOT NULL,
    position VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    password VARCHAR(255) DEFAULT '123456',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garantir coluna password se tabela já existir
ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT '123456';

-- 3. TABELA DE SOLICITAÇÕES DE COMPRA (PURCHASE REQUESTS)
CREATE TABLE IF NOT EXISTS purchase_requests (
    id VARCHAR(100) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    reason TEXT,
    link_url TEXT,
    quantity NUMERIC(12, 2) NOT NULL DEFAULT 1,
    unit VARCHAR(50) NOT NULL DEFAULT 'un',
    priority VARCHAR(20) NOT NULL DEFAULT 'media', -- 'baixa', 'media', 'alta', 'urgente'
    
    -- Solicitante
    requester_id VARCHAR(100) REFERENCES users(id) ON DELETE SET NULL,
    requester_name VARCHAR(255) NOT NULL,
    sector VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Aprovação do Gestor do Setor
    manager_approval_status VARCHAR(50) NOT NULL DEFAULT 'pendente', -- 'pendente', 'aprovado', 'reprovado'
    manager_approved_at TIMESTAMPTZ,
    manager_approved_by VARCHAR(255),
    manager_notes TEXT,
    
    -- Setor de Compras
    purchase_status VARCHAR(50) NOT NULL DEFAULT 'aguardando_aprovacao_gestor',
    purchase_order_number VARCHAR(100),
    supplier VARCHAR(255),
    unit_price NUMERIC(15, 2),
    total_price NUMERIC(15, 2),
    shipping_cost NUMERIC(15, 2),
    payment_terms VARCHAR(255),
    delivery_deadline VARCHAR(255),
    purchase_date DATE,
    expected_delivery_date DATE,
    purchased_by VARCHAR(255),
    purchasing_notes TEXT,
    
    -- Itens múltiplos, cotações/orçamentos e fluxo de aprovadores (armazenados em JSONB com indexação)
    items JSONB DEFAULT '[]'::jsonb,
    quotes JSONB DEFAULT '[]'::jsonb,
    approvals JSONB,
    
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garantir que colunas adicionadas existam em bancos de dados já instanciados
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(255);
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS delivery_deadline VARCHAR(255);
ALTER TABLE purchase_requests ADD COLUMN IF NOT EXISTS quotes JSONB DEFAULT '[]'::jsonb;

-- 4. TABELA DE REVISORES DE RELEASE
CREATE TABLE IF NOT EXISTS version_reviewers (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'revisor',
    position VARCHAR(255) NOT NULL,
    sector VARCHAR(50) NOT NULL
);

-- 5. TABELA DE RELEASES / VERSÕES
CREATE TABLE IF NOT EXISTS app_versions (
    id VARCHAR(100) PRIMARY KEY,
    version VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    changelog JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'em_revisao', -- 'em_revisao', 'aprovado', 'reprovado', 'divulgado'
    approved_by_reviewer_id VARCHAR(100) REFERENCES version_reviewers(id) ON DELETE SET NULL,
    approved_by_reviewer_name VARCHAR(255),
    approved_at TIMESTAMPTZ,
    reviewer_notes TEXT,
    published_at TIMESTAMPTZ,
    published_by VARCHAR(255)
);

-- 6. TABELA DE LOGS DE AUDITORIA DO SISTEMA
CREATE TABLE IF NOT EXISTS system_logs (
    id BIGSERIAL PRIMARY KEY,
    request_id VARCHAR(100) REFERENCES purchase_requests(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    user_name VARCHAR(255),
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_users_sector ON users(sector);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_requests_sector ON purchase_requests(sector);
CREATE INDEX IF NOT EXISTS idx_requests_purchase_status ON purchase_requests(purchase_status);
CREATE INDEX IF NOT EXISTS idx_requests_manager_status ON purchase_requests(manager_approval_status);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON purchase_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_requester ON purchase_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_logs_request_id ON system_logs(request_id);

-- ==============================================================================
-- CARGA INICIAL (SOMENTE USUÁRIO MASTER DO SISTEMA)
-- ==============================================================================

-- 8. CARGA INICIAL DO USUÁRIO MASTER
INSERT INTO users (id, name, email, role, sector, position, password, created_at)
VALUES
    ('user-master-dev', 'Desenvolvedor Master', 'dev@empresa.com', 'master', 'TI', 'Desenvolvedor & Administrador Geral do Sistema', '123456', NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    sector = EXCLUDED.sector,
    position = EXCLUDED.position;

-- 9. CARGA DE REVISORES DE VERSÃO (GOVERNANÇA)
INSERT INTO version_reviewers (id, name, email, role, position, sector)
VALUES
    ('rev-qa-01', 'Renata Vasconcelos', 'renata.revisao@empresa.com', 'revisor', 'Revisora de Governança & QA Lead', 'TI')
ON CONFLICT (id) DO NOTHING;

