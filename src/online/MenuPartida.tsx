import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { useCardImage } from '../forge/hooks/useCardImage'
import { Boton } from '../shared/ui/Boton'
import { Seccion } from '../shared/ui/Seccion'
import { getCardMeta } from './game'
import type { Dificultad } from './game/bot'
import { MAZOS, mazoParaBot } from './mazos'
import { cartasDePortada, resumenMazo } from './resumenMazo'
import type { MazoPersonalizado } from './useMazosStore'

/** Selección del humano: un set preestablecido o un mazo personalizado guardado. */
export type MazoSeleccionado =
  | { tipo: 'set'; id: 'estasis' | 'disonancia' }
  | { tipo: 'custom'; id: string }

export interface MenuProps {
  mazoHumano: MazoSeleccionado
  onMazo: (m: MazoSeleccionado) => void
  mazosPersonalizados: MazoPersonalizado[]
  onNuevoMazo: () => void
  onEditarMazo: (m: MazoPersonalizado) => void
  seed: number
  onSeed: (n: number) => void
  dificultad: Dificultad
  onDificultad: (d: Dificultad) => void
  onEmpezar: () => void
}

const DIFICULTADES = [
  { id: 'facil' as const, label: 'Fácil', desc: 'Prioridades básicas', nivel: 1, color: '#4ade80' },
  { id: 'medio' as const, label: 'Medio', desc: 'Considera combate y habilidades', nivel: 2, color: '#facc15' },
  { id: 'dificil' as const, label: 'Difícil', desc: 'Evalúa el tablero completo', nivel: 3, color: '#f87171' },
]

/** Una carta del abanico de portada, con su arte real (diseño → /cartas, custom → IndexedDB). */
function CartaPortada({ cardId, indice, total, color }: { cardId: string; indice: number; total: number; color: string }) {
  const meta = getCardMeta(cardId)
  const imageUrl = useCardImage(cardId, meta?.hasImage, meta?.imageUrl)
  const centro = (total - 1) / 2
  const pos = indice - centro
  return (
    <div
      className="absolute bottom-4 left-1/2 -ml-[40px] w-[80px] origin-bottom overflow-hidden rounded-md border bg-[#14142b] shadow-[0_8px_20px_-6px_rgba(0,0,0,0.8)] transition-transform duration-300 ease-out [transform:translateX(calc(var(--x)*1px))_translateY(calc(var(--y)*1px))_rotate(calc(var(--r)*1deg))] group-hover:[transform:translateX(calc(var(--x)*1.1px))_translateY(calc(var(--y)*1px_-_6px))_rotate(calc(var(--r)*1.25deg))]"
      style={
        {
          aspectRatio: '744/1038',
          borderColor: `${color}66`,
          zIndex: indice,
          '--x': pos * 44,
          '--y': Math.abs(pos) * 7,
          '--r': pos * 7,
        } as CSSProperties
      }
    >
      {imageUrl ? (
        <img src={imageUrl} alt={meta?.name ?? ''} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-display text-sm font-bold text-[#4b4b7a]">✦</span>
      )}
    </div>
  )
}

interface TarjetaMazoProps {
  nombre: string
  color: string
  etiqueta: string
  cardIds: string[]
  seleccionado: boolean
  onSeleccionar: () => void
  /** Solo los mazos personalizados se pueden editar. */
  onEditar?: () => void
}

/** Tarjeta de un mazo: abanico de portada, nombre, etiqueta y composición. Es un botón de selección. */
function TarjetaMazo({ nombre, color, etiqueta, cardIds, seleccionado, onSeleccionar, onEditar }: TarjetaMazoProps) {
  const portada = useMemo(() => cartasDePortada(cardIds), [cardIds])
  const r = useMemo(() => resumenMazo(cardIds), [cardIds])
  const total = Math.max(1, r.eter + r.principal + r.vinculos)
  return (
    <div className="relative">
      <button
        type="button"
        aria-pressed={seleccionado}
        onClick={onSeleccionar}
        className={`group relative flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl border text-left transition-all duration-200 ${
          seleccionado ? '-translate-y-0.5 border-transparent' : 'border-white/10 hover:-translate-y-0.5 hover:border-white/25'
        }`}
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${color}26 0%, transparent 62%), linear-gradient(180deg, #181829 0%, #11111c 100%)`,
          boxShadow: seleccionado ? `0 0 0 2px ${color}, 0 18px 50px -12px ${color}66` : undefined,
        }}
      >
        {/* Portada: abanico con las mejores cartas */}
        <div className="relative mx-auto mt-4 h-[150px] w-full">
          {portada.map((id, i) => (
            <CartaPortada key={id} cardId={id} indice={i} total={portada.length} color={color} />
          ))}
        </div>

        <div className="px-5 pb-4 pt-3">
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate font-display text-xl font-bold tracking-wide" style={{ color }}>
              {nombre}
            </p>
            {seleccionado && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#0a0a12]"
                style={{ background: color }}
              >
                ✓ Elegido
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-gray-400">{etiqueta}</p>

          {/* Composición: Éter / Principal / Vínculos */}
          <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
            <span style={{ flex: r.eter, background: '#22d3ee' }} />
            <span style={{ flex: r.principal, background: '#7070ff' }} />
            <span style={{ flex: r.vinculos, background: '#ec4899' }} />
          </div>
          <p className="mt-1.5 font-mono text-[10px] text-gray-500">
            {`${total} cartas · Éter ${r.eter} · Principal ${r.principal} · Vínculos ${r.vinculos}`}
          </p>
          <p className="mt-0.5 text-[10px] text-gray-500">
            {`${r.campeones} Campeones · ${r.misticas} Místicas · ${r.arcanas} Arcanas`}
          </p>
        </div>
      </button>

      {onEditar && (
        <button
          type="button"
          onClick={onEditar}
          className="absolute right-3 top-3 z-10 cursor-pointer rounded-lg border border-white/15 bg-[#0a0a12]/80 px-3 py-1 text-[11px] text-gray-200 backdrop-blur transition-colors hover:border-white/30 hover:bg-[#0a0a12]"
        >
          Editar
        </button>
      )}
    </div>
  )
}

