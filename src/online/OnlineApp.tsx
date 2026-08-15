import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useCardStore } from '../forge/store/useCardStore'
import { ALL_CARDS } from '../shared/data/paquetes'
import { registrarCartas, visibleState } from './game'
import { MAZOS, mazoParaBot } from './mazos'
import { useMazosStore, type MazoPersonalizado } from './useMazosStore'
import { usePartida, type PartidaConfig } from './usePartida'
import { Tablero } from './components/Tablero'
import { MazoEditor } from './components/MazoEditor'

/** Selección del humano: un set preestablecido o un mazo personalizado guardado. */
type MazoSeleccionado =
  | { tipo: 'set'; id: 'estasis' | 'disonancia' }
  | { tipo: 'custom'; id: string }

/**
 * Éter Online — modo vs bot (local).
 * Menú: elegir mazo (set preestablecido o personalizado armado en el editor) y
 * seed (reproducibilidad). Los sets juegan SIEMPRE con los diseños originales
 * (efectos keyed por cardId); la colección local de la forja solo alimenta el
 * editor del mazo personalizado (las cartas custom con id nuevo juegan sin su
 * texto de efecto hasta que el motor soporte efectos dinámicos).
 * Partida: el humano es SIEMPRE el jugador A; el bot (B) juega solo.
 */
export default function OnlineApp() {
  const [enPartida, setEnPartida] = useState(false)
  const [enEditor, setEnEditor] = useState(false)
  const [mazoHumano, setMazoHumano] = useState<MazoSeleccionado>({ tipo: 'set', id: 'estasis' })
  const [mazoEditando, setMazoEditando] = useState<MazoPersonalizado | undefined>(undefined)
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 100_000))
  const coleccion = useCardStore((s) => s.cards)
  const mazosPersonalizados = useMazosStore((s) => s.mazosPersonalizados)

  // El catálogo del motor debe resolver las cartas custom ANTES de la partida.
  // Solo las custom con id FUERA de ALL_CARDS se registran: los sets quedan
  // puros (un rediseño con id de diseño no debe contaminar el set original).
  useEffect(() => {
    const idsDiseno = new Set(ALL_CARDS.map((c) => c.id))
    registrarCartas(coleccion.filter((c) => !idsDiseno.has(c.id)))
  }, [coleccion])

  const mazoCustomElegido: MazoPersonalizado | undefined =
    mazoHumano.tipo === 'custom'
      ? mazosPersonalizados.find((m) => m.id === mazoHumano.id)
      : undefined

  const empezar = () => setEnPartida(true)
  const salir = () => {
    setEnPartida(false)
    setSeed(Math.floor(Math.random() * 100_000))
  }

  if (enEditor) {
    return (
      <MazoEditor
        inicial={mazoEditando}
        onGuardar={(mazo) => {
          if (mazoEditando) {
            useMazosStore.getState().actualizarMazo(mazoEditando.id, mazo.cardIds)
            useMazosStore.getState().renombrarMazo(mazoEditando.id, mazo.nombre)
          } else {
            useMazosStore.getState().agregarMazo(mazo)
          }
          setMazoEditando(undefined)
          setEnEditor(false)
        }}
        onCancelar={() => {
          setMazoEditando(undefined)
          setEnEditor(false)
        }}
      />
    )
  }

  if (!enPartida) {
    return (
      <Menu
        mazoHumano={mazoHumano}
        onMazo={setMazoHumano}
        mazosPersonalizados={mazosPersonalizados}
        onNuevoMazo={() => {
          setMazoEditando(undefined)
          setEnEditor(true)
        }}
        onEditarMazo={(m) => {
          setMazoEditando(m)
          setEnEditor(true)
        }}
        seed={seed}
        onSeed={setSeed}
        onEmpezar={empezar}
      />
    )
  }

  const deckA =
    mazoCustomElegido?.cardIds ??
    MAZOS.find((m) => m.id === mazoHumano.id)?.cardIds ??
    MAZOS[0].cardIds
  const setHumano = mazoHumano.tipo === 'custom' ? 'custom' : mazoHumano.id
  const deckB = mazoParaBot(seed, setHumano).cardIds
  const config: PartidaConfig = { deckA, deckB, seed, delayMs: 350 }
  const keyPartida = `${mazoHumano.tipo}:${mazoHumano.id}-${seed}-${mazoCustomElegido?.cardIds.length ?? 0}`
  return (
    <Partida key={keyPartida} config={config} onAbandonar={salir} />
  )
}

function Partida({ config, onAbandonar }: { config: PartidaConfig; onAbandonar: () => void }) {
  const partida = usePartida(config)
  const vista = useMemo(() => visibleState(partida.estado, 'A'), [partida.estado])
  return (
    <Tablero
      vista={vista}
      acciones={partida.acciones}
      leTocaA={partida.leTocaA}
      log={partida.log}
      onAccion={partida.ejecutar}
      onAbandonar={onAbandonar}
    />
  )
}

