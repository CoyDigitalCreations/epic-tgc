// @vitest-environment node
/**
 * SET DE CARTAS DE PRUEBA (seed/CartasPrueba.json, ids PR-xxx) — banco de pruebas del motor.
 *
 * Principio rector (decision/motor-reglas-base-f5d): el motor es GENÉRICO, lo que ejerce el set son los
 * efectos y triggers CONFIGURABLES en el Card-Maker, no cartas concretas. Tres bloques:
 *
 *  (a) AUDITORÍA de configuración: validateCard + reglas de configuración del Card-Maker (tipos de
 *      efecto por tipo de carta, 1 efecto por tipo, máx. 3, vocabulario de efecto/trigger/keyword,
 *      `texto` = generateEffectText) + el script de sincronización scripts/sync-forge-to-engine.ts en
 *      --dry-run (la misma validación que corre el usuario al sincronizar un export).
 *  (b) COBERTURA: coverageMap (qué efectos del set tienen ejecutor) y lista de HUECOS CONOCIDOS.
 *  (c) HUMO directo: jugar las cartas con applyAction y comprobar con evidencia que el efecto hace lo
 *      que dice su texto con el motor ACTUAL. Los hallazgos (el motor no cumple el texto o la decisión
 *      de diseño) se escriben con `it.fails`: el test pasa mientras el motor siga fallando y AVISA
 *      (se pone en rojo) cuando alguien lo arregle, para que se convierta en test normal.
 *
 * Doctrina: este archivo NO toca el motor ni normaliza datos; solo observa.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { validateCard } from '../../../forge/utils/validation'
import { generateEffectText } from '../../../forge/components/EffectList'
import { EFFECT_CATEGORIES } from '../../../forge/components/fields/EffectField'
import { KEYWORDS } from '../../../shared/types'
import type { AnyCard, EfectoData } from '../../../shared/types'
import { buildReporte, pctOK, INTERPRETER_EXEC, SISTEMAS_EXTERNOS_JSON } from '../coverageMap'
import { getCardMeta } from '../cards'
import { getValidActions } from '../validActions'
import { statsDe, keywordsDe, velocidadDe } from '../efectos'
import { etersParaPagar } from '../payments'
import { respondiblesDe } from '../chain'
import { reglaNumero } from '../reglas'
import { exhaustFijado } from '../effectInterpreter'
import { validarDeck } from '../initialState'
import { applyAction } from '../actions'
import type { Ctx, GameState } from '../types'
import {
  CARTAS_PRUEBA, PR, cargarCartasPrueba, mazoPrueba, crearPartidaPrueba, escenaVacia, crearCtx, aplicar,
  conMano, conEteres, conMazo, conCampeon, conMistica, conArcana, conVinculo, enCementerio, enExilio, inst,
} from './helpers/cartasPrueba'

beforeAll(() => {
  cargarCartasPrueba()
})

/* ═══════════════════════════ (a) AUDITORÍA DE CONFIGURACIÓN ═══════════════════════════ */

/** Réplica de ALLOWED_EFFECTS (EffectList.tsx, no exportada): tipos de efecto que el Card-Maker ofrece por tipo de carta. */
const TIPOS_PERMITIDOS: Record<AnyCard['type'], EfectoData['tipo'][]> = {
  Campeón: ['pasivo', 'continuo', 'disparo', 'comandante'],
  Mística: ['hechizo'],
  Arcana: ['hechizo'],
  Éter: ['reserva', 'pago', 'bloqueo'],
  Vínculo: ['vinculo'],
}

/** Triggers que ofrece el desplegable del Card-Maker (TRIGGER_OPTIONS en EffectField.tsx, no exportada). */
const TRIGGERS_CARD_MAKER = new Set([
  'ninguno', 'al_invocar', 'al_atacar', 'al_matar_en_combate', 'al_pagar_eter', 'inicio_choque', 'inicio_alba',
  'al_jugar_mistica', 'al_resolver_cadena', 'al_activar_habilidad', 'al_ser_enviado_al_cementerio',
  'al_ser_destruido_vinculo', 'cuando_vinculo_seria_destruido',
])

/** Acciones que el desplegable "Efecto" del Card-Maker ofrece (EFFECT_CATEGORIES). */
const EFECTOS_CARD_MAKER = new Set<string>(EFFECT_CATEGORIES.flatMap((c) => c.efectos))

/**
 * HUECO DEL CARD-MAKER #1: `modificar_regla` existe en el esquema (EfectoAccion + EfectoData.regla) y el motor lo
 * ejecuta, pero el formulario NO lo ofrece (ni EFFECT_CATEGORIES ni un editor de `regla`). Estas cartas solo se
 * pueden producir a mano; su `texto` también (generateEffectText no tiene verbo para modificar_regla).
 */
const SOLO_A_MANO_MODIFICAR_REGLA = new Set(['PR-030', 'PR-053'])

/**
 * HUECO DEL CARD-MAKER #2: el generador de texto antepone "puedes" en buff/debuff con trigger y sin costo
 * ("un Campeón que controla el rival puedes perder 2 de ATQ") y deja "Niega"/"1 un"/"carta" sin concordar. Las
 * cartas reales del seed (DS-011, DS-014, FB-010...) tienen ese texto corregido a mano; aquí se hace igual.
 */
const TEXTO_CORREGIDO_A_MANO = new Set([
  'PR-005', 'PR-006', 'PR-013', 'PR-014', 'PR-015', 'PR-019', 'PR-020', 'PR-021', 'PR-025', 'PR-028', 'PR-045',
  'PR-060', 'PR-062', 'PR-074', 'PR-075', 'PR-008', 'PR-009',
])

function efectosDe(c: AnyCard): EfectoData[] {
  return 'efectos' in c && c.efectos ? c.efectos : []
}

describe('(a) auditoría — validateCard y reglas de configuración del Card-Maker', () => {
  it('el set tiene ids PR-NNN únicos y no choca con ninguna carta de la fuente de verdad', () => {
    const ids = CARTAS_PRUEBA.map((c) => c.id)
    expect(ids.length).toBeGreaterThanOrEqual(45)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^PR-\d{3}$/)
  })

  it.each(CARTAS_PRUEBA.map((c) => [c.id, c.name, c] as const))('%s %s: validateCard sin errores', (_id, _name, carta) => {
    expect(validateCard(carta)).toEqual([])
  })

  it.each(CARTAS_PRUEBA.map((c) => [c.id, c.name, c] as const))('%s %s: respeta las reglas de configuración', (id, _name, carta) => {
    const efectos = efectosDe(carta)
    // El editor ofrece como máximo 3 efectos y UN efecto por tipo (usedTypes se filtra en EffectList)
    expect(efectos.length).toBeLessThanOrEqual(3)
    const tipos = efectos.map((e) => e.tipo)
    expect(new Set(tipos).size).toBe(tipos.length)
    for (const e of efectos) {
      expect(TIPOS_PERMITIDOS[carta.type], `${id}: tipo '${e.tipo}' no es de ${carta.type}`).toContain(e.tipo)
      if (e.trigger) expect(TRIGGERS_CARD_MAKER.has(e.trigger), `${id}: trigger '${e.trigger}'`).toBe(true)
      // Cada efecto se define por `efecto` o por `tramos` (Capa 3b)
      expect(e.efecto ?? (e.tramos?.length ? 'tramos' : undefined), `${id}: sin efecto ni tramos`).toBeDefined()
      if (e.efecto && !SOLO_A_MANO_MODIFICAR_REGLA.has(id)) {
        expect(EFECTOS_CARD_MAKER.has(e.efecto), `${id}: '${e.efecto}' no está en el desplegable del Card-Maker`).toBe(true)
      }
      for (const t of e.tramos ?? []) {
        expect(EFECTOS_CARD_MAKER.has(t.efecto)).toBe(true)
        expect(t.umbral).toBeGreaterThanOrEqual(1)
        expect(t.umbral).toBeLessThanOrEqual(e.costo?.cantidad ?? 0)
      }
      // Debuff con magnitudes POSITIVAS (convención del Card-Maker / sync-forge-to-engine)
      if (e.efecto === 'debuff') {
        expect(e.stats?.ATQ ?? 0).toBeGreaterThanOrEqual(0)
        expect(e.stats?.RES ?? 0).toBeGreaterThanOrEqual(0)
      }
      // copy: copyAttributes obligatorios; grant_keyword: keyword obligatoria; negar: tipoNegacion
      if (e.efecto === 'copy') expect(e.copyAttributes?.length).toBeGreaterThan(0)
      if (e.efecto === 'grant_keyword') expect(KEYWORDS as readonly string[]).toContain(e.keyword)
      if (e.efecto === 'negar') expect(e.tipoNegacion).toBeDefined()
      if (e.efecto === 'modificar_regla') expect(e.regla?.id).toBeDefined()
      if (e.efecto === 'invocar_y_equipar') expect(e.zonaOrigen).toBeDefined()
      // fix_exhaust solo sobre Campeones agotados (el editor fuerza el filtro)
      for (const t of e.tramos ?? []) if (t.efecto === 'fix_exhaust') expect(t.filtros?.agotado).toBe(true)
      // `texto` = lo que genera el Card-Maker (salvo los casos documentados arriba)
      if (!SOLO_A_MANO_MODIFICAR_REGLA.has(id) && !TEXTO_CORREGIDO_A_MANO.has(id)) {
        const { texto, ...sinTexto } = e
        expect(texto, `${id}: texto distinto de generateEffectText`).toBe(generateEffectText(sinTexto as EfectoData))
      }
      expect(e.texto && e.texto.length > 0).toBe(true)
    }
    for (const kw of carta.keywords) expect(KEYWORDS as readonly string[]).toContain(kw)
    // Campeón: sin Soberano/Emperador (exigen sacrificios y complican las escenas de prueba)
    if (carta.type === 'Campeón') expect(carta.roles?.some((r) => r === 'Soberano' || r === 'Emperador')).toBe(false)
  })

  it('el set arma un mazo válido de 66 cartas (15 Éter + 45 Principal + 6 Vínculos) y una partida real', () => {
    expect(() => validarDeck(mazoPrueba(), 'prueba')).not.toThrow()
    const { state } = crearPartidaPrueba(3)
    expect(state.fase).toBe('pre_partida')
    expect(state.players.A.mano).toHaveLength(5)
    expect(state.players.A.vinculos.filter(Boolean)).toHaveLength(6)
  })

  describe('script de sincronización (scripts/sync-forge-to-engine.ts --dry-run)', () => {
    const raiz = resolve(__dirname, '../../../..')
    const correr = (cartas: AnyCard[]) => {
      const dir = mkdtempSync(join(tmpdir(), 'cartas-prueba-'))
      try {
        const archivo = join(dir, 'export.json')
        writeFileSync(archivo, JSON.stringify(cartas), 'utf8')
        const r = spawnSync(
          process.execPath,
          [join(raiz, 'node_modules/tsx/dist/cli.mjs'), join(raiz, 'scripts/sync-forge-to-engine.ts'), archivo, '--dry-run'],
          { cwd: raiz, encoding: 'utf8' },
        )
        return { status: r.status, out: `${r.stdout}\n${r.stderr}` }
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    }

    it('acepta el set (sin modificar_regla) sin errores de validación', () => {
      const sinRegla = CARTAS_PRUEBA.filter((c) => !SOLO_A_MANO_MODIFICAR_REGLA.has(c.id))
      const r = correr(sinRegla)
      expect(r.out).not.toContain('ERRORES DE VALIDACIÓN')
      expect(r.status).toBe(0)
    }, 60_000)

    it('HUECO DE LA HERRAMIENTA: el script rechaza modificar_regla (falta en su lista EFECTO_ACCIONES)', () => {
      const r = correr(CARTAS_PRUEBA.filter((c) => SOLO_A_MANO_MODIFICAR_REGLA.has(c.id)))
      expect(r.status).toBe(1)
      expect(r.out).toContain('modificar_regla')
      expect(r.out).toContain('inválido')
    }, 60_000)
  })
})

