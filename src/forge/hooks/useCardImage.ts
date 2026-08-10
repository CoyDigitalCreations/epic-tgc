import { useEffect, useState } from 'react'
import { getCardImage } from '../utils/image-store'
import { cardArtPath } from '../../shared/data/paquetes'

/**
 * Resolves the dataUrl of a card's art.
 *
 * Priority:
 * 1. `inlineUrl` — image already in memory (draft being edited, a card
 *    freshly loaded from an import, or a static path /cartas/*.png
 *    already stored on the card).
 * 2. IndexedDB — card flagged `hasImage` but art not in memory (after a
 *    page reload, since images are never persisted in localStorage).
 * 3. Static art — card belongs to a set with versioned PNGs in
 *    public/cartas/{cardId}.png (see cardArtPath).
 */
export function useCardImage(
  cardId: string | undefined,
  hasImage: boolean | undefined,
  inlineUrl: string | undefined,
): string | undefined {
  const [url, setUrl] = useState<string | undefined>(inlineUrl)

  useEffect(() => {
    // Inline wins — no need to hit IndexedDB (and it's already in sync).
    if (inlineUrl) {
      setUrl(inlineUrl)
      return
    }
    if (!cardId) {
      setUrl(undefined)
      return
    }
    // Static art: versioned PNGs win over nothing, but IndexedDB art
    // (user uploads) takes precedence — check that before falling back.
    let cancelled = false
    if (hasImage) {
      getCardImage(cardId).then((dataUrl) => {
        if (cancelled) return
        setUrl(dataUrl ?? cardArtPath(cardId))
      })
    } else {
      setUrl(cardArtPath(cardId))
    }
    return () => {
      cancelled = true
    }
  }, [cardId, hasImage, inlineUrl])

  return url
}
