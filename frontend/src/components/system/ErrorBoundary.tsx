import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background-alt px-6">
          <div className="max-w-md w-full text-center">
            <div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={22} className="text-on-error-container" />
            </div>
            <h1 className="text-headline-md font-bold text-primary mb-2">Something went wrong</h1>
            <p className="text-body-sm text-on-surface-variant mb-6">
              {this.state.error.message || 'An unexpected error occurred while rendering this page.'}
            </p>
            <button
              onClick={() => {
                this.setState({ error: null });
                window.location.href = '/dashboard';
              }}
              className="btn-brand mx-auto"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
