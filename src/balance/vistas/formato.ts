import type { EvaluacionPresupuesto, MazoId } from '../tipos'

export const NOMBRE_MAZO: Record<MazoId, string> = { estasis: 'Estásis', disonancia: 'Disonancia' }

/** Número para una celda; null se muestra como raya, nunca como NaN. */
export function num(valor: number | null): string {
  if (valor === null || Number.isNaN(valor)) return '—'
  return String(Math.round(valor * 100) / 100)
}

/** Veredicto en palabras de la evaluación de presupuesto de un Campeón. */
export function veredictoDe(ev: EvaluacionPresupuesto): string {
  if (!ev.fueraDeBanda) return ev.exento ? 'Exenta: dentro de su tope propio' : 'Dentro de banda'
  if (ev.estado === 'bajo') return 'Fuera de banda: por debajo'
  if (ev.estado === 'sobre') return 'Fuera de banda: por encima'
  return 'Fuera de banda: excede un tope individual'
}
