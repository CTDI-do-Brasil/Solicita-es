import React, { useState, useMemo } from 'react';
import { User, PurchaseRequest, SectorType } from '../types';
import { storage } from '../storage';
import { 
  formatCurrency, 
  formatDate, 
  getPurchaseStatusInfo, 
  getManagerApprovalInfo, 
  getSectorColor,
  getRequestDelayInfo
} from '../utils';
import { MonthlySpendChart } from './MonthlySpendChart';
import { 
  Plus, 
  Search, 
  Filter, 
  Users, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  FileText, 
  ShieldCheck, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  Bell,
  GitBranch
} from 'lucide-react';
import { VersionControlPanel } from './VersionControlPanel';

interface SectorViewProps {
  currentUser: User;
  onOpenNewRequest: () => void;
  onOpenManageUsers: () => void;
  onSelectRequest: (req: PurchaseRequest) => void;
  requestsVersion: number;
}

export const SectorView: React.FC<SectorViewProps> = ({
  currentUser,
  onOpenNewRequest,
  onOpenManageUsers,
  onSelectRequest,
  requestsVersion,
}) => {
  const [activeTab, setActiveTab] = useState<'solicitacoes' | 'aprovacoes' | 'dashboard' | 'versoes'>('solicitacoes');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // STRICT ISOLATION: Get only requests belonging to this user's sector
  const sectorRequests = useMemo(() => {
    return storage.getRequestsForUser(currentUser);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, requestsVersion]);

  const sectorUsers = useMemo(() => {
    return storage.getUsers().filter(u => u.sector === currentUser.sector);
  }, [currentUser.sector]);

  const sectorColor = getSectorColor(currentUser.sector);
  const isManager = currentUser.role === 'gestor';

  // Sector metrics
  const pendingManagerApprovals = useMemo(() => {
    return sectorRequests.filter(r => r.managerApprovalStatus === 'pendente');
  }, [sectorRequests]);

  const totalSectorSpent = useMemo(() => {
    return sectorRequests.reduce((acc, r) => acc + (r.totalPrice || 0), 0);
  }, [sectorRequests]);

  const activeOrdersCount = useMemo(() => {
    return sectorRequests.filter(
      r => r.managerApprovalStatus === 'aprovado' && r.purchaseStatus !== 'entregue' && r.purchaseStatus !== 'cancelado'
    ).length;
  }, [sectorRequests]);

  // Filtered requests list
  const displayedRequests = useMemo(() => {
    let list = sectorRequests;

    if (activeTab === 'aprovacoes') {
      list = list.filter(r => r.managerApprovalStatus === 'pendente');
    }

    if (statusFilter !== 'todos') {
      if (statusFilter === 'pendente_gestor') {
        list = list.filter(r => r.managerApprovalStatus === 'pendente');
      } else if (statusFilter === 'com_valor') {
        list = list.filter(r => r.totalPrice !== undefined && r.totalPrice > 0);
      } else {
        list = list.filter(r => r.purchaseStatus === statusFilter);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        r =>
          r.title.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          r.requesterName.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          (r.purchaseOrderNumber && r.purchaseOrderNumber.toLowerCase().includes(q))
      );
    }

    return list;
  }, [sectorRequests, activeTab, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      
      {/* Sector Banner & Identity Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${sectorColor.badge}`}>
                Área Restrita: Setor {currentUser.sector}
              </span>
              {isManager ? (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Gestão da Área
                </span>
              ) : (
                <span className="text-xs font-medium text-slate-500">
                  Colaborador do Setor
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1.5">
              Painel de Compras • {currentUser.sector}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {isManager
                ? `Você é o gestor responsável por aprovar solicitações e gerenciar os usuários do setor de ${currentUser.sector}.`
                : `Acompanhe suas solicitações, aprovações gerenciais e os valores faturados por Compras.`}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {isManager && (
              <button
                id="manage-sector-users-button"
                onClick={onOpenManageUsers}
                className="px-3.5 py-2 rounded-xl border border-slate-300 hover:border-indigo-500 hover:bg-indigo-50/40 text-slate-700 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Equipe ({sectorUsers.length})</span>
              </button>
            )}

            <button
              id="new-request-button"
              onClick={onOpenNewRequest}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Solicitação de Compra</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Mini-Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-100">
          
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Solicitações do Setor
            </span>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {sectorRequests.length}
            </div>
            <span className="text-[11px] text-slate-500">
              {activeOrdersCount} em andamento / compras
            </span>
          </div>

          <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200">
            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center justify-between">
              Aprovações Pendentes
              {isManager && pendingManagerApprovals.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </span>
            <div className="text-xl font-bold text-amber-950 mt-0.5">
              {pendingManagerApprovals.length}
            </div>
            <span className="text-[11px] text-amber-800">
              {isManager ? 'Aguardando sua liberação' : 'Aguardando gestor da área'}
            </span>
          </div>

          <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200">
            <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
              Gasto Faturado pelo Setor
            </span>
            <div className="text-xl font-bold text-emerald-950 mt-0.5">
              {formatCurrency(totalSectorSpent)}
            </div>
            <span className="text-[11px] text-emerald-700 font-medium">
              Valores informados por Compras
            </span>
          </div>

        </div>
      </div>

      {/* 2-Column Workspace with Lateral Navigation Menu */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        
        {/* LATERAL SIDEBAR: Menu de Navegação do Setor com Alerta */}
        <aside className="w-full lg:w-72 shrink-0 lg:sticky lg:top-20 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            
            {/* Sidebar Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Menu do Setor
                  </h2>
                  <p className="text-[10px] text-slate-500">
                    Área: {currentUser.sector}
                  </p>
                </div>
              </div>

              {/* Mobile toggle button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                aria-label="Alternar menu lateral"
              >
                {mobileMenuOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {/* Menu Links */}
            <div className={`space-y-1.5 ${mobileMenuOpen ? 'block' : 'hidden lg:block'}`}>
              
              {/* 1. Todas as Solicitações */}
              <button
                onClick={() => {
                  setActiveTab('solicitacoes');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                  activeTab === 'solicitacoes'
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className={`w-4 h-4 ${activeTab === 'solicitacoes' ? 'text-white' : 'text-indigo-600'}`} />
                  <span>Todas as Solicitações</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  activeTab === 'solicitacoes' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {sectorRequests.length}
                </span>
              </button>

              {/* 2. Aguardando Aprovação with Alerta de Solicitações Aguardando Aprovação */}
              <button
                id="sector-menu-aguardando-aprovacao"
                onClick={() => {
                  setActiveTab('aprovacoes');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all border ${
                  activeTab === 'aprovacoes'
                    ? 'bg-amber-500 border-amber-500 text-white font-bold shadow-xs'
                    : isManager && pendingManagerApprovals.length > 0
                      ? 'bg-amber-50/70 border-amber-300 text-amber-950 hover:bg-amber-100'
                      : 'border-transparent text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Clock className={`w-4 h-4 ${
                    activeTab === 'aprovacoes' 
                      ? 'text-white' 
                      : isManager && pendingManagerApprovals.length > 0 
                        ? 'text-amber-600' 
                        : 'text-slate-400'
                  }`} />
                  <span>Aguardando Aprovação</span>
                </div>

                {/* Badge: Alerta pulsante apenas para Gestor, contador neutro para colaborador */}
                {pendingManagerApprovals.length > 0 ? (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold flex items-center gap-1 ${
                    activeTab === 'aprovacoes'
                      ? 'bg-amber-700 text-white'
                      : isManager
                        ? 'bg-amber-500 text-white animate-pulse shadow-2xs'
                        : 'bg-slate-100 text-slate-600'
                  }`}>
                    {isManager && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                    {pendingManagerApprovals.length}
                  </span>
                ) : (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                    activeTab === 'aprovacoes' ? 'bg-amber-600 text-amber-100' : 'bg-slate-100 text-slate-500'
                  }`}>
                    0
                  </span>
                )}
              </button>

              {/* 3. Dashboard de Gastos Mensais */}
              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <TrendingUp className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-white' : 'text-emerald-600'}`} />
                  <span>Dashboard de Gastos</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                  activeTab === 'dashboard' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {formatCurrency(totalSectorSpent)}
                </span>
              </button>

              {/* 4. Controle de Versões & Homologação */}
              <button
                id="sector-menu-controle-versoes"
                onClick={() => {
                  setActiveTab('versoes');
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                  activeTab === 'versoes'
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <GitBranch className={`w-4 h-4 ${activeTab === 'versoes' ? 'text-white' : 'text-indigo-600'}`} />
                  <span>Controle de Versões</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-900 font-bold rounded">
                  Revisores
                </span>
              </button>

            </div>

            {/* BOX DE ALERTA: SOLICITAÇÕES AGUARDANDO APROVAÇÃO (EXIBIDO SOMENTE PARA GESTOR / MASTER) */}
            {isManager && (
              pendingManagerApprovals.length > 0 ? (
                <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-xl space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Alerta de Aprovação</span>
                  </div>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    <strong>{pendingManagerApprovals.length} {pendingManagerApprovals.length === 1 ? 'solicitação aguardando' : 'solicitações aguardando'}</strong> autorização do gestor para seguir para o setor de Compras.
                  </p>
                  <button
                    onClick={() => {
                      setActiveTab('aprovacoes');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Aprovar Pedidos ({pendingManagerApprovals.length})</span>
                  </button>
                </div>
              ) : (
                <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Nenhuma aprovação pendente no momento.</span>
                </div>
              )
            )}

            {/* Quick Context Summary in Sidebar */}
            <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span>Pedidos ativos:</span>
                <strong className="text-slate-800">{activeOrdersCount}</strong>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span>Total Faturado:</span>
                <strong className="text-emerald-700 font-mono">{formatCurrency(totalSectorSpent)}</strong>
              </div>
              {isManager && (
                <div className="flex items-center justify-between text-[11px]">
                  <span>Colaboradores:</span>
                  <strong className="text-slate-700">{sectorUsers.length}</strong>
                </div>
              )}
            </div>

          </div>
        </aside>

        {/* MAIN WORKSPACE CONTENT */}
        <main className="flex-1 min-w-0 w-full space-y-5">

      {/* View 1 & 2: Requests List / Approvals */}
      {(activeTab === 'solicitacoes' || activeTab === 'aprovacoes') && (
        <div className="space-y-4">
          
          {/* Section title when viewing Aguardando Aprovação */}
          {activeTab === 'aprovacoes' && (
            <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-950">Aguardando Aprovação</h3>
                  <p className="text-xs text-amber-800">
                    Solicitações de compra do setor aguardando decisão gerencial para envio à Central de Compras.
                  </p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 bg-amber-600 text-white font-bold rounded-full">
                {pendingManagerApprovals.length} pendente(s)
              </span>
            </div>
          )}

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por item, código, solicitante..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden"
              />
            </div>

            {/* Status Filter */}
            {activeTab === 'solicitacoes' && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="pendente_gestor">Aguardando Aprovação do Gerente</option>
                  <option value="recebido_em_compras">Recebido em Compras</option>
                  <option value="em_cotacao">Em Cotação com Fornecedores</option>
                  <option value="pedido_emitido">Pedido de Compra Emitido</option>
                  <option value="compra_realizada">Compra Realizada</option>
                  <option value="entregue">Entregue no Setor</option>
                  <option value="com_valor">Com Valor Faturado (R$)</option>
                </select>
              </div>
            )}
          </div>

          {/* List of Requests */}
          {displayedRequests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">
                Nenhuma solicitação encontrada
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {searchQuery || statusFilter !== 'todos'
                  ? 'Tente alterar os termos de busca ou remover os filtros aplicados.'
                  : `Seu setor ainda não possui solicitações nesta lista. Clique no botão acima para abrir a primeira solicitação de compra.`}
              </p>
              <button
                onClick={onOpenNewRequest}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Criar Nova Solicitação
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedRequests.map((req) => {
                const statusInfo = getPurchaseStatusInfo(req.purchaseStatus);
                const approvalInfo = getManagerApprovalInfo(req.managerApprovalStatus);
                const hasPrice = req.totalPrice !== undefined && req.totalPrice > 0;
                const delayInfo = getRequestDelayInfo(req);

                return (
                  <div
                    key={req.id}
                    onClick={() => onSelectRequest(req)}
                    className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer group ${
                      delayInfo.isDelayed
                        ? 'border-rose-300 ring-2 ring-rose-100 shadow-sm'
                        : 'border-slate-200 hover:border-indigo-400 hover:shadow-md'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      
                      {/* Left: Code, Title, Quantities, Requester */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-white">
                            {req.code}
                          </span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${approvalInfo.badgeClass}`}>
                            {approvalInfo.label}
                          </span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusInfo.bgClass} ${statusInfo.colorClass} ${statusInfo.borderClass}`}>
                            {statusInfo.label}
                          </span>
                          {delayInfo.isDelayed && (
                            <span 
                              id={`sector-badge-atraso-${req.id}`}
                              className="text-xs px-2.5 py-0.5 rounded-full border border-rose-300 bg-rose-100 text-rose-800 flex items-center gap-1 font-bold animate-pulse"
                              title={`Solicitação recebida pelo setor de Compras há ${delayInfo.hoursElapsed}h (prazo limite de 48h excedido)`}
                            >
                              <Clock className="w-3 h-3 text-rose-600" />
                              Solicitação em atraso
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400">
                            • Solicitado em {formatDate(req.createdAt)} por <strong>{req.requesterName}</strong>
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {req.title}
                        </h3>

                        <p className="text-xs text-slate-600 line-clamp-2">
                          {req.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500">
                          <span>
                            Quantidade: <strong className="text-slate-800">{req.quantity} {req.unit}</strong>
                          </span>
                          <span>
                            Prioridade: <strong className="text-slate-800 capitalize">{req.priority}</strong>
                          </span>
                          {req.purchaseOrderNumber && (
                            <span className="font-mono text-cyan-800 bg-cyan-50 px-1.5 py-0.2 rounded border border-cyan-200 font-semibold">
                              {req.purchaseOrderNumber}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Value Reflected by Compras + Action */}
                      <div className="flex items-center justify-between lg:justify-end gap-6 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        
                        {/* THE REFLECTED PURCHASE PRICE */}
                        <div className="text-left lg:text-right">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                            Valor Gasto (Compras)
                          </span>
                          {hasPrice ? (
                            <div>
                              <span className="text-lg font-extrabold text-emerald-800 tracking-tight">
                                {formatCurrency(req.totalPrice)}
                              </span>
                              <span className="block text-[10px] text-emerald-700 font-medium">
                                ✓ Faturado por Compras
                              </span>
                            </div>
                          ) : (
                            <div className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>Aguardando compras</span>
                            </div>
                          )}
                        </div>

                        {/* Quick Action for Manager or View Details */}
                        {isManager && req.managerApprovalStatus === 'pendente' ? (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                storage.approveRequestByManager(req.id, currentUser);
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
                              title="Aprovar em 1 clique e enviar para Compras"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Aprovar
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Motivo da recusa (opcional):') || 'Recusado pelo gestor da área.';
                                storage.rejectRequestByManager(req.id, currentUser, reason);
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 rounded-lg text-xs font-medium transition-colors"
                              title="Recusar solicitação"
                            >
                              Recusar
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
                            <span>Ver Detalhes</span>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        )}

                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* View 3: Sector Specific Monthly Spend Dashboard */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>Dashboard de Custos de {currentUser.sector}:</strong> Este painel consolida os valores que o <strong>Setor de Compras</strong> registrou para as solicitações da sua área, permitindo auditar os gastos mensais e o histórico de compras.
            </span>
          </div>

          <MonthlySpendChart
            requests={sectorRequests}
            targetSector={currentUser.sector}
          />
        </div>
      )}

      {/* View 4: Controle de Versões & Homologação */}
      {activeTab === 'versoes' && (
        <VersionControlPanel 
          currentUser={currentUser}
        />
      )}

        </main>
      </div>

    </div>
  );
};
