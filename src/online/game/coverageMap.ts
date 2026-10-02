/**
 * Fase 0 — Mapa de cobertura: motor vs JSON (fuente de verdad).
 *
 * FUENTE DE VERDAD: seed/PrimerColeccionEfectos.json (Card-Maker).
 * NO paquetes.ts — esa data arrastraba efectos legacy/rediseños viejos.
 *
 * Módulo PURO (sin efectos secundarios): clasifica cada efecto de cada carta
 * según qué ruta del motor lo ejecuta HOY y en qué estado está.
 *
 * Capacidad del motor derivada de lectura de código (referencias abajo):
 * - effectInterpreter.ts:183-256 — cases de executeEffect
 * - efectos.ts:248-393 — dispararTrigger (triggerMapping + prioridad JSON→genérico→cardId)
 * - efectos.ts:31-43 — TriggerEfecto (triggers internos del dispatch)
 * - phases.ts:36-43 — al-inicio-alba: instancias = eterPagado + vínculos
 * - partida.ts:106-117 — al-inicio-choque: instancias = eterReserva + arcanas + vínculos
 * - habilidades.ts:172-253 — activar_habilidad (disparo/continuo SIN dispatch)
 * - movimientos.ts:171-188 — jugar_mistica solo dispatchea al_jugar-mistica
 * - handlers/*.ts + effects-guards.ts — registros por cardId (legacy)
 *
 * El objetivo de la Fase 1-2 es que todo pase a OK_INTERPRETER o
 * OK_ACTIVACION via interpreter, sin handlers por cardId.
 */
import type { AnyCard, EfectoData } from '../../shared/types'

/* ─────────────────────────── Capability map ─────────────────────────── */

/** Efectos con case REAL de ejecución en effectInterpreter.executeEffect. */
export const INTERPRETER_EXEC = new Set<string>([
  'buff', 'debuff', 'destroy', 'exile', 'draw', 'grant_keyword', 'return_hand',
  'steal_champion', 'steal_ether', 'free_ether', 'return_ether', 'mover',
  'toggle_exhaust', 'tutor', 'rival_discard', 'invocar_y_equipar', 'block_ether',
])

/** No-ops explícitos SIN implementación verificada desde JSON.
 * negar → IMPLEMENTADO Fase 3b (championNegado + validarActivarHabilidad).
 * copy → IMPLEMENTADO Fase 3c (copyActivo + dispatch continuo/evento). */
export const EXTERNOS_NOP = new Set<string>([])

/**
 * Efectos resueltos por SISTEMAS EXTERNOS que SÍ leen el JSON (Fase 2b/2c):
 * - combat.ts aplica double_attack vía tieneDoubleAttackActivo(efectos[])
 * - replacements.ts aplica prevent_destroy vía preventivosPendientes
 *   (checkpoint de elección + responder_prevenicion)
 */
export const SISTEMAS_EXTERNOS_JSON = new Set<string>([
  'double_attack',
  'prevent_destroy',
])

/** Handler genérico por tipo (registroGenerico) — no por cardId. Vacío post-Fase 2. */
export const GENERICOS = new Set<string>([])

/**
 * Triggers JSON con dispatch real (dispararTrigger) + qué instancias entran.
 * false en `instanciasOk` = el trigger se dispara pero ESTA clase de carta
 * nunca está en la lista de instancias.
 */
