import { useCallback, useEffect, useRef, useState } from 'react'
import { applyAction, botTonto, createInitialState, getValidActions } from './game'
import type { Action, Ctx, GameState, PlayerId } from './game'
import { eventosParaLog } from './log'

export interface PartidaConfig {
  /** Mazo del humano (jugador A). */
  deckA: string[]
  /** Mazo del bot (jugador B). */
  deckB: string[]
  seed: number
  /** Delay entre jugadas del bot (0 en tests). */
  delayMs?: number
}

/** Tipo de animación */
export type TipoAnimacion = 'glow' | 'attack' | 'death'

/** Entrada de animación: glow, ataque o destrucción. */
export interface AnimacionEntrada {
  tipo: TipoAnimacion
  zona?: string
  jugador?: PlayerId
  /** IDs de atacantes (para tipo 'attack') */
  atacantes?: string[]
  /** ID de la carta destruida (para tipo 'death') */
  cardInstanceId?: string
  key: number
}

/** Salvaguarda anti-bucle: si el bot acumula más jugadas que esto sin terminar, se rinde. */
const MAX_JUGADAS_BOT = 2000

/** Duración del glow de destino (ms). */
const GLOW_DURATION_MS = 500

/** Duración de animación de ataque (ms). */
const ATTACK_DURATION_MS = 600

/** Duración de animación de destrucción (ms). */
const DEATH_DURATION_MS = 500

/**
 * El actor de la jugada actual NO es siempre `estado.turno`:
 * - Cadena 9.6 abierta → el actor es `cadena.prioridad` (el turno queda congelado).
 * - Paso bloqueo (9.3, ADR-11) → el actor es el DEFENSOR (rival del activo).
 * - Resto → el jugador activo.
 */
export function actorActual(estado: GameState): PlayerId | null {
  if (estado.fase === 'terminada') return null
  const cadena = estado.combate?.cadena
  if (estado.fase === 'choque' && cadena) return cadena.prioridad
  if (estado.fase === 'choque' && estado.combate?.paso === 'bloqueo') {
    return estado.turno === 'A' ? 'B' : 'A'
  }
  return estado.turno
}

/**
 * Lógica de una partida humana (A) vs bot (B).
 *
 * El estado y el ctx viven en refs (el motor los MUTA en applyAction); un
 * `tick` fuerza el re-render. El bot juega automáticamente cuando es su turno
 * (o su bloqueo/prioridad), con un delay configurable para que el humano
 * pueda seguir la partida. Determinista: mismo seed + mismas decisiones del
 * humano → mismo resultado.
 */
export function usePartida(config: PartidaConfig) {
  // El estado inicial se crea UNA vez en el primer render (idempotente en
  // StrictMode: la segunda pasada ya encuentra los refs inicializados).
  const estadoRef = useRef<GameState | null>(null)
  const ctxRef = useRef<Ctx | null>(null)
  const logRef = useRef<string[]>([])
  if (!estadoRef.current) {
    const inicial = createInitialState(config.deckA, config.deckB, config.seed)
    estadoRef.current = inicial.state
    ctxRef.current = inicial.ctx
    logRef.current = [`La partida comienza (seed ${config.seed}).`]
  }
  const [estado, setEstado] = useState<GameState>(estadoRef.current)
  const [log, setLog] = useState<string[]>(logRef.current)
  const [animaciones, setAnimaciones] = useState<AnimacionEntrada[]>([])
  const delayRef = useRef(config.delayMs ?? 350)
  const jugadasBotRef = useRef(0)

  const sincronizar = useCallback(() => {
    setEstado(estadoRef.current as GameState)
    setLog(logRef.current)
  }, [])

  /** Aplica una acción del humano. Los eventos del motor se suman al log y disparan animaciones. */
  const ejecutar = useCallback(
    (accion: Action) => {
      const s = estadoRef.current
      const ctx = ctxRef.current
      if (!s || !ctx || s.fase === 'terminada') return
      const r = applyAction(s, accion, ctx)
      if (!r.ok) {
        logRef.current = [...logRef.current, `⚠ Acción inválida: ${r.error}`]
        setLog(logRef.current)
        return
      }
      estadoRef.current = r.state
      logRef.current = [...logRef.current, ...eventosParaLog(r.state, r.events)]
      // Animaciones: capturar eventos relevantes
      const now = Date.now()
      const nuevasAnimaciones: AnimacionEntrada[] = []

      // Glow en destino de movimiento
      for (const e of r.events) {
        if (e.type === 'carta_entrada_a_zona') {
          nuevasAnimaciones.push({ tipo: 'glow', zona: e.zona, jugador: e.jugador, key: now + Math.random() })
        }
      }

      // Línea de ataque
      for (const e of r.events) {
        if (e.type === 'ataque_declarado') {
          nuevasAnimaciones.push({ tipo: 'attack', atacantes: e.atacanteIds, jugador: e.jugador, key: now + Math.random() })
        }
      }

      // Efecto de destrucción
      for (const e of r.events) {
        if (e.type === 'destruccion') {
          nuevasAnimaciones.push({ tipo: 'death', cardInstanceId: e.cardInstanceId, jugador: e.jugador, key: now + Math.random() })
        }
      }

      if (nuevasAnimaciones.length > 0) {
        setAnimaciones((prev) => [...prev, ...nuevasAnimaciones])
      }
      sincronizar()
    },
    [sincronizar],
  )

  // Limpiar animaciones expiradas
  useEffect(() => {
    if (animaciones.length === 0) return
    const timeout = window.setTimeout(() => {
      setAnimaciones((prev) => prev.filter((a) => {
        const age = Date.now() - a.key
        if (a.tipo === 'attack') return age < ATTACK_DURATION_MS
        if (a.tipo === 'death') return age < DEATH_DURATION_MS
        return age < GLOW_DURATION_MS
      }))
    }, GLOW_DURATION_MS + 50)
    return () => window.clearTimeout(timeout)
  }, [animaciones])

  /** El bot juega solo cuando el actor actual es B, con delay, hasta devolverle el turno al humano. */
  useEffect(() => {
    if (estado.fase === 'terminada') return
    const actor = actorActual(estado)
    if (!actor || actor === 'A') return
    const timeout = window.setTimeout(() => {
      const s = estadoRef.current
      if (!s || s.fase === 'terminada') return
      const act = actorActual(s)
      if (!act || act === 'A') return
      jugadasBotRef.current += 1
      const accion = botTonto(s, act)
      if (!accion || jugadasBotRef.current > MAX_JUGADAS_BOT) {
        // Sin progreso posible: el bot se rinde para no colgar la partida.
        ejecutar({ type: 'rendirse' })
        return
      }
      ejecutar(accion)
    }, delayRef.current)
    return () => window.clearTimeout(timeout)
  }, [estado, ejecutar])

  const leTocaA = estado.fase !== 'terminada' && actorActual(estado) === 'A'
  const acciones = leTocaA ? getValidActions(estado, 'A') : []

  /** Nueva partida con la misma configuración (mismo seed). */
  const reiniciar = useCallback(() => {
    const inicial = createInitialState(config.deckA, config.deckB, config.seed)
    estadoRef.current = inicial.state
    ctxRef.current = inicial.ctx
    jugadasBotRef.current = 0
    logRef.current = [`La partida comienza (seed ${config.seed}).`]
    sincronizar()
  }, [config, sincronizar])

  return { estado, log, leTocaA, acciones, ejecutar, reiniciar, animaciones }
}
