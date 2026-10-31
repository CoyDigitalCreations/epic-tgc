/**
 * Contenido del lore (entrega LOS PRIMOGÉNITOS). El texto viene del antiguo `primogenitos.html` (estático, ya retirado);
 * el arte es SOLO la ilustración (`/cartas/{id}.webp`, sin marco de carta).
 */

/** Ruta del arte puro de una carta (1024×1024, sin marco). */
export const arte = (id: string) => `/cartas/${id}.webp`

export interface Faceta {
  nombre: string
  faceta: string
  runa: string
  posicion: string
  descripcion: string
  /** Color del texto/acento (hex). */
  color: string
  /** Posición en el mapa del Eje (viewBox 360×360). */
  x: number
  y: number
}

export const POLOS: Faceta[] = [
  {
    nombre: 'ORDEN',
    faceta: 'Estásis',
    runa: 'El Ancla / El Eje',
    posicion: 'Norte',
    descripcion: 'Disciplina, luz, protección. Paladines y ángeles.',
    color: '#22d3ee',
    x: 180,
    y: 34,
  },
  {
    nombre: 'CAOS',
    faceta: 'Disonancia',
    runa: 'La Tormenta / El Nudo',
    posicion: 'Sur',
    descripcion: 'Tinieblas, agresión, sacrificio. Demonios y sombras.',
    color: '#ef4444',
    x: 180,
    y: 326,
  },
]

export const FACETAS: Faceta[] = [
  {
    nombre: 'LEY',
    faceta: 'Ley',
    runa: 'La Escuadra / El Cimiento',
    posicion: 'Noreste',
    descripcion: 'El orden que construye y legisla el progreso.',
    color: '#38bdf8',
    x: 284,
    y: 94,
  },
  {
    nombre: 'PURGA',
    faceta: 'Purga',
    runa: 'La Flecha / El Corte',
    posicion: 'Noroeste',
    descripcion: 'La justicia implacable que arrasa lo corrupto.',
    color: '#ec4899',
    x: 76,
    y: 94,
  },
  {
    nombre: 'CREACIÓN',
    faceta: 'Vitalidad',
    runa: 'La Espiral / El Crecimiento',
    posicion: 'Este',
    descripcion: 'Vida, crecimiento, innovación. Constructos y druidas.',
    color: '#22c55e',
    x: 322,
    y: 180,
  },
  {
    nombre: 'DESTRUCCIÓN',
    faceta: 'Vacío',
    runa: 'La Cruz Rota',
    posicion: 'Oeste',
    descripcion: 'Fin, purga, renovación. Guerreros del apocalipsis.',
    color: '#f97316',
    x: 38,
    y: 180,
  },
  {
    nombre: 'MUTACIÓN',
    faceta: 'Mutación',
    runa: 'El Vórtice / El Cambio',
    posicion: 'Sudeste',
    descripcion: 'La vida retorcida, la evolución sin reglas.',
    color: '#84cc16',
    x: 284,
    y: 266,
  },
  {
    nombre: 'ENTROPÍA',
    faceta: 'Entropía',
    runa: 'La Brecha / El Desgaste',
    posicion: 'Sudoeste',
    descripcion: 'La decadencia total, el vacío que consume.',
    color: '#a855f7',
    x: 76,
    y: 266,
  },
]

export interface PreguntaFaceta {
  pregunta: string
  respuesta: string
  nombre: string
  color: string
}

export const MITO_FACETAS: PreguntaFaceta[] = [
  { pregunta: '¿Qué ordena lo disperso?', respuesta: 'La Escuadra que construye.', nombre: 'LEY', color: '#38bdf8' },
  { pregunta: '¿Qué se poda para que el resto viva?', respuesta: 'La Flecha que corta lo corrupto.', nombre: 'PURGA', color: '#ec4899' },
  { pregunta: '¿Qué florece si se lo cuida?', respuesta: 'La Espiral que crece.', nombre: 'CREACIÓN', color: '#22c55e' },
  { pregunta: '¿Qué se deshace cuando nada lo sostiene?', respuesta: 'La Brecha que consume.', nombre: 'ENTROPÍA', color: '#a855f7' },
  { pregunta: '¿Qué cambia cuando las reglas mueren?', respuesta: 'El Vórtice sin ley.', nombre: 'MUTACIÓN', color: '#84cc16' },
  { pregunta: '¿Qué termina para que algo comience?', respuesta: 'La Cruz Rota que renueva por el fuego.', nombre: 'DESTRUCCIÓN', color: '#f97316' },
]

