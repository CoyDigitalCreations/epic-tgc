import { useEffect, useRef } from 'react'

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
    // Focus the confirm button when modal opens
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
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-surface border border-card-border rounded-xl p-6 max-w-sm w-full 
                      shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-xl
                ${isDanger ? 'bg-red-600/20 text-red-400' : 'bg-ether-600/20 text-ether-400'}`}
            >
              {isDanger ? '⚠️' : 'ℹ️'}
            </div>
          </div>

          {/* Title */}
          <h3 className="text-lg font-display font-bold text-center text-gray-100 mb-2">
            {title}
          </h3>

          {/* Message */}
          <p className="text-sm text-gray-400 text-center mb-6 leading-relaxed">
            {message}
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-300 
                         bg-surface-2 hover:bg-card-border rounded-lg 
                         transition-colors cursor-pointer"
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmRef}
              onClick={onConfirm}
              className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg 
                         transition-colors cursor-pointer
                ${isDanger
                  ? 'bg-red-600 hover:bg-red-500'
                  : 'bg-ether-600 hover:bg-ether-500'
                }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
