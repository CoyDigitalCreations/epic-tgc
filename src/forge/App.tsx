import { useState } from 'react'
import { Link } from 'react-router'
import { CardForm } from './components/CardForm'
import { CardPreview } from './components/CardPreview'
import { CardList } from './components/CardList'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useCardStore } from './store/useCardStore'

const CLAVE_PLEGADA = 'forge:coleccion-plegada'

/** La colección plegada se recuerda entre sesiones (solo comodidad: si el almacenamiento falla, arranca desplegada). */
function leerPlegada(): boolean {
  try {
    return localStorage.getItem(CLAVE_PLEGADA) === '1'
  } catch {
    return false
  }
}

const PANEL = 'rounded-2xl border border-card-border bg-surface/95 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]'

function App() {
  useKeyboardShortcuts()
  const updateDraft = useCardStore((s) => s.updateDraft)
  const totalCartas = useCardStore((s) => s.cards.length)
  const [plegada, setPlegada] = useState(leerPlegada)

  const alternarColeccion = () => {
    setPlegada((actual) => {
      try {
        localStorage.setItem(CLAVE_PLEGADA, actual ? '0' : '1')
      } catch {
        /* sin almacenamiento: solo se pierde el recuerdo */
      }
      return !actual
    })
  }

  return (
    // En pantallas grandes (xl) la página ocupa exactamente la ventana y cada columna hace scroll POR DENTRO:
    // la carta de la vista previa nunca se mueve. Por debajo de xl se apila y la página hace scroll como siempre.
    <div className="relative flex min-h-screen flex-col overflow-x-clip bg-[#0a0a12] font-body text-gray-100 xl:h-screen xl:overflow-hidden">
      {/* Ambiente: mismo resplandor que el resto de la app */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 30% at 50% -5%, rgba(64,64,255,0.14), transparent 70%), radial-gradient(ellipse 40% 30% at 100% 100%, rgba(168,85,247,0.06), transparent 70%)',
        }}
      />
      {/* Header delgado */}
      <header className="relative shrink-0 border-b border-card-border/70 bg-surface/90">
        <div className="mx-auto flex items-center justify-between px-4 py-2">
          <div className="flex items-baseline gap-3">
            <h1 className="font-display text-lg font-bold tracking-wider text-gray-100">Éter Forge</h1>
            <p className="text-xs text-gray-500">Card Creator — Alpha</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-600">
            <span>744 × 1038 px</span>
            <span className="h-1 w-1 rounded-full bg-gray-600" />
            <span>Éter Engine</span>
            <span className="h-1 w-1 rounded-full bg-gray-600" />
            <Link
              to="/"
              className="rounded bg-ether-600/20 px-3 py-1 text-ether-200 transition-colors hover:bg-ether-600/40"
            >
              ← Inicio
            </Link>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="relative min-h-0 flex-1 px-4 py-4">
        <div
          className={`grid h-full min-h-0 grid-cols-1 gap-4 ${
            plegada
              ? 'xl:grid-cols-[minmax(420px,1fr)_320px_44px]'
              : 'xl:grid-cols-[460px_320px_minmax(0,1fr)]'
          }`}
        >
          {/* Izquierda: formulario (maneja su propio scroll y su barra de acciones) */}
          <section className={`${PANEL} flex min-h-0 flex-col p-4`}>
            <ErrorBoundary>
              <CardForm />
            </ErrorBoundary>
          </section>

          {/* Centro: vista previa (la carta no se mueve) */}
          <section className={`${PANEL} min-h-0 p-4 xl:overflow-y-auto`}>
            <ErrorBoundary>
              <CardPreview
                editable
                onImageChange={(dataUrl) => updateDraft('imageUrl', dataUrl)}
              />
            </ErrorBoundary>
          </section>

          {/* Derecha: colección. Plegada, queda una tira; CardList sigue montado para no perder búsqueda ni filtros. */}
          <section className={`${PANEL} relative flex min-h-0 flex-col ${plegada ? 'p-0 xl:p-0' : 'p-4'}`}>
            <div className={plegada ? 'flex min-h-0 flex-1 flex-col xl:hidden' : 'flex min-h-0 flex-1 flex-col'}>
              <ErrorBoundary>
                <CardList onPlegar={alternarColeccion} />
              </ErrorBoundary>
            </div>
            {plegada && (
              <button
                type="button"
                onClick={alternarColeccion}
                title="Desplegar la colección"
                aria-label="Desplegar la colección"
                className="hidden h-full w-full cursor-pointer flex-col items-center gap-3 rounded-2xl py-3 text-xs text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-100 xl:flex"
              >
                <span aria-hidden="true">◀</span>
                <span className="font-display tracking-wider [writing-mode:vertical-rl]">Colección ({totalCartas})</span>
              </button>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

export default App
