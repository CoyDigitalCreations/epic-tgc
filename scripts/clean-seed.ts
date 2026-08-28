/**
 * Script de limpieza: eliminar campos legacy del JSON de seed
 * Deja SOLO efectos[] y elimina todos los campos de efectos individuales
 */
import { readFileSync, writeFileSync } from 'fs'

// Campos legacy a eliminar
const LEGACY_FIELDS = [
  'efectoPasivo', 'efectoPasivoData',
  'efectoDisparo', 'efectoDisparoData',
  'efectoContinuo', 'efectoContinuoData',
  'efectoReserva', 'efectoReservaData',
  'efectoPago', 'efectoPagoData',
  'efectoBloqueo', 'efectoBloqueoData',
  'efecto', 'efectoData',
  'condicionData', 'recompensaData',
]

const content = readFileSync('seed/Coleccion-EstasisDisonancia.json', 'utf8')
const cards = JSON.parse(content)

// Clean each card
const cleaned = cards.map((card: any) => {
  const cleanedCard = { ...card }
  for (const field of LEGACY_FIELDS) {
    delete cleanedCard[field]
  }
  return cleanedCard
})

// Stats
let totalEfectos = 0
for (const card of cleaned) {
  totalEfectos += card.efectos?.length ?? 0
}

writeFileSync('seed/Coleccion-EstasisDisonancia.json', JSON.stringify(cleaned, null, 2))

console.log(`✅ Limpieza completada:`)
console.log(`   Total cartas: ${cleaned.length}`)
console.log(`   Total efectos: ${totalEfectos}`)
console.log(`   Campos legacy eliminados: ${LEGACY_FIELDS.length}`)
console.log(`   Archivo guardado: seed/Coleccion-EstasisDisonancia.json`)
