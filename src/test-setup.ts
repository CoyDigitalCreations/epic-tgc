import '@testing-library/jest-dom/vitest'

// jsdom mide 1024×768 por defecto, que caería en el modo compacto (celular/tablet) del Tablero por accidente.
// Los tests parten de un viewport de escritorio; los del modo compacto lo cambian a mano.
if (typeof window !== 'undefined') {
  window.innerWidth = 1440
  window.innerHeight = 900
}
