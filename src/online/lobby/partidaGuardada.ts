/**
 * Partida en curso recordada en el navegador, para reconectar tras refrescar o cerrar la pestaña.
 * Solo guarda a qué sala volver; el estado real vive en el servidor (action `state`). Si el storage no está disponible
 * (modo privado, bloqueado) no pasa nada: simplemente no hay reconexión.
 */
import type { RoomInfo } from '../backend/matchApi'

const CLAVE = 'eter-online:partida'

export function guardarPartida(sala: RoomInfo): void {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(sala))
  } catch {
    // sin storage: sin reconexión
  }
}

export function leerPartidaGuardada(): RoomInfo | null {
  try {
    const raw = window.localStorage.getItem(CLAVE)
    if (!raw) return null
    const sala = JSON.parse(raw) as Partial<RoomInfo>
    const valida = typeof sala.gameId === 'string' && typeof sala.code === 'string' && (sala.player === 'A' || sala.player === 'B')
    return valida ? (sala as RoomInfo) : null
  } catch {
    return null
  }
}

export function olvidarPartida(): void {
  try {
    window.localStorage.removeItem(CLAVE)
  } catch {
    // sin storage: nada que olvidar
  }
}
