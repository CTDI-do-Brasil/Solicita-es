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
  | 'Compras';

export const ALL_SECTORS: SectorType[] = [
  'Produção',
  'Fiscal',
  'Financeiro',
  'RH',
  'EHS',
  'Manutenção',
  'Engenharia',
  'TI',
  'Administrativo'
];

export type UserRole = 'gestor' | 'colaborador' | 'compras' | 'master';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  sector: SectorType;
  position: string;
  avatarUrl?: string;
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
  | 'cancelado';                  // Cancelled

export interface RequestItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  linkUrl?: string;
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

  // Purchasing Department (Setor de Compras) details
  purchaseStatus: PurchaseOrderStatus;
  purchaseOrderNumber?: string; // e.g., OC-2026-042
  supplier?: string;
  unitPrice?: number;
  totalPrice?: number; // Valor final de compra preenchido por Compras
  shippingCost?: number;
  purchaseDate?: string;
  expectedDeliveryDate?: string;
  purchasedBy?: string;
  purchasingNotes?: string;
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
