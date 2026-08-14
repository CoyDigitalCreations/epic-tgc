import { useEffect, useRef, useState } from 'react'
import { FACCIONES, PAQUETE_TIPOS } from '../../../shared/types'
import type { Faccion, PaqueteTipo } from '../../../shared/types'

export interface PaqueteDatos {
  nombre: string
  tipo: PaqueteTipo
  facciones: Faccion[]
  lore?: string
  entrega?: string
}

interface PaqueteModalProps {
  isOpen: boolean
  onConfirm: (datos: PaqueteDatos) => void
  onCancel: () => void
}

/** Modal de crear paquete personalizado: nombre, tipo, facción, lore, entrega. */
export function PaqueteModal({ isOpen, onConfirm, onCancel }: PaqueteModalProps) {
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState<PaqueteTipo>('Mazo Temático')
  const [faccion, setFaccion] = useState('')
  const [lore, setLore] = useState('')
  const [entrega, setEntrega] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    setNombre('')
    setTipo('Mazo Temático')
    setFaccion('')
    setLore('')
    setEntrega('')
    inputRef.current?.focus()

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const confirmar = () => {
    if (!nombre.trim()) return
    onConfirm({
      nombre: nombre.trim(),
      tipo,
      facciones: faccion ? [faccion as Faccion] : [],
      lore: lore.trim() || undefined,
      entrega: entrega.trim() || undefined,
    })
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
              📦
            </div>
          </div>

          <h3 className="text-lg font-display font-bold text-center text-gray-100 mb-4">
            Nuevo paquete
          </h3>
          <p className="text-xs text-gray-400 text-center -mt-2 mb-4">
            Un set de cartas con identidad propia (tipo Estásis o Disonancia).
            Lo creás sin escribir código: las cartas que le asignes en el
            formulario forman parte de él.
          </p>

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
                placeholder="Ej: Mutantes"
                className="w-full bg-surface-2 border border-card-border rounded-lg px-3 py-2
                           text-sm text-gray-100 placeholder-gray-500
                           focus:outline-none focus:border-ether-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Tipo</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as PaqueteTipo)}
                className="w-full bg-surface-2 border border-card-border rounded-lg px-3 py-2
                           text-sm text-gray-100 focus:outline-none focus:border-ether-400
                           transition-colors cursor-pointer"
              >
                {PAQUETE_TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Facción (opcional — define el color y la runa)
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

            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Entrega (opcional)
              </label>
              <input
                type="text"
                value={entrega}
                onChange={(e) => setEntrega(e.target.value)}
                placeholder="Ej: Primogénitos, Mutaciones..."
                className="w-full bg-surface-2 border border-card-border rounded-lg px-3 py-2
                           text-sm text-gray-100 placeholder-gray-500
                           focus:outline-none focus:border-ether-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Lore (opcional)
              </label>
              <textarea
                value={lore}
                onChange={(e) => setLore(e.target.value)}
                placeholder="La historia del paquete..."
                rows={3}
                className="w-full bg-surface-2 border border-card-border rounded-lg px-3 py-2
                           text-sm text-gray-100 placeholder-gray-500
                           focus:outline-none focus:border-ether-400 transition-colors resize-none"
              />
            </div>
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
              Crear paquete
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
