import { useCallback, useEffect, useRef, useState } from 'react'
import { applyAction, botTonto, createInitialState, getValidActions } from './game'
import type { Action, Ctx, GameState, PlayerId } from './game'
import type { Dificultad } from './game/bot'
import { getCardMeta } from './game/cards'
import { eventosParaLog } from './log'
import { eventosDetalladosParaLog, diagnosticarActor, resumenJugador } from './logDetallado'
import { describirEfectosDeCarta } from './describirEfecto'
import type { PreviewEfectos } from './components/EffectPreviewModal'

export interface PartidaConfig {
  /** Mazo del humano (jugador A). */
  deckA: string[]
  /** Mazo del bot (jugador B). */
  deckB: string[]
  seed: number
  /** Delay entre jugadas del bot (0 en tests). */
  delayMs?: number
  /** Dificultad del bot */
  dificultad?: Dificultad
  /**
   * Pausar con modal antes de efectos del humano (default true).
   * El bot nunca pausa: sus efectos se loguean.
   */
  pausarEfectos?: boolean
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
 * El modal de pre-efectos SOLO cuando el EFECTO entra en acción — no cuando
 * la carta simplemente entra al campo.
 * - activar_habilidad / activar_arcana / jugar_mistica → el efecto resuelve
 * - jugar_campeon → solo si tiene trigger al_invocar (disparo/pasivo esperan)
 * - colocar_arcana → nunca (la recompensa se activa después)
 */
function efectosSeActivanCon(accion: Action, efectos: { tipo?: string; trigger?: string }[] | undefined): boolean {
  if (!efectos || efectos.length === 0) return false
  if (accion.type === 'activar_habilidad' || accion.type === 'activar_arcana' || accion.type === 'jugar_mistica') {
    return true
  }
  if (accion.type === 'jugar_campeon') {
    return efectos.some((e) => e.trigger === 'al_invocar' || e.tipo === 'hechizo')
  }
  return false
}

/**
 * El actor de la jugada actual NO es siempre `estado.turno`:
 * - Checkpoint prevent_destroy (Fase 2c) → el jugador que debe elegir.
 * - Cadena 9.6 abierta → el actor es `cadena.prioridad` (el turno queda congelado).
 * - Paso bloqueo (9.3, ADR-11) → el actor es el DEFENSOR (rival del activo).
 * - Resto → el jugador activo.
 */
export function actorActual(estado: GameState): PlayerId | null {
  if (estado.fase === 'terminada') return null
  const preven = estado.preventivosPendientes?.[0]
  if (preven) return preven.jugador
  // Cadena GLOBAL (state.cadena) o de combate: el actor es SIEMPRE prioridad —
  // aunque la fase sea Forja. Sin esto, cadena global en Forja congela al
  // humano (solo rendirse) y el bot nunca pasa prioridad → FREEZE (seed 66676).
  const cadena = estado.combate?.cadena ?? estado.cadena
  if (cadena) return cadena.prioridad
  if (estado.fase === 'choque' && estado.combate?.paso === 'bloqueo') {
    return estado.turno === 'A' ? 'B' : 'A'
  }
  return estado.turno
}

function labelAccionCorta(a: Action): string {
  if (a.type === 'jugar_campeon' || a.type === 'jugar_mistica' || a.type === 'colocar_arcana' || a.type === 'activar_arcana' || a.type === 'activar_habilidad') {
    const id = 'cardInstanceId' in a ? a.cardInstanceId : null
    return id ? `${a.type} [${id}]` : a.type
  }
  return a.type
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
  const logDetalladoRef = useRef<string[]>([])
  if (!estadoRef.current) {
    const inicial = createInitialState(config.deckA, config.deckB, config.seed)
    estadoRef.current = inicial.state
    ctxRef.current = inicial.ctx
    logRef.current = [`La partida comienza (seed ${config.seed}).`]
    logDetalladoRef.current = [`=== PARTIDA SEED ${config.seed} ===`]
  }
  const [estado, setEstado] = useState<GameState>(estadoRef.current)
  const [log, setLog] = useState<string[]>(logRef.current)
  const [logDetallado, setLogDetallado] = useState<string[]>(logDetalladoRef.current)
  const [animaciones, setAnimaciones] = useState<AnimacionEntrada[]>([])
  /** Modal de pre-efectos (humano). Null = sin pausa. */
  const [preview, setPreview] = useState<PreviewEfectos | null>(null)
  const previewAccionRef = useRef<Action | null>(null)
  const previewEsBotRef = useRef(false)
  const pausarRef = useRef(config.pausarEfectos ?? true)
  const delayRef = useRef(config.delayMs ?? 350)
  const jugadasBotRef = useRef(0)

  const sincronizar = useCallback(() => {
    setEstado(estadoRef.current as GameState)
    setLog(logRef.current)
    setLogDetallado(logDetalladoRef.current)
  }, [])

  /** Diagnóstico post-acción: por qué el actor (o el humano) no tiene jugadas. */
  const agregarDiagnostico = useCallback((s: GameState) => {
    const actor = actorActual(s)
    if (!actor || s.fase === 'terminada') return
    const acciones = getValidActions(s, actor)
    const tipos = acciones.map((a) => a.type)
    const diag = diagnosticarActor(s, actor, tipos)
    if (diag) {
      logDetalladoRef.current = [...logDetalladoRef.current, `ℹ ${diag}`]
    }
    // Snapshot compacto al cambiar de fase o al quedar sin jugables
    const ultima = logDetalladoRef.current[logDetalladoRef.current.length - 1] ?? ''
    if (!ultima.includes('ℹ') && (diag || true)) {
      // Siempre un snapshot liviano después de cada acción humana/bot significativa
    }
  }, [])

  /** Aplica una acción YA CONFIRMADA (sin pasar por el modal). */
  const aplicarInterna = useCallback(
    (accion: Action, esBot: boolean) => {
      const s = estadoRef.current
      const ctx = ctxRef.current
      if (!s || !ctx || s.fase === 'terminada') return

      const actor = esBot ? 'B' : 'A'
      logDetalladoRef.current = [
        ...logDetalladoRef.current,
        `▶ ${actor} ejecuta: ${labelAccionCorta(accion)}`,
      ]

      // Pre-log de efectos de la carta (lo que ENTRA en juego)
      if ('cardInstanceId' in accion && accion.cardInstanceId) {
        const inst = s.instances[accion.cardInstanceId]
        const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
        const efectos = meta && 'efectos' in meta ? meta.efectos : undefined
        if (efectosSeActivanCon(accion, efectos)) {
          for (const l of describirEfectosDeCarta(meta)) {
            logDetalladoRef.current = [...logDetalladoRef.current, `   📋 Efecto: ${l}`]
          }
        }
      }

      const r = applyAction(s, accion, ctx)
      if (!r.ok) {
        logRef.current = [...logRef.current, `⚠ Acción inválida: ${r.error}`]
        logDetalladoRef.current = [...logDetalladoRef.current, `⚠ FALLÓ ${accion.type}: ${r.error}`]
        sincronizar()
        return
      }
      estadoRef.current = r.state
      logRef.current = [...logRef.current, ...eventosParaLog(r.state, r.events)]
      logDetalladoRef.current = [
        ...logDetalladoRef.current,
        ...eventosDetalladosParaLog(r.state, r.events),
        `  ${resumenJugador(r.state, 'A')} | ${resumenJugador(r.state, 'B')}`,
      ]
      agregarDiagnostico(r.state)

      // Animaciones: capturar eventos relevantes
      const now = Date.now()
      const nuevasAnimaciones: AnimacionEntrada[] = []

      for (const e of r.events) {
        if (e.type === 'carta_entrada_a_zona') {
          nuevasAnimaciones.push({ tipo: 'glow', zona: e.zona, jugador: e.jugador, key: now + Math.random() })
        }
        if (e.type === 'ataque_declarado') {
          nuevasAnimaciones.push({ tipo: 'attack', atacantes: e.atacanteIds, jugador: e.jugador, key: now + Math.random() })
        }
        if (e.type === 'destruccion') {
          nuevasAnimaciones.push({ tipo: 'death', cardInstanceId: e.cardInstanceId, jugador: e.jugador, key: now + Math.random() })
        }
      }
      if (nuevasAnimaciones.length > 0) {
        setAnimaciones((prev) => [...prev, ...nuevasAnimaciones])
      }
      sincronizar()
    },
    [agregarDiagnostico, sincronizar],
  )

  /** Acción del humano o del bot: si tiene efectos[] y pausa está activa, abre el modal. */
  const solicitarPreview = useCallback(
    (accion: Action, esBot: boolean) => {
      const s = estadoRef.current
      if (!s || s.fase === 'terminada') return false
      if (!pausarRef.current) return false
      if (!('cardInstanceId' in accion) || !accion.cardInstanceId) return false
      const inst = s.instances[accion.cardInstanceId]
      const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
      const efectos = meta && 'efectos' in meta ? meta.efectos : undefined
      if (!efectosSeActivanCon(accion, efectos)) return false
      const lineas = describirEfectosDeCarta(meta)
      if (lineas.length === 0) return false
      previewAccionRef.current = accion
      previewEsBotRef.current = esBot
      setPreview({
        cardInstanceId: accion.cardInstanceId,
        accionLabel: labelAccionCorta(accion),
        lineas,
        actor: esBot ? 'B' : 'A',
      })
      return true
    },
    [],
  )

  /** Acción del humano. */
  const ejecutar = useCallback(
    (accion: Action) => {
      const s = estadoRef.current
      if (!s || s.fase === 'terminada') return
      if (accion.type === 'rendirse') {
        aplicarInterna(accion, false)
        return
      }
      if (solicitarPreview(accion, false)) return
      aplicarInterna(accion, false)
    },
    [aplicarInterna, solicitarPreview],
  )

  const aceptarPreview = useCallback(() => {
    const accion = previewAccionRef.current
    const esBot = previewEsBotRef.current
    previewAccionRef.current = null
    previewEsBotRef.current = false
    setPreview(null)
    if (accion) aplicarInterna(accion, esBot)
  }, [aplicarInterna])

  const cancelarPreview = useCallback(() => {
    previewAccionRef.current = null
    setPreview(null)
  }, [])

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
    // Modal de pre-efectos del humano: el bot espera
    if (preview) return
    const actor = actorActual(estado)
    if (!actor || actor === 'A') return
    const timeout = window.setTimeout(() => {
      const s = estadoRef.current
      if (!s || s.fase === 'terminada') return
      const act = actorActual(s)
      if (!act || act === 'A') return
      jugadasBotRef.current += 1
      const accion = botTonto(s, act, config.dificultad)
      if (!accion || jugadasBotRef.current > MAX_JUGADAS_BOT) {
        // Sin progreso posible: el bot se rinde para no colgar la partida.
        aplicarInterna({ type: 'rendirse' }, true)
        return
      }
      // Pausa también jugadas del bot con efectos[] (modo debugging)
      if (solicitarPreview(accion, true)) return
      aplicarInterna(accion, true)
    }, delayRef.current)
    return () => window.clearTimeout(timeout)
  }, [estado, preview, aplicarInterna, solicitarPreview, config.dificultad])

  const leTocaA = !preview && estado.fase !== 'terminada' && actorActual(estado) === 'A'
  const acciones = leTocaA ? getValidActions(estado, 'A') : []

  /** Nueva partida con la misma configuración (mismo seed). */
  const reiniciar = useCallback(() => {
    const inicial = createInitialState(config.deckA, config.deckB, config.seed)
    estadoRef.current = inicial.state
    ctxRef.current = inicial.ctx
    jugadasBotRef.current = 0
    previewAccionRef.current = null
    setPreview(null)
    logRef.current = [`La partida comienza (seed ${config.seed}).`]
    logDetalladoRef.current = [`=== PARTIDA SEED ${config.seed} ===`]
    sincronizar()
  }, [config, sincronizar])

  return {
    estado,
    log,
    logDetallado,
    leTocaA,
    acciones,
    ejecutar,
    reiniciar,
    animaciones,
    preview,
    aceptarPreview,
    cancelarPreview,
  }
}
