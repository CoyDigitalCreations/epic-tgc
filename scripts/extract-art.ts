/**
 * extract-art — Extrae el arte base64 de seed/PrimerColeccion.json
 * y lo escribe como PNG en public/cartas/{cardId}.png.
 *
 * Uso:
 *   npx tsx scripts/extract-art.ts [--dry-run]
 *
 * Flujo:
 *   1. Card-Maker: 📥 Exportar colección (con arte) → PrimerColeccion.json
 *   2. npx tsx scripts/extract-art.ts --dry-run
 *   3. npx tsx scripts/extract-art.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const INPUT_PATH = resolve(__dirname, '../seed/PrimerColeccion.json')
const OUTPUT_DIR = resolve(__dirname, '../public/cartas')

const dryRun = process.argv.includes('--dry-run')

console.log('─'.repeat(72))
console.log('EXTRACT ART — PrimerColeccion.json → public/cartas/')
console.log(`Input:  ${INPUT_PATH}`)
console.log(`Output: ${OUTPUT_DIR}`)
console.log(`Modo:   ${dryRun ? 'DRY-RUN (no escribe)' : 'ESCRIBIR'}`)
console.log('─'.repeat(72))

let cards: Array<{ id: string; imageUrl?: string }>
try {
  cards = JSON.parse(readFileSync(INPUT_PATH, 'utf8'))
} catch (err) {
  console.error(`\n❌ No se pudo leer/parsear: ${(err as Error).message}`)
  process.exit(1)
}

if (!Array.isArray(cards)) {
  console.error('\n❌ El JSON debe ser un array de cartas')
  process.exit(1)
}

console.log(`\nCartas en el JSON: ${cards.length}`)

const withArt = cards.filter(
  (c) => typeof c.imageUrl === 'string' && c.imageUrl.startsWith('data:'),
)
console.log(`Con arte base64:   ${withArt.length}`)

if (!dryRun) {
  mkdirSync(OUTPUT_DIR, { recursive: true })
}

let written = 0
let skipped = 0
let errors = 0

for (const card of withArt) {
  const match = card.imageUrl!.match(/^data:image\/(\w+);base64,(.+)$/)
  if (!match) {
    console.warn(`  ⚠️  ${card.id}: formato dataURL no reconocido`)
    errors++
    continue
  }

  const ext = match[1] === 'jpeg' ? 'jpg' : match[1]
  const base64 = match[2]
  const buffer = Buffer.from(base64, 'base64')
  const filename = `${card.id}.${ext}`
  const filepath = resolve(OUTPUT_DIR, filename)

  if (dryRun) {
    console.log(`  📝 ${filename} (${(buffer.length / 1024).toFixed(0)} KB)`)
  } else {
    writeFileSync(filepath, buffer)
    console.log(`  ✅ ${filename} (${(buffer.length / 1024).toFixed(0)} KB)`)
  }
  written++
}

// También limpiar PNGs viejos que ya no existen en el JSON
if (!dryRun) {
  const { readdirSync } = await import('node:fs')
  const existing = readdirSync(OUTPUT_DIR).filter((f) => f.endsWith('.png') || f.endsWith('.jpg'))
  const currentIds = new Set(withArt.map((c) => c.id))
  for (const file of existing) {
    const id = file.replace(/\.(png|jpg)$/, '')
    if (!currentIds.has(id)) {
      const { unlinkSync } = await import('node:fs')
      unlinkSync(resolve(OUTPUT_DIR, file))
      console.log(`  🗑️  Eliminado obsoleto: ${file}`)
    }
  }
}

console.log('\n─'.repeat(72))
console.log(`✅ ${written} imágenes ${dryRun ? 'detectadas' : 'escritas'}`)
if (errors > 0) console.log(`⚠️  ${errors} errores`)
console.log('─'.repeat(72))