/** Las etapas del Gran Ciclo, cada una con su carta de arte. */
export const CICLO = [
  {
    titulo: 'El Alba despierta',
    texto:
      'Cuando el día comienza, el Éter fluye sin esfuerzo: bloquear un cristal sin agotarlo es el primer juramento del turno.',
    cartas: 'Primer Juramento · Marcha de las Primeras · Voz del Alba',
    arte: 'FB-001',
  },
  {
    titulo: 'Anclar la promesa',
    texto:
      'Cada Éter bloqueado en una hermana es un cristal que la sostiene: le da Vigor, le da Inmortal, la vuelve imparable.',
    cartas: 'Éter del Despertar · Éter de la Primogénita',
    arte: 'FB-007',
  },
  {
    titulo: 'Devolver al alba',
    texto:
      'El Éter gastado no se pierde: regresa a la Reserva, porque el alba devuelve lo que la noche tomó.',
    cartas: 'Refugio de las Casas · Mira · Voz del Alba',
    arte: 'FB-022',
  },
  {
    titulo: 'Recuperar la memoria',
    texto:
      'Lo que cae al Cementerio tampoco muere: la memoria del Éter lo trae de vuelta, y el filo del cristal no corta, recuerda.',
    cartas: 'Filo del Éter Primigenio · Voz del Alba',
    arte: 'FB-024',
  },
]

export interface Casa {
  nombre: string
  texto: string
  primogenitas: string
  /** Carta de Éter cuyo arte representa a la casa. */
  arte: string
}

export const CASAS: Casa[] = [
  {
    nombre: 'CASA ALBA',
    texto: 'La primera casa, nacida del primer amanecer. Su heredad es el alba: lo que construye, lo reclama.',
    primogenitas: 'Aurora y Vaela, Sed de Alba',
    arte: 'FB-001',
  },
  {
    nombre: 'CASA SERENA',
    texto: 'La casa del consejo y de la palabra, donde las runas se hablaban antes de escribirse. El norte recuerda a sus hijas.',
    primogenitas: 'Seraphina, la voz, y Elena, el despertar',
    arte: 'FB-005',
  },
  {
    nombre: 'CASA VIGÍA',
    texto: 'Guardianes del Reino Perdido, centinelas del Eje que juraron no dormir jamás. Su primogénita vio caer su reino y juró que el próximo no caerá.',
    primogenitas: 'Cassandra, Vigía del Reino Perdido',
    arte: 'FB-002',
  },
  {
    nombre: 'CASA ETERNA',
    texto: 'La casa del vínculo y de la sangre, donde los pactos valían más que las espadas. Lo que corre por sus venas no es sangre: es promesa.',
    primogenitas: 'Rowena, Vínculo Eterno, y Nymeria, Conducto Roto',
    arte: 'FB-003',
  },
  {
    nombre: 'CASA ÚLTIMA',
    texto: 'La casa que resistió hasta el final, la que no cayó por débil sino por tozuda. Su cristal fue el último en apagarse.',
    primogenitas: 'Isolde, Última Casa',
    arte: 'FB-009',
  },
  {
    nombre: 'LA HUÉRFANA',
    texto: 'No toda primogénita tuvo casa que la reclamara. Mira despertó sobre las ruinas de un linaje sin nombre, y el Éter la reclamó a ella. Ninguna casa la recibió; la hermandad sí.',
    primogenitas: 'Mira, Cristal Huérfano',
    arte: 'FB-006',
  },
]

export interface Campeona {
  id: string
  nombre: string
  titulo: string
  linea: string
  rol: string
  texto: string
}

export const CAMPEONAS: Campeona[] = [
  { id: 'FB-010', nombre: 'Aurora', titulo: 'La Primogénita', linea: 'Casa Alba', rol: 'Soberana', texto: 'La primera de todas, el ancla. Su presencia domina el campo y arrebata la voluntad del rival.' },
  { id: 'FB-011', nombre: 'Vaela', titulo: 'Sed de Alba', linea: 'Casa Alba', rol: 'Normal', texto: 'Ataca antes de que el alba termine de cantar; la urgencia del amanecer hecha guerrera.' },
  { id: 'FB-012', nombre: 'Mira', titulo: 'Cristal Huérfano', linea: 'La Huérfana', rol: 'Éter', texto: 'Recupera lo que otros dan por perdido: cada Éter gastado vuelve a sus manos.' },
  { id: 'FB-013', nombre: 'Seraphina', titulo: 'Voz de las Casas', linea: 'Casa Serena', rol: 'Normal', texto: 'Sus palabras aún resuenan en las ruinas; con una frase cambia el orden del campo.' },
  { id: 'FB-014', nombre: 'Isolde', titulo: 'Última Casa', linea: 'Casa Última', rol: 'Soporte', texto: 'Muro de carne, promesa de cristal: mientras ella resiste, las hermanas crecen.' },
  { id: 'FB-015', nombre: 'Elena', titulo: 'Despertar del Éter', linea: 'Casa Serena', rol: 'Normal', texto: 'El Éter que la despierta también la alimenta: cada cristal anclado la vuelve más fuerte.' },
  { id: 'FB-016', nombre: 'Cassandra', titulo: 'Vigía del Reino Perdido', linea: 'Casa Vigía', rol: 'Soporte', texto: 'Vio caer su reino y juró que el próximo no caerá: sostiene la defensa de todas.' },
  { id: 'FB-017', nombre: 'Nymeria', titulo: 'Conducto Roto', linea: 'Casa Eterna', rol: 'Éter', texto: 'Su cristal se rompió en la guerra: ahora rompe lo que ata y libera lo que fue tomado.' },
  { id: 'FB-018', nombre: 'Rowena', titulo: 'Vínculo Eterno', linea: 'Casa Eterna', rol: 'Soporte', texto: 'El vínculo es la vida: guardiana de los pactos, nadie tocará a sus hermanas.' },
]

