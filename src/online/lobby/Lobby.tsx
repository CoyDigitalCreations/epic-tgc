import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { MAZOS } from '../mazos'
import { visibleState } from '../game'
import { Tablero } from '../components/Tablero'
import { supabaseConfigurado, supabaseUrl } from '../backend/supabase'
import {
  asegurarSesion,
  crearSala,
  iniciarPartida,
  obtenerEstado,
  unirseASala,
  type RoomInfo,
} from '../backend/matchApi'
import { useOnlineMatch } from './useOnlineMatch'

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

  const [mazoId, setMazoId] = useState<'estasis' | 'disonancia'>('estasis')
  const [codigoInput, setCodigoInput] = useState('')
  const [sala, setSala] = useState<RoomInfo | null>(null)
  const [errorSala, setErrorSala] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [enPartida, setEnPartida] = useState(false)
  const [ ambosListos, setAmbosListos ] = useState(false)

  const deck = useMemo(
    () => MAZOS.find((m) => m.id === mazoId)?.cardIds ?? MAZOS[0].cardIds,
    [mazoId],
  )

  const entrar = useCallback(async () => {
    setCargandoAuth(true)
    setErrorAuth(null)
    try {
      const id = await asegurarSesion()
      setUserId(id)
      setVista('menu')
    } catch (e) {
      setErrorAuth(e instanceof Error ? e.message : String(e))
    } finally {
      setCargandoAuth(false)
    }
  }, [])

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
      setErrorSala('Ingresá el código de la sala')
      return
    }
    setOcupado(true)
    setErrorSala(null)
    try {
      const info = await unirseASala(codigoInput, deck)
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
    setSala(null)
    setEnPartida(false)
    setAmbosListos(false)
    setCodigoInput('')
    setErrorSala(null)
    setVista('menu')
  }

  if (!supabaseConfigurado()) {
    return (
      <div className="min-h-screen bg-[#0d0d14] text-gray-100 font-body p-8">
        <div className="max-w-xl mx-auto mt-16 border border-card-border bg-surface rounded-lg p-6">
          <h1 className="font-display text-xl text-ether-200 mb-3">Jugar con amigos</h1>
          <p className="text-sm text-gray-400 mb-4">
            Falta configurar Supabase en el frontend. Creá un archivo <code className="text-ether-300">.env.local</code>:
          </p>
          <pre className="bg-[#0a0a12] border border-card-border rounded p-3 text-[11px] text-gray-400 overflow-x-auto">
{`VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...`}
          </pre>
          <p className="text-xs text-gray-500 mt-3">
            Proyecto actual: <span className="text-gray-400">{supabaseUrl()}</span>
          </p>
          <Link to="/epiconline" className="inline-block mt-4 text-xs text-ether-300 hover:text-ether-200">
            ← Volver a Éter Online
          </Link>
        </div>
      </div>
    )
  }

  // ── Auth gate ────────────────────────────────────────────────────────────
  if (vista === 'auth') {
    return (
      <Shell titulo="Jugar con amigos" sub="Conectá para crear o unirte a una sala">
        <div className="max-w-md mx-auto border border-card-border bg-surface rounded-lg p-6">
          <p className="text-sm text-gray-400 mb-4">
            Inicio de sesión anónimo (MVP). Tus amigos entran con el mismo código de sala.
          </p>
          {errorAuth && (
            <p className="text-xs text-red-400 mb-3 border border-red-900/50 bg-red-950/30 rounded p-2">
              {errorAuth}
            </p>
          )}
          <button
            onClick={entrar}
            disabled={cargandoAuth}
            className="w-full bg-ether-600 hover:bg-ether-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg font-display tracking-wider transition-colors cursor-pointer"
          >
            {cargandoAuth ? 'Conectando…' : 'Entrar'}
          </button>
        </div>
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
    return (
      <Shell titulo="Sala de espera" sub={`Código: ${sala.code}`}>
        <div className="max-w-md mx-auto border border-card-border bg-surface rounded-lg p-6 text-center">
          <p className="text-4xl font-display font-bold text-ether-300 tracking-[0.3em] mb-4">
            {sala.code}
          </p>
          <p className="text-sm text-gray-400 mb-2">
            Compartí este código con tu amigo para que se una.
          </p>
          <button
            onClick={() => {
              void navigator.clipboard?.writeText(sala.code)
            }}
            className="text-xs bg-surface-2 hover:bg-card-border text-gray-300 px-3 py-1.5 rounded transition-colors cursor-pointer mb-6"
          >
            Copiar código
          </button>
          <div className="border-t border-card-border/50 pt-4">
            <p className="text-sm text-gray-300">
              {ambosListos ? '¡Rival listo! Iniciando…' : 'Esperando al rival…'}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              Mazo: {MAZOS.find((m) => m.id === mazoId)?.nombre ?? mazoId} · sos el jugador {sala.player}
            </p>
          </div>
          {errorSala && (
            <p className="text-xs text-red-400 mt-4 border border-red-900/50 bg-red-950/30 rounded p-2">
              {errorSala}
            </p>
          )}
          <button
            onClick={volverMenu}
            className="mt-6 text-xs text-gray-500 hover:text-gray-300 cursor-pointer"
          >
            Cancelar sala
          </button>
        </div>
      </Shell>
    )
  }

  // ── Menú crear / unirse ──────────────────────────────────────────────────
  return (
    <Shell titulo="Jugar con amigos" sub="Creá una sala o unite con un código">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="border border-card-border bg-surface rounded-lg p-5">
          <h2 className="font-display text-sm text-ether-200 mb-3">Tu mazo</h2>
          <div className="grid grid-cols-2 gap-3">
            {MAZOS.map((m) => (
              <button
                key={m.id}
                onClick={() => setMazoId(m.id)}
                className={`text-left border rounded-lg p-4 transition-all cursor-pointer
                  ${mazoId === m.id
                    ? 'border-ether-400 ring-1 ring-ether-400 bg-ether-600/10'
                    : 'border-card-border hover:border-gray-500 bg-surface-2'}`}
              >
                <p className="font-display font-bold" style={{ color: m.color }}>
                  {m.nombre}
                </p>
                <p className="text-[11px] text-gray-500 mt-1">{m.cardIds.length} cartas</p>
              </button>
            ))}
          </div>
        </div>

        <div className="border border-card-border bg-surface rounded-lg p-5">
          <h2 className="font-display text-sm text-ether-200 mb-3">Crear sala</h2>
          <p className="text-xs text-gray-500 mb-3">
            Generás un código de 6 caracteres y se lo pasás a tu amigo.
          </p>
          <button
            onClick={crear}
            disabled={ocupado}
            className="bg-ether-600 hover:bg-ether-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-display tracking-wider transition-colors cursor-pointer"
          >
            {ocupado ? 'Creando…' : 'Crear sala'}
          </button>
        </div>

        <div className="border border-card-border bg-surface rounded-lg p-5">
          <h2 className="font-display text-sm text-ether-200 mb-3">Unirse con código</h2>
          <div className="flex gap-2">
            <input
              value={codigoInput}
              onChange={(e) => setCodigoInput(e.target.value.toUpperCase())}
              placeholder="Ej. K7X2MP"
              maxLength={6}
              className="flex-1 bg-surface-2 border border-card-border rounded-lg px-3 py-2.5 text-sm tracking-[0.2em] text-gray-100
                         focus:outline-none focus:border-ether-400 transition-colors font-mono"
            />
            <button
              onClick={unirse}
              disabled={ocupado || codigoInput.trim().length < 6}
              className="bg-surface-2 hover:bg-card-border disabled:opacity-40 text-gray-200 px-4 py-2.5 rounded-lg text-sm transition-colors cursor-pointer"
            >
              {ocupado ? '…' : 'Unirse'}
            </button>
          </div>
          {errorSala && (
            <p className="text-xs text-red-400 mt-3 border border-red-900/50 bg-red-950/30 rounded p-2">
              {errorSala}
            </p>
          )}
        </div>

        <p className="text-[11px] text-gray-600 text-center">
          Sesión: <span className="text-gray-500">{userId?.slice(0, 8)}…</span>
        </p>
      </div>
    </Shell>
  )
}

