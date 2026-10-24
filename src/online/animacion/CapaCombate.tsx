import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'

/** Entrada de animación de combate (subconjunto de AnimacionEntrada que esta capa dibuja). */
export interface EntradaCombate {
  tipo: string
  /** 'choque': [atacante]. 'ruptura': [atacante]. */
  atacantes?: string[]
  /** 'choque': el bloqueador. 'ruptura': el Vínculo que se rompe. */
  cardInstanceId?: string
  key: number
}

export interface Punto {
  x: number
  y: number
}

const ROJO = '#ef4444'
const AZUL = '#60a5fa'
const ROSA = '#fb7185'
/** Duración de cada trazo (s) y retraso del destello respecto del trazo. */
const TRAZO_S = 0.32
const DESTELLO_S = 0.28

/** Centro en pantalla de una carta (la copia del campo, no la del panel de cadena); null si no está visible. */
export function centroDe(id: string): Punto | null {
  const copias = Array.from(document.querySelectorAll<HTMLElement>(`[data-inst="${id}"]`))
  const el = copias.find((c) => c.closest('[data-zona]') !== null) ?? copias[0]
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width === 0 || r.height === 0) return null
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

function Trazo({ desde, hasta, color }: { desde: Punto; hasta: Punto; color: string }) {
  return (
    <motion.line
      x1={desde.x}
      y1={desde.y}
      x2={hasta.x}
      y2={hasta.y}
      stroke={color}
      strokeWidth={4}
      strokeLinecap="round"
      style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      initial={{ pathLength: 0, opacity: 1 }}
      animate={{ pathLength: 1, opacity: [1, 1, 0] }}
      transition={{ duration: TRAZO_S + 0.3, times: [0, 0.6, 1], pathLength: { duration: TRAZO_S, ease: 'easeOut' } }}
    />
  )
}

function Destello({ en, color }: { en: Punto; color: string }) {
  return (
    <>
      <motion.circle
        cx={en.x}
        cy={en.y}
        fill="none"
        stroke={color}
        strokeWidth={3}
        initial={{ r: 4, opacity: 0 }}
        animate={{ r: [4, 34], opacity: [0, 1, 0] }}
        transition={{ duration: 0.45, delay: DESTELLO_S, ease: 'easeOut' }}
      />
      <motion.circle
        cx={en.x}
        cy={en.y}
        fill={color}
        initial={{ r: 0, opacity: 0 }}
        animate={{ r: [0, 9, 0], opacity: [0, 0.9, 0] }}
        transition={{ duration: 0.4, delay: DESTELLO_S, ease: 'easeOut' }}
      />
    </>
  )
}

/**
 * Un golpe de combate. Mide las cartas UNA vez al montarse (en el combate no se mueven; las
 * muertes vuelan aparte por el sistema de vuelos).
 * - choque: el atacante (rojo) y el bloqueador (azul) se lanzan una línea hasta encontrarse en el medio.
 * - ruptura: el atacante lanza una línea al Vínculo que rompe, con impacto sobre él.
 */
function Golpe({ entrada }: { entrada: EntradaCombate }) {
  const [puntos, setPuntos] = useState<{ a: Punto; b: Punto } | null>(null)
  const atacanteId = entrada.atacantes?.[0]
  const otroId = entrada.cardInstanceId

  useLayoutEffect(() => {
    const a = atacanteId ? centroDe(atacanteId) : null
    const b = otroId ? centroDe(otroId) : null
    setPuntos(a && b ? { a, b } : null)
  }, [atacanteId, otroId])

  if (!puntos) return null
  const { a, b } = puntos
  if (entrada.tipo === 'ruptura') {
    return (
      <>
        <Trazo desde={a} hasta={b} color={ROSA} />
        <Destello en={b} color={ROSA} />
      </>
    )
  }
  const medio = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  return (
    <>
      <Trazo desde={a} hasta={medio} color={ROJO} />
      <Trazo desde={b} hasta={medio} color={AZUL} />
      <Destello en={medio} color="#f8fafc" />
    </>
  )
}

/**
 * Capa de efectos de combate (portal a body, encima de la mesa y debajo de los modales).
 * `activa` sigue el ajuste "Animación" del tablero: en off no se dibuja nada.
 */
export function CapaCombate({ entradas, activa }: { entradas: EntradaCombate[] | undefined; activa: boolean }) {
  const golpes = (entradas ?? []).filter((e) => e.tipo === 'choque' || e.tipo === 'ruptura')
  if (!activa || golpes.length === 0 || typeof document === 'undefined') return null
  return createPortal(
    <svg aria-hidden="true" data-testid="capa-combate" className="pointer-events-none fixed inset-0 z-[45] h-full w-full">
      {golpes.map((g) => (
        <Golpe key={g.key} entrada={g} />
      ))}
    </svg>,
    document.body,
  )
}
