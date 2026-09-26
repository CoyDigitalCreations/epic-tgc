/**
 * Regenera paquetes.ts desde PrimerColeccion.json (la fuente de verdad del Card Maker).
 * Uso: npx tsx scripts/regen-paquetes.ts
 *
 * Preserva la estructura de paquetes.ts (PAQUETES metadata, timestamps)
 * pero reemplaza los efectos[] de cada carta con los del seed JSON.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const seedPath = resolve(process.cwd(), 'seed', 'PrimerColeccion.json')
const outPath = resolve(process.cwd(), 'src', 'shared', 'data', 'paquetes.ts')

const cards = JSON.parse(readFileSync(seedPath, 'utf8')) as any[]

// Escape single quotes in strings for TS output
function esc(s: string): string {
  return s?.replace(/\\/g, '\\\\').replace(/'/g, "\\'") ?? ''
}

/** Serialize an EfectoData object to a compact TS literal */
function efectoToTs(e: any): string {
  const parts: string[] = []
  parts.push(`'tipo':'${e.tipo}'`)
  if (e.trigger) parts.push(`'trigger':'${e.trigger}'`)
  if (e.efecto) parts.push(`'efecto':'${e.efecto}'`)
  if (e.texto) parts.push(`'texto':'${esc(e.texto)}'`)
  if (e.keyword) parts.push(`'keyword':'${e.keyword}'`)
  if (e.cantidad !== undefined) parts.push(`'cantidad':${e.cantidad}`)
  if (e.duracion) parts.push(`'duracion':'${e.duracion}'`)
  if (e.duracionTurnos !== undefined) parts.push(`'duracionTurnos':${e.duracionTurnos}`)
  if (e.duracionFase) parts.push(`'duracionFase':'${e.duracionFase}'`)
  if (e.duracionControlador) parts.push(`'duracionControlador':'${e.duracionControlador}'`)
  if (e.sinActivarEfecto) parts.push(`'sinActivarEfecto':true`)
  if (e.buffPerBlockedEther) parts.push(`'buffPerBlockedEther':true`)
  if (e.esHasta) parts.push(`'esHasta':true`)
  if (e.zonaOrigen) parts.push(`'zonaOrigen':'${e.zonaOrigen}'`)
  if (e.stats && (e.stats.ATQ || e.stats.RES)) {
    const s: string[] = []
    if (e.stats.ATQ) s.push(`ATQ:${e.stats.ATQ}`)
    if (e.stats.RES) s.push(`RES:${e.stats.RES}`)
    parts.push(`'stats':{${s.join(',')}}`)
  }
  if (e.objetivo) {
    const o: string[] = []
    o.push(`'tipo':'${e.objetivo.tipo}'`)
    o.push(`'controlador':'${e.objetivo.controlador}'`)
    o.push(`'zona':'${e.objetivo.zona}'`)
    if (e.objetivo.zonaDestino) o.push(`'zonaDestino':'${e.objetivo.zonaDestino}'`)
    if (e.objetivo.controladorDestino) o.push(`'controladorDestino':'${e.objetivo.controladorDestino}'`)
    if (e.objetivo.filtros) {
      const f: string[] = []
      const fil = e.objetivo.filtros
      if (fil.faccion) f.push(`'faccion':'${fil.faccion}'`)
      if (fil.esencia) f.push(`'esencia':'${fil.esencia}'`)
      if (fil.rol) f.push(`'rol':'${fil.rol}'`)
      if (fil.catHabilidad) f.push(`'catHabilidad':'${fil.catHabilidad}'`)
      if (fil.costeMin !== undefined) f.push(`'costeMin':${fil.costeMin}`)
      if (fil.costeMax !== undefined) f.push(`'costeMax':${fil.costeMax}`)
      if (fil.atqMax !== undefined) f.push(`'atqMax':${fil.atqMax}`)
      if (fil.resMax !== undefined) f.push(`'resMax':${fil.resMax}`)
      if (fil.agotado !== undefined) f.push(`'agotado':${fil.agotado}`)
      if (fil.conEterBloqueado !== undefined) f.push(`'conEterBloqueado':${fil.conEterBloqueado}`)
      if (fil.puedeBloquearEter !== undefined) f.push(`'puedeBloquearEter':${fil.puedeBloquearEter}`)
      if (fil.equipado !== undefined) f.push(`'equipado':${fil.equipado}`)
      if (fil.keyword) f.push(`'keyword':'${fil.keyword}'`)
      if (fil.tipoEfectoMistica) f.push(`'tipoEfectoMistica':'${fil.tipoEfectoMistica}'`)
      if (fil.bocaArriba !== undefined) f.push(`'bocaArriba':${fil.bocaArriba}`)
      if (fil.seleccionar) f.push(`'seleccionar':{stat:'${fil.seleccionar.stat}',orden:'${fil.seleccionar.orden}'}`)
      if (f.length > 0) parts.push(`'filtros':{${f.join(',')}}`)
    }
    parts.push(`'objetivo':{${o.join(',')}}`)
  }
  if (e.costo) {
    parts.push(`'costo':{tipo:'${e.costo.tipo}'${e.costo.cantidad !== undefined ? `,cantidad:${e.costo.cantidad}` : ''}}`)
  }
  if (e.reagrupar) {
    parts.push(`'reagrupar':{fase:'${e.reagrupar.fase}',turno:'${e.reagrupar.turno}'}`)
  }
  if (e.condicion) {
    if (typeof e.condicion === 'string') {
      parts.push(`'condicion':'${esc(e.condicion)}'`)
    } else {
      // CondicionEfecto object
      const c: string[] = []
      c.push(`'trigger':'${e.condicion.trigger}'`)
      if (e.condicion.controladorTrigger) c.push(`'controladorTrigger':'${e.condicion.controladorTrigger}'`)
      if (e.condicion.condiciones) {
        const items = e.condicion.condiciones.map((ci: any) => {
          const ciParts: string[] = []
          ciParts.push(`tipo:'${ci.tipo}'`)
          if (ci.cantidad !== undefined) ciParts.push(`cantidad:${ci.cantidad}`)
          if (ci.objetivo) {
            const ciObj: string[] = []
            ciObj.push(`tipo:'${ci.objetivo.tipo}'`)
            ciObj.push(`controlador:'${ci.objetivo.controlador}'`)
            if (ci.objetivo.cantidad !== undefined) ciObj.push(`cantidad:${ci.objetivo.cantidad}`)
            ciParts.push(`objetivo:{${ciObj.join(',')}}`)
          }
          return `{${ciParts.join(',')}}`
        })
        c.push(`'condiciones':[${items.join(',')}]`)
      }
      parts.push(`'condicion':{${c.join(',')}}`)
    }
  }
  if (e.copyAttributes) {
    parts.push(`'copyAttributes':[${e.copyAttributes.map((a: string) => `'${a}'`).join(',')}]`)
  }
  if (e.tipoNegacion) parts.push(`'tipoNegacion':'${e.tipoNegacion}'`)
  if (e.controladorTrigger) parts.push(`'controladorTrigger':'${e.controladorTrigger}'`)
  if (e.triggerZona) parts.push(`'triggerZona':'${e.triggerZona}'`)

  return `{${parts.join(',')}}`
}

