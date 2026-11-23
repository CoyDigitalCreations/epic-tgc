/**
 * generar-cartas-elite — Regenera el BANCO DE PRUEBA DEL BALANCE DE ÉLITES dentro de seed/CartasPrueba.json (ids PR-100 en adelante).
 *
 * Uso:
 *   npm run generar:cartas-elite -- [--dry-run]
 *
 * Idempotente: borra todo id PR-1xx o mayor del archivo y vuelve a generarlos con la fórmula vigente de src/balance/config.ts.
 * No toca las cartas PR-001..PR-075 (el banco del motor). La lógica vive en scripts/lib/cartasBalanceElite.ts.
 * Conserva el formato del archivo (2 espacios, sin salto de línea final).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ES_ID_DEL_BANCO, generarBanco } from './lib/cartasBalanceElite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ruta = resolve(__dirname, '../seed/CartasPrueba.json')
const dryRun = process.argv.includes('--dry-run')

const existentes = JSON.parse(readFileSync(ruta, 'utf8')) as Array<Record<string, unknown>>
const base = existentes.filter((c) => !ES_ID_DEL_BANCO(String(c.id)))
const { cartas } = generarBanco()

console.log(`Cartas base conservadas: ${base.length}`)
console.log(`Cartas del banco de élites reemplazadas: ${existentes.length - base.length} → generadas: ${cartas.length}`)

if (dryRun) {
  console.log('DRY-RUN: no se escribió nada.')
} else {
  writeFileSync(ruta, JSON.stringify([...base, ...cartas], null, 2))
  console.log(`→ escrito ${ruta}`)
}
