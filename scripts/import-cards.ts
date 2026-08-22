/**
 * Script para importar cartas actualizadas desde un seed JSON exportado.
 * Lee EstasisDisonancia.json, limpia imágenes y genera el código TypeScript
 * para paquetes.ts.
 *
 * Uso: npx tsx scripts/import-cards.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const seedPath = resolve(process.cwd(), 'seed', 'EstasisDisonancia.json')
const raw = JSON.parse(readFileSync(seedPath, 'utf8')) as any[]

// Strip images and generate clean cards
const cleanCards = raw.map((c) => {
  const { imageUrl, hasImage, ...rest } = c
  return rest
})

// Split by paqueteId
const estasis = cleanCards.filter((c) => c.paqueteId === 'estasis')
const disonancia = cleanCards.filter((c) => c.paqueteId === 'disonancia')

console.log(`Total: ${cleanCards.length} cartas`)
console.log(`Estasis: ${estasis.length} cartas`)
console.log(`Disonancia: ${disonancia.length} cartas`)

// Write clean JSON for reference
const outPath = resolve(process.cwd(), 'seed', 'EstasisDisonancia-clean.json')
writeFileSync(outPath, JSON.stringify(cleanCards, null, 2))
console.log(`\nCartas limpias escritas en: ${outPath}`)

// Print IDs for verification
console.log('\n--- Estasis IDs ---')
estasis.forEach((c) => console.log(`  ${c.id}: ${c.name} (${c.type}) cost=${c.stats?.cost}`))
console.log('\n--- Disonancia IDs ---')
disonancia.forEach((c) => console.log(`  ${c.id}: ${c.name} (${c.type}) cost=${c.stats?.cost}`))
