/**
 * Reglas vigentes: el manual (Capa 1) con los modificadores de las cartas (Capa 2) aplicados.
 *
 * ÚNICA vía por la que el motor consulta una regla del manual. Nunca se guarda el resultado:
 * los modificadores se DERIVAN del estado (keywords, efectos de cartas en juego, reglas
 * temporales), igual que las auras de stats — sin estado que limpiar y siempre consistente.
 *
 * Fuentes de modificadores:
 *  1. Keywords del Campeón (KEYWORD_REGLAS): una keyword es una regla modificada.
 *  2. Efectos `modificar_regla` de cartas en juego (campo, Éter en Reserva/pagado/bloqueado,
 *     Vínculos destruidos), con la misma activación que usan las auras.
 *  3. Reglas temporales (`GameState.reglasTemporales`), creadas por efectos de resolución.
 */
import {
  KEYWORD_REGLAS,
  REGLAS,
  resolverRegla,
  type ModificacionRegla,
  type ModificadorRegla,
  type ReglaId,
} from '../../shared/rules/reglas'
import type { EfectoData } from '../../shared/types'
import { getCardMeta } from './cards'
import { keywordsDe } from './efectos'
import { efectosPrestadosDe } from './efectosInstancia'
import { contarEterUmbral } from './eter'
import type { CardInstance, GameState, PlayerId } from './types'

/** Reglas cuyo valor base es un número / un booleano (para que el tipo de retorno sea exacto). */
export type ReglaNumerica = { [K in ReglaId]: (typeof REGLAS)[K]['base'] extends number ? K : never }[ReglaId]
export type ReglaBooleana = Exclude<ReglaId, ReglaNumerica>

/** A quién se le consulta la regla: un jugador, una carta (Campeón o soporte) o nadie (regla de partida). */
export type SujetoRegla = { jugador: PlayerId } | { instId: string } | undefined

const otro = (j: PlayerId): PlayerId => (j === 'A' ? 'B' : 'A')

/**
 * La modificación de regla que lleva un efecto: `modificar_regla` la declara; `direct_attack` es el atajo de
 * "este Campeón no puede ser bloqueado" (misma idea que una keyword: no tiene lógica propia, cambia una regla).
 */
export function reglaDeEfecto(efecto: EfectoData): ModificacionRegla | undefined {
  if (efecto.efecto === 'direct_attack') return { id: 'puedeSerBloqueado', operacion: 'prohibir' }
  return efecto.efecto === 'modificar_regla' ? efecto.regla : undefined
}

/** Efectos `modificar_regla` de una carta (memo por cardId: el catálogo no cambia durante la partida). */
const memoEfectosRegla = new Map<string, { efecto: EfectoData; indice: number }[]>()
function efectosReglaDe(cardId: string): { efecto: EfectoData; indice: number }[] {
  const memo = memoEfectosRegla.get(cardId)
  if (memo) return memo
  const meta = getCardMeta(cardId)
  const lista =
    meta && 'efectos' in meta && meta.efectos
      ? meta.efectos.map((efecto, indice) => ({ efecto, indice })).filter(({ efecto }) => !!reglaDeEfecto(efecto))
      : []
  memoEfectosRegla.set(cardId, lista)
  return lista
}

/** Los `modificar_regla` de una INSTANCIA: los impresos (memo) más los que copió de otro Campeón (sus índices siguen a los impresos). */
function efectosReglaDeInst(s: GameState, inst: CardInstance): { efecto: EfectoData; indice: number }[] {
  const impresos = efectosReglaDe(inst.cardId as string)
  const prestados = efectosPrestadosDe(s, inst.cardInstanceId)
  if (prestados.length === 0) return impresos
  const meta = getCardMeta(inst.cardId as string)
  const n = meta && 'efectos' in meta ? (meta.efectos?.length ?? 0) : 0
  return [...impresos, ...prestados.map((efecto, k) => ({ efecto, indice: n + k })).filter(({ efecto }) => !!reglaDeEfecto(efecto))]
}

/** SOLO PARA TESTS: el catálogo de cartas puede cambiar (registrarCartas). */
export function limpiarMemoReglas(): void {
  memoEfectosRegla.clear()
}

type Origen = 'campo' | 'reserva' | 'pagado' | 'bloqueo' | 'vinculo'

interface FuenteRegla {
  inst: CardInstance
  origen: Origen
  /** Jugador que CONTROLA la fuente (en cuyo campo/zona está): de quien es el "propio" del efecto. */
  controlador: PlayerId
  /** Solo origen 'bloqueo': la carta anfitriona del Éter. */
  anfitrion?: string
}

