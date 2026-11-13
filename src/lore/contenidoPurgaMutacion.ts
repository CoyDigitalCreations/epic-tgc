/**
 * Lore de PURGA y MUTACIÓN (entrega LOS PRIMOGÉNITOS) — BORRADOR de trabajo.
 *
 * Aún NO está conectado a `Lore.tsx` ni a `contenido.ts`: es el texto aprobado en conversación, listo para cablear
 * cuando existan los paquetes. Falta lo que depende de los efectos de cada carta: Primogénitos restantes, frases del
 * Éter y los cinco tiempos de cada mazo.
 *
 * Reglas del proyecto: español neutro mexicano (tuteo), sin voseo.
 */

/** Descripción de faceta propuesta (sustituiría a la de `FACETAS` en `contenido.ts`, que aún no se toca). */
export const DESCRIPCION_FACETA = {
  Purga: 'La justicia que poda lo corrupto para que el resto viva. Jueces, magos y guerreros.',
  Mutación: 'La vida retorcida, la evolución sin reglas. Bestias, elementales y quimeras.',
} as const

export interface CasaLore {
  nombre: string
  texto: string
  primogenitas: string
  /** Carta de Éter cuyo arte representa a la casa (por definir cuando haya arte). */
  arte?: string
}

/** La casa de la que salen los dos líderes. */
export const CASA_RAIZ: CasaLore = {
  nombre: 'CASA RAÍZ',
  texto:
    'La casa de los jardineros del Eje. Sabían dos verdades que nadie quiso oír juntas: que para que un árbol viva hay que podarlo, y que el árbol que no cambia con las estaciones muere. Sus dos hijos mayores heredaron una verdad cada uno.',
  primogenitas: 'Idris y Liora',
}

/** El Derrame: el origen compartido de Purga y Mutación, en cuatro párrafos. */
export const DERRAME: readonly string[] = [
  'Cuando la Escisión derramó el Éter por los costados del Eje, la mayor parte se perdió en la tierra. Una sola gota cayó sobre un niño que la Casa Raíz criaba en su huerto.',
  'No enfermó. No murió. Empezó a cambiar: primero el color de los ojos, después el peso de los huesos, después lo que sabía sin que nadie se lo hubiera enseñado. Le dijeron Brote, porque no dejaba de crecer.',
  'Idris, el mayor, miró al niño y vio lo que ve un jardinero en una rama infectada: algo que se corta mientras el huerto todavía puede salvarse. Liora, su hermana, miró al mismo niño y vio lo que ve un jardinero en la primera hoja de una especie que nadie ha visto: un brote.',
  'Los dos tenían razón. Ninguno pudo vivir con la razón del otro. Idris juró podar todo lo que el Derrame tocara, empezando por lo que más amaba. Liora juró defender todo lo que el Derrame cambiara, aunque dejara de parecerse a lo que era.',
]

/** Ficha de lore de un Primogénito. `id` queda vacío hasta que exista la carta en el seed. */
export interface PrimogenitoLore {
  id?: string
  nombre: string
  titulo: string
  linea: string
  rol: string
  texto: string
}

/** Los líderes y el niño. Solo el texto de Idris y el aura de Liora describen efectos ya decididos. */
export const PRIMOGENITOS_RAIZ: readonly PrimogenitoLore[] = [
  {
    nombre: 'Idris',
    titulo: 'El Podador',
    linea: 'Casa Raíz',
    rol: 'Soberano y Comandante',
    texto:
      'El mayor de la Casa Raíz. Para que el huerto viva, se poda: sacrifica a uno de los suyos y su corte alcanza a un Campeón rival de coste igual o menor. Bloquea Éter y a los Campeones rivales se les caen los incrementos: su cristal no brilla, afila. Como Comandante, cada Mística que juegas y cada Arcana que activas es una sentencia que afila a los Campeones de Purga.',
  },
  {
    nombre: 'Liora',
    titulo: 'La Hortelana del Cambio',
    linea: 'Casa Raíz',
    rol: 'Comandante',
    texto:
      'La hermana menor de la Casa Raíz. No cree que el cambio sea una enfermedad: cree que es lo único que no muere. Cuando uno de los suyos cambia de Esencia, el Éter que gastó vuelve a su Reserva: el cambio se alimenta.',
  },
  {
    nombre: 'Brote',
    titulo: 'El Dragón en Muda',
    linea: 'Casa Raíz',
    rol: 'Dragón',
    texto:
      'Lo que el Derrame tocó primero y lo que ninguno de los hermanos pudo terminar de entender. No es un dragón todavía: está en muda, a medio camino, y cada cambio lo acerca a algo que nadie ha visto. Idris quiso podarlo. Liora lo llama hijo.',
  },
]

/** Los Magos de Purga: el paquete de Místicas y Arcanas, contado como un tribunal. */
export const TRIBUNAL_DE_LA_PODA =
  'Idris no podó solo. A su lado se sentaron quienes sabían leer el Éter como una sentencia: los Magos del Tribunal de la Poda. No lanzan hechizos por poder: dictan juicio. Cada Mística es una sentencia y cada Arcana, una pena que espera su hora. Son podadores, no verdugos: cortan lo que hay que cortar y nada más.'

/** Las esencias variadas de Mutación, contadas como los otros hijos del Derrame. */
export const HIJOS_DEL_DERRAME =
  'El Derrame no tocó solo a Brote. Tocó una manada, una orilla, un taller, una colina entera. Lo que salió de ahí ya no tenía nombre en ninguna casa: bestias con voz, elementales sin cauce, humanos que dejaron de parecerlo. Liora los reunió. Ninguno nació así: todos cambiaron.'

/** Las dos frases del choque, dichas por los hermanos. */
export const CHOQUE_PURGA_MUTACION = {
  mutacion: 'Lo que tú llamas corrupción, yo lo llamo hijo.',
  purga: 'Lo que tú llamas hijo, ya está infectado.',
} as const

/** Purga frente a Mutación: las dos maneras de responder a la misma herida (como NORTE_SUR en `contenido.ts`). */
export const PURGA_MUTACION = [
  { rasgo: 'Faceta', purga: 'Purga · Noroeste', mutacion: 'Mutación · Sudeste' },
  { rasgo: 'Runa', purga: 'La Flecha / El Corte', mutacion: 'El Vórtice / El Cambio' },
  { rasgo: 'Se sostiene por', purga: 'Juicio: lo que se poda, se poda por algo', mutacion: 'Cambio: quien no cambia, muere' },
  { rasgo: 'Ante la Escisión', purga: 'Herida que se amputa', mutacion: 'Puerta que se abre' },
  { rasgo: 'Primogénitos (en esta entrega)', purga: 'Jueces, magos y guerreros del Tribunal de la Poda', mutacion: 'Los hijos del Derrame: esencias variadas' },
  { rasgo: 'Su fuerza', purga: 'Precisión', mutacion: 'Adaptación' },
  { rasgo: 'En la mesa', purga: 'Sentenciar, negar, limpiar, destruir', mutacion: 'Cambiar, transformar, copiar, crecer' },
] as const
