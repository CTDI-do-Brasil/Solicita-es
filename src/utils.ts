import { PurchaseOrderStatus, ManagerApprovalStatus, SectorType, User, PurchaseRequest, ApproverName } from './types';

export function formatCurrency(value?: number | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'Não cotado';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString?: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
}

export function getPurchaseStatusInfo(status: PurchaseOrderStatus): {
  label: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  step: number;
} {
  switch (status) {
    case 'aguardando_aprovacao_gestor':
      return {
        label: 'Aguardando Aprovação do Gerente',
        colorClass: 'text-amber-800',
        bgClass: 'bg-amber-50',
        borderClass: 'border-amber-200',
        step: 1,
      };
    case 'recebido_em_compras':
      return {
        label: 'Recebido em Compras',
        colorClass: 'text-blue-800',
        bgClass: 'bg-blue-50',
        borderClass: 'border-blue-200',
        step: 2,
      };
    case 'em_cotacao':
      return {
        label: 'Em Cotação com Fornecedores',
        colorClass: 'text-indigo-800',
        bgClass: 'bg-indigo-50',
        borderClass: 'border-indigo-200',
        step: 3,
      };
    case 'em_aprovacao':
      return {
        label: 'Em Aprovação da Diretoria',
        colorClass: 'text-purple-800',
        bgClass: 'bg-purple-50',
        borderClass: 'border-purple-200',
        step: 3,
      };
    case 'reprovado_aprovadores':
      return {
        label: 'Reprovado por Aprovador',
        colorClass: 'text-rose-800',
        bgClass: 'bg-rose-50',
        borderClass: 'border-rose-200',
        step: 0,
      };
    case 'pedido_emitido':
      return {
        label: 'Pedido de Compra Emitido',
        colorClass: 'text-cyan-800',
        bgClass: 'bg-cyan-50',
        borderClass: 'border-cyan-200',
        step: 4,
      };
    case 'compra_realizada':
      return {
        label: 'Compra Realizada',
        colorClass: 'text-emerald-800',
        bgClass: 'bg-emerald-50',
        borderClass: 'border-emerald-200',
        step: 5,
      };
    case 'em_transito':
      return {
        label: 'Em Trânsito / Entrega',
        colorClass: 'text-teal-800',
        bgClass: 'bg-teal-50',
        borderClass: 'border-teal-200',
        step: 5,
      };
    case 'entregue':
      return {
        label: 'Entregue no Setor',
        colorClass: 'text-green-800',
        bgClass: 'bg-green-100',
        borderClass: 'border-green-300',
        step: 6,
      };
    case 'cancelado':
      return {
        label: 'Cancelado / Recusado',
        colorClass: 'text-rose-800',
        bgClass: 'bg-rose-50',
        borderClass: 'border-rose-200',
        step: 0,
      };
    default:
      return {
        label: status,
        colorClass: 'text-slate-800',
        bgClass: 'bg-slate-100',
        borderClass: 'border-slate-200',
        step: 1,
      };
  }
}

export function getManagerApprovalInfo(status: ManagerApprovalStatus): {
  label: string;
  badgeClass: string;
} {
  switch (status) {
    case 'aprovado':
      return {
        label: 'Aprovado',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      };
    case 'reprovado':
      return {
        label: 'Reprovado',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
      };
    case 'pendente':
    default:
      return {
        label: 'Pendente',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
      };
  }
}

