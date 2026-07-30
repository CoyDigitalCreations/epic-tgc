/**
 * Generador del mazo FIRSTBORNE (Primer Nacido)
 * 70 cartas — Mazo temático de campeonas con lore, efectos complejos y sinergia interna
 *
 * Uso: npx tsx scripts/generate-firstborne.ts
 */

import { v4 as uuid } from 'uuid'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const now = new Date().toISOString()
const SEED_DIR = path.resolve(__dirname, '..', 'seed')

// ─── Helpers ────────────────────────────────────────

function limiteCopias(rarity: string): number {
  return rarity === 'Única' ? 1 : 3
}

function card(overrides: Record<string, unknown>): Record<string, unknown> {
  const rarity = (overrides.rarity as string) || 'Común'
  return {
    id: uuid(),
    createdAt: now,
    updatedAt: now,
    flavorText: '',
    keywords: [],
    limiteCopias: limiteCopias(rarity),
    ...overrides,
  }
}

function writeSeed(filename: string, data: Record<string, unknown>[]) {
  if (!fs.existsSync(SEED_DIR)) fs.mkdirSync(SEED_DIR, { recursive: true })
  fs.writeFileSync(path.join(SEED_DIR, filename), JSON.stringify(data, null, 2), 'utf-8')
  console.log(`  ✓ ${filename} (${data.length} cartas)`)
}

const F = 'Firstborne'

// ══════════════════════════════════════════════════════════════════
//  LORE — EL DESPERTAR DE LAS FIRSTBORNE
// ══════════════════════════════════════════════════════════════════
//
//  Antes de la Gran Escisión, cuando las facciones de Orden y Caos
//  aún no habían tomado sus nombres, existían las Primeras Hijas.
//  Cada una era la primogénita de su casa noble, elegida al nacer
//  para fusionarse con un cristal de Éter primigenio.
//
//  Este vínculo las marcó para siempre. Sus cuerpos se convirtieron
//  en conductos vivientes del Éter, y su voluntad en la fuerza
//  que moldea la realidad. Pero cuando las casas cayeron en la
//  guerra, las Firstborne se negaron a elegir bando.
//
//  Ahora vagan por el mundo, unidas por la sangre y el Éter,
//  buscando el origen de su poder y el propósito de su existencia.
//
//  "No somos hijas de ningún reino. Somos el Reino."
//    — Aurora, La Primogénita
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
//  1.  ÉTER  (8 únicas)
// ══════════════════════════════════════════════════════════════════

