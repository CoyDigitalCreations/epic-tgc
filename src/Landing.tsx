import type { ReactNode } from 'react'
import { Link } from 'react-router'

/** Cartas del abanico del hero (imágenes ya publicadas para el manual). */
const ABANICO = [
  { id: 'FB-011', nombre: 'Vaela, Sed de Alba', clase: '-rotate-[9deg] translate-y-6 -mr-10 z-10' },
  { id: 'FB-010', nombre: 'Aurora, La Primogénita', clase: 'z-20 scale-110' },
  { id: 'DS-001', nombre: 'Ragnar, Voz del Nudo', clase: 'rotate-[9deg] translate-y-6 -ml-10 z-10' },
]

interface DestinoProps {
  titulo: string
  descripcion: string
  glifo: string
  acento: string
  to?: string
  href?: string
  principal?: boolean
}

const BASE =
  'group relative flex gap-4 overflow-hidden rounded-2xl border border-card-border bg-surface p-6 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ether-300'

function Destino({ titulo, descripcion, glifo, acento, to, href, principal }: DestinoProps) {
  const contenido: ReactNode = (
    <>
      <span
        aria-hidden="true"
        className={`grid shrink-0 place-items-center rounded-xl border border-white/10 bg-black/30 font-display ${acento} ${
          principal ? 'size-14 text-2xl' : 'size-11 text-xl'
        }`}
      >
        {glifo}
      </span>
      <span className="min-w-0">
        <span
          className={`block font-display font-bold tracking-wider text-gray-100 ${principal ? 'text-xl' : 'text-base'}`}
        >
          {titulo}
        </span>
        <span className="mt-1 block text-sm leading-relaxed text-gray-400">{descripcion}</span>
      </span>
      <span
        aria-hidden="true"
        className="ml-auto self-center pl-2 font-display text-lg text-gray-600 transition-colors group-hover:text-ether-200"
      >
        →
      </span>
    </>
  )
  const clases = `${BASE} ${principal ? 'sm:p-8' : ''}`
  return to ? (
    <Link to={to} className={clases}>
      {contenido}
    </Link>
  ) : (
    <a href={href} className={clases}>
      {contenido}
    </a>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0d0d14] font-body text-gray-100">
      {/* Resplandor de fondo, fijo: no hay nada animado */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(60%_50%_at_75%_0%,rgba(80,80,255,0.16),transparent),radial-gradient(40%_40%_at_0%_100%,rgba(168,85,247,0.08),transparent)]"
      />

      <header className="relative border-b border-card-border/70 bg-surface/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-wider text-gray-100">Éter TCG</h1>
            <p className="font-body text-xs text-gray-500">Creador de cartas y juego en línea</p>
          </div>
          <nav className="flex items-center gap-5 text-sm text-gray-400">
            <a href="/manual.html" className="transition-colors hover:text-ether-200">
              Manual
            </a>
            <a href="/primogenitos.html" className="transition-colors hover:text-ether-200">
              Primogénitos
            </a>
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-6 pb-16 pt-10 lg:pt-16">
        {/* Hero */}
        <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="font-display text-xs uppercase tracking-[0.35em] text-ether-300">
              Set Básico · El Despertar del Éter
            </p>
            <h2 className="mt-4 font-display text-4xl font-black leading-tight tracking-wide text-gray-50 sm:text-5xl">
              Forja tus cartas.
              <span className="block text-ether-200">Juega con el Éter.</span>
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-gray-400">
              Un juego de cartas donde el recurso es una carta más, los Vínculos son tu vida y cada
              Ruptura cuenta. Crea tus cartas, arma tu mazo y enfréntate en línea.
            </p>
          </div>

          <div
            aria-hidden="true"
            className="relative mx-auto flex w-full max-w-[34rem] items-center justify-center py-6 lg:py-0"
          >
            {ABANICO.map((c) => (
              <img
                key={c.id}
                src={`/manual/cartas/${c.id}.png`}
                alt=""
                width={744}
                height={1038}
                decoding="async"
                className={`relative w-[32%] rounded-[5%] shadow-[0_18px_50px_rgba(0,0,0,0.65)] ${c.clase}`}
              />
            ))}
          </div>
        </section>

        {/* Destinos */}
        <section className="mt-14 grid gap-5 sm:grid-cols-2" aria-label="Aplicaciones">
          <Destino
            to="/card-maker"
            titulo="Card Maker"
            descripcion="Crea y edita tus cartas de Éter TCG"
            glifo="✦"
            acento="text-ether-200"
            principal
          />
          <Destino
            to="/epiconline"
            titulo="Éter Online"
            descripcion="Juega partidas de Éter TCG en línea"
            glifo="⚔"
            acento="text-card-campeon"
            principal
          />
          <Destino
            href="/manual.html"
            titulo="Manual de reglas"
            descripcion="Reglas completas de Éter TCG v2.0"
            glifo="❖"
            acento="text-card-arcana"
          />
          <Destino
            href="/primogenitos.html"
            titulo="Los Primogénitos"
            descripcion="El lore y la cosmología del Eje"
            glifo="☾"
            acento="text-card-mistica"
          />
        </section>
      </main>

      <footer className="relative border-t border-card-border/60 py-6 text-center text-xs text-gray-600">
        Éter Engine TCG · Versión 2.0
      </footer>
    </div>
  )
}
