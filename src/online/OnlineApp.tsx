import { useEffect, useMemo, useRef, useState } from 'react'
import { useCardStore } from '../forge/store/useCardStore'
import { importCardDataFromJson, importCollectionFromJson } from '../forge/utils/export-json'
import type { AnyCard } from '../shared/types'
import { registrarCartas, visibleState } from './game'
import { armarMazoConColeccion, MAZOS, type MazoConColeccion, type MazoJugable } from './mazos'
import { usePartida, type PartidaConfig } from './usePartida'
import { Tablero } from './components/Tablero'

/**
 * Éter Online — modo vs bot (local).
 * Menú: elegir mazo (el bot usa el otro) y seed (reproducibilidad).
 * La colección de Éter Forge se integra automáticamente: si creaste/importaste
 * cartas con el MISMO nombre que un diseño del paquete, ese diseño se reemplaza
 * por tu versión (mismo arte, mismo render que el creador). También podés
 * importar un JSON exportado desde la forja (coleccion-eter.json) o añadir
 * cartas terminadas por nombre (importa solo los datos, sin el arte embebido).
 * Partida: el humano es SIEMPRE el jugador A; el bot (B) juega solo.
 */
export default function OnlineApp() {
  const [enPartida, setEnPartida] = useState(false)
  const [mazoHumano, setMazoHumano] = useState<MazoJugable>(MAZOS[0])
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 100_000))
  const coleccion = useCardStore((s) => s.cards)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileInputTerminadasRef = useRef<HTMLInputElement>(null)

  // El catálogo del motor debe conocer las cartas custom ANTES de la partida.
  useEffect(() => {
    registrarCartas(coleccion)
  }, [coleccion])

  const mazosConColeccion = useMemo<MazoConColeccion[]>(
    () => MAZOS.map((m) => armarMazoConColeccion(m, coleccion)),
    [coleccion],
  )

  const empezar = () => setEnPartida(true)
  const salir = () => {
    setEnPartida(false)
    setSeed(Math.floor(Math.random() * 100_000))
  }

  if (!enPartida) {
    return (
      <Menu
        mazoHumano={mazoHumano}
        onMazo={setMazoHumano}
        mazos={mazosConColeccion}
        coleccion={coleccion}
        seed={seed}
        onSeed={setSeed}
        onEmpezar={empezar}
        fileRef={fileInputRef}
        fileTerminadasRef={fileInputTerminadasRef}
      />
    )
  }

  const mazoA = mazosConColeccion.find((m) => m.mazo.id === mazoHumano.id) ?? mazosConColeccion[0]
  const mazoB =
    mazosConColeccion.find((m) => m.mazo.id !== mazoHumano.id) ?? mazosConColeccion[1]
  const config: PartidaConfig = {
    deckA: mazoA.mazo.cardIds,
    deckB: mazoB.mazo.cardIds,
    seed,
    delayMs: 350,
  }
  return (
    <Partida
      key={`${mazoHumano.id}-${seed}-${coleccion.length}`}
      config={config}
      onAbandonar={salir}
    />
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
  mazoHumano: MazoJugable
  onMazo: (m: MazoJugable) => void
  mazos: MazoConColeccion[]
  coleccion: AnyCard[]
  seed: number
  onSeed: (n: number) => void
  onEmpezar: () => void
  fileRef: React.RefObject<HTMLInputElement | null>
  fileTerminadasRef: React.RefObject<HTMLInputElement | null>
}

