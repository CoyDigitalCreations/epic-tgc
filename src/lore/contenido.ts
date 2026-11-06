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
    runa: 'La Calma / El Eje',
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
    primogenitas: 'Aurora y Vaela',
    arte: 'FB-001',
  },
  {
    nombre: 'CASA SERENA',
    texto: 'La casa del consejo y de la palabra, donde las runas se hablaban antes de escribirse. El norte recuerda a sus hijas.',
    primogenitas: 'Seraphina y Elena',
    arte: 'FB-005',
  },
  {
    nombre: 'CASA VIGÍA',
    texto: 'Guardianes del Reino Perdido, centinelas del Eje que juraron no dormir jamás. Su primogénita vio caer su reino y juró que el próximo no caerá.',
    primogenitas: 'Cassandra',
    arte: 'FB-002',
  },
  {
    nombre: 'CASA ETERNA',
    texto: 'La casa del vínculo y de la sangre, donde los pactos valían más que las espadas. Lo que corre por sus venas no es sangre: es promesa.',
    primogenitas: 'Rowena y Nymeria',
    arte: 'FB-003',
  },
  {
    nombre: 'CASA ÚLTIMA',
    texto: 'La casa que resistió hasta el final, la que no cayó por débil sino por tozuda. Su cristal fue el último en apagarse.',
    primogenitas: 'Isolde',
    arte: 'FB-009',
  },
  {
    nombre: 'SIN CASA',
    texto: 'No toda primogénita nació bajo un estandarte. Mira despertó sobre las ruinas de un linaje sin nombre, y el Éter la reclamó a ella. Ninguna casa la recibió; la hermandad sí.',
    primogenitas: 'Mira',
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
  { id: 'FB-010', nombre: 'Aurora', titulo: 'La Primogénita', linea: 'Casa Alba', rol: 'Soberana', texto: 'La primera que las casas recuerdan, el ancla de la hermandad. Lo que una hermana sabe hacer, ella lo puede hacer con ella; y el Reino cobra tributo a quien se le alza.' },
  { id: 'FB-011', nombre: 'Vaela', titulo: 'Sed de Alba', linea: 'Casa Alba', rol: 'Normal', texto: 'Ataca antes de que el alba termine de cantar; la urgencia del amanecer hecha guerrera.' },
  { id: 'FB-012', nombre: 'Mira', titulo: 'Cristal Huérfano', linea: 'Sin casa', rol: 'Éter', texto: 'Mira nació sin casa, y por eso sabe lo que pesa quedarse sin una. Donde otros ven ruinas, ella ve Éter que todavía quiere volver.' },
  { id: 'FB-013', nombre: 'Seraphina', titulo: 'Voz de las Casas', linea: 'Casa Serena', rol: 'Normal', texto: 'Sus palabras aún resuenan en las ruinas; con una frase cambia el orden del campo.' },
  { id: 'FB-014', nombre: 'Isolde', titulo: 'Escudo de la Última Casa', linea: 'Casa Última', rol: 'Soporte', texto: 'Muro de carne, promesa de cristal: mientras ella resiste, las hermanas crecen.' },
  { id: 'FB-015', nombre: 'Elena', titulo: 'Despertar del Éter', linea: 'Casa Serena', rol: 'Normal', texto: 'Elena despierta cada vez que el Éter la toca, y cada despertar la encuentra más rápida que el anterior. Mientras el cristal siga atado a ella, golpea una vez y vuelve a golpear antes de que el eco termine.' },
  { id: 'FB-016', nombre: 'Cassandra', titulo: 'Vigía del Reino Perdido', linea: 'Casa Vigía', rol: 'Soporte', texto: 'Vio caer su reino y juró que el próximo no caerá: sostiene la defensa de todas.' },
  { id: 'FB-017', nombre: 'Nymeria', titulo: 'Conducto Roto', linea: 'Casa Eterna', rol: 'Éter', texto: 'Su cristal se rompió en la guerra: ahora rompe lo que ata y libera lo que fue tomado.' },
  { id: 'FB-018', nombre: 'Rowena', titulo: 'Vínculo Eterno', linea: 'Casa Eterna', rol: 'Soporte', texto: 'Rowena juró que ningún vínculo se rompería bajo su guardia, y lo cumple con lo único que tiene: ella misma. Y a quien cae a su lado, si el precio es justo, Rowena lo llama de vuelta.' },
]

