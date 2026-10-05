/**
 * useOnlineMatch — hook de partida server-authoritative (salas de amigos).
 *
 * A diferencia de usePartida (bot local), el estado vive en Supabase:
 * - start/act/state/forfeit van a la Edge Function match-engine
 * - Poll: cuando NO nos toca, consultamos state cada POLL_MS
 * - El motor corre en el servidor; el cliente pinta visibleState
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { actorActual, getValidActions } from '../game'
import type { Action, GameState, PlayerId } from '../game'
import { eventosDetalladosParaLog } from '../logDetallado'
import type { GameEvent } from '../game'
import {
  enviarAccion,
  obtenerEstado,
  rendirse,
  type ActResponse,
  type MatchStateResponse,
} from '../backend/matchApi'

const POLL_MS = 2500

export interface OnlineMatch {
  gameId: string
  code: string
  player: PlayerId
  estado: GameState | null
  status: 'lobby' | 'playing' | 'finished' | 'loading' | 'error'
  logDetallado: string[]
  leToca: boolean
  acciones: Action[]
  cargando: boolean
  error: string | null
  winner: PlayerId | null
  finishReason: string | null
  ejecutar: (a: Action) => Promise<void>
  abandonar: () => Promise<void>
  refrescar: () => Promise<void>
}

export function useOnlineMatch(gameId: string, player: PlayerId, code: string): OnlineMatch {
  const [estado, setEstado] = useState<GameState | null>(null)
  const [status, setStatus] = useState<OnlineMatch['status']>('loading')
  const [logDetallado, setLogDetallado] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [winner, setWinner] = useState<PlayerId | null>(null)
  const [finishReason, setFinishReason] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)
  const ocupadoRef = useRef(false)

  const aplicarRespuesta = useCallback((resp: MatchStateResponse | ActResponse, eventos?: GameEvent[]) => {
    if (resp.state) setEstado(resp.state)
    if ('status' in resp && resp.status) setStatus(resp.status as OnlineMatch['status'])
    if ('winner' in resp) setWinner(resp.winner ?? null)
    if ('finishReason' in resp) setFinishReason(resp.finishReason ?? null)
    if (eventos && eventos.length > 0 && resp.state) {
      const lineas = eventosDetalladosParaLog(resp.state, eventos)
      setLogDetallado((prev) => [...prev, ...lineas])
    }
  }, [])

  const refrescar = useCallback(async () => {
    if (ocupadoRef.current) return
    try {
      const resp = await obtenerEstado(gameId)
      aplicarRespuesta(resp)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [gameId, aplicarRespuesta])

  // Load inicial
  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        const resp = await obtenerEstado(gameId)
        if (!vivo) return
        aplicarRespuesta(resp)
      } catch (e) {
        if (vivo) setError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      vivo = false
    }
  }, [gameId, aplicarRespuesta])

  // Poll cuando no es nuestro turno y la partida sigue viva
  useEffect(() => {
    if (status !== 'playing') return
    if (!estado) return
    const actor = actorActual(estado)
    if (actor === player) return
    const t = window.setInterval(() => {
      void refrescar()
    }, POLL_MS)
    return () => window.clearInterval(t)
  }, [status, estado, player, refrescar])

  // Auto-start cuando ambos están y somos A (creador)
  useEffect(() => {
    if (status !== 'lobby') return
    // El hook no sabe si el rival ya entró — el lobby parent llama start.
  }, [status])

  const ejecutar = useCallback(
    async (accion: Action) => {
      if (!estado || ocupadoRef.current) return
      if (actorActual(estado) !== player) return
      ocupadoRef.current = true
      setCargando(true)
      try {
        const resp = await enviarAccion(gameId, accion)
        if (!resp.ok) {
          setError(resp.error ?? 'Acción rechazada')
          if (resp.state) setEstado(resp.state)
          return
        }
        setError(null)
        aplicarRespuesta(resp, resp.events as GameEvent[] | undefined)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        ocupadoRef.current = false
        setCargando(false)
      }
    },
    [estado, player, gameId, aplicarRespuesta],
  )

  const abandonar = useCallback(async () => {
    try {
      await rendirse(gameId)
      await refrescar()
    } catch {
      // best-effort
    }
  }, [gameId, refrescar])

  const leToca = Boolean(estado && status === 'playing' && actorActual(estado) === player)
  const acciones = leToca && estado ? getValidActions(estado, player) : []

  return {
    gameId,
    code,
    player,
    estado,
    status,
    logDetallado,
    leToca,
    acciones,
    cargando,
    error,
    winner,
    finishReason,
    ejecutar,
    abandonar,
    refrescar,
  }
}
