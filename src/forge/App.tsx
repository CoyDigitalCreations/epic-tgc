import { Link } from 'react-router'
import { CardForm } from './components/CardForm'
import { CardPreview } from './components/CardPreview'
import { CardList } from './components/CardList'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useCardStore } from './store/useCardStore'

function App() {
  useKeyboardShortcuts()
  const updateDraft = useCardStore((s) => s.updateDraft)

  return (
    <div className="min-h-screen bg-[#0d0d14] text-gray-100 font-body">
      {/* Header */}
      <header className="border-b border-card-border bg-surface">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-100 tracking-wider">
              Éter Forge
            </h1>
            <p className="text-xs text-gray-500 font-body">Card Creator — Alpha</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <span>744 × 1038 px</span>
            <span className="w-1 h-1 bg-gray-600 rounded-full" />
            <span>Éter Engine</span>
            <span className="w-1 h-1 bg-gray-600 rounded-full" />
            <Link
              to="/"
              className="bg-ether-600/20 hover:bg-ether-600/40 text-ether-200 px-3 py-1.5 rounded transition-colors"
            >
              ← Inicio
            </Link>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-6">
          {/* Left: Form */}
          <section className="bg-surface border border-card-border rounded-xl p-5 h-fit">
            <ErrorBoundary>
              <CardForm />
            </ErrorBoundary>
          </section>

          {/* Right: Preview + Collection */}
          <section className="flex flex-col gap-6">
            {/* Preview */}
            <div className="bg-surface border border-card-border rounded-xl p-6 flex justify-center">
              <ErrorBoundary>
                <CardPreview
                  editable
                  onImageChange={(dataUrl) => updateDraft('imageUrl', dataUrl)}
                />
              </ErrorBoundary>
            </div>

            {/* Collection */}
            <div className="bg-surface border border-card-border rounded-xl p-5">
              <ErrorBoundary>
                <CardList />
              </ErrorBoundary>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-card-border bg-surface mt-8">
        <div className="max-w-7xl mx-auto px-6 py-3 text-center text-xs text-gray-600">
          Éter Forge — Éter Engine TCG Card Creator
        </div>
      </footer>
    </div>
  )
}

export default App
