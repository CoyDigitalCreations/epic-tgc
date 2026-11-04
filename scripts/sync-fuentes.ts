/**
 * sync-fuentes — Deriva, en un solo comando, las fuentes del runtime a partir de
 * seed/FuenteArte.json (export del Card-Maker CON arte; local, fuera de git):
 *   - seed/FuenteEfectos.json  (cartas validadas, sin arte, merge por id)
 *   - public/cartas/{id}.webp  (ilustraciones)
 *
 * Uso:
 *   npm run sync:fuentes -- [ruta/FuenteArte.json] [--dry-run] [--prune]
 *
 * Opciones:
 *   --dry-run   Muestra qué cambiaría SIN escribir nada
 *   --prune     Elimina del motor las cartas ausentes de FuenteArte y las ilustraciones obsoletas
 *
 * Flujo recomendado: primero --dry-run, revisar el reporte y luego correr sin --dry-run.
 * Valida todo antes de escribir; es idempotente (segunda corrida = «0 cambios»).
 * La lógica vive en scripts/lib/ejecutarSync.ts y scripts/lib/fuentes.ts (con pruebas).
 */
import { existsSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ejecutarSync, type IoSync } from './lib/ejecutarSync'

const __dirname = dirname(fileURLToPath(import.meta.url))

const args = process.argv.slice(2)
const flags = new Set(args.filter((a) => a.startsWith('--')))
const rutaArg = args.find((a) => !a.startsWith('--'))

const io: IoSync = {
  existe: (ruta) => existsSync(ruta),
  leerTexto: (ruta) => readFileSync(ruta, 'utf8'),
  listar: (dir) => (existsSync(dir) ? readdirSync(dir) : []),
  leerBytes: (ruta) => readFileSync(ruta),
  escribirAtomico: (ruta, contenido) => {
    mkdirSync(dirname(ruta), { recursive: true })
    const temporal = `${ruta}.tmp-${process.pid}`
    writeFileSync(temporal, contenido)
    renameSync(temporal, ruta)
  },
  borrar: (ruta) => unlinkSync(ruta),
  log: (mensaje) => console.log(mensaje),
  error: (mensaje) => console.error(mensaje),
}

const resultado = ejecutarSync(
  {
    rutaArte: rutaArg ? resolve(process.cwd(), rutaArg) : resolve(__dirname, '../seed/FuenteArte.json'),
    rutaEfectos: resolve(__dirname, '../seed/FuenteEfectos.json'),
    dirCartas: resolve(__dirname, '../public/cartas'),
    dryRun: flags.has('--dry-run'),
    prune: flags.has('--prune'),
  },
  io,
)

process.exit(resultado.codigo)
