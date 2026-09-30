import React, { useState, useMemo } from 'react';
import { User, PurchaseRequest, SectorType, ALL_SECTORS } from '../types';
import { storage } from '../storage';
import { 
  formatCurrency, 
  formatDate, 
  getPurchaseStatusInfo, 
  getManagerApprovalInfo, 
  getSectorColor,
  getRequestDelayInfo,
  getRequestPurchaseReleaseInfo
} from '../utils';
import { MonthlySpendChart } from './MonthlySpendChart';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  DollarSign, 
  FileCheck, 
  Clock, 
  Building2, 
  ChevronRight, 
  ExternalLink,
  Plus,
  BarChart3,
  TrendingUp,
  Layers,
  ArrowUpDown,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  BellRing,
  FileCheck2,
  Send,
  GitBranch,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { VersionControlPanel } from './VersionControlPanel';

interface PurchasingViewProps {
  currentUser: User;
  onOpenManageOrder: (req: PurchaseRequest) => void;
  onSelectRequest: (req: PurchaseRequest) => void;
  requestsVersion: number;
}

export const PurchasingView: React.FC<PurchasingViewProps> = ({
  currentUser,
  onOpenManageOrder,
  onSelectRequest,
  requestsVersion,
}) => {
  const isManagerOrMaster = currentUser.role === 'gestor' || currentUser.role === 'master';
  const [selectedSector, setSelectedSector] = useState<SectorType | 'Todos'>('Todos');
  const [mobileSectorMenuOpen, setMobileSectorMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'geral' | 'liberadas' | 'aprovadores' | 'atrasadas' | 'faturados' | 'dashboard' | 'versoes'>('geral');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Setor de Compras has access to ALL requests from all sectors
  const allRequests = useMemo(() => {
    return storage.getAllRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestsVersion]);

  // Key metrics
  const totalGlobalSpent = useMemo(() => {
    return allRequests.reduce((acc, r) => acc + (r.totalPrice || 0), 0);
  }, [allRequests]);

  // Solicitações liberadas para compra após aprovação e aguardando faturamento/emissão
  const releasedRequests = useMemo(() => {
    return allRequests.filter(r => {
      const rel = getRequestPurchaseReleaseInfo(r);
      return rel.isReleased && r.purchaseStatus !== 'compra_realizada' && r.purchaseStatus !== 'entregue' && r.purchaseStatus !== 'cancelado';
    });
  }, [allRequests]);

  // Solicitações com mais de 48h de recebimento sem conclusão da compra
  const delayedRequests = useMemo(() => {
    return allRequests.filter(r => getRequestDelayInfo(r).isDelayed);
  }, [allRequests]);

  const completedPurchasesCount = useMemo(() => {
    return allRequests.filter(
      r => r.purchaseStatus === 'compra_realizada' || r.purchaseStatus === 'entregue'
    ).length;
  }, [allRequests]);

  const selectedSectorRequests = useMemo(() => {
    if (selectedSector === 'Todos') return allRequests;
    return allRequests.filter(r => r.sector === selectedSector);
  }, [allRequests, selectedSector]);

  const selectedSectorTotalSpent = useMemo(() => {
    return selectedSectorRequests.reduce((acc, r) => acc + (r.totalPrice || 0), 0);
  }, [selectedSectorRequests]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    let list = allRequests;

    // Filter by Sector
    if (selectedSector !== 'Todos') {
      list = list.filter(r => r.sector === selectedSector);
    }

    // Filter by Tab
    if (activeTab === 'atrasadas') {
      list = list.filter(r => getRequestDelayInfo(r).isDelayed);
    } else if (activeTab === 'liberadas') {
      list = list.filter(r => getRequestPurchaseReleaseInfo(r).isReleased);
    } else if (activeTab === 'aprovadores') {
      list = list.filter(r => r.purchaseStatus === 'em_aprovacao' || r.approvals !== undefined);
    } else if (activeTab === 'faturados') {
      list = list.filter(r => r.totalPrice !== undefined && r.totalPrice > 0);
    }

    // Filter by Status dropdown
    if (statusFilter !== 'todos') {
      if (statusFilter === 'liberadas') {
        list = list.filter(r => getRequestPurchaseReleaseInfo(r).isReleased);
      } else if (statusFilter === 'aguardando_aprovacao') {
        list = list.filter(r => !getRequestPurchaseReleaseInfo(r).isReleased);
      } else if (statusFilter === 'sem_valor') {
        list = list.filter(r => !r.totalPrice || r.totalPrice === 0);
      } else if (statusFilter === 'com_valor') {
        list = list.filter(r => r.totalPrice !== undefined && r.totalPrice > 0);
      } else if (statusFilter === 'em_atraso') {
        list = list.filter(r => getRequestDelayInfo(r).isDelayed);
      } else {
        list = list.filter(r => r.purchaseStatus === statusFilter);
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        r =>
          r.title.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          r.sector.toLowerCase().includes(q) ||
          r.requesterName.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          (r.supplier && r.supplier.toLowerCase().includes(q)) ||
          (r.purchaseOrderNumber && r.purchaseOrderNumber.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allRequests, selectedSector, activeTab, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      
      {/* Compras Banner Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-700 text-white flex items-center justify-center shadow-xs">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-900 border border-cyan-300">
                  Visão Centralizada • Setor de Compras
                </span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-2">
              Painel Geral de Compras & Suprimentos
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Controle total das solicitações de todos os 9 setores corporativos. Emita pedidos de compra, defina fornecedores e insira os valores de faturamento — os valores salvos refletem imediatamente para o solicitante e alimentam o dashboard departamental.
            </p>
          </div>

          {isManagerOrMaster && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('dashboard')}
                className="px-4 py-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-800 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors"
              >
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                <span>Ver Dashboard Consolidado</span>
              </button>
            </div>
          )}
        </div>

        {/* Global Indicator Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
          
          <div 
            onClick={() => setActiveTab('geral')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              activeTab === 'geral'
                ? 'bg-slate-100 border-slate-400 shadow-xs'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Solicitações Recebidas
            </span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">
              {allRequests.length}
            </div>
            <span className="text-[11px] text-slate-500">
              Englobando todas as 9 áreas
            </span>
          </div>

          {/* NOVO CARD: Liberadas para Compra */}
          <div 
            id="card-solicitacoes-liberadas"
            onClick={() => setActiveTab('liberadas')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              activeTab === 'liberadas'
                ? 'bg-emerald-100/90 border-emerald-400 ring-2 ring-emerald-200 shadow-xs'
                : 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100/60'
            }`}
          >
            <span className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider flex items-center justify-between">
              <span>Liberadas p/ Compra</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </span>
            <div className="text-2xl font-extrabold text-emerald-950 mt-1 flex items-baseline gap-1.5">
              {releasedRequests.length}
              <span className="text-xs font-semibold text-emerald-700">Aprovadas</span>
            </div>
            <span className="text-[11px] text-emerald-800 font-medium">
              Prontas para emissão / compra
            </span>
          </div>

          <div 
            id="card-solicitacoes-atraso"
            onClick={() => setActiveTab('atrasadas')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              delayedRequests.length > 0 
                ? 'bg-rose-50/90 border-rose-300 hover:border-rose-400 hover:shadow-xs' 
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span className="text-[11px] font-bold text-rose-950 uppercase tracking-wider flex items-center justify-between">
              <span>Solicitações em Atraso</span>
              {delayedRequests.length > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
              )}
            </span>
            <div className="text-2xl font-extrabold text-rose-900 mt-1 flex items-baseline gap-1.5">
              {delayedRequests.length}
              <span className="text-xs font-normal text-rose-700">+48h decorridas</span>
            </div>
            <span className="text-[11px] text-rose-800 font-medium">
              Prazo de atendimento excedido
            </span>
          </div>

          <div 
            onClick={() => setActiveTab('faturados')}
            className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 cursor-pointer hover:bg-emerald-100/70 transition-colors"
          >
            <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center justify-between">
              Compras Realizadas
            </span>
            <div className="text-2xl font-extrabold text-emerald-950 mt-1">
              {completedPurchasesCount}
            </div>
            <span className="text-[11px] text-emerald-800 font-medium">
              Pedidos adquiridos / faturados
            </span>
          </div>

        </div>

        {/* URGENT NOTIFICATION BANNER IF REQUESTS ARE DELAYED (+48H) */}
        {delayedRequests.length > 0 && (
          <div 
            id="banner-alerta-atraso"
            className="mt-4 p-4 rounded-xl bg-linear-to-r from-rose-900 via-rose-800 to-amber-900 text-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 shrink-0">
                <BellRing className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
                    Alerta de Compras • {delayedRequests.length} Solicitação(ões) em Atraso
                  </h4>
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-rose-950/80 border border-rose-700 text-rose-200 font-bold">
                    SLA 48 Horas
                  </span>
                </div>
                <p className="text-xs text-rose-100 mt-0.5">
                  Solicitações recebidas há mais de 48 horas pela Central de Compras aguardando cotação ou compra.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('atrasadas')}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-amber-950 rounded-xl text-xs font-bold shrink-0 transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Clock className="w-4 h-4" />
              <span>Ver Solicitações em Atraso ({delayedRequests.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* 2-Column Workspace with Lateral Sector Panel */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        
        {/* LATERAL PANEL: Filtrar por Área */}
        <aside className="w-full lg:w-72 shrink-0 lg:sticky lg:top-20 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            
            {/* Panel Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center shadow-xs">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Filtrar por Área
                  </h2>
                  <p className="text-[10px] text-slate-500">
                    {ALL_SECTORS.length} setores corporativos
                  </p>
                </div>
              </div>

              {/* Mobile toggle button */}
              <button
                type="button"
                onClick={() => setMobileSectorMenuOpen(!mobileSectorMenuOpen)}
                className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                aria-label="Alternar menu de setores"
              >
                {mobileSectorMenuOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {/* Reset link for desktop */}
              {selectedSector !== 'Todos' && (
                <button
                  onClick={() => setSelectedSector('Todos')}
                  className="hidden lg:inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-700 hover:text-cyan-900 transition-colors"
                  title="Ver todos os setores"
                >
                  <X className="w-3 h-3" />
                  <span>Limpar</span>
                </button>
              )}
            </div>

            {/* List of Sectors */}
            <div className={`mt-3 space-y-1 ${mobileSectorMenuOpen ? 'block' : 'hidden lg:block'}`}>
              
              {/* Option: Todos os Setores */}
              <button
                onClick={() => {
                  setSelectedSector('Todos');
                  setMobileSectorMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedSector === 'Todos'
                    ? 'bg-slate-900 text-white shadow-xs font-bold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Layers className={`w-4 h-4 ${selectedSector === 'Todos' ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>Todos os Setores</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  selectedSector === 'Todos' ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-slate-600'
                }`}>
                  {allRequests.length}
                </span>
              </button>

              {/* Sector Buttons */}
              <div className="pt-1.5 space-y-1 border-t border-slate-100">
                {ALL_SECTORS.map((sec) => {
                  const count = allRequests.filter(r => r.sector === sec).length;
                  const sectorColor = getSectorColor(sec);
                  const isSelected = selectedSector === sec;

                  return (
                    <button
                      key={sec}
                      onClick={() => {
                        setSelectedSector(sec);
                        setMobileSectorMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all border ${
                        isSelected
                          ? `${sectorColor.badge} ring-2 ring-cyan-600 font-bold shadow-xs`
                          : 'border-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${sectorColor.tag}`} />
                        <span className="truncate">{sec}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold ${
                          isSelected
                            ? 'bg-white/90 text-slate-900 shadow-xs'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {count}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Sector Context Card */}
              {selectedSector !== 'Todos' ? (
                <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span className="truncate">Setor: {selectedSector}</span>
                    <span className="text-[10px] text-cyan-800 font-mono">Filtro Ativo</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Solicitações</span>
                      <span className="text-sm font-bold text-slate-900">{selectedSectorRequests.length}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Total Gasto</span>
                      <span className="text-xs font-bold text-emerald-700">{formatCurrency(selectedSectorTotalSpent)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedSector('Todos')}
                    className="w-full text-center py-1 text-[11px] text-cyan-700 hover:text-cyan-900 font-semibold hover:bg-white rounded-md transition-colors"
                  >
                    Exibir Todos os Setores
                  </button>
                </div>
              ) : (
                <div className="mt-4 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 flex items-center justify-between">
                  <span>9 setores monitorados</span>
                  <span className="font-mono font-bold text-slate-700">{formatCurrency(totalGlobalSpent)}</span>
                </div>
              )}

            </div>
          </div>
        </aside>

        {/* MAIN WORKSPACE COLUMN */}
        <main className="flex-1 min-w-0 w-full space-y-5">
          {/* Primary Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('geral')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'geral'
                ? 'border-cyan-700 text-cyan-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>Todas as Solicitações</span>
            <span className="text-xs px-2 py-0.2 rounded-full bg-slate-100 text-slate-700 font-mono">
              {allRequests.length}
            </span>
          </button>

          {/* TAB: Liberadas para Compra */}
          <button
            id="purchasing-tab-liberadas"
            onClick={() => setActiveTab('liberadas')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'liberadas'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-emerald-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Liberadas para Compra</span>
            <span className="text-xs px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-900 font-bold">
              {releasedRequests.length}
            </span>
          </button>

          <button
            id="purchasing-tab-aprovadores"
            onClick={() => setActiveTab('aprovadores')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'aprovadores'
                ? 'border-purple-600 text-purple-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-purple-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>Em Aprovação (Alçada)</span>
            <span className="text-xs px-2 py-0.2 rounded-full bg-purple-100 text-purple-900 font-bold">
              {allRequests.filter(r => r.purchaseStatus === 'em_aprovacao' || r.approvals).length}
            </span>
          </button>

          <button
            id="purchasing-tab-atrasadas"
            onClick={() => setActiveTab('atrasadas')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'atrasadas'
                ? 'border-rose-600 text-rose-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-rose-700'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Solicitações em Atraso (+48h)</span>
            {delayedRequests.length > 0 ? (
              <span className="text-xs px-2 py-0.2 rounded-full bg-rose-600 text-white font-bold animate-pulse">
                {delayedRequests.length}
              </span>
            ) : (
              <span className="text-xs px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 font-mono">
                0
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('faturados')}
            className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === 'faturados'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Compra Realizada</span>
          </button>

          {isManagerOrMaster && (
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
                activeTab === 'dashboard'
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Dashboard Consolidado</span>
            </button>
          )}

          {currentUser.role === 'master' && (
            <button
              id="purchasing-tab-versoes"
              onClick={() => setActiveTab('versoes')}
              className={`pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${
                activeTab === 'versoes'
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              <span>Controle de Versões</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-900 font-bold rounded">
                Revisores
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Content: Requests List (Tabs 1, 2, 3, 4) */}
      {(activeTab === 'geral' || activeTab === 'liberadas' || activeTab === 'aprovadores' || activeTab === 'atrasadas' || activeTab === 'faturados') && (
        <div className="space-y-4">
          
          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            
            {/* Search */}
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por item, fornecedor, setor, código ou OC..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-cyan-500 outline-hidden"
              />
            </div>

            {/* Status Selector */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-cyan-500 outline-hidden"
              >
                <option value="todos">Todos os Status Operacionais</option>
                <option value="liberadas">🟢 Liberadas para Compra (Aprovação Concluída)</option>
                <option value="aguardando_aprovacao">⏳ Aguardando Aprovação (Não Liberadas)</option>
                <option value="em_atraso">Solicitação em atraso (+48h)</option>
                <option value="recebido_em_compras">Recebido em Compras</option>
                <option value="em_cotacao">Em Cotação com Fornecedores</option>
                <option value="em_aprovacao">Em Aprovação Diretoria (Alçada)</option>
                <option value="pedido_emitido">Pedido de Compra Emitido</option>
                <option value="compra_realizada">Compra Realizada</option>
                <option value="em_transito">Em Trânsito / Transporte</option>
                <option value="entregue">Entregue no Setor</option>
              </select>
            </div>
          </div>

          {/* Requests Table / Card List */}
          {filteredRequests.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">
                Nenhuma solicitação encontrada
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {searchQuery || statusFilter !== 'todos' || selectedSector !== 'Todos'
                  ? 'Tente remover os filtros de setor ou texto de pesquisa.'
                  : 'Nenhuma solicitação aguarda atendimento no momento.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((req) => {
                const statusInfo = getPurchaseStatusInfo(req.purchaseStatus);
                const approvalInfo = getManagerApprovalInfo(req.managerApprovalStatus);
                const releaseInfo = getRequestPurchaseReleaseInfo(req);
                const sectorColor = getSectorColor(req.sector);
                const hasPrice = req.totalPrice !== undefined && req.totalPrice > 0;
                const delayInfo = getRequestDelayInfo(req);

                return (
                  <div
                    key={req.id}
                    className={`bg-white p-5 rounded-2xl border transition-all group ${
                      delayInfo.isDelayed
                        ? 'border-rose-300 ring-2 ring-rose-100 shadow-sm'
                        : releaseInfo.isReleased && req.purchaseStatus !== 'compra_realizada' && req.purchaseStatus !== 'entregue'
                        ? 'border-emerald-300 hover:border-emerald-500 hover:shadow-md'
                        : 'border-slate-200 hover:border-cyan-500 hover:shadow-md'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      
                      {/* Left: Code, Sector Pill, Title, Details */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-white">
                            {req.code}
                          </span>
                          
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${sectorColor.badge}`}>
                            Setor: {req.sector}
                          </span>

                          {/* Badge de Liberação para Compra após Aprovação */}
                          <span 
                            id={`badge-liberacao-${req.id}`}
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 shadow-2xs ${releaseInfo.badgeClass}`}
                            title={releaseInfo.description}
                          >
                            {releaseInfo.isReleased ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            )}
                            <span>{releaseInfo.badgeLabel}</span>
                          </span>

                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${approvalInfo.badgeClass}`}>
                            Gestor: {approvalInfo.label}
                          </span>

                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusInfo.bgClass} ${statusInfo.colorClass} ${statusInfo.borderClass}`}>
                            {statusInfo.label}
                          </span>

                          {/* Badge de Alçada de Aprovadores */}
                          {req.approvals && (
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                              req.approvals.currentApprover === 'concluido'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : req.approvals.currentApprover === 'reprovado'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : 'bg-purple-100 text-purple-900 border-purple-300'
                            }`}>
                              <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                              {req.approvals.currentApprover === 'concluido'
                                ? 'Aprovado Alçada (3/3)'
                                : req.approvals.currentApprover === 'reprovado'
                                ? 'Reprovado na Alçada'
                                : `Alçada: Na vez de ${req.approvals.currentApprover}`}
                            </span>
                          )}

                          {/* Badge de Solicitação em atraso (+48h) */}
                          {delayInfo.isDelayed && (
                            <span 
                              id={`badge-atraso-${req.id}`}
                              className="text-xs px-2.5 py-0.5 rounded-full border border-rose-300 bg-rose-100 text-rose-800 flex items-center gap-1 font-bold animate-pulse"
                              title={`Recebida há ${delayInfo.hoursElapsed}h pelo setor de Compras (prazo limite de 48h excedido)`}
                            >
                              <Clock className="w-3 h-3 text-rose-600" />
                              Solicitação em atraso ({delayInfo.hoursElapsed}h)
                            </span>
                          )}

                          <span className="text-[11px] text-slate-400">
                            • Solicitante: <strong>{req.requesterName}</strong> ({formatDate(req.createdAt)})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <h3 
                            onClick={() => onSelectRequest(req)}
                            className="text-base font-bold text-slate-900 group-hover:text-cyan-800 transition-colors cursor-pointer"
                          >
                            {req.title}
                          </h3>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2">
                          {req.description}
                        </p>

                        {/* Callout de Liberação para Compra após Aprovação */}
                        {releaseInfo.isReleased && req.purchaseStatus !== 'compra_realizada' && req.purchaseStatus !== 'entregue' && (
                          <div 
                            id={`callout-liberada-${req.id}`}
                            className="p-2.5 bg-emerald-50/90 rounded-xl border border-emerald-300 text-xs text-emerald-950 mt-1 flex items-center justify-between gap-2 shadow-2xs"
                          >
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>
                                <strong>Liberada para Compra:</strong> {releaseInfo.description}
                              </span>
                            </div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-900 bg-emerald-200/80 px-2 py-0.5 rounded border border-emerald-400 shrink-0">
                              Aprovação Ok
                            </span>
                          </div>
                        )}

                        {!releaseInfo.isReleased && req.purchaseStatus === 'em_aprovacao' && (
                          <div 
                            id={`callout-aguardando-alcada-${req.id}`}
                            className="p-2.5 bg-purple-50/90 rounded-xl border border-purple-200 text-xs text-purple-950 mt-1 flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                              <span>
                                <strong>Aguardando Alçada:</strong> Tramitando na vez de <strong>{req.approvals?.currentApprover || 'Aprovadores'}</strong>. Aguardar aprovação final antes de efetivar compra.
                              </span>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800 bg-white px-2 py-0.5 rounded border border-purple-200 shrink-0">
                              Não Liberada
                            </span>
                          </div>
                        )}

                        {req.managerApprovalStatus === 'pendente' && (
                          <div 
                            id={`callout-pendente-gestor-${req.id}`}
                            className="p-2.5 bg-amber-50/90 rounded-xl border border-amber-200 text-xs text-amber-950 mt-1 flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>
                                <strong>Aguardando Gestor:</strong> Solicitação aguarda aprovação gerencial de <strong>{req.sector}</strong>. Bloqueada para compra.
                              </span>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-white px-2 py-0.5 rounded border border-amber-200 shrink-0">
                              Pendente Gestor
                            </span>
                          </div>
                        )}

                        {/* Callout de Alerta de Solicitação em atraso */}
                        {delayInfo.isDelayed && (
                          <div 
                            id={`callout-atraso-${req.id}`}
                            className="p-2.5 bg-rose-50/80 rounded-xl border border-rose-200 text-xs text-rose-950 mt-1 flex items-center gap-2"
                          >
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>
                              <strong>Solicitação em atraso:</strong> Recebida pela Central de Compras há <strong>{delayInfo.hoursElapsed} horas</strong> (prazo operacional de 48h excedido sem conclusão da compra).
                            </span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500">
                          <span>
                            {req.items && req.items.length > 1 ? (
                              <>
                                <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md mr-1">
                                  {req.items.length} itens inclusos
                                </span>
                                Quantidade total: <strong className="text-slate-800">{req.quantity} {req.unit}</strong>
                              </>
                            ) : (
                              <>Quantidade: <strong className="text-slate-800">{req.quantity} {req.unit}</strong></>
                            )}
                          </span>
                          <span>
                            Prioridade: <strong className="text-slate-800 capitalize">{req.priority}</strong>
                          </span>
                          {req.supplier && (
                            <span>
                              Fornecedor: <strong className="text-slate-800">{req.supplier}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Value, Pricing Status & Primary Action */}
                      <div className="flex items-center justify-between lg:justify-end gap-5 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 shrink-0">
                        
                        {/* Price Display */}
                        <div className="text-left lg:text-right min-w-32">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                            Valor de Compra
                          </span>
                          {hasPrice ? (
                            <div>
                              <span className="text-lg font-extrabold text-emerald-800 tracking-tight">
                                {formatCurrency(req.totalPrice)}
                              </span>
                              <span className="block text-[10px] text-emerald-700 font-medium">
                                Refletido ao solicitante
                              </span>
                            </div>
                          ) : (
                            <div className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>Sem valor definido</span>
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onSelectRequest(req)}
                            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Ver detalhes completos"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>

                          <button
                            id={`manage-order-${req.id}`}
                            onClick={() => onOpenManageOrder(req)}
                            className="px-3.5 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Gerenciar Pedido & Valor</span>
                          </button>
                        </div>

                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* Tab 4: Consolidated Monthly Spend Dashboard across all 9 sectors (Exclusivo Gestores e Master) */}
      {isManagerOrMaster && activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="p-4 bg-cyan-50/70 border border-cyan-200 rounded-xl text-xs text-cyan-950 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-cyan-700 shrink-0" />
            <span>
              <strong>Visão Financeira Geral:</strong> Demonstrativo mensal consolidado de todas as aquisições corporativas efetuadas pelo Setor de Compras para os 9 setores da empresa.
            </span>
          </div>

          <MonthlySpendChart
            requests={allRequests}
            targetSector={selectedSector}
          />
        </div>
      )}

      {/* Tab 5: Controle de Versões & Homologação (Exclusivo Master) */}
      {currentUser.role === 'master' && activeTab === 'versoes' && (
        <VersionControlPanel 
          currentUser={currentUser}
        />
      )}

        </main>
      </div>

    </div>
  );
};