export function getSectorColor(sector: SectorType): {
  badge: string;
  tag: string;
  accent: string;
  dot: string;
  bg: string;
  text: string;
  border: string;
} {
  switch (sector) {
    case 'Produção':
      return {
        badge: 'bg-orange-100 text-orange-800 border-orange-200',
        tag: 'bg-orange-500',
        dot: 'bg-orange-500',
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        border: 'border-orange-200',
        accent: '#f97316',
      };
    case 'Fiscal':
      return {
        badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        tag: 'bg-indigo-500',
        dot: 'bg-indigo-500',
        bg: 'bg-indigo-100',
        text: 'text-indigo-800',
        border: 'border-indigo-200',
        accent: '#6366f1',
      };
    case 'Financeiro':
      return {
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        tag: 'bg-emerald-500',
        dot: 'bg-emerald-500',
        bg: 'bg-emerald-100',
        text: 'text-emerald-800',
        border: 'border-emerald-200',
        accent: '#10b981',
      };
    case 'RH':
      return {
        badge: 'bg-pink-100 text-pink-800 border-pink-200',
        tag: 'bg-pink-500',
        dot: 'bg-pink-500',
        bg: 'bg-pink-100',
        text: 'text-pink-800',
        border: 'border-pink-200',
        accent: '#ec4899',
      };
    case 'EHS':
      return {
        badge: 'bg-teal-100 text-teal-800 border-teal-200',
        tag: 'bg-teal-500',
        dot: 'bg-teal-500',
        bg: 'bg-teal-100',
        text: 'text-teal-800',
        border: 'border-teal-200',
        accent: '#14b8a6',
      };
    case 'Manutenção':
      return {
        badge: 'bg-amber-100 text-amber-800 border-amber-200',
        tag: 'bg-amber-500',
        dot: 'bg-amber-500',
        bg: 'bg-amber-100',
        text: 'text-amber-800',
        border: 'border-amber-200',
        accent: '#f59e0b',
      };
    case 'Engenharia':
      return {
        badge: 'bg-blue-100 text-blue-800 border-blue-200',
        tag: 'bg-blue-500',
        dot: 'bg-blue-500',
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        border: 'border-blue-200',
        accent: '#3b82f6',
      };
    case 'TI':
      return {
        badge: 'bg-violet-100 text-violet-800 border-violet-200',
        tag: 'bg-violet-500',
        dot: 'bg-violet-500',
        bg: 'bg-violet-100',
        text: 'text-violet-800',
        border: 'border-violet-200',
        accent: '#8b5cf6',
      };
    case 'Administrativo':
      return {
        badge: 'bg-slate-100 text-slate-800 border-slate-200',
        tag: 'bg-slate-500',
        dot: 'bg-slate-500',
        bg: 'bg-slate-100',
        text: 'text-slate-800',
        border: 'border-slate-200',
        accent: '#64748b',
      };
    case 'Compras':
      return {
        badge: 'bg-cyan-100 text-cyan-800 border-cyan-200',
        tag: 'bg-cyan-600',
        dot: 'bg-cyan-600',
        bg: 'bg-cyan-100',
        text: 'text-cyan-800',
        border: 'border-cyan-200',
        accent: '#0891b2',
      };
    default:
      return {
        badge: 'bg-slate-100 text-slate-800 border-slate-200',
        tag: 'bg-slate-500',
        dot: 'bg-slate-500',
        bg: 'bg-slate-100',
        text: 'text-slate-800',
        border: 'border-slate-200',
        accent: '#64748b',
      };
  }
}

export function getRequestDelayInfo(request?: {
  createdAt: string;
  managerApprovalStatus?: string;
  managerApprovedAt?: string;
  purchaseStatus?: string;
} | null): {
  isDelayed: boolean;
  hoursElapsed: number;
  receivedDate: Date | null;
  formattedTime: string;
  message: string;
  badgeClass: string;
} {
  if (!request) {
    return {
      isDelayed: false,
      hoursElapsed: 0,
      receivedDate: null,
      formattedTime: '',
      message: '',
      badgeClass: '',
    };
  }

  // Se a compra já foi concluída, entregue ou cancelada, não está em atraso
  if (
    request.purchaseStatus === 'compra_realizada' ||
    request.purchaseStatus === 'em_transito' ||
    request.purchaseStatus === 'entregue' ||
    request.purchaseStatus === 'cancelado'
  ) {
    return {
      isDelayed: false,
      hoursElapsed: 0,
      receivedDate: null,
      formattedTime: '',
      message: '',
      badgeClass: '',
    };
  }

  // A solicitação é oficialmente recebida por Compras após aprovação do gestor
  if (request.managerApprovalStatus !== 'aprovado') {
    return {
      isDelayed: false,
      hoursElapsed: 0,
      receivedDate: null,
      formattedTime: '',
      message: '',
      badgeClass: '',
    };
  }

  const receivedIso = request.managerApprovedAt || request.createdAt;
  const receivedTime = new Date(receivedIso).getTime();
  if (isNaN(receivedTime)) {
    return {
      isDelayed: false,
      hoursElapsed: 0,
      receivedDate: null,
      formattedTime: '',
      message: '',
      badgeClass: '',
    };
  }

  const diffMs = Date.now() - receivedTime;
  const hoursElapsed = Math.floor(diffMs / (1000 * 60 * 60));

  if (hoursElapsed >= 48) {
    return {
      isDelayed: true,
      hoursElapsed,
      receivedDate: new Date(receivedIso),
      formattedTime: `${hoursElapsed}h`,
      message: 'Solicitação em atraso',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
    };
  }

  return {
    isDelayed: false,
    hoursElapsed,
    receivedDate: new Date(receivedIso),
    formattedTime: `${hoursElapsed}h`,
    message: '',
    badgeClass: '',
  };
}

