-- ==============================================================================
-- SCHEMA E SEED COMPLETO - BANCO DE DADOS NEXUS (POSTGRESQL)
-- Banco de Dados: nexus
-- Host interno CapRover: srv-captain--db-postgres
-- Link Adminer: https://dbadmin.ctdibrasil.com.br/?pgsql=srv-captain--db-postgres&username=postgres&db=nexus&ns=public
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
-- CARGA INICIAL (SEED DATA)
-- ==============================================================================

-- 8. CARGA DE USUÁRIOS
INSERT INTO users (id, name, email, role, sector, position, created_at)
VALUES
    -- Master / Dev
    ('user-master-dev', 'Desenvolvedor Master', 'dev@empresa.com', 'master', 'TI', 'Desenvolvedor & Administrador Geral do Sistema', '2026-01-01T00:00:00Z'),
    
    -- Gestores dos 9 setores
    ('user-gestor-prod', 'Carlos Alberto Silveira', 'carlos.producao@empresa.com', 'gestor', 'Produção', 'Gerente Geral de Produção', '2026-01-10T08:00:00Z'),
    ('user-gestor-fisc', 'Mariana Duarte Ramos', 'mariana.fiscal@empresa.com', 'gestor', 'Fiscal', 'Gerente Tributária e Fiscal', '2026-01-10T08:00:00Z'),
    ('user-gestor-fin', 'Roberto Vianna', 'roberto.financeiro@empresa.com', 'gestor', 'Financeiro', 'Gerente Financeiro / Controller', '2026-01-10T08:00:00Z'),
    ('user-gestor-rh', 'Fernanda Nogueira', 'fernanda.rh@empresa.com', 'gestor', 'RH', 'Gerente de Recursos Humanos', '2026-01-10T08:00:00Z'),
    ('user-gestor-ehs', 'Eduardo Guimarães', 'eduardo.ehs@empresa.com', 'gestor', 'EHS', 'Gerente de Saúde, Segurança e Meio Ambiente', '2026-01-10T08:00:00Z'),
    ('user-gestor-manut', 'Marcos Aurélio Prado', 'marcos.manutencao@empresa.com', 'gestor', 'Manutenção', 'Gerente de Manutenção Industrial', '2026-01-10T08:00:00Z'),
    ('user-gestor-eng', 'Patrícia Albuquerque', 'patricia.engenharia@empresa.com', 'gestor', 'Engenharia', 'Gerente de Projetos e Engenharia', '2026-01-10T08:00:00Z'),
    ('user-gestor-ti', 'Lucas Barreto', 'lucas.ti@empresa.com', 'gestor', 'TI', 'Gerente de Tecnologia da Informação', '2026-01-10T08:00:00Z'),
    ('user-gestor-adm', 'Helena Matos', 'helena.adm@empresa.com', 'gestor', 'Administrativo', 'Gerente Administrativa de Facilities', '2026-01-10T08:00:00Z'),
    
    -- Setor de Compras
    ('user-compras-coord', 'Alexandre Fontes', 'alexandre.compras@empresa.com', 'gestor', 'Compras', 'Coordenador de Suprimentos e Compras', '2026-01-05T08:00:00Z'),
    ('user-compras-buyer', 'Juliana Paes Correia', 'juliana.compras@empresa.com', 'compras', 'Compras', 'Compradora Corporativa Pleno', '2026-01-12T08:00:00Z'),
    
    -- Alçada Executiva de Aprovadores (Fernando -> Eduardo -> Luiz)
    ('user-aprovador-fernando', 'Fernando Silva', 'fernando.aprovador@empresa.com', 'aprovador', 'Compras', '1º Aprovador - Diretor de Suprimentos & Operações', '2026-01-02T08:00:00Z'),
    ('user-aprovador-eduardo', 'Eduardo Costa', 'eduardo.aprovador@empresa.com', 'aprovador', 'Financeiro', '2º Aprovador - Diretor Financeiro & Controladoria', '2026-01-02T08:00:00Z'),
    ('user-aprovador-luiz', 'Luiz Carlos Martins', 'luiz.aprovador@empresa.com', 'aprovador', 'Administrativo', '3º Aprovador - Diretor Executivo Geral (CEO)', '2026-01-02T08:00:00Z'),
    
    -- Colaboradores de setores
    ('user-colab-ti-1', 'Guilherme Santos', 'guilherme.ti@empresa.com', 'colaborador', 'TI', 'Analista de Infraestrutura e Redes', '2026-02-01T09:00:00Z'),
    ('user-colab-prod-1', 'João Pedro Neves', 'joao.producao@empresa.com', 'colaborador', 'Produção', 'Supervisor de Linha 2', '2026-02-05T09:00:00Z'),
    ('user-colab-ehs-1', 'Camila Rocha', 'camila.ehs@empresa.com', 'colaborador', 'EHS', 'Técnica de Segurança do Trabalho', '2026-02-10T09:00:00Z'),
    ('user-colab-rh-1', 'Beatriz Lima', 'beatriz.rh@empresa.com', 'colaborador', 'RH', 'Analista de Treinamento & DHO', '2026-02-12T09:00:00Z'),
    ('user-colab-manut-1', 'Felipe Santana', 'felipe.manutencao@empresa.com', 'colaborador', 'Manutenção', 'Mecânico de Manutenção Sênior', '2026-02-15T09:00:00Z')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    sector = EXCLUDED.sector,
    position = EXCLUDED.position;

