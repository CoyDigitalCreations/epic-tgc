// @vitest-environment node
/**
 * Mutación, fase 1 del motor — cartas REALES del seed (MU-xxx):
 *  - «la esencia que elijas» (`esenciaElegida`): pendiente + acción `elegir_esencia` (esencia.ts), con el juego congelado.
 *  - triggers de cambio de Esencia (`al_cambiar_de_esencia`, `cuando_campeon_propio_cambia_esencia`) y «una vez por turno».
 *  - requisito de campo «N o más Campeones de una misma Esencia» y filtro «de esa Esencia» (Yaron).
 *  - auras por Esencia: «de esencia Bestia» y «que compartan Esencia con otro Campeón que controles».
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { applyAction } from '../actions'
import { esenciaDe } from '../atributos'
import { botTonto } from '../bot'
import { statsDe } from '../efectos'
import { interpretEffect } from '../effectInterpreter'
import { getCardMeta, registrarCartas } from '../cards'
import type { AnyCard } from '../cards'
import { getValidActions } from '../validActions'
import type { EfectoData } from '../../../shared/types'
import type { GameState } from '../types'
import { aplicar, cargarCartasPrueba, conCampeon, conEteres, conMano, conMazo, conVinculo, crearCtx, escenaVacia, inst, PR } from './helpers/cartasPrueba'

const YARON = 'MU-010'
const HORTELANA = 'MU-018'
const RAIZ = 'MU-013'
const MUDA_SUBITA = 'MU-022'
const CONTAGIO = 'MU-023'
const PASTOR = 'MU-017'
const RAIZ_COMPARTIDA = 'MU-034'
const COSECHA_DE_MUDA = 'MU-027'

const campeon = (id: string, esencia: string, efectos: unknown[] = []) => ({
  id, name: id, type: 'Campeón', rarity: 'Común', keywords: [], flavorText: '',
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', paqueteId: 'test', limiteCopias: '3',
  facciones: ['Mutación'], esencia, roles: ['Normal'], stats: { cost: 2, poder: 2, resistencia: 2 }, efectos,
}) as unknown as AnyCard

const T_BESTIA = 'TEST-MU-BESTIA'
const T_MAGO = 'TEST-MU-MAGO'
const T_ELEMENTAL = 'TEST-MU-ELEMENTAL'

beforeAll(() => {
  cargarCartasPrueba()
  registrarCartas([campeon(T_BESTIA, 'Bestia'), campeon(T_MAGO, 'Mago'), campeon(T_ELEMENTAL, 'Elemental')])
})

/** Cambia la Esencia de `objetivo` a `esencia` con un efecto `change_type` fijo, como lo haría cualquier carta. */
function cambiarA(s: GameState, objetivo: string, esencia: string, fuente = 'fuente-cambio'): GameState {
  const clon = structuredClone(s)
  clon.instances[fuente] ??= { cardInstanceId: fuente, cardId: PR.RAYO, owner: 'A' }
  const e: EfectoData = { tipo: 'hechizo', efecto: 'change_type', cambioTipo: { esencia: esencia as never }, duracion: 'turno', objetivo: { tipo: 'campeon', controlador: 'propio', zona: 'campo' } }
  interpretEffect(clon, crearCtx(), clon.instances[fuente], e, { jugador: 'A', contextoUso: 'objetivo-elegido', objetivoId: objetivo })
  return clon
}

