/**
 * Orquestación de sync:fuentes con el I/O inyectado (testeable con un fs simulado).
 *
 * FuenteArte.json → (derivarEfectos) seed/FuenteEfectos.json + (planArte) public/cartas/{id}.webp
 * Valida TODO antes de escribir; si algo falla no se escribe nada.
 */
import { Buffer } from 'node:buffer'
import { derivarEfectos, planArte, type Json } from './fuentes'

export interface OpcionesSync {
  /** seed/FuenteArte.json */
  rutaArte: string
  /** seed/FuenteEfectos.json */
  rutaEfectos: string
  /** public/cartas */
  dirCartas: string
  dryRun: boolean
  prune: boolean
}

export interface IoSync {
  existe(ruta: string): boolean
  leerTexto(ruta: string): string
  /** Nombres de archivo del directorio ([] si no existe). */
  listar(dir: string): string[]
  leerBytes(ruta: string): Buffer
  /** Escritura atómica (archivo temporal + rename). */
  escribirAtomico(ruta: string, contenido: string | Buffer): void
  borrar(ruta: string): void
  log(mensaje: string): void
  error(mensaje: string): void
}

export interface ResultadoSync {
  codigo: number
  /** Cambios detectados (cartas, ilustraciones, borrados y reescritura del JSON). */
  cambios: number
  escrituras: number
  borrados: number
}

const REGLA = '─'.repeat(72)
const EXT_ARTE = /\.(png|jpg|webp)$/

function fallo(io: IoSync, mensaje: string): ResultadoSync {
  io.error(mensaje)
  return { codigo: 1, cambios: 0, escrituras: 0, borrados: 0 }
}

function unir(dir: string, archivo: string): string {
  return `${dir}/${archivo}`
}

function lista(ids: string[]): string {
  return ids.length ? ` → ${ids.join(', ')}` : ''
}

