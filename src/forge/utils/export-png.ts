import { toCanvas, toPng } from 'html-to-image'

/** WebP: calidad alta (0.9) para que el arte conserve el detalle; pesa una fracción del PNG. */
export const CALIDAD_WEBP = 0.9

const OPCIONES = {
  width: 744,
  height: 1038,
  pixelRatio: 1,
  style: {
    width: '744px',
    height: '1038px',
  },
}

function descargar(href: string, nombreArchivo: string): void {
  const link = document.createElement('a')
  link.download = nombreArchivo
  link.href = href
  link.click()
}

/** PNG sin pérdida: el formato para imprimir la carta en físico. */
export async function exportCardToPng(element: HTMLElement, filename: string): Promise<void> {
  descargar(await toPng(element, OPCIONES), `${filename}.png`)
}

/** WebP: el formato del arte versionado en public/cartas (se nombra con el id de la carta). */
export async function exportCardToWebp(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await toCanvas(element, OPCIONES)
  const dataUrl = canvas.toDataURL('image/webp', CALIDAD_WEBP)
  // Un navegador sin codificador WebP devuelve PNG en silencio: mejor avisar que guardar un .webp que no lo es
  if (!dataUrl.startsWith('data:image/webp')) throw new Error('Este navegador no puede exportar WebP')
  descargar(dataUrl, `${filename}.webp`)
}
