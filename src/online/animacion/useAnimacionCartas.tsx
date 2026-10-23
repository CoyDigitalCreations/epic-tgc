import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import type { CardInstance, GameState, PlayerId } from '../game'
import { MiniCard } from '../components/MiniCard'
import { EnVueloContext } from './contexto'
import { MAX_MOVIMIENTOS, diffMovimientos, mostrandoFrente } from './movimientos'
import type { Movimiento } from './movimientos'

/**
 * Animación de movimiento de cartas (estilo Yu-Gi-Oh / Master Duel) con capa
 * "fantasma": técnica FLIP.
 *  - First: durante el render (antes del commit) se miden las cartas del DOM.
 *  - Last: en el layout effect (DOM ya actualizado, antes del paint) se mide el
 *    destino, se oculta la carta real y se lanza un clon que vuela de A a B.
 * Se usa un overlay medido con getBoundingClientRect (y no layoutId de
 * framer-motion) porque el tablero rival está rotado 180° y las cartas van
 * escaladas con transform: la proyección de layoutId es frágil ahí.
 */

export type Velocidad = 'rapida' | 'normal' | 'off'

const PERFIL: Record<Exclude<Velocidad, 'off'>, { duracion: number; escalon: number }> = {
  rapida: { duracion: 0.38, escalon: 0.07 },
  normal: { duracion: 0.7, escalon: 0.14 },
}

const CLAVE_VELOCIDAD = 'eter.animacion.velocidad'
const ALTO_SOBRE_ANCHO = 1038 / 744
/** Un fantasma que no avisa su fin (pestaña en segundo plano) se retira solo. */
const MARGEN_FAILSAFE_MS = 400
const SIN_OCULTAS: ReadonlySet<string> = new Set()

function leerVelocidad(): Velocidad {
  try {
    const guardada = window.localStorage.getItem(CLAVE_VELOCIDAD)
    if (guardada === 'rapida' || guardada === 'normal' || guardada === 'off') return guardada
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 'off'
  } catch {
    /* storage bloqueado: default */
  }
  return 'rapida'
}

function guardarVelocidad(v: Velocidad): void {
  try {
    window.localStorage.setItem(CLAVE_VELOCIDAD, v)
  } catch {
    /* storage bloqueado: la preferencia vale solo para esta sesión */
  }
}

/** Posición/tamaño/orientación de una carta en pantalla (coordenadas de viewport). */
interface Medida {
  cx: number
  cy: number
  /** Lado corto de la carta (su ancho en vertical, aunque esté girada). */
  ancho: number
  /** Giro en grados: 180 por tablero rival, -90 por carta agotada. */
  rot: number
  /** Está dentro de una celda de la grilla (vs mano, panel de cadena…). */
  enCelda: boolean
}

function medir(el: Element): Medida | null {
  const r = el.getBoundingClientRect()
  if (r.width === 0 || r.height === 0) return null
  const rivalInvertido = el.closest('[data-testid="grilla-B"]') !== null
  const horizontal = r.width > r.height
  return {
    cx: r.left + r.width / 2,
    cy: r.top + r.height / 2,
    ancho: Math.min(r.width, r.height),
    rot: (rivalInvertido ? 180 : 0) + (horizontal ? -90 : 0),
    enCelda: el.closest('[data-zona]') !== null,
  }
}

function leerMedidas(root: Element): Map<string, Medida[]> {
  const mapa = new Map<string, Medida[]>()
  root.querySelectorAll<HTMLElement>('[data-inst]').forEach((el) => {
    const id = el.dataset.inst
    const medida = id ? medir(el) : null
    if (!id || !medida) return
    const lista = mapa.get(id)
    if (lista) lista.push(medida)
    else mapa.set(id, [medida])
  })
  return mapa
}

/** Una misma instancia puede estar en el campo y en el panel de cadena: elige la de la zona esperada. */
function elegir(medidas: Medida[] | undefined, enMano: boolean): Medida | null {
  return medidas?.find((m) => m.enCelda !== enMano) ?? null
}

