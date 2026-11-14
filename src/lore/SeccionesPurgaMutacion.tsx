/**
 * Secciones 11-15 del lore: los jardineros del Árbol. Purga (rosa) y Mutación (lima) nacen de una misma herida, el Derrame,
 * y se miran como el norte y el sur: Idris y su Fuero frente a Liora y su Confín. Los efectos que se mencionan son los reales
 * de seed/FuenteEfectos.json (PU-xxx y MU-xxx); el texto vive en `contenidoPurgaMutacion.ts`.
 */
import { motion } from 'framer-motion'
import { MUTACION_CARDS, PURGA_CARDS } from '../shared/data/paquetes'
import { Arte, Cita, Reveal } from './animaciones'
import { B, Ciclo, Encabezado, P, Sub, TarjetaCampeona } from './bloques'
import {
  ARQUENDRON,
  CAMPEONES_MUTACION,
  CAMPEONES_PURGA,
  CHOQUE_PURGA_MUTACION,
  CICLO_MUTACION,
  CICLO_PURGA,
  CONFIN,
  DERRAME,
  ETER_MUTACION,
  ETER_PURGA,
  FUERO,
  HIJOS_DEL_DERRAME,
  PRIMOGENITOS_ARBOL,
  PURGA_MUTACION,
  TRIBUNAL_DE_LA_PODA,
} from './contenidoPurgaMutacion'
import type { UnidadLore } from './contenidoPurgaMutacion'

const ROSA = '#ec4899'
const ROSA_OSCURO = '#be185d'
const LIMA = '#84cc16'
const LIMA_OSCURO = '#4d7c0f'

const ficha = (id: string) => {
  const f = PRIMOGENITOS_ARBOL.find((p) => p.id === id)
  if (!f) throw new Error(`falta la ficha de ${id}`)
  return { id: f.id, nombre: f.nombre, titulo: f.titulo, linea: `${f.linea} · ${f.rol}`, rol: 'Primogénito', texto: f.texto }
}