/** Todas las cartas en juego que podrían modificar reglas (ya filtradas por tener un efecto `modificar_regla`). */
function fuentesDeReglas(s: GameState): FuenteRegla[] {
  const fuentes: FuenteRegla[] = []
  const tiene = (inst: CardInstance | undefined): inst is CardInstance =>
    !!inst?.cardId && efectosReglaDeInst(s, inst).length > 0

  for (const j of ['A', 'B'] as PlayerId[]) {
    const p = s.players[j]
    for (const id of [...p.campo.campeones, ...p.campo.misticasTacticas, ...p.campo.arcanasCombate]) {
      if (!id) continue
      const inst = s.instances[id]
      if (!inst) continue
      if (tiene(inst)) fuentes.push({ inst, origen: 'campo', controlador: j })
      // Los Éteres bloqueados aportan aunque el anfitrión no tenga efectos propios
      for (const eterId of inst.eterBloqueado ?? []) {
        const eter = s.instances[eterId]
        if (tiene(eter)) fuentes.push({ inst: eter, origen: 'bloqueo', controlador: j, anfitrion: id })
      }
    }
    for (const id of p.eterReserva) {
      const inst = s.instances[id]
      if (tiene(inst)) fuentes.push({ inst, origen: 'reserva', controlador: j })
    }
    for (const id of p.eterPagado) {
      const inst = s.instances[id]
      if (tiene(inst)) fuentes.push({ inst, origen: 'pagado', controlador: j })
    }
    // §5.5: solo los Vínculos DESTRUIDOS (boca arriba) tienen efectos vigentes; el efecto es de quien recibió el daño
    for (const id of p.vinculos) {
      const inst = id ? s.instances[id] : undefined
      if (tiene(inst) && inst.bocaArriba === true) fuentes.push({ inst, origen: 'vinculo', controlador: j })
    }
  }
  return fuentes
}

/** ¿Está vigente este efecto para esta fuente? (zona + tipo + duración + Éter bloqueado requerido) */
function efectoActivo(s: GameState, f: FuenteRegla, efecto: EfectoData, indice: number): boolean {
  if (efecto.trigger !== undefined && efecto.trigger !== 'ninguno') return false // los efectos con evento los ejecuta el intérprete
  switch (f.origen) {
    case 'campo': {
      if (efecto.tipo !== 'pasivo' && efecto.tipo !== 'continuo' && efecto.tipo !== 'comandante') return false
      const meta = f.inst.cardId ? getCardMeta(f.inst.cardId) : null
      if (meta?.type === 'Arcana' && f.inst.bocaArriba !== true) return false // una Arcana boca abajo no tiene efectos vigentes
      const costo = efecto.costo
      const pagaConBloqueo = costo?.tipo === 'eter_bloqueado' || costo?.tipo === 'bloqueo_fijo'
      if (pagaConBloqueo || efecto.duracion === 'mientras_ester_bloqueado') {
        const requerido = costo?.umbral ?? (costo?.tipo === 'bloqueo_fijo' ? costo.cantidad : undefined) ?? 1
        return contarEterUmbral(s, f.inst.cardInstanceId, indice, efecto) >= requerido
      }
      return true
    }
    case 'reserva':
      return efecto.tipo === 'reserva'
    case 'pagado':
      return efecto.tipo === 'pago'
    case 'bloqueo':
      return efecto.tipo === 'bloqueo'
    case 'vinculo':
      return efecto.tipo === 'vinculo'
  }
}

/** Jugadores a los que alcanza un efecto de ámbito jugador/partida, según el `controlador` de su objetivo. */
function jugadoresAfectados(f: FuenteRegla, efecto: EfectoData): PlayerId[] {
  const c = efecto.objetivo?.controlador ?? 'propio'
  if (c === 'ambos') return ['A', 'B']
  if (c === 'rival') return [otro(f.controlador)]
  return [f.controlador]
}

/** ¿Alcanza el efecto a la carta `instId`? (ámbitos campeón y carta) */
function afectaACarta(s: GameState, f: FuenteRegla, efecto: EfectoData, instId: string): boolean {
  if (f.origen === 'bloqueo') return f.anfitrion === instId // el Éter bloqueado modifica a su anfitrión
  const objetivo = efecto.objetivo
  const destino = s.instances[instId]
  if (!destino) return false
  const mismoControlador = (j: PlayerId) => s.players[j].campo.campeones.includes(instId) || s.players[j].campo.misticasTacticas.includes(instId) || s.players[j].campo.arcanasCombate.includes(instId)
  switch (objetivo?.tipo ?? 'self') {
    case 'self':
      return f.inst.cardInstanceId === instId
    case 'equipped_champion':
      return f.inst.equipadoA === instId
    case 'todos_campeones_propios':
      return mismoControlador(f.controlador)
    case 'todos_campeones_rivales':
      return mismoControlador(otro(f.controlador))
    case 'campeon': {
      const c = objetivo?.controlador ?? 'propio'
      if (c === 'ambos') return mismoControlador('A') || mismoControlador('B')
      return mismoControlador(c === 'rival' ? otro(f.controlador) : f.controlador)
    }
    default:
      return false
  }
}

