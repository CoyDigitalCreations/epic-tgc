/**
 * Migración completa: construir efectos[] con TODOS los campos estructurados
 * El texto se genera A PARTIR de los campos, no al revés
 */
import { readFileSync, writeFileSync } from 'fs'

interface EfectoData {
  tipo: string
  texto?: string
  trigger?: string
  objetivo?: string
  efecto?: string
  stats?: { ATQ?: number; RES?: number }
  keyword?: string
  costoTipo?: string
  costoMax?: number
  duracion?: string
  condicion?: string
  reagrupar?: { fase: 'alba' | 'choque'; turno: 'propio' | 'oponente' }
  condicionSecundaria?: { tipo: string; cantidad?: number }
}

interface Card {
  id: string
  name: string
  type: string
  efectos?: EfectoData[]
  [key: string]: any
}

/** Detectar trigger del texto */
function detectarTrigger(texto: string): string | undefined {
  if (texto.includes('Al ser invocada')) return 'al_invocar'
  if (texto.includes('Al atacar')) return 'al_atacar'
  if (texto.includes('Al matar en combate')) return 'al_matar_en_combate'
  if (texto.includes('Cuando pagues esta carta')) return 'al_pagar_eter'
  if (texto.includes('Al inicio de tu Choque') || texto.includes('Al inicio del Choque')) return 'inicio_choque'
  if (texto.includes('Al inicio de tu Alba') || texto.includes('al inicio de tu Alba')) return 'inicio_alba'
  if (texto.includes('Al jugar esta Mística')) return 'al_jugar_mistica'
  if (texto.includes('Al resolver la cadena')) return 'al_resolver_cadena'
  if (texto.includes('Al activar esta habilidad') || texto.includes('al activar esta habilidad')) return 'al_activar_habilidad'
  if (texto.includes('Al ser enviada al Cementerio') || texto.includes('Al ser enviada al cementerio')) return 'al_ser_enviado_al_cementerio'
  if (texto.includes('Al ser destruido este Vínculo')) return 'al_ser_destruido_vinculo'
  return undefined
}

/** Detectar objetivo del texto */
function detectarObjetivo(texto: string): string | undefined {
  if (texto.includes('toma control de un Campeón que controla el rival')) return 'campeon_rival'
  if (texto.includes('un Campeón que controla el rival')) return 'campeon_rival'
  if (texto.includes('una Mística o Arcana que controla el rival')) return 'mistica_rival'
  if (texto.includes('los Campeones que controles')) return 'todos_campeones_propios'
  if (texto.includes('los Campeones que controla el rival')) return 'todos_campeones_rivales'
  if (texto.includes('un Campeón que controles')) return 'campeon_propio'
  if (texto.includes('un Campeón de tu Cementerio')) return 'campeon_cementerio_propio'
  if (texto.includes('un Campeón del Cementerio del rival')) return 'cementerio_rival'
  if (texto.includes('una carta de tu mazo')) return 'carta_mazo'
  if (texto.includes('el rival')) return 'rival_hand'
  if (texto.includes('esta carta')) return 'self'
  return undefined
}

/** Detectar efecto del texto */
function detectarEfecto(texto: string): string | undefined {
  if (texto.includes('toma control de')) return 'steal_champion'
  if (texto.includes('destruye') || texto.includes('destruir')) return 'destruir'
  if (texto.includes('roba') || texto.includes('Roba')) return 'robar'
  if (texto.includes('devuelve a la mano')) return 'devolver_mano'
  if (texto.includes('devuelve un Éter')) return 'return_ether'
  if (texto.includes('libera')) return 'release_ether'
  if (texto.includes('exilia')) return 'exile'
  if (texto.includes('gana +') || texto.includes('gana')) {
    if (texto.includes('ATQ') || texto.includes('RES')) return 'buff'
  }
  if (texto.includes('pierde -') || texto.includes('pierde')) {
    if (texto.includes('ATQ') || texto.includes('RES')) return 'debuff'
  }
  if (texto.includes('tiene Inmortal') || texto.includes('tiene Indestructible')) return 'keyword'
  if (texto.includes('cambia el agotamiento')) return 'toggle_agotamiento'
  return undefined
}