function Menu({
  mazoHumano,
  onMazo,
  mazos,
  coleccion,
  seed,
  onSeed,
  onEmpezar,
  fileRef,
  fileTerminadasRef,
}: MenuProps) {
  return (
    <div className="min-h-screen bg-[#0d0d14] text-gray-100 font-body">
      <header className="border-b border-card-border bg-surface">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-display font-bold text-gray-100 tracking-wider">Éter Online</h1>
          <p className="text-xs text-gray-500 font-body">Modo en línea · partida local vs bot</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <h2 className="font-display text-xl text-ether-200 mb-6">Nueva partida</h2>

        <p className="text-sm text-gray-400 mb-3">Elegí tu mazo — el bot usa el otro:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mb-8">
          {mazos.map(({ mazo, reemplazadas }) => {
            const seleccionado = mazo.id === mazoHumano.id
            return (
              <button
                key={mazo.id}
                onClick={() => onMazo(mazo)}
                className={`text-left bg-surface-2 border rounded-lg p-5 transition-all cursor-pointer
                  ${seleccionado ? 'border-ether-400 ring-1 ring-ether-400' : 'border-card-border hover:border-gray-500'}`}
              >
                <p className="font-display text-lg font-bold" style={{ color: mazo.color }}>
                  {mazo.nombre}
                </p>
                <p className="text-[11px] text-gray-500 mt-1">
                  {mazo.cardIds.length} cartas · facción {mazo.id === 'estasis' ? 'Orden' : 'Caos'}
                  {reemplazadas > 0 && (
                    <span className="text-ether-300"> · {reemplazadas} de tu colección</span>
                  )}
                </p>
              </button>
            )
          })}
        </div>

        {/* ── Colección de la forja ─────────────────────────────── */}
        <div className="flex items-center gap-3 mb-8 max-w-2xl flex-wrap">
          <p className="text-sm text-gray-400">
            {coleccion.length > 0
              ? `Colección de la forja: ${coleccion.length} cartas (se usan las que coinciden por nombre).`
              : 'Sin cartas de la forja: se juega con los diseños originales del paquete.'}
          </p>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-xs bg-surface-2 hover:bg-card-border text-gray-300 px-3 py-1.5 rounded transition-colors cursor-pointer"
          >
            Importar colección (JSON)
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void importar(file)
              e.target.value = ''
            }}
          />
          <button
            onClick={() => fileTerminadasRef.current?.click()}
            className="text-xs bg-ether-600/20 hover:bg-ether-600/40 text-ether-200 px-3 py-1.5 rounded transition-colors cursor-pointer"
          >
            Añadir cartas terminadas (JSON)
          </button>
          <input
            ref={fileTerminadasRef}
            type="file"
            accept="application/json,.json"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files
              if (files && files.length > 0) void importarTerminadas(Array.from(files))
              e.target.value = ''
            }}
          />
        </div>

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
          <p className="text-[11px] text-gray-600">Mismo seed + mismas decisiones → misma partida.</p>
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

/** Importa un JSON de colección exportado desde Éter Forge (coleccion-eter.json). */
async function importar(file: File): Promise<void> {
  try {
    const cartas = await importCollectionFromJson(file)
    useCardStore.getState().loadCards(cartas)
  } catch {
    alert('No se pudo importar la colección: el archivo no es un JSON válido de Éter Forge.')
  }
}

/**
 * Añade cartas terminadas a la colección importando SOLO los datos (sin arte).
 * De cada JSON se extrae todo menos el arte embebido (imageUrl/hasImage); si la
 * carta ya existía con arte (IndexedDB), ese arte se conserva al mergear.
 */
async function importarTerminadas(files: File[]): Promise<void> {
  const conArte = new Map(
    useCardStore.getState().cards.filter((c) => c.hasImage).map((c) => [c.id, c]),
  )
  const cartas: AnyCard[] = []
  let errores = 0
  for (const file of files) {
    try {
      cartas.push(...(await importCardDataFromJson(file)))
    } catch {
      errores += 1
    }
  }
  if (cartas.length === 0) {
    alert(
      errores > 0
        ? 'No se pudo importar: ningún archivo es un JSON válido de Éter Forge.'
        : 'El JSON no contiene cartas.',
    )
    return
  }
  useCardStore
    .getState()
    .loadCards(cartas.map((c) => (conArte.has(c.id) ? { ...c, hasImage: true } : c)))
  const ignorados = errores > 0 ? ` (${errores} archivo(s) inválido(s) ignorado(s))` : ''
  alert(`Se añadieron ${cartas.length} cartas terminadas (solo datos; el arte embebido se descartó).${ignorados}`)
}
