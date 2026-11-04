/** Encabezado común de cada vista: título (h2) y una línea de propósito. */
export function TituloVista({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <header className="mb-4">
      <h2 className="font-display text-xl font-bold tracking-wider text-gray-100">{titulo}</h2>
      <p className="mt-1 text-sm text-gray-400">{descripcion}</p>
    </header>
  )
}