/**
 * Primogénitos de Caos (mazo Disonancia). `linea` es la ficha de juego (coste · ATQ/RES) y `rol` la
 * palabra clave; el texto describe el efecto real de la carta (seed/FuenteEfectos.json) con voz del lore.
 */
export const CAMPEONES_DISONANCIA: Campeona[] = [
  { id: 'DS-010', nombre: 'Ragnar', titulo: 'Voz del Nudo', linea: 'Coste 4 · ATQ 9 / RES 9', rol: 'Indestructible', texto: 'El primero de todos y la voz del sur. Con 4 Éter destruye a un Campeón rival; bloqueando 2 Éter, vuelve Indestructible a un Campeón tuyo.' },
  { id: 'DS-011', nombre: 'Kael', titulo: 'Filo del Nudo', linea: 'Coste 2 · ATQ 5 / RES 3', rol: 'Carga', texto: 'El Nudo corta lo que toca: carga al frente y, al atacar, le resta 1 de ATQ a un Campeón del rival.' },
  { id: 'DS-012', nombre: 'Draven', titulo: 'Rompecadenas', linea: 'Coste 2 · ATQ 4 / RES 4', rol: 'Normal', texto: 'Lo que rompe, lo cobra: al matar en combate puede devolver 1 Éter de la Reserva rival a su zona de pago, y por 2 Éter destruye una Mística del rival.' },
  { id: 'DS-013', nombre: 'Varek', titulo: 'Cazador de Agotados', linea: 'Coste 3 · ATQ 4 / RES 3', rol: 'Normal', texto: 'El agotado ya está muerto: solo falta cobrar. Por 4 Éter destruye a un Campeón rival de RES 3 o menos.' },
  { id: 'DS-014', nombre: 'Thane', titulo: 'Voz del Trueno', linea: 'Coste 3 · ATQ 3 / RES 4', rol: 'Protector', texto: 'El trueno abre paso a los suyos: por 3 Éter niega el efecto activo de un Campeón rival hasta el final del turno.' },
  { id: 'DS-015', nombre: 'Marek', titulo: 'Cosecha del Nudo', linea: 'Coste 3 · ATQ 5 / RES 4', rol: 'Recarga', texto: 'Cada nudo que aprieta el norte lo alimenta: al invocarlo copia el ATQ de un Campeón del rival hasta el final del turno.' },
  { id: 'DS-016', nombre: 'Korr', titulo: 'Viento del Sur', linea: 'Coste 3 · ATQ 3 / RES 5', rol: 'Normal', texto: 'El sur empuja a los suyos hacia adelante: por 2 Éter, todos tus Campeones ganan 1 de ATQ hasta el final del turno.' },
  { id: 'DS-017', nombre: 'Vorlag', titulo: 'El Que Aprieta', linea: 'Coste 4 · ATQ 4 / RES 5', rol: 'Normal', texto: 'El Nudo cobra lo que el norte bloquea: por 2 Éter mueve 1 Éter del rival de su zona de pago a su Reserva.' },
  { id: 'DS-018', nombre: 'Skarn', titulo: 'Rompevínculos', linea: 'Coste 4 · ATQ 3 / RES 6', rol: 'Normal', texto: 'Los vínculos del norte se rompen como el hielo: por 3 Éter devuelve a la mano de su dueño a un Campeón del rival.' },
  { id: 'DS-031', nombre: 'Emisario del Nudo', titulo: 'Voz del Sur', linea: 'Coste 2 · ATQ 4 / RES 3', rol: 'Normal', texto: 'El Nudo cobra, y el Nudo reparte: al ser enviado al Cementerio desde cualquier zona, busca en tu mazo un Campeón de coste 2 o menos.' },
]

