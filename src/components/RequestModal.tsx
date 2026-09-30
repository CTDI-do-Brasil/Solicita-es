import React, { useState } from 'react';
import { User, PurchaseRequest, RequestItem } from '../types';
import { storage } from '../storage';
import { 
  X, 
  Send, 
  AlertCircle, 
  FileText, 
  Link as LinkIcon, 
  Plus,
  Trash2,
  Package
} from 'lucide-react';

interface RequestModalProps {
  currentUser: User;
  onClose: () => void;
  onRequestCreated: (newReq: PurchaseRequest) => void;
}

interface FormItem {
  id: string;
  name: string;
  description: string;
  quantity: number | string;
  unit: string;
  linkUrl: string;
}

export const RequestModal: React.FC<RequestModalProps> = ({
  currentUser,
  onClose,
  onRequestCreated,
}) => {
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState<'baixa' | 'media' | 'alta' | 'urgente'>('media');
  const [items, setItems] = useState<FormItem[]>([
    {
      id: 'item-1',
      name: '',
      description: '',
      quantity: 1,
      unit: 'unidades',
      linkUrl: '',
    },
  ]);
  const [error, setError] = useState('');

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: '',
        description: '',
        quantity: 1,
        unit: 'unidades',
        linkUrl: '',
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof FormItem, value: any) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!reason.trim()) {
      setError('Por favor, descreva o motivo/justificativa da compra.');
      return;
    }

    if (items.length === 0) {
      setError('Adicione pelo menos um item à solicitação.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.name.trim()) {
        setError(`Por favor, informe o nome do Item #${i + 1}.`);
        return;
      }
      if (!it.description.trim()) {
        setError(`Por favor, detalhe a descrição do Item #${i + 1}.`);
        return;
      }
      const q = Number(it.quantity);
      if (isNaN(q) || q <= 0) {
        setError(`Informe uma quantidade válida maior que zero para o Item #${i + 1}.`);
        return;
      }
    }

    const processedItems: RequestItem[] = items.map((it, idx) => {
      let finalLink = it.linkUrl.trim();
      if (finalLink && !finalLink.startsWith('http://') && !finalLink.startsWith('https://')) {
        finalLink = 'https://' + finalLink;
      }
      return {
        id: it.id || `item-${idx + 1}`,
        name: it.name.trim(),
        description: it.description.trim(),
        quantity: Number(it.quantity),
        unit: it.unit.trim() || 'unidades',
        linkUrl: finalLink || undefined,
      };
    });

    const primaryTitle = processedItems.length === 1
      ? processedItems[0].name
      : `${processedItems[0].name} (+${processedItems.length - 1} ${processedItems.length - 1 === 1 ? 'outro item' : 'outros itens'})`;

    const primaryDesc = processedItems.length === 1
      ? processedItems[0].description
      : processedItems.map((it, i) => `${i + 1}. ${it.name} (${it.quantity} ${it.unit}): ${it.description}`).join('\n');

    const totalQuantity = processedItems.reduce((acc, it) => acc + it.quantity, 0);
    const primaryUnit = processedItems.length === 1 ? processedItems[0].unit : 'itens';
    const primaryLink = processedItems.find(it => it.linkUrl)?.linkUrl || '';

    try {
      const created = storage.createRequest(
        {
          title: primaryTitle,
          description: primaryDesc,
          reason: reason.trim(),
          linkUrl: primaryLink,
          quantity: totalQuantity,
          unit: primaryUnit,
          priority,
          items: processedItems,
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
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
        <div className={`px-6 py-2.5 border-b text-xs flex items-start gap-2.5 shrink-0 ${
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

        {/* Scrollable Form Body */}
        <form id="purchase-request-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section: General Info (Justificativa e Prioridade) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50/80 rounded-xl border border-slate-200">
            <div className="sm:col-span-2">
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
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden resize-none bg-white"
              />
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
              <p className="text-[11px] text-slate-500 mt-1">
                A prioridade é atribuída a toda a solicitação.
              </p>
            </div>
          </div>

          {/* Section: Items List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Itens da Solicitação
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {items.length} {items.length === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Item
              </button>
            </div>

            {/* List of items */}
            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white space-y-3.5 shadow-2xs relative group hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold">
                        {index + 1}
                      </span>
                      Item #{index + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded transition-colors flex items-center gap-1 font-semibold cursor-pointer"
                        title="Remover este item da solicitação"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover</span>
                      </button>
                    )}
                  </div>

                  {/* Nome do Item */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Nome / Identificação do Item <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={item.name}
                      onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                      placeholder="ex: Switch Gigabit 24 Portas PoE ou Kit de Protetores Auriculares"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                    />
                  </div>

                  {/* Descrição Detalhada */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Descrição Detalhada do Item <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder="Descreva especificações técnicas, marca recomendada, dimensões, voltagem ou modelo necessário..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden resize-none"
                    />
                  </div>

                  {/* Quantidade, Unidade e Link */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Quantidade <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Unidade de Medida
                      </label>
                      <select
                        value={item.unit}
                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
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
                        <option value="resmas">resmas</option>
                        <option value="tambores">tambores</option>
                        <option value="rolos">rolos</option>
                      </select>
                    </div>

                    <div className="sm:col-span-5">
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Link de Referência (Opcional)
                      </label>
                      <div className="relative rounded-lg">
                        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                          <LinkIcon className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="text"
                          value={item.linkUrl}
                          onChange={(e) => handleItemChange(index, 'linkUrl', e.target.value)}
                          placeholder="https://exemplo.com/item"
                          className="w-full pl-8 pr-2.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </form>

        {/* Fixed Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Total: <strong>{items.length} {items.length === 1 ? 'item informado' : 'itens informados'}</strong>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              id="submit-request-button"
              form="purchase-request-form"
              type="submit"
              className="flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
              Salvar Solicitação ({items.length})
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
