import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { MotionConfig, motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { Arte, Cita, MapaEje, Reveal } from './animaciones'
import { B, Ciclo, Encabezado, P, Sub, TarjetaCampeona } from './bloques'
import { CAMPEONAS, CASAS, CICLO, FACETAS, MITO_FACETAS, POLOS, SECCIONES } from './contenido'
import { SeccionesDisonancia } from './SeccionesDisonancia'

/** Sección activa según el scroll (para resaltar el índice lateral). */
function useSeccionActiva(): string {
  const [activa, setActiva] = useState<string>(SECCIONES[0].id)
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const observador = new IntersectionObserver(
      (entradas) => {
        const visible = entradas.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActiva(visible.target.id)
      },
      { rootMargin: '-20% 0px -65% 0px' },
    )
    SECCIONES.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observador.observe(el)
    })
    return () => observador.disconnect()
  }, [])
  return activa
}

function Hero() {
  const { scrollY } = useScroll()
  const fondoY = useTransform(scrollY, [0, 700], [0, 140])
  const fondoOpacidad = useTransform(scrollY, [0, 500], [0.5, 0])
  return (
    <header className="relative flex min-h-[88vh] items-center justify-center overflow-hidden border-b-2 border-card-border">
      <motion.img
        aria-hidden="true"
        src="/cartas/FB-010.webp"
        alt=""
        className="pointer-events-none absolute inset-0 size-full object-cover blur-[3px]"
        style={{ y: fondoY, opacity: fondoOpacidad }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_40%,rgba(64,64,255,0.18),transparent),linear-gradient(to_bottom,rgba(13,13,20,0.55),#0d0d14)]"
      />
      <div className="relative px-6 text-center">
        <motion.img
          src="/hexagono_eter.png"
          alt=""
          aria-hidden="true"
          width={120}
          className="mx-auto mb-6 drop-shadow-[0_0_28px_rgba(80,140,255,0.55)]"
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1, y: [0, -10, 0] }}
          transition={{ opacity: { duration: 1 }, scale: { duration: 1 }, y: { duration: 5, repeat: Infinity, ease: 'easeInOut' } }}
        />
        <motion.h1
          className="bg-gradient-to-br from-ether-200 to-ether-400 bg-clip-text font-display text-4xl font-black tracking-[0.18em] text-transparent sm:text-6xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.25 }}
        >
          ÉTER ENGINE TCG
        </motion.h1>
        <motion.p
          className="mt-3 font-display text-sm uppercase tracking-[0.4em] text-gray-400 sm:text-base"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.6 }}
        >
          Los Primogénitos del Éter
        </motion.p>
        <motion.p
          className="mt-4 text-sm text-gray-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.9 }}
        >
          Versión <span className="text-ether-300">2.0</span> — Lore y cosmología del Eje · Entrega Los Primogénitos
        </motion.p>
        <motion.a
          href="#mundo"
          className="mt-10 inline-flex flex-col items-center gap-1 text-xs uppercase tracking-[0.3em] text-gray-500 transition-colors hover:text-ether-200"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
        >
          Descender
          <motion.span aria-hidden="true" animate={{ y: [0, 6, 0] }} transition={{ duration: 1.8, repeat: Infinity }}>
            ↓
          </motion.span>
        </motion.a>
      </div>
    </header>
  )
}