export function ejecutarSync(opts: OpcionesSync, io: IoSync): ResultadoSync {
  const { rutaArte, rutaEfectos, dirCartas, dryRun, prune } = opts
  io.log(REGLA)
  io.log('SYNC FUENTES — FuenteArte.json → FuenteEfectos.json + public/cartas')
  io.log(`Fuente:  ${rutaArte}`)
  io.log(`Motor:   ${rutaEfectos}`)
  io.log(`Arte:    ${dirCartas}`)
  io.log(`Modo:    ${dryRun ? 'DRY-RUN (no escribe)' : 'ESCRIBIR'}${prune ? ' + PRUNE' : ''}`)
  io.log(REGLA)

  // 1. Leer FuenteArte (local, fuera de git: puede no existir)
  if (!io.existe(rutaArte)) {
    return fallo(io, `\n❌ FuenteArte.json no está disponible: ${rutaArte}\n   Expórtalo desde el Card-Maker (colección con arte) y colócalo ahí.`)
  }
  let cartas: unknown
  try {
    cartas = JSON.parse(io.leerTexto(rutaArte))
  } catch (err) {
    return fallo(io, `\n❌ No se pudo leer/parsear el JSON: ${(err as Error).message}`)
  }
  if (!Array.isArray(cartas)) {
    return fallo(io, '\n❌ FuenteArte.json debe ser un ARRAY de cartas ([{...}, {...}])')
  }
  const exportCards = cartas as Json[]
  io.log(`\nCartas en FuenteArte: ${exportCards.length}`)

  // 2. Leer el motor actual
  let textoActual: string
  let motor: Json[]
  try {
    textoActual = io.leerTexto(rutaEfectos)
    motor = JSON.parse(textoActual) as Json[]
  } catch {
    return fallo(io, `\n❌ No se pudo leer ${rutaEfectos}`)
  }

  // 3. Planes (puros) y arte existente
  const efectos = derivarEfectos(exportCards, motor, { prune })
  const existentes = new Map<string, Buffer>()
  for (const archivo of io.listar(dirCartas)) {
    if (EXT_ARTE.test(archivo)) existentes.set(archivo, io.leerBytes(unir(dirCartas, archivo)))
  }
  const arte = planArte(exportCards, existentes, { prune })

  // 4. Validar TODO antes de escribir
  if (efectos.errores.length > 0 || efectos.duplicados.length > 0 || arte.errores.length > 0) {
    io.error('\n❌ ERRORES DE VALIDACIÓN:')
    for (const d of efectos.errores) {
      io.error(`  ${d.cardId}:`)
      for (const e of d.errores) io.error(`    - ${e}`)
    }
    for (const [id, n] of efectos.duplicados) io.error(`  ID duplicado en el export: ${id} (×${n})`)
    for (const e of arte.errores) io.error(`  ${e}`)
    return fallo(io, '\nCorrige FuenteArte.json antes de sincronizar. Abortando sin escribir nada.')
  }
  if (efectos.avisos.length > 0) {
    io.log('\n⚠️  AVISOS (no bloquean):')
    for (const d of efectos.avisos) {
      io.log(`  ${d.cardId}:`)
      for (const a of d.avisos) io.log(`    - ${a}`)
    }
  }
  if (arte.sinImagen.length > 0) {
    io.log(`\n⚠️  Sin arte en data-URI (no generan archivo): ${arte.sinImagen.join(', ')}`)
  }

  const textoNuevo = JSON.stringify(efectos.resultado, null, 2) + '\n'
  // El salto de línea final no cuenta como cambio (el seed vigente no lo trae)
  const jsonCambia = textoNuevo.trimEnd() !== textoActual.trimEnd()

  // 5. Reporte
  io.log(`\n${REGLA}`)
  io.log('DIFF vs motor actual')
  io.log(REGLA)
  io.log(`  🆕 Nuevas en motor:     ${efectos.nuevos.length}${lista(efectos.nuevos)}`)
  io.log(`  ✏️  Actualizadas:        ${efectos.actualizados.length}${lista(efectos.actualizados)}`)
  io.log(`  =  Sin cambios:         ${efectos.sinCambios.length}`)
  io.log(`  🗑️  Solo en motor:       ${efectos.soloMotor.length}${lista(efectos.soloMotor)}${prune ? ' (SE ELIMINAN)' : ' (se conservan)'}`)
  io.log(`  Ilustraciones por escribir: ${arte.escribir.length}${lista(arte.escribir.map((e) => e.archivo))}`)
  io.log(`  Ilustraciones sin cambios:  ${arte.iguales.length}`)
  io.log(`  Ilustraciones obsoletas:    ${arte.obsoletos.length}${lista(arte.obsoletos)}${prune ? ' (SE ELIMINAN)' : ' (se conservan)'}`)

  const cambios =
    efectos.nuevos.length +
    efectos.actualizados.length +
    (prune ? efectos.soloMotor.length : 0) +
    arte.escribir.length +
    arte.eliminar.length +
    (jsonCambia ? 1 : 0)
  if (cambios === 0) io.log('\n✅ 0 cambios: las fuentes ya están sincronizadas.')

  if (dryRun) {
    io.log('\n🔎 DRY-RUN: no se escribió nada.')
    io.log('   Si el reporte se ve bien, corre sin --dry-run.')
    return { codigo: 0, cambios, escrituras: 0, borrados: 0 }
  }

  // 6. Escribir solo lo que cambió (cada escritura es atómica: temporal + rename)
  let escrituras = 0
  let borrados = 0
  for (const a of arte.escribir) {
    io.escribirAtomico(unir(dirCartas, a.archivo), a.bytes)
    escrituras++
  }
  if (jsonCambia) {
    io.escribirAtomico(rutaEfectos, textoNuevo)
    escrituras++
  }
  for (const archivo of arte.eliminar) {
    io.borrar(unir(dirCartas, archivo))
    borrados++
  }
  io.log(`\n✅ ${escrituras} escrituras, ${borrados} borrados.`)
  return { codigo: 0, cambios, escrituras, borrados }
}
