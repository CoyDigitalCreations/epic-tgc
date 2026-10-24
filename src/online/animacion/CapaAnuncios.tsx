import { useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { MiniCard } from '../components/MiniCard'
import { getCardMeta } from '../game/cards'
import type { CardInstance, PlayerId } from '../game/types'
import { centroDe } from './CapaCombate'
import type { Punto } from './CapaCombate'
import { EnVueloContext } from './contexto'

/** Entrada de anuncio (subconjunto de AnimacionEntrada que esta capa dibuja). */
export interface EntradaAnuncio {
  tipo: string
  texto?: string
  cardInstanceId?: string
  jugador?: PlayerId
  key: number
}

/** Nadie está "en vuelo" para la copia ampliada: si no, MiniCard la ocultaría mientras vuela la real. */
const SIN_VUELOS: ReadonlySet<string> = new Set()

/** Banner de turno/fase: entra desde un costado, se queda un instante y sale por el otro. */
function Banner({ entrada }: { entrada: EntradaAnuncio }) {
  const propio = entrada.jugador === 'A'
  return (
    <motion.div
      data-testid="banner-turno"
      className={`absolute left-1/2 top-[38%] -translate-x-1/2 whitespace-nowrap rounded-xl border px-8 py-3 font-display text-2xl font-black uppercase tracking-[0.2em] backdrop-blur-sm ${
        propio
          ? 'border-amber-400/70 bg-amber-950/70 text-amber-200 shadow-[0_0_30px_rgba(251,191,36,0.35)]'
          : 'border-red-400/70 bg-red-950/70 text-red-200 shadow-[0_0_30px_rgba(248,113,113,0.35)]'
      }`}
      initial={{ opacity: 0, x: -80 }}
      animate={{ opacity: [0, 1, 1, 0], x: [-80, 0, 0, 80] }}
      transition={{ duration: 1.3, times: [0, 0.2, 0.75, 1], ease: 'easeOut' }}
    >
      {entrada.texto}
    </motion.div>
  )
}

/** Activación propia: un anillo sobre la carta, en su sitio (el jugador ya sabe qué activó). */
function AnilloActivacion({ id }: { id: string }) {
  const [centro, setCentro] = useState<Punto | null>(null)
  useLayoutEffect(() => setCentro(centroDe(id)), [id])
  if (!centro) return null
  return (
    <svg aria-hidden="true" data-testid="anillo-activacion" className="absolute inset-0 h-full w-full">
      <motion.circle
        cx={centro.x}
        cy={centro.y}
        fill="none"
        stroke="#fbbf24"
        strokeWidth={4}
        style={{ filter: 'drop-shadow(0 0 8px #fbbf24)' }}
        initial={{ r: 10, opacity: 0 }}
        animate={{ r: [10, 60], opacity: [0, 1, 0] }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      />
      <motion.circle
        cx={centro.x}
        cy={centro.y}
        fill="none"
        stroke="#fde68a"
        strokeWidth={2}
        initial={{ r: 10, opacity: 0 }}
        animate={{ r: [10, 80], opacity: [0, 0.8, 0] }}
        transition={{ duration: 0.8, delay: 0.12, ease: 'easeOut' }}
      />
    </svg>
  )
}

/** Activación del rival: la carta aparece ampliada en el centro un instante, con su nombre. */
function CartaRivalAmpliada({ inst }: { inst: CardInstance }) {
  const nombre = inst.cardId ? getCardMeta(inst.cardId)?.name : undefined
  return (
    <motion.div
      data-testid="activacion-rival"
      className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0.6, 1.05, 1, 0.92], y: [20, 0, 0, -10] }}
      transition={{ duration: 1.4, times: [0, 0.2, 0.8, 1], ease: 'easeOut' }}
    >
      <div className="rounded-lg shadow-[0_0_36px_rgba(248,113,113,0.55)]">
        <EnVueloContext.Provider value={SIN_VUELOS}>
          <MiniCard inst={inst} anchoPx={150} sinAncla sinTooltip />
        </EnVueloContext.Provider>
      </div>
      {nombre && (
        <p className="rounded-md bg-red-950/80 px-3 py-1 font-display text-sm font-bold text-red-100">El rival activa: {nombre}</p>
      )}
    </motion.div>
  )
}

/**
 * Capa de anuncios (portal a body, debajo de los modales): banner de turno/fase y activaciones.
 * Lo propio se marca en su sitio; lo del rival se muestra ampliado para que se entienda qué pasó.
 */
export function CapaAnuncios({
  entradas,
  instancias,
  activa,
}: {
  entradas: EntradaAnuncio[] | undefined
  instancias: Record<string, CardInstance>
  activa: boolean
}) {
  const anuncios = (entradas ?? []).filter((e) => e.tipo === 'banner' || e.tipo === 'activacion')
  if (!activa || anuncios.length === 0 || typeof document === 'undefined') return null
  // Un solo banner a la vez (el último); las activaciones se apilan una por entrada
  const banner = anuncios.filter((e) => e.tipo === 'banner').at(-1)
  const activaciones = anuncios.filter((e) => e.tipo === 'activacion' && e.cardInstanceId)
  return createPortal(
    <div aria-hidden="true" data-testid="capa-anuncios" className="pointer-events-none fixed inset-0 z-[46]">
      {banner && <Banner key={banner.key} entrada={banner} />}
      {activaciones.map((a) => {
        const inst = instancias[a.cardInstanceId as string]
        if (a.jugador === 'B') return inst ? <CartaRivalAmpliada key={a.key} inst={inst} /> : null
        return <AnilloActivacion key={a.key} id={a.cardInstanceId as string} />
      })}
    </div>,
    document.body,
  )
}