export default function Lore() {
  const { scrollYProgress } = useScroll()
  const progreso = useSpring(scrollYProgress, { stiffness: 120, damping: 24 })
  const activa = useSeccionActiva()

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#0d0d14] font-body text-gray-100">
        <motion.div
          aria-hidden="true"
          className="fixed inset-x-0 top-0 z-50 h-0.5 origin-left bg-gradient-to-r from-ether-400 to-card-tactica"
          style={{ scaleX: progreso }}
        />

        <nav className="sticky top-0 z-40 border-b border-card-border/70 bg-surface/80 backdrop-blur-sm lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 text-sm">
            <Link to="/" className="text-gray-400 transition-colors hover:text-ether-200">
              ← Inicio
            </Link>
            <span className="font-display text-xs uppercase tracking-widest text-gray-500">Lore</span>
          </div>
        </nav>

        <Hero />

        <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-24 pt-12 lg:grid-cols-[13rem_minmax(0,1fr)]">
          {/* Índice lateral: resalta la sección en curso */}
          <aside className="hidden lg:block">
            <div className="sticky top-8">
              <Link to="/" className="mb-6 block text-sm text-gray-500 transition-colors hover:text-ether-200">
                ← Inicio
              </Link>
              <p className="mb-3 font-display text-xs font-bold uppercase tracking-[0.25em] text-ether-300">Índice</p>
              <ol className="space-y-1 border-l border-card-border">
                {SECCIONES.map((s, i) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      aria-current={activa === s.id ? 'true' : undefined}
                      className={`-ml-px block border-l-2 py-1 pl-3 text-sm transition-colors ${
                        activa === s.id ? 'border-ether-300 text-gray-100' : 'border-transparent text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      <span className="mr-2 text-ether-300">{i + 1}</span>
                      {s.titulo}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </aside>

          <main className="min-w-0 space-y-20">
            {/* ═══════ 1 ═══════ */}
            <section aria-labelledby="mundo">
              <Encabezado n={1} id="mundo" titulo="El Mundo de Éter" />
              <div className="mt-6">
                <P>
                  En el principio existía el Éter. Una energía primordial que fluye a través de toda la realidad, conectando mundos, criaturas y destinos. Del latido del Éter surgió el <B>Eje</B>: la línea de fuerza que une los <B>Dos Polos Primigenios</B>, fuerzas opuestas y complementarias que sostienen la realidad.
                </P>
                <div className="my-8 grid items-center gap-8 md:grid-cols-[1fr_minmax(0,18rem)]">
                  <div>
                    <P>
                      El Éter no es un elemento ni una fuerza: es la <B>sustancia de la voluntad</B>. Todo lo que existe (la piedra, la memoria, el miedo, el amanecer) no es más que Éter que aprendió a tener forma. Por eso los sabios dicen que ninguna batalla es física: cada espada, cada juramento y cada reino son dos voluntades chocando, y el Éter es el campo donde chocan.
                    </P>
                    <P>
                      El <B>Eje</B> no es una línea dibujada en el mapa: es la tensión viva entre los Dos Polos, el pulso que mantiene la realidad tensa como una cuerda de arco. Toda criatura camina sobre el Eje sin saberlo; cada decisión lo curva un poco hacia el norte o hacia el sur. Cuando el Éter se concentra con suficiente fuerza en un solo punto, <B>cristaliza</B>: así nacen los cristales primigenios, fragmentos del primer latido que conservan memoria propia y cantan para quien sabe escucharlos.
                    </P>
                  </div>
                  <Arte id="FB-007" alt="Ilustración del Éter de la Primogénita: un cristal primigenio" ratio="aspect-[4/5]" />
                </div>
                <Cita autor={<>— “El alba devuelve lo que la noche tomó.”<br />Proverbio de las casas del norte</>}>
                  El Éter respira. Fluye desde la <B>Reserva</B> hacia el mundo cuando despierta el <B>Alba</B>; se <B>ancla</B> en los seres y las promesas que quieren sostener; se <B>gasta</B> en cada acto de poder; y al final <B>regresa</B>, porque nada de lo que fue Éter deja de serlo. Los sabios del norte llaman a este ciclo <em>el Gran Ciclo</em>: la forma que tiene la realidad de recordarse a sí misma. Quien aprende a leerlo, aprende a ganar.
                </Cita>
                <P>
                  El Set Básico, <B>“El Despertar del Éter”</B>, presentará las mecánicas fundamentales del juego cuando sus cartas sean diseñadas para la v2.0. La primera entrega, <B color="#7070ff">LOS PRIMOGÉNITOS</B>, abre con el mazo temático <B color="#7070ff">ESTÁSIS</B> («El Ancla»): los Primogénitos del Éter, unidos por el Éter primigenio del polo norte.
                </P>
              </div>
            </section>

            {/* ═══════ 2 ═══════ */}
            <section aria-labelledby="facciones">
              <Encabezado n={2} id="facciones" titulo="Las Facciones" />
              <div className="mt-6">
                <P>
                  Estos son los <B>Dos Polos Primigenios</B> (el Eje) y, donde el Eje se entrelaza consigo mismo, las <B>Seis Facetas</B>: cada una nacida como hija de la tensión entre Orden y Caos, con identidad y runa propias. Cada facción canaliza el Éter de forma distinta, ya sea a través de campeones, conjuros mágicos, estrategias de batalla, pactos arcanos o golpes de combate.
                </P>

                <Reveal className="my-8">
                  <MapaEje />
                </Reveal>

                <div className="grid gap-4 sm:grid-cols-2">
                  {POLOS.map((p, i) => (
                    <Reveal key={p.nombre} delay={i * 0.1}>
                      <div className="h-full rounded-xl border bg-surface-2 p-5" style={{ borderColor: `${p.color}55` }}>
                        <div className="flex items-center gap-3">
                          <img src={i === 0 ? '/facciones_cyan.png' : '/facciones_red.png'} alt="" aria-hidden="true" width={44} height={44} />
                          <div>
                            <p className="font-display text-lg font-bold tracking-wider" style={{ color: p.color }}>
                              {p.nombre}
                            </p>
                            <p className="text-xs text-gray-500">
                              {p.faceta} · {p.runa} · {p.posicion}
                            </p>
                          </div>
                        </div>
                        <p className="mt-3 text-sm text-gray-400">{p.descripcion}</p>
                      </div>
                    </Reveal>
                  ))}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {FACETAS.map((f, i) => (
                    <Reveal key={f.nombre} delay={(i % 3) * 0.08}>
                      <div className="h-full rounded-lg border border-card-border bg-surface-2 p-4 transition-colors hover:border-ether-600">
                        <p className="font-display text-sm font-bold tracking-wider" style={{ color: f.color }}>
                          {f.nombre}
                        </p>
                        <p className="mt-0.5 text-[11px] text-gray-500">
                          {f.faceta} · {f.runa} · {f.posicion}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-gray-400">{f.descripcion}</p>
                      </div>
                    </Reveal>
                  ))}
                </div>

                <h3 className="mb-1 mt-12 font-display text-base font-bold uppercase tracking-wider text-card-tactica">El mito de las Seis Facetas</h3>
                <P>
                  Cuenta la tradición que, en el instante del primer latido, el Eje se hizo seis preguntas y cada respuesta se volvió una faceta. Ninguna faceta es buena ni mala: todas son el Eje preguntándose a sí mismo.
                </P>
                <ol className="grid gap-3 sm:grid-cols-2">
                  {MITO_FACETAS.map((m, i) => (
                    <motion.li
                      key={m.nombre}
                      className="rounded-lg border border-card-border bg-surface-2 p-4"
                      initial={{ opacity: 0, x: i % 2 === 0 ? -24 : 24 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: '-50px' }}
                      transition={{ duration: 0.55, delay: (i % 2) * 0.1 }}
                    >
                      <p className="text-sm italic text-gray-400">{m.pregunta}</p>
                      <p className="mt-2 text-sm text-gray-200">
                        y nació <strong style={{ color: m.color }}>{m.nombre}</strong>, {m.respuesta.charAt(0).toLowerCase() + m.respuesta.slice(1)}
                      </p>
                    </motion.li>
                  ))}
                </ol>
              </div>
            </section>

            {/* ═══════ 3 ═══════ */}
            <section aria-labelledby="escision">
              <Encabezado n={3} id="escision" titulo="La Gran Escisión" />
              <div className="mt-6">
                <div className="mb-8 grid grid-cols-2 gap-4">
                  <Arte id="FB-023" alt="Ilustración de El Reino Perdido: un reino de cristal antes de caer" ratio="aspect-[4/3]" />
                  <Arte id="FB-020" alt="Ilustración del Lamento de las Casas: el duelo tras la guerra" ratio="aspect-[4/3]" />
                </div>
                <P>
                  Tras el primer latido, el norte conoció una era de esplendor: la <B>Edad de las Casas</B>. Alrededor de la sangre de la Primogénita florecieron reinos de cristal y juramento, ciudades talladas en Éter solidificado, bibliotecas donde las runas cantaban solas. Las casas nobles gobernaron en nombre del Eje, y durante generaciones el mundo creyó que el equilibrio era para siempre.
                </P>
                <P>
                  Pero el poder de la sangre se volvió apetito. Cada casa quiso un cristal más grande, un linaje más puro, un fragmento del primer latido que fuera solo suyo. Las promesas que sostenían los reinos empezaron a quebrarse una a una, y la guerra llegó como llegan las tormentas: primero un rumor, después un trueno, después nada que no fuera ceniza. <em>«El dolor de una casa es el poder de otra»</em>, decían los heraldos mientras las espadas cantaban.
                </P>
                <P>
                  Esa guerra se llamó la <B>Gran Escisión</B>, porque partió en dos lo que siempre había sido uno. Los polos, que aún se llamaban <B>Estásis</B> y <B>Disonancia</B>, dejaron de ser los dos brazos del mismo abrazo y se volvieron bandos: <B color="#22d3ee">Orden</B> contra <B color="#ef4444">Caos</B>. El mundo aprendió los nombres nuevos y olvidó los antiguos; el Eje quedó tenso como una cuerda a punto de cortarse.
                </P>
                <P>
                  Los reinos cayeron. Los tronos quedaron vacíos, y los vacíos aún exigen respuestas. Cada casa noble ordenó a su primogénita empuñar el cristal contra sus hermanas: <em>pelea por tu casa, es tu sangre</em>. Y por primera vez en la Edad de las Casas, las hijas del Éter dijeron <B>no</B>.
                </P>
                <Cita autor="— Seraphina, Voz de las Casas">
                  “Las casas nos dieron el cristal al nacer y nos pidieron la vida al crecer. Nos dieron un bando y nos exigieron un enemigo. Nosotras les dimos la espalda a los dos.”
                </Cita>
              </div>
            </section>

            {/* ═══════ 4 ═══════ */}
            <section aria-labelledby="primogenitos">
              <Encabezado n={4} id="primogenitos" titulo="Los Primogénitos" />
              <div className="mt-6">
                <P>
                  Antes de la Escisión, cuando el Éter despertó en el norte, cada casa noble eligió al heredero de su linaje para un destino mayor: al nacer, el <B>primogénito</B> de la casa recibía un <B>cristal de Éter primigenio</B>, implantado en el pecho por los sabios del Eje. El vínculo los marcó para siempre: sus cuerpos se volvieron <B>conductos vivientes</B> por donde el Éter fluía como sangre, y su voluntad se volvió la fuerza que moldea la realidad. Ya no eran solo humanos: eran el Éter con forma de hija.
                </P>
                <P>
                  El cristal no se entrega: se <B>hereda</B>, y solo al primogénito. Por eso, cuando las casas cayeron, las hijas que llevaban el cristal quedaron como la última memoria viva de cada linaje. En esta entrega, las primogénitas de Orden son <B>mujeres</B>; en el sur, donde el Nudo aprieta, los primogénitos de Caos son <B>hombres</B>, y el mundo aún no sabe cuál de los dos destinos es más pesado.
                </P>
                <P>
                  Reunidas en la ruina, las primogénitas del norte hicieron un pacto que ninguna casa firmó: <B>no elegir bando</B>. Ni Orden ni Caos, ni reino ni corona. Desde entonces vagan por el mundo como una sola hermandad, unidas por la sangre y por el Éter, buscando el origen de su poder y el propósito de su existencia. <em>«Cada hermana es la voz de una casa que ya no existe»</em>, y juntas, esas voces forman un reino nuevo, sin muros y sin trono.
                </P>
                <Cita>
                  Su poder no es la violencia: es la <B>constancia</B>. La hermandad no gana golpeando más fuerte: gana porque el Éter nunca las abandona. Cada cristal que anclan en una hermana es una promesa que sostienen; cada Éter que devuelven al alba es una vida que renace; cada recuerdo que rescatan del olvido es una casa que se niega a morir del todo. El Gran Ciclo es su estrategia y su juramento.
                </Cita>
              </div>
            </section>

            {/* ═══════ 5 ═══════ */}
            <section aria-labelledby="casas">
              <Encabezado n={5} id="casas" titulo="Las Casas Nobles" />
              <div className="mt-6">
                <P>
                  Cinco casas del norte levantaron sus reinos alrededor del cristal de sus primogénitas. Cada una canalizó el Éter a su manera; cada una cayó a su manera. De todas quedan las hijas, y de las hijas queda esta memoria:
                </P>
                <div className="grid gap-4 sm:grid-cols-2">
                  {CASAS.map((c, i) => (
                    <motion.article
                      key={c.nombre}
                      className="group overflow-hidden rounded-xl border border-card-border bg-surface-2 transition-colors hover:border-ether-600"
                      initial={{ opacity: 0, y: 28 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-60px' }}
                      transition={{ duration: 0.6, delay: (i % 2) * 0.12 }}
                      whileHover={{ y: -4 }}
                    >
                      <div className="aspect-[16/9] overflow-hidden">
                        <img
                          src={`/cartas/${c.arte}.webp`}
                          alt={`Arte de ${c.nombre}`}
                          width={1024}
                          height={1024}
                          loading="lazy"
                          decoding="async"
                          className="size-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="font-display text-sm font-bold tracking-wider text-ether-300">{c.nombre}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-gray-400">{c.texto}</p>
                        <p className="mt-2 text-xs text-gray-500">
                          Primogénitas: <span className="text-gray-300">{c.primogenitas}</span>
                        </p>
                      </div>
                    </motion.article>
                  ))}
                </div>
              </div>
            </section>

            {/* ═══════ 6 ═══════ */}
            <section aria-labelledby="aurora">
              <Encabezado n={6} id="aurora" titulo="Aurora, La Primogénita" />
              <div className="mt-6 grid items-start gap-8 md:grid-cols-[minmax(0,16rem)_1fr]">
                <div className="md:sticky md:top-8">
                  <Arte id="FB-010" alt="Ilustración de Aurora, La Primogénita" ratio="aspect-[3/4]" />
                </div>
                <div>
                  <P>
                    Cuando el Éter latió por primera vez en el norte, la primera en abrir los ojos fue una niña de Casa Alba, y el alba entero se detuvo a mirarla. <B>Aurora</B> fue la primera en fusionarse, la que marcó el camino: la primera de todas, la que ningún cristal eligió porque fue el cristal quien la eligió a ella.
                  </P>
                  <P>
                    De su sangre se forjaron los cristales de las demás casas. Cada primogénita que vino después bebió, en un sentido antiguo y literal, de la misma promesa: por eso todas son hermanas, aunque ningún árbol genealógico las una. Cuando las casas cayeron, lo que cayó fue un reino hecho de su linaje, y el trono vacío que quedó en el norte es, en verdad, el trono de Aurora.
                  </P>
                  <P>
                    Su voluntad no se impone: <B>domina</B>. Los campeones que se enfrentan a ella sienten su cristal cantar en el pecho ajeno, y los que luchan a su lado se vuelven más de lo que eran. No necesita alzar la voz: el Éter la obedece antes de que pida. Y sin embargo, dicen que en las noches de luna muerta se la oye llorar por las hermanas perdidas y por las casas que no volverán: el lamento de la primera todavía se escucha, si uno sabe escuchar.
                  </P>
                  <Cita autor="— Aurora, La Primogénita">“No somos hijos de ningún reino. Somos el Reino.”</Cita>
                  <P>
                    Ella es el ancla de la hermandad: la que mantiene unidas a las errantes cuando el camino se parte, la que recuerda por qué se negaron a elegir bando, la que sabe que el reino que juraron construir no tendrá muros ni corona, solo hermanas.
                  </P>
                </div>
              </div>
            </section>

            {/* ═══════ 7 ═══════ */}
            <section aria-labelledby="estasis">
              <Encabezado n={7} id="estasis" titulo="El Mazo Estásis" nota="· entrega LOS PRIMOGÉNITOS" />
              <div className="mt-6">
                <Reveal>
                  <div className="mb-6 rounded-r-lg border-l-[3px] border-card-arcana bg-surface-2 px-5 py-3 text-sm text-gray-300">
                    <p className="mb-1 text-xs font-semibold text-card-arcana">NOTA v2.0 — MAZO IMPLEMENTADO</p>
                    El mazo Estásis, primera entrega de Los Primogénitos, ya está implementado para la v2.0: <B>32 diseños / 66 cartas</B> (15 de Éter, 45 de Mazo Principal y 6 de Vínculos), disponibles en el constructor de cartas. Su contraparte del polo sur, el mazo Disonancia, también está implementado: lo encuentras en la sección 10.
                  </div>
                </Reveal>

                <Cita>
                  Antes de la Gran Escisión, cuando las facciones de Orden y Caos aún no habían tomado sus nombres, los polos del Éter se llamaban <B>Estásis</B> y <B>Disonancia</B>: el Ancla y la Tormenta, unidos por el Eje. De la tensión entre ambos polos nacieron los <B>Primogénitos del Éter</B>: los primeros seres humanos en fusionarse con la energía primigenia. Cada uno era el primogénito de su casa noble, elegido al nacer para portar un cristal de Éter primigenio.
                  <br />
                  <br />
                  En esta primera entrega, las primogénitas de Orden son mujeres y los primogénitos de Caos, hombres. El vínculo los marcó para siempre: sus cuerpos se convirtieron en conductos vivientes del Éter, y su voluntad en la fuerza que moldea la realidad. Aurora, la Primogénita, fue la primera de todas, y su sangre se convirtió en la fuente del poder de las casas.
                  <br />
                  <br />
                  Pero cuando las casas cayeron en la guerra, los Primogénitos se negaron a elegir bando. Ahora vagan por el mundo, unidos por la sangre y el Éter, buscando el origen de su poder y el propósito de su existencia.
                </Cita>

                <Sub>Los campeones del mazo</Sub>
                <P>Nueve primogénitas, nueve historias que juegan como una sola hermandad:</P>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {CAMPEONAS.map((c, i) => (
                    <TarjetaCampeona key={c.id} c={c} i={i} />
                  ))}
                </div>

                <Sub>El ciclo del Éter en el mazo</Sub>
                <P>
                  El mazo Estásis juega la cosmología entera en cada partida: la hermandad no gana por golpes, gana por <B>constancia</B>.
                </P>
                <Ciclo pasos={CICLO} />
                <Cita>
                  Así juega la hermandad: anclando, devolviendo, reciclando, resistiendo. El rival puede golpear más fuerte, pero el Éter siempre vuelve a las manos que lo cuidaron. Esa es la estrategia de las casas caídas: no caer nunca del todo.
                </Cita>

                {/* Puente al sur */}
                <Reveal className="mt-14">
                  <div className="relative overflow-hidden rounded-2xl border border-card-campeon/40">
                    <img
                      src="/cartas/DS-010.webp"
                      alt="Ilustración de Ragnar, Voz del Nudo"
                      width={1024}
                      height={1024}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 size-full object-cover opacity-45"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0d0d14] via-[#0d0d14]/85 to-transparent" />
                    <div className="relative max-w-xl p-6 sm:p-10">
                      <p className="font-display text-sm font-bold uppercase tracking-[0.25em] text-card-campeon">El Nudo recuerda</p>
                      <p className="mt-3 text-sm leading-relaxed text-gray-300">
                        En el sur, la Tormenta nunca dejó de girar. Los primogénitos de Caos despertaron con el cristal del Nudo clavado en el pecho, y el Nudo aprieta cada vez que el Eje tiembla. Durante toda la Edad de las Casas, el sur guardó silencio. Ya no.
                      </p>
                      <a href="#sur" className="mt-4 inline-block text-sm text-card-campeon transition-colors hover:text-red-300">
                        Descender al sur →
                      </a>
                    </div>
                  </div>
                </Reveal>

                <p className="mt-8 text-sm italic text-gray-500">
                  El mazo Estásis está disponible en el constructor de cartas (32 diseños / 66 cartas). El lore continúa expandiéndose con la nueva cosmología del Éter.
                </p>
              </div>
            </section>

            <SeccionesDisonancia />
          </main>
        </div>

        <footer className="border-t border-card-border py-10 text-center">
          <p className="bg-gradient-to-br from-ether-200 to-ether-400 bg-clip-text font-display text-base font-bold text-transparent">ÉTER ENGINE TCG</p>
          <p className="mt-2 text-xs text-gray-500">Cosmología del Eje — “El Despertar del Éter”</p>
          <p className="text-xs text-gray-500">Mazos Temáticos: “Los Primogénitos” — Estásis (Orden) y Disonancia (Caos)</p>
          <p className="mt-2 text-xs text-gray-600">Versión 2.0 — Julio 2026 · Creado con Éter Forge</p>
          <Link to="/" className="mt-5 inline-block text-sm text-ether-300 transition-colors hover:text-ether-100">
            ← Volver al inicio
          </Link>
        </footer>
      </div>
    </MotionConfig>
  )
}
