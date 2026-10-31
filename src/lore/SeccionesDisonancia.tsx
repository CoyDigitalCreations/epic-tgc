/**
 * Secciones 8-10 del lore: el sur. Espejo del norte (Casas → Nudos, Aurora → Ragnar, mazo Estásis → mazo Disonancia).
 * El acento de color es el rojo del Caos. Los efectos que se mencionan son los reales de seed/FuenteEfectos.json.
 */
import { motion } from 'framer-motion'
import { Arte, Cita, Reveal } from './animaciones'
import { B, Ciclo, Encabezado, P, Sub, TarjetaCampeona } from './bloques'
import { CAMPEONES_DISONANCIA, CICLO_DISONANCIA, ETER_SUR, NORTE_SUR } from './contenido'

const ROJO = '#ef4444'
const ROJO_OSCURO = '#b91c1c'
const CIAN = '#22d3ee'

/** Norte y sur frente a frente: las filas aparecen una a una. */
function NorteYSur() {
  return (
    <Reveal className="my-8">
      <div className="overflow-x-auto rounded-xl border border-card-border">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <caption className="sr-only">Comparación entre el norte (Estásis) y el sur (Disonancia)</caption>
          <thead>
            <tr className="bg-surface-2 font-display text-xs uppercase tracking-wider">
              <th scope="col" className="px-4 py-3 text-gray-500" />
              <th scope="col" className="px-4 py-3" style={{ color: CIAN }}>
                El Norte
              </th>
              <th scope="col" className="px-4 py-3" style={{ color: ROJO }}>
                El Sur
              </th>
            </tr>
          </thead>
          <tbody>
            {NORTE_SUR.map((f, i) => (
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
                <td className="px-4 py-2.5 text-gray-300">{f.norte}</td>
                <td className="px-4 py-2.5 text-gray-300">{f.sur}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </Reveal>
  )
}

/** Las frases de las nueve cartas de Éter del sur, con su ilustración. */
function EterDelSur() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {ETER_SUR.map((e, i) => (
        <motion.figure
          key={e.id}
          className="group overflow-hidden rounded-lg border border-card-border bg-surface-2"
          initial={{ opacity: 0, scale: 0.94 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
          whileHover={{ borderColor: ROJO }}
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
            <p className="font-display text-[11px] font-bold uppercase tracking-wider" style={{ color: ROJO }}>
              {e.nombre}
            </p>
            <p className="mt-1 text-xs italic leading-snug text-gray-400">“{e.frase}”</p>
          </figcaption>
        </motion.figure>
      ))}
    </div>
  )
}

export function SeccionesDisonancia() {
  return (
    <>
      {/* ═══════ 8 ═══════ */}
      <section aria-labelledby="sur">
        <Encabezado n={8} id="sur" titulo="El Sur y el Nudo" acento={ROJO} />
        <div className="mt-6">
          <div className="mb-8 grid items-center gap-8 md:grid-cols-[minmax(0,16rem)_1fr]">
            <Arte id="DS-023" alt="Ilustración de El Nudo: la Tormenta enrollada sobre sí misma" ratio="aspect-[4/5]" />
            <div>
              <P>
                Donde el norte tiene el Ancla, el sur tiene el Nudo. En el extremo austral del Eje la línea de fuerza no termina: se anuda. El <B color={ROJO}>Nudo</B> es el punto donde la Tormenta se enrolla sobre sí misma, y cada vez que el Eje tiembla, aprieta un poco más. Los sabios del norte lo llamaron castigo; en el sur lo llaman memoria: <em>«El Nudo no olvida lo que se le debe»</em>.
              </P>
              <P>
                Antes de la Escisión, el sur no tuvo Casas. Nada se heredaba: todo se <B>pactaba</B>. Los reinos del sur eran deudas encadenadas, cada juramento un cabo atado a otro, y quien rompía su palabra pagaba con lo que el Nudo eligiera cobrar. Los heraldos del norte se burlaban, <em>«el sur no hereda: arrebata»</em>, y el sur adoptó la burla como lema.
              </P>
            </div>
          </div>

          <P>
            Cuando la Gran Escisión partió el Eje, los reinos del norte se quebraron. Los del sur no cayeron: se <B>apretaron</B>. La Tormenta no retiene lo que toma, lo rompe y lo suelta; el Nudo, en cambio, no devuelve lo que cobra. Mientras las casas del norte lloraban sus tronos vacíos, el sur cobraba cada deuda que la guerra dejó abierta. <em>«Lo que el sur toma, el norte lo llora.»</em>
          </P>
          <P>
            Los primogénitos del sur son hombres, y ningún sabio les entregó su cristal: el Nudo se lo <B>clavó</B> en el pecho al despertar. No hubo ceremonia ni linaje que los reclamara; el cristal los eligió porque algo se les debía. Mientras las primogénitas del norte se negaron a elegir bando, los primogénitos del sur no tienen bando que rechazar: su bando es el Nudo. Ellos no vagan buscando el origen de su poder. Ellos <B color={ROJO}>cobran</B>.
          </P>

          <Cita color={ROJO_OSCURO} autor="— Ragnar, Voz del Nudo">
            “El norte canta su Reino. El sur aprieta su Nudo.”
          </Cita>

          <Sub color={CIAN}>Dos maneras de sostener el Eje</Sub>
          <P>
            Norte y sur no son enemigos por naturaleza: son los dos brazos del mismo Eje. Pero lo sostienen de maneras opuestas, y se nota en todo lo que tocan.
          </P>
          <NorteYSur />

          <Cita color={ROJO_OSCURO}>
            Su poder no es la constancia: es la <B>presión</B>. El sur no gana anclando: gana porque nada se le escapa. Cada Éter que le arrebatan al rival es una deuda cobrada; cada Campeón que rompen, una promesa que el norte ya no podrá cumplir; cada carta que el rival pierde, una voz menos para la hermandad. El Aprieto es su estrategia y su sentencia.
          </Cita>
        </div>
      </section>

      {/* ═══════ 9 ═══════ */}
      <section aria-labelledby="ragnar">
        <Encabezado n={9} id="ragnar" titulo="Ragnar, Voz del Nudo" acento={ROJO} />
        <div className="mt-6 grid items-start gap-8 md:grid-cols-[1fr_minmax(0,16rem)]">
          <div className="md:order-1">
            <P>
              Cuando el Nudo apretó por primera vez en el sur, el primero en despertar fue un hombre, y el sur entero contuvo el aliento. <B color={ROJO}>Ragnar</B> fue el primero de los primogénitos de Caos: el primero en cargar el cristal del Nudo, el que mostró el camino. No lo eligió ningún linaje; lo eligió la deuda más antigua del Eje.
            </P>
            <P>
              Por eso lo llaman la <B>Voz del Nudo</B>: habla por el sur, y cuando habla, el sur aprieta. Los demás primogénitos de Caos lo siguen sin que él lo pida, como el trueno sigue al relámpago. Y es el único capaz de mirar a Aurora sin pestañear: dos primeros, dos polos, dos maneras de sostener el mismo Eje.
            </P>
            <P>
              Nada rompe lo que él aprieta: con una palabra vuelve Indestructible a quien lo rodea, y con otra destruye a quien se le planta enfrente. No necesita alzar la mano: el Nudo cobra por él.
            </P>
            <Cita color={ROJO_OSCURO} autor="— Ragnar, Voz del Nudo">“No heredamos ningún trono. Los cobramos todos.”</Cita>
            <P>
              Él es el Nudo de los primogénitos: lo que los mantiene atados cuando todo lo demás se rompe, el que recuerda a quién le deben y por qué no se detienen.
            </P>
          </div>
          <div className="md:order-2 md:sticky md:top-8">
            <Arte id="DS-010" alt="Ilustración de Ragnar, Voz del Nudo" ratio="aspect-[3/4]" />
          </div>
        </div>
      </section>

      {/* ═══════ 10 ═══════ */}
      <section aria-labelledby="disonancia">
        <Encabezado n={10} id="disonancia" titulo="El Mazo Disonancia" nota="· entrega LOS PRIMOGÉNITOS" acento={ROJO} />
        <div className="mt-6">
          <Reveal>
            <div className="mb-6 rounded-r-lg border-l-[3px] bg-surface-2 px-5 py-3 text-sm text-gray-300" style={{ borderColor: ROJO }}>
              <p className="mb-1 text-xs font-semibold" style={{ color: ROJO }}>
                NOTA v2.0 — MAZO IMPLEMENTADO
              </p>
              El mazo Disonancia, segunda entrega de Los Primogénitos, ya está implementado para la v2.0: <B>33 diseños / 66 cartas</B> (15 de Éter, 45 de Mazo Principal y 6 de Vínculos), disponibles en el constructor de cartas. Es la contraparte del polo sur del mazo Estásis.
            </div>
          </Reveal>

          <Cita color={ROJO_OSCURO}>
            Disonancia («La Tormenta») es el mazo temático de la facción Caos. En el sur, donde el Eje termina en un Nudo, los primogénitos de Caos despertaron con el cristal clavado en el pecho, y el Nudo aprieta cada vez que el Eje tiembla. Mientras Estásis ancla, Disonancia aprieta: la Tormenta no retiene lo que toma, lo rompe y lo suelta. Ragnar, Voz del Nudo, es el primero de todos: el hombre que habla por el sur y el único capaz de mirar a Aurora sin pestañear.
            <br />
            <br />
            El mazo juega con la presión y la destrucción: romper a los Campeones del rival y estrangular su economía de Éter mientras los Campeones de Caos avanzan como la tormenta que no se detiene.
          </Cita>

          <Sub color={CIAN}>Los campeones del mazo</Sub>
          <P>Diez voces del sur, diez maneras de cobrar:</P>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAMPEONES_DISONANCIA.map((c, i) => (
              <TarjetaCampeona key={c.id} c={c} i={i} acento={ROJO} />
            ))}
          </div>

          <Sub color={CIAN}>El Aprieto del Nudo en el mazo</Sub>
          <P>
            El mazo Disonancia juega la cosmología del sur en cada partida: no gana por constancia, gana por <B color={ROJO}>presión</B>.
          </P>
          <Ciclo pasos={CICLO_DISONANCIA} acento={ROJO_OSCURO} />
          <Cita color={ROJO_OSCURO}>
            Así juega el sur: apretando, cobrando, arrebatando, avanzando. El rival puede anclar todo lo que quiera, pero el Nudo siempre cierra. Esa es la estrategia de la Tormenta: que nada se le escape.
          </Cita>

          <Sub color={CIAN}>Lo que dice el Éter del sur</Sub>
          <P>Cada cristal del sur guarda una sentencia. Estas son las nueve:</P>
          <EterDelSur />

          <p className="mt-8 text-sm italic text-gray-500">
            El mazo Disonancia está disponible en el constructor de cartas (33 diseños / 66 cartas). Norte y sur ya tienen voz: el Eje, por fin, está completo.
          </p>
        </div>
      </section>
    </>
  )
}
