import React from 'react';
import Button from './ui/Button';
import Card from './ui/Card';

/**
 * Error Boundary component to catch and display errors gracefully
 * Prevents entire app from crashing
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Send error to monitoring service (optional)
    if (window.__onErrorBoundary) {
      window.__onErrorBoundary(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
          <Card className="w-full max-w-2xl border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-950/20">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <svg
                  className="h-6 w-6 text-red-600 dark:text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-red-900 dark:text-red-100">
                  Oops! Something went wrong
                </h1>
                <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                  We encountered an unexpected error. Try refreshing the page or go back to the dashboard.
                </p>

                {isDevelopment && this.state.error && (
                  <details className="mt-4 border-t border-red-200 pt-4 dark:border-red-900/50">
                    <summary className="cursor-pointer font-mono text-sm font-semibold text-red-800 dark:text-red-200">
                      Error Details (Development Only)
                    </summary>
                    <pre className="mt-2 overflow-auto rounded bg-red-100 p-3 text-xs text-red-900 dark:bg-red-900/30 dark:text-red-100">
                      {this.state.error.toString()}
                    </pre>
                    {this.state.errorInfo && (
                      <pre className="mt-2 overflow-auto rounded bg-red-100 p-3 text-xs text-red-900 dark:bg-red-900/30 dark:text-red-100">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </details>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button variant="primary" onClick={this.resetError}>
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={() => (window.location.href = '/dashboard')}>
                    Go to Dashboard
                  </Button>
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    Refresh Page
                  </Button>
                </div>

                {this.state.errorCount > 3 && (
                  <p className="mt-4 text-xs text-red-600 dark:text-red-400">
                    Multiple errors detected. Please contact support if the issue persists.
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
