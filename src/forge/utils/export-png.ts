import { toPng } from 'html-to-image'

export async function exportCardToPng(element: HTMLElement, filename: string): Promise<void> {
  const dataUrl = await toPng(element, {
    width: 744,
    height: 1038,
    pixelRatio: 1,
    style: {
      width: '744px',
      height: '1038px',
    },
  })

  const link = document.createElement('a')
  link.download = `${filename}.png`
  link.href = dataUrl
  link.click()
}
