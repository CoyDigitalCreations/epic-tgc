import { useEffect, useMemo, useRef } from 'react'
import { analizarCartaPropia } from '../../../balance/cartaPropia'
import { CONFIG_V1 } from '../../../balance/config'
import { DetallePresupuestos } from '../../../balance/vistas/AnalisisCarta'
import { ResumenLimites } from '../../../balance/vistas/ResumenLimites'
import { Boton } from '../../../shared/ui/Boton'
import { Modal } from '../../../shared/ui/Modal'
import type { AnyCard } from '../../../shared/types'

interface BalanceCartaModalProps {
  card: AnyCard
  onCerrar: () => void
}

/**
 * Balance de UNA carta del Card-Maker: qué presupuestos e índices usa y cuáles rebasa, con el mismo balanceador del Tablero.
 * No compara contra las demás cartas (nada de letalidad): es una guía mientras se diseña, no el veredicto del balance completo.
 * Solo lectura: no modifica la carta. Se carga bajo demanda (lazy) para que el Card-Maker no cargue el código de balance hasta usarlo.
 */
export function BalanceCartaModal({ card, onCerrar }: BalanceCartaModalProps) {
  const cerrarRef = useRef<HTMLButtonElement>(null)
  const { carta, analisis, limites, avisos } = useMemo(() => analizarCartaPropia(card), [card])

  useEffect(() => {
    cerrarRef.current?.focus()
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [onCerrar])

  return (
    <Modal
      titulo={`Balance de ${card.name || 'carta sin nombre'}`}
      subtitulo={`${card.type} · coste ${carta.coste} · cálculos según CONFIG_${CONFIG_V1.version.toUpperCase()} (borrador)`}
      icono="📊"
      ancho="xl"
      onCerrar={onCerrar}
      pie={
        <Boton ref={cerrarRef} onClick={onCerrar}>
          Listo
        </Boton>
      }
    >
      <div className="space-y-4">
        <ResumenLimites limites={limites} />
        {avisos.length > 0 && (
          <ul aria-label="Avisos de la carta" className="list-disc space-y-1 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 pl-7 text-sm text-amber-200">
            {avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        )}
        <DetallePresupuestos carta={carta} analisis={analisis} />
        <p className="text-xs text-gray-500">
          Esta carta se mide solo contra sus propios presupuestos. Cuántos rivales mata y cómo queda frente al resto se ve en el Tablero de balance.
        </p>
      </div>
    </Modal>
  )
}
