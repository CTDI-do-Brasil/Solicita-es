import { User, UserRole, PurchaseRequest, SectorType, PurchaseOrderStatus, AppVersionRelease, VersionReviewer, ApproverName } from './types';
import { INITIAL_USERS, INITIAL_REQUESTS } from './mockData';

const USERS_STORAGE_KEY = 'compras_app_users_v1';
const REQUESTS_STORAGE_KEY = 'compras_app_requests_v1';
const CURRENT_USER_KEY = 'compras_app_current_user_v1';
const VERSIONS_STORAGE_KEY = 'compras_app_versions_v1';

export const INITIAL_REVIEWERS: VersionReviewer[] = [
  {
    id: 'rev-qa-01',
    name: 'Renata Vasconcelos',
    email: 'renata.revisao@empresa.com',
    role: 'revisor',
    position: 'Revisora de Governança & QA Lead',
    sector: 'TI',
  },
  {
    id: 'rev-qa-02',
    name: 'Thiago Mendonça',
    email: 'thiago.revisao@empresa.com',
    role: 'revisor',
    position: 'Revisor de Compliance & Homologação',
    sector: 'Administrativo',
  }
];

export const INITIAL_VERSIONS: AppVersionRelease[] = [
  {
    id: 'ver-1.5.0',
    version: 'v1.5.0',
    title: 'Release 1.5 - Remoção de Carta Retorno e Alerta de Solicitação em Atraso (+48h)',
    description: 'Substituição da função de Carta Retorno por sistema automatizado de monitoramento de SLA que exibe "Solicitação em atraso" após 48 horas do recebimento.',
    changelog: [
      'Remoção completa da antiga função de Carta Retorno e seus modais do sistema',
      'Exibição automática da mensagem de "Solicitação em atraso" após 48 horas do recebimento em Compras',
      'Aba e filtro prioritário de Solicitações em Atraso (+48h) na Central de Compras',
      'Padronização da nomenclatura para "Compra Realizada"',
      'Restrição de avisos aos Gestores, mantendo a visão dos colaboradores limpa e objetiva'
    ],
    createdAt: '2026-09-15T08:00:00Z',
    createdBy: 'Desenvolvedor Master (dev@empresa.com)',
    status: 'divulgado',
    approvedByReviewerId: 'rev-qa-01',
    approvedByReviewerName: 'Renata Vasconcelos (Revisora QA Lead)',
    approvedAt: '2026-09-15T08:05:00Z',
  },
  {
    id: 'ver-1.3.0',
    version: 'v1.3.0',
    title: 'Release 1.3 - Gestão de Alertas & Menu Lateral',
    description: 'Aprimoramento de alertas de compras e migração do menu para barra lateral com alertas de solicitações aguardando aprovação.',
    changelog: [
      'Painel de Alerta Urgente e filtro prioritário para Compras',
      'Menu do Setor transladado para a barra lateral com indicador visual de status',
      'Alerta sonoro/visual com botão de aprovação rápida para gestores de setor',
      'Controle e governança de releases de software com aprovação por revisores'
    ],
    createdAt: '2026-09-15T06:40:00Z',
    createdBy: 'Desenvolvedor Master (dev@empresa.com)',
    status: 'divulgado',
  },
  {
    id: 'ver-1.2.0',
    version: 'v1.2.0',
    title: 'Release 1.2 - Isolamento de Setores & Visualização de Gastos Mensais',
    description: 'Isolamento estrito entre departamentos, gráfico de gastos mensais e painel do comprador.',
    changelog: [
      'Garantia de isolamento estrito de dados entre os 9 setores',
      'Controle gerencial de aprovação por gestor de departamento',
      'Visualizador de faturamento consolidado por Compras'
    ],
    createdAt: '2026-08-30T10:00:00Z',
    createdBy: 'Desenvolvedor Master',
    status: 'divulgado',
    approvedByReviewerId: 'rev-qa-01',
    approvedByReviewerName: 'Renata Vasconcelos (Revisora QA Lead)',
    approvedAt: '2026-08-31T14:20:00Z',
    reviewerNotes: 'Homologação concluída com sucesso em todos os 9 setores.',
    publishedAt: '2026-09-01T08:00:00Z',
    publishedBy: 'Desenvolvedor Master',
  }
];

