import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Boton } from '../../shared/ui/Boton'
import { entrarAdminConGoogle, estadoAdmin, salirDeAdmin } from './adminApi'
import type { EstadoAdmin } from './adminApi'

/**
 * Puerta de administración (Card-Maker y Tablero de balance): entra con Google (Supabase Auth) y solo deja
 * pasar a quien esté en `eter.admins`. El resto de la app sigue siendo pública.
 * Sin Supabase configurado (desarrollo local) no bloquea: no hay nada que proteger porque tampoco hay a dónde subir.
 */
export default function AdminGate({ children, titulo = 'Card-Maker' }: { children: ReactNode; titulo?: string }) {
  const [estado, setEstado] = useState<EstadoAdmin | 'cargando'>('cargando')
  const [error, setError] = useState<string | null>(null)

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

  async function conGoogle() {
    setError(null)
    try {
      await entrarAdminConGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión con Google.')
    }
  }

  async function salir() {
    await salirDeAdmin()
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
      <section
        aria-label="Acceso de administración"
        className="w-full max-w-sm space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-[0_0_40px_-12px_rgba(32,32,255,0.4)]"
      >
        <div className="space-y-1 text-center">
          <p className="font-display text-3xl text-ether-300" aria-hidden="true">✦</p>
          <h1 className="font-display text-xl font-bold tracking-wider">{titulo}</h1>
          <p className="text-xs text-gray-500">Acceso solo para administración.</p>
        </div>

        {estado === 'no-admin' && (
          <p role="alert" className="rounded-lg border border-amber-400/30 bg-amber-950/30 px-3 py-2 text-xs text-amber-100">
            La cuenta con la que estás conectado no es de administración. Entra con la cuenta correcta.
          </p>
        )}

        <Boton type="button" variante="primario" tam="md" className="w-full" onClick={() => void conGoogle()}>
          Entrar con Google
        </Boton>
        {error && (
          <p role="alert" className="text-xs text-rose-300">
            {error}
          </p>
        )}

        <Link to="/" className="block text-center text-xs text-gray-500 hover:text-gray-300">
          ← Volver al inicio
        </Link>
      </section>
    </div>
  )
}
