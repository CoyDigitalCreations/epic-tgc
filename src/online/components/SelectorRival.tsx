import { useMemo } from 'react'
import { MedallonFaccion } from '../../forge/components/card-art/arte-codigo'
import { RuneIcon } from '../../forge/components/card-art/RuneIcon'
import { faccionDeSet, MAZOS, type MazoJugable, type RivalElegido, type SetId } from '../mazos'
import { COLOR_PRINCIPAL_BASE, COLORES_PRINCIPAL, resumenMazo } from '../resumenMazo'

export interface SelectorRivalProps {
  /** Lo que está elegido ahora: 'auto' o un set oficial. */
  valor: RivalElegido
  onCambiar: (r: RivalElegido) => void
  /** Set que jugaría el bot en Automático (el espejo del tuyo): se marca con «Espejo» y se nombra en la ficha Automático. */
  automatico: MazoJugable
}

/** Miniatura de la composición del mazo: Éter, Campeones, Místicas, Arcanas y Vínculos. */
function BarraMini({ cardIds }: { cardIds: string[] }) {
  const r = useMemo(() => resumenMazo(cardIds), [cardIds])
  const otros = Math.max(0, r.principal - r.campeones - r.misticas - r.arcanas)
  return (
    <span aria-hidden="true" className="flex h-1 w-full overflow-hidden rounded-full bg-white/10">
      <span style={{ flex: r.eter, background: '#22d3ee' }} />
      <span style={{ flex: r.campeones, background: COLORES_PRINCIPAL.campeones }} />
      <span style={{ flex: r.misticas, background: COLORES_PRINCIPAL.misticas }} />
      <span style={{ flex: r.arcanas, background: COLORES_PRINCIPAL.arcanas }} />
      {otros > 0 && <span style={{ flex: otros, background: COLOR_PRINCIPAL_BASE }} />}
      <span style={{ flex: r.vinculos, background: '#ec4899' }} />
    </span>
  )
}

/** Marca de «elegido»: un check pequeño en la esquina de la ficha. */
function Check({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full text-[10px] font-bold text-[#0a0a12]"
      style={{ background: color }}
    >
      ✓
    </span>
  )
}

/**
 * Selector del mazo del rival: una ficha por set oficial (medallón, nombre y composición en miniatura) y una ficha
 * «Automático» que ocupa todo el ancho. La elegida se ilumina con el color de su mazo.
 */
export function SelectorRival({ valor, onCambiar, automatico }: SelectorRivalProps) {
  const autoActivo = valor === 'auto'
  return (
    <div role="group" aria-label="Mazo del rival" className="-mt-2 mb-5 grid grid-cols-2 gap-2">
      <button
        type="button"
        aria-pressed={autoActivo}
        onClick={() => onCambiar('auto')}
        className={`group relative col-span-2 flex cursor-pointer items-center gap-3 overflow-hidden rounded-xl border px-3 py-2 text-left transition-all duration-200 ${
          autoActivo ? 'border-transparent bg-white/[0.06]' : 'border-white/10 hover:-translate-y-px hover:border-white/25'
        }`}
        style={autoActivo ? { boxShadow: '0 0 0 1.5px #9ca3af, 0 8px 22px -10px rgba(156,163,175,0.55)' } : undefined}
      >
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-sm text-gray-300 transition-transform duration-300 group-hover:rotate-180"
        >
          ⇄
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-sm font-bold text-gray-100">Automático</span>
          <span className="block truncate text-[11px] text-gray-500">{`Espejo del tuyo: ${automatico.nombre}`}</span>
        </span>
        {autoActivo && <Check color="#9ca3af" />}
      </button>

      {MAZOS.map((m) => {
        const activo = valor === m.id
        const esEspejo = autoActivo && automatico.id === m.id
        return (
          <button
            key={m.id}
            type="button"
            aria-pressed={activo}
            onClick={() => onCambiar(m.id as SetId)}
            className={`group relative flex cursor-pointer flex-col gap-2 overflow-hidden rounded-xl border px-2.5 pb-2.5 pt-2.5 text-left transition-all duration-200 ${
              activo ? 'border-transparent' : 'border-white/10 hover:-translate-y-px hover:border-white/25'
            }`}
            style={{
              background: `radial-gradient(ellipse at 18% 0%, ${m.color}${activo ? '33' : '1a'} 0%, transparent 70%), linear-gradient(180deg, #181829 0%, #11111c 100%)`,
              boxShadow: activo ? `0 0 0 1.5px ${m.color}, 0 10px 26px -10px ${m.color}99` : undefined,
            }}
          >
            <span className="flex items-center gap-2">
              {/* Medallón con la runa de su facción encima, como en la carta */}
              <span className="relative flex size-9 shrink-0 items-center justify-center">
                <MedallonFaccion color={m.color} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
                <span className="relative flex drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  <RuneIcon faccion={faccionDeSet(m.id)} color={m.color} size={20} strokeWidth={2.5} />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-[11.5px] font-bold leading-tight tracking-normal" style={{ color: m.color }}>
                  {m.nombre}
                </span>
                <span className="block text-[10px] leading-tight text-gray-500">{esEspejo ? 'Espejo' : activo ? 'Elegido' : 'Set oficial'}</span>
              </span>
            </span>
            <BarraMini cardIds={m.cardIds} />
            {activo && <Check color={m.color} />}
          </button>
        )
      })}
    </div>
  )
}
