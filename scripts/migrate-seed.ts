/**
 * Script de migración: agregar efectos[] al JSON de seed
 * Lee Coleccion1.json, agrega efectos[] a cada carta, y guarda el resultado
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
  reagruparAlba?: boolean
}

interface Card {
  id: string
  type: string
  efectos?: EfectoData[]
  // Legacy fields
  efectoPasivo?: string
  efectoDisparo?: string
  efectoContinuo?: string
  efecto?: string
  efectoReserva?: string
  efectoPago?: string
  efectoBloqueo?: string
  condicion?: string
  recompensa?: string
  [key: string]: any
}

function migrarCarta(card: Card): Card {
  const efectos: EfectoData[] = []

  switch (card.type) {
    case 'Campeón': {
      if (card.efectoPasivo) {
        efectos.push({
          tipo: 'pasivo',
          texto: card.efectoPasivo,
          trigger: card.efectoPasivo.includes('Al ser invocada') ? 'al_invocar' :
                   card.efectoPasivo.includes('Al atacar') ? 'al_atacar' :
                   card.efectoPasivo.includes('Al ser enviada') ? 'al_ser_enviado_al_cementerio' : 'ninguno',
          objetivo: card.efectoPasivo.includes('rival') ? 'campeon_rival' : 'campeon_propio',
        })
      }
      if (card.efectoDisparo) {
        const hasReagrupa = card.efectoDisparo.includes('reagrupa')
        const hasBloqueado = card.efectoDisparo.includes('bloqueado')
        const costoMatch = card.efectoDisparo.match(/máximo de (\d+) Éter/)
        efectos.push({
          tipo: 'disparo',
          texto: card.efectoDisparo,
          costoTipo: hasBloqueado ? 'eter_bloqueado' : 'eter',
          costoMax: costoMatch ? parseInt(costoMatch[1]) : 1,
          trigger: 'al_activar_habilidad',
          reagruparAlba: hasReagrupa || undefined,
        })
      }
      if (card.efectoContinuo) {
        efectos.push({
          tipo: 'continuo',
          texto: card.efectoContinuo,
          costoTipo: 'eter_bloqueado',
        })
      }
      break
    }
    case 'Mística': {
      if (card.efecto) {
        efectos.push({
          tipo: 'hechizo',
          texto: card.efecto,
        })
      }
      break
    }
    case 'Arcana': {
      if (card.condicion) {
        efectos.push({
          tipo: 'pasivo',
          condicion: card.condicion,
          texto: card.condicion,
        })
      }
      if (card.recompensa) {
        efectos.push({
          tipo: 'hechizo',
          texto: card.recompensa,
        })
      }
      break
    }
    case 'Éter': {
      if (card.efectoReserva) {
        efectos.push({
          tipo: 'reserva',
          texto: card.efectoReserva,
          trigger: card.efectoReserva.includes('Al inicio') ? 'inicio_choque' : 'ninguno',
        })
      }
      if (card.efectoPago) {
        efectos.push({
          tipo: 'pago',
          texto: card.efectoPago,
          trigger: card.efectoPago.includes('Cuando pagues') ? 'al_pagar_eter' : 'ninguno',
        })
      }
      if (card.efectoBloqueo) {
        efectos.push({
          tipo: 'bloqueo',
          texto: card.efectoBloqueo,
        })
      }
      break
    }
    case 'Vínculo': {
      if (card.efecto) {
        efectos.push({
          tipo: 'vinculo',
          texto: card.efecto,
        })
      }
      break
    }
  }

  return { ...card, efectos }
}

// Read seed JSON
const content = readFileSync('seed/Coleccion1.json', 'utf8')
const cards: Card[] = JSON.parse(content)

// Migrate all cards
const migrated = cards.map(migrarCarta)

// Stats
let conEfectos = 0
let sinEfectos = 0
for (const card of migrated) {
  if (card.efectos && card.efectos.length > 0) {
    conEfectos++
  } else {
    sinEfectos++
    console.log(`⚠️  ${card.id} (${card.name}) — sin efectos`)
  }
}

// Write migrated JSON
writeFileSync('seed/Coleccion1.json', JSON.stringify(migrated, null, 2))

console.log(`\n✅ Migración completada:`)
console.log(`   Total cartas: ${cards.length}`)
console.log(`   Con efectos: ${conEfectos}`)
console.log(`   Sin efectos: ${sinEfectos}`)
console.log(`   Archivo guardado: seed/Coleccion1.json`)