const eter: Record<string, unknown>[] = [
  // ── Comunes ──────────────────────────────
  card({
    name: 'Éter de Alborada',
    type: 'Éter',
    rarity: 'Común',
    element: 'Luz',
    stats: { cost: 1 },
    flavorText: '"El primer rayo de luz que tocó su piel encendió algo que nunca se apagaría."',
    tipoEfecto: 'Pasivo',
    efectoPasivo: 'Mientras esta carta esté en tu Reserva, tus Campeones Firstborne ganan +1 Ataque.',
    keywords: [],
  }),

  card({
    name: 'Éter de Ocaso',
    type: 'Éter',
    rarity: 'Común',
    element: 'Tinieblas',
    stats: { cost: 1 },
    flavorText: '"En la penumbra aprendió que la oscuridad no es una enemiga, sino un arma."',
    tipoEfecto: 'Activo',
    efectoActivo: 'Exilia esta carta: Un Campeón enemigo pierde -1 Ataque por cada Éter en tu Reserva (máx. -3).',
    keywords: [],
  }),

  card({
    name: 'Éter de Vendaval',
    type: 'Éter',
    rarity: 'Poco Común',
    element: 'Aire',
    stats: { cost: 2 },
    flavorText: '"El viento no miente, y ella aprendió a escuchar su verdad."',
    tipoEfecto: 'Activo',
    efectoActivo: 'Exilia esta carta: Mira las primeras 2 cartas de tu mazo. Añade 1 a tu mano y pon la otra en el fondo de tu mazo.',
    keywords: [],
  }),

  card({
    name: 'Éter de Escarcha Eterna',
    type: 'Éter',
    rarity: 'Poco Común',
    element: 'Agua',
    stats: { cost: 2 },
    flavorText: '"Su corazón es una gema de hielo forjada en la soledad de las montañas."',
    tipoEfecto: 'Activo',
    efectoActivo: 'Exilia esta carta: Congela un Campeón enemigo (no puede atacar ni usar habilidades) hasta tu próximo turno.',
    keywords: [],
  }),

  // ── Raras ────────────────────────────────
  card({
    name: 'Éter de Renacimiento',
    type: 'Éter',
    rarity: 'Rara',
    element: 'Luz',
    stats: { cost: 3 },
    flavorText: '"Cicatriz de guerra. Prueba de que sobrevivió a lo imposible. Una vez más."',
    tipoEfecto: 'Activo',
    efectoActivo: 'Exilia esta carta: La próxima vez que un Campeón Firstborne fuera a ser destruido este turno, en su lugar vuelve al campo con 2 de Defensa.',
    keywords: [],
  }),

  card({
    name: 'Éter de Tormenta Inminente',
    type: 'Éter',
    rarity: 'Rara',
    element: 'Aire',
    stats: { cost: 3 },
    flavorText: '"Donde ella camina, la tormenta la sigue. Donde ella lucha, el cielo se desgarra."',
    tipoEfecto: 'Activo',
    efectoActivo: 'Exilia esta carta: Roba 1 carta por cada Éter que hayas exiliado de tu Reserva este turno.',
    keywords: [],
  }),

  // ── Épicas ───────────────────────────────
  card({
    name: 'Éter de Eclipse',
    type: 'Éter',
    rarity: 'Épica',
    element: 'Tinieblas',
    stats: { cost: 4 },
    flavorText: '"Cuando el sol y la luna se encuentran, el velo entre mundos se desgarra."',
    tipoEfecto: 'Activo',
    efectoActivo: 'Exilia esta carta: Exilia un Campeón enemigo con Defensa igual o menor a la cantidad de Éter en tu Reserva.',
    keywords: [],
  }),

  card({
    name: 'Éter de Fusión',
    type: 'Éter',
    rarity: 'Épica',
    element: 'Fuego',
    stats: { cost: 4 },
    flavorText: '"Dos almas, un solo propósito. Su vínculo trasciende lo físico."',
    tipoEfecto: 'Pasivo',
    efectoPasivo: 'Mientras esta carta esté en tu Reserva, los efectos de tus cartas Firstborne que requieran exiliar Éter cuestan 1 Éter menos (mín. 1).',
    keywords: [],
  }),
]

// ══════════════════════════════════════════════════════════════════
//  2.  CAMPEONAS FIRSTBORNE  (11 únicas → 26 copias)
// ══════════════════════════════════════════════════════════════════

interface ChampDef {
  name: string
  esencia: string
  rol: string
  catHab: string
  cost: number
  poder: number
  resistencia: number
  tipoEfecto?: 'Pasivo' | 'Activo' | 'Especial'
  efectoPasivo?: string
  efectoActivo?: string
  keywords: string[]
  rarity: string
  element?: string
  faccion: string
  flavorText: string
}

function champ(d: ChampDef): Record<string, unknown> {
  return card({
    name: d.name,
    type: 'Campeón',
    rarity: d.rarity,
    element: d.element,
    flavorText: d.flavorText,
    stats: { cost: d.cost, poder: d.poder, resistencia: d.resistencia },
    faccion: d.faccion,
    esencia: d.esencia,
    rol: d.rol,
    catHabilidad: d.catHab,
    keywords: d.keywords,
    ...(d.tipoEfecto ? { tipoEfecto: d.tipoEfecto } : {}),
    ...(d.tipoEfecto === 'Pasivo' || d.tipoEfecto === 'Especial' ? { efectoPasivo: d.efectoPasivo || '' } : {}),
    ...(d.tipoEfecto === 'Activo' || d.tipoEfecto === 'Especial' ? { efectoActivo: d.efectoActivo || '' } : {}),
  })
}

