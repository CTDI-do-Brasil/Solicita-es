import React, { useState } from 'react';
import { User, PurchaseRequest } from '../types';
import { storage } from '../storage';
import { 
  X, 
  Send, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  Link as LinkIcon, 
  Layers, 
  HelpCircle 
} from 'lucide-react';

interface RequestModalProps {
  currentUser: User;
  onClose: () => void;
  onRequestCreated: (newReq: PurchaseRequest) => void;
}

export const RequestModal: React.FC<RequestModalProps> = ({
  currentUser,
  onClose,
  onRequestCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [quantity, setQuantity] = useState<number | string>(1);
  const [unit, setUnit] = useState('unidades');
  const [priority, setPriority] = useState<'baixa' | 'media' | 'alta' | 'urgente'>('media');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Por favor, informe o título ou nome do item.');
      return;
    }

    if (!description.trim()) {
      setError('Por favor, detalhe a descrição do item (especificações ou modelo).');
      return;
    }

    if (!reason.trim()) {
      setError('Por favor, descreva o motivo/justificativa da compra.');
      return;
    }

    const numQty = Number(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      setError('Informe uma quantidade válida maior que zero.');
      return;
    }

    // Format link if provided
    let finalLink = linkUrl.trim();
    if (finalLink && !finalLink.startsWith('http://') && !finalLink.startsWith('https://')) {
      finalLink = 'https://' + finalLink;
    }

    try {
      const created = storage.createRequest(
        {
          title: title.trim(),
          description: description.trim(),
          reason: reason.trim(),
          linkUrl: finalLink,
          quantity: numQty,
          unit: unit.trim() || 'unidades',
          priority,
          requesterId: currentUser.id,
          requesterName: currentUser.name,
          sector: currentUser.sector,
        },
        currentUser
      );

      onRequestCreated(created);
    } catch (err) {
      console.error(err);
      setError('Erro ao salvar solicitação. Tente novamente.');
    }
  };

  const isManager = currentUser.role === 'gestor';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Nova Solicitação de Compra
              </h2>
              <p className="text-xs text-slate-500">
                Setor: <strong className="text-slate-800">{currentUser.sector}</strong> • Solicitante: {currentUser.name}
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

        {/* Notice of Approval Workflow */}
        <div className={`px-6 py-3 border-b text-xs flex items-start gap-2.5 ${
          isManager 
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
            : 'bg-amber-50/80 border-amber-200 text-amber-900'
        }`}>
          <AlertCircle className={`w-4 h-4 mt-0.5 shrink-0 ${isManager ? 'text-emerald-600' : 'text-amber-600'}`} />
          <div>
            {isManager ? (
              <span>
                <strong>Aprovação Imediata:</strong> Como gestor responsável do setor de {currentUser.sector}, esta solicitação será encaminhada diretamente à <strong>Central de Compras</strong> para cotação e emissão de pedido.
              </span>
            ) : (
              <span>
                <strong>Fluxo de Aprovação:</strong> Esta solicitação será enviada primeiro ao <strong>Gestor de {currentUser.sector}</strong>. Após a aprovação gerencial, ela segue para o <strong>Setor de Compras</strong> cotar e registrar o valor gasto.
              </span>
            )}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Item Short Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nome / Identificação do Item <span className="text-rose-500">*</span>
            </label>
            <input
              id="request-item-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: Switch Gigabit 24 Portas PoE ou Kit de Protetores Auriculares"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
            />
          </div>

          {/* Detailed Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Descrição Detalhada do Item <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="request-item-description"
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva especificações técnicas, marca recomendada, dimensões, voltagem ou modelo necessário..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden resize-none"
            />
          </div>

          {/* Reason / Motivo da Compra */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Motivo / Justificativa da Solicitação <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="request-item-reason"
              required
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explique o impacto ou necessidade para o setor (ex: reposição de estoque, manutenção corretiva, novos postos)..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden resize-none"
            />
          </div>

          {/* Quantity, Unit & Priority Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Quantidade <span className="text-rose-500">*</span>
              </label>
              <input
                id="request-item-quantity"
                type="number"
                min="1"
                step="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Unidade de Medida
              </label>
              <select
                id="request-item-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden bg-white"
              >
                <option value="unidades">unidades</option>
                <option value="peças">peças</option>
                <option value="caixas">caixas</option>
                <option value="pacotes">pacotes</option>
                <option value="conjuntos">conjuntos</option>
                <option value="metros">metros</option>
                <option value="litros">litros</option>
                <option value="kg">kg</option>
                <option value="licenças">licenças</option>
                <option value="serviço">serviço</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Urgência / Prioridade
              </label>
              <select
                id="request-item-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden bg-white font-medium"
              >
                <option value="baixa">Baixa (Planejamento)</option>
                <option value="media">Média (Padrão)</option>
                <option value="alta">Alta (Prioritário)</option>
                <option value="urgente">Urgente (Parada de Linha/Crítico)</option>
              </select>
            </div>
          </div>

          {/* Product Link */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Link do Produto ou Fornecedor de Referência
              </label>
              {linkUrl && (
                <a
                  href={linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
                >
                  <ExternalLink className="w-3 h-3" /> Testar link
                </a>
              )}
            </div>
            <div className="relative rounded-lg">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <LinkIcon className="w-4 h-4" />
              </div>
              <input
                id="request-item-link"
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://exemplo.com.br/produto/detalhe"
                className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Cole o link da loja virtual, catálogo técnico ou cotação prévia para agilizar o trabalho do comprador.
            </p>
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
              id="submit-request-button"
              type="submit"
              className="flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition-colors"
            >
              <Send className="w-4 h-4" />
              Salvar Solicitação
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