/* ═══════════════════════════ (b) COBERTURA (coverageMap) ═══════════════════════════ */

/**
 * Huecos ya conocidos del mapa de cobertura (efecto del set → motivo). El test NO falla por ellos; falla si
 * aparece un hueco NUEVO (algo del set sin ejecutor que nadie anotó aquí).
 */
const HUECOS_CONOCIDOS: Record<string, string> = {
  'PR-021': 'negar en disparo trigger "ninguno" (Thane DS-014): executeEffect solo anula una activación pendiente de la cadena; el Disparo no apila nada que negar → no-op',
  'PR-022': 'copy al invocar (Marek DS-015): guarda copyTargetId pero copyActivo exige Éter bloqueado; el ATQ copiado nunca entra en statsDe → no-op',
  'PR-024': 'tramos (Cassandra FB-016): el mapa no modela efectos sin `efecto` raíz (HUECO_NOOP del mapa); el motor SÍ los ejecuta vía dispararUmbralBloqueo/ejecutarTramo (ver humo)',
  'PR-030': 'modificar_regla pasivo: el mapa no lo conoce (INTERPRETER_EXEC sin modificar_regla → HUECO_SIN_RUTA); el motor SÍ lo deriva en reglas.ts (ver humo) → falso hueco del MAPA',
}

describe('(b) cobertura — coverageMap sobre el set', () => {
  const reporte = buildReporte(CARTAS_PRUEBA)

  it('clasifica el 100% de los efectos del set (todo item con estado y ruta)', () => {
    expect(reporte.totalEfectos).toBeGreaterThan(0)
    expect(reporte.items.filter((i) => !i.estado || !i.ruta)).toEqual([])
    for (const c of CARTAS_PRUEBA.filter((c) => efectosDe(c).length > 0)) {
      expect(reporte.items.some((i) => i.cardId === c.id), c.id).toBe(true)
    }
  })

  it('los únicos efectos SIN ejecutor son los huecos conocidos (se imprime el reporte carta por carta)', () => {
    const sinEjecutor = reporte.items.filter((i) => !i.estado.startsWith('OK_'))
    const detalle = reporte.items.map((i) => `${i.estado.padEnd(15)} ${i.cardId} ${i.origen}/${i.tipo}/${i.trigger}/${i.efecto}`)
    console.log(`[cartasPrueba] cobertura ${pctOK(reporte)}% de ${reporte.totalEfectos} efectos\n${detalle.join('\n')}`)
    const nuevos = sinEjecutor.filter((i) => !(i.cardId in HUECOS_CONOCIDOS))
    expect(nuevos.map((i) => `${i.cardId}:${i.efecto}:${i.estado}`)).toEqual([])
    // Cada hueco conocido sigue siendo un hueco (si el mapa mejora, avisa para limpiar la lista)
    const conHueco = new Set(sinEjecutor.map((i) => i.cardId))
    for (const id of Object.keys(HUECOS_CONOCIDOS)) expect(conHueco.has(id), `${id} ya no es hueco: quitarlo de HUECOS_CONOCIDOS`).toBe(true)
  })

  it('HUECOS MOTOR vs CARD-MAKER: efectos que el desplegable ofrece y el motor no ejecuta (no hay carta del set que los pruebe: configurarlos no haría nada)', () => {
    // executeEffect (effectInterpreter.ts) tiene case para los de INTERPRETER_EXEC + modificar_regla; double_attack lo
    // lee combat.ts, prevent_destroy replacements.ts, negar y copy tienen tratamiento parcial (ver HUECOS_CONOCIDOS).
    const conEjecutor = new Set<string>([
      ...INTERPRETER_EXEC, ...SISTEMAS_EXTERNOS_JSON, 'modificar_regla', 'negar', 'copy',
    ])
    const sinEjecutor = [...EFECTOS_CARD_MAKER].filter((e) => !conEjecutor.has(e)).sort()
    // F9a cerró `invocar` y los `recuperar_*` (recuperar.test.ts), F9b `direct_attack` (ataqueDirecto.test.ts),
    // F9c `scry` (scry.test.ts); faltan los que salen de la lista conforme se implementen
    expect(sinEjecutor).toEqual([
      'change_type', 'fix_exhaust', /* solo funciona como TRAMO (ejecutarTramo), no como efecto raíz */
      'redirect',
    ])
  })

  it('cada trigger configurable del Card-Maker aparece al menos una vez en el set (salvo los sin dispatch)', () => {
    const usados = new Set(CARTAS_PRUEBA.flatMap((c) => efectosDe(c).map((e) => e.trigger).filter(Boolean)))
    const sinCubrir = ['al_ser_destruido_vinculo'] // sin carta real ni dispatch con efecto: ningún Vínculo lo usa aún
    for (const t of TRIGGERS_CARD_MAKER) {
      if (sinCubrir.includes(t)) continue
      expect(usados.has(t as EfectoData['trigger']), `trigger ${t} sin carta de prueba`).toBe(true)
    }
  })
})

/* ═══════════════════════════ (c) HUMO DIRECTO (applyAction) ═══════════════════════════ */

const tipos = (s: GameState, j: 'A' | 'B') => [...new Set(getValidActions(s, j).map((a) => a.type))].sort()
const evs = (ctx: Ctx, tipo: string) => ctx.events.filter((e) => e.type === tipo)
const idx = (ctx: Ctx, tipo: string, pred: (e: any) => boolean = () => true) => ctx.events.findIndex((e) => e.type === tipo && pred(e))

/** Escena base: A (turno, Forja) y B con mazo. */
function base(fase: GameState['fase'] = 'forja'): GameState {
  const s = escenaVacia(fase)
  conMazo(s, 'A')
  conMazo(s, 'B')
  return s
}

