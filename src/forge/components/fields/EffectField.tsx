/**
 * EffectField — Structured effect editor with 11-layer system.
 * Shows/hides fields based on effect type selection.
 */
import type { EfectoData, TramoEfecto, CardType, CostoEfecto, ObjetivoEfecto, FiltroObjetivo, CopyAttribute } from '../../../shared/types/cards'
import { FACCIONES, ESENCIAS, ROLES, KEYWORDS, CAT_HABILIDAD } from '../../../shared/types/enums'
import { REGLAS, REGLA_IDS, esReglaNumerica, operacionesDe, type OperacionRegla, type ReglaId } from '../../../shared/rules/reglas'
import { camposAjenosVacios } from '../../utils/limpiar-efecto'

const OPERACION_LABELS: Record<OperacionRegla, string> = {
  fijar: 'Fijar a', sumar: 'Sumar', permitir: 'Permitir', prohibir: 'Prohibir',
}

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
  { value: 'al_resolver_cadena', label: 'Al resolver cadena' },
  { value: 'al_ser_enviado_al_cementerio', label: 'Al ir al cementerio' }, { value: 'al_ser_destruido_vinculo', label: 'Al destruir Vínculo' },
  { value: 'cuando_vinculo_seria_destruido', label: 'Cuando Vínculo sería destruido' },
]
const CONTROLADOR_TRIGGER_OPTIONS = [
  { value: '', label: 'Propio (tu turno)' },
  { value: 'rival', label: 'Rival' },
]
const COSTO_OPTIONS = [
  { value: 'ninguno', label: 'Sin costo' }, { value: 'eter', label: 'Éter' },
  { value: 'eter_bloqueado', label: 'Éter bloqueado (hasta)' }, { value: 'bloqueo_fijo', label: 'Bloqueo fijo' },
  { value: 'exhaust', label: 'Agotar' },
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
    efectos: ['buff', 'debuff', 'grant_keyword', 'toggle_exhaust', 'fix_exhaust'] as const,
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
    nombre: 'Invocación',
    efectos: ['invocar', 'invocar_y_equipar'] as const,
  },
  {
    nombre: 'Movimiento',
    efectos: ['return_hand', 'return_ether', 'mover', 'recuperar_mano', 'recuperar_mazo', 'recuperar_mazo_barajar', 'recuperar_mazo_top', 'recuperar_mazo_bottom', 'recuperar_exilio'] as const,
  },
  {
    nombre: 'Éter',
    efectos: ['block_ether', 'free_ether', 'return_ether'] as const,
  },
  {
    nombre: 'Robo',
    efectos: ['draw', 'scry', 'tutor', 'rival_discard'] as const,
  },
  {
    nombre: 'Combate',
    efectos: ['double_attack', 'direct_attack'] as const,
  },
  {
    nombre: 'Negación',
    efectos: ['negar'] as const,
  },
  {
    nombre: 'Reglas',
    efectos: ['modificar_regla'] as const,
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
  { value: 'fix_exhaust', label: 'Fijar agotamiento' },
  { value: 'prevent_destroy', label: 'Prevenir destrucción' }, { value: 'scry', label: 'Mirar cartas' },
  { value: 'tutor', label: 'Buscar carta' },
  { value: 'copy', label: 'Copiar' }, { value: 'redirect', label: 'Redirigir' },
  { value: 'double_attack', label: 'Atacar dos veces' }, { value: 'direct_attack', label: 'Ataque directo' },
  { value: 'change_type', label: 'Cambiar tipo' }, { value: 'grant_keyword', label: 'Dar keyword' },
  { value: 'recuperar_campo', label: 'Invocar del cementerio' }, { value: 'recuperar_mano', label: 'Devolver a mano desde zona' },
  { value: 'recuperar_mazo', label: 'Devolver a mazo' }, { value: 'recuperar_mazo_barajar', label: 'Devolver a mazo y barajar' },
  { value: 'recuperar_mazo_top', label: 'Poner en tope de mazo' }, { value: 'recuperar_mazo_bottom', label: 'Poner en fondo de mazo' },
  { value: 'recuperar_exilio', label: 'Devolver del Exilio' },
  { value: 'invocar', label: 'Invocar' },
  { value: 'modificar_regla', label: 'Modificar una regla' },
  { value: 'invocar_y_equipar', label: 'Invocar y equipar' },
  { value: 'rival_discard', label: 'Descartar carta rival' },
]
const DURACION_OPTIONS = [
  { value: 'permanente', label: 'Permanente' }, { value: 'turno', label: 'Este turno' },
  { value: 'mientras_ester_bloqueado', label: 'Mientras éter bloqueado' },
  { value: 'mientras_en_campo', label: 'Mientras esté en campo' }, { value: 'mientras_equipped', label: 'Mientras equipado' },
  { value: '1_por_turno', label: '1 por turno' }, { value: 'n_turnos', label: 'N turnos' },
  { value: 'hasta_fase', label: 'Hasta fase...' },
]
const DURACION_FASE_OPTIONS = [
  { value: 'alba', label: 'Alba' }, { value: 'forja', label: 'Forja' },
  { value: 'choque', label: 'Choque' }, { value: 'ocaso', label: 'Ocaso' },
]
const DURACION_CONTROLADOR_OPTIONS = [
  { value: '', label: 'Tu' }, { value: 'rival', label: 'Del rival' },
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
  'Mística': ['hechizo'],   'Arcana': ['hechizo'],
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

  // ── Tramos escalonados (Capa 3b) — lista "Con N Éteres → efecto" ──
  const tramos = data.tramos ?? []
  const maxBloqueo = data.costo?.cantidad ?? 10
  const updateTramo = (idx: number, patch: Partial<TramoEfecto>) => {
    const next = tramos.map((t, i) => (i === idx ? { ...t, ...patch } : t))
    // Mantener orden por umbral — la lista siempre se lee de menor a mayor
    next.sort((a, b) => a.umbral - b.umbral)
    update({ tramos: next })
  }
  const addTramo = () => {
    // Umbral sugerido: siguiente tramo vacío o el máximo
    const usado = new Set(tramos.map((t) => t.umbral))
    let sugerido = maxBloqueo
    for (let u = 1; u <= maxBloqueo; u++) { if (!usado.has(u)) { sugerido = u; break } }
    const next = [...tramos, { umbral: sugerido, efecto: 'toggle_exhaust' as const }]
    next.sort((a, b) => a.umbral - b.umbral)
    update({ tramos: next })
  }
  const removeTramo = (idx: number) => {
    const next = tramos.filter((_, i) => i !== idx)
    update({ tramos: next.length > 0 ? next : undefined })
  }

  // Filter types by card type
  const tipoOptions = cardType ? TIPO_OPTIONS.filter((o) => (CARD_TYPE_EFFECTS[cardType] || []).includes(o.value)) : TIPO_OPTIONS
  const showCost = data.tipo === 'disparo' || data.tipo === 'continuo' || data.tipo === 'hechizo' || data.tipo === 'vinculo'
    || data.efecto === 'invocar' || data.efecto === 'invocar_y_equipar'
  const showRequisito = data.tipo === 'pasivo'
  const showTrigger = data.tipo !== 'comandante'
  const showObjetivo = data.tipo !== 'comandante'
  const showStats = data.efecto === 'buff' || data.efecto === 'debuff'
  const showCantidad = data.efecto === 'tutor' || (data.efecto ? ['draw', 'destroy', 'exile', 'scry', 'mover', 'return_ether', 'return_hand', 'steal_champion', 'steal_ether', 'block_ether', 'free_ether', 'invocar', 'invocar_y_equipar'].includes(data.efecto) : false)
  const showKeyword = data.efecto === 'grant_keyword'
  const showDuracion = data.tipo !== 'comandante'
  const showReagrupar = (data.costo?.tipo === 'eter_bloqueado' || data.costo?.tipo === 'bloqueo_fijo') && (cardType === 'Campeón' || cardType === 'Éter')
  return (
    <div className="border border-gray-600/50 rounded-lg p-3 bg-gray-900/50">
      <p className="text-xs font-semibold text-gray-300 mb-2">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {/* Capa 1: Tipo */}
        <SelectField label="Tipo" value={data.tipo} options={tipoOptions} onChange={(v) => update({ tipo: v as any })} />
        {/* Capa 2: Trigger */}
        {showTrigger && (
          <div className="col-span-2 grid grid-cols-2 gap-2">
            <SelectField label="Trigger" value={data.trigger} options={TRIGGER_OPTIONS} onChange={(v) => update({ trigger: v as any })} />
            {data.trigger && data.trigger !== 'ninguno' && (
              <SelectField label="Quién" value={data.controladorTrigger === 'rival' ? 'rival' : ''} options={CONTROLADOR_TRIGGER_OPTIONS} onChange={(v) => update({ controladorTrigger: v === 'rival' ? 'rival' : undefined })} />
            )}
          </div>
        )}
        {/* Capa 2b: Trigger Zona (for al_ser_enviado_al_cementerio) */}
        {showTrigger && data.trigger === 'al_ser_enviado_al_cementerio' && (
          <SelectField label="Desde zona" value={data.triggerZona} options={[
            { value: 'mano', label: 'Desde tu mano' },
            { value: 'campo', label: 'Desde el campo' },
            { value: 'cualquier_zona', label: 'Desde cualquier zona' },
          ]} onChange={(v) => update({ triggerZona: v as any })} />
        )}
        {/* Capa 5: Efecto (oculto con tramos — los tramos definen sus efectos) */}
        {tramos.length === 0 ? (
          <GroupedSelectField label="Efecto" value={data.efecto} categories={EFFECT_CATEGORIES} onChange={(v) => {
            // fix_exhaust solo aplica a campeones agotados — forzar el filtro
            // para que el JSON siempre salga con el requisito correcto
            // Al cambiar de efecto se limpian los campos que solo son de OTRO efecto (copyAttributes, tipoNegacion...): si no,
            // quedan escondidos en los datos (el formulario ya no los muestra) y se exportan (así quedó Thane)
            const ajenos = camposAjenosVacios(v as EfectoData['efecto'])
            if (v === 'fix_exhaust') {
              const obj = data.objetivo ?? { tipo: 'campeon' as const, controlador: 'rival' as const, zona: 'campo' as const }
              update({ ...ajenos, efecto: v as any, objetivo: { ...obj, tipo: 'campeon', controlador: obj.controlador === 'propio' ? 'rival' : obj.controlador, filtros: { ...obj.filtros, agotado: true } } })
            } else {
              update({ ...ajenos, efecto: v as any })
            }
          }} />
        ) : (
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-gray-400">Efecto</label>
            <p className="text-xs text-gray-400 bg-gray-800/50 border border-gray-700/50 rounded px-2 py-1">
              Definido por los tramos ↓
            </p>
          </div>
        )}
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
        {/* Capa 5c: Zona Origen (for invocar / invocar_y_equipar / tutor) */}
        {(data.efecto === 'invocar' || data.efecto === 'invocar_y_equipar' || data.efecto === 'tutor') && (
          <SelectField label={data.efecto === 'tutor' ? 'Buscar en' : 'Invocar desde'} value={data.zonaOrigen} options={[
            { value: 'cementerio', label: 'Cementerio' },
            { value: 'exilio', label: 'Exilio' },
            { value: 'mano', label: 'Mano' },
            { value: 'mazo', label: 'Mazo' },
          ]} onChange={(v) => update({ zonaOrigen: v as any })} />
        )}
        {/* Capa 7: Duración */}
        {showDuracion && (
          <div className="col-span-2 flex flex-wrap gap-2 mt-2 items-end">
            <SelectField label="Duración" value={data.duracion} options={DURACION_OPTIONS} onChange={(v) => update({ duracion: v as any, duracionFase: undefined, duracionControlador: undefined })} />
            {data.duracion === 'n_turnos' && <NumberInput label="Turnos" value={data.duracionTurnos} onChange={(v) => update({ duracionTurnos: v })} min={1} max={10} />}
            {data.duracion === 'hasta_fase' && (
              <>
                <SelectField label="Fase" value={data.duracionFase} options={DURACION_FASE_OPTIONS} onChange={(v) => update({ duracionFase: v as any })} />
                <SelectField label="De quién" value={data.duracionControlador === 'rival' ? 'rival' : ''} options={DURACION_CONTROLADOR_OPTIONS} onChange={(v) => update({ duracionControlador: v === 'rival' ? 'rival' : undefined })} />
              </>
            )}
          </div>
        )}
      </div>

      {/* Capa 3: Costo (for disparo/continuo) */}
      {showCost && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <SelectField label="Costo" value={data.costo?.tipo} options={COSTO_OPTIONS.filter((o) => o.value !== 'exile_self' && o.value !== 'cemetery_self')} onChange={(v) => updateCosto({ tipo: v as any })} />
          {data.costo?.tipo && data.costo.tipo !== 'ninguno' && <NumberInput label="Cantidad" value={data.costo?.cantidad} onChange={(v) => updateCosto({ cantidad: v })} min={1} max={10} />}
          {/* Fase 2 (c): zona de ORIGEN del pago — solo costos de bloqueo
              ('reserva' 2A default / 'pagado' 1A — FB-025 "desde la zona de
              éter pagado") */}
          {(data.costo?.tipo === 'eter_bloqueado' || data.costo?.tipo === 'bloqueo_fijo') && (
            <SelectField
              label="Origen del Éter"
              value={data.costo?.origen ?? 'reserva'}
              options={[
                { value: 'reserva', label: 'Reserva (2A)' },
                { value: 'pagado', label: 'Éter pagado (1A)' },
              ]}
              onChange={(v) => updateCosto({ origen: v as 'reserva' | 'pagado' })}
            />
          )}
          {/* Umbral simple (solo "hasta" SIN tramos) — con tramos, la lista
              de tramos define los umbrales */}
          {data.costo?.tipo === 'eter_bloqueado' && data.costo?.cantidad && tramos.length === 0 && (
            <NumberInput
              label="Umbral (con N Éteres)"
              value={data.costo?.umbral}
              onChange={(v) => updateCosto({ umbral: v && v <= (data.costo?.cantidad ?? 0) ? v : undefined })}
              min={1}
              max={data.costo.cantidad}
            />
          )}
        </div>
      )}

      {/* Capa 3b: Tramos escalonados — recompensas por umbral dentro del bloqueo */}
      {data.costo?.tipo === 'eter_bloqueado' && data.costo?.cantidad && (
        <div className="border border-ether-500/30 rounded-lg p-2 mt-2 bg-gray-900/40">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] uppercase tracking-wider text-ether-500/80">
              Tramos de recompensa (Max. {data.costo.cantidad})
            </p>
            <button
              type="button"
              onClick={addTramo}
              className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-ether-500/20 text-ether-300 hover:bg-ether-500/30 border border-ether-500/40"
            >
              + Agregar tramo
            </button>
          </div>
          {tramos.length === 0 && (
            <p className="text-[10px] text-gray-500">
              Sin tramos: un solo efecto que requiere el bloqueo completo. Agrega tramos para recompensas por umbrales (ej. "con 2 Éteres..., con 4 Éteres...").
            </p>
          )}
          {tramos.map((t, idx) => (
            <div key={`${idx}-${t.umbral}`} className="border-t border-gray-700/50 pt-2 mt-2 first:border-t-0 first:pt-0 first:mt-0">
              {/* Fila 1: Umbral + quitar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-300 whitespace-nowrap">Con</span>
                  <input
                    type="number"
                    value={t.umbral}
                    onChange={(e) => updateTramo(idx, { umbral: Math.max(1, Math.min(maxBloqueo, parseInt(e.target.value) || 1)) })}
                    min={1}
                    max={maxBloqueo}
                    className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 w-14"
                  />
                  <span className="text-xs text-gray-300 whitespace-nowrap">Éter(es) bloqueados</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeTramo(idx)}
                  title="Quitar tramo"
                  className="text-xs text-red-400 hover:text-red-300 border border-red-500/30 rounded px-2 py-1"
                >
                  ✕
                </button>
              </div>
              {/* Fila 2: Efecto a ancho completo */}
              <div className="mt-2">
                <GroupedSelectField label="Efecto" value={t.efecto} categories={EFFECT_CATEGORIES} onChange={(v) => {
                  const patch: Partial<TramoEfecto> = { efecto: v as TramoEfecto['efecto'] }
                  // fix_exhaust solo aplica a campeones agotados — filtro forzado
                  if (v === 'fix_exhaust') patch.filtros = { ...t.filtros, agotado: true }
                  updateTramo(idx, patch)
                }} />
              </div>
              {/* Fila 3: Duración + campos condicionales del efecto */}
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="flex gap-2">
                  <SelectField
                    label="Duración"
                    value={t.duracion}
                    options={[{ value: '', label: 'Heredar' }, ...DURACION_OPTIONS]}
                    onChange={(v) => updateTramo(idx, { duracion: v as TramoEfecto['duracion'], duracionTurnos: undefined })}
                  />
                  {t.duracion === 'n_turnos' && (
                    <NumberInput label="Turnos" value={t.duracionTurnos} onChange={(v) => updateTramo(idx, { duracionTurnos: v })} min={1} max={10} />
                  )}
                </div>
                {(t.efecto === 'buff' || t.efecto === 'debuff') && (
                  <>
                    <NumberInput label="ATQ" value={t.stats?.ATQ} onChange={(v) => updateTramo(idx, { stats: { ...t.stats, ATQ: v } })} min={-10} max={10} />
                    <NumberInput label="RES" value={t.stats?.RES} onChange={(v) => updateTramo(idx, { stats: { ...t.stats, RES: v } })} min={-10} max={10} />
                  </>
                )}
                {t.efecto === 'grant_keyword' && (
                  <SelectField label="Keyword" value={t.keyword} options={[{ value: '', label: 'Seleccionar...' }, ...KEYWORDS.map((k) => ({ value: k, label: k }))]} onChange={(v) => updateTramo(idx, { keyword: v || undefined })} />
                )}
                {['draw', 'destroy', 'exile', 'scry', 'mover', 'return_ether', 'return_hand', 'steal_champion', 'steal_ether', 'block_ether', 'free_ether'].includes(t.efecto) && (
                  <NumberInput label="Cantidad" value={t.cantidad} onChange={(v) => updateTramo(idx, { cantidad: v })} min={1} max={20} />
                )}
              </div>
              {/* Nota del tramo — fuera del grid para no encimarse */}
              {t.efecto === 'fix_exhaust' && (
                <p className="text-[10px] text-gray-500 mt-1.5">
                  Solo aplica a Campeones agotados (filtro automático).
                </p>
              )}
            </div>
          ))}
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

      {/* Capa 4b: Zona destino (for return_ether, move, tutor effects) */}
      {data.efecto && ['return_ether', 'free_ether', 'block_ether', 'mover', 'tutor'].includes(data.efecto) && (
        <div className="grid grid-cols-2 gap-2 mt-2 border border-gray-600/30 rounded p-2">
          <SelectField label="Agregar a zona" value={data.objetivo?.zonaDestino} options={[
            { value: 'mano', label: 'Tu mano' },
            { value: 'campo', label: 'Campo (invocar)' },
            { value: 'reserva', label: 'Reserva (2A)' },
            { value: 'pagado', label: 'Zona de pago (1A)' },
            { value: 'cementerio', label: 'Cementerio' },
            { value: 'exilio', label: 'Exilio' },
          ]} onChange={(v) => updateObjetivo({ zonaDestino: v as any })} />
          {data.objetivo?.zonaDestino && (
            <SelectField label="Zona de quién" value={data.objetivo?.controladorDestino ?? ''} options={[
              { value: '', label: 'Del dueño (por defecto)' },
              { value: 'propio', label: 'Tuya (transfiere a ti)' },
              { value: 'rival', label: 'Del rival' },
              { value: 'dueno', label: 'Del dueño (explícito)' },
            ]} onChange={(v) => updateObjetivo({ controladorDestino: v === 'propio' || v === 'rival' || v === 'dueno' ? v : undefined })} />
          )}
          {['tutor', 'mover', 'return_ether'].includes(data.efecto ?? '') && data.objetivo?.zonaDestino && (
            <div className="flex items-center gap-2">
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
      {showCantidad && (
        <div className="flex items-center gap-4 mt-2">
          <NumberInput label="Cantidad" value={data.cantidad} onChange={(v) => update({ cantidad: v })} min={1} max={20} />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="esHasta"
              checked={data.esHasta ?? false}
              onChange={(e) => update({ esHasta: e.target.checked || undefined })}
              className="rounded border-gray-600 bg-gray-800 text-ether-500 focus:ring-ether-500"
            />
            <label htmlFor="esHasta" className="text-[10px] uppercase tracking-wider text-gray-400">
              Hasta
            </label>
          </div>
        </div>
      )}

      {/* Capa 8: Keyword */}
      {showKeyword && (
        <div className="mt-2">
          <SelectField label="Keyword" value={data.keyword} options={[{ value: '', label: 'Seleccionar...' }, ...KEYWORDS.map((k) => ({ value: k, label: k }))]} onChange={(v) => update({ keyword: v || undefined })} />
        </div>
      )}

      {/* Regla modificada (solo para efecto 'modificar_regla'): el efecto gana al manual; la regla viene del catálogo compartido con el motor */}
      {data.efecto === 'modificar_regla' && (
        <div className="border border-gray-600/30 rounded p-2 mt-2">
          <p className="text-xs text-gray-400 mb-1">Qué regla del manual cambia este efecto</p>
          <div className="grid grid-cols-3 gap-2">
            <SelectField
              label="Regla"
              value={data.regla?.id}
              options={[{ value: '', label: 'Seleccionar...' }, ...REGLA_IDS.map((id) => ({ value: id, label: `${REGLAS[id].etiqueta} (${REGLAS[id].manual})` }))]}
              onChange={(v) => {
                if (!v) { update({ regla: undefined }); return }
                const id = v as ReglaId
                // al cambiar de regla la operación vuelve a la primera que tiene sentido para su tipo
                update({ regla: { id, operacion: operacionesDe(id)[0], ...(esReglaNumerica(id) ? { valor: 1 } : {}) } })
              }}
            />
            {data.regla && (
              <SelectField
                label="Operación"
                value={data.regla.operacion}
                options={operacionesDe(data.regla.id).map((o) => ({ value: o, label: OPERACION_LABELS[o] }))}
                onChange={(v) => update({ regla: { ...data.regla!, operacion: v as OperacionRegla } })}
              />
            )}
            {data.regla && esReglaNumerica(data.regla.id) && (
              <NumberInput label="Valor" value={data.regla.valor} onChange={(v) => update({ regla: { ...data.regla!, valor: v } })} min={-20} max={20} />
            )}
          </div>
          {data.regla && (
            <p className="mt-1 text-[11px] text-gray-500">
              {REGLAS[data.regla.id].ambito === 'campeon' && 'Afecta a los Campeones que elijas como objetivo.'}
              {REGLAS[data.regla.id].ambito === 'jugador' && 'Afecta al jugador que indique el objetivo (propio, rival o ambos).'}
              {REGLAS[data.regla.id].ambito === 'partida' && 'Afecta a toda la partida.'}
              {REGLAS[data.regla.id].ambito === 'carta' && 'Afecta a la carta elegida como objetivo.'}
              {' '}Lo que prohíbe gana a lo que permite. Sin duración dura mientras la carta esté en juego (pasivo/continuo) o, si es un hechizo, para siempre.
            </p>
          )}
        </div>
      )}

      {/* Cambio de tipo (solo para efecto 'change_type'): lo que no se elige no se toca; Facción y Rol SUSTITUYEN a los de la carta */}
      {data.efecto === 'change_type' && (
        <div className="border border-gray-600/30 rounded p-2 mt-2">
          <p className="text-xs text-gray-400 mb-1">Se convierte en (lo que dejes vacío no cambia)</p>
          <div className="grid grid-cols-3 gap-2">
            <SelectField label="Facción" value={data.cambioTipo?.faccion} options={[{ value: '', label: 'Sin cambio' }, ...FACCIONES.map((f) => ({ value: f, label: f }))]} onChange={(v) => update({ cambioTipo: { ...data.cambioTipo, faccion: (v || undefined) as any } })} />
            <SelectField label="Esencia" value={data.cambioTipo?.esencia} options={[{ value: '', label: 'Sin cambio' }, ...ESENCIAS.map((e) => ({ value: e, label: e }))]} onChange={(v) => update({ cambioTipo: { ...data.cambioTipo, esencia: (v || undefined) as any } })} />
            <SelectField label="Rol" value={data.cambioTipo?.rol} options={[{ value: '', label: 'Sin cambio' }, ...ROLES.map((r) => ({ value: r, label: r }))]} onChange={(v) => update({ cambioTipo: { ...data.cambioTipo, rol: (v || undefined) as any } })} />
          </div>
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
                <NumberInput label="ATQ original max." value={data.objetivo?.filtros?.atqMax} onChange={(v) => updateFiltros({ atqMax: v })} min={0} max={99} />
                <NumberInput label="RES original max." value={data.objetivo?.filtros?.resMax} onChange={(v) => updateFiltros({ resMax: v })} min={0} max={99} />
                <NumberInput label="ATQ actual max." value={data.objetivo?.filtros?.atqActualMax} onChange={(v) => updateFiltros({ atqActualMax: v })} min={0} max={99} />
                <NumberInput label="RES actual max." value={data.objetivo?.filtros?.resActualMax} onChange={(v) => updateFiltros({ resActualMax: v })} min={0} max={99} />
                <NumberInput label="ATQ original min." value={data.objetivo?.filtros?.atqMin} onChange={(v) => updateFiltros({ atqMin: v })} min={0} max={99} />
                <NumberInput label="RES original min." value={data.objetivo?.filtros?.resMin} onChange={(v) => updateFiltros({ resMin: v })} min={0} max={99} />
                <NumberInput label="ATQ actual min." value={data.objetivo?.filtros?.atqActualMin} onChange={(v) => updateFiltros({ atqActualMin: v })} min={0} max={99} />
                <NumberInput label="RES actual min." value={data.objetivo?.filtros?.resActualMin} onChange={(v) => updateFiltros({ resActualMin: v })} min={0} max={99} />
                <SelectField label="Seleccionar" value={data.objetivo?.filtros?.seleccionar ? `${data.objetivo.filtros.seleccionar.orden}_${data.objetivo.filtros.seleccionar.stat}` : ''} options={[
                  { value: '', label: 'Ninguno (todos)' },
                  { value: 'mayor_poder', label: 'Mayor ATQ' },
                  { value: 'menor_poder', label: 'Menor ATQ' },
                  { value: 'mayor_resistencia', label: 'Mayor RES' },
                  { value: 'menor_resistencia', label: 'Menor RES' },
                  { value: 'mayor_coste', label: 'Mayor coste' },
                  { value: 'menor_coste', label: 'Menor coste' },
                ]} onChange={(v) => {
                  if (!v) { updateFiltros({ seleccionar: undefined }); return }
                  const [orden, stat] = v.split('_') as [string, string]
                  // conserva el valor (original/actual) ya elegido; no aplica al coste
                  const valor = stat === 'coste' ? undefined : data.objetivo?.filtros?.seleccionar?.valor
                  updateFiltros({ seleccionar: { stat: stat as any, orden: orden as any, ...(valor ? { valor } : {}) } })
                }} />
                {data.objetivo?.filtros?.seleccionar && data.objetivo.filtros.seleccionar.stat !== 'coste' && (
                  <SelectField label="Ranking por" value={data.objetivo.filtros.seleccionar.valor ?? 'original'} options={[{ value: 'original', label: 'Valor original (impreso)' }, { value: 'actual', label: 'Valor actual (con buffs y debuffs)' }]} onChange={(v) => updateFiltros({ seleccionar: { ...data.objetivo!.filtros!.seleccionar!, valor: v === 'actual' ? 'actual' : undefined } })} />
                )}
                <SelectField label="Agotamiento" value={data.objetivo?.filtros?.agotado?.toString()} options={[{ value: '', label: 'Cualquiera' }, { value: 'true', label: 'Esté agotado' }, { value: 'false', label: 'No esté agotado' }]} onChange={(v) => updateFiltros({ agotado: v === 'true' ? true : v === 'false' ? false : undefined })} />
                <SelectField label="Éter bloqueado" value={data.objetivo?.filtros?.conEterBloqueado?.toString()} options={[{ value: '', label: 'Cualquiera' }, { value: 'true', label: 'Con éter bloqueado' }, { value: 'false', label: 'Sin éter bloqueado' }]} onChange={(v) => updateFiltros({ conEterBloqueado: v === 'true' ? true : v === 'false' ? false : undefined })} />
                <SelectField label="Puede bloquear Éter" value={data.objetivo?.filtros?.puedeBloquearEter?.toString()} options={[{ value: '', label: 'Cualquiera' }, { value: 'true', label: 'Puede recibir éter' }]} onChange={(v) => updateFiltros({ puedeBloquearEter: v === 'true' ? true : undefined })} />
                <SelectField label="Equipado" value={data.objetivo?.filtros?.equipado?.toString()} options={[{ value: '', label: 'Cualquiera' }, { value: 'true', label: 'Equipado' }, { value: 'false', label: 'Sin equipar' }]} onChange={(v) => updateFiltros({ equipado: v === 'true' ? true : v === 'false' ? false : undefined })} />
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
