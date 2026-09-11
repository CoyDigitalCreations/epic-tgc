/**
 * EffectField — Structured effect editor with 11-layer system.
 * Shows/hides fields based on effect type selection.
 */
import type { EfectoData, CardType, CostoEfecto, ObjetivoEfecto, FiltroObjetivo, CondicionEfecto, CopyAttribute } from '../../../shared/types/cards'
import { FACCIONES, ESENCIAS, ROLES, KEYWORDS, CAT_HABILIDAD } from '../../../shared/types/enums'

interface EffectFieldProps {
  label: string
  value?: EfectoData
  onChange: (val: EfectoData | undefined) => void
  cardType?: CardType
}

// ── Option lists ──
const TIPO_OPTIONS = [
  { value: 'pasivo', label: 'Pasivo' }, { value: 'continuo', label: 'Continuo' },
  { value: 'disparo', label: 'Disparo' }, { value: 'comandante', label: 'Comandante' },
  { value: 'reserva', label: 'Reserva' }, { value: 'pago', label: 'Pago' },
  { value: 'bloqueo', label: 'Bloqueo' }, { value: 'hechizo', label: 'Hechizo' },
  { value: 'vinculo', label: 'Vínculo' },
]
const TRIGGER_OPTIONS = [
  { value: 'ninguno', label: 'Ninguno' }, { value: 'al_invocar', label: 'Al invocar' },
  { value: 'al_atacar', label: 'Al atacar' }, { value: 'al_matar_en_combate', label: 'Al matar en combate' },
  { value: 'al_pagar_eter', label: 'Al pagar éter' }, { value: 'inicio_choque', label: 'Inicio de Choque' },
  { value: 'inicio_alba', label: 'Inicio de Alba' }, { value: 'al_jugar_mistica', label: 'Al jugar Mística' },
  { value: 'al_resolver_cadena', label: 'Al resolver cadena' }, { value: 'al_activar_habilidad', label: 'Al activar habilidad' },
  { value: 'al_ser_enviado_al_cementerio', label: 'Al ir al cementerio' }, { value: 'al_ser_destruido_vinculo', label: 'Al destruir Vínculo' },
  { value: 'cuando_vinculo_seria_destruido', label: 'Cuando Vínculo sería destruido' },
]
const COSTO_OPTIONS = [
  { value: 'ninguno', label: 'Sin costo' }, { value: 'eter', label: 'Éter' },
  { value: 'eter_bloqueado', label: 'Éter bloqueado' }, { value: 'exhaust', label: 'Agotar' },
]
const REQUISITO_OPTIONS = [
  { value: 'ninguno', label: 'Sin requisito' },
  { value: 'exile_self', label: 'Exiliar esta carta' },
  { value: 'cemetery_self', label: 'Enviar al Cementerio' },
]
// ── Effect Categories (shared by UI and motor) ──
export const EFFECT_CATEGORIES = [
  {
    nombre: 'Modificadores',
    efectos: ['buff', 'debuff', 'grant_keyword', 'toggle_exhaust'] as const,
  },
  {
    nombre: 'Control',
    efectos: ['steal_champion', 'steal_ether', 'redirect', 'copy', 'change_type'] as const,
  },
  {
    nombre: 'Destrucción',
    efectos: ['destroy', 'exile', 'prevent_destroy'] as const,
  },
  {
    nombre: 'Movimiento',
    efectos: ['return_hand', 'return_ether', 'mover', 'recuperar_campo', 'recuperar_mano', 'recuperar_mazo', 'recuperar_mazo_barajar', 'recuperar_mazo_top', 'recuperar_mazo_bottom', 'recuperar_exilio'] as const,
  },
  {
    nombre: 'Éter',
    efectos: ['block_ether', 'free_ether', 'return_ether'] as const,
  },
  {
    nombre: 'Robo',
    efectos: ['draw', 'scry', 'tutor'] as const,
  },
  {
    nombre: 'Combate',
    efectos: ['double_attack', 'direct_attack'] as const,
  },
  {
    nombre: 'Negación',
    efectos: ['negar'] as const,
  },
]