function cardToTs(card: any): string {
  const lines: string[] = []
  lines.push(`  {`)
  lines.push(`    id: '${card.id}',`)
  lines.push(`    name: '${esc(card.name)}',`)
  lines.push(`    type: '${card.type}',`)
  lines.push(`    rarity: '${card.rarity}',`)
  lines.push(`    keywords: [${(card.keywords || []).map((k: string) => `'${k}'`).join(', ')}],`)
  lines.push(`    flavorText: '${esc(card.flavorText || '')}',`)
  lines.push(`    paqueteId: '${card.paqueteId}',`)
  lines.push(`    limiteCopias: '${card.limiteCopias}',`)
  lines.push(`    createdAt: ${card.paqueteId === 'estasis' ? 'FB_TS' : 'C4_TS'},`)
  lines.push(`    updatedAt: ${card.paqueteId === 'estasis' ? 'FB_TS' : 'C4_TS'},`)

  // Optional taxonomy fields
  if (card.facciones?.length) {
    lines.push(`    facciones: [${card.facciones.map((f: string) => `'${f}'`).join(', ')}],`)
  }
  if (card.esencia) lines.push(`    esencia: '${card.esencia}',`)
  if (card.roles?.length) {
    lines.push(`    roles: [${card.roles.map((r: string) => `'${r}'`).join(', ')}],`)
  }
  if (card.catHabilidad) {
    if (Array.isArray(card.catHabilidad)) {
      lines.push(`    catHabilidad: [${card.catHabilidad.map((c: string) => `'${c}'`).join(', ')}],`)
    } else {
      lines.push(`    catHabilidad: '${card.catHabilidad}',`)
    }
  }

  // Stats
  const stats: string[] = []
  if (card.stats?.cost !== undefined) stats.push(`cost: ${card.stats.cost}`)
  if (card.stats?.poder !== undefined) stats.push(`poder: ${card.stats.poder}`)
  if (card.stats?.resistencia !== undefined) stats.push(`resistencia: ${card.stats.resistencia}`)
  lines.push(`    stats: { ${stats.join(', ')} },`)

  // Optional fields
  if (card.variantePago) lines.push(`    variantePago: '${card.variantePago}',`)
  if (card.disparoAgota) lines.push(`    disparoAgota: true,`)
  if (card.disparoUnSoloUso) lines.push(`    disparoUnSoloUso: true,`)
  if (card.variante) lines.push(`    variante: '${card.variante}',`)
  if (card.comentario) lines.push(`    comentario: '${esc(card.comentario)}',`)

  // EfectoComandante (special field on some champions)
  if (card.efectoComandante) {
    lines.push(`    efectoComandante: ${efectoToTs(card.efectoComandante)},`)
  }

  // Condicion (for Arcanas)
  if (card.condicion) {
    if (typeof card.condicion === 'string') {
      lines.push(`    condicion: '${esc(card.condicion)}',`)
    } else {
      // Serialize CondicionEfecto object
      const cParts: string[] = []
      cParts.push(`trigger: '${card.condicion.trigger}'`)
      if (card.condicion.controladorTrigger) cParts.push(`controladorTrigger: '${card.condicion.controladorTrigger}'`)
      if (card.condicion.condiciones) {
        const items = card.condicion.condiciones.map((ci: any) => {
          const ciParts: string[] = []
          ciParts.push(`tipo: '${ci.tipo}'`)
          if (ci.cantidad !== undefined) ciParts.push(`cantidad: ${ci.cantidad}`)
          if (ci.objetivo) {
            const ciObj: string[] = []
            ciObj.push(`tipo: '${ci.objetivo.tipo}'`)
            ciObj.push(`controlador: '${ci.objetivo.controlador}'`)
            if (ci.objetivo.cantidad !== undefined) ciObj.push(`cantidad: ${ci.objetivo.cantidad}`)
            ciParts.push(`objetivo: { ${ciObj.join(', ')} }`)
          }
          return `{ ${ciParts.join(', ')} }`
        })
        cParts.push(`condiciones: [${items.join(', ')}]`)
      }
      lines.push(`    condicion: { ${cParts.join(', ')} },`)
    }
  }

  // Recompensa (for Arcanas)
  if (card.recompensa) lines.push(`    recompensa: '${esc(card.recompensa)}',`)

  // THE IMPORTANT PART: efectos[] array from seed
  if (card.efectos && card.efectos.length > 0) {
    const efectosStr = card.efectos.map((e: any) => efectoToTs(e)).join(', ')
    lines.push(`    efectos: [${efectosStr}],`)
  }

  lines.push(`  },`)
  return lines.join('\n')
}

