/**
 * sync-forge-to-engine — Sincroniza un export de Éter Forge hacia la fuente
 * de verdad del motor: seed/PrimerColeccionEfectos.json
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
 *   5. git add seed/PrimerColeccionEfectos.json && git commit
 *
 * Notas:
 * - Acepta exports CON arte (base64) o SIN arte: el base64 se descarta.
 * - Merge por ID: existentes se actualizan (el export gana), nuevos se agregan.
 * - Los campos extra del Forge (variantePago, etc.) se conservan tal cual —
 *   el motor los ignora si no los conoce.
 * - Convención de debuffs: magnitudes POSITIVAS (el script avisa si ve negativos).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ENGINE_PATH = resolve(__dirname, '../seed/PrimerColeccionEfectos.json')

const CARD_TYPES = new Set(['Campeón', 'Mística', 'Arcana', 'Éter', 'Vínculo'])
const EFECTO_TIPOS = new Set([
  'pasivo', 'disparo', 'continuo', 'comandante', 'reserva', 'pago', 'bloqueo', 'hechizo', 'vinculo',
])
const EFECTO_ACCIONES = new Set([
  'buff', 'debuff', 'destroy', 'exile', 'return_hand',
  'draw', 'steal_champion', 'steal_ether', 'block_ether',
  'free_ether', 'return_ether', 'toggle_exhaust', 'prevent_destroy',
  'scry', 'tutor', 'copy', 'redirect',
  'double_attack', 'direct_attack', 'change_type', 'grant_keyword',
  'recuperar_campo', 'recuperar_mano', 'recuperar_mazo',
  'recuperar_mazo_barajar', 'recuperar_mazo_top', 'recuperar_mazo_bottom',
  'recuperar_exilio',
  'invocar', 'invocar_y_equipar',
  'mover', 'negar', 'rival_discard',
])

type Json = Record<string, unknown>

interface Diagnostico {
  cardId: string
  errores: string[]
  avisos: string[]
}

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
  --dry-run       Solo muestra el reporte; no escribe PrimerColeccionEfectos.json
  --prune         Elimina cartas del motor que no estén en el export

Ejemplo:
  npx tsx scripts/sync-forge-to-engine.ts ~/Downloads/mi-coleccion.json --dry-run
`)
  process.exit(1)
}

/* ── Limpieza ── */

/** Descarta arte embebido (base64) y flags de imagen. Rutas estáticas /cartas/*.png se conservan. */
function sinArte(card: Json): Json {
  const out: Json = { ...card }
  const imageUrl = out.imageUrl
  if (typeof imageUrl === 'string' && imageUrl.startsWith('data:')) {
    delete out.imageUrl
  }
  // hasImage solo aplica a IndexedDB local del Forge — el motor usa public/cartas/
  delete out.hasImage
  return out
}

/** Normaliza para comparar: ordena keys recursivamente. */
function canon(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canon).join(',')}]`
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Json)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canon(v)}`)
    return `{${entries.join(',')}}`
  }
  return JSON.stringify(value) ?? 'undefined'
}

/* ── Validación ── */