const champions: ChampDef[] = [
  // ═══ 3 copias ═══════════════════════════

  // 1 ⭐
  {
    name: 'Aria, Portadora del Alba',
    esencia: 'Humano',
    rol: 'Asalto',
    catHab: 'Efecto',
    cost: 1,
    poder: 2,
    resistencia: 2,
    tipoEfecto: 'Activo',
    efectoActivo: 'Exilia 1 Éter de tu Reserva: Aria gana +1 Ataque este turno. Si es tu turno, también gana Vanguardia.',
    keywords: ['Vanguardia'],
    rarity: 'Común',
    element: 'Luz',
    faccion: F,
    flavorText: '"El sol no necesita permiso para brillar. Yo tampoco."',
  },

  // 2 ⭐
  {
    name: 'Lyra, Susurro del Viento',
    esencia: 'Humano',
    rol: 'Control',
    catHab: 'Efecto',
    cost: 2,
    poder: 2,
    resistencia: 3,
    tipoEfecto: 'Activo',
    efectoActivo: 'Exilia 1 Éter de tu Reserva: Mira 4 cartas de la parte superior de tu mazo. Añade 1 a tu mano y pon el resto en el fondo en cualquier orden.',
    keywords: [],
    rarity: 'Común',
    element: 'Aire',
    faccion: F,
    flavorText: '"El viento le contó un secreto. No pienso compartirlo."',
  },

  // 3 ⭐
  {
    name: 'Valeria, Corazón de Escarcha',
    esencia: 'Elemental',
    rol: 'Guardia',
    catHab: 'Efecto',
    cost: 2,
    poder: 1,
    resistencia: 4,
    tipoEfecto: 'Pasivo',
    efectoPasivo: 'Guardián. Cuando un Campeón enemigo ataca a Valeria, ese Campeón pierde -1 Ataque hasta el final del Ocaso del oponente.',
    keywords: ['Guardián'],
    rarity: 'Común',
    element: 'Agua',
    faccion: F,
    flavorText: '"Pocas cosas son más frías que el corazón de una mujer traicionada."',
  },

  // 4 ⭐
  {
    name: 'Selene, Cazadora de Sombras',
    esencia: 'Humano',
    rol: 'Asalto',
    catHab: 'Efecto',
    cost: 3,
    poder: 4,
    resistencia: 3,
    tipoEfecto: 'Activo',
    efectoActivo: 'Exilia 1 Éter de tu Reserva: Selene gana +2 Ataque y no puede ser bloqueada este turno.',
    keywords: [],
    rarity: 'Poco Común',
    element: 'Tinieblas',
    faccion: F,
    flavorText: '"La luna es mi única aliada. Y ella nunca delata a nadie."',
  },

  // 5 ⭐
  {
    name: 'Iris, Tejedora de Destinos',
    esencia: 'Mago',
    rol: 'Control',
    catHab: 'Efecto',
    cost: 3,
    poder: 2,
    resistencia: 4,
    tipoEfecto: 'Pasivo',
    efectoPasivo: 'Una vez por turno, cuando robes una o más cartas, puedes exiliar 1 Éter de tu Reserva para robar 1 carta adicional.',
    keywords: [],
    rarity: 'Poco Común',
    element: 'Luz',
    faccion: F,
    flavorText: '"El destino no está escrito. Se teje, hilo por hilo, decisión por decisión."',
  },

  // ═══ 2 copias ═══════════════════════════

  // 6 ⭐
  {
    name: 'Cassandra, la Voz Ardiente',
    esencia: 'Humano',
    rol: 'Asalto',
    catHab: 'Efecto',
    cost: 3,
    poder: 5,
    resistencia: 2,
    tipoEfecto: 'Activo',
    efectoActivo: 'Exilia 2 Éter de tu Reserva: Destruye un Campeón enemigo con 3 o menos de Defensa. Si es tu turno, también hace 2 de daño al jugador enemigo.',
    keywords: [],
    rarity: 'Rara',
    element: 'Fuego',
    faccion: F,
    flavorText: '"No necesito alzar la voz. Mis llamas hablan por mí."',
  },

  // 7 ⭐
  {
    name: 'Octavia, Muro de la Hermandad',
    esencia: 'Constructo',
    rol: 'Guardia',
    catHab: 'Efecto',
    cost: 4,
    poder: 3,
    resistencia: 5,
    tipoEfecto: 'Pasivo',
    efectoPasivo: 'Guardián. Inquebrantable. Tus otros Campeones Firstborne ganan +1 Ataque.',
    keywords: ['Guardián', 'Inquebrantable'],
    rarity: 'Rara',
    element: 'Tierra',
    faccion: F,
    flavorText: '"Forjada en el crisol de la guerra. Templada en la sangre de sus hermanas."',
  },

  // 8 ⭐
  {
    name: 'Ravenna, Maestra del Eclipse',
    esencia: 'Mago',
    rol: 'Control',
    catHab: 'Efecto',
    cost: 4,
    poder: 4,
    resistencia: 4,
    tipoEfecto: 'Activo',
    efectoActivo: 'Exilia 1 Éter de tu Reserva: Un Campeón enemigo no puede atacar ni usar habilidades este turno. Si exilias 2 Éter, en lugar de eso, exilia ese Campeón hasta tu próximo turno.',
    keywords: [],
    rarity: 'Rara',
    element: 'Tinieblas',
    faccion: F,
    flavorText: '"Cuando la luz se apaga, las verdades ocultas salen a la superficie."',
  },

  // 9 ⭐
  {
    name: 'Seraphina, Portavoz del Éter',
    esencia: 'Céleste',
    rol: 'Soporte',
    catHab: 'Efecto',
    cost: 4,
    poder: 3,
    resistencia: 5,
    tipoEfecto: 'Pasivo',
    efectoPasivo: 'Tus cartas de Éter se consideran como si tuvieran un efecto Activo además de sus otros tipos, y pueden ser exiliadas para pagar costes de habilidades de Campeones Firstborne.',
    keywords: ['Restaurar'],
    rarity: 'Épica',
    element: 'Luz',
    faccion: F,
    flavorText: '"El Éter no es una herramienta. Es una extensión de nuestra voluntad."',
  },

  // 10 ⭐
  {
    name: 'Lilith, Abrazo del Vacío',
    esencia: 'Abisal',
    rol: 'Asalto',
    catHab: 'Efecto',
    cost: 5,
    poder: 6,
    resistencia: 4,
    tipoEfecto: 'Pasivo',
    efectoPasivo: 'Espectro. Cuando Lilith ataca, puedes exiliar 1 Éter de tu Reserva para que ese ataque no pueda ser bloqueado este turno.',
    keywords: ['Espectro'],
    rarity: 'Épica',
    element: 'Tinieblas',
    faccion: F,
    flavorText: '"El vacío no me tomó a mí. Yo tomé el vacío."',
  },

  // ═══ 1 copia (Única) ═══════════════════

  // 11 ⭐
  {
    name: 'Aurora, la Primogénita',
    esencia: 'Céleste',
    rol: 'Soporte',
    catHab: 'Único',
    cost: 5,
    poder: 5,
    resistencia: 6,
    tipoEfecto: 'Especial',
    efectoPasivo: 'Tus otros Campeones Firstborne cuestan 1 Éter menos. Una vez por turno, cuando juegues un Campeón Firstborne, puedes exiliar 1 Éter de tu Reserva para buscar en tu mazo una carta de Éter y añadirla a tu mano.',
    efectoActivo: 'Exilia 2 Éter de tu Reserva: Todos tus Campeones Firstborne ganan +2 Ataque y +1 Defensa hasta el final de tu Ocaso.',
    keywords: ['Restaurar', 'Inmortal'],
    rarity: 'Única',
    element: 'Luz',
    faccion: F,
    flavorText: '"Antes de que existiera el tiempo, ya existía Aurora. Ella es el origen de todas las Firstborne. Su voz es el eco del primer Éter."',
  },
]

