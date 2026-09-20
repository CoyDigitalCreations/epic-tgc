/**
 * CondicionArcanaField — Campo de condición de activación para Arcanas.
 * Separado del sistema de efectos: la condición es un atributo de la carta,
 * no de un efecto.
 *
 * Estructura: trigger (cuándo se verifica) + condiciones[] (qué se evalúa).
 */
import type { CondicionEfecto, CondicionItem } from '../../../shared/types/cards'

interface CondicionArcanaFieldProps {
  value?: CondicionEfecto
  onChange: (val: CondicionEfecto | undefined) => void
}

const TRIGGER_OPTIONS = [
  { value: 'inicio_choque', label: 'Inicio de Choque' },
  { value: 'inicio_alba', label: 'Inicio de Alba' },
  { value: 'al_atacar', label: 'Al atacar' },
  { value: 'al_invocar', label: 'Al invocar' },
  { value: 'al_resolver_cadena', label: 'Al resolver cadena' },
  { value: 'al_activar_habilidad', label: 'Al activar habilidad' },
  { value: 'activacion', label: 'Al activar (guard)' },
]

const CONTROLADOR_TRIGGER_OPTIONS = [
  { value: '', label: 'Propio (tu turno)' },
  { value: 'rival', label: 'Rival' },
]

const CONDICION_TIPO_OPTIONS = [
  { value: 'controlar_minimo', label: 'Controlar N+ unidades' },
  { value: 'rival_controla_minimo', label: 'Rival controla N+ unidades' },
  { value: 'tener_mano_minimo', label: 'Tener N+ cartas en mano' },
  { value: 'tener_eter_bloqueado', label: 'Tener éter bloqueado' },
]

function SelectField({ label, value, options, onChange }: { label: string; value?: string; options: { value: string; label: string }[]; onChange: (v: string | undefined) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-wider text-gray-400">{label}</label>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)}
        className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200">
        <option value="">— Seleccionar —</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function NumberInput({ label, value, onChange, min, max }: { label: string; value?: number; onChange: (v: number | undefined) => void; min?: number; max?: number }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-wider text-gray-400">{label}</label>
      <input type="number" value={value ?? ''} onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : undefined)}
        min={min} max={max} className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 w-20" />
    </div>
  )
}

/** Texto legible de una condición individual */
function condicionItemTexto(c: CondicionItem, trigger?: string): string {
  const usaSubjuntivo = trigger === 'activacion'
  const esRival = c.objetivo?.controlador === 'rival'

  const tipoTexts: Record<string, string> = {
    'controlar_minimo': esRival ? 'el rival controle' : (usaSubjuntivo ? 'controles' : 'controlas'),
    'rival_controla_minimo': esRival ? 'el rival controle' : 'el rival controla',
    'tener_mano_minimo': 'tienes',
    'tener_eter_bloqueado': 'tienes',
  }
  const tipo = tipoTexts[c.tipo] || c.tipo

  if (c.tipo === 'tener_eter_bloqueado') return 'tienes éter bloqueado'

  const objetivoTipo = c.objetivo?.tipo === 'campeon' ? 'Campeones' : c.objetivo?.tipo === 'mistica' ? 'Místicas' : 'unidades'
  const filtro = c.objetivo?.filtros?.conEterBloqueado === true ? ' con éter bloqueado' : ''
  const cantidad = c.cantidad ?? 1

  return `${tipo} ${cantidad} o más ${objetivoTipo}${filtro}`
}

/** Texto completo de la condición (para preview) */
export function condicionArcanaTexto(condicion: CondicionEfecto): string {
  const esRival = condicion.controladorTrigger === 'rival'

  const triggerTexts: Record<string, { propio: string; rival: string }> = {
    'inicio_choque': { propio: 'Al inicio de tu Choque', rival: 'Al inicio del Choque del rival' },
    'inicio_alba': { propio: 'Al inicio de tu Alba', rival: 'Al inicio de la Alba del rival' },
    'al_atacar': { propio: 'Al atacar', rival: 'Al atacar el rival' },
    'al_invocar': { propio: 'Al invocar', rival: 'Al invocar el rival' },
    'al_resolver_cadena': { propio: 'Al resolver la cadena', rival: 'Al resolver la cadena el rival' },
    'al_activar_habilidad': { propio: 'Al activar esta habilidad', rival: 'Al activar esta habilidad el rival' },
    'activacion': { propio: 'Mientras', rival: 'Mientras el rival' },
  }
  const trigger = triggerTexts[condicion.trigger]?.[esRival ? 'rival' : 'propio'] ?? condicion.trigger

  if (!condicion.condiciones || condicion.condiciones.length === 0) {
    return trigger
  }

  const partes = condicion.condiciones.map((c) => condicionItemTexto(c, condicion.trigger))
  const condicionStr = partes.join(' y ')

  // 'activacion' usa "Mientras..." en vez de "Al..., si..."
  if (condicion.trigger === 'activacion') {
    return `${trigger} ${condicionStr}.`
  }

  return `${trigger}, si ${condicionStr}.`
}

