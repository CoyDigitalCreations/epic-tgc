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
            <p>Cada efecto se construye seleccionando opciones en dropdowns. El motor lee los campos estructurados directamente.</p>
          </Section>

          {/* 2. TEXTO AUTO-GENERADO — TRIGGER */}
          <Section title="2. Trigger → Texto">
            <p className="mb-2">Cuándo se activa el efecto:</p>
            <Table
              headers={['Trigger', 'Texto generado']}
              rows={[
                ['al_invocar', 'Al ser invocada'],
                ['al_atacar', 'Al atacar'],
                ['al_matar_en_combate', 'Al matar en combate'],
                ['al_pagar_eter', 'Cuando pagues esta carta'],
                ['inicio_choque', 'Al inicio de tu Choque'],
                ['inicio_alba', 'Al inicio de tu Alba'],
                ['al_jugar_mistica', 'Al jugar esta Mística'],
                ['al_resolver_cadena', 'Al resolver la cadena'],
                ['al_activar_habilidad', 'Al activar esta habilidad'],
                ['al_ser_enviado_al_cementerio', 'Al ser enviada al Cementerio'],
                ['al_ser_destruido_vinculo', 'Al ser destruido este Vínculo'],
              ]}
            />
          </Section>

          {/* 3. TEXTO AUTO-GENERADO — COSTO */}
          <Section title="3. Costo → Texto">
            <p className="mb-2">Qué paga el jugador para activar:</p>
            <Table
              headers={['Costo', 'Cantidad', 'Texto generado']}
              rows={[
                ['Éter', '1', 'puedes pagar 1 Éter'],
                ['Éter', '2', 'puedes pagar 2 Éter'],
                ['Éter bloqueado', '1', 'puedes bloquear 1 Éter (Max. 1)'],
                ['Éter bloqueado', '2', 'puedes bloquear 2 Éter (Max. 2)'],
                ['Agotar', '—', 'puedes agotar esta carta'],
              ]}
            />
            <p className="mt-2 text-gray-500 text-xs">Nota: cuando el efecto es "bloquear éter", se usa "puedes bloquear" en vez de "puedes pagar".</p>
          </Section>

          {/* 4. TEXTO AUTO-GENERADO — OBJETIVO */}
          <Section title="4. Objetivo → Texto (3 capas)">
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

            <h4 className="font-semibold text-gray-200 mt-3 mb-1">Filtros adicionales</h4>
            <p className="mb-1">Aparecen al seleccionar objetivo. Se agregan como prefijo:</p>
            <Table
              headers={['Filtro', 'Texto generado']}
              rows={[
                ['Tipo: Campeón', 'una carta Campeón...'],
                ['Facción: Orden', '...una carta Campeón Orden...'],
                ['Esencia: Céleste', '...una carta Campeón Orden Céleste...'],
                ['Rol: Soberano', '...una carta Campeón Orden Céleste Soberano...'],
                ['Coste max: 2', '...una carta Campeón coste 2 o menos...'],
                ['ATQ max: 5', '...una carta Campeón ATQ 5 o menos...'],
                ['RES max: 3', '...una carta Campeón RES 3 o menos...'],
              ]}
            />
          </Section>

          {/* 5. TEXTO AUTO-GENERADO — EFECTO */}
          <Section title="5. Efecto → Texto">
            <p className="mb-2">Qué hace el efecto (se conjuga en plural si el objetivo es plural):</p>
            <Table
              headers={['Efecto', 'Singular', 'Plural']}
              rows={[
                ['Buff', 'gana', 'ganan'],
                ['Debuff', 'pierde', 'pierden'],
                ['Destruir', 'destruye', 'destruyen'],
                ['Robar', 'roba 1 carta', 'roba 2 cartas'],
                ['Devolver a mano', 'devuelve a la mano', 'devuelven a la mano'],
                ['Robar campeón', 'toma control de', 'toman control de'],
                ['Robar éter', 'toma control de', 'toman control de'],
                ['Bloquear éter', 'bloquea', 'bloquean'],
                ['Liberar éter', 'libera', 'liberan'],
                ['Devolver éter', 'devuelve', 'devuelven'],
                ['Mover éter', 'mueve', 'mueven'],
                ['Exiliar', 'exilia', 'exilian'],
                ['Toggle agotamiento', 'cambia el agotamiento de', 'cambian el agotamiento de'],
                ['Prevenir destrucción', 'no es destruido', 'no son destruidos'],
              ]}
            />
            <p className="mt-2 text-gray-500 text-xs">La cantidad (campo "Cantidad") se incluye para: Robar, Destruir, Devolver, Exiliar. Ejemplo: "roba 2 cartas".</p>
          </Section>

          {/* 6. TEXTO AUTO-GENERADO — DURACIÓN */}
          <Section title="6. Duración → Texto">
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

          {/* 7. TEXTO AUTO-GENERADO — FRECUENCIA */}
          <Section title="7. Frecuencia → Texto">
            <Table
              headers={['Frecuencia', 'Texto generado']}
              rows={[
                ['1 por turno', 'una vez por turno'],
                ['Ilimitado', '(no se agrega texto adicional)'],
              ]}
            />
          </Section>

          {/* 7b. ZONA DESTINO — MOVER ÉTER */}
          <Section title="7b. Zona Destino → Mover Éter">
            <p className="mb-2">Cuando el efecto es <strong>mover</strong>, <strong>devolver éter</strong>, <strong>liberar éter</strong> o <strong>bloquear éter</strong>, se agrega la zona destino:</p>
            <Table
              headers={['Zona Destino', 'Texto generado']}
              rows={[
                ['Campo', 'al campo'],
                ['Cementerio', 'al Cementerio'],
                ['Exilio', 'al Exilio'],
                ['Reserva', 'a la Reserva'],
                ['Pago', 'a su zona de pago'],
                ['Bloqueado', 'a bloqueado'],
                ['Mano', 'a la mano'],
                ['Mazo', 'al mazo'],
              ]}
            />
            <p className="mt-2 text-gray-500 text-xs">Ejemplo: "mueve Éter de la Reserva del rival a su zona de pago"</p>
          </Section>

          {/* 7c. NEGANDO EFECTO */}
          <Section title="7c. Negando Efecto">
            <p className="mb-2">Cuando se activa <strong>"Negando su efecto"</strong>, el Éter movido no activa sus habilidades (gatillo o pasivo) hasta que el oponente reagroupe en su Alba.</p>
            <p className="text-xs text-gray-500">Se agrega al final del texto: "negando su efecto hasta la próxima Alba del oponente"</p>
          </Section>

          {/* 8. TEXTO AUTO-GENERADO — ZONA DE ACTIVACIÓN */}
          <Section title="8. Zona de Activación → Texto">
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

          {/* 9. TEXTO AUTO-GENERADO — REAGRUPAR */}
          <Section title="9. Reagrupar → Texto">
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

          {/* 1. INTRODUCCIÓN */}
          <Section title="10. Filtros de Objetivo → Texto">
            <p className="mb-2">Se agregan como prefijo al objetivo. Ejemplo: "una carta Campeón Orden coste 2 o menos un Campeón del Cementerio"</p>
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
          </Section>

          {/* 11. EJEMPLO COMPLETO — AURORA */}
          <Section title="11. Ejemplo Completo: Aurora">
            <div className="bg-gray-800/50 rounded-lg p-4 space-y-4">
              <div>
                <p className="font-semibold text-gray-200 mb-1">Efecto #1: Pasivo</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-gray-500">Tipo:</span> Pasivo</div>
                  <div><span className="text-gray-500">Trigger:</span> Al invocar</div>
                  <div><span className="text-gray-500">Objetivo:</span> Campeón → Rival → Campo</div>
                  <div><span className="text-gray-500">Efecto:</span> Robar campeón</div>
                  <div><span className="text-gray-500">Duración:</span> Mientras esté en campo</div>
                </div>
                <p className="text-xs text-ether-400 mt-2 italic">→ "Al ser invocada, toma control de un Campeón que controla el rival. Mientras esta carta esté en el campo, controla ese Campeón."</p>
              </div>
              <div className="border-t border-gray-700 pt-4">
                <p className="font-semibold text-gray-200 mb-1">Efecto #2: Continuo</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-gray-500">Tipo:</span> Continuo</div>
                  <div><span className="text-gray-500">Costo:</span> Éter bloqueado → 2</div>
                  <div><span className="text-gray-500">Reagrupar:</span> Alba → Propio</div>
                  <div><span className="text-gray-500">Objetivo:</span> Campeón → Propio → Campo</div>
                  <div><span className="text-gray-500">Efecto:</span> Buff</div>
                  <div><span className="text-gray-500">Stats:</span> ATQ +2, RES +2</div>
                  <div><span className="text-gray-500">Duración:</span> Mientras éter bloqueado</div>
                </div>
                <p className="text-xs text-ether-400 mt-2 italic">→ "Puedes bloquear hasta un máximo de 2 Éter (Max. 2) para que un Campeón que controles gane +2 de ATQ y +2 de RES mientras ese Éter esté bloqueado. Al inicio de tu Alba reagrupa el Éter usado por este efecto."</p>
              </div>
              <div className="border-t border-gray-700 pt-4">
                <p className="font-semibold text-gray-200 mb-1">Efecto #3: Comandante</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-gray-500">Efecto:</span> Buff</div>
                  <div><span className="text-gray-500">Stats:</span> ATQ +2, RES +2</div>
                </div>
                <p className="text-xs text-ether-400 mt-2 italic">→ "Ganan +2 de ATQ y +2 de RES." (aplica a todos los Campeones de Orden)</p>
              </div>
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
