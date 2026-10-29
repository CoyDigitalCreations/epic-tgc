import { useEffect, useState } from 'react'

interface Props {
  /** Instante (ms, reloj local) en que vence el plazo. */
  venceEn: number
  /** Duración total del plazo, para el color de la barra. */
  limiteSegundos: number
  /** ¿Es mi turno? Cambia el rótulo: es MI tiempo o el del rival. */
  leToca: boolean
}

/** mm:ss sin pasarse de 0:00. */
export function formatearRestante(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/** Contador flotante del tiempo que le queda a quien debe actuar antes de perder por abandono. */
export function ContadorInactividad({ venceEn, limiteSegundos, leToca }: Props) {
  const [ahora, setAhora] = useState(() => Date.now())
  useEffect(() => {
    setAhora(Date.now())
    const t = window.setInterval(() => setAhora(Date.now()), 250)
    return () => window.clearInterval(t)
  }, [venceEn])

  const restanteMs = venceEn - ahora
  const fraccion = Math.min(1, Math.max(0, restanteMs / (limiteSegundos * 1000)))
  const urgente = restanteMs <= 10_000
  const aviso = restanteMs <= 30_000
  const tono = urgente
    ? 'border-rose-400/60 bg-rose-950/80 text-rose-100'
    : aviso
      ? 'border-amber-400/60 bg-amber-950/80 text-amber-100'
      : 'border-white/15 bg-[#10101c]/85 text-gray-100'

  return (
    <div
      role="timer"
      aria-label={leToca ? 'Tu tiempo para responder' : 'Tiempo del rival para responder'}
      className={`fixed right-3 top-14 z-[60] w-36 rounded-xl border px-3 py-1.5 shadow-lg backdrop-blur ${tono} ${urgente ? 'animate-pulse' : ''}`}
    >
      <p className="text-[9px] uppercase tracking-[0.18em] opacity-70">{leToca ? 'Tu tiempo' : 'Tiempo del rival'}</p>
      <p className="font-display text-xl font-bold leading-tight tabular-nums">⏱ {formatearRestante(restanteMs)}</p>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-current opacity-70 transition-[width] duration-200" style={{ width: `${fraccion * 100}%` }} />
      </div>
    </div>
  )
}