export function getApproverFromUser(user: User): ApproverName | null {
  if (user.role === 'aprovador' || user.role === 'master') {
    const nameLower = user.name.toLowerCase();
    if (nameLower.includes('fernando') && !nameLower.includes('luiz')) return 'Fernando';
    if (nameLower.includes('eduardo')) return 'Eduardo';
    if (nameLower.includes('luiz')) return 'Luiz';
  }
  return null;
}

export function getApproversProgressInfo(request: PurchaseRequest): {
  isWaitingApprovers: boolean;
  isFullyApproved: boolean;
  isReproved: boolean;
  currentApprover: ApproverName | null;
  progressPercent: number;
  stepIndex: number; // 0: None, 1: Fernando, 2: Eduardo, 3: Luiz, 4: Done
  badgeLabel: string;
  badgeClass: string;
  description: string;
} {
  const ap = request.approvals;
  if (!ap) {
    return {
      isWaitingApprovers: false,
      isFullyApproved: false,
      isReproved: false,
      currentApprover: null,
      progressPercent: 0,
      stepIndex: 0,
      badgeLabel: 'Não Enviado',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      description: 'Ainda não enviado para alçada de aprovadores',
    };
  }

  if (ap.currentApprover === 'reprovado' || request.purchaseStatus === 'reprovado_aprovadores') {
    return {
      isWaitingApprovers: false,
      isFullyApproved: false,
      isReproved: true,
      currentApprover: null,
      progressPercent: 100,
      stepIndex: 0,
      badgeLabel: 'Reprovado na Alçada',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
      description: 'Reprovado durante a alçada de aprovação',
    };
  }

  if (ap.currentApprover === 'concluido' || (ap.fernando?.status === 'aprovado' && ap.eduardo?.status === 'aprovado' && ap.luiz?.status === 'aprovado')) {
    return {
      isWaitingApprovers: false,
      isFullyApproved: true,
      isReproved: false,
      currentApprover: null,
      progressPercent: 100,
      stepIndex: 4,
      badgeLabel: 'Aprovado (3/3)',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
      description: 'Aprovado por Fernando, Eduardo e Luiz',
    };
  }

  if (ap.currentApprover === 'Fernando') {
    return {
      isWaitingApprovers: true,
      isFullyApproved: false,
      isReproved: false,
      currentApprover: 'Fernando',
      progressPercent: 15,
      stepIndex: 1,
      badgeLabel: 'Aguardando Fernando (1/3)',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
      description: 'Na vez do 1º Aprovador (Fernando)',
    };
  }

  if (ap.currentApprover === 'Eduardo') {
    return {
      isWaitingApprovers: true,
      isFullyApproved: false,
      isReproved: false,
      currentApprover: 'Eduardo',
      progressPercent: 50,
      stepIndex: 2,
      badgeLabel: 'Aguardando Eduardo (2/3)',
      badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300 font-semibold',
      description: 'Aprovado por Fernando. Na vez de Eduardo (2º)',
    };
  }

  if (ap.currentApprover === 'Luiz') {
    return {
      isWaitingApprovers: true,
      isFullyApproved: false,
      isReproved: false,
      currentApprover: 'Luiz',
      progressPercent: 80,
      stepIndex: 3,
      badgeLabel: 'Aguardando Luiz (3/3)',
      badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 font-semibold',
      description: 'Aprovado por Fernando e Eduardo. Na vez de Luiz (3º)',
    };
  }

  return {
    isWaitingApprovers: false,
    isFullyApproved: false,
    isReproved: false,
    currentApprover: null,
    progressPercent: 0,
    stepIndex: 0,
    badgeLabel: 'Em Análise',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    description: 'Em análise pelos aprovadores',
  };
}


