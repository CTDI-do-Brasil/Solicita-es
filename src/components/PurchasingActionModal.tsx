import React, { useState, useEffect } from 'react';
import { User, PurchaseRequest, PurchaseOrderStatus } from '../types';
import { storage } from '../storage';
import { formatCurrency, formatDate, getSectorColor } from '../utils';
import { 
  X, 
  ShoppingBag, 
  Check, 
  ExternalLink, 
  DollarSign, 
  Calendar, 
  Truck, 
  FileCheck2, 
  AlertCircle 
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

    if (status === 'compra_realizada' || status === 'pedido_emitido' || status === 'entregue') {
      if (isNaN(numTotal) || numTotal <= 0) {
        setError('Para emitir pedido ou finalizar compra, informe o valor total gasto.');
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
                Qtd: <strong>{request.quantity} {request.unit}</strong>
              </div>
            </div>

            <div className="text-sm font-bold text-slate-900">
              {request.title}
            </div>
            <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
              {request.description}
            </div>

            <div className="text-xs text-slate-500 flex items-start gap-1">
              <strong className="text-slate-700">Justificativa:</strong> {request.reason}
            </div>

            {request.linkUrl && (
              <div className="pt-1">
                <a
                  href={request.linkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> Acessar link de referência indicado pelo solicitante
                </a>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
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
                <option value="em_aprovacao">Em Aprovação de Orçamento (Diretoria)</option>
                <option value="pedido_emitido">Pedido de Compra Emitido (Ordem Gerada)</option>
                <option value="compra_realizada">Compra Realizada (Faturado / Pago)</option>
                <option value="em_transito">Em Trânsito / Em Transporte</option>
                <option value="entregue">Entregue no Setor Solicitante</option>
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
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              id="submit-buyer-update-button"
              type="submit"
              className="flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-cyan-700 hover:bg-cyan-800 active:bg-cyan-900 rounded-lg shadow-xs transition-colors"
            >
              <Check className="w-4 h-4" />
              Salvar Alterações & Atualizar Valor
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
