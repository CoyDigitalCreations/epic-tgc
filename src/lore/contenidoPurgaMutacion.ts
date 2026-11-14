/**
 * Lore de PURGA y MUTACIÓN (entrega LOS PRIMOGÉNITOS). Lo consume `SeccionesPurgaMutacion.tsx` (secciones 11-15 de la página).
 * Los efectos que se mencionan son los reales de seed/FuenteEfectos.json (PU-xxx y MU-xxx).
 *
 * Cada facción terrenal nombra su unidad social según aquello en lo que se sostiene (como Casas → Nudos en el sur):
 *   Estásis (Linaje) → Casas · Disonancia (Deuda) → Nudos · Purga (Juicio) → FUEROS · Mutación (Cambio) → CONFINES.
 *
 * REGLA DE LORE: el origen de todas las cosas NO se menciona en ningún texto: es una historia para otra ocasión.
 * Arquéndron (el Árbol de la Vida) NO es ese origen, y aquí solo se dice que el suyo se perdió antes de las runas.
 *
 * Reglas del proyecto: español neutro mexicano (tuteo), sin voseo.
 */
import type { Campeona } from './contenido'
import type { PasoCiclo } from './bloques'

/** Descripción de faceta para el mapa del Eje (la de `FACETAS` en `contenido.ts` las toma de aquí). */
export const DESCRIPCION_FACETA = {
  Purga: 'La justicia que poda lo corrupto para que el resto viva. Jueces, magos y guerreros.',
  Mutación: 'La vida retorcida, la evolución sin reglas. Bestias, elementales y quimeras.',
} as const

/** Una unidad social de la entrega: la forma en que cada facción se agrupa (Casa, Nudo, Fuero, Confín). */
export interface UnidadLore {
  nombre: string
  texto: string
  primogenitas: string
  /** Carta de Éter cuyo arte representa a la unidad (por definir cuando haya arte). */
  arte?: string
}

/** El origen compartido de los dos líderes: los jardineros del Árbol de la Vida. */
export const ARQUENDRON = {
  nombre: 'ARQUÉNDRON',
  epiteto: 'El Árbol de la Vida',
  texto:
    'Los jardineros del Árbol cuidaban a Arquéndron, el Árbol de la Vida. Arquéndron no es el principio de las cosas: no nació del Eje ni el Eje lo sostiene. Crece junto a él, y su origen se perdió antes de que hubiera runas. Quien lo cuida aprende dos verdades que nadie quiso oír juntas: que para que un árbol viva hay que podarlo, y que el árbol que no cambia con las estaciones muere. Los dos hijos mayores de esos jardineros heredaron una verdad cada uno, y al separarse cada uno fundó la unidad que su verdad pedía.',
  primogenitas: 'Idris y Liora',
} as const

/** Las dos palabras que nacen de la ruptura de los jardineros. */
export const FUERO: UnidadLore = {
  nombre: 'FUERO',
  texto:
    'La unidad de Purga: jurisdicción y juicio. Un Fuero es el territorio donde la poda es ley, y quien lo rige responde por cada corte que ordena. Se sostiene por el juicio: lo que se poda, se poda por algo.',
  primogenitas: 'Los que juzgan y cortan, regidos por Idris',
}

export const CONFIN: UnidadLore = {
  nombre: 'CONFÍN',
  texto:
    'La unidad de Mutación: el confín es el límite lejano del mundo, el primer lugar al que llegó el Derrame. Un Confín no se hereda ni se juzga: se habita, y cambia con quien lo habita. Se sostiene por el cambio: quien no cambia, muere.',
  primogenitas: 'Los que cambian y crecen, reunidos por Liora',
}

