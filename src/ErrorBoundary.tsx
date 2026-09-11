import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Error in React Component Tree:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-6 text-slate-100 font-sans">
          <div className="max-w-md w-full glass-modal p-8 rounded-3xl border border-slate-800 shadow-2xl text-center space-y-5">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto text-red-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white mb-2">Ops! Ocorreu um erro inesperado</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                {this.state.error?.message || 'A interface encontrou uma inconsistência ao renderizar os dados.'}
              </p>
            </div>

            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-left text-[11px] font-mono text-red-300 max-h-32 overflow-y-auto custom-scrollbar">
              {this.state.error?.stack || this.state.error?.toString()}
            </div>

            <button
              onClick={this.handleReload}
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-500/25"
            >
              <RefreshCw className="w-4 h-4" />
              Recarregar Aplicação
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
