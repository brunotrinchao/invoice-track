import React, { useState } from 'react';
import { ParseResponse, ParsedCardTransactions, InvoiceItem } from '../types/index.js';
import {
  CheckCircle2,
  Edit3,
  Trash2,
  ShieldAlert,
  X,
  Plus,
  Key,
  CreditCard,
  AlertTriangle,
  CalendarDays,
  ShoppingBag,
  Receipt,
  Percent,
  ArrowDownLeft,
  FileText,
} from 'lucide-react';

function getItemCategory(desc: string, amount: number): 'PURCHASE' | 'FEE' | 'FINE' | 'INTEREST' | 'TAX' | 'CREDIT' {
  if (amount < 0 || /ESTORNO|REEMBOLSO|CASHBACK|CRÉDITO|CREDITO|DESCONTO|DEVOLUC|DEVOLUÇ|INVESTBACK|AJUSTE/i.test(desc)) {
    return 'CREDIT';
  }
  const upper = (desc || '').toUpperCase();
  if (upper.includes('MULTA')) return 'FINE';
  if (upper.includes('JUROS') || upper.includes('MORA') || upper.includes('ROTATIVO') || upper.includes('ENCARGO') || upper.includes('ENCARGOS')) return 'INTEREST';
  if (upper.includes('IOF') || upper.includes('IMPOSTO') || upper.includes('TRIBUTO')) return 'TAX';
  if (
    upper.includes('TARIFA') ||
    upper.includes('ANUIDADE') ||
    upper.includes('TAXA') ||
    upper.includes('SEGURO') ||
    upper.includes('PROTEÇÃO') ||
    upper.includes('PROTECAO')
  ) {
    return 'FEE';
  }
  return 'PURCHASE';
}

function formatMonthYearLong(yearMonthStr: string): string {
  if (!yearMonthStr || !yearMonthStr.includes('-')) return yearMonthStr;
  const [y, m] = yearMonthStr.split('-');
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const mIdx = parseInt(m, 10) - 1;
  if (mIdx >= 0 && mIdx < 12) {
    return `${months[mIdx]} / ${y}`;
  }
  return yearMonthStr;
}