/** Fallback cuando la carta no estaba en el DOM (p. ej. tapada en una pila o en el mazo): su celda. */
function medirCelda(root: Element, jugador: PlayerId, zona: string): Medida | null {
  const celda = root.querySelector(`[data-testid="grilla-${jugador}"] [data-zona="${zona}"]`)
  return celda ? medir(celda.querySelector('[data-inst]') ?? celda) : null
}

interface Vuelo {
  key: number
  cardInstanceId: string
  origen: Medida
  destino: Medida
  /** Instancia con identidad real (frente) y owner, para el dorso. */
  frente: CardInstance
  desdeFrente: boolean
  haciaFrente: boolean
  duracion: number
  delay: number
}

function armarVuelo(
  mov: Movimiento,
  indice: number,
  key: number,
  prev: GameState,
  vista: GameState,
  antes: Map<string, Medida[]>,
  despues: Map<string, Medida[]>,
  root: Element,
  perfil: { duracion: number; escalon: number },
): Vuelo | null {
  if (!mov.de) return null
  const id = mov.cardInstanceId
  const destino = elegir(despues.get(id), mov.a.zona === 'mano')
  const origen =
    elegir(antes.get(id), mov.de.zona === 'mano') ?? medirCelda(root, mov.de.jugador, mov.de.zona)
  if (!origen || !destino) return null
  // Misma casilla (p. ej. reordenamiento): nada que animar
  if (Math.hypot(origen.cx - destino.cx, origen.cy - destino.cy) < 4 && origen.rot === destino.rot) return null

  const instPrev = prev.instances[id]
  const instNext = vista.instances[id]
  const frente = (instNext?.cardId ? instNext : instPrev) ?? instNext
  if (!frente) return null
  return {
    key,
    cardInstanceId: id,
    origen,
    destino,
    frente,
    desdeFrente: mostrandoFrente(instPrev, mov.de.zona),
    haciaFrente: mostrandoFrente(instNext, mov.a.zona),
    duracion: perfil.duracion,
    delay: indice * perfil.escalon,
  }
}

export interface AnimacionCartas {
  /** Provider value: instancias reales a ocultar mientras su fantasma vuela. */
  ocultas: ReadonlySet<string>
  /** Capa de fantasmas (portal a body); renderizar dentro del árbol del Tablero. */
  capa: ReactNode
  velocidad: Velocidad
  ciclarVelocidad: () => void
}

/**
 * @param vista    vista del jugador A; cada cambio de identidad dispara el diff.
 * @param rootRef  contenedor del tablero (mide solo ahí: los modales quedan fuera).
 */
export function useAnimacionCartas(vista: GameState, rootRef: RefObject<HTMLElement | null>): AnimacionCartas {
  const [velocidad, setVelocidad] = useState<Velocidad>(leerVelocidad)
  const [vuelos, setVuelos] = useState<Vuelo[]>([])
  const prevRef = useRef(vista)
  const antesRef = useRef<Map<string, Medida[]> | null>(null)
  const keyRef = useRef(0)

  // FIRST: el render con la vista nueva corre ANTES del commit, así que el DOM
  // todavía muestra la vista anterior. Idempotente (StrictMode renderiza 2 veces).
  if (prevRef.current !== vista && velocidad !== 'off' && rootRef.current) {
    antesRef.current = leerMedidas(rootRef.current)
  }

  // LAST + Invert + Play: DOM ya actualizado, el navegador aún no pintó.
  useLayoutEffect(() => {
    const prev = prevRef.current
    const antes = antesRef.current
    prevRef.current = vista
    antesRef.current = null
    const root = rootRef.current
    if (!antes || !root || prev === vista || velocidad === 'off') return
    if (prev.fase === 'pre_partida') return

    const movimientos = diffMovimientos(prev, vista)
    if (movimientos.length === 0 || movimientos.length > MAX_MOVIMIENTOS) return

    const despues = leerMedidas(root)
    const perfil = PERFIL[velocidad]
    const nuevos: Vuelo[] = []
    movimientos.forEach((mov, i) => {
      const vuelo = armarVuelo(mov, nuevos.length, keyRef.current + i, prev, vista, antes, despues, root, perfil)
      if (vuelo) nuevos.push(vuelo)
    })
    keyRef.current += movimientos.length
    // setState en layout effect: React re-renderiza síncrono ANTES del paint → sin parpadeo
    if (nuevos.length > 0) setVuelos((actuales) => [...actuales, ...nuevos])
  }, [vista, velocidad, rootRef])

  const terminar = useCallback((key: number) => {
    setVuelos((actuales) => actuales.filter((v) => v.key !== key))
  }, [])

  const ciclarVelocidad = useCallback(() => {
    const siguiente: Velocidad = velocidad === 'rapida' ? 'normal' : velocidad === 'normal' ? 'off' : 'rapida'
    guardarVelocidad(siguiente)
    setVelocidad(siguiente)
    if (siguiente === 'off') setVuelos([])
  }, [velocidad])

  const ocultas = useMemo<ReadonlySet<string>>(
    () => (vuelos.length === 0 ? SIN_OCULTAS : new Set(vuelos.map((v) => v.cardInstanceId))),
    [vuelos],
  )

  const capa =
    vuelos.length > 0 && typeof document !== 'undefined'
      ? createPortal(
          // Contexto vacío: el portal hereda el provider del Tablero y ocultaría al propio fantasma
          <EnVueloContext.Provider value={SIN_OCULTAS}>
            {vuelos.map((v) => (
              <Fantasma key={v.key} vuelo={v} onFin={() => terminar(v.key)} />
            ))}
          </EnVueloContext.Provider>,
          document.body,
        )
      : null

  return { ocultas, capa, velocidad, ciclarVelocidad }
}