/** Las nueve cartas de Éter de Disonancia con su frase (el *flavor* de la carta, tal cual). */
export const ETER_SUR = [
  { id: 'DS-001', nombre: 'Éter del Último Trueno', frase: 'El último trueno es el que más duele.' },
  { id: 'DS-002', nombre: 'Éter del Nudo', frase: 'El Nudo aprieta todo lo que toca.' },
  { id: 'DS-003', nombre: 'Éter de la Tormenta', frase: 'La Tormenta no anuncia su llegada: la sientes.' },
  { id: 'DS-004', nombre: 'Éter del Trueno', frase: 'El trueno no avisa: llega.' },
  { id: 'DS-005', nombre: 'Éter de la Marea', frase: 'La marea del sur no retrocede.' },
  { id: 'DS-006', nombre: 'Éter del Viento', frase: 'El viento no pide permiso para moverse.' },
  { id: 'DS-007', nombre: 'Éter del Desgarro', frase: 'Lo que el sur toma, el norte lo llora.' },
  { id: 'DS-008', nombre: 'Éter del Primogénito', frase: 'El primero del sur despertó con el Nudo en el pecho.' },
  { id: 'DS-009', nombre: 'Éter de la Ruptura', frase: 'Nada rompe lo que el Nudo aprieta.' },
] as const

/** Norte frente a sur: las dos maneras de sostener el Eje. */
export const NORTE_SUR = [
  { rasgo: 'Polo', norte: 'Estásis · Orden · Norte', sur: 'Disonancia · Caos · Sur' },
  { rasgo: 'Runa', norte: 'El Ancla / El Eje', sur: 'La Tormenta / El Nudo' },
  { rasgo: 'Se sostiene por', norte: 'Linaje: la sangre se hereda', sur: 'Deuda: el pacto se cobra' },
  { rasgo: 'Primogénitos', norte: 'Mujeres, hijas de sus casas', sur: 'Hombres, marcados por el Nudo' },
  { rasgo: 'Ante la Escisión', norte: 'Se negaron a elegir bando', sur: 'Su bando es el Nudo' },
  { rasgo: 'Su fuerza', norte: 'Constancia', sur: 'Presión' },
  { rasgo: 'En la mesa', norte: 'Anclar, devolver, reciclar, resistir', sur: 'Apretar, cobrar, arrebatar, avanzar' },
] as const

/** Los cuatro tiempos del Aprieto, con la carta de arte que mejor lo representa. */
export const CICLO_DISONANCIA = [
  {
    titulo: 'El Nudo aprieta',
    texto:
      'Antes de golpear, el Nudo cierra el puño: el Éter en la Reserva y el filo de Kael le quitan ATQ al rival, y el Grito del Nudo lo deja sin aliento. Lo que el Nudo marca, no vuelve a ser tan fuerte.',
    cartas: 'Éter del Nudo · Kael · Grito del Nudo · El Nudo',
    arte: 'DS-002',
  },
  {
    titulo: 'El Nudo cobra',
    texto:
      'Lo que el sur toma, el norte lo llora: el Éter del rival se arrastra de su Reserva a la zona de pago y su mano se vacía carta a carta. El norte ancla; el sur cobra la deuda.',
    cartas: 'Éter del Desgarro · Refugio del Nudo · Heredad de Caos · Éter del Trueno',
    arte: 'DS-007',
  },
  {
    titulo: 'La Tormenta arrebata',
    texto:
      'La tormenta no negocia: destruye Campeones y Místicas, devuelve a la mano a quien se creía a salvo y exilia lo que cae al Cementerio. El Nudo no devuelve lo que cobra.',
    cartas: 'Tormenta del Sur · Varek · Skarn · Voz del Nudo',
    arte: 'DS-019',
  },
  {
    titulo: 'El Sur avanza',
    texto:
      'Nada rompe lo que el Nudo aprieta: Carga, ATQ de más e Indestructible para los suyos, y el sur no llora a sus muertos, los cobra: vuelven del Exilio a seguir golpeando.',
    cartas: 'Éter de la Tormenta · Korr · Golpe del Nudo · Cristal del Nudo · Maldición del Sur',
    arte: 'DS-009',
  },
]

/** Secciones del índice (el orden es el de la página). */
export const SECCIONES = [
  { id: 'mundo', titulo: 'El Mundo de Éter' },
  { id: 'facciones', titulo: 'Las Facciones' },
  { id: 'escision', titulo: 'La Gran Escisión' },
  { id: 'primogenitos', titulo: 'Los Primogénitos' },
  { id: 'casas', titulo: 'Las Casas Nobles' },
  { id: 'aurora', titulo: 'Aurora, La Primogénita' },
  { id: 'estasis', titulo: 'El Mazo Estásis' },
  { id: 'sur', titulo: 'El Sur y el Nudo' },
  { id: 'ragnar', titulo: 'Ragnar, Voz del Nudo' },
  { id: 'disonancia', titulo: 'El Mazo Disonancia' },
] as const