const EFECTO_OPTIONS = [
  { value: 'buff', label: 'Buff' }, { value: 'debuff', label: 'Debuff' },
  { value: 'destroy', label: 'Destruir' }, { value: 'exile', label: 'Exiliar' },
  { value: 'return_hand', label: 'Devolver a mano' }, { value: 'draw', label: 'Robar cartas' },
  { value: 'steal_champion', label: 'Robar campeón' }, { value: 'steal_ether', label: 'Robar éter' },
  { value: 'block_ether', label: 'Bloquear éter' }, { value: 'free_ether', label: 'Liberar éter' },
  { value: 'return_ether', label: 'Devolver éter' }, { value: 'mover', label: 'Mover éter' },
  { value: 'negar', label: 'Negar' },
  { value: 'toggle_exhaust', label: 'Toggle agotamiento' },
  { value: 'prevent_destroy', label: 'Prevenir destrucción' }, { value: 'scry', label: 'Mirar cartas' },
  { value: 'tutor', label: 'Buscar carta' },
  { value: 'copy', label: 'Copiar' }, { value: 'redirect', label: 'Redirigir' },
  { value: 'double_attack', label: 'Atacar dos veces' }, { value: 'direct_attack', label: 'Ataque directo' },
  { value: 'change_type', label: 'Cambiar tipo' }, { value: 'grant_keyword', label: 'Dar keyword' },
  { value: 'recuperar_campo', label: 'Invocar del cementerio' }, { value: 'recuperar_mano', label: 'Devolver a mano desde zona' },
  { value: 'recuperar_mazo', label: 'Devolver a mazo' }, { value: 'recuperar_mazo_barajar', label: 'Devolver a mazo y barajar' },
  { value: 'recuperar_mazo_top', label: 'Poner en tope de mazo' }, { value: 'recuperar_mazo_bottom', label: 'Poner en fondo de mazo' },
  { value: 'recuperar_exilio', label: 'Devolver del Exilio' },
]
const DURACION_OPTIONS = [
  { value: 'permanente', label: 'Permanente' }, { value: 'turno', label: 'Este turno' },
  { value: 'hasta_alba', label: 'Hasta tu Alba' }, { value: 'hasta_alba_oponente', label: 'Hasta la Alba del oponente' },
  { value: 'mientras_ester_bloqueado', label: 'Mientras éter bloqueado' },
  { value: 'mientras_en_campo', label: 'Mientras esté en campo' }, { value: 'mientras_equipped', label: 'Mientras equipado' },
  { value: '1_por_turno', label: '1 por turno' }, { value: 'n_turnos', label: 'N turnos' },
]
const OBJETIVO_TIPO_OPTIONS = [
  { value: 'self', label: 'Esta carta' }, { value: 'campeon', label: 'Campeón' },
  { value: 'mistica', label: 'Mística' }, { value: 'arcana', label: 'Arcana' },
  { value: 'mistica_arcana', label: 'Mística / Arcana' }, { value: 'eter', label: 'Éter' },
  { value: 'vinculo', label: 'Vínculo' }, { value: 'carta', label: 'Carta' }, { value: 'mano', label: 'Mano' },
  { value: 'todos_campeones_propios', label: 'Todos tus Campeones' },
  { value: 'todos_campeones_rivales', label: 'Todos los rivales' },
  { value: 'rival_hand', label: 'Mano del rival' },
  { value: 'equipped_champion', label: 'Campeón equipado' },
]
const CONTROLADOR_OPTIONS = [
  { value: 'propio', label: 'Propio' }, { value: 'rival', label: 'Rival' },
  { value: 'ambos', label: 'Ambos' }, { value: 'ninguno', label: 'Ninguno' },
]
const ZONA_OPTIONS = [
  { value: 'campo', label: 'Campo' }, { value: 'cementerio', label: 'Cementerio' },
  { value: 'exilio', label: 'Exilio' }, { value: 'reserva', label: 'Reserva' },
  { value: 'pagado', label: 'Pagado' }, { value: 'bloqueado', label: 'Bloqueado' },
  { value: 'mano', label: 'Mano' }, { value: 'mazo', label: 'Mazo' },
]
const FILTRO_TIPO_OPTIONS = [
  { value: 'campeon', label: 'Campeón' }, { value: 'mistica', label: 'Mística' }, { value: 'arcana', label: 'Arcana' },
]
const CONDICION_TRIGGER_OPTIONS = [
  { value: 'inicio_choque', label: 'Inicio de Choque' }, { value: 'inicio_alba', label: 'Inicio de Alba' },
  { value: 'al_atacar', label: 'Al atacar' }, { value: 'al_invocar', label: 'Al invocar' },
  { value: 'al_resolver_cadena', label: 'Al resolver cadena' }, { value: 'al_activar_habilidad', label: 'Al activar habilidad' },
]
const CONDICION_TIPO_OPTIONS = [
  { value: 'controlar_minimo', label: 'Controlar N+ unidades' },
  { value: 'rival_controla_minimo', label: 'Rival controla N+ unidades' },
  { value: 'tener_mano_minimo', label: 'Tener N+ cartas en mano' },
  { value: 'tener_eter_bloqueado', label: 'Tener éter bloqueado' },
]