interface ConfirmationModalProps {
  parseResponse: ParseResponse;
  onClose: () => void;
  onConfirmed: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  parseResponse,
  onClose,
  onConfirmed,
}) => {
  const { data, isDuplicate } = parseResponse;

  const [monthReferenced, setMonthReferenced] = useState(data.monthReferenced);
  const [overwriteExisting, setOverwriteExisting] = useState(isDuplicate);
  const [pdfPassword, setPdfPassword] = useState(data.usedPassword || '');

  // Separar na inicialização: Taxas pertencem à Fatura Geral; Compras e Créditos do Cartão ficam no Cartão
  const initialCards: ParsedCardTransactions[] = [];
  const initialInvoiceFees: (InvoiceItem & { selected: boolean })[] = [];
  const initialInvoiceCredits: (InvoiceItem & { selected: boolean })[] = [];

  data.cards.forEach((c) => {
    const cardItems: (InvoiceItem & { selected: boolean })[] = [];
    c.items.forEach((i: any) => {
      const val = Number(i.originalAmount ?? i.amount ?? 0);
      const cat = getItemCategory(i.description, val);
      const itemObj = {
        ...i,
        originalAmount: val,
        amount: val,
        currentInstallment: Number(i.currentInstallment || 1),
        totalInstallments: Number(i.totalInstallments || 1),
        selected: i.selected ?? true,
      };
      if (cat === 'FEE') {
        initialInvoiceFees.push(itemObj);
      } else if (cat === 'CREDIT') {
        initialInvoiceCredits.push(itemObj);
      } else {
        cardItems.push(itemObj);
      }
    });

    initialCards.push({
      ...c,
      items: cardItems,
    });
  });

  const [cards, setCards] = useState<ParsedCardTransactions[]>(initialCards);
  const [invoiceFees, setInvoiceFees] = useState<(InvoiceItem & { selected: boolean })[]>(initialInvoiceFees);
  const [invoiceCredits, setInvoiceCredits] = useState<(InvoiceItem & { selected: boolean })[]>(initialInvoiceCredits);

  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentCard = cards[activeCardIndex] || cards[0];

  // --- Funções de Manipulação dos Cartões (Compras e Créditos do Cartão) ---
  const updateCardField = (cardIdx: number, field: keyof ParsedCardTransactions, val: any) => {
    const updated = [...cards];
    (updated[cardIdx] as any)[field] = val;
    setCards(updated);
  };

  const toggleCardItemSelection = (cardIdx: number, itemIdx: number) => {
    const updated = [...cards];
    updated[cardIdx].items[itemIdx].selected = !updated[cardIdx].items[itemIdx].selected;
    setCards(updated);
  };

  const updateCardItemField = (cardIdx: number, itemIdx: number, field: keyof InvoiceItem, val: any) => {
    const updated = [...cards];
    (updated[cardIdx].items[itemIdx] as any)[field] = val;
    setCards(updated);
  };

  const removeCardItem = (cardIdx: number, itemIdx: number) => {
    const updated = [...cards];
    updated[cardIdx].items = updated[cardIdx].items.filter((_, i) => i !== itemIdx);
    setCards(updated);
  };

  const addCardPurchaseItem = (cardIdx: number) => {
    const updated = [...cards];
    updated[cardIdx].items.push({
      description: 'Compra Manual no Cartão',
      originalAmount: 50.0,
      currentInstallment: 1,
      totalInstallments: 1,
      selected: true,
    });
    setCards(updated);
  };

  const addCardCreditItem = (cardIdx: number) => {
    const updated = [...cards];
    updated[cardIdx].items.push({
      description: 'Estorno / Crédito no Cartão',
      originalAmount: -50.0,
      amount: -50.0,
      currentInstallment: 1,
      totalInstallments: 1,
      selected: true,
    });
    setCards(updated);
  };

  // --- Funções de Manipulação das Taxas/Encargos da Fatura Geral ---
  const toggleFeeSelection = (idx: number) => {
    const updated = [...invoiceFees];
    updated[idx].selected = !updated[idx].selected;
    setInvoiceFees(updated);
  };

  const updateFeeField = (idx: number, field: keyof InvoiceItem, val: any) => {
    const updated = [...invoiceFees];
    (updated[idx] as any)[field] = val;
    setInvoiceFees(updated);
  };

  const removeFeeItem = (idx: number) => {
    setInvoiceFees(invoiceFees.filter((_, i) => i !== idx));
  };

  const addInvoiceFeeItem = (defaultAmount?: number) => {
    const val = defaultAmount ? Math.abs(defaultAmount) : 15.0;
    setInvoiceFees([
      ...invoiceFees,
      {
        description: 'Tarifa / Encargos / Multa / IOF da Fatura',
        originalAmount: val,
        amount: val,
        currentInstallment: 1,
        totalInstallments: 1,
        selected: true,
      },
    ]);
  };

  // --- Funções de Manipulação dos Créditos/Abatimentos da Fatura Geral ---
  const toggleCreditSelection = (idx: number) => {
    const updated = [...invoiceCredits];
    updated[idx].selected = !updated[idx].selected;
    setInvoiceCredits(updated);
  };

  const updateCreditField = (idx: number, field: keyof InvoiceItem, val: any) => {
    const updated = [...invoiceCredits];
    (updated[idx] as any)[field] = val;
    setInvoiceCredits(updated);
  };

  const removeCreditItem = (idx: number) => {
    setInvoiceCredits(invoiceCredits.filter((_, i) => i !== idx));
  };

  const addInvoiceCreditItem = (defaultCreditAmount?: number) => {
    const val = defaultCreditAmount ? -Math.abs(defaultCreditAmount) : -50.0;
    setInvoiceCredits([
      ...invoiceCredits,
      {
        description: 'Crédito Geral / Desconto na Fatura',
        originalAmount: val,
        amount: val,
        currentInstallment: 1,
        totalInstallments: 1,
        selected: true,
      },
    ]);
  };

  // --- CÁLCULOS E RECONCILIAÇÃO MATEMÁTICA ---
  // 1. Somatório dos itens nos Cartões (Compras + Créditos de Cartão)
  const totalCardItemsSelected = cards.reduce((sum, c) => {
    return (
      sum +
      c.items
        .filter((i) => i.selected)
        .reduce((iSum, i) => iSum + Number(i.originalAmount || 0), 0)
    );
  }, 0);

  // Compras de cartões (somente valores positivos)
  const totalPurchasesOnly = cards.reduce((sum, c) => {
    return (
      sum +
      c.items
        .filter((i) => i.selected && Number(i.originalAmount || 0) > 0)
        .reduce((iSum, i) => iSum + Number(i.originalAmount || 0), 0)
    );
  }, 0);

  // Créditos em cartões (somente valores negativos)
  const totalCardCreditsOnly = cards.reduce((sum, c) => {
    return (
      sum +
      c.items
        .filter((i) => i.selected && Number(i.originalAmount || 0) < 0)
        .reduce((iSum, i) => iSum + Number(i.originalAmount || 0), 0)
    );
  }, 0);

  // 2. Somatório de Taxas e Encargos da Fatura Geral
  const totalFeesSelected = invoiceFees
    .filter((i) => i.selected)
    .reduce((sum, i) => sum + Number(i.originalAmount || 0), 0);

  // 3. Somatório de Créditos da Fatura Geral (garantindo valores negativos)
  const totalInvoiceCreditsSelected = invoiceCredits
    .filter((i) => i.selected)
    .reduce((sum, i) => {
      const val = Number(i.originalAmount || 0);
      return sum + (val > 0 ? -val : val);
    }, 0);

  // Todos os Créditos (Cartões + Fatura Geral) - Ex: -237.94
  const totalAllCreditsCombined = totalCardCreditsOnly + totalInvoiceCreditsSelected;

  // Total Líquido Geral da Fatura: Compras + Taxas + Créditos (Subtrai créditos)
  const totalGlobalSelected = totalPurchasesOnly + totalFeesSelected + totalAllCreditsCombined;

  // Total Declarado no PDF (usar declaredInvoiceTotal do PDF se disponível, ou soma dos cartões)
  const totalGlobalDeclared = data.declaredInvoiceTotal && data.declaredInvoiceTotal > 0
    ? data.declaredInvoiceTotal
    : cards.reduce((sum, c) => sum + Number(c.totalAmount || 0), 0);

  const totalGlobalDifference = Math.round((totalGlobalSelected - totalGlobalDeclared) * 100) / 100;
  const isGlobalTotalMatched = Math.abs(totalGlobalDifference) < 0.02;

  // Total de compras do cartão ativo
  const activeCardPurchasesSum = currentCard
    ? currentCard.items
        .filter((i) => i.selected)
        .reduce((sum, i) => sum + Number(i.originalAmount || 0), 0)
    : 0;

  const handleConfirmSave = async () => {
    const totalSelectedItems =
      cards.reduce((sum, c) => sum + c.items.filter((i) => i.selected).length, 0) +
      invoiceFees.filter((i) => i.selected).length +
      invoiceCredits.filter((i) => i.selected).length;

    if (totalSelectedItems === 0) {
      setErrorMsg('Selecione ao menos um item ou taxa para salvar a fatura.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      // Anexar as taxas e créditos da fatura ao payload (junto com os itens do primeiro cartão ou distribuído)
      const payloadCards = cards.map((c, idx) => {
        const cardPurchases = c.items
          .filter((i) => i.selected)
          .map((i) => {
            const val = Number(i.originalAmount || 0);
            return {
              description: i.description,
              amount: val,
              currentInstallment: Number(i.currentInstallment || 1),
              totalInstallments: Number(i.totalInstallments || 1),
              itemType: (i as any).itemType || getItemCategory(i.description, val),
            };
          });

        // Se for o primeiro cartão, incluir as taxas e créditos gerais da fatura
        if (idx === 0) {
          const feesPayload = invoiceFees
            .filter((i) => i.selected)
            .map((i) => {
              const val = Math.abs(Number(i.originalAmount || 0));
              const cat = (i as any).itemType || getItemCategory(i.description, val);
              const itemType = cat === 'PURCHASE' || cat === 'CREDIT' ? 'FEE' : cat;
              return {
                description: i.description,
                amount: val,
                currentInstallment: 1,
                totalInstallments: 1,
                itemType,
              };
            });
          const creditsPayload = invoiceCredits
            .filter((i) => i.selected)
            .map((i) => {
              const val = Number(i.originalAmount || 0);
              return {
                description: i.description,
                amount: val > 0 ? -val : val,
                currentInstallment: 1,
                totalInstallments: 1,
                itemType: 'CREDIT' as const,
              };
            });
          cardPurchases.push(...feesPayload, ...creditsPayload);
        }

        return {
          bankName: c.bankName,
          brand: c.brand,
          last4Digits: c.last4Digits,
          totalAmount: cardPurchases.reduce((s, i) => s + Number(i.amount || 0), 0),
          items: cardPurchases,
        };
      });

      const res = await fetch('/api/confirm-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthReferenced,
          overwriteExisting,
          pdfPassword: pdfPassword || undefined,
          cards: payloadCards,
          bankName: payloadCards[0]?.bankName,
          brand: payloadCards[0]?.brand,
          last4Digits: payloadCards[0]?.last4Digits,
          items: payloadCards[0]?.items,
          declaredInvoiceTotal: (data as any).declaredInvoiceTotal || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Falha ao salvar a fatura.');
      }

      onConfirmed();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Erro ao gravar fatura no MySQL.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen bg-slate-50 text-slate-800 flex flex-col font-sans overflow-hidden">

      {/* Cabeçalho Fixo no Topo */}
      <div className="flex-none px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-600">
            <Edit3 className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                Revisar Fatura <span className="text-slate-500 font-normal">({cards.length} {cards.length === 1 ? 'cartão' : 'cartões'})</span>
              </h2>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                {data.extractedBy === 'ai' ? 'Extraído via IA' : 'Padrão Factory'}
              </span>
              {pdfPassword && (
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200 flex items-center gap-1">
                  <Key className="w-3 h-3" />
                  Senha Salva
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Conferência dos cartões de crédito e encargos gerais da fatura.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Conteúdo Rolável Ocupando 100% da Tela */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 max-w-[1600px] mx-auto w-full">

        {/* Seletor Destacado de Mês e Ano de Referência */}
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 border border-blue-200 rounded-xl text-blue-600">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 block">
                Mês / Ano de Referência da Fatura (Será Registrado)
              </span>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                Fatura de {formatMonthYearLong(monthReferenced)}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <label className="text-xs text-slate-600 font-medium whitespace-nowrap">Mês/Ano:</label>
            <input
              type="month"
              value={monthReferenced}
              onChange={(e) => e.target.value && setMonthReferenced(e.target.value)}
              className="px-3.5 py-2 bg-white border border-slate-200 hover:border-blue-500 rounded-lg text-slate-900 font-mono text-xs font-bold focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Métricas Globais da Fatura (Pro Max UI) */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 font-mono shadow-sm">
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
            <div className="flex items-center gap-1.5 text-[10px] text-indigo-600 uppercase font-bold tracking-wider">
              <ShoppingBag className="w-4 h-4" /> Compras nos Cartões
            </div>
            <div className="text-base font-bold text-indigo-700 mt-1">
              R$ {totalPurchasesOnly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
            <div className="flex items-center gap-1.5 text-[10px] text-amber-600 uppercase font-bold tracking-wider">
              <Percent className="w-4 h-4" /> Encargos e Taxas da Fatura
            </div>
            <div className="text-base font-bold text-amber-700 mt-1">
              R$ {totalFeesSelected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 uppercase font-bold tracking-wider">
              <ArrowDownLeft className="w-4 h-4" /> Todos os Créditos
            </div>
            <div className="text-base font-bold text-emerald-700 mt-1">
              R$ {totalAllCreditsCombined.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 uppercase font-bold tracking-wider">
              <CreditCard className="w-4 h-4 text-slate-600" /> Líquido Geral da Fatura
            </div>
            <div className="text-base font-bold text-slate-900 mt-1">
              R$ {totalGlobalSelected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Faixa Explicativa da Fórmula de Reconciliação */}
        <div className="px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-600 flex items-center justify-between gap-4">
          <span className="flex items-center gap-2">
            <span className="text-slate-400 font-bold">Cálculo:</span>
            <span>
              (Encargos <strong className="text-amber-600">R$ {totalFeesSelected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              {' '}+ Créditos <strong className="text-emerald-600">R$ {totalAllCreditsCombined.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>)
              {' '} = <strong className="text-cyan-700">R$ {(totalFeesSelected + totalAllCreditsCombined).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              {' '} + Compras <strong className="text-indigo-700">R$ {totalPurchasesOnly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
              {' '} = <strong className="text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">R$ {totalGlobalSelected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </span>
          </span>
        </div>

        {/* Banner Editorial de Validação de Totais */}
        <div>
          {isGlobalTotalMatched ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-sm text-emerald-700 block">
                    Conferência Concluída
                  </span>
                  <span className="text-slate-500 text-xs">
                    Soma dos itens e taxas selecionados (R${' '}
                    {totalGlobalSelected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) confere com o PDF.
                  </span>
                </div>
              </div>

              <div className="font-mono font-bold text-sm text-emerald-700 bg-white px-3.5 py-1.5 rounded-lg border border-emerald-200 shrink-0">
                R$ {totalGlobalSelected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 space-y-3 text-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-amber-700 flex items-center gap-2">
                      Divergência de Validação da Fatura
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                        Requer Ajuste
                      </span>
                    </h4>
                    <p className="text-slate-600 mt-0.5 leading-relaxed text-xs">
                      A soma do extrato difere do total declarado no PDF.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => addInvoiceFeeItem(Math.abs(totalGlobalDifference))}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-lg transition-colors text-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Inserir Ajuste de Taxa (R$ {Math.abs(totalGlobalDifference).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white rounded-lg border border-slate-200 font-mono text-center">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Soma dos Itens & Taxas</span>
                  <span className="text-sm font-bold text-amber-600">
                    R$ {totalGlobalSelected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Total Declarado PDF</span>
                  <span className="text-sm font-bold text-slate-700">
                    R$ {totalGlobalDeclared.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Diferença</span>
                  <span
                    className={`text-sm font-bold ${
                      totalGlobalDifference > 0 ? 'text-red-600' : 'text-amber-600'
                    }`}
                  >
                    {totalGlobalDifference > 0 ? '+' : ''} R${' '}
                    {totalGlobalDifference.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Alerta de Fatura Duplicada */}
        {isDuplicate && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 flex items-start gap-3 text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-700">Fatura Duplicada no Sistema</h4>
              <p className="text-slate-500 mt-0.5">
                Já existe registro para a referência <strong>{monthReferenced}</strong>.
              </p>
              <label className="flex items-center gap-2 mt-2 cursor-pointer text-slate-600">
                <input
                  type="checkbox"
                  checked={overwriteExisting}
                  onChange={(e) => setOverwriteExisting(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-0"
                />
                <span>Sobrescrever lançamentos anteriores</span>
              </label>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SEÇÃO 1: COMPRAS POR CARTÃO DE CRÉDITO */}
        {/* ========================================================================= */}
        <div className="border border-indigo-100 rounded-xl p-5 bg-indigo-50/50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg border border-indigo-200">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-700">
                  1. Compras e Parcelamentos por Cartão de Crédito
                </h3>
                <span className="text-xs text-slate-500">
                  Lançamentos vinculados diretamente aos cartões ({cards.length} {cards.length === 1 ? 'cartão' : 'cartões'})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => addCardPurchaseItem(activeCardIndex)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                + Compra no Cartão
              </button>
              <button
                onClick={() => addCardCreditItem(activeCardIndex)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                + Crédito no Cartão
              </button>
            </div>
          </div>

          {/* Abas dos Cartões */}
          {cards.length > 1 && (
            <div className="flex items-center gap-2 border-b border-indigo-100 pb-3 overflow-x-auto">
              {cards.map((c, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveCardIndex(idx)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium font-mono transition-colors border shrink-0 cursor-pointer ${
                    activeCardIndex === idx
                      ? 'bg-indigo-600 text-white border-indigo-500 font-bold shadow-sm'
                      : 'bg-white text-slate-500 border-slate-200 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>
                    {c.bankName} (•••• {c.last4Digits})
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 font-bold">
                    R$ {c.items.filter(i => i.selected).reduce((s, i) => s + Number(i.originalAmount || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Grade de Metadados do Cartão Ativo */}
          {currentCard && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">
                  Banco / Emissor
                </label>
                <input
                  type="text"
                  value={currentCard.bankName}
                  onChange={(e) => updateCardField(activeCardIndex, 'bankName', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">
                  Bandeira
                </label>
                <input
                  type="text"
                  value={currentCard.brand}
                  onChange={(e) => updateCardField(activeCardIndex, 'brand', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">
                  Últimos 4 Dígitos
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={currentCard.last4Digits}
                  onChange={(e) => updateCardField(activeCardIndex, 'last4Digits', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs font-mono font-bold focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Tabela de Compras do Cartão Ativo */}
          {currentCard && currentCard.items.length > 0 ? (
            <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-xl bg-white">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-mono tracking-wider">
                  <tr>
                    <th className="p-2.5 w-10 text-center">Sel</th>
                    <th className="p-2.5">Descrição</th>
                    <th className="p-2.5 w-32 text-right">Valor (R$)</th>
                    <th className="p-2.5 w-28 text-center">Parcelamento</th>
                    <th className="p-2.5 w-10 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {currentCard.items.map((item, itemIdx) => {
                    const isCreditItem = Number(item.originalAmount || 0) < 0;

                    return (
                      <tr
                        key={itemIdx}
                        className={`transition-colors ${
                          !item.selected
                            ? 'opacity-30 bg-slate-50'
                            : isCreditItem
                            ? 'bg-emerald-50/60 hover:bg-emerald-100/60'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleCardItemSelection(activeCardIndex, itemIdx)}
                            className={`w-4 h-4 rounded border-slate-300 bg-white focus:ring-0 ${
                              isCreditItem ? 'text-emerald-600' : 'text-indigo-600'
                            }`}
                          />
                        </td>
                        <td className="p-2.5">
                          <div className="flex items-center gap-2 font-sans">
                            {isCreditItem && (
                              <span className="shrink-0 text-[9px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
                                CRÉDITO CARTÃO
                              </span>
                            )}
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) =>
                                updateCardItemField(activeCardIndex, itemIdx, 'description', e.target.value)
                              }
                              className={`w-full bg-transparent border rounded px-2 py-0.5 font-medium focus:outline-none ${
                                isCreditItem
                                  ? 'border-emerald-200 text-emerald-700'
                                  : 'border-transparent hover:border-slate-200 focus:border-slate-300 text-slate-900'
                              }`}
                            />
                          </div>
                        </td>
                        <td className="p-2.5 text-right font-mono">
                          <input
                            type="number"
                            step="0.01"
                            value={item.originalAmount}
                            onChange={(e) =>
                              updateCardItemField(
                                activeCardIndex,
                                itemIdx,
                                'originalAmount',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className={`w-full bg-transparent border rounded px-2 py-0.5 text-right font-bold focus:outline-none ${
                              isCreditItem
                                ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                                : 'border-transparent hover:border-slate-200 focus:border-slate-300 text-slate-900'
                            }`}
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1 font-mono">
                            <input
                              type="number"
                              min="1"
                              value={item.currentInstallment}
                              onChange={(e) =>
                                updateCardItemField(
                                  activeCardIndex,
                                  itemIdx,
                                  'currentInstallment',
                                  parseInt(e.target.value) || 1
                                )
                              }
                              className="w-9 text-center bg-white border border-slate-200 rounded py-0.5 text-slate-700 text-xs"
                            />
                            <span className="text-slate-400">/</span>
                            <input
                              type="number"
                              min="1"
                              value={item.totalInstallments}
                              onChange={(e) =>
                                updateCardItemField(
                                  activeCardIndex,
                                  itemIdx,
                                  'totalInstallments',
                                  parseInt(e.target.value) || 1
                                )
                              }
                              className="w-9 text-center bg-white border border-slate-200 rounded py-0.5 text-slate-700 text-xs"
                            />
                          </div>
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => removeCardItem(activeCardIndex, itemIdx)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                            title="Remover Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
              Nenhum lançamento cadastrado para este cartão.
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* SEÇÃO 2: ENCARGOS, TARIFAS E TRIBUTOS DA FATURA GERAL */}
        {/* ========================================================================= */}
        <div className="border border-amber-100 rounded-xl p-5 bg-amber-50/50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-lg border border-amber-200">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-700">
                  2. Encargos, Tarifas, Juros e Impostos da Fatura
                </h3>
                <span className="text-xs text-slate-500">
                  Encargos financeiros e tributários aplicados no nível geral da Fatura ({invoiceFees.length} {invoiceFees.length === 1 ? 'item' : 'itens'})
                </span>
              </div>
            </div>

            <button
              onClick={() => addInvoiceFeeItem()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + Adicionar Encargo / Taxa na Fatura
            </button>
          </div>

          {invoiceFees.length > 0 ? (
            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl bg-white">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-mono tracking-wider">
                  <tr>
                    <th className="p-2.5 w-10 text-center">Sel</th>
                    <th className="p-2.5">Descrição do Encargo / Taxa / Tributo</th>
                    <th className="p-2.5 w-32 text-right">Valor (R$)</th>
                    <th className="p-2.5 w-10 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {invoiceFees.map((fee, feeIdx) => (
                    <tr
                      key={feeIdx}
                      className={`transition-colors ${
                        !fee.selected ? 'opacity-30 bg-slate-50' : 'bg-amber-50/60 hover:bg-amber-100/60'
                      }`}
                    >
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={fee.selected}
                          onChange={() => toggleFeeSelection(feeIdx)}
                          className="w-4 h-4 rounded border-slate-300 bg-white text-amber-600 focus:ring-0"
                        />
                      </td>
                      <td className="p-2.5">
                        <div className="flex items-center gap-2 font-sans">
                          <span className="shrink-0 text-[9px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                            ENCARGO/FATURA
                          </span>
                          <input
                            type="text"
                            value={fee.description}
                            onChange={(e) => updateFeeField(feeIdx, 'description', e.target.value)}
                            className="w-full bg-transparent border border-amber-200 rounded px-2 py-0.5 text-amber-700 font-medium focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </td>
                      <td className="p-2.5 text-right font-mono">
                        <input
                          type="number"
                          step="0.01"
                          value={fee.originalAmount}
                          onChange={(e) =>
                            updateFeeField(feeIdx, 'originalAmount', parseFloat(e.target.value) || 0)
                          }
                          className="w-full bg-amber-50 border border-amber-200 rounded px-2 py-0.5 text-right font-bold text-amber-700 focus:outline-none"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => removeFeeItem(feeIdx)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                          title="Remover Encargo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
              Nenhum encargo, multa, juros ou tarifa financeira cobrado nesta fatura.
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* SEÇÃO 3: CRÉDITOS E ABATIMENTOS DA FATURA GERAL */}
        {/* ========================================================================= */}
        <div className="border border-emerald-100 rounded-xl p-5 bg-emerald-50/50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg border border-emerald-200">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-700">
                  3. Créditos, Estornos e Abatimentos da Fatura
                </h3>
                <span className="text-xs text-slate-500">
                  Valores deduzidos do saldo geral da Fatura ({invoiceCredits.length} {invoiceCredits.length === 1 ? 'item' : 'itens'})
                </span>
              </div>
            </div>

            <button
              onClick={() => addInvoiceCreditItem()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              + Adicionar Crédito na Fatura
            </button>
          </div>

          {invoiceCredits.length > 0 ? (
            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl bg-white">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-mono tracking-wider">
                  <tr>
                    <th className="p-2.5 w-10 text-center">Sel</th>
                    <th className="p-2.5">Descrição do Crédito / Abatimento</th>
                    <th className="p-2.5 w-32 text-right">Valor (R$)</th>
                    <th className="p-2.5 w-10 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {invoiceCredits.map((credit, creditIdx) => (
                    <tr
                      key={creditIdx}
                      className={`transition-colors ${
                        !credit.selected ? 'opacity-30 bg-slate-50' : 'bg-emerald-50/60 hover:bg-emerald-100/60'
                      }`}
                    >
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={credit.selected}
                          onChange={() => toggleCreditSelection(creditIdx)}
                          className="w-4 h-4 rounded border-slate-300 bg-white text-emerald-600 focus:ring-0"
                        />
                      </td>
                      <td className="p-2.5">
                        <div className="flex items-center gap-2 font-sans">
                          <span className="shrink-0 text-[9px] uppercase font-mono font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
                            CRÉDITO/FATURA
                          </span>
                          <input
                            type="text"
                            value={credit.description}
                            onChange={(e) => updateCreditField(creditIdx, 'description', e.target.value)}
                            className="w-full bg-transparent border border-emerald-200 rounded px-2 py-0.5 text-emerald-700 font-medium focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </td>
                      <td className="p-2.5 text-right font-mono">
                        <input
                          type="number"
                          step="0.01"
                          value={credit.originalAmount}
                          onChange={(e) =>
                            updateCreditField(creditIdx, 'originalAmount', parseFloat(e.target.value) || 0)
                          }
                          className="w-full bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 text-right font-bold text-emerald-700 focus:outline-none"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          onClick={() => removeCreditItem(creditIdx)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                          title="Remover Crédito"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
              Nenhum crédito, devolução ou abatimento registrado nesta fatura.
            </div>
          )}
        </div>

      </div>

      {/* Rodapé Fixo na Parte Inferior */}
      <div className="flex-none px-6 py-4 border-t border-slate-200 bg-white z-10 shadow-sm">
        <div className="max-w-[1600px] mx-auto w-full">
          {errorMsg && (
            <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">
                Total Geral da Fatura ({cards.length} {cards.length === 1 ? 'cartão' : 'cartões'} + {invoiceFees.length + invoiceCredits.length} taxas/créditos)
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold font-mono text-slate-900">
                  R$ {totalGlobalSelected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                {isGlobalTotalMatched ? (
                  <span className="text-xs font-mono font-medium text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    100% Conferido
                  </span>
                ) : (
                  <span className="text-xs font-mono font-medium text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Diferença R$ {Math.abs(totalGlobalDifference).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                onClick={handleConfirmSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors duration-200 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                {saving ? 'Gravando no Banco...' : 'Confirmar e Salvar Fatura'}
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};