function validarEfecto(cardId: string, efecto: Json, idx: number, diag: Diagnostico): void {
  const label = `efectos[${idx}]`
  const tipo = efecto.tipo
  if (typeof tipo !== 'string' || !EFECTO_TIPOS.has(tipo)) {
    diag.errores.push(`${label}.tipo inválido: ${JSON.stringify(tipo)} (esperado: pasivo|disparo|continuo|...)`)
  }
  const accion = efecto.efecto
  if (accion != null && (typeof accion !== 'string' || !EFECTO_ACCIONES.has(accion))) {
    diag.errores.push(`${label}.efecto inválido: ${JSON.stringify(accion)} — no está en EfectoAccion vivo`)
  }
  if (efecto.objetivo != null) {
    const obj = efecto.objetivo as Json
    if (typeof obj.tipo !== 'string') {
      diag.errores.push(`${label}.objetivo.tipo falta o no es string`)
    }
    if (typeof obj.controlador !== 'string') {
      diag.avisos.push(`${label}.objetivo.controlador falta (el motor defaultea)`)
    }
  }
  if (efecto.costo != null) {
    const costo = efecto.costo as Json
    const ct = costo.tipo
    const costosOk = new Set(['ninguno', 'eter', 'eter_bloqueado', 'bloqueo_fijo', 'exhaust', 'exile_self', 'cemetery_self'])
    if (ct == null) {
      // Dato Card-Maker histórico (p.ej. FB-024 costo:{cantidad:1} sin tipo) — el motor lo tolera
      diag.avisos.push(`${label}.costo sin tipo — el motor no lo trata como eter_bloqueado/bloqueo_fijo; preferible completar tipo`)
    } else if (typeof ct !== 'string' || !costosOk.has(ct)) {
      diag.errores.push(`${label}.costo.tipo inválido: ${JSON.stringify(ct)}`)
    }
  }
  // Convención de signos: debuffs con magnitudes negativas
  if (accion === 'debuff' && efecto.stats && typeof efecto.stats === 'object') {
    const stats = efecto.stats as Json
    const atq = stats.ATQ
    const res = stats.RES
    if (typeof atq === 'number' && atq < 0) {
      diag.avisos.push(`${label}: debuff con ATQ negativo (${atq}) — convención del motor: magnitud positiva (ATQ: ${Math.abs(atq)})`)
    }
    if (typeof res === 'number' && res < 0) {
      diag.avisos.push(`${label}: debuff con RES negativo (${res}) — convención: magnitud positiva`)
    }
  }
}

