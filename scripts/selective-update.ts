/**
 * Actualización selectiva de paquetes.ts desde el seed export.
 * Lee el export, compara con paquetes.ts y agrega/actualiza campos faltantes.
 *
 * Uso: npx tsx scripts/selective-update.ts [--dry-run]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const isDryRun = process.argv.includes('--dry-run')

const cleanPath = resolve(process.cwd(), 'seed', 'EstasisDisonancia-clean.json')
const exportCards = JSON.parse(readFileSync(cleanPath, 'utf8')) as any[]

const paqPath = resolve(process.cwd(), 'src', 'shared', 'data', 'paquetes.ts')
let paqContent = readFileSync(paqPath, 'utf8')

// Fields to check/update (effect fields that might be missing)
const EFFECT_FIELDS = [
  'efectoPasivo', 'efectoContinuo', 'efectoDisparo', 'efectoReserva',
  'efectoPago', 'efectoBloqueo', 'efecto', 'variantePago',
  'disparoAgota', 'disparoUnSoloUso',
]

// Escape for TS string
function escTs(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

// Find the card block in paqContent (from id line to next card or closing bracket)
function findCardBlock(content: string, cardId: string): { start: number; end: number } | null {
  const idPattern = `id: '${cardId}'`
  const start = content.indexOf(idPattern)
  if (start === -1) return null

  // Find the opening { before id
  let blockStart = content.lastIndexOf('{', start)
  if (blockStart === -1) blockStart = start

  // Find the closing }, after id - look for next card's opening { or array end
  // Find the next card id after this one
  const afterThis = content.substring(start + idPattern.length)
  const nextIdMatch = afterThis.match(/\bid:\s*'[A-Z]{2}-\d+'/)
  if (nextIdMatch) {
    const nextIdIdx = afterThis.indexOf(nextIdMatch[0])
    // Go back to find the { before next card
    const beforeNext = content.substring(0, start + idPattern.length + nextIdIdx)
    const lastBrace = beforeNext.lastIndexOf('},')
    if (lastBrace !== -1) {
      return { start: blockStart, end: lastBrace + 2 } // include "},"
    }
  }

  // Last card in array - find the closing ]
  const arrayEnd = content.indexOf(']', start)
  if (arrayEnd !== -1) {
    const beforeEnd = content.substring(0, arrayEnd)
    const lastBrace = beforeEnd.lastIndexOf('},')
    if (lastBrace !== -1) {
      return { start: blockStart, end: lastBrace + 2 }
    }
  }

  return null
}

// Check if a field exists in a card block
function hasField(block: string, field: string): boolean {
  return new RegExp(`\\b${field}\\s*:`).test(block)
}

// Get field value from export card
function getFieldVal(card: any, field: string): string | boolean | null {
  if (field === 'disparoAgota' || field === 'disparoUnSoloUso') {
    return card[field] ?? null
  }
  return card[field] || null
}

// Insert a field before the closing of the card block
function insertField(block: string, field: string, value: string | boolean): string {
  const valStr = typeof value === 'boolean' ? String(value) : `'${escTs(value)}'`
  const line = `    ${field}: ${valStr},`

  // Insert before the last line that starts with } or },
  // Find the stats line or the last effect field
  const lines = block.split('\n')
  let insertIdx = lines.length - 1

  // Find where to insert (after stats, before closing brace)
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim()
    if (trimmed === '},' || trimmed === '}') {
      insertIdx = i
    } else if (trimmed.startsWith('stats:') || trimmed.startsWith('efecto') || trimmed.startsWith('variante') || trimmed.startsWith('disparo')) {
      insertIdx = i + 1
      break
    }
  }

  lines.splice(insertIdx, 0, line)
  return lines.join('\n')
}

// Update stats if changed
function updateStats(block: string, card: any): string {
  if (!card.stats) return block

  const statFields = ['cost', 'poder', 'resistencia']
  let updated = block

  for (const sf of statFields) {
    if (card.stats[sf] === undefined) continue

    const regex = new RegExp(`(stats:\\s*\\{[^}]*${sf}:\\s*)(\\d+)`)
    const match = updated.match(regex)
    if (match) {
      const currentVal = parseInt(match[2])
      if (currentVal !== card.stats[sf]) {
        updated = updated.replace(regex, `$1${card.stats[sf]}`)
        console.log(`    Updated stats.${sf}: ${currentVal} → ${card.stats[sf]}`)
      }
    }
  }

  return updated
}

// Process each card
let changes = 0
let cardsProcessed = 0

for (const exportCard of exportCards) {
  const block = findCardBlock(paqContent, exportCard.id)
  if (!block) {
    console.log(`⚠️  ${exportCard.id} (${exportCard.name}): NOT FOUND in paquetes.ts`)
    continue
  }

  const cardBlock = paqContent.substring(block.start, block.end)
  let newBlock = cardBlock
  let cardChanged = false

  // Check effect fields
  for (const field of EFFECT_FIELDS) {
    const exportVal = getFieldVal(exportCard, field)
    if (exportVal === null || exportVal === '' || exportVal === undefined) continue

    if (!hasField(newBlock, field)) {
      // Field missing - insert it
      newBlock = insertField(newBlock, field, exportVal)
      console.log(`  ${exportCard.id}: +${field} = ${typeof exportVal === 'boolean' ? exportVal : `"${String(exportVal).substring(0, 60)}..."`}`)
      cardChanged = true
      changes++
    }
  }

  // Check stats
  const oldBlock = newBlock
  newBlock = updateStats(newBlock, exportCard)
  if (newBlock !== oldBlock) cardChanged = true

  if (cardChanged) {
    paqContent = paqContent.substring(0, block.start) + newBlock + paqContent.substring(block.end)
    changes++
  }

  cardsProcessed++
}

console.log(`\n${isDryRun ? 'DRY RUN' : 'UPDATE'}: ${cardsProcessed} cards processed, ${changes} changes`)

if (!isDryRun && changes > 0) {
  writeFileSync(paqPath, paqContent)
  console.log(`✅ paquetes.ts updated`)
} else if (isDryRun) {
  console.log(`(dry run — no changes written)`)
}