function Shell({ titulo, sub, children }: { titulo: string; sub: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0d0d14] text-gray-100 font-body">
      <header className="border-b border-card-border bg-surface">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold tracking-wider">{titulo}</h1>
            <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
          </div>
          <Link
            to="/epiconline"
            className="bg-ether-600/20 hover:bg-ether-600/40 text-ether-200 px-3 py-1.5 rounded transition-colors text-xs"
          >
            ← Éter Online
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10">{children}</main>
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
      <Shell titulo="Partida" sub={`Sala ${code}`}>
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
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-red-950/90 border border-red-800 text-red-200 text-xs px-4 py-2 rounded-lg">
          {partida.error}
        </div>
      )}
      {partida.status === 'finished' && (
        <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center">
          <div className="bg-surface border border-card-border rounded-lg p-8 text-center max-w-sm">
            <h2 className="font-display text-2xl text-ether-200 mb-2">Partida terminada</h2>
            <p className="text-sm text-gray-400 mb-1">
              {partida.winner === player ? '¡Ganaste!' : partida.winner ? 'Perdiste' : 'Empate'}
            </p>
            {partida.finishReason && (
              <p className="text-xs text-gray-500 mb-4">({partida.finishReason})</p>
            )}
            <button
              onClick={onSalir}
              className="bg-ether-600 hover:bg-ether-500 text-white px-5 py-2 rounded-lg text-sm cursor-pointer"
            >
              Volver al lobby
            </button>
          </div>
        </div>
      )}
    </>
  )
}