function validarCarta(card: Json, idx: number): Diagnostico {
  const id = typeof card.id === 'string' ? card.id : `#idx-${idx}`
  const diag: Diagnostico = { cardId: id, errores: [], avisos: [] }

  if (typeof card.id !== 'string' || !card.id.trim()) {
    diag.errores.push('id falta o no es string')
  } else if (!/^[A-Za-z0-9_-]+$/.test(card.id)) {
    diag.avisos.push(`id "${card.id}" tiene caracteres raros (preferido: FB-001, DS-001, o slug sin espacios)`)
  }

  if (typeof card.name !== 'string' || !card.name.trim()) {
    diag.errores.push('name falta o vacío')
  }

  if (typeof card.type !== 'string' || !CARD_TYPES.has(card.type)) {
    diag.errores.push(`type inválido: ${JSON.stringify(card.type)} (esperado: Campeón|Mística|Arcana|Éter|Vínculo)`)
  }

  if (!card.stats || typeof card.stats !== 'object') {
    diag.errores.push('stats falta o no es objeto')
  } else {
    const stats = card.stats as Json
    if (typeof stats.cost !== 'number') {
      diag.avisos.push('stats.cost no es number (el motor lo lee para coste/Éter)')
    }
    if (card.type === 'Campeón') {
      if (typeof stats.poder !== 'number') diag.avisos.push('Campeón sin stats.poder')
      if (typeof stats.resistencia !== 'number') diag.avisos.push('Campeón sin stats.resistencia')
    }
  }

  if (typeof card.paqueteId !== 'string' || !card.paqueteId) {
    diag.avisos.push('paqueteId falta — la carta no aparecerá en ESTASIS_CARDS/DISONANCIA_CARDS')
  }

  if (card.efectos != null) {
    if (!Array.isArray(card.efectos)) {
      diag.errores.push('efectos no es array')
    } else {
      card.efectos.forEach((e, i) => {
        if (e && typeof e === 'object') validarEfecto(id, e as Json, i, diag)
        else diag.errores.push(`efectos[${i}] no es objeto`)
      })
    }
  } else if (card.type !== 'Éter' && card.type !== 'Vínculo') {
    // Éter/Vínculo pueden tener efectos; Campeón/Mística/Arcana casi siempre
    diag.avisos.push('sin efectos[] — la carta no hará nada en el motor salvo stats básicas')
  }

  if (card.type === 'Arcana' && card.condicion != null) {
    const cond = card.condicion as Json
    if (typeof cond !== 'object' || typeof cond.trigger !== 'string') {
      diag.errores.push('condicion debe ser objeto con trigger (string)')
    }
  }

  // Campos legacy que NO deberían viajar
  for (const legacy of ['efectoPasivo', 'efectoDisparo', 'efectoContinuo', 'efectoReserva', 'efectoPago', 'efectoBloqueo']) {
    if (legacy in card) {
      diag.avisos.push(`campo legacy "${legacy}" presente — el motor lo ignora; preferible limpiarlo`)
    }
  }

  return diag
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

  const exportCards = (raw as Json[]).map(sinArte)
  console.log(`\nCartas en el export: ${exportCards.length}`)

  // 2. Validar
  const diagnosticos = exportCards.map((c, i) => validarCarta(c, i))
  const conErrores = diagnosticos.filter((d) => d.errores.length > 0)
  const conAvisos = diagnosticos.filter((d) => d.avisos.length > 0)

  // IDs duplicados en el export
  const idsVistos = new Map<string, number>()
  for (const c of exportCards) {
    const id = typeof c.id === 'string' ? c.id : ''
    if (!id) continue
    idsVistos.set(id, (idsVistos.get(id) ?? 0) + 1)
  }
  const duplicados = [...idsVistos.entries()].filter(([, n]) => n > 1)

  if (conErrores.length > 0 || duplicados.length > 0) {
    console.log('\n❌ ERRORES DE VALIDACIÓN:')
    for (const d of conErrores) {
      console.log(`  ${d.cardId}:`)
      for (const e of d.errores) console.log(`    - ${e}`)
    }
    for (const [id, n] of duplicados) {
      console.log(`  ID duplicado en el export: ${id} (×${n})`)
    }
    console.error('\nCorregí el export antes de sincronizar. Abortando.')
    process.exit(1)
  }

  if (conAvisos.length > 0) {
    console.log('\n⚠️  AVISOS (no bloquean):')
    for (const d of conAvisos) {
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
  const enginePorId = new Map(engineCards.map((c) => [String(c.id), c]))
  const exportPorId = new Map(exportCards.map((c) => [String(c.id), c]))

  // 4. Diff
  const nuevos: string[] = []
  const actualizados: string[] = []
  const sinCambios: string[] = []
  for (const [id, card] of exportPorId) {
    const actual = enginePorId.get(id)
    if (!actual) {
      nuevos.push(id)
    } else if (canon(actual) !== canon(card)) {
      actualizados.push(id)
    } else {
      sinCambios.push(id)
    }
  }
  const soloMotor = [...enginePorId.keys()].filter((id) => !exportPorId.has(id))

  console.log('\n─'.repeat(72))
  console.log('DIFF vs motor actual')
  console.log('─'.repeat(72))
  console.log(`  🆕 Nuevas en motor:     ${nuevos.length}${nuevos.length ? ` → ${nuevos.join(', ')}` : ''}`)
  console.log(`  ✏️  Actualizadas:        ${actualizados.length}${actualizados.length ? ` → ${actualizados.join(', ')}` : ''}`)
  console.log(`  =  Sin cambios:         ${sinCambios.length}`)
  console.log(`  🗑️  Solo en motor:       ${soloMotor.length}${soloMotor.length ? ` → ${soloMotor.join(', ')}` : ''}${prune ? ' (SE ELIMINAN)' : ' (se conservan)'}`)

  // 5. Construir resultado
  let resultado: Json[]
  if (prune) {
    resultado = exportCards // el export es el nuevo universo completo
  } else {
    // Conservar orden del motor para las que ya existen; append nuevas al final
    const resultadoMap = new Map<string, Json>()
    for (const c of engineCards) {
      const id = String(c.id)
      if (exportPorId.has(id)) resultadoMap.set(id, exportPorId.get(id)!)
      else resultadoMap.set(id, c)
    }
    for (const [id, card] of exportPorId) {
      if (!resultadoMap.has(id)) resultadoMap.set(id, card)
    }
    resultado = [...resultadoMap.values()]
  }

  if (dryRun) {
    console.log('\n🔎 DRY-RUN: no se escribió nada.')
    console.log('   Si el reporte se ve bien, corrí sin --dry-run.')
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
  console.log('  Si los tests pasan: git add seed/PrimerColeccionEfectos.json && git commit')
}

main()
