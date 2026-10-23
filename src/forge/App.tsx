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
    <div className="relative min-h-screen overflow-x-clip bg-[#0a0a12] text-gray-100 font-body">
      {/* Ambiente: mismo resplandor que el resto de la app */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 30% at 50% -5%, rgba(64,64,255,0.14), transparent 70%), radial-gradient(ellipse 40% 30% at 100% 100%, rgba(168,85,247,0.06), transparent 70%)',
        }}
      />
      {/* Header */}
      <header className="relative border-b border-card-border/70 bg-surface/90">
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
      <main className="relative max-w-[1600px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-[380px_320px_minmax(0,1fr)] gap-6">
          {/* Left: Form */}
          <section className="rounded-2xl border border-card-border bg-surface/95 p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] h-fit">
            <ErrorBoundary>
              <CardForm />
            </ErrorBoundary>
          </section>

          {/* Middle: Preview (sticky) */}
          <section className="rounded-2xl border border-card-border bg-surface/95 p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] h-fit xl:sticky xl:top-6">
            <ErrorBoundary>
              <CardPreview
                editable
                onImageChange={(dataUrl) => updateDraft('imageUrl', dataUrl)}
              />
            </ErrorBoundary>
          </section>

          {/* Right: Collection */}
          <section className="rounded-2xl border border-card-border bg-surface/95 p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]">
            <ErrorBoundary>
              <CardList />
            </ErrorBoundary>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative mt-8 border-t border-card-border/70 bg-surface/90">
        <div className="max-w-7xl mx-auto px-6 py-3 text-center text-xs text-gray-600">
          Éter Forge — Éter Engine TCG Card Creator
        </div>
      </footer>
    </div>
  )
}

export default App