/** Opciones de atributos copiables (para efecto 'copy'), agrupados por tipo de carta */
const COPY_ATTRIBUTE_OPTIONS: { value: CopyAttribute; label: string; description: string; group: string }[] = [
  // Campeón
  { value: 'faccion', label: 'Facción', description: 'Copia las facciones del campeón', group: 'Campeón' },
  { value: 'keyword', label: 'Keyword', description: 'Copia las keywords del campeón', group: 'Campeón' },
  { value: 'atq', label: 'ATQ', description: 'Copia el ATQ base (sin mods temporales)', group: 'Campeón' },
  { value: 'res', label: 'RES', description: 'Copia el RES base (sin mods temporales)', group: 'Campeón' },
  { value: 'efecto', label: 'Efecto', description: 'Copia pasivo/continuo/disparo (NO comandante)', group: 'Campeón' },
  // Mística
  { value: 'mistica_hechizo', label: 'Hechizo', description: 'Copia el efecto de hechizo', group: 'Mística' },
  { value: 'mistica_continuo', label: 'Continuo', description: 'Copia el efecto continuo', group: 'Mística' },
  // Arcana
  { value: 'arcana_condicion', label: 'Condición', description: 'Copia la condición de activación', group: 'Arcana' },
  { value: 'arcana_recompensa', label: 'Recompensa', description: 'Copia la recompensa', group: 'Arcana' },
  // Éter
  { value: 'eter_reserva', label: 'Reserva', description: 'Copia el efecto en reserva', group: 'Éter' },
  { value: 'eter_pago', label: 'Pago', description: 'Copia el efecto al pagar', group: 'Éter' },
  { value: 'eter_bloqueo', label: 'Bloqueo', description: 'Copia el efecto al bloquear', group: 'Éter' },
  // Vínculo
  { value: 'vinculo_efecto', label: 'Efecto', description: 'Copia el efecto del vínculo', group: 'Vínculo' },
]

/** Agrupa atributos por tipo de carta para el UI */
function groupCopyAttributes(attrs: typeof COPY_ATTRIBUTE_OPTIONS): Record<string, typeof COPY_ATTRIBUTE_OPTIONS> {
  const groups: Record<string, typeof COPY_ATTRIBUTE_OPTIONS> = {}
  for (const attr of attrs) {
    if (!groups[attr.group]) groups[attr.group] = []
    groups[attr.group].push(attr)
  }
  return groups
}

// ── Allowed types per card type ──
const CARD_TYPE_EFFECTS: Record<CardType, string[]> = {
  'Campeón': ['pasivo', 'continuo', 'disparo', 'comandante'],
  'Mística': ['hechizo'], 'Arcana': ['pasivo', 'hechizo'],
  'Éter': ['reserva', 'pago', 'bloqueo'], 'Vínculo': ['vinculo'],
}

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

