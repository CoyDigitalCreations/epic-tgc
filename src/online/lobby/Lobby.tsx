import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { MAZOS } from '../mazos'
import { visibleState } from '../game'
import { Tablero } from '../components/Tablero'
import { Boton } from '../../shared/ui/Boton'
import { Modal } from '../../shared/ui/Modal'
import { Seccion } from '../../shared/ui/Seccion'
import { TarjetaMazo } from '../components/TarjetaMazo'
import { supabaseConfigurado, supabaseUrl } from '../backend/supabase'
import {
  asegurarSesion,
  crearSala,
  iniciarPartida,
  obtenerEstado,
  rendirse,
  unirseASala,
  type RoomInfo,
} from '../backend/matchApi'
import { useOnlineMatch } from './useOnlineMatch'
import { guardarPartida, leerPartidaGuardada, olvidarPartida } from './partidaGuardada'
import { useMazosStore } from '../useMazosStore'

type Vista = 'auth' | 'menu' | 'espera' | 'partida'

/**
 * Lobby de salas para jugar con amigos (server-authoritative).
 * Auth anónimo (MVP) → crear/unirse con código → sala de espera → partida.
 */
export default function Lobby() {
  const [vista, setVista] = useState<Vista>('auth')
  const [userId, setUserId] = useState<string | null>(null)
  const [cargandoAuth, setCargandoAuth] = useState(false)
  const [errorAuth, setErrorAuth] = useState<string | null>(null)

  const [mazoId, setMazoId] = useState<string>('estasis')
  const [codigoInput, setCodigoInput] = useState('')
  const [sala, setSala] = useState<RoomInfo | null>(null)
  const [errorSala, setErrorSala] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [enPartida, setEnPartida] = useState(false)
  const [ambosListos, setAmbosListos] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const mazosPersonalizados = useMazosStore((s) => s.mazosPersonalizados)

  // Resolver deck: preset (MAZOS) o custom (useMazosStore)
  const deck = useMemo(() => {
    const preset = MAZOS.find((m) => m.id === mazoId)
    if (preset) return preset.cardIds
    const custom = mazosPersonalizados.find((m) => m.id === mazoId)
    return custom?.cardIds ?? MAZOS[0].cardIds
  }, [mazoId, mazosPersonalizados])

  // Reconexión: si quedó una partida guardada (refresco o pestaña cerrada), el servidor dice si sigue viva. Cualquier otra
  // respuesta (terminada, sala ajena, inexistente, error) la olvida y se queda en el menú.
  const reconectar = useCallback(async () => {
    const guardada = leerPartidaGuardada()
    if (!guardada) return
    try {
      const resp = await obtenerEstado(guardada.gameId)
      if (resp.status === 'playing') {
        setSala(guardada)
        setAmbosListos(true)
        setEnPartida(true)
        return
      }
      if (resp.status === 'lobby') {
        setSala(guardada)
        setVista('espera')
        return
      }
    } catch {
      // la sala ya no existe o no es nuestra
    }
    olvidarPartida()
  }, [])

  const entrar = useCallback(async () => {
    setCargandoAuth(true)
    setErrorAuth(null)
    try {
      const id = await asegurarSesion()
      setUserId(id)
      setVista('menu')
      await reconectar()
    } catch (e) {
      setErrorAuth(e instanceof Error ? e.message : String(e))
    } finally {
      setCargandoAuth(false)
    }
  }, [reconectar])

  // Poll de sala: cuando ambos jugadores están → start → partida.
  // Server-authoritative: NO query-eamos eter.games (RLS prohíbe SELECT al
  // cliente); el Edge Function devuelve bothPlayers + status en `state`.
  useEffect(() => {
    if (vista !== 'espera' || !sala || enPartida) return
    const t = window.setInterval(async () => {
      try {
        const resp = await obtenerEstado(sala.gameId)
        if (resp.status === 'playing') {
          setAmbosListos(true)
          setEnPartida(true)
          return
        }
        if (resp.bothPlayers) {
          setAmbosListos(true)
          // Cualquiera puede dar start; lo intenta este cliente
          try {
            await iniciarPartida(sala.gameId)
            setEnPartida(true)
          } catch {
            // el otro quizás ya lo hizo
            const again = await obtenerEstado(sala.gameId)
            if (again.status === 'playing') setEnPartida(true)
          }
        }
      } catch {
        // poll silencioso
      }
    }, 1500)
    return () => window.clearInterval(t)
  }, [vista, sala, enPartida])

  const crear = useCallback(async () => {
    setOcupado(true)
    setErrorSala(null)
    try {
      const info = await crearSala(deck)
      guardarPartida(info)
      setSala(info)
      setVista('espera')
    } catch (e) {
      setErrorSala(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(false)
    }
  }, [deck])

  const unirse = useCallback(async () => {
    if (!codigoInput.trim()) {
      setErrorSala('Ingresa el código de la sala')
      return
    }
    setOcupado(true)
    setErrorSala(null)
    try {
      const info = await unirseASala(codigoInput, deck)
      guardarPartida(info)
      setSala(info)
      setVista('espera')
      setAmbosListos(true)
      // El creador hace start; si somos el único en la sala, esperamos poll
      try {
        await iniciarPartida(info.gameId)
        setEnPartida(true)
      } catch {
        // esperar a que el creador inicie
      }
    } catch (e) {
      setErrorSala(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(false)
    }
  }, [codigoInput, deck])

  const volverMenu = () => {
    olvidarPartida()
    setSala(null)
    setEnPartida(false)
    setAmbosListos(false)
    setCodigoInput('')
    setErrorSala(null)
    setVista('menu')
  }

  // Cancelar la sala de espera: se cierra en el servidor (si no, seguiría abierta para que otro se una con el código).
  // Best-effort: si falla, igual se sale; el servidor la limpia al consultarla.
  const cancelarSala = async () => {
    const gameId = sala?.gameId
    volverMenu()
    if (!gameId) return
    try {
      await rendirse(gameId)
    } catch {
      // sin red o sala ya cerrada: nada más que hacer
    }
  }

  if (!supabaseConfigurado()) {
    return (
      <Shell titulo="Jugar con amigos" sub="Falta un paso de configuración" ancho="md">
        <Panel>
          <p className="mb-3 text-sm text-gray-300">
            Falta configurar Supabase en el frontend. Crea un archivo <code className="text-ether-300">.env.local</code>:
          </p>
          <pre className="overflow-x-auto rounded-lg border border-white/10 bg-[#0a0a12] p-3 text-[11px] text-gray-400">
            {`VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...`}
          </pre>
          <p className="mt-3 text-xs text-gray-500">
            Proyecto actual: <span className="text-gray-400">{supabaseUrl()}</span>
          </p>
        </Panel>
      </Shell>
    )
  }

  // ── Auth gate ────────────────────────────────────────────────────────────
  if (vista === 'auth') {
    return (
      <Shell titulo="Jugar con amigos" sub="Conéctate para crear o unirte a una sala" ancho="md">
        <Panel className="text-center">
          <span
            aria-hidden="true"
            className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl border border-white/10 bg-black/30 font-display text-2xl text-ether-200"
          >
            ⚔
          </span>
          <p className="mb-5 text-sm leading-relaxed text-gray-400">
            Inicio de sesión anónimo (MVP). Tus amigos entran con el mismo código de sala.
          </p>
          {errorAuth && <Aviso>{errorAuth}</Aviso>}
          <Boton variante="primario" tam="lg" className="w-full" onClick={entrar} disabled={cargandoAuth}>
            {cargandoAuth ? 'Conectando…' : 'Entrar'}
          </Boton>
        </Panel>
      </Shell>
    )
  }

  // ── Partida online ───────────────────────────────────────────────────────
  if (enPartida && sala && userId) {
    return (
      <PartidaOnline
        gameId={sala.gameId}
        code={sala.code}
        player={sala.player}
        onSalir={volverMenu}
      />
    )
  }

  // ── Sala de espera ───────────────────────────────────────────────────────
  if (vista === 'espera' && sala) {
    const nombreMazo =
      MAZOS.find((m) => m.id === mazoId)?.nombre ?? mazosPersonalizados.find((m) => m.id === mazoId)?.nombre ?? mazoId
    return (
      <Shell titulo="Sala de espera" sub={`Código: ${sala.code}`} ancho="md">
        <Panel className="text-center">
          <Seccion>Código de la sala</Seccion>
          <p aria-label={sala.code} className="mb-3 flex justify-center gap-2">
            {sala.code.split('').map((c, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="grid h-14 w-11 place-items-center rounded-xl border border-ether-400/40 bg-ether-600/10 font-display text-3xl font-bold text-ether-200"
              >
                {c}
              </span>
            ))}
          </p>
          <p className="mb-3 text-sm text-gray-400">Comparte este código con tu amigo para que se una.</p>
          <Boton
            tam="sm"
            className="mb-6"
            onClick={() => {
              void navigator.clipboard?.writeText(sala.code)
              setCopiado(true)
              window.setTimeout(() => setCopiado(false), 1800)
            }}
          >
            {copiado ? '✓ Copiado' : 'Copiar código'}
          </Boton>

          <div className="border-t border-white/10 pt-5">
            <p className="flex items-center justify-center gap-2 text-sm text-gray-200">
              <span
                aria-hidden="true"
                className={`size-2 rounded-full ${ambosListos ? 'bg-emerald-400' : 'animate-pulse bg-amber-400'}`}
              />
              {ambosListos ? '¡Rival listo! Iniciando…' : 'Esperando al rival…'}
            </p>
            <p className="mt-1.5 text-[11px] text-gray-500">
              Mazo: {nombreMazo} · eres el jugador {sala.player}
            </p>
          </div>
          {errorSala && (
            <div className="mt-4">
              <Aviso>{errorSala}</Aviso>
            </div>
          )}
          <Boton variante="fantasma" tam="sm" className="mt-5" onClick={() => void cancelarSala()}>
            Cancelar sala
          </Boton>
        </Panel>
      </Shell>
    )
  }

  // ── Menú crear / unirse ──────────────────────────────────────────────────
  return (
    <Shell titulo="Jugar con amigos" sub="Crea una sala o únete con un código" ancho="xl">
      <div className="mb-7">
        <h2 className="font-display text-3xl font-bold tracking-wide text-gray-50">Partida con amigos</h2>
        <p className="mt-1 text-sm text-gray-400">Elige tu mazo y crea una sala, o entra a la de tu amigo con su código.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ── Mazos ─────────────────────────────────────────── */}
        <section aria-label="Tu mazo">
          <Seccion>Tu mazo</Seccion>
          <div className="grid gap-5 sm:grid-cols-2">
            {MAZOS.map((m) => (
              <TarjetaMazo
                key={m.id}
                nombre={m.nombre}
                color={m.color}
                etiqueta={`Set oficial · facción ${m.id === 'estasis' ? 'Orden' : 'Caos'}`}
                cardIds={m.cardIds}
                seleccionado={mazoId === m.id}
                onSeleccionar={() => setMazoId(m.id)}
              />
            ))}
            {mazosPersonalizados.map((m) => (
              <TarjetaMazo
                key={m.id}
                nombre={m.nombre}
                color="#a0a0ff"
                etiqueta="Personalizado"
                cardIds={m.cardIds}
                seleccionado={mazoId === m.id}
                onSeleccionar={() => setMazoId(m.id)}
              />
            ))}
          </div>
          {mazosPersonalizados.length === 0 && (
            <p className="mt-4 text-[11px] text-gray-600">
              No tienes mazos custom. Crea uno en Éter Forge para usarlo aquí.
            </p>
          )}
        </section>

        {/* ── Panel de sala ─────────────────────────────────── */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="relative rounded-2xl border border-ether-400/25 bg-gradient-to-b from-[#181829] to-[#0f0f1a] p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-8 top-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, #7070ff, transparent)' }}
            />

            <Seccion>Crear sala</Seccion>
            <p className="mb-3 text-xs text-gray-500">Generas un código de 6 caracteres y se lo pasas a tu amigo.</p>
            <Boton variante="primario" tam="lg" className="w-full" onClick={crear} disabled={ocupado}>
              {ocupado ? 'Creando…' : 'Crear sala'}
            </Boton>

            <div aria-hidden="true" className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-gray-600">
              <span className="h-px flex-1 bg-white/10" />o<span className="h-px flex-1 bg-white/10" />
            </div>

            <Seccion>Unirse con código</Seccion>
            <div className="flex gap-2">
              <input
                value={codigoInput}
                onChange={(e) => setCodigoInput(e.target.value.toUpperCase())}
                placeholder="Ej. K7X2MP"
                maxLength={6}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#0a0a12] px-3 py-2.5 font-mono text-sm tracking-[0.2em] text-gray-100 transition-colors focus:border-ether-400 focus:outline-none"
              />
              <Boton onClick={unirse} disabled={ocupado || codigoInput.trim().length < 6}>
                {ocupado ? '…' : 'Unirse'}
              </Boton>
            </div>
            {errorSala && (
              <div className="mt-3">
                <Aviso>{errorSala}</Aviso>
              </div>
            )}

            <p className="mt-5 text-center text-[11px] text-gray-600">
              Sesión: <span className="text-gray-500">{userId?.slice(0, 8)}…</span>
            </p>
          </div>
        </aside>
      </div>
    </Shell>
  )
}

/** Caja central de las pantallas simples (auth, espera, configuración). */
function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-ether-400/25 bg-gradient-to-b from-[#181829] to-[#0f0f1a] p-6 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] ${className}`}
    >
      {children}
    </div>
  )
}

/** Mensaje de error en línea. */
function Aviso({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-950/30 p-2.5 text-left text-xs text-rose-200">
      {children}
    </p>
  )
}

const ANCHOS = { md: 'max-w-md', xl: 'max-w-6xl' } as const

function Shell({
  titulo,
  sub,
  children,
  ancho = 'md',
}: {
  titulo: string
  sub: string
  children: ReactNode
  ancho?: keyof typeof ANCHOS
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a12] font-body text-gray-100">
      {/* Ambiente: mismo resplandor que el menú de partida */}
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
            <h1 className="font-display text-2xl font-bold tracking-wider">{titulo}</h1>
            <p className="mt-0.5 text-xs text-gray-500">{sub}</p>
          </div>
          <Link
            to="/epiconline"
            className="rounded bg-ether-600/20 px-3 py-1.5 text-xs text-ether-200 transition-colors hover:bg-ether-600/40"
          >
            ← Éter Online
          </Link>
        </div>
      </header>
      <main className={`relative mx-auto px-6 py-10 ${ANCHOS[ancho]}${ancho === 'xl' ? ' py-8' : ''}`}>{children}</main>
    </div>
  )
}

