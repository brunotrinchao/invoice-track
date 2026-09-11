import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { MonthlySummaryItem } from '../types/index.js';
import { BarChart3, Landmark } from 'lucide-react';
import { getBankColor } from '../utils/bankColors.js';

interface BankBarChartProps {
  data: MonthlySummaryItem[];
}

export const BankBarChart: React.FC<BankBarChartProps> = ({ data }) => {
  // Consolidar total de cada banco acumulado no período filtrado
  const chartData = useMemo(() => {
    const totals: Record<string, number> = {};

    data.forEach((item) => {
      if (item.byBank && Object.keys(item.byBank).length > 0) {
        Object.entries(item.byBank).forEach(([bank, val]) => {
          totals[bank] = (totals[bank] || 0) + Number(val || 0);
        });
      } else if (item.byCard && Object.keys(item.byCard).length > 0) {
        Object.entries(item.byCard).forEach(([cardKey, val]) => {
          const bank = cardKey.split(' •••• ')[0] || 'Outros';
          totals[bank] = (totals[bank] || 0) + Number(val || 0);
        });
      }
    });

    return Object.entries(totals)
      .map(([bankName, total]) => ({
        bankName,
        total: Math.round(total * 100) / 100,
        color: getBankColor(bankName).hex,
      }))
      .filter((b) => b.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [data]);

  const grandTotal = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.total, 0);
  }, [chartData]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="glass-card p-6 sm:p-8 rounded-3xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Total Faturado por Banco</h3>
            <p className="text-xs text-slate-500">Consolidado das faturas acumuladas por instituição financeira</p>
          </div>
        </div>
        <div className="h-48 flex items-center justify-center text-slate-400 text-xs font-medium">
          Nenhum dado de banco encontrado para o período/cartões selecionados.
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 sm:p-8 rounded-3xl space-y-6">
      {/* Header do Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 rounded-2xl border border-blue-100 shadow-sm">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              Total Faturado por Banco
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                {chartData.length} {chartData.length === 1 ? 'banco' : 'bancos'}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Soma total consolidada das faturas por instituição no período filtrado
            </p>
          </div>
        </div>

        {/* Badge com Total Acumulado */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-2 flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs text-slate-500 font-semibold">Total no Período:</span>
          <span className="text-sm font-mono font-black text-slate-900">
            R$ {grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Gráfico de Barras por Banco */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="bankName"
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }}
              dy={10}
            />
            <YAxis
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              tickFormatter={(val) =>
                val >= 1000 ? `R$ ${(val / 1000).toFixed(0)}k` : `R$ ${val}`
              }
              tick={{ fontSize: 11, fill: '#64748b' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="total" radius={[10, 10, 0, 0]} maxBarSize={64}>
              {chartData.map((entry) => (
                <Cell key={`cell-${entry.bankName}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda de Bancos com Valores */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
        {chartData.map((item) => {
          const percent = grandTotal > 0 ? (item.total / grandTotal) * 100 : 0;
          return (
            <div
              key={item.bankName}
              className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/60 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs font-bold text-slate-800 truncate">{item.bankName}</span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs font-mono font-bold text-slate-900 block">
                  R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">{percent.toFixed(1)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-xl border border-slate-800 text-xs backdrop-blur-md">
        <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-slate-800">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: data.color }}
          />
          <span className="font-bold text-slate-100">{data.bankName}</span>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-center gap-4 text-slate-300">
            <span>Total Acumulado:</span>
            <span className="font-mono font-bold text-white">
              R$ {data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};
