import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header.js';
import { PdfUploader } from './components/PdfUploader.js';
import { ConfirmationModal } from './components/ConfirmationModal.js';
import { CreditCardWidget } from './components/CreditCardWidget.js';
import { MultiSelectCardFilter } from './components/MultiSelectCardFilter.js';
import { PredictabilityChart } from './components/PredictabilityChart.js';
import { PieChartByBank, PieChartByCard } from './components/PieCharts.js';
import { DateRangePicker } from './components/DateRangePicker.js';
import { InvoiceManagement } from './components/InvoiceManagement.js';
import { ReportStats } from './components/ReportStats.js';
import { BankBarChart } from './components/BankBarChart.js';
import { Card, ParseResponse, PredictabilityReportData } from './types/index.js';
import {
  CreditCard as CardIcon,
  TrendingUp,
  Calendar,
  Wallet,
  CheckCircle,
  Plus,
  RefreshCw,
  Zap,
  CalendarRange,
  PieChart,
} from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'invoices' | 'import' | 'cards'>('dashboard');
  const [apiKey, setApiKey] = useState<string>('');

  // Lista de cartões cadastrados
  const [cards, setCards] = useState<Card[]>([]);

  // Filtro de multi-seleção de cartões (IDs dos cartões selecionados)
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);

  // Filtro de período (date range) para o relatório de previsibilidade (YYYY-MM)
  const [periodFrom, setPeriodFrom] = useState<string | null>(null);
  const [periodTo, setPeriodTo] = useState<string | null>(null);

  // Filtro de status de pagamento para o relatório ('all' | 'paid' | 'unpaid')
  const [reportStatus, setReportStatus] = useState<string>('all');

  // Dados do Relatório de Previsibilidade
  const [reportData, setReportData] = useState<PredictabilityReportData | null>(null);
  const [loadingReport, setLoadingReport] = useState<boolean>(false);

  // Resposta do Parser para o Modal de Confirmação
  const [parseResponse, setParseResponse] = useState<ParseResponse | null>(null);

  // Toast de Sucesso
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchCards = useCallback(async () => {
    try {
      const res = await fetch('/api/cards');
      const json = await res.json();
      if (json.success) {
        const fetchedCards: Card[] = json.cards || [];
        setCards(fetchedCards);
        // Limpar cartões selecionados que não existem mais no cadastro
        setSelectedCardIds((prev) => prev.filter((id) => fetchedCards.some((c) => c.id === id)));
      }
    } catch (err) {
      console.error('Erro ao buscar cartões:', err);
    }
  }, []);

  const fetchReport = useCallback(async (fromOverride?: string | null, toOverride?: string | null) => {
    setLoadingReport(true);
    try {
      const params = new URLSearchParams();
      if (selectedCardIds.length > 0) {
        params.append('cardIds', selectedCardIds.join(','));
      }
      const f = fromOverride !== undefined ? fromOverride : periodFrom;
      const t = toOverride !== undefined ? toOverride : periodTo;
      if (f) params.append('from', f);
      if (t) params.append('to', t);
      if (reportStatus !== 'all') params.append('status', reportStatus);

      const query = params.toString();
      const res = await fetch(`/api/reports/predictability${query ? `?${query}` : ''}`);
      const json = await res.json();
      if (json.success) {
        setReportData(json);
      }
    } catch (err) {
      console.error('Erro ao buscar relatório:', err);
    } finally {
      setLoadingReport(false);
    }
  }, [selectedCardIds, periodFrom, periodTo, reportStatus]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleRangeChange = (from: string | null, to: string | null) => {
    setPeriodFrom(from);
    setPeriodTo(to);
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm('Deseja realmente excluir este cartão e todas as suas faturas?')) return;
    try {
      const res = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
      if (res.ok) {
        setCards(cards.filter((c) => c.id !== cardId));
        setSelectedCardIds(selectedCardIds.filter((id) => id !== cardId));
        showToast('Cartão removido com sucesso.');
      }
    } catch (err) {
      console.error('Erro ao excluir cartão:', err);
    }
  };

  const handleInvoiceParsed = (response: ParseResponse) => {
    setParseResponse(response);
  };

  const handleConfirmedSave = () => {
    setParseResponse(null);
    showToast('Fatura confirmada e gravada com sucesso no MySQL!');
    fetchCards();
    fetchReport();
    setActiveTab('dashboard');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Header Fixo */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        apiKey={apiKey}
        setApiKey={setApiKey}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 bg-emerald-600 text-white font-bold text-sm rounded-2xl shadow-lg transition-all duration-300">
          <CheckCircle className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Conteúdo Principal */}
      <main className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ABA 1: DASHBOARD & PREVISIBILIDADE */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">

            {/* PARTE 1: FILTROS FIXOS NO TOPO (Cartões + Período) */}
            <div className="sticky top-[84px] z-30  p-6 rounded-3xl space-y-5 shadow-md border border-slate-200/90 bg-white/80 backdrop-blur-lg  transition-all duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                    <CardIcon className="w-5 h-5 text-blue-600" />
                    Filtros do Relatório
                  </h2>
                  <p className="text-xs text-slate-500">
                    Selecione os cartões e o período para consolidar no relatório de previsibilidade
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('import')}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-2xl transition-colors duration-200 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Nova Fatura PDF
                </button>
              </div>

              <div className="border-t border-slate-100 pt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-end">
                <div className="lg:col-span-1">
                  <MultiSelectCardFilter
                    cards={cards}
                    selectedCardIds={selectedCardIds}
                    onChangeSelection={setSelectedCardIds}
                  />
                </div>

                <div className="lg:col-span-1">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Status Pago
                  </label>
                  <select
                    value={reportStatus}
                    onChange={(e) => setReportStatus(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-slate-900 text-xs font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="paid">Pago</option>
                    <option value="unpaid">Não Pago</option>
                  </select>
                </div>

                <div className="lg:col-span-1">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                    <CalendarRange className="w-3.5 h-3.5 text-blue-600" />
                    Período
                  </label>
                  <div className="flex items-center gap-2">
                    <DateRangePicker
                      valueFrom={periodFrom}
                      valueTo={periodTo}
                      onChange={handleRangeChange}
                    />
                    <button
                      onClick={() => handleRangeChange(null, null)}
                      className="shrink-0 px-3 py-2.5 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl border border-slate-200 transition-colors duration-200 cursor-pointer"
                      title="Limpar período"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingReport ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* PARTE 2: KPIs EXECUTIVOS (Financeiro, PM & UI/UX Pro Max) */}
            <ReportStats
              reportData={reportData}
              loading={loadingReport}
              cardsCount={cards.length}
              selectedCardsCount={selectedCardIds.length}
            />

            {/* PARTE 3 + 4: Conteúdo principal (3/4) + Pizzas (1/4) */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">

              {/* Coluna principal: Gráfico de Projeção */}
              <div className="lg:col-span-3 space-y-8">
                <div className="glass-card p-6 sm:p-8 rounded-3xl">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">Curva de Previsibilidade de Faturas</h3>
                      <p className="text-xs text-slate-500">Projeção temporal dos parcelamentos nos próximos meses</p>
                    </div>

                    <button
                      onClick={() => fetchReport()}
                      className="p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors duration-200 cursor-pointer"
                      title="Atualizar relatório"
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingReport ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {reportData && reportData.monthlySummary.length > 0 ? (
                    <PredictabilityChart data={reportData.monthlySummary} />
                  ) : (
                    <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
                      Sem dados para exibir no gráfico. Importe uma fatura PDF.
                    </div>
                  )}
                </div>

                {/* Gráfico de Barras: Total por Banco */}
                <BankBarChart data={reportData?.monthlySummary ?? []} />
              </div>

              {/* Coluna lateral: Gráficos pizza (1/4) */}
              <div className="lg:col-span-1 space-y-6">
                <div className="glass-card p-5 rounded-3xl">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 mb-4">
                    <PieChart className="w-4 h-4 text-blue-600" />
                    Distribuição por Banco
                  </h3>
                  <PieChartByBank data={reportData?.monthlySummary ?? []} />
                </div>

                <div className="glass-card p-5 rounded-3xl">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 mb-4">
                    <PieChart className="w-4 h-4 text-blue-600" />
                    Distribuição por Cartão
                  </h3>
                  <PieChartByCard data={reportData?.monthlySummary ?? []} />
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ABA 2: GERENCIAMENTO DE FATURAS */}
        {activeTab === 'invoices' && (
          <InvoiceManagement />
        )}

        {/* ABA 3: IMPORTAR FATURA PDF */}
        {activeTab === 'import' && (
          <div className="space-y-8 py-4">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2 className="text-3xl font-extrabold text-slate-900">Carregar Fatura PDF</h2>
              <p className="text-sm text-slate-500">
                O sistema lê o extrato da fatura, identifica o cartão (banco, bandeira, últimos dígitos) e projeta as parcelas restantes para os meses futuros no banco de dados MySQL.
              </p>
            </div>

            <PdfUploader apiKey={apiKey} onInvoiceParsed={handleInvoiceParsed} />
          </div>
        )}

        {/* ABA 4: MEUS CARTÕES */}
        {activeTab === 'cards' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Cartões Cadastrados ({cards.length})</h2>
                <p className="text-xs text-slate-500">Gerencie os cartões identificados automaticamente pelas faturas</p>
              </div>

              <button
                onClick={() => setActiveTab('import')}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-2xl transition-colors duration-200 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Cadastrar via Fatura PDF
              </button>
            </div>

            {cards.length === 0 ? (
              <div className="glass-card p-12 rounded-3xl text-center space-y-4">
                <CardIcon className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-lg font-bold text-slate-900">Nenhum cartão cadastrado ainda</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Carregue uma fatura PDF de qualquer banco para que o sistema cadastre o cartão automaticamente.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card) => (
                  <div key={card.id} className="relative group">
                    <CreditCardWidget card={card} isSelected={true} />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCard(card.id);
                      }}
                      className="absolute top-4 right-4 z-20 p-2 bg-slate-900/70 hover:bg-red-600 text-white rounded-xl backdrop-blur-md transition-all duration-200 opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Excluir Cartão"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Modal de Confirmação (Human-in-the-loop) */}
      {parseResponse && (
        <ConfirmationModal
          parseResponse={parseResponse}
          onClose={() => setParseResponse(null)}
          onConfirmed={handleConfirmedSave}
        />
      )}
    </div>
  );
}