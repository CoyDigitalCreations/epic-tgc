import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { getCardMeta } from '../game'
import type { GameState } from '../game'
import { MiniCard } from './MiniCard'

export interface OpcionMano {
  etiqueta: string
  tono: 'principal' | 'peligro' | 'neutro'
  onElegir: () => void
}

interface ManoAbanicoProps {
  vista: GameState
  /** Ids de la mano propia, en orden. */
  ids: string[]
  /** Opciones válidas AHORA para una carta (el menú se arma desde las acciones del motor). */
  opcionesDe: (id: string) => OpcionMano[]
  /** Hay un pago/casilla en curso: el abanico baja y se apaga para dejar el foco en el tablero. */
  atenuada: boolean
  /** Ancho (px) de una carta en reposo; todo lo demás (separación, levante) escala con él. */
  ancho: number
}

const ANCHO_REFERENCIA = 104
const ESCALA_ACTIVA = 1.45
const LEVANTE = 48
const EMPUJE_VECINAS = 40
/** Fracción de la carta que queda oculta bajo el borde de la pantalla en reposo. */
const FRACCION_OCULTA = 0.22
const RELACION = 1038 / 744

const CLASE_TONO: Record<OpcionMano['tono'], string> = {
  principal: 'bg-ether-600/30 hover:bg-ether-600/50 text-ether-200',
  peligro: 'bg-red-600/30 hover:bg-red-600/50 text-red-300',
  neutro: 'bg-surface-2 hover:bg-card-border text-gray-300',
}

/** Posición en reposo de la carta `i` de `n`: arco simétrico alrededor del centro. */
function posicion(i: number, n: number, k: number): { x: number; y: number; rotate: number } {
  const offset = i - (n - 1) / 2
  const paso = Math.min(84, 520 / Math.max(n, 1)) * k
  const giro = Math.min(3.5, 18 / Math.max(n, 1))
  return { x: offset * paso, y: Math.abs(offset) ** 1.6 * 4 * k, rotate: offset * giro }
}

/**
 * Mano en abanico (estilo Master Duel), anclada al borde inferior de su
 * contenedor. Pasar el mouse levanta y agranda la carta y separa a las vecinas;
 * el clic la selecciona y abre un menú con sus opciones válidas (Invocar /
 * Jugar / Colocar boca abajo / Descartar / Ver carta). No decide nada: las
 * opciones llegan de `opcionesDe`.
 */
export function ManoAbanico({ vista, ids, opcionesDe, atenuada, ancho }: ManoAbanicoProps) {
  const [seleccionada, setSeleccionada] = useState<string | null>(null)
  const [enHover, setEnHover] = useState<string | null>(null)
  const contenedorRef = useRef<HTMLDivElement>(null)

  const k = ancho / ANCHO_REFERENCIA
  const alto = ancho * RELACION
  const levante = LEVANTE * k
  const base = -Math.round(alto * FRACCION_OCULTA)

  // La carta ya no está en la mano (se jugó, se descartó…) o hay un pago en curso: cerrar el menú
  useEffect(() => {
    if (seleccionada && (atenuada || !ids.includes(seleccionada))) setSeleccionada(null)
  }, [ids, seleccionada, atenuada])

  useEffect(() => {
    if (!seleccionada) return
    const clicAfuera = (e: PointerEvent) => {
      if (!contenedorRef.current?.contains(e.target as Node)) setSeleccionada(null)
    }
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSeleccionada(null)
    }
    document.addEventListener('pointerdown', clicAfuera)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', clicAfuera)
      document.removeEventListener('keydown', escape)
    }
  }, [seleccionada])

  const alternar = (id: string) => setSeleccionada((actual) => (actual === id ? null : id))

  const n = ids.length
  const activa = seleccionada ?? enHover
  const idxActiva = activa ? ids.indexOf(activa) : -1
  const idxSeleccionada = seleccionada ? ids.indexOf(seleccionada) : -1
  const opciones = seleccionada && !atenuada ? opcionesDe(seleccionada) : []

  return (
    <motion.div
      ref={contenedorRef}
      data-testid="mano"
      role="group"
      aria-label="Tu mano"
      className="absolute inset-x-0 bottom-0 z-30 pointer-events-none"
      style={{ height: alto }}
      initial={false}
      animate={{ y: atenuada ? alto : 0, opacity: atenuada ? 0.35 : 1 }}
      transition={{ duration: 0.25 }}
    >
      {ids.map((id, i) => {
        const inst = vista.instances[id]
        if (!inst) return null
        const reposo = posicion(i, n, k)
        const esActiva = id === activa
        const empuje = idxActiva < 0 || esActiva ? 0 : (i > idxActiva ? EMPUJE_VECINAS : -EMPUJE_VECINAS) * k
        const nombre = (inst.cardId ? getCardMeta(inst.cardId)?.name : null) ?? 'Carta'
        return (
          <motion.div
            key={id}
            role="button"
            tabIndex={0}
            aria-label={nombre}
            aria-expanded={seleccionada === id}
            onClick={() => alternar(id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                alternar(id)
              }
            }}
            onHoverStart={() => setEnHover(id)}
            onHoverEnd={() => setEnHover((actual) => (actual === id ? null : actual))}
            style={{
              position: 'absolute',
              left: '50%',
              bottom: base,
              marginLeft: -ancho / 2,
              width: ancho,
              transformOrigin: '50% 100%',
              zIndex: esActiva ? 50 : i,
              pointerEvents: atenuada ? 'none' : 'auto',
              cursor: 'pointer',
            }}
            // initial={false}: una carta recién robada nace ya en su sitio (el FLIP mide su destino al montar)
            initial={false}
            animate={{
              x: reposo.x + empuje,
              y: esActiva ? -levante : reposo.y,
              rotate: esActiva ? 0 : reposo.rotate,
              scale: esActiva ? ESCALA_ACTIVA : 1,
            }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            <MiniCard inst={inst} anchoPx={ancho} />
          </motion.div>
        )
      })}

      {idxSeleccionada >= 0 && opciones.length > 0 && (
        <div
          role="group"
          aria-label="Opciones de la carta"
          className="absolute flex flex-col gap-1 min-w-36 p-1.5 rounded-lg bg-[#0d0d14]/95 border border-card-border shadow-2xl pointer-events-auto"
          style={{
            left: `calc(50% + ${posicion(idxSeleccionada, n, k).x}px)`,
            bottom: base + levante + alto * ESCALA_ACTIVA + 8,
            transform: 'translateX(-50%)',
            zIndex: 60,
          }}
        >
          {opciones.map((o) => (
            <button
              key={o.etiqueta}
              onClick={() => {
                setSeleccionada(null)
                o.onElegir()
              }}
              className={`text-xs px-3 py-1.5 rounded transition-colors cursor-pointer whitespace-nowrap ${CLASE_TONO[o.tono]}`}
            >
              {o.etiqueta}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  )
}