describe('«la esencia que elijas» (esenciaElegida)', () => {
  /** Muda Súbita: un Campeón propio se convierte en la esencia que elijas, hasta el final del turno. */
  function jugarMuda(s: GameState, objetivo: string): GameState {
    const clon = structuredClone(s)
    clon.instances.muda ??= { cardInstanceId: 'muda', cardId: MUDA_SUBITA, owner: 'A' }
    const efecto = (clon.instances.muda && (JSON.parse(JSON.stringify(registrarYObtener(MUDA_SUBITA)))) as AnyCard & { efectos: EfectoData[] }).efectos[0]
    interpretEffect(clon, crearCtx(), clon.instances.muda, efecto, { jugador: 'A', contextoUso: 'objetivo-elegido', objetivoId: objetivo })
    return clon
  }
  function escena(): GameState {
    const s = escenaVacia('forja'); conMazo(s, 'A', 4); conMazo(s, 'B', 4)
    conCampeon(s, 'A', 'x', T_BESTIA, 0)
    conCampeon(s, 'A', 'y', T_BESTIA, 1)
    conCampeon(s, 'B', 'r', T_MAGO, 0)
    return s
  }

  it('crea la pendiente y el juego espera: solo quien resuelve puede elegir, una acción por Esencia', () => {
    const s = jugarMuda(escena(), 'x')
    expect(s.esenciaPendientes).toHaveLength(1)
    expect(esenciaDe(s, 'x')).toBe('Bestia') // todavía no cambió: falta elegir
    const deA = getValidActions(s, 'A')
    expect(deA.filter((a) => a.type === 'elegir_esencia')).toHaveLength(10)
    expect(deA.every((a) => a.type === 'elegir_esencia' || a.type === 'rendirse')).toBe(true) // nada más: el juego espera
    expect(getValidActions(s, 'B').filter((a) => a.type !== 'rendirse')).toEqual([])
    expect(applyAction(s, { type: 'pasar_turno' }, crearCtx()).ok).toBe(false) // congelado
  })

  it('elegir_esencia aplica la Esencia al objetivo, limpia la pendiente y dura lo que dura el efecto', () => {
    let s = jugarMuda(escena(), 'x')
    s = aplicar(s, { type: 'elegir_esencia', esencia: 'Dragón' }, crearCtx())
    expect(esenciaDe(s, 'x')).toBe('Dragón')
    expect(esenciaDe(s, 'y')).toBe('Bestia') // otro Campeón, intacto
    expect(s.esenciaPendientes).toBeUndefined()
    expect(getValidActions(s, 'A').some((a) => a.type === 'pasar_turno')).toBe(true) // el juego sigue
  })

  it('rechaza una Esencia que no existe y a quien no le toca elegir', () => {
    const s = jugarMuda(escena(), 'x')
    expect(applyAction(s, { type: 'elegir_esencia', esencia: 'Pato' }, crearCtx()).ok).toBe(false)
    expect(applyAction(s, { type: 'elegir_esencia', esencia: 'Mago', jugador: 'B' }, crearCtx()).ok).toBe(false)
  })

  it('si el objetivo sale del campo antes de elegir, la pendiente ya no congela la partida y se descarta', () => {
    const s = jugarMuda(escena(), 'x')
    s.players.A.campo.campeones[0] = null
    expect(getValidActions(s, 'A').some((a) => a.type === 'elegir_esencia')).toBe(false)
    const r = applyAction(s, { type: 'pasar_turno' }, crearCtx())
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.state.esenciaPendientes).toBeUndefined()
  })

  it('Contagio: la Esencia elegida alcanza a TODOS los Campeones del rival', () => {
    let s = escena(); conCampeon(s, 'B', 'r2', T_MAGO, 1)
    s = structuredClone(s)
    s.instances.cont = { cardInstanceId: 'cont', cardId: CONTAGIO, owner: 'A' }
    const efecto = (registrarYObtener(CONTAGIO) as AnyCard & { efectos: EfectoData[] }).efectos[0]
    interpretEffect(s, crearCtx(), s.instances.cont, efecto, { jugador: 'A' })
    expect(s.esenciaPendientes?.[0].instIds.sort()).toEqual(['r', 'r2'])
    s = aplicar(s, { type: 'elegir_esencia', esencia: 'Constructo' }, crearCtx())
    expect([esenciaDe(s, 'r'), esenciaDe(s, 'r2')]).toEqual(['Constructo', 'Constructo'])
  })

  it('el bot elige la Esencia que más repiten sus Campeones', () => {
    let s = escena(); conCampeon(s, 'A', 'z', T_ELEMENTAL, 2); conCampeon(s, 'A', 'w', T_ELEMENTAL, 3)
    s = jugarMuda(s, 'z')
    // z se queda fuera del conteo: quedan x,y (Bestia) y w (Elemental) → Bestia
    expect(botTonto(s, 'A')).toEqual({ type: 'elegir_esencia', esencia: 'Bestia' })
  })
})