describe('(c) humo — triggers con objetivo elegido ANTES de la ventana (F5d-1)', () => {
  it('PR-013 al_invocar (objetivo rival): la elección va antes de abrir la ventana; el debuff cae sobre el elegido', () => {
    const s0 = base()
    conMano(s0, 'A', 'her', PR.HERALDO_HOSTIL)
    const pago = conEteres(s0, 'A', 2)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conCampeon(s0, 'B', 'b1', PR.PEON, 1)
    conMano(s0, 'B', 'pre', PR.PRESTEZA_ROBA) // con Presteza pagable la ventana SÍ se abriría
    conEteres(s0, 'B', 1)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_campeon', cardInstanceId: 'her', slot: 0, eterIds: pago, sacrificios: [] }, ctx)

    expect(s.cadena).toBeUndefined() // la ventana NO se abrió todavía
    expect(s.declaracionEnEleccion).toMatchObject({ tipo: 'invocacion', cardInstanceId: 'her', pendientes: 1 })
    expect(s.objetivosPendientes?.[0]).toMatchObject({ jugador: 'A', instId: 'her', trigger: 'al-invocar' })
    expect(s.objetivosPendientes?.[0].opciones.sort()).toEqual(['b0', 'b1'])
    expect(tipos(s, 'A')).toEqual(['elegir_objetivo', 'rendirse'])
    expect(applyAction(s, { type: 'pasar_turno' }, ctx).ok).toBe(false)

    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b1' }, ctx)
    expect(s.declaracionEnEleccion).toBeUndefined()
    expect(s.cadena).toMatchObject({ origen: 'global', prioridad: 'B' }) // recién ahora se abre la ventana
    expect(s.cadena?.efectoActual?.cardInstanceId).toBe('her')
    // F5d-4: al-invocar se APILA — el debuff cae al resolver la cadena, no al elegir
    expect(s.cadena?.triggers).toHaveLength(1)
    expect(statsDe(s, 'b1').poder).toBe(2)
    s = aplicar(s, { type: 'pasar_prioridad' }, ctx)
    s = aplicar(s, { type: 'pasar_prioridad' }, ctx)
    expect(s.cadena).toBeUndefined()
    expect(statsDe(s, 'b1').poder).toBe(0) // 2 - 2
    expect(statsDe(s, 'b0').poder).toBe(2)
  })

  it('PR-014 al_invocar (objetivo propio): las opciones son SOLO Campeones propios, incluido el recién invocado', () => {
    const s0 = base()
    conMano(s0, 'A', 'her', PR.HERALDO_ALIADO)
    const pago = conEteres(s0, 'A', 2)
    conCampeon(s0, 'A', 'a1', PR.PEON, 0)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_campeon', cardInstanceId: 'her', slot: 2, eterIds: pago, sacrificios: [] }, ctx)
    expect(s.objetivosPendientes?.[0].opciones.sort()).toEqual(['a1', 'her'])
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'a1' }, ctx)
    expect(statsDe(s, 'a1').poder).toBe(4) // 2 + 2
    expect(statsDe(s, 'her').poder).toBe(3)
    expect(s.cadena).toBeUndefined() // el rival no puede responder: gate cerrado
  })

  it('PR-002 al_pagar_eter (Éter con objetivo): el gatillo arma la elección de la acción y se resuelve antes de la ventana', () => {
    const s0 = base()
    conMano(s0, 'A', 'p', PR.PEON)
    inst(s0, 'eter-A-0', PR.ETER_BUFF, 'A')
    s0.players.A.eterReserva.push('eter-A-0')
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_campeon', cardInstanceId: 'p', slot: 1, eterIds: ['eter-A-0'], sacrificios: [] }, ctx)
    expect(s.objetivosPendientes?.[0]).toMatchObject({ jugador: 'A', trigger: 'al-pagar-eter', opciones: ['a0'] })
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'a0' }, ctx)
    expect(statsDe(s, 'a0').poder).toBe(3)
  })

  it('PR-045 al_jugar_mistica (Mística con trigger): se dispara al declarar, con objetivo elegido; la Mística de un solo uso va al Cementerio', () => {
    const s0 = base()
    conMano(s0, 'A', 'avi', PR.AVISO)
    const pago = conEteres(s0, 'A', 1)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conCampeon(s0, 'B', 'b1', PR.PEON, 1)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'avi', slot: 0, eterIds: pago }, ctx)
    expect(s.objetivosPendientes?.[0]).toMatchObject({ jugador: 'A', instId: 'avi', trigger: 'al-jugar-mistica' })
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx)
    expect(statsDe(s, 'b0').poder).toBe(1)
    expect(statsDe(s, 'b1').poder).toBe(2)
    expect(s.players.A.cementerio).toContain('avi')
    expect(s.players.A.campo.misticasTacticas[0]).toBeNull()
  })

  it('PR-015 al_atacar: el ataque espera la elección y recién entonces el defensor puede responder', () => {
    const s0 = base('choque')
    conCampeon(s0, 'A', 'hos', PR.HOSTIGADOR, 0)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conCampeon(s0, 'B', 'b1', PR.PEON, 1)
    conArcana(s0, 'B', 'tr', PR.TRAMPA, 0) // da al defensor una respuesta en campo → la ventana se abriría
    conEteres(s0, 'B', 2) // F5e: responder con la Arcana la paga (coste 2)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'declarar_ataque', atacanteIds: ['hos'] }, ctx)
    expect(s.cadena).toBeUndefined()
    expect(s.declaracionEnEleccion).toMatchObject({ tipo: 'ataque', pendientes: 1 })
    expect(s.objetivosPendientes?.[0].opciones.sort()).toEqual(['b0', 'b1'])
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx)
    // F5d-5: al-atacar se APILA — el debuff cae al resolver la cadena, no al elegir
    expect(statsDe(s, 'b0').poder).toBe(2)
    expect(s.cadena).toMatchObject({ origen: 'combate', prioridad: 'B' })
    expect(s.cadena?.triggers).toHaveLength(1)
    s = aplicar(s, { type: 'pasar_prioridad' }, ctx)
    s = aplicar(s, { type: 'pasar_prioridad' }, ctx)
    expect(s.cadena).toBeUndefined()
    expect(statsDe(s, 'b0').poder).toBe(1)
  })

  it('PR-016 al_matar_en_combate (objetivo Éter rival): tras el daño el asesino elige el Éter y se mueve a la zona de pago', () => {
    const s0 = base('choque')
    conCampeon(s0, 'A', 'cos', PR.COSECHADORA, 0)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    const eteresB = conEteres(s0, 'B', 3)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'declarar_ataque', atacanteIds: ['cos'] }, ctx)
    s = aplicar(s, { type: 'declarar_bloqueo', asignaciones: { cos: 'b0' } }, ctx)
    expect(s.players.B.cementerio).toContain('b0') // 4 ATQ >= 2 RES
    expect(s.players.A.campo.campeones[0]).toBe('cos') // 2 ATQ < 3 RES: sobrevive
    expect(s.objetivosPendientes?.[0]).toMatchObject({ jugador: 'A', instId: 'cos', trigger: 'al-matar-en-combate' })
    expect([...(s.objetivosPendientes?.[0].opciones ?? [])].sort()).toEqual([...eteresB].sort())
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: eteresB[1] }, ctx)
    expect(s.players.B.eterPagado).toEqual([eteresB[1]])
    expect(s.players.B.eterReserva).toHaveLength(2)
  })

  it('PR-017 al_ser_enviado_al_cementerio (tutor) al DESCARTAR en Ocaso: el dueño activo elige y la carta vuelve a la mano', () => {
    const s0 = base('ocaso')
    conMano(s0, 'A', 'uv', PR.ULTIMA_VOLUNTAD)
    enCementerio(s0, 'A', 'vieja', PR.PEON)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'descartar_carta', cardInstanceIds: ['uv'] }, ctx)
    expect(s.objetivosPendientes?.[0]).toMatchObject({ jugador: 'A', instId: 'uv', trigger: 'al-ser-enviado-al-cementerio' })
    expect(s.objetivosPendientes?.[0].opciones.sort()).toEqual(['uv', 'vieja'])
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'vieja' }, ctx)
    expect(s.players.A.mano).toContain('vieja')
    expect(s.players.A.cementerio).not.toContain('vieja')
  })

  it('PR-019 inicio_alba (Campeón): al comenzar su turno el dueño elige a quién buffear', () => {
    const s0 = base('ocaso')
    s0.turno = 'B' // termina el turno de B → Alba de A
    conCampeon(s0, 'A', 'v', PR.VIGIA_ALBA, 0)
    conCampeon(s0, 'A', 'a1', PR.PEON, 1)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'pasar_turno' }, ctx)
    expect(s.turno).toBe('A')
    expect(s.objetivosPendientes?.[0]).toMatchObject({ jugador: 'A', instId: 'v', trigger: 'al-inicio-alba' })
    expect(getValidActions(s, 'A').some((a) => a.type === 'elegir_objetivo')).toBe(true)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'a1' }, ctx)
    expect(statsDe(s, 'a1').poder).toBe(3)
  })

  it('PR-070 inicio_alba (Vínculo destruido, objetivo en el Cementerio): rescata al caído a la mano', () => {
    const s0 = base('ocaso')
    s0.turno = 'B'
    conVinculo(s0, 'A', 'vr', PR.VINC_RETORNO, 0, true) // §5.5: solo el Vínculo destruido tiene efecto vigente
    enCementerio(s0, 'A', 'caido', PR.PEON)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'pasar_turno' }, ctx)
    expect(s.objetivosPendientes?.[0]).toMatchObject({ jugador: 'A', instId: 'vr', opciones: ['caido'] })
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'caido' }, ctx)
    expect(s.players.A.mano).toContain('caido')
  })

  it('PR-020 + PR-006 inicio_choque (Campeón y Éter en Reserva): ambos arman su elección al entrar al Choque', () => {
    const s0 = base()
    conCampeon(s0, 'A', 'vc', PR.VIGIA_CHOQUE, 0)
    conEteres(s0, 'A', 1, PR.ETER_CHOQUE) // 'eter-A-0'
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'pasar_turno' }, ctx)
    expect(s.fase).toBe('choque')
    const pend = s.objetivosPendientes ?? []
    expect(pend.map((p) => p.instId).sort()).toEqual(['eter-A-0', 'vc'])
    // el orden de resolución es el de dispararTrigger (ids ordenados): primero el Éter, luego el Campeón
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'vc' }, ctx) // Éter: Carga al Campeón propio
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx) // Campeón: debuff al rival
    expect(keywordsDe(s, 'vc')).toContain('Carga')
    expect(statsDe(s, 'b0').poder).toBe(1)
  })

  it('PR-072 inicio_choque (Vínculo con controladorTrigger rival): se dispara en el Choque del rival', () => {
    const s0 = base()
    conVinculo(s0, 'B', 'vcb', PR.VINC_CHOQUE, 0, true)
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    const ctx = crearCtx()
    const s = aplicar(s0, { type: 'pasar_turno' }, ctx) // A entra a su Choque
    expect(s.objetivosPendientes?.[0]).toMatchObject({ instId: 'vcb', trigger: 'al-inicio-choque' })
  })
})