/**
 * Primogénitos de Caos (mazo Disonancia). `linea` es la ficha de juego (coste · ATQ/RES) y `rol` la
 * palabra clave; el texto describe el efecto real de la carta (seed/FuenteEfectos.json) con voz del lore.
 */
export const CAMPEONES_DISONANCIA: Campeona[] = [
  { id: 'DS-010', nombre: 'Ragnar', titulo: 'Voz del Nudo', linea: 'Coste 4 · ATQ 9 / RES 9', rol: 'Indestructible', texto: 'El primero de todos y la voz del sur. Pagando 2 Éter arrebata hasta 2 de la Reserva del rival; mientras sostiene 3 Éter, todo lo que el rival pierde se exilia: el Olvido. Como Comandante da +3 ATQ a tus Campeones y el rival paga 1 Éter por cada bloqueador: el Peaje.' },
  { id: 'DS-011', nombre: 'Kael', titulo: 'Filo del Nudo', linea: 'Coste 2 · ATQ 4 / RES 2', rol: 'Carga', texto: 'El Nudo corta lo que toca: carga al frente y, al atacar, un Campeón del rival pierde 1 de ATQ hasta el final del turno.' },
  { id: 'DS-012', nombre: 'Draven', titulo: 'Rompecadenas', linea: 'Coste 2 · ATQ 3 / RES 3', rol: 'Normal', texto: 'Lo que rompe, lo cobra: al matar en combate puede arrebatar 1 Éter de la Reserva del rival.' },
  { id: 'DS-013', nombre: 'Varek', titulo: 'Cazador de Agotados', linea: 'Coste 3 · ATQ 4 / RES 3', rol: 'Normal', texto: 'El agotado ya está muerto: solo falta cobrar. Por 4 Éter destruye a un Campeón agotado del rival.' },
  { id: 'DS-014', nombre: 'Thane', titulo: 'Voz del Trueno', linea: 'Coste 3 · ATQ 3 / RES 4', rol: 'Protector', texto: 'El trueno abre paso a los suyos: sostiene 2 Éter y, mientras los sostenga, todos los Campeones del rival pierden 1 de ATQ.' },
  { id: 'DS-015', nombre: 'Marek', titulo: 'Cosecha del Nudo', linea: 'Coste 3 · ATQ 4 / RES 3', rol: 'Normal', texto: 'Cada nudo que aprieta el norte lo alimenta: al invocarlo puede exiliar a un Campeón del Cementerio del rival. Lo que cae en el sur no vuelve.' },
  { id: 'DS-016', nombre: 'Korr', titulo: 'Viento del Sur', linea: 'Coste 3 · ATQ 4 / RES 4', rol: 'Normal', texto: 'El sur empuja a los suyos hacia adelante: al atacar, manda hasta 2 Éter de la Reserva del rival a su zona de pago.' },
  { id: 'DS-017', nombre: 'Vorlag', titulo: 'El Que Aprieta', linea: 'Coste 4 · ATQ 4 / RES 5', rol: 'Normal', texto: 'El Nudo cobra lo que el norte guarda: al inicio del Choque del rival, le manda hasta 2 Éter de la Reserva a su zona de pago.' },
  { id: 'DS-018', nombre: 'Skarn', titulo: 'Rompevínculos', linea: 'Coste 4 · ATQ 3 / RES 6', rol: 'Normal', texto: 'Los vínculos del norte se rompen como el hielo: por 2 Éter destruye una Mística o una Arcana del rival.' },
  { id: 'DS-031', nombre: 'Emisario del Nudo', titulo: 'Voz del Sur', linea: 'Coste 2 · ATQ 3 / RES 3', rol: 'Normal', texto: 'El Nudo cobra, y el Nudo reparte: al ser enviado al Cementerio desde cualquier zona, busca en tu mazo un Campeón de coste 2 o menos.' },
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
  { id: 'DS-009', nombre: 'Éter de la Ruptura', frase: 'El sur no descansa entre un golpe y otro.' },
] as const

