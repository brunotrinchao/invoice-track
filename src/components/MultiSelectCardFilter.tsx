import React, { useMemo } from 'react';
import Multiselect from 'multiselect-react-dropdown';
import { Card } from '../types/index.js';
import { Landmark } from 'lucide-react';

interface MultiSelectCardFilterProps {
  cards: Card[];
  selectedCardIds: string[];
  onChangeSelection: (newSelectedIds: string[]) => void;
}

const MULTISELECT_STYLE = {
  chips: {
    background: '#2563eb',
    borderRadius: '6px',
    fontSize: '11px',
    color: '#ffffff',
  },
  searchBox: {
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    minHeight: '42px',
    fontSize: '12px',
    color: '#334155',
  },
  optionContainer: {
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    background: '#ffffff',
    maxHeight: '180px',
  },
  option: {
    fontSize: '12px',
    color: '#334155',
  },
  optionList: {
    maxHeight: '180px',
  },
  multiselectContainer: {
    color: '#334155',
  },
};

export const MultiSelectCardFilter: React.FC<MultiSelectCardFilterProps> = ({
  cards,
  selectedCardIds,
  onChangeSelection,
}) => {
  // Lista única de Bancos cadastrados
  const uniqueBanks = useMemo(() => {
    return Array.from(new Set(cards.map((c) => c.bankName))).sort();
  }, [cards]);

  const bankOptions = useMemo(() => {
    return uniqueBanks.map((name) => ({ id: name, name }));
  }, [uniqueBanks]);

  // Se selectedCardIds estiver vazio, indica que todos os cartões de todos os bancos estão ativos por padrão
  const isAllSelected = selectedCardIds.length === 0;

  // Bancos selecionados para exibição no dropdown
  const selectedBanks = useMemo(() => {
    if (isAllSelected) {
      return bankOptions; // Exibe todos os bancos selecionados por padrão
    }
    return bankOptions.filter((b) =>
      cards.some((c) => c.bankName === b.id && selectedCardIds.includes(c.id))
    );
  }, [isAllSelected, bankOptions, cards, selectedCardIds]);

  const handleBankSelect = (selectedList: { id: string; name: string }[]) => {
    const selectedBankNames = selectedList.map((b) => b.id);
    
    // Se selecionou todos os bancos ou nenhum, passa [] para trazer todos os cartões de todos os bancos
    if (selectedBankNames.length === 0 || selectedBankNames.length === uniqueBanks.length) {
      onChangeSelection([]);
      return;
    }

    // Seleciona automaticamente todos os cartões pertencentes aos bancos selecionados
    const matchingCardIds = cards
      .filter((c) => selectedBankNames.includes(c.bankName))
      .map((c) => c.id);

    onChangeSelection(matchingCardIds);
  };

  if (cards.length === 0) {
    return (
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 text-center">
        Nenhum banco cadastrado ainda. Importe uma fatura PDF para começar.
      </div>
    );
  }

  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
        <Landmark className="w-3.5 h-3.5 text-blue-600" />
        Filtrar por Banco
      </label>
      <Multiselect
        options={bankOptions}
        selectedValues={selectedBanks}
        onSelect={handleBankSelect}
        onRemove={handleBankSelect}
        displayValue="name"
        placeholder="Selecionar bancos..."
        closeIcon="cancel"
        showCheckbox
        style={MULTISELECT_STYLE}
      />
    </div>
  );
};