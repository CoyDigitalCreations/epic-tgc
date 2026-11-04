/**
 * sync-forge-to-engine — Sincroniza un export de Éter Forge hacia la fuente
 * del runtime del motor, derivada de FuenteArte: seed/FuenteEfectos.json
 *
 * Uso:
 *   npx tsx scripts/sync-forge-to-engine.ts <export.json> [opciones]
 *
 * Opciones:
 *   --dry-run   Muestra qué cambiaría SIN escribir el JSON del motor
 *   --prune     Elimina del motor las cartas que NO están en el export
 *               (por defecto se conservan; cuidado con sets oficiales)
 *
 * Flujo recomendado:
 *   1. En Éter Forge: 📄 Exportar cartas (sin arte)
 *   2. npx tsx scripts/sync-forge-to-engine.ts mi-export.json --dry-run
 *   3. Revisar el reporte; si está bien, quitar --dry-run
 *   4. npx vitest run src/shared/data/paquetes.test.ts
 *   5. git add seed/FuenteEfectos.json && git commit
 *
 * Notas:
 * - Acepta exports CON arte (base64) o SIN arte: el base64 se descarta.
 * - Merge por ID: existentes se actualizan (el export gana), nuevos se agregan.
 * - Los campos extra del Forge (variantePago, etc.) se conservan tal cual —
 *   el motor los ignora si no los conoce.
 * - Convención de debuffs: magnitudes POSITIVAS (el script avisa si ve negativos).
 * - La lógica pura (validación, limpieza, diff, merge) vive en scripts/lib/fuentes.ts;
 *   este archivo ejecuta main() al importarse, así que nadie lo importa en los tests.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { derivarEfectos, type Json } from './lib/fuentes'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ENGINE_PATH = resolve(__dirname, '../seed/FuenteEfectos.json')

/* ── CLI ── */

function parseArgs(argv: string[]) {
  const args = argv.slice(2)
  const flags = new Set(args.filter((a) => a.startsWith('--')))
  const positional = args.filter((a) => !a.startsWith('--'))
  return {
    inputPath: positional[0],
    dryRun: flags.has('--dry-run'),
    prune: flags.has('--prune'),
  }
}

function usage(): never {
  console.log(`
Uso: npx tsx scripts/sync-forge-to-engine.ts <export.json> [--dry-run] [--prune]

  <export.json>   JSON exportado desde Éter Forge (con o sin arte)
  --dry-run       Solo muestra el reporte; no escribe FuenteEfectos.json
  --prune         Elimina cartas del motor que no estén en el export

Ejemplo:
  npx tsx scripts/sync-forge-to-engine.ts ~/Downloads/mi-coleccion.json --dry-run
`)
  process.exit(1)
}

/* ── Main ── */

function main(): void {
  const { inputPath, dryRun, prune } = parseArgs(process.argv)
  if (!inputPath) usage()

  const inputAbs = resolve(process.cwd(), inputPath!)
  console.log('─'.repeat(72))
  console.log('SYNC FORGE → ENGINE')
  console.log(`Export:  ${inputAbs}`)
  console.log(`Motor:   ${ENGINE_PATH}`)
  console.log(`Modo:    ${dryRun ? 'DRY-RUN (no escribe)' : 'ESCRIBIR'}${prune ? ' + PRUNE' : ''}`)
  console.log('─'.repeat(72))

  // 1. Leer export
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(inputAbs, 'utf8'))
  } catch (err) {
    console.error(`\n❌ No se pudo leer/parsear el JSON: ${(err as Error).message}`)
    process.exit(1)
  }
  if (!Array.isArray(raw)) {
    console.error('\n❌ El export debe ser un ARRAY de cartas ([{...}, {...}])')
    process.exit(1)
  }

  // Además del arte, se quitan los campos escondidos de OTROS efectos (p. ej. el copyAttributes que quedó en Thane): un export
  // hecho antes de que el Card-Maker los limpiara no debe reintroducirlos en el seed (ver derivarCarta)
  console.log(`\nCartas en el export: ${(raw as Json[]).length}`)

  // 2. Validar (no depende del motor: se hace antes de leerlo)
  const validacion = derivarEfectos(raw as Json[], [], { prune })

  if (validacion.errores.length > 0 || validacion.duplicados.length > 0) {
    console.log('\n❌ ERRORES DE VALIDACIÓN:')
    for (const d of validacion.errores) {
      console.log(`  ${d.cardId}:`)
      for (const e of d.errores) console.log(`    - ${e}`)
    }
    for (const [id, n] of validacion.duplicados) {
      console.log(`  ID duplicado en el export: ${id} (×${n})`)
    }
    console.error('\nCorrige el export antes de sincronizar. Abortando.')
    process.exit(1)
  }

  if (validacion.avisos.length > 0) {
    console.log('\n⚠️  AVISOS (no bloquean):')
    for (const d of validacion.avisos) {
      console.log(`  ${d.cardId}:`)
      for (const a of d.avisos) console.log(`    - ${a}`)
    }
  }

  // 3. Cargar motor actual
  let engineCards: Json[]
  try {
    engineCards = JSON.parse(readFileSync(ENGINE_PATH, 'utf8')) as Json[]
  } catch {
    console.error(`\n❌ No se pudo leer ${ENGINE_PATH}`)
    process.exit(1)
  }

  // 4. Diff + 5. Resultado
  const plan = derivarEfectos(raw as Json[], engineCards, { prune })
  const { nuevos, actualizados, sinCambios, soloMotor } = plan
  const resultado = plan.resultado!

  console.log('\n─'.repeat(72))
  console.log('DIFF vs motor actual')
  console.log('─'.repeat(72))
  console.log(`  🆕 Nuevas en motor:     ${nuevos.length}${nuevos.length ? ` → ${nuevos.join(', ')}` : ''}`)
  console.log(`  ✏️  Actualizadas:        ${actualizados.length}${actualizados.length ? ` → ${actualizados.join(', ')}` : ''}`)
  console.log(`  =  Sin cambios:         ${sinCambios.length}`)
  console.log(`  🗑️  Solo en motor:       ${soloMotor.length}${soloMotor.length ? ` → ${soloMotor.join(', ')}` : ''}${prune ? ' (SE ELIMINAN)' : ' (se conservan)'}`)

  if (dryRun) {
    console.log('\n🔎 DRY-RUN: no se escribió nada.')
    console.log('   Si el reporte se ve bien, corre sin --dry-run.')
    return
  }

  // 6. Escribir
  const json = JSON.stringify(resultado, null, 2) + '\n'
  writeFileSync(ENGINE_PATH, json, 'utf8')
  console.log(`\n✅ Escrito: ${ENGINE_PATH}`)
  console.log(`   Total cartas en motor: ${resultado.length}`)

  console.log('\n─'.repeat(72))
  console.log('SIGUIENTE PASO (verificación):')
  console.log('─'.repeat(72))
  console.log('  npx vitest run src/shared/data/paquetes.test.ts')
  console.log('  npx vitest run src/online/game/__tests__/coverage-map.test.ts')
  console.log('  npx tsx scripts/coverage-map.ts   # regenera docs/coverage-map.md')
  console.log('')
  console.log('  Si los tests pasan: git add seed/FuenteEfectos.json && git commit')
}

main()
