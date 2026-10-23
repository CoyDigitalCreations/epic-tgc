import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { useCardImage } from '../../forge/hooks/useCardImage'
import { getCardMeta } from '../game'
import { cartasDePortada, resumenMazo } from '../resumenMazo'

/** Una carta del abanico de portada, con su arte real (diseño → /cartas, custom → IndexedDB). */
function CartaPortada({ cardId, indice, total, color }: { cardId: string; indice: number; total: number; color: string }) {
  const meta = getCardMeta(cardId)
  const imageUrl = useCardImage(cardId, meta?.hasImage, meta?.imageUrl)
  const centro = (total - 1) / 2
  const pos = indice - centro
  return (
    <div
      className="absolute bottom-4 left-1/2 -ml-[40px] w-[80px] origin-bottom overflow-hidden rounded-md border bg-[#14142b] shadow-[0_8px_20px_-6px_rgba(0,0,0,0.8)] transition-transform duration-300 ease-out [transform:translateX(calc(var(--x)*1px))_translateY(calc(var(--y)*1px))_rotate(calc(var(--r)*1deg))] group-hover:[transform:translateX(calc(var(--x)*1.1px))_translateY(calc(var(--y)*1px_-_6px))_rotate(calc(var(--r)*1.25deg))]"
      style={
        {
          aspectRatio: '744/1038',
          borderColor: `${color}66`,
          zIndex: indice,
          '--x': pos * 44,
          '--y': Math.abs(pos) * 7,
          '--r': pos * 7,
        } as CSSProperties
      }
    >
      {imageUrl ? (
        <img src={imageUrl} alt={meta?.name ?? ''} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-display text-sm font-bold text-[#4b4b7a]">✦</span>
      )}
    </div>
  )
}

export interface TarjetaMazoProps {
  nombre: string
  color: string
  etiqueta: string
  cardIds: string[]
  seleccionado: boolean
  onSeleccionar: () => void
  /** Solo los mazos personalizados se pueden editar. */
  onEditar?: () => void
}

/** Tarjeta de un mazo: abanico de portada, nombre, etiqueta y composición. Es un botón de selección. */
export function TarjetaMazo({ nombre, color, etiqueta, cardIds, seleccionado, onSeleccionar, onEditar }: TarjetaMazoProps) {
  const portada = useMemo(() => cartasDePortada(cardIds), [cardIds])
  const r = useMemo(() => resumenMazo(cardIds), [cardIds])
  const total = Math.max(1, r.eter + r.principal + r.vinculos)
  return (
    <div className="relative">
      <button
        type="button"
        aria-pressed={seleccionado}
        onClick={onSeleccionar}
        className={`group relative flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl border text-left transition-all duration-200 ${
          seleccionado ? '-translate-y-0.5 border-transparent' : 'border-white/10 hover:-translate-y-0.5 hover:border-white/25'
        }`}
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${color}26 0%, transparent 62%), linear-gradient(180deg, #181829 0%, #11111c 100%)`,
          boxShadow: seleccionado ? `0 0 0 2px ${color}, 0 18px 50px -12px ${color}66` : undefined,
        }}
      >
        {/* Portada: abanico con las mejores cartas */}
        <div className="relative mx-auto mt-4 h-[150px] w-full">
          {portada.map((id, i) => (
            <CartaPortada key={id} cardId={id} indice={i} total={portada.length} color={color} />
          ))}
        </div>

        <div className="px-5 pb-4 pt-3">
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate font-display text-xl font-bold tracking-wide" style={{ color }}>
              {nombre}
            </p>
            {seleccionado && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#0a0a12]"
                style={{ background: color }}
              >
                ✓ Elegido
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-gray-400">{etiqueta}</p>

          {/* Composición: Éter / Principal / Vínculos */}
          <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
            <span style={{ flex: r.eter, background: '#22d3ee' }} />
            <span style={{ flex: r.principal, background: '#7070ff' }} />
            <span style={{ flex: r.vinculos, background: '#ec4899' }} />
          </div>
          <p className="mt-1.5 font-mono text-[10px] text-gray-500">
            {`${total} cartas · Éter ${r.eter} · Principal ${r.principal} · Vínculos ${r.vinculos}`}
          </p>
          <p className="mt-0.5 text-[10px] text-gray-500">
            {`${r.campeones} Campeones · ${r.misticas} Místicas · ${r.arcanas} Arcanas`}
          </p>
        </div>
      </button>

      {onEditar && (
        <button
          type="button"
          onClick={onEditar}
          className="absolute right-3 top-3 z-10 cursor-pointer rounded-lg border border-white/15 bg-[#0a0a12]/80 px-3 py-1 text-[11px] text-gray-200 backdrop-blur transition-colors hover:border-white/30 hover:bg-[#0a0a12]"
        >
          Editar
        </button>
      )}
    </div>
  )
}
