export interface DatosTabla {
  caption: string
  columnas: readonly string[]
  filas: readonly (readonly string[])[]
}

interface Props extends DatosTabla {
  /** Si es false la tabla queda solo para lectores de pantalla (sr-only). */
  visible?: boolean
}

/** Tabla accesible: equivalente textual de una gráfica. El caption siempre existe. */
export function TablaAlternativa({ caption, columnas, filas, visible = true }: Props) {
  return (
    <div className={visible ? 'mt-3 overflow-x-auto' : 'sr-only'}>
      <table className="w-full border-collapse text-left text-sm text-gray-300">
        <caption className="mb-1 text-left text-xs text-gray-500">{caption}</caption>
        <thead>
          <tr>
            {columnas.map((c) => (
              <th key={c} scope="col" className="border-b border-card-border px-2 py-1 font-display text-xs text-ether-200">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 ? (
            <tr>
              <td colSpan={columnas.length} className="px-2 py-1 text-gray-500">
                Sin datos para mostrar
              </td>
            </tr>
          ) : (
            filas.map((fila, i) => (
              <tr key={i} className="odd:bg-surface/50">
                {fila.map((celda, j) => (
                  <td key={j} className="border-b border-card-border/40 px-2 py-1">
                    {celda}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
