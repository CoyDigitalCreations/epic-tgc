/**
 * Funciones puras compartidas por sync-forge-to-engine, extract-art y sync-fuentes.
 * Sin I/O: todo recibe y devuelve datos.
 */
import { Buffer } from 'node:buffer'
import type { AnyCard } from '../../src/shared/types'
import { limpiarEfectosDeCarta } from '../../src/forge/utils/limpiar-efecto'

export type Json = Record<string, unknown>

export interface Diagnostico {
  cardId: string
  errores: string[]
  avisos: string[]
}

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
  'fix_exhaust', 'modificar_regla',
  'activar_disparo', 'anclar_eter',
])

/* ── Limpieza ── */

/** Descarta arte embebido (base64) y flags de imagen. Rutas estáticas /cartas/*.webp se conservan. */
export function sinArte(card: Json): Json {
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
export function canon(value: unknown): string {
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

function validarEfecto(efecto: Json, idx: number, diag: Diagnostico): void {
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

export function validarCarta(card: Json, idx: number): Diagnostico {
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
        if (e && typeof e === 'object') validarEfecto(e as Json, i, diag)
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

/* ── Derivación de FuenteEfectos ── */

export interface PlanEfectos {
  /** Diagnósticos con al menos un error. */
  errores: Diagnostico[]
  /** Diagnósticos con avisos (no bloquean). */
  avisos: Diagnostico[]
  duplicados: Array<[string, number]>
  /** null si hubo errores o ids duplicados: no hay nada que escribir. */
  resultado: Json[] | null
  nuevos: string[]
  actualizados: string[]
  sinCambios: string[]
  soloMotor: string[]
}

/**
 * La carta como la guarda FuenteEfectos: sin arte embebido y sin los campos escondidos de OTROS efectos (p. ej. el
 * copyAttributes que quedó en Thane). Es EXACTAMENTE la normalización que usan el script y la guardia de consistencia.
 */
export function derivarCarta(card: Json): Json {
  return limpiarEfectosDeCarta(sinArte(card) as unknown as AnyCard) as unknown as Json
}

/**
 * Deriva el contenido de FuenteEfectos a partir de un export (con o sin arte) y el motor actual.
 * Valida todo: con errores o ids duplicados NO devuelve resultado.
 * Sin prune se conservan las cartas del motor ausentes del export (orden del motor; nuevas al final).
 */
export function derivarEfectos(exportCrudo: Json[], motor: Json[], opts: { prune: boolean }): PlanEfectos {
  const exportCards = exportCrudo.map(derivarCarta)
  const diagnosticos = exportCards.map((c, i) => validarCarta(c, i))
  const errores = diagnosticos.filter((d) => d.errores.length > 0)
  const avisos = diagnosticos.filter((d) => d.avisos.length > 0)
  const duplicados = idsDuplicados(exportCards)

  const motorPorId = new Map(motor.map((c) => [String(c.id), c]))
  const exportPorId = new Map(exportCards.map((c) => [String(c.id), c]))

  const nuevos: string[] = []
  const actualizados: string[] = []
  const sinCambios: string[] = []
  for (const [id, card] of exportPorId) {
    const actual = motorPorId.get(id)
    if (!actual) nuevos.push(id)
    else if (canon(actual) !== canon(card)) actualizados.push(id)
    else sinCambios.push(id)
  }
  const soloMotor = [...motorPorId.keys()].filter((id) => !exportPorId.has(id))

  if (errores.length > 0 || duplicados.length > 0) {
    return { errores, avisos, duplicados, resultado: null, nuevos, actualizados, sinCambios, soloMotor }
  }

  let resultado: Json[]
  if (opts.prune) {
    resultado = exportCards // el export es el nuevo universo completo
  } else {
    const resultadoMap = new Map<string, Json>()
    for (const c of motor) {
      const id = String(c.id)
      resultadoMap.set(id, exportPorId.get(id) ?? c)
    }
    for (const [id, card] of exportPorId) {
      if (!resultadoMap.has(id)) resultadoMap.set(id, card)
    }
    resultado = [...resultadoMap.values()]
  }
  return { errores, avisos, duplicados, resultado, nuevos, actualizados, sinCambios, soloMotor }
}

/* ── Arte ── */

export interface DataUrlImagen {
  /** Subtipo MIME tal cual viene: webp, png, jpeg... */
  tipo: string
  bytes: Buffer
}

export interface PlanArte {
  /** Ilustraciones por escribir (nuevas o distintas de la existente). */
  escribir: Array<{ id: string; archivo: string; bytes: Buffer }>
  /** Ids cuya ilustración existente ya es idéntica. */
  iguales: string[]
  /** Ids sin imageUrl en data-URI: aviso, no generan archivo. */
  sinImagen: string[]
  /** Archivos del directorio de arte que ya no corresponden a ninguna carta. */
  obsoletos: string[]
  /** Subconjunto de obsoletos que se borra: solo con prune. */
  eliminar: string[]
  errores: string[]
}

/** Decodifica un data-URI de imagen en base64; null si no tiene ese formato. */
export function parsearDataUrlImagen(url: string): DataUrlImagen | null {
  const match = url.match(/^data:image\/(\w+);base64,(.+)$/)
  if (!match) return null
  return { tipo: match[1], bytes: Buffer.from(match[2], 'base64') }
}

/** Archivos de arte (png/jpg/webp) cuyo id ya no está entre los ids vigentes. */
export function archivosObsoletos(archivos: string[], idsVigentes: ReadonlySet<string>): string[] {
  return archivos.filter((f) => /\.(png|jpg|webp)$/.test(f) && !idsVigentes.has(f.replace(/\.(png|jpg|webp)$/, '')))
}

/**
 * Plan de ilustraciones a partir de las cartas del export (con arte) y los archivos existentes
 * (nombre de archivo → bytes). Solo se admite webp: cardArtPath siempre apunta a {id}.webp.
 */
export function planArte(cards: Json[], existentes: ReadonlyMap<string, Buffer>, opts: { prune: boolean }): PlanArte {
  const plan: PlanArte = { escribir: [], iguales: [], sinImagen: [], obsoletos: [], eliminar: [], errores: [] }
  const idsVigentes = new Set<string>()

  for (const card of cards) {
    const id = String(card.id)
    const url = card.imageUrl
    if (typeof url !== 'string' || !url.startsWith('data:')) {
      plan.sinImagen.push(id)
      continue
    }
    const imagen = parsearDataUrlImagen(url)
    if (!imagen) {
      plan.errores.push(`${id}: formato dataURL no reconocido`)
      continue
    }
    if (imagen.tipo !== 'webp') {
      plan.errores.push(`${id}: el arte es ${imagen.tipo} y debe ser webp (cardArtPath apunta a {id}.webp)`)
      continue
    }
    idsVigentes.add(id)
    const archivo = `${id}.webp`
    const actual = existentes.get(archivo)
    if (actual && actual.equals(imagen.bytes)) plan.iguales.push(id)
    else plan.escribir.push({ id, archivo, bytes: imagen.bytes })
  }

  plan.obsoletos = archivosObsoletos([...existentes.keys()], idsVigentes)
  plan.eliminar = opts.prune ? plan.obsoletos : []
  return plan
}

/** Ids repetidos con su conteo (ignora cartas sin id). */
export function idsDuplicados(cards: Json[]): Array<[string, number]> {
  const vistos = new Map<string, number>()
  for (const c of cards) {
    const id = typeof c.id === 'string' ? c.id : ''
    if (!id) continue
    vistos.set(id, (vistos.get(id) ?? 0) + 1)
  }
  return [...vistos.entries()].filter(([, n]) => n > 1)
}