describe('(c) humo — Místicas, respuestas Presteza y pila LIFO (F5b)', () => {
  /** A juega Rayo (PR-040) contra un único objetivo; B tiene `respuesta` en mano con el Éter justo. */
  function rayoVsPresteza(respuesta: string, eteresB: number): { s: GameState; ctx: Ctx } {
    const s0 = base()
    conMano(s0, 'A', 'rayo', PR.RAYO)
    const pago = conEteres(s0, 'A', 2)
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conMano(s0, 'B', 'resp', respuesta)
    conEteres(s0, 'B', eteresB)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'rayo', slot: 0, eterIds: pago }, ctx)
    // Objetivo elegido ANTES de abrir la ventana
    expect(s.cadena).toBeUndefined()
    expect(s.declaracionEnEleccion).toMatchObject({ tipo: 'opener' })
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx)
    expect(s.cadena?.opener).toMatchObject({ tipo: 'mistica', cardInstanceId: 'rayo', objetivos: { 0: 'b0' } })
    return { s, ctx }
  }
  const responder = (s: GameState, ctx: Ctx, cardId: string) =>
    aplicar(s, { type: 'jugar_respuesta', cardInstanceId: 'resp', eterIds: etersParaPagar(s, 'B', cardId)! }, ctx)
  const cerrar = (s: GameState, ctx: Ctx) => aplicar(aplicar(s, { type: 'pasar_prioridad' }, ctx), { type: 'pasar_prioridad' }, ctx)

  it('PR-040 + PR-041 (Presteza sin objetivo): la respuesta resuelve PRIMERO y el Rayo ÚLTIMO (LIFO)', () => {
    const { s: s1, ctx } = rayoVsPresteza(PR.PRESTEZA_ROBA, 1)
    let s = responder(s1, ctx, PR.PRESTEZA_ROBA)
    s = cerrar(s, ctx)
    expect(s.cadena).toBeUndefined()
    const robo = idx(ctx, 'carta_robada', (e) => e.jugador === 'B')
    const destruccion = idx(ctx, 'destruccion', (e) => e.cardInstanceId === 'b0')
    expect(robo).toBeGreaterThanOrEqual(0)
    expect(destruccion).toBeGreaterThan(robo)
    expect(s.players.B.cementerio).toEqual(expect.arrayContaining(['b0', 'resp']))
    expect(s.players.A.cementerio).toContain('rayo')
  })

  it('PR-044 Marcha (negar activación): niega el Rayo; el objetivo sobrevive y el pago del Rayo no se devuelve', () => {
    const { s: s1, ctx } = rayoVsPresteza(PR.MARCHA, 2)
    let s = responder(s1, ctx, PR.MARCHA)
    s = cerrar(s, ctx)
    expect(evs(ctx, 'activacion_negada')).toHaveLength(1)
    expect(s.players.B.campo.campeones[0]).toBe('b0')
    expect(s.players.A.cementerio).toContain('rayo')
    expect(s.players.A.eterPagado).toHaveLength(2)
    expect(s.players.B.cementerio).toContain('resp')
  })

  it('PR-046 al_resolver_cadena (Mística Presteza): su efecto llega al resolverse la cadena, antes que el Rayo', () => {
    const { s: s1, ctx } = rayoVsPresteza(PR.ECO, 1)
    let s = responder(s1, ctx, PR.ECO)
    s = cerrar(s, ctx)
    const robo = idx(ctx, 'carta_robada', (e) => e.jugador === 'B')
    expect(robo).toBeGreaterThanOrEqual(0)
    expect(idx(ctx, 'destruccion', (e) => e.cardInstanceId === 'b0')).toBeGreaterThan(robo)
    expect(s.players.B.cementerio).toContain('resp')
  })

  it('PR-043 Fugaz (buff a un Campeón propio): con objetivo elegido el efecto resuelve y la Mística de un solo uso va al Cementerio', () => {
    const s0 = base()
    conMano(s0, 'A', 'fug', PR.FUGAZ)
    const pago = conEteres(s0, 'A', 1)
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'fug', slot: 0, eterIds: pago }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'a0' }, ctx)
    expect(statsDe(s, 'a0').poder).toBe(4)
    expect(s.players.A.cementerio).toContain('fug')
    // (que Fugaz NO abra ventana ante una Presteza rival se verifica en H10b)
  })

  it('PR-062 Arcana respondible en cadena de combate: el bloqueo abre ventana ANTES del daño y la respuesta altera el resultado (F5c)', () => {
    const escena = (conTrampa: boolean) => {
      const s = base('choque')
      conCampeon(s, 'A', 'a0', PR.PEON, 0)
      conCampeon(s, 'B', 'b0', PR.PEON, 0)
      if (conTrampa) {
        conArcana(s, 'B', 'tr', PR.TRAMPA, 0)
        conEteres(s, 'B', 2) // F5e: responder con la Arcana la paga (coste 2)
      }
      return s
    }
    // Control: sin respuesta, 2/2 contra 2/2 → mueren los dos
    {
      const ctx = crearCtx()
      let s = aplicar(escena(false), { type: 'declarar_ataque', atacanteIds: ['a0'] }, ctx)
      s = aplicar(s, { type: 'declarar_bloqueo', asignaciones: { a0: 'b0' } }, ctx)
      expect(s.players.A.cementerio).toContain('a0')
      expect(s.players.B.cementerio).toContain('b0')
    }
    // Con la Trampa del defensor: la respondida baja 3 ATQ a toda la hueste atacante ANTES del daño
    const ctx = crearCtx()
    let s = aplicar(escena(true), { type: 'declarar_ataque', atacanteIds: ['a0'] }, ctx)
    expect(s.cadena).toMatchObject({ origen: 'combate', prioridad: 'B' }) // ventana del ataque
    s = cerrar(s, ctx)
    s = aplicar(s, { type: 'declarar_bloqueo', asignaciones: { a0: 'b0' } }, ctx)
    expect(s.cadena).toMatchObject({ origen: 'combate', prioridad: 'B' }) // ventana del bloqueo
    expect(s.combate?.danoPendiente).toBe(true)
    expect(s.players.A.cementerio).not.toContain('a0') // el daño NO se resolvió todavía
    expect(respondiblesDe(s, 'B')).toEqual(['tr'])
    s = aplicar(s, { type: 'responder_cadena', cardInstanceId: 'tr' }, ctx)
    s = cerrar(s, ctx)
    expect(s.players.B.campo.campeones[0]).toBe('b0') // el bloqueador sobrevive: ATQ del atacante 2-3 → 0
    expect(s.players.A.cementerio).toContain('a0') // el atacante muere (2 ATQ >= 2 RES)
    expect(s.players.B.cementerio).toContain('tr')
    expect(evs(ctx, 'carta_muerta').map((e: any) => e.cardInstanceId)).toEqual(['a0'])
  })

  it('PR-054 Presteza sin elección (todos_campeones_rivales): se juega como respuesta desde la mano y debilita a toda la hueste', () => {
    const s0 = base()
    conMano(s0, 'A', 'rayo', PR.RAYO)
    const pago = conEteres(s0, 'A', 2)
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    conCampeon(s0, 'A', 'a1', PR.PEON, 1)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conMano(s0, 'B', 'resp', PR.NIEBLA)
    conEteres(s0, 'B', 1)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'rayo', slot: 0, eterIds: pago }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx)
    s = responder(s, ctx, PR.NIEBLA)
    s = cerrar(s, ctx)
    expect(statsDe(s, 'a0').poder).toBe(0)
    expect(statsDe(s, 'a1').poder).toBe(0)
  })
})

