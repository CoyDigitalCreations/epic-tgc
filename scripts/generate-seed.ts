/**
 * Generador de datos semilla para ÉTER FORGE
 * Set Básico — "El Despertar del Éter"
 * 285 cartas totales (6 tipos)
 *
 * Uso: npx tsx scripts/generate-seed.ts
 */

import { v4 as uuid } from 'uuid'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

const now = new Date().toISOString()
const SEED_DIR = path.resolve(__dirname, '..', 'seed')

/** Límite de copias por mazo según rareza */
function limiteCopias(rarity: string): number {
  return rarity === 'Única' ? 1 : 3
}

/** Genera texto de sabor según tipo/elemento/nombre */
function flavorFor(c: Record<string, unknown>): string {
  const type = c.type as string
  const name = c.name as string
  const element = (c.element as string) || ''
  const rarity = c.rarity as string

  const isLegendary = rarity === 'Legendaria' || rarity === 'Única'

  const TEMPLATES: Record<string, string[]> = {
    Éter: [
      `"El ${name.toLowerCase()} susurra secretos del Éter primordial."`,
      `"Quien empuña el ${name.toLowerCase()}, domina el flujo de la energía."`,
      `"En el ${name.toLowerCase()} yace la chispa de la creación."`,
      `"El ${name.toLowerCase()} brilla con la luz de mil estrellas."`,
      `"Cada gota de ${name.toLowerCase()} contiene un universo de poder."`,
      `"El ${name.toLowerCase()} es el aliento del mundo manifestado."`,
      `"Los sabios buscan el ${name.toLowerCase()} para alcanzar la iluminación."`,
      `"El ${name.toLowerCase()} danza entre el mundo físico y el etéreo."`,
    ],
    Campeón: [
      `"${name} forjó su leyenda en el campo de batalla."`,
      `"Ni el más oscuro de los abismos pudo contener a ${name}."`,
      `"${name} lucha por un ideal más grande que la victoria."`,
      `"El coraje de ${name} inspira a quienes lo siguen."`,
      `"${name} no conoce el miedo, solo el deber."`,
      `"Donde ${name} camina, la esperanza renace."`,
      `"${name} es un faro en la tormenta del caos."`,
      `"Las leyendas hablan de ${name} en susurros de admiración."`,
      `"${name} convierte el Éter en voluntad, y la voluntad en victoria."`,
      `"Incluso los dioses miran con respeto a ${name}."`,
    ],
    Mística: [
      `"El poder de ${name.toLowerCase()} trasciende la comprensión mortal."`,
      `"${name} teje la realidad con hilos de Éter puro."`,
      `"Quien lanza ${name.toLowerCase()}, desata una fuerza imparable."`,
      `"Los ecos de ${name.toLowerCase()} resuenan en el plano astral."`,
      `"${name} es la expresión del Éter en su forma más pura."`,
      `"Los magos estudian ${name.toLowerCase()} durante décadas para dominarlo."`,
      `"${name} dobla la realidad a la voluntad de su invocador."`,
    ],
    Táctica: [
      `"${name}: un plan que cambia el curso de la batalla."`,
      `"La ${name.toLowerCase()} es el arte de la guerra en acción."`,
      `"${name} demuestra que la mente es el arma más letal."`,
      `"Los generales enseñan ${name.toLowerCase()} como lección fundamental."`,
      `"${name} convierte la desventaja en oportunidad."`,
      `"No hay ejército que resista una ${name.toLowerCase()} bien ejecutada."`,
    ],
    Arcana: [
      `"${name} despierta fuerzas que deberían permanecer dormidas."`,
      `"El conocimiento prohibido de ${name.toLowerCase()} tiene un precio."`,
      `"${name} es un pacto con el Éter mismo."`,
      `"Quien activa ${name.toLowerCase()} debe estar preparado para las consecuencias."`,
      `"${name} revela los secretos mejor guardados del universo."`,
      `"Los arcanistas ocultan ${name.toLowerCase()} en tomos sellados."`,
      `"${name} desafía las leyes de la realidad conocida."`,
    ],
    Combate: [
      `"${name}: el movimiento que define al guerrero."`,
      `"${name} es la danza mortal del campo de batalla."`,
      `"Quien domina ${name.toLowerCase()}, domina el combate."`,
      `"${name} transforma la energía en violencia controlada."`,
      `"Cada golpe de ${name.toLowerCase()} cuenta una historia de supervivencia."`,
    ],
  }

  const pool = TEMPLATES[type] || ['"Un misterio del Éter ancestral."']
  const idx = Math.abs(name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % pool.length

  if (isLegendary) {
    const epic = [
      `"${name}. Que su nombre sea recordido por siempre."`,
      `"Solo los dignos pueden comprender el poder de ${name}."`,
      `"${name} — la culminación del Éter en su máxima expresión."`,
    ]
    return epic[Math.abs(name.length) % epic.length]
  }

  return pool[idx]
}

/** Crea una carta con campos por defecto */
function card(overrides: Record<string, unknown>): Record<string, unknown> {
  const rarity = (overrides.rarity as string) || 'Común'
  const c = {
    id: uuid(),
    createdAt: now,
    updatedAt: now,
    flavorText: '',
    keywords: [],
    limiteCopias: limiteCopias(rarity),
    ...overrides,
  }
  // Auto-generar flavor text si no se proveyó uno
  if (!c.flavorText) {
    c.flavorText = flavorFor(c)
  }
  return c
}

function writeSeed(filename: string, data: Record<string, unknown>[]) {
  if (!fs.existsSync(SEED_DIR)) fs.mkdirSync(SEED_DIR, { recursive: true })
  fs.writeFileSync(path.join(SEED_DIR, filename), JSON.stringify(data, null, 2), 'utf-8')
  console.log(`  ✓ ${filename} (${data.length} cartas)`)
}

// ────────────────────────────────────────────────────────────────
// 1. ÉTER  (35 cartas — valores 1 a 5)
// ────────────────────────────────────────────────────────────────

const eterCards: Record<string, unknown>[] = [
  // ── Valor 1 (7) ──
  card({ name: 'Éter de Chispa', type: 'Éter', rarity: 'Común', element: 'Fuego', stats: { cost: 1 }, keywords: [] }),
  card({ name: 'Éter de Brasa', type: 'Éter', rarity: 'Común', element: 'Fuego', stats: { cost: 1 }, tipoEfecto: 'Pasivo', efectoPasivo: 'Tus Campeones ganan +1 Ataque mientras esta carta esté en tu Reserva.' }),
  card({ name: 'Éter de Rocío', type: 'Éter', rarity: 'Común', element: 'Agua', stats: { cost: 1 }, tipoEfecto: 'Pasivo', efectoPasivo: 'Tus Campeones ganan +1 Defensa mientras esta carta esté en tu Reserva.' }),
  card({ name: 'Éter de Roca', type: 'Éter', rarity: 'Común', element: 'Tierra', stats: { cost: 1 }, tipoEfecto: 'Pasivo', efectoPasivo: 'Tus Guardias ganan +1 Defensa mientras esta carta esté en tu Reserva.' }),
  card({ name: 'Éter de Brisa', type: 'Éter', rarity: 'Común', element: 'Aire', stats: { cost: 1 }, tipoEfecto: 'Activo', efectoActivo: 'Exilia esta carta: Roba 1 carta.' }),
  card({ name: 'Éter de Resplandor', type: 'Éter', rarity: 'Común', element: 'Luz', stats: { cost: 1 }, tipoEfecto: 'Activo', efectoActivo: 'Exilia esta carta: Ganas 2 PE.' }),
  card({ name: 'Éter de Sombra', type: 'Éter', rarity: 'Común', element: 'Tinieblas', stats: { cost: 1 }, tipoEfecto: 'Activo', efectoActivo: 'Exilia esta carta: Un Campeón enemigo pierde -1 Ataque este turno.' }),

  // ── Valor 2 (7) ──
  card({ name: 'Éter de Llama', type: 'Éter', rarity: 'Común', element: 'Fuego', stats: { cost: 2 }, tipoEfecto: 'Activo', efectoActivo: 'Exilia esta carta: Haz 2 de daño a un Campeón enemigo.' }),
  card({ name: 'Éter de Escarcha', type: 'Éter', rarity: 'Común', element: 'Agua', stats: { cost: 2 }, tipoEfecto: 'Activo', efectoActivo: 'Exilia esta carta: Un Campeón enemigo pierde -2 Ataque este turno.' }),
  card({ name: 'Éter de Cristal', type: 'Éter', rarity: 'Común', element: 'Luz', stats: { cost: 2 }, tipoEfecto: 'Activo', efectoActivo: 'Exilia esta carta: Recupera 1 carta de tu Cementerio a tu mano.' }),
  card({ name: 'Éter de Ráfaga', type: 'Éter', rarity: 'Poco Común', element: 'Aire', stats: { cost: 2 }, tipoEfecto: 'Pasivo', efectoPasivo: 'Mientras esta carta esté asignada a un Campeón, ese Campeón gana +1 Ataque y +1 Defensa.' }),
  card({ name: 'Éter de Trueno', type: 'Éter', rarity: 'Poco Común', element: 'Aire', stats: { cost: 2 }, tipoEfecto: 'Pasivo', efectoPasivo: 'Mientras esta carta esté asignada a un Campeón, ese Campeón gana +2 Ataque.' }),
  card({ name: 'Éter de Tierra', type: 'Éter', rarity: 'Poco Común', element: 'Tierra', stats: { cost: 2 }, tipoEfecto: 'Pasivo', efectoPasivo: 'Mientras esta carta esté asignada a un Campeón, ese Campeón gana +2 Defensa.' }),
  card({ name: 'Éter de Luz', type: 'Éter', rarity: 'Poco Común', element: 'Luz', stats: { cost: 2 }, tipoEfecto: 'Activo', efectoActivo: 'Exilia esta carta: Ganas 3 PE.' }),

  // ── Valor 3 (7) ──
  card({ name: 'Éter de Niebla', type: 'Éter', rarity: 'Poco Común', element: 'Agua', stats: { cost: 3 }, tipoEfecto: 'Activo', efectoActivo: 'Exilia esta carta: Un Campeón enemigo no puede atacar este turno.' }),
  card({ name: 'Éter de Ola', type: 'Éter', rarity: 'Poco Común', element: 'Agua', stats: { cost: 3 }, tipoEfecto: 'Activo', efectoActivo: 'Exilia esta carta: Devuelve un Campeón enemigo de coste 3 o menos a la mano de su dueño.' }),
  card({ name: 'Éter de Vacío', type: 'Éter', rarity: 'Poco Común', element: 'Tinieblas', stats: { cost: 3 }, tipoEfecto: 'Activo', efectoActivo: 'Exilia esta carta: Un Campeón enemigo va al Cementerio (si tiene 3 o menos de Defensa).' }),
  card({ name: 'Éter de Furia', type: 'Éter', rarity: 'Rara', element: 'Fuego', stats: { cost: 3 }, tipoEfecto: 'Pasivo', efectoPasivo: 'Mientras esta carta esté asignada a un Campeón, ese Campeón tiene Golpe Letal.', keywords: ['Golpe Letal'] }),
  card({ name: 'Éter de Guardia', type: 'Éter', rarity: 'Rara', element: 'Tierra', stats: { cost: 3 }, tipoEfecto: 'Pasivo', efectoPasivo: 'Mientras esta carta esté asignada a un Campeón, ese Campeón tiene Guardián.', keywords: ['Guardián'] }),
  card({ name: 'Éter de Montaña', type: 'Éter', rarity: 'Rara', element: 'Tierra', stats: { cost: 3 }, tipoEfecto: 'Pasivo', efectoPasivo: 'Mientras esta carta esté en tu Reserva, tus Campeones ganan +1 Defensa.' }),
  card({ name: 'Éter de Alma', type: 'Éter', rarity: 'Rara', element: 'Luz', stats: { cost: 3 }, tipoEfecto: 'Activo', efectoActivo: 'Exilia esta carta: Recupera 2 cartas exiliadas al azar a tu Cementerio.' }),

  // ── Valor 4 (7) ──
  card({ name: 'Éter de Sombra Letal', type: 'Éter', rarity: 'Épica', element: 'Tinieblas', stats: { cost: 4 }, tipoEfecto: 'Activo', efectoActivo: 'Exilia esta carta: Un Campeón enemigo pierde -4 Ataque este turno.' }),
  card({ name: 'Éter de Tormenta', type: 'Éter', rarity: 'Épica', element: 'Aire', stats: { cost: 4 }, tipoEfecto: 'Activo', efectoActivo: 'Exilia esta carta: Roba 2 cartas.' }),
  card({ name: 'Éter de Fénix', type: 'Éter', rarity: 'Épica', element: 'Fuego', stats: { cost: 4 }, tipoEfecto: 'Activo', efectoActivo: 'Exilia esta carta: Devuelve un Campeón de tu Cementerio al campo con 2 de Defensa restante.' }),
  card({ name: 'Éter de Aurora', type: 'Éter', rarity: 'Épica', element: 'Luz', stats: { cost: 4 }, tipoEfecto: 'Pasivo', efectoPasivo: 'Mientras esta carta esté en tu Reserva, tus Místicas cuestan 1 Éter menos.' }),
  card({ name: 'Éter de Dragón', type: 'Éter', rarity: 'Épica', element: 'Fuego', stats: { cost: 4 }, tipoEfecto: 'Pasivo', efectoPasivo: 'Mientras esta carta esté en tu Reserva, tus Campeones de tipo Dragón cuestan 1 Éter menos.' }),
  card({ name: 'Éter de Bestia', type: 'Éter', rarity: 'Épica', element: 'Tierra', stats: { cost: 4 }, tipoEfecto: 'Pasivo', efectoPasivo: 'Mientras esta carta esté en tu Reserva, tus Campeones de tipo Bestia ganan +2 Ataque.' }),
  card({ name: 'Éter de Mago', type: 'Éter', rarity: 'Épica', element: 'Luz', stats: { cost: 4 }, tipoEfecto: 'Pasivo', efectoPasivo: 'Mientras esta carta esté en tu Reserva, tus Místicas cuestan 1 Éter menos.' }),

  // ── Valor 5 (7) ──
  card({ name: 'Éter de Creación', type: 'Éter', rarity: 'Legendaria', element: 'Luz', stats: { cost: 5 }, tipoEfecto: 'Activo', efectoActivo: 'Exilia esta carta: Busca cualquier carta de tu mazo y añádela a tu mano.' }),
  card({ name: 'Éter de Aniquilación', type: 'Éter', rarity: 'Legendaria', element: 'Tinieblas', stats: { cost: 5 }, tipoEfecto: 'Activo', efectoActivo: 'Exilia esta carta: Destruye todos los Campeones enemigos con 4 o menos de Defensa.' }),
  card({ name: 'Éter de Eternidad', type: 'Éter', rarity: 'Legendaria', element: 'Luz', stats: { cost: 5 }, tipoEfecto: 'Activo', efectoActivo: 'Exilia esta carta: Recupera 5 PE y roba 1 carta.', keywords: ['Inmortal'] }),
  card({ name: 'Éter de Cataclismo', type: 'Éter', rarity: 'Legendaria', element: 'Fuego', stats: { cost: 5 }, tipoEfecto: 'Activo', efectoActivo: 'Exilia esta carta: Destruye todos los Campeones enemigos.' }),
  card({ name: 'Éter de Tormenta Perfecta', type: 'Éter', rarity: 'Legendaria', element: 'Aire', stats: { cost: 5 }, tipoEfecto: 'Pasivo', efectoPasivo: 'Mientras esta carta esté en tu Reserva, tus Arcanas cuestan 2 Éter menos.' }),
  card({ name: 'Éter de Vida Eterna', type: 'Éter', rarity: 'Legendaria', element: 'Agua', stats: { cost: 5 }, tipoEfecto: 'Pasivo', efectoPasivo: 'Al inicio de tu Alba, recuperas 2 PE mientras esta carta esté en tu Reserva.' }),
  card({ name: 'Éter de Abismo', type: 'Éter', rarity: 'Legendaria', element: 'Tinieblas', stats: { cost: 5 }, tipoEfecto: 'Activo', efectoActivo: 'Exilia esta carta: Exilia un Campeón enemigo con 4 o menos de Defensa.' }),
]

// ────────────────────────────────────────────────────────────────
// 2. CAMPEONES  (80 cartas — 4 facciones × 20)
// ────────────────────────────────────────────────────────────────

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
}

