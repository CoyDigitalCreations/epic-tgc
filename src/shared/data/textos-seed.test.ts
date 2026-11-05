/**
 * Guardia de la REGLA DE ORO: el `texto` de un efecto NUNCA se escribe a mano; sale de `generateEffectText` (Card-Maker)
 * a partir de los campos. Si cambias un campo del seed, corre `npm run regenerar:textos` (o `-- --ids=FB-010,...`).
 *
 * Recorre FuenteEfectos.json (y FuenteArte.json cuando existe en esta PC) y CartasPrueba.json: efectos[] y
 * efectoComandante (objeto o arreglo). Falla si algún `texto` difiere del generado, SALVO la deriva histórica conocida
 * (DERIVA_CONOCIDA): textos de cartas fuera del rediseño de Estásis que se escribieron con un generador anterior.
 * La lista está exacta: si una de esas cartas se corrige (o aparece una deriva nueva) el test también falla, así la lista
 * solo puede encogerse.
 */
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { efectosConRuta, type CartaJson } from '../../../scripts/lib/regenerarTextos'
import { generateEffectText } from '../../forge/components/EffectList'

const RAIZ = resolve(__dirname, '../../..')

/** «id ruta» de cada efecto cuyo texto difiere del generado. */
function derivas(cartas: CartaJson[]): string[] {
  const out: string[] = []
  for (const carta of cartas) {
    for (const { ruta, efecto } of efectosConRuta(carta)) {
      if (efecto.texto !== generateEffectText(efecto)) out.push(`${String(carta.id)} ${ruta}`)
    }
  }
  return out
}

function cargar(archivo: string): CartaJson[] {
  return JSON.parse(readFileSync(resolve(RAIZ, 'seed', archivo), 'utf8')) as CartaJson[]
}

/**
 * Deriva histórica conocida de FuenteEfectos.json (cartas que el rediseño de Estásis NO tocó y Disonancia, congelada hasta su
 * propio rediseño). Cada entrada es un texto viejo que el generador actual escribiría distinto (acentos, «+1» → «1»,
 * «puedes» automático, etc.). Al rediseñar esa carta se regenera con `npm run regenerar:textos -- --ids=...` y se borra de aquí.
 */
export const DERIVA_CONOCIDA: readonly string[] = [
  'FB-007 efectos[0]',
  'FB-017 efectos[0]',
  'FB-025 efectos[0]',
  'FB-026 efectos[0]',
  'FB-027 efectos[0]',
  'FB-028 efectos[0]',
  'DS-002 efectos[0]',
  'DS-003 efectos[0]',
  'DS-004 efectos[0]',
  'DS-005 efectos[0]',
  'DS-007 efectos[0]',
  'DS-011 efectos[0]',
  'DS-025 efectos[0]',
  'DS-026 efectos[0]',
  'DS-031 efectos[0]',
  'DS-032 efectos[0]',
  'DS-033 efectos[0]',
]

/** Deriva histórica conocida de CartasPrueba.json (nunca se modifica ni se publica). */
export const DERIVA_CARTAS_PRUEBA: readonly string[] = [
  'PR-005 efectos[0]',
  'PR-006 efectos[0]',
  'PR-008 efectos[0]',
  'PR-009 efectos[0]',
  'PR-013 efectos[0]',
  'PR-014 efectos[0]',
  'PR-015 efectos[0]',
  'PR-019 efectos[0]',
  'PR-020 efectos[0]',
  'PR-021 efectos[0]',
  'PR-025 efectos[0]',
  'PR-028 efectos[0]',
  'PR-030 efectos[0]',
  'PR-045 efectos[0]',
  'PR-053 efectos[0]',
  'PR-060 efectos[0]',
  'PR-062 efectos[0]',
  'PR-074 efectos[0]',
  'PR-075 efectos[0]',
]

describe('textos del seed = generateEffectText(efecto)', () => {
  it('FuenteEfectos.json: ningún texto escrito a mano (salvo la deriva histórica conocida)', () => {
    expect(derivas(cargar('FuenteEfectos.json'))).toEqual(DERIVA_CONOCIDA)
  })

  it('FuenteEfectos.json: todo efecto trae texto', () => {
    const sinTexto = cargar('FuenteEfectos.json').flatMap((c) =>
      efectosConRuta(c).filter(({ efecto }) => !efecto.texto).map(({ ruta }) => `${String(c.id)} ${ruta}`),
    )
    expect(sinTexto).toEqual([])
  })

  it('CartasPrueba.json: sus textos coinciden con el generador (salvo deriva conocida)', () => {
    expect(derivas(cargar('CartasPrueba.json'))).toEqual(DERIVA_CARTAS_PRUEBA)
  })

  // FuenteArte.json es local (fuera de git): solo se comprueba si está en esta PC
  it.skipIf(!existsSync(resolve(RAIZ, 'seed', 'FuenteArte.json')))('FuenteArte.json: mismos textos que FuenteEfectos (y misma deriva)', () => {
    expect(derivas(cargar('FuenteArte.json'))).toEqual(DERIVA_CONOCIDA)
  })

  it('la regla de oro del rediseño de Estásis: los textos objetivo de Aurora, Mira, Runa de Ancla...', () => {
    const porId = new Map(cargar('FuenteEfectos.json').map((c) => [String(c.id), c]))
    const textos = (id: string) => efectosConRuta(porId.get(id)!).map(({ efecto }) => efecto.texto)
    expect(textos('FB-010')).toEqual([
      'Puedes pagar 2 Éter, una vez por turno, activa un efecto Disparo de otro Campeón que controles sin pagar su costo ni agotarlo.',
      'Una vez por turno, bloquea 3 Éter, los Campeones del rival cuestan 1 Éter más, mientras tenga Éter bloqueado. Al inicio de tu Alba reagrupa todo el Éter bloqueado en esta carta.',
      'Incremento de 2 de ATQ y 2 de RES.',
      'Una vez por turno por Campeón, el efecto Disparo no agota.',
    ])
    expect(textos('FB-033')).toEqual(['Selecciona hasta 2 Éter que controla el rival en su zona de pago, estos no se reagrupan en su próxima Alba.'])
    expect(textos('FB-022')).toEqual(['Cambia el agotamiento de todos tus Campeones agotados.'])
    expect(textos('FB-011')).toEqual(['Al matar en combate, puedes devolver 1 Éter de tu zona de pago a tu Reserva.'])
  })
})