/** A juega Rayo (PR-040) contra b0; B tiene `respuesta` en mano con el Éter justo. */
function rayoVs(respuesta: string, eteresB: number): { s: GameState; ctx: Ctx } {
  const s0 = base()
  conMano(s0, 'A', 'rayo', PR.RAYO)
  const pago = conEteres(s0, 'A', 2)
  conCampeon(s0, 'A', 'a0', PR.PEON, 0)
  conCampeon(s0, 'B', 'b0', PR.PEON, 0)
  conMano(s0, 'B', 'resp', respuesta)
  conEteres(s0, 'B', eteresB)
  const ctx = crearCtx()
  let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'rayo', slot: 0, eterIds: pago }, ctx)
  s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx)
  return { s, ctx }
}
const cerrarCadena = (s: GameState, ctx: Ctx) => aplicar(aplicar(s, { type: 'pasar_prioridad' }, ctx), { type: 'pasar_prioridad' }, ctx)

describe('(c) humo — respuestas con objetivo, Arcanas y velocidad (F5e; antes hallazgos H1, H2, H3, H10 y H11)', () => {
  // H1 ────────────────────────────────────────────────────────────────────────────────────────
  it('H1 PR-042 Presteza CON objetivo: elige el objetivo AL RESPONDER (decisión 8, estilo Yugioh), antes de entrar a la pila, y debilita al elegido', () => {
    const { s: s1, ctx } = rayoVs(PR.PRESTEZA_DEBIL, 1)
    let s = aplicar(s1, { type: 'jugar_respuesta', cardInstanceId: 'resp', eterIds: etersParaPagar(s1, 'B', PR.PRESTEZA_DEBIL)! }, ctx)
    // la respuesta ya pagó y salió de la mano, pero NO entró a la pila: espera su objetivo
    expect(s.players.B.eterPagado).toHaveLength(1)
    expect(s.players.B.mano).not.toContain('resp')
    expect(s.cadena?.pila).toEqual([])
    expect(s.declaracionEnEleccion).toMatchObject({ tipo: 'respuesta', jugador: 'B', pendientes: 1, respuesta: { jugador: 'B', cardInstanceId: 'resp', origen: 'mano' } })
    expect(s.objetivosPendientes?.[0]).toMatchObject({ jugador: 'B', instId: 'resp', opciones: ['a0'], opener: { efectoIdx: 0 } })
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'a0' }, ctx)
    // recién ahora entra a la pila con el objetivo fijado y la prioridad alterna
    expect(s.declaracionEnEleccion).toBeUndefined()
    expect(s.cadena).toMatchObject({ pila: ['resp'], prioridad: 'A', pasesConsecutivos: 0, respuestas: { resp: { jugador: 'B', origen: 'mano', objetivos: { 0: 'a0' } } } })
    expect(s.objetivosPendientes ?? []).toHaveLength(0)
    s = cerrarCadena(s, ctx)
    expect(statsDe(s, 'a0').poder).toBe(0)
    expect(s.players.B.cementerio).toEqual(expect.arrayContaining(['resp', 'b0']))
    expect(s.objetivosPendientes ?? []).toHaveLength(0)
  })

  // H2 ────────────────────────────────────────────────────────────────────────────────────────
  it('H2 PR-028 Campeón con Disparo respondible (trigger al_resolver_cadena): elige su objetivo al responder y lo aplica al resolver', () => {
    const s0 = base()
    conMano(s0, 'A', 'rayo', PR.RAYO)
    const pago = conEteres(s0, 'A', 2)
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conCampeon(s0, 'B', 'rea', PR.REACTIVO, 1)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'rayo', slot: 0, eterIds: pago }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx)
    expect(respondiblesDe(s, 'B')).toEqual(['rea'])
    s = aplicar(s, { type: 'responder_cadena', cardInstanceId: 'rea' }, ctx)
    expect(s.declaracionEnEleccion).toMatchObject({ tipo: 'respuesta', respuesta: { cardInstanceId: 'rea', origen: 'campo' } })
    expect(s.objetivosPendientes?.[0]).toMatchObject({ jugador: 'B', instId: 'rea', trigger: 'al-resolver-cadena', opciones: ['a0'] })
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'a0' }, ctx)
    expect(s.cadena?.pila).toEqual(['rea'])
    expect(statsDe(s, 'a0').poder).toBe(2) // aún no resolvió
    s = cerrarCadena(s, ctx)
    expect(statsDe(s, 'a0').poder).toBe(0) // 2 - 2
    expect(s.players.B.campo.campeones[1]).toBe('rea') // el Campeón permanece en el campo
    expect(s.objetivosPendientes ?? []).toHaveLength(0)
  })

  // H3 ────────────────────────────────────────────────────────────────────────────────────────
  it('H3 PR-060 Arcana respondida en cadena global: PAGA su coste al responder, ejecuta su recompensa al resolver y va a 2G', () => {
    const s0 = base()
    conMano(s0, 'A', 'rayo', PR.RAYO)
    const pago = conEteres(s0, 'A', 2)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conArcana(s0, 'B', 'pacto', PR.PACTO, 0)
    conMano(s0, 'B', 'relleno', PR.PEON) // F5f: PR-060 exige ≥1 carta en mano para activarse (también al responder)
    conEteres(s0, 'B', 2)
    conMazo(s0, 'B', 4)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'rayo', slot: 0, eterIds: pago }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx)
    const manoAntes = s.players.B.mano.length
    s = aplicar(s, { type: 'responder_cadena', cardInstanceId: 'pacto' }, ctx)
    // pagó (sin elección de objetivo: entra de inmediato) y se reveló
    expect(s.players.B.eterPagado).toHaveLength(2)
    expect(s.players.B.eterReserva).toHaveLength(0)
    expect(s.instances['pacto'].bocaArriba).toBe(true)
    expect(evs(ctx, 'carta_activada')).toHaveLength(1)
    expect(s.cadena?.pila).toEqual(['pacto'])
    expect(s.players.B.mano.length).toBe(manoAntes) // la recompensa aún no resuelve
    s = cerrarCadena(s, ctx)
    expect(s.players.B.cementerio).toContain('pacto')
    expect(s.players.B.campo.arcanasCombate[0]).toBeNull()
    expect(s.players.B.mano.length).toBe(manoAntes + 2) // roba 2
  })

  // H10 ───────────────────────────────────────────────────────────────────────────────────────
  it('H10 velocidad: keywordsDe/velocidadDe leen las keywords del meta de CUALQUIER tipo de carta (Místicas y Arcanas incluidas)', () => {
    const s = base()
    conMistica(s, 'A', 'fug', PR.FUGAZ, 0)
    conMistica(s, 'A', 'pre', PR.PRESTEZA_ROBA, 1)
    conMistica(s, 'A', 'nor', PR.RAYO, 2)
    conArcana(s, 'A', 'arc', PR.PACTO, 0)
    expect(keywordsDe(s, 'fug')).toContain('Fugaz')
    expect(keywordsDe(s, 'pre')).toContain('Presteza')
    expect([velocidadDe(s, 'fug'), velocidadDe(s, 'pre'), velocidadDe(s, 'nor'), velocidadDe(s, 'arc')]).toEqual(['fugaz', 'presteza', 'normal', 'normal'])
  })

  it('H10b PR-043 Fugaz: no abre ventana aunque el rival tenga una Presteza pagable (el efecto es inmediato)', () => {
    const s0 = base()
    conMano(s0, 'A', 'fug', PR.FUGAZ)
    const pago = conEteres(s0, 'A', 1)
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    conMano(s0, 'B', 'pre', PR.PRESTEZA_ROBA)
    conEteres(s0, 'B', 1)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'fug', slot: 0, eterIds: pago }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'a0' }, ctx)
    expect(s.cadena).toBeUndefined()
    expect(statsDe(s, 'a0').poder).toBe(4)
    expect(s.players.A.cementerio).toContain('fug')
  })

  it('H10c Presteza: tras una respuesta Presteza solo pueden responder Presteza/Fugaz (una Arcana normal no)', () => {
    const { s: s1, ctx } = rayoVs(PR.PRESTEZA_ROBA, 1)
    conArcana(s1, 'A', 'arc', PR.PACTO, 0) // Arcana normal de A, colocada en un turno anterior
    conMano(s1, 'A', 'relleno', PR.PEON) // cumple la condición de PR-060 (≥1 carta en mano): solo la velocidad la deja fuera
    conEteres(s1, 'A', 2)
    const s = aplicar(s1, { type: 'jugar_respuesta', cardInstanceId: 'resp', eterIds: etersParaPagar(s1, 'B', PR.PRESTEZA_ROBA)! }, ctx)
    expect(s.cadena).toMatchObject({ pila: ['resp'], prioridad: 'A' })
    expect(respondiblesDe(s, 'A')).toEqual([])
    expect(applyAction(s, { type: 'responder_cadena', cardInstanceId: 'arc' }, ctx).ok).toBe(false)
  })

  // H11 ───────────────────────────────────────────────────────────────────────────────────────
  it('H11 PR-041 Presteza jugada como respuesta DENTRO DE UN COMBATE: se paga, resuelve su efecto y termina en el Cementerio', () => {
    const s0 = base('choque')
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conMano(s0, 'B', 'resp', PR.PRESTEZA_ROBA)
    conEteres(s0, 'B', 1)
    conMazo(s0, 'B', 3)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'declarar_ataque', atacanteIds: ['a0'] }, ctx)
    expect(s.cadena).toMatchObject({ origen: 'combate', prioridad: 'B' }) // el gate cuenta la Presteza de la mano
    s = aplicar(s, { type: 'jugar_respuesta', cardInstanceId: 'resp', eterIds: etersParaPagar(s, 'B', PR.PRESTEZA_ROBA)! }, ctx)
    s = cerrarCadena(s, ctx)
    expect(s.cadena).toBeUndefined()
    expect(s.players.B.eterPagado).toHaveLength(1) // pagó
    expect(s.players.B.mano).not.toContain('resp') // salió de la mano...
    expect(s.players.B.cementerio).toContain('resp') // ...y está en el Cementerio
    expect(evs(ctx, 'carta_robada')).toHaveLength(1) // ...tras resolver su efecto
    expect(s.combate?.paso).toBe('bloqueo') // el combate se reanuda
  })
})

