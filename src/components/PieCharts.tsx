import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MonthlySummaryItem } from '../types/index.js';

interface PieChartSectionProps {
  data: MonthlySummaryItem[];
}

const PIE_COLORS = [
  '#2563eb', // Blue
  '#059669', // Emerald
  '#d97706', // Amber
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#0891b2', // Cyan
  '#ea580c', // Orange
  '#4f46e5', // Indigo
  '#0d9488', // Teal
  '#dc2626', // Red
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

interface PieDatum {
  name: string;
  value: number;
  color: string;
}

function formatCurrency(value: number): string {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function buildTooltip(payload: any[]) {
  const entry = payload[0];
  const total = payload.reduce((s: number, p: any) => s + Number(p.value || 0), 0);
  const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0.0';
  return (
    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-lg text-xs space-y-1 min-w-[180px]">
      <p className="font-bold text-slate-700 flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
          style={{ backgroundColor: entry.payload.color }}
        />
        {entry.name}
      </p>
      <p className="font-mono text-slate-600">{formatCurrency(entry.value)}</p>
      <p className="text-slate-400 font-mono">{pct}% do total</p>
    </div>
  );
}

function renderPie(data: PieDatum[], customTooltip: any) {
  if (data.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-slate-400 text-xs">
        Sem dados para este período.
      </div>
    );
  }
  // Altura automática: crece con la cantidad de items (leyenda) sin cubrir el gráfico
  const autoHeight = Math.max(192, data.length * 22 + 160);
  return (
    <div style={{ height: `${autoHeight}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={40}
            outerRadius={64}
            paddingAngle={2}
            stroke="#ffffff"
            strokeWidth={2}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={customTooltip} />
          <Legend
            verticalAlign="bottom"
            layout="horizontal"
            wrapperStyle={{ fontSize: 10, fontFamily: 'monospace', paddingTop: 4 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- Pizza por Banco ---
export const PieChartByBank: React.FC<PieChartSectionProps> = ({ data }) => {
  const bankTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    data.forEach((item) => {
      if (item.byBank) {
        Object.entries(item.byBank).forEach(([bank, val]) => {
          totals[bank] = (totals[bank] || 0) + Number(val || 0);
        });
      } else if (item.byCard) {
        // Fallback: derivar bancos a partir dos cartões (prefixo antes de " •••• ")
        Object.entries(item.byCard).forEach(([cardKey, val]) => {
          const bank = cardKey.split(' •••• ')[0];
          totals[bank] = (totals[bank] || 0) + Number(val || 0);
        });
      }
    });
    return totals;
  }, [data]);

  const bankData: PieDatum[] = useMemo(
    () =>
      Object.entries(bankTotals)
        .map(([name, value]) => ({
          name,
          value: Math.round(value * 100) / 100,
          color: BANK_BRAND_COLORS[name] || PIE_COLORS[Math.abs(name.length) % PIE_COLORS.length],
        }))
        .filter((d) => d.value !== 0)
        .sort((a, b) => b.value - a.value),
    [bankTotals]
  );

  const CustomTooltip = ({ active, payload }: any) =>
    active && payload && payload.length > 0 ? buildTooltip(payload) : null;

  return renderPie(bankData, CustomTooltip);
};

// --- Pizza por Cartão ---
export const PieChartByCard: React.FC<PieChartSectionProps> = ({ data }) => {
  const cardTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    data.forEach((item) => {
      if (item.byCard) {
        Object.entries(item.byCard).forEach(([cardKey, val]) => {
          totals[cardKey] = (totals[cardKey] || 0) + Number(val || 0);
        });
      }
    });
    return totals;
  }, [data]);

  const cardData: PieDatum[] = useMemo(
    () =>
      Object.entries(cardTotals)
        .map(([name, value], idx) => ({
          name,
          value: Math.round(value * 100) / 100,
          color: PIE_COLORS[idx % PIE_COLORS.length],
        }))
        .filter((d) => d.value !== 0)
        .sort((a, b) => b.value - a.value),
    [cardTotals]
  );

  const CustomTooltip = ({ active, payload }: any) =>
    active && payload && payload.length > 0 ? buildTooltip(payload) : null;

  return renderPie(cardData, CustomTooltip);
};