function champ(d: ChampDef): Record<string, unknown> {
  const c: Record<string, unknown> = card({
    name: d.name,
    type: 'Campeón',
    rarity: d.rarity,
    element: d.element,
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
  return c
}

// ═══════════════════════════════════════════════
// ORDEN  (20)
// ═══════════════════════════════════════════════

const ORDEN: ChampDef[] = [
  // 1-8: existentes
  { name: 'Escudero del Alba', esencia: 'Humano', rol: 'Guardia', catHab: 'Efecto', cost: 1, poder: 1, resistencia: 3, tipoEfecto: 'Pasivo', efectoPasivo: 'Guardián.', keywords: ['Guardián'], rarity: 'Común', faccion: 'Orden' },
  { name: 'Centinela de Éter', esencia: 'Constructo', rol: 'Guardia', catHab: 'Efecto', cost: 2, poder: 2, resistencia: 5, tipoEfecto: 'Pasivo', efectoPasivo: 'Guardián. Inquebrantable.', keywords: ['Guardián', 'Inquebrantable'], rarity: 'Común', faccion: 'Orden' },
  { name: 'Caballero de la Alianza', esencia: 'Guerrero', rol: 'Asalto', catHab: 'Efecto', cost: 2, poder: 4, resistencia: 2, tipoEfecto: 'Pasivo', efectoPasivo: 'Carga.', keywords: ['Carga'], rarity: 'Común', faccion: 'Orden' },
  { name: 'Paladín de la Luz', esencia: 'Céleste', rol: 'Guardia', catHab: 'Efecto', cost: 3, poder: 3, resistencia: 5, tipoEfecto: 'Pasivo', efectoPasivo: 'Guardián. Cuando entra al campo, ganas 3 PE.', keywords: ['Guardián'], rarity: 'Poco Común', faccion: 'Orden', element: 'Luz' },
  { name: 'Justiciero del Cielo', esencia: 'Guerrero', rol: 'Asalto', catHab: 'Efecto', cost: 3, poder: 5, resistencia: 3, tipoEfecto: 'Pasivo', efectoPasivo: 'Golpe Letal.', keywords: ['Golpe Letal'], rarity: 'Poco Común', faccion: 'Orden', element: 'Aire' },
  { name: 'Arcángel de la Alborada', esencia: 'Céleste', rol: 'Soporte', catHab: 'Efecto', cost: 4, poder: 3, resistencia: 4, tipoEfecto: 'Activo', efectoActivo: 'Cuando entra al campo, recupera 1 carta exiliada a tu mano.', keywords: ['Restaurar'], rarity: 'Rara', faccion: 'Orden', element: 'Luz' },
  { name: 'Dragón del Orden', esencia: 'Dragón', rol: 'Sacrificio', catHab: 'Efecto', cost: 5, poder: 7, resistencia: 5, tipoEfecto: 'Pasivo', efectoPasivo: 'Requiere sacrificar 1 Campeón. Golpe Letal.', keywords: ['Golpe Letal'], rarity: 'Épica', faccion: 'Orden', element: 'Luz' },
  { name: 'Señor de los Cielos', esencia: 'Dragón', rol: 'Sacrificio', catHab: 'Único', cost: 5, poder: 8, resistencia: 6, tipoEfecto: 'Especial', efectoPasivo: 'Inquebrantable.', efectoActivo: 'Requiere sacrificar 2 Campeones. Golpe Letal.', keywords: ['Inquebrantable', 'Golpe Letal'], rarity: 'Única', faccion: 'Orden', element: 'Luz' },

  // 9-20: nuevas
  { name: 'Explorador del Alba', esencia: 'Humano', rol: 'Asalto', catHab: 'Normal', cost: 1, poder: 2, resistencia: 2, keywords: [], rarity: 'Común', faccion: 'Orden' },
  { name: 'Portaestandarte de la Luz', esencia: 'Humano', rol: 'Soporte', catHab: 'Efecto', cost: 2, poder: 1, resistencia: 3, tipoEfecto: 'Pasivo', efectoPasivo: 'Tus otros Campeones de Orden ganan +1 Ataque.', keywords: [], rarity: 'Común', faccion: 'Orden' },
  { name: 'Forjador de Éter', esencia: 'Constructo', rol: 'Control', catHab: 'Efecto', cost: 2, poder: 2, resistencia: 3, tipoEfecto: 'Activo', efectoActivo: 'Cuando entra, busca 1 carta de Éter de tu mazo y añádela a tu mano.', keywords: [], rarity: 'Poco Común', faccion: 'Orden' },
  { name: 'Caballero de la Aurora', esencia: 'Guerrero', rol: 'Guardia', catHab: 'Efecto', cost: 3, poder: 3, resistencia: 4, tipoEfecto: 'Pasivo', efectoPasivo: 'Guardián. Carga.', keywords: ['Guardián', 'Carga'], rarity: 'Poco Común', faccion: 'Orden' },
  { name: 'Monje de la Armonía', esencia: 'Humano', rol: 'Control', catHab: 'Efecto', cost: 3, poder: 2, resistencia: 4, tipoEfecto: 'Activo', efectoActivo: 'Cuando entra, roba 1 carta.', keywords: [], rarity: 'Poco Común', faccion: 'Orden', element: 'Luz' },
  { name: 'Estratega de la Alianza', esencia: 'Humano', rol: 'Soporte', catHab: 'Efecto', cost: 3, poder: 2, resistencia: 3, tipoEfecto: 'Pasivo', efectoPasivo: 'Tus Campeones de Orden ganan +1 Ataque y +1 Defensa.', keywords: [], rarity: 'Poco Común', faccion: 'Orden' },
  { name: 'Guardián del Templo', esencia: 'Constructo', rol: 'Guardia', catHab: 'Efecto', cost: 4, poder: 3, resistencia: 6, tipoEfecto: 'Pasivo', efectoPasivo: 'Guardián. Inquebrantable.', keywords: ['Guardián', 'Inquebrantable'], rarity: 'Rara', faccion: 'Orden', element: 'Luz' },
  { name: 'Inquisidor de la Verdad', esencia: 'Céleste', rol: 'Control', catHab: 'Efecto', cost: 4, poder: 4, resistencia: 4, tipoEfecto: 'Activo', efectoActivo: 'Cuando entra, exilia un Campeón enemigo con 2 o menos de Defensa.', keywords: [], rarity: 'Rara', faccion: 'Orden', element: 'Luz' },
  { name: 'Paladín del Sol', esencia: 'Céleste', rol: 'Asalto', catHab: 'Efecto', cost: 4, poder: 5, resistencia: 4, tipoEfecto: 'Pasivo', efectoPasivo: 'Golpe Letal. Restaurar.', keywords: ['Golpe Letal', 'Restaurar'], rarity: 'Rara', faccion: 'Orden', element: 'Luz' },
  { name: 'Dragón Alado', esencia: 'Dragón', rol: 'Asalto', catHab: 'Efecto', cost: 5, poder: 6, resistencia: 5, tipoEfecto: 'Pasivo', efectoPasivo: 'Carga. Golpe Letal.', keywords: ['Carga', 'Golpe Letal'], rarity: 'Épica', faccion: 'Orden', element: 'Luz' },
  { name: 'Arcángel del Juicio', esencia: 'Céleste', rol: 'Control', catHab: 'Efecto', cost: 5, poder: 5, resistencia: 5, tipoEfecto: 'Activo', efectoActivo: 'Cuando entra, destruye un Campeón enemigo con 4 o más de Defensa.', keywords: [], rarity: 'Épica', faccion: 'Orden', element: 'Luz' },
  { name: 'Emperador de la Luz', esencia: 'Céleste', rol: 'Soporte', catHab: 'Único', cost: 5, poder: 4, resistencia: 6, tipoEfecto: 'Pasivo', efectoPasivo: 'Tus Campeones ganan +2 Ataque. Solo 1 copia.', keywords: [], rarity: 'Única', faccion: 'Orden', element: 'Luz' },
]

// ═══════════════════════════════════════════════
// CAOS  (20)
// ═══════════════════════════════════════════════

const CAOS: ChampDef[] = [
  // 1-8: existentes
  { name: 'Espectro Errante', esencia: 'Espectro', rol: 'Asalto', catHab: 'Normal', cost: 1, poder: 3, resistencia: 1, keywords: [], rarity: 'Común', faccion: 'Caos', element: 'Tinieblas' },
  { name: 'Sombra del Vacío', esencia: 'Abisal', rol: 'Asalto', catHab: 'Efecto', cost: 2, poder: 4, resistencia: 2, tipoEfecto: 'Pasivo', efectoPasivo: 'Espectro.', keywords: ['Espectro'], rarity: 'Común', faccion: 'Caos', element: 'Tinieblas' },
  { name: 'Devorador de Almas', esencia: 'Espectro', rol: 'Asalto', catHab: 'Efecto', cost: 2, poder: 5, resistencia: 1, tipoEfecto: 'Pasivo', efectoPasivo: 'Cuando destruye un Campeón, ganas 2 PE.', keywords: [], rarity: 'Común', faccion: 'Caos', element: 'Tinieblas' },
  { name: 'Bestia de Brazas', esencia: 'Bestia', rol: 'Asalto', catHab: 'Efecto', cost: 3, poder: 5, resistencia: 3, tipoEfecto: 'Pasivo', efectoPasivo: 'Carga. Fracturar.', keywords: ['Carga', 'Fracturar'], rarity: 'Poco Común', faccion: 'Caos', element: 'Fuego' },
  { name: 'Demonio del Vacío', esencia: 'Abisal', rol: 'Asalto', catHab: 'Efecto', cost: 3, poder: 6, resistencia: 2, tipoEfecto: 'Pasivo', efectoPasivo: 'Espectro. Golpe Letal.', keywords: ['Espectro', 'Golpe Letal'], rarity: 'Poco Común', faccion: 'Caos', element: 'Tinieblas' },
  { name: 'Ariete del Vacío', esencia: 'Espectro', rol: 'Asalto', catHab: 'Efecto', cost: 4, poder: 6, resistencia: 4, tipoEfecto: 'Activo', efectoActivo: 'Exilia 2 Éter de tu Reserva: Gana +3 Ataque.', keywords: ['Golpe Letal', 'Espectro'], rarity: 'Rara', faccion: 'Caos', element: 'Tinieblas' },
  { name: 'Dragón del Caos', esencia: 'Dragón', rol: 'Sacrificio', catHab: 'Efecto', cost: 5, poder: 8, resistencia: 4, tipoEfecto: 'Pasivo', efectoPasivo: 'Requiere sacrificar 1 Campeón. Fracturar.', keywords: ['Fracturar'], rarity: 'Épica', faccion: 'Caos', element: 'Fuego' },
  { name: 'Devorador de Mundos', esencia: 'Abisal', rol: 'Sacrificio', catHab: 'Único', cost: 5, poder: 9, resistencia: 3, tipoEfecto: 'Especial', efectoPasivo: 'Espectro.', efectoActivo: 'Requiere sacrificar 2 Campeones. Golpe Letal.', keywords: ['Espectro', 'Golpe Letal'], rarity: 'Única', faccion: 'Caos', element: 'Tinieblas' },

  // 9-20: nuevas
  { name: 'Buitre del Abismo', esencia: 'Abisal', rol: 'Asalto', catHab: 'Efecto', cost: 1, poder: 2, resistencia: 1, tipoEfecto: 'Pasivo', efectoPasivo: 'Cuando destruye un Campeón, ganas 1 PE.', keywords: [], rarity: 'Común', faccion: 'Caos', element: 'Tinieblas' },
  { name: 'Esbirro del Caos', esencia: 'Espectro', rol: 'Asalto', catHab: 'Normal', cost: 2, poder: 3, resistencia: 2, tipoEfecto: 'Pasivo', efectoPasivo: 'Espectro.', keywords: ['Espectro'], rarity: 'Común', faccion: 'Caos', element: 'Tinieblas' },
  { name: 'Invocador Oscuro', esencia: 'Humano', rol: 'Control', catHab: 'Efecto', cost: 2, poder: 1, resistencia: 3, tipoEfecto: 'Activo', efectoActivo: 'Cuando entra, exilia 1 carta de tu Cementerio: roba 1 carta.', keywords: [], rarity: 'Poco Común', faccion: 'Caos', element: 'Tinieblas' },
  { name: 'Súcubo del Vacío', esencia: 'Abisal', rol: 'Soporte', catHab: 'Efecto', cost: 3, poder: 3, resistencia: 3, tipoEfecto: 'Activo', efectoActivo: 'Cuando entra, un Campeón enemigo pierde -2 Ataque este turno.', keywords: [], rarity: 'Poco Común', faccion: 'Caos', element: 'Tinieblas' },
  { name: 'Vorágine de Sombras', esencia: 'Espectro', rol: 'Control', catHab: 'Efecto', cost: 3, poder: 2, resistencia: 4, tipoEfecto: 'Pasivo', efectoPasivo: 'Los Campeones enemigos pierden -1 Ataque mientras esta carta esté en el campo.', keywords: [], rarity: 'Poco Común', faccion: 'Caos', element: 'Tinieblas' },
  { name: 'Carnicero del Caos', esencia: 'Bestia', rol: 'Asalto', catHab: 'Efecto', cost: 3, poder: 5, resistencia: 3, tipoEfecto: 'Pasivo', efectoPasivo: 'Carga. Fracturar.', keywords: ['Carga', 'Fracturar'], rarity: 'Poco Común', faccion: 'Caos', element: 'Fuego' },
  { name: 'Hechicero del Vacío', esencia: 'Abisal', rol: 'Control', catHab: 'Efecto', cost: 4, poder: 3, resistencia: 5, tipoEfecto: 'Activo', efectoActivo: 'Cuando entra, exilia 1 Éter de la Reserva enemiga.', keywords: [], rarity: 'Rara', faccion: 'Caos', element: 'Tinieblas' },
  { name: 'Señor de las Sombras', esencia: 'Espectro', rol: 'Soporte', catHab: 'Efecto', cost: 4, poder: 4, resistencia: 4, tipoEfecto: 'Pasivo', efectoPasivo: 'Tus Espectros ganan +2 Ataque.', keywords: [], rarity: 'Rara', faccion: 'Caos', element: 'Tinieblas' },
  { name: 'Dragón Espectral', esencia: 'Espectro', rol: 'Asalto', catHab: 'Efecto', cost: 4, poder: 6, resistencia: 3, tipoEfecto: 'Pasivo', efectoPasivo: 'Espectro. Golpe Letal.', keywords: ['Espectro', 'Golpe Letal'], rarity: 'Rara', faccion: 'Caos', element: 'Tinieblas' },
  { name: 'Abismo Devorador', esencia: 'Abisal', rol: 'Sacrificio', catHab: 'Efecto', cost: 5, poder: 7, resistencia: 5, tipoEfecto: 'Activo', efectoActivo: 'Requiere sacrificar 1 Campeón. Cuando entra, destruye un Campeón enemigo con 3 o menos de Defensa.', keywords: [], rarity: 'Épica', faccion: 'Caos', element: 'Tinieblas' },
  { name: 'Señor del Caos', esencia: 'Abisal', rol: 'Control', catHab: 'Efecto', cost: 5, poder: 6, resistencia: 5, tipoEfecto: 'Pasivo', efectoPasivo: 'Tus Campeones de Caos ganan +2 Ataque. Fracturar.', keywords: ['Fracturar'], rarity: 'Épica', faccion: 'Caos', element: 'Tinieblas' },
  { name: 'Rey de las Tinieblas', esencia: 'Abisal', rol: 'Sacrificio', catHab: 'Único', cost: 5, poder: 9, resistencia: 5, tipoEfecto: 'Pasivo', efectoPasivo: 'Requiere sacrificar 2 Campeones. Inquebrantable. Solo 1 copia.', keywords: ['Inquebrantable'], rarity: 'Única', faccion: 'Caos', element: 'Tinieblas' },
]

// ═══════════════════════════════════════════════
// SABIDURÍA  (20)
// ═══════════════════════════════════════════════

const SABIDURIA: ChampDef[] = [
  // 1-7: existentes
  { name: 'Aprendiz de Éter', esencia: 'Humano', rol: 'Control', catHab: 'Normal', cost: 1, poder: 1, resistencia: 2, keywords: [], rarity: 'Común', faccion: 'Sabiduría' },
  { name: 'Tejedor de Destinos', esencia: 'Mago', rol: 'Control', catHab: 'Efecto', cost: 2, poder: 2, resistencia: 3, tipoEfecto: 'Activo', efectoActivo: 'Cuando entra, mira 2 cartas de tu mazo, elige 1 para tu mano.', keywords: [], rarity: 'Común', faccion: 'Sabiduría' },
  { name: 'Mago de la Niebla', esencia: 'Mago', rol: 'Control', catHab: 'Efecto', cost: 3, poder: 3, resistencia: 3, tipoEfecto: 'Activo', efectoActivo: 'Cuando entra, elige un Campeón enemigo: pierde -2 Ataque.', keywords: [], rarity: 'Poco Común', faccion: 'Sabiduría', element: 'Agua' },
  { name: 'Archimago del Éter', esencia: 'Mago', rol: 'Control', catHab: 'Efecto', cost: 3, poder: 2, resistencia: 4, tipoEfecto: 'Pasivo', efectoPasivo: 'Tus Místicas cuestan 1 Éter menos.', keywords: [], rarity: 'Poco Común', faccion: 'Sabiduría' },
  { name: 'Visionario del Alba', esencia: 'Céleste', rol: 'Soporte', catHab: 'Efecto', cost: 4, poder: 3, resistencia: 4, tipoEfecto: 'Activo', efectoActivo: 'Restaurar. Cuando entra, roba 1 carta.', keywords: ['Restaurar'], rarity: 'Rara', faccion: 'Sabiduría', element: 'Luz' },
  { name: 'Dragón del Conocimiento', esencia: 'Dragón', rol: 'Sacrificio', catHab: 'Efecto', cost: 5, poder: 6, resistencia: 6, tipoEfecto: 'Activo', efectoActivo: 'Requiere sacrificar 1 Campeón. Cuando entra, roba 2 cartas.', keywords: [], rarity: 'Épica', faccion: 'Sabiduría', element: 'Aire' },
  { name: 'Guardián del Conocimiento', esencia: 'Constructo', rol: 'Guardia', catHab: 'Único', cost: 5, poder: 4, resistencia: 8, tipoEfecto: 'Pasivo', efectoPasivo: 'Guardián. Inquebrantable.', keywords: ['Guardián', 'Inquebrantable'], rarity: 'Única', faccion: 'Sabiduría', element: 'Luz' },

  // 8-20: nuevas
  { name: 'Sabio del Pueblo', esencia: 'Humano', rol: 'Soporte', catHab: 'Efecto', cost: 1, poder: 1, resistencia: 3, tipoEfecto: 'Pasivo', efectoPasivo: 'Tus Místicas cuestan 1 Éter menos.', keywords: [], rarity: 'Común', faccion: 'Sabiduría' },
  { name: 'Estudiante Arcano', esencia: 'Mago', rol: 'Control', catHab: 'Efecto', cost: 2, poder: 2, resistencia: 2, tipoEfecto: 'Activo', efectoActivo: 'Cuando entra, mira 1 carta de tu mazo.', keywords: [], rarity: 'Común', faccion: 'Sabiduría' },
  { name: 'Cartógrafo del Éter', esencia: 'Humano', rol: 'Control', catHab: 'Efecto', cost: 2, poder: 1, resistencia: 3, tipoEfecto: 'Activo', efectoActivo: 'Cuando entra, añade 1 carta de Éter de tu mazo a tu mano.', keywords: [], rarity: 'Común', faccion: 'Sabiduría' },
  { name: 'Bibliotecario del Conocimiento', esencia: 'Constructo', rol: 'Guardia', catHab: 'Efecto', cost: 3, poder: 2, resistencia: 5, tipoEfecto: 'Activo', efectoActivo: 'Guardián. Cuando entra, roba 1 carta.', keywords: ['Guardián'], rarity: 'Poco Común', faccion: 'Sabiduría' },
  { name: 'Elementalista del Viento', esencia: 'Elemental', rol: 'Control', catHab: 'Efecto', cost: 3, poder: 3, resistencia: 3, tipoEfecto: 'Activo', efectoActivo: 'Cuando entra, devuelve un Campeón enemigo de coste 2 o menos a la mano de su dueño.', keywords: [], rarity: 'Poco Común', faccion: 'Sabiduría', element: 'Aire' },
  { name: 'Maestro de la Ilusión', esencia: 'Mago', rol: 'Control', catHab: 'Efecto', cost: 3, poder: 2, resistencia: 4, tipoEfecto: 'Activo', efectoActivo: 'Cuando entra, un Campeón enemigo no puede atacar este turno.', keywords: [], rarity: 'Poco Común', faccion: 'Sabiduría', element: 'Agua' },
  { name: 'Espíritu del Saber', esencia: 'Elemental', rol: 'Soporte', catHab: 'Efecto', cost: 4, poder: 3, resistencia: 4, tipoEfecto: 'Pasivo', efectoPasivo: 'Restaurar. Tus Místicas ganan "Roba 1 carta" al jugarse.', keywords: ['Restaurar'], rarity: 'Rara', faccion: 'Sabiduría', element: 'Luz' },
  { name: 'Guardián de la Biblioteca', esencia: 'Constructo', rol: 'Guardia', catHab: 'Efecto', cost: 4, poder: 3, resistencia: 7, tipoEfecto: 'Pasivo', efectoPasivo: 'Guardián. Inquebrantable.', keywords: ['Guardián', 'Inquebrantable'], rarity: 'Rara', faccion: 'Sabiduría', element: 'Luz' },
  { name: 'Oráculo del Destino', esencia: 'Mago', rol: 'Soporte', catHab: 'Efecto', cost: 4, poder: 2, resistencia: 5, tipoEfecto: 'Activo', efectoActivo: 'Cuando entra, mira 3 cartas de tu mazo, elige 1 para tu mano.', keywords: [], rarity: 'Rara', faccion: 'Sabiduría', element: 'Luz' },
  { name: 'Sabio Elemental', esencia: 'Elemental', rol: 'Control', catHab: 'Efecto', cost: 4, poder: 4, resistencia: 4, tipoEfecto: 'Pasivo', efectoPasivo: 'Tus Místicas y Arcanas cuestan 1 Éter menos.', keywords: [], rarity: 'Rara', faccion: 'Sabiduría' },
  { name: 'Dragón Arcano', esencia: 'Dragón', rol: 'Soporte', catHab: 'Efecto', cost: 5, poder: 5, resistencia: 6, tipoEfecto: 'Activo', efectoActivo: 'Requiere sacrificar 1 Campeón. Cuando entra, roba 2 cartas.', keywords: [], rarity: 'Épica', faccion: 'Sabiduría', element: 'Aire' },
  { name: 'Archimago Supremo', esencia: 'Mago', rol: 'Control', catHab: 'Efecto', cost: 5, poder: 5, resistencia: 5, tipoEfecto: 'Activo', efectoActivo: 'Cuando entra, copia una Mística de tu Cementerio y juegala sin coste.', keywords: [], rarity: 'Épica', faccion: 'Sabiduría', element: 'Luz' },
  { name: 'Maestro del Conocimiento', esencia: 'Mago', rol: 'Control', catHab: 'Único', cost: 5, poder: 4, resistencia: 5, tipoEfecto: 'Pasivo', efectoPasivo: 'Al inicio de tu Alba, copia la primera carta de tu mazo en tu mano. Solo 1 copia.', keywords: [], rarity: 'Única', faccion: 'Sabiduría', element: 'Luz' },
]

// ═══════════════════════════════════════════════
// NATURALEZA  (20)
// ═══════════════════════════════════════════════

const NATURALEZA: ChampDef[] = [
  // 1-7: existentes
  { name: 'Lobezno Salvaje', esencia: 'Bestia', rol: 'Asalto', catHab: 'Normal', cost: 1, poder: 3, resistencia: 1, keywords: [], rarity: 'Común', faccion: 'Naturaleza' },
  { name: 'Colmillo de Piedra', esencia: 'Bestia', rol: 'Asalto', catHab: 'Efecto', cost: 2, poder: 4, resistencia: 3, tipoEfecto: 'Pasivo', efectoPasivo: 'Carga.', keywords: ['Carga'], rarity: 'Común', faccion: 'Naturaleza', element: 'Tierra' },
  { name: 'Fiera de la Tormenta', esencia: 'Bestia', rol: 'Asalto', catHab: 'Efecto', cost: 3, poder: 5, resistencia: 2, tipoEfecto: 'Pasivo', efectoPasivo: 'Carga. Golpe Letal.', keywords: ['Carga', 'Golpe Letal'], rarity: 'Poco Común', faccion: 'Naturaleza', element: 'Aire' },
  { name: 'Guardián del Bosque', esencia: 'Elemental', rol: 'Guardia', catHab: 'Efecto', cost: 3, poder: 2, resistencia: 6, tipoEfecto: 'Activo', efectoActivo: 'Guardián. Cuando entra, ganas 3 PE.', keywords: ['Guardián'], rarity: 'Poco Común', faccion: 'Naturaleza', element: 'Tierra' },
  { name: 'Espíritu de la Naturaleza', esencia: 'Elemental', rol: 'Soporte', catHab: 'Efecto', cost: 4, poder: 2, resistencia: 5, tipoEfecto: 'Pasivo', efectoPasivo: 'Restaurar. Tus Bestias ganan +1 Ataque.', keywords: ['Restaurar'], rarity: 'Rara', faccion: 'Naturaleza', element: 'Tierra' },
  { name: 'Dragón de la Tierra', esencia: 'Dragón', rol: 'Sacrificio', catHab: 'Efecto', cost: 5, poder: 7, resistencia: 6, tipoEfecto: 'Pasivo', efectoPasivo: 'Requiere sacrificar 1 Campeón. Inquebrantable.', keywords: ['Inquebrantable'], rarity: 'Épica', faccion: 'Naturaleza', element: 'Tierra' },
  { name: 'Colmillo del Mundo', esencia: 'Bestia', rol: 'Sacrificio', catHab: 'Único', cost: 5, poder: 8, resistencia: 5, tipoEfecto: 'Pasivo', efectoPasivo: 'Requiere sacrificar 2 Campeones. Golpe Letal.', keywords: ['Golpe Letal'], rarity: 'Única', faccion: 'Naturaleza', element: 'Tierra' },

  // 8-20: nuevas
  { name: 'Jabalí del Bosque', esencia: 'Bestia', rol: 'Asalto', catHab: 'Normal', cost: 1, poder: 2, resistencia: 2, tipoEfecto: 'Pasivo', efectoPasivo: 'Carga.', keywords: ['Carga'], rarity: 'Común', faccion: 'Naturaleza', element: 'Tierra' },
  { name: 'Explorador de la Selva', esencia: 'Humano', rol: 'Asalto', catHab: 'Normal', cost: 2, poder: 3, resistencia: 2, tipoEfecto: 'Pasivo', efectoPasivo: 'Vanguardia.', keywords: ['Vanguardia'], rarity: 'Común', faccion: 'Naturaleza' },
  { name: 'Druida del Bosque', esencia: 'Humano', rol: 'Soporte', catHab: 'Efecto', cost: 2, poder: 1, resistencia: 4, tipoEfecto: 'Activo', efectoActivo: 'Cuando entra, ganas 3 PE.', keywords: [], rarity: 'Común', faccion: 'Naturaleza', element: 'Tierra' },
  { name: 'Lobo de la Manada', esencia: 'Bestia', rol: 'Asalto', catHab: 'Efecto', cost: 2, poder: 3, resistencia: 3, tipoEfecto: 'Pasivo', efectoPasivo: 'Tus Bestias ganan +1 Ataque.', keywords: [], rarity: 'Poco Común', faccion: 'Naturaleza', element: 'Tierra' },
  { name: 'Elemental de Roca', esencia: 'Elemental', rol: 'Guardia', catHab: 'Efecto', cost: 3, poder: 2, resistencia: 6, tipoEfecto: 'Pasivo', efectoPasivo: 'Guardián.', keywords: ['Guardián'], rarity: 'Poco Común', faccion: 'Naturaleza', element: 'Tierra' },
  { name: 'Águila del Pico', esencia: 'Bestia', rol: 'Asalto', catHab: 'Efecto', cost: 3, poder: 4, resistencia: 3, tipoEfecto: 'Pasivo', efectoPasivo: 'Carga. Vanguardia.', keywords: ['Carga', 'Vanguardia'], rarity: 'Poco Común', faccion: 'Naturaleza', element: 'Aire' },
  { name: 'Serpiente de la Jungla', esencia: 'Bestia', rol: 'Asalto', catHab: 'Efecto', cost: 3, poder: 5, resistencia: 2, tipoEfecto: 'Pasivo', efectoPasivo: 'Golpe Letal.', keywords: ['Golpe Letal'], rarity: 'Poco Común', faccion: 'Naturaleza', element: 'Tierra' },
  { name: 'Gigante del Bosque', esencia: 'Elemental', rol: 'Guardia', catHab: 'Efecto', cost: 4, poder: 4, resistencia: 7, tipoEfecto: 'Pasivo', efectoPasivo: 'Guardián. Inquebrantable.', keywords: ['Guardián', 'Inquebrantable'], rarity: 'Rara', faccion: 'Naturaleza', element: 'Tierra' },
  { name: 'Chamán de la Tribu', esencia: 'Humano', rol: 'Soporte', catHab: 'Efecto', cost: 4, poder: 3, resistencia: 4, tipoEfecto: 'Pasivo', efectoPasivo: 'Tus Bestias ganan +2 Ataque.', keywords: [], rarity: 'Rara', faccion: 'Naturaleza', element: 'Tierra' },
  { name: 'Hidra del Pantano', esencia: 'Bestia', rol: 'Asalto', catHab: 'Efecto', cost: 4, poder: 5, resistencia: 5, tipoEfecto: 'Pasivo', efectoPasivo: 'Cuando esta carta es destruida, ganas 5 PE.', keywords: [], rarity: 'Rara', faccion: 'Naturaleza', element: 'Agua' },
  { name: 'Espíritu del Bosque', esencia: 'Elemental', rol: 'Soporte', catHab: 'Efecto', cost: 4, poder: 3, resistencia: 5, tipoEfecto: 'Pasivo', efectoPasivo: 'Restaurar. Al inicio de tu Alba, ganas 2 PE.', keywords: ['Restaurar'], rarity: 'Rara', faccion: 'Naturaleza', element: 'Tierra' },
  { name: 'Dragón del Viento', esencia: 'Dragón', rol: 'Asalto', catHab: 'Efecto', cost: 5, poder: 7, resistencia: 5, tipoEfecto: 'Pasivo', efectoPasivo: 'Carga. Golpe Letal. Vanguardia.', keywords: ['Carga', 'Golpe Letal', 'Vanguardia'], rarity: 'Épica', faccion: 'Naturaleza', element: 'Aire' },
  { name: 'Rey de la Manada', esencia: 'Bestia', rol: 'Sacrificio', catHab: 'Único', cost: 5, poder: 7, resistencia: 5, tipoEfecto: 'Pasivo', efectoPasivo: 'Tus Bestias ganan +2 Ataque y +1 Defensa. Solo 1 copia.', keywords: [], rarity: 'Única', faccion: 'Naturaleza', element: 'Tierra' },
]

const campeones = [...ORDEN, ...CAOS, ...SABIDURIA, ...NATURALEZA].map(champ)

// ────────────────────────────────────────────────────────────────
// 3. MÍSTICAS  (50 cartas)
// ────────────────────────────────────────────────────────────────

interface SpellDef {
  name: string
  cost: number
  effect: string
  rarity: string
  element?: string
}

const MISTICAS_DATA: SpellDef[] = [
  // ── Coste 1 (10) ──
  { name: 'Chispa de Éter', cost: 1, effect: 'Haz 2 de daño a un Campeón enemigo.', rarity: 'Común', element: 'Fuego' },
  { name: 'Escudo de Éter', cost: 1, effect: 'Un Campeón propio gana +2 Defensa este turno.', rarity: 'Común', element: 'Tierra' },
  { name: 'Robo de Éter', cost: 1, effect: 'Roba 1 carta.', rarity: 'Común', element: 'Aire' },
  { name: 'Golpe de Viento', cost: 1, effect: 'Un Campeón enemigo pierde -2 Ataque este turno.', rarity: 'Común', element: 'Aire' },
  { name: 'Descarga Eléctrica', cost: 1, effect: 'Haz 1 de daño a un Campeón enemigo y ese Campeón pierde -1 Ataque este turno.', rarity: 'Común', element: 'Aire' },
  { name: 'Bendición Menor', cost: 1, effect: 'Ganas 2 PE.', rarity: 'Común', element: 'Luz' },
  { name: 'Golpe de Tierra', cost: 1, effect: 'Un Campeón propio gana +1 Defensa.', rarity: 'Común', element: 'Tierra' },
  { name: 'Sombra Veloz', cost: 1, effect: 'Un Campeón enemigo pierde -1 Defensa este turno.', rarity: 'Común', element: 'Tinieblas' },
  { name: 'Chispa de Agua', cost: 1, effect: 'Un Campeón enemigo pierde -1 Ataque este turno.', rarity: 'Común', element: 'Agua' },
  { name: 'Toque de Éter', cost: 1, effect: 'Pon 1 carta de Éter de tu mano en tu Reserva.', rarity: 'Común' },

  // ── Coste 2 (10) ──
  { name: 'Restauración Menor', cost: 2, effect: 'Ganas 4 PE.', rarity: 'Común', element: 'Luz' },
  { name: 'Llamarada', cost: 2, effect: 'Haz 3 de daño a un Campeón enemigo.', rarity: 'Común', element: 'Fuego' },
  { name: 'Bendición de Éter', cost: 2, effect: 'Un Campeón propio gana +2 Ataque este turno.', rarity: 'Común', element: 'Luz' },
  { name: 'Rayo de Luz', cost: 2, effect: 'Ganas 5 PE.', rarity: 'Común', element: 'Luz' },
  { name: 'Tormenta de Arena', cost: 2, effect: 'Todos los Campeones enemigos pierden -1 Ataque este turno.', rarity: 'Poco Común', element: 'Tierra' },
  { name: 'Viento Cortante', cost: 2, effect: 'Haz 2 de daño a un Campeón enemigo y roba 1 carta.', rarity: 'Poco Común', element: 'Aire' },
  { name: 'Escudo de Sombras', cost: 2, effect: 'Un Campeón propio gana +3 Defensa este turno.', rarity: 'Poco Común', element: 'Tinieblas' },
  { name: 'Ola de Espuma', cost: 2, effect: 'Devuelve un Campeón enemigo de coste 2 o menos a la mano de su dueño.', rarity: 'Poco Común', element: 'Agua' },
  { name: 'Fuego Fatuo', cost: 2, effect: 'Haz 1 de daño a todos los Campeones enemigos.', rarity: 'Poco Común', element: 'Fuego' },
  { name: 'Niebla de Éter', cost: 2, effect: 'Un Campeón enemigo no puede atacar este turno.', rarity: 'Poco Común', element: 'Agua' },

  // ── Coste 3 (10) ──
  { name: 'Tormenta de Chispas', cost: 3, effect: 'Haz 3 de daño a todos los Campeones enemigos.', rarity: 'Poco Común', element: 'Fuego' },
  { name: 'Muro de Éter', cost: 3, effect: 'Ganas 6 PE.', rarity: 'Poco Común', element: 'Tierra' },
  { name: 'Robo Arcano', cost: 3, effect: 'Roba 2 cartas.', rarity: 'Poco Común', element: 'Aire' },
  { name: 'Llamarada de Fuego', cost: 3, effect: 'Haz 4 de daño a un Campeón enemigo.', rarity: 'Poco Común', element: 'Fuego' },
  { name: 'Escarcha Profunda', cost: 3, effect: 'Un Campeón enemigo no puede atacar ni bloquear este turno.', rarity: 'Poco Común', element: 'Agua' },
  { name: 'Terremoto', cost: 3, effect: 'Haz 2 de daño a todos los Campeones enemigos.', rarity: 'Poco Común', element: 'Tierra' },
  { name: 'Tormenta Eléctrica', cost: 3, effect: 'Haz 3 de daño a un Campeón enemigo y 1 de daño a los demás.', rarity: 'Rara', element: 'Aire' },
  { name: 'Luz Cegadora', cost: 3, effect: 'Un Campeón enemigo pierde -3 Ataque este turno.', rarity: 'Rara', element: 'Luz' },
  { name: 'Abrazo del Vacío', cost: 3, effect: 'Exilia un Campeón enemigo con 2 o menos de Defensa.', rarity: 'Rara', element: 'Tinieblas' },
  { name: 'Golpe del Vacío', cost: 3, effect: 'Destruye un Campeón enemigo con 3 o menos de Defensa.', rarity: 'Rara', element: 'Tinieblas' },

  // ── Coste 4 (10) ──
  { name: 'Furia del Dragón', cost: 4, effect: 'Un Campeón propio gana +4 Ataque este turno.', rarity: 'Rara', element: 'Fuego' },
  { name: 'Escudo de la Alianza', cost: 4, effect: 'Todos tus Campeones ganan +2 Defensa este turno.', rarity: 'Rara', element: 'Tierra' },
  { name: 'Bola de Fuego', cost: 4, effect: 'Haz 5 de daño a un Campeón enemigo.', rarity: 'Rara', element: 'Fuego' },
  { name: 'Muro de Hielo', cost: 4, effect: 'Ganas 8 PE.', rarity: 'Rara', element: 'Agua' },
  { name: 'Tormenta de Polvo', cost: 4, effect: 'Todos los Campeones enemigos pierden -2 Ataque este turno.', rarity: 'Rara', element: 'Tierra' },
  { name: 'Ciclón', cost: 4, effect: 'Devuelve todos los Campeones enemigos de coste 3 o menos a la mano de su dueño.', rarity: 'Épica', element: 'Aire' },
  { name: 'Juicio Divino', cost: 4, effect: 'Destruye un Campeón enemigo con 5 o más de Ataque.', rarity: 'Épica', element: 'Luz' },
  { name: 'Abismo Tenebroso', cost: 4, effect: 'Destruye un Campeón enemigo con 4 o menos de Defensa.', rarity: 'Épica', element: 'Tinieblas' },
  { name: 'Llamada de la Naturaleza', cost: 4, effect: 'Busca un Campeón de tipo Bestia de tu mazo y añádelo a tu mano.', rarity: 'Épica', element: 'Tierra' },
  { name: 'Tormenta de Éter', cost: 4, effect: 'Haz 4 de daño a todos los Campeones enemigos.', rarity: 'Épica', element: 'Aire' },

  // ── Coste 5 (10) ──
  { name: 'Robo del Sabio', cost: 5, effect: 'Roba 3 cartas.', rarity: 'Épica', element: 'Aire' },
  { name: 'Ira del Caos', cost: 5, effect: 'Destruye un Campeón enemigo con 5 o menos de Defensa.', rarity: 'Épica', element: 'Tinieblas' },
  { name: 'Lluvia de Meteoros', cost: 5, effect: 'Haz 6 de daño a todos los Campeones enemigos.', rarity: 'Legendaria', element: 'Fuego' },
  { name: 'Tsunami', cost: 5, effect: 'Devuelve todos los Campeones enemigos a la mano de su dueño.', rarity: 'Legendaria', element: 'Agua' },
  { name: 'Terremoto Devastador', cost: 5, effect: 'Destruye todos los Campeones enemigos con 3 o menos de Defensa.', rarity: 'Legendaria', element: 'Tierra' },
  { name: 'Huracán', cost: 5, effect: 'Roba 4 cartas.', rarity: 'Legendaria', element: 'Aire' },
  { name: 'Explosión Solar', cost: 5, effect: 'Ganas 10 PE y roba 2 cartas.', rarity: 'Legendaria', element: 'Luz' },
  { name: 'Noche Eterna', cost: 5, effect: 'Exilia todos los Campeones enemigos con 4 o menos de Defensa.', rarity: 'Legendaria', element: 'Tinieblas' },
  { name: 'Juicio del Orden', cost: 5, effect: 'Destruye todos los Campeones enemigos con 4 o menos de Defensa.', rarity: 'Legendaria', element: 'Luz' },
  { name: 'Cataclismo de Éter', cost: 5, effect: 'Destruye todos los Campeones enemigos y roba 1 carta por cada uno destruido.', rarity: 'Legendaria', element: 'Fuego' },
]

// ────────────────────────────────────────────────────────────────
// 4. TÁCTICAS  (45 cartas)
// ────────────────────────────────────────────────────────────────

interface TacticDef {
  name: string
  condicion: string
  effect: string
  rarity: string
  element?: string
  keywords?: string[]
}

const TACTICAS_DATA: TacticDef[] = [
  // 1-20: originales
  { name: 'Contraataque', condicion: 'Cuando un Campeón enemigo ataque', effect: 'Niega el ataque.', rarity: 'Común' },
  { name: 'Escudo de Mano', condicion: 'Cuando recibas daño directo', effect: 'Reduce el daño en 2.', rarity: 'Común' },
  { name: 'Recarga Rápida', condicion: 'En tu turno', effect: 'Coloca 1 Éter de tu mano a tu Reserva.', rarity: 'Común' },
  { name: 'Golpe Bajo', condicion: 'Cuando un Campeón enemigo ataque', effect: 'El Campeón atacante pierde -2 Ataque.', rarity: 'Común' },
  { name: 'Defensa Repentina', condicion: 'Cuando un Campeón propio sea atacado', effect: 'El Campeón gana +2 Defensa.', rarity: 'Común' },
  { name: 'Robo de Oportunidad', condicion: 'Cuando destruyas un Campeón enemigo', effect: 'Roba 1 carta.', rarity: 'Común' },
  { name: 'Refuerzo de Éter', condicion: 'Cuando un Campeón propio use una habilidad', effect: 'Reduce el coste de Éter en 1.', rarity: 'Poco Común' },
  { name: 'Guardia de Emergencia', condicion: 'Cuando un Campeón enemigo ataque directo', effect: 'Redirige el ataque a un Campeón con Guardián.', rarity: 'Poco Común' },
  { name: 'Recuperación de Éter', condicion: 'Cuando una carta de Éter vaya al Cementerio', effect: 'Recupera esa carta a tu mano en su lugar.', rarity: 'Poco Común' },
  { name: 'Venganza', condicion: 'Cuando un Campeón propio sea destruido', effect: 'Haz 2 de daño al jugador enemigo.', rarity: 'Poco Común' },
  { name: 'Escudo de Almas', condicion: 'Cuando recibas daño a tus PE', effect: 'Exilia 1 Éter de tu Reserva: Reduce el daño en 3.', rarity: 'Poco Común' },
  { name: 'Refuerzo de Guardia', condicion: 'Cuando un Guardián sea atacado', effect: 'El Guardián gana +3 Defensa.', rarity: 'Rara', keywords: ['Guardián'] },
  { name: 'Robo de Alma', condicion: 'Cuando un Campeón enemigo vaya al Cementerio', effect: 'Ganas 3 PE.', rarity: 'Rara' },
  { name: 'Explosión de Éter', condicion: 'Cuando un Campeón propio muera', effect: 'Haz 3 de daño a todos los Campeones enemigos.', rarity: 'Rara' },
  { name: 'Escudo de Luz', condicion: 'Cuando recibas daño directo', effect: 'Reduce el daño a 0 si exilias 1 Éter de tu Reserva.', rarity: 'Rara', element: 'Luz' },
  { name: 'Furia de la Naturaleza', condicion: 'Cuando un Campeón de tipo Bestia ataque', effect: 'Gana +2 Ataque.', rarity: 'Épica', element: 'Tierra' },
  { name: 'Visión del Mago', condicion: 'Cuando juegues una Mística', effect: 'Puedes copiarla y jugarla de nuevo sin coste.', rarity: 'Épica' },
  { name: 'Sombra del Vacío', condicion: 'Cuando un Campeón de tipo Espectro ataque', effect: 'El daño no puede ser bloqueado.', rarity: 'Épica', element: 'Tinieblas' },
  { name: 'Orden Supremo', condicion: 'Cuando un Campeón de tipo Dragón entre al campo', effect: 'Roba 2 cartas.', rarity: 'Legendaria' },
  { name: 'Caos Infinito', condicion: 'Cuando un Campeón de tipo Abisal entre al campo', effect: 'Destruye un Campeón enemigo con 4 o menos de Defensa.', rarity: 'Legendaria' },

  // 21-45: nuevas
  { name: 'Emboscada', condicion: 'Cuando un Campeón propio ataque a un Guardián', effect: 'Ignora la habilidad Guardián este ataque.', rarity: 'Poco Común' },
  { name: 'Contraofensiva', condicion: 'Cuando un Campeón propio sea destruido', effect: 'Haz 3 de daño al jugador enemigo.', rarity: 'Poco Común' },
  { name: 'Fortaleza', condicion: 'Cuando un Guardián sea atacado', effect: 'Gana +4 Defensa.', rarity: 'Rara', keywords: ['Guardián'] },
  { name: 'Recuperación', condicion: 'Cuando una carta vaya a tu Cementerio desde el campo', effect: 'Ganas 2 PE.', rarity: 'Común' },
  { name: 'Escudo de Viento', condicion: 'Cuando recibas daño directo', effect: 'Reduce el daño en 3.', rarity: 'Común', element: 'Aire' },
  { name: 'Golpe Certero', condicion: 'Cuando un Campeón con Golpe Letal ataque', effect: 'El daño no puede ser reducido.', rarity: 'Rara', keywords: ['Golpe Letal'] },
  { name: 'Refuerzo Bestial', condicion: 'Cuando un Campeón de tipo Bestia entre al campo', effect: 'Gana +2 Ataque este turno.', rarity: 'Poco Común', element: 'Tierra' },
  { name: 'Escudo Arcano', condicion: 'Cuando juegues una Mística', effect: 'Ganas 3 PE.', rarity: 'Poco Común', element: 'Luz' },
  { name: 'Drenaje de Éter', condicion: 'Cuando un Campeón enemigo use una habilidad', effect: 'Exilia 1 Éter de la Reserva enemiga.', rarity: 'Rara', element: 'Tinieblas' },
  { name: 'Reflejos Rápidos', condicion: 'Cuando un Campeón enemigo ataque', effect: 'Roba 1 carta.', rarity: 'Poco Común', element: 'Aire' },
  { name: 'Sacrificio de Éter', condicion: 'Cuando necesites pagar Éter', effect: 'Paga 3 PE en lugar de 1 Éter.', rarity: 'Rara' },
  { name: 'Manto de Sombras', condicion: 'Cuando un Campeón propio sea destruido', effect: 'Exilia esa carta: recupera 1 Éter de tu Cementerio.', rarity: 'Rara', element: 'Tinieblas' },
  { name: 'Alianza Sagrada', condicion: 'Cuando tengas 2 o más Campeones de Orden en campo', effect: 'Todos ganan +1 Ataque y +1 Defensa.', rarity: 'Épica', element: 'Luz' },
  { name: 'Caos Desatado', condicion: 'Cuando tengas 2 o más Campeones de Caos en campo', effect: 'Haz 2 de daño a todos los Campeones enemigos.', rarity: 'Épica', element: 'Tinieblas' },
  { name: 'Sabiduría Ancestral', condicion: 'Cuando juegues una Mística o Arcana', effect: 'Puedes mirar la primera carta de tu mazo.', rarity: 'Épica', element: 'Luz' },
  { name: 'Furia Salvaje', condicion: 'Cuando tengas 2 o más Bestias en campo', effect: 'Tus Bestias ganan +3 Ataque este turno.', rarity: 'Épica', element: 'Tierra' },
  { name: 'Escudo de la Naturaleza', condicion: 'Cuando recibas daño directo', effect: 'Reduce el daño a 0 si controlas un Elemental.', rarity: 'Épica', element: 'Tierra' },
  { name: 'Golpe del Vacío', condicion: 'Cuando un Espectro ataque', effect: 'El Campeón enemigo pierde -2 Defensa.', rarity: 'Rara', element: 'Tinieblas' },
  { name: 'Resistencia Arcana', condicion: 'Cuando un Campeón de tipo Mago sea atacado', effect: 'Reduce el daño en 2.', rarity: 'Poco Común' },
  { name: 'Escudo de Dragón', condicion: 'Cuando un Campeón de tipo Dragón sea atacado', effect: 'Gana +5 Defensa.', rarity: 'Rara' },
  { name: 'Bendición de la Luz', condicion: 'Cuando un Campeón de tipo Céleste entre al campo', effect: 'Ganas 4 PE.', rarity: 'Rara', element: 'Luz' },
  { name: 'Maldición del Abismo', condicion: 'Cuando un Campeón de tipo Abisal entre al campo', effect: 'Un Campeón enemigo pierde -2 Ataque.', rarity: 'Poco Común', element: 'Tinieblas' },
  { name: 'Viento Favorable', condicion: 'Cuando un Campeón con Vanguardia ataque', effect: 'Gana +2 Ataque adicional.', rarity: 'Poco Común', element: 'Aire', keywords: ['Vanguardia'] },
  { name: 'Refuerzo Inquebrantable', condicion: 'Cuando un Campeón con Inquebrantable reciba daño', effect: 'Reduce el daño en 2.', rarity: 'Rara', keywords: ['Inquebrantable'] },
  { name: 'Toque de Éter', condicion: 'Cuando un Éter sea exiliado', effect: 'Ganas 1 PE.', rarity: 'Común' },
]

// ────────────────────────────────────────────────────────────────
// 5. ARCANAS  (45 cartas)
// ────────────────────────────────────────────────────────────────

interface ArcanaDef {
  name: string
  cost: number
  condicion: string
  effect: string
  rarity: string
  element?: string
  keywords?: string[]
}

const ARCANAS_DATA: ArcanaDef[] = [
  // 1-20: originales
  { name: 'Trampa de Éter', cost: 1, condicion: 'Cuando un Campeón enemigo ataque', effect: 'El Campeón atacante pierde -1 Ataque y -1 Defensa.', rarity: 'Común', element: 'Aire' },
  { name: 'Escudo Oculto', cost: 1, condicion: 'Cuando recibas daño directo', effect: 'Reduce el daño en 2.', rarity: 'Común', element: 'Tierra' },
  { name: 'Robo de Sombra', cost: 1, condicion: 'Cuando un Campeón enemigo muera', effect: 'Roba 1 carta.', rarity: 'Común', element: 'Tinieblas' },
  { name: 'Golpe de Niebla', cost: 2, condicion: 'Cuando un Campeón enemigo ataque', effect: 'Haz 2 de daño al Campeón atacante.', rarity: 'Común', element: 'Agua' },
  { name: 'Defensa de Éter', cost: 2, condicion: 'Cuando un Campeón propio sea atacado', effect: 'El Campeón gana +3 Defensa.', rarity: 'Común', element: 'Tierra' },
  { name: 'Drenaje de Éter', cost: 2, condicion: 'Cuando un Campeón enemigo use una habilidad', effect: 'El enemigo exilia 1 Éter de su Reserva.', rarity: 'Poco Común', element: 'Tinieblas' },
  { name: 'Venganza de Éter', cost: 2, condicion: 'Cuando un Campeón propio muera', effect: 'Haz 3 de daño al jugador enemigo.', rarity: 'Poco Común', element: 'Fuego' },
  { name: 'Escudo del Vacío', cost: 3, condicion: 'Cuando recibas daño directo', effect: 'Reduce el daño a 0 y exilia 1 Éter del enemigo.', rarity: 'Poco Común', element: 'Tinieblas' },
  { name: 'Robo de Almas', cost: 3, condicion: 'Cuando un Campeón enemigo muera', effect: 'Ganas 5 PE.', rarity: 'Poco Común', element: 'Luz' },
  { name: 'Golpe del Mago', cost: 3, condicion: 'Cuando un Campeón de tipo Mago ataque', effect: 'El ataque no puede ser bloqueado.', rarity: 'Poco Común' },
  { name: 'Destino del Guerrero', cost: 3, condicion: 'Cuando un Campeón de tipo Guerrero ataque', effect: 'Gana +3 Ataque.', rarity: 'Rara' },
  { name: 'Escudo de Dragón', cost: 4, condicion: 'Cuando un Campeón de tipo Dragón sea atacado', effect: 'El Dragón gana +5 Defensa.', rarity: 'Rara' },
  { name: 'Robo de la Bestia', cost: 4, condicion: 'Cuando un Campeón de tipo Bestia destruya un Campeón', effect: 'Roba 2 cartas.', rarity: 'Rara' },
  { name: 'Juicio del Orden', cost: 4, condicion: 'Cuando un Campeón de tipo Céleste entre al campo', effect: 'Destruye un Campeón enemigo con 3 o menos de Defensa.', rarity: 'Rara', element: 'Luz' },
  { name: 'Caos de la Sombra', cost: 4, condicion: 'Cuando un Campeón de tipo Espectro ataque', effect: 'El daño se duplica.', rarity: 'Épica', element: 'Tinieblas' },
  { name: 'Llamada del Vacío', cost: 4, condicion: 'Cuando un Campeón de tipo Abisal muera', effect: 'Roba 2 cartas y ganas 3 PE.', rarity: 'Épica', element: 'Tinieblas' },
  { name: 'Escudo de la Alianza', cost: 5, condicion: 'Cuando recibas daño directo', effect: 'Reduce el daño a 0 y todos tus Campeones ganan +2 Defensa.', rarity: 'Épica', element: 'Luz' },
  { name: 'Ira del Dragón', cost: 5, condicion: 'Cuando un Campeón de tipo Dragón ataque', effect: 'Haz 5 de daño a todos los Campeones enemigos.', rarity: 'Épica', element: 'Fuego' },
  { name: 'Orden Supremo', cost: 5, condicion: 'Cuando tengas 3 Campeones de Orden en campo', effect: 'Ganas la partida.', rarity: 'Legendaria', element: 'Luz', keywords: ['Inmortal'] },
  { name: 'Caos Infinito', cost: 5, condicion: 'Cuando tengas 3 Campeones de Caos en campo', effect: 'Destruye todos los Campeones enemigos.', rarity: 'Legendaria', element: 'Tinieblas' },

  // 21-45: nuevas
  { name: 'Marca de Éter', cost: 1, condicion: 'Cuando un Campeón entre al campo', effect: 'Pon 1 contador de Éter en ese Campeón (gana +1 Ataque).', rarity: 'Común', element: 'Luz' },
  { name: 'Cuchilla de Viento', cost: 1, condicion: 'Cuando ataques con un Campeón', effect: 'El Campeón gana +1 Ataque.', rarity: 'Común', element: 'Aire' },
  { name: 'Escudo Terrenal', cost: 2, condicion: 'Cuando un Campeón enemigo ataque', effect: 'Reduce el daño en 2.', rarity: 'Común', element: 'Tierra' },
  { name: 'Robo Arcano', cost: 2, condicion: 'Cuando juegues una Mística', effect: 'Roba 1 carta.', rarity: 'Poco Común', element: 'Aire' },
  { name: 'Fuego Interior', cost: 2, condicion: 'Cuando un Campeón propio sea destruido', effect: 'Haz 2 de daño al jugador enemigo.', rarity: 'Poco Común', element: 'Fuego' },
  { name: 'Refuerzo de Éter', cost: 3, condicion: 'Cuando pagues Éter', effect: 'Paga 2 PE en lugar de 1 Éter.', rarity: 'Poco Común', element: 'Luz' },
  { name: 'Sombra del Cazador', cost: 3, condicion: 'Cuando un Campeón de tipo Bestia ataque', effect: 'El Campeón enemigo no puede bloquear.', rarity: 'Poco Común', element: 'Tierra' },
  { name: 'Escarcha de la Tundra', cost: 3, condicion: 'Cuando un Campeón enemigo ataque', effect: 'El Campeón pierde -2 Ataque y -1 Defensa.', rarity: 'Rara', element: 'Agua' },
  { name: 'Escudo de Luz', cost: 4, condicion: 'Cuando recibas daño directo', effect: 'Reduce el daño a 0 y ganas 3 PE.', rarity: 'Rara', element: 'Luz' },
  { name: 'Golpe del Dragón', cost: 4, condicion: 'Cuando un Campeón de tipo Dragón entre al campo', effect: 'Haz 3 de daño a un Campeón enemigo.', rarity: 'Rara', element: 'Fuego' },
  { name: 'Manto del Mago', cost: 4, condicion: 'Cuando juegues una Mística', effect: 'Copia esa Mística y elige un nuevo objetivo.', rarity: 'Épica', element: 'Aire' },
  { name: 'Furia de la Tierra', cost: 4, condicion: 'Cuando un Elemental sea destruido', effect: 'Haz 3 de daño a todos los Campeones enemigos.', rarity: 'Épica', element: 'Tierra' },
  { name: 'Alma de Dragón', cost: 5, condicion: 'Cuando un Dragón sea destruido', effect: 'Devuelve ese Dragón al campo con +2/+2.', rarity: 'Épica', element: 'Fuego' },
  { name: 'Vacío Eterno', cost: 5, condicion: 'Cuando un Espectro sea destruido', effect: 'Exilia ese Espectro: roba 2 cartas.', rarity: 'Épica', element: 'Tinieblas' },
  { name: 'Bendición de la Sabiduría', cost: 5, condicion: 'Cuando juegues 3 Místicas en un turno', effect: 'Roba 3 cartas y ganas 5 PE.', rarity: 'Legendaria', element: 'Luz' },
  { name: 'Naturaleza Salvaje', cost: 5, condicion: 'Cuando tengas 3 Campeones de Naturaleza en campo', effect: 'Tus Bestias y Elementales ganan +3 Ataque.', rarity: 'Legendaria', element: 'Tierra' },
  { name: 'Sabiduría Infinita', cost: 5, condicion: 'Cuando tengas 3 Campeones de Sabiduría en campo', effect: 'Puedes jugar Místicas de tu Cementerio este turno.', rarity: 'Legendaria', element: 'Luz' },
  { name: 'Retorno del Éter', cost: 3, condicion: 'Cuando un Éter sea exiliado de tu Reserva', effect: 'Devuelve ese Éter a tu mano en su lugar.', rarity: 'Rara', element: 'Luz' },
  { name: 'Barrera Elemental', cost: 2, condicion: 'Cuando un Elemental sea atacado', effect: 'Reduce el daño en 3.', rarity: 'Poco Común', element: 'Tierra' },
  { name: 'Golpe del Cazador', cost: 2, condicion: 'Cuando un Campeón con Vanguardia ataque', effect: 'Haz 2 de daño al jugador enemigo.', rarity: 'Poco Común', element: 'Aire' },
  { name: 'Muro de Huesos', cost: 4, condicion: 'Cuando un Campeón con Guardián sea atacado', effect: 'El atacante recibe 2 de daño.', rarity: 'Rara', element: 'Tierra' },
  { name: 'Tormenta de Almas', cost: 4, condicion: 'Cuando 2 o más Campeones sean destruidos en un turno', effect: 'Roba 1 carta por cada uno.', rarity: 'Épica', element: 'Tinieblas' },
  { name: 'Escudo de la Manada', cost: 3, condicion: 'Cuando un Campeón de tipo Bestia sea atacado', effect: 'Otro Campeón Bestia recibe el daño en su lugar.', rarity: 'Rara', element: 'Tierra' },
  { name: 'Grito de Batalla', cost: 3, condicion: 'Cuando tu fase de Combate comience', effect: 'Todos tus Campeones ganan +1 Ataque.', rarity: 'Rara' },
  { name: 'Susurro del Más Allá', cost: 2, condicion: 'Cuando un Campeón enemigo sea exiliado', effect: 'Ganas 3 PE.', rarity: 'Poco Común', element: 'Tinieblas' },
]

// ────────────────────────────────────────────────────────────────
// 6. COMBATE  (30 cartas)
// ────────────────────────────────────────────────────────────────

const COMBATE_DATA: TacticDef[] = [
  // 1-20: originales
  { name: 'Golpe Rápido', condicion: 'Cuando un Campeón propio ataque', effect: 'Gana +1 Ataque.', rarity: 'Común' },
  { name: 'Defensa Rápida', condicion: 'Cuando un Campeón propio sea atacado', effect: 'Gana +2 Defensa.', rarity: 'Común' },
  { name: 'Esquiva', condicion: 'Cuando un Campeón enemigo ataque directo', effect: 'Reduce el daño en 2.', rarity: 'Común' },
  { name: 'Refuerzo de Guardia', condicion: 'Cuando un Guardián sea atacado', effect: 'Gana +2 Defensa.', rarity: 'Común', keywords: ['Guardián'] },
  { name: 'Golpe de Viento', condicion: 'Cuando un Campeón propio ataque', effect: 'El enemigo pierde -1 Defensa.', rarity: 'Común' },
  { name: 'Escudo de Mano', condicion: 'Cuando recibas daño directo', effect: 'Reduce el daño en 3.', rarity: 'Común' },
  { name: 'Robo de Oportunidad', condicion: 'Cuando destruyas un Campeón enemigo', effect: 'Roba 1 carta.', rarity: 'Poco Común' },
  { name: 'Venganza de Éter', condicion: 'Cuando un Campeón propio muera', effect: 'Haz 2 de daño al jugador enemigo.', rarity: 'Poco Común' },
  { name: 'Recuperación de Éter', condicion: 'Cuando una carta de Éter vaya al Cementerio', effect: 'Recupera esa carta a tu mano.', rarity: 'Poco Común' },
  { name: 'Golpe Bajo', condicion: 'Cuando un Campeón enemigo ataque', effect: 'El Campeón atacante pierde -2 Ataque.', rarity: 'Poco Común' },
  { name: 'Escudo de Almas', condicion: 'Cuando recibas daño directo', effect: 'Exilia 1 Éter de tu Reserva: Reduce el daño en 4.', rarity: 'Poco Común' },
  { name: 'Refuerzo de Guardia II', condicion: 'Cuando un Guardián sea atacado', effect: 'Gana +4 Defensa.', rarity: 'Rara', keywords: ['Guardián'] },
  { name: 'Robo de Alma', condicion: 'Cuando un Campeón enemigo vaya al Cementerio', effect: 'Ganas 4 PE.', rarity: 'Rara' },
  { name: 'Explosión de Éter', condicion: 'Cuando un Campeón propio muera', effect: 'Haz 4 de daño a todos los Campeones enemigos.', rarity: 'Rara' },
  { name: 'Furia de la Bestia', condicion: 'Cuando un Campeón de tipo Bestia ataque', effect: 'Gana +3 Ataque.', rarity: 'Rara' },
  { name: 'Visión del Mago', condicion: 'Cuando juegues una Mística', effect: 'Puedes copiarla y jugarla de nuevo sin coste.', rarity: 'Épica' },
  { name: 'Sombra del Vacío', condicion: 'Cuando un Campeón de tipo Espectro ataque', effect: 'El daño no puede ser bloqueado.', rarity: 'Épica' },
  { name: 'Escudo de Dragón', condicion: 'Cuando un Campeón de tipo Dragón sea atacado', effect: 'Gana +5 Defensa.', rarity: 'Épica' },
  { name: 'Orden Divino', condicion: 'Cuando un Campeón de tipo Céleste entre al campo', effect: 'Ganas 5 PE.', rarity: 'Legendaria' },
  { name: 'Caos Eterno', condicion: 'Cuando un Campeón de tipo Abisal entre al campo', effect: 'Destruye un Campeón enemigo con 5 o menos de Defensa.', rarity: 'Legendaria' },

  // 21-30: nuevas
  { name: 'Ataque Sorpresa', condicion: 'Cuando un Campeón con Vanguardia ataque', effect: 'El daño no puede ser bloqueado.', rarity: 'Poco Común', keywords: ['Vanguardia'] },
  { name: 'Defensa de Hierro', condicion: 'Cuando un Campeón con Inquebrantable reciba daño', effect: 'Reduce el daño en 3.', rarity: 'Rara', keywords: ['Inquebrantable'] },
  { name: 'Golpe Letal', condicion: 'Cuando un Campeón con Golpe Letal ataque', effect: 'Haz 2 de daño adicional.', rarity: 'Rara', keywords: ['Golpe Letal'] },
  { name: 'Carga Imparable', condicion: 'Cuando un Campeón con Carga ataque', effect: 'Gana +2 Ataque adicional.', rarity: 'Poco Común', keywords: ['Carga'] },
  { name: 'Fracturar', condicion: 'Cuando un Campeón con Fracturar haga daño', effect: 'Reduce la Defensa del enemigo en 1 permanente.', rarity: 'Poco Común', keywords: ['Fracturar'] },
  { name: 'Escudo de la Luz', condicion: 'Cuando un Campeón de tipo Céleste sea atacado', effect: 'Reduce el daño a 0.', rarity: 'Rara', element: 'Luz' },
  { name: 'Manto Oscuro', condicion: 'Cuando un Campeón de tipo Espectro sea atacado', effect: 'Niega el ataque.', rarity: 'Rara', element: 'Tinieblas' },
  { name: 'Garras de la Bestia', condicion: 'Cuando un Campeón de tipo Bestia destruya un Campeón', effect: 'Roba 1 carta.', rarity: 'Épica', element: 'Tierra' },
  { name: 'Aliento de Dragón', condicion: 'Cuando un Campeón de tipo Dragón ataque', effect: 'Haz 2 de daño a todos los Campeones enemigos.', rarity: 'Épica', element: 'Fuego' },
  { name: 'Escudo del Guerrero', condicion: 'Cuando un Campeón de tipo Guerrero sea atacado', effect: 'Gana +3 Defensa y contraataca con 1 de daño.', rarity: 'Poco Común' },
]

// ────────────────────────────────────────────────────────────────
// Build & Write
// ────────────────────────────────────────────────────────────────

console.log('\n📦 Generando semillas — Set "El Despertar del Éter" (285 cartas)\n')

const misticas = MISTICAS_DATA.map((d) =>
  card({
    name: d.name,
    type: 'Mística',
    rarity: d.rarity,
    element: d.element,
    stats: { cost: d.cost, poder: 0, resistencia: 0 },
    efecto: d.effect,
  }),
)

const tacticas = TACTICAS_DATA.map((d) =>
  card({
    name: d.name,
    type: 'Táctica',
    rarity: d.rarity,
    element: (d as any).element,
    keywords: d.keywords ?? [],
    stats: { cost: 0, duracion: 0 },
    descripcion: `${d.condicion}: ${d.effect}`,
  }),
)

const arcanas = ARCANAS_DATA.map((d) =>
  card({
    name: d.name,
    type: 'Arcana',
    rarity: d.rarity,
    element: d.element,
    keywords: (d as any).keywords ?? [],
    stats: { cost: d.cost },
    condicion: d.condicion,
    recompensa: d.effect,
  }),
)

const combate = COMBATE_DATA.map((d) =>
  card({
    name: d.name,
    type: 'Combate',
    rarity: d.rarity,
    element: (d as any).element,
    keywords: d.keywords ?? [],
    stats: { cost: 0 },
    descripcion: `${d.condicion}: ${d.effect}`,
  }),
)

try {
  // Limpiar seed/ anterior
  if (fs.existsSync(SEED_DIR)) {
    for (const f of fs.readdirSync(SEED_DIR)) {
      fs.unlinkSync(path.join(SEED_DIR, f))
    }
  }

  writeSeed('eter.json', eterCards)
  writeSeed('campeones.json', campeones)
  writeSeed('misticas.json', misticas)
  writeSeed('tacticas.json', tacticas)
  writeSeed('arcanas.json', arcanas)
  writeSeed('combate.json', combate)

  const todas = [...eterCards, ...campeones, ...misticas, ...tacticas, ...arcanas, ...combate]
  writeSeed('coleccion-completa.json', todas)

  console.log(`\n✅ Total: ${todas.length} cartas generadas en seed/`)
  console.log(`   ${eterCards.length} Éter · ${campeones.length} Campeones · ${misticas.length} Místicas · ${tacticas.length} Tácticas · ${arcanas.length} Arcanas · ${combate.length} Combate\n`)
} catch (err) {
  console.error('Error:', err)
  process.exit(1)
}
