import React, { useState } from 'react';
import { PurchaseRequest, User, ApproverName } from '../types';
import { storage } from '../storage';
import { 
  formatCurrency, 
  formatDate, 
  formatDateTime, 
  getPurchaseStatusInfo, 
  getManagerApprovalInfo, 
  getSectorColor,
  getRequestDelayInfo,
  getApproverFromUser
} from '../utils';
import { 
  X, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Building2, 
  DollarSign, 
  FileText, 
  Truck, 
  Check, 
  Calendar,
  AlertTriangle,
  Receipt,
  FileCheck2,
  BellRing,
  AlertCircle,
  Package,
  ShieldCheck,
  Lock
} from 'lucide-react';

interface OrderDetailsModalProps {
  request: PurchaseRequest;
  currentUser: User;
  onClose: () => void;
  onStatusChanged: () => void;
  onOpenPurchasingEdit?: (req: PurchaseRequest) => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  request,
  currentUser,
  onClose,
  onStatusChanged,
  onOpenPurchasingEdit,
}) => {
  const [managerNotes, setManagerNotes] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [actionError, setActionError] = useState('');
  const [approverNotes, setApproverNotes] = useState('');

  const statusInfo = getPurchaseStatusInfo(request.purchaseStatus);
  const approvalInfo = getManagerApprovalInfo(request.managerApprovalStatus);
  const sectorColor = getSectorColor(request.sector);
  const delayInfo = getRequestDelayInfo(request);

  const isManagerOfSector = currentUser.role === 'master' || (currentUser.role === 'gestor' && currentUser.sector === request.sector);
  const isPurchasingUser = currentUser.role === 'compras' || currentUser.role === 'master';
  const canApprove = isManagerOfSector && request.managerApprovalStatus === 'pendente';

  // Approvers logic
  const detectedApprover = getApproverFromUser(currentUser);
  const currentStep = request.approvals?.currentApprover;
  const canApproverAct = 
    request.purchaseStatus === 'em_aprovacao' && 
    (currentUser.role === 'master' || (detectedApprover && detectedApprover === currentStep));

  const handleApprove = () => {
    setActionError('');
    const success = storage.approveRequestByManager(request.id, currentUser, managerNotes);
    if (success) {
      onStatusChanged();
    } else {
      setActionError('Não foi possível aprovar a solicitação.');
    }
  };

  const handleReject = () => {
    if (!managerNotes.trim()) {
      setActionError('O motivo da reprovação é obrigatório. Por favor, informe a justificativa.');
      setShowRejectForm(true);
      return;
    }
    const success = storage.rejectRequestByManager(request.id, currentUser, managerNotes.trim());
    if (success) {
      onStatusChanged();
    } else {
      setActionError('Não foi possível reprovar a solicitação.');
    }
  };

  const handleApproverApprove = () => {
    const approverToUse = (detectedApprover || currentStep as ApproverName || 'Fernando');
    const success = storage.approveByApprover(request.id, approverToUse, currentUser, approverNotes);
    if (success) {
      onStatusChanged();
    } else {
      setActionError('Não foi possível aprovar.');
    }
  };

  const handleApproverReject = () => {
    if (!approverNotes.trim()) {
      setActionError('Para reprovar, é obrigatório preencher a justificativa.');
      return;
    }
    const approverToUse = (detectedApprover || currentStep as ApproverName || 'Fernando');
    const success = storage.rejectByApprover(request.id, approverToUse, currentUser, approverNotes.trim());
    if (success) {
      onStatusChanged();
    } else {
      setActionError('Não foi possível reprovar.');
    }
  };

  // Steps for visual tracking
  const steps = [
    { label: 'Solicitado', done: true, date: formatDate(request.createdAt) },
    { 
      label: 'Aprovação Gerente', 
      done: request.managerApprovalStatus === 'aprovado',
      date: request.managerApprovedAt ? formatDate(request.managerApprovedAt) : 'Pendente' 
    },
    { 
      label: 'Em Cotação', 
      done: statusInfo.step >= 3,
      date: statusInfo.step >= 3 ? 'Em análise' : '-' 
    },
    { 
      label: 'Alçada Aprovadores', 
      done: request.approvals?.currentApprover === 'concluido' || (request.approvals?.fernando?.status === 'aprovado' && request.approvals?.eduardo?.status === 'aprovado' && request.approvals?.luiz?.status === 'aprovado'),
      date: request.approvals?.currentApprover === 'concluido' 
        ? 'Aprovado 100%' 
        : request.approvals?.currentApprover === 'reprovado' 
        ? 'Reprovado' 
        : request.approvals 
        ? `Na vez de ${request.approvals.currentApprover}` 
        : '-' 
    },
    { 
      label: 'Pedido Emitido', 
      done: statusInfo.step >= 4,
      date: request.purchaseOrderNumber || '-' 
    },
    { 
      label: 'Compra Realizada', 
      done: statusInfo.step >= 5,
      date: request.purchaseDate ? formatDate(request.purchaseDate) : '-' 
    },
    { 
      label: 'Entregue', 
      done: statusInfo.step >= 6,
      date: request.expectedDeliveryDate ? formatDate(request.expectedDeliveryDate) : '-' 
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-slate-800 text-white shadow-xs">
              {request.code}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${sectorColor.badge}`}>
                  Setor: {request.sector}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusInfo.bgClass} ${statusInfo.colorClass} ${statusInfo.borderClass}`}>
                  {statusInfo.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Criado em {formatDateTime(request.createdAt)} por <strong>{request.requesterName}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Main Title & Priority */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-snug">
                {request.title}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-medium">
                  {request.items && request.items.length > 1
                    ? `Total: ${request.items.length} itens (${request.quantity} ${request.unit})`
                    : `Quantidade: ${request.quantity} ${request.unit}`}
                </span>
                <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded capitalize">
                  Prioridade: <strong>{request.priority}</strong>
                </span>
              </div>
            </div>

            {/* Quick Action Button for Purchasing if Buyer is viewing */}
            {isPurchasingUser && onOpenPurchasingEdit && (
              <button
                onClick={() => onOpenPurchasingEdit(request)}
                className="shrink-0 px-3 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <DollarSign className="w-3.5 h-3.5" />
                Gerenciar Pedido & Valor
              </button>
            )}
          </div>

          {/* Progress Timeline */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Linha do Tempo da Solicitação
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              {steps.map((step, idx) => (
                <div key={idx} className="flex flex-col items-center text-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step.done 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    {step.done ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span className={`text-[11px] mt-1.5 font-medium leading-tight ${
                    step.done ? 'text-slate-900 font-bold' : 'text-slate-400'
                  }`}>
                    {step.label}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    {step.date}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Value Reflected Card - KEY REQUIREMENT FROM USER PROMPT */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                    Valor da Compra (Definido por Compras)
                  </h3>
                  <p className="text-[11px] text-emerald-700">
                    Refletido diretamente ao solicitante e computado no orçamento do setor
                  </p>
                </div>
              </div>

              {request.totalPrice !== undefined && request.totalPrice > 0 ? (
                <div className="text-right">
                  <div className="text-xl font-extrabold text-emerald-900 tracking-tight">
                    {formatCurrency(request.totalPrice)}
                  </div>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    Valor total faturado
                  </span>
                </div>
              ) : (
                <div className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg border border-amber-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Aguardando cotação / inserção de valor por Compras
                </div>
              )}
            </div>

            {/* Financial Breakdown if filled */}
            {request.totalPrice !== undefined && request.totalPrice > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 mt-2 border-t border-emerald-200/80 text-xs">
                <div>
                  <span className="text-[11px] text-emerald-800">Preço Unitário:</span>
                  <div className="font-semibold text-emerald-950">{formatCurrency(request.unitPrice)}</div>
                </div>
                <div>
                  <span className="text-[11px] text-emerald-800">Frete / Encargos:</span>
                  <div className="font-semibold text-emerald-950">{formatCurrency(request.shippingCost || 0)}</div>
                </div>
                <div>
                  <span className="text-[11px] text-emerald-800">Fornecedor:</span>
                  <div className="font-semibold text-emerald-950 truncate">{request.supplier || 'Não informado'}</div>
                </div>
                <div>
                  <span className="text-[11px] text-emerald-800">Nº Pedido (OC):</span>
                  <div className="font-mono font-bold text-emerald-950">{request.purchaseOrderNumber || 'Em emissão'}</div>
                </div>
              </div>
            )}
          </div>

          {/* Description and Items Breakdown */}
          <div className="space-y-4">
            {request.items && request.items.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-indigo-600" />
                    Itens Solicitados ({request.items.length})
                  </h4>
                  <span className="text-xs text-slate-500 font-medium">
                    Total: <strong>{request.quantity} {request.unit}</strong>
                  </span>
                </div>

                <div className="space-y-2.5">
                  {request.items.map((item, idx) => (
                    <div 
                      key={item.id || idx}
                      className="p-3.5 bg-slate-50/90 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className="shrink-0 w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center mt-0.5">
                            {idx + 1}
                          </span>
                          <div>
                            <h5 className="text-sm font-bold text-slate-900 leading-snug">
                              {item.name}
                            </h5>
                            {item.description && (
                              <p className="text-xs text-slate-600 mt-1 whitespace-pre-line leading-relaxed">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <span className="inline-block px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 shadow-2xs">
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                      </div>

                      {item.linkUrl && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200/60 pl-8.5">
                          <a
                            href={item.linkUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline break-all"
                          >
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                            <span>Link de Referência do Item</span>
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Descrição do Item
                </h4>
                <p className="text-sm text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-line leading-relaxed">
                  {request.description}
                </p>
              </div>
            )}

            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Motivo / Justificativa da Compra
              </h4>
              <p className="text-sm text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200 whitespace-pre-line leading-relaxed">
                {request.reason}
              </p>
            </div>

            {/* Reference Link (for legacy single-item requests without items array) */}
            {(!request.items || request.items.length === 0) && request.linkUrl && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Link de Referência
                </h4>
                <a
                  href={request.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-100 transition-colors break-all"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  <span>{request.linkUrl}</span>
                </a>
              </div>
            )}
          </div>

          {/* Manager Approval Record */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className={`w-4 h-4 ${
                  request.managerApprovalStatus === 'aprovado'
                    ? 'text-emerald-600'
                    : request.managerApprovalStatus === 'reprovado'
                    ? 'text-rose-600'
                    : 'text-amber-500'
                }`} />
                Aprovação do Gestor da Área ({request.sector})
              </span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${approvalInfo.badgeClass}`}>
                {approvalInfo.label}
              </span>
            </div>
            {request.managerApprovalStatus === 'reprovado' && request.managerNotes && (
              <div className="mt-3 pt-3 border-t border-rose-200/80 bg-rose-50/70 p-3 rounded-lg border border-rose-200">
                <span className="text-xs font-bold text-rose-900 block uppercase tracking-wider">
                  Motivo da Reprovação:
                </span>
                <p className="text-xs text-rose-950 mt-1 whitespace-pre-line leading-relaxed">
                  {request.managerNotes}
                </p>
                {request.managerApprovedBy && (
                  <p className="text-[11px] text-rose-700 mt-1.5 font-medium">
                    Reprovado por: <strong>{request.managerApprovedBy}</strong> {request.managerApprovedAt && `em ${formatDateTime(request.managerApprovedAt)}`}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Executive Approver Chain Record (Fernando -> Eduardo -> Luiz) */}
          {request.approvals && (
            <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-700" />
                  Alçada Executiva de Aprovadores: Fernando ➔ Eduardo ➔ Luiz
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                  request.approvals.currentApprover === 'concluido'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : request.approvals.currentApprover === 'reprovado'
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}>
                  {request.approvals.currentApprover === 'concluido'
                    ? 'Aprovado por Todos (3/3)'
                    : request.approvals.currentApprover === 'reprovado'
                    ? 'Reprovado na Alçada'
                    : `Na vez de ${request.approvals.currentApprover}`}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                {/* 1. Fernando */}
                <div className={`p-2.5 rounded-lg border ${
                  request.approvals.fernando?.status === 'aprovado'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : request.approvals.fernando?.status === 'reprovado'
                    ? 'bg-rose-50 border-rose-300 text-rose-900'
                    : request.approvals.currentApprover === 'Fernando'
                    ? 'bg-amber-50 border-amber-300 text-amber-950 font-semibold'
                    : 'bg-white border-slate-200 text-slate-400'
                }`}>
                  <div className="font-bold">1º Fernando (Operações)</div>
                  <div className="text-[11px] mt-0.5">
                    {request.approvals.fernando?.status === 'aprovado' && (
                      <span className="text-emerald-800">Aprovado {request.approvals.fernando.approvedAt && `em ${formatDate(request.approvals.fernando.approvedAt)}`}</span>
                    )}
                    {request.approvals.fernando?.status === 'reprovado' && (
                      <span className="text-rose-800">Reprovado: {request.approvals.fernando.notes}</span>
                    )}
                    {request.approvals.currentApprover === 'Fernando' && (
                      <span className="text-amber-800">Pendente de avaliação</span>
                    )}
                    {request.approvals.fernando?.status === 'bloqueado' && (
                      <span>Aguardando</span>
                    )}
                  </div>
                </div>

                {/* 2. Eduardo */}
                <div className={`p-2.5 rounded-lg border ${
                  request.approvals.eduardo?.status === 'aprovado'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : request.approvals.eduardo?.status === 'reprovado'
                    ? 'bg-rose-50 border-rose-300 text-rose-900'
                    : request.approvals.currentApprover === 'Eduardo'
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-semibold'
                    : 'bg-white border-slate-200 text-slate-400'
                }`}>
                  <div className="font-bold">2º Eduardo (Financeiro)</div>
                  <div className="text-[11px] mt-0.5">
                    {request.approvals.eduardo?.status === 'aprovado' && (
                      <span className="text-emerald-800">Aprovado {request.approvals.eduardo.approvedAt && `em ${formatDate(request.approvals.eduardo.approvedAt)}`}</span>
                    )}
                    {request.approvals.eduardo?.status === 'reprovado' && (
                      <span className="text-rose-800">Reprovado: {request.approvals.eduardo.notes}</span>
                    )}
                    {request.approvals.currentApprover === 'Eduardo' && (
                      <span className="text-indigo-800">Pendente de avaliação</span>
                    )}
                    {request.approvals.eduardo?.status === 'bloqueado' && (
                      <span>Aguardando Fernando</span>
                    )}
                  </div>
                </div>

                {/* 3. Luiz */}
                <div className={`p-2.5 rounded-lg border ${
                  request.approvals.luiz?.status === 'aprovado'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : request.approvals.luiz?.status === 'reprovado'
                    ? 'bg-rose-50 border-rose-300 text-rose-900'
                    : request.approvals.currentApprover === 'Luiz'
                    ? 'bg-purple-50 border-purple-300 text-purple-950 font-semibold'
                    : 'bg-white border-slate-200 text-slate-400'
                }`}>
                  <div className="font-bold">3º Luiz (Diretor Geral)</div>
                  <div className="text-[11px] mt-0.5">
                    {request.approvals.luiz?.status === 'aprovado' && (
                      <span className="text-emerald-800">Aprovado {request.approvals.luiz.approvedAt && `em ${formatDate(request.approvals.luiz.approvedAt)}`}</span>
                    )}
                    {request.approvals.luiz?.status === 'reprovado' && (
                      <span className="text-rose-800">Reprovado: {request.approvals.luiz.notes}</span>
                    )}
                    {request.approvals.currentApprover === 'Luiz' && (
                      <span className="text-purple-800">Pendente de chancela final</span>
                    )}
                    {request.approvals.luiz?.status === 'bloqueado' && (
                      <span>Aguardando Eduardo</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Purchasing Notes and Dates (if applicable) */}
          {(request.purchaseDate || request.expectedDeliveryDate) && (
            <div className="p-4 rounded-xl border border-cyan-200 bg-cyan-50/40 space-y-2">
              <div className="text-xs font-bold text-cyan-950 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-cyan-700" />
                Detalhes de Faturamento e Entrega (Setor de Compras)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-cyan-950">
                {request.purchaseDate && (
                  <div>
                    <strong>Data da Compra:</strong> {formatDate(request.purchaseDate)}
                  </div>
                )}
                {request.expectedDeliveryDate && (
                  <div>
                    <strong>Previsão de Entrega:</strong> {formatDate(request.expectedDeliveryDate)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SEÇÃO: MONITORAMENTO DE SLA (PRAZO OPERACIONAL DE 48H) */}
          {delayInfo.isDelayed ? (
            <div 
              id={`modal-alerta-atraso-${request.id}`}
              className="p-4 rounded-xl border-2 border-rose-300 bg-rose-50/90 space-y-2 shadow-xs"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black text-rose-950 uppercase tracking-wider">
                      Solicitação em atraso
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 font-bold">
                      +48h Excedido
                    </span>
                  </div>
                  <p className="text-xs text-rose-800 mt-0.5">
                    Esta solicitação foi recebida pelo Setor de Compras há <strong>{delayInfo.hoursElapsed} horas</strong> e ultrapassou o prazo limite de 48 horas para cotação e compra.
                  </p>
                </div>
              </div>
              {request.managerApprovedAt && (
                <div className="text-[11px] text-rose-700 font-mono pl-10.5">
                  Recebimento registrado em: {formatDateTime(request.managerApprovedAt)}
                </div>
              )}
            </div>
          ) : (
            request.managerApprovalStatus === 'aprovado' && 
            request.purchaseStatus !== 'compra_realizada' && 
            request.purchaseStatus !== 'entregue' && 
            request.purchaseStatus !== 'cancelado' && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>
                    Solicitação recebida em Compras há <strong>{delayInfo.hoursElapsed}h</strong> (dentro do prazo limite de 48h).
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">SLA Operacional: 48 horas</span>
              </div>
            )
          )}

          {/* Pending Approval Action Box for the Manager of this Sector */}
          {canApprove && (
            <div className="p-4 rounded-xl border-2 border-indigo-200 bg-indigo-50/50 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-indigo-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                    Ação Necessária: Avaliação Gerencial
                  </h4>
                  <p className="text-xs text-indigo-800">
                    Como gestor de <strong>{request.sector}</strong>, aprove ou recuse esta solicitação para encaminhamento a Compras.
                  </p>
                </div>
              </div>

              {actionError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {showRejectForm ? (
                <div className="p-3.5 bg-rose-50/90 border-2 border-rose-300 rounded-xl space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-rose-950 font-bold text-xs uppercase tracking-wider">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Justificativa da Reprovação (Obrigatória)</span>
                  </div>
                  <textarea
                    rows={3}
                    required
                    value={managerNotes}
                    onChange={(e) => {
                      setManagerNotes(e.target.value);
                      if (actionError) setActionError('');
                    }}
                    placeholder="Informe obrigatoriamente o motivo da reprovação desta solicitação..."
                    className="w-full px-3 py-2 text-xs bg-white border border-rose-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-rose-500 outline-hidden resize-none"
                    autoFocus
                  />
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRejectForm(false);
                        setActionError('');
                      }}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200/60 rounded-lg font-medium cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      id="confirm-reject-button"
                      onClick={handleReject}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                    >
                      Confirmar Reprovação
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-indigo-950 mb-1">
                      Parecer ou Observação do Gestor (Opcional para aprovação)
                    </label>
                    <input
                      type="text"
                      value={managerNotes}
                      onChange={(e) => setManagerNotes(e.target.value)}
                      placeholder="ex: Aprovado conforme cotação ou Verba autorizada..."
                      className="w-full px-3 py-1.5 text-xs bg-white border border-indigo-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      id="approve-request-button"
                      onClick={handleApprove}
                      className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Aprovar e Enviar para Compras
                    </button>
                    <button
                      id="reject-request-button"
                      onClick={() => {
                        setShowRejectForm(true);
                        setActionError('');
                      }}
                      className="py-2 px-4 bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      Reprovar Solicitação
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Executive Approver Decision Section */}
          {canApproverAct && (
            <div className="p-4 rounded-xl border border-purple-300 bg-purple-50/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-purple-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-700" />
                  Ação de Aprovação da Diretoria: Na vez de <strong>{currentStep}</strong>
                </span>
                <span className="text-slate-500 text-[11px]">
                  (Obrigatório motivo para reprovação)
                </span>
              </div>

              {actionError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-purple-950 mb-1">
                  Parecer ou Observação do Aprovador ({currentStep})
                </label>
                <input
                  type="text"
                  value={approverNotes}
                  onChange={(e) => {
                    setApproverNotes(e.target.value);
                    if (actionError) setActionError('');
                  }}
                  placeholder={`Parecer de ${currentStep} (ex: Cotação homologada / Fluxo financeiro ok)...`}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-purple-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-purple-500 outline-hidden"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleApproverApprove}
                  className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  {currentStep === 'Luiz' ? 'Conceder Chancela Final (100%)' : `Aprovar como ${currentStep}`}
                </button>
                <button
                  type="button"
                  onClick={handleApproverReject}
                  className="py-2 px-4 bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  Reprovar Pedido
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Código: <strong className="font-mono text-slate-700">{request.code}</strong></span>
            {currentUser.role === 'master' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-bold">
                Privilégio Master Ativo
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isPurchasingUser && onOpenPurchasingEdit && (
              <button
                onClick={() => onOpenPurchasingEdit(request)}
                className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Atualizar Cotação / Pedido</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
