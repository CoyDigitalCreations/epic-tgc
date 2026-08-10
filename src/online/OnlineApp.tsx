export default function OnlineApp() {
  return (
    <div className="min-h-screen bg-[#0d0d14] text-gray-100 font-body">
      {/* Header */}
      <header className="border-b border-card-border bg-surface">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-display font-bold text-gray-100 tracking-wider">
            Éter Online
          </h1>
          <p className="text-xs text-gray-500 font-body">Modo en línea</p>
        </div>
      </header>

      {/* Placeholder */}
      <main className="max-w-7xl mx-auto px-6 py-12 text-center">
        <p className="font-display text-lg text-ether-200">
          Próximamente — el modo en línea de Éter TCG está en construcción.
        </p>
      </main>
    </div>
  )
}
