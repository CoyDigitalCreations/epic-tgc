import type { EstadoTabu, EvaluacionTabu } from '../tabu'
import type { EvaluacionPresupuesto, MazoId } from '../tipos'

export const NOMBRE_MAZO: Record<MazoId, string> = { estasis: 'Estásis', disonancia: 'Disonancia' }

/** Número para una celda; null se muestra como raya, nunca como NaN. */
export function num(valor: number | null): string {
  if (valor === null || Number.isNaN(valor)) return '—'
  return String(Math.round(valor * 100) / 100)
}

/** La escala del tabú en palabras (la usan el resumen por mazo y el análisis de carta). */
export const ESCALA_TABU = '0 no rompe ninguna regla; 1 cambia una regla con hueco previsto; 2 rompe una regla escrita del manual; 3 rompe un invariante del motor.'

const VEREDICTO_TABU_CORTO: Record<EstadoTabu, string> = {
  dentro: 'Dentro',
  'en-limite': 'En el límite',
  excede: 'Excede',
  exenta: 'Exenta',
  'sin-presupuesto': 'Sin veredicto',
}

/** Tabú de una carta en una celda: puntos, nivel máximo y veredicto en palabras (nunca solo color). */
export function textoTabu(ev: EvaluacionTabu): string {
  return `${ev.puntos} · nivel ${ev.nivelMax} · ${VEREDICTO_TABU_CORTO[ev.estado]}`
}

/** Veredicto en palabras de la evaluación de presupuesto de un Campeón. */
export function veredictoDe(ev: EvaluacionPresupuesto): string {
  if (!ev.fueraDeBanda) return ev.exento ? 'Exenta: dentro de su tope propio' : 'Dentro de banda'
  if (ev.estado === 'bajo') return 'Fuera de banda: por debajo'
  if (ev.estado === 'sobre') return 'Fuera de banda: por encima'
  return 'Fuera de banda: excede un tope individual'
}
