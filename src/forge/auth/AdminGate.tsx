import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Boton } from '../../shared/ui/Boton'
import { Campo, CLASE_CAMPO } from '../../shared/ui/Campo'
import { entrarComoAdmin, estadoAdmin, salirDeAdmin } from './adminApi'
import type { EstadoAdmin } from './adminApi'

/**
 * Puerta del Card-Maker: pide usuario y contraseña de administración (Supabase Auth). El resto de la app sigue siendo pública.
 * Sin Supabase configurado (desarrollo local) no bloquea: no hay nada que proteger porque tampoco hay a dónde subir.
 */
export default function AdminGate({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoAdmin | 'cargando'>('cargando')
  const [usuario, setUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [entrando, setEntrando] = useState(false)

  const revisar = useCallback(async () => {
    try {
      setEstado(await estadoAdmin())
    } catch {
      setEstado('no-sesion')
    }
  }, [])

  useEffect(() => {
    void revisar()
  }, [revisar])

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setEntrando(true)
    try {
      await entrarComoAdmin(usuario, contrasena)
      setContrasena('')
      await revisar()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.')
    } finally {
      setEntrando(false)
    }
  }

  async function salir() {
    await salirDeAdmin()
    setUsuario('')
    await revisar()
  }

  if (estado === 'cargando') {
    return (
      <div className="min-h-screen bg-[#0d0d14] flex items-center justify-center">
        <p className="font-display text-lg text-ether-200">Cargando…</p>
      </div>
    )
  }

  if (estado === 'sin-supabase') return <>{children}</>

  if (estado === 'admin') {
    return (
      <>
        {children}
        <div className="fixed bottom-3 left-3 z-50">
          <Boton variante="fantasma" tam="sm" onClick={() => void salir()}>
            Cerrar sesión de administración
          </Boton>
        </div>
      </>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a12] px-6 font-body text-gray-100">
      <form
        onSubmit={(e) => void enviar(e)}
        aria-label="Acceso de administración"
        className="w-full max-w-sm space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-[0_0_40px_-12px_rgba(32,32,255,0.4)]"
      >
        <div className="space-y-1 text-center">
          <p className="font-display text-3xl text-ether-300" aria-hidden="true">✦</p>
          <h1 className="font-display text-xl font-bold tracking-wider">Card-Maker</h1>
          <p className="text-xs text-gray-500">Acceso solo para administración.</p>
        </div>

        {estado === 'no-admin' && (
          <p role="alert" className="rounded-lg border border-amber-400/30 bg-amber-950/30 px-3 py-2 text-xs text-amber-100">
            La cuenta con la que estás conectado no es de administración. Entra con la cuenta correcta.
          </p>
        )}

        <Campo etiqueta="Usuario">
          <input
            className={CLASE_CAMPO}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Contraseña">
          <input
            className={CLASE_CAMPO}
            type="password"
            autoComplete="current-password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
          />
        </Campo>

        {error && (
          <p role="alert" className="text-xs text-rose-300">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <Link to="/" className="text-xs text-gray-500 hover:text-gray-300">
            ← Volver al inicio
          </Link>
          <Boton type="submit" variante="primario" tam="md" disabled={entrando}>
            {entrando ? 'Entrando…' : 'Entrar'}
          </Boton>
        </div>
      </form>
    </div>
  )
}