export const DISPATCH: Record<string, {
  llamado: boolean
  nota: string
  /** false = el trigger existe pero estas cartas no entran en la lista */
  instanciasOk: boolean
}> = {
  al_invocar: { llamado: true, nota: 'movimientos.ts:164 — instancia invocada', instanciasOk: true },
  al_atacar: { llamado: true, nota: 'combat.ts:131 — atacantes', instanciasOk: true },
  al_matar_en_combate: { llamado: true, nota: 'combat.ts:230 — víctima + asesino', instanciasOk: true },
  al_pagar_eter: { llamado: true, nota: 'payments.ts:113 — éter pagado', instanciasOk: true },
  al_jugar_mistica: { llamado: true, nota: 'movimientos.ts:184 — mística jugada', instanciasOk: true },
  al_ser_enviado_al_cementerio: { llamado: true, nota: 'replacements.ts:94,195', instanciasOk: true },
  al_ser_destruido_vinculo: { llamado: true, nota: 'replacements.ts:185 — vínculo', instanciasOk: true },
  al_resolver_cadena: { llamado: true, nota: 'chain.ts:228,257,260', instanciasOk: true },
  al_activar_habilidad: {
    llamado: false,
    nota: 'SIN dispararTrigger — solo vía ejecutarEfectoDesdeJSON (habilidades.ts:227)',
    instanciasOk: true,
  },
  inicio_alba: {
    llamado: true,
    nota: 'phases.ts:40-42 — instancias = eterPagado + vínculos (NO eterReserva ni campo)',
    instanciasOk: true,
  },
  inicio_choque: {
    llamado: true,
    nota: 'partida.ts:112-116 — instancias = eterReserva + arcanas + vínculos (NO campeones ni místicas)',
    instanciasOk: true,
  },
  cuando_vinculo_seria_destruido: {
    llamado: false,
    nota: 'NO existe en triggerMapping (efectos.ts:262-274) ni como llamado a dispararTrigger',
    instanciasOk: false,
  },
  ninguno: {
    llamado: false,
    nota: 'Nunca dispatch — semántica de modificador continuo (estado derivado). Hoy: handlers de aura.',
    instanciasOk: false,
  },
}

/** Trigger inicio_choque solo funciona para ciertos tipos de carta. */
export const CHOQUE_SOLO_TIPOS = new Set(['Éter', 'Campeón', 'Arcana', 'Vínculo'])

/** Trigger inicio_alba solo funciona para ciertos tipos de carta. */
export const ALBA_SOLO_TIPOS = new Set(['Éter', 'Vínculo'])

/**
 * Handlers por cardId — FASE 2: ELIMINADOS TODOS.
 * Auras (Fase 1), hechizos/block_ether/Pasivo 1A/recompensas de Arcana/
 * invocar_y_equipar (Fase 2a) se resuelven desde el JSON.
 * El mapa se mantiene para futuros fallbacks puntuales justificados.
 */
export const HANDLERS: Record<string, { kind: string; detail: string; drift?: string }> = {}

/** Guards de Arcanas hardcodeados — FASE 2: ELIMINADOS (condicionCumple data-driven). */
export const GUARDS = new Set<string>()

/* ─────────────────────────── Clasificación ─────────────────────────── */

export type EstadoCobertura =
  | 'OK_INTERPRETER'        // dispatch + case real en interpreter
  | 'OK_ACTIVACION'         // vía ejecutarEfectoDesdeJSON (activar_habilidad/arcana)
  | 'OK_AURA_JSON'          // modificador continuo derivado de efectos[] (Fase 1)
  | 'PARCIAL_EXTERNO'       // dispatch OK pero el case es no-op "lo maneja otro sistema"
  | 'PARCIAL_DUAL'          // doble modelo / ambigüedad de semántica
  | 'CONDICION_GUARD'       // condicion Arcana validada por guards hardcodeados
  | 'HUECO_NOOP'            // dispatch OK pero efecto sin case → no-op silencioso
  | 'HUECO_TRIGGER'         // trigger nunca se dispara para esta carta
  | 'HUECO_SIN_RUTA'        // sin trigger y sin ruta de activación/aura
  | 'CONDICION_GUARD'       // condicion Arcana validada por guards hardcodeados
  | 'COMANDANTE_AURA'       // efectoComandante fuera de efectos[]

export interface CoberturaItem {
  cardId: string
  cardName: string
  cardType: string
  origen: 'efectos' | 'efectoComandante' | 'condicion'
  tipo: string
  trigger: string
  efecto: string
  estado: EstadoCobertura
  ruta: string
  notas: string[]
}

export interface ComboResumen {
  key: string
  tipo: string
  trigger: string
  efecto: string
  cartas: string[]
  estados: Set<EstadoCobertura>
}

const TRIGGER_DEFAULT = '(sin trigger)'

/** ¿El efecto es stat (buff/debuff/grant_keyword)? Para clasificación de aura vínculo. */
function esEfectoStatType(efecto: EfectoData): boolean {
  return efecto.efecto === 'buff' || efecto.efecto === 'debuff' || efecto.efecto === 'grant_keyword'
}

