import { useEffect, useRef, useState } from 'react'
import { FACCIONES } from '../../../shared/types'

interface ColeccionModalProps {
  isOpen: boolean
  /** Si es undefined → crear; si no → renombrar con ese nombre inicial */
  nombreInicial?: string
  faccionInicial?: string
  onConfirm: (nombre: string, faccion?: string) => void
  onCancel: () => void
}

/** Modal de crear/renombrar colección: nombre + facción cosmética (opcional). */
export function ColeccionModal({
  isOpen,
  nombreInicial,
  faccionInicial,
  onConfirm,
  onCancel,
}: ColeccionModalProps) {
  const [nombre, setNombre] = useState(nombreInicial ?? '')
  const [faccion, setFaccion] = useState(faccionInicial ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  const esCrear = nombreInicial === undefined

  useEffect(() => {
    if (!isOpen) return
    setNombre(nombreInicial ?? '')
    setFaccion(faccionInicial ?? '')
    inputRef.current?.focus()

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, nombreInicial, faccionInicial, onCancel])

  if (!isOpen) return null

  const confirmar = () => {
    if (!nombre.trim()) return
    onConfirm(nombre.trim(), faccion || undefined)
  }

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
          className="bg-surface border border-card-border rounded-xl p-6 max-w-sm w-full shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl bg-ether-600/20 text-ether-400">
              {esCrear ? '🗂️' : '✏️'}
            </div>
          </div>

          <h3 className="text-lg font-display font-bold text-center text-gray-100 mb-4">
            {esCrear ? 'Nueva colección' : 'Renombrar colección'}
          </h3>

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Nombre</label>
              <input
                ref={inputRef}
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmar()
                }}
                placeholder="Ej: Estásis, Disonancia, Mi set..."
                className="w-full bg-surface-2 border border-card-border rounded-lg px-3 py-2
                           text-sm text-gray-100 placeholder-gray-500
                           focus:outline-none focus:border-ether-400 transition-colors"
              />
            </div>

            {esCrear && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Facción (opcional)
                </label>
                <select
                  value={faccion}
                  onChange={(e) => setFaccion(e.target.value)}
                  className="w-full bg-surface-2 border border-card-border rounded-lg px-3 py-2
                             text-sm text-gray-100 focus:outline-none focus:border-ether-400
                             transition-colors cursor-pointer"
                >
                  <option value="">Sin facción</option>
                  {FACCIONES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-300
                         bg-surface-2 hover:bg-card-border rounded-lg
                         transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={confirmar}
              disabled={!nombre.trim()}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg
                         transition-colors cursor-pointer bg-ether-600 hover:bg-ether-500
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {esCrear ? 'Crear' : 'Renombrar'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