// Split by package
const estasis = cards.filter((c: any) => c.paqueteId === 'estasis')
const disonancia = cards.filter((c: any) => c.paqueteId === 'disonancia')

// Read ORIGINAL paquetes.ts from git to preserve PAQUETES metadata (not the potentially-corrupted output file)
import { execSync } from 'node:child_process'
const currentPaquetes = execSync(`git show HEAD:src/shared/data/paquetes.ts`, { cwd: process.cwd(), encoding: 'utf8' })
const paquetesEndMarker = 'export const getPaquete'
const paquetesEndIdx = currentPaquetes.indexOf(paquetesEndMarker)
const paquetesHeader = currentPaquetes.substring(0, paquetesEndIdx).trimEnd()

// Find the timestamp constants
const tsMatch = currentPaquetes.match(/const (FB_TS|C4_TS) = .+/g) || []
const tsBlock = tsMatch.join('\n')

// Build output — preserve everything up to and including `export const getPaquete`
let output = paquetesHeader + '\n'
output += `export const getPaquete = (id?: string) => PAQUETES.find((p) => p.id === id)\n\n`
output += tsBlock + '\n\n'

output += `/* ─────────────────────────────────────────────\n`
output += `   Mazo Estásis (entrega Primogénitos) — ${estasis.length} diseños\n`
output += `   (15 Éter + 45 Principal + 6 Vínculos)\n`
output += `   Todas las cartas son de la facción Orden.\n`
output += `   ───────────────────────────────────────────── */\n\n`

output += `export const ESTASIS_CARDS: AnyCard[] = [\n`
for (const card of estasis) {
  output += cardToTs(card) + '\n'
}
output += `]\n\n`

output += `/* ─────────────────────────────────────────────\n`
output += `   Mazo Disonancia (entrega Primogénitos) — ${disonancia.length} diseños\n`
output += `   (15 Éter + 45 Principal + 6 Vínculos)\n`
output += `   Todas las cartas son de la facción Caos.\n`
output += `   ───────────────────────────────────────────── */\n\n`

