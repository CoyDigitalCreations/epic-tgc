import '@testing-library/jest-dom/vitest'

// jsdom mide 1024×768 por defecto, que caería en el modo compacto (celular/tablet) del Tablero por accidente.
// Los tests parten de un viewport de escritorio; los del modo compacto lo cambian a mano.
if (typeof window !== 'undefined') {
  window.innerWidth = 1440
  window.innerHeight = 900
}

// Los tests NUNCA hablan con el Supabase real: Vite carga el .env.local del desarrollador en los tests, y sin esto cualquier test que toque
// la sesión (p. ej. mazosNube, que abre una sesión anónima) crearía usuarios en el proyecto de verdad. Los tests que necesitan un cliente
// lo mockean de forma explícita.
const entorno = import.meta.env as Record<string, string | undefined>
entorno.VITE_SUPABASE_URL = ''
entorno.VITE_SUPABASE_ANON_KEY = ''
