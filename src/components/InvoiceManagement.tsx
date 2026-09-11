import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  Trash2,
  Eye,
  Filter,
  Search,
  AlertTriangle,
  CheckSquare,
  Square,
  CreditCard,
  Landmark,
  Receipt,
  X,
  RefreshCw,
  ShoppingBag,
  DollarSign,
  Percent,
  Calendar,
  CheckCircle2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers
} from 'lucide-react';
import { Card } from '../types/index.js';
import { getBankColor } from '../utils/bankColors.js';

interface InvoiceItemData {
  id: string;
  description: string;
  originalAmount: number | string;
  currentInstallment: number;
  totalInstallments: number;
  itemType: string;
  purchaseDate?: string;
  cardLast4?: string;
}

interface InvoiceFeeData {
  id: string;
  description: string;
  amount: number | string;
  feeType: string;
  cardLast4?: string;
}

interface InvoiceData {
  id: string;
  cardId: string;
  monthYear: string;
  totalAmount: number | string;
  purchasesAmount: number | string;
  fineAmount: number | string;
  interestAmount: number | string;
  taxesAmount: number | string;
  feesAmount: number | string;
  creditsAmount: number | string;
  isPaid: boolean;
  createdAt: string;
  card: Card;
  items?: InvoiceItemData[];
  fees?: InvoiceFeeData[];
}

export interface BankInvoiceConsolidated {
  id: string; // "BankName_YYYY-MM"
  bankName: string;
  monthYear: string;
  cards: { id: string; bankName: string; last4Digits: string; brand: string }[];
  invoiceIds: string[];
  totalAmount: number;
  purchasesAmount: number;
  feesAmount: number;
  creditsAmount: number;
  isPaid: boolean;
  invoicesCount: number;
  items?: InvoiceItemData[];
  fees?: InvoiceFeeData[];
}

const MONTH_NAMES = [
  { value: '01', label: 'Janeiro (01)' },
  { value: '02', label: 'Fevereiro (02)' },
  { value: '03', label: 'Março (03)' },
  { value: '04', label: 'Abril (04)' },
  { value: '05', label: 'Maio (05)' },
  { value: '06', label: 'Junho (06)' },
  { value: '07', label: 'Julho (07)' },
  { value: '08', label: 'Agosto (08)' },
  { value: '09', label: 'Setembro (09)' },
  { value: '10', label: 'Outubro (10)' },
  { value: '11', label: 'Novembro (11)' },
  { value: '12', label: 'Dezembro (12)' },
];

