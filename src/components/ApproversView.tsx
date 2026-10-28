import React, { useState, useMemo } from 'react';
import { User, PurchaseRequest, ApproverName, APPROVAL_CHAIN } from '../types';
import { storage } from '../storage';
import { formatCurrency, formatDate, formatDateTime, getSectorColor, getProjectColor, getApproverFromUser } from '../utils';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Lock, 
  ArrowRight, 
  DollarSign, 
  Search, 
  Filter, 
  Building2, 
  Layers, 
  BarChart3, 
  FileText, 
  AlertCircle,
  Eye,
  Check,
  Send,
  AlertTriangle,
  Award,
  Calendar,
  CalendarRange,
  RotateCcw,
  CreditCard
} from 'lucide-react';

const MONTHS_LIST = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

interface ApproversViewProps {
  currentUser: User;
  onSelectRequest: (req: PurchaseRequest) => void;
  requestsVersion: number;
}

export const ApproversView: React.FC<ApproversViewProps> = ({
  currentUser,
  onSelectRequest,
  requestsVersion,
}) => {
  // Determine if the logged-in user is one of the 3 approvers or Master
  const detectedApprover = getApproverFromUser(currentUser);
  const isMaster = currentUser.role === 'master';

  const [activeTab, setActiveTab] = useState<'minha_vez' | 'esteira' | 'aprovados' | 'reprovados'>('minha_vez');
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>('todos');
  
  // Note input states for approval/rejection
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});
  const [rejectionModalReq, setRejectionModalReq] = useState<PurchaseRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Fetch all requests
  const allRequests = useMemo(() => {
    return storage.getAllRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestsVersion]);

  // Filter requests that have been created or sent to approvers
  const approverPipelineRequests = useMemo(() => {
    return allRequests.filter(r => r.approvals !== undefined || r.purchaseStatus === 'em_aprovacao');
  }, [allRequests]);

  // Current approver role (from logged in user)
  const currentApproverRole: ApproverName | null = detectedApprover;

  // Requests currently waiting for this specific approver
  const myQueueRequests = useMemo(() => {
    if (!currentApproverRole) {
      // If "Todos" perspective and not an approver, show all currently pending someone
      return approverPipelineRequests.filter(
        r => r.purchaseStatus === 'em_aprovacao' && r.approvals && r.approvals.currentApprover !== 'concluido' && r.approvals.currentApprover !== 'reprovado'
      );
    }
    return approverPipelineRequests.filter(
      r => r.purchaseStatus === 'em_aprovacao' && r.approvals?.currentApprover === currentApproverRole
    );
  }, [approverPipelineRequests, currentApproverRole]);

  // Statistics & Metrics for Approvers Dashboard
  const metrics = useMemo(() => {
    const totalInPipeline = approverPipelineRequests.filter(
      r => r.purchaseStatus === 'em_aprovacao' && r.approvals?.currentApprover !== 'concluido' && r.approvals?.currentApprover !== 'reprovado'
    );

    const waitingFernando = approverPipelineRequests.filter(r => r.approvals?.currentApprover === 'Fernando');
    const waitingEduardo = approverPipelineRequests.filter(r => r.approvals?.currentApprover === 'Eduardo');
    const waitingLuiz = approverPipelineRequests.filter(r => r.approvals?.currentApprover === 'Luiz');
    const fullyApproved = approverPipelineRequests.filter(
      r => r.approvals?.currentApprover === 'concluido' || (r.approvals?.luiz?.status === 'aprovado')
    );
    const reproved = approverPipelineRequests.filter(
      r => r.purchaseStatus === 'reprovado_aprovadores' || r.approvals?.currentApprover === 'reprovado'
    );

    const totalValueInPipeline = totalInPipeline.reduce((acc, r) => acc + (r.totalPrice || 0), 0);
    const myQueueTotalValue = myQueueRequests.reduce((acc, r) => acc + (r.totalPrice || 0), 0);
    const fullyApprovedTotalValue = fullyApproved.reduce((acc, r) => acc + (r.totalPrice || 0), 0);

    return {
      totalInPipelineCount: totalInPipeline.length,
      totalValueInPipeline,
      myQueueCount: myQueueRequests.length,
      myQueueTotalValue,
      waitingFernandoCount: waitingFernando.length,
      waitingFernandoValue: waitingFernando.reduce((acc, r) => acc + (r.totalPrice || 0), 0),
      waitingEduardoCount: waitingEduardo.length,
      waitingEduardoValue: waitingEduardo.reduce((acc, r) => acc + (r.totalPrice || 0), 0),
      waitingLuizCount: waitingLuiz.length,
      waitingLuizValue: waitingLuiz.reduce((acc, r) => acc + (r.totalPrice || 0), 0),
      fullyApprovedCount: fullyApproved.length,
      fullyApprovedTotalValue,
      reprovedCount: reproved.length,
      approvalRate: (fullyApproved.length + reproved.length) > 0 
        ? Math.round((fullyApproved.length / (fullyApproved.length + reproved.length)) * 100) 
        : 100,
    };
  }, [approverPipelineRequests, myQueueRequests]);

  // Analytics Filter States (Acompanhamento Mensal, Anual e Seleção de Datas)
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'mensal' | 'anual' | 'personalizado' | 'todos'>('mensal');
  const [analyticsViewMode, setAnalyticsViewMode] = useState<'setor' | 'evolucao'>('setor');
  
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear() || 2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1 || 9);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Available years from requests
  const availableYears = useMemo(() => {
    const years = new Set<number>([2024, 2025, 2026, 2027]);
    approverPipelineRequests.forEach(r => {
      const raw = r.approvals?.sentToApproversAt || r.purchaseDate || r.createdAt;
      if (raw) {
        const d = new Date(raw);
        if (!isNaN(d.getFullYear())) {
          years.add(d.getFullYear());
        }
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [approverPipelineRequests]);

  // Helper to retrieve request reference date
  const getRequestDate = (r: PurchaseRequest): Date | null => {
    const raw = r.approvals?.sentToApproversAt || r.purchaseDate || r.createdAt;
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  };

  // Requests filtered for the analytics dashboard by selected period / dates
  const filteredAnalyticsRequests = useMemo(() => {
    return approverPipelineRequests.filter(r => {
      const d = getRequestDate(r);
      if (!d) return true;

      if (analyticsPeriod === 'mensal') {
        return d.getFullYear() === selectedYear && (d.getMonth() + 1) === selectedMonth;
      }
      if (analyticsPeriod === 'anual') {
        return d.getFullYear() === selectedYear;
      }
      if (analyticsPeriod === 'personalizado') {
        if (startDate) {
          const start = new Date(startDate + 'T00:00:00');
          if (d < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate + 'T23:59:59');
          if (d > end) return false;
        }
        return true;
      }
      return true; // 'todos'
    });
  }, [approverPipelineRequests, analyticsPeriod, selectedYear, selectedMonth, startDate, endDate]);

  // Chart Data 1: Value by Requesting Sector in the selected period
  const sectorSpendData = useMemo(() => {
    const map: Record<string, { sector: string; total: number; count: number }> = {};
    filteredAnalyticsRequests.forEach(r => {
      const sec = r.sector;
      if (!map[sec]) {
        map[sec] = { sector: sec, total: 0, count: 0 };
      }
      map[sec].total += (r.totalPrice || 0);
      map[sec].count += 1;
    });

    const list = Object.values(map).sort((a, b) => b.total - a.total);
    const maxVal = Math.max(...list.map(s => s.total), 1);
    const periodTotal = list.reduce((acc, s) => acc + s.total, 0);
    const periodCount = list.reduce((acc, s) => acc + s.count, 0);
    return { list, maxVal, periodTotal, periodCount };
  }, [filteredAnalyticsRequests]);

  // Chart Data 2: Monthly Evolution (12 months of selected year)
  const monthlyEvolutionData = useMemo(() => {
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const months = monthNames.map((name, idx) => ({
      monthNumber: idx + 1,
      monthName: name,
      fullName: MONTHS_LIST[idx].label,
      total: 0,
      count: 0,
    }));

    approverPipelineRequests.forEach(r => {
      const d = getRequestDate(r);
      if (d && d.getFullYear() === selectedYear) {
        const m = d.getMonth();
        if (m >= 0 && m < 12) {
          months[m].total += (r.totalPrice || 0);
          months[m].count += 1;
        }
      }
    });

    const maxMonthTotal = Math.max(...months.map(m => m.total), 1);
    const yearTotal = months.reduce((acc, m) => acc + m.total, 0);
    const yearCount = months.reduce((acc, m) => acc + m.count, 0);

    return { months, maxMonthTotal, yearTotal, yearCount };
  }, [approverPipelineRequests, selectedYear]);

  // Filter requests for list view
  const filteredList = useMemo(() => {
    let list: PurchaseRequest[] = [];

    if (activeTab === 'minha_vez') {
      list = myQueueRequests;
    } else if (activeTab === 'esteira') {
      list = approverPipelineRequests.filter(
        r => r.purchaseStatus === 'em_aprovacao' && r.approvals?.currentApprover !== 'concluido' && r.approvals?.currentApprover !== 'reprovado'
      );
    } else if (activeTab === 'aprovados') {
      list = approverPipelineRequests.filter(
        r => r.approvals?.currentApprover === 'concluido' || r.purchaseStatus === 'pedido_emitido' || r.purchaseStatus === 'compra_realizada'
      );
    } else if (activeTab === 'reprovados') {
      list = approverPipelineRequests.filter(
        r => r.purchaseStatus === 'reprovado_aprovadores' || r.approvals?.currentApprover === 'reprovado'
      );
    }

    if (sectorFilter !== 'todos') {
      list = list.filter(r => r.sector === sectorFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r => 
        r.code.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.supplier?.toLowerCase().includes(q) ||
        r.requesterName.toLowerCase().includes(q) ||
        r.sector.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeTab, myQueueRequests, approverPipelineRequests, sectorFilter, searchQuery]);

  // Handler for approving
  const handleApprove = (req: PurchaseRequest, approverToUse: ApproverName) => {
    const notes = actionNotes[req.id] || '';
    const success = storage.approveByApprover(req.id, approverToUse, currentUser, notes);
    if (success) {
      setActionSuccessMsg(`Pedido ${req.code} aprovado com sucesso por ${approverToUse}!`);
      setActionNotes(prev => ({ ...prev, [req.id]: '' }));
      setTimeout(() => setActionSuccessMsg(''), 4000);
    }
  };

  // Handler for opening rejection modal
  const handleOpenRejection = (req: PurchaseRequest) => {
    setRejectionModalReq(req);
    setRejectionReason('');
  };

  // Handler for confirming rejection
  const handleConfirmRejection = () => {
    if (!rejectionModalReq || !rejectionReason.trim()) return;
    const approverToUse = rejectionModalReq.approvals?.currentApprover as ApproverName || currentApproverRole || 'Fernando';
    const success = storage.rejectByApprover(rejectionModalReq.id, approverToUse, currentUser, rejectionReason.trim());
    if (success) {
      setActionSuccessMsg(`Pedido ${rejectionModalReq.code} reprovado por ${approverToUse}. O setor de compras foi notificado.`);
      setRejectionModalReq(null);
      setRejectionReason('');
      setTimeout(() => setActionSuccessMsg(''), 4000);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Success Notification Alert */}
      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* KPI Cards / Indicadores Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Minha Fila / Sua Vez */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {currentApproverRole ? `Fila de ${currentApproverRole} (Sua Vez)` : 'Aguardando Aprovação'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {metrics.myQueueCount}
            </span>
            <span className="text-xs font-medium text-slate-500">pedidos pendentes</span>
          </div>
          <div className="mt-2 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg inline-block">
            {formatCurrency(metrics.myQueueTotalValue)} sob sua decisão
          </div>
        </div>

        {/* Card 2: Total em Tramitação na Alçada */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total em Tramitação
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {metrics.totalInPipelineCount}
            </span>
            <span className="text-xs font-medium text-slate-500">pedidos na esteira</span>
          </div>
          <div className="mt-2 text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg inline-block">
            {formatCurrency(metrics.totalValueInPipeline)} acumulados
          </div>
        </div>

        {/* Card 3: Aprovados pela Alçada (Concluídos 3/3) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Aprovados pela Alçada
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">
              {metrics.fullyApprovedCount}
            </span>
            <span className="text-xs font-medium text-slate-500">concluídos (3/3)</span>
          </div>
          <div className="mt-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg inline-block">
            {formatCurrency(metrics.fullyApprovedTotalValue)} autorizados
          </div>
        </div>

        {/* Card 4: Taxa de Aprovação / Reprovações */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Taxa de Aprovação
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-indigo-700">
              {metrics.approvalRate}%
            </span>
            <span className="text-xs font-medium text-slate-500">índice de aprovação</span>
          </div>
          <div className="mt-2 text-xs text-slate-600 flex items-center gap-1.5">
            <span className="font-semibold text-rose-600">{metrics.reprovedCount} reprovado(s)</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500">Média SLA 18h</span>
          </div>
        </div>
      </div>

      {/* DASHBOARD ANALÍTICO COM ACOMPANHAMENTO MENSAL / ANUAL E SELEÇÃO DE DATAS */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
          
          {/* Header Superior: Título + Badge de Totais do Período */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-700" />
                Volume de Pedidos em Aprovação por Setor
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Acompanhamento financeiro mensal, anual e por datas das solicitações enviadas à diretoria
              </p>
            </div>
            
            {/* Resumo Rápido do Período */}
            <div className="flex items-center gap-2 bg-purple-50 text-purple-900 px-3 py-1.5 rounded-xl border border-purple-100 shrink-0">
              <DollarSign className="w-4 h-4 text-purple-700" />
              <div className="text-xs">
                <span className="font-semibold text-purple-800">Total no período: </span>
                <strong className="font-extrabold text-purple-950">{formatCurrency(sectorSpendData.periodTotal)}</strong>
                <span className="text-purple-600 ml-1">({sectorSpendData.periodCount} pedido{sectorSpendData.periodCount !== 1 ? 's' : ''})</span>
              </div>
            </div>
          </div>

          {/* Barra de Filtro de Período & Seleção de Datas */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
            
            {/* Botões de Seleção de Modalidade */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAnalyticsPeriod('mensal')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                  analyticsPeriod === 'mensal'
                    ? 'bg-purple-700 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Mensal</span>
              </button>

              <button
                type="button"
                onClick={() => setAnalyticsPeriod('anual')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                  analyticsPeriod === 'anual'
                    ? 'bg-purple-700 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Anual</span>
              </button>

              <button
                type="button"
                onClick={() => setAnalyticsPeriod('personalizado')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                  analyticsPeriod === 'personalizado'
                    ? 'bg-purple-700 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                <span>Selecionar Datas</span>
              </button>

              <button
                type="button"
                onClick={() => setAnalyticsPeriod('todos')}
                className={`px-2.5 py-1.5 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                  analyticsPeriod === 'todos'
                    ? 'bg-purple-700 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>Todos</span>
              </button>
            </div>

            {/* Controles Dinâmicos de Filtro de Acordo com a Modalidade */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              
              {/* Se Mensal: Seletores de Mês e Ano */}
              {analyticsPeriod === 'mensal' && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 font-medium">Mês:</span>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800 shadow-2xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    >
                      {MONTHS_LIST.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 font-medium">Ano:</span>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800 shadow-2xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    >
                      {availableYears.map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Se Anual: Seletor de Ano */}
              {analyticsPeriod === 'anual' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Ano de Referência:</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    {availableYears.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Se Personalizado: Date inputs Data Início e Data Fim */}
              {analyticsPeriod === 'personalizado' && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 font-medium">De:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800 shadow-2xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-slate-500 font-medium">Até:</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800 shadow-2xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  {(startDate || endDate) && (
                    <button
                      type="button"
                      onClick={() => { setStartDate(''); setEndDate(''); }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-md transition-colors"
                      title="Limpar datas"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Se Todos */}
              {analyticsPeriod === 'todos' && (
                <span className="text-slate-500 font-medium italic">
                  Todo o histórico acumulado
                </span>
              )}

            </div>
          </div>

          {/* Sub-abas de Visualização: [ Distribuição por Setor ] e [ Evolução Mensal do Ano ] */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAnalyticsViewMode('setor')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  analyticsViewMode === 'setor'
                    ? 'bg-white text-purple-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Gasto total no setor
              </button>
              <button
                type="button"
                onClick={() => setAnalyticsViewMode('evolucao')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  analyticsViewMode === 'evolucao'
                    ? 'bg-white text-purple-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Evolução Mensal ({selectedYear})
              </button>
            </div>

            <span className="text-[11px] text-slate-400 font-medium">
              {analyticsPeriod === 'mensal' && `${MONTHS_LIST.find(m => m.value === selectedMonth)?.label} / ${selectedYear}`}
              {analyticsPeriod === 'anual' && `Ano ${selectedYear}`}
              {analyticsPeriod === 'personalizado' && (startDate || endDate ? `${startDate ? formatDate(startDate) : 'Início'} até ${endDate ? formatDate(endDate) : 'Hoje'}` : 'Período personalizado')}
              {analyticsPeriod === 'todos' && 'Histórico completo'}
            </span>
          </div>

          {/* CONTEÚDO 1: Distribuição por Setor */}
          {analyticsViewMode === 'setor' && (
            <div className="pt-2">
              {sectorSpendData.list.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <BarChart3 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-600">Nenhum pedido encontrado para o período selecionado.</p>
                  <p className="text-slate-400 mt-1">Alterne o mês, o ano ou selecione outro intervalo de datas.</p>
                </div>
              ) : (
                <div className="relative pt-6 pb-2">
                  {/* Linhas de grade de referência ao fundo */}
                  <div className="absolute inset-x-0 top-12 bottom-20 flex flex-col justify-between pointer-events-none opacity-40">
                    <div className="border-b border-dashed border-slate-300 w-full" />
                    <div className="border-b border-dashed border-slate-200 w-full" />
                    <div className="border-b border-dashed border-slate-200 w-full" />
                    <div className="border-b border-slate-300 w-full" />
                  </div>

                  {/* Barras Verticais */}
                  <div className="relative flex items-end justify-around gap-3 sm:gap-6 min-h-[280px] px-2 overflow-x-auto">
                    {sectorSpendData.list.map((item) => {
                      const pct = (item.total / sectorSpendData.maxVal) * 100;
                      const color = getSectorColor(item.sector as any);

                      return (
                        <div 
                          key={item.sector} 
                          className="flex flex-col items-center flex-1 max-w-[150px] min-w-[95px] group"
                        >
                          {/* Valor no topo da coluna */}
                          <div className="text-center mb-2.5 transition-transform duration-200 group-hover:-translate-y-1">
                            <span className="font-extrabold text-xs sm:text-sm text-slate-900 block whitespace-nowrap">
                              {formatCurrency(item.total)}
                            </span>
                            <span className="text-[10px] font-semibold text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-full mt-0.5 inline-block">
                              {pct.toFixed(0)}%
                            </span>
                          </div>

                          {/* Área da Coluna Vertical */}
                          <div className="w-full h-44 sm:h-52 flex items-end justify-center">
                            <div className="w-12 sm:w-16 md:w-20 h-full flex items-end justify-center rounded-t-xl bg-slate-100/90 p-1">
                              <div
                                className="w-full rounded-t-lg bg-gradient-to-t from-purple-700 via-purple-600 to-indigo-500 transition-all duration-700 group-hover:from-purple-800 group-hover:to-indigo-600 shadow-sm"
                                style={{ height: `${Math.max(pct, 6)}%` }}
                              />
                            </div>
                          </div>

                          {/* Linha de Base */}
                          <div className="w-full border-t-2 border-slate-200 mb-2.5" />

                          {/* Rótulo do Setor e Contagem */}
                          <div className="flex flex-col items-center gap-1 text-center w-full">
                            <div className="flex items-center justify-center gap-1.5 max-w-full">
                              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color.dot}`} />
                              <span className="font-bold text-xs sm:text-sm text-slate-800 truncate" title={item.sector}>
                                {item.sector}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                              {item.count} {item.count === 1 ? 'pedido' : 'pedidos'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CONTEÚDO 2: Evolução Mensal (Gráfico Mês a Mês do Ano Selecionado) */}
          {analyticsViewMode === 'evolucao' && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {monthlyEvolutionData.months.map((m) => {
                  const isCurrentSelectedMonth = analyticsPeriod === 'mensal' && m.monthNumber === selectedMonth;
                  const hasActivity = m.count > 0;
                  const pctHeight = (m.total / monthlyEvolutionData.maxMonthTotal) * 100;

                  return (
                    <div
                      key={m.monthNumber}
                      onClick={() => {
                        setSelectedMonth(m.monthNumber);
                        setAnalyticsPeriod('mensal');
                        setAnalyticsViewMode('setor');
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isCurrentSelectedMonth
                          ? 'bg-purple-50/80 border-purple-400 ring-2 ring-purple-400/30 shadow-xs'
                          : hasActivity
                          ? 'bg-white border-slate-200 hover:border-purple-300 hover:shadow-2xs'
                          : 'bg-slate-50/60 border-slate-100 text-slate-400'
                      }`}
                      title={`Ver pedidos de ${m.fullName}/${selectedYear}`}
                    >
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className={`font-bold ${isCurrentSelectedMonth ? 'text-purple-900' : 'text-slate-700'}`}>
                          {m.monthName}
                        </span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          hasActivity ? 'bg-purple-100 text-purple-800' : 'text-slate-400'
                        }`}>
                          {m.count} {m.count === 1 ? 'ped' : 'peds'}
                        </span>
                      </div>

                      {/* Mini Bar */}
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden my-1.5">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            isCurrentSelectedMonth
                              ? 'bg-purple-600'
                              : hasActivity
                              ? 'bg-indigo-500'
                              : 'bg-transparent'
                          }`}
                          style={{ width: `${hasActivity ? Math.max(pctHeight, 8) : 0}%` }}
                        />
                      </div>

                      <div className={`text-xs font-bold truncate mt-1 ${
                        hasActivity ? 'text-slate-900' : 'text-slate-400 font-normal'
                      }`}>
                        {hasActivity ? formatCurrency(m.total) : 'R$ 0,00'}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 text-xs text-purple-900 flex items-center justify-between">
                <span>
                  <strong>Total Acumulado em {selectedYear}:</strong> {formatCurrency(monthlyEvolutionData.yearTotal)} ({monthlyEvolutionData.yearCount} pedido{monthlyEvolutionData.yearCount !== 1 ? 's' : ''})
                </span>
                <span className="text-[11px] text-purple-700">
                  Clique em um mês para filtrar o gasto total no setor
                </span>
              </div>
            </div>
          )}

        </div>

      {/* FILTER TABS & SEARCH */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto w-full md:w-auto">
            <button
              onClick={() => setActiveTab('minha_vez')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === 'minha_vez'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Na Minha Vez ({myQueueRequests.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('esteira')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === 'esteira'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Todos em Tramitação ({metrics.totalInPipelineCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('aprovados')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === 'aprovados'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Aprovados 100% ({metrics.fullyApprovedCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('reprovados')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === 'reprovados'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Reprovados ({metrics.reprovedCount})</span>
            </button>
          </div>

          {/* Search & Sector Filters */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar código, título, fornecedor..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-purple-500 outline-hidden"
              />
            </div>

            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-purple-500 outline-hidden"
            >
              <option value="todos">Todos Setores</option>
              {sectorSpendData.list.map(s => (
                <option key={s.sector} value={s.sector}>{s.sector}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* REQUESTS LIST / CARDS */}
      <div className="space-y-4">
        {filteredList.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
            <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">
              Nenhuma solicitação encontrada nesta aba
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {activeTab === 'minha_vez'
                ? 'Parabéns! Não há pedidos pendentes aguardando sua aprovação neste momento.'
                : 'Não foram encontrados pedidos de compras correspondentes aos filtros selecionados.'}
            </p>
          </div>
        ) : (
          filteredList.map((req) => {
            const approvals = req.approvals;
            const currentStep = approvals?.currentApprover;
            const sectorColor = getSectorColor(req.sector);

            // Determine if current user can approve right now
            const isUserTurn = 
              currentApproverRole !== null && 
              currentStep === currentApproverRole && 
              req.purchaseStatus === 'em_aprovacao';

            // Or if Master can approve on behalf of current approver
            const canApprove = isUserTurn || (isMaster && req.purchaseStatus === 'em_aprovacao');
            const approverToAct = currentApproverRole || (currentStep as ApproverName) || 'Fernando';

            return (
              <div 
                key={req.id}
                className={`bg-white rounded-2xl border shadow-xs transition-all hover:shadow-md overflow-hidden ${
                  canApprove ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200'
                }`}
              >
                {/* Card Header */}
                <div className="p-4 sm:p-5 bg-slate-50/60 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-black bg-slate-900 text-amber-300 px-2.5 py-1 rounded-lg">
                      {req.code}
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${sectorColor.bg} ${sectorColor.text} ${sectorColor.border}`}>
                      {req.sector}
                    </span>
                    {req.project && (
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${getProjectColor(req.project).badge}`}>
                        {req.project}
                      </span>
                    )}
                    <span className="text-xs text-slate-500">
                      Solicitado em {formatDate(req.createdAt)} por <strong>{req.requesterName}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Current Step Badge */}
                    {currentStep === 'concluido' ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Aprovado 100% (3/3)
                      </span>
                    ) : currentStep === 'reprovado' || req.purchaseStatus === 'reprovado_aprovadores' ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Reprovado na Alçada
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" /> Na vez de: <strong>{currentStep}</strong>
                      </span>
                    )}

                    <button
                      onClick={() => onSelectRequest(req)}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver Pedido</span>
                    </button>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 sm:p-6 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1 max-w-2xl">
                      <h3 className="text-base font-bold text-slate-900">
                        {req.title}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {req.description}
                      </p>
                      <div className="text-xs text-slate-500 pt-1">
                        <strong>Justificativa da compra:</strong> {req.reason}
                      </div>
                    </div>

                    {/* Purchasing Financial Summary */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shrink-0 text-right space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Valor Total da Compra (Cotado)
                      </div>
                      <div className="text-2xl font-black text-slate-900">
                        {formatCurrency(req.totalPrice)}
                      </div>
                      <div className="text-xs text-slate-600 font-medium">
                        Fornecedor: <strong className="text-slate-800">{req.supplier || 'Não informado'}</strong>
                      </div>

                      {/* Prazo de Pagamento & Prazo de Entrega */}
                      {(req.paymentTerms || req.deliveryDeadline) && (
                        <div className="pt-1.5 border-t border-slate-200 space-y-0.5 text-[11px] text-slate-600">
                          {req.paymentTerms && (
                            <div className="flex items-center justify-end gap-1">
                              <CreditCard className="w-3 h-3 text-indigo-500" />
                              <span>Pagamento: <strong className="text-slate-800">{req.paymentTerms}</strong></span>
                            </div>
                          )}
                          {req.deliveryDeadline && (
                            <div className="flex items-center justify-end gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Entrega: <strong className="text-slate-800">{req.deliveryDeadline}</strong></span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Quantidade de orçamentos */}
                      {((req.quotes && req.quotes.length > 0) || (req.items && req.items.some(i => i.quotes && i.quotes.length > 0))) && (
                        <div className="pt-1">
                          <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200">
                            {req.quotes ? req.quotes.length : req.items?.reduce((acc, it) => acc + (it.quotes?.length || 0), 0)} orçamentos cotados
                          </span>
                        </div>
                      )}

                      {req.purchaseOrderNumber && (
                        <div className="text-[11px] text-slate-400 font-mono">
                          Ordem de Compra: {req.purchaseOrderNumber}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SEQUENTIAL APPROVAL PIPELINE (FERNANDO -> EDUARDO -> LUIZ) */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-purple-700" />
                      Aprovadores
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      
                      {/* Step 1: Fernando */}
                      <div className={`p-3 rounded-xl border ${
                        approvals?.fernando?.status === 'aprovado'
                          ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                          : approvals?.fernando?.status === 'reprovado'
                          ? 'bg-rose-50/70 border-rose-300 text-rose-900'
                          : currentStep === 'Fernando'
                          ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200 text-amber-950 font-medium'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}>
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span>1º Fernando</span>
                          {approvals?.fernando?.status === 'aprovado' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : approvals?.fernando?.status === 'reprovado' ? (
                            <XCircle className="w-4 h-4 text-rose-600" />
                          ) : currentStep === 'Fernando' ? (
                            <span className="text-[10px] bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded font-black">
                              SUA VEZ
                            </span>
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </div>
                        <div className="text-[11px] mt-1">
                          {approvals?.fernando?.status === 'aprovado' ? (
                            <div>
                              <div className="font-semibold text-emerald-800">Aprovado em {formatDateTime(approvals.fernando.approvedAt)}</div>
                              {approvals.fernando.notes && (
                                <div className="text-emerald-700 italic mt-0.5">"{approvals.fernando.notes}"</div>
                              )}
                            </div>
                          ) : approvals?.fernando?.status === 'reprovado' ? (
                            <div>
                              <div className="font-semibold text-rose-800">Reprovado em {formatDateTime(approvals.fernando.approvedAt)}</div>
                              <div className="text-rose-700 italic mt-0.5">"{approvals.fernando.notes}"</div>
                            </div>
                          ) : currentStep === 'Fernando' ? (
                            <span className="text-amber-800">Aguardando parecer inicial</span>
                          ) : (
                            <span>Aguardando</span>
                          )}
                        </div>
                      </div>

                      {/* Step 2: Eduardo */}
                      <div className={`p-3 rounded-xl border ${
                        approvals?.eduardo?.status === 'aprovado'
                          ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                          : approvals?.eduardo?.status === 'reprovado'
                          ? 'bg-rose-50/70 border-rose-300 text-rose-900'
                          : currentStep === 'Eduardo'
                          ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200 text-indigo-950 font-medium'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}>
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span>2º Eduardo</span>
                          {approvals?.eduardo?.status === 'aprovado' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : approvals?.eduardo?.status === 'reprovado' ? (
                            <XCircle className="w-4 h-4 text-rose-600" />
                          ) : currentStep === 'Eduardo' ? (
                            <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-black">
                              SUA VEZ
                            </span>
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </div>
                        <div className="text-[11px] mt-1">
                          {approvals?.eduardo?.status === 'aprovado' ? (
                            <div>
                              <div className="font-semibold text-emerald-800">Aprovado em {formatDateTime(approvals.eduardo.approvedAt)}</div>
                              {approvals.eduardo.notes && (
                                <div className="text-emerald-700 italic mt-0.5">"{approvals.eduardo.notes}"</div>
                              )}
                            </div>
                          ) : approvals?.eduardo?.status === 'reprovado' ? (
                            <div>
                              <div className="font-semibold text-rose-800">Reprovado em {formatDateTime(approvals.eduardo.approvedAt)}</div>
                              <div className="text-rose-700 italic mt-0.5">"{approvals.eduardo.notes}"</div>
                            </div>
                          ) : currentStep === 'Eduardo' ? (
                            <span className="text-indigo-800">Aguardando validação de fluxo/budget</span>
                          ) : (
                            <span className="text-slate-400 italic">Aguardando Fernando</span>
                          )}
                        </div>
                      </div>

                      {/* Step 3: Luiz */}
                      <div className={`p-3 rounded-xl border ${
                        approvals?.luiz?.status === 'aprovado'
                          ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                          : approvals?.luiz?.status === 'reprovado'
                          ? 'bg-rose-50/70 border-rose-300 text-rose-900'
                          : currentStep === 'Luiz'
                          ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-200 text-purple-950 font-medium'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}>
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span>3º Luiz</span>
                          {approvals?.luiz?.status === 'aprovado' ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : approvals?.luiz?.status === 'reprovado' ? (
                            <XCircle className="w-4 h-4 text-rose-600" />
                          ) : currentStep === 'Luiz' ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-ping" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </div>
                        <div className="text-[11px] mt-1">
                          {approvals?.luiz?.status === 'aprovado' ? (
                            <div>
                              <div className="font-semibold text-emerald-800">Aprovado em {formatDateTime(approvals.luiz.approvedAt)}</div>
                              {approvals.luiz.notes && (
                                <div className="text-emerald-700 italic mt-0.5">"{approvals.luiz.notes}"</div>
                              )}
                            </div>
                          ) : approvals?.luiz?.status === 'reprovado' ? (
                            <div>
                              <div className="font-semibold text-rose-800">Reprovado em {formatDateTime(approvals.luiz.approvedAt)}</div>
                              <div className="text-rose-700 italic mt-0.5">"{approvals.luiz.notes}"</div>
                            </div>
                          ) : currentStep === 'Luiz' ? (
                            <span className="text-purple-800">Aguardando aprovação final da diretoria</span>
                          ) : (
                            <span className="text-slate-400 italic">Aguardando Eduardo</span>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* APPROVER ACTION CONTROLS */}
                  {canApprove && (
                    <div className="p-4 bg-amber-50/70 border border-amber-300 rounded-xl space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-950 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          Ação Necessária: Este pedido aguarda a decisão de <strong>{currentStep}</strong>
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          Parecer ou nota técnica (opcional para aprovar, obrigatório para reprovar)
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-2">
                        <input
                          type="text"
                          value={actionNotes[req.id] || ''}
                          onChange={(e) => setActionNotes({ ...actionNotes, [req.id]: e.target.value })}
                          placeholder={`Observações de ${approverToAct} (ex: Cotação e condições aprovadas / Verba autorizada)...`}
                          className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-purple-500 outline-hidden"
                        />

                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                          <button
                            onClick={() => handleApprove(req, approverToAct)}
                            className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            {currentStep === 'Luiz' 
                              ? 'Aprovar (100%)' 
                              : `Aprovar como ${approverToAct}`}
                          </button>

                          <button
                            onClick={() => handleOpenRejection(req)}
                            className="px-3 py-2 bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <XCircle className="w-4 h-4" />
                            Reprovar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {!canApprove && req.purchaseStatus === 'em_aprovacao' && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-slate-400" />
                        <span>
                          {currentStep === 'Fernando' && 'Aguardando aprovação inicial do 1º Aprovador (Fernando).'}
                          {currentStep === 'Eduardo' && 'Aprovado por Fernando. Aguardando análise orçamentária de Eduardo (2º Aprovador).'}
                          {currentStep === 'Luiz' && 'Aprovado por Fernando e Eduardo. Aguardando aprovação final de Luiz (3º Aprovador).'}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                        Ordem Rigorosa Ativa
                      </span>
                    </div>
                  )}

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* REJECTION REASON MODAL */}
      {rejectionModalReq && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Reprovar Pedido de Compra {rejectionModalReq.code}
                </h3>
                <p className="text-xs text-slate-500">
                  A reprovação interrompe a esteira e notifica o Setor de Compras.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Justificativa Obrigatória da Reprovação <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Informe o motivo da recusa (ex: Preço acima do teto estipulado, aguardar novo orçamento, verba remanejada)..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-rose-500 outline-hidden resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectionModalReq(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!rejectionReason.trim()}
                onClick={handleConfirmRejection}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                Confirmar Reprovação
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