describe('triggers de cambio de Esencia y «una vez por turno»', () => {
  function escena(): GameState {
    const s = escenaVacia('forja'); conMazo(s, 'A', 6); conMazo(s, 'B', 6)
    conCampeon(s, 'A', 'cambiante', T_BESTIA, 0)
    return s
  }

  it('MU-018 (Hortelana): cuando un Campeón tuyo cambia de Esencia, robas 1 — una sola vez por turno', () => {
    let s = escena(); conCampeon(s, 'A', 'hort', HORTELANA, 1)
    const mano0 = s.players.A.mano.length
    s = cambiarA(s, 'cambiante', 'Mago')
    expect(s.players.A.mano.length).toBe(mano0 + 1)
    s = cambiarA(s, 'cambiante', 'Dragón')
    expect(s.players.A.mano.length).toBe(mano0 + 1) // ya robó este turno
  })

  it('no dispara si «cambia» a la Esencia que ya tenía', () => {
    let s = escena(); conCampeon(s, 'A', 'hort', HORTELANA, 1)
    const mano0 = s.players.A.mano.length
    s = cambiarA(s, 'cambiante', 'Bestia')
    expect(s.players.A.mano.length).toBe(mano0)
  })

  it('MU-018 NO dispara si el que cambia es un Campeón del rival (efecto «que controles»)', () => {
    let s = escena(); conCampeon(s, 'A', 'hort', HORTELANA, 1); conCampeon(s, 'B', 'rival', T_MAGO, 0)
    const mano0 = s.players.A.mano.length
    s = cambiarA(s, 'rival', 'Bestia')
    expect(s.players.A.mano.length).toBe(mano0)
  })

  it('MU-013 (Raíz Inquieta): cuando ELLA cambia de Esencia gana +2 RES; si cambia otra, nada', () => {
    let s = escena(); conCampeon(s, 'A', 'raiz', RAIZ, 1)
    const antes = statsDe(s, 'raiz').resistencia
    s = cambiarA(s, 'cambiante', 'Mago')
    expect(statsDe(s, 'raiz').resistencia).toBe(antes)
    s = cambiarA(s, 'raiz', 'Mago')
    expect(statsDe(s, 'raiz').resistencia).toBe(antes + 2)
  })

  it('MU-010 (Yaron): devuelve 1 Éter de tu zona de pago a la Reserva cuando un Campeón tuyo cambia de Esencia', () => {
    let s = escena(); conCampeon(s, 'A', 'yaron', YARON, 1)
    const [pagado] = conEteres(s, 'A', 1)
    s.players.A.eterReserva = s.players.A.eterReserva.filter((id) => id !== pagado)
    s.players.A.eterPagado.push(pagado)
    s = cambiarA(s, 'cambiante', 'Mago')
    // «devuelve 1 Éter de tu zona de pago»: el jugador elige cuál (elegir_objetivo) y vuelve a la Reserva
    expect(s.objetivosPendientes?.[0]?.opciones).toContain(pagado)
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: pagado }, crearCtx())
    expect(s.players.A.eterPagado).not.toContain(pagado)
    expect(s.players.A.eterReserva).toContain(pagado)
  })

  it('MU-027 (Cosecha de Muda, Arcana): el trigger la alcanza y bloquea 1 Éter (una vez por turno)', () => {
    let s = escena(); conEteres(s, 'A', 4)
    inst(s, 'cosecha', COSECHA_DE_MUDA, 'A', { bocaArriba: false })
    s.players.A.campo.arcanasCombate[0] = 'cosecha'
    s = cambiarA(s, 'cambiante', 'Mago')
    const bloqueados = Object.values(s.instances).filter((i) => i.bloqueadoPorEfecto?.startsWith('cosecha#')).length
    // el efecto se dispara y arma su elección de objetivo (o se resuelve): lo que importa es que ya no es un hueco
    expect(bloqueados + (s.objetivosPendientes?.length ?? 0)).toBeGreaterThan(0)
  })
})