output += `export const DISONANCIA_CARDS: AnyCard[] = [\n`
for (const card of disonancia) {
  output += cardToTs(card) + '\n'
}
output += `]\n\n`

output += `export const ALL_CARDS: AnyCard[] = [...ESTASIS_CARDS, ...DISONANCIA_CARDS]\n`
output += `export const getCardById = (id?: string) => ALL_CARDS.find((c) => c.id === id)\n\n`

// ── Helper functions (preserved from original) ──
output += `/** Distribución de copias por tipo de carta (para tests e integridad) */\n`
output += `export const distribucionDe = (cards: AnyCard[]) => {\n`
output += `  const eter = cards.filter((c) => c.type === 'Éter')\n`
output += `  const vinculos = cards.filter((c) => c.type === 'Vínculo')\n`
output += `  const principal = cards.filter(\n`
output += `    (c) => c.type !== 'Éter' && c.type !== 'Vínculo',\n`
output += `  )\n`
output += `  const copias = (cs: AnyCard[]) =>\n`
output += `    cs.reduce((acc, c) => acc + Number(c.limiteCopias ?? 1), 0)\n`
output += `  return {\n`
output += `    eter: copias(eter),\n`
output += `    principal: copias(principal),\n`
output += `    vinculos: copias(vinculos),\n`
output += `    total: copias(cards),\n`
output += `  }\n`
output += `}\n\n`

output += `/** Distribución del paquete Estásis por tipo de carta */\n`
output += `export const estasisDistribucion = () => distribucionDe(ESTASIS_CARDS)\n\n`

output += `/** Distribución del paquete Disonancia por tipo de carta */\n`
output += `export const disonanciaDistribucion = () => distribucionDe(DISONANCIA_CARDS)\n\n`

output += `/* ─────────────────────────────────────────────\n`
output += `   Progreso de colección por paquete\n`
output += `   La colección guarda 1 carta por diseño con limiteCopias (×N),\n`
output += `   así que "coleccionadas" suma copias, no diseños únicos.\n`
output += `   ───────────────────────────────────────────── */\n\n`

output += `export interface ProgresoPaquete {\n`
output += `  paqueteId: string\n`
output += `  coleccionadas: number\n`
output += `  total: number\n`
output += `  completo: boolean\n`
output += `}\n\n`

output += `/** Progreso de un paquete en la colección actual (copias / total de copias) */\n`
output += `export function progresoPaquete(\n`
output += `  cards: AnyCard[],\n`
output += `  paqueteId: string,\n`
output += `): ProgresoPaquete | null {\n`
output += `  const paquete = getPaquete(paqueteId)\n`
output += `  if (!paquete) return null\n`
output += `  const { eter, principal, vinculos } = paquete.distribucion\n`
output += `  const total = eter + principal + vinculos\n`
output += `  const coleccionadas = cards\n`
output += `    .filter((c) => c.paqueteId === paqueteId)\n`
output += `    .reduce((acc, c) => acc + Number(c.limiteCopias ?? 1), 0)\n`
output += `  return {\n`
output += `    paqueteId,\n`
output += `    coleccionadas,\n`
output += `    total,\n`
output += `    completo: coleccionadas >= total,\n`
output += `  }\n`
output += `}\n\n`

// ── Arte versionado ──
output += `/* ─────────────────────────────────────────────\n`
output += `   Arte versionado — convención automática.\n`
output += `   Los PNGs viven en public/cartas/{cardId}.png.\n`
output += `   ───────────────────────────────────────────── */\n\n`

output += `export const CARD_ART_IDS: ReadonlySet<string> = new Set([\n`
output += `  ...ESTASIS_CARDS.map((c) => c.id),\n`
output += `  ...DISONANCIA_CARDS.map((c) => c.id),\n`
output += `])\n\n`

output += `/** Ruta del arte oficial de una carta, o undefined si no tiene */\n`
output += `export function cardArtPath(cardId: string | undefined): string | undefined {\n`
output += `  if (!cardId || !CARD_ART_IDS.has(cardId)) return undefined\n`
output += `  return \`/cartas/\${cardId}.png\`\n`
output += `}\n`

writeFileSync(outPath, output)
console.log(`✅ Regenerated paquetes.ts from PrimerColeccion.json`)
console.log(`   Estasis: ${estasis.length} cards, Disonancia: ${disonancia.length} cards`)
console.log(`   Total: ${cards.length} cards`)
console.log(`   Output: ${outPath}`)
