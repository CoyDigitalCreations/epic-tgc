/**
 * Fase 0 — CLI del mapa de cobertura.
 * Fuente de verdad: seed/PrimerColeccionEfectos.json (NO paquetes.ts).
 * Uso: npx tsx scripts/coverage-map.ts
 * Escribe: docs/coverage-map.md e imprime el resumen por consola.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AnyCard } from '../src/shared/types'
import { buildReporte, formatReporte, pctOK } from '../src/online/game/coverageMap'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sourcePath = resolve(__dirname, '../seed/PrimerColeccionEfectos.json')
const outPath = resolve(__dirname, '../docs/coverage-map.md')

const cards = JSON.parse(readFileSync(sourcePath, 'utf8')) as AnyCard[]

const reporte = buildReporte(cards)
const markdown = formatReporte(reporte)

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, markdown, 'utf8')

const ok = pctOK(reporte)
console.log('─'.repeat(72))
console.log('MAPA DE COBERTURA — Motor vs JSON')
console.log(`Fuente de verdad: seed/PrimerColeccionEfectos.json`)
console.log('─'.repeat(72))
console.log(`Cartas: ${reporte.totalCartas} | Efectos: ${reporte.totalEfectos} | Combos únicos: ${reporte.combos.length}`)
console.log(`Cobertura data-driven: ${ok}%`)
console.log('')
console.log('Resumen por estado:')
for (const [estado, t] of Object.entries(reporte.totales)) {
  if (t.count === 0) continue
  const mark = estado.startsWith('OK') ? '✅' : estado.startsWith('PARCIAL') ? '⚠️ ' : estado.startsWith('HUECO') ? '❌' : '🔶'
  console.log(`  ${mark} ${estado.padEnd(20)} ${String(t.count).padStart(3)}  (${t.pct}%)`)
}
console.log('')
console.log(`Reporte completo escrito en: ${outPath}`)
