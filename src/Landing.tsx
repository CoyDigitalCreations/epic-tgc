import { Link } from 'react-router'

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0d0d14] text-gray-100 font-body">
      {/* Header */}
      <header className="border-b border-card-border bg-surface">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-100 tracking-wider">
              Éter TCG
            </h1>
            <p className="text-xs text-gray-500 font-body">
              Creador de cartas y juego en línea
            </p>
          </div>
          <nav className="flex items-center gap-4 text-xs text-gray-400">
            <a href="/manual.html" className="hover:text-ether-200">
              Manual
            </a>
            <a href="/primogenitos.html" className="hover:text-ether-200">
              Primogénitos
            </a>
          </nav>
        </div>
      </header>

      {/* Apps */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            to="/card-maker"
            className="bg-surface border border-card-border rounded-xl p-8 hover:border-ether-400 transition-colors"
          >
            <h2 className="font-display text-xl font-bold text-ether-200 tracking-wider">
              Card Maker
            </h2>
            <p className="text-sm text-gray-400 mt-2">
              Crea y edita tus cartas de Éter TCG
            </p>
          </Link>
          <Link
            to="/epiconline"
            className="bg-surface border border-card-border rounded-xl p-8 hover:border-ether-400 transition-colors"
          >
            <h2 className="font-display text-xl font-bold text-ether-200 tracking-wider">
              Éter Online
            </h2>
            <p className="text-sm text-gray-400 mt-2">
              Juega partidas de Éter TCG en línea
            </p>
          </Link>
          <a
            href="/manual.html"
            className="bg-surface border border-card-border rounded-xl p-8 hover:border-ether-400 transition-colors"
          >
            <h2 className="font-display text-xl font-bold text-gray-300 tracking-wider">
              Manual de reglas
            </h2>
            <p className="text-sm text-gray-400 mt-2">
              Reglas completas de Éter TCG v2.0
            </p>
          </a>
          <a
            href="/primogenitos.html"
            className="bg-surface border border-card-border rounded-xl p-8 hover:border-ether-400 transition-colors"
          >
            <h2 className="font-display text-xl font-bold text-gray-300 tracking-wider">
              Los Primogénitos
            </h2>
            <p className="text-sm text-gray-400 mt-2">
              El lore y la cosmología del Eje
            </p>
          </a>
        </div>
      </main>
    </div>
  )
}
