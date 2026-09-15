import React, { useMemo } from 'react';
import { PurchaseRequest, SectorType } from '../types';
import { formatCurrency, getSectorColor } from '../utils';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  ShoppingBag, 
  CheckCircle2,
  PieChart
} from 'lucide-react';

interface MonthlySpendChartProps {
  requests: PurchaseRequest[];
  targetSector?: SectorType | 'Todos';
}

export const MonthlySpendChart: React.FC<MonthlySpendChartProps> = ({
  requests,
  targetSector,
}) => {
  // Filter requests that have actual purchase value filled by Compras
  const filteredRequests = useMemo(() => {
    if (!targetSector || targetSector === 'Todos') {
      return requests;
    }
    return requests.filter(r => r.sector === targetSector);
  }, [requests, targetSector]);

  // Aggregate monthly spending
  const monthlyData = useMemo(() => {
    const monthNames: Record<string, string> = {
      '01': 'Jan',
      '02': 'Fev',
      '03': 'Mar',
      '04': 'Abr',
      '05': 'Mai',
      '06': 'Jun',
      '07': 'Jul',
      '08': 'Ago',
      '09': 'Set',
      '10': 'Out',
      '11': 'Nov',
      '12': 'Dez',
    };

    const map: Record<string, { key: string; label: string; total: number; count: number }> = {};

    // Populate recent 6 months minimum
    const now = new Date(2026, 8, 15); // Sept 2026 context
    for (let i = 4; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${yyyy}-${mm}`;
      const label = `${monthNames[mm]}/${String(yyyy).slice(2)}`;
      map[key] = { key, label, total: 0, count: 0 };
    }

    filteredRequests.forEach(r => {
      // Use purchaseDate or createdAt
      const dateStr = r.purchaseDate || r.createdAt;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${yyyy}-${mm}`;

      if (r.totalPrice && r.totalPrice > 0) {
        if (!map[key]) {
          map[key] = { key, label: `${monthNames[mm] || mm}/${String(yyyy).slice(2)}`, total: 0, count: 0 };
        }
        map[key].total += r.totalPrice;
        map[key].count += 1;
      }
    });

    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
  }, [filteredRequests]);

  const maxTotal = useMemo(() => {
    const max = Math.max(...monthlyData.map(m => m.total), 1);
    return max;
  }, [monthlyData]);

  // Overall metrics
  const totalSpent = useMemo(() => {
    return filteredRequests.reduce((acc, r) => acc + (r.totalPrice || 0), 0);
  }, [filteredRequests]);

  const completedPurchases = useMemo(() => {
    return filteredRequests.filter(r => r.totalPrice && r.totalPrice > 0).length;
  }, [filteredRequests]);

  const inProgressPurchases = useMemo(() => {
    return filteredRequests.filter(
      r => r.purchaseStatus !== 'entregue' && r.purchaseStatus !== 'compra_realizada' && r.purchaseStatus !== 'cancelado'
    ).length;
  }, [filteredRequests]);

  const averageTicket = completedPurchases > 0 ? totalSpent / completedPurchases : 0;

  // Breakdown by Sector (if viewing multiple sectors / Compras)
  const sectorBreakdown = useMemo(() => {
    const map: Record<string, { sector: SectorType; total: number; count: number }> = {};
    filteredRequests.forEach(r => {
      if (r.totalPrice && r.totalPrice > 0) {
        if (!map[r.sector]) {
          map[r.sector] = { sector: r.sector, total: 0, count: 0 };
        }
        map[r.sector].total += r.totalPrice;
        map[r.sector].count += 1;
      }
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredRequests]);

  return (
    <div className="space-y-6">
      
      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Gasto */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Gasto Registrado
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {formatCurrency(totalSpent)}
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Valores confirmados pelo Setor de Compras</span>
          </p>
        </div>

        {/* Compras Realizadas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pedidos Faturados
            </span>
            <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {completedPurchases}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Itens com pedido emitido ou entregue
          </p>
        </div>

        {/* Em Andamento / Cotação */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Em Cotação / Andamento
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {inProgressPurchases}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Aguardando finalização do processo de compra
          </p>
        </div>

        {/* Ticket Médio */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Ticket Médio por Pedido
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {formatCurrency(averageTicket)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Média de investimento por solicitação
          </p>
        </div>

      </div>

      {/* Visual Chart Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Evolução dos Gastos Mensais
              {targetSector && targetSector !== 'Todos' && (
                <span className="text-xs font-normal text-slate-500">
                  (Setor {targetSector})
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500">
              Acompanhamento histórico dos valores de compras faturados mês a mês
            </p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2.5 py-1 rounded-full">
            Ano Corrente: 2026
          </span>
        </div>

        {/* SVG Bar Chart with Values */}
        <div className="pt-6 pb-2">
          <div className="grid grid-cols-5 gap-2 sm:gap-6 items-end h-56 max-w-2xl mx-auto px-2">
            {monthlyData.map((item) => {
              const heightPercent = maxTotal > 0 ? Math.max((item.total / maxTotal) * 100, 6) : 6;
              const hasSpend = item.total > 0;

              return (
                <div key={item.key} className="flex flex-col items-center h-full justify-end group">
                  {/* Amount label above bar */}
                  <span className={`text-[10px] sm:text-xs font-bold mb-2 transition-all ${
                    hasSpend ? 'text-indigo-900 font-bold' : 'text-slate-400'
                  }`}>
                    {hasSpend ? formatCurrency(item.total).replace(',00', '') : 'R$ 0'}
                  </span>

                  {/* The Bar */}
                  <div className="w-full max-w-[48px] bg-slate-100 rounded-t-lg overflow-hidden flex items-end h-40">
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-lg transition-all duration-500 ease-out group-hover:brightness-95 ${
                        hasSpend
                          ? 'bg-gradient-to-t from-indigo-600 to-indigo-500'
                          : 'bg-slate-200'
                      }`}
                    />
                  </div>

                  {/* Month Label */}
                  <span className="text-xs font-semibold text-slate-700 mt-2">
                    {item.label}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {item.count} {item.count === 1 ? 'pedido' : 'pedidos'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Sector Distribution Table (Especially powerful for Compras or multi-sector review) */}
      {(!targetSector || targetSector === 'Todos') && sectorBreakdown.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-indigo-600" />
                Detalhamento de Gastos por Setor
              </h3>
              <p className="text-xs text-slate-500">
                Distribuição percentual dos recursos corporativos aplicados
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {sectorBreakdown.map((item) => {
              const sectorColor = getSectorColor(item.sector);
              const percentage = totalSpent > 0 ? (item.total / totalSpent) * 100 : 0;

              return (
                <div key={item.sector} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${sectorColor.badge}`}>
                      {item.sector}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {item.count} {item.count === 1 ? 'pedido realizado' : 'pedidos realizados'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Visual Progress Bar */}
                    <div className="w-32 bg-slate-100 rounded-full h-2 hidden sm:block overflow-hidden">
                      <div
                        className={`h-full ${sectorColor.tag}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <div className="text-right min-w-28">
                      <div className="text-sm font-bold text-slate-900">
                        {formatCurrency(item.total)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {percentage.toFixed(1)}% do total
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
