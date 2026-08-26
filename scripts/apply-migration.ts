/**
 * Migra efectoData a paquetes.ts desde el JSON de migración.
 * Lee el JSON generado y agrega efectoData a cada carta.
 *
 * Uso: npx tsx scripts/apply-migration.ts [--dry-run]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const isDryRun = process.argv.includes('--dry-run')

const migrationPath = resolve(process.cwd(), 'seed', 'efectodata-migration.json')
const migrationData = JSON.parse(readFileSync(migrationPath, 'utf8')) as any[]

const paqPath = resolve(process.cwd(), 'src', 'shared', 'data', 'paquetes.ts')
let paqContent = readFileSync(paqPath, 'utf8')

// Create a map of card ID -> efectoData
const efectoDataMap = new Map<string, any>()
for (const card of migrationData) {
  if (Object.keys(card.efectoData).length > 0) {
    efectoDataMap.set(card.id, card.efectoData)
  }
}

console.log(`Found ${efectoDataMap.size} cards with efectoData to migrate`)

// For each card in paquetes.ts, add efectoData
let changes = 0

for (const [cardId, efectoData] of efectoDataMap) {
  // Find the card block in paqContent
  const idPattern = `id: '${cardId}'`
  const start = paqContent.indexOf(idPattern)
  if (start === -1) {
    console.log(`⚠️  ${cardId}: NOT FOUND in paquetes.ts`)
    continue
  }

  // Find the closing }, after this card
  const afterThis = paqContent.substring(start + idPattern.length)
  const nextCardMatch = afterThis.match(/\bid:\s*'[A-Z]{2}-\d+'/)
  let endIdx: number
  if (nextCardMatch) {
    const nextIdIdx = afterThis.indexOf(nextCardMatch[0])
    const beforeNext = paqContent.substring(0, start + idPattern.length + nextIdIdx)
    endIdx = beforeNext.lastIndexOf('},')
    if (endIdx === -1) endIdx = start + idPattern.length + nextIdIdx
    else endIdx += 2
  } else {
    // Last card
    const arrayEnd = paqContent.indexOf(']', start)
    const beforeEnd = paqContent.substring(0, arrayEnd)
    endIdx = beforeEnd.lastIndexOf('},')
    if (endIdx === -1) endIdx = arrayEnd
    else endIdx += 2
  }

  const cardBlock = paqContent.substring(start, endIdx)

  // Check if efectoData already exists
  if (cardBlock.includes('efectoPasivoData') || cardBlock.includes('efectoDisparoData') ||
      cardBlock.includes('efectoContinuoData') || cardBlock.includes('efectoData') ||
      cardBlock.includes('efectoReservaData') || cardBlock.includes('efectoPagoData') ||
      cardBlock.includes('efectoBloqueoData') || cardBlock.includes('condicionData') ||
      cardBlock.includes('recompensaData')) {
    // Already has effect data, skip
    continue
  }

  // Generate efectoData lines
  const dataLines: string[] = []
  for (const [key, value] of Object.entries(efectoData)) {
    dataLines.push(`    ${key}: ${JSON.stringify(value)},`)
  }

  if (dataLines.length === 0) continue

  // Insert before the closing }
  const insertPoint = cardBlock.lastIndexOf('}')
  const newBlock = cardBlock.substring(0, insertPoint) + dataLines.join('\n') + '\n  ' + cardBlock.substring(insertPoint)

  paqContent = paqContent.substring(0, start) + newBlock + paqContent.substring(endIdx)
  changes++
  console.log(`  ${cardId}: +${Object.keys(efectoData).length} efectoData fields`)
}

console.log(`\n${isDryRun ? 'DRY RUN' : 'UPDATE'}: ${changes} cards updated`)

if (!isDryRun && changes > 0) {
  writeFileSync(paqPath, paqContent)
  console.log(`✅ paquetes.ts updated with efectoData`)
} else if (isDryRun) {
  console.log(`(dry run — no changes written)`)
}
