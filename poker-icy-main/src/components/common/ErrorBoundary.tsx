import { Component, type ErrorInfo, type ReactNode } from 'react';
import { TriangleAlert as AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crashed while rendering', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-center shadow-2xl">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <h1 className="mt-5 text-xl font-semibold text-white">Something went wrong</h1>
          <p className="mt-2 text-sm text-slate-400">The page hit an unexpected problem. Reloading usually fixes it.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-gradient-to-b from-gold-300 to-gold-500 px-5 py-2.5 text-sm font-bold text-slate-900"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