/** El Derrame: el origen compartido de Purga y Mutación, en cuatro párrafos. El niño no lleva nombre en esta entrega. */
export const DERRAME: readonly string[] = [
  'Cuando la Escisión derramó el Éter por los costados del Eje, la mayor parte se perdió en la tierra. Una sola gota cayó sobre un niño que los jardineros del Árbol criaban entre sus raíces.',
  'No enfermó. No murió. Empezó a cambiar: primero el color de los ojos, después el peso de los huesos, después lo que sabía sin que nadie se lo hubiera enseñado. No dejaba de crecer.',
  'Idris, el mayor, miró al niño y vio lo que ve un jardinero en una rama infectada: algo que se corta mientras el Árbol todavía puede salvarse. Liora, su hermana, miró al mismo niño y vio lo que ve un jardinero en la primera hoja de una especie que nadie ha visto: un brote.',
  'Los dos tenían razón. Ninguno pudo vivir con la razón del otro. Idris juró podar todo lo que el Derrame tocara, empezando por lo que más amaba. Liora juró defender todo lo que el Derrame cambiara, aunque dejara de parecerse a lo que era. Así se partieron los jardineros: de un lado, un Fuero; del otro, un Confín.',
]

/** Ficha de lore de un Primogénito de la entrega (el líder de cada mazo). */
export interface PrimogenitoLore {
  id: string
  nombre: string
  titulo: string
  linea: string
  rol: string
  texto: string
}

/** Los tres primogénitos de los jardineros del Árbol: Idris (Purga), Liora y Yaron (Mutación). */
export const PRIMOGENITOS_ARBOL: readonly PrimogenitoLore[] = [
  {
    id: 'PU-010',
    nombre: 'Idris',
    titulo: 'El Podador',
    linea: 'Fuero',
    rol: 'Soberano y Comandante',
    texto:
      'El mayor de los jardineros del Árbol. Para que el Árbol viva, se poda: sacrifica a uno de los suyos y su corte alcanza a un Campeón rival de coste igual o menor. Bloquea Éter y a los Campeones rivales se les caen los incrementos: su cristal no brilla, afila. Como Comandante, cada Mística que juegas y cada Arcana que activas es una sentencia que afila a los Campeones de Purga.',
  },
  {
    id: 'MU-011',
    nombre: 'Liora',
    titulo: 'La Hortelana del Cambio',
    linea: 'Confín',
    rol: 'Comandante',
    texto:
      'La hermana menor de los jardineros del Árbol. No cree que el cambio sea una enfermedad: cree que es lo único que no muere. Mientras sostiene 2 Éter y los suyos se parecen entre sí, todos sus Campeones se vuelven Inmortales; y por 2 Éter cambia la Esencia de uno de ellos. Como Comandante, los Campeones de Mutación que comparten Esencia con otro se hacen más fuertes: el parecido es fuerza.',
  },
  {
    id: 'MU-010',
    nombre: 'Yaron',
    titulo: 'El Injerto',
    linea: 'Confín',
    rol: 'Soberano',
    texto:
      'Juez del Fuero de Idris, uno de los que se sentaron a su lado en el Tribunal de la Poda. Dictó sentencias hasta el día en que dejó de creer en ellas, y entonces se fue con Liora. No lo cortaron: lo injertó ella. Lo que en él fue juicio ahora es cambio, y lleva en la sangre las dos verdades de los jardineros: cuando uno de los suyos cambia de Esencia recupera Éter, y si tres de sus Campeones comparten una misma Esencia, por 4 Éter los destruye a todos, propios y rivales. Quien no cambia, muere.',
  },
]

/** Los Magos de Purga: el paquete de Místicas y Arcanas, contado como un tribunal dentro del Fuero. */
export const TRIBUNAL_DE_LA_PODA =
  'Idris no podó solo. A su lado se sentaron quienes sabían leer el Éter como una sentencia: los Magos del Tribunal de la Poda. No lanzan hechizos por poder: dictan juicio. Cada Mística es una sentencia y cada Arcana, una pena que espera su hora. Son podadores, no verdugos: cortan lo que hay que cortar y nada más. Uno de sus asientos quedó vacío: el de Yaron, que dictó sentencias a su lado hasta que dejó de creer en ellas.'

/** Las esencias variadas de Mutación, contadas como los otros hijos del Derrame. */
export const HIJOS_DEL_DERRAME =
  'El Derrame no tocó solo a un niño. Tocó una manada, una orilla, un taller, una colina entera. Lo que salió de ahí ya no tenía nombre en ninguna casa: bestias con voz, elementales sin cauce, humanos que dejaron de parecerlo. Liora los reunió en el Confín. Ninguno nació así: todos cambiaron.'

