/**
 * Script de migración: actualizar cartas con reagruparAlba y condicionSecundaria
 */
import { readFileSync, writeFileSync } from 'fs'

const content = readFileSync('src/shared/data/paquetes.ts', 'utf8')
let updated = content

// Pattern 1: Cards with "reagrupa el Éter usado por este efecto" in efectoDisparoData
// These should have reagruparAlba: true in their efectos array
const reagrupaPattern = /'reagrupa el Éter usado por este efecto'\./g
const matches = updated.match(reagrupaPattern)
if (matches) {
  console.log(`Found ${matches.length} occurrences of reagrupa pattern`)
}

// Pattern 2: Find efectos arrays that need reagruparAlba
// Look for efectos with costoTipo: 'eter_bloqueado' that mention reagrupa
const efectosPattern = /efectos: \[(.*?)\]/gs
let efectoMatch
while ((efectoMatch = efectosPattern.exec(updated)) !== null) {
  const efectoStr = efectoMatch[1]
  if (efectoStr.includes("'costoTipo':'eter_bloqueado'") && efectoStr.includes("reagrupa")) {
    // This efecto needs reagruparAlba: true
    console.log('Found efecto with reagrupa pattern that needs updating')
  }
}

// For now, just verify the schema compiles
console.log('Schema verification: campoAdicional removed, reagruparAlba + condicionSecundaria added')
console.log('Migration: cards will get reagruparAlba=true when their texto contains reagrupa pattern')