function Fantasma({ vuelo, onFin }: { vuelo: Vuelo; onFin: () => void }) {
  const { origen, destino, frente, duracion, delay } = vuelo
  const ancho = destino.ancho
  const alto = ancho * ALTO_SOBRE_ANCHO
  // Se posiciona en el DESTINO y se "invierte" con transform hacia el origen
  const ox = origen.cx - destino.cx
  const oy = origen.cy - destino.cy
  const escalaInicial = origen.ancho / ancho
  const elevacion = Math.min(60, Math.hypot(ox, oy) * 0.15)
  const rotMedia = (origen.rot + destino.rot) / 2

  const giraY0 = vuelo.desdeFrente ? 0 : 180
  const giraY1 = vuelo.haciaFrente ? 0 : 180
  const transicion = { duration: duracion, delay, times: [0, 0.55, 1], ease: 'easeInOut' as const }

  // Failsafe: si la pestaña está en segundo plano framer pausa y onAnimationComplete no llega
  const finRef = useRef(onFin)
  finRef.current = onFin
  useEffect(() => {
    const id = window.setTimeout(() => finRef.current(), (duracion + delay) * 1000 + MARGEN_FAILSAFE_MS)
    return () => window.clearTimeout(id)
  }, [duracion, delay])

  const dorso: CardInstance = { cardInstanceId: frente.cardInstanceId, cardId: null, owner: frente.owner }

  return (
    <motion.div
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: destino.cx - ancho / 2,
        top: destino.cy - alto / 2,
        width: ancho,
        height: alto,
        zIndex: 70,
        pointerEvents: 'none',
        perspective: 900,
      }}
      initial={{ x: ox, y: oy, scale: escalaInicial, rotate: origen.rot }}
      animate={{
        x: [ox, ox / 2, 0],
        y: [oy, oy / 2 - elevacion, 0],
        scale: [escalaInicial, Math.max(escalaInicial, 1) * 1.12, 1],
        rotate: [origen.rot, rotMedia, destino.rot],
      }}
      transition={transicion}
      onAnimationComplete={() => onFin()}
    >
      <motion.div
        style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d' }}
        initial={{ rotateY: giraY0 }}
        animate={{ rotateY: [giraY0, (giraY0 + giraY1) / 2, giraY1] }}
        transition={transicion}
      >
        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden' }}>
          <MiniCard inst={frente} anchoPx={ancho} sinAncla />
        </div>
        <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          <MiniCard inst={dorso} anchoPx={ancho} sinAncla />
        </div>
      </motion.div>
    </motion.div>
  )
}