describe('(c) humo — HALLAZGOS (el motor actual no cumple el texto o la decisión de diseño; it.fails = pasa mientras siga fallando)', () => {

  // H4 / H4b: RESUELTOS (el dueño ajeno al turno elige de inmediato) — ver electorAjeno.test.ts

  // H5: RESUELTO en F7 (punto de control único del Exilio) — ver exilio.test.ts. Se deja aquí como prueba de humo.
  it('H5 PR-012 Inexiliable + PR-051 Destierro: la keyword Inexiliable (regla puedeSerExiliada=false) debería impedir el exilio', () => {
    const s0 = base()
    conMano(s0, 'A', 'des', PR.DESTIERRO)
    const pago = conEteres(s0, 'A', 2)
    conCampeon(s0, 'B', 'int', PR.INTOCABLE, 0)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'des', slot: 0, eterIds: pago }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'int' }, ctx)
    expect(s.players.B.campo.campeones[0]).toBe('int')
    expect(s.players.B.exilio).not.toContain('int')
  })

  // H6 ────────────────────────────────────────────────────────────────────────────────────────
  it.fails('H6 PR-053 Decreto (modificar_regla limiteMano +2): con la regla vigente en 8, pasar el turno con 7 cartas debería ser legal', () => {
    const s0 = base('forja')
    conMano(s0, 'A', 'dec', PR.DECRETO)
    const pago = conEteres(s0, 'A', 1)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'dec', slot: 0, eterIds: pago }, ctx)
    expect(reglaNumero(s, 'limiteMano', { jugador: 'A' })).toBe(8) // la regla SÍ se modifica (reglas.ts)
    s.fase = 'ocaso'
    for (let i = 0; i < 7; i++) conMano(s, 'A', `m${i}`, PR.PEON)
    // validarPasarTurno (partida.ts) compara contra el literal 6, no contra reglaNumero('limiteMano')
    expect(applyAction(s, { type: 'pasar_turno' }, ctx).ok).toBe(true)
  })

  // H7 ────────────────────────────────────────────────────────────────────────────────────────
  it.fails('H7 Protector + filtro: PR-040 Rayo (RES 3 o menos) no debería poder elegir a un Protector de RES 4', () => {
    const s0 = base()
    conMano(s0, 'A', 'rayo', PR.RAYO)
    const pago = conEteres(s0, 'A', 2)
    conCampeon(s0, 'B', 'esc', PR.ESCUDO, 0) // Protector, RES 4
    conCampeon(s0, 'B', 'b1', PR.PEON, 1) // RES 2: el único válido por el filtro, pero Protector manda
    const ctx = crearCtx()
    const s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'rayo', slot: 0, eterIds: pago }, ctx)
    // resolveTargets devuelve a los Protectores ANTES de aplicar filtros → el objetivo ilegal queda en las opciones
    const opciones = s.objetivosPendientes?.[0]?.opciones ?? []
    expect(opciones).not.toContain('esc')
  })

  // H8 ────────────────────────────────────────────────────────────────────────────────────────
  it.fails('H8 PR-022 copy al invocar (Marek DS-015): el Imitador debería quedar con el ATQ copiado hasta el final del turno', () => {
    const s0 = base()
    conMano(s0, 'A', 'imi', PR.IMITADOR)
    const pago = conEteres(s0, 'A', 3)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0, { poder: 6 })
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_campeon', cardInstanceId: 'imi', slot: 0, eterIds: pago, sacrificios: [] }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx)
    expect(s.instances['imi'].copyTargetId).toBe('b0') // lo único que hace el motor
    expect(statsDe(s, 'imi').poder).toBe(6)
  })

  it('H8b PR-021 negar en Disparo (Thane DS-014): paga y agota, pero no existe nada que negar → no-op', () => {
    const s0 = base()
    conCampeon(s0, 'A', 'esc', PR.ESCUDO, 0)
    conEteres(s0, 'A', 3)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conCampeon(s0, 'B', 'b1', PR.PEON, 1) // dos objetivos si Protector no mandara; el Escudo es del lado A
    const ctx = crearCtx()
    const s = aplicar(s0, { type: 'activar_habilidad', cardInstanceId: 'esc', eterIds: s0.players.A.eterReserva.slice(0, 3) }, ctx)
    expect(s.players.A.eterPagado).toHaveLength(3)
    expect(evs(ctx, 'activacion_negada')).toHaveLength(0)
    expect(s.instances['b0'].agotado).toBeUndefined()
    expect(s.objetivosPendientes ?? []).toHaveLength(0)
  })

  // H9 ────────────────────────────────────────────────────────────────────────────────────────
  it('H9 PR-027 Disparo con costo de Éter: el coste se paga al activar y se VUELVE a exigir en la Reserva al resolver (sin Éter de sobra, fizzle)', () => {
    const s0 = base()
    conCampeon(s0, 'A', 'ver', PR.VERDUGO, 0)
    const eteres = conEteres(s0, 'A', 2) // justo el costo
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conCampeon(s0, 'B', 'b1', PR.PEON, 1)
    const ctx = crearCtx()
    const s = aplicar(s0, { type: 'activar_habilidad', cardInstanceId: 'ver', eterIds: eteres }, ctx)
    expect(s.players.A.eterPagado).toHaveLength(2) // se pagó...
    expect(s.objetivosPendientes ?? []).toHaveLength(0) // ...pero el efecto no resolvió: validateCost mira la Reserva (vacía)
    expect(s.players.B.cementerio).toHaveLength(0)
  })

  it.fails('H9b (esperado) el Disparo pagado con su costo exacto debería resolver y destruir', () => {
    const s0 = base()
    conCampeon(s0, 'A', 'ver', PR.VERDUGO, 0)
    const eteres = conEteres(s0, 'A', 2)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    const ctx = crearCtx()
    const s = aplicar(s0, { type: 'activar_habilidad', cardInstanceId: 'ver', eterIds: eteres }, ctx)
    expect(s.players.B.cementerio).toContain('b0')
  })
})