function triggerDe(efecto: EfectoData): string {
  return efecto.trigger ?? TRIGGER_DEFAULT
}

/** Clasifica un efecto individual. */
export function clasificarEfecto(
  card: AnyCard,
  efecto: EfectoData,
  origen: CoberturaItem['origen'] = 'efectos',
): CoberturaItem {
  const cardId = card.id
  const tipo = efecto.tipo
  const trigger = triggerDe(efecto)
  const accion = efecto.efecto ?? '(sin efecto)'
  const notas: string[] = []

  const base = {
    cardId,
    cardName: card.name,
    cardType: card.type,
    origen,
    tipo,
    trigger,
    efecto: accion,
  }

  // ── efectoComandante: interpretado como modificador continuo (Fase 1) ──
  if (origen === 'efectoComandante') {
    return {
      ...base,
      estado: 'OK_AURA_JSON',
      ruta: 'modificadoresJSONDe (efectos.ts) — efectoComandante interpretado como estado derivado',
      notas,
    }
  }

  // ── condicion Arcana: gate data-driven vía condicionCumple (Fase 2a) ──
  if (origen === 'condicion') {
    return {
      ...base,
      estado: 'OK_ACTIVACION',
      ruta: 'condicionCumple (efectos.ts) — evaluada en validarActivarArcana y dispararTrigger',
      notas: [...notas, 'Guards hardcodeados eliminados (Fase 2a) — una sola fuente: condicion JSON.'],
    }
  }

  const h = HANDLERS[cardId]
  if (h?.drift && (tipo === 'pasivo' || tipo === 'reserva' || tipo === 'bloqueo' || tipo === 'comandante')) {
    notas.push(h.drift)
  }

  // ── Sin trigger / trigger ninguno → modificador continuo u otros ──
  if (trigger === TRIGGER_DEFAULT || trigger === 'ninguno') {
    // Vínculo sin trigger: Fase 3d — aura mientras_en_campo es estado derivado
    // (FB-030/DS-030: "vínculos siempre en campo = permanente", diseño usuario).
    if (card.type === 'Vínculo' && trigger === TRIGGER_DEFAULT) {
      if (esEfectoStatType(efecto) && efecto.duracion === 'mientras_en_campo') {
        return {
          ...base,
          estado: 'OK_AURA_JSON',
          ruta: 'esAuraVinculo + modificadoresJSONDe (efectos.ts) — aura derivada de Vínculo (Fase 3d)',
          notas: [...notas, 'Vínculo aura: mientras_en_campo = permanente (diseño usuario — vínculos siempre en campo).'],
        }
      }
      notas.push('Vínculo sin trigger: el JSON no especifica cuándo corre (¿continuo mientras esté en campo = estado derivado? ¿periódico = falta el trigger?). Requiere decisión de diseño o corrección en Card-Maker.')
      return {
        ...base,
        estado: 'HUECO_SIN_RUTA',
        ruta: 'ninguna — vínculo sin trigger no entra en dispatch ni en sistema de auras',
        notas,
      }
    }

    // Éter pago sin trigger + block_ether: Pasivo 1A data-driven (Fase 2a)
    if (tipo === 'pago' && trigger === TRIGGER_DEFAULT) {
      if (accion === 'block_ether') {
        return {
          ...base,
          estado: 'OK_ACTIVACION',
          ruta: 'phases.ts al-inicio-alba → crearOpcionBloqueo (data-driven desde efectos[] en 1A)',
          notas: [...notas, 'Pasivo 1A sin handlers por cardId (FB-005/DS-006).'],
        }
      }
      return {
        ...base,
        estado: 'HUECO_SIN_RUTA',
        ruta: 'pago sin trigger sin ruta de ejecución',
        notas,
      }
    }

    if (tipo === 'pasivo' || tipo === 'reserva' || tipo === 'bloqueo') {
      const esStat = accion === 'buff' || accion === 'debuff' || accion === 'grant_keyword'
      if (esStat) {
        return {
          ...base,
          estado: 'OK_AURA_JSON',
          ruta: 'modificadoresJSONDe (efectos.ts) — aura de zona derivada desde efectos[] (Fase 1)',
          notas: [...notas, 'Estado derivado en statsDe/keywordsDe: pasivo/reserva/bloqueo sin trigger de evento.'],
        }
      }
      return {
        ...base,
        estado: 'HUECO_SIN_RUTA',
        ruta: 'aura de zona con efecto no-stat (buff/debuff/grant_keyword) — sin ruta',
        notas,
      }
    }
    // disparo/continuo sin trigger → activación; hechizo sin trigger → al jugar/activar
    if (tipo === 'disparo' || tipo === 'continuo') {
      return clasificarActivacion(base, accion, notas)
    }
    if (tipo === 'hechizo') {
      // Fase 3a: hechizo con costo-bloqueado (Místicas FB-020/022/032) —
      // la resolución REAL depende del efecto, no del play-time genérico.
      if (efecto.costo?.tipo === 'eter_bloqueado' || efecto.costo?.tipo === 'bloqueo_fijo') {
        if (accion === 'copy') {
          return {
            ...base,
            estado: 'OK_ACTIVACION',
            ruta: 'copyActivo (efectos.ts) + dispatch continuo/evento (Fase 3c) — D1 target al jugar; activación vía bloquear_eter (§7.7)',
            notas: [...notas, 'FB-022: copy B-primario (aura derivada) + A-extensible (one-shot eventos); flag limpia al liberar Éter.'],
          }
        }
        if (efecto.buffPerBlockedEther && efecto.objetivo?.tipo === 'equipped_champion') {
          return {
            ...base,
            estado: 'OK_AURA_JSON',
            ruta: 'esAuraEquipada + evaluarAura (efectos.ts) — aura derivada: +stats por Éter bloqueado en la fuente equipada (Fase 3a)',
            notas: [...notas, 'FB-020: buff DERIVADO mientras tenga Éter bloqueado; no se ejecuta al jugar.'],
          }
        }
        if (accion === 'invocar_y_equipar') {
          return {
            ...base,
            estado: 'OK_ACTIVACION',
            ruta: 'dispararUmbralBloqueo (effectInterpreter) — one-shot al alcanzar umbral de costo-bloqueado (Fase 3a)',
            notas: [...notas, 'FB-032: al bloquear N Éter invoca de zonaOrigen + equipa; flag limpia al liberar.'],
          }
        }
      }
      // La ruta existe (jugar/activar → interpret), pero si la acción es un
      // no-op externo sin implementación verificada, el mapa no miente:
      if (EXTERNOS_NOP.has(accion)) {
        return {
          ...base,
          estado: 'PARCIAL_EXTERNO',
          ruta: card.type === 'Mística'
            ? 'ejecutarJugarMistica → interpretEffect → case no-op externo'
            : 'ejecutarActivarArcana → interpretEffect → case no-op externo',
          notas: [
            ...notas,
            `'${accion}' es no-op en executeEffect ("lo maneja chain system") — verificar si chain.ts lee efectos[] con ${accion} y copyAttributes. Si no, es hueco encubierto.`,
          ],
        }
      }
      if (card.type === 'Mística') {
        return {
          ...base,
          estado: 'OK_ACTIVACION',
          ruta: 'ejecutarJugarMistica → interpretEffect (hechizo sin trigger = al jugar, Fase 2a)',
          notas,
        }
      }
      if (card.type === 'Arcana') {
        return {
          ...base,
          estado: 'OK_ACTIVACION',
          ruta: 'ejecutarActivarArcana → interpretEffect (recompensa al activar, Fase 2a)',
          notas: [...notas, 'Modelo de activación: condicion gatea la activación; la recompensa hechizo se resuelve al pagar+revelar.'],
        }
      }
      return {
        ...base,
        estado: 'HUECO_SIN_RUTA',
        ruta: `hechizo sin trigger en ${card.type} — sin ruta`,
        notas,
      }
    }
    return {
      ...base,
      estado: 'HUECO_SIN_RUTA',
      ruta: 'ninguna',
      notas,
    }
  }

  // ── Con trigger ──
  const disp = DISPATCH[trigger]
  if (!disp || !disp.llamado) {
    // al_activar_habilidad: sin dispatch pero con ruta de activación
    if (trigger === 'al_activar_habilidad') {
      if (card.type !== 'Campeón') {
        notas.push('al_activar_habilidad sin dispatch; ruta de activación es solo para Campeones en campo.')
        return { ...base, estado: 'HUECO_TRIGGER', ruta: 'sin dispatch y sin activación posible', notas }
      }
      return clasificarActivacion(base, accion, notas, 'habilidades.ts ejecutarEfectoDesdeJSON (sin dispararTrigger)')
    }
    // prevent_destroy (Fase 2c): scan data-driven en destruirCarta, sin dispatch
    if (SISTEMAS_EXTERNOS_JSON.has(accion)) {
      return {
        ...base,
        estado: 'OK_ACTIVACION',
        ruta: 'destruirCarta → buscarFuentePreventDestroy(efectos[]) → preventivosPendientes → responder_prevenicion (checkpoint, Fase 2c)',
        notas: [...notas, 'Reemplazo OPCIONAL data-driven: scan en destruirCarta, elección del controlador del vínculo, bot heurística (prevenir solo último vínculo).'],
      }
    }
    return {
      ...base,
      estado: 'HUECO_TRIGGER',
      ruta: disp ? `sin dispatch — ${disp.nota}` : 'trigger desconocido',
      notas: [
        ...notas,
        disp?.nota ?? '',
      ],
    }
  }

  // El trigger se dispara… pero ¿entra esta carta en la lista de instancias?
  if (!instanciasIncluyen(card.type, trigger)) {
    return {
      ...base,
      estado: 'HUECO_TRIGGER',
      ruta: `dispatch existe (${disp.nota}) pero ${card.type} NO entra en la lista de instancias`,
      notas: [
        ...notas,
        card.type === 'Campeón' && trigger === 'inicio_choque'
          ? 'Campeones no están en choqueInstances (partida.ts:114) — efectos de campeón con inicio_choque nunca disparan.'
          : disp.nota,
      ],
    }
  }

  // Arcanas en choque: doble modelo (dispatch automático vs activación)
  if (card.type === 'Arcana' && trigger === 'inicio_choque') {
    notas.push('DUAL ARCANAS: dispararTrigger al-inicio-choque incluye arcanas SIN chequear bocaArriba; además existe activar_arcana + guards. ¿Cuál es la semántica canónica?')
  }

  if (INTERPRETER_EXEC.has(accion)) {
    return {
      ...base,
      estado: 'OK_INTERPRETER',
      ruta: `dispararTrigger(${trigger}) → interpretEffect → case '${accion}'`,
      notas,
    }
  }
  if (SISTEMAS_EXTERNOS_JSON.has(accion)) {
    return {
      ...base,
      estado: 'OK_INTERPRETER',
      ruta: `sistema externo lee JSON: combat.ts tieneDoubleAttackActivo(efectos[]) — segunda ola de ataque (Fase 2b)`,
      notas,
    }
  }
  if (GENERICOS.has(accion)) {
    return {
      ...base,
      estado: 'PARCIAL_DUAL',
      ruta: `registroGenerico '${accion}' (handlers/invocar-equipar.ts) — no está en executeEffect`,
      notas: [...notas, 'Fase 2: migrar al interpreter y borrar el handler genérico.'],
    }
  }
  if (EXTERNOS_NOP.has(accion)) {
    return {
      ...base,
      estado: 'PARCIAL_EXTERNO',
      ruta: `dispatch OK pero executeEffect case '${accion}' es no-op ("lo maneja otro sistema")`,
      notas: [
        ...notas,
        accion === 'negar'
          ? 'negar: ¿chain.ts lee efectos[] con negar? Si no, es hueco encubierto (Fase 2b pendiente).'
          : 'copy: ¿chain.ts lee copyAttributes del JSON? Si no, es hueco encubierto (Fase 3c pendiente).',
      ],
    }
  }

  return {
    ...base,
    estado: 'HUECO_NOOP',
    ruta: `dispatch OK pero executeEffect SIN case para '${accion}' → no-op silencioso`,
    notas: [...notas, `Fase 2: implementar case '${accion}' en effectInterpreter.ts.`],
  }
}

