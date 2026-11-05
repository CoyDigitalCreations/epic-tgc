/**
 * regenerar-textos — Reescribe `texto` de TODOS los efectos de las cartas del seed con `generateEffectText`
 * (efectos[] y efectoComandante, objeto o arreglo). Regla de oro: el texto nunca se escribe a mano.
 *
 * Uso:
 *   npm run regenerar:textos -- [--dry-run] [--ids=FB-001,FB-002]
 *
 * Sin `--ids` regenera TODAS las cartas; con `--ids` solo las indicadas (útil cuando el resto del seed trae deriva histórica
 * conocida que no se quiere tocar todavía: ver DERIVA_CONOCIDA en src/shared/data/textos-seed.test.ts).
 *
 * Archivos: seed/FuenteEfectos.json (siempre) y seed/FuenteArte.json (si existe en esta PC; es local, fuera de git).
 * Solo reescribe un archivo si algún texto cambia; conserva el formato (2 espacios, sin salto de línea final).
 * seed/CartasPrueba.json NO se toca (nunca se modifica); la guardia src/shared/data/textos-seed.test.ts lo verifica.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { regenerarTextos, type CartaJson } from './lib/regenerarTextos'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dryRun = process.argv.includes('--dry-run')
const idsArg = process.argv.find((a) => a.startsWith('--ids='))
const ids = idsArg ? new Set(idsArg.slice('--ids='.length).split(',').map((s) => s.trim()).filter(Boolean)) : undefined

const archivos = [resolve(__dirname, '../seed/FuenteEfectos.json'), resolve(__dirname, '../seed/FuenteArte.json')]

for (const ruta of archivos) {
  if (!existsSync(ruta)) {
    console.log(`(omitido: no existe ${ruta})`)
    continue
  }
  const original = readFileSync(ruta, 'utf8')
  const cartas = JSON.parse(original) as CartaJson[]
  const cambios = regenerarTextos(cartas, ids)
  console.log(`\n${ruta}: ${cambios.length} texto(s) por reescribir`)
  for (const c of cambios) {
    console.log(`  ${c.cardId} ${c.ruta}\n    - ${c.antes ?? '(sin texto)'}\n    + ${c.despues}`)
  }
  if (cambios.length > 0 && !dryRun) {
    writeFileSync(ruta, JSON.stringify(cartas, null, 2))
    console.log('  → escrito')
  }
}
if (dryRun) console.log('\nDRY-RUN: no se escribió nada.')