/** Detectar stats del texto */
function detectarStats(texto: string): { ATQ?: number; RES?: number } | undefined {
  const stats: { ATQ?: number; RES?: number } = {}
  const atqMatch = texto.match(/([+-]?\d+)\s*de\s*ATQ/)
  const resMatch = texto.match(/([+-]?\d+)\s*de\s*RES/)
  if (atqMatch) stats.ATQ = parseInt(atqMatch[1])
  if (resMatch) stats.RES = parseInt(resMatch[1])
  return (stats.ATQ || stats.RES) ? stats : undefined
}

/** Detectar keyword del texto */
function detectarKeyword(texto: string): string | undefined {
  if (texto.includes('Inmortal')) return 'Inmortal'
  if (texto.includes('Indestructible')) return 'Indestructible'
  if (texto.includes('Protector')) return 'Protector'
  if (texto.includes('Carga')) return 'Carga'
  if (texto.includes('Vigor')) return 'Vigor'
  if (texto.includes('Recarga')) return 'Recarga'
  if (texto.includes('Presteza')) return 'Presteza'
  if (texto.includes('Fugaz')) return 'Fugaz'
  return undefined
}

/** Detectar costo del texto */
function detectarCosto(texto: string): { costoTipo: string; costoMax?: number } | undefined {
  if (texto.includes('Éter (bloqueado)')) {
    const match = texto.match(/máximo de (\d+) Éter/)
    return { costoTipo: 'eter_bloqueado', costoMax: match ? parseInt(match[1]) : 1 }
  }
  if (texto.includes('agotar esta carta')) return { costoTipo: 'exhaust' }
  if (texto.includes('puedes pagar') && texto.includes('Éter')) {
    const match = texto.match(/(\d+)\s*Éter/)
    return { costoTipo: 'eter', costoMax: match ? parseInt(match[1]) : 1 }
  }
  return undefined
}

/** Detectar duración del texto */
function detectarDuracion(texto: string): string | undefined {
  if (texto.includes('de forma permanente')) return 'permanente'
  if (texto.includes('hasta el final del turno')) return 'turno'
  if (texto.includes('hasta tu próxima Alba') || texto.includes('hasta el final de tu próximo Alba')) return 'hasta_alba'
  if (texto.includes('mientras ese Éter esté bloqueado') || texto.includes('mientras esté bloqueado')) return 'mientras_ester_bloqueado'
  if (texto.toLowerCase().includes('mientras esta carta esté en el campo')) return 'mientras_en_campo'
  if (texto.includes('una vez por turno')) return '1_por_turno'
  return undefined
}

/** Detectar reagrupar del texto — returns { fase, turno } or undefined */
function detectarReagrupar(texto: string): { fase: 'alba' | 'choque'; turno: 'propio' | 'oponente' } | undefined {
  if (!texto.includes('reagrupa el Éter') && !texto.includes('reagrupa el éter')) return undefined

  // Detect phase
  let fase: 'alba' | 'choque' = 'alba'
  if (texto.toLowerCase().includes('choque')) fase = 'choque'

  // Detect turn
  let turno: 'propio' | 'oponente' = 'propio'
  if (texto.toLowerCase().includes('oponente') || texto.toLowerCase().includes('rival')) turno = 'oponente'

  return { fase, turno }
}

/** Detectar condición secundaria del texto */
function detectarCondicionSecundaria(texto: string): EfectoData['condicionSecundaria'] | undefined {
  if (texto.includes('si controlas 2 o más Campeones con Éter bloqueado')) {
    return { tipo: 'controlar_eter_bloqueado' }
  }
  if (texto.includes('si controlas 2 o más Campeones')) {
    return { tipo: 'controlar_campeones', cantidad: 2 }
  }
  if (texto.includes('si controlas otro Campeón')) {
    return { tipo: 'controlar_otro_campeon' }
  }
  return undefined
}

/** Construir efecto completo desde texto legacy */
function construirEfecto(tipo: string, texto: string): EfectoData {
  const efecto: EfectoData = { tipo }

  // Detectar todos los campos del texto
  const trigger = detectarTrigger(texto)
  const objetivo = detectarObjetivo(texto)
  const efectoAccion = detectarEfecto(texto)
  const stats = detectarStats(texto)
  const keyword = detectarKeyword(texto)
  const costo = detectarCosto(texto)
  const duracion = detectarDuracion(texto)
  const reagrupar = detectarReagrupar(texto)
  const condicionSecundaria = detectarCondicionSecundaria(texto)

  if (trigger) efecto.trigger = trigger
  if (objetivo) efecto.objetivo = objetivo
  if (efectoAccion) efecto.efecto = efectoAccion
  if (stats) efecto.stats = stats
  if (keyword) efecto.keyword = keyword
  if (costo) {
    efecto.costoTipo = costo.costoTipo
    if (costo.costoMax) efecto.costoMax = costo.costoMax
  }
  if (duracion) efecto.duracion = duracion
  if (reagrupar) efecto.reagrupar = reagrupar
  if (condicionSecundaria) efecto.condicionSecundaria = condicionSecundaria

  // NO incluir texto — se genera automáticamente
  return efecto
}