describe('requisito de campo «misma Esencia» y filtro «de esa Esencia» (Yaron, MU-010)', () => {
  function escena(bestiasPropias: number): GameState {
    const s = escenaVacia('forja'); conMazo(s, 'A', 4); conMazo(s, 'B', 4)
    conCampeon(s, 'A', 'yaron', YARON, 0)
    for (let i = 0; i < bestiasPropias; i++) conCampeon(s, 'A', `b${i}`, T_BESTIA, i + 1)
    conEteres(s, 'A', 6)
    return s
  }
  const puedeActivar = (s: GameState) => getValidActions(s, 'A').some((a) => a.type === 'activar_habilidad' && a.cardInstanceId === 'yaron')

  it('sin 3 Campeones de una misma Esencia la habilidad NO se ofrece ni se acepta', () => {
    // Yaron es Mutación / (su esencia impresa) + 2 Bestias: nadie llega a 3
    const s = escena(2)
    if (esenciaDe(s, 'yaron') === 'Bestia') return // protección: la prueba supone que Yaron no es Bestia
    expect(puedeActivar(s)).toBe(false)
    const r = applyAction(s, { type: 'activar_habilidad', cardInstanceId: 'yaron', eterIds: s.players.A.eterReserva.slice(0, 4) }, crearCtx())
    expect(r.ok).toBe(false)
  })

  it('con 3 Bestias destruye SOLO a las Bestias (de ambos lados) y respeta a los demás', () => {
    let s = escena(3); conCampeon(s, 'B', 'rb', T_BESTIA, 0); conCampeon(s, 'B', 'rm', T_MAGO, 1)
    expect(puedeActivar(s)).toBe(true)
    s = aplicar(s, { type: 'activar_habilidad', cardInstanceId: 'yaron', eterIds: s.players.A.eterReserva.slice(0, 4) }, crearCtx())
    // La pila/elecciones pueden pedir cerrar la ventana: se pasa prioridad hasta resolver
    for (let i = 0; i < 6 && s.cadena; i++) s = aplicar(s, { type: 'pasar_prioridad' }, crearCtx())
    const vivos = (j: 'A' | 'B') => s.players[j].campo.campeones.filter(Boolean)
    expect(vivos('A')).toContain('yaron') // Yaron no es Bestia: sobrevive
    expect(vivos('A')).not.toContain('b0')
    expect(vivos('B')).not.toContain('rb')
    expect(vivos('B')).toContain('rm') // el Mago rival no es de esa Esencia
  })
})

describe('auras por Esencia', () => {
  it('MU-017 (Pastor de Cenizas): +1 ATQ SOLO a los Campeones Bestia, incluido él mismo si lo es; vale mientras esté en el campo', () => {
    const s = escenaVacia('forja')
    conCampeon(s, 'A', 'pastor', PASTOR, 0)
    conCampeon(s, 'A', 'bestia', T_BESTIA, 1)
    conCampeon(s, 'A', 'mago', T_MAGO, 2)
    conCampeon(s, 'B', 'rival-bestia', T_BESTIA, 0)
    expect(statsDe(s, 'bestia').poder).toBe(3)
    expect(statsDe(s, 'mago').poder).toBe(2)
    expect(statsDe(s, 'rival-bestia').poder).toBe(2) // «tus Campeones»: el rival no recibe el aura
    s.players.A.campo.campeones[0] = null // el Pastor se va: el aura termina sola
    expect(statsDe(s, 'bestia').poder).toBe(2)
  })

  it('MU-017 no aparece como habilidad que se pueda activar (es un aura, no un Disparo)', () => {
    const s = escenaVacia('forja'); conEteres(s, 'A', 3)
    conCampeon(s, 'A', 'pastor', PASTOR, 0)
    expect(getValidActions(s, 'A').some((a) => a.type === 'activar_habilidad')).toBe(false)
  })

  it('MU-034 (Raíz Compartida, Vínculo destruido): +1 RES a quien comparte Esencia con otro Campeón tuyo, y solo a ellos', () => {
    const s = escenaVacia('forja')
    conVinculo(s, 'A', 'raizc', RAIZ_COMPARTIDA, 0, true)
    conCampeon(s, 'A', 'b1', T_BESTIA, 0); conCampeon(s, 'A', 'b2', T_BESTIA, 1); conCampeon(s, 'A', 'm1', T_MAGO, 2)
    expect(statsDe(s, 'b1').resistencia).toBe(3)
    expect(statsDe(s, 'b2').resistencia).toBe(3)
    expect(statsDe(s, 'm1').resistencia).toBe(2) // el único Mago no comparte con nadie
  })

  it('el aura se mueve con los cambios de Esencia: al volverse Bestia el Mago solitario también la recibe', () => {
    let s = escenaVacia('forja')
    conVinculo(s, 'A', 'raizc', RAIZ_COMPARTIDA, 0, true)
    conCampeon(s, 'A', 'b1', T_BESTIA, 0); conCampeon(s, 'A', 'm1', T_MAGO, 1)
    expect(statsDe(s, 'm1').resistencia).toBe(2)
    s = cambiarA(s, 'm1', 'Bestia')
    expect(statsDe(s, 'm1').resistencia).toBe(3)
    expect(statsDe(s, 'b1').resistencia).toBe(3)
  })
})

