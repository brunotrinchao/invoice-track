import React, { useState, useRef, useEffect } from 'react';
import { CalendarRange, X, ChevronDown, Check } from 'lucide-react';

interface DateRangePickerProps {
  valueFrom: string | null; // YYYY-MM
  valueTo: string | null; // YYYY-MM
  onChange: (from: string | null, to: string | null) => void;
}

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

function formatMonthYearLabel(monthYear: string | null): string {
  if (!monthYear || !/^\d{4}-\d{2}$/.test(monthYear)) return '';
  const [y, m] = monthYear.split('-');
  const monthIdx = parseInt(m, 10) - 1;
  const monthName = MONTH_NAMES[monthIdx] || m;
  return `${monthName}/${y}`;
}

function getCurrentMonth(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function addMonths(monthStr: string, offset: number): string {
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(y, m - 1 + offset, 1);
  const resY = d.getFullYear();
  const resM = String(d.getMonth() + 1).padStart(2, '0');
  return `${resY}-${resM}`;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  valueFrom,
  valueTo,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fechar popover ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentMonth = getCurrentMonth();
  const currentYear = new Date().getFullYear();

  const handlePreset = (from: string, to: string) => {
    onChange(from, to);
    setIsOpen(false);
  };

  // Rótulo dinâmico do botão principal
  const getDisplayText = () => {
    if (valueFrom && valueTo) {
      if (valueFrom === valueTo) return formatMonthYearLabel(valueFrom);
      return `${formatMonthYearLabel(valueFrom)} — ${formatMonthYearLabel(valueTo)}`;
    }
    if (valueFrom) return `A partir de ${formatMonthYearLabel(valueFrom)}`;
    if (valueTo) return `Até ${formatMonthYearLabel(valueTo)}`;
    return 'Todos os Meses';
  };

  const handleFromChange = (newFrom: string | null) => {
    if (newFrom && valueTo && newFrom > valueTo) {
      onChange(newFrom, newFrom);
    } else {
      onChange(newFrom, valueTo);
    }
  };

  const handleToChange = (newTo: string | null) => {
    if (newTo && valueFrom && newTo < valueFrom) {
      onChange(newTo, newTo);
    } else {
      onChange(valueFrom, newTo);
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block w-full">
      {/* Botão Gatilho */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer shadow-sm"
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarRange className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="truncate">{getDisplayText()}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover de Seleção Estrita de Meses */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 p-4 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Filtrar por Mês / Ano</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Atalhos Rápidos por Mês */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Atalhos Rápido</span>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => handlePreset(currentMonth, currentMonth)}
                className="px-2.5 py-1.5 text-left rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium transition-colors cursor-pointer"
              >
                Este Mês
              </button>
              <button
                type="button"
                onClick={() => handlePreset(addMonths(currentMonth, -2), currentMonth)}
                className="px-2.5 py-1.5 text-left rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium transition-colors cursor-pointer"
              >
                Últimos 3 Meses
              </button>
              <button
                type="button"
                onClick={() => handlePreset(addMonths(currentMonth, -5), currentMonth)}
                className="px-2.5 py-1.5 text-left rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium transition-colors cursor-pointer"
              >
                Últimos 6 Meses
              </button>
              <button
                type="button"
                onClick={() => handlePreset(currentMonth, addMonths(currentMonth, 5))}
                className="px-2.5 py-1.5 text-left rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium transition-colors cursor-pointer"
              >
                Próximos 6 Meses
              </button>
              <button
                type="button"
                onClick={() => handlePreset(currentMonth, addMonths(currentMonth, 11))}
                className="px-2.5 py-1.5 text-left rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium transition-colors cursor-pointer"
              >
                Próximos 12 Meses
              </button>
              <button
                type="button"
                onClick={() => handlePreset(`${currentYear}-01`, `${currentYear}-12`)}
                className="px-2.5 py-1.5 text-left rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium transition-colors cursor-pointer"
              >
                Este Ano ({currentYear})
              </button>
            </div>
          </div>

          {/* Seleção Customizada Apenas Meses (HTML5 input type="month") */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Intervalo de Meses</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Mês Inicial (De)</label>
                <input
                  type="month"
                  value={valueFrom || ''}
                  max={valueTo || undefined}
                  onChange={(e) => handleFromChange(e.target.value || null)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl px-2.5 py-2 font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-colors cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Mês Final (Até)</label>
                <input
                  type="month"
                  value={valueTo || ''}
                  min={valueFrom || undefined}
                  onChange={(e) => handleToChange(e.target.value || null)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl px-2.5 py-2 font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-colors cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                onChange(null, null);
                setIsOpen(false);
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Limpar Filtro
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};