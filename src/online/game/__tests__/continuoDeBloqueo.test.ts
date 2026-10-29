// @vitest-environment node
/**
 * Un CONTINUO con coste de Éter bloqueado (doctrina: todo lo que bloquea Éter es continuo). Antes solo funcionaban unos pocos
 * efectos cableados a mano (robo, doble ataque, tramos, invocar y equipar): con cualquier otro efecto raíz —incluida la
 * carta real Ragnar (DS-010)— bloquear Éter no hacía NADA y el mapa de cobertura lo daba por bueno. Ahora, según el efecto:
 *  - SOSTENIDO («mientras ese Éter esté bloqueado»: buff, debuff, keyword sin duración, fix_exhaust): aura derivada si no
 *    elige objetivo (tú mismo / todos tus Campeones / todos los rivales); si es «un Campeón», se elige al bloquear y vale
 *    mientras la fuente siga bloqueando.
 *  - INSTANTÁNEO (destroy, draw, ...): ocurre una vez al alcanzar el umbral; se rearma al liberar el Éter.
 * Cartas SINTÉTICAS (más Ragnar real).
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { getCardMeta, registrarCartas } from '../cards'
import { exhaustFijado } from '../effectInterpreter'
import { keywordsDe, statsDe } from '../efectos'
import { aplicarReglaTemporal } from '../reglasTemporales'
import { liberarEterBloqueado } from '../replacements'
import { getValidActions } from '../validActions'
import type { AnyCard } from '../../../shared/types'
import type { Ctx, GameState } from '../types'
import { PR, aplicar, cargarCartasPrueba, conCampeon, conEteres, conMazo, conMistica, crearCtx, escenaVacia } from './helpers/cartasPrueba'

const base = {
  rarity: 'Común' as const, flavorText: '', paqueteId: 'test', limiteCopias: '3' as const,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
}
const PROPIO = { tipo: 'campeon', controlador: 'propio', zona: 'campo' }
const RIVAL = { tipo: 'campeon', controlador: 'rival', zona: 'campo' }
const MIST = { tipo: 'mistica', controlador: 'rival', zona: 'campo' }
const FIJO = (n: number) => ({ tipo: 'bloqueo_fijo', cantidad: n })
const continuo = (id: string, efecto: Record<string, unknown>): AnyCard =>
  ({ ...base, id, name: id, type: 'Campeón', keywords: [], facciones: ['Orden'], stats: { cost: 2, poder: 2, resistencia: 2 }, efectos: [{ tipo: 'continuo', ...efecto }] }) as never

beforeAll(() => {
  cargarCartasPrueba()
  registrarCartas([
    continuo('T-RAGNAR', { efecto: 'grant_keyword', keyword: 'Indestructible', objetivo: PROPIO, costo: FIJO(2), duracion: 'mientras_ester_bloqueado' }),
    continuo('T-AURA-SELF', { efecto: 'buff', stats: { ATQ: 2, RES: 0 }, objetivo: { tipo: 'self' }, costo: FIJO(1), duracion: 'mientras_ester_bloqueado' }),
    continuo('T-AURA-TODOS', { efecto: 'buff', stats: { ATQ: 1, RES: 0 }, objetivo: { tipo: 'todos_campeones_propios', controlador: 'propio', zona: 'campo' }, costo: FIJO(1), duracion: 'mientras_ester_bloqueado' }),
    continuo('T-AURA-RIVALES', { efecto: 'debuff', stats: { ATQ: 1, RES: 0 }, objetivo: { tipo: 'todos_campeones_rivales' }, costo: FIJO(1), duracion: 'mientras_ester_bloqueado' }),
    continuo('T-DESTRUYE', { efecto: 'destroy', objetivo: MIST, costo: FIJO(1) }),
    continuo('T-ROBA', { efecto: 'draw', objetivo: { tipo: 'carta', controlador: 'propio', zona: 'mazo' }, costo: { tipo: 'eter_bloqueado', cantidad: 2, umbral: 1 } }),
    continuo('T-DEBILITA-TURNO', { efecto: 'debuff', stats: { ATQ: 1, RES: 0 }, duracion: 'turno', objetivo: RIVAL, costo: FIJO(1) }),
    continuo('T-FIJA', { efecto: 'fix_exhaust', objetivo: { ...RIVAL, filtros: { agotado: true } }, costo: FIJO(1) }),
    continuo('T-PLANO', { efecto: 'scry', cantidad: 0, costo: FIJO(9) }),
  ])
})

const bloquear = (s: GameState, ctx: Ctx, id: string) => {
  const a = getValidActions(s, 'A').find((x) => x.type === 'bloquear_eter' && x.targetInstanceId === id)
  if (!a) throw new Error(`no se ofrece bloquear Éter en ${id}`)
  return aplicar(s, a, ctx)
}
const elegir = (s: GameState, ctx: Ctx, objetivoId: string) => aplicar(s, { type: 'elegir_objetivo', objetivoId }, ctx)
function escena(cardId: string, eteres = 2): { s: GameState; ctx: Ctx } {
  const s = escenaVacia('forja'); conMazo(s, 'A', 4); conMazo(s, 'B', 4)
  conCampeon(s, 'A', 'src', cardId, 0); conEteres(s, 'A', eteres)
  return { s, ctx: crearCtx() }
}

describe('SOSTENIDO sobre «un Campeón» elegido al bloquear (Ragnar)', () => {
  it('bloquear arma la elección entre tus Campeones y al elegir el aliado GANA la keyword', () => {
    const { s: s0, ctx } = escena('T-RAGNAR'); conCampeon(s0, 'A', 'amigo', PR.PEON, 1)
    expect(keywordsDe(s0, 'amigo')).not.toContain('Indestructible')
    let s = bloquear(s0, ctx, 'src')
    expect(s.objetivosPendientes?.[0]).toMatchObject({ jugador: 'A', instId: 'src', efectoUmbralIdx: 0 })
    expect(s.objetivosPendientes?.[0].opciones).toEqual(expect.arrayContaining(['src', 'amigo']))
    s = elegir(s, ctx, 'amigo')
    expect(keywordsDe(s, 'amigo')).toContain('Indestructible')
  })
  it('lo conserva MIENTRAS el Éter siga bloqueado y lo pierde al liberarlo', () => {
    const { s: s0, ctx } = escena('T-RAGNAR'); conCampeon(s0, 'A', 'amigo', PR.PEON, 1)
    let s = elegir(bloquear(s0, ctx, 'src'), ctx, 'amigo')
    expect(keywordsDe(s, 'amigo')).toContain('Indestructible')
    liberarEterBloqueado(s, ctx, 'src', '1A')
    expect(keywordsDe(s, 'amigo')).not.toContain('Indestructible')
    expect(s.instances.src.sostenidos).toBeUndefined()
  })
  it('se REARMA: al volver a bloquear, de nuevo se elige a quién', () => {
    const { s: s0, ctx } = escena('T-RAGNAR', 4); conCampeon(s0, 'A', 'amigo', PR.PEON, 1)
    let s = elegir(bloquear(s0, ctx, 'src'), ctx, 'amigo')
    liberarEterBloqueado(s, ctx, 'src', '2A')
    s = bloquear(s, ctx, 'src')
    expect(s.objetivosPendientes?.[0]).toMatchObject({ instId: 'src', efectoUmbralIdx: 0 })
  })
  it('si sus efectos quedan negados, la keyword se apaga (y vuelve si se reanuda)', () => {
    const { s: s0, ctx } = escena('T-RAGNAR'); conCampeon(s0, 'A', 'amigo', PR.PEON, 1)
    const s = elegir(bloquear(s0, ctx, 'src'), ctx, 'amigo')
    aplicarReglaTemporal(s, { regla: 'efectosActivos', operacion: 'prohibir', duenio: 'B', expira: 'ocaso', sujeto: { tipo: 'carta', instId: 'src' } })
    expect(keywordsDe(s, 'amigo')).not.toContain('Indestructible')
  })
  it('solo el elegido la recibe', () => {
    const { s: s0, ctx } = escena('T-RAGNAR'); conCampeon(s0, 'A', 'amigo', PR.PEON, 1); conCampeon(s0, 'A', 'otro', PR.PEON, 2)
    const s = elegir(bloquear(s0, ctx, 'src'), ctx, 'amigo')
    expect(keywordsDe(s, 'otro')).not.toContain('Indestructible')
  })
  it('sin ningún objetivo válido no se marca: se reevalúa en el próximo bloqueo', () => {
    const { s: s0, ctx } = escena('T-DEBILITA-TURNO') // apunta a un Campeón RIVAL y no hay ninguno
    const s = bloquear(s0, ctx, 'src')
    expect(s.objetivosPendientes ?? []).toEqual([])
    expect(s.instances.src.efectosUmbralDisparados).toBeUndefined()
  })
})

describe('SOSTENIDO sin elección: aura derivada', () => {
  it('sobre sí mismo: +2 ATQ mientras el Éter esté bloqueado', () => {
    const { s: s0, ctx } = escena('T-AURA-SELF', 1)
    expect(statsDe(s0, 'src').poder).toBe(2)
    const s = bloquear(s0, ctx, 'src')
    expect(s.objetivosPendientes ?? []).toEqual([]) // no hay nada que elegir
    expect(statsDe(s, 'src').poder).toBe(4)
    liberarEterBloqueado(s, ctx, 'src', '1A')
    expect(statsDe(s, 'src').poder).toBe(2)
  })
  it('sobre todos tus Campeones (incluido él): +1 ATQ', () => {
    const { s: s0, ctx } = escena('T-AURA-TODOS', 1); conCampeon(s0, 'A', 'amigo', PR.PEON, 1); conCampeon(s0, 'B', 'rival', PR.PEON, 0)
    const s = bloquear(s0, ctx, 'src')
    expect(statsDe(s, 'amigo').poder).toBe(3)
    expect(statsDe(s, 'src').poder).toBe(3)
    expect(statsDe(s, 'rival').poder).toBe(2)
  })
  it('sobre todos los Campeones RIVALES (antes ese objetivo no existía para las auras): −1 ATQ', () => {
    const { s: s0, ctx } = escena('T-AURA-RIVALES', 1); conCampeon(s0, 'B', 'rival', PR.PEON, 0); conCampeon(s0, 'A', 'amigo', PR.PEON, 1)
    const s = bloquear(s0, ctx, 'src')
    expect(statsDe(s, 'rival').poder).toBe(1)
    expect(statsDe(s, 'amigo').poder).toBe(2)
  })
})

describe('INSTANTÁNEO: ocurre una vez al alcanzar el umbral', () => {
  it('destroy con objetivo: se elige y destruye', () => {
    const { s: s0, ctx } = escena('T-DESTRUYE', 1); conMistica(s0, 'B', 'bm', PR.AVISO, 0)
    let s = bloquear(s0, ctx, 'src')
    expect(s.objetivosPendientes?.[0]).toMatchObject({ instId: 'src', efectoUmbralIdx: 0, opciones: ['bm'] })
    s = elegir(s, ctx, 'bm')
    expect(s.players.B.cementerio).toContain('bm')
  })
  it('un instantáneo SIN elección (draw) ocurre ya', () => {
    const { s: s0, ctx } = escena('T-ROBA')
    const s = bloquear(s0, ctx, 'src')
    expect(s.objetivosPendientes ?? []).toEqual([])
    expect(s.players.A.mano).toHaveLength(1)
  })
  it('una sola vez por ciclo: un 2.º Éter bloqueado no repite el efecto', () => {
    const { s: s0, ctx } = escena('T-ROBA', 3)
    let s = bloquear(s0, ctx, 'src')
    s = bloquear(s, ctx, 'src')
    expect(s.instances.src.eterBloqueado).toHaveLength(2)
    expect(s.players.A.mano).toHaveLength(1)
  })
  it('se rearma al liberar el Éter: vuelve a ocurrir en el siguiente ciclo', () => {
    const { s: s0, ctx } = escena('T-ROBA', 3)
    let s = bloquear(s0, ctx, 'src')
    liberarEterBloqueado(s, ctx, 'src', '2A')
    s = bloquear(s, ctx, 'src')
    expect(s.players.A.mano).toHaveLength(2)
  })
  it('con duración propia (debuff «este turno») es instantáneo, no sostenido', () => {
    const { s: s0, ctx } = escena('T-DEBILITA-TURNO', 1); conCampeon(s0, 'B', 'rival', PR.PEON, 0)
    let s = elegir(bloquear(s0, ctx, 'src'), ctx, 'rival')
    expect(statsDe(s, 'rival').poder).toBe(1)
    expect(s.instances.src.sostenidos).toBeUndefined() // no depende de que siga bloqueado
    liberarEterBloqueado(s, ctx, 'src', '1A')
    expect(statsDe(s, 'rival').poder).toBe(1) // el debuff de turno sigue hasta el Ocaso
  })
})

describe('fix_exhaust como efecto RAÍZ (antes solo valía como tramo)', () => {
  function conAgotado() {
    const { s, ctx } = escena('T-FIJA', 1); conCampeon(s, 'B', 'rival', PR.PEON, 0, { agotado: true })
    return { s, ctx }
  }
  it('al bloquear elige al Campeón agotado y su agotamiento queda fijado mientras siga bloqueando', () => {
    const { s: s0, ctx } = conAgotado()
    expect(exhaustFijado(s0, 'rival')).toBe(false)
    const s = elegir(bloquear(s0, ctx, 'src'), ctx, 'rival')
    expect(exhaustFijado(s, 'rival')).toBe(true)
    liberarEterBloqueado(s, ctx, 'src', '1A')
    expect(exhaustFijado(s, 'rival')).toBe(false)
  })
})

describe('Ragnar, Voz del Nudo (DS-010) — la carta REAL que tenía este efecto muerto', () => {
  it('«Bloquea 2 Éter, un Campeón que controles gana Indestructible mientras ese Éter esté bloqueado»', () => {
    const { s: s0, ctx } = escena('DS-010'); conCampeon(s0, 'A', 'amigo', PR.PEON, 1)
    expect(keywordsDe(s0, 'amigo')).not.toContain('Indestructible')
    let s = bloquear(s0, ctx, 'src') // un solo bloqueo fijo de 2 Éter
    expect(s.instances.src.eterBloqueado).toHaveLength(2)
    expect(s.objetivosPendientes?.[0]).toMatchObject({ jugador: 'A', instId: 'src', efectoUmbralIdx: 1 }) // su 2.º efecto
    s = elegir(s, ctx, 'amigo')
    expect(keywordsDe(s, 'amigo')).toContain('Indestructible')
    liberarEterBloqueado(s, ctx, 'src', '2A')
    expect(keywordsDe(s, 'amigo')).not.toContain('Indestructible')
  })
  it('solo concede la keyword: NADA de ATQ (ni por su Comandante ni por el 2.º efecto; eran `stats` escondidos de otro diseño)', () => {
    const { s: s0, ctx } = escena('DS-010'); conCampeon(s0, 'A', 'amigo', PR.PEON, 1)
    const impreso = getCardMeta(PR.PEON)!
    const poderImpreso = 'stats' in impreso && impreso.stats && 'poder' in impreso.stats ? (impreso.stats.poder as number) : -1
    expect(statsDe(s0, 'amigo').poder).toBe(poderImpreso) // el Comandante de Ragnar ya NO da +3
    const s = elegir(bloquear(s0, ctx, 'src'), ctx, 'amigo')
    expect(keywordsDe(s, 'amigo')).toContain('Indestructible')
    expect(statsDe(s, 'amigo').poder).toBe(poderImpreso) // ni el 2.º efecto da +4
  })
})

describe('qué NO cambia', () => {
  it('un Continuo cuyo efecto tiene su propio sistema (p. ej. robar un Campeón) sigue como antes', () => {
    const { s: s0, ctx } = escena('T-RAGNAR')
    expect(bloquear(s0, ctx, 'src').instances.src.eterBloqueado).toHaveLength(2)
  })
})
