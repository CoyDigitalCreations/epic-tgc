/**
 * Script para generar el código migrado de paquetes.ts
 * Lee el archivo original y agrega efectos[] a cada carta
 */
import { readFileSync, writeFileSync } from 'fs'
import type { AnyCard, EfectoData } from '../src/shared/types/cards'

/** Extrae efectos[] de una carta basándose en sus campos legacy */
function migrarCarta(card: AnyCard): EfectoData[] {
  const efectos: EfectoData[] = []

  switch (card.type) {
    case 'Campeón': {
      if (card.efectoPasivoData) efectos.push(card.efectoPasivoData)
      else if (card.efectoPasivo) efectos.push({ tipo: 'pasivo', texto: card.efectoPasivo, trigger: 'al_invocar', objetivo: 'campeon_propio' })
      if (card.efectoDisparoData) efectos.push(card.efectoDisparoData)
      else if (card.efectoDisparo) efectos.push({ tipo: 'disparo', texto: card.efectoDisparo, costoTipo: 'eter', trigger: 'al_activar_habilidad' })
      if (card.efectoContinuoData) efectos.push(card.efectoContinuoData)
      else if (card.efectoContinuo) efectos.push({ tipo: 'continuo', texto: card.efectoContinuo, costoTipo: 'eter_bloqueado' })
      break
    }
    case 'Mística': {
      if (card.efectoData) efectos.push(card.efectoData)
      else if (card.efecto) efectos.push({ tipo: 'hechizo', texto: card.efecto })
      break
    }
    case 'Arcana': {
      if (card.condicionData) efectos.push(card.condicionData)
      else if (card.condicion) efectos.push({ tipo: 'pasivo', condicion: card.condicion, texto: card.condicion })
      if (card.recompensaData) efectos.push(card.recompensaData)
      else if (card.recompensa) efectos.push({ tipo: 'hechizo', texto: card.recompensa })
      if (card.efectoData) efectos.push(card.efectoData)
      else if (card.efecto) efectos.push({ tipo: 'pasivo', texto: card.efecto })
      break
    }
    case 'Éter': {
      if (card.efectoReservaData) efectos.push(card.efectoReservaData)
      else if (card.efectoReserva) efectos.push({ tipo: 'reserva', texto: card.efectoReserva, trigger: 'ninguno' })
      if (card.efectoPagoData) efectos.push(card.efectoPagoData)
      else if (card.efectoPago) efectos.push({ tipo: 'pago', texto: card.efectoPago, trigger: 'ninguno' })
      if (card.efectoBloqueoData) efectos.push(card.efectoBloqueoData)
      else if (card.efectoBloqueo) efectos.push({ tipo: 'bloqueo', texto: card.efectoBloqueo })
      break
    }
    case 'Vínculo': {
      if (card.efectoData) efectos.push(card.efectoData)
      else if (card.efecto) efectos.push({ tipo: 'vinculo', texto: card.efecto })
      break
    }
  }
  return efectos
}

// Read original file
const content = readFileSync('src/shared/data/paquetes.ts', 'utf8')

// Import cards
const { ESTASIS_CARDS, DISONANCIA_CARDS } = await import('../src/shared/data/paquetes.ts')

// Process all cards
const allCards = [...ESTASIS_CARDS, ...DISONANCIA_CARDS]
const migratedCards = new Map<string, string>()

for (const card of allCards) {
  const efectos = migrarCarta(card as AnyCard)
  if (efectos.length > 0) {
    migratedCards.set(card.id, JSON.stringify(efectos).replace(/"/g, '"'))
  }
}

// Generate replacement code
let updatedContent = content

for (const [cardId, efectosJson] of migratedCards) {
  // Find the card's closing brace and add efectos before it
  // Pattern: find card by id, then add efectos before the closing }
  const cardRegex = new RegExp(`(id: '${cardId}'[\\s\\S]*?)(\\n  \\},)`)
  const match = updatedContent.match(cardRegex)
  if (match) {
    const indent = '    '
    const efectosCode = `${indent}efectos: ${efectosJson.replace(/"/g, "'")},\n`
    updatedContent = updatedContent.replace(cardRegex, `$1${efectosCode}$2`)
  }
}

writeFileSync('src/shared/data/paquetes.ts', updatedContent)
console.log(`✅ Migrated ${migratedCards.size} cards with efectos[]`)
