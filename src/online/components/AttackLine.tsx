/**
 * Línea de ataque animada: SVG que crece desde el atacante hacia el lado del rival.
 * Se renderiza como overlay sobre el grid.
 */
import { motion } from 'framer-motion'

interface AttackLineProps {
  /** Posición x del centro de la celda atacante (px相对于 el grid) */
  fromX: number
  /** Posición y del centro de la celda atacante */
  fromY: number
  /** Dirección: 'up' (A ataca → rival arriba) o 'down' (B ataca → rival abajo) */
  direction: 'up' | 'down'
  /** Duración de la animación (ms) */
  duration?: number
}

export function AttackLine({ fromX, fromY, direction, duration = 600 }: AttackLineProps) {
  const offsetY = direction === 'up' ? -120 : 120
  const toX = fromX
  const toY = fromY + offsetY

  return (
    <motion.svg
      className="absolute inset-0 w-full h-full pointer-events-none z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: duration / 1000, times: [0, 0.1, 0.7, 1] }}
    >
      <motion.line
        x1={fromX}
        y1={fromY}
        x2={toX}
        y2={toY}
        stroke="#ef4444"
        strokeWidth={3}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 1 }}
        animate={{ pathLength: 1, opacity: [1, 1, 0] }}
        transition={{ duration: duration / 1000, ease: 'easeOut' }}
      />
      {/* Punkto luminoso en la punta */}
      <motion.circle
        cx={toX}
        cy={toY}
        r={5}
        fill="#ef4444"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
        transition={{ duration: duration / 1000, delay: 0.3 }}
      />
    </motion.svg>
  )
}
