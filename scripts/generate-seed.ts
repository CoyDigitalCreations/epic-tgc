/**
 * Genera los seeds JSON de los paquetes de cartas del proyecto.
 * Fuente de verdad: src/data/paquetes.ts (ALL_CARDS + PAQUETES).
 *
 * Uso: npm run seed
 *
 * Al agregar cartas nuevas a un set, correr este script para que
 * seed/*.json queden sincronizados (el test de integridad lo verifica).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ALL_CARDS, PAQUETES } from '../src/forge/data/paquetes.ts'

const seedDir = resolve(process.cwd(), 'seed')
mkdirSync(seedDir, { recursive: true })

const write = (fileName: string, cards: unknown[]) => {
  const path = resolve(seedDir, fileName)
  writeFileSync(path, JSON.stringify(cards, null, 2) + '\n', 'utf8')
  console.log(`✔ ${fileName} — ${cards.length} cartas`)
}

// Un archivo por paquete (mismo id que el paquete)
for (const paquete of PAQUETES) {
  const cards = ALL_CARDS.filter((c) => c.paqueteId === paquete.id)
  if (cards.length > 0) write(`${paquete.id}.json`, cards)
}

// Colección completa (todos los sets juntos)
if (ALL_CARDS.length > 0) write('coleccion-completa.json', ALL_CARDS)

console.log(`\nSeed actualizado en ${seedDir}`)
