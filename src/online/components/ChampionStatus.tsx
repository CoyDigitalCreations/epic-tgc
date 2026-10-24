/**
 * Strip de indicadores de estado para un Campeón en el tablero:
 * - ATQ/RES efectivos con semáforo (rojo/amarillo/verde)
 * - Foco continuo (gris/verde/rojo)
 * - Foco temporal (gris/verde)
 */
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { statsComparativos, focosState } from '../game/stats'
import { useAnimacionActiva } from '../animacion/contexto'
import { keywordsDe } from '../game/efectos'
import { esCampeon, getCardMeta } from '../game/cards'
import type { GameState } from '../game'
import { useCompacto } from './tableroContext'

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

/** Cuánto cambiaron ATQ y RES en la última actualización (`k` reinicia la animación aunque el delta se repita). */
interface CambioStats {
  atq: number
  res: number
  k: number
}

/**
 * Detecta que ATQ/RES cambiaron (buff, debuff, expiración) para mostrar el "+2" flotante.
 * Al montarse no hay "antes": una carta que entra al campo no anuncia sus stats base.
 */
function useCambiosDeStats(atq: number | undefined, res: number | undefined): CambioStats | null {
  const activa = useAnimacionActiva()
  const previo = useRef({ atq, res })
  const [cambio, setCambio] = useState<CambioStats | null>(null)
  useEffect(() => {
    const antes = previo.current
    previo.current = { atq, res }
    if (!activa || atq === undefined || res === undefined) return
    if (antes.atq === undefined || antes.res === undefined) return
    const dAtq = atq - antes.atq
    const dRes = res - antes.res
    if (dAtq === 0 && dRes === 0) return
    setCambio((c) => ({ atq: dAtq, res: dRes, k: (c?.k ?? 0) + 1 }))
    const id = window.setTimeout(() => setCambio(null), 1100)
    return () => window.clearTimeout(id)
  }, [atq, res, activa])
  return cambio
}

/** Una cifra (ATQ o RES): si cambió, hace "pop" y suelta el delta flotando. Se remonta por `key` para reiniciar. */
function Cifra({ clase, delta, children }: { clase: string; delta: number; children: ReactNode }) {
  return (
    <span className={`relative inline-block ${clase} ${delta !== 0 ? 'anim-stat-pop' : ''}`}>
      {children}
      {delta !== 0 && (
        <span
          aria-hidden="true"
          data-testid="delta-stat"
          className={`anim-delta pointer-events-none absolute -top-3 left-1/2 text-[11px] font-black ${delta > 0 ? 'text-green-300' : 'text-red-400'}`}
          style={{ textShadow: '0 0 6px currentColor' }}
        >
          {delta > 0 ? `+${delta}` : delta}
        </span>
      )}
    </span>
  )
}

interface ChampionStatusProps {
  s: GameState
  id: string
  invertida?: boolean
}

/** Stats debajo de la carta: X-ATQ Y-RES con colores + keywords. */
export function ChampionStatus({ s, id, invertida }: ChampionStatusProps) {
  const compacto = useCompacto()
  const stats = statsComparativos(s, id)
  const cambio = useCambiosDeStats(stats?.atq.actual, stats?.res.actual)
  if (!stats) return null
  const k = cambio?.k ?? 0

  const inst = s.instances[id]
  const cardId = inst?.cardId ?? null
  const meta = cardId ? getCardMeta(cardId) : null
  const esCamp = meta ? esCampeon(meta) : false
  const kws = esCamp ? keywordsDe(s, id) : []
  const tempKws = inst?.keywordsTemporales ?? []

  const rotStyle = invertida ? { transform: 'rotate(180deg)' } : undefined

  // Compacto: "3/6" con los mismos colores. El "3-ATQ 6-RES" mide ~70px y, como las columnas de la grilla son 1fr,
  // una sola etiqueta ensanchaba las 7 columnas y el tablero se salía de la pantalla. Las keywords van en el title.
  if (compacto) {
    return (
      <div
        className="flex items-center justify-center gap-px mt-0.5 font-mono text-[9px] font-bold leading-none"
        data-testid={`status-${id}`}
        style={rotStyle}
        title={`${stats.atq.actual} ATQ / ${stats.res.actual} RES${kws.length > 0 ? ` · ${kws.join(', ')}` : ''}`}
      >
        <Cifra key={`atq-${k}`} clase={COLOR_CLASSES[stats.atq.color]} delta={cambio?.atq ?? 0}>{stats.atq.actual}</Cifra>
        <span className="text-gray-500">/</span>
        <Cifra key={`res-${k}`} clase={COLOR_CLASSES[stats.res.color]} delta={cambio?.res ?? 0}>{stats.res.actual}</Cifra>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-0.5 mt-0.5 px-1" data-testid={`status-${id}`} style={rotStyle}>
      <div className="flex items-center gap-1.5">
        <Cifra key={`atq-${k}`} clase={`text-[10px] font-mono font-bold ${COLOR_CLASSES[stats.atq.color]}`} delta={cambio?.atq ?? 0}>
          {stats.atq.actual}-ATQ
        </Cifra>
        <Cifra key={`res-${k}`} clase={`text-[10px] font-mono font-bold ${COLOR_CLASSES[stats.res.color]}`} delta={cambio?.res ?? 0}>
          {stats.res.actual}-RES
        </Cifra>
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