function clasificarActivacion(
  base: Omit<CoberturaItem, 'estado' | 'ruta' | 'notas'>,
  accion: string,
  notas: string[],
  ruta?: string,
): CoberturaItem {
  if (INTERPRETER_EXEC.has(accion)) {
    return {
      ...base,
      estado: 'OK_ACTIVACION',
      ruta: ruta ?? 'ejecutarActivarHabilidad → ejecutarEfectoDesdeJSON → interpretEffect',
      notas,
    }
  }
  if (SISTEMAS_EXTERNOS_JSON.has(accion)) {
    return {
      ...base,
      estado: 'OK_ACTIVACION',
      ruta: ruta ?? 'activación bloquea Éter → combat.ts tieneDoubleAttackActivo(efectos[]) aplica la 2da ola (Fase 2b)',
      notas,
    }
  }
  if (GENERICOS.has(accion)) {
    return {
      ...base,
      estado: 'PARCIAL_DUAL',
      ruta: ruta ?? 'registroGenerico invocar_y_equipar',
      notas: [...notas, 'Fase 2: migrar al interpreter.'],
    }
  }
  if (EXTERNOS_NOP.has(accion)) {
    return {
      ...base,
      estado: 'PARCIAL_EXTERNO',
      ruta: ruta ?? 'activación → interpretEffect → no-op externo',
      notas: [
        ...notas,
        `externo '${accion}' sin implementación verificada desde JSON (Fase 2b pendiente).`,
      ],
    }
  }
  return {
    ...base,
    estado: 'HUECO_NOOP',
    ruta: ruta ?? 'activación → interpretEffect → sin case',
    notas: [...notas, `Fase 2: implementar case '${accion}'.`],
  }
}

