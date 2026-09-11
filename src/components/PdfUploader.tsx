import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Lock,
  FileSearch,
  Building2,
  Cpu,
  Calculator,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  KeyRound,
  AlertCircle,
  FileText,
  Sparkles,
} from 'lucide-react';
import { ParseResponse } from '../types/index.js';

interface PdfUploaderProps {
  apiKey?: string;
  onInvoiceParsed: (response: ParseResponse, file: File) => void;
}

interface ImportStage {
  id: number;
  title: string;
  description: string;
  icon: React.ElementType;
}

const IMPORT_STAGES: ImportStage[] = [
  {
    id: 1,
    title: 'Lendo Arquivo e Verificando Criptografia',
    description: 'Carregando documento PDF e conferindo chaves salvas...',
    icon: FileSearch,
  },
  {
    id: 2,
    title: 'Solicitando Extração por IA (Tentativas 1 a 3)',
    description: 'Enviando fatura para análise inteligente de compras e parcelas...',
    icon: Sparkles,
  },
  {
    id: 3,
    title: 'Mapeando Banco e Cartões',
    description: 'Agrupando lançamentos por cartão (ex: Mercado Pago, Nubank, Itaú)...',
    icon: Building2,
  },
  {
    id: 4,
    title: 'Validação Matemática dos Totais',
    description: 'Conferindo a soma das compras contra o valor total do boleto...',
    icon: Calculator,
  },
  {
    id: 5,
    title: 'Fallback Determinístico Local',
    description: 'Verificando extratores locais de contingência se necessário...',
    icon: Cpu,
  },
  {
    id: 6,
    title: 'Conferência Concluída com Sucesso',
    description: 'Preparando lançamentos extraídos para revisão final...',
    icon: CheckCircle2,
  },
];

