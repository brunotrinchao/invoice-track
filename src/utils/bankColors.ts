// Colores predefinidos por banco: gradiente Tailwind (tarjeta) + hex (charts/pizzas).
// Fuente única de verdad en el frontend; el server guarda `colorGradient` en la DB
// con los mismos gradientes (ver server/services/financialEngine.ts).

export interface BankColor {
  gradient: string;
  hex: string;
}

export const BANK_COLORS: Record<string, BankColor> = {
  'Mercado Pago': { gradient: 'from-sky-500 via-cyan-600 to-slate-900', hex: '#00b1ea' },
  Nubank: { gradient: 'from-purple-700 via-purple-900 to-slate-900', hex: '#8a05be' },
  'Itaú': { gradient: 'from-orange-600 via-amber-700 to-slate-900', hex: '#ff6200' },
  Bradesco: { gradient: 'from-red-600 via-rose-800 to-slate-900', hex: '#cc092f' },
  Santander: { gradient: 'from-red-700 via-red-950 to-slate-900', hex: '#ec0000' },
  'Banco Inter': { gradient: 'from-amber-500 via-orange-600 to-slate-900', hex: '#ff7a00' },
  'C6 Bank': { gradient: 'from-gray-700 via-slate-800 to-black', hex: '#38bdf8' },
  'XP Bank': { gradient: 'from-zinc-800 via-slate-900 to-black', hex: '#e8a317' },
  'BTG Pactual': { gradient: 'from-blue-800 via-indigo-950 to-black', hex: '#2563eb' },
  PicPay: { gradient: 'from-emerald-700 via-teal-900 to-slate-900', hex: '#11c76f' },
};

export const DEFAULT_BANK_COLOR: BankColor = {
  gradient: 'from-blue-600 via-slate-800 to-slate-900',
  hex: '#2563eb',
};

export function getBankColor(bankName: string): BankColor {
  return BANK_COLORS[bankName] || DEFAULT_BANK_COLOR;
}