export const InvoiceManagement: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedBank, setSelectedBank] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Seleção múltipla para exclusão
  const [selectedBankInvoiceKeys, setSelectedBankInvoiceKeys] = useState<string[]>([]);

  // Modais
  const [detailBankInvoice, setDetailBankInvoice] = useState<BankInvoiceConsolidated | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [bankInvoiceToDelete, setBankInvoiceToDelete] = useState<BankInvoiceConsolidated | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Carregar dados iniciais
  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (selectedYear !== 'all' && selectedMonth !== 'all') {
        queryParams.append('monthYear', `${selectedYear}-${selectedMonth}`);
      } else if (selectedYear !== 'all') {
        queryParams.append('year', selectedYear);
      }

      const res = await fetch(`/api/invoices?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Falha ao carregar faturas');
      const data = await res.json();
      if (data.success) {
        setInvoices(data.invoices || []);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar faturas');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  const fetchCards = useCallback(async () => {
    try {
      const res = await fetch('/api/cards');
      if (res.ok) {
        const data = await res.json();
        if (data.success) setCards(data.cards || []);
      }
    } catch (err) {
      console.error('Erro ao buscar cartões:', err);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Consolidação por Banco e Mês/Ano (Fatura pertence ao Banco)
  const consolidatedBankInvoices = useMemo(() => {
    const map = new Map<string, BankInvoiceConsolidated>();

    invoices.forEach((inv) => {
      const bankName = inv.card?.bankName || 'Outros';
      const key = `${bankName}_${inv.monthYear}`;

      const cardInfo = {
        id: inv.cardId,
        bankName,
        last4Digits: inv.card?.last4Digits || '0000',
        brand: inv.card?.brand || 'Mastercard',
      };

      const purchases = Number(inv.purchasesAmount || 0);
      const fees = Number(inv.feesAmount || 0) + Number(inv.fineAmount || 0) + Number(inv.interestAmount || 0) + Number(inv.taxesAmount || 0);
      const credits = Number(inv.creditsAmount || 0);
      const total = Number(inv.totalAmount || 0);

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          bankName,
          monthYear: inv.monthYear,
          cards: [cardInfo],
          invoiceIds: [inv.id],
          totalAmount: total,
          purchasesAmount: purchases,
          feesAmount: fees,
          creditsAmount: credits,
          isPaid: inv.isPaid,
          invoicesCount: 1,
        });
      } else {
        const existing = map.get(key)!;
        if (!existing.cards.some((c) => c.id === inv.cardId)) {
          existing.cards.push(cardInfo);
        }
        existing.invoiceIds.push(inv.id);
        existing.totalAmount += total;
        existing.purchasesAmount += purchases;
        existing.feesAmount += fees;
        existing.creditsAmount += credits;
        existing.isPaid = existing.isPaid && inv.isPaid;
        existing.invoicesCount += 1;
      }
    });

    return Array.from(map.values());
  }, [invoices]);

  // Anos disponíveis para filtro
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    invoices.forEach((inv) => {
      const [y] = inv.monthYear.split('-');
      if (y) yearsSet.add(y);
    });
    ['2025', '2026', '2027'].forEach((y) => yearsSet.add(y));
    return Array.from(yearsSet).sort().reverse();
  }, [invoices]);

  // Bancos disponíveis para filtro
  const availableBanks = useMemo(() => {
    const banksSet = new Set<string>();
    cards.forEach((c) => {
      if (c.bankName) banksSet.add(c.bankName);
    });
    return Array.from(banksSet).sort();
  }, [cards]);

  // Faturas Consolidadas de Banco filtradas e ordenadas
  const filteredBankInvoices = useMemo(() => {
    const filtered = consolidatedBankInvoices.filter((bankInv) => {
      const [year, month] = bankInv.monthYear.split('-');

      if (selectedYear !== 'all' && year !== selectedYear) return false;
      if (selectedMonth !== 'all' && month !== selectedMonth) return false;
      if (selectedBank !== 'all' && bankInv.bankName !== selectedBank) return false;
      if (selectedStatus === 'paid' && !bankInv.isPaid) return false;
      if (selectedStatus === 'unpaid' && bankInv.isPaid) return false;

      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const bank = bankInv.bankName.toLowerCase();
        const monthY = bankInv.monthYear.toLowerCase();
        const cardMatch = bankInv.cards.some((c) => c.last4Digits.includes(term));
        return bank.includes(term) || monthY.includes(term) || cardMatch;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.monthYear.localeCompare(b.monthYear);
      }
      return b.monthYear.localeCompare(a.monthYear);
    });
  }, [consolidatedBankInvoices, selectedYear, selectedMonth, selectedBank, selectedStatus, searchTerm, sortOrder]);

  // Estatísticas das Faturas Consolidadas por Banco
  const invoiceStats = useMemo(() => {
    let totalFaturado = 0;
    let totalCompras = 0;
    let totalTaxas = 0;
    let totalCreditos = 0;

    filteredBankInvoices.forEach((bankInv) => {
      totalFaturado += bankInv.totalAmount;
      totalCompras += bankInv.purchasesAmount;
      totalTaxas += bankInv.feesAmount;
      totalCreditos += bankInv.creditsAmount;
    });

    const averageInvoice = filteredBankInvoices.length > 0 ? totalFaturado / filteredBankInvoices.length : 0;

    return {
      totalFaturado: Math.round(totalFaturado * 100) / 100,
      totalCompras: Math.round(totalCompras * 100) / 100,
      totalTaxas: Math.round(totalTaxas * 100) / 100,
      totalCreditos: Math.round(totalCreditos * 100) / 100,
      averageInvoice: Math.round(averageInvoice * 100) / 100,
      count: filteredBankInvoices.length,
    };
  }, [filteredBankInvoices]);

  // Sincronizar seleção
  useEffect(() => {
    setSelectedBankInvoiceKeys((prev) =>
      prev.filter((key) => filteredBankInvoices.some((b) => b.id === key))
    );
  }, [filteredBankInvoices]);

  // Alternar Seleção em Lote
  const isAllSelected =
    filteredBankInvoices.length > 0 &&
    filteredBankInvoices.every((b) => selectedBankInvoiceKeys.includes(b.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedBankInvoiceKeys([]);
    } else {
      setSelectedBankInvoiceKeys(filteredBankInvoices.map((b) => b.id));
    }
  };

  const toggleSelectBankInvoice = (key: string) => {
    setSelectedBankInvoiceKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Alternar status de pagamento da Fatura Consolidada do Banco (atualiza todas as faturas filhas)
  const handleTogglePaidBankInvoice = async (bankInv: BankInvoiceConsolidated) => {
    const nextState = !bankInv.isPaid;

    // Atualização otimista local
    setInvoices((prev) =>
      prev.map((inv) => (bankInv.invoiceIds.includes(inv.id) ? { ...inv, isPaid: nextState } : inv))
    );

    if (detailBankInvoice && detailBankInvoice.id === bankInv.id) {
      setDetailBankInvoice((prev) => (prev ? { ...prev, isPaid: nextState } : prev));
    }

    try {
      await Promise.all(
        bankInv.invoiceIds.map((id) =>
          fetch(`/api/invoices/${id}/toggle-paid`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isPaid: nextState }),
          })
        )
      );
    } catch (err) {
      console.error('Erro ao alternar status da fatura do banco:', err);
      // Reverter em caso de erro
      setInvoices((prev) =>
        prev.map((inv) => (bankInv.invoiceIds.includes(inv.id) ? { ...inv, isPaid: bankInv.isPaid } : inv))
      );
    }
  };

  // Abrir Detalhes da Fatura Consolidada do Banco
  const handleOpenDetailBankInvoice = async (bankInv: BankInvoiceConsolidated) => {
    try {
      setLoadingDetail(true);
      const responses = await Promise.all(
        bankInv.invoiceIds.map((id) => fetch(`/api/invoices/${id}`).then((r) => r.json()))
      );

      const items: InvoiceItemData[] = [];
      const fees: InvoiceFeeData[] = [];

      responses.forEach((res) => {
        if (res.success && res.invoice) {
          const inv = res.invoice;
          const cardLast4 = inv.card?.last4Digits || '0000';
          if (inv.items) {
            items.push(...inv.items.map((i: any) => ({ ...i, cardLast4 })));
          }
          if (inv.fees) {
            fees.push(...inv.fees.map((f: any) => ({ ...f, cardLast4 })));
          }
        }
      });

      setDetailBankInvoice({
        ...bankInv,
        items,
        fees,
      });
    } catch (err: any) {
      alert(err.message || 'Erro ao carregar detalhes da fatura do banco.');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Excluir fatura do banco
  const handleDeleteBankInvoice = async () => {
    if (!bankInvoiceToDelete) return;
    try {
      setDeleting(true);
      const res = await fetch('/api/invoices/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: bankInvoiceToDelete.invoiceIds }),
      });
      if (!res.ok) throw new Error('Falha ao excluir fatura do banco.');

      setInvoices((prev) => prev.filter((inv) => !bankInvoiceToDelete.invoiceIds.includes(inv.id)));
      setSelectedBankInvoiceKeys((prev) => prev.filter((key) => key !== bankInvoiceToDelete.id));
      setBankInvoiceToDelete(null);
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir fatura do banco.');
    } finally {
      setDeleting(false);
    }
  };

  // Excluir em lote
  const handleDeleteBulkBankInvoices = async () => {
    if (selectedBankInvoiceKeys.length === 0) return;
    try {
      setDeleting(true);
      const invoiceIdsToDelete: string[] = [];
      selectedBankInvoiceKeys.forEach((key) => {
        const bankInv = consolidatedBankInvoices.find((b) => b.id === key);
        if (bankInv) invoiceIdsToDelete.push(...bankInv.invoiceIds);
      });

      const res = await fetch('/api/invoices/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: invoiceIdsToDelete }),
      });
      if (!res.ok) throw new Error('Falha na exclusão em lote.');

      setInvoices((prev) => prev.filter((inv) => !invoiceIdsToDelete.includes(inv.id)));
      setSelectedBankInvoiceKeys([]);
      setShowBulkDeleteModal(false);
    } catch (err: any) {
      alert(err.message || 'Erro na exclusão em lote.');
    } finally {
      setDeleting(false);
    }
  };

  // Formatar Mês/Ano (ex: "2026-08" -> "Agosto / 2026")
  const formatMonthLabel = (monthYear: string) => {
    const [year, month] = monthYear.split('-');
    const mObj = MONTH_NAMES.find((m) => m.value === month);
    const mName = mObj ? mObj.label.split(' ')[0] : month;
    return `${mName} / ${year}`;
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho Pro Max de Faturas por Banco */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 rounded-3xl shadow-sm border border-slate-200/90">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 p-[2px] shadow-sm">
            <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
              <Landmark className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              Gerenciador de Faturas por Banco
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                {filteredBankInvoices.length} {filteredBankInvoices.length === 1 ? 'fatura de banco' : 'faturas de bancos'}
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Faturas consolidadas por Instituição Bancária (soma de todos os cartões do banco no mês)
            </p>
          </div>
        </div>

        <button
          onClick={fetchInvoices}
          className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Lista
        </button>
      </div>

      {/* Filtros e Ordenação Fixos no Topo */}
      <div className="sticky top-[84px] z-30 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/90 shadow-md transition-all duration-200">
        {/* Ordenar por Mês/Ano */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
            Ordenar Mês/Ano
          </label>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
            className="w-full bg-white border border-slate-200 text-slate-900 text-xs font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
          >
            <option value="desc">Mais Recentes (Mês/Ano ↓)</option>
            <option value="asc">Mais Antigos (Mês/Ano ↑)</option>
          </select>
        </div>

        {/* Filtro por Ano */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            Ano
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-900 text-xs font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
          >
            <option value="all">Todos os Anos</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>
                Ano {y}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por Mês */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            Mês
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-900 text-xs font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
          >
            <option value="all">Todos os Meses</option>
            {MONTH_NAMES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por Banco */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
            <Landmark className="w-3.5 h-3.5 text-cyan-600" />
            Banco
          </label>
          <select
            value={selectedBank}
            onChange={(e) => setSelectedBank(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-900 text-xs font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
          >
            <option value="all">Todos os Bancos</option>
            {availableBanks.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por Status de Pagamento */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Status Pago
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-900 text-xs font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
          >
            <option value="all">Todos os Status</option>
            <option value="paid">Pago</option>
            <option value="unpaid">Não Pago</option>
          </select>
        </div>

        {/* Busca por Texto */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-emerald-600" />
            Buscar
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ex: Inter, 4899..."
              className="w-full bg-white border border-slate-200 text-slate-900 text-xs font-medium rounded-xl pl-9 pr-3 py-2.5 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas das Faturas Consolidadas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Faturado */}
        <div className="glass-card p-5 rounded-3xl flex items-center gap-4 border border-slate-200/80 bg-white/80">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Faturado</span>
            <span className="text-xl font-mono font-black text-slate-900">
              R$ {invoiceStats.totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400 block font-medium">
              {invoiceStats.count} {invoiceStats.count === 1 ? 'fatura de banco' : 'faturas de bancos'}
            </span>
          </div>
        </div>

        {/* Card 2: Total em Compras */}
        <div className="glass-card p-5 rounded-3xl flex items-center gap-4 border border-slate-200/80 bg-white/80">
          <div className="p-3 bg-cyan-50 text-cyan-600 rounded-2xl border border-cyan-100">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total em Compras</span>
            <span className="text-xl font-mono font-black text-cyan-700">
              R$ {invoiceStats.totalCompras.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400 block font-medium">Soma de compras nos bancos</span>
          </div>
        </div>

        {/* Card 3: Encargos & Taxas */}
        <div className="glass-card p-5 rounded-3xl flex items-center gap-4 border border-slate-200/80 bg-white/80">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Taxas e Encargos</span>
            <span className="text-xl font-mono font-black text-amber-700">
              + R$ {invoiceStats.totalTaxas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400 block font-medium">Juros e tarifas dos bancos</span>
          </div>
        </div>

        {/* Card 4: Média por Fatura de Banco */}
        <div className="glass-card p-5 rounded-3xl flex items-center gap-4 border border-slate-200/80 bg-white/80">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Média por Banco</span>
            <span className="text-xl font-mono font-black text-indigo-700">
              R$ {invoiceStats.averageInvoice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400 block font-medium">Média consolidada por banco</span>
          </div>
        </div>
      </div>

      {/* Barra de Ação em Lote (Seleção Múltipla) */}
      {selectedBankInvoiceKeys.length > 0 && (
        <div className="flex items-center justify-between gap-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-slate-900 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-xl text-red-600">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-red-700">
                {selectedBankInvoiceKeys.length} {selectedBankInvoiceKeys.length === 1 ? 'fatura de banco selecionada' : 'faturas de bancos selecionadas'}
              </span>
              <p className="text-xs text-red-600/80">
                A exclusão removerá permanentemente todas as faturas e compras vinculadas do MySQL.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedBankInvoiceKeys([])}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-sm transition-colors duration-200 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Excluir Selecionadas ({selectedBankInvoiceKeys.length})
            </button>
          </div>
        </div>
      )}

      {/* Tabela Pro Max de Faturas por Banco */}
      <div className="glass-card rounded-3xl overflow-hidden shadow-sm border border-slate-200/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-4 px-4 w-12 text-center">
                  <button
                    onClick={toggleSelectAll}
                    className="text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th
                  className="py-4 px-4 cursor-pointer select-none hover:text-slate-900 transition-colors"
                  onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                  title="Clique para inverter a ordenação por Mês/Ano"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Mês / Ano</span>
                    {sortOrder === 'desc' ? (
                      <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                    )}
                  </div>
                </th>
                <th className="py-4 px-4">Instituição Bancária & Cartões</th>
                <th className="py-4 px-4 text-right">Compras (R$)</th>
                <th className="py-4 px-4 text-right">Taxas & Encargos</th>
                <th className="py-4 px-4 text-right">Créditos</th>
                <th className="py-4 px-4 text-right">Total Fatura Banco (R$)</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Carregando faturas dos bancos...
                  </td>
                </tr>
              ) : filteredBankInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 space-y-2 font-sans">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-sm font-semibold text-slate-500">Nenhuma fatura encontrada</p>
                    <p className="text-xs text-slate-400">Ajuste os filtros acima ou importe um novo PDF de fatura.</p>
                  </td>
                </tr>
              ) : (
                filteredBankInvoices.map((bankInv) => {
                  const isSelected = selectedBankInvoiceKeys.includes(bankInv.id);
                  const bankTheme = getBankColor(bankInv.bankName);

                  return (
                    <tr
                      key={bankInv.id}
                      className={`hover:bg-slate-50/90 transition-colors ${
                        isSelected ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      {/* Checkbox de Seleção */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => toggleSelectBankInvoice(bankInv.id)}
                          className="text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </td>

                      {/* Mês / Ano */}
                      <td className="py-4 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          {formatMonthLabel(bankInv.monthYear)}
                        </span>
                      </td>

                      {/* Banco & Cartões Consolidados */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="p-2.5 rounded-xl text-white shadow-sm flex items-center justify-center shrink-0"
                            style={{ backgroundColor: bankTheme.hex }}
                          >
                            <Landmark className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-extrabold text-slate-900">{bankInv.bankName}</p>
                              {bankInv.cards.length > 1 && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                  <Layers className="w-3 h-3" />
                                  {bankInv.cards.length} Cartões
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {bankInv.cards.map((c) => (
                                <span
                                  key={c.id}
                                  className="font-mono text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-md font-semibold"
                                >
                                  •••• {c.last4Digits}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Compras */}
                      <td className="py-4 px-4 text-right font-mono font-semibold text-slate-700">
                        R$ {bankInv.purchasesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Taxas & Encargos */}
                      <td className="py-4 px-4 text-right font-mono font-semibold text-amber-600">
                        {bankInv.feesAmount > 0
                          ? `+ R$ ${bankInv.feesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : 'R$ 0,00'}
                      </td>

                      {/* Créditos */}
                      <td className="py-4 px-4 text-right font-mono font-semibold text-emerald-600">
                        {bankInv.creditsAmount < 0
                          ? `- R$ ${Math.abs(bankInv.creditsAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : 'R$ 0,00'}
                      </td>

                      {/* Total Fatura Banco */}
                      <td className="py-4 px-4 text-right font-mono font-extrabold text-base text-emerald-700 whitespace-nowrap">
                        R$ {bankInv.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Status Pago / Não Pago (Switch) */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleTogglePaidBankInvoice(bankInv)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                            bankInv.isPaid
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          }`}
                          title={bankInv.isPaid ? 'Clique para marcar como Não Pago' : 'Clique para marcar como Pago'}
                        >
                          <span className={`w-2 h-2 rounded-full ${bankInv.isPaid ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                          {bankInv.isPaid ? 'Pago' : 'Não Pago'}
                        </button>
                      </td>

                      {/* Ações */}
                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenDetailBankInvoice(bankInv)}
                            title="Ver Detalhes da Fatura do Banco"
                            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-blue-600 hover:text-blue-700 rounded-xl transition-all cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setBankInvoiceToDelete(bankInv)}
                            title="Excluir Fatura do Banco"
                            className="p-2 bg-white hover:bg-red-50 border border-slate-200 text-slate-400 hover:text-red-600 rounded-xl transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Pro Max de Detalhes da Fatura Consolidada do Banco */}
      {detailBankInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] glass-modal rounded-3xl p-6 flex flex-col overflow-hidden shadow-xl">
            {/* Header do Modal */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="p-3 rounded-2xl text-white shadow-sm flex items-center justify-center"
                  style={{ backgroundColor: getBankColor(detailBankInvoice.bankName).hex }}
                >
                  <Landmark className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 flex flex-wrap items-center gap-2">
                    Fatura {detailBankInvoice.bankName}
                    <span className="text-xs px-2.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-full font-mono">
                      {formatMonthLabel(detailBankInvoice.monthYear)}
                    </span>
                    <button
                      onClick={() => handleTogglePaidBankInvoice(detailBankInvoice)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                        detailBankInvoice.isPaid
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                      }`}
                      title={detailBankInvoice.isPaid ? 'Clique para marcar como Não Pago' : 'Clique para marcar como Pago'}
                    >
                      <span className={`w-2 h-2 rounded-full ${detailBankInvoice.isPaid ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {detailBankInvoice.isPaid ? 'Pago' : 'Não Pago'}
                    </button>
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <span>Cartões consolidados:</span>
                    <div className="flex flex-wrap gap-1">
                      {detailBankInvoice.cards.map((c) => (
                        <span key={c.id} className="font-mono text-[10px] px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-md font-semibold">
                          •••• {c.last4Digits} ({c.brand})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDetailBankInvoice(null)}
                className="p-2 text-slate-400 hover:text-slate-900 rounded-xl bg-white border border-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cards de Resumo no Modal */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-[11px] font-semibold uppercase text-slate-500 block mb-1">Compras</span>
                <span className="text-base font-mono font-bold text-slate-700">
                  R$ {detailBankInvoice.purchasesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-100">
                <span className="text-[11px] font-semibold uppercase text-amber-600 block mb-1">Encargos/Taxas</span>
                <span className="text-base font-mono font-bold text-amber-700">
                  + R$ {detailBankInvoice.feesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-100">
                <span className="text-[11px] font-semibold uppercase text-emerald-600 block mb-1">Créditos</span>
                <span className="text-base font-mono font-bold text-emerald-700">
                  - R$ {Math.abs(detailBankInvoice.creditsAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-blue-50 p-3.5 rounded-2xl border border-blue-100">
                <span className="text-[11px] font-semibold uppercase text-cyan-700 block mb-1">Total Fatura Banco</span>
                <span className="text-base font-mono font-extrabold text-cyan-700">
                  R$ {detailBankInvoice.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Listas de Itens e Taxas Consolidados */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
              {/* Seção 1: Itens / Compras */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-blue-600" />
                  Compras e Lançamentos no Banco ({detailBankInvoice.items?.length || 0})
                </h4>
                <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-slate-100 text-slate-500 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Descrição</th>
                        <th className="py-3 px-4 text-center">Cartão</th>
                        <th className="py-3 px-4 text-center">Parcela</th>
                        <th className="py-3 px-4 text-center">Tipo</th>
                        <th className="py-3 px-4 text-right">Valor (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loadingDetail ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400">
                            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-blue-600" />
                            Carregando itens...
                          </td>
                        </tr>
                      ) : !detailBankInvoice.items || detailBankInvoice.items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400">
                            Nenhum item registrado.
                          </td>
                        </tr>
                      ) : (
                        detailBankInvoice.items.map((item, idx) => {
                          const amt = Number(item.originalAmount);
                          const isCredit = item.itemType === 'CREDIT' || amt < 0;
                          return (
                            <tr key={item.id || idx} className="hover:bg-slate-100/70">
                              <td className="py-2.5 px-4 font-medium text-slate-700">{item.description}</td>
                              <td className="py-2.5 px-4 text-center font-mono text-slate-500">
                                <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-semibold">
                                  •••• {item.cardLast4 || '0000'}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-center font-mono text-slate-500">
                                {item.totalInstallments > 1
                                  ? `${item.currentInstallment}/${item.totalInstallments}`
                                  : 'À vista'}
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    isCredit
                                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                      : 'bg-blue-100 text-blue-700 border border-blue-200'
                                  }`}
                                >
                                  {isCredit ? 'CRÉDITO' : 'COMPRA'}
                                </span>
                              </td>
                              <td
                                className={`py-2.5 px-4 text-right font-mono font-semibold ${
                                  isCredit ? 'text-emerald-700' : 'text-slate-700'
                                }`}
                              >
                                {isCredit ? '-' : ''}R${' '}
                                {Math.abs(amt).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Seção 2: Taxas, Encargos & Créditos */}
              {detailBankInvoice.fees && detailBankInvoice.fees.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-3 flex items-center gap-2">
                    <Percent className="w-4 h-4 text-amber-600" />
                    Encargos, Tarifas e Impostos ({detailBankInvoice.fees.length})
                  </h4>
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-xs font-sans">
                      <thead className="bg-slate-100 text-slate-500 uppercase text-[10px] tracking-wider font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">Descrição</th>
                          <th className="py-3 px-4 text-center">Cartão</th>
                          <th className="py-3 px-4 text-center">Categoria</th>
                          <th className="py-3 px-4 text-right">Valor (R$)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailBankInvoice.fees.map((fee, idx) => (
                          <tr key={fee.id || idx} className="hover:bg-slate-100/70">
                            <td className="py-2.5 px-4 font-medium text-slate-700">{fee.description}</td>
                            <td className="py-2.5 px-4 text-center font-mono text-slate-500">
                              <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-semibold">
                                •••• {fee.cardLast4 || '0000'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 uppercase">
                                {fee.feeType}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-semibold text-amber-700">
                              + R$ {Number(fee.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 mt-4">
              <button
                onClick={() => handleTogglePaidBankInvoice(detailBankInvoice)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer border ${
                  detailBankInvoice.isPaid
                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                {detailBankInvoice.isPaid ? 'Marcar como Não Pago' : 'Marcar como Pago'}
              </button>

              <button
                onClick={() => setDetailBankInvoice(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors duration-200 shadow-sm cursor-pointer border border-slate-200"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão por Banco */}
      {bankInvoiceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md glass-modal rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-50 rounded-2xl border border-red-100 text-red-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Excluir Fatura do Banco</h3>
                <p className="text-xs text-slate-500">
                  {bankInvoiceToDelete.bankName} ({formatMonthLabel(bankInvoiceToDelete.monthYear)})
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Tem certeza que deseja excluir a fatura de{' '}
              <strong className="text-slate-900">
                R$ {bankInvoiceToDelete.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </strong>{' '}
              do <strong className="text-slate-900">{bankInvoiceToDelete.bankName}</strong> ({bankInvoiceToDelete.cards.length} {bankInvoiceToDelete.cards.length === 1 ? 'cartão' : 'cartões'})?
            </p>

            <div className="p-3 bg-red-50 border border-red-100 rounded-xl mb-5 text-xs text-red-600">
              ⚠️ Esta ação removerá do banco de dados MySQL todas as faturas e lançamentos vinculados a este banco neste mês.
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setBankInvoiceToDelete(null)}
                disabled={deleting}
                className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-900 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteBankInvoice}
                disabled={deleting}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-colors duration-200 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão em Lote */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md glass-modal rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-50 rounded-2xl border border-red-100 text-red-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Excluir {selectedBankInvoiceKeys.length} Faturas de Bancos</h3>
                <p className="text-xs text-slate-500">Exclusão permanente em lote</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Você selecionou <strong className="text-slate-900">{selectedBankInvoiceKeys.length} faturas consolidadas de bancos</strong> para exclusão.
            </p>

            <div className="p-3 bg-red-50 border border-red-100 rounded-xl mb-5 text-xs text-red-600">
              ⚠️ Esta operação removerá em cascata todas as faturas, compras e tarifas do MySQL.
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-900 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteBulkBankInvoices}
                disabled={deleting}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-colors duration-200 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Excluindo...' : `Excluir ${selectedBankInvoiceKeys.length} Faturas de Bancos`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};