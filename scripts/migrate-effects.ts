/**
 * Script de migración: agrega campo `efectos[]` a todas las cartas existentes
 * a partir de los datos legacy (efectoPasivoData, efectoDisparoData, etc.)
 * 
 * Ejecutar: npx tsx scripts/migrate-effects.ts
 */
import { ESTASIS_CARDS, DISONANCIA_CARDS } from '../src/shared/data/paquetes'
import type { AnyCard, EfectoData } from '../src/shared/types/cards'

/** Extrae efectos[] de una carta basándose en sus campos legacy */
function migrarCarta(card: AnyCard): AnyCard {
  const efectos: EfectoData[] = []

  switch (card.type) {
    case 'Campeón': {
      // Pasivo
      if (card.efectoPasivoData) {
        efectos.push(card.efectoPasivoData)
      } else if (card.efectoPasivo) {
        efectos.push({
          tipo: 'pasivo',
          texto: card.efectoPasivo,
          trigger: 'al_invocar',
          objetivo: 'campeon_propio',
        })
      }
      // Disparo
      if (card.efectoDisparoData) {
        efectos.push(card.efectoDisparoData)
      } else if (card.efectoDisparo) {
        efectos.push({
          tipo: 'disparo',
          texto: card.efectoDisparo,
          costoTipo: 'eter',
          trigger: 'al_activar_habilidad',
        })
      }
      // Continuo
      if (card.efectoContinuoData) {
        efectos.push(card.efectoContinuoData)
      } else if (card.efectoContinuo) {
        efectos.push({
          tipo: 'continuo',
          texto: card.efectoContinuo,
          costoTipo: 'eter_bloqueado',
        })
      }
      return { ...card, efectos }
    }

    case 'Mística': {
      if (card.efectoData) {
        efectos.push(card.efectoData)
      } else if (card.efecto) {
        efectos.push({
          tipo: 'hechizo',
          texto: card.efecto,
        })
      }
      return { ...card, efectos }
    }

    case 'Arcana': {
      // Condición
      if (card.condicionData) {
        efectos.push(card.condicionData)
      } else if (card.condicion) {
        efectos.push({
          tipo: 'pasivo',
          condicion: card.condicion,
          texto: card.condicion,
        })
      }
      // Recompensa
      if (card.recompensaData) {
        efectos.push(card.recompensaData)
      } else if (card.recompensa) {
        efectos.push({
          tipo: 'hechizo',
          texto: card.recompensa,
        })
      }
      // Efecto adicional
      if (card.efectoData) {
        efectos.push(card.efectoData)
      } else if (card.efecto) {
        efectos.push({
          tipo: 'pasivo',
          texto: card.efecto,
        })
      }
      return { ...card, efectos }
    }

    case 'Éter': {
      // Reserva
      if (card.efectoReservaData) {
        efectos.push(card.efectoReservaData)
      } else if (card.efectoReserva) {
        efectos.push({
          tipo: 'reserva',
          texto: card.efectoReserva,
          trigger: 'ninguno',
        })
      }
      // Pago
      if (card.efectoPagoData) {
        efectos.push(card.efectoPagoData)
      } else if (card.efectoPago) {
        efectos.push({
          tipo: 'pago',
          texto: card.efectoPago,
          trigger: 'ninguno',
        })
      }
      // Bloqueo
      if (card.efectoBloqueoData) {
        efectos.push(card.efectoBloqueoData)
      } else if (card.efectoBloqueo) {
        efectos.push({
          tipo: 'bloqueo',
          texto: card.efectoBloqueo,
        })
      }
      return { ...card, efectos }
    }

    case 'Vínculo': {
      if (card.efectoData) {
        efectos.push(card.efectoData)
      } else if (card.efecto) {
        efectos.push({
          tipo: 'vinculo',
          texto: card.efecto,
        })
      }
      return { ...card, efectos }
    }

    default:
      return card
  }
}

// Ejecutar migración
const todasLasCartas = [...ESTASIS_CARDS, ...DISONANCIA_CARDS]
const migradas = todasLasCartas.map(migrarCarta)

// Estadísticas
let conEfectos = 0
let sinEfectos = 0
for (const card of migradas) {
  if ('efectos' in card && card.efectos && card.efectos.length > 0) {
    conEfectos++
  } else {
    sinEfectos++
    console.log(`⚠️  ${card.id} (${card.name}) — sin efectos`)
  }
}

console.log(`\n✅ Migración completada:`)
console.log(`   Total cartas: ${todasLasCartas.length}`)
console.log(`   Con efectos: ${conEfectos}`)
console.log(`   Sin efectos: ${sinEfectos}`)

// Exportar para uso directo
export const ALL_CARDS_MIGRATED: AnyCard[] = migradas
