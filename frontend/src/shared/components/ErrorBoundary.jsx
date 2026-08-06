import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

// Must be a class component — React has no hook-based error boundary API
// (getDerivedStateFromError/componentDidCatch only exist on classes). This is
// the single app-wide safety net: without it, any render-time throw anywhere
// in the tree white-screens the whole app instead of showing a recoverable
// fallback. Deliberately one top-level boundary, not one per route — the app
// uses classic <Routes>/<Route> (react-router v7), not the data-router API
// that would give per-route errorElement boundaries for free, and adding
// that is a routing-architecture change outside this pass's scope.
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-canvas px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-500">
          <AlertTriangle size={22} strokeWidth={1.75} />
        </div>
        <p className="text-sm font-medium text-slate-700">Something went wrong</p>
        <p className="max-w-sm text-sm text-slate-500">
          The page hit an unexpected error. Reloading usually fixes it — if it keeps happening, let us know.
        </p>
        <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
          Reload page
        </Button>
      </div>
    );
  }
}