-- 9. CARGA DE REVISORES DE VERSÃO
INSERT INTO version_reviewers (id, name, email, role, position, sector)
VALUES
    ('rev-qa-01', 'Renata Vasconcelos', 'renata.revisao@empresa.com', 'revisor', 'Revisora de Governança & QA Lead', 'TI'),
    ('rev-qa-02', 'Thiago Mendonça', 'thiago.revisao@empresa.com', 'revisor', 'Revisor de Compliance & Homologação', 'Administrativo')
ON CONFLICT (id) DO NOTHING;

-- 10. CARGA DE VERSÕES DO APP
INSERT INTO app_versions (id, version, title, description, changelog, created_at, created_by, status, approved_by_reviewer_id, approved_by_reviewer_name, approved_at, reviewer_notes, published_at, published_by)
VALUES
    ('ver-1.5.0', 'v1.5.0', 'Release 1.5 - Remoção de Carta Retorno e Alerta de Solicitação em Atraso (+48h)',
     'Substituição da função de Carta Retorno por sistema automatizado de monitoramento de SLA que exibe "Solicitação em atraso" após 48 horas do recebimento.',
     '["Remoção completa da antiga função de Carta Retorno e seus modais do sistema", "Exibição automática da mensagem de \"Solicitação em atraso\" após 48 horas do recebimento em Compras", "Aba e filtro prioritário de Solicitações em Atraso (+48h) na Central de Compras", "Padronização da nomenclatura para \"Compra Realizada\"", "Restrição de avisos aos Gestores, mantendo a visão dos colaboradores limpa e objetiva"]'::jsonb,
     '2026-09-15T08:00:00Z', 'Desenvolvedor Master (dev@empresa.com)', 'divulgado',
     'rev-qa-01', 'Renata Vasconcelos (Revisora QA Lead)', '2026-09-15T08:05:00Z', NULL, NULL, NULL),
    
    ('ver-1.3.0', 'v1.3.0', 'Release 1.3 - Gestão de Alertas & Menu Lateral',
     'Aprimoramento de alertas de compras e migração do menu para barra lateral com alertas de solicitações aguardando aprovação.',
     '["Painel de Alerta Urgente e filtro prioritário para Compras", "Menu do Setor transladado para a barra lateral com indicador visual de status", "Alerta sonoro/visual com botão de aprovação rápida para gestores de setor", "Controle e governança de releases de software com aprovação por revisores"]'::jsonb,
     '2026-09-15T06:40:00Z', 'Desenvolvedor Master (dev@empresa.com)', 'divulgado',
     NULL, NULL, NULL, NULL, NULL, NULL),
     
    ('ver-1.2.0', 'v1.2.0', 'Release 1.2 - Isolamento de Setores & Visualização de Gastos Mensais',
     'Isolamento estrito entre departamentos, gráfico de gastos mensais e painel do comprador.',
     '["Garantia de isolamento estrito de dados entre os 9 setores", "Controle gerencial de aprovação por gestor de departamento", "Visualizador de faturamento consolidado por Compras"]'::jsonb,
     '2026-08-30T10:00:00Z', 'Desenvolvedor Master', 'divulgado',
     'rev-qa-01', 'Renata Vasconcelos (Revisora QA Lead)', '2026-08-31T14:20:00Z',
     'Homologação concluída com sucesso em todos os 9 setores.', '2026-09-01T08:00:00Z', 'Desenvolvedor Master')