interface MenuProps {
  mazoHumano: MazoSeleccionado
  onMazo: (m: MazoSeleccionado) => void
  mazosPersonalizados: MazoPersonalizado[]
  onNuevoMazo: () => void
  onEditarMazo: (m: MazoPersonalizado) => void
  seed: number
  onSeed: (n: number) => void
  onEmpezar: () => void
}

function Menu({
  mazoHumano,
  onMazo,
  mazosPersonalizados,
  onNuevoMazo,
  onEditarMazo,
  seed,
  onSeed,
  onEmpezar,
}: MenuProps) {
  const seleccionado = (id: string) =>
    mazoHumano.tipo === 'set' ? mazoHumano.id === id : false

  return (
    <div className="min-h-screen bg-[#0d0d14] text-gray-100 font-body">
      <header className="border-b border-card-border bg-surface">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-100 tracking-wider">Éter Online</h1>
            <p className="text-xs text-gray-500 font-body">Modo en línea · partida local vs bot</p>
          </div>
          <Link
            to="/"
            className="bg-ether-600/20 hover:bg-ether-600/40 text-ether-200 px-3 py-1.5 rounded transition-colors text-xs"
          >
            ← Inicio
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <h2 className="font-display text-xl text-ether-200 mb-6">Nueva partida</h2>

        <p className="text-sm text-gray-400 mb-3">Elegí tu mazo:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mb-4">
          {MAZOS.map((mazo) => {
            const sel = seleccionado(mazo.id)
            return (
              <button
                key={mazo.id}
                onClick={() => onMazo({ tipo: 'set', id: mazo.id })}
                className={`text-left bg-surface-2 border rounded-lg p-5 transition-all cursor-pointer
                  ${sel ? 'border-ether-400 ring-1 ring-ether-400' : 'border-card-border hover:border-gray-500'}`}
              >
                <p className="font-display text-lg font-bold" style={{ color: mazo.color }}>
                  {mazo.nombre}
                </p>
                <p className="text-[11px] text-gray-500 mt-1">
                  {mazo.cardIds.length} cartas · facción {mazo.id === 'estasis' ? 'Orden' : 'Caos'}
                </p>
              </button>
            )
          })}
        </div>

        {/* Mazos personalizados guardados */}
        {mazosPersonalizados.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mb-4">
            {mazosPersonalizados.map((mazo) => {
              const sel = mazoHumano.tipo === 'custom' && mazoHumano.id === mazo.id
              return (
                <div
                  key={mazo.id}
                  className={`bg-surface-2 border rounded-lg p-5 transition-all
                    ${sel ? 'border-ether-400 ring-1 ring-ether-400' : 'border-card-border'}`}
                >
                  <button
                    onClick={() => onMazo({ tipo: 'custom', id: mazo.id })}
                    className="text-left w-full cursor-pointer"
                  >
                    <p className="font-display text-lg font-bold text-ether-200">{mazo.nombre}</p>
                    <p className="text-[11px] text-gray-500 mt-1">
                      {mazo.cardIds.length} cartas · personalizado
                    </p>
                  </button>
                  <button
                    onClick={() => onEditarMazo(mazo)}
                    className="mt-2 text-xs bg-surface hover:bg-card-border text-gray-300 px-3 py-1.5 rounded transition-colors cursor-pointer"
                  >
                    Editar
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <button
          onClick={onNuevoMazo}
          className="mb-8 text-xs bg-ether-600/20 hover:bg-ether-600/40 text-ether-200 px-4 py-2 rounded transition-colors cursor-pointer"
        >
          + Nuevo mazo personalizado
        </button>

        <div className="flex items-center gap-3 mb-8 max-w-2xl">
          <label htmlFor="seed" className="text-sm text-gray-400">
            Seed:
          </label>
          <input
            id="seed"
            type="number"
            value={seed}
            onChange={(e) => onSeed(Number(e.target.value) || 0)}
            className="bg-surface-2 border border-card-border rounded-lg px-3 py-2 text-sm text-gray-100 w-40
                       focus:outline-none focus:border-ether-400 transition-colors"
          />
          <p className="text-[11px] text-gray-600">
            Mismo seed + mismas decisiones → misma partida.
            {mazoHumano.tipo === 'custom' && ' Con mazo personalizado el bot elige su set según el seed.'}
          </p>
        </div>

        <button
          onClick={onEmpezar}
          className="bg-ether-600 hover:bg-ether-500 text-white px-8 py-3 rounded-lg font-display tracking-wider transition-colors cursor-pointer"
        >
          Comenzar partida
        </button>
      </main>
    </div>
  )
}