/** Medidor de dificultad: 3 puntos, tantos encendidos como el nivel. */
function Nivel({ nivel, color }: { nivel: number; color: string }) {
  return (
    <span aria-hidden="true" className="flex gap-1">
      {[1, 2, 3].map((n) => (
        <span key={n} className="size-1.5 rounded-full" style={{ background: n <= nivel ? color : 'rgba(255,255,255,0.15)' }} />
      ))}
    </span>
  )
}

/**
 * Antesala de la partida contra el bot: elegís mazo (set o personalizado), dificultad y semilla.
 * Izquierda: los mazos como tarjetas. Derecha: el panel de la partida con el botón de comenzar
 * siempre a la vista.
 */
export function MenuPartida({
  mazoHumano,
  onMazo,
  mazosPersonalizados,
  onNuevoMazo,
  onEditarMazo,
  seed,
  onSeed,
  dificultad,
  onDificultad,
  onEmpezar,
}: MenuProps) {
  const rival = mazoParaBot(seed, mazoHumano.tipo === 'set' ? mazoHumano.id : 'custom')

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a12] font-body text-gray-100">
      {/* Ambiente: resplandor superior y viñeta */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 40% at 50% -5%, rgba(64,64,255,0.18), transparent 70%), radial-gradient(ellipse 50% 40% at 90% 100%, rgba(236,72,153,0.07), transparent 70%)',
        }}
      />

      <header className="relative border-b border-card-border/70 bg-surface/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-wider text-gray-100">Éter Online</h1>
            <p className="font-body text-xs text-gray-500">Modo en línea · partida local vs bot</p>
          </div>
          <Link
            to="/"
            className="rounded bg-ether-600/20 px-3 py-1.5 text-xs text-ether-200 transition-colors hover:bg-ether-600/40"
          >
            ← Inicio
          </Link>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6 py-8">
        <div className="mb-7">
          <h2 className="font-display text-3xl font-bold tracking-wide text-gray-50">Nueva partida</h2>
          <p className="mt-1 text-sm text-gray-400">Elegí tu mazo, definí a tu rival y entrá a la mesa.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* ── Mazos ─────────────────────────────────────────── */}
          <section aria-label="Tu mazo">
            <Seccion>Elegí tu mazo</Seccion>
            <div className="grid gap-5 sm:grid-cols-2">
              {MAZOS.map((mazo) => (
                <TarjetaMazo
                  key={mazo.id}
                  nombre={mazo.nombre}
                  color={mazo.color}
                  etiqueta={`Set oficial · facción ${mazo.id === 'estasis' ? 'Orden' : 'Caos'}`}
                  cardIds={mazo.cardIds}
                  seleccionado={mazoHumano.tipo === 'set' && mazoHumano.id === mazo.id}
                  onSeleccionar={() => onMazo({ tipo: 'set', id: mazo.id })}
                />
              ))}

              {/* Mazos personalizados guardados */}
              {mazosPersonalizados.map((mazo) => (
                <TarjetaMazo
                  key={mazo.id}
                  nombre={mazo.nombre}
                  color="#a0a0ff"
                  etiqueta="Personalizado"
                  cardIds={mazo.cardIds}
                  seleccionado={mazoHumano.tipo === 'custom' && mazoHumano.id === mazo.id}
                  onSeleccionar={() => onMazo({ tipo: 'custom', id: mazo.id })}
                  onEditar={() => onEditarMazo(mazo)}
                />
              ))}

              <button
                type="button"
                onClick={onNuevoMazo}
                className="flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-ether-400/40 bg-ether-600/[0.04] text-ether-200 transition-colors hover:border-ether-300 hover:bg-ether-600/10"
              >
                <span aria-hidden="true" className="grid size-10 place-items-center rounded-full bg-ether-500/20 text-2xl leading-none">
                  +
                </span>
                <span className="font-display text-sm tracking-wide">Nuevo mazo personalizado</span>
                <span className="text-[11px] text-gray-500">Armá el tuyo con las cartas del juego</span>
              </button>
            </div>
          </section>

          {/* ── Panel de la partida ───────────────────────────── */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="relative rounded-2xl border border-ether-400/25 bg-gradient-to-b from-[#181829] to-[#0f0f1a] p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-8 top-0 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, #7070ff, transparent)' }}
              />

              {/* Rival */}
              <Seccion>Tu rival</Seccion>
              <div
                className="mb-5 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
                style={{ boxShadow: `inset 3px 0 0 ${rival.color}` }}
              >
                <div className="min-w-0">
                  <p className="font-display text-sm font-bold text-gray-100">{`Rival: ${rival.nombre}`}</p>
                  <p className="text-[11px] text-gray-500">
                    {mazoHumano.tipo === 'custom'
                      ? 'Con mazo personalizado el bot elige su set según la semilla.'
                      : 'Bot con el otro set oficial.'}
                  </p>
                </div>
              </div>

              {/* Dificultad */}
              <Seccion>Dificultad del bot</Seccion>
              <div className="mb-5 grid gap-2">
                {DIFICULTADES.map((d) => {
                  const activa = dificultad === d.id
                  return (
                    <button
                      key={d.id}
                      type="button"
                      aria-pressed={activa}
                      onClick={() => onDificultad(d.id)}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                        activa ? 'border-transparent bg-white/[0.05]' : 'border-white/10 hover:border-white/25'
                      }`}
                      style={activa ? { boxShadow: `0 0 0 1.5px ${d.color}, 0 8px 24px -10px ${d.color}80` } : undefined}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-sm font-bold" style={{ color: d.color }}>
                          {d.label}
                        </p>
                        <p className="text-[11px] text-gray-500">{d.desc}</p>
                      </div>
                      <Nivel nivel={d.nivel} color={d.color} />
                    </button>
                  )
                })}
              </div>

              {/* Semilla */}
              <Seccion>Semilla</Seccion>
              <div className="mb-1 flex items-center gap-2">
                <input
                  id="seed"
                  type="number"
                  aria-label="Seed"
                  value={seed}
                  onChange={(e) => onSeed(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-white/10 bg-[#0a0a12] px-3 py-2 font-mono text-sm text-gray-100 transition-colors focus:border-ether-400 focus:outline-none"
                />
                <Boton tam="md" title="Semilla aleatoria" onClick={() => onSeed(Math.floor(Math.random() * 100_000))}>
                  Aleatoria
                </Boton>
              </div>
              <p className="mb-6 text-[11px] text-gray-600">Misma semilla + mismas decisiones → misma partida.</p>

              <Boton variante="primario" tam="lg" className="w-full" onClick={onEmpezar}>
                Comenzar partida
              </Boton>
            </div>
          </aside>
        </div>

        {/* ── Jugar con amigos ────────────────────────────────── */}
        <div className="mt-10 flex items-center justify-between gap-4 rounded-2xl border border-ether-600/30 bg-ether-600/[0.06] p-4">
          <div>
            <p className="font-display text-sm font-bold text-ether-200">Jugar con amigos</p>
            <p className="mt-0.5 text-[11px] text-gray-400">Salas en línea con código · servidor oficial · sin bot</p>
          </div>
          <Link
            to="/epiconline/amigos"
            className="shrink-0 rounded-lg bg-ether-600 px-4 py-2 font-display text-xs tracking-wider text-white transition-colors hover:bg-ether-500"
          >
            Abrir lobby
          </Link>
        </div>
      </main>
    </div>
  )
}