function instanciasIncluyen(cardType: string, trigger: string): boolean {
  if (trigger === 'inicio_choque') return CHOQUE_SOLO_TIPOS.has(cardType)
  if (trigger === 'inicio_alba') return ALBA_SOLO_TIPOS.has(cardType)
  return true
}

/* ─────────────────────────── Reporte ─────────────────────────── */

export interface ReporteCobertura {
  items: CoberturaItem[]
  combos: ComboResumen[]
  totales: Record<EstadoCobertura, { count: number; pct: number }>
  totalEfectos: number
  totalCartas: number
  cartasConHandlers: string[]
  huecosPorEstado: Partial<Record<EstadoCobertura, CoberturaItem[]>>
}

const ESTADOS_ORDER: EstadoCobertura[] = [
  'OK_INTERPRETER', 'OK_ACTIVACION', 'OK_AURA_JSON', 'PARCIAL_EXTERNO', 'PARCIAL_DUAL',
  'CONDICION_GUARD',
  'HUECO_NOOP', 'HUECO_TRIGGER', 'HUECO_SIN_RUTA',
]

const OK_STATES = new Set<EstadoCobertura>(['OK_INTERPRETER', 'OK_ACTIVACION', 'OK_AURA_JSON'])

// Nota: CONDICION_GUARD queda como estado histórico — la condicion ahora
// clasifica como OK_ACTIVACION (condicionCumple data-driven).