/** Las dos frases del choque, dichas por los hermanos. */
export const CHOQUE_PURGA_MUTACION = {
  mutacion: 'Lo que tú llamas corrupción, yo lo llamo hijo.',
  purga: 'Lo que tú llamas hijo, ya está infectado.',
} as const

/** Purga frente a Mutación: las dos maneras de responder a la misma herida (como NORTE_SUR en `contenido.ts`). */
export const PURGA_MUTACION = [
  { rasgo: 'Faceta', purga: 'Purga · Noroeste', mutacion: 'Mutación · Sudeste' },
  { rasgo: 'Runa', purga: 'La Flecha / El Corte', mutacion: 'El Vórtice / El Cambio' },
  { rasgo: 'Unidad', purga: 'Fueros: la jurisdicción donde la poda es ley', mutacion: 'Confines: el límite que cambia con quien lo habita' },
  { rasgo: 'Se sostiene por', purga: 'Juicio: lo que se poda, se poda por algo', mutacion: 'Cambio: quien no cambia, muere' },
  { rasgo: 'Ante la Escisión', purga: 'Herida que se amputa', mutacion: 'Puerta que se abre' },
  { rasgo: 'Primogénitos (en esta entrega)', purga: 'Jueces, magos y guerreros del Tribunal de la Poda', mutacion: 'Los hijos del Derrame: esencias variadas' },
  { rasgo: 'Su fuerza', purga: 'Precisión', mutacion: 'Adaptación' },
  { rasgo: 'En la mesa', purga: 'Sentenciar, negar, limpiar, destruir', mutacion: 'Cambiar, transformar, copiar, crecer' },
] as const

/**
 * Los Campeones de Purga (sin Idris, que tiene su propia sección). `linea` es la ficha de juego y `rol` la Esencia o la
 * keyword; el texto describe el efecto real de la carta con voz del lore.
 */
export const CAMPEONES_PURGA: Campeona[] = [
  { id: 'PU-011', nombre: 'Pasante del Tribunal', titulo: 'Aprende sirviendo', linea: 'Coste 2 · ATQ 2 / RES 4', rol: 'Humano', texto: 'El más joven del Tribunal: lleva los expedientes y aprende el oficio mirando cómo se dicta sentencia. Cuando cae, deja lo aprendido: puede robar 1 carta.' },
  { id: 'PU-012', nombre: 'Alguacil de la Poda', titulo: 'El del expediente', linea: 'Coste 2 · ATQ 3 / RES 3', rol: 'Humano', texto: 'Lleva el expediente hasta el final, aunque sea lo último que haga: al caer, puede buscar en tu mazo una Mística de coste 2 o menos.' },
  { id: 'PU-013', nombre: 'Relator', titulo: 'La voz del Tribunal', linea: 'Coste 2 · ATQ 2 / RES 4', rol: 'Mago', texto: 'Lee en voz alta lo que el Tribunal ya decidió. Al llegar a la sala, puede buscar en tu mazo una Mística.' },
  { id: 'PU-014', nombre: 'Escribana', titulo: 'Nada se pierde', linea: 'Coste 2 · ATQ 2 / RES 4', rol: 'Mago', texto: 'Mientras algo quede asentado, no se ha perdido: al llegar, puede devolver a tu mano una Mística de tu Cementerio.' },
  { id: 'PU-015', nombre: 'Magistrada', titulo: 'Sin recurso', linea: 'Coste 4 · ATQ 3 / RES 5', rol: 'Mago', texto: 'Su veredicto no admite recurso. Pagando 3 Éter, una vez por turno, destruye a un Campeón rival de ATQ 3 o menos.' },
  { id: 'PU-016', nombre: 'Centinela del Tribunal', titulo: 'La puerta de la sala', linea: 'Coste 3 · ATQ 3 / RES 5', rol: 'Guerrero · Protector', texto: 'Nadie llega a la sala sin pasar por él. No dicta nada ni lo necesita: mientras él esté de pie, los jueces trabajan.' },
  { id: 'PU-017', nombre: 'La Balanza', titulo: 'Lo que pesa de más', linea: 'Coste 5 · ATQ 4 / RES 7', rol: 'Constructo', texto: 'Lo que pesa de más, se corta. Pagando 2 Éter, una vez por turno, el ATQ y la RES de un Campeón rival se igualan al menor de los dos valores: el fuerte se queda con la fuerza de su parte débil.' },
]