export function CondicionArcanaField({ value, onChange }: CondicionArcanaFieldProps) {
  // Handle legacy string values and undefined — normalize to CondicionEfecto
  const condicion: CondicionEfecto = (value && typeof value === 'object' && 'trigger' in value)
    ? value as CondicionEfecto
    : { trigger: 'inicio_choque', condiciones: [] }

  const updateTrigger = (trigger: string) => {
    onChange({ ...condicion, trigger: trigger as CondicionEfecto['trigger'] })
  }

  const updateControladorTrigger = (controlador: string) => {
    onChange({ ...condicion, controladorTrigger: controlador === 'rival' ? 'rival' : undefined })
  }

  const updateCondicionItem = (idx: number, patch: Partial<CondicionItem>) => {
    const newConds = [...(condicion.condiciones ?? [])]
    newConds[idx] = { ...newConds[idx], ...patch }
    onChange({ ...condicion, condiciones: newConds })
  }

  const removeCondicionItem = (idx: number) => {
    const newConds = condicion.condiciones.filter((_, i) => i !== idx)
    onChange({ ...condicion, condiciones: newConds })
  }

  const addCondicionItem = () => {
    const newItem: CondicionItem = {
      tipo: 'controlar_minimo',
      cantidad: 2,
      objetivo: { tipo: 'campeon', controlador: 'propio' },
    }
    onChange({ ...condicion, condiciones: [...(condicion.condiciones ?? []), newItem] })
  }

  const texto = condicionArcanaTexto(condicion)

  return (
    <div className="border border-ether-600/30 rounded-lg p-3 bg-gray-900/50">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-ether-300">Condición de Activación</p>
        {texto && (
          <p className="text-[10px] text-gray-500 italic truncate max-w-60" title={texto}>— {texto}</p>
        )}
      </div>

      {/* Trigger */}
      <div className="grid grid-cols-2 gap-2">
        <SelectField label="Trigger" value={condicion.trigger} options={TRIGGER_OPTIONS} onChange={updateTrigger} />
        <SelectField label="Quién" value={condicion.controladorTrigger === 'rival' ? 'rival' : ''} options={CONTROLADOR_TRIGGER_OPTIONS} onChange={updateControladorTrigger} />
      </div>

      {/* Condiciones */}
      <div className="mt-3 space-y-2">
        {condicion.condiciones.length === 0 && (
          <p className="text-[10px] text-gray-500 italic">Sin condiciones — la Arcana se activa siempre que se dispare el trigger.</p>
        )}

        {condicion.condiciones.map((c, i) => (
          <div key={i} className="border border-gray-600/30 rounded p-2 bg-gray-800/30">
            <div className="flex gap-2 items-end">
              <SelectField
                label={`Condición ${i + 1}`}
                value={c.tipo}
                options={CONDICION_TIPO_OPTIONS}
                onChange={(v) => updateCondicionItem(i, { tipo: v as CondicionItem['tipo'] })}
              />
              {c.tipo?.includes('minimo') && (
                <NumberInput
                  label="Cantidad"
                  value={c.cantidad}
                  onChange={(v) => updateCondicionItem(i, { cantidad: v })}
                  min={1}
                  max={10}
                />
              )}
              <button
                onClick={() => removeCondicionItem(i)}
                className="text-xs text-red-400 hover:text-red-300 px-1 mb-1"
              >
                ✕
              </button>
            </div>

            {/* Target config */}
            {c.tipo !== 'tener_eter_bloqueado' && c.tipo !== 'tener_mano_minimo' && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <SelectField
                  label="Tipo objetivo"
                  value={c.objetivo?.tipo}
                  options={[
                    { value: 'campeon', label: 'Campeón' },
                    { value: 'mistica', label: 'Mística' },
                    { value: 'arcana', label: 'Arcana' },
                  ]}
                  onChange={(v) => updateCondicionItem(i, {
                    objetivo: { ...c.objetivo!, tipo: v as any, controlador: c.objetivo?.controlador ?? 'propio' },
                  })}
                />
                <SelectField
                  label="Controlador"
                  value={c.objetivo?.controlador}
                  options={[
                    { value: 'propio', label: 'Propio' },
                    { value: 'rival', label: 'Rival' },
                  ]}
                  onChange={(v) => updateCondicionItem(i, {
                    objetivo: { ...c.objetivo!, controlador: v as any, tipo: c.objetivo?.tipo ?? 'campeon' },
                  })}
                />
              </div>
            )}

            {/* Filtros de campeón */}
            {c.objetivo?.tipo === 'campeon' && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <SelectField
                  label="Éter bloqueado"
                  value={c.objetivo?.filtros?.conEterBloqueado?.toString()}
                  options={[
                    { value: '', label: 'Cualquiera' },
                    { value: 'true', label: 'Con éter bloqueado' },
                    { value: 'false', label: 'Sin éter bloqueado' },
                  ]}
                  onChange={(v) => updateCondicionItem(i, {
                    objetivo: {
                      ...c.objetivo!,
                      filtros: { ...c.objetivo?.filtros, conEterBloqueado: v === '' ? undefined : v === 'true' },
                    },
                  })}
                />
                <SelectField
                  label="Agotamiento"
                  value={c.objetivo?.filtros?.agotado?.toString()}
                  options={[
                    { value: '', label: 'Cualquiera' },
                    { value: 'true', label: 'Esté agotado' },
                    { value: 'false', label: 'No esté agotado' },
                  ]}
                  onChange={(v) => updateCondicionItem(i, {
                    objetivo: {
                      ...c.objetivo!,
                      filtros: { ...c.objetivo?.filtros, agotado: v === '' ? undefined : v === 'true' },
                    },
                  })}
                />
              </div>
            )}
          </div>
        ))}

        <button
          onClick={addCondicionItem}
          className="text-xs text-ether-400 hover:text-ether-300"
        >
          + Agregar condición
        </button>
      </div>
    </div>
  )
}
