import React from 'react';
import { Card } from '../types/index.js';
import { CreditCard as CardIcon, Check } from 'lucide-react';
import { getBankColor } from '../utils/bankColors.js';

interface CreditCardWidgetProps {
  card: Card;
  isSelected?: boolean;
  onToggleSelect?: (cardId: string) => void;
  onDelete?: (cardId: string) => void;
}

export const CreditCardWidget: React.FC<CreditCardWidgetProps> = ({
  card,
  isSelected = true,
  onToggleSelect,
  onDelete,
}) => {
  // Color predefinido por banco (fuente única en el frontend); fallback al gradiente guardado en DB
  const bankColor = getBankColor(card.bankName);
  const gradientClass = bankColor.gradient;

  return (
    <div
      onClick={() => onToggleSelect && onToggleSelect(card.id)}
      className={`relative group cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
    >
      <div
        className={`w-full aspect-[1.586/1] rounded-3xl bg-gradient-to-tr ${gradientClass} p-6 shadow-sm border border-white/20 flex flex-col justify-between overflow-hidden`}
      >
        {/* Marca d'água no fundo */}
        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />

        {/* Topo: Banco & Checkbox de Seleção */}
        <div className="flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <CardIcon className="w-5 h-5 text-white/80" />
            <span className="font-extrabold tracking-wider text-white text-base uppercase drop-shadow-sm">
              {card.bankName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onToggleSelect && (
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                  isSelected
                    ? 'bg-blue-500 border-blue-400 text-white'
                    : 'bg-black/30 border-white/40 text-transparent'
                }`}
              >
                <Check className="w-4 h-4" />
              </div>
            )}
          </div>
        </div>

        {/* Centro: Chip & Contactless */}
        <div className="flex items-center justify-between my-2 z-10">
          <div
            className="w-10 h-7 rounded-lg border border-white/30 flex items-center justify-center"
            style={{ backgroundColor: `${bankColor.hex}CC` }}
          >
            <div className="w-full h-[1px] bg-white/40 my-1" />
          </div>
          <div className="text-white/70 text-xs font-mono tracking-widest uppercase">
            {card.brand}
          </div>
        </div>

        {/* Rodapé: 4 Últimos Dígitos */}
        <div className="z-10 flex items-end justify-between">
          <div>
            <span className="text-xs text-white/60 block font-mono">NÚMERO DO CARTÃO</span>
            <span className="text-lg font-mono font-bold tracking-widest text-white drop-shadow-sm">
              •••• •••• •••• {card.last4Digits}
            </span>
          </div>
          {card._count && (
            <span className="text-[11px] font-medium bg-black/30 text-white/90 border border-white/20 px-2.5 py-1 rounded-full backdrop-blur-sm">
              {card._count.invoices} faturas
            </span>
          )}
        </div>
      </div>
    </div>
  );
};