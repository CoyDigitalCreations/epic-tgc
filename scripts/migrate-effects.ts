/**
 * Genera efectoData para todas las cartas desde paquetes.ts.
 * Lee los efectos de texto y genera metadata estructurada.
 *
 * Uso: npx tsx scripts/migrate-effects.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const paqPath = resolve(process.cwd(), 'src', 'shared', 'data', 'paquetes.ts')
const paqContent = readFileSync(paqPath, 'utf8')

// Extract card data using regex
function extractCards(content: string, arrayName: string): any[] {
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

  const arrayStr = content.substring(startIdx, endIdx + 1)
  const cards = []
  const cardRegex = /\{[^{}]*id:\s*'([^']+)'[^{}]*\}/g
  let match
  while ((match = cardRegex.exec(arrayStr)) !== null) {
    cards.push(match[1])
  }
  return cards
}

// Generate efectoData for a card based on its text effects
function generateEfectoData(card: any): any {
  const data: any = {}

  // Champion effects
  if (card.efectoPasivo) {
    data.efectoPasivoData = parsePasivo(card.efectoPasivo)
  }
  if (card.efectoDisparo) {
    data.efectoDisparoData = parseDisparo(card.efectoDisparo, card.disparoAgota)
  }
  if (card.efectoContinuo) {
    data.efectoContinuoData = parseContinuo(card.efectoContinuo)
  }

  // Mystica/Arcana/Vinculo effects
  if (card.efecto && card.type !== 'Campeón') {
    data.efectoData = parseHechizo(card.efecto, card.type)
  }

  // Arcana conditions
  if (card.condicion) {
    data.condicionData = { tipo: 'pasivo', condicion: card.condicion, texto: card.condicion }
  }
  if (card.recompensa) {
    data.recompensaData = parseHechizo(card.recompensa, 'Arcana')
  }

  // Ether effects
  if (card.efectoReserva) {
    data.efectoReservaData = parseReserva(card.efectoReserva)
  }
  if (card.efectoPago) {
    data.efectoPagoData = parsePago(card.efectoPago, card.variantePago)
  }
  if (card.efectoBloqueo) {
    data.efectoBloqueoData = parseBloqueo(card.efectoBloqueo)
  }

  return data
}

function parsePasivo(text: string): any {
  const result: any = { tipo: 'pasivo', texto: text }

  // Detect trigger
  if (text.includes('al ser invocada') || text.includes('Al ser invocada')) {
    result.trigger = 'al_invocar'
  } else if (text.includes('al atacar') || text.includes('Al atacar')) {
    result.trigger = 'al_atacar'
  } else if (text.includes('al inicio de tu Choque') || text.includes('Al inicio de tu Choque')) {
    result.trigger = 'inicio_choque'
  } else if (text.includes('al inicio de tu Alba') || text.includes('Al inicio de tu Alba')) {
    result.trigger = 'inicio_alba'
  } else if (text.includes('al ser enviada al Cementerio') || text.includes('Al ser enviada al Cementerio')) {
    result.trigger = 'al_ser_enviado_al_cementerio'
  } else if (text.includes('Mientras') || text.includes('mientras')) {
    result.trigger = 'ninguno' // Always active
  } else {
    result.trigger = 'ninguno'
  }

  // Detect stats
  const atqMatch = text.match(/\+(\d+)\s+de?\s*ATQ/i)
  const resMatch = text.match(/\+(\d+)\s+de?\s*RES/i)
  const loseAtqMatch = text.match(/pierde\s+(\d+)\s+de?\s*ATQ/i)
  const loseResMatch = text.match(/pierde\s+(\d+)\s+de?\s*RES/i)

  if (atqMatch || resMatch || loseAtqMatch || loseResMatch) {
    result.efecto = (atqMatch || loseAtqMatch) ? 'buff' : 'debuff'
    result.stats = {}
    if (atqMatch) result.stats.ATQ = parseInt(atqMatch[1])
    if (loseAtqMatch) result.stats.ATQ = -parseInt(loseAtqMatch[1])
    if (resMatch) result.stats.RES = parseInt(resMatch[1])
    if (loseResMatch) result.stats.RES = -parseInt(loseResMatch[1])
  }

  // Detect target
  if (text.includes('los otros Campeones que controles') || text.includes('Los otros Campeones que controles')) {
    result.objetivo = 'todos_campeones_propios'
  } else if (text.includes('un Campeón que controles')) {
    result.objetivo = 'campeon_propio'
  } else if (text.includes('un Campeón que controla el rival')) {
    result.objetivo = 'campeon_rival'
  } else if (text.includes('esta carta')) {
    result.objetivo = 'self'
  } else {
    result.objetivo = 'self'
  }

  return result
}

function parseDisparo(text: string, agota?: boolean): any {
  const result: any = { tipo: 'disparo', texto: text }

  // Detect cost
  const costMatch = text.match(/(?:puedes\s+)?pagar\s+(?:hasta\s+un\s+máximo\s+de\s+)?(\d+)\s+Éter/i)
  if (costMatch) {
    result.costoMax = parseInt(costMatch[1])
    result.costoTipo = text.includes('bloqueado') ? 'eter_bloqueado' : 'eter'
  }

  // Detect exhaustion
  if (agota || text.includes('agotar esta carta') || text.includes('agota esta carta')) {
    result.costoTipo = 'exhaust'
  }

  // Detect trigger
  result.trigger = 'al_activar_habilidad'

  // Detect effect
  if (text.includes('destruir') || text.includes('Destruye')) {
    result.efecto = 'destruir'
    if (text.includes('Mística o Arcana')) {
      result.objetivo = 'mistica_rival'
    } else if (text.includes('Campeón')) {
      result.objetivo = 'campeon_rival'
    }
  } else if (text.includes('gana +') || text.includes('ganen +')) {
    result.efecto = 'buff'
    const atqMatch = text.match(/\+(\d+)\s+de?\s*ATQ/i)
    const resMatch = text.match(/\+(\d+)\s+de?\s*RES/i)
    result.stats = {}
    if (atqMatch) result.stats.ATQ = parseInt(atqMatch[1])
    if (resMatch) result.stats.RES = parseInt(resMatch[1])
    result.objetivo = 'campeon_propio'
    result.duracion = text.includes('mientras') ? 'mientras_ester_bloqueado' : 'turno'
  } else if (text.includes('roba') || text.includes('Roba')) {
    result.efecto = 'robar'
    const numMatch = text.match(/roba\s+(\d+)/i)
    result.maxObjetivos = numMatch ? parseInt(numMatch[1]) : 1
  }

  return result
}

function parseContinuo(text: string): any {
  const result: any = { tipo: 'continuo', texto: text }

  // Detect cost
  const costMatch = text.match(/pagar\s+hasta\s+un\s+máximo\s+de\s+(\d+)\s+Éter/i)
  if (costMatch) {
    result.costoMax = parseInt(costMatch[1])
    result.costoTipo = 'eter_bloqueado'
  }

  // Detect effect
  if (text.includes('gana +') || text.includes('ganen +')) {
    result.efecto = 'buff'
    const atqMatch = text.match(/\+(\d+)\s+de?\s*ATQ/i)
    const resMatch = text.match(/\+(\d+)\s+de?\s*RES/i)
    result.stats = {}
    if (atqMatch) result.stats.ATQ = parseInt(atqMatch[1])
    if (resMatch) result.stats.RES = parseInt(resMatch[1])
    result.objetivo = 'campeon_propio'
    result.duracion = 'mientras_ester_bloqueado'
  }

  return result
}

function parseHechizo(text: string, type: string): any {
  const result: any = { tipo: 'hechizo', texto: text }

  if (text.includes('destruir') || text.includes('Destruye')) {
    result.efecto = 'destruir'
    result.objetivo = 'campeon_rival'
  } else if (text.includes('gana +')) {
    result.efecto = 'buff'
    const atqMatch = text.match(/\+(\d+)\s+de?\s*ATQ/i)
    const resMatch = text.match(/\+(\d+)\s+de?\s*RES/i)
    result.stats = {}
    if (atqMatch) result.stats.ATQ = parseInt(atqMatch[1])
    if (resMatch) result.stats.RES = parseInt(resMatch[1])
    result.objetivo = 'campeon_propio'
  } else if (text.includes('pierde')) {
    result.efecto = 'debuff'
    result.objetivo = 'campeon_rival'
  } else if (text.includes('roba') || text.includes('Roba')) {
    result.efecto = 'robar'
  } else if (text.includes('Devuelve') || text.includes('devuelve')) {
    result.efecto = 'devolver_mano'
    if (text.includes('cementerio')) result.objetivo = 'campeon_cementerio_propio'
    else result.objetivo = 'campeon_propio'
  } else if (text.includes('Agrega') || text.includes('agrega')) {
    result.efecto = 'robar'
    result.objetivo = 'carta_mazo'
  } else if (text.includes(' Equipa ') || text.includes('equipa')) {
    result.efecto = 'equipar'
    result.objetivo = 'campeon_propio'
  } else if (text.includes('Indestructible') || text.includes('Inmortal')) {
    result.efecto = 'keyword'
    result.keyword = text.includes('Indestructible') ? 'Indestructible' : 'Inmortal'
    result.objetivo = 'campeon_propio'
    result.duracion = 'permanente'
  }

  return result
}

function parseReserva(text: string): any {
  const result: any = { tipo: 'reserva', trigger: 'ninguno', texto: text }

  if (text.includes('gana +') || text.includes('ganen +')) {
    result.efecto = 'buff'
    const atqMatch = text.match(/\+(\d+)\s+de?\s*ATQ/i)
    const resMatch = text.match(/\+(\d+)\s+de?\s*RES/i)
    result.stats = {}
    if (atqMatch) result.stats.ATQ = parseInt(atqMatch[1])
    if (resMatch) result.stats.RES = parseInt(resMatch[1])
    result.objetivo = 'todos_campeones_propios'
  } else if (text.includes('pierden') || text.includes('pierde')) {
    result.efecto = 'debuff'
    result.objetivo = 'todos_campeones_rivales'
  } else if (text.includes('gana Vigor') || text.includes('gana Carga')) {
    result.efecto = 'keyword'
    result.keyword = text.includes('Vigor') ? 'Vigor' : 'Carga'
    result.trigger = 'inicio_choque'
    result.objetivo = 'campeon_propio'
  }

  return result
}

function parsePago(text: string, variante?: string): any {
  const result: any = { tipo: 'pago', texto: text }

  if (variante === 'Gatillo') {
    result.trigger = 'al_pagar_eter'
  } else {
    result.trigger = 'ninguno'
  }

  if (text.includes('roba') || text.includes('Roba')) {
    result.efecto = 'robar'
  } else if (text.includes('gana +')) {
    result.efecto = 'buff'
  } else if (text.includes('Devuelve') || text.includes('devuelve')) {
    result.efecto = 'return_eter'
  } else if (text.includes('pierde') || text.includes('descarta')) {
    result.efecto = 'rival_discard'
  }

  return result
}

function parseBloqueo(text: string): any {
  const result: any = { tipo: 'bloqueo', texto: text }

  if (text.includes('gana +') || text.includes('ganen +')) {
    result.efecto = 'buff'
    const atqMatch = text.match(/\+(\d+)\s+de?\s*ATQ/i)
    const resMatch = text.match(/\+(\d+)\s+de?\s*RES/i)
    result.stats = {}
    if (atqMatch) result.stats.ATQ = parseInt(atqMatch[1])
    if (resMatch) result.stats.RES = parseInt(resMatch[1])
    result.objetivo = 'campeon_propio'
    result.duracion = 'mientras_ester_bloqueado'
  } else if (text.includes('Indestructible') || text.includes('Inmortal')) {
    result.efecto = 'keyword'
    result.keyword = text.includes('Indestructible') ? 'Indestructible' : 'Inmortal'
    result.objetivo = 'campeon_propio'
    result.duracion = 'mientras_ester_bloqueado'
  }

  return result
}

// Extract cards from paquetes.ts
function extractAllCards(content: string): any[] {
  const cards = []
  // Find all card objects with id field
  const regex = /id:\s*'([A-Z]{2}-\d+)'/g
  let match
  while ((match = regex.exec(content)) !== null) {
    cards.push(match[1])
  }
  return [...new Set(cards)] // deduplicate
}

const allCardIds = extractAllCards(paqContent)

console.log(`Found ${allCardIds.length} cards in paquetes.ts`)

// For now, just output the IDs that need migration
console.log('\nCards needing efectoData migration:')
for (const id of allCardIds) {
  console.log(`  ${id}`)
}

console.log('\nMigration script ready. Use generateEfectoData() to create structured data.')
