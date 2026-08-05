import { useEffect, useState } from 'react'
import { getCardImage } from '../utils/image-store'

/**
 * Resolves the dataUrl of a card's art.
 *
 * Priority:
 * 1. `inlineUrl` — image already in memory (draft being edited, or a card
 *    freshly loaded from an import before it was moved to IndexedDB).
 * 2. IndexedDB — card flagged `hasImage` but art not in memory (after a
 *    page reload, since images are never persisted in localStorage).
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
    if (!cardId || !hasImage) {
      setUrl(undefined)
      return
    }
    let cancelled = false
    getCardImage(cardId).then((dataUrl) => {
      if (!cancelled) setUrl(dataUrl)
    })
    return () => {
      cancelled = true
    }
  }, [cardId, hasImage, inlineUrl])

  return url
}