export function buildReporte(cards: AnyCard[]): ReporteCobertura {
  const items: CoberturaItem[] = []

  for (const card of cards) {
    // condicion vive SOLO en ArcanaCard (no en AnyCard) — condicionCumple data-driven (Fase 2a)
    if ('condicion' in card && card.condicion && typeof card.condicion === 'object') {
      items.push({
        cardId: card.id,
        cardName: card.name,
        cardType: card.type,
        origen: 'condicion',
        tipo: 'pasivo',
        trigger: card.condicion.trigger,
        efecto: 'condicion',
        estado: 'OK_ACTIVACION',
        ruta: 'condicionCumple (efectos.ts) — evaluada en validarActivarArcana y dispararTrigger',
        notas: ['Guards hardcodeados eliminados (Fase 2a) — una sola fuente: condicion JSON.'],
      })
    }
    if (card.type === 'Campeón' && card.efectoComandante) {
      items.push(clasificarEfecto(card, card.efectoComandante, 'efectoComandante'))
    }
    if ('efectos' in card && card.efectos) {
      for (const efecto of card.efectos) {
        items.push(clasificarEfecto(card, efecto, 'efectos'))
      }
    }
  }

  const combosMap = new Map<string, ComboResumen>()
  for (const it of items) {
    const key = `${it.tipo}|${it.trigger}|${it.efecto}`
    let combo = combosMap.get(key)
    if (!combo) {
      combo = { key, tipo: it.tipo, trigger: it.trigger, efecto: it.efecto, cartas: [], estados: new Set() }
      combosMap.set(key, combo)
    }
    if (!combo.cartas.includes(it.cardId)) combo.cartas.push(it.cardId)
    combo.estados.add(it.estado)
  }

  const totales = {} as Record<EstadoCobertura, { count: number; pct: number }>
  for (const e of ESTADOS_ORDER) totales[e] = { count: 0, pct: 0 }
  for (const it of items) totales[it.estado].count++
  const total = items.length || 1
  for (const e of ESTADOS_ORDER) totales[e].pct = Math.round((totales[e].count / total) * 1000) / 10

  const huecosPorEstado: ReporteCobertura['huecosPorEstado'] = {}
  for (const it of items) {
    if (OK_STATES.has(it.estado)) continue
    ;(huecosPorEstado[it.estado] ??= []).push(it)
  }

  return {
    items,
    combos: [...combosMap.values()].sort((a, b) => a.key.localeCompare(b.key)),
    totales,
    totalEfectos: items.length,
    totalCartas: cards.length,
    cartasConHandlers: [...new Set(items.filter((i) => HANDLERS[i.cardId]).map((i) => i.cardId))].sort(),
    huecosPorEstado,
  }
}