function PartidaOnline({
  gameId,
  code,
  player,
  onSalir,
}: {
  gameId: string
  code: string
  player: 'A' | 'B'
  onSalir: () => void
}) {
  const partida = useOnlineMatch(gameId, player, code)
  const vista = useMemo(
    () => (partida.estado ? visibleState(partida.estado, player) : null),
    [partida.estado, player],
  )

  if (!partida.estado || !vista) {
    return (
      <Shell titulo="Partida" sub={`Sala ${code}`} ancho="md">
        <div className="text-center text-gray-400 py-20">
          {partida.error ? (
            <p className="text-red-400 text-sm">{partida.error}</p>
          ) : (
            <p className="text-sm">Cargando partida…</p>
          )}
          <button onClick={onSalir} className="mt-4 text-xs text-gray-500 hover:text-gray-300 cursor-pointer">
            ← Volver
          </button>
        </div>
      </Shell>
    )
  }

  return (
    <>
      <Tablero
        vista={vista}
        yoId={player}
        acciones={partida.acciones}
        leTocaA={partida.leToca}
        log={[]}
        logDetallado={partida.logDetallado}
        onAccion={(a) => {
          void partida.ejecutar(a)
        }}
        onAbandonar={() => {
          void partida.abandonar().then(onSalir)
        }}
        animaciones={[]}
      />
      {partida.error && (
        <div
          role="alert"
          className="anim-dock fixed bottom-4 left-1/2 z-[80] -translate-x-1/2 rounded-xl border border-rose-400/40 bg-gradient-to-b from-[#2a1018]/95 to-[#1a0a10]/95 px-4 py-2.5 text-xs text-rose-100 shadow-[0_10px_40px_-8px_rgba(0,0,0,0.7)] backdrop-blur"
        >
          {partida.error}
        </div>
      )}
      {partida.status === 'finished' && (
        <Modal
          titulo="Partida terminada"
          subtitulo={partida.winner === player ? '¡Ganaste!' : partida.winner ? 'Perdiste' : 'Empate'}
          icono={partida.winner === player ? '🏆' : partida.winner ? '☠' : '⚖'}
          tono={partida.winner === player ? 'exito' : partida.winner ? 'peligro' : 'ether'}
          ancho="sm"
          pie={
            <Boton variante="primario" onClick={onSalir}>
              Volver al lobby
            </Boton>
          }
        >
          {partida.finishReason ? (
            <p className="text-center text-xs text-gray-400">({partida.finishReason})</p>
          ) : (
            <p className="text-center text-xs text-gray-500">Gracias por jugar.</p>
          )}
        </Modal>
      )}
    </>
  )
}
