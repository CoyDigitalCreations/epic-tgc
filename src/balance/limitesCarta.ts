import { CONFIG_V1 } from './config'
import { evaluarEfectoPorCoste } from './efectoPorCoste'
import { evaluarConImpuesto } from './presupuesto'
import { evaluarTabu } from './tabu'
import type { CartaBalance, ConfigBalance } from './tipos'

/**
 * Cómo está una carta frente a un límite:
 *  - dentro:     le sobra margen.
 *  - limite:     usa casi todo (a `analisis.cercaDelTope` puntos o menos).
 *  - excede:     REBASA el límite.
 *  - bajo:       queda por debajo de un mínimo (la carta está regalada para su coste).
 *  - sin-limite: el límite no aplica a esta carta; se muestra para que se entienda por qué.
 */
export type EstadoLimite = 'dentro' | 'limite' | 'excede' | 'bajo' | 'sin-limite'

/** Un presupuesto o índice de la carta: cuánto usa y cuánto puede, en palabras. */
export interface LimiteCarta {
  /** Clave estable para tests y para la lista de la vista. */
  id: 'atq' | 'res' | 'suma' | 'suma-minima' | 'tabu' | 'efecto-por-coste' | 'verbo-por-coste'
  etiqueta: string
  /** Lo que la carta usa; null si no aplica. */
  usado: number | null
  /** El límite (máximo, o mínimo en `suma-minima`); null si la carta no tiene. */
  limite: number | null
  estado: EstadoLimite
  /** De dónde sale el límite y, si se pasa, por cuánto. */
  detalle: string
}

export interface ResumenLimites {
  /** Límites que la carta rebasa. */
  rebasados: LimiteCarta[]
  /** Mínimos que no alcanza (carta regalada). */
  bajoMinimo: LimiteCarta[]
  /** Límites que usa casi por completo. */
  enLimite: LimiteCarta[]
}

/** Un decimal, sin ruido de flotante. */
const redondear = (n: number): number => Math.round(n * 10) / 10

/** `dentro`, `limite` o `excede` según cuánto margen queda contra un máximo. */
function contraMaximo(usado: number, maximo: number, cfg: ConfigBalance): 'dentro' | 'limite' | 'excede' {
  const holgura = redondear(maximo - usado)
  if (holgura < 0) return 'excede'
  return holgura <= cfg.analisis.cercaDelTope ? 'limite' : 'dentro'
}

/**
 * Todos los límites que se le miden a una carta, uno por fila y siempre con el mismo criterio que el Tablero de balance
 * (reusa `evaluarConImpuesto`, `evaluarTabu` y `evaluarEfectoPorCoste`: aquí no se repite ninguna regla).
 *
 *  - Campeón con banda: tope de ATQ, tope de RES, presupuesto de suma (stats + impuesto de efecto) y, si queda corta, el mínimo de suma.
 *  - Cualquier carta con coste >= 1: presupuesto de tabú, tope de efecto por coste y coste mínimo por verbo.
 *
 * No incluye letalidad (cuántos rivales mata): eso solo tiene sentido contra el pool completo, en el Tablero.
 */
