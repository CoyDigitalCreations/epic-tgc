/**
 * Genera efectoData para todas las cartas desde el JSON limpio.
 * Lee el JSON exportado y genera metadata estructurada.
 *
 * Uso: npx tsx scripts/gen-efectodata.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const cleanPath = resolve(process.cwd(), 'seed', 'EstasisDisonancia-clean.json')
const cards = JSON.parse(readFileSync(cleanPath, 'utf8')) as any[]

// Generate efectoData for each card
const migrated = cards.map((card) => {
  const efectoData: any = {}

  // Champion effects
  if (card.efectoPasivo) {
    efectoData.efectoPasivoData = parsePasivo(card.efectoPasivo)
  }
  if (card.efectoDisparo) {
    efectoData.efectoDisparoData = parseDisparo(card.efectoDisparo, card.disparoAgota)
  }
  if (card.efectoContinuo) {
    efectoData.efectoContinuoData = parseContinuo(card.efectoContinuo)
  }

  // Mystica/Arcana/Vinculo effects
  if (card.efecto && card.type !== 'Campeón') {
    efectoData.efectoData = parseHechizo(card.efecto, card.type)
  }

  // Arcana conditions
  if (card.condicion) {
    efectoData.condicionData = { tipo: 'pasivo', condicion: card.condicion, texto: card.condicion }
  }
  if (card.recompensa) {
    efectoData.recompensaData = parseHechizo(card.recompensa, 'Arcana')
  }

  // Ether effects
  if (card.efectoReserva) {
    efectoData.efectoReservaData = parseReserva(card.efectoReserva)
  }
  if (card.efectoPago) {
    efectoData.efectoPagoData = parsePago(card.efectoPago, card.variantePago)
  }
  if (card.efectoBloqueo) {
    efectoData.efectoBloqueoData = parseBloqueo(card.efectoBloqueo)
  }

  return { id: card.id, name: card.name, efectoData }
})

// Output
const outPath = resolve(process.cwd(), 'seed', 'efectodata-migration.json')
writeFileSync(outPath, JSON.stringify(migrated, null, 2))
console.log(`Generated efectoData for ${migrated.length} cards → ${outPath}`)

// Show summary
let withEffects = 0
for (const card of migrated) {
  const keys = Object.keys(card.efectoData)
  if (keys.length > 0) {
    withEffects++
    console.log(`  ${card.id} (${card.name}): ${keys.join(', ')}`)
  }
}
console.log(`\n${withEffects} cards with efectoData, ${migrated.length - withEffects} without`)

// Helper functions
function parsePasivo(text: string): any {
  const result: any = { tipo: 'pasivo', texto: text }

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
    result.trigger = 'ninguno'
  } else {
    result.trigger = 'ninguno'
  }

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

  if (text.includes('los otros Campeones que controles') || text.includes('Los otros Campeones que controles')) {
    result.objetivo = 'todos_campeones_propios'
  } else if (text.includes('un Campeón que controles')) {
    result.objetivo = 'campeon_propio'
  } else if (text.includes('un Campeón que controla el rival')) {
    result.objetivo = 'campeon_rival'
  } else {
    result.objetivo = 'self'
  }

  return result
}

function parseDisparo(text: string, agota?: boolean): any {
  const result: any = { tipo: 'disparo', texto: text }

  const costMatch = text.match(/(?:puedes\s+)?pagar\s+(?:hasta\s+un\s+máximo\s+de\s+)?(\d+)\s+Éter/i)
  if (costMatch) {
    result.costoMax = parseInt(costMatch[1])
    result.costoTipo = text.includes('bloqueado') ? 'eter_bloqueado' : 'eter'
  }

  if (agota || text.includes('agotar esta carta') || text.includes('agota esta carta')) {
    result.costoTipo = 'exhaust'
  }

  result.trigger = 'al_activar_habilidad'

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
  } else if (text.includes('pierde') || text.includes('pierden')) {
    result.efecto = 'debuff'
    const atqMatch = text.match(/pierde\s+(\d+)\s+de?\s*ATQ/i)
    const resMatch = text.match(/pierde\s+(\d+)\s+de?\s*RES/i)
    result.stats = {}
    if (atqMatch) result.stats.ATQ = -parseInt(atqMatch[1])
    if (resMatch) result.stats.RES = -parseInt(resMatch[1])
    result.objetivo = 'campeon_rival'
  } else if (text.includes('roba') || text.includes('Roba')) {
    result.efecto = 'robar'
    const numMatch = text.match(/roba\s+(\d+)/i)
    result.maxObjetivos = numMatch ? parseInt(numMatch[1]) : 1
  } else if (text.includes('toma control') || text.includes('Toma control')) {
    result.efecto = 'steal_eter'
    result.objetivo = 'campeon_rival'
  } else if (text.includes('liberar') || text.includes('Liberar')) {
    result.efecto = 'release_eter'
    result.objetivo = 'campeon_rival'
  }

  return result
}

function parseContinuo(text: string): any {
  const result: any = { tipo: 'continuo', texto: text }

  const costMatch = text.match(/pagar\s+hasta\s+un\s+máximo\s+de\s+(\d+)\s+Éter/i)
  if (costMatch) {
    result.costoMax = parseInt(costMatch[1])
    result.costoTipo = 'eter_bloqueado'
  }

  if (text.includes('gana +') || text.includes('ganen +')) {
    result.efecto = 'buff'
    const atqMatch = text.match(/\+(\d+)\s+de?\s*ATQ/i)
    const resMatch = text.match(/\+(\d+)\s+de?\s*RES/i)
    result.stats = {}
    if (atqMatch) result.stats.ATQ = parseInt(atqMatch[1])
    if (resMatch) result.stats.RES = parseInt(resMatch[1])
    result.objetivo = 'campeon_propio'
    result.duracion = 'mientras_ester_bloqueado'
  } else if (text.includes('pierde') || text.includes('pierden')) {
    result.efecto = 'debuff'
    result.objetivo = 'campeon_rival'
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
