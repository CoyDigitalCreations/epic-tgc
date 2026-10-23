import { useEffect, useRef, useState } from 'react'
import { FACCIONES } from '../../../shared/types'
import { Boton } from '../../../shared/ui/Boton'
import { Campo, CLASE_CAMPO } from '../../../shared/ui/Campo'
import { Modal } from '../../../shared/ui/Modal'

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
    <Modal
      titulo={esCrear ? 'Nueva colección' : 'Renombrar colección'}
      icono={esCrear ? '🗂' : '✎'}
      ancho="sm"
      pie={
        <>
          <Boton onClick={onCancel}>Cancelar</Boton>
          <Boton variante="primario" onClick={confirmar} disabled={!nombre.trim()}>
            {esCrear ? 'Crear' : 'Renombrar'}
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4 pt-1">
        <Campo etiqueta="Nombre">
          <input
            ref={inputRef}
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmar()
            }}
            placeholder="Ej: Estásis, Disonancia, Mi set..."
            className={CLASE_CAMPO}
          />
        </Campo>

        {esCrear && (
          <Campo etiqueta="Facción (opcional)">
            <select value={faccion} onChange={(e) => setFaccion(e.target.value)} className={`${CLASE_CAMPO} cursor-pointer`}>
              <option value="">Sin facción</option>
              {FACCIONES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Campo>
        )}
      </div>
    </Modal>
  )
}