// ─── Una carta por cada campeona (única) ───
const campeones: Record<string, unknown>[] = champions.map(champ)

// ══════════════════════════════════════════════════════════════════
//  3.  MÍSTICAS  (3 únicas)
// ══════════════════════════════════════════════════════════════════

const misticas: Record<string, unknown>[] = [
  card({
    name: 'Vínculo de Hermandad',
    type: 'Mística',
    rarity: 'Poco Común',
    element: 'Luz',
    stats: { cost: 2, poder: 0, resistencia: 0 },
    flavorText: '"Nuestra fuerza no es individual. Es el eco de mil batallas libradas juntas."',
    efecto: 'Elige un Campeón Firstborne que controles. Hasta el final de tu Ocaso, ese Campeón copia el Ataque y Defensa de otro Campeón Firstborne que controles (elige al resolver).',
    keywords: [],
  }),

  card({
    name: 'Renacer de las Cenizas',
    type: 'Mística',
    rarity: 'Rara',
    element: 'Fuego',
    stats: { cost: 3, poder: 0, resistencia: 0 },
    flavorText: '"De la destrucción nace una oportunidad. De las cenizas, una nueva historia."',
    efecto: 'Devuelve un Campeón Firstborne de tu Cementerio al campo con 2 de Defensa. Si exilias 1 Éter de tu Reserva al jugar esta carta, en lugar de eso, devuélvelo con su Defensa completa.',
    keywords: [],
  }),

  card({
    name: 'Canción de la Primogénita',
    type: 'Mística',
    rarity: 'Única',
    element: 'Luz',
    stats: { cost: 5, poder: 0, resistencia: 0 },
    flavorText: '"Aurora cantó una vez, y el universo respondió. Las Firstborne escucharon ese canto y supieron que no estaban solas."',
    efecto: 'Busca hasta 2 cartas de Éter de tu mazo y ponlas en tu Reserva. Roba 1 carta por cada Éter puesto en tu Reserva de esta forma.',
    keywords: [],
  }),
]