function GroupedSelectField({ label, value, categories, onChange }: { label: string; value?: string; categories: { nombre: string; efectos: readonly string[] }[]; onChange: (v: string | undefined) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-wider text-gray-400">{label}</label>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)}
        className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200">
        <option value="">— Seleccionar —</option>
        {categories.map((cat) => (
          <optgroup key={cat.nombre} label={cat.nombre}>
            {cat.efectos.map((efecto) => {
              const option = EFECTO_OPTIONS.find((o) => o.value === efecto)
              return option ? (
                <option key={option.value} value={option.value}>{option.label}</option>
              ) : null
            })}
          </optgroup>
        ))}
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

export function EffectField({ label, value, onChange, cardType }: EffectFieldProps) {
  const data: EfectoData = value ?? { tipo: 'pasivo', efecto: 'buff' }

  const update = (patch: Partial<EfectoData>) => onChange({ ...data, ...patch })
  const updateCosto = (patch: Partial<CostoEfecto>) => update({ costo: { tipo: 'ninguno', ...data.costo, ...patch } })
  const updateObjetivo = (patch: Partial<ObjetivoEfecto>) => update({ objetivo: { tipo: 'campeon', controlador: 'propio', zona: 'campo', ...data.objetivo, ...patch } })
  const updateFiltros = (patch: Partial<FiltroObjetivo>) => {
    const currentObjetivo = data.objetivo || { tipo: 'campeon' as const, controlador: 'propio' as const, zona: 'campo' as const }
    update({ objetivo: { ...currentObjetivo, filtros: { ...currentObjetivo.filtros, ...patch } } })
  }
  const updateCondicion = (patch: Partial<CondicionEfecto>) => {
    const current = data.condicion && typeof data.condicion === 'object' ? data.condicion : { trigger: 'inicio_choque' as const, condiciones: [] }
    update({ condicion: { ...current, ...patch } })
  }

  // Filter types by card type
  const tipoOptions = cardType ? TIPO_OPTIONS.filter((o) => (CARD_TYPE_EFFECTS[cardType] || []).includes(o.value)) : TIPO_OPTIONS
  const showCost = data.tipo === 'disparo' || data.tipo === 'continuo' || data.tipo === 'hechizo'
  const showRequisito = data.tipo === 'pasivo'
  const showTrigger = data.tipo !== 'comandante'
  const showObjetivo = data.tipo !== 'comandante'
  const showStats = data.efecto === 'buff' || data.efecto === 'debuff'
  const showCantidad = data.efecto ? ['draw', 'destroy', 'exile', 'scry', 'tutor', 'mover', 'return_ether'].includes(data.efecto) : false
  const showKeyword = data.efecto === 'grant_keyword'
  const showDuracion = data.tipo !== 'comandante'
  const showReagrupar = data.costo?.tipo === 'eter_bloqueado' && (cardType === 'Campeón' || cardType === 'Éter')
  const showCondicion = data.tipo === 'pasivo' && cardType === 'Arcana'

  return (
    <div className="border border-gray-600/50 rounded-lg p-3 bg-gray-900/50">
      <p className="text-xs font-semibold text-gray-300 mb-2">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {/* Capa 1: Tipo */}
        <SelectField label="Tipo" value={data.tipo} options={tipoOptions} onChange={(v) => update({ tipo: v as any })} />
        {/* Capa 2: Trigger */}
        {showTrigger && <SelectField label="Trigger" value={data.trigger} options={TRIGGER_OPTIONS} onChange={(v) => update({ trigger: v as any })} />}
        {/* Capa 2b: Trigger Zona (for al_ser_enviado_al_cementerio) */}
        {showTrigger && data.trigger === 'al_ser_enviado_al_cementerio' && (
          <SelectField label="Desde zona" value={data.triggerZona} options={[
            { value: 'mano', label: 'Desde tu mano' },
            { value: 'campo', label: 'Desde el campo' },
            { value: 'cualquier_zona', label: 'Desde cualquier zona' },
          ]} onChange={(v) => update({ triggerZona: v || undefined })} />
        )}
        {/* Capa 5: Efecto */}
        <GroupedSelectField label="Efecto" value={data.efecto} categories={EFFECT_CATEGORIES} onChange={(v) => update({ efecto: v as any })} />
        {/* Capa 5b: Tipo Negación (for negar effect) */}
        {data.efecto === 'negar' && (
          <SelectField label="Tipo de negación" value={data.tipoNegacion} options={[
            { value: 'invocacion', label: 'Invocación' },
            { value: 'activacion', label: 'Activación' },
            { value: 'resolucion', label: 'Resolución' },
            { value: 'efecto_activo', label: 'Efecto activo' },
            { value: 'pago', label: 'Pago' },
            { value: 'ataque', label: 'Ataque' },
            { value: 'bloqueo', label: 'Bloqueo' },
            { value: 'robo', label: 'Robo' },
          ]} onChange={(v) => update({ tipoNegacion: v as any })} />
        )}
        {/* Capa 7: Duración */}
        {showDuracion && <SelectField label="Duración" value={data.duracion} options={DURACION_OPTIONS} onChange={(v) => update({ duracion: v as any })} />}
        {showDuracion && data.duracion === 'n_turnos' && <NumberInput label="Turnos" value={data.duracionTurnos} onChange={(v) => update({ duracionTurnos: v })} min={1} max={10} />}
      </div>

      {/* Capa 3: Costo (for disparo/continuo) */}
      {showCost && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <SelectField label="Costo" value={data.costo?.tipo} options={COSTO_OPTIONS.filter((o) => o.value !== 'exile_self' && o.value !== 'cemetery_self')} onChange={(v) => updateCosto({ tipo: v as any })} />
          {data.costo?.tipo && data.costo.tipo !== 'ninguno' && <NumberInput label="Cantidad" value={data.costo?.cantidad} onChange={(v) => updateCosto({ cantidad: v })} min={1} max={10} />}
        </div>
      )}

      {/* Capa 3b: Requisito (for pasivo - replacement effects) */}
      {showRequisito && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <SelectField label="Requisito" value={data.costo?.tipo} options={REQUISITO_OPTIONS} onChange={(v) => updateCosto({ tipo: v as any })} />
        </div>
      )}

      {/* Capa 4: Objetivo */}
      {showObjetivo && (
        <div className="grid grid-cols-3 gap-2 mt-2">
          <SelectField label="Tipo objetivo" value={data.objetivo?.tipo} options={OBJETIVO_TIPO_OPTIONS} onChange={(v) => updateObjetivo({ tipo: v as any })} />
          <SelectField label="Controlador" value={data.objetivo?.controlador} options={CONTROLADOR_OPTIONS} onChange={(v) => updateObjetivo({ controlador: v as any })} />
          <SelectField label="Zona" value={data.objetivo?.zona} options={ZONA_OPTIONS} onChange={(v) => updateObjetivo({ zona: v as any })} />
        </div>
      )}

      {/* Capa 4b: Zona destino (for return_ether, move effects) */}
      {showObjetivo && data.efecto && ['return_ether', 'free_ether', 'block_ether', 'mover'].includes(data.efecto) && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <SelectField label="Zona destino" value={data.objetivo?.zonaDestino} options={ZONA_OPTIONS} onChange={(v) => updateObjetivo({ zonaDestino: v || undefined })} />
          {data.objetivo?.zonaDestino && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="sinActivarEfecto"
                checked={data.sinActivarEfecto ?? false}
                onChange={(e) => update({ sinActivarEfecto: e.target.checked || undefined })}
                className="rounded border-gray-600 bg-gray-800 text-ether-500 focus:ring-ether-500"
              />
              <label htmlFor="sinActivarEfecto" className="text-[10px] uppercase tracking-wider text-gray-400">
                Niega efecto
              </label>
            </div>
          )}
        </div>
      )}

      {/* Capa 6: Stats */}
      {showStats && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <NumberInput label="ATQ" value={data.stats?.ATQ} onChange={(v) => update({ stats: { ...data.stats, ATQ: v } })} min={-10} max={10} />
          <NumberInput label="RES" value={data.stats?.RES} onChange={(v) => update({ stats: { ...data.stats, RES: v } })} min={-10} max={10} />
        </div>
      )}

      {/* Capa 6b: Buff per blocked ether (for Artefacto effects) */}
      {showStats && (
        <div className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            id="buffPerBlockedEther"
            checked={data.buffPerBlockedEther ?? false}
            onChange={(e) => update({ buffPerBlockedEther: e.target.checked || undefined })}
            className="rounded border-gray-600 bg-gray-800 text-ether-500 focus:ring-ether-500"
          />
          <label htmlFor="buffPerBlockedEther" className="text-[10px] uppercase tracking-wider text-gray-400">
            Buff por éter bloqueado
          </label>
        </div>
      )}

      {/* Capa 7: Cantidad */}
      {showCantidad && <div className="mt-2"><NumberInput label="Cantidad" value={data.cantidad} onChange={(v) => update({ cantidad: v })} min={1} max={20} /></div>}

      {/* Capa 8: Keyword */}
      {showKeyword && (
        <div className="mt-2">
          <SelectField label="Keyword" value={data.keyword} options={[{ value: '', label: 'Seleccionar...' }, ...KEYWORDS.map((k) => ({ value: k, label: k }))]} onChange={(v) => update({ keyword: v || undefined })} />
        </div>
      )}

      {/* Capa 5b: Copy Attributes (solo para efecto 'copy') */}
      {data.efecto === 'copy' && (
        <div className="border border-gray-600/30 rounded p-2 mt-2">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Atributos a copiar</p>
          {Object.entries(groupCopyAttributes(COPY_ATTRIBUTE_OPTIONS)).map(([group, attrs]) => (
            <div key={group} className="mb-2 last:mb-0">
              <p className="text-[10px] text-gray-500 mb-1">{group}</p>
              <div className="grid grid-cols-2 gap-2">
                {attrs.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer group" title={opt.description}>
                    <input
                      type="checkbox"
                      checked={data.copyAttributes?.includes(opt.value) ?? false}
                      onChange={(e) => {
                        const current = data.copyAttributes ?? []
                        const next = e.target.checked
                          ? [...current, opt.value]
                          : current.filter((a) => a !== opt.value)
                        update({ copyAttributes: next.length > 0 ? next : undefined })
                      }}
                      className="rounded border-gray-600 bg-gray-800 text-ether-500 focus:ring-ether-500"
                    />
                    <span className="text-xs text-gray-300 group-hover:text-gray-100">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Capa 10: Reagrupar */}
      {showReagrupar && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <SelectField label="Reagrupar" value={data.reagrupar?.fase} options={[{ value: '', label: 'No' }, { value: 'alba', label: 'Alba' }, { value: 'choque', label: 'Choque' }]} onChange={(v) => update({ reagrupar: v ? { fase: v as any, turno: data.reagrupar?.turno ?? 'propio' } : undefined })} />
          {data.reagrupar?.fase && <SelectField label="Turno" value={data.reagrupar?.turno} options={[{ value: 'propio', label: 'Propio' }, { value: 'oponente', label: 'Oponente' }]} onChange={(v) => update({ reagrupar: { ...data.reagrupar!, turno: v as any } })} />}
        </div>
      )}

      {/* Capa 11: Condición (Arcana) */}
      {showCondicion && (
        <div className="border border-gray-600/30 rounded p-2 mt-2">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Condición de activación</p>
          {typeof data.condicion === 'object' && data.condicion && (
            <>
              <SelectField label="Trigger" value={data.condicion.trigger} options={CONDICION_TRIGGER_OPTIONS} onChange={(v) => updateCondicion({ trigger: v as any })} />
              <div className="mt-2 space-y-2">
                {((data.condicion as CondicionEfecto).condiciones ?? []).map((c: any, i: number) => (
                  <div key={i} className="border border-gray-600/30 rounded p-2 bg-gray-900/30">
                    <div className="flex gap-2 items-end">
                      <SelectField label={`Condición ${i + 1}`} value={c.tipo} options={CONDICION_TIPO_OPTIONS} onChange={(v) => {
                        const newConds = [...((data.condicion as CondicionEfecto).condiciones ?? [])]
                        newConds[i] = { ...c, tipo: v as any }
                        updateCondicion({ condiciones: newConds })
                      }} />
                      {c.tipo?.includes('minimo') && <NumberInput label="Cantidad" value={c.cantidad} onChange={(v) => {
                        const newConds = [...((data.condicion as CondicionEfecto).condiciones ?? [])]
                        newConds[i] = { ...c, cantidad: v }
                        updateCondicion({ condiciones: newConds })
                      }} min={1} max={10} />}
                      <button onClick={() => {
                        const newConds = ((data.condicion as CondicionEfecto).condiciones ?? []).filter((_: any, j: number) => j !== i)
                        updateCondicion({ condiciones: newConds })
                      }} className="text-xs text-red-400 hover:text-red-300 px-1 mb-1">✕</button>
                    </div>
                    {/* Objetivo de la condición: tipo + controlador + filtros */}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <SelectField label="Tipo objetivo" value={c.objetivo?.tipo} options={[
                        { value: 'campeon', label: 'Campeón' },
                        { value: 'mistica', label: 'Mística' },
                        { value: 'arcana', label: 'Arcana' },
                      ]} onChange={(v) => {
                        const newConds = [...((data.condicion as CondicionEfecto).condiciones ?? [])]
                        newConds[i] = { ...c, objetivo: { ...c.objetivo, tipo: v as any, controlador: c.objetivo?.controlador ?? 'propio' } }
                        updateCondicion({ condiciones: newConds })
                      }} />
                      <SelectField label="Controlador" value={c.objetivo?.controlador} options={[
                        { value: 'propio', label: 'Propio' },
                        { value: 'rival', label: 'Rival' },
                      ]} onChange={(v) => {
                        const newConds = [...((data.condicion as CondicionEfecto).condiciones ?? [])]
                        newConds[i] = { ...c, objetivo: { ...c.objetivo, controlador: v as any, tipo: c.objetivo?.tipo ?? 'campeon' } }
                        updateCondicion({ condiciones: newConds })
                      }} />
                    </div>
                    {/* Filtros del objetivo de la condición (solo para campeón) */}
                    {c.objetivo?.tipo === 'campeon' && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <SelectField label="Éter bloqueado" value={c.objetivo?.filtros?.conEterBloqueado?.toString()} options={[
                          { value: '', label: 'Cualquiera' },
                          { value: 'true', label: 'Con éter bloqueado' },
                          { value: 'false', label: 'Sin éter bloqueado' },
                        ]} onChange={(v) => {
                          const newConds = [...((data.condicion as CondicionEfecto).condiciones ?? [])]
                          const filtros = { ...c.objetivo?.filtros, conEterBloqueado: v === '' ? undefined : v === 'true' }
                          newConds[i] = { ...c, objetivo: { ...c.objetivo, filtros } }
                          updateCondicion({ condiciones: newConds })
                        }} />
                        <SelectField label="Agotamiento" value={c.objetivo?.filtros?.agotado?.toString()} options={[
                          { value: '', label: 'Cualquiera' },
                          { value: 'true', label: 'Esté agotado' },
                          { value: 'false', label: 'No esté agotado' },
                        ]} onChange={(v) => {
                          const newConds = [...((data.condicion as CondicionEfecto).condiciones ?? [])]
                          const filtros = { ...c.objetivo?.filtros, agotado: v === '' ? undefined : v === 'true' }
                          newConds[i] = { ...c, objetivo: { ...c.objetivo, filtros } }
                          updateCondicion({ condiciones: newConds })
                        }} />
                      </div>
                    )}
                  </div>
                ))}
                <button onClick={() => {
                  const newConds = [...((data.condicion as CondicionEfecto).condiciones ?? []), {
                    tipo: 'controlar_minimo' as const,
                    cantidad: 2,
                    objetivo: { tipo: 'campeon' as const, controlador: 'propio' as const },
                  }]
                  updateCondicion({ condiciones: newConds })
                }} className="text-xs text-ether-400 hover:text-ether-300">+ Agregar condición</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Filtros del objetivo — dynamic based on target type (no filters for Vínculo, equipped_champion) */}
      {showObjetivo && data.objetivo?.tipo && !['self', 'todos_campeones_propios', 'todos_campeones_rivales', 'rival_hand', 'vinculo', 'equipped_champion'].includes(data.objetivo.tipo) && (
        <div className="border border-gray-600/30 rounded p-2 mt-2">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Filtros del objetivo</p>
          <div className="grid grid-cols-2 gap-2">
            {/* Common filters - Facción (not for Éter) */}
            {data.objetivo?.tipo !== 'eter' && (
              <SelectField label="Facción" value={data.objetivo?.filtros?.faccion} options={[{ value: '', label: 'Cualquiera' }, ...FACCIONES.map((f) => ({ value: f, label: f }))]} onChange={(v) => updateFiltros({ faccion: v as any })} />
            )}
            {/* Common filters - Coste max. (not for Éter - all cost 1) */}
            {data.objetivo?.tipo !== 'eter' && (
              <NumberInput label="Coste max." value={data.objetivo?.filtros?.costeMax} onChange={(v) => updateFiltros({ costeMax: v })} min={0} max={20} />
            )}
            {/* Common filters - Keyword (for all types) */}
            <SelectField label="Keyword" value={data.objetivo?.filtros?.keyword} options={[{ value: '', label: 'Cualquiera' }, ...KEYWORDS.map((k) => ({ value: k, label: k }))]} onChange={(v) => updateFiltros({ keyword: v || undefined })} />
            
            {/* Campeón-specific filters */}
            {data.objetivo?.tipo === 'campeon' && (
              <>
                <SelectField label="Esencia" value={data.objetivo?.filtros?.esencia} options={[{ value: '', label: 'Cualquiera' }, ...ESENCIAS.map((e) => ({ value: e, label: e }))]} onChange={(v) => updateFiltros({ esencia: v as any })} />
                <SelectField label="Rol" value={data.objetivo?.filtros?.rol} options={[{ value: '', label: 'Cualquiera' }, ...ROLES.map((r) => ({ value: r, label: r }))]} onChange={(v) => updateFiltros({ rol: v as any })} />
                <SelectField label="Categoría" value={data.objetivo?.filtros?.catHabilidad} options={[{ value: '', label: 'Cualquiera' }, ...CAT_HABILIDAD.map((c) => ({ value: c, label: c }))]} onChange={(v) => updateFiltros({ catHabilidad: v as any })} />
                <NumberInput label="Coste min." value={data.objetivo?.filtros?.costeMin} onChange={(v) => updateFiltros({ costeMin: v })} min={0} max={20} />
                <NumberInput label="ATQ max." value={data.objetivo?.filtros?.atqMax} onChange={(v) => updateFiltros({ atqMax: v })} min={0} max={99} />
                <NumberInput label="RES max." value={data.objetivo?.filtros?.resMax} onChange={(v) => updateFiltros({ resMax: v })} min={0} max={99} />
                <SelectField label="Agotamiento" value={data.objetivo?.filtros?.agotado?.toString()} options={[{ value: 'true', label: 'Esté agotado' }, { value: 'false', label: 'No esté agotado' }]} onChange={(v) => updateFiltros({ agotado: v === '' ? undefined : v === 'true' })} />
                <SelectField label="Éter bloqueado" value={data.objetivo?.filtros?.conEterBloqueado?.toString()} options={[{ value: 'true', label: 'Con éter bloqueado' }, { value: 'false', label: 'Sin éter bloqueado' }]} onChange={(v) => updateFiltros({ conEterBloqueado: v === '' ? undefined : v === 'true' })} />
                <SelectField label="Equipado" value={data.objetivo?.filtros?.equipado?.toString()} options={[{ value: 'true', label: 'Equipado' }, { value: 'false', label: 'Sin equipar' }]} onChange={(v) => updateFiltros({ equipado: v === '' ? undefined : v === 'true' })} />
              </>
            )}
            
            {/* Mística-specific filters */}
            {data.objetivo?.tipo === 'mistica' && (
              <SelectField label="Tipo efecto" value={data.objetivo?.filtros?.tipoEfectoMistica} options={[{ value: '', label: 'Cualquiera' }, { value: 'hechizo', label: 'Hechizo' }, { value: 'continuo', label: 'Continuo' }]} onChange={(v) => updateFiltros({ tipoEfectoMistica: v as any })} />
            )}
            
            {/* Arcana-specific filters */}
            {data.objetivo?.tipo === 'arcana' && (
              <SelectField label="Estado" value={data.objetivo?.filtros?.bocaArriba?.toString()} options={[{ value: '', label: 'Cualquiera' }, { value: 'true', label: 'Boca arriba' }, { value: 'false', label: 'Boca abajo' }]} onChange={(v) => updateFiltros({ bocaArriba: v === '' ? undefined : v === 'true' })} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
