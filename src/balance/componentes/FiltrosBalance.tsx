import { useId } from 'react'
import { CARD_TYPES, RARITIES } from '../../shared/types/enums'
import { CONFIG_V1 } from '../config'
import { useFiltrosBalance } from '../useFiltrosBalance'

const MAZOS = [
  { valor: 'estasis', etiqueta: 'Estásis' },
  { valor: 'disonancia', etiqueta: 'Disonancia' },
] as const

const CAMPO = 'rounded-lg border border-card-border bg-surface px-2 py-1.5 text-sm text-gray-100'

function Selector({
  etiqueta,
  valor,
  opciones,
  onCambio,
}: {
  etiqueta: string
  valor: string
  opciones: readonly { valor: string; etiqueta: string }[]
  onCambio: (v: string) => void
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-display text-xs uppercase tracking-wider text-gray-400">
        {etiqueta}
      </label>
      <select id={id} value={valor} onChange={(e) => onCambio(e.target.value)} className={CAMPO}>
        <option value="">Todos</option>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
    </div>
  )
}

/** Filtros del tablero (mazo, tipo, coste, rareza), guardados en la URL. */
export function FiltrosBalance() {
  const { filtros, setFiltro, limpiar } = useFiltrosBalance()
  const costes = Object.keys(CONFIG_V1.bandas).map((c) => ({ valor: c, etiqueta: c }))
  const costeActual = filtros.coste === null ? '' : String(filtros.coste)
  if (costeActual !== '' && !costes.some((c) => c.valor === costeActual)) costes.push({ valor: costeActual, etiqueta: costeActual })

  return (
    <form
      aria-label="Filtros del tablero"
      onSubmit={(e) => e.preventDefault()}
      className="flex flex-wrap items-end gap-4 rounded-2xl border border-card-border bg-surface p-4"
    >
      <Selector
        etiqueta="Mazo"
        valor={filtros.mazo ?? ''}
        opciones={MAZOS}
        onCambio={(v) => setFiltro('mazo', (v || null) as typeof filtros.mazo)}
      />
      <Selector
        etiqueta="Tipo"
        valor={filtros.tipo ?? ''}
        opciones={CARD_TYPES.map((t) => ({ valor: t, etiqueta: t }))}
        onCambio={(v) => setFiltro('tipo', (v || null) as typeof filtros.tipo)}
      />
      <Selector
        etiqueta="Coste"
        valor={costeActual}
        opciones={costes}
        onCambio={(v) => setFiltro('coste', v === '' ? null : Number(v))}
      />
      <Selector
        etiqueta="Rareza"
        valor={filtros.rareza ?? ''}
        opciones={RARITIES.map((r) => ({ valor: r, etiqueta: r }))}
        onCambio={(v) => setFiltro('rareza', (v || null) as typeof filtros.rareza)}
      />
      <button
        type="button"
        onClick={limpiar}
        className="rounded-lg border border-card-border px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-surface-2 hover:text-ether-200"
      >
        Limpiar filtros
      </button>
    </form>
  )
}