// ══════════════════════════════════════════════════════════════════
//  4.  ARCANAS  (3 únicas)
// ══════════════════════════════════════════════════════════════════

const arcanas: Record<string, unknown>[] = [
  card({
    name: 'Escudo de la Luna',
    type: 'Arcana',
    rarity: 'Poco Común',
    element: 'Luz',
    stats: { cost: 2 },
    flavorText: '"La luz de la luna la protege incluso en las batallas más oscuras."',
    condicion: 'Cuando recibas daño directo',
    recompensa: 'Reduce el daño a 0. Si exilias 1 Éter de tu Reserva, el atacante recibe 2 de daño.',
    keywords: [],
  }),

  card({
    name: 'Grito de Guerra Ancestral',
    type: 'Arcana',
    rarity: 'Épica',
    element: 'Aire',
    stats: { cost: 3 },
    flavorText: '"Su grito atraviesa montañas. Su llamado convoca a todas las hijas del Éter."',
    condicion: 'Cuando tu fase de combate comience',
    recompensa: 'Todos tus Campeones Firstborne ganan +1 Ataque por cada Éter en tu Reserva hasta el final de tu Ocaso.',
    keywords: [],
  }),

  card({
    name: 'Despertar del Éter Primigenio',
    type: 'Arcana',
    rarity: 'Única',
    element: 'Luz',
    stats: { cost: 5 },
    flavorText: '"La muerte no es el final. Es el comienzo de algo más grande. El Éter nunca olvida a sus hijas."',
    condicion: 'Cuando un Campeón Firstborne sea destruido',
    recompensa: 'Devuelve ese Campeón al campo con +2 Ataque y +2 Defensa. Luego pon 2 cartas de Éter de tu mazo a tu Reserva.',
    keywords: [],
  }),
]

// ══════════════════════════════════════════════════════════════════
//  5.  TÁCTICAS  (2 únicas)
// ══════════════════════════════════════════════════════════════════

const tacticas: Record<string, unknown>[] = [
  card({
    name: 'Reflejos de Éter',
    type: 'Táctica',
    rarity: 'Poco Común',
    stats: { cost: 0, duracion: 0 },
    flavorText: '"Sus reflejos son más rápidos que la luz. El Éter fluye por sus venas como un segundo latido."',
    descripcion: 'Cuando un Campeón enemigo ataque: Niega ese ataque. Si exilias 1 Éter de tu Reserva, roba 1 carta.',
    keywords: [],
  }),

  card({
    name: 'Vínculo de Sangre',
    type: 'Táctica',
    rarity: 'Poco Común',
    stats: { cost: 0, duracion: 0 },
    flavorText: '"La sangre de una es la fuerza de todas. Su vínculo es inquebrantable."',
    descripcion: 'Cuando un Campeón Firstborne use una habilidad que requiera exiliar Éter: Reduce el coste de Éter de esa habilidad en 1. Si el coste se reduce a 0, ganas 2 PE.',
    keywords: [],
  }),
]

