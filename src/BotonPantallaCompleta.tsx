import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'

/** Rutas donde se ofrece: el Card-Maker y todo lo de /epiconline (la portada no lo necesita). */
const RUTAS = ['/card-maker', '/epiconline']

/**
 * Botón flotante para entrar y salir de pantalla completa. Vive fuera de las pantallas, así que sirve igual en el
 * Card-Maker y en el juego online, y la pantalla completa sobrevive al navegar entre ellas (es del documento, no de la ruta).
 * Se oculta donde el navegador no lo soporta (p. ej. iPhone).
 */
export function BotonPantallaCompleta() {
  const { pathname } = useLocation()
  const [activa, setActiva] = useState(() => !!document.fullscreenElement)

  useEffect(() => {
    const alCambiar = () => setActiva(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', alCambiar)
    return () => document.removeEventListener('fullscreenchange', alCambiar)
  }, [])

  if (!document.fullscreenEnabled || !RUTAS.some((r) => pathname.startsWith(r))) return null

  const alternar = () => {
    // Puede rechazarse (el navegador exige un gesto del usuario): no hay nada que hacer salvo no romper
    const promesa = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()
    promesa.catch(() => {})
  }

  const etiqueta = activa ? 'Salir de pantalla completa' : 'Pantalla completa'
  return (
    <button
      type="button"
      onClick={alternar}
      title={etiqueta}
      aria-label={etiqueta}
      className="fixed bottom-3 left-3 z-[1000] flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-[#0d0d14]/80 text-ether-200 opacity-60 backdrop-blur transition hover:opacity-100 focus-visible:opacity-100"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {activa ? (
          <path d="M9 3v4a2 2 0 0 1-2 2H3M15 3v4a2 2 0 0 0 2 2h4M9 21v-4a2 2 0 0 0-2-2H3M15 21v-4a2 2 0 0 1 2-2h4" />
        ) : (
          <path d="M3 9V5a2 2 0 0 1 2-2h4M15 3h4a2 2 0 0 1 2 2v4M21 15v4a2 2 0 0 1-2 2h-4M9 21H5a2 2 0 0 1-2-2v-4" />
        )}
      </svg>
    </button>
  )
}
