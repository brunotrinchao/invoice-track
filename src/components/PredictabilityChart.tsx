import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { MonthlySummaryItem } from '../types/index.js';
import { Layers, CreditCard, Landmark } from 'lucide-react';

interface PredictabilityChartProps {
  data: MonthlySummaryItem[];
}

const CARD_COLORS = [
  '#2563eb', // Blue
  '#059669', // Emerald
  '#d97706', // Amber
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#0891b2', // Cyan
  '#ea580c', // Orange
  '#4f46e5', // Indigo
  '#0d9488', // Teal
];

const BANK_BRAND_COLORS: Record<string, string> = {
  'Mercado Pago': '#00b1ea',
  'Nubank': '#8a05be',
  'Itaú': '#ff6200',
  'Bradesco': '#cc092f',
  'Santander': '#ec0000',
  'Banco Inter': '#ff7a00',
  'C6 Bank': '#38bdf8',
  'XP Bank': '#e8a317',
  'PicPay': '#11c76f',
  'BTG Pactual': '#2563eb',
};

export const PredictabilityChart: React.FC<PredictabilityChartProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<'total' | 'byCard' | 'byBank'>('byCard');

  const safeData = data || [];

  // Coletar todas as chaves únicas de cartões na série temporal
  const cardKeys = Array.from(
    new Set(safeData.flatMap((d) => Object.keys(d?.byCard || {})))
  );

  // Coletar todas as chaves únicas de bancos na série temporal
  const bankKeys = Array.from(
    new Set(
      safeData.flatMap((d) => {
        if (!d) return [];
        if (d.byBank && Object.keys(d.byBank).length > 0) {
          return Object.keys(d.byBank);
        }
        return Object.keys(d.byCard || {}).map((k) => k.split(' •••• ')[0]);
      })
    )
  );

  // Formatar meses para exibição ex: "2026-09" -> "Set/26"
  const formattedData = safeData.map((item) => {
    if (!item || !item.monthYear || typeof item.monthYear !== 'string') {
      return {
        ...item,
        label: 'N/A',
        total: 0,
        monthYear: 'N/A',
      };
    }

    const parts = item.monthYear.split('-');
    const year = parts[0] || '2026';
    const month = parts[1] || '01';
    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    const monthIndex = Math.max(0, parseInt(month, 10) - 1);
    const label = `${monthNames[monthIndex] || month}/${year.slice(-2)}`;

    const cardValues: Record<string, number> = {};
    cardKeys.forEach((key) => {
      cardValues[key] = item.byCard?.[key] ? Math.round(item.byCard[key] * 100) / 100 : 0;
    });

    const bankValues: Record<string, number> = {};
    bankKeys.forEach((bank) => {
      if (item.byBank && item.byBank[bank] !== undefined) {
        bankValues[bank] = Math.round(item.byBank[bank] * 100) / 100;
      } else if (item.byCard) {
        let sum = 0;
        Object.entries(item.byCard).forEach(([cKey, val]) => {
          if (cKey.startsWith(bank)) {
            sum += Number(val || 0);
          }
        });
        bankValues[bank] = Math.round(sum * 100) / 100;
      } else {
        bankValues[bank] = 0;
      }
    });

    return {
      ...item,
      label,
      totalFormatted: item.total || 0,
      purchasesTotalFormatted: item.purchasesTotal || 0,
      feesTotalFormatted: item.feesTotal || 0,
      creditsTotalFormatted: item.creditsTotal || 0,
      ...cardValues,
      ...bankValues,
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const currentItem = payload[0]?.payload || {};
      const totalVal = Number(currentItem.total ?? currentItem.totalFormatted ?? 0);
      const activeItems = payload.filter(
        (p: any) => typeof p.value === 'number' && p.value !== 0
      );

      return (
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-lg text-xs space-y-2.5 font-sans min-w-[220px]">
          <p className="font-bold text-slate-700 flex items-center justify-between gap-4 border-b border-slate-100 pb-2">
            <span>{currentItem.label || ''}</span>
            <span className="font-mono text-slate-400 font-normal">({currentItem.monthYear || ''})</span>
          </p>

          {viewMode !== 'total' && activeItems.length > 0 && (
            <div className="space-y-1.5 py-0.5">
              {activeItems.map((entry: any, index: number) => (
                <div key={index} className="flex items-center justify-between gap-4 text-slate-600">
                  <div className="flex items-center gap-2 truncate max-w-[180px]">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                      style={{ backgroundColor: entry.color || entry.stroke || '#3b82f6' }}
                    />
                    <span className="truncate text-slate-600">{entry.name || 'Item'}</span>
                  </div>
                  <span className="font-mono text-slate-700 font-medium">
                    R$ {Number(entry.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-6 text-emerald-600 font-extrabold font-mono text-sm pt-2 border-t border-slate-100">
            <span>Valor Total:</span>
            <span>R$ {totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Seletor de Modo de Visualização do Gráfico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <span className="text-xs text-slate-500 font-medium">
          Modo de Exibição do Gráfico:
        </span>
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            onClick={() => setViewMode('byCard')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              viewMode === 'byCard'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Curva por Cartão ({cardKeys.length})
          </button>

          <button
            onClick={() => setViewMode('byBank')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              viewMode === 'byBank'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            Curva por Banco ({bankKeys.length})
          </button>

          <button
            onClick={() => setViewMode('total')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              viewMode === 'total'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Total Consolidado
          </button>
        </div>
      </div>

      {/* Áreas / Linhas do Gráfico */}
      <div className="w-full h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'byCard' ? (
            <LineChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `R$ ${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 15, fontSize: 11, fontFamily: 'monospace' }}
              />
              {cardKeys.map((cardKey, idx) => {
                const color = CARD_COLORS[idx % CARD_COLORS.length];
                return (
                  <Line
                    key={cardKey}
                    type="monotone"
                    dataKey={cardKey}
                    name={cardKey}
                    stroke={color}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: color }}
                    activeDot={{ r: 6 }}
                  />
                );
              })}
            </LineChart>
          ) : viewMode === 'byBank' ? (
            <LineChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `R$ ${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 15, fontSize: 11, fontFamily: 'monospace' }}
              />
              {bankKeys.map((bankKey, idx) => {
                const color = BANK_BRAND_COLORS[bankKey] || CARD_COLORS[idx % CARD_COLORS.length];
                return (
                  <Line
                    key={bankKey}
                    type="monotone"
                    dataKey={bankKey}
                    name={bankKey}
                    stroke={color}
                    strokeWidth={3}
                    dot={{ r: 4, fill: color }}
                    activeDot={{ r: 7 }}
                  />
                );
              })}
            </LineChart>
          ) : (
            <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `R$ ${val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="total"
                name="Total Consolidado"
                stroke="#3b82f6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorTotal)"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};