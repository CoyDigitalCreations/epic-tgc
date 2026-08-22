/**
 * Compara cartas del seed export vs paquetes.ts, campo por campo.
 * Uso: npx tsx scripts/compare-cards-v2.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const cleanPath = resolve(process.cwd(), 'seed', 'EstasisDisonancia-clean.json')
const cleanCards = JSON.parse(readFileSync(cleanPath, 'utf8')) as any[]

// Effect fields to compare
const FIELDS = [
  'efectoPasivo', 'efectoDisparo', 'efectoContinuo', 'efectoReserva',
  'efectoPago', 'efectoBloqueo', 'efecto', 'variantePago',
  'disparoAgota', 'disparoUnSoloUso', 'tipoEfecto',
  'cost', 'poder', 'resistencia',
]

let totalDiffs = 0

for (const card of cleanCards) {
  const diffs: string[] = []
  
  for (const field of FIELDS) {
    const newVal = field === 'cost' ? card.stats?.cost 
                : field === 'poder' ? card.stats?.poder
                : field === 'resistencia' ? card.stats?.resistencia
                : card[field]
    
    if (newVal === undefined || newVal === null || newVal === '') continue
    
    // Search for this card in paquetes.ts and check the field
    // Simple approach: read the file and search for the card ID
    const paqContent = readFileSync(resolve(process.cwd(), 'src', 'shared', 'data', 'paquetes.ts'), 'utf8')
    
    // Find card block
    const idIdx = paqContent.indexOf(`id: '${card.id}'`)
    if (idIdx === -1) {
      diffs.push(`  ${field}: CARD NOT FOUND IN paquetes.ts → ${newVal}`)
      continue
    }
    
    // Get next 1500 chars (card block)
    const block = paqContent.substring(idIdx, idIdx + 1500)
    
    // Check if field exists in block
    const fieldRegex = new RegExp(`${field}\\s*:\\s*`)
    if (!fieldRegex.test(block)) {
      if (field === 'cost' || field === 'poder' || field === 'resistencia') {
        // Stats might be in different format
        const statRegex = new RegExp(`${field}\\s*:\\s*(\\d+)`)
        const statMatch = paqContent.substring(idIdx - 200, idIdx + 1500).match(statRegex)
        if (!statMatch || parseInt(statMatch[1]) !== newVal) {
          diffs.push(`  ${field}: ${statMatch?.[1] ?? 'NOT FOUND'} → ${newVal}`)
        }
      } else {
        diffs.push(`  ${field}: MISSING → ${newVal}`)
      }
      continue
    }
    
    // Extract current value
    const afterField = block.substring(block.indexOf(field) + field.length)
    const valueMatch = afterField.match(/:\s*(['"`])(.*?)\1/) || afterField.match(/:\s*(true|false|\d+)/)
    const currentVal = valueMatch ? valueMatch[2] || valueMatch[1] : null
    
    // Compare
    const newValStr = String(newVal)
    if (currentVal !== newValStr && currentVal !== `'${newValStr}'`) {
      diffs.push(`  ${field}: ${currentVal ?? 'null'} → ${newVal}`)
    }
  }
  
  if (diffs.length > 0) {
    console.log(`${card.id} (${card.name}):`)
    diffs.forEach(d => console.log(d))
    console.log()
    totalDiffs += diffs.length
  }
}

console.log(`\nTotal differences: ${totalDiffs}`)
