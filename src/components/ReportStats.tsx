import React from 'react';
import {
  Calendar,
  TrendingUp,
  Wallet,
  Zap,
  Percent,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  Info,
} from 'lucide-react';
import { PredictabilityReportData, Card } from '../types/index.js';

interface ReportStatsProps {
  reportData: PredictabilityReportData | null;
  loading: boolean;
  cardsCount: number;
  selectedCardsCount: number;
}

export const ReportStats: React.FC<ReportStatsProps> = ({
  reportData,
  loading,
  cardsCount,
  selectedCardsCount,
}) => {
  if (loading && !reportData) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 bg-slate-200/70 rounded-3xl" />
        ))}
      </div>
    );
  }

  if (!reportData) return null;

  const { metrics, monthlySummary } = reportData;

  // Cálculo de indicadores financeiros adicionais
  const totalFeesInPeriod = monthlySummary.reduce((sum, item) => sum + (item.feesTotal || 0), 0);
  const totalInvoicesInPeriod = monthlySummary.reduce((sum, item) => sum + (item.invoiceCount || 0), 0);
  const totalPurchasesInPeriod = monthlySummary.reduce((sum, item) => sum + (item.purchasesTotal || 0), 0);

  // Variação % entre Mês Atual e Próximo Mês
  let diffPercent = 0;
  if (metrics.currentMonthTotal > 0) {
    diffPercent = ((metrics.nextMonthTotal - metrics.currentMonthTotal) / metrics.currentMonthTotal) * 100;
  }

  // Nome formatado do mês atual (ex: "Agosto / 2026")
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const currentMonthSummary = monthlySummary.find((m) => m.monthYear === currentMonthStr);

  return (
    <div className="space-y-4">
      {/* Rótulo Executivo PM/Financeiro */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          Indicadores Financeiros Executivos
        </h3>
        <span className="text-[11px] font-semibold text-slate-400">
          Base: {selectedCardsCount > 0 ? `${selectedCardsCount} cartão(ões) filtrado(s)` : `Todos os cartões (${cardsCount})`}
        </span>
      </div>

      {/* Grid de KPIs (6 Cards Financeiros de Alta Precisão) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* KPI 1: Fatura Mês Atual */}
        <div className="glass-card p-5 rounded-3xl border border-slate-200/80 bg-white/80 hover:shadow-lg transition-all duration-300 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                Mês Atual
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-500 block mb-1">Total Mês Atual</span>
            <div className="text-xl font-mono font-black text-slate-900 tracking-tight">
              R$ {metrics.currentMonthTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Compras: R$ {(currentMonthSummary?.purchasesTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* KPI 2: Projeção Mês Seguinte */}
        <div className="glass-card p-5 rounded-3xl border border-slate-200/80 bg-white/80 hover:shadow-lg transition-all duration-300 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-colors" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-cyan-50 text-cyan-600 rounded-2xl border border-cyan-100">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-100">
                Próximo Mês
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-500 block mb-1">Projeção Mês Seguinte</span>
            <div className="text-xl font-mono font-black text-cyan-700 tracking-tight">
              R$ {metrics.nextMonthTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Var. Mensal:</span>
            <span
              className={`font-bold flex items-center gap-0.5 ${
                diffPercent > 0
                  ? 'text-rose-600'
                  : diffPercent < 0
                  ? 'text-emerald-600'
                  : 'text-slate-500'
              }`}
            >
              {diffPercent > 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : diffPercent < 0 ? (
                <ArrowDownRight className="w-3.5 h-3.5" />
              ) : (
                <Minus className="w-3.5 h-3.5" />
              )}
              {Math.abs(diffPercent).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* KPI 3: Comprometimento Futuro */}
        <div className="glass-card p-5 rounded-3xl border border-slate-200/80 bg-white/80 hover:shadow-lg transition-all duration-300 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                Futuro
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-500 block mb-1">Comprometido Futuro</span>
            <div className="text-xl font-mono font-black text-indigo-700 tracking-tight">
              R$ {metrics.totalCommittedFuture.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Parcelamentos ativos</span>
          </div>
        </div>

        {/* KPI 4: Média Mensal Estimada */}
        <div className="glass-card p-5 rounded-3xl border border-slate-200/80 bg-white/80 hover:shadow-lg transition-all duration-300 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                Média
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-500 block mb-1">Média Mensal Estimada</span>
            <div className="text-xl font-mono font-black text-emerald-700 tracking-tight">
              R$ {metrics.averageMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Com base no período</span>
          </div>
        </div>

        {/* KPI 5: Encargos & Taxas no Período */}
        <div className="glass-card p-5 rounded-3xl border border-slate-200/80 bg-white/80 hover:shadow-lg transition-all duration-300 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
                <Percent className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                Encargos
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-500 block mb-1">Taxas & Impostos</span>
            <div className="text-xl font-mono font-black text-amber-700 tracking-tight">
              R$ {totalFeesInPeriod.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Juros, IOF, Tarifas</span>
          </div>
        </div>

        {/* KPI 6: Volume de Faturas & Cartões */}
        <div className="glass-card p-5 rounded-3xl border border-slate-200/80 bg-white/80 hover:shadow-lg transition-all duration-300 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors" />
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100">
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                Volume
              </span>
            </div>
            <span className="text-xs font-semibold text-slate-500 block mb-1">Faturas / Cartões</span>
            <div className="text-xl font-mono font-black text-purple-900 tracking-tight flex items-baseline gap-1.5">
              <span>{totalInvoicesInPeriod}</span>
              <span className="text-xs font-normal text-slate-500">faturas</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>{cardsCount} cartões no total</span>
          </div>
        </div>
      </div>
    </div>
  );
};
