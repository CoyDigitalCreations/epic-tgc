import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Arte, Reveal } from './animaciones'
import type { Campeona } from './contenido'

/** Cabecera de sección: número + título, con el filete que se dibuja al entrar. */
export function Encabezado({
  n,
  id,
  titulo,
  nota,
  acento = '#7070ff',
}: {
  n: number
  id: string
  titulo: string
  nota?: string
  /** Color del número y del filete (Estásis: azul Éter; Disonancia: rojo). */
  acento?: string
}) {
  return (
    <Reveal>
      <div id={id} className="scroll-mt-24 border-b border-card-border pb-2">
        <h2 className="flex items-baseline gap-3 font-display text-xl font-bold uppercase tracking-wider text-gray-100 sm:text-2xl">
          <span style={{ color: acento }}>{n}</span>
          {titulo}
          {nota && <span className="text-xs font-normal normal-case tracking-normal text-gray-500">{nota}</span>}
        </h2>
        <motion.div
          className="mt-2 h-px origin-left"
          style={{ background: `linear-gradient(to right, ${acento}, ${acento}66, transparent)` }}
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </div>
    </Reveal>
  )
}

export const P = ({ children }: { children: ReactNode }) => (
  <Reveal>
    <p className="mb-4 text-[0.95rem] leading-[1.8] text-gray-300">{children}</p>
  </Reveal>
)

export const B = ({ children, color }: { children: ReactNode; color?: string }) => (
  <strong className="font-semibold text-white" style={color ? { color } : undefined}>
    {children}
  </strong>
)

/** Subtítulo de bloque dentro de una sección. */
export const Sub = ({ children, color = '#22d3ee' }: { children: ReactNode; color?: string }) => (
  <h3 className="mb-1 mt-12 font-display text-base font-bold uppercase tracking-wider" style={{ color }}>
    {children}
  </h3>
)

/** Tarjeta de un campeón del mazo: ilustración (sin marco), nombre sobre el arte y su ficha debajo. */
export function TarjetaCampeona({ c, i, acento = '#7070ff' }: { c: Campeona; i: number; acento?: string }) {
  return (
    <motion.article
      className="group overflow-hidden rounded-xl border border-card-border bg-surface-2"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.55, delay: (i % 3) * 0.1 }}
      whileHover={{ y: -6, borderColor: acento }}
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <img
          src={`/cartas/${c.id}.webp`}
          alt={`Ilustración de ${c.nombre}, ${c.titulo}`}
          width={1024}
          height={1024}
          loading="lazy"
          decoding="async"
          className="size-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-4 pb-3 pt-10">
          <h4 className="font-display text-base font-bold uppercase tracking-wider text-white">{c.nombre}</h4>
          <p className="text-xs" style={{ color: acento }}>
            {c.titulo}
          </p>
        </div>
      </div>
      <div className="p-4">
        <p className="mb-2 text-[11px] uppercase tracking-wider text-gray-500">
          {c.linea} · <em className="not-italic text-card-eter">{c.rol}</em>
        </p>
        <p className="text-sm leading-relaxed text-gray-400">{c.texto}</p>
      </div>
    </motion.article>
  )
}

export interface PasoCiclo {
  titulo: string
  texto: string
  cartas: string
  arte: string
}

/** Pasos numerados de un ciclo, cada uno con su ilustración. */
export function Ciclo({ pasos, acento = '#1a1acc' }: { pasos: readonly PasoCiclo[]; acento?: string }) {
  return (
    <ol className="space-y-5">
      {pasos.map((c, i) => (
        <motion.li
          key={c.titulo}
          className="grid items-center gap-5 rounded-xl border border-card-border bg-surface-2 p-4 sm:grid-cols-[9rem_1fr]"
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
        >
          <div className="relative">
            <Arte id={c.arte} alt={`Arte del paso ${i + 1}: ${c.titulo}`} ratio="aspect-square" className="max-w-[9rem]" />
            <span
              className="absolute -left-2 -top-2 grid size-7 place-items-center rounded-full font-display text-sm font-bold text-white shadow-lg"
              style={{ background: acento }}
            >
              {i + 1}
            </span>
          </div>
          <div>
            <h4 className="font-display text-base font-bold tracking-wide text-gray-100">{c.titulo}</h4>
            <p className="mt-1 text-sm leading-relaxed text-gray-400">{c.texto}</p>
            <p className="mt-2 text-xs text-gray-500">
              Cartas: <em className="text-gray-300">{c.cartas}</em>
            </p>
          </div>
        </motion.li>
      ))}
    </ol>
  )
}