export const PdfUploader: React.FC<PdfUploaderProps> = ({ apiKey, onInvoiceParsed }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estados do Preloader por Etapas
  const [currentStageId, setCurrentStageId] = useState(1);
  const [progressPercent, setProgressPercent] = useState(8);

  // Estados para PDF protegido por senha
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startPreloadSimulation = () => {
    setCurrentStageId(1);
    setProgressPercent(8);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev >= 92) {
          return 92; // Pausa no 92% até a resposta do backend
        }
        const next = prev + Math.floor(Math.random() * 5) + 3;
        if (next >= 18 && next < 38) setCurrentStageId(2);
        else if (next >= 38 && next < 58) setCurrentStageId(3);
        else if (next >= 58 && next < 78) setCurrentStageId(4);
        else if (next >= 78 && next < 92) setCurrentStageId(5);
        return next;
      });
    }, 380);
  };

  const stopPreloadSimulation = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const processFile = async (file: File, password?: string) => {
    if (!file || file.type !== 'application/pdf') {
      setErrorMessage('Por favor, selecione um arquivo no formato PDF.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setCurrentFile(file);
    startPreloadSimulation();

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (apiKey) {
        formData.append('apiKey', apiKey);
      }
      if (password) {
        formData.append('password', password);
      }

      const res = await fetch('/api/parse-invoice', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      stopPreloadSimulation();

      // Caso o backend solicite a senha do PDF
      if (json.requiresPassword) {
        setShowPasswordModal(true);
        if (password) {
          setErrorMessage('Senha incorreta. Verifique e tente novamente (ex: CPF ou Data de Nascimento).');
        }
        setLoading(false);
        return;
      }

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Falha ao processar a fatura PDF.');
      }

      // Concluir no 100% (Etapa 6)
      setCurrentStageId(6);
      setProgressPercent(100);

      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordInput('');
        setLoading(false);
        onInvoiceParsed(json, file);
      }, 400);
    } catch (err: any) {
      stopPreloadSimulation();
      console.error(err);
      setErrorMessage(err.message || 'Erro inesperado ao ler a fatura PDF.');
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFile) return;
    if (!passwordInput.trim()) {
      setErrorMessage('Digite a senha da fatura.');
      return;
    }
    processFile(currentFile, passwordInput);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Área de Drop de Arquivo PDF */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !loading && fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-3xl p-10 text-center transition-all duration-300 glass-card border-2 border-dashed ${
          isDragging
            ? 'border-blue-500 bg-blue-50 scale-[1.01]'
            : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files && e.target.files.length > 0 && processFile(e.target.files[0])}
          accept="application/pdf"
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-4 glow-blue">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-extrabold text-slate-900 mb-2">
            Arraste sua fatura PDF aqui ou clique para buscar
          </h3>

          <p className="text-xs text-slate-500 max-w-md mb-4 leading-relaxed">
            Suporta faturas em PDF de qualquer banco (inclusive faturas protegidas por senha).
          </p>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            <span>Suporte automático para PDFs protegidos por senha</span>
          </div>
        </div>
      </div>

      {errorMessage && !showPasswordModal && !loading && (
        <div className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Modal de Preloader por Etapas */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm font-sans">
          <div className="w-full max-w-lg glass-modal rounded-3xl p-6 sm:p-8 border border-blue-100 shadow-xl space-y-6">
            {/* Cabeçalho do Preloader */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-blue-600 glow-blue">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    Importando Fatura PDF
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 font-mono">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span className="truncate max-w-[220px]">{currentFile?.name || 'documento.pdf'}</span>
                    <span>• {currentFile ? (currentFile.size / 1024).toFixed(0) : '0'} KB</span>
                  </p>
                </div>
              </div>
              <div className="text-right font-mono font-bold text-blue-600 text-lg">
                {progressPercent}%
              </div>
            </div>

            {/* Barra de Progresso Animada com Gradiente */}
            <div className="space-y-1.5">
              <div className="w-full bg-slate-100 rounded-full h-3 p-0.5 border border-slate-200 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-300 shadow-sm"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span>Processando leitura</span>
                <span>Etapa {currentStageId} de {IMPORT_STAGES.length}</span>
              </div>
            </div>

            {/* Lista das Etapas com Indicador Ativo */}
            <div className="space-y-3 pt-1">
              {IMPORT_STAGES.map((stage) => {
                const IconComponent = stage.icon;
                const isDone = stage.id < currentStageId;
                const isCurrent = stage.id === currentStageId;
                const isPending = stage.id > currentStageId;

                return (
                  <div
                    key={stage.id}
                    className={`flex items-start gap-3.5 p-3 rounded-2xl border transition-all duration-300 ${
                      isCurrent
                        ? 'bg-blue-50 border-blue-200 text-slate-900 scale-[1.01] shadow-sm'
                        : isDone
                        ? 'bg-slate-50 border-slate-200 text-slate-600 opacity-90'
                        : 'bg-white border-slate-100 text-slate-400 opacity-40'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl border shrink-0 mt-0.5 ${
                        isCurrent
                          ? 'bg-blue-100 border-blue-200 text-blue-600'
                          : isDone
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                      ) : (
                        <IconComponent className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4
                          className={`text-xs font-bold ${
                            isCurrent ? 'text-blue-700' : isDone ? 'text-slate-700' : 'text-slate-400'
                          }`}
                        >
                          {stage.title}
                        </h4>
                        {isCurrent && (
                          <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 animate-pulse">
                            Em Andamento
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-[11px] mt-0.5 leading-snug ${
                          isCurrent ? 'text-slate-600' : 'text-slate-500'
                        }`}
                      >
                        {stage.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Solicitação de Senha do PDF */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md glass-modal rounded-3xl p-6 sm:p-8 border border-amber-100 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 text-amber-600">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Fatura Protegida por Senha</h3>
                <p className="text-xs text-slate-500">{currentFile?.name}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Esta fatura PDF exige uma senha para ser aberta. Geralmente os bancos utilizam os primeiros dígitos do seu <strong className="text-slate-900">CPF</strong> ou sua <strong className="text-slate-900">Data de Nascimento (DDMMAAAA)</strong>.
            </p>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Senha da Fatura PDF</label>
                <div className="relative">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Digite a senha do PDF..."
                    autoFocus
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setErrorMessage(null);
                    setPasswordInput('');
                  }}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-900 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-extrabold rounded-xl transition-colors duration-200 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Desbloquear e Continuar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};