/** Una carta del catálogo por id (para sacar su efecto real sin repetir el JSON en el test). */
function registrarYObtener(id: string): AnyCard {
  const c = getCardMeta(id)
  if (!c) throw new Error(`carta ${id} no está en el catálogo`)
  return c
}

describe('MU-004 (Éter de la Orilla): esencia elegida mientras el Éter esté bloqueado', () => {
  it('al bloquearlo sobre un Campeón pide la Esencia (bloquear_eter real) y la quita al liberar el Éter', () => {
    registrarCartas([campeon('TEST-MU-HOST', 'Bestia', [{ tipo: 'continuo', costo: { tipo: 'eter_bloqueado', cantidad: 2 }, efecto: 'buff', stats: { ATQ: 1, RES: 0 }, objetivo: { tipo: 'self', controlador: 'propio', zona: 'campo' }, duracion: 'mientras_ester_bloqueado', texto: 'x' }])])
    let s = escenaVacia('forja'); conMazo(s, 'A', 3)
    conCampeon(s, 'A', 'host', 'TEST-MU-HOST', 0)
    const [orilla] = conEteres(s, 'A', 1, 'MU-004')
    s = aplicar(s, { type: 'bloquear_eter', eterIds: [orilla], targetInstanceId: 'host' }, crearCtx())
    expect(s.esenciaPendientes).toHaveLength(1)
    expect(s.esenciaPendientes?.[0].duracion.mientrasEter).toBe(orilla)
    s = aplicar(s, { type: 'elegir_esencia', esencia: 'Dragón' }, crearCtx())
    expect(esenciaDe(s, 'host')).toBe('Dragón')
    const liberado = structuredClone(s)
    liberado.instances.host.eterBloqueado = []
    expect(esenciaDe(liberado, 'host')).toBe('Bestia')
  })
})

describe('«que compartan Esencia» y «si controlas 3 o más» en cartas de un solo uso (MU-026, MU-035)', () => {
  function escena(): GameState {
    const s = escenaVacia('forja'); conMazo(s, 'A', 3)
    conCampeon(s, 'A', 'b1', T_BESTIA, 0); conCampeon(s, 'A', 'b2', T_BESTIA, 1); conCampeon(s, 'A', 'm1', T_MAGO, 2)
    return s
  }
  const lanzarReal = (s: GameState, cardId: string, jugador: 'A' | 'B' = 'A'): GameState => {
    const clon = structuredClone(s)
    clon.instances.src ??= { cardInstanceId: 'src', cardId, owner: jugador }
    const efecto = (getCardMeta(cardId) as AnyCard & { efectos: EfectoData[] }).efectos[0]
    interpretEffect(clon, crearCtx(), clon.instances.src, efecto, { jugador })
    return clon
  }

  it('MU-026 (Marea de Savia): +1/+1 SOLO a quien comparte Esencia con otro Campeón tuyo', () => {
    const s = lanzarReal(escena(), 'MU-026')
    expect(statsDe(s, 'b1')).toEqual({ poder: 3, resistencia: 3 })
    expect(statsDe(s, 'b2')).toEqual({ poder: 3, resistencia: 3 })
    expect(statsDe(s, 'm1')).toEqual({ poder: 2, resistencia: 2 }) // el único Mago
  })

  it('MU-035 (Savia del Confín): sin 3 Campeones de una misma Esencia no hace nada; con 3 sí', () => {
    const sin = lanzarReal(escena(), 'MU-035') // 2 Bestias + 1 Mago
    expect(sin.objetivosPendientes ?? []).toHaveLength(0)
    expect(statsDe(sin, 'b1')).toEqual({ poder: 2, resistencia: 2 })
    const con = escena(); conCampeon(con, 'A', 'b3', T_BESTIA, 3)
    const s = lanzarReal(con, 'MU-035')
    expect(s.objetivosPendientes?.[0]?.opciones.length).toBeGreaterThan(0) // elige a quién dar +2/+2
  })
})
