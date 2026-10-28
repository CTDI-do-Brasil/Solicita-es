export type SectorType = 
  | 'Produção'
  | 'Fiscal'
  | 'Financeiro'
  | 'RH'
  | 'EHS'
  | 'Manutenção'
  | 'Engenharia'
  | 'TI'
  | 'Administrativo'
  | 'Compras'
  | 'Diretor'
  | 'Diretoria';

export const ALL_SECTORS: SectorType[] = [
  'Produção',
  'Fiscal',
  'Financeiro',
  'RH',
  'EHS',
  'Manutenção',
  'Engenharia',
  'TI',
  'Administrativo',
  'Diretor'
];

export type UserRole = 'gestor' | 'colaborador' | 'compras' | 'master' | 'aprovador';

export type ApproverName = 'Fernando' | 'Eduardo' | 'Luiz';

export const APPROVAL_CHAIN: ApproverName[] = ['Fernando', 'Eduardo', 'Luiz'];

export interface ApproverStepState {
  status: 'pendente' | 'aprovado' | 'reprovado' | 'bloqueado';
  approvedAt?: string;
  approvedBy?: string;
  notes?: string;
}

export interface PurchaseApprovals {
  currentApprover: ApproverName | 'concluido' | 'reprovado';
  sentToApproversAt?: string;
  sentByPurchasingUser?: string;
  history?: Array<{
    step: ApproverName;
    action: 'aprovado' | 'reprovado';
    by: string;
    at: string;
    notes?: string;
  }>;
  fernando: ApproverStepState;
  eduardo: ApproverStepState;
  luiz: ApproverStepState;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  sector: SectorType;
  position: string;
  avatarUrl?: string;
  password?: string;
  createdAt: string;
}

export type ManagerApprovalStatus = 'pendente' | 'aprovado' | 'reprovado';

export type PurchaseOrderStatus = 
  | 'aguardando_aprovacao_gestor' // Still waiting for sector manager
  | 'recebido_em_compras'         // Approved by manager, arrived at Purchasing
  | 'em_cotacao'                  // Purchasing is finding suppliers
  | 'em_aprovacao'                // Purchasing PO waiting internal budget signoff
  | 'pedido_emitido'              // PO issued
  | 'compra_realizada'            // Purchase completed / paid
  | 'em_transito'                 // Shipped
  | 'entregue'                    // Delivered to sector
  | 'reprovado_aprovadores'       // Reproved by an approver
  | 'cancelado';                  // Cancelled

export interface ProductQuote {
  id: string;
  itemId?: string;
  supplier: string;
  unitPrice: number;
  shippingCost?: number;
  totalPrice: number;
  paymentTerms?: string; // Prazo de Pagamento (ex: "30 dias", "Boleto 28 DDL", "À vista")
  deliveryDeadline?: string; // Prazo de Entrega (ex: "5 dias úteis", "15 dias corridos", "Imediato")
  notes?: string;
  selected?: boolean; // Orçamento selecionado / vencedor
  createdAt?: string;
}

export interface RequestItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  linkUrl?: string;
  quotes?: ProductQuote[];
}

export interface PurchaseRequest {
  id: string;
  code: string; // e.g., S00001
  title: string;
  description: string;
  reason: string;
  linkUrl: string;
  quantity: number;
  unit: string;
  priority: 'baixa' | 'media' | 'alta' | 'urgente';
  items?: RequestItem[];
  
  // Requester details
  requesterId: string;
  requesterName: string;
  sector: SectorType;
  createdAt: string; // ISO string

  // Sector Manager Approval details
  managerApprovalStatus: ManagerApprovalStatus;
  managerApprovedAt?: string;
  managerApprovedBy?: string;
  managerNotes?: string;

  // Sequential Executive Approvals (Fernando -> Eduardo -> Luiz)
  approvals?: PurchaseApprovals;

  // Purchasing Department (Setor de Compras) details
  purchaseStatus: PurchaseOrderStatus;
  purchaseOrderNumber?: string; // e.g., OC-2026-042
  supplier?: string;
  unitPrice?: number;
  totalPrice?: number; // Valor final de compra preenchido por Compras
  shippingCost?: number;
  paymentTerms?: string; // Prazo de Pagamento (ex: "30 dias", "Boleto 28 DDL", "À vista")
  deliveryDeadline?: string; // Prazo de Entrega do fornecedor (ex: "5 dias úteis", "15 dias corridos")
  purchaseDate?: string;
  expectedDeliveryDate?: string;
  purchasedBy?: string;
  purchasingNotes?: string;
  quotes?: ProductQuote[]; // Múltiplos orçamentos cadastrados pela Central de Compras
  updatedAt: string;
}

export interface SectorMonthlySpend {
  sector: SectorType;
  month: string; // YYYY-MM
  monthLabel: string;
  totalSpent: number;
  requestsCount: number;
}

export type VersionReleaseStatus = 'em_revisao' | 'aprovado' | 'reprovado' | 'divulgado';

export interface VersionReviewer {
  id: string;
  name: string;
  email: string;
  role: 'revisor';
  position: string;
  sector: SectorType;
}

export interface AppVersionRelease {
  id: string;
  version: string;           // e.g. "v1.3.0"
  title: string;             // e.g. "Release 1.3 - Carta Retorno SLA 36h & Menu Lateral"
  description: string;
  changelog: string[];
  createdAt: string;
  createdBy: string;
  status: VersionReleaseStatus;
  
  // Reviewer approval workflow
  approvedByReviewerId?: string;
  approvedByReviewerName?: string;
  approvedAt?: string;
  reviewerNotes?: string;
  
  // Publication / Broadcast
  publishedAt?: string;
  publishedBy?: string;
}
