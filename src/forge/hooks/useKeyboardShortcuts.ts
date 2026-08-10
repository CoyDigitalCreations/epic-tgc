import { useEffect } from 'react'
import { useCardStore } from '../store/useCardStore'

/**
 * Global keyboard shortcuts:
 * - Ctrl+S: Guardar carta actual
 * - Ctrl+N: Nueva carta
 */
export function useKeyboardShortcuts() {
  const draft = useCardStore((s) => s.draft)
  const addCard = useCardStore((s) => s.addCard)
  const updateCard = useCardStore((s) => s.updateCard)
  const resetDraft = useCardStore((s) => s.resetDraft)
  const initDraft = useCardStore((s) => s.initDraft)
  const cards = useCardStore((s) => s.cards)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isCtrlS = (e.ctrlKey || e.metaKey) && e.key === 's'
      const isCtrlN = (e.ctrlKey || e.metaKey) && e.key === 'n'

      if (isCtrlS) {
        e.preventDefault()
        if (!draft.name) return

        const isEditing = draft.id && cards.some((c) => c.id === draft.id)
        const card = {
          ...draft,
          id: (draft.id as string) || crypto.randomUUID(),
          updatedAt: new Date().toISOString(),
        }

        if (isEditing) {
          updateCard(card.id as string, card as Parameters<typeof updateCard>[1])
        } else {
          addCard(card as Parameters<typeof addCard>[0])
        }
        resetDraft()
      }

      if (isCtrlN) {
        e.preventDefault()
        initDraft('Campeón')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [draft, addCard, updateCard, resetDraft, initDraft, cards])
}
