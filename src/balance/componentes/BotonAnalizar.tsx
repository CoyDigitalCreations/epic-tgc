/** Botón de una fila que abre el análisis de esa carta; el nombre accesible dice de cuál. */
export function BotonAnalizar({ id, nombre, onAnalizar }: { id: string; nombre: string; onAnalizar: (id: string) => void }) {
  return (
    <button
      type="button"
      aria-label={`Analizar ${nombre}`}
      onClick={() => onAnalizar(id)}
      className="rounded-lg border border-ether-400/60 px-2 py-0.5 text-xs font-semibold text-ether-200 transition-colors hover:bg-ether-500/20"
    >
      Analizar
    </button>
  )
}
