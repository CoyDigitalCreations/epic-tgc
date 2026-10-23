/**
 * Tonos de acento del sistema de modales/docks. Cada uno tiñe el filo luminoso,
 * el ícono y los bordes: ether = decisión normal, rival = algo que hace el
 * oponente, alerta = ventana de respuesta/atención, exito/peligro = fin de partida.
 */
export type Tono = 'ether' | 'rival' | 'alerta' | 'exito' | 'peligro'

export const COLOR_TONO: Record<Tono, string> = {
  ether: '#7070ff',
  rival: '#f87171',
  alerta: '#fbbf24',
  exito: '#34d399',
  peligro: '#fb7185',
}