/**
 * Reglas que alguna keyword modifica: solo para esas hace falta mirar las keywords del sujeto. Además de ahorrar trabajo,
 * evita un ciclo: `efectosActivos` se consulta desde `modificadoresJSONDe`, que alimenta a `keywordsDe`.
 */
const REGLAS_DE_KEYWORD = new Set<ReglaId>(Object.values(KEYWORD_REGLAS).flatMap((ms) => ms.map((m) => m.regla)))

/**
 * ¿Tiene `instId` sus efectos negados? (negar «efecto activo»: la regla `efectosActivos` está prohibida).
 * Quien lo consulta exceptúa lo que NO se niega: las keywords (identidad de la carta) y el efecto de Comandante (§10).
 */
export function efectosNegados(s: GameState, instId: string): boolean {
  return !reglaBool(s, 'efectosActivos', { instId })
}

/** Todos los modificadores que hoy alcanzan a `sujeto` para la regla `regla` (sin resolver). */
export function modificadoresReglaDe(s: GameState, regla: ReglaId, sujeto: SujetoRegla): ModificadorRegla[] {
  const def = REGLAS[regla]
  const mods: ModificadorRegla[] = []

  // 1. Keywords del Campeón (una keyword es una regla modificada). Orden 0: las más antiguas.
  if (sujeto && 'instId' in sujeto && REGLAS_DE_KEYWORD.has(regla)) {
    for (const kw of keywordsDe(s, sujeto.instId)) {
      for (const m of KEYWORD_REGLAS[kw] ?? []) if (m.regla === regla) mods.push({ ...m, orden: 0 })
    }
  }

  // 2. Efectos `modificar_regla` de cartas en juego
  for (const f of fuentesDeReglas(s)) {
    for (const { efecto, indice } of efectosReglaDeInst(s, f.inst)) {
      const m = reglaDeEfecto(efecto)
      if (!m || m.id !== regla || !efectoActivo(s, f, efecto, indice)) continue
      // Un Campeón con sus efectos negados no modifica reglas (salvo su efecto de Comandante). `efectosActivos` no se
      // niega a sí misma: así no hay recursión.
      if (regla !== 'efectosActivos' && f.origen === 'campo' && efecto.tipo !== 'comandante' && efectosNegados(s, f.inst.cardInstanceId)) continue
      let alcanza = false
      if (def.ambito === 'partida') alcanza = true
      else if (def.ambito === 'jugador') alcanza = !!sujeto && 'jugador' in sujeto && jugadoresAfectados(f, efecto).includes(sujeto.jugador)
      else alcanza = !!sujeto && 'instId' in sujeto && afectaACarta(s, f, efecto, sujeto.instId)
      if (alcanza) mods.push({ regla, operacion: m.operacion, valor: m.valor, orden: 0 })
    }
  }

  // 3. Reglas temporales
  for (const r of s.reglasTemporales ?? []) {
    if (r.regla !== regla) continue
    const su = r.sujeto
    const alcanza =
      su.tipo === 'partida' ||
      (su.tipo === 'jugador' && !!sujeto && 'jugador' in sujeto && su.jugador === sujeto.jugador) ||
      (su.tipo === 'carta' && !!sujeto && 'instId' in sujeto && su.instId === sujeto.instId)
    if (alcanza) mods.push({ regla, operacion: r.operacion, valor: r.valor, orden: r.orden })
  }
  return mods
}

/** Valor vigente de una regla NUMÉRICA. */
export function reglaNumero(s: GameState, regla: ReglaNumerica, sujeto?: SujetoRegla): number {
  return resolverRegla(regla, modificadoresReglaDe(s, regla, sujeto)) as number
}

/** Valor vigente de una regla BOOLEANA. */
export function reglaBool(s: GameState, regla: ReglaBooleana, sujeto?: SujetoRegla): boolean {
  return resolverRegla(regla, modificadoresReglaDe(s, regla, sujeto)) as boolean
}
