import React, { useState, useEffect } from 'react';
import { User, PurchaseRequest, PurchaseOrderStatus } from '../types';
import { storage } from '../storage';
import { formatCurrency, formatDate, getSectorColor, getRequestPurchaseReleaseInfo } from '../utils';
import { 
  X, 
  ShoppingBag, 
  Check, 
  ExternalLink, 
  DollarSign, 
  Calendar, 
  Truck, 
  FileCheck2, 
  AlertCircle,
  Package,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';

interface PurchasingActionModalProps {
  request: PurchaseRequest;
  buyer: User;
  onClose: () => void;
  onSave: () => void;
}

export const PurchasingActionModal: React.FC<PurchasingActionModalProps> = ({
  request,
  buyer,
  onClose,
  onSave,
}) => {
  const [status, setStatus] = useState<PurchaseOrderStatus>(
    request.purchaseStatus === 'aguardando_aprovacao_gestor' || request.purchaseStatus === 'recebido_em_compras'
      ? 'em_cotacao'
      : request.purchaseStatus
  );

  const [poNumber, setPoNumber] = useState(
    request.purchaseOrderNumber || `OC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`
  );
  const [supplier, setSupplier] = useState(request.supplier || '');
  const [unitPrice, setUnitPrice] = useState<number | string>(request.unitPrice || '');
  const [shippingCost, setShippingCost] = useState<number | string>(request.shippingCost || '');
  const [totalPrice, setTotalPrice] = useState<number | string>(request.totalPrice || '');
  const [purchaseDate, setPurchaseDate] = useState(
    request.purchaseDate || new Date().toISOString().split('T')[0]
  );
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(
    request.expectedDeliveryDate || ''
  );
  const [purchasingNotes, setPurchasingNotes] = useState(request.purchasingNotes || '');
  const [error, setError] = useState('');

  const sectorColor = getSectorColor(request.sector);
  const releaseInfo = getRequestPurchaseReleaseInfo(request);

  // Auto calculate total when unit price or shipping changes (unless manually edited)
  const handleUnitPriceChange = (val: string) => {
    setUnitPrice(val);
    const numUnit = parseFloat(val);
    const numShip = parseFloat(String(shippingCost)) || 0;
    if (!isNaN(numUnit) && numUnit >= 0) {
      const calculated = (numUnit * request.quantity) + numShip;
      setTotalPrice(calculated.toFixed(2));
    }
  };

  const handleShippingChange = (val: string) => {
    setShippingCost(val);
    const numUnit = parseFloat(String(unitPrice));
    const numShip = parseFloat(val) || 0;
    if (!isNaN(numUnit) && numUnit >= 0) {
      const calculated = (numUnit * request.quantity) + numShip;
      setTotalPrice(calculated.toFixed(2));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const numTotal = parseFloat(String(totalPrice));
    const numUnit = parseFloat(String(unitPrice));
    const numShip = parseFloat(String(shippingCost)) || 0;

    // Trava de segurança: Solicitação precisa estar liberada para compra após aprovação
    if (status === 'compra_realizada' && !releaseInfo.isReleased && buyer.role !== 'master') {
      setError(`Atenção: Esta solicitação ainda não está liberada para compra (${releaseInfo.badgeLabel}). Obtenha a aprovação necessária antes de marcar como compra realizada.`);
      return;
    }

    if (status === 'compra_realizada' || status === 'pedido_emitido' || status === 'entregue') {
      if (isNaN(numTotal) || numTotal <= 0) {
        setError('Para emitir pedido ou finalizar compra, informe o valor total gasto.');
        return;
      }
    }

    if (status === 'cancelado') {
      if (!purchasingNotes.trim()) {
        setError('Para cancelar a solicitação, informe obrigatoriamente o motivo do cancelamento nas observações.');
        return;
      }
    }

    try {
      storage.updatePurchasingDetails(request.id, buyer, {
        status,
        purchaseOrderNumber: poNumber.trim(),
        supplier: supplier.trim(),
        unitPrice: isNaN(numUnit) ? undefined : numUnit,
        totalPrice: isNaN(numTotal) ? undefined : numTotal,
        shippingCost: isNaN(numShip) ? 0 : numShip,
        purchaseDate: purchaseDate || undefined,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        purchasingNotes: purchasingNotes.trim(),
      });

      onSave();
    } catch (err) {
      console.error(err);
      setError('Erro ao atualizar pedido de compra.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-cyan-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-800 flex items-center justify-center text-cyan-200 shadow-inner">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">
                  Central de Compras • Gestão do Pedido
                </h2>
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-800 text-cyan-100 font-mono">
                  {request.code}
                </span>
              </div>
              <p className="text-xs text-cyan-200">
                Comprador responsável: {buyer.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-cyan-300 hover:text-white hover:bg-cyan-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informative Value Notice */}
        <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Impacto no Solicitante e no Setor:</strong> O valor inserido aqui será refletido automaticamente no painel do usuário solicitante (<strong>{request.requesterName}</strong>) e computado no dashboard de gastos mensais do setor de <strong>{request.sector}</strong>.
          </span>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Error Callout */}
          {error && (
            <div className="p-3.5 bg-rose-50 border-2 border-rose-300 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* BANNER PROMINENTE: Liberação para Compra após Aprovação */}
          {releaseInfo.isReleased ? (
            <div 
              id="purchasing-modal-liberada-banner"
              className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-center justify-between gap-3 text-emerald-950 shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-900">
                      SOLICITAÇÃO LIBERADA PARA COMPRA APÓS APROVAÇÃO
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-950 border border-emerald-400">
                      Liberada
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    {releaseInfo.description} Você pode emitir a Ordem de Compra (OC) e efetivar a compra com segurança.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div 
              id="purchasing-modal-bloqueada-banner"
              className="p-4 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-center justify-between gap-3 text-amber-950 shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                      ATENÇÃO: SOLICITAÇÃO AINDA NÃO LIBERADA PARA COMPRA
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-950 border border-amber-400">
                      {releaseInfo.badgeLabel}
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 mt-0.5">
                    {releaseInfo.description} A compra definitiva requer a aprovação integral prévia.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Summary of Original Request */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded border ${sectorColor.badge}`}>
                  Setor: {request.sector}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Solicitado por: <strong>{request.requesterName}</strong> em {formatDate(request.createdAt)}
                </span>
              </div>
              <div className="text-xs bg-slate-200/80 px-2 py-0.5 rounded text-slate-700 font-medium">
                {request.items && request.items.length > 1
                  ? `Total: ${request.items.length} itens (${request.quantity} ${request.unit})`
                  : `Qtd: ${request.quantity} ${request.unit}`}
              </div>
            </div>

            <div className="text-sm font-bold text-slate-900">
              {request.title}
            </div>

            {request.items && request.items.length > 0 ? (
              <div className="space-y-2 pt-1">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-cyan-700" />
                  Itens da Solicitação ({request.items.length})
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {request.items.map((item, idx) => (
                    <div key={item.id || idx} className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-slate-800">
                          <span className="text-cyan-700 font-bold mr-1">#{idx + 1}</span> {item.name}
                        </div>
                        <span className="shrink-0 font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[11px]">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-slate-600 mt-1 whitespace-pre-line text-[11px] leading-relaxed">
                          {item.description}
                        </p>
                      )}
                      {item.linkUrl && (
                        <div className="mt-1.5 pt-1.5 border-t border-slate-100">
                          <a
                            href={item.linkUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium hover:underline break-all"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" /> Link de referência
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                {request.description}
              </div>
            )}

            <div className="text-xs text-slate-500 flex items-start gap-1">
              <strong className="text-slate-700">Justificativa:</strong> {request.reason}
            </div>

            {(!request.items || request.items.length === 0) && request.linkUrl && (
              <div className="pt-1">
                <a
                  href={request.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline break-all"
                >
                  <ExternalLink className="w-3 h-3" /> Acessar link de referência indicado pelo solicitante
                </a>
              </div>
            )}
          </div>

          {/* Approvers Pipeline Status Banner */}
          {request.approvals && (
            <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-purple-700" />
                  Aprovadores
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-200 text-purple-900">
                  {request.approvals.currentApprover === 'concluido'
                    ? 'Aprovado 100%'
                    : request.approvals.currentApprover === 'reprovado'
                    ? 'Reprovado na Alçada'
                    : `Na vez de ${request.approvals.currentApprover}`}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className={`p-2 rounded-lg border ${
                  request.approvals.fernando?.status === 'aprovado'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : request.approvals.fernando?.status === 'reprovado'
                    ? 'bg-rose-50 border-rose-300 text-rose-800'
                    : request.approvals.currentApprover === 'Fernando'
                    ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold'
                    : 'bg-slate-100 border-slate-200 text-slate-500'
                }`}>
                  <div className="font-bold">1º Fernando</div>
                  <div className="text-[11px] capitalize">{request.approvals.fernando?.status || 'Aguardando'}</div>
                </div>

                <div className={`p-2 rounded-lg border ${
                  request.approvals.eduardo?.status === 'aprovado'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : request.approvals.eduardo?.status === 'reprovado'
                    ? 'bg-rose-50 border-rose-300 text-rose-800'
                    : request.approvals.currentApprover === 'Eduardo'
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold'
                    : 'bg-slate-100 border-slate-200 text-slate-500'
                }`}>
                  <div className="font-bold">2º Eduardo</div>
                  <div className="text-[11px] capitalize">{request.approvals.eduardo?.status || 'Aguardando'}</div>
                </div>

                <div className={`p-2 rounded-lg border ${
                  request.approvals.luiz?.status === 'aprovado'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : request.approvals.luiz?.status === 'reprovado'
                    ? 'bg-rose-50 border-rose-300 text-rose-800'
                    : request.approvals.currentApprover === 'Luiz'
                    ? 'bg-purple-50 border-purple-300 text-purple-900 font-bold'
                    : 'bg-slate-100 border-slate-200 text-slate-500'
                }`}>
                  <div className="font-bold">3º Luiz</div>
                  <div className="text-[11px] capitalize">{request.approvals.luiz?.status || 'Aguardando'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Purchasing Form Fields */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-slate-200">
              <FileCheck2 className="w-4 h-4 text-cyan-700" />
              Controle Operacional de Compras & Valores
            </h3>

            {/* Status Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Status do Pedido de Compra <span className="text-rose-500">*</span>
              </label>
              <select
                id="buyer-order-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-hidden font-medium"
              >
                <option value="em_cotacao">Em Cotação com Fornecedores</option>
                <option value="em_aprovacao">Em Aprovação Diretoria (Fernando ➔ Eduardo ➔ Luiz)</option>
                <option value="pedido_emitido">Pedido de Compra Emitido (Ordem Gerada)</option>
                <option value="compra_realizada">Compra Realizada (Faturado / Pago)</option>
                <option value="em_transito">Em Trânsito / Em Transporte</option>
                <option value="entregue">Entregue no Setor Solicitante</option>
                <option value="reprovado_aprovadores">Reprovado por Aprovador</option>
                <option value="cancelado">Cancelado / Sem Fornecedor</option>
              </select>
            </div>

            {/* Order Number & Supplier */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nº do Pedido de Compra (OC)
                </label>
                <input
                  id="buyer-po-number"
                  type="text"
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder="ex: OC-2026-0245"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Fornecedor / Razão Social
                </label>
                <input
                  id="buyer-supplier-name"
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="ex: Kalunga SA, Dell do Brasil, SKF Rolamentos..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-hidden"
                />
              </div>
            </div>

            {/* Pricing Section (Valor de Compra) */}
            <div className="bg-cyan-50/50 p-4 rounded-xl border border-cyan-200 space-y-3">
              <div className="text-xs font-bold text-cyan-900 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-cyan-700" />
                Definição do Valor da Compra (R$)
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Preço Unitário (R$)
                  </label>
                  <input
                    id="buyer-unit-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={unitPrice}
                    onChange={(e) => handleUnitPriceChange(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-hidden"
                  />
                  <span className="text-[10px] text-slate-500">
                    Qtd: {request.quantity} {request.unit}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Frete / Encargos (R$)
                  </label>
                  <input
                    id="buyer-shipping-cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={shippingCost}
                    onChange={(e) => handleShippingChange(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-cyan-950 mb-1">
                    Valor Total da Compra (R$) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="buyer-total-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={totalPrice}
                    onChange={(e) => setTotalPrice(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-3 py-2 bg-white border-2 border-cyan-600 rounded-lg text-sm font-bold text-cyan-900 focus:ring-2 focus:ring-cyan-500 outline-hidden shadow-xs"
                  />
                  <span className="text-[10px] text-cyan-800 font-semibold">
                    Refletido ao solicitante: {formatCurrency(parseFloat(String(totalPrice)) || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Dates: Purchase Date & Expected Delivery Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Data da Compra / Faturamento
                </label>
                <input
                  id="buyer-purchase-date"
                  type="date"
                  value={purchaseDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" />
                  Previsão de Entrega no Setor
                </label>
                <input
                  id="buyer-delivery-date"
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-hidden"
                />
              </div>
            </div>

            {/* Purchasing Notes / Nota Fiscal */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Observações de Compras, Condições de Pagamento ou NF
              </label>
              <textarea
                id="buyer-notes"
                rows={2}
                value={purchasingNotes}
                onChange={(e) => setPurchasingNotes(e.target.value)}
                placeholder="ex: Negociado 28 dias no boleto, faturado NF 92.124, código de rastreio Correios..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-hidden resize-none"
              />
            </div>

          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            {!releaseInfo.isReleased && request.purchaseStatus !== 'em_aprovacao' && (
              <button
                id="send-to-approvers-action-button"
                type="button"
                onClick={() => {
                  const numTotal = parseFloat(String(totalPrice));
                  if (isNaN(numTotal) || numTotal <= 0) {
                    setError('Para enviar à alçada de aprovadores, preencha o valor da cotação.');
                    return;
                  }
                  const numUnit = parseFloat(String(unitPrice));
                  const numShip = parseFloat(String(shippingCost)) || 0;
                  storage.updatePurchasingDetails(request.id, buyer, {
                    status: 'em_aprovacao',
                    purchaseOrderNumber: poNumber.trim(),
                    supplier: supplier.trim(),
                    unitPrice: isNaN(numUnit) ? undefined : numUnit,
                    totalPrice: numTotal,
                    shippingCost: numShip,
                    purchaseDate: purchaseDate || undefined,
                    expectedDeliveryDate: expectedDeliveryDate || undefined,
                    purchasingNotes: purchasingNotes.trim(),
                  });
                  onSave();
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold text-purple-900 bg-purple-100 hover:bg-purple-200 border border-purple-300 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <FileCheck2 className="w-4 h-4 text-purple-700" />
                <span>Enviar p/ Aprovadores (Fernando ➔ Eduardo ➔ Luiz)</span>
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="submit-buyer-update-button"
                type="submit"
                className="flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-cyan-700 hover:bg-cyan-800 active:bg-cyan-900 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Salvar Alterações
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