describe('(c) humo — habilidades, Disparos y Éter bloqueado', () => {
  it('PR-011 Tirador vs PR-027: el Disparo de Tirador no agota; el normal sí; ambos con Éter pagado a 1A', () => {
    const s0 = base()
    conCampeon(s0, 'A', 'tir', PR.TIRADORA, 0)
    conCampeon(s0, 'A', 'ver', PR.VERDUGO, 1)
    const eteres = conEteres(s0, 'A', 5) // 1 + 2 pagados y 2 de sobra: ver H9 (el coste se valida otra vez al resolver)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conCampeon(s0, 'B', 'b1', PR.PEON, 1)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'activar_habilidad', cardInstanceId: 'tir', eterIds: [eteres[0]] }, ctx)
    expect(s.players.A.mano).toHaveLength(1) // roba 1 (sin ventana: el rival no tiene respuestas)
    expect(s.instances['tir'].agotado).toBeFalsy() // Tirador: disparoAgota prohibido
    s = aplicar(s, { type: 'activar_habilidad', cardInstanceId: 'ver', eterIds: [eteres[1], eteres[2]] }, ctx)
    expect(s.instances['ver'].agotado).toBe(true) // regla base: el Disparo agota
    expect(s.objetivosPendientes?.[0]).toMatchObject({ jugador: 'A', instId: 'ver' })
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b1' }, ctx)
    expect(s.players.B.cementerio).toContain('b1')
    expect(s.players.B.campo.campeones[0]).toBe('b0')
  })

  it('PR-018 al_activar_habilidad: aunque el motor no dispara el trigger, el Disparo se activa y destruye la Mística rival', () => {
    const s0 = base()
    conCampeon(s0, 'A', 'rom', PR.ROMPECADENAS, 0)
    const eteres = conEteres(s0, 'A', 2)
    conMistica(s0, 'B', 'm', PR.RAYO, 0, { entradaEsteTurno: true }) // recién colocada: no puede responder → sin ventana
    const ctx = crearCtx()
    const s = aplicar(s0, { type: 'activar_habilidad', cardInstanceId: 'rom', eterIds: eteres }, ctx)
    expect(s.players.B.cementerio).toContain('m')
    expect(s.players.B.campo.misticasTacticas[0]).toBeNull()
  })

  it('PR-024 tramos (Cassandra): con 2 Éteres bloqueados cambia el agotamiento; con 4 fija el de un Campeón agotado', () => {
    const s0 = base()
    conCampeon(s0, 'A', 'esc', PR.ESCALONADO, 0)
    const eteres = conEteres(s0, 'A', 4)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conCampeon(s0, 'B', 'b1', PR.PEON, 1)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'bloquear_eter', eterIds: eteres.slice(0, 2), targetInstanceId: 'esc' }, ctx)
    expect(evs(ctx, 'tramo_disparado')).toHaveLength(1)
    expect(s.objetivosPendientes?.[0]).toMatchObject({ tramoUmbral: 2 })
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b1' }, ctx)
    expect(s.instances['b1'].agotado).toBe(true)
    s = aplicar(s, { type: 'bloquear_eter', eterIds: eteres.slice(2), targetInstanceId: 'esc' }, ctx)
    expect(s.objetivosPendientes?.[0]).toMatchObject({ tramoUmbral: 4, opciones: ['b1'] }) // filtro agotado:true
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b1' }, ctx)
    expect(exhaustFijado(s, 'b1')).toBe(true)
  })

  it('PR-025 steal_champion (continuo con bloqueo): al bloquear 2 Éteres el pendiente de robo se resuelve y el Campeón cambia de campo', () => {
    const s0 = base()
    conCampeon(s0, 'A', 'lad', PR.LADRONA, 0)
    const eteres = conEteres(s0, 'A', 2)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conCampeon(s0, 'B', 'b1', PR.PEON, 1)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'bloquear_eter', eterIds: eteres, targetInstanceId: 'lad' }, ctx)
    expect(s.objetivosPendientes?.[0]).toMatchObject({ jugador: 'A', instId: 'lad' })
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b1' }, ctx)
    expect(evs(ctx, 'campeon_robado')).toHaveLength(1)
    expect(s.players.A.campo.campeones).toContain('b1')
    expect(s.players.B.campo.campeones).not.toContain('b1')
    expect(s.instances['b1'].stolenBy).toBe('lad')
  })

  it('PR-023 double_attack + Recarga (Elena): con Éter bloqueado puede declarar un segundo ataque', () => {
    const s0 = base('choque')
    conCampeon(s0, 'A', 'dob', PR.DOBLE_FILO, 0)
    const eteres = conEteres(s0, 'A', 3)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'bloquear_eter', eterIds: eteres, targetInstanceId: 'dob' }, ctx)
    s = aplicar(s, { type: 'declarar_ataque', atacanteIds: ['dob'] }, ctx)
    expect(s.players.A.eterReserva).toHaveLength(1) // Recarga: devuelve 1 Éter bloqueado a la Reserva
    expect(s.combate).toBeUndefined() // doble ataque activo: el combate se cierra para permitir la segunda ola
    s = aplicar(s, { type: 'declarar_ataque', atacanteIds: ['dob'] }, ctx)
    expect(s.instances['dob'].atacoEsteTurno).toBe(true)
    expect(s.players.A.eterReserva).toHaveLength(2)
  })

  it('PR-026 prevent_destroy (Rowena): ante una Ruptura el controlador decide; prevenir exilia al guardián y salva el Vínculo', () => {
    const s0 = base('choque')
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    conCampeon(s0, 'B', 'gua', PR.GUARDIAN, 0, { agotado: true }) // agotado: no bloquea → el ataque pasa
    conVinculo(s0, 'B', 'vin', PR.VINC_VACIO, 0)
    conVinculo(s0, 'B', 'vin2', PR.VINC_VACIO, 1)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'declarar_ataque', atacanteIds: ['a0'] }, ctx)
    s = aplicar(s, { type: 'elegir_ruptura', atacanteId: 'a0', vinculoSlot: 0 }, ctx)
    expect(s.preventivosPendientes?.[0]).toMatchObject({ jugador: 'B', fuenteId: 'gua', victimId: 'vin' })
    expect(getValidActions(s, 'B').map((a) => a.type)).toEqual(['responder_prevenicion', 'responder_prevenicion'])
    s = aplicar(s, { type: 'responder_prevenicion', prevenir: true }, ctx)
    expect(evs(ctx, 'destruccion_prevenida')).toHaveLength(1)
    expect(s.players.B.exilio).toContain('gua')
    expect(s.instances['vin'].bocaArriba).toBeFalsy()
  })
})

describe('(c) humo — auras, reglas y Éter derivados del JSON', () => {
  it('PR-029 efectoComandante, PR-005 Éter de Reserva, PR-007 Éter de Bloqueo y PR-071 Vínculo destruido: auras derivadas en statsDe', () => {
    const s = base()
    conCampeon(s, 'A', 'cmd', PR.COMANDANTE, 0)
    conCampeon(s, 'A', 'a1', PR.PEON, 1)
    conCampeon(s, 'B', 'b0', PR.PEON, 0)
    conCampeon(s, 'B', 'b1', PR.COMANDANTE, 1) // RES 4 (el mayor del rival)
    expect(statsDe(s, 'a1')).toEqual({ poder: 3, resistencia: 3 }) // comandante: +1/+1 a toda la hueste
    expect(statsDe(s, 'cmd')).toEqual({ poder: 5, resistencia: 5 })
    conEteres(s, 'A', 2, PR.ETER_AURA) // 2 Éteres corrosivos en la Reserva de A: -1 ATQ al rival por cada uno
    expect(statsDe(s, 'b0').poder).toBe(3 - 2) // 2 base +1 (comandante rival) -2
    inst(s, 'eb', PR.ETER_BLOQUEO, 'A')
    s.instances['a1'].eterBloqueado = ['eb']
    expect(statsDe(s, 'a1').poder).toBe(4) // +1 por el Éter bloqueado
    conVinculo(s, 'A', 'peso', PR.VINC_PESO, 0, true) // Vínculo propio destruido: aura sobre el rival con mayor RES
    // el aura del Vínculo apunta al Campeón rival con mayor RES (b1, comandante 4/4 +1/+1): pierde 3/3
    expect(statsDe(s, 'b1').resistencia).toBe(5 - 3)
  })

  it('PR-030 modificar_regla pasivo: bloqueosPorTurno vale 2 mientras el Muro Doble está en juego (Capa 2 gana al manual)', () => {
    const s = base()
    conCampeon(s, 'A', 'a1', PR.PEON, 0)
    expect(reglaNumero(s, 'bloqueosPorTurno', { instId: 'a1' })).toBe(1) // Capa 1: manual
    conCampeon(s, 'A', 'muro', PR.MURO_DOBLE, 1)
    expect(reglaNumero(s, 'bloqueosPorTurno', { instId: 'a1' })).toBe(2)
    expect(reglaNumero(s, 'bloqueosPorTurno', { instId: 'muro' })).toBe(2)
    conCampeon(s, 'B', 'b0', PR.PEON, 0)
    expect(reglaNumero(s, 'bloqueosPorTurno', { instId: 'b0' })).toBe(1) // solo la hueste propia
  })

  it('PR-004 Pasivo 1A (block_ether): estando en la zona de pago permite bloquear un Éter con elegir_opcion, una vez por turno', () => {
    const s0 = base()
    conCampeon(s0, 'A', 'esc', PR.ESCALONADO, 0) // Campeón elegible: continuo con bloqueo "hasta" (los de bloqueo FIJO no aceptan 1 Éter suelto)
    inst(s0, 'pas', PR.ETER_PASIVO_1A, 'A')
    s0.players.A.eterPagado.push('pas')
    conEteres(s0, 'A', 1)
    const ctx = crearCtx()
    const s = aplicar(s0, { type: 'elegir_opcion', opcionId: 'pas' }, ctx)
    expect(s.instances['esc'].eterBloqueado).toEqual(['eter-A-0'])
    expect(s.instances['pas'].opcionUsadaEsteTurno).toBe(true)
  })

  it('PR-047 invocar_y_equipar con costo de Éter (DS-022): elige el Campeón del Exilio, lo invoca y le equipa el Artefacto', () => {
    const s0 = base()
    conMano(s0, 'A', 'rec', PR.RECLAMO)
    const pago = conEteres(s0, 'A', 6) // 3 de la carta + 3 de sobra para el coste del efecto (ver H9)
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    enExilio(s0, 'A', 'ex', PR.PEON)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'rec', slot: 0, eterIds: pago.slice(0, 3) }, ctx)
    expect(s.objetivosPendientes?.[0]).toMatchObject({ jugador: 'A', instId: 'rec', opciones: ['ex'] })
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'ex' }, ctx)
    expect(s.players.A.campo.campeones).toContain('ex')
    expect(s.players.A.exilio).not.toContain('ex')
    expect(s.instances['rec']).toMatchObject({ equipadoA: 'ex', vinculadoA: 'ex' })
    expect(s.players.A.campo.misticasTacticas[0]).toBe('rec') // Artefacto: permanece en mesa
  })

  it('PR-048 invocar_y_equipar con bloqueo fijo (FB-032): jugar NO invoca; bloquear 2 Éteres sobre el Artefacto alcanza el umbral e invoca del Exilio', () => {
    const t0 = base()
    conMano(t0, 'A', 'rit', PR.RITO)
    const pago = conEteres(t0, 'A', 4)
    conCampeon(t0, 'A', 'a0', PR.PEON, 0)
    enExilio(t0, 'A', 'ex', PR.PEON)
    const ctx = crearCtx()
    let t = aplicar(t0, { type: 'jugar_mistica', cardInstanceId: 'rit', slot: 0, eterIds: [pago[0], pago[1]] }, ctx)
    // Patrón de configuración de FB-032: objetivo.zona 'campo' pero zonaOrigen 'exilio' → al jugarla pide elegir un Campeón DEL CAMPO
    expect(t.objetivosPendientes?.[0]).toMatchObject({ instId: 'rit', opciones: ['a0'] })
    t = aplicar(t, { type: 'elegir_objetivo', objetivoId: 'a0' }, ctx)
    expect(t.players.A.exilio).toContain('ex') // todavía no invocó nada (a0 ya estaba en el campo)
    t = aplicar(t, { type: 'bloquear_eter', eterIds: [pago[2], pago[3]], targetInstanceId: 'rit' }, ctx)
    expect(t.players.A.exilio).not.toContain('ex') // alcanzó el umbral: invocó
    expect(t.players.A.campo.campeones).toContain('ex')
    expect(t.instances['rit'].equipadoA).toBe('ex')
  })
})