/** Las nueve cartas de Éter de Purga con su frase (el *flavor* de la carta, tal cual). */
export const ETER_PURGA = [
  { id: 'PU-001', nombre: 'Éter de la Poda', frase: 'Lo que sobra, se corta.' },
  { id: 'PU-002', nombre: 'Éter de la Sentencia', frase: 'Lo juzgado vuelve a juzgarse.' },
  { id: 'PU-003', nombre: 'Éter del Fuero', frase: 'Nadie desahucia al que el Tribunal ampara.' },
  { id: 'PU-004', nombre: 'Éter de la Sala', frase: 'Lo que se archiva, queda a la vista.' },
  { id: 'PU-005', nombre: 'Éter del Alegato', frase: 'Se defiende lo que se puede salvar.' },
  { id: 'PU-006', nombre: 'Éter de la Cátedra', frase: 'Enseña desde detrás de la barandilla.' },
  { id: 'PU-007', nombre: 'Éter del Escarnio', frase: 'Que se vea quién cae primero.' },
  { id: 'PU-008', nombre: 'Éter del Sello', frase: 'Lo sellado no se mueve.' },
  { id: 'PU-009', nombre: 'Éter del Primogénito Podador', frase: 'Poda, y de la poda, aprende.' },
] as const

/** Los cinco tiempos del Juicio: cómo juega Purga (cartas y efectos reales del mazo). */
export const CICLO_PURGA: readonly PasoCiclo[] = [
  {
    titulo: 'La poda',
    texto:
      'Antes de cortar, se quita lo que sobra: el Éter de la Poda, la Amonestación, el Pliego de Cargos y la Cadena de Custodia le arrancan al rival los incrementos de ATQ y RES, y el Éter del Escarnio le resta 1 de RES al más resistente. Idris hace lo mismo con el Éter que bloquea: su cristal no brilla, afila.',
    cartas: 'Éter de la Poda · Éter del Escarnio · Amonestación · Pliego de Cargos · Cadena de Custodia',
    arte: 'PU-001',
  },
  {
    titulo: 'El expediente',
    texto:
      'Un tribunal trabaja con papeles: el Relator busca Místicas, el Alguacil las trae al caer, la Escribana devuelve las que ya se usaron y el Acta de Acusación va por la Arcana justa. Nada se pierde mientras quede asentado.',
    cartas: 'Relator · Alguacil de la Poda · Escribana · Acta de Acusación · Primer Cargo · Éter de la Sentencia',
    arte: 'PU-014',
  },
  {
    titulo: 'La sentencia',
    texto:
      'Cuando el expediente está completo, se dicta: la Magistrada destruye a quien tiene poco ATQ, la Sentencia Firme destruye al que sea a cambio de exiliar a un Campeón caído, y el Juicio Sumario despacha hasta dos Campeones baratos de una vez.',
    cartas: 'Magistrada · Sentencia Firme · Juicio Sumario · Pena Diferida',
    arte: 'PU-015',
  },
  {
    titulo: 'La balanza',
    texto:
      'No todo se corta: a veces basta con pesar. La Balanza iguala al fuerte con su parte débil, la Nulidad niega la activación de una Mística o Arcana rival, y el Lamento de Idris impide que los Campeones del rival reciban incrementos de RES.',
    cartas: 'La Balanza · Nulidad · Lamento de Idris · Centinela del Tribunal',
    arte: 'PU-017',
  },
  {
    titulo: 'La apelación',
    texto:
      'Un Fuero sabe que también se equivoca: la Citatoria busca un Campeón de Purga y lo invoca, la Revocación lo devuelve del Exilio, la Apelación lo levanta del Cementerio si su coste era bajo, y el Indulto lo vuelve Inmortal por un turno. Podar no es matar por matar.',
    cartas: 'Citatoria · Revocación · Apelación · Indulto · Éter del Fuero',
    arte: 'PU-026',
  },
]