/** Purga y Mutación frente a frente: las filas aparecen una a una. */
function PurgaYMutacion() {
  return (
    <Reveal className="my-8">
      <div className="overflow-x-auto rounded-xl border border-card-border">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <caption className="sr-only">Comparación entre Purga y Mutación</caption>
          <thead>
            <tr className="bg-surface-2 font-display text-xs uppercase tracking-wider">
              <th scope="col" className="px-4 py-3 text-gray-500" />
              <th scope="col" className="px-4 py-3" style={{ color: ROSA }}>
                Purga
              </th>
              <th scope="col" className="px-4 py-3" style={{ color: LIMA }}>
                Mutación
              </th>
            </tr>
          </thead>
          <tbody>
            {PURGA_MUTACION.map((f, i) => (
              <motion.tr
                key={f.rasgo}
                className="border-t border-card-border/60 transition-colors hover:bg-surface-2"
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.45, delay: i * 0.05 }}
              >
                <th scope="row" className="px-4 py-2.5 font-display text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {f.rasgo}
                </th>
                <td className="px-4 py-2.5 text-gray-300">{f.purga}</td>
                <td className="px-4 py-2.5 text-gray-300">{f.mutacion}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </Reveal>
  )
}

/** La unidad social de cada facción: el Fuero y el Confín. */
function Unidad({ u, acento }: { u: UnidadLore; acento: string }) {
  return (
    <Reveal>
      <div className="h-full rounded-xl border bg-surface-2 p-5" style={{ borderColor: `${acento}55` }}>
        <p className="font-display text-lg font-bold tracking-wider" style={{ color: acento }}>
          {u.nombre}
        </p>
        <p className="mt-0.5 text-xs text-gray-500">{u.primogenitas}</p>
        <p className="mt-3 text-sm leading-relaxed text-gray-400">{u.texto}</p>
      </div>
    </Reveal>
  )
}

/** Las frases de las nueve cartas de Éter de un mazo, con su ilustración. */
function EterDelMazo({ eter, acento }: { eter: readonly { id: string; nombre: string; frase: string }[]; acento: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {eter.map((e, i) => (
        <motion.figure
          key={e.id}
          className="group overflow-hidden rounded-lg border border-card-border bg-surface-2"
          initial={{ opacity: 0, scale: 0.94 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
          whileHover={{ borderColor: acento }}
        >
          <div className="aspect-[16/10] overflow-hidden">
            <img
              src={`/cartas/${e.id}.webp`}
              alt={`Arte de ${e.nombre}`}
              width={1024}
              height={1024}
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          </div>
          <figcaption className="p-3">
            <p className="font-display text-[11px] font-bold uppercase tracking-wider" style={{ color: acento }}>
              {e.nombre}
            </p>
            <p className="mt-1 text-xs italic leading-snug text-gray-400">“{e.frase}”</p>
          </figcaption>
        </motion.figure>
      ))}
    </div>
  )
}

export function SeccionesPurgaMutacion() {
  return (
    <>
      {/* ═══════ 11 ═══════ */}
      <section aria-labelledby="arbol">
        <Encabezado n={11} id="arbol" titulo="El Árbol y el Derrame" nota="· Purga y Mutación" acento={ROSA} />
        <div className="mt-6">
          <div className="mb-8 grid items-center gap-8 md:grid-cols-[minmax(0,16rem)_1fr]">
            <Arte id="MU-008" alt="Ilustración del Éter del Injerto: una rama nueva sobre un tronco viejo" ratio="aspect-[4/5]" />
            <div>
              <P>{ARQUENDRON.texto}</P>
              <P>
                Mientras el norte heredaba tronos y el sur cobraba deudas, en el noroeste y el sudeste del Eje creció otra cosa: dos respuestas a una misma herida. <B color={ROSA}>Purga</B> y <B color={LIMA}>Mutación</B> son las dos facetas que nacieron de la misma mesa de jardineros.
              </P>
            </div>
          </div>

          <Sub color={ROSA}>El Derrame</Sub>
          {DERRAME.map((parrafo) => (
            <P key={parrafo.slice(0, 40)}>{parrafo}</P>
          ))}

          <div className="my-8 grid gap-4 sm:grid-cols-2">
            <Unidad u={FUERO} acento={ROSA} />
            <Unidad u={CONFIN} acento={LIMA} />
          </div>

          <Cita color={LIMA_OSCURO} autor="— Liora, Hortelana del Cambio">
            “{CHOQUE_PURGA_MUTACION.mutacion}”
          </Cita>
          <Cita color={ROSA_OSCURO} autor="— Idris, El Podador">
            “{CHOQUE_PURGA_MUTACION.purga}”
          </Cita>

          <Sub color={ROSA}>Dos maneras de responder a la misma herida</Sub>
          <P>
            Ninguna es buena ni mala: son el Eje preguntándose a sí mismo qué se hace con lo que cambió sin permiso. Una lo amputa; la otra lo deja entrar.
          </P>
          <PurgaYMutacion />
        </div>
      </section>

      {/* ═══════ 12 ═══════ */}
      <section aria-labelledby="idris">
        <Encabezado n={12} id="idris" titulo="Idris, El Podador" acento={ROSA} />
        <div className="mt-6 grid items-start gap-8 md:grid-cols-[1fr_minmax(0,16rem)]">
          <div className="md:order-1">
            <P>
              <B color={ROSA}>Idris</B> era el mayor de los jardineros del Árbol, y el primero en entender lo que costaba cuidarlo. Un árbol no vive sin poda: lo que se deja crecer sin juicio le roba la savia al resto. Cuando el Derrame cayó sobre el niño, Idris no sintió odio. Sintió lo que siente quien ha cortado ramas toda la vida: pena, y la certeza de que había que cortar.
            </P>
            <P>
              Por eso fundó el <B>Fuero</B>. Allí un corte no se ordena a la ligera: quien lo ordena responde por él. Antes de ordenar el primero, Idris entrega a uno de los suyos, y de ese precio sale la medida de su poda: su corte nunca alcanza a nadie que valga más que lo que él mismo sacrificó. Y a los que se le plantan enfrente se les va apagando todo lo que habían ganado para volverse más fuertes, los dones y los ánimos, mientras él sostiene su cristal: porque su cristal no brilla: <B color={ROSA}>afila</B>.
            </P>
            <Cita color={ROSA_OSCURO} autor="— Idris, El Podador">“Para que el huerto viva, se poda.”</Cita>
            <P>
              Cada sentencia que dicta y cada pena que despierta afila un poco más a los suyos: los que lo rodean pelean con más filo cada vez que el Tribunal habla. Es soberano y es comandante a la vez: manda sobre los suyos y, al mismo tiempo, responde por cada uno de ellos.
            </P>
          </div>
          <div className="md:order-2 md:sticky md:top-8">
            <Arte id="PU-010" alt="Ilustración de Idris, El Podador" ratio="aspect-[3/4]" />
          </div>
        </div>
      </section>

      {/* ═══════ 13 ═══════ */}
      <section aria-labelledby="purga">
        <Encabezado n={13} id="purga" titulo="El Mazo Purga" nota="· entrega LOS PRIMOGÉNITOS" acento={ROSA} />
        <div className="mt-6">
          <Reveal>
            <div className="mb-6 rounded-r-lg border-l-[3px] bg-surface-2 px-5 py-3 text-sm text-gray-300" style={{ borderColor: ROSA }}>
              <p className="mb-1 text-xs font-semibold" style={{ color: ROSA }}>
                NOTA v1.0 — MAZO IMPLEMENTADO
              </p>
              El mazo Purga, tercera entrega de Los Primogénitos, ya está implementado para la v1.0: <B>{PURGA_CARDS.length} diseños / 66 cartas</B> (15 de Éter, 45 de Mazo Principal y 6 de Vínculos), disponibles en el constructor de cartas.
            </div>
          </Reveal>

          <Cita color={ROSA_OSCURO}>
            Purga es el mazo temático de la faceta del noroeste. Mientras Estásis ancla y Disonancia aprieta, Purga <B>sentencia</B>: pocos Campeones, muchas Místicas y Arcanas, y un Tribunal que dicta cada una como un juicio. Es un mazo de precisión: quita incrementos, niega, busca el papel justo y destruye solo lo necesario.
          </Cita>

          <Sub color={ROSA}>El Tribunal de la Poda</Sub>
          <P>{TRIBUNAL_DE_LA_PODA}</P>

          <Sub color={ROSA}>Los campeones del mazo</Sub>
          <P>Idris y siete voces del Tribunal, cada una con su oficio:</P>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAMPEONES_PURGA.map((c, i) => (
              <TarjetaCampeona key={c.id} c={c} i={i} acento={ROSA} />
            ))}
          </div>

          <Sub color={ROSA}>El Juicio en el mazo</Sub>
          <P>
            El mazo Purga juega la cosmología del noroeste en cada partida: no gana por golpes, gana por <B color={ROSA}>precisión</B>.
          </P>
          <Ciclo pasos={CICLO_PURGA} acento={ROSA_OSCURO} />
          <Cita color={ROSA_OSCURO}>
            Así juega el noroeste: quitando lo que sobra, buscando el expediente, dictando sentencia, pesando y, al final, apelando. El rival puede crecer todo lo que quiera: el Tribunal siempre vuelve a sesionar.
          </Cita>

          <Sub color={ROSA}>Lo que dice el Éter de Purga</Sub>
          <P>Cada cristal del Tribunal guarda un fallo. Estos son los nueve:</P>
          <EterDelMazo eter={ETER_PURGA} acento={ROSA} />
        </div>
      </section>

      {/* ═══════ 14 ═══════ */}
      <section aria-labelledby="liora">
        <Encabezado n={14} id="liora" titulo="Liora y Yaron" acento={LIMA} />
        <div className="mt-6">
          <div className="mb-8 grid items-start gap-8 md:grid-cols-[minmax(0,16rem)_1fr]">
            <Arte id="MU-011" alt="Ilustración de Liora, La Hortelana del Cambio" ratio="aspect-[3/4]" />
            <div>
              <P>
                <B color={LIMA}>Liora</B> miró al mismo niño que Idris y vio lo contrario: no una rama infectada, sino la primera hoja de una especie que nadie había visto. Para ella el cambio nunca fue una enfermedad. Es lo único que el Árbol hace desde que existe: cada estación muda todo lo que toca, y lo que no muda, muere.
              </P>
              <P>
                Fundó el <B>Confín</B> en el límite del mundo, donde cayó el Derrame, y reunió allí a todo lo que había cambiado: bestias, elementales, constructos y humanos que dejaron de parecerlo. En el Confín quien se parece se fortalece, y ella lo sabe mejor que nadie: mientras los suyos se parezcan entre sí, su cristal los vuelve <B color={LIMA}>imposibles de matar</B>.
              </P>
              <Cita color={LIMA_OSCURO} autor="— Liora, La Hortelana del Cambio">“Lo que cambia no muere: florece.”</Cita>
            </div>
          </div>

          <div className="grid items-start gap-8 md:grid-cols-[1fr_minmax(0,16rem)]">
            <div className="md:order-1">
              <P>
                No se fue sola. <B color={LIMA}>Yaron</B> se había sentado al lado de Idris en el Tribunal de la Poda, y dictó sentencias hasta el día en que dejó de creer en ellas. Entonces cruzó al Confín. Nadie lo cortó: lo <B>injertó</B> Liora, y lo que en él fue juicio se volvió cambio.
              </P>
              <P>
                Es el Soberano de Mutación y lleva en la sangre las dos verdades de los jardineros. Cada vez que uno de los suyos cambia de naturaleza, el cristal que Yaron gastó le vuelve a las manos: el cambio se alimenta. Y cuando tres de los suyos se han vuelto una misma cosa, basta una orden suya, aunque le cueste mucho, para arrasar con todo lo que comparta esa naturaleza, aliado o enemigo: <em>quien no cambia, muere</em>. Es la poda de Idris, pero hecha desde el otro lado.
              </P>
              <Cita color={LIMA_OSCURO} autor="— Yaron, El Injerto">“Juzgué durante años lo que se corta. Ahora sé lo que se injerta.”</Cita>
            </div>
            <div className="md:order-2 md:sticky md:top-8">
              <Arte id="MU-010" alt="Ilustración de Yaron, El Injerto" ratio="aspect-[3/4]" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ 15 ═══════ */}
      <section aria-labelledby="mutacion">
        <Encabezado n={15} id="mutacion" titulo="El Mazo Mutación" nota="· entrega LOS PRIMOGÉNITOS" acento={LIMA} />
        <div className="mt-6">
          <Reveal>
            <div className="mb-6 rounded-r-lg border-l-[3px] bg-surface-2 px-5 py-3 text-sm text-gray-300" style={{ borderColor: LIMA }}>
              <p className="mb-1 text-xs font-semibold" style={{ color: LIMA }}>
                NOTA v1.0 — MAZO IMPLEMENTADO
              </p>
              El mazo Mutación, cuarta entrega de Los Primogénitos, ya está implementado para la v1.0: <B>{MUTACION_CARDS.length} diseños / 66 cartas</B> (15 de Éter, 45 de Mazo Principal y 6 de Vínculos), disponibles en el constructor de cartas.
            </div>
          </Reveal>

          <Cita color={LIMA_OSCURO}>
            Mutación es el mazo temático de la faceta del sudeste. Mientras Estásis ancla y Disonancia aprieta, Mutación <B>cambia</B>: sus Campeones mudan de Esencia, contagian al rival y se fortalecen entre sí cuando se parecen. Es un mazo de adaptación: cada cambio tiene su fruto, y quien lo domina decide cuándo barrer el campo.
          </Cita>

          <Sub color={LIMA}>Los hijos del Derrame</Sub>
          <P>{HIJOS_DEL_DERRAME}</P>

          <Sub color={LIMA}>Los campeones del mazo</Sub>
          <P>Liora, Yaron y nueve habitantes del Confín:</P>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[ficha('MU-011'), ficha('MU-010'), ...CAMPEONES_MUTACION].map((c, i) => (
              <TarjetaCampeona key={c.id} c={c} i={i} acento={LIMA} />
            ))}
          </div>

          <Sub color={LIMA}>El Cambio en el mazo</Sub>
          <P>
            El mazo Mutación juega la cosmología del sudeste en cada partida: no gana por constancia ni por presión, gana por <B color={LIMA}>adaptación</B>.
          </P>
          <Ciclo pasos={CICLO_MUTACION} acento={LIMA_OSCURO} />
          <Cita color={LIMA_OSCURO}>
            Así juega el sudeste: soltando lo que eras, contagiando lo que toca, reuniendo a los que se parecen, cosechando cada cambio y, cuando todo está listo, barriendo. El rival puede pelear contra lo que ve: Mutación ya es otra cosa.
          </Cita>

          <Sub color={LIMA}>Lo que dice el Éter de Mutación</Sub>
          <P>Cada cristal del Confín guarda una semilla. Estas son las nueve:</P>
          <EterDelMazo eter={ETER_MUTACION} acento={LIMA} />

          <p className="mt-8 text-sm italic text-gray-500">
            Los mazos Purga y Mutación están disponibles en el constructor de cartas ({PURGA_CARDS.length} y {MUTACION_CARDS.length} diseños / 66 cartas cada uno). El noroeste y el sudeste ya tienen voz.
          </p>
        </div>
      </section>
    </>
  )
}