export function pctOK(r: ReporteCobertura): number {
  const ok =
    r.totales.OK_INTERPRETER.count +
    r.totales.OK_ACTIVACION.count +
    r.totales.OK_AURA_JSON.count
  return Math.round((ok / (r.totalEfectos || 1)) * 1000) / 10
}

export function formatReporte(r: ReporteCobertura): string {
  const lines: string[] = []
  const ok = pctOK(r)

  lines.push('# Mapa de Cobertura — Motor vs JSON (fuente de verdad: seed/PrimerColeccionEfectos.json)')
  lines.push('')
  lines.push(`Cartas: **${r.totalCartas}** | Efectos clasificados: **${r.totalEfectos}** | Combos únicos (tipo×trigger×efecto): **${r.combos.length}**`)
  lines.push('')
  lines.push(`## Cobertura data-driven: **${ok}%** de los efectos se ejecutan por el puro motor (interpreter/activación)`)
  lines.push('')
  lines.push('## Resumen por estado')
  lines.push('')
  lines.push('| Estado | Efectos | % |')
  lines.push('|---|---:|---:|')
  for (const e of ESTADOS_ORDER) {
    const t = r.totales[e]
    if (t.count === 0) continue
    lines.push(`| ${e} | ${t.count} | ${t.pct}% |`)
  }
  lines.push('')
  lines.push('## Matriz de combos (tipo × trigger × efecto)')
  lines.push('')
  lines.push('| Combo | Cartas | Estados |')
  lines.push('|---|---|---|')
  for (const c of r.combos) {
    lines.push(`| \`${c.tipo}\` × \`${c.trigger}\` × \`${c.efecto}\` | ${c.cartas.join(', ')} | ${[...c.estados].join(', ')} |`)
  }
  lines.push('')
  lines.push('## Handlers por cardId (legacy) presentes en la data')
  lines.push('')
  for (const id of r.cartasConHandlers) {
    const h = HANDLERS[id]
    lines.push(`- **${id}** — \`${h.kind}\`: ${h.detail}${h.drift ? `\n  - ${h.drift}` : ''}`)
  }
  lines.push('')
  lines.push('## Detalle de NO-OK (huecos y parciales)')
  lines.push('')
  for (const e of ESTADOS_ORDER) {
    if (OK_STATES.has(e)) continue
    const list = r.huecosPorEstado[e]
    if (!list?.length) continue
    lines.push(`### ${e} (${list.length})`)
    lines.push('')
    for (const it of list) {
      lines.push(`- **${it.cardId}** ${it.cardName} (${it.cardType}) — \`${it.tipo}\`×\`${it.trigger}\`×\`${it.efecto}\` [${it.origen}]`)
      lines.push(`  - Ruta: ${it.ruta}`)
      for (const n of it.notas) if (n) lines.push(`  - ${n}`)
    }
    lines.push('')
  }
  return lines.join('\n')
}