/** Los Campeones de Mutación (sin Liora ni Yaron, que tienen su propia ficha). */
export const CAMPEONES_MUTACION: Campeona[] = [
  { id: 'MU-012', nombre: 'Cachorro del Confín', titulo: 'El que cruza primero', linea: 'Coste 1 · ATQ 2 / RES 2', rol: 'Bestia', texto: 'Todo Confín empieza donde un cachorro se atreve a cruzar. Al atacar se vuelve Elemental hasta el final del turno: el primer cambio de la manada.' },
  { id: 'MU-013', nombre: 'Raíz Inquieta', titulo: 'No se queda quieta', linea: 'Coste 1 · ATQ 1 / RES 3', rol: 'Elemental', texto: 'Una raíz que no se queda quieta es una raíz que sobrevive: cuando cambia de Esencia gana 2 de RES hasta el final del turno.' },
  { id: 'MU-014', nombre: 'Quimera de Orilla', titulo: 'De donde la necesiten', linea: 'Coste 2 · ATQ 3 / RES 3', rol: 'Bestia', texto: 'Ni de aquí ni de allá. Pagando 1 Éter, una vez por turno, convierte a un Campeón tuyo en Bestia hasta el final del turno.' },
  { id: 'MU-015', nombre: 'Eco de Humo', titulo: 'Llama al que comparte el rugido', linea: 'Coste 2 · ATQ 2 / RES 3', rol: 'Elemental', texto: 'Al llegar al Confín, llama a los suyos: puede buscar en tu mazo un Campeón Bestia de coste 2 o menos.' },
  { id: 'MU-016', nombre: 'Taller Vivo', titulo: 'Lo que ya no recuerda', linea: 'Coste 2 · ATQ 2 / RES 4', rol: 'Constructo', texto: 'Lo que sale del taller ya no recuerda lo que era. Pagando 1 Éter, una vez por turno, un Campeón rival se convierte en la Esencia que elijas hasta el final del turno.' },
  { id: 'MU-017', nombre: 'Pastor de Cenizas', titulo: 'Cuida lo que el fuego dejó', linea: 'Coste 3 · ATQ 3 / RES 4', rol: 'Humano', texto: 'Cuida de lo que el fuego dejó con colmillos: mientras esté en el campo, todos tus Campeones Bestia ganan 1 de ATQ.' },
  { id: 'MU-018', nombre: 'Hortelana del Derrame', titulo: 'Cosecha lo que otros llaman plaga', linea: 'Coste 3 · ATQ 3 / RES 4', rol: 'Humano', texto: 'Donde otros ven una plaga, ve una cosecha: cada vez que un Campeón tuyo cambia de Esencia, roba 1 carta, una vez por turno.' },
  { id: 'MU-019', nombre: 'Behemot del Derrame', titulo: 'Ya nada logra cambiarlo', linea: 'Coste 4 · ATQ 3 / RES 6', rol: 'Bestia · Protector', texto: 'Cambió tanto que ya nada logra cambiarlo. No necesita habilidades: es el muro del Confín, y los demás cambian a su sombra.' },
  { id: 'MU-020', nombre: 'Mosaico', titulo: 'Cada pieza fue otra cosa', linea: 'Coste 5 · ATQ 4 / RES 6', rol: 'Constructo', texto: 'Cada pieza fue otra cosa antes de ser esta. Pagando 3 Éter, una vez por turno, todos tus Campeones se convierten en la Esencia que elijas hasta el final del turno.' },
]