/** Norte frente a sur: las dos maneras de sostener el Eje. */
export const NORTE_SUR = [
  { rasgo: 'Polo', norte: 'Estásis · Orden · Norte', sur: 'Disonancia · Caos · Sur' },
  { rasgo: 'Runa', norte: 'La Calma / El Eje', sur: 'La Tormenta / El Nudo' },
  { rasgo: 'Se sostiene por', norte: 'Linaje: la sangre se hereda', sur: 'Deuda: el pacto se cobra' },
  { rasgo: 'Primogénitos (en esta entrega)', norte: 'Mujeres, hijas de sus casas', sur: 'Hombres, marcados por el Nudo' },
  { rasgo: 'Ante la Escisión', norte: 'Se negaron a elegir bando', sur: 'Su bando es el Nudo' },
  { rasgo: 'Su fuerza', norte: 'Constancia', sur: 'Presión' },
  { rasgo: 'En la mesa', norte: 'Anclar, devolver, reciclar, resistir', sur: 'Apretar, cobrar, arrebatar, avanzar, olvidar' },
] as const

/** Los cinco tiempos del Aprieto, con la carta de arte que mejor lo representa. */
export const CICLO_DISONANCIA = [
  {
    titulo: 'El Nudo aprieta',
    texto:
      'Antes de golpear, el Nudo cierra el puño: el Éter en la Reserva, el filo de Kael y la voz de Thane le quitan ATQ al rival, y el Grito del Nudo lo deja sin aliento. Lo que el Nudo marca, no vuelve a ser tan fuerte.',
    cartas: 'Éter del Nudo · Kael · Thane · Grito del Nudo · El Nudo',
    arte: 'DS-002',
  },
  {
    titulo: 'El Nudo cobra',
    texto:
      'Lo que el sur toma, el norte lo llora: el Éter del rival se arrastra de su Reserva a la zona de pago, justo cuando más lo necesita, y su mano se vacía carta a carta. El norte ancla; el sur cobra la deuda.',
    cartas: 'Éter del Viento · Korr · Vorlag · Refugio del Nudo · Deuda de Caos · Éter del Trueno',
    arte: 'DS-006',
  },
  {
    titulo: 'La Tormenta arrebata',
    texto:
      'La tormenta no negocia: arrebata el Éter que el rival guardaba, destruye a los Campeones agotados y rompe Místicas y Arcanas. Y defenderse sale caro: el Peaje cobra un Éter por cada bloqueador. Lo que el Nudo arrebata solo se le presta: el dueño lo recupera en su Alba.',
    cartas: 'Ragnar · Draven · Éter del Desgarro · Cristal del Nudo · Varek · Skarn · Tormenta del Sur',
    arte: 'DS-019',
  },
  {
    titulo: 'El Sur avanza',
    texto:
      'Nada rompe lo que el Nudo aprieta: Carga, ATQ de más y ataques que nadie puede bloquear. El sur no se detiene tras la primera Ruptura: la Embestida abre un segundo Vínculo y sigue golpeando.',
    cartas: 'Éter de la Tormenta · Éter de la Marea · Éter del Primogénito · Golpe del Nudo · Embestida del Sur',
    arte: 'DS-009',
  },
  {
    titulo: 'El Nudo olvida',
    texto:
      'Lo que cae en el sur no vuelve: lo que el rival pierde se exilia en vez de ir al Cementerio, y los muertos que guardaba se borran uno a uno. Sin memoria, el norte no tiene nada que reciclar. El Nudo no olvida lo que se le debe; lo que el Nudo cobra, el mundo lo olvida.',
    cartas: 'Maldición del Sur · Grito del Primogénito · El Nudo Olvida · Marek · Voz del Nudo',
    arte: 'DS-022',
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
