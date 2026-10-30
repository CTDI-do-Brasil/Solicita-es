import React, { useState } from 'react';
import { User, PurchaseRequest, PurchaseOrderStatus, ProductQuote, RequestItem, ProjectType, ALL_PROJECTS } from '../types';
import { storage } from '../storage';
import { formatCurrency, formatDate, getSectorColor, getProjectColor, getRequestPurchaseReleaseInfo } from '../utils';
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
  Plus, 
  Trash2, 
  CreditCard, 
  Clock, 
  Award,
  Sparkles,
  Briefcase,
  UserCheck,
  Building2,
  FileText
} from 'lucide-react';

interface PurchasingActionModalProps {
  request: PurchaseRequest;
  buyer: User;
  onClose: () => void;
  onSave: () => void;
}

interface ItemQuotesState {
  itemId: string;
  itemName: string;
  itemQuantity: number;
  itemUnit: string;
  quotes: ProductQuote[];
}

const QUICK_PAYMENT_TERMS = ['À vista', '15 dias', '28 DDL', '30 dias', '30/60 dias', 'Faturado 45 dias'];
const QUICK_DELIVERY_TERMS = ['Pronta entrega', '2 a 3 dias úteis', '5 dias úteis', '10 dias úteis', '15 dias corridos'];

const generateQuoteId = () => `quote-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

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
  const [selectedProject, setSelectedProject] = useState<ProjectType>(
    request.project || 'Manutenção/Engenharia'
  );

  // Initialize items and quotes
  const [itemsQuotes, setItemsQuotes] = useState<ItemQuotesState[]>(() => {
    if (request.items && request.items.length > 0) {
      return request.items.map((it, idx) => {
        if (it.quotes && it.quotes.length > 0) {
          return {
            itemId: it.id || `item-${idx}`,
            itemName: it.name,
            itemQuantity: it.quantity,
            itemUnit: it.unit,
            quotes: it.quotes.map(q => ({ ...q })),
          };
        }
        // If single item in items array and request has top-level quotes
        if (request.items!.length === 1 && request.quotes && request.quotes.length > 0) {
          return {
            itemId: it.id || `item-${idx}`,
            itemName: it.name,
            itemQuantity: it.quantity,
            itemUnit: it.unit,
            quotes: request.quotes.map(q => ({ ...q })),
          };
        }
        // Default initial quote
        const initialQuote: ProductQuote = {
          id: generateQuoteId(),
          itemId: it.id,
          supplier: (request.items!.length === 1 ? request.supplier : '') || '',
          unitPrice: (request.items!.length === 1 ? request.unitPrice : 0) || 0,
          shippingCost: (request.items!.length === 1 ? request.shippingCost : 0) || 0,
          totalPrice: (request.items!.length === 1 ? request.totalPrice : 0) || 0,
          paymentTerms: (request.items!.length === 1 ? request.paymentTerms : '') || '',
          deliveryDeadline: (request.items!.length === 1 ? request.deliveryDeadline : '') || '',
          notes: '',
          selected: true,
        };
        return {
          itemId: it.id || `item-${idx}`,
          itemName: it.name,
          itemQuantity: it.quantity,
          itemUnit: it.unit,
          quotes: [initialQuote],
        };
      });
    }

    // Single item from request top-level fields
    const quotesList: ProductQuote[] = (request.quotes && request.quotes.length > 0)
      ? request.quotes.map(q => ({ ...q }))
      : [{
          id: generateQuoteId(),
          supplier: request.supplier || '',
          unitPrice: request.unitPrice || 0,
          shippingCost: request.shippingCost || 0,
          totalPrice: request.totalPrice || (request.unitPrice ? (request.unitPrice * request.quantity + (request.shippingCost || 0)) : 0),
          paymentTerms: request.paymentTerms || '',
          deliveryDeadline: request.deliveryDeadline || '',
          notes: '',
          selected: true,
        }];

    return [{
      itemId: 'item-main',
      itemName: request.title,
      itemQuantity: request.quantity,
      itemUnit: request.unit,
      quotes: quotesList,
    }];
  });

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

  // Helper to update a quote field
  const handleQuoteChange = (
    itemIndex: number,
    quoteIndex: number,
    field: keyof ProductQuote,
    value: any
  ) => {
    setItemsQuotes(prev => {
      const copy = prev.map((item, iIdx) => {
        if (iIdx !== itemIndex) return item;
        const newQuotes = item.quotes.map((quote, qIdx) => {
          if (qIdx !== quoteIndex) return quote;
          const updated = { ...quote, [field]: value };
          if (field === 'unitPrice' || field === 'shippingCost') {
            const uPrice = field === 'unitPrice' ? (parseFloat(value) || 0) : (quote.unitPrice || 0);
            const ship = field === 'shippingCost' ? (parseFloat(value) || 0) : (quote.shippingCost || 0);
            updated.totalPrice = (uPrice * item.itemQuantity) + ship;
          }
          return updated;
        });
        return { ...item, quotes: newQuotes };
      });
      return copy;
    });
  };

  // Helper to select a winning quote for an item
  const handleSelectQuote = (itemIndex: number, quoteIndex: number) => {
    setItemsQuotes(prev => {
      return prev.map((item, iIdx) => {
        if (iIdx !== itemIndex) return item;
        const newQuotes = item.quotes.map((q, qIdx) => ({
          ...q,
          selected: qIdx === quoteIndex,
        }));
        return { ...item, quotes: newQuotes };
      });
    });
  };

  // Helper to add another quote for an item
  const handleAddQuote = (itemIndex: number) => {
    setItemsQuotes(prev => {
      return prev.map((item, iIdx) => {
        if (iIdx !== itemIndex) return item;
        const newQuote: ProductQuote = {
          id: generateQuoteId(),
          itemId: item.itemId,
          supplier: '',
          unitPrice: 0,
          shippingCost: 0,
          totalPrice: 0,
          paymentTerms: '',
          deliveryDeadline: '',
          notes: '',
          selected: item.quotes.length === 0, // auto-select if first
        };
        return {
          ...item,
          quotes: [...item.quotes, newQuote],
        };
      });
    });
  };

  // Helper to remove a quote
  const handleRemoveQuote = (itemIndex: number, quoteIndex: number) => {
    setItemsQuotes(prev => {
      return prev.map((item, iIdx) => {
        if (iIdx !== itemIndex) return item;
        if (item.quotes.length <= 1) return item;
        const quoteToRemove = item.quotes[quoteIndex];
        const filtered = item.quotes.filter((_, qIdx) => qIdx !== quoteIndex);
        if (quoteToRemove.selected && filtered.length > 0) {
          filtered[0].selected = true;
        }
        return { ...item, quotes: filtered };
      });
    });
  };

  // Compute consolidated values from selected quotes
  const selectedQuotes = itemsQuotes.map(it => it.quotes.find(q => q.selected) || it.quotes[0]);
  const consolidatedTotalPrice = selectedQuotes.reduce((acc, q) => acc + (q?.totalPrice || 0), 0);
  const primarySupplier = selectedQuotes.map(q => q?.supplier?.trim()).filter(Boolean).join(', ') || '';
  const primaryPaymentTerms = selectedQuotes.map(q => q?.paymentTerms?.trim()).filter(Boolean).join(' | ') || '';
  const primaryDeliveryDeadline = selectedQuotes.map(q => q?.deliveryDeadline?.trim()).filter(Boolean).join(' | ') || '';

  // Flattened quotes for storage
  const allQuotes = itemsQuotes.flatMap(it => it.quotes);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Trava de segurança: Solicitação precisa estar liberada para compra após aprovação
    if (status === 'compra_realizada' && !releaseInfo.isReleased && buyer.role !== 'master') {
      setError(`Atenção: Esta solicitação ainda não está liberada para compra (${releaseInfo.badgeLabel}). Obtenha a aprovação necessária antes de marcar como compra realizada.`);
      return;
    }

    // Na Central de Compras sempre tem que ter valor definido pelos compradores
    if (status !== 'cancelado') {
      if (consolidatedTotalPrice <= 0) {
        setError('Na Central de Compras é obrigatório informar ao menos um orçamento com valor válido.');
        return;
      }
      if (!primarySupplier.trim()) {
        setError('Por favor, informe a Razão Social / Fornecedor do orçamento vencedor.');
        return;
      }
    }

    if (status === 'cancelado') {
      if (!purchasingNotes.trim()) {
        setError('Para cancelar a solicitação, informe obrigatoriamente o motivo do cancelamento nas observações.');
        return;
      }
    }

    // Prepare updated items with their respective quotes
    const updatedItems: RequestItem[] | undefined = request.items
      ? request.items.map((it, idx) => ({
          ...it,
          quotes: itemsQuotes[idx]?.quotes || [],
        }))
      : undefined;

    const firstSelected = selectedQuotes[0];

    try {
      storage.updatePurchasingDetails(request.id, buyer, {
        status,
        project: selectedProject,
        purchaseOrderNumber: request.purchaseOrderNumber,
        supplier: primarySupplier,
        unitPrice: firstSelected?.unitPrice || undefined,
        totalPrice: consolidatedTotalPrice,
        shippingCost: firstSelected?.shippingCost || 0,
        paymentTerms: primaryPaymentTerms || undefined,
        deliveryDeadline: primaryDeliveryDeadline || undefined,
        purchaseDate: purchaseDate || undefined,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        purchasingNotes: purchasingNotes.trim(),
        quotes: allQuotes,
        items: updatedItems,
      });

      onSave();
    } catch (err) {
      console.error(err);
      setError('Erro ao atualizar pedido de compra.');
    }
  };

  const handleSendToApprovers = () => {
    setError('');
    if (consolidatedTotalPrice <= 0) {
      setError('Para enviar à alçada de aprovadores, preencha o valor da cotação.');
      return;
    }
    if (!primarySupplier.trim()) {
      setError('Por favor, preencha o fornecedor do orçamento escolhido antes de enviar para aprovação.');
      return;
    }

    const updatedItems: RequestItem[] | undefined = request.items
      ? request.items.map((it, idx) => ({
          ...it,
          quotes: itemsQuotes[idx]?.quotes || [],
        }))
      : undefined;

    const firstSelected = selectedQuotes[0];

    try {
      storage.updatePurchasingDetails(request.id, buyer, {
        status: 'em_aprovacao',
        project: selectedProject,
        purchaseOrderNumber: request.purchaseOrderNumber,
        supplier: primarySupplier,
        unitPrice: firstSelected?.unitPrice || undefined,
        totalPrice: consolidatedTotalPrice,
        shippingCost: firstSelected?.shippingCost || 0,
        paymentTerms: primaryPaymentTerms || undefined,
        deliveryDeadline: primaryDeliveryDeadline || undefined,
        purchaseDate: purchaseDate || undefined,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        purchasingNotes: purchasingNotes.trim(),
        quotes: allQuotes,
        items: updatedItems,
      });

      onSave();
    } catch (err) {
      console.error(err);
      setError('Erro ao enviar pedido para aprovação.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-cyan-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-800 flex items-center justify-center text-cyan-200 shadow-inner">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">
                  Central de Compras • Gestão de Cotações & Pedido
                </h2>
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-800 text-cyan-100 font-mono">
                  {request.code}
                </span>
              </div>
              <p className="text-xs text-cyan-200">
                Comprador responsável: <strong>{buyer.name}</strong> • Registro de múltiplos orçamentos por produto
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
            <strong>Gestão de Cotações:</strong> Cadastre um ou mais orçamentos para cada produto, especifique <strong>prazo de pagamento</strong> e <strong>prazo de entrega</strong>, e selecione o vencedor. O orçamento selecionado alimentará o valor oficial para o solicitante (<strong>{request.requesterName}</strong>) e para os aprovadores.
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

          {/* BANNER: Liberação para Compra após Aprovação */}
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
                    {releaseInfo.description} Realize as cotações com fornecedores e envie para a alçada de aprovação.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Original Request Summary - Design Executivo de Alta Visibilidade */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
            
            {/* Top Identity Header Bar */}
            <div className="bg-gradient-to-r from-slate-50 via-slate-50/80 to-slate-100/60 px-4 py-3 border-b border-slate-200/90 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-slate-900 text-amber-300 shadow-xs tracking-wider">
                  {request.code}
                </span>

                {/* Badge do Setor */}
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-xs border ${sectorColor.badge}`}>
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Setor: {request.sector}</span>
                </div>
              </div>

              {/* Quantidade Total */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 border border-slate-300 text-slate-800 text-xs font-extrabold shrink-0">
                <Package className="w-3.5 h-3.5 text-slate-500" />
                <span>
                  {request.items && request.items.length > 1
                    ? `${request.items.length} itens inclusos`
                    : `Qtd: ${request.quantity} ${request.unit}`}
                </span>
              </div>
            </div>

            {/* Card Content */}
            <div className="p-4 sm:p-5 space-y-4">
              
              {/* Item Title */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">
                  Descrição do Item Solicitado
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                  {request.title}
                </h3>
              </div>

              {/* 3-Card Structured Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                {/* 1. Projeto / Contrato */}
                <div className={`p-3 rounded-xl border flex items-center gap-3 ${getProjectColor(selectedProject || request.project).badge}`}>
                  <div className="w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center shrink-0 shadow-2xs">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider block opacity-75">
                      Projeto / Contrato
                    </span>
                    <span className="text-xs sm:text-sm font-black truncate block">
                      {selectedProject || request.project || 'Não informado'}
                    </span>
                  </div>
                </div>

                {/* 2. Solicitante */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0 shadow-2xs">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Solicitante
                    </span>
                    <span className="text-xs font-bold text-slate-800 truncate block" title={request.requesterName}>
                      {request.requesterName}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {formatDate(request.createdAt)}
                    </span>
                  </div>
                </div>

                {/* 3. Prioridade */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs ${
                    request.priority === 'urgente' ? 'text-rose-600' :
                    request.priority === 'alta' ? 'text-orange-500' :
                    request.priority === 'baixa' ? 'text-slate-400' : 'text-amber-500'
                  }`}>
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Prioridade
                    </span>
                    <span className="text-xs font-bold capitalize text-slate-900 block">
                      {request.priority || 'Média'}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Setor {request.sector}
                    </span>
                  </div>
                </div>

              </div>

              {/* Justificativa Callout */}
              {request.reason && (
                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-xs text-slate-700 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-950 font-bold">
                    <FileText className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>Justificativa da Compra:</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed pl-5">
                    {request.reason}
                  </p>
                </div>
              )}

              {/* Reference Link */}
              {request.linkUrl && (!request.items || request.items.length === 0) && (
                <div className="pt-0.5">
                  <a
                    href={request.linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-xs text-indigo-700 font-semibold transition-colors break-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    <span>Link de referência indicado pelo solicitante</span>
                  </a>
                </div>
              )}

            </div>
          </div>

          {/* Status & Project Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Status Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Status Operacional do Pedido <span className="text-rose-500">*</span>
              </label>
              <select
                id="buyer-order-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-hidden font-medium"
              >
                <option value="recebido_em_compras">Recebido em Compras (Aguardando Cotação)</option>
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

            {/* Project / Contract Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Projeto / Operação Destino</span>
                <span className="text-[10px] text-cyan-800 font-bold lowercase">atribuído</span>
              </label>
              <select
                id="buyer-order-project"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value as ProjectType)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-hidden font-bold"
              >
                {ALL_PROJECTS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

          </div>

          {/* SECTION: PRODUTOS E MÚLTIPLOS ORÇAMENTOS POR PRODUTO */}
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4 text-cyan-700" />
                Cotações por Produto ({itemsQuotes.length} {itemsQuotes.length === 1 ? 'produto' : 'produtos'})
              </h3>
              <span className="text-xs text-cyan-800 font-semibold bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-cyan-600" />
                Permite múltiplos orçamentos concorrentes
              </span>
            </div>

            {itemsQuotes.map((item, itemIdx) => {
              // Find best price among quotes for this item
              const validPrices = item.quotes.map(q => q.totalPrice).filter(p => p > 0);
              const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;

              return (
                <div 
                  key={item.itemId || itemIdx} 
                  className="bg-slate-50/80 rounded-2xl border-2 border-slate-200 p-4 space-y-4"
                >
                  {/* Product Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-cyan-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {itemIdx + 1}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          {item.itemName}
                        </h4>
                        <span className="text-xs text-slate-500">
                          Quantidade a cotar: <strong className="text-slate-800">{item.itemQuantity} {item.itemUnit}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700">
                        {item.quotes.length} {item.quotes.length === 1 ? 'orçamento' : 'orçamentos cadastrados'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddQuote(itemIdx)}
                        className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-cyan-800 bg-cyan-100 hover:bg-cyan-200 border border-cyan-300 rounded-lg transition-colors cursor-pointer"
                        title="Incluir mais um orçamento para este produto"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar Orçamento</span>
                      </button>
                    </div>
                  </div>

                  {/* Multiple Quotes List for this product */}
                  <div className="space-y-4">
                    {item.quotes.map((quote, quoteIdx) => {
                      const isWinning = quote.selected;
                      const isBestPrice = minPrice !== null && quote.totalPrice > 0 && quote.totalPrice === minPrice && item.quotes.length > 1;

                      return (
                        <div 
                          key={quote.id || quoteIdx}
                          className={`rounded-xl p-4 transition-all border-2 ${
                            isWinning
                              ? 'bg-emerald-50/50 border-emerald-400 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {/* Quote Header / Winner Selection */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                Orçamento #{quoteIdx + 1}
                              </span>

                              {isWinning ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <Award className="w-3.5 h-3.5 text-emerald-600" />
                                  Orçamento Vencedor / Escolhido
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleSelectQuote(itemIdx, quoteIdx)}
                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 border border-slate-300 hover:border-emerald-300 transition-colors cursor-pointer"
                                >
                                  <Check className="w-3 h-3 text-slate-400" />
                                  <span>Definir como Vencedor</span>
                                </button>
                              )}

                              {isBestPrice && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                  Menor Preço
                                </span>
                              )}
                            </div>

                            {item.quotes.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveQuote(itemIdx, quoteIdx)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Excluir este orçamento"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Inputs: Supplier, Prices, Payment Terms, Delivery Deadline */}
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                              
                              {/* Fornecedor */}
                              <div className="sm:col-span-6">
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Fornecedor / Razão Social <span className="text-rose-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={quote.supplier}
                                  onChange={(e) => handleQuoteChange(itemIdx, quoteIdx, 'supplier', e.target.value)}
                                  placeholder="ex: Kalunga, Dell Computadores, SKF..."
                                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-hidden font-medium"
                                />
                              </div>

                              {/* Preço Unitário */}
                              <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Unitário (R$)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={quote.unitPrice || ''}
                                  onChange={(e) => handleQuoteChange(itemIdx, quoteIdx, 'unitPrice', e.target.value)}
                                  placeholder="0,00"
                                  className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-cyan-500 outline-hidden"
                                />
                              </div>

                              {/* Frete */}
                              <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Frete (R$)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={quote.shippingCost || ''}
                                  onChange={(e) => handleQuoteChange(itemIdx, quoteIdx, 'shippingCost', e.target.value)}
                                  placeholder="0,00"
                                  className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-cyan-500 outline-hidden"
                                />
                              </div>

                              {/* Total do Orçamento */}
                              <div className="sm:col-span-2">
                                <label className="block text-xs font-bold text-cyan-950 mb-1">
                                  Total (R$)
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={quote.totalPrice || ''}
                                  onChange={(e) => handleQuoteChange(itemIdx, quoteIdx, 'totalPrice', parseFloat(e.target.value) || 0)}
                                  placeholder="0,00"
                                  className="w-full px-2.5 py-2 text-xs bg-white border-2 border-cyan-600 rounded-lg font-bold text-cyan-900 focus:ring-2 focus:ring-cyan-500 outline-hidden"
                                />
                              </div>
                            </div>

                            {/* NOVO: PRAZO DE PAGAMENTO & PRAZO DE ENTREGA */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              
                              {/* Campo de Prazo de Pagamento */}
                              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                  <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                                  Prazo de Pagamento
                                </label>
                                <input
                                  type="text"
                                  value={quote.paymentTerms || ''}
                                  onChange={(e) => handleQuoteChange(itemIdx, quoteIdx, 'paymentTerms', e.target.value)}
                                  placeholder="ex: 30 dias, Boleto 28 DDL, À vista..."
                                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:ring-2 focus:ring-cyan-500 outline-hidden"
                                />
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className="text-[10px] text-slate-400 font-medium">Sugestões:</span>
                                  {QUICK_PAYMENT_TERMS.map(term => (
                                    <button
                                      key={term}
                                      type="button"
                                      onClick={() => handleQuoteChange(itemIdx, quoteIdx, 'paymentTerms', term)}
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-white hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-300 transition-colors cursor-pointer"
                                    >
                                      {term}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Campo de Prazo de Entrega */}
                              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  Prazo de Entrega
                                </label>
                                <input
                                  type="text"
                                  value={quote.deliveryDeadline || ''}
                                  onChange={(e) => handleQuoteChange(itemIdx, quoteIdx, 'deliveryDeadline', e.target.value)}
                                  placeholder="ex: 5 dias úteis, 15 dias corridos, Pronta entrega..."
                                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:ring-2 focus:ring-cyan-500 outline-hidden"
                                />
                                <div className="flex flex-wrap items-center gap-1">
                                  <span className="text-[10px] text-slate-400 font-medium">Sugestões:</span>
                                  {QUICK_DELIVERY_TERMS.map(term => (
                                    <button
                                      key={term}
                                      type="button"
                                      onClick={() => handleQuoteChange(itemIdx, quoteIdx, 'deliveryDeadline', term)}
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-white hover:bg-amber-50 text-amber-800 border border-slate-200 hover:border-amber-300 transition-colors cursor-pointer"
                                    >
                                      {term}
                                    </button>
                                  ))}
                                </div>
                              </div>

                            </div>

                            {/* Observações da Cotação / Link de proposta */}
                            <div>
                              <input
                                type="text"
                                value={quote.notes || ''}
                                onChange={(e) => handleQuoteChange(itemIdx, quoteIdx, 'notes', e.target.value)}
                                placeholder="Observações desta cotação (ex: desconto concedido, frete CIF incluso, link da proposta)..."
                                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-cyan-500 outline-hidden"
                              />
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Quote Button for this item */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => handleAddQuote(itemIdx)}
                      className="w-full py-2 border-2 border-dashed border-cyan-300 hover:border-cyan-500 bg-cyan-50/50 hover:bg-cyan-50 text-cyan-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-cyan-700" />
                      <span>Incluir Mais um Orçamento para este Produto</span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>

          {/* CONSOLIDATED FINANCIAL SUMMARY */}
          <div className="bg-cyan-900 text-white p-4 rounded-2xl shadow-md space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-200 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-cyan-300" />
                Resumo da Cotação Vencedora (Valor Oficial do Pedido)
              </span>
              <span className="text-[11px] bg-cyan-800 text-cyan-100 px-2.5 py-0.5 rounded-full font-semibold">
                Refletido ao Solicitante e Aprovadores
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-cyan-300 block text-[11px]">Fornecedor Selecionado:</span>
                <span className="font-bold text-sm text-white truncate block">
                  {primarySupplier || 'Aguardando seleção de fornecedor'}
                </span>
              </div>

              <div>
                <span className="text-cyan-300 block text-[11px]">Condições Comerciais:</span>
                <div className="space-y-0.5 text-cyan-100 font-medium">
                  <div>Pagamento: <strong>{primaryPaymentTerms || 'Não especificado'}</strong></div>
                  <div>Prazo de Entrega: <strong>{primaryDeliveryDeadline || 'Não especificado'}</strong></div>
                </div>
              </div>

              <div className="sm:text-right">
                <span className="text-cyan-300 block text-[11px]">Valor Total de Compra:</span>
                <span className="text-2xl font-black text-emerald-400 tracking-tight">
                  {formatCurrency(consolidatedTotalPrice)}
                </span>
              </div>
            </div>
          </div>

          {/* Operational Dates & Logistics */}
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
              Observações Gerais de Compras ou NF
            </label>
            <textarea
              id="buyer-notes"
              rows={2}
              value={purchasingNotes}
              onChange={(e) => setPurchasingNotes(e.target.value)}
              placeholder="ex: Faturado com nota fiscal 92.124, código de rastreio Correios..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-hidden resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            {!releaseInfo.isReleased && request.purchaseStatus !== 'em_aprovacao' && (
              <button
                id="send-to-approvers-action-button"
                type="button"
                onClick={handleSendToApprovers}
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
