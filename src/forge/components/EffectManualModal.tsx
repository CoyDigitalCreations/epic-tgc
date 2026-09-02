/**
 * EffectManualModal — Modal con el manual completo del sistema de efectos.
 * Incluye todas las configuraciones y combinaciones disponibles.
 */
import { useEffect } from 'react'

interface EffectManualModalProps {
  isOpen: boolean
  onClose: () => void
}

export function EffectManualModal({ isOpen, onClose }: EffectManualModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-[#1a1a2e] border border-gray-600 rounded-xl w-[90vw] max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-surface">
          <h2 className="text-lg font-display font-bold text-gray-100">Manual de Efectos</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl cursor-pointer">✕</button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6 text-sm text-gray-300">

          {/* ── INTRODUCCIÓN ── */}
          <section>
            <h3 className="text-base font-bold text-ether-400 mb-2">1. Introducción</h3>
            <p className="mb-2">
              El <strong>Sistema de Efectos Estructurados</strong> reemplaza la escritura manual de textos por campos predefinidos.
              Cada efecto se construye seleccionando opciones en dropdowns — <strong>nada se escribe a mano</strong>.
            </p>
            <p className="mb-2">El sistema tiene 2 capas:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li><strong>Efectos normales</strong> — la sección &quot;Efectos&quot; con el botón &quot;+ Agregar Efecto&quot;</li>
              <li><strong>Efecto Comandante</strong> — solo aparece si la carta tiene la categoría &quot;Comandante&quot;</li>
            </ul>
          </section>

          {/* ── CAMPOS DE UN EFECTO ── */}
          <section>
            <h3 className="text-base font-bold text-ether-400 mb-2">2. Campos de un Efecto</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-gray-700 rounded-lg overflow-hidden">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-300">Campo</th>
                    <th className="px-3 py-2 text-left text-gray-300">Opciones</th>
                    <th className="px-3 py-2 text-left text-gray-300">Descripción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  <tr><td className="px-3 py-2 font-mono text-ether-300">Tipo</td><td className="px-3 py-2">Pasivo, Continuo, Disparo, Reserva, Pago, Bloqueo, Hechizo, Vínculo</td><td className="px-3 py-2 text-gray-400">Zona/fase del efecto</td></tr>
                  <tr><td className="px-3 py-2 font-mono text-ether-300">Costo</td><td className="px-3 py-2">Sin costo, Éter, Éter bloqueado, Agotar</td><td className="px-3 py-2 text-gray-400">Qué paga el jugador + cantidad</td></tr>
                  <tr><td className="px-3 py-2 font-mono text-ether-300">Trigger</td><td className="px-3 py-2">Al invocar, Al atacar, Al pagar éter, Inicio de Choque, Inicio de Alba, Al activar habilidad, Al ir al cementerio, etc.</td><td className="px-3 py-2 text-gray-400">Cuándo se activa el efecto</td></tr>
                  <tr><td className="px-3 py-2 font-mono text-ether-300">Frecuencia</td><td className="px-3 py-2">1 por turno, Ilimitado</td><td className="px-3 py-2 text-gray-400">Cuántas veces se puede usar</td></tr>
                  <tr><td className="px-3 py-2 font-mono text-ether-300">Zona activación</td><td className="px-3 py-2">Reserva, Pago, Bloqueo, Campo</td><td className="px-3 py-2 text-gray-400">Desde dónde se activa (solo Éter)</td></tr>
                  <tr><td className="px-3 py-2 font-mono text-ether-300">Objetivo</td><td className="px-3 py-2">Tipo + Controlador + Zona + Filtros</td><td className="px-3 py-2 text-gray-400">A quién afecta (sistema de 3 capas)</td></tr>
                  <tr><td className="px-3 py-2 font-mono text-ether-300">Efecto</td><td className="px-3 py-2">Buff, Debuff, Destruir, Robar, Bloquear éter, Devolver, Exiliar, etc.</td><td className="px-3 py-2 text-gray-400">Qué hace el efecto</td></tr>
                  <tr><td className="px-3 py-2 font-mono text-ether-300">Stats</td><td className="px-3 py-2">ATQ, RES</td><td className="px-3 py-2 text-gray-400">Modificaciones de stats (para buff/debuff)</td></tr>
                  <tr><td className="px-3 py-2 font-mono text-ether-300">Keyword</td><td className="px-3 py-2">Carga, Vigor, Inmortal, Indestructible, Protector, Artefacto, Presteza, Fugaz, Recarga</td><td className="px-3 py-2 text-gray-400">Keyword a otorgar (para efecto &quot;keyword&quot;)</td></tr>
                  <tr><td className="px-3 py-2 font-mono text-ether-300">Duración</td><td className="px-3 py-2">Permanente, Este turno, Hasta tu Alba, Mientras éter bloqueado, Mientras esté en campo, 1 por turno, N turnos</td><td className="px-3 py-2 text-gray-400">Cuánto dura el efecto</td></tr>
                  <tr><td className="px-3 py-2 font-mono text-ether-300">Cantidad</td><td className="px-3 py-2">1-20</td><td className="px-3 py-2 text-gray-400">Cuántas cartas afecta (para robar, destruir, etc.)</td></tr>
                  <tr><td className="px-3 py-2 font-mono text-ether-300">Reagrupar</td><td className="px-3 py-2">Alba/Choque + Propio/Oponente</td><td className="px-3 py-2 text-gray-400">Si el éter regresa a Reserva en esa fase</td></tr>
                  <tr><td className="px-3 py-2 font-mono text-ether-300">Condición</td><td className="px-3 py-2">4 opciones predefinidas</td><td className="px-3 py-2 text-gray-400">Condición de activación (solo Arcana)</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ── SISTEMA DE OBJETIVOS ── */}
          <section>
            <h3 className="text-base font-bold text-ether-400 mb-2">3. Sistema de Objetivos (3 Capas)</h3>
            <p className="mb-2">Cada objetivo se define con 3 campos + filtros opcionales:</p>

            <h4 className="font-semibold text-gray-200 mt-3 mb-1">Capa 1: Tipo de carta</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-gray-700 rounded-lg overflow-hidden">
                <thead className="bg-gray-800"><tr><th className="px-3 py-2 text-left text-gray-300">Tipo</th><th className="px-3 py-2 text-left text-gray-300">Texto generado</th></tr></thead>
                <tbody className="divide-y divide-gray-700">
                  <tr><td className="px-3 py-2 font-mono text-ether-300">self</td><td className="px-3 py-2">esta carta</td></tr>
                  <tr><td className="px-3 py-2 font-mono text-ether-300">campeon</td><td className="px-3 py-2">un Campeón</td></tr>
                  <tr><td className="px-3 py-2 font-mono text-ether-300">mistica</td><td className="px-3 py-2">una Mística</td></tr>
                  <tr><td className="px-3 py-2 font-mono text-ether-300">arcana</td><td className="px-3 py-2">una Arcana</td></tr>
                  <tr><td className="px-3 py-2 font-mono text-ether-300">mistica_arcana</td><td className="px-3 py-2">una Mística o Arcana</td></tr>
                  <tr><td className="px-3 py-2 font-mono text-ether-300">eter</td><td className="px-3 py-2">Éter</td></tr>
                  <tr><td className="px-3 py-2 font-mono text-ether-300">carta</td><td className="px-3 py-2">una carta</td></tr>
                  <tr><td className="px-3 py-2 font-mono text-ether-300">mano</td><td className="px-3 py-2">una carta</td></tr>
                </tbody>
              </table>
            </div>

            <h4 className="font-semibold text-gray-200 mt-3 mb-1">Capa 2: Controlador</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-gray-700 rounded-lg overflow-hidden">
                <thead className="bg-gray-800"><tr><th className="px-3 py-2 text-left text-gray-300">Controlador</th><th className="px-3 py-2 text-left text-gray-300">Texto generado</th></tr></thead>
                <tbody className="divide-y divide-gray-700">
                  <tr><td className="px-3 py-2 font-mono text-ether-300">propio</td><td className="px-3 py-2">que controles</td></tr>
                  <tr><td className="px-3 py-2 font-mono text-ether-300">rival</td><td className="px-3 py-2">que controla el rival</td></tr>
                  <tr><td className="px-3 py-2 font-mono text-ether-300">ambos</td><td className="px-3 py-2">en juego</td></tr>
                </tbody>
              </table>
            </div>

            <h4 className="font-semibold text-gray-200 mt-3 mb-1">Capa 3: Zona</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-gray-700 rounded-lg overflow-hidden">
                <thead className="bg-gray-800"><tr><th className="px-3 py-2 text-left text-gray-300">Zona</th><th className="px-3 py-2 text-left text-gray-300">Texto generado</th></tr></thead>
                <tbody className="divide-y divide-gray-700">
                  <tr><td className="px-3 py-2 font-mono text-ether-300">campo</td><td className="px-3 py-2">(vacío — implícito)</td></tr>
                  <tr><td className="px-3 py-2 font-mono text-ether-300">cementerio</td><td className="px-3 py-2">del Cementerio</td></tr>
                  <tr><td className="px-3 py-2 font-mono text-ether-300">exilio</td><td className="px-3 py-2">del Exilio</td></tr>
                  <tr><td className="px-3 py-2 font-mono text-ether-300">reserva</td><td className="px-3 py-2">de tu Reserva</td></tr>
                  <tr><td className="px-3 py-2 font-mono text-ether-300">pagado</td><td className="px-3 py-2">de tu zona de pago</td></tr>
                  <tr><td className="px-3 py-2 font-mono text-ether-300">bloqueado</td><td className="px-3 py-2">bloqueado</td></tr>
                  <tr><td className="px-3 py-2 font-mono text-ether-300">mano</td><td className="px-3 py-2">de tu mano</td></tr>
                  <tr><td className="px-3 py-2 font-mono text-ether-300">mazo</td><td className="px-3 py-2">de tu mazo</td></tr>
                </tbody>
              </table>
            </div>

            <h4 className="font-semibold text-gray-200 mt-3 mb-1">Filtros adicionales</h4>
            <p className="mb-1">Aparecen al seleccionar un objetivo. Permiten especificar:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li><strong>Tipo de carta</strong>: Campeón, Mística, Arcana</li>
              <li><strong>Facción</strong>: Orden, Caos</li>
              <li><strong>Esencia</strong>: Céleste, Abisal</li>
              <li><strong>Rol</strong>: Soberano, Emperador, Soporte, Éter, Normal, Comandante</li>
              <li><strong>Coste máximo</strong>: número</li>
              <li><strong>ATQ máximo</strong>: número</li>
              <li><strong>RES máximo</strong>: número</li>
            </ul>
          </section>

          {/* ── COMBINACIONES POR TIPO DE CARTA ── */}
          <section>
            <h3 className="text-base font-bold text-ether-400 mb-2">4. Combinaciones por Tipo de Carta</h3>

            {/* CAMPEÓN */}
            <h4 className="font-semibold text-gray-200 mt-3 mb-1">Campeón</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-gray-700 rounded-lg overflow-hidden">
                <thead className="bg-gray-800"><tr><th className="px-3 py-2 text-left text-gray-300">Tipo efecto</th><th className="px-3 py-2 text-left text-gray-300">Costo</th><th className="px-3 py-2 text-left text-gray-300">Trigger</th><th className="px-3 py-2 text-left text-gray-300">Duración</th><th className="px-3 py-2 text-left text-gray-300">Ejemplo</th></tr></thead>
                <tbody className="divide-y divide-gray-700">
                  <tr><td className="px-3 py-2">Pasivo</td><td className="px-3 py-2">—</td><td className="px-3 py-2">Al invocar, Al atacar, etc.</td><td className="px-3 py-2">Mientras esté en campo, Permanente</td><td className="px-3 py-2 text-gray-400">Aurora: roba campeón rival al invocar</td></tr>
                  <tr><td className="px-3 py-2">Continuo</td><td className="px-3 py-2">Éter bloqueado</td><td className="px-3 py-2">Al activar habilidad</td><td className="px-3 py-2">Mientras éter bloqueado</td><td className="px-3 py-2 text-gray-400">Aurora: buff +2/+2 con éter bloqueado</td></tr>
                  <tr><td className="px-3 py-2">Disparo</td><td className="px-3 py-2">Éter o Agotar</td><td className="px-3 py-2">Al activar habilidad</td><td className="px-3 py-2">Este turno, Permanente</td><td className="px-3 py-2 text-gray-400">Seraphina: cambia agotamiento de rival</td></tr>
                </tbody>
              </table>
            </div>

            {/* ÉTER */}
            <h4 className="font-semibold text-gray-200 mt-3 mb-1">Éter</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-gray-700 rounded-lg overflow-hidden">
                <thead className="bg-gray-800"><tr><th className="px-3 py-2 text-left text-gray-300">Tipo efecto</th><th className="px-3 py-2 text-left text-gray-300">Zona activación</th><th className="px-3 py-2 text-left text-gray-300">Trigger</th><th className="px-3 py-2 text-left text-gray-300">Ejemplo</th></tr></thead>
                <tbody className="divide-y divide-gray-700">
                  <tr><td className="px-3 py-2">Reserva</td><td className="px-3 py-2">—</td><td className="px-3 py-2">Ninguno (siempre activo), Inicio de Choque</td><td className="px-3 py-2 text-gray-400">FB-001: +1 ATQ a campeones propios</td></tr>
                  <tr><td className="px-3 py-2">Pago</td><td className="px-3 py-2">Pago</td><td className="px-3 py-2">Al pagar éter, Ninguno</td><td className="px-3 py-2 text-gray-400">FB-003: roba 1 carta al pagar</td></tr>
                  <tr><td className="px-3 py-2">Bloqueo</td><td className="px-3 py-2">Bloqueo</td><td className="px-3 py-2">—</td><td className="px-3 py-2 text-gray-400">FB-007: +2/+2 al campeón</td></tr>
                </tbody>
              </table>
            </div>

            {/* MÍSTICA */}
            <h4 className="font-semibold text-gray-200 mt-3 mb-1">Mística</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-gray-700 rounded-lg overflow-hidden">
                <thead className="bg-gray-800"><tr><th className="px-3 py-2 text-left text-gray-300">Tipo efecto</th><th className="px-3 py-2 text-left text-gray-300">Trigger</th><th className="px-3 py-2 text-left text-gray-300">Ejemplo</th></tr></thead>
                <tbody className="divide-y divide-gray-700">
                  <tr><td className="px-3 py-2">Hechizo</td><td className="px-3 py-2">Ninguno (se resuelve al jugar)</td><td className="px-3 py-2 text-gray-400">FB-019: devuelve campeón rival a mano</td></tr>
                </tbody>
              </table>
            </div>

            {/* ARCANA */}
            <h4 className="font-semibold text-gray-200 mt-3 mb-1">Arcana</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-gray-700 rounded-lg overflow-hidden">
                <thead className="bg-gray-800"><tr><th className="px-3 py-2 text-left text-gray-300">Campo</th><th className="px-3 py-2 text-left text-gray-300">Descripción</th></tr></thead>
                <tbody className="divide-y divide-gray-700">
                  <tr><td className="px-3 py-2">Condición</td><td className="px-3 py-2 text-gray-400">Condición para activar (select predefinido)</td></tr>
                  <tr><td className="px-3 py-2">Recompensa</td><td className="px-3 py-2 text-gray-400">Texto de la recompensa</td></tr>
                  <tr><td className="px-3 py-2">Efectos</td><td className="px-3 py-2 text-gray-400">Efectos adicionales (mismo sistema que otros tipos)</td></tr>
                </tbody>
              </table>
            </div>

            {/* VÍNCULO */}
            <h4 className="font-semibold text-gray-200 mt-3 mb-1">Vínculo</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-gray-700 rounded-lg overflow-hidden">
                <thead className="bg-gray-800"><tr><th className="px-3 py-2 text-left text-gray-300">Tipo efecto</th><th className="px-3 py-2 text-left text-gray-300">Duración</th><th className="px-3 py-2 text-left text-gray-300">Ejemplo</th></tr></thead>
                <tbody className="divide-y divide-gray-700">
                  <tr><td className="px-3 py-2">Vínculo</td><td className="px-3 py-2">Permanente</td><td className="px-3 py-2 text-gray-400">FB-026: roba 2 cartas al destruirse</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ── COMANDANTE ── */}
          <section>
            <h3 className="text-base font-bold text-ether-400 mb-2">5. Efecto Comandante</h3>
            <p className="mb-2">
              Solo aparece si la carta tiene la categoría <strong>&quot;Comandante&quot;</strong> en &quot;Categorías de Habilidad&quot;.
            </p>
            <p className="mb-2">
              El efecto Comandante afecta a <strong>TODOS los Campeones de la misma facción</strong> que controles.
              No es necesario indicar el objetivo — el motor lo sabe por la categoría.
            </p>
            <p className="mb-2">Campos disponibles: Efecto (Buff/Debuff/Keyword) + Stats (ATQ/RES) + Keyword.</p>
            <p className="text-gray-400">Ejemplo: Aurora con Comandante → &quot;Ganan +2 de ATQ y +2 de RES&quot; (aplica a todos los Campeones de Orden).</p>
          </section>

          {/* ── CAMPOS COMUNES ── */}
          <section>
            <h3 className="text-base font-bold text-ether-400 mb-2">6. Campos Comunes de la Carta</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border border-gray-700 rounded-lg overflow-hidden">
                <thead className="bg-gray-800"><tr><th className="px-3 py-2 text-left text-gray-300">Campo</th><th className="px-3 py-2 text-left text-gray-300">Tipo</th><th className="px-3 py-2 text-left text-gray-300">Descripción</th></tr></thead>
                <tbody className="divide-y divide-gray-700">
                  <tr><td className="px-3 py-2">Nombre</td><td className="px-3 py-2">Texto</td><td className="px-3 py-2 text-gray-400">Nombre de la carta</td></tr>
                  <tr><td className="px-3 py-2">Coste</td><td className="px-3 py-2">Número</td><td className="px-3 py-2 text-gray-400">Coste de Éter para invocar</td></tr>
                  <tr><td className="px-3 py-2">Poder / Resistencia</td><td className="px-3 py-2">Número</td><td className="px-3 py-2 text-gray-400">Stats de combate (solo Campeón)</td></tr>
                  <tr><td className="px-3 py-2">Facciones</td><td className="px-3 py-2">Multi-select (máx 3)</td><td className="px-3 py-2 text-gray-400">Orden, Caos</td></tr>
                  <tr><td className="px-3 py-2">Esencia</td><td className="px-3 py-2">Select</td><td className="px-3 py-2 text-gray-400">Céleste, Abisal (solo Campeón)</td></tr>
                  <tr><td className="px-3 py-2">Roles</td><td className="px-3 py-2">Multi-select (máx 2)</td><td className="px-3 py-2 text-gray-400">Soberano, Emperador, Soporte, Éter, Normal, Comandante</td></tr>
                  <tr><td className="px-3 py-2">Categorías</td><td className="px-3 py-2">Multi-select (máx 2)</td><td className="px-3 py-2 text-gray-400">Efecto, Singular, Comandante, Legendario, Maldito, Bendito, Normal</td></tr>
                  <tr><td className="px-3 py-2">Keywords</td><td className="px-3 py-2">Multi-select</td><td className="px-3 py-2 text-gray-400">Carga, Vigor, Inmortal, Indestructible, Protector, Artefacto, Presteza, Fugaz, Recarga</td></tr>
                  <tr><td className="px-3 py-2">Límite por Mazo</td><td className="px-3 py-2">Select</td><td className="px-3 py-2 text-gray-400">1, 2 o 3 copias máximo</td></tr>
                  <tr><td className="px-3 py-2">Texto de Sabor</td><td className="px-3 py-2">Textarea</td><td className="px-3 py-2 text-gray-400">Ambientación (aparece en la carta)</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* ── REGLAS DE TEXTO ── */}
          <section>
            <h3 className="text-base font-bold text-ether-400 mb-2">7. Reglas de Texto Auto-generado</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>El texto se genera <strong>automáticamente</strong> desde los campos — nunca se escribe a mano</li>
              <li>Si el objetivo es plural (Todos los Campeones), el verbo se conjuga en plural (&quot;ganan&quot; en vez de &quot;gana&quot;)</li>
              <li>La primera letra siempre es mayúscula</li>
              <li>La cantidad se incluye para Robar, Destruir, Devolver, Exiliar (&quot;roba 1 carta&quot;)</li>
              <li>Para efectos con costo + objetivo, se usa &quot;sobre&quot; en vez del verbo (&quot;bloquea&quot; se pone en el costo)</li>
            </ul>
          </section>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-700 bg-surface flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-ether-600 hover:bg-ether-500 text-white text-sm rounded transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
