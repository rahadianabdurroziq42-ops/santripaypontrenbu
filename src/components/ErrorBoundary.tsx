import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
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
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-2xl mx-auto my-12 bg-white rounded-2xl border border-rose-200 shadow-md text-center">
          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            {this.props.fallbackTitle || 'Terjadi Kendala Memuat Tampilan'}
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            {this.state.error?.message || 'Gagal memproses data akuntansi.'}
          </p>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Muat Ulang Tampilan</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
