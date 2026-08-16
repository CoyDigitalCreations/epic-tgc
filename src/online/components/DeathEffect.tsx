/**
 * Efecto de destrucción de carta: shake + fade + shrink.
 * Envuelve el contenido y aplica la animación al montarse.
 */
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface DeathEffectProps {
  children: ReactNode
  /** Callback al terminar la animación */
  onComplete?: () => void
  /** Duración total (ms) */
  duration?: number
}

export function DeathEffect({ children, onComplete, duration = 500 }: DeathEffectProps) {
  return (
    <motion.div
      initial={{ opacity: 1, scale: 1, rotate: 0 }}
      animate={{
        opacity: [1, 1, 0.5, 0],
        scale: [1, 1.05, 0.9, 0.3],
        rotate: [0, -3, 3, -2, 0],
        filter: ['brightness(1)', 'brightness(1.5)', 'brightness(0.5)', 'brightness(0)'],
      }}
      transition={{ duration: duration / 1000, ease: 'easeIn' }}
      onAnimationComplete={onComplete}
    >
      {children}
    </motion.div>
  )
}
