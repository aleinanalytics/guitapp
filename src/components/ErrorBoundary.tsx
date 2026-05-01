import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Link } from 'react-router-dom'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: { componentStack: string } | null
}

/**
 * ErrorBoundary captura errores de React y muestra UI graceful
 * en lugar de dejar la app en blanco.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    this.setState({ errorInfo })

    // Log para debugging (en producción, enviar a servicio como Sentry)
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, errorInfo)
    }
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  override render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-error/10">
              <AlertTriangle className="h-8 w-8 text-error" />
            </div>

            <h1 className="mb-2 text-xl font-bold text-on-surface">
              Algo salió mal
            </h1>

            <p className="mb-6 text-sm text-on-surface-variant">
              Hubo un error inesperado. Podés intentar recargar la página o volver al inicio.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 rounded-lg border border-error/20 bg-error/5 p-4 text-left">
                <p className="mb-2 text-xs font-medium text-error">
                  {this.state.error.name}: {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <pre className="max-h-32 overflow-auto text-[10px] text-error/80 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={this.handleReload}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-on-primary transition-all hover:opacity-90 active:scale-95"
              >
                <RefreshCw size={18} />
                Recargar página
              </button>

              <Link
                to="/"
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline bg-transparent px-6 py-3 text-sm font-medium text-on-surface transition-all hover:bg-surface-container active:scale-95"
              >
                <Home size={18} />
                Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * HOC para envolver componentes con ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}
