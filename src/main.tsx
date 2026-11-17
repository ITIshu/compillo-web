import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Suppress harmless Vite HMR WebSocket connection closed warnings in container preview environment
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = String(event.reason?.message || event.reason || '');
    if (msg.includes('WebSocket closed without opened') || msg.includes('WebSocket')) {
      event.preventDefault();
    }
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element');
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error?.message || 'Unexpected error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-[#181818] text-[#cccccc] flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="max-w-md w-full p-6 rounded-xl border border-white/10 bg-black/30 space-y-4">
            <h2 className="text-base font-semibold text-white">Compillo Studio Recovered</h2>
            <p className="text-xs text-[#999999]">{this.state.errorMessage}</p>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg bg-[#007acc] hover:bg-[#0062a3] text-white text-xs font-medium transition-colors cursor-pointer"
              >
                Reload Workbench
              </button>
              <button
                onClick={() => {
                  try {
                    Object.keys(localStorage)
                      .filter((k) => k.startsWith('compillo_'))
                      .forEach((k) => localStorage.removeItem(k));
                  } catch {}
                  window.location.reload();
                }}
                className="px-4 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-medium transition-colors cursor-pointer"
              >
                Reset Local Cache &amp; Reload
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