/** Migrar una carta completa */
function migrarCarta(card: Card): Card {
  const efectos: EfectoData[] = []

  // Detect Comandante cards (Aurora FB-010, Ragnar DS-001)
  const esComandante = card.id === 'FB-010' || card.id === 'DS-001'

  switch (card.type) {
    case 'Campeón': {
      // Pasivo
      if (card.efectoPasivo) {
        efectos.push(construirEfecto('pasivo', card.efectoPasivo))
      }
      // Continuo (ANTES de disparo — los que bloquean éter son continuos)
      if (card.efectoContinuo) {
        efectos.push(construirEfecto('continuo', card.efectoContinuo))
      }
      // Disparo (solo si NO es continuo — verificar en el texto)
      if (card.efectoDisparo) {
        const esContinuo = card.efectoDisparo.includes('bloqueado') && !card.efectoDisparo.includes('agotar')
        if (!esContinuo) {
          efectos.push(construirEfecto('disparo', card.efectoDisparo))
        } else {
          // Es continuo con costo de éter bloqueado
          efectos.push(construirEfecto('continuo', card.efectoDisparo))
        }
      }
      break
    }
    case 'Mística': {
      if (card.efecto) {
        efectos.push(construirEfecto('hechizo', card.efecto))
      }
      break
    }
    case 'Arcana': {
      if (card.condicion) {
        efectos.push({
          tipo: 'pasivo',
          condicion: card.condicion,
          // NO incluir texto
        })
      }
      if (card.recompensa) {
        efectos.push(construirEfecto('hechizo', card.recompensa))
      }
      break
    }
    case 'Éter': {
      if (card.efectoReserva) {
        efectos.push(construirEfecto('reserva', card.efectoReserva))
      }
      if (card.efectoPago) {
        efectos.push(construirEfecto('pago', card.efectoPago))
      }
      if (card.efectoBloqueo) {
        efectos.push(construirEfecto('bloqueo', card.efectoBloqueo))
      }
      break
    }
    case 'Vínculo': {
      if (card.efecto) {
        efectos.push(construirEfecto('vinculo', card.efecto))
      }
      break
    }
  }

  // Eliminar campos legacy
  const cleaned = { ...card }
  delete cleaned.efectoPasivo
  delete cleaned.efectoPasivoData
  delete cleaned.efectoDisparo
  delete cleaned.efectoDisparoData
  delete cleaned.efectoContinuo
  delete cleaned.efectoContinuoData
  delete cleaned.efectoReserva
  delete cleaned.efectoReservaData
  delete cleaned.efectoPago
  delete cleaned.efectoPagoData
  delete cleaned.efectoBloqueo
  delete cleaned.efectoBloqueoData
  delete cleaned.efecto
  delete cleaned.efectoData
  delete cleaned.condicionData
  delete cleaned.recompensaData

  // Set Comandante category for Aurora and Ragnar
  if (esComandante) {
    cleaned.catHabilidad = 'Comandante'
  }

  return { ...cleaned, efectos }
}

// Read from original (with legacy fields) and migrate
const content = readFileSync('seed/Coleccion1.json', 'utf8')
const cards: Card[] = JSON.parse(content)
const migrated = cards.map(migrarCarta)

// Stats
let totalEfectos = 0
let conCamposCompletos = 0
for (const card of migrated) {
  totalEfectos += card.efectos?.length ?? 0
  for (const e of card.efectos ?? []) {
    if (e.tipo && e.efecto && e.objetivo) conCamposCompletos++
  }
}

writeFileSync('seed/Coleccion-EstasisDisonancia.json', JSON.stringify(migrated, null, 2))

console.log(`✅ Migración completada:`)
console.log(`   Total cartas: ${migrated.length}`)
console.log(`   Total efectos: ${totalEfectos}`)
console.log(`   Con campos completos (tipo+efecto+objetivo): ${conCamposCompletos}`)
console.log(`   Archivo guardado: seed/Coleccion-EstasisDisonancia.json`)
