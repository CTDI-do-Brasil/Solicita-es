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

export function getLatestRequestStatusInfo(req: PurchaseRequest): {
  label: string;
  badgeClass: string;
} {
  // 1. If cancelled
  if (req.purchaseStatus === 'cancelado') {
    return {
      label: 'Cancelado',
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-200 font-semibold',
    };
  }

  // 2. Manager approval stage
  if (req.managerApprovalStatus === 'pendente') {
    return {
      label: 'Aguardando Aprovação do Gerente',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold',
    };
  }
  if (req.managerApprovalStatus === 'reprovado') {
    return {
      label: 'Reprovado pelo Gerente',
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-200 font-semibold',
    };
  }

  // 3. Reproved in approvers chain
  if (req.purchaseStatus === 'reprovado_aprovadores' || req.approvals?.currentApprover === 'reprovado') {
    return {
      label: 'Reprovado na Alçada',
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-200 font-semibold',
    };
  }

  // 4. In executive approval pipeline
  if (req.purchaseStatus === 'em_aprovacao') {
    const cur = req.approvals?.currentApprover;
    if (cur === 'Fernando' || cur === 'Eduardo' || cur === 'Luiz') {
      return {
        label: `Aguardando Alçada (${cur})`,
        badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 font-semibold',
      };
    }
    if (cur === 'concluido') {
      return {
        label: 'Aprovado na Alçada (Liberado)',
        badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold',
      };
    }
    return {
      label: 'Em Aprovação da Diretoria',
      badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 font-semibold',
    };
  }

  // 5. Subsequent purchasing fulfillment stages
  if (req.purchaseStatus === 'entregue') {
    return {
      label: 'Entregue no Setor',
      badgeClass: 'bg-green-100 text-green-900 border-green-300 font-semibold',
    };
  }
  if (req.purchaseStatus === 'em_transito') {
    return {
      label: 'Em Trânsito',
      badgeClass: 'bg-teal-50 text-teal-800 border-teal-200 font-semibold',
    };
  }
  if (req.purchaseStatus === 'compra_realizada') {
    return {
      label: 'Compra Realizada',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold',
    };
  }
  if (req.purchaseStatus === 'pedido_emitido') {
    return {
      label: 'Pedido de Compra Emitido',
      badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200 font-semibold',
    };
  }
  if (req.purchaseStatus === 'em_cotacao') {
    return {
      label: 'Em Cotação',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 font-semibold',
    };
  }
  if (req.purchaseStatus === 'recebido_em_compras') {
    return {
      label: 'Aguardando Cotação',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 font-semibold',
    };
  }

  const fallback = getPurchaseStatusInfo(req.purchaseStatus);
  return {
    label: fallback.label,
    badgeClass: `${fallback.bgClass} ${fallback.colorClass} ${fallback.borderClass} font-semibold`,
  };
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

export interface RequestPurchaseReleaseInfo {
  isReleased: boolean;
  status: 'liberada' | 'aguardando_gestor' | 'aguardando_alcada' | 'reprovada' | 'cancelada' | 'concluida';
  badgeLabel: string;
  badgeClass: string;
  dotColor: string;
  title: string;
  description: string;
  approvalStageText: string;
}

export function getRequestPurchaseReleaseInfo(request: PurchaseRequest): RequestPurchaseReleaseInfo {
  if (request.purchaseStatus === 'cancelado' || request.managerApprovalStatus === 'reprovado') {
    return {
      isReleased: false,
      status: request.purchaseStatus === 'cancelado' ? 'cancelada' : 'reprovada',
      badgeLabel: 'Não Liberada (Reprovada)',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
      dotColor: 'bg-rose-500',
      title: 'Compra Não Autorizada / Reprovada',
      description: request.managerNotes
        ? `Reprovada pelo Gestor: ${request.managerNotes}`
        : 'Solicitação reprovada ou cancelada. Compra bloqueada.',
      approvalStageText: 'Reprovada',
    };
  }

  if (request.managerApprovalStatus === 'pendente') {
    return {
      isReleased: false,
      status: 'aguardando_gestor',
      badgeLabel: 'Aguardando Gestor (Não Liberada)',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
      dotColor: 'bg-amber-500',
      title: 'Aguardando Aprovação do Gestor',
      description: 'A solicitação ainda não foi aprovada pelo gestor do setor. Não está liberada para compra.',
      approvalStageText: 'Pendente Gestor da Área',
    };
  }

  // Manager is approved
  const ap = request.approvals;
  if (ap) {
    if (ap.currentApprover === 'reprovado' || request.purchaseStatus === 'reprovado_aprovadores') {
      return {
        isReleased: false,
        status: 'reprovada',
        badgeLabel: 'Bloqueada na Alçada',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
        dotColor: 'bg-rose-500',
        title: 'Reprovada na Alçada da Diretoria',
        description: 'Solicitação reprovada durante o processo de alçada da diretoria. Compra bloqueada.',
        approvalStageText: 'Reprovada por Aprovador',
      };
    }

    if (
      ap.currentApprover === 'concluido' ||
      (ap.fernando?.status === 'aprovado' &&
        ap.eduardo?.status === 'aprovado' &&
        ap.luiz?.status === 'aprovado')
    ) {
      const isFinished =
        request.purchaseStatus === 'compra_realizada' || request.purchaseStatus === 'entregue';
      return {
        isReleased: true,
        status: isFinished ? 'concluida' : 'liberada',
        badgeLabel: isFinished ? 'Compra Realizada (Aprovada)' : 'Liberada para Compra',
        badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
        dotColor: 'bg-emerald-500',
        title: 'Liberada para Compra após Aprovação',
        description: 'Aprovada 100% pela Alçada da Diretoria (Fernando ➔ Eduardo ➔ Luiz) e pelo Gestor da Área. Liberada para compra.',
        approvalStageText: 'Alçada Concluída (3/3) - 100% Aprovada',
      };
    }

    if (ap.currentApprover === 'Fernando' || ap.currentApprover === 'Eduardo' || ap.currentApprover === 'Luiz') {
      return {
        isReleased: false,
        status: 'aguardando_alcada',
        badgeLabel: `Aguardando Alçada (${ap.currentApprover})`,
        badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 font-semibold',
        dotColor: 'bg-purple-500',
        title: `Em Aprovação da Diretoria (Na vez de ${ap.currentApprover})`,
        description: `Enviada para aprovação da diretoria. Na vez de ${ap.currentApprover}. Não liberada para compra ainda.`,
        approvalStageText: `Na vez de ${ap.currentApprover}`,
      };
    }
  }

  // Without approvals object
  if (request.purchaseStatus === 'em_aprovacao') {
    return {
      isReleased: false,
      status: 'aguardando_alcada',
      badgeLabel: 'Em Aprovação da Diretoria',
      badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 font-semibold',
      dotColor: 'bg-purple-500',
      title: 'Em Aprovação da Diretoria',
      description: 'Solicitação aguardando avaliação pela alçada de aprovadores.',
      approvalStageText: 'Aguardando Diretoria',
    };
  }

  if (
    request.purchaseStatus === 'compra_realizada' ||
    request.purchaseStatus === 'em_transito' ||
    request.purchaseStatus === 'entregue'
  ) {
    return {
      isReleased: true,
      status: 'concluida',
      badgeLabel: 'Compra Realizada',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold',
      dotColor: 'bg-emerald-500',
      title: 'Compra Realizada',
      description: 'Aprovada pelo gestor e processo de compra finalizado.',
      approvalStageText: 'Aprovada pelo Gestor',
    };
  }

  // Regra de Compras: Somente Compras coloca o valor dos produtos, e na parte de compras sempre tem que ter valor
  if (!request.totalPrice || request.totalPrice <= 0) {
    return {
      isReleased: false,
      status: 'aguardando_gestor',
      badgeLabel: 'Aguardando Cotação',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
      dotColor: 'bg-amber-500',
      title: 'Aguardando Cotação por Compras',
      description: request.managerApprovedBy
        ? `Aprovada pelo Gestor (${request.managerApprovedBy}), mas aguarda preenchimento de valor pelo Setor de Compras.`
        : 'Aprovada pelo Gestor, mas aguarda definição de valor por Compras.',
      approvalStageText: 'Aguardando Cotação por Compras',
    };
  }

  // Se o status da compra ainda é recebido em compras ou em cotação, está em fase de cotação
  if (request.purchaseStatus === 'recebido_em_compras' || request.purchaseStatus === 'em_cotacao') {
    return {
      isReleased: false,
      status: 'aguardando_gestor',
      badgeLabel: 'Aguardando Cotação',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
      dotColor: 'bg-amber-500',
      title: 'Aguardando Cotação com Fornecedores',
      description: request.purchaseStatus === 'em_cotacao'
        ? 'Solicitação em processo ativo de cotação de preços com fornecedores pelo Setor de Compras.'
        : 'Recebida no Setor de Compras. Aguardando propostas e cotações de fornecedores.',
      approvalStageText: 'Em Cotação por Compras',
    };
  }

  // Approved by manager and price defined by purchasing!
  return {
    isReleased: true,
    status: 'liberada',
    badgeLabel: 'Liberada para Compra',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
    dotColor: 'bg-emerald-500',
    title: 'Liberada para Compra após Aprovação',
    description: request.managerApprovedBy
      ? `Aprovada pelo Gestor (${request.managerApprovedBy}). Valor definido por Compras: liberada para compra.`
      : 'Aprovada pelo Gestor da Área e valor definido por Compras. Liberada para compra.',
    approvalStageText: 'Aprovada pelo Gestor da Área',
  };
}

/**
 * Determina se uma solicitação está aguardando cotação de fornecedores
 * ou definição de valor pela equipe de compras.
 */
export function isRequestWaitingQuote(request: PurchaseRequest): boolean {
  if (
    request.purchaseStatus === 'compra_realizada' ||
    request.purchaseStatus === 'entregue' ||
    request.purchaseStatus === 'cancelado' ||
    request.purchaseStatus === 'pedido_emitido' ||
    request.purchaseStatus === 'em_transito'
  ) {
    return false;
  }
  if (request.purchaseStatus === 'em_aprovacao') {
    return false;
  }
  // Se está explicitamente recebido em compras ou em cotação
  if (request.purchaseStatus === 'recebido_em_compras' || request.purchaseStatus === 'em_cotacao') {
    return true;
  }
  // Se não possui valor total definido por compras (> 0)
  if (!request.totalPrice || request.totalPrice <= 0) {
    return true;
  }
  return false;
}

/**
 * Detecta se a aplicação está rodando em ambiente local (desenvolvimento / teste local)
 * ou em ambiente oficial na Web (produção).
 */
export function isLocalEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || Boolean(import.meta.env?.DEV);
}



