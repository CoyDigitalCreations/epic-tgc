import type { AnyCard, EfectoData } from '../shared/types'
import { efectosComandante } from '../shared/efectoComandante'
import { CONFIG_V1 } from './config'
import type {
  CargaBalance,
  CartaBalance,
  ConfigBalance,
  EfectoBalance,
  MazoId,
  StatsCampeon,
} from './tipos'

const MAZOS: readonly MazoId[] = ['estasis', 'disonancia']

function mazoDe(paqueteId: string | undefined): MazoId | null {
  return MAZOS.find((m) => m === paqueteId) ?? null
}

/** Keywords que otorga un efecto: la del verbo grant_keyword y las de sus tramos. */
function keywordsConcedidas(e: EfectoData): string[] {
  const lista: string[] = []
  if (e.efecto === 'grant_keyword' && e.keyword) lista.push(e.keyword)
  for (const t of e.tramos ?? []) {
    if (t.efecto === 'grant_keyword' && t.keyword) lista.push(t.keyword)
  }
  return lista
}

function normalizarEfecto(e: EfectoData, esComandante: boolean): EfectoBalance {
  const verbosTramos = (e.tramos ?? []).map((t) => t.efecto)
  const verbo = e.efecto ?? null
  return {
    verbo,
    sinVerbo: verbo === null && verbosTramos.length === 0,
    verbosTramos,
    tipo: e.tipo,
    trigger: e.trigger ?? null,
    objetivoTipo: e.objetivo?.tipo ?? null,
    // Se lee como string: el seed trae valores fuera de la unión de tipos.
    duracion: (e.duracion as string | undefined) ?? null,
    costoTipo: e.costo?.tipo ?? null,
    costoCantidad: e.costo?.cantidad ?? 0,
    ...(e.buffPerBlockedEther ? { buffPorEterBloqueado: true } : {}),
    ...(e.reglaEnumerada !== undefined ? { reglaEnumerada: e.reglaEnumerada } : {}),
    ...(e.regla?.id !== undefined ? { reglaCatalogo: e.regla.id } : {}),
    ...(e.objetivo?.controlador !== undefined ? { objetivoControlador: e.objetivo.controlador } : {}),
    ...(e.objetivo?.controladorDestino !== undefined ? { controladorDestino: e.objetivo.controladorDestino } : {}),
    ...(e.sinPagarCosto ? { sinPagarCosto: true } : {}),
    ...(e.sinAgotar ? { sinAgotar: true } : {}),
    ...(e.reagrupar?.alcance !== undefined ? { reagruparAlcance: e.reagrupar.alcance } : {}),
    activacion: e.activacion ?? null,
    keywordsConcedidas: keywordsConcedidas(e),
    esComandante,
  }
}

function statsDe(c: AnyCard): StatsCampeon | null {
  if (c.type !== 'Campeón') return null
  const { poder, resistencia } = c.stats ?? {}
  if (typeof poder !== 'number' || typeof resistencia !== 'number') return null
  return { atq: poder, res: resistencia }
}

function efectosDe(c: AnyCard): EfectoBalance[] {
  const lista = (c.efectos ?? []).map((e) => normalizarEfecto(e, false))
  if (c.type === 'Campeón') {
    for (const e of efectosComandante(c.efectoComandante)) lista.push(normalizarEfecto(e, true))
  }
  return lista
}

/**
 * Normaliza las cartas del seed para el tablero. No muta la entrada y no
 * lanza con datos incompletos: los reporta en `avisos`.
 */
export function cargarCartas(cards: readonly AnyCard[], cfg: ConfigBalance = CONFIG_V1): CargaBalance {
  const avisos: string[] = []

  const cartas: CartaBalance[] = cards.map((c) => {
    const efectos = efectosDe(c)
    for (const e of efectos) {
      if (e.sinVerbo) avisos.push(`${c.id}: efecto sin verbo`)
      if (e.duracion !== null && !(e.duracion in cfg.poder.duracion)) {
        avisos.push(`${c.id}: duración desconocida «${e.duracion}», se usa el peso por defecto`)
      }
    }
    const keywords: string[] = [...(c.keywords ?? [])]
    for (const k of keywords) {
      if (!(k in cfg.poder.keyword)) avisos.push(`${c.id}: keyword desconocida «${k}», se usa el peso por defecto`)
    }
    for (const k of efectos.flatMap((e) => e.keywordsConcedidas)) {
      if (!(k in cfg.poder.keyword)) avisos.push(`${c.id}: keyword concedida desconocida «${k}», se usa el peso por defecto`)
    }
    return {
      id: c.id,
      nombre: c.name,
      tipo: c.type,
      rareza: c.rarity,
      coste: c.stats?.cost ?? 0,
      mazo: mazoDe(c.paqueteId),
      roles: c.roles ?? [],
      stats: statsDe(c),
      keywords,
      efectos,
    }
  })

  return {
    cartas,
    estasis: cartas.filter((c) => c.mazo === 'estasis'),
    disonancia: cartas.filter((c) => c.mazo === 'disonancia'),
    campeones: cartas.filter((c) => c.tipo === 'Campeón'),
    totalEfectos: cartas.reduce((n, c) => n + c.efectos.length, 0),
    avisos,
  }
}