// ══════════════════════════════════════════════════════════════════
//  6.  COMBATE  (2 únicas)
// ══════════════════════════════════════════════════════════════════

const combate: Record<string, unknown>[] = [
  card({
    name: 'Golpe de la Primogénita',
    type: 'Combate',
    rarity: 'Común',
    stats: { cost: 0 },
    flavorText: '"Cada golpe lleva el peso de su legado. Cada batalla, la fuerza de su estirpe."',
    descripcion: 'Cuando un Campeón Firstborne ataque: Gana +2 Ataque. Si exilias 1 Éter de tu Reserva, también gana Golpe Letal este turno.',
    keywords: ['Golpe Letal'],
  }),

  card({
    name: 'Manto de Sombras',
    type: 'Combate',
    rarity: 'Común',
    stats: { cost: 0 },
    flavorText: '"La oscuridad la envuelve como una segunda piel. Sus enemigos nunca la ven venir."',
    descripcion: 'Cuando un Campeón Firstborne sea atacado: Gana +3 Defensa. Si exilias 1 Éter de tu Reserva, el atacante recibe 2 de daño.',
    keywords: [],
  }),
]

// ══════════════════════════════════════════════════════════════════
//  Build & Write
// ══════════════════════════════════════════════════════════════════

console.log('\n📦 Generando mazo FIRSTBORNE (cartas únicas)\n')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

const todas = [...eter, ...campeones, ...misticas, ...arcanas, ...tacticas, ...combate]

console.log(`  Éter:       ${eter.length} únicas`)
console.log(`  Campeones:  ${campeones.length} únicas`)
console.log(`  Místicas:   ${misticas.length} únicas`)
console.log(`  Arcanas:    ${arcanas.length} únicas`)
console.log(`  Tácticas:   ${tacticas.length} únicas`)
console.log(`  Combate:    ${combate.length} únicas`)
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

// Write individual type files
writeSeed('firstborne-eter.json', eter)
writeSeed('firstborne-campeones.json', campeones)
writeSeed('firstborne-misticas.json', misticas)
writeSeed('firstborne-arcanas.json', arcanas)
writeSeed('firstborne-tacticas.json', tacticas)
writeSeed('firstborne-combate.json', combate)
writeSeed('firstborne-completo.json', todas)

// Calculate total limiteCopias for display
const totalLimite = todas.reduce((s: number, c: any) => s + (c.limiteCopias || 3), 0)

console.log(`\n✅ Mazo FIRSTBORNE: ${todas.length} cartas únicas en seed/`)
console.log(`   Capacidad total del mazo: ${totalLimite} copias permitidas`)
console.log(`   (cada carta indica su límite en el campo "limiteCopias")`)

// ─── Summary ───
console.log('\n📋 RESUMEN DEL MAZO:')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
console.log('')
console.log('  🏆 Firstborne — "Primer Nacido"')
console.log('  Un mazo de campeonas unidas por el Éter primigenio')
console.log('')
console.log('  ▶ Mecánicas principales:')
console.log('    • Exiliar Éter de la Reserva como coste de activación')
console.log('    • Sinergia entre cartas Firstborne')
console.log('    • Bonus por cantidad de Éter en Reserva')
console.log('    • Protección y recuperación de Campeones')
console.log('')
console.log('  ▶ 3 Cartas Únicas:')
console.log('    • Aurora, la Primogénita (Campeón)')
console.log('    • Canción de la Primogénita (Mística)')
console.log('    • Despertar del Éter Primigenio (Arcana)')
console.log('')
console.log(`  ▶ ${todas.length} cartas únicas | ${totalLimite} copias en mazo completo | Lore completo`)
console.log(`  ▶ Cada carta incluye "limiteCopias" como referencia visual en la lista`)
console.log('')