ON CONFLICT (id) DO NOTHING;

-- 11. CARGA INICIAL DE SOLICITAÇÕES DE COMPRA (AMOSTRAGEM PRINCIPAL)
INSERT INTO purchase_requests (
    id, code, title, description, reason, link_url, quantity, unit, priority,
    requester_id, requester_name, sector, created_at,
    manager_approval_status, manager_approved_at, manager_approved_by, manager_notes,
    purchase_status, purchase_order_number, supplier, unit_price, total_price, shipping_cost,
    purchase_date, expected_delivery_date, purchased_by, purchasing_notes, approvals, updated_at
) VALUES
    ('req-001', 'S00001', 'Switch Gigabit 24 Portas PoE Gerenciável',
     'Switch Cisco Catalyst 1000 Series 24 portas Gigabit Ethernet PoE+ 195W para expansão do rack da sala técnica.',
     'Necessidade de conexão para 8 novas câmeras de segurança e 12 pontos de rede para os novos postos de trabalho.',
     'https://www.kabum.com.br/produto/exemplo-switch-cisco', 2, 'unidades', 'alta',
     'user-colab-ti-1', 'Guilherme Santos', 'TI', '2026-08-04T10:30:00Z',
     'aprovado', '2026-08-05T14:10:00Z', 'Lucas Barreto (Gerente TI)', 'Aprovado. Despesa prevista no orçamento de infraestrutura do 2º semestre.',
     'compra_realizada', 'OC-2026-0182', 'TecnoSupply Distribuidora Ltda', 2850.00, 5700.00, 85.00,
     '2026-08-10', '2026-08-18', 'Juliana Paes Correia (Compras)', 'Negociado desconto de 5% à vista. Faturado com nota fiscal 48.912.', NULL, '2026-08-10T16:00:00Z'),

    ('req-002', 'S00002', 'Memória RAM DDR5 32GB Kingston Fury',
     '2 módulos de memória RAM DDR5 32GB 5600MHz para upgrade do servidor local de compilação.',
     'O servidor atual está operando em 96% de memória durante a compilação noturna de relatórios.',
     'https://www.terabyteshop.com.br/produto/memoria-kingston-ddr5', 4, 'pentes', 'media',
     'user-colab-ti-1', 'Guilherme Santos', 'TI', '2026-09-14T09:15:00Z',
     'pendente', NULL, NULL, NULL,
     'aguardando_aprovacao_gestor', NULL, 'Terabyte E-commerce de Informática Ltda', 650.00, 2600.00, 35.00,
     NULL, NULL, 'Juliana Paes Correia (Compras)', 'Cotação preliminar registrada pelo setor de Compras.', NULL, '2026-09-14T09:15:00Z'),

    ('req-003', 'S00003', 'Esteira Transportadora Modular de Roletes 3m',
     'Esteira transportadora industrial com roletes livres de aço galvanizado para linha de montagem.',
     'Gargalo operacional no fluxo de saída de embalagens para expedição primária.',
     'https://www.lojadomecanico.com.br/esteira-modular-roletes', 1, 'conjunto', 'urgente',
     'user-colab-prod-1', 'João Pedro Neves', 'Produção', '2026-09-02T11:00:00Z',
     'aprovado', '2026-09-02T15:20:00Z', 'Carlos Alberto Silveira (Gerente Produção)', 'Item de altíssima prioridade para desafogar a linha 2.',
     'em_aprovacao', 'OC-2026-0210', 'Metalúrgica FlexIndústria SA', 8400.00, 8400.00, 350.00,
     NULL, NULL, 'Alexandre Fontes (Compras)', 'Cotação concluída e pedido de compra enviado para alçada de aprovação.',
     '{
        "currentApprover": "Fernando",
        "sentToApproversAt": "2026-09-08T10:45:00Z",
        "sentByPurchasingUser": "Alexandre Fontes (Compras)",
        "history": [{"step": "Fernando", "action": "aprovado", "by": "Sistema", "at": "2026-09-08T10:45:00Z", "notes": "Pedido de compra formalizado pelo setor de compras e aguardando o 1º aprovador (Fernando)."}],
        "fernando": {"status": "pendente"},
        "eduardo": {"status": "bloqueado"},
        "luiz": {"status": "bloqueado"}
     }'::jsonb, '2026-09-08T10:45:00Z'),

    ('req-014', 'S00014', 'Compressor de Parafuso Industrial 50HP com Inversor',
     'Compressor rotativo de parafuso atlas 50HP com tecnologia de acionamento de velocidade variável (VSD).',
     'Substituição preventiva do compressor principal da planta para evitar parada de fábrica.',
     'https://www.atlascopco.com/pt-br/compressor-50hp', 1, 'unidade', 'alta',
     'user-gestor-manut', 'Marcos Aurélio Prado', 'Manutenção', '2026-09-01T08:00:00Z',
     'aprovado', '2026-09-01T09:00:00Z', 'Marcos Aurélio Prado (Gerente Manutenção)', 'Crítico para o fornecimento de ar comprimido da planta produtiva.',
     'pedido_emitido', 'OC-2026-0230', 'Atlas Brasil Compressores Industriais Ltda', 94500.00, 94500.00, 1200.00,
     '2026-09-07', '2026-09-25', 'Alexandre Fontes (Compras)', 'Pedido emitido e enviado ao fabricante após aprovação unânime da diretoria.',
     '{
        "currentApprover": "concluido",
        "sentToApproversAt": "2026-09-03T10:00:00Z",
        "sentByPurchasingUser": "Alexandre Fontes (Compras)",
        "history": [
            {"step": "Fernando", "action": "aprovado", "by": "Fernando Silva (1º Aprovador)", "at": "2026-09-04T10:30:00Z", "notes": "Aprovado pelo suprimento."},
            {"step": "Eduardo", "action": "aprovado", "by": "Eduardo Costa (2º Aprovador)", "at": "2026-09-05T14:20:00Z", "notes": "Aprovado pelo financeiro com amortização em 4 parcelas."},
            {"step": "Luiz", "action": "aprovado", "by": "Luiz Carlos Martins (3º Aprovador)", "at": "2026-09-06T11:00:00Z", "notes": "Aprovação final concedida. Emissão autorizada imediatamente."}
        ],
        "fernando": {"status": "aprovado", "approvedAt": "2026-09-04T10:30:00Z", "approvedBy": "Fernando Silva (1º Aprovador)", "notes": "Aprovado pelo suprimento."},
        "eduardo": {"status": "aprovado", "approvedAt": "2026-09-05T14:20:00Z", "approvedBy": "Eduardo Costa (2º Aprovador)", "notes": "Aprovado pelo financeiro com amortização em 4 parcelas."},
        "luiz": {"status": "aprovado", "approvedAt": "2026-09-06T11:00:00Z", "approvedBy": "Luiz Carlos Martins (3º Aprovador)", "notes": "Aprovação final concedida. Emissão autorizada imediatamente."}
     }'::jsonb, '2026-09-06T11:00:00Z')
ON CONFLICT (id) DO NOTHING;
