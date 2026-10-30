/**
 * "ATQ x · RES y" de un Campeón para las galerías de decisión (batalla, elegir objetivo…).
 * Muestra los valores ACTUALES (con buffs, debuffs y auras); si difieren de los impresos en la
 * carta, los pinta con semáforo y deja el valor original entre paréntesis. Sin cambios, es
 * el texto plano de siempre.
 */
import { statsComparativos } from '../game/stats'
import type { GameState } from '../game'

const COLOR: Record<string, string> = {
  rojo: 'text-red-400',
  verde: 'text-green-400',
  amarillo: '',
}

interface StatsCampeonProps {
  s: GameState
  id: string
}

export function StatsCampeon({ s, id }: StatsCampeonProps) {
  const stats = statsComparativos(s, id)
  if (!stats) return null

  const { atq, res } = stats
  if (atq.actual === atq.base && res.actual === res.base) return <>{`ATQ ${atq.actual} · RES ${res.actual}`}</>

  const cifra = (etiqueta: string, c: typeof atq) =>
    c.actual === c.base ? (
      <span>{`${etiqueta} ${c.actual}`}</span>
    ) : (
      <span title={`${etiqueta} base: ${c.base}`}>
        {`${etiqueta} `}
        <span className={`font-bold ${COLOR[c.color]}`}>{c.actual}</span>
        <span className="text-[9px] text-gray-500">{` (${c.base})`}</span>
      </span>
    )

  return (
    <>
      {cifra('ATQ', atq)} · {cifra('RES', res)}
    </>
  )
}
