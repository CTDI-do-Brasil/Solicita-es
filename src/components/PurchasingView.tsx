import React, { useState, useMemo } from 'react';
import { User, PurchaseRequest, SectorType, ALL_SECTORS, ProjectType, ALL_PROJECTS } from '../types';
import { storage } from '../storage';
import { 
  formatCurrency, 
  formatDate, 
  getPurchaseStatusInfo, 
  getManagerApprovalInfo, 
  getSectorColor,
  getProjectColor,
  getRequestDelayInfo,
  getRequestPurchaseReleaseInfo,
  isRequestWaitingQuote
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
  FileCheck2,
  Send,
  GitBranch,
  ShieldCheck,
  CheckCircle2,
  History
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
  const [mobileNavMenuOpen, setMobileNavMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'geral' | 'cotacao' | 'liberadas' | 'aprovadores' | 'atrasadas' | 'faturados' | 'dashboard' | 'versoes'>('geral');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [projectFilter, setProjectFilter] = useState<string>('todos');

  // Setor de Compras has access to ALL requests from all sectors
  const allRequests = useMemo(() => {
    return storage.getAllRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestsVersion]);

  // Key metrics
  const totalGlobalSpent = useMemo(() => {
    return allRequests.reduce((acc, r) => acc + (r.totalPrice || 0), 0);
  }, [allRequests]);

  // Solicitações ativas em andamento (fila operacional de Compras: pendentes, em cotação, em aprovação ou liberadas para compra)
  // Pedidos comprados saem desta fila e vão para o Histórico de Compras!
  const activeRequests = useMemo(() => {
    return allRequests.filter(
      r => r.purchaseStatus !== 'compra_realizada' && r.purchaseStatus !== 'entregue' && r.purchaseStatus !== 'cancelado'
    );
  }, [allRequests]);

  // Solicitações ativas aguardando cotação de fornecedores ou definição de valor pela equipe de compras
  const waitingQuoteRequests = useMemo(() => {
    return allRequests.filter(r => isRequestWaitingQuote(r));
  }, [allRequests]);

  // Histórico de compras realizadas (concluídas e faturadas)
  const historyRequests = useMemo(() => {
    return allRequests.filter(
      r => r.purchaseStatus === 'compra_realizada' || r.purchaseStatus === 'entregue'
    );
  }, [allRequests]);

  // Solicitações liberadas para compra após aprovação e aguardando faturamento/emissão (que AINDA NÃO foram compradas)
  const releasedRequests = useMemo(() => {
    return allRequests.filter(r => {
      const rel = getRequestPurchaseReleaseInfo(r);
      return rel.isReleased && r.purchaseStatus !== 'compra_realizada' && r.purchaseStatus !== 'entregue' && r.purchaseStatus !== 'cancelado';
    });
  }, [allRequests]);

  // Solicitações com mais de 48h de recebimento sem conclusão da compra (em aberto)
  const delayedRequests = useMemo(() => {
    return allRequests.filter(
      r => getRequestDelayInfo(r).isDelayed && r.purchaseStatus !== 'compra_realizada' && r.purchaseStatus !== 'entregue' && r.purchaseStatus !== 'cancelado'
    );
  }, [allRequests]);

  const approversCount = useMemo(() => {
    return allRequests.filter(
      r => (r.purchaseStatus === 'em_aprovacao' || r.approvals !== undefined) && r.purchaseStatus !== 'compra_realizada' && r.purchaseStatus !== 'entregue' && r.purchaseStatus !== 'cancelado'
    ).length;
  }, [allRequests]);

  // Setor selecionado: contagens separadas de ativas e histórico
  const selectedSectorActiveRequests = useMemo(() => {
    if (selectedSector === 'Todos') return activeRequests;
    return activeRequests.filter(r => r.sector === selectedSector);
  }, [activeRequests, selectedSector]);

  const selectedSectorHistoryRequests = useMemo(() => {
    if (selectedSector === 'Todos') return historyRequests;
    return historyRequests.filter(r => r.sector === selectedSector);
  }, [historyRequests, selectedSector]);

  const selectedSectorTotalSpent = useMemo(() => {
    const list = selectedSector === 'Todos' ? allRequests : allRequests.filter(r => r.sector === selectedSector);
    return list.reduce((acc, r) => acc + (r.totalPrice || 0), 0);
  }, [allRequests, selectedSector]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    let list = allRequests;

    // Filter by Sector
    if (selectedSector !== 'Todos') {
      list = list.filter(r => r.sector === selectedSector);
    }

    // Filter by Tab
    if (activeTab === 'geral') {
      // Solicitações em Aberto: Pedidos comprados saem desta lista e vão para o Histórico de Compras!
      list = list.filter(r => r.purchaseStatus !== 'compra_realizada' && r.purchaseStatus !== 'entregue' && r.purchaseStatus !== 'cancelado');
    } else if (activeTab === 'cotacao') {
      // Apenas solicitações aguardando cotação de fornecedores ou definição de valor
      list = list.filter(r => isRequestWaitingQuote(r));
    } else if (activeTab === 'liberadas') {
      // Apenas solicitações liberadas que AINDA NÃO foram compradas!
      list = list.filter(r => {
        const rel = getRequestPurchaseReleaseInfo(r);
        return rel.isReleased && r.purchaseStatus !== 'compra_realizada' && r.purchaseStatus !== 'entregue' && r.purchaseStatus !== 'cancelado';
      });
    } else if (activeTab === 'aprovadores') {
      // Em aprovação ativas
      list = list.filter(r => (r.purchaseStatus === 'em_aprovacao' || r.approvals !== undefined) && r.purchaseStatus !== 'compra_realizada' && r.purchaseStatus !== 'entregue' && r.purchaseStatus !== 'cancelado');
    } else if (activeTab === 'atrasadas') {
      // Em atraso ativas
      list = list.filter(r => getRequestDelayInfo(r).isDelayed && r.purchaseStatus !== 'compra_realizada' && r.purchaseStatus !== 'entregue' && r.purchaseStatus !== 'cancelado');
    } else if (activeTab === 'faturados') {
      // HISTÓRICO DE COMPRAS: todos os pedidos cuja compra já foi realizada!
      list = list.filter(r => r.purchaseStatus === 'compra_realizada' || r.purchaseStatus === 'entregue');
    }

    // Filter by Status dropdown
    if (statusFilter !== 'todos') {
      if (statusFilter === 'aguardando_cotacao') {
        list = list.filter(r => isRequestWaitingQuote(r));
      } else if (statusFilter === 'liberadas') {
        list = list.filter(r => {
          const rel = getRequestPurchaseReleaseInfo(r);
          return rel.isReleased && r.purchaseStatus !== 'compra_realizada' && r.purchaseStatus !== 'entregue' && r.purchaseStatus !== 'cancelado';
        });
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

    // Filter by Project dropdown
    if (projectFilter !== 'todos') {
      list = list.filter(r => r.project === projectFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        r =>
          r.title.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          r.sector.toLowerCase().includes(q) ||
          (r.project && r.project.toLowerCase().includes(q)) ||
          r.requesterName.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          (r.supplier && r.supplier.toLowerCase().includes(q)) ||
          (r.purchaseOrderNumber && r.purchaseOrderNumber.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allRequests, selectedSector, activeTab, statusFilter, projectFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 2-Column Workspace with Lateral Sector Panel */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        
        {/* LATERAL PANEL: Navegação & Setores */}
        <aside className="w-full lg:w-80 shrink-0 lg:sticky lg:top-20 space-y-4">
          
          {/* CARD 1: Menu de Navegação */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center shadow-xs">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Menu de Compras
                  </h2>
                  <p className="text-[10px] text-slate-500">
                    Navegação e visualizações
                  </p>
                </div>
              </div>

              {/* Mobile toggle button */}
              <button
                type="button"
                onClick={() => setMobileNavMenuOpen(!mobileNavMenuOpen)}
                className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                aria-label="Alternar menu de navegação"
              >
                {mobileNavMenuOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {/* List of Navigation Tabs */}
            <nav className={`mt-3 space-y-1.5 ${mobileNavMenuOpen ? 'block' : 'hidden lg:block'}`} aria-label="Menu de Compras">
              
              {/* Solicitações em Aberto */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('geral');
                  setMobileNavMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer border ${
                  activeTab === 'geral'
                    ? 'bg-slate-900 text-white font-bold border-slate-900 shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 border-transparent font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Layers className={`w-4 h-4 shrink-0 ${activeTab === 'geral' ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span className="truncate">Solicitações em Aberto</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold shrink-0 ${
                  activeTab === 'geral' ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-slate-600'
                }`}>
                  {activeRequests.length}
                </span>
              </button>

              {/* Aguardando Cotação */}
              <button
                type="button"
                id="purchasing-tab-cotacao"
                onClick={() => {
                  setActiveTab('cotacao');
                  setMobileNavMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer border ${
                  activeTab === 'cotacao'
                    ? 'bg-amber-600 text-white font-bold border-amber-600 shadow-xs'
                    : 'text-slate-700 hover:bg-amber-50 hover:text-amber-900 border-transparent font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Clock className={`w-4 h-4 shrink-0 ${activeTab === 'cotacao' ? 'text-white' : 'text-amber-600'}`} />
                  <span className="truncate">Aguardando Cotação</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold shrink-0 ${
                  activeTab === 'cotacao' ? 'bg-amber-700 text-amber-100' : 'bg-amber-100 text-amber-900'
                }`}>
                  {waitingQuoteRequests.length}
                </span>
              </button>

              {/* Liberadas para Compra */}
              <button
                type="button"
                id="purchasing-tab-liberadas"
                onClick={() => {
                  setActiveTab('liberadas');
                  setMobileNavMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer border ${
                  activeTab === 'liberadas'
                    ? 'bg-emerald-700 text-white font-bold border-emerald-700 shadow-xs'
                    : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 border-transparent font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <CheckCircle2 className={`w-4 h-4 shrink-0 ${activeTab === 'liberadas' ? 'text-white' : 'text-emerald-600'}`} />
                  <span className="truncate">Liberadas para Compra</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold shrink-0 ${
                  activeTab === 'liberadas' ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {releasedRequests.length}
                </span>
              </button>

              {/* Em Aprovação (Alçada) */}
              <button
                type="button"
                id="purchasing-tab-aprovadores"
                onClick={() => {
                  setActiveTab('aprovadores');
                  setMobileNavMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer border ${
                  activeTab === 'aprovadores'
                    ? 'bg-purple-700 text-white font-bold border-purple-700 shadow-xs'
                    : 'text-slate-700 hover:bg-purple-50 hover:text-purple-900 border-transparent font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <ShieldCheck className={`w-4 h-4 shrink-0 ${activeTab === 'aprovadores' ? 'text-white' : 'text-purple-600'}`} />
                  <span className="truncate">Em Aprovação</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold shrink-0 ${
                  activeTab === 'aprovadores' ? 'bg-purple-800 text-purple-100' : 'bg-purple-100 text-purple-900'
                }`}>
                  {approversCount}
                </span>
              </button>

              {/* Solicitações em Atraso (+48h) */}
              <button
                type="button"
                id="purchasing-tab-atrasadas"
                onClick={() => {
                  setActiveTab('atrasadas');
                  setMobileNavMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer border ${
                  activeTab === 'atrasadas'
                    ? 'bg-rose-700 text-white font-bold border-rose-700 shadow-xs'
                    : 'text-slate-700 hover:bg-rose-50 hover:text-rose-800 border-transparent font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <AlertTriangle className={`w-4 h-4 shrink-0 ${activeTab === 'atrasadas' ? 'text-white' : 'text-rose-600'}`} />
                  <span className="truncate">Solicitações em Atraso (+48h)</span>
                </div>
                {delayedRequests.length > 0 ? (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold shrink-0 ${
                    activeTab === 'atrasadas' ? 'bg-rose-900 text-rose-100' : 'bg-rose-600 text-white animate-pulse'
                  }`}>
                    {delayedRequests.length}
                  </span>
                ) : (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono shrink-0 ${
                    activeTab === 'atrasadas' ? 'bg-rose-800 text-rose-200' : 'bg-slate-100 text-slate-600'
                  }`}>
                    0
                  </span>
                )}
              </button>

              {/* Histórico de Compras */}
              <button
                type="button"
                id="purchasing-tab-historico"
                onClick={() => {
                  setActiveTab('faturados');
                  setMobileNavMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer border ${
                  activeTab === 'faturados'
                    ? 'bg-slate-900 text-white font-bold border-slate-900 shadow-xs'
                    : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 border-transparent font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <History className={`w-4 h-4 shrink-0 ${activeTab === 'faturados' ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  <span className="truncate">Histórico de Compras</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold shrink-0 ${
                  activeTab === 'faturados' ? 'bg-emerald-900 text-emerald-200' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {historyRequests.length}
                </span>
              </button>

              {/* Dashboard Consolidado */}
              {isManagerOrMaster && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('dashboard');
                    setMobileNavMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer border ${
                    activeTab === 'dashboard'
                      ? 'bg-indigo-700 text-white font-bold border-indigo-700 shadow-xs'
                      : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-800 border-transparent font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <BarChart3 className={`w-4 h-4 shrink-0 ${activeTab === 'dashboard' ? 'text-white' : 'text-indigo-600'}`} />
                    <span className="truncate">Dashboard Consolidado</span>
                  </div>
                </button>
              )}

              {/* Controle de Versões */}
              {currentUser.role === 'master' && (
                <button
                  type="button"
                  id="purchasing-tab-versoes"
                  onClick={() => {
                    setActiveTab('versoes');
                    setMobileNavMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer border ${
                    activeTab === 'versoes'
                      ? 'bg-slate-900 text-white font-bold border-slate-900 shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100 border-transparent font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <GitBranch className={`w-4 h-4 shrink-0 ${activeTab === 'versoes' ? 'text-amber-400' : 'text-slate-500'}`} />
                    <span className="truncate">Controle de Versões</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-900 font-bold rounded shrink-0">
                    Revisores
                  </span>
                </button>
              )}

            </nav>
          </div>

          {/* CARD 2: Filtrar por Área */}
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
                  {activeTab === 'faturados' ? historyRequests.length : activeRequests.length}
                </span>
              </button>

              {/* Sector Buttons */}
              <div className="pt-1.5 space-y-1 border-t border-slate-100">
                {ALL_SECTORS.map((sec) => {
                  const activeCount = activeRequests.filter(r => r.sector === sec).length;
                  const historyCount = historyRequests.filter(r => r.sector === sec).length;
                  const count = activeTab === 'faturados' ? historyCount : activeCount;
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
                      <span className="text-[10px] text-slate-500 block">Em Aberto</span>
                      <span className="text-sm font-bold text-slate-900">{selectedSectorActiveRequests.length}</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-500 block">Comprados</span>
                      <span className="text-sm font-bold text-emerald-700">{selectedSectorHistoryRequests.length}</span>
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Total Gasto (Histórico)</span>
                    <span className="text-xs font-bold text-emerald-700">{formatCurrency(selectedSectorTotalSpent)}</span>
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
                  <span>{ALL_SECTORS.length} setores monitorados</span>
                  <span className="font-mono font-bold text-slate-700">{formatCurrency(totalGlobalSpent)}</span>
                </div>
              )}

            </div>
          </div>
        </aside>

        {/* MAIN WORKSPACE COLUMN */}
        <main className="flex-1 min-w-0 w-full space-y-5">
          {/* Active View Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
            <div>
              <div className="flex items-center gap-2.5">
                {activeTab === 'geral' && <Layers className="w-5 h-5 text-slate-700" />}
                {activeTab === 'cotacao' && <Clock className="w-5 h-5 text-amber-600" />}
                {activeTab === 'liberadas' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                {activeTab === 'aprovadores' && <ShieldCheck className="w-5 h-5 text-purple-600" />}
                {activeTab === 'atrasadas' && <AlertTriangle className="w-5 h-5 text-rose-600" />}
                {activeTab === 'faturados' && <History className="w-5 h-5 text-emerald-600" />}
                {activeTab === 'dashboard' && <BarChart3 className="w-5 h-5 text-indigo-600" />}
                {activeTab === 'versoes' && <GitBranch className="w-5 h-5 text-amber-500" />}
                <h1 className="text-base font-bold text-slate-900">
                  {activeTab === 'geral' && 'Solicitações em Aberto'}
                  {activeTab === 'cotacao' && 'Solicitações Aguardando Cotação'}
                  {activeTab === 'liberadas' && 'Liberadas para Compra'}
                  {activeTab === 'aprovadores' && 'Em Aprovação'}
                  {activeTab === 'atrasadas' && 'Solicitações em Atraso (+48h)'}
                  {activeTab === 'faturados' && 'Histórico de Compras Realizadas'}
                  {activeTab === 'dashboard' && 'Dashboard Consolidado'}
                  {activeTab === 'versoes' && 'Controle de Versões & Revisores'}
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeTab === 'geral' && 'Fila operacional de solicitações ativas em cotação e atendimento'}
                {activeTab === 'cotacao' && 'Fila operacional de solicitações aguardando cotação de preços com fornecedores ou definição de valor'}
                {activeTab === 'liberadas' && 'Solicitações autorizadas prontas para compra ou emissão de pedido'}
                {activeTab === 'aprovadores' && 'Solicitações aguardando deliberação de gestores e diretoria'}
                {activeTab === 'atrasadas' && 'Solicitações recebidas há mais de 48 horas aguardando atendimento'}
                {activeTab === 'faturados' && 'Arquivo histórico de pedidos já comprados, faturados e concluídos'}
                {activeTab === 'dashboard' && 'Visão financeira e acompanhamento mensal por setor'}
                {activeTab === 'versoes' && 'Histórico e homologação de versões da aplicação'}
              </p>
            </div>

            {/* Sector indicator if filtered */}
            {selectedSector !== 'Todos' && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-cyan-50 border border-cyan-200 text-cyan-900 rounded-lg text-xs font-semibold self-start sm:self-auto">
                <Building2 className="w-3.5 h-3.5 text-cyan-700" />
                <span>Área: {selectedSector}</span>
                <button
                  type="button"
                  onClick={() => setSelectedSector('Todos')}
                  className="ml-1 text-cyan-700 hover:text-cyan-950 transition-colors"
                  title="Limpar filtro de área"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

      {/* Tab Content: Requests List (Tabs 1, 2, 3, 4, 5) */}
      {(activeTab === 'geral' || activeTab === 'cotacao' || activeTab === 'liberadas' || activeTab === 'aprovadores' || activeTab === 'atrasadas' || activeTab === 'faturados') && (
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

            {/* Status & Project Selectors */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-cyan-500 outline-hidden"
                >
                  <option value="todos">Todos os Status Operacionais</option>
                  <option value="aguardando_cotacao">🟠 Aguardando Cotação (Pendente Compras)</option>
                  <option value="liberadas">🟢 Liberadas para Compra (Aprovação Concluída)</option>
                  <option value="aguardando_aprovacao">⏳ Aguardando Aprovação (Não Liberadas)</option>
                  <option value="em_atraso">Solicitação em atraso (+48h)</option>
                  <option value="recebido_em_compras">Recebido em Compras</option>
                  <option value="em_cotacao">Em Cotação com Fornecedores</option>
                  <option value="em_aprovacao">Em Aprovação Diretoria</option>
                  <option value="pedido_emitido">Pedido de Compra Emitido</option>
                  <option value="compra_realizada">Compra Realizada</option>
                  <option value="em_transito">Em Trânsito / Transporte</option>
                  <option value="entregue">Entregue no Setor</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <select
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                  className="w-full sm:w-auto px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 font-semibold focus:ring-2 focus:ring-cyan-500 outline-hidden"
                >
                  <option value="todos">Todos os Projetos</option>
                  {ALL_PROJECTS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
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

                          {req.project && (
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${getProjectColor(req.project).badge}`}>
                              {req.project}
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

                        {/* Callout de Compra Realizada (Histórico) */}
                        {(req.purchaseStatus === 'compra_realizada' || req.purchaseStatus === 'entregue') && (
                          <div 
                            id={`callout-compra-concluida-${req.id}`}
                            className="p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-300 text-xs text-emerald-950 mt-1 flex items-center justify-between gap-2 shadow-2xs"
                          >
                            <div className="flex items-center gap-2">
                              <History className="w-4 h-4 text-emerald-700 shrink-0" />
                              <span>
                                <strong>Compra Concluída:</strong> Pedido finalizado e arquivado no Histórico de Compras.
                                {req.purchaseOrderNumber ? ` (OC: ${req.purchaseOrderNumber})` : ''}
                              </span>
                            </div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-900 bg-emerald-200/90 px-2 py-0.5 rounded border border-emerald-400 shrink-0">
                              Histórico
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

                        {/* Callout de Aguardando Cotação */}
                        {!releaseInfo.isReleased && isRequestWaitingQuote(req) && req.managerApprovalStatus === 'aprovado' && (
                          <div 
                            id={`callout-cotacao-${req.id}`}
                            className="p-2.5 bg-amber-50/90 rounded-xl border border-amber-300 text-xs text-amber-950 mt-1 flex items-center justify-between gap-2 shadow-2xs"
                          >
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>
                                <strong>Aguardando Cotação:</strong> Aprovada pelo Gestor ({req.managerApprovedBy || req.sector}). Pendente equipe de Compras cotar com fornecedores e definir valor.
                              </span>
                            </div>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded border border-amber-400 shrink-0">
                              Cotação Pendente
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
                              <div className="flex items-center gap-1 justify-end text-[10px] text-emerald-700 font-semibold">
                                {((req.quotes && req.quotes.length > 0) || (req.items && req.items.some(i => i.quotes && i.quotes.length > 0))) && (
                                  <span className="bg-cyan-100 text-cyan-800 px-1.5 py-0.2 rounded font-bold">
                                    {req.quotes ? req.quotes.length : req.items?.reduce((acc, it) => acc + (it.quotes?.length || 0), 0)} orç.
                                  </span>
                                )}
                                <span>Definido por Compras</span>
                              </div>
                              {(req.paymentTerms || req.deliveryDeadline) && (
                                <div className="text-[10px] text-slate-500 font-medium">
                                  {req.paymentTerms ? `Pagto: ${req.paymentTerms}` : ''}
                                  {req.paymentTerms && req.deliveryDeadline ? ' • ' : ''}
                                  {req.deliveryDeadline ? `Entrega: ${req.deliveryDeadline}` : ''}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <div className="text-xs font-bold text-amber-800 bg-amber-100/90 px-2.5 py-1 rounded-lg border border-amber-300 flex items-center gap-1 mt-0.5">
                                <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                <span>Aguardando Cotação</span>
                              </div>
                              <span className="block text-[10px] text-amber-700 font-medium mt-0.5">
                                Pendente Compras cotar
                              </span>
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
                            className={`px-3.5 py-2 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                              hasPrice
                                ? 'bg-cyan-700 hover:bg-cyan-800'
                                : 'bg-amber-600 hover:bg-amber-700 ring-2 ring-amber-300 animate-pulse'
                            }`}
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>{hasPrice ? 'Gerenciar Cotações & Pedido' : 'Inserir Cotação de Compra'}</span>
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
