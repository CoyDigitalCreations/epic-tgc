/**
 * Compara el seed actualizado con paquetes.ts para encontrar diferencias.
 * Uso: npx tsx scripts/compare-cards.ts
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const cleanPath = resolve(process.cwd(), 'seed', 'EstasisDisonancia-clean.json')
const cleanCards = JSON.parse(readFileSync(cleanPath, 'utf8')) as any[]

// Import paquetes.ts cards
const paquetesPath = resolve(process.cwd(), 'src', 'shared', 'data', 'paquetes.ts')
const paquetesContent = readFileSync(paquetesPath, 'utf8')

// Extract card data from paquetes.ts using regex
function extractCards(content: string, arrayName: string): any[] {
  // Find the array
  const startIdx = content.indexOf(`export const ${arrayName}: AnyCard[] = [`)
  if (startIdx === -1) return []
  
  // Find the closing bracket
  let bracketCount = 0
  let inArray = false
  let endIdx = startIdx
  for (let i = startIdx; i < content.length; i++) {
    if (content[i] === '[') { bracketCount++; inArray = true }
    if (content[i] === ']') { bracketCount--; if (inArray && bracketCount === 0) { endIdx = i; break } }
  }
  
  // Extract and parse
  const arrayStr = content.substring(startIdx, endIdx + 1)
  // Simple extraction: find each card object
  const cards = []
  const cardRegex = /\{[^{}]*id:\s*'([^']+)'[^{}]*\}/g
  let match
  while ((match = cardRegex.exec(arrayStr)) !== null) {
    cards.push(match[1])
  }
  return cards
}

// Compare IDs
const estasisIds = cleanCards.filter(c => c.paqueteId === 'estasis').map(c => c.id)
const disonanciaIds = cleanCards.filter(c => c.paqueteId === 'disonancia').map(c => c.id)

// Check current paquetes.ts for specific fields
function checkCard(content: string, cardId: string, field: string): string | null {
  const regex = new RegExp(`id:\\s*'${cardId}'[\\s\\S]*?${field}:\\s*'([^']*)'`)
  const match = content.match(regex)
  return match ? match[1] : null
}

function checkCardObj(content: string, cardId: string, field: string): any | null {
  // Find card block
  const idPattern = `id: '${cardId}'`
  const idx = content.indexOf(idPattern)
  if (idx === -1) return null
  
  // Find the field after this card
  const afterCard = content.substring(idx, idx + 2000)
  const fieldRegex = new RegExp(`${field}:\\s*([\\[{]'[^']*'?|\\d+|true|false)`)
  const match = afterCard.match(fieldRegex)
  return match ? match[1] : null
}

console.log('=== CAMBIOS DETECTADOS ===\n')

// Compare each card
const allIds = [...new Set([...estasisIds, ...disonanciaIds])]
for (const id of allIds) {
  const cleanCard = cleanCards.find(c => c.id === id)
  if (!cleanCard) continue
  
  const changes: string[] = []
  
  // Check key fields
  for (const field of ['efectoPasivo', 'efectoDisparo', 'efectoContinuo', 'efectoReserva', 
                        'efectoPago', 'efectoBloqueo', 'efecto', 'variantePago',
                        'disparoAgota', 'disparoUnSoloUso', 'tipoEfecto']) {
    const cleanVal = cleanCard[field]
    const currentVal = checkCardObj(paquetesContent, id, field)
    
    if (cleanVal !== undefined && cleanVal !== null && cleanVal !== '' && 
        currentVal !== cleanVal && currentVal !== `'${cleanVal}'`) {
      changes.push(`  ${field}: ${currentVal ?? '(none)'} → ${cleanVal}`)
    }
  }
  
  // Check cost
  const cleanCost = cleanCard.stats?.cost
  const costMatch = paquetesContent.match(new RegExp(`id:\\s*'${id}'[\\s\\S]*?cost:\\s*(\\d+)`))
  const currentCost = costMatch ? parseInt(costMatch[1]) : null
  if (cleanCost !== undefined && currentCost !== cleanCost) {
    changes.push(`  cost: ${currentCost} → ${cleanCost}`)
  }
  
  if (changes.length > 0) {
    console.log(`${id} (${cleanCard.name}):`)
    changes.forEach(c => console.log(c))
    console.log()
  }
}
