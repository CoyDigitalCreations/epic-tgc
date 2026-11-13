import type { AnyCard, Paquete } from '../types'
import { FACCION_COLORS } from '../types'
import primerosEfectos from '../../../seed/FuenteEfectos.json'

/* ─────────────────────────────────────────────
   FUENTE DEL RUNTIME de diseños y efectos
   seed/FuenteEfectos.json, derivada de FuenteArte.json
   (export con arte del Card-Maker; ver scripts/sync-forge-to-engine.ts).

   paquetes.ts ya NO embebe cartas: solo metadata de paquetes
   (PAQUETES) y helpers. Los efectos que el motor interpreta
   salen del JSON. Card-Maker puede emitir campos extra
   (variantePago, disparoAgota, etc.) que el motor ignora.
   ───────────────────────────────────────────── */

export const ALL_CARDS: AnyCard[] = primerosEfectos as unknown as AnyCard[]

export const ESTASIS_CARDS: AnyCard[] = ALL_CARDS.filter((c) => c.paqueteId === 'estasis')
export const DISONANCIA_CARDS: AnyCard[] = ALL_CARDS.filter((c) => c.paqueteId === 'disonancia')
export const PURGA_CARDS: AnyCard[] = ALL_CARDS.filter((c) => c.paqueteId === 'purga')
export const MUTACION_CARDS: AnyCard[] = ALL_CARDS.filter((c) => c.paqueteId === 'mutacion')

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
      'Estásis ("La Calma") es el mazo temático de la facción Orden y la primera ' +
      'entrega de Los Primogénitos. Antes de la Gran Escisión, cuando las facciones aún ' +
      'no habían tomado sus nombres, el polo del norte se llamaba Estásis: la Calma' +
      'y el Eje de la realidad. De la tensión entre los polos del Éter nacieron ' +
      'los Primogénitos del Éter: los primeros seres humanos en fusionarse con la ' +
      'energía primigenia, cada uno elegido al nacer por su casa noble para portar ' +
      'un cristal de Éter. En esta primera entrega, las primogénitas de Orden que conocemos son' +
      'mujeres y los primogénitos de Caos, hombres. Aurora, la Primogénita, fue la ' +
      'primera que las casas recuerdan, y se cuenta que su sangre se convirtió en la fuente del poder de las casas.\n\n' +
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
      'primogénitos de Caos conocidos hasta ahora son hombres: despertaron con el cristal del Nudo clavado ' +
      'en el pecho, y el Nudo aprieta cada vez que el Eje tiembla. Mientras Estásis ' +
      'ancla, Disonancia aprieta: la Tormenta no retiene lo que toma, lo rompe y lo ' +
      'suelta. Ragnar, Voz del Nudo, es el primero de todos — el hombre que habla por ' +
      'el sur y el único capaz de mirar a Aurora sin pestañear.\n\n' +
      'El mazo juega con la presión y la destrucción: romper los Campeones del rival ' +
      'y estrangular su economía de Éter mientras los Campeones de Caos avanzan como ' +
      'la tormenta que no se detiene.',
  },
  {
    id: 'purga',
    nombre: 'Purga',
    tipo: 'Mazo Temático',
    color: FACCION_COLORS.Purga,
    facciones: ['Purga'],
    entrega: 'Primogénitos',
    distribucion: { eter: 15, principal: 45, vinculos: 6 },
    lore:
      'Purga ("El Corte") es el mazo temático de la facción Purga y la tercera ' +
      'entrega de Los Primogénitos. Cuando la Escisión derramó el Éter por los costados ' +
      'del Eje, la Casa Raíz, jardinera del Eje, se dividió ante lo que el Derrame había ' +
      'tocado. Idris, el mayor, vio lo que ve un jardinero en una rama infectada: algo que ' +
      'se corta mientras el huerto todavía puede salvarse. Juró podar todo lo que el Derrame ' +
      'tocara, empezando por lo que más amaba. Su cristal no brilla: afila.\n\n' +
      'Idris no podó solo. A su lado se sentaron los Magos del Tribunal de la Poda, quienes ' +
      'leen el Éter como una sentencia: cada Mística es un juicio y cada Arcana, una pena ' +
      'que espera su hora. Son podadores, no verdugos: cortan lo que hay que cortar y nada más.\n\n' +
      'El mazo juega con la precisión: sentenciar, negar, limpiar y destruir. Pocos Campeones, ' +
      'muchos hechizos, y cada hechizo fabrica la carne que el Soberano sacrificará.',
  },
  {
    id: 'mutacion',
    nombre: 'Mutación',
    tipo: 'Mazo Temático',
    color: FACCION_COLORS.Mutación,
    facciones: ['Mutación'],
    entrega: 'Primogénitos',
    distribucion: { eter: 15, principal: 45, vinculos: 6 },
    lore:
      'Mutación ("El Cambio") es el mazo temático de la facción Mutación y la cuarta ' +
      'entrega de Los Primogénitos. Liora, la hermana menor de la Casa Raíz, miró lo que el ' +
      'Derrame había tocado y vio lo que ve una jardinera en la primera hoja de una especie ' +
      'que nadie ha visto: un brote. No cree que el cambio sea una enfermedad: cree que es ' +
      'lo único que no muere. Para Mutación el Eje no se rompió: cambió.\n\n' +
      'El Derrame no tocó solo a un niño. Tocó una manada, una orilla, un taller, una colina ' +
      'entera. Lo que salió de ahí ya no tenía nombre en ninguna casa: bestias con voz, ' +
      'elementales sin cauce, humanos que dejaron de parecerlo. Liora los reunió. Ninguno ' +
      'nació así: todos cambiaron.\n\n' +
      'El mazo juega con la transformación: cambiar de Esencia, copiar y crecer, ' +
      'y el cambio se alimenta a sí mismo.',
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
   Los WebP viven en public/cartas/{cardId}.webp.
   ───────────────────────────────────────────── */

// Toda carta del seed tiene su .webp (lo garantiza `sync:fuentes` y el test de fuentes): así Purga y Mutación
// muestran su arte aunque todavía no tengan entrada en PAQUETES.
export const CARD_ART_IDS: ReadonlySet<string> = new Set(ALL_CARDS.map((c) => c.id))

/** Ruta del arte oficial de una carta, o undefined si no tiene */
export function cardArtPath(cardId: string | undefined): string | undefined {
  if (!cardId || !CARD_ART_IDS.has(cardId)) return undefined
  return `/cartas/${cardId}.webp`
}
