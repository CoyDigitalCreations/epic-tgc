import type { AnyCard, Paquete } from '../types'
import { FACCION_COLORS } from '../types'
import primerosEfectos from '../../../seed/PrimerColeccionEfectos.json'

/* ─────────────────────────────────────────────
   FUENTE DE VERDAD de diseños y efectos
   seed/PrimerColeccionEfectos.json (export de Card-Maker).

   paquetes.ts ya NO embebe cartas: solo metadata de paquetes
   (PAQUETES) y helpers. Los efectos que el motor interpreta
   salen del JSON. Card-Maker puede emitir campos extra
   (variantePago, disparoAgota, etc.) que el motor ignora.
   ───────────────────────────────────────────── */

export const ALL_CARDS: AnyCard[] = primerosEfectos as unknown as AnyCard[]

export const ESTASIS_CARDS: AnyCard[] = ALL_CARDS.filter((c) => c.paqueteId === 'estasis')
export const DISONANCIA_CARDS: AnyCard[] = ALL_CARDS.filter((c) => c.paqueteId === 'disonancia')

export const getCardById = (id?: string) => ALL_CARDS.find((c) => c.id === id)

/* ─────────────────────────────────────────────
   Registro de paquetes (metadata — no son los diseños)
   ───────────────────────────────────────────── */

export const PAQUETES: Paquete[] = [
  {
    id: 'estasis',
    nombre: 'Estásis',
    tipo: 'Mazo Temático',
    color: FACCION_COLORS.Orden,
    facciones: ['Orden'],
    entrega: 'Primogénitos',
    distribucion: { eter: 15, principal: 45, vinculos: 6 },
    lore:
      'Estásis ("El Ancla") es el mazo temático de la facción Orden y la primera ' +
      'entrega de Los Primogénitos. Antes de la Gran Escisión, cuando las facciones aún ' +
      'no habían tomado sus nombres, el polo del norte se llamaba Estásis: el Ancla ' +
      'y el Eje de la realidad. De la tensión entre los polos del Éter nacieron ' +
      'los Primogénitos del Éter: los primeros seres humanos en fusionarse con la ' +
      'energía primigenia, cada uno elegido al nacer por su casa noble para portar ' +
      'un cristal de Éter. En esta primera entrega, las primogénitas de Orden son ' +
      'mujeres y los primogénitos de Caos, hombres. Aurora, la Primogénita, fue la ' +
      'primera de todas y su sangre se convirtió en la fuente del poder de las casas.\n\n' +
      'Cuando la Gran Escisión partió el Eje y las casas cayeron en la guerra, las ' +
      'primogénitas del norte se negaron a elegir bando y formaron una hermandad ' +
      'errante, unidas por la sangre y el Éter: "No somos hijos de ningún reino. ' +
      'Somos el Reino."\n\n' +
      'El mazo juega con la economía de Éter: bloquear, devolver y reciclar recursos ' +
      'mientras los Campeones se fortalecen con cada cristal anclado.',
  },
  {
    id: 'disonancia',
    nombre: 'Disonancia',
    tipo: 'Mazo Temático',
    color: FACCION_COLORS.Caos,
    facciones: ['Caos'],
    entrega: 'Primogénitos',
    distribucion: { eter: 15, principal: 45, vinculos: 6 },
    lore:
      'Disonancia ("La Tormenta") es el mazo temático de la facción Caos y la segunda ' +
      'entrega de Los Primogénitos. En el sur, donde el Eje termina en un Nudo, los ' +
      'primogénitos de Caos son hombres: despertaron con el cristal del Nudo clavado ' +
      'en el pecho, y el Nudo aprieta cada vez que el Eje tiembla. Mientras Estásis ' +
      'ancla, Disonancia aprieta: la Tormenta no retiene lo que toma, lo rompe y lo ' +
      'suelta. Ragnar, Voz del Nudo, es el primero de todos — el hombre que habla por ' +
      'el sur y el único capaz de mirar a Aurora sin pestañear.\n\n' +
      'El mazo juega con la presión y la destrucción: romper los Campeones del rival ' +
      'y estrangular su economía de Éter mientras los Campeones de Caos avanzan como ' +
      'la tormenta que no se detiene.',
  },
]
export const getPaquete = (id?: string) => PAQUETES.find((p) => p.id === id)

/** Distribución de copias por tipo de carta (para tests e integridad) */
export const distribucionDe = (cards: AnyCard[]) => {
  const eter = cards.filter((c) => c.type === 'Éter')
  const vinculos = cards.filter((c) => c.type === 'Vínculo')
  const principal = cards.filter(
    (c) => c.type !== 'Éter' && c.type !== 'Vínculo',
  )
  const copias = (cs: AnyCard[]) =>
    cs.reduce((acc, c) => acc + Number(c.limiteCopias ?? 1), 0)
  return {
    eter: copias(eter),
    principal: copias(principal),
    vinculos: copias(vinculos),
    total: copias(cards),
  }
}

/** Distribución del paquete Estásis por tipo de carta */
export const estasisDistribucion = () => distribucionDe(ESTASIS_CARDS)

/** Distribución del paquete Disonancia por tipo de carta */
export const disonanciaDistribucion = () => distribucionDe(DISONANCIA_CARDS)

/* ─────────────────────────────────────────────
   Progreso de colección por paquete
   La colección guarda 1 carta por diseño con limiteCopias (×N),
   así que "coleccionadas" suma copias, no diseños únicos.
   ───────────────────────────────────────────── */

export interface ProgresoPaquete {
  paqueteId: string
  coleccionadas: number
  total: number
  completo: boolean
}

/** Progreso de un paquete en la colección actual (copias / total de copias) */
export function progresoPaquete(
  cards: AnyCard[],
  paqueteId: string,
): ProgresoPaquete | null {
  const paquete = getPaquete(paqueteId)
  if (!paquete) return null
  const { eter, principal, vinculos } = paquete.distribucion
  const total = eter + principal + vinculos
  const coleccionadas = cards
    .filter((c) => c.paqueteId === paqueteId)
    .reduce((acc, c) => acc + Number(c.limiteCopias ?? 1), 0)
  return {
    paqueteId,
    coleccionadas,
    total,
    completo: coleccionadas >= total,
  }
}

/* ─────────────────────────────────────────────
   Arte versionado — convención automática.
   Los PNGs viven en public/cartas/{cardId}.png.
   ───────────────────────────────────────────── */

export const CARD_ART_IDS: ReadonlySet<string> = new Set([
  ...ESTASIS_CARDS.map((c) => c.id),
  ...DISONANCIA_CARDS.map((c) => c.id),
])

/** Ruta del arte oficial de una carta, o undefined si no tiene */
export function cardArtPath(cardId: string | undefined): string | undefined {
  if (!cardId || !CARD_ART_IDS.has(cardId)) return undefined
  return `/cartas/${cardId}.png`
}
