/**
 * EffectManualModal — Modal con el manual completo del sistema de efectos.
 * Incluye TODAS las configuraciones y combinaciones de texto autogenerado.
 */
import { useEffect } from 'react'

interface EffectManualModalProps {
  isOpen: boolean
  onClose: () => void
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="text-base font-bold text-ether-400 mb-2">{title}</h3>
      {children}
    </section>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border border-gray-700 rounded-lg overflow-hidden">
        <thead className="bg-gray-800">
          <tr>{headers.map((h, i) => <th key={i} className="px-3 py-2 text-left text-gray-300">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {rows.map((row, i) => (
            <tr key={i}>{row.map((cell, j) => <td key={j} className="px-3 py-2 text-gray-400">{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function EffectManualModal({ isOpen, onClose }: EffectManualModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (isOpen) document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-[#1a1a2e] border border-gray-600 rounded-xl w-[90vw] max-w-5xl max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-surface">
          <h2 className="text-lg font-display font-bold text-gray-100">Manual de Efectos</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl cursor-pointer">✕</button>
        </div>
        <div className="overflow-y-auto p-6 space-y-6 text-sm text-gray-300">

          {/* 1. INTRODUCCIÓN */}
          <Section title="1. Introducción">
            <p className="mb-2">El <strong>Sistema de Efectos Estructurados</strong> reemplaza la escritura manual por campos predefinidos. <strong>Nada se escribe a mano</strong> — el texto se genera automáticamente.</p>
            <p className="mb-2">Cada efecto se construye seleccionando opciones en dropdowns. El motor lee los campos estructurados directamente.</p>
            <p className="text-xs text-gray-500">Las palabras clave se renderizan en <strong>negrita</strong> en la carta física.</p>
          </Section>

          {/* 2. CATEGORÍAS DE EFECTOS */}
          <Section title="2. Categorías de Efectos">
            <p className="mb-2">Los efectos se agrupan por categoría para facilitar la selección:</p>
            <Table
              headers={['Categoría', 'Efectos']}
              rows={[
                ['Modificadores', 'Buff, Debuff, Grant Keyword, Toggle Exhaust'],
                ['Control', 'Steal Champion, Steal Ether, Redirect, Copy, Change Type'],
                ['Destrucción', 'Destroy, Exile, Prevent Destroy'],
                ['Invocación', 'Invocar, Invocar y Equipar'],
                ['Movimiento', 'Return Hand, Return Ether, Mover, Recuperar'],
                ['Éter', 'Block Ether, Free Ether, Return Ether'],
                ['Robo', 'Draw, Scry, Tutor'],
                ['Combate', 'Double Attack, Direct Attack'],
                ['Negación', 'Negar'],
              ]}
            />
          </Section>

          {/* 3. TRIGGER + QUIÉN (Sistema Componible) */}
          <Section title="3. Trigger + Quién (Sistema Componible)">
            <p className="mb-2">Los triggers ahora tienen un selector <strong>"Quién"</strong> (Propio / Rival) que se combina con el trigger base:</p>
            <Table
              headers={['Trigger', 'Quién', 'Texto generado']}
              rows={[
                ['Inicio de Choque', 'Propio', 'Al inicio de tu Choque'],
                ['Inicio de Choque', 'Rival', 'Al inicio del Choque del rival'],
                ['Inicio de Alba', 'Propio', 'Al inicio de tu Alba'],
                ['Inicio de Alba', 'Rival', 'Al inicio de la Alba del rival'],
                ['Al atacar', 'Propio', 'Al atacar'],
                ['Al atacar', 'Rival', 'Al ser atacada'],
                ['Al invocar', 'Propio', 'Al ser invocada'],
                ['Al invocar', 'Rival', 'Al ser invocada por el rival'],
                ['Al resolver cadena', '—', 'Al resolver la cadena'],
                ['Al activar habilidad', '—', 'Al activar esta habilidad'],
                ['Al jugar Mística', '—', 'Al jugar esta Mística'],
                ['Al pagar éter', '—', 'Cuando pagues esta carta'],
                ['Al matar en combate', '—', 'Al matar en combate'],
                ['Al ser enviada al Cementerio', '—', 'Al ser enviada al Cementerio'],
                ['Al ser destruido Vínculo', '—', 'Al ser destruido este Vínculo'],
              ]}
            />
            <p className="mt-2 text-xs text-gray-500">La columna "Quién" solo aparece para triggers relevantes. Para otros (como al_resolver_cadena), no aplica.</p>
          </Section>

          {/* 4. COSTO → TEXTO */}
          <Section title="4. Costo → Texto">
            <p className="mb-2">Qué paga el jugador para activar:</p>
            <Table
              headers={['Costo', 'Cantidad', 'Texto generado']}
              rows={[
                ['Éter', '1', 'puedes pagar 1 Éter'],
                ['Éter', '2', 'puedes pagar 2 Éter'],
                ['Éter bloqueado', '1', 'puedes bloquear 1 Éter (Max. 1)'],
                ['Éter bloqueado', '2', 'puedes bloquear 2 Éter (Max. 2)'],
                ['Bloqueo fijo', '3', 'bloquea 3 Éter'],
                ['Agotar', '—', 'puedes agotar esta carta'],
              ]}
            />
            <p className="mt-2 text-xs text-gray-500">
              <strong>Bloqueo fijo:</strong> Cantidad exacta, sin "hasta". Ejemplo: "bloquea 3 Éter" (sin paréntesis Max).
            </p>
            <p className="mt-1 text-xs text-gray-500">
              <strong>Éter bloqueado (flexible):</strong> Incluye "hasta un máximo de N" y "(Max. N)". Ejemplo: "puedes bloquear hasta un máximo de 2 Éter (Max. 2)".
            </p>
          </Section>

          {/* 5. HASTA CHECKBOX */}
          <Section title="5. Checkbox 'Hasta' (Cantidad Flexible)">
            <p className="mb-2">Disponible para efectos con cantidad. Agrega "hasta" antes del número para indicar que es opcional hasta ese máximo:</p>
            <Table
              headers={['Sin Hasta', 'Con Hasta']}
              rows={[
                ['devuelve 3 Éter', 'devuelve hasta 3 Éter'],
                ['roba 2 cartas', 'roba hasta 2 cartas'],
                ['destruye 1 Campeón', 'destruye hasta 1 Campeón'],
                ['mueve 2 Éter', 'mueve hasta 2 Éter'],
              ]}
            />
            <p className="mt-2 text-xs text-gray-500">El checkbox "Hasta" aparece solo para efectos que soportan cantidad: draw, destroy, exile, scry, tutor, return_hand, mover, return_ether, steal_champion, steal_ether, block_ether, free_ether, invocar, invocar_y_equipar.</p>
          </Section>

          {/* 6. OBJETIVO → TEXTO (3 CAPAS) */}
          <Section title="6. Objetivo → Texto (3 Capas)">
            <p className="mb-2">Cada objetivo combina: <strong>Tipo</strong> + <strong>Controlador</strong> + <strong>Zona</strong> + <strong>Filtros</strong></p>

            <h4 className="font-semibold text-gray-200 mt-3 mb-1">Tipo de carta</h4>
            <Table
              headers={['Tipo', 'Texto']}
              rows={[
                ['self', 'esta carta'],
                ['campeon', 'un Campeón'],
                ['mistica', 'una Mística'],
                ['arcana', 'una Arcana'],
                ['mistica_arcana', 'una Mística o Arcana'],
                ['eter', 'Éter'],
                ['carta', 'una carta'],
                ['mano', 'una carta'],
              ]}
            />

            <h4 className="font-semibold text-gray-200 mt-3 mb-1">Controlador</h4>
            <Table
              headers={['Controlador', 'Texto']}
              rows={[
                ['propio', 'que controles'],
                ['rival', 'que controla el rival'],
                ['ambos', 'en juego'],
              ]}
            />

            <h4 className="font-semibold text-gray-200 mt-3 mb-1">Zona</h4>
            <Table
              headers={['Zona', 'Texto']}
              rows={[
                ['campo', '(vacío — implícito)'],
                ['cementerio', 'del Cementerio'],
                ['exilio', 'del Exilio'],
                ['reserva', 'de tu Reserva'],
                ['pagado', 'de tu zona de pago'],
                ['bloqueado', 'bloqueado'],
                ['mano', 'de tu mano'],
                ['mazo', 'de tu mazo'],
              ]}
            />

            <h4 className="font-semibold text-gray-200 mt-3 mb-1">Combinaciones comunes</h4>
            <Table
              headers={['Tipo + Controlador + Zona', 'Texto generado']}
              rows={[
                ['campeon + propio + campo', 'un Campeón que controles'],
                ['campeon + rival + campo', 'un Campeón que controla el rival'],
                ['campeon + propio + cementerio', 'un Campeón de tu Cementerio'],
                ['campeon + rival + exilio', 'un Campeón del Exilio del rival'],
                ['mistica + rival + campo', 'una Mística que controla el rival'],
                ['mistica_arcana + rival + campo', 'una Mística o Arcana que controla el rival'],
                ['eter + propio + reserva', 'Éter de tu Reserva'],
                ['eter + rival + pagado', 'Éter de su zona de pago'],
                ['carta + propio + mazo', 'una carta de tu mazo'],
                ['mano + rival + mano', 'el rival'],
                ['self + propio + campo', 'esta carta'],
              ]}
            />
          </Section>

          {/* 7. FILTROS DE OBJETIVO */}
          <Section title="7. Filtros de Objetivo">
            <p className="mb-2">Se agregan como prefijo al objetivo:</p>
            <Table
              headers={['Filtro', 'Texto']}
              rows={[
                ['Tipo carta: Campeón', 'Campeón'],
                ['Tipo carta: Mística', 'Mística'],
                ['Tipo carta: Arcana', 'Arcana'],
                ['Facción: Orden', 'Orden'],
                ['Facción: Caos', 'Caos'],
                ['Esencia: Céleste', 'Céleste'],
                ['Esencia: Abisal', 'Abisal'],
                ['Rol: Soberano', 'Soberano'],
                ['Rol: Emperador', 'Emperador'],
                ['Rol: Soporte', 'Soporte'],
                ['Rol: Éter', 'Éter'],
                ['Rol: Normal', 'Normal'],
                ['Rol: Comandante', 'Comandante'],
                ['Coste max: N', 'coste N o menos'],
                ['ATQ max: N', 'ATQ N o menos'],
                ['RES max: N', 'RES N o menos'],
              ]}
            />

            <h4 className="font-semibold text-gray-200 mt-3 mb-1">Filtros Nuevos</h4>
            <Table
              headers={['Filtro', 'Texto', 'Descripción']}
              rows={[
                ['puedeBloquearEter', 'que pueda recibir éter bloqueado', 'Filtra Campeones que aceptan éter bloqueado'],
                ['seleccionar', '(ranking)', 'Filtra por el Campeón con mayor/menor valor (ver sección Ranking)'],
              ]}
            />
          </Section>

          {/* 8. SELECCIONAR — RANKING */}
          <Section title="8. Seleccionar (Ranking Filter)">
            <p className="mb-2">Cuando el objetivo es un Campeón en campo y se usa el filtro <strong>seleccionar</strong>, aparece un dropdown de ranking:</p>
            <Table
              headers={['Ranking', 'Texto generado']}
              rows={[
                ['Mayor ATQ', 'el Campeón con mayor ATQ que controla el rival'],
                ['Menor ATQ', 'el Campeón con menor ATQ que controla el rival'],
                ['Mayor RES', 'el Campeón con mayor RES que controla el rival'],
                ['Menor RES', 'el Campeón con menor RES que controla el rival'],
                ['Mayor coste', 'el Campeón con mayor coste que controla el rival'],
                ['Menor coste', 'el Campeón con menor coste que controla el rival'],
              ]}
            />
            <p className="mt-2 text-xs text-gray-500">El ranking reemplaza los filtros estándar. Se combina con el controlador (Propio/Rival/Ambos).</p>
          </Section>

          {/* 9. EFECTO → TEXTO */}
          <Section title="9. Efecto → Texto">
            <p className="mb-2">Qué hace el efecto (se conjuga en plural si el objetivo es plural):</p>
            <Table
              headers={['Efecto', 'Singular', 'Plural']}
              rows={[
                ['Buff', 'gana', 'ganan'],
                ['Debuff', 'pierde', 'pierden'],
                ['Destruir', 'destruye', 'destruyen'],
                ['Exiliar', 'exilia', 'exilian'],
                ['Prevenir destrucción', 'no es destruido', 'no son destruidos'],
                ['Robar campeón', 'toma control de', 'toman control de'],
                ['Robar éter', 'toma control de', 'toman control de'],
                ['Bloquear éter', 'bloquea', 'bloquean'],
                ['Liberar éter', 'libera', 'liberan'],
                ['Devolver éter', 'devuelve', 'devuelven'],
                ['Mover', 'mueve', 'mueven'],
                ['Devolver a mano', 'devuelve a la mano', 'devuelven a la mano'],
                ['Toggle agotamiento', 'cambia el agotamiento de', 'cambian el agotamiento de'],
                ['Doble ataque', 'gana doble ataque', 'ganan doble ataque'],
                ['Ataque directo', 'puede atacar directamente', 'pueden atacar directamente'],
                ['Invocar', 'invoca', 'invocan'],
                ['Invocar y equipar', 'invoca y equipa', 'invocan y equipan'],
                ['Tutor', 'busca', 'buscan'],
                ['Negar', 'niega', 'niegan'],
              ]}
            />
            <p className="mt-2 text-xs text-gray-500">La cantidad (campo "Cantidad") se incluye para: Draw, Destroy, Exile, Scry, Tutor, Return Hand, Mover, Return Ether, Steal Champion, Steal Ether, Block Ether, Free Ether, Invocar, Invocar y Equipar.</p>
          </Section>

          {/* 10. EFECTO DE INVOCACIÓN */}
          <Section title="10. Efecto de Invocación">
            <p className="mb-2">Dos tipos de invocación:</p>

            <h4 className="font-semibold text-gray-200 mt-3 mb-1">Invocar</h4>
            <p className="mb-1">Invoca un Campeón desde una zona:</p>
            <Table
              headers={['Zona Origen', 'Texto generado']}
              rows={[
                ['Cementerio', 'invoca un Campeón del Cementerio de su dueño'],
                ['Exilio', 'invoca un Campeón del Exilio de su dueño'],
                ['Mano', 'invoca un Campeón de la mano de su dueño'],
                ['Mazo', 'invoca un Campeón del mazo de su dueño'],
              ]}
            />
            <p className="mt-1 text-xs text-gray-500">"su dueño" se refiere al dueño original de la carta (no al controlador actual del efecto).</p>

            <h4 className="font-semibold text-gray-200 mt-3 mb-1">Invocar y Equipar</h4>
            <p className="mb-1">Invoca un Campeón + equipa esta carta + vincula:</p>
            <Table
              headers={['Zona Origen', 'Texto generado']}
              rows={[
                ['Cementerio', 'invoca un Campeón del Cementerio de su dueño y equipa esta carta a ese Campeón'],
                ['Exilio', 'invoca un Campeón del Exilio de su dueño y equipa esta carta a ese Campeón'],
                ['Mano', 'invoca un Campeón de la mano de su dueño y equipa esta carta a ese Campeón'],
                ['Mazo', 'invoca un Campeón del mazo de su dueño y equipa esta carta a ese Campeón'],
              ]}
            />
            <p className="mt-1 text-xs text-gray-500">El efecto "invocar_y_equipar" también establece tipo: 'vinculo' y crea un vínculo con el Campeón invocado.</p>
          </Section>

          {/* 11. EFECTO TUTOR */}
          <Section title="11. Efecto Tutor">
            <p className="mb-2">Busca una carta en una zona y la agrega a otra zona:</p>

            <h4 className="font-semibold text-gray-200 mt-3 mb-1">Zona Origen (Buscar en)</h4>
            <Table
              headers={['Zona Origen', 'Texto generado']}
              rows={[
                ['Mazo', 'de tu mazo'],
                ['Cementerio', 'de tu Cementerio'],
                ['Exilio', 'de tu Exilio'],
              ]}
            />

            <h4 className="font-semibold text-gray-200 mt-3 mb-1">Zona Destino (Agregar a zona)</h4>
            <Table
              headers={['Zona Destino', 'Controlador Destino', 'Texto generado']}
              rows={[
                ['Mano', 'Tuya', 'a tu mano'],
                ['Mano', 'Del rival', 'a la mano del rival'],
                ['Mano', 'Del dueño', 'a la mano de su dueño'],
                ['Campo', 'Tuya', 'a tu campo'],
                ['Campo', 'Del rival', 'al campo del rival'],
                ['Campo', 'Del dueño', 'al campo de su dueño'],
                ['Cementerio', '—', 'al Cementerio'],
                ['Exilio', '—', 'al Exilio'],
              ]}
            />

            <h4 className="font-semibold text-gray-200 mt-3 mb-1">Texto completo</h4>
            <p className="text-xs">Ejemplo: "busca 1 Campeón de coste 4 o menos de tu mazo y agregalo a tu mano"</p>
            <p className="text-xs mt-1">Ejemplo: "busca 1 Mística de tu Cementerio y agregalo a la mano del rival"</p>
          </Section>

          {/* 12. EFECTO VÍNCULO */}
          <Section title="12. Efecto Vínculo">
            <p className="mb-2">Cuando el tipo de carta es <strong>'vinculo'</strong>, el efecto se aplica al vínculo en lugar de a un Campeón específico:</p>
            <Table
              headers={['Campo', 'Valor', 'Texto']}
              rows={[
                ['tipo', 'vinculo', 'Se activa cuando la carta está vinculada a un Campeón'],
                ['Trigger', 'al_ser_destruido_vinculo', 'Al ser destruido este Vínculo'],
              ]}
            />
            <p className="mt-2 text-xs text-gray-500">El vínculo se crea automáticamente cuando se usa "invocar_y_equipar" o cuando se equipa una carta a un Campeón.</p>
          </Section>

          {/* 13. DURACIÓN → TEXTO */}
          <Section title="13. Duración → Texto">
            <Table
              headers={['Duración', 'Texto generado']}
              rows={[
                ['Permanente', 'de forma permanente'],
                ['Este turno', 'hasta el final del turno'],
                ['Hasta tu Alba', 'hasta tu próxima Alba'],
                ['Hasta la Alba del oponente', 'hasta la próxima Alba del oponente'],
                ['Mientras éter bloqueado', 'mientras ese Éter esté bloqueado'],
                ['Mientras esté en campo', 'mientras esta carta esté en el campo'],
                ['Mientras esté equipado', 'mientras esté equipado'],
                ['1 por turno', 'una vez por turno'],
                ['N turnos', 'por N turnos'],
              ]}
            />
          </Section>

          {/* 14. FRECUENCIA → TEXTO */}
          <Section title="14. Frecuencia → Texto">
            <Table
              headers={['Frecuencia', 'Texto generado']}
              rows={[
                ['1 por turno', 'una vez por turno'],
                ['Ilimitado', '(no se agrega texto adicional)'],
              ]}
            />
          </Section>

          {/* 15. ZONA DESTINO — MOVER / DEVOLVER ÉTER */}
          <Section title="15. Zona Destino con 'Quién'">
            <p className="mb-2">Cuando el efecto es <strong>mover</strong>, <strong>devolver éter</strong>, <strong>liberar éter</strong> o <strong>bloquear éter</strong>, se agrega la zona destino con controlador:</p>
            <Table
              headers={['Zona Destino', 'Controlador', 'Texto generado']}
              rows={[
                ['Reserva', 'Tuya', 'a tu Reserva'],
                ['Reserva', 'Del rival', 'a la Reserva del rival'],
                ['Reserva', 'Del dueño', 'a la Reserva de su dueño'],
                ['Campo', '—', 'al campo'],
                ['Cementerio', '—', 'al Cementerio'],
                ['Exilio', '—', 'al Exilio'],
                ['Pago', '—', 'a su zona de pago'],
                ['Bloqueado', '—', 'a bloqueado'],
                ['Mano', '—', 'a la mano'],
                ['Mazo', '—', 'al mazo'],
              ]}
            />
            <p className="mt-2 text-xs text-gray-500">Ejemplo: "mueve Éter de la Reserva del rival a la Reserva de su dueño"</p>
          </Section>

          {/* 16. NEGANDO EFECTO */}
          <Section title="16. Negando Efecto">
            <p className="mb-2">Cuando se activa <strong>"Negando su efecto"</strong>, el Éter movido no activa sus habilidades (gatillo o pasivo) hasta que el oponente reagroupe en su Alba.</p>
            <p className="text-xs text-gray-500">Se agrega al final del texto: "negando su efecto hasta la próxima Alba del oponente"</p>
          </Section>

          {/* 17. ZONA DE ACTIVACIÓN */}
          <Section title="17. Zona de Activación → Texto">
            <p className="mb-2">Solo para efectos de Éter. Aparece al inicio del texto:</p>
            <Table
              headers={['Zona', 'Texto generado']}
              rows={[
                ['Reserva', 'Mientras esté en tu Reserva'],
                ['Pago', 'Mientras esté en tu zona de pago'],
                ['Bloqueo', 'Mientras esté bloqueado'],
                ['Campo', 'Mientras esté en el campo'],
              ]}
            />
          </Section>

          {/* 18. REAGRUPAR */}
          <Section title="18. Reagrupar → Texto">
            <p className="mb-2">Se agrega al final del texto cuando el efecto tiene costo de éter:</p>
            <Table
              headers={['Fase', 'Turno', 'Texto generado']}
              rows={[
                ['Alba', 'Propio', 'Al inicio de tu Alba reagrupa el Éter usado por este efecto'],
                ['Alba', 'Oponente', 'Al inicio del Alba del oponente reagrupa el Éter usado por este efecto'],
                ['Choque', 'Propio', 'Al inicio de tu Choque reagrupa el Éter usado por este efecto'],
                ['Choque', 'Oponente', 'Al inicio del Choque del oponente reagrupa el Éter usado por este efecto'],
              ]}
            />
          </Section>

          {/* 19. CANTIDADES SOPORTADAS */}
          <Section title="19. Cantidad (Cantidad) — Efectos Soportados">
            <p className="mb-2">El campo "Cantidad" está disponible para estos efectos:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>• draw</div>
              <div>• destroy</div>
              <div>• exile</div>
              <div>• scry</div>
              <div>• tutor</div>
              <div>• return_hand</div>
              <div>• mover</div>
              <div>• return_ether</div>
              <div>• steal_champion</div>
              <div>• steal_ether</div>
              <div>• block_ether</div>
              <div>• free_ether</div>
              <div>• invocar</div>
              <div>• invocar_y_equipar</div>
            </div>
          </Section>

          {/* 20. CONDICIÓN DE ACTIVACIÓN (ARCANA) */}
          <Section title="20. Condición de Activación (Arcana)">
            <p className="mb-2">Campo separado <strong>"Condición de Activación"</strong> (no está dentro de la lista de efectos). Se muestra cuando la carta es una Arcana.</p>

            <h4 className="font-semibold text-gray-200 mt-3 mb-1">Condiciones</h4>
            <Table
              headers={['Condición', 'Texto']}
              rows={[
                ['controlar_minimo', 'si controlas al menos N [tipo]'],
                ['rival_controla_minimo', 'si el rival controla al menos N [tipo]'],
                ['tener_mano_minimo', 'si tienes al menos N cartas en tu mano'],
                ['tener_eter_bloqueado', 'si tienes al menos N Éter bloqueado'],
              ]}
            />

            <h4 className="font-semibold text-gray-200 mt-3 mb-1">Triggers para Condición</h4>
            <Table
              headers={['Trigger', 'Quién', 'Texto']}
              rows={[
                ['inicio_choque', 'Propio', 'Al inicio de tu Choque'],
                ['inicio_choque', 'Rival', 'Al inicio del Choque del rival'],
                ['inicio_alba', 'Propio', 'Al inicio de tu Alba'],
                ['inicio_alba', 'Rival', 'Al inicio de la Alba del rival'],
                ['al_atacar', 'Propio', 'Al atacar'],
                ['al_atacar', 'Rival', 'Al ser atacada'],
                ['al_invocar', 'Propio', 'Al ser invocada'],
                ['al_invocar', 'Rival', 'Al ser invocada por el rival'],
                ['al_resolver_cadena', '—', 'Al resolver la cadena'],
                ['al_activar_habilidad', '—', 'Al activar esta habilidad'],
                ['activacion', '—', '(activación directa sin trigger)'],
              ]}
            />

            <h4 className="font-semibold text-gray-200 mt-3 mb-1">Ejemplo</h4>
            <p className="text-xs">Condición: controlar_minimo(2, campeon) + Trigger: inicio_choque + Quién: Propio</p>
            <p className="text-xs text-ether-400 mt-1 italic">→ "Si controlas al menos 2 Campeones, al inicio de tu Choque..."</p>
          </Section>

          {/* 21. EFECTO COMANDANTE */}
          <Section title="21. Efecto Comandante">
            <p className="mb-2">Campo separado <strong>"Efecto Comandante"</strong> (no está en la lista de efectos). Se muestra cuando <code>catHabilidad</code> incluye <strong>"Comandante"</strong>.</p>
            <p className="mb-2">El efecto comandante aplica a TODOS los Campeones de la misma facción que el comandante.</p>
            <p className="text-xs text-gray-500">Se genera una vista previa del texto debajo del campo.</p>
            <p className="text-xs mt-1">Ejemplo: "Ganan +2 de ATQ y +2 de RES." (aplica a todos los Campeones de Orden)</p>
          </Section>

          {/* 22. PALABRAS CLAVE EN NEGRITA */}
          <Section title="22. Palabras Clave en Negrita">
            <p className="mb-2">Las palabras clave se renderizan en <strong>negrita</strong> en la carta física. Esto se aplica automáticamente al generar el texto.</p>
            <p className="text-xs text-gray-500">Ejemplos: <strong>Doble ataque</strong>, <strong>Ataque directo</strong>, <strong>Bloqueado</strong>, <strong>Vínculo</strong>, etc.</p>
          </Section>

          {/* 23. EJEMPLOS COMPLETOS */}
          <Section title="23. Ejemplos Completos">

            {/* Ejemplo 1: Aurora */}
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-4 mb-4">
              <p className="font-semibold text-gray-200 mb-1">Ejemplo 1: Aurora (Clásico)</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-500">Tipo:</span> Pasivo</div>
                <div><span className="text-gray-500">Trigger:</span> Al invocar</div>
                <div><span className="text-gray-500">Objetivo:</span> Campeón → Rival → Campo</div>
                <div><span className="text-gray-500">Efecto:</span> Robar campeón</div>
                <div><span className="text-gray-500">Duración:</span> Mientras esté en campo</div>
              </div>
              <p className="text-xs text-ether-400 mt-2 italic">→ "Al ser invocada, toma control de un Campeón que controla el rival. Mientras esta carta esté en el campo, controla ese Campeón."</p>
            </div>

            {/* Ejemplo 2: Invocar y Equipar */}
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-4 mb-4">
              <p className="font-semibold text-gray-200 mb-1">Ejemplo 2: Invocar y Equipar</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-500">Tipo:</span> Habilidad</div>
                <div><span className="text-gray-500">Trigger:</span> Al activar habilidad</div>
                <div><span className="text-gray-500">Costo:</span> Éter bloqueado → 3</div>
                <div><span className="text-gray-500">Efecto:</span> Invocar y equipar</div>
                <div><span className="text-gray-500">Zona Origen:</span> Cementerio</div>
                <div><span className="text-gray-500">Filtros:</span> Campeón → coste max 4</div>
              </div>
              <p className="text-xs text-ether-400 mt-2 italic">→ "Al activar esta habilidad, puedes bloquear hasta un máximo de 3 Éter (Max. 3) para invocar un Campeón de coste 4 o menos del Cementerio de su dueño y equipa esta carta a ese Campeón."</p>
            </div>

            {/* Ejemplo 3: Tutor */}
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-4 mb-4">
              <p className="font-semibold text-gray-200 mb-1">Ejemplo 3: Tutor con Destino</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-500">Tipo:</span> Habilidad</div>
                <div><span className="text-gray-500">Trigger:</span> Inicio de Alba</div>
                <div><span className="text-gray-500">Quién:</span> Propio</div>
                <div><span className="text-gray-500">Efecto:</span> Tutor</div>
                <div><span className="text-gray-500">Zona Origen:</span> Mazo</div>
                <div><span className="text-gray-500">Zona Destino:</span> Mano</div>
                <div><span className="text-gray-500">Controlador Destino:</span> Tuya</div>
                <div><span className="text-gray-500">Filtros:</span> Campeón → coste max 4</div>
              </div>
              <p className="text-xs text-ether-400 mt-2 italic">→ "Al inicio de tu Alba, busca 1 Campeón de coste 4 o menos de tu mazo y agregalo a tu mano."</p>
            </div>

            {/* Ejemplo 4: Arcana con Condición */}
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-4 mb-4">
              <p className="font-semibold text-gray-200 mb-1">Ejemplo 4: Arcana con Condición de Activación</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-500">Tipo:</span> Arcana</div>
                <div><span className="text-gray-500">Condición:</span> controlar_minimo(2, campeon)</div>
                <div><span className="text-gray-500">Trigger:</span> Inicio de Choque</div>
                <div><span className="text-gray-500">Quién:</span> Propio</div>
                <div><span className="text-gray-500">Efecto:</span> Draw → 2</div>
              </div>
              <p className="text-xs text-ether-400 mt-2 italic">→ "Si controlas al menos 2 Campeones, al inicio de tu Choque roba 2 cartas."</p>
            </div>

            {/* Ejemplo 5: Vínculo */}
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-4 mb-4">
              <p className="font-semibold text-gray-200 mb-1">Ejemplo 5: Vínculo con Destrucción</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-500">Tipo:</span> Vínculo</div>
                <div><span className="text-gray-500">Trigger:</span> Al ser destruido Vínculo</div>
                <div><span className="text-gray-500">Efecto:</span> Draw → 1</div>
              </div>
              <p className="text-xs text-ether-400 mt-2 italic">→ "Al ser destruido este Vínculo, roba 1 carta."</p>
            </div>

            {/* Ejemplo 6: Bloqueo Fijo */}
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-4 mb-4">
              <p className="font-semibold text-gray-200 mb-1">Ejemplo 6: Bloqueo Fijo</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-500">Tipo:</span> Habilidad</div>
                <div><span className="text-gray-500">Trigger:</span> Al activar habilidad</div>
                <div><span className="text-gray-500">Costo:</span> Bloqueo fijo → 3</div>
                <div><span className="text-gray-500">Efecto:</span> Buff</div>
                <div><span className="text-gray-500">Stats:</span> ATQ +3</div>
                <div><span className="text-gray-500">Objetivo:</span> Campeón → Propio → Campo</div>
                <div><span className="text-gray-500">Duración:</span> Este turno</div>
              </div>
              <p className="text-xs text-ether-400 mt-2 italic">→ "Al activar esta habilidad, bloquea 3 Éter para que un Campeón que controles gane +3 de ATQ hasta el final del turno."</p>
            </div>

            {/* Ejemplo 7: Ranking Filter */}
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-4 mb-4">
              <p className="font-semibold text-gray-200 mb-1">Ejemplo 7: Ranking Filter (Mayor ATQ)</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-500">Tipo:</span> Habilidad</div>
                <div><span className="text-gray-500">Trigger:</span> Inicio de Choque</div>
                <div><span className="text-gray-500">Costo:</span> Agotar</div>
                <div><span className="text-gray-500">Efecto:</span> Debuff</div>
                <div><span className="text-gray-500">Stats:</span> ATQ -2</div>
                <div><span className="text-gray-500">Objetivo:</span> Campeón → Rival → Campo</div>
                <div><span className="text-gray-500">Seleccionar:</span> Mayor ATQ</div>
                <div><span className="text-gray-500">Duración:</span> Este turno</div>
              </div>
              <p className="text-xs text-ether-400 mt-2 italic">→ "Al inicio de tu Choque, puedes agotar esta carta para que el Campeón con mayor ATQ que controla el rival pierda -2 de ATQ hasta el final del turno."</p>
            </div>

            {/* Ejemplo 8: Devolver con "Hasta" */}
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
              <p className="font-semibold text-gray-200 mb-1">Ejemplo 8: Devolver con Checkbox "Hasta"</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-500">Tipo:</span> Habilidad</div>
                <div><span className="text-gray-500">Trigger:</span> Al invocar</div>
                <div><span className="text-gray-500">Costo:</span> Éter → 2</div>
                <div><span className="text-gray-500">Efecto:</span> Return Ether</div>
                <div><span className="text-gray-500">Cantidad:</span> 3</div>
                <div><span className="text-gray-500">Hasta:</span> ✓</div>
                <div><span className="text-gray-500">Zona Destino:</span> Reserva</div>
                <div><span className="text-gray-500">Controlador Destino:</span> Del rival</div>
                <div><span className="text-gray-500">Objetivo:</span> Éter → Rival → Pagado</div>
                <div><span className="text-gray-500">Reagrupar:</span> Alba → Propio</div>
              </div>
              <p className="text-xs text-ether-400 mt-2 italic">→ "Al ser invocada, puedes pagar 2 Éter para devolver hasta 3 Éter de su zona de pago a la Reserva del rival. Al inicio de tu Alba reagrupa el Éter usado por este efecto."</p>
            </div>

          </Section>

        </div>

        <div className="px-6 py-3 border-t border-gray-700 bg-surface flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-ether-600 hover:bg-ether-500 text-white text-sm rounded transition-colors cursor-pointer">Cerrar</button>
        </div>
      </div>
    </div>
  )
}
