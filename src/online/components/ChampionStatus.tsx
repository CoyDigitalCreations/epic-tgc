/**
 * Strip de indicadores de estado para un Campeón en el tablero:
 * - ATQ/RES efectivos con semáforo (rojo/amarillo/verde)
 * - Foco continuo (gris/verde/rojo)
 * - Foco temporal (gris/verde)
 */
import { statsComparativos, focosState } from '../game/stats'
import { keywordsDe } from '../game/efectos'
import { esCampeon, getCardMeta } from '../game/cards'
import type { GameState } from '../game'

const COLOR_CLASSES: Record<string, string> = {
  rojo: 'text-red-400',
  amarillo: 'text-yellow-400',
  verde: 'text-green-400',
}

const FOCO_CLASSES: Record<string, string> = {
  gris: 'bg-gray-500',
  verde: 'bg-green-500',
  rojo: 'bg-red-500',
}

interface ChampionStatusProps {
  s: GameState
  id: string
  invertida?: boolean
}

/** Stats debajo de la carta: X-ATQ Y-RES con colores + keywords. */
export function ChampionStatus({ s, id, invertida }: ChampionStatusProps) {
  const stats = statsComparativos(s, id)
  if (!stats) return null

  const inst = s.instances[id]
  const cardId = inst?.cardId ?? null
  const meta = cardId ? getCardMeta(cardId) : null
  const esCamp = meta ? esCampeon(meta) : false
  const kws = esCamp ? keywordsDe(s, id) : []
  const tempKws = inst?.keywordsTemporales ?? []

  const rotStyle = invertida ? { transform: 'rotate(180deg)' } : undefined

  return (
    <div className="flex flex-col items-center gap-0.5 mt-0.5 px-1" data-testid={`status-${id}`} style={rotStyle}>
      <div className="flex items-center gap-1.5">
        <span className={`text-[10px] font-mono font-bold ${COLOR_CLASSES[stats.atq.color]}`}>
          {stats.atq.actual}-ATQ
        </span>
        <span className={`text-[10px] font-mono font-bold ${COLOR_CLASSES[stats.res.color]}`}>
          {stats.res.actual}-RES
        </span>
      </div>
      {kws.length > 0 && (
        <div className="flex flex-wrap gap-0.5 justify-center">
          {kws.map((kw) => (
            <span
              key={kw}
              className={`text-[7px] px-1 rounded ${tempKws.includes(kw) ? 'bg-yellow-800/50 text-yellow-300' : 'bg-blue-800/50 text-blue-300'}`}
              title={tempKws.includes(kw) ? `${kw} (temporal)` : `${kw} (permanente)`}
            >
              {kw}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/** Focos de estado a la derecha de la celda: ∞ continuo + ★ activación + ⚡ disparo. */
export function FocosChampion({ s, id, invertida }: ChampionStatusProps) {
  const focos = focosState(s, id)
  if (!focos) return null

  const rotStyle = invertida ? { transform: 'rotate(180deg)' } : undefined

  return (
    <div className="flex flex-col items-center gap-1 absolute -right-6 top-1" data-testid={`focos-${id}`}>
      {/* Continuo: ∞ + dot */}
      <div className="flex items-center gap-0.5" style={rotStyle}>
        <span className="text-[9px] text-gray-400 leading-none">∞</span>
        <span
          className={`inline-block w-2 h-2 rounded-full ${FOCO_CLASSES[focos.continuo]}`}
          title={focos.continuo === 'verde' ? 'Efecto continuo activo' : focos.continuo === 'rojo' ? 'Efecto continuo inactivo' : 'Sin efectos continuos'}
        />
      </div>
      {/* Activación: ★ + dot */}
      <div className="flex items-center gap-0.5" style={rotStyle}>
        <span className="text-[9px] text-gray-400 leading-none">★</span>
        <span
          className={`inline-block w-2 h-2 rounded-full ${FOCO_CLASSES[focos.temporal]}`}
          title={focos.temporal === 'verde' ? 'Efecto temporal activo' : 'Sin efectos temporales'}
        />
      </div>
      {/* Disparo: ⚡ + dot */}
      <div className="flex items-center gap-0.5" style={rotStyle}>
        <span className="text-[9px] text-gray-400 leading-none">⚡</span>
        <span
          className={`inline-block w-2 h-2 rounded-full ${FOCO_CLASSES[focos.disparo]}`}
          title={focos.disparo === 'verde' ? 'Habilidad activa disponible' : 'Sin habilidad activa'}
        />
      </div>
    </div>
  )
}
