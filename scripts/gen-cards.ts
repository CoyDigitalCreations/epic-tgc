/**
 * Genera el código TypeScript de las cartas desde el seed export.
 * Uso: npx tsx scripts/gen-cards.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const cleanPath = resolve(process.cwd(), 'seed', 'EstasisDisonancia-clean.json')
const cards = JSON.parse(readFileSync(cleanPath, 'utf8')) as any[]

// Escape single quotes in strings
function esc(s: string): string {
  return s?.replace(/'/g, "\\'") ?? ''
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
  
  if (card.facciones?.length) {
    lines.push(`    facciones: [${card.facciones.map((f: string) => `'${f}'`).join(', ')}],`)
  }
  if (card.esencia) lines.push(`    esencia: '${card.esencia}',`)
  if (card.roles?.length) lines.push(`    roles: [${card.roles.map((r: string) => `'${r}'`).join(', ')}],`)
  if (card.catHabilidad) lines.push(`    catHabilidad: '${card.catHabilidad}',`)
  
  // Stats
  const stats: string[] = []
  if (card.stats?.cost !== undefined) stats.push(`cost: ${card.stats.cost}`)
  if (card.stats?.poder !== undefined) stats.push(`poder: ${card.stats.poder}`)
  if (card.stats?.resistencia !== undefined) stats.push(`resistencia: ${card.stats.resistencia}`)
  lines.push(`    stats: { ${stats.join(', ')} },`)
  
  // Effect fields (in order of priority)
  const effectFields = [
    'efectoPasivo', 'efectoContinuo', 'efectoDisparo', 'efectoReserva',
    'efectoPago', 'efectoBloqueo', 'efecto', 'variantePago',
    'disparoAgota', 'disparoUnSoloUso',
  ]
  
  for (const field of effectFields) {
    const val = card[field]
    if (val === undefined || val === null || val === '') continue
    if (typeof val === 'boolean') {
      lines.push(`    ${field}: ${val},`)
    } else {
      lines.push(`    ${field}: '${esc(val)}',`)
    }
  }
  
  lines.push(`  },`)
  return lines.join('\n')
}

// Split by package
const estasis = cards.filter(c => c.paqueteId === 'estasis')
const disonancia = cards.filter(c => c.paqueteId === 'disonancia')

// Generate TypeScript
let output = `/**\n * Cartas actualizadas desde EstasisDisonancia.json\n * Generado automáticamente — NO EDITAR A MANO\n */\n\n`

output += `// ═══════════════ ESTASIS (${estasis.length} cartas) ═══════════════\n`
for (const card of estasis) {
  output += cardToTs(card) + '\n'
}

output += `\n// ═══════════════ DISONANCIA (${disonancia.length} cartas) ═══════════════\n`
for (const card of disonancia) {
  output += cardToTs(card) + '\n'
}

const outPath = resolve(process.cwd(), 'src', 'shared', 'data', 'cards-updated.ts')
writeFileSync(outPath, output)
console.log(`Generated ${cards.length} cards → ${outPath}`)
console.log(`Estasis: ${estasis.length}, Disonancia: ${disonancia.length}`)
