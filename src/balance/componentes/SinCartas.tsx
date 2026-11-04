/** Estado vacío común a todas las vistas cuando los filtros no devuelven cartas. */
export function SinCartas({ mensaje = 'Sin cartas con estos filtros' }: { mensaje?: string }) {
  return (
    <p role="status" className="rounded-2xl border border-card-border bg-surface p-4 text-sm text-gray-400">
      {mensaje}
    </p>
  )
}
