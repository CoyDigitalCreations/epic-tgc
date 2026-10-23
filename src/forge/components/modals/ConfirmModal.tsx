import { useEffect, useRef } from 'react'
import { Boton } from '../../../shared/ui/Boton'
import { Modal } from '../../../shared/ui/Modal'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return
    // El foco va al botón de confirmar al abrir
    confirmRef.current?.focus()

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const isDanger = variant === 'danger'

  return (
    <Modal
      titulo={title}
      icono={isDanger ? '⚠' : 'ℹ'}
      tono={isDanger ? 'peligro' : 'ether'}
      ancho="sm"
      pie={
        <>
          <Boton onClick={onCancel}>{cancelLabel}</Boton>
          <Boton ref={confirmRef} variante={isDanger ? 'peligro' : 'primario'} onClick={onConfirm}>
            {confirmLabel}
          </Boton>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-gray-400">{message}</p>
    </Modal>
  )
}
