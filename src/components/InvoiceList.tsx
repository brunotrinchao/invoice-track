import React, { useState, useEffect } from 'react';
import { Invoice } from '../types/index.js';
import { Calendar, ChevronDown, ChevronUp, CreditCard, Tag } from 'lucide-react';

interface InvoiceListProps {
  selectedCardIds: string[];
}

export const InvoiceList: React.FC<InvoiceListProps> = ({ selectedCardIds }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, [selectedCardIds]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const query = selectedCardIds.length > 0 ? `?cardId=${selectedCardIds.join(',')}` : '';
      const res = await fetch(`/api/invoices${query}`);
      const json = await res.json();
      if (json.success) {
        setInvoices(json.invoices);
      }
    } catch (err) {
      console.error('Erro ao buscar faturas:', err);
    } finally {
      setLoading(false);
    }
  };

  // Agrupar faturas por mês
  const groupedByMonth: Record<string, Invoice[]> = {};
  (invoices || []).forEach((inv) => {
    if (!inv || !inv.monthYear) return;
    if (!groupedByMonth[inv.monthYear]) {
      groupedByMonth[inv.monthYear] = [];
    }
    groupedByMonth[inv.monthYear].push(inv);
  });

  const sortedMonths = Object.keys(groupedByMonth).sort();

  if (loading) {
    return (
      <div className="py-8 text-center text-xs text-slate-400">
        Carregando detalhamento de faturas...
      </div>
    );
  }

  if (sortedMonths.length === 0) {
    return (
      <div className="p-8 text-center glass-card rounded-3xl border border-slate-800 text-slate-400">
        <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm font-medium">Nenhuma fatura encontrada para os cartões selecionados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedMonths.map((m) => {
        const monthInvoices = groupedByMonth[m] || [];
        const monthTotal = monthInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
        const isExpanded = expandedMonth === m;

        const parts = m.split('-');
        const year = parts[0] || '2026';
        const month = parts[1] || '01';
        const monthNames = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        const monthIdx = Math.max(0, parseInt(month, 10) - 1);
        const monthTitle = `${monthNames[monthIdx] || month} de ${year}`;

        return (
          <div
            key={m}
            className="glass-card rounded-2xl border border-slate-800/80 overflow-hidden transition-all"
          >
            {/* Cabecalho do Mês */}
            <div
              onClick={() => setExpandedMonth(isExpanded ? null : m)}
              className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-900/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-extrabold text-xs">
                  {month}
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-white">{monthTitle}</h4>
                  <span className="text-xs text-slate-400">
                    {monthInvoices.length} {monthInvoices.length === 1 ? 'fatura' : 'faturas'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-lg font-mono font-extrabold text-emerald-400">
                  R$ {monthTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </div>

            {/* Conteudo Expansivel dos Itens */}
            {isExpanded && (
              <div className="p-5 pt-0 border-t border-slate-800/60 bg-slate-950/60 divide-y divide-slate-800/40">
                {monthInvoices.map((inv) => (
                  <div key={inv.id} className="py-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                        <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                        <span>{inv.card?.bankName || 'Cartão'} (•••• {inv.card?.last4Digits || '0000'})</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-slate-300">
                        Subtotal: R$ {Number(inv.totalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {(inv.items || []).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800/40 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <Tag className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <div>
                              <span className="font-semibold text-white block">{item.description}</span>
                              {item.totalInstallments > 1 && (
                                <span className="text-[11px] font-mono text-blue-400">
                                  Parcela {item.currentInstallment} de {item.totalInstallments}
                                </span>
                              )}
                            </div>
                          </div>

                          <span className="font-mono font-bold text-emerald-400">
                            R$ {Number(item.originalAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
