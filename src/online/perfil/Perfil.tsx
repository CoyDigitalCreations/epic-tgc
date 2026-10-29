import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Boton } from '../../shared/ui/Boton'
import { Campo, CLASE_CAMPO } from '../../shared/ui/Campo'
import { Seccion } from '../../shared/ui/Seccion'
import { supabaseConfigurado } from '../backend/supabase'
import { guardarNombre, leerPerfil, NOMBRE_MAX, validarNombre, type Perfil as PerfilJugador } from '../backend/perfilApi'
import { useMazosStore } from '../useMazosStore'

/** Perfil del jugador: nombre visible, estado de la cuenta y sus mazos personalizados. */
export default function Perfil() {
  const mazos = useMazosStore((s) => s.mazosPersonalizados)
  const [perfil, setPerfil] = useState<PerfilJugador | null>(null)
  const [nombre, setNombre] = useState('')
  const [cargando, setCargando] = useState(supabaseConfigurado())
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  useEffect(() => {
    void useMazosStore.getState().sincronizarConNube()
    if (!supabaseConfigurado()) return
    let vivo = true
    leerPerfil()
      .then((p) => {
        if (!vivo || !p) return
        setPerfil(p)
        setNombre(p.nombre)
      })
      .catch((e) => vivo && setMensaje({ tipo: 'error', texto: e instanceof Error ? e.message : String(e) }))
      .finally(() => vivo && setCargando(false))
    return () => {
      vivo = false
    }
  }, [])

  const validacion = validarNombre(nombre)
  const cambiado = perfil !== null && validacion.ok && validacion.nombre !== perfil.nombre

  const guardar = async () => {
    if (!perfil || !validacion.ok) return
    setGuardando(true)
    setMensaje(null)
    try {
      await guardarNombre(perfil.id, validacion.nombre)
      setPerfil({ ...perfil, nombre: validacion.nombre })
      setNombre(validacion.nombre)
      setMensaje({ tipo: 'ok', texto: 'Nombre guardado.' })
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e instanceof Error ? e.message : String(e) })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a12] font-body text-gray-100">
      <header className="border-b border-card-border/70 bg-surface/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <h1 className="font-display text-2xl font-bold tracking-wider">Perfil de jugador</h1>
          <Link to="/epiconline/amigos" className="rounded bg-ether-600/20 px-3 py-1.5 text-xs text-ether-200 hover:bg-ether-600/40">
            ← Jugar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-6 py-8">
        {!supabaseConfigurado() && (
          <p className="rounded-lg border border-amber-400/30 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
            El perfil necesita la conexión con Supabase. Mientras tanto tus mazos se guardan solo en este navegador.
          </p>
        )}

        {supabaseConfigurado() && (
          <section aria-label="Cuenta" className="space-y-4">
            <Seccion>Cuenta</Seccion>
            {cargando ? (
              <p className="text-sm text-gray-500">Cargando perfil…</p>
            ) : perfil ? (
              <>
                <Campo etiqueta="Nombre visible" pista={`Hasta ${NOMBRE_MAX} caracteres. Es el que verá tu rival.`}>
                  <input className={CLASE_CAMPO} value={nombre} maxLength={NOMBRE_MAX + 8} onChange={(e) => setNombre(e.target.value)} />
                </Campo>
                {!validacion.ok && <p className="text-xs text-rose-300">{validacion.error}</p>}
                <div className="flex items-center gap-3">
                  <Boton variante="primario" tam="md" disabled={!cambiado || guardando} onClick={() => void guardar()}>
                    {guardando ? 'Guardando…' : 'Guardar nombre'}
                  </Boton>
                  {mensaje && (
                    <p role="status" className={`text-xs ${mensaje.tipo === 'ok' ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {mensaje.texto}
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {perfil.email
                    ? `Cuenta enlazada a ${perfil.email}.`
                    : 'Sesión anónima: tu perfil y tus mazos viven en este navegador. Enlazar un email para conservarlos en otros dispositivos llegará pronto.'}
                </p>
              </>
            ) : (
              mensaje && <p className="text-sm text-rose-300">{mensaje.texto}</p>
            )}
          </section>
        )}

        <section aria-label="Mis mazos">
          <Seccion cantidad={mazos.length}>Mis mazos</Seccion>
          {mazos.length === 0 ? (
            <p className="text-sm text-gray-500">Aún no tienes mazos personalizados. Créalos desde el menú de partida.</p>
          ) : (
            <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
              {mazos.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-100">{m.nombre}</p>
                    <p className="text-[11px] text-gray-500">{m.cardIds.length} cartas</p>
                  </div>
                  <Boton
                    variante="fantasma"
                    tam="sm"
                    onClick={() => {
                      if (window.confirm(`¿Borrar el mazo «${m.nombre}»?`)) useMazosStore.getState().eliminarMazo(m.id)
                    }}
                  >
                    Borrar
                  </Boton>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
