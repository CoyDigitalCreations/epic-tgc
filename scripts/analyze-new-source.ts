/**
 * Análisis rápido: PrimerColeccionEfectos.json (nueva fuente de verdad) vs paquetes.ts.
 * Uso: npx tsx scripts/analyze-new-source.ts
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALL_CARDS } from '../src/shared/data/paquetes'

const __dirname = dirname(fileURLToPath(import.meta.url))
const raw = JSON.parse(readFileSync(resolve(__dirname, '../seed/PrimerColeccionEfectos.json'), 'utf8')) as any[]

console.log('Cartas en PrimerColeccionEfectos.json:', raw.length)
console.log('Cartas en paquetes.ts ALL_CARDS:', ALL_CARDS.length)

const idsNuevo = new Set(raw.map((c) => c.id))
const idsPaq = new Set(ALL_CARDS.map((c) => c.id))
console.log('IDs solo en JSON nuevo:', [...idsNuevo].filter((id) => !idsPaq.has(id)))
console.log('IDs solo en paquetes.ts:', [...idsPaq].filter((id) => !idsNuevo.has(id)))

const legacyKeys = new Set<string>()
const efectoLegacyCampos = ['efectoPasivo', 'efectoDisparo', 'efectoContinuo', 'efectoReserva', 'efectoPago', 'efectoBloqueo']
const efectoValores = new Map<string, number>()
const tipoTrigger = new Map<string, number>()
let conEfectoComandante = 0
let conCondicion = 0
let conVariantePago = 0

for (const c of raw) {
  for (const k of Object.keys(c)) {
    if (efectoLegacyCampos.includes(k) || k.endsWith('Data')) legacyKeys.add(k)
  }
  if (c.variantePago) conVariantePago++
  if (c.efectoComandante) conEfectoComandante++
  if (c.condicion) conCondicion++
  for (const e of c.efectos ?? []) {
    efectoValores.set(e.efecto ?? '(sin)', (efectoValores.get(e.efecto ?? '(sin)') ?? 0) + 1)
    const key = `${e.tipo}|${e.trigger ?? '(sin trigger)'}`
    tipoTrigger.set(key, (tipoTrigger.get(key) ?? 0) + 1)
  }
}

console.log('Campos legacy en tarjetas del JSON nuevo:', [...legacyKeys])
console.log('Cards con variantePago:', conVariantePago)
console.log('Cards con efectoComandante:', conEfectoComandante)
console.log('Cards con condicion:', conCondicion)
console.log('Valores de efecto:', [...efectoValores.entries()].sort((a, b) => b[1] - a[1]))
console.log('Combos tipo|trigger:', [...tipoTrigger.entries()].sort((a, b) => b[1] - a[1]))

let cartasDifieren = 0
const ejemplos: string[] = []
for (const c of raw) {
  const paq = ALL_CARDS.find((x) => x.id === c.id)
  if (!paq) continue
  const a = JSON.stringify(c.efectos ?? [])
  const b = JSON.stringify('efectos' in paq ? (paq.efectos ?? []) : [])
  if (a !== b) {
    cartasDifieren++
    if (ejemplos.length < 15) ejemplos.push(`${c.id} ${c.name}`)
  }
}
console.log('Cartas comunes con efectos DIFERENTES entre fuentes:', cartasDifieren)
console.log('Ejemplos:', ejemplos)