export const storage = {
  getUsers(): User[] {
    try {
      const stored = localStorage.getItem(USERS_STORAGE_KEY);
      if (stored) {
        const users: User[] = JSON.parse(stored);
        // Ensure master dev user is always present
        let needsSave = false;
        if (!users.some(u => u.role === 'master' || u.id === 'user-master-dev')) {
          const masterUser = INITIAL_USERS.find(u => u.role === 'master');
          if (masterUser) {
            users.unshift(masterUser);
            needsSave = true;
          }
        }
        // Ensure purchasing coordinator has gestor role
        const coord = users.find(u => u.id === 'user-compras-coord');
        if (coord && coord.role !== 'gestor') {
          coord.role = 'gestor';
          needsSave = true;
        }

        // Ensure the 3 approvers (Fernando, Eduardo, Luiz) exist
        const approverIds = ['user-aprovador-fernando', 'user-aprovador-eduardo', 'user-aprovador-luiz'];
        approverIds.forEach(id => {
          if (!users.some(u => u.id === id)) {
            const initialAppr = INITIAL_USERS.find(u => u.id === id);
            if (initialAppr) {
              users.push(initialAppr);
              needsSave = true;
            }
          }
        });

        if (needsSave) {
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        }
        return users;
      }
    } catch (e) {
      console.error('Failed to load users from localStorage', e);
    }
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
    return INITIAL_USERS;
  },

  saveUsers(users: User[]) {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      window.dispatchEvent(new Event('storage-users-updated'));
    } catch (e) {
      console.error('Failed to save users', e);
    }
  },

  getCurrentUser(): User | null {
    try {
      const stored = localStorage.getItem(CURRENT_USER_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load current user', e);
    }
    // Default to Lucas Barreto (TI Manager) for preview or null for login
    return null;
  },

  setCurrentUser(user: User | null) {
    try {
      if (user) {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(CURRENT_USER_KEY);
      }
      window.dispatchEvent(new Event('storage-auth-updated'));
    } catch (e) {
      console.error('Failed to set current user', e);
    }
  },

  getAllRequests(): PurchaseRequest[] {
    try {
      const stored = localStorage.getItem(REQUESTS_STORAGE_KEY);
      if (stored) {
        const requests: PurchaseRequest[] = JSON.parse(stored);
        let updated = false;
        const migrated = requests.map(r => {
          const match = r.code.match(/^SOL-\d{4}-(\d+)$/i);
          if (match) {
            updated = true;
            return {
              ...r,
              code: `S${match[1].padStart(5, '0')}`,
            };
          }
          return r;
        });
        if (updated) {
          localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(migrated));
          return migrated;
        }
        
        // Ensure mock requests with approvals exist
        if (!requests.some(r => r.id === 'req-012' || r.approvals)) {
          const mockWithApprovals = INITIAL_REQUESTS.filter(ir => ir.approvals);
          const merged = [...requests, ...mockWithApprovals.filter(m => !requests.some(r => r.id === m.id))];
          localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(merged));
          return merged;
        }

        // Ensure all requests in Compras have prices populated
        let priceUpdated = false;
        const withPrices = requests.map(r => {
          if (r.id === 'req-007' && (!r.totalPrice || r.totalPrice <= 0)) {
            priceUpdated = true;
            return {
              ...r,
              purchaseOrderNumber: r.purchaseOrderNumber || 'OC-2026-0208',
              supplier: 'Distribuidora Rolamentos SKF Brasil Ltda',
              unitPrice: 485.00,
              totalPrice: 1940.00,
              shippingCost: 80.00,
              purchasedBy: 'Alexandre Fontes (Compras)',
              purchasingNotes: 'Cotação realizada e valor definido pelo setor de Compras.',
            };
          }
          if (r.id === 'req-002' && (!r.totalPrice || r.totalPrice <= 0)) {
            priceUpdated = true;
            return {
              ...r,
              supplier: 'Terabyte E-commerce de Informática Ltda',
              unitPrice: 650.00,
              totalPrice: 2600.00,
              shippingCost: 35.00,
              purchasedBy: 'Juliana Paes Correia (Compras)',
              purchasingNotes: 'Cotação preliminar registrada pelo setor de Compras.',
            };
          }
          return r;
        });

        if (priceUpdated) {
          localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(withPrices));
          return withPrices;
        }

        return requests;
      }
    } catch (e) {
      console.error('Failed to load requests from localStorage', e);
    }
    localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(INITIAL_REQUESTS));
    return INITIAL_REQUESTS;
  },

  saveRequests(requests: PurchaseRequest[]) {
    try {
      localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(requests));
      window.dispatchEvent(new Event('storage-requests-updated'));
    } catch (e) {
      console.error('Failed to save requests', e);
    }
  },

  // ISOLATION: A sector cannot see requests from other sectors, but Compras, Master and Aprovadores see all
  getRequestsForUser(user: User): PurchaseRequest[] {
    const all = this.getAllRequests();
    if (user.role === 'compras' || user.sector === 'Compras' || user.role === 'master' || user.role === 'aprovador') {
      return all;
    }
    return all.filter(r => r.sector === user.sector);
  },

  createRequest(
    data: Omit<PurchaseRequest, 'id' | 'code' | 'createdAt' | 'updatedAt' | 'managerApprovalStatus' | 'purchaseStatus'>,
    currentUser: User
  ): PurchaseRequest {
    const all = this.getAllRequests();
    
    // Extract highest sequence number from existing codes formatted as S\d+
    let nextNum = 1;
    const numbers = all
      .map(r => {
        const match = r.code.match(/^S(\d+)$/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => !isNaN(n) && n > 0);

    if (numbers.length > 0) {
      nextNum = Math.max(...numbers) + 1;
    }
    const code = `S${String(nextNum).padStart(5, '0')}`;
    
    // If manager submits, is it automatically approved or requires one-click approval?
    // As per user prompt: "Tanto o gestor quanto os novos usuários que eles criarão poderá fazer solicitações de compra... O gestor inicialmente terá que aprovar essa solicitação."
    // If the manager creates it, we can auto-approve or keep it clear:
    const isManager = currentUser.role === 'gestor';

    const newRequest: PurchaseRequest = {
      ...data,
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      code,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      managerApprovalStatus: isManager ? 'aprovado' : 'pendente',
      managerApprovedAt: isManager ? new Date().toISOString() : undefined,
      managerApprovedBy: isManager ? `${currentUser.name} (Próprio Gestor)` : undefined,
      managerNotes: isManager ? 'Solicitação aprovada diretamente pelo gestor da área.' : undefined,
      purchaseStatus: isManager ? 'recebido_em_compras' : 'aguardando_aprovacao_gestor',
    };

    const updated = [newRequest, ...all];
    this.saveRequests(updated);
    return newRequest;
  },

  approveRequestByManager(requestId: string, manager: User, notes?: string): boolean {
    const all = this.getAllRequests();
    const index = all.findIndex(r => r.id === requestId);
    if (index === -1) return false;

    // Verify manager is of same sector (or master/compras)
    if (manager.role !== 'master' && all[index].sector !== manager.sector && manager.role !== 'compras') {
      return false;
    }

    all[index] = {
      ...all[index],
      managerApprovalStatus: 'aprovado',
      managerApprovedAt: new Date().toISOString(),
      managerApprovedBy: manager.role === 'master' ? `${manager.name} (Acesso Master)` : `${manager.name} (Gestor de ${manager.sector})`,
      managerNotes: notes || 'Solicitação aprovada para cotação e compra.',
      purchaseStatus: 'recebido_em_compras',
      updatedAt: new Date().toISOString(),
    };

    this.saveRequests(all);
    return true;
  },

  rejectRequestByManager(requestId: string, manager: User, notes: string): boolean {
    if (!notes || !notes.trim()) {
      return false; // Motivo da reprovação é estritamente obrigatório
    }

    const all = this.getAllRequests();
    const index = all.findIndex(r => r.id === requestId);
    if (index === -1) return false;

    if (manager.role !== 'master' && all[index].sector !== manager.sector && manager.role !== 'compras') {
      return false;
    }

    all[index] = {
      ...all[index],
      managerApprovalStatus: 'reprovado',
      managerApprovedAt: new Date().toISOString(),
      managerApprovedBy: manager.role === 'master' ? `${manager.name} (Acesso Master)` : `${manager.name} (Gestor de ${manager.sector})`,
      managerNotes: notes.trim(),
      purchaseStatus: 'cancelado',
      updatedAt: new Date().toISOString(),
    };

    this.saveRequests(all);
    return true;
  },

  updatePurchasingDetails(
    requestId: string,
    buyer: User,
    data: {
      status: PurchaseOrderStatus;
      purchaseOrderNumber?: string;
      supplier?: string;
      unitPrice?: number;
      totalPrice?: number;
      shippingCost?: number;
      purchaseDate?: string;
      expectedDeliveryDate?: string;
      purchasingNotes?: string;
    }
  ): boolean {
    const all = this.getAllRequests();
    const index = all.findIndex(r => r.id === requestId);
    if (index === -1) return false;

    const currentApprovals = all[index].approvals;
    let newApprovals = currentApprovals;

    if (data.status === 'em_aprovacao' && (!currentApprovals || currentApprovals.currentApprover === 'reprovado')) {
      const now = new Date().toISOString();
      newApprovals = {
        currentApprover: 'Fernando',
        sentToApproversAt: now,
        sentByPurchasingUser: `${buyer.name} (Compras)`,
        history: [
          ...(currentApprovals?.history || []),
          {
            step: 'Fernando',
            action: 'pendente' as any,
            by: `${buyer.name} (Compras)`,
            at: now,
            notes: 'Pedido de compra formalizado por Compras e enviado para a alçada de aprovação.'
          }
        ],
        fernando: { status: 'pendente' },
        eduardo: { status: 'bloqueado' },
        luiz: { status: 'bloqueado' },
      };
    }

    all[index] = {
      ...all[index],
      purchaseStatus: data.status,
      purchaseOrderNumber: data.purchaseOrderNumber || all[index].purchaseOrderNumber,
      supplier: data.supplier !== undefined ? data.supplier : all[index].supplier,
      unitPrice: data.unitPrice !== undefined ? data.unitPrice : all[index].unitPrice,
      totalPrice: data.totalPrice !== undefined ? data.totalPrice : all[index].totalPrice,
      shippingCost: data.shippingCost !== undefined ? data.shippingCost : all[index].shippingCost,
      purchaseDate: data.purchaseDate || all[index].purchaseDate,
      expectedDeliveryDate: data.expectedDeliveryDate || all[index].expectedDeliveryDate,
      purchasedBy: `${buyer.name} (Compras)`,
      purchasingNotes: data.purchasingNotes !== undefined ? data.purchasingNotes : all[index].purchasingNotes,
      approvals: newApprovals,
      updatedAt: new Date().toISOString(),
    };

    this.saveRequests(all);
    return true;
  },

  sendToApprovers(requestId: string, purchasingUser: User): boolean {
    const all = this.getAllRequests();
    const index = all.findIndex(r => r.id === requestId);
    if (index === -1) return false;

    const req = all[index];
    const now = new Date().toISOString();

    all[index] = {
      ...req,
      purchaseStatus: 'em_aprovacao',
      approvals: {
        currentApprover: 'Fernando',
        sentToApproversAt: now,
        sentByPurchasingUser: `${purchasingUser.name} (Compras)`,
        history: [
          ...(req.approvals?.history || []),
          {
            step: 'Fernando',
            action: 'pendente' as any,
            by: `${purchasingUser.name} (Compras)`,
            at: now,
            notes: 'Pedido de compra enviado para alçada sequencial: Fernando -> Eduardo -> Luiz'
          }
        ],
        fernando: { status: 'pendente' },
        eduardo: { status: 'bloqueado' },
        luiz: { status: 'bloqueado' },
      },
      updatedAt: now,
    };

    this.saveRequests(all);
    return true;
  },

  approveByApprover(requestId: string, approverName: ApproverName, user: User, notes?: string): boolean {
    const all = this.getAllRequests();
    const index = all.findIndex(r => r.id === requestId);
    if (index === -1) return false;

    const req = all[index];
    if (!req.approvals) return false;

    const now = new Date().toISOString();
    const current = req.approvals.currentApprover;

    // Check if it is indeed this approver's turn (or user is Master)
    if (user.role !== 'master' && current !== approverName) {
      return false;
    }

    const ap = { ...req.approvals };
    const history = ap.history ? [...ap.history] : [];

    if (approverName === 'Fernando') {
      ap.fernando = {
        status: 'aprovado',
        approvedAt: now,
        approvedBy: `${user.name} (1º Aprovador)`,
        notes: notes || 'Aprovado pelo 1º Aprovador (Fernando).'
      };
      ap.currentApprover = 'Eduardo';
      ap.eduardo = { status: 'pendente' };
      history.push({
        step: 'Fernando',
        action: 'aprovado',
        by: user.name,
        at: now,
        notes: notes || 'Aprovado pelo 1º Aprovador.'
      });
    } else if (approverName === 'Eduardo') {
      if (ap.fernando?.status !== 'aprovado' && user.role !== 'master') {
        return false;
      }
      ap.eduardo = {
        status: 'aprovado',
        approvedAt: now,
        approvedBy: `${user.name} (2º Aprovador)`,
        notes: notes || 'Aprovado pelo 2º Aprovador (Eduardo).'
      };
      ap.currentApprover = 'Luiz';
      ap.luiz = { status: 'pendente' };
      history.push({
        step: 'Eduardo',
        action: 'aprovado',
        by: user.name,
        at: now,
        notes: notes || 'Aprovado pelo 2º Aprovador.'
      });
    } else if (approverName === 'Luiz') {
      if (ap.eduardo?.status !== 'aprovado' && user.role !== 'master') {
        return false;
      }
      ap.luiz = {
        status: 'aprovado',
        approvedAt: now,
        approvedBy: `${user.name} (3º Aprovador)`,
        notes: notes || 'Aprovação final concedida pelo 3º Aprovador (Luiz).'
      };
      ap.currentApprover = 'concluido';
      history.push({
        step: 'Luiz',
        action: 'aprovado',
        by: user.name,
        at: now,
        notes: notes || 'Aprovação final concedida.'
      });

      // Fully approved by all 3! Advance purchaseStatus to pedido_emitido
      all[index].purchaseStatus = 'pedido_emitido';
    }

    ap.history = history;
    all[index] = {
      ...req,
      approvals: ap,
      updatedAt: now,
    };

    this.saveRequests(all);
    return true;
  },

  rejectByApprover(requestId: string, approverName: ApproverName, user: User, notes: string): boolean {
    if (!notes || !notes.trim()) {
      return false;
    }

    const all = this.getAllRequests();
    const index = all.findIndex(r => r.id === requestId);
    if (index === -1) return false;

    const req = all[index];
    if (!req.approvals) return false;

    const now = new Date().toISOString();
    const ap = { ...req.approvals };
    const history = ap.history ? [...ap.history] : [];

    if (approverName === 'Fernando') {
      ap.fernando = {
        status: 'reprovado',
        approvedAt: now,
        approvedBy: `${user.name} (1º Aprovador)`,
        notes: notes.trim(),
      };
    } else if (approverName === 'Eduardo') {
      ap.eduardo = {
        status: 'reprovado',
        approvedAt: now,
        approvedBy: `${user.name} (2º Aprovador)`,
        notes: notes.trim(),
      };
    } else if (approverName === 'Luiz') {
      ap.luiz = {
        status: 'reprovado',
        approvedAt: now,
        approvedBy: `${user.name} (3º Aprovador)`,
        notes: notes.trim(),
      };
    }

    ap.currentApprover = 'reprovado';
    history.push({
      step: approverName,
      action: 'reprovado',
      by: user.name,
      at: now,
      notes: notes.trim(),
    });

    ap.history = history;
    all[index] = {
      ...req,
      approvals: ap,
      purchaseStatus: 'reprovado_aprovadores',
      updatedAt: now,
    };

    this.saveRequests(all);
    return true;
  },

  createUserByManager(manager: User, userData: { name: string; email: string; position: string }): User {
    const allUsers = this.getUsers();
    const newUser: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: userData.name,
      email: userData.email,
      role: 'colaborador',
      sector: manager.sector, // Strictly within the manager's sector
      position: userData.position || 'Colaborador do Setor',
      createdAt: new Date().toISOString(),
    };

    const updated = [...allUsers, newUser];
    this.saveUsers(updated);
    return newUser;
  },

  // MASTER DEVELOPER PRIVILEGED OPERATIONS
  createMasterUser(data: { name: string; email: string; role: UserRole; sector: SectorType; position: string }): User {
    const allUsers = this.getUsers();
    const newUser: User = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: data.name,
      email: data.email,
      role: data.role,
      sector: data.sector,
      position: data.position || 'Colaborador',
      createdAt: new Date().toISOString(),
    };

    const updated = [...allUsers, newUser];
    this.saveUsers(updated);
    return newUser;
  },

  updateUser(userId: string, data: Partial<User>): boolean {
    const allUsers = this.getUsers();
    const index = allUsers.findIndex(u => u.id === userId);
    if (index === -1) return false;

    allUsers[index] = {
      ...allUsers[index],
      ...data,
    };

    this.saveUsers(allUsers);
    return true;
  },

  deleteUser(userId: string): boolean {
    const allUsers = this.getUsers();
    const updated = allUsers.filter(u => u.id !== userId);
    if (updated.length === allUsers.length) return false;

    this.saveUsers(updated);
    return true;
  },

  deleteRequest(requestId: string): boolean {
    const allRequests = this.getAllRequests();
    const updated = allRequests.filter(r => r.id !== requestId);
    if (updated.length === allRequests.length) return false;

    this.saveRequests(updated);
    return true;
  },

  updateRequest(requestId: string, data: Partial<PurchaseRequest>): boolean {
    const all = this.getAllRequests();
    const index = all.findIndex(r => r.id === requestId);
    if (index === -1) return false;

    all[index] = {
      ...all[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    this.saveRequests(all);
    return true;
  },

  // Version Control & Governance
  getVersions(): AppVersionRelease[] {
    try {
      const stored = localStorage.getItem(VERSIONS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load versions from storage', e);
    }
    localStorage.setItem(VERSIONS_STORAGE_KEY, JSON.stringify(INITIAL_VERSIONS));
    return INITIAL_VERSIONS;
  },

  saveVersions(versions: AppVersionRelease[]) {
    try {
      localStorage.setItem(VERSIONS_STORAGE_KEY, JSON.stringify(versions));
      window.dispatchEvent(new Event('storage-versions-updated'));
    } catch (e) {
      console.error('Failed to save versions', e);
    }
  },

  getReviewers(): VersionReviewer[] {
    return INITIAL_REVIEWERS;
  },

  approveVersionByReviewer(
    versionId: string, 
    reviewer: VersionReviewer, 
    notes?: string
  ): boolean {
    const versions = this.getVersions();
    const index = versions.findIndex(v => v.id === versionId);
    if (index === -1) return false;

    versions[index] = {
      ...versions[index],
      status: 'aprovado',
      approvedByReviewerId: reviewer.id,
      approvedByReviewerName: `${reviewer.name} (${reviewer.position})`,
      approvedAt: new Date().toISOString(),
      reviewerNotes: notes || 'Aprovado pelo comitê de revisão técnica e governança.',
    };

    this.saveVersions(versions);
    return true;
  },

  publishVersion(versionId: string, publisherName: string = 'Desenvolvedor Master'): boolean {
    const versions = this.getVersions();
    const index = versions.findIndex(v => v.id === versionId);
    if (index === -1) return false;

    // Only approved versions can be published/divulgadas
    if (versions[index].status !== 'aprovado') {
      return false;
    }

    versions[index] = {
      ...versions[index],
      status: 'divulgado',
      publishedAt: new Date().toISOString(),
      publishedBy: publisherName,
    };

    this.saveVersions(versions);
    return true;
  },

  createVersion(versionData: {
    version: string;
    title: string;
    description: string;
    changelog: string[];
    createdBy: string;
  }): AppVersionRelease {
    const versions = this.getVersions();
    const newVersion: AppVersionRelease = {
      id: `ver-${Date.now()}`,
      version: versionData.version,
      title: versionData.title,
      description: versionData.description,
      changelog: versionData.changelog,
      createdAt: new Date().toISOString(),
      createdBy: versionData.createdBy,
      status: 'em_revisao',
    };

    versions.unshift(newVersion);
    this.saveVersions(versions);
    return newVersion;
  },

  resetData() {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(INITIAL_REQUESTS));
    localStorage.setItem(VERSIONS_STORAGE_KEY, JSON.stringify(INITIAL_VERSIONS));
    window.dispatchEvent(new Event('storage-users-updated'));
    window.dispatchEvent(new Event('storage-requests-updated'));
    window.dispatchEvent(new Event('storage-versions-updated'));
  }
};