/** Las nueve cartas de Éter de Mutación con su frase (el *flavor* de la carta, tal cual). */
export const ETER_MUTACION = [
  { id: 'MU-001', nombre: 'Éter de la Muda', frase: 'El primer paso del cambio es soltar lo que eras.' },
  { id: 'MU-002', nombre: 'Éter del Brote', frase: 'Donde cae una gota de savia, algo con garras despierta.' },
  { id: 'MU-003', nombre: 'Éter del Derrame', frase: 'Lo que se derrama no espera turno.' },
  { id: 'MU-004', nombre: 'Éter de la Orilla', frase: 'En la orilla nadie es del todo de un lado.' },
  { id: 'MU-005', nombre: 'Éter de la Mudanza', frase: 'Se mudan juntos los que ya se parecen.' },
  { id: 'MU-006', nombre: 'Éter del Contagio', frase: 'Lo que toca, cambia. Lo que cambia, se parece a quien lo tocó.' },
  { id: 'MU-007', nombre: 'Éter de la Cosecha', frase: 'Quien sabe sembrar sabe a quién llamar.' },
  { id: 'MU-008', nombre: 'Éter del Injerto', frase: 'Una rama nueva sobre un tronco viejo.' },
  { id: 'MU-009', nombre: 'Éter del Primogénito Injertado', frase: 'No heredó el Árbol: lo injertó.' },
] as const

/** Los cinco tiempos del Cambio: cómo juega Mutación (cartas y efectos reales del mazo). */
export const CICLO_MUTACION: readonly PasoCiclo[] = [
  {
    titulo: 'La muda',
    texto:
      'Todo empieza soltando lo que eras: el Éter de la Muda y la Muda Súbita cambian la Esencia de un Campeón tuyo por la que elijas, la Quimera de Orilla lo vuelve Bestia por 1 Éter, y el Éter de la Orilla le da la Esencia que quiera mientras siga bloqueado.',
    cartas: 'Éter de la Muda · Muda Súbita · Quimera de Orilla · Éter de la Orilla · Cachorro del Confín',
    arte: 'MU-001',
  },
  {
    titulo: 'El contagio',
    texto:
      'El cambio no respeta bandos: el Taller Vivo y el Contagio le cambian la Esencia a los Campeones del rival, y la Plaga de Facción y la Plaga Perenne les cambian la Facción a Mutación, con lo que dejan de estar bajo el aura de su Comandante. Lo que toca, cambia.',
    cartas: 'Taller Vivo · Éter del Contagio · Contagio · Plaga de Facción · Plaga Perenne · Reflejo del Cambio',
    arte: 'MU-006',
  },
  {
    titulo: 'Los que se parecen',
    texto:
      'En el Confín quien se parece se fortalece: Raíz Compartida y Marea de Savia dan fuerza a los que comparten Esencia con otro Campeón, el Pastor de Cenizas y el Éter del Injerto alimentan a las Bestias, y la Savia del Confín recompensa a quien reúne tres de una misma Esencia.',
    cartas: 'Raíz Compartida · Marea de Savia · Pastor de Cenizas · Éter del Injerto · Éter de la Mudanza · Savia del Confín',
    arte: 'MU-008',
  },
  {
    titulo: 'El fruto del cambio',
    texto:
      'Cambiar no sale gratis, pero se cobra con intereses: la Hortelana del Derrame roba una carta por cada cambio, Raíz Inquieta se endurece, Cosecha de Muda refuerza a un Campeón y las Savias devuelven a tu Reserva el Éter que gastaste. El cambio se alimenta.',
    cartas: 'Hortelana del Derrame · Raíz Inquieta · Cosecha de Muda · Savia Prestada · Savia de Emergencia · Aliento del Vórtice',
    arte: 'MU-018',
  },
  {
    titulo: 'El barrido',
    texto:
      'Y cuando tres de los tuyos comparten una misma Esencia, Yaron decide quién se queda: por 4 Éter destruye a todos los Campeones de esa Esencia, tuyos y rivales. Quien no cambia, muere. Antes de eso, Floración deja a todo el campo con +2/+2 si controlas cuatro o más.',
    cartas: 'Yaron · Floración · Mosaico · Behemot del Derrame · Liora',
    arte: 'MU-010',
  },
]
