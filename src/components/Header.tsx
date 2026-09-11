import React, { useState } from 'react';
import { CreditCard, BarChart3, UploadCloud, Key, Sparkles, CheckCircle2, FileText } from 'lucide-react';

interface HeaderProps {
  activeTab: 'dashboard' | 'invoices' | 'import' | 'cards';
  setActiveTab: (tab: 'dashboard' | 'invoices' | 'import' | 'cards') => void;
  apiKey: string;
  setApiKey: (key: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, apiKey, setApiKey }) => {
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [inputKey, setInputKey] = useState(apiKey);

  const handleSaveKey = () => {
    setApiKey(inputKey);
    setShowKeyModal(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-card border-b border-slate-200 bg-white/85">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">

          {/* Logo & Marca */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-[2px] glow-blue">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
                Invoice<span className="text-blue-600">Track</span>
                <span className="text-[10px] font-semibold tracking-wider uppercase bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full">
                  MySQL Edition
                </span>
              </span>
              <p className="text-xs text-slate-500">Previsibilidade de Faturas de Cartão de Crédito</p>
            </div>
          </div>

          {/* Navegação por Abas */}
          <nav className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Relatório & Previsibilidade
            </button>

            <button
              onClick={() => setActiveTab('invoices')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === 'invoices'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <FileText className="w-4 h-4" />
              Faturas
            </button>

            <button
              onClick={() => setActiveTab('import')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === 'import'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              Importar Fatura PDF
            </button>

            <button
              onClick={() => setActiveTab('cards')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === 'cards'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Meus Cartões
            </button>
          </nav>

          {/* Status da IA & Configuração de Chave */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowKeyModal(true)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                apiKey
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {apiKey ? 'IA Conectada' : 'Configurar IA (Opcional)'}
            </button>
          </div>

        </div>
      </div>

      {/* Modal de Configuração de Chave de API de IA */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md glass-modal rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 text-amber-600">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Chave de API do Gemini</h3>
                <p className="text-xs text-slate-500">Extração inteligente com IA + Fallback Regex local</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Forneça sua chave de API para habilitar a extração avançada via Gemini API. Se deixado em branco, o sistema usará o <strong className="text-slate-900">Fallback Regex local</strong> perfeitamente.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Sua API Key do Google Gemini</label>
                <input
                  type="password"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-sm font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowKeyModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-900 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveKey}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors duration-200 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Salvar Chave
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};