describe('(c) humo — Éteres con gatillo, Arcanas, copy y otros efectos de ejecución', () => {
  it('PR-008 al_pagar_eter + rival_discard (DS-004): al pagar con él, el rival pierde una carta de su mano', () => {
    const s0 = base()
    conMano(s0, 'A', 'p', PR.PEON)
    inst(s0, 'cruel', PR.ETER_CRUEL, 'A')
    s0.players.A.eterReserva.push('cruel')
    for (let i = 0; i < 3; i++) conMano(s0, 'B', `bm${i}`, PR.PEON)
    const ctx = crearCtx()
    const s = aplicar(s0, { type: 'jugar_campeon', cardInstanceId: 'p', slot: 0, eterIds: ['cruel'], sacrificios: [] }, ctx)
    expect(s.players.B.mano).toHaveLength(2)
    expect(s.players.B.cementerio).toHaveLength(1)
  })

  it('PR-009 al_pagar_eter + return_ether (FB-006): el Éter pagado a elegir vuelve a la Reserva', () => {
    const s0 = base()
    conMano(s0, 'A', 'p', PR.PEON)
    inst(s0, 'ret', PR.ETER_RETORNO, 'A')
    s0.players.A.eterReserva.push('ret')
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_campeon', cardInstanceId: 'p', slot: 0, eterIds: ['ret'], sacrificios: [] }, ctx)
    expect(s.objetivosPendientes?.[0]).toMatchObject({ jugador: 'A', instId: 'ret', trigger: 'al-pagar-eter', opciones: ['ret'] })
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'ret' }, ctx)
    expect(s.players.A.eterReserva).toEqual(['ret'])
    expect(s.players.A.eterPagado).toEqual([])
  })

  it('PR-050 return_hand con filtro atqMax y PR-051 exile: el Campeón objetivo cambia de zona', () => {
    for (const [carta, destino] of [[PR.DEVOLUCION, 'mano'], [PR.DESTIERRO, 'exilio']] as const) {
      const s0 = base()
      conMano(s0, 'A', 'm', carta)
      const pago = conEteres(s0, 'A', 2)
      conCampeon(s0, 'B', 'b0', PR.PEON, 0)
      const ctx = crearCtx()
      let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'm', slot: 0, eterIds: pago }, ctx)
      s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b0' }, ctx)
      expect(s.players.B.campo.campeones[0]).toBeNull()
      expect(s.players.B[destino]).toContain('b0')
    }
  })

  it('PR-060 Arcana con condicion "activacion": se rechaza sin cartas en mano y, cumplida, su recompensa (draw 2) resuelve y la Arcana va al Cementerio', () => {
    const s0 = base()
    conArcana(s0, 'A', 'pacto', PR.PACTO, 0)
    const pago = conEteres(s0, 'A', 2)
    const ctx = crearCtx()
    const accion = { type: 'activar_arcana', cardInstanceId: 'pacto', slot: 0, eterIds: pago } as const
    expect(applyAction(s0, accion, ctx).ok).toBe(false) // tener_mano_minimo 1: la mano está vacía
    conMano(s0, 'A', 'carta', PR.PEON)
    const s = aplicar(s0, accion, ctx)
    expect(s.players.A.mano).toHaveLength(3) // la que tenía + 2 robadas
    expect(s.players.A.cementerio).toContain('pacto')
  })

  it('PR-061 Arcana con objetivo (debuff permanente de RES): elige el Campeón rival y la baja de forma permanente', () => {
    const s0 = base()
    conArcana(s0, 'A', 'sent', PR.SENTENCIA, 0)
    const pago = conEteres(s0, 'A', 2)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conCampeon(s0, 'B', 'b1', PR.PEON, 1)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'activar_arcana', cardInstanceId: 'sent', slot: 0, eterIds: pago }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'b1' }, ctx)
    expect(statsDe(s, 'b1').resistencia).toBe(0) // 2 - 3 (mínimo 0)
    expect(s.instances['b1'].modificadores?.every((m) => m.expira === 'permanente')).toBe(true)
  })

  it('PR-049 copy (Mística, FB-022): al elegir la Mística rival guarda copyTargetId; el efecto copiado depende del Éter bloqueado', () => {
    const s0 = base()
    conMano(s0, 'A', 'esp', PR.ESPEJO)
    const pago = conEteres(s0, 'A', 4)
    conMistica(s0, 'B', 'm', PR.RAYO, 0, { entradaEsteTurno: true })
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'esp', slot: 0, eterIds: pago.slice(0, 2) }, ctx)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'm' }, ctx)
    expect(s.instances['esp'].copyTargetId).toBe('m')
    expect(s.players.A.campo.misticasTacticas[0]).toBe('esp') // bloqueo fijo: permanece en mesa
    s = aplicar(s, { type: 'bloquear_eter', eterIds: pago.slice(2), targetInstanceId: 'esp' }, ctx)
    expect(s.instances['esp'].eterBloqueado).toHaveLength(2)
  })

  it('PR-052 Artefacto con eter_bloqueado + buffPerBlockedEther (FB-020): equipado y con Éter bloqueado, el Campeón gana 2 ATQ por Éter', () => {
    const s0 = base()
    conMano(s0, 'A', 'lam', PR.LAMENTO)
    const pago = conEteres(s0, 'A', 3)
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'lam', slot: 0, eterIds: [pago[0]] }, ctx)
    expect(s.equiparPendiente).toMatchObject({ artefactoId: 'lam' })
    s = aplicar(s, { type: 'equipar_artefacto', cardInstanceId: 'lam', campeonInstanceId: 'a0' }, ctx)
    s = aplicar(s, { type: 'bloquear_eter', eterIds: [pago[1], pago[2]], targetInstanceId: 'lam' }, ctx)
    expect(statsDe(s, 'a0').poder).toBe(2 + 2 * 2)
  })
})

describe('(c) humo — sanidad del banco de pruebas', () => {
  it('el set queda registrado sin tocar la fuente de verdad (FB-021 sigue siendo Marcha) y getCardMeta resuelve todo PR', () => {
    for (const c of CARTAS_PRUEBA) expect(getCardMeta(c.id)?.id).toBe(c.id)
    expect(getCardMeta('FB-021')?.name).toBe('Marcha de las Primeras')
  })
})
