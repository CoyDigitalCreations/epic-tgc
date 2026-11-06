import { useMemo, type KeyboardEvent, type ReactElement } from 'react'
import { Link } from 'react-router'
import { ALL_CARDS } from '../shared/data/paquetes'
import { cargarCartas } from './cargador'
import { FiltrosBalance } from './componentes/FiltrosBalance'
import { PanelReferencia } from './componentes/PanelReferencia'
import { filtrarCartas, type FiltrosBalance as ValoresFiltros } from './metricas'
import type { CartaBalance } from './tipos'
import { useFiltrosBalance, VISTAS, type VistaBalance } from './useFiltrosBalance'
import { useReferencia, type Referencia } from './useReferencia'
import { AnalisisCarta } from './vistas/AnalisisCarta'
import { Auditoria } from './vistas/Auditoria'
import { Comparador } from './vistas/Comparador'
import { CurvaCoste } from './vistas/CurvaCoste'
import { DispersionStats } from './vistas/DispersionStats'
import { MapaVerbos } from './vistas/MapaVerbos'
import { MatrizLetalidad } from './vistas/MatrizLetalidad'
import { PresupuestoCoste } from './vistas/PresupuestoCoste'
import { RankingPoder } from './vistas/RankingPoder'
import { ResumenMazo } from './vistas/ResumenMazo'

/** Las cartas publicadas, normalizadas una sola vez. La referencia (paquete de pruebas) NUNCA entra aquí. */
const CARGA = cargarCartas(ALL_CARDS)

/** Ids de las publicadas: la única carta que puede ir en la URL. */
const IDS_PUBLICADAS: ReadonlySet<string> = new Set(CARGA.cartas.map((c) => c.id))

const NOMBRE_VISTA: Record<VistaBalance, string> = {
  resumen: 'Resumen por mazo',
  dispersion: 'Dispersión de ATQ y RES',
  presupuesto: 'Presupuesto de stats',
  verbos: 'Mapa de verbos',
  ranking: 'Ranking de poder',
  curva: 'Curva de coste',
  letalidad: 'Matriz de letalidad',
  comparador: 'Comparador antes y después',
  auditoria: 'Auditoría',
  analisis: 'Análisis de carta',
}

/** Lo que las vistas reciben además de las cartas visibles: el análisis de carta lo necesita todo. */
interface ContextoVistas {
  filtros: ValoresFiltros
  carta: string | null
  setCarta: (id: string | null) => void
  /** Abre el análisis de una carta (cambia a su pestaña con la carta elegida). */
  analizar: (id: string) => void
  referencia: Referencia
}

function contenidoDe(vista: VistaBalance, visibles: CartaBalance[], ctx: ContextoVistas): ReactElement {
  const publicadas = CARGA.cartas
  switch (vista) {
    case 'resumen':
      return <ResumenMazo cartas={visibles} />
    case 'dispersion':
      return <DispersionStats cartas={visibles} />
    case 'presupuesto':
      return <PresupuestoCoste cartas={visibles} />
    case 'verbos':
      return <MapaVerbos cartas={visibles} />
    case 'ranking':
      return <RankingPoder cartas={visibles} onAnalizar={ctx.analizar} />
    case 'curva':
      return <CurvaCoste cartas={visibles} />
    case 'letalidad':
      return <MatrizLetalidad cartas={visibles} publicadas={publicadas} />
    case 'comparador':
      return <Comparador cartas={visibles} publicadas={publicadas} />
    case 'auditoria':
      return <Auditoria cartas={visibles} publicadas={publicadas} avisos={CARGA.avisos} onAnalizar={ctx.analizar} />
    case 'analisis':
      return (
        <AnalisisCarta
          cartas={visibles}
          publicadas={publicadas}
          filtros={ctx.filtros}
          carta={ctx.carta}
          onCarta={ctx.setCarta}
          referencia={ctx.referencia}
        />
      )
  }
}

const IDENTIFICADOR_PANEL = 'panel-vista-balance'
const idPestana = (v: VistaBalance) => `pestana-${v}`

/**
 * Tablero de balance: mide si cada carta tiene el poder que le corresponde por su coste y si
 * respeta la identidad de su mazo. Solo lectura. Filtros y vista activa viven en la URL.
 */
export default function Balance() {
  const { filtros, vista, carta, setVista, setCarta, analizar } = useFiltrosBalance(IDS_PUBLICADAS)
  const referencia = useReferencia()
  const { mazo, tipo, coste, rareza } = filtros
  const visibles = useMemo(() => filtrarCartas(CARGA.cartas, { mazo, tipo, coste, rareza }), [mazo, tipo, coste, rareza])

  const moverPestana = (e: KeyboardEvent<HTMLButtonElement>) => {
    const paso = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (paso === 0) return
    e.preventDefault()
    const siguiente = VISTAS[(VISTAS.indexOf(vista) + paso + VISTAS.length) % VISTAS.length]
    setVista(siguiente)
    queueMicrotask(() => document.getElementById(idPestana(siguiente))?.focus())
  }

  return (
    <div className="min-h-screen bg-[#0d0d14] font-body text-gray-100">
      <header className="border-b border-card-border/70 bg-surface/80">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <Link to="/" className="mb-2 inline-block text-sm text-gray-400 transition-colors hover:text-ether-200">
            ← Inicio
          </Link>
          <h1 className="font-display text-2xl font-bold tracking-wider text-gray-100">Tablero de balance</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-400">
            Mide si cada carta tiene el poder que le corresponde por su coste y si respeta la identidad de su mazo. Es de
            solo lectura: nada de lo que ves aquí modifica las cartas publicadas.
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <FiltrosBalance />
        <PanelReferencia referencia={referencia} />

        <div role="tablist" aria-label="Vistas del tablero" className="flex flex-wrap gap-2">
          {VISTAS.map((v) => {
            const activa = v === vista
            return (
              <button
                key={v}
                id={idPestana(v)}
                type="button"
                role="tab"
                aria-selected={activa}
                aria-controls={IDENTIFICADOR_PANEL}
                tabIndex={activa ? 0 : -1}
                onClick={() => setVista(v)}
                onKeyDown={moverPestana}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  activa
                    ? 'border-ether-400/70 bg-ether-500/15 text-ether-200'
                    : 'border-card-border text-gray-400 hover:bg-surface-2 hover:text-gray-100'
                }`}
              >
                {NOMBRE_VISTA[v]}
              </button>
            )
          })}
        </div>

        <div role="tabpanel" id={IDENTIFICADOR_PANEL} aria-labelledby={idPestana(vista)}>
          {contenidoDe(vista, visibles, { filtros, carta, setCarta, analizar, referencia })}
        </div>
      </main>
    </div>
  )
}
