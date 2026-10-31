import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { FACETAS, POLOS, arte } from './contenido'

/** Aparece desde abajo al entrar en pantalla (una sola vez). `MotionConfig reducedMotion` lo respeta. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-70px' }}
      transition={{ duration: 0.65, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

/** Ilustración (arte puro, sin marco de carta) que se revela con un zoom suave. */
export function Arte({
  id,
  alt,
  className = '',
  ratio = 'aspect-square',
}: {
  id: string
  alt: string
  className?: string
  ratio?: string
}) {
  return (
    <motion.div
      className={`overflow-hidden rounded-xl border border-card-border/70 bg-black shadow-[0_18px_50px_rgba(0,0,0,0.55)] ${ratio} ${className}`}
      initial={{ opacity: 0, scale: 0.94 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <img
        src={arte(id)}
        alt={alt}
        width={1024}
        height={1024}
        loading="lazy"
        decoding="async"
        className="size-full object-cover transition-transform duration-700 hover:scale-105"
      />
    </motion.div>
  )
}

/** Cita del lore (caja con filete azul). */
export function Cita({
  children,
  autor,
  color = '#1a1acc',
}: {
  children: ReactNode
  autor?: ReactNode
  color?: string
}) {
  return (
    <Reveal>
      <blockquote
        className="my-6 rounded-r-lg border-l-[3px] bg-surface-2 px-5 py-4 text-[0.95rem] italic leading-relaxed text-gray-400"
        style={{ borderColor: color }}
      >
        {children}
        {autor && <footer className="mt-2 text-right text-sm not-italic text-ether-300">{autor}</footer>}
      </blockquote>
    </Reveal>
  )
}

const NODOS = [...POLOS, ...FACETAS]

/**
 * Mapa del Eje: dibuja la línea entre los Dos Polos y hace nacer las Seis Facetas a su alrededor,
 * en la posición cardinal que les da el lore.
 */
export function MapaEje() {
  return (
    <motion.svg
      viewBox="0 0 360 360"
      role="img"
      aria-label="Mapa del Eje: Orden al norte, Caos al sur y las seis facetas a su alrededor"
      className="mx-auto w-full max-w-md"
      initial="oculto"
      whileInView="visible"
      viewport={{ once: true, amount: 0.35 }}
    >
      <motion.circle
        cx="180"
        cy="180"
        r="146"
        fill="none"
        stroke="#3b3b5c"
        strokeWidth="1"
        strokeDasharray="3 6"
        variants={{ oculto: { pathLength: 0, opacity: 0 }, visible: { pathLength: 1, opacity: 1, transition: { duration: 1.6 } } }}
      />
      {FACETAS.map((f) => (
        <motion.line
          key={`r-${f.nombre}`}
          x1="180"
          y1="180"
          x2={f.x}
          y2={f.y}
          stroke={f.color}
          strokeOpacity="0.28"
          strokeWidth="1"
          variants={{ oculto: { pathLength: 0 }, visible: { pathLength: 1, transition: { duration: 0.9, delay: 0.9 } } }}
        />
      ))}
      <motion.line
        x1="180"
        y1="34"
        x2="180"
        y2="326"
        stroke="url(#eje)"
        strokeWidth="3"
        strokeLinecap="round"
        variants={{ oculto: { pathLength: 0 }, visible: { pathLength: 1, transition: { duration: 1.2 } } }}
      />
      <defs>
        <linearGradient id="eje" x1="0" y1="34" x2="0" y2="326" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#ef4444" />
        </linearGradient>
      </defs>
      <motion.circle
        cx="180"
        cy="180"
        r="6"
        fill="#a0a0ff"
        variants={{ oculto: { opacity: 0, scale: 0 }, visible: { opacity: 1, scale: [0, 1.6, 1], transition: { delay: 0.8, duration: 0.8 } } }}
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      />
      {NODOS.map((n, i) => {
        const esPolo = i < POLOS.length
        const r = esPolo ? 15 : 11
        const etiquetaY = n.y < 60 ? n.y - r - 7 : n.y + r + 14
        return (
          <motion.g
            key={n.nombre}
            variants={{
              oculto: { opacity: 0, scale: 0.4 },
              visible: { opacity: 1, scale: 1, transition: { delay: 0.7 + i * 0.14, type: 'spring', stiffness: 220, damping: 16 } },
            }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          >
            <circle cx={n.x} cy={n.y} r={r + 6} fill={n.color} fillOpacity="0.12" />
            <circle cx={n.x} cy={n.y} r={r} fill={n.color} fillOpacity="0.28" stroke={n.color} strokeWidth="2" />
            <text
              x={n.x}
              y={etiquetaY}
              textAnchor="middle"
              fontSize="10"
              fontWeight="700"
              letterSpacing="1"
              fill={n.color}
              fontFamily="Cinzel, serif"
            >
              {n.nombre}
            </text>
          </motion.g>
        )
      })}
    </motion.svg>
  )
}