export function limitesDeCarta(carta: CartaBalance, cfg: ConfigBalance = CONFIG_V1): LimiteCarta[] {
  const filas: LimiteCarta[] = []
  const ev = evaluarConImpuesto(carta, cfg)

  if (ev !== null) {
    const origen = ev.elite ? ' (élite: incluye sacrificios y rareza)' : ''
    filas.push({
      id: 'atq',
      etiqueta: 'Tope de ATQ',
      usado: ev.atq,
      limite: ev.banda.topeAtq,
      estado: contraMaximo(ev.atq, ev.banda.topeAtq, cfg),
      detalle: `ATQ máximo para coste ${carta.coste}${origen}.`,
    })
    filas.push({
      id: 'res',
      etiqueta: 'Tope de RES',
      usado: ev.res,
      limite: ev.banda.topeRes,
      estado: contraMaximo(ev.res, ev.banda.topeRes, cfg),
      detalle: `RES máxima para coste ${carta.coste}${origen}.`,
    })

    const gasto = redondear(ev.suma + ev.impuesto)
    const sobre = redondear(ev.suma - ev.objetivoSuma)
    filas.push({
      id: 'suma',
      etiqueta: 'Presupuesto de stats',
      usado: gasto,
      limite: ev.banda.sumaMax,
      estado: contraMaximo(ev.suma, ev.objetivoSuma, cfg),
      detalle:
        `Stats ${ev.suma} + impuesto de efecto ${redondear(ev.impuesto)} contra una suma máxima de ${ev.banda.sumaMax}${origen}.` +
        (sobre > 0 ? ` Se pasa por ${sobre}.` : ''),
    })

    const minimo = redondear(Math.max(0, ev.banda.sumaMin - ev.impuesto))
    if (ev.estado === 'bajo') {
      filas.push({
        id: 'suma-minima',
        etiqueta: 'Suma mínima',
        usado: ev.suma,
        limite: minimo,
        estado: 'bajo',
        detalle: `Por debajo del mínimo de ${minimo} para coste ${carta.coste}: la carta está regalada, puede subir ${redondear(minimo - ev.suma)}.`,
      })
    }
  }

  const tabu = evaluarTabu(carta, cfg)
  if (tabu.max === null) {
    filas.push({ id: 'tabu', etiqueta: 'Presupuesto de tabú', usado: tabu.puntos, limite: null, estado: 'sin-limite', detalle: 'Las cartas de coste 0 no tienen presupuesto de tabú.' })
  } else {
    const partes = [`Máximo ${tabu.maxBase ?? 0} por coste${tabu.elite ? ', sacrificios y rareza' : ''}`]
    if (tabu.bono > 0) partes.push(`+${tabu.bono} por stats sin gastar`)
    filas.push({
      id: 'tabu',
      etiqueta: 'Presupuesto de tabú',
      usado: tabu.puntos,
      limite: tabu.max,
      estado: tabu.estado === 'excede' ? 'excede' : tabu.estado === 'en-limite' ? 'limite' : 'dentro',
      detalle: `${partes.join(' ')}.${tabu.exceso > 0 ? ` Se pasa por ${redondear(tabu.exceso)}.` : ''}`,
    })
  }

  const efecto = evaluarEfectoPorCoste(carta, cfg)
  if (efecto.indiceMax !== null) {
    if (efecto.aplicaTope) {
      filas.push({
        id: 'efecto-por-coste',
        etiqueta: 'Tope de efecto por coste',
        usado: efecto.indice,
        limite: efecto.indiceMax,
        estado: contraMaximo(efecto.indice, efecto.indiceMax, cfg),
        detalle: `Índice de poder de sus efectos contra coste ${carta.coste} × ${cfg.poderPorCoste}.${efecto.excesoIndice > 0 ? ` Se pasa por ${efecto.excesoIndice}.` : ''}`,
      })
    } else {
      filas.push({
        id: 'efecto-por-coste',
        etiqueta: 'Tope de efecto por coste',
        usado: efecto.indice,
        limite: null,
        estado: 'sin-limite',
        detalle: 'Es élite: su poder de efecto ya se cobra en el presupuesto de stats y en el de tabú, no con este tope plano.',
      })
    }
  }

  if (efecto.verbosBajoCosto.length > 0) {
    const peor = Math.max(...efecto.verbosBajoCosto.map((v) => v.costeMinimo))
    filas.push({
      id: 'verbo-por-coste',
      etiqueta: 'Coste mínimo por verbo',
      usado: efecto.costeVerbo,
      limite: peor,
      estado: 'excede',
      detalle: `${efecto.verbosBajoCosto.map((v) => `${v.verbo} pide coste ${v.costeMinimo}`).join('; ')}, y la carta cuenta con ${efecto.costeVerbo}.`,
    })
  }

  return filas
}

/** Agrupa los límites por lo que importa al diseñar: qué rebasa, qué no alcanza y qué está al límite. */
export function resumenDeLimites(limites: readonly LimiteCarta[]): ResumenLimites {
  return {
    rebasados: limites.filter((l) => l.estado === 'excede'),
    bajoMinimo: limites.filter((l) => l.estado === 'bajo'),
    enLimite: limites.filter((l) => l.estado === 'limite'),
  }
}
