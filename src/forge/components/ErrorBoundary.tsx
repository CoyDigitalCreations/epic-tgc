import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex items-center justify-center min-h-[200px] bg-surface border border-red-500/30 rounded-xl p-6">
            <div className="text-center">
              <p className="text-3xl mb-2">⚠️</p>
              <p className="text-red-400 font-display text-lg mb-1">Algo salió mal</p>
              <p className="text-gray-500 text-sm mb-3">
                {this.state.error?.message ?? 'Error inesperado'}
              </p>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="bg-surface-2 hover:bg-card-border text-gray-300 px-4 py-1.5 rounded text-sm transition-colors cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}
