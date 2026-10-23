import { useEffect, useRef, useState } from 'react'
import { FACCIONES, PAQUETE_TIPOS } from '../../../shared/types'
import type { Faccion, PaqueteTipo } from '../../../shared/types'
import { Boton } from '../../../shared/ui/Boton'
import { Campo, CLASE_CAMPO } from '../../../shared/ui/Campo'
import { Modal } from '../../../shared/ui/Modal'

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
    <Modal
      titulo="Nuevo paquete"
      subtitulo="Un set de cartas con identidad propia (tipo Estásis o Disonancia). Lo creás sin escribir código: las cartas que le asignes en el formulario forman parte de él."
      icono="📦"
      ancho="md"
      pie={
        <>
          <Boton onClick={onCancel}>Cancelar</Boton>
          <Boton variante="primario" onClick={confirmar} disabled={!nombre.trim()}>
            Crear paquete
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4 pt-2">
        <Campo etiqueta="Nombre">
          <input
            ref={inputRef}
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmar()
            }}
            placeholder="Ej: Mutantes"
            className={CLASE_CAMPO}
          />
        </Campo>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Tipo">
            <select value={tipo} onChange={(e) => setTipo(e.target.value as PaqueteTipo)} className={`${CLASE_CAMPO} cursor-pointer`}>
              {PAQUETE_TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Campo>

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
        </div>
        <p className="-mt-2 text-[11px] text-gray-600">La facción define el color y la runa del paquete.</p>

        <Campo etiqueta="Entrega (opcional)">
          <input
            type="text"
            value={entrega}
            onChange={(e) => setEntrega(e.target.value)}
            placeholder="Ej: Primogénitos, Mutaciones..."
            className={CLASE_CAMPO}
          />
        </Campo>

        <Campo etiqueta="Lore (opcional)">
          <textarea
            value={lore}
            onChange={(e) => setLore(e.target.value)}
            placeholder="La historia del paquete..."
            rows={3}
            className={`${CLASE_CAMPO} resize-none`}
          />
        </Campo>
      </div>
    </Modal>
  )
}
