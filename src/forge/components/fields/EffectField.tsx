/**
 * EffectField — Structured effect editor with dropdowns and inputs.
 * Replaces free-text TextAreaField for effect parameters.
 * Auto-generates texto from structured fields.
 * Filters options by card type for better UX.
 */
import type { EfectoData, CardType, FiltroObjetivo } from '../../../shared/types/cards'
import { FACCIONES, ESENCIAS, ROLES } from '../../../shared/types/enums'
import { generateComandanteText } from '../EffectList'

interface EffectFieldProps {
  label: string
  value?: EfectoData
  onChange: (val: EfectoData | undefined) => void
  /** Which fields to show (defaults to all) */
  showFields?: (keyof EfectoData)[]
  /** If true, auto-generate texto using generateComandanteText */
  isComandante?: boolean
  /** Card type — filters available options per card type */
  cardType?: CardType
}

/** Options per card type */
const CARD_TYPE_EFFECTS: Record<CardType, string[]> = {
  'Campeón': ['pasivo', 'continuo', 'disparo'],
  'Mística': ['hechizo'],
  'Arcana': ['pasivo'],
  'Éter': ['reserva', 'pago', 'bloqueo'],
  'Vínculo': ['vinculo'],
}

const CARD_TYPE_TRIGGERS: Record<CardType, string[]> = {
  'Campeón': ['ninguno', 'al_invocar', 'al_atacar', 'al_matar_en_combate', 'al_activar_habilidad', 'al_ser_enviado_al_cementerio', 'inicio_alba', 'inicio_choque'],
  'Mística': ['ninguno'],
  'Arcana': ['ninguno'],
  'Éter': ['ninguno', 'inicio_choque', 'al_pagar_eter'],
  'Vínculo': ['ninguno'],
}

const CARD_TYPE_DURACION: Record<CardType, string[]> = {
  'Campeón': ['permanente', 'turno', 'hasta_alba', 'mientras_ester_bloqueado', 'mientras_en_campo', '1_por_turno', 'n_turnos', 'instant'],
  'Mística': ['permanente', 'turno', 'hasta_alba', 'instant'],
  'Arcana': ['permanente'],
  'Éter': ['permanente', 'mientras_ester_bloqueado', 'mientras_en_campo'],
  'Vínculo': ['permanente'],
}

const ALL_TIPO_OPTIONS = [
  { value: 'pasivo', label: 'Pasivo' },
  { value: 'continuo', label: 'Continuo' },
  { value: 'disparo', label: 'Disparo' },
  { value: 'reserva', label: 'Reserva' },
  { value: 'pago', label: 'Pago' },
  { value: 'bloqueo', label: 'Bloqueo' },
  { value: 'hechizo', label: 'Hechizo' },
  { value: 'vinculo', label: 'Vínculo' },
]

const ALL_COSTO_OPTIONS = [
  { value: 'ninguno', label: 'Sin costo' },
  { value: 'eter', label: 'Éter' },
  { value: 'eter_bloqueado', label: 'Éter bloqueado' },
  { value: 'exhaust', label: 'Agotar' },
]

const ALL_OBJETIVO_OPTIONS = [
  { value: 'self', label: 'Esta carta' },
  { value: 'campeon_propio', label: 'Campeón propio' },
  { value: 'campeon_rival', label: 'Campeón rival' },
  { value: 'mistica_rival', label: 'Mística rival' },
  { value: 'arcana_rival', label: 'Arcana rival' },
  { value: 'todos_campeones_propios', label: 'Todos tus Campeones' },
  { value: 'todos_campeones_rivales', label: 'Todos los rivales' },
  { value: 'cementerio_propio', label: 'Cementerio propio' },
  { value: 'cementerio_rival', label: 'Cementerio rival' },
  { value: 'exilio_propio', label: 'Exilio propio' },
  { value: 'exilio_rival', label: 'Exilio rival' },
  { value: 'carta_mazo', label: 'Carta del mazo' },
  { value: 'rival_hand', label: 'Mano del rival' },
  { value: 'ether_pagado_rival', label: 'Éter pagado del rival' },
]

const ALL_EFECTO_OPTIONS = [
  { value: 'buff', label: 'Buff (+ATQ/+RES)' },
  { value: 'debuff', label: 'Debuff (-ATQ/-RES)' },
  { value: 'destruir', label: 'Destruir' },
  { value: 'robar', label: 'Robar cartas' },
  { value: 'invocar_cementerio', label: 'Invocar del cementerio' },
  { value: 'devolver_mano', label: 'Devolver a mano' },
  { value: 'equipar', label: 'Equipar' },
  { value: 'modificar_stat', label: 'Modificar stat' },
  { value: 'keyword', label: 'Dar keyword' },
  { value: 'toggle_agotamiento', label: 'Toggle agotamiento' },
  { value: 'steal_champion', label: 'Robar campeón rival' },
  { value: 'steal_ether', label: 'Robar éter bloqueado' },
  { value: 'release_ether', label: 'Liberar éter bloqueado' },
  { value: 'return_ether', label: 'Devolver éter a reserva' },
  { value: 'force_return_ether', label: 'Forzar devolución de éter' },
  { value: 'rival_discard', label: 'Rival descarta' },
  { value: 'conditional_trigger', label: 'Trigger condicional' },
  { value: 'equip_grant_ability', label: 'Equipar + dar habilidad' },
  { value: 'prevent_destroy', label: 'Prevenir destrucción' },
  { value: 'exile', label: 'Exiliar' },
  { value: 'mover_ether', label: 'Mover éter' },
  { value: 'bloquear_ether', label: 'Bloquear éter' },
]

const ALL_DURACION_OPTIONS = [
  { value: 'permanente', label: 'Permanente' },
  { value: 'turno', label: 'Este turno' },
  { value: 'hasta_alba', label: 'Hasta tu Alba' },
  { value: 'mientras_ester_bloqueado', label: 'Mientras éter bloqueado' },
  { value: 'mientras_en_campo', label: 'Mientras esté en campo' },
  { value: 'mientras_equipped', label: 'Mientras esté equipado' },
  { value: '1_por_turno', label: '1 por turno' },
  { value: 'instant', label: 'Instantáneo' },
  { value: 'n_turnos', label: 'N turnos' },
]

const ALL_TRIGGER_OPTIONS = [
  { value: 'ninguno', label: 'Ninguno (siempre activo)' },
  { value: 'al_invocar', label: 'Al invocar' },
  { value: 'al_atacar', label: 'Al atacar' },
  { value: 'al_matar_en_combate', label: 'Al matar en combate' },
  { value: 'al_pagar_eter', label: 'Al pagar éter' },
  { value: 'inicio_choque', label: 'Inicio de Choque' },
  { value: 'inicio_alba', label: 'Inicio de Alba' },
  { value: 'al_jugar_mistica', label: 'Al jugar Mística' },
  { value: 'al_resolver_cadena', label: 'Al resolver cadena' },
  { value: 'al_activar_habilidad', label: 'Al activar habilidad' },
  { value: 'al_ser_enviado_al_cementerio', label: 'Al ir al cementerio' },
  { value: 'al_ser_destruido_vinculo', label: 'Al destruir Vínculo' },
]

const ALL_ZONA_ACTIVACION_OPTIONS = [
  { value: 'reserva', label: 'Reserva' },
  { value: 'pago', label: 'Pago' },
  { value: 'bloqueo', label: 'Bloqueo' },
  { value: 'campo', label: 'Campo' },
]

const ALL_FRECUENCIA_OPTIONS = [
  { value: '1_por_turno', label: '1 por turno' },
  { value: 'ilimitado', label: 'Ilimitado' },
]

const ALL_FILTRO_TIPO_OPTIONS = [
  { value: 'campeon', label: 'Campeón' },
  { value: 'mistica', label: 'Mística' },
  { value: 'arcana', label: 'Arcana' },
]

function filterOptions(all: { value: string; label: string }[], allowed: string[]) {
  return all.filter((o) => allowed.includes(o.value))
}

function SelectField({ label, value, options, onChange }: {
  label: string
  value?: string
  options: { value: string; label: string }[]
  onChange: (val: string | undefined) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-wider text-gray-400">{label}</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200"
      >
        <option value="">— Seleccionar —</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

function NumberInput({ label, value, onChange, min, max }: {
  label: string
  value?: number
  onChange: (val: number | undefined) => void
  min?: number
  max?: number
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] uppercase tracking-wider text-gray-400">{label}</label>
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : undefined)}
        min={min}
        max={max}
        className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200 w-20"
      />
    </div>
  )
}

function updateFiltro(current: FiltroObjetivo | undefined, patch: Partial<FiltroObjetivo>): FiltroObjetivo {
  return { ...current, ...patch } as FiltroObjetivo
}

export function EffectField({ label, value, onChange, showFields, isComandante, cardType }: EffectFieldProps) {
  const data: EfectoData = value ?? { tipo: 'pasivo' }

  const update = (patch: Partial<EfectoData>) => {
    const updated = { ...data, ...patch }
    // Auto-generate texto for Comandante effects
    if (isComandante) {
      updated.texto = generateComandanteText(updated)
    }
    onChange(updated)
  }

  const shouldShow = (field: keyof EfectoData) => !showFields || showFields.includes(field)

  // Filter options by card type
  const tipoOptions = cardType ? filterOptions(ALL_TIPO_OPTIONS, CARD_TYPE_EFFECTS[cardType] || []) : ALL_TIPO_OPTIONS
  const triggerOptions = cardType ? filterOptions(ALL_TRIGGER_OPTIONS, CARD_TYPE_TRIGGERS[cardType] || ALL_TRIGGER_OPTIONS.map(o => o.value)) : ALL_TRIGGER_OPTIONS
  const duracionOptions = cardType ? filterOptions(ALL_DURACION_OPTIONS, CARD_TYPE_DURACION[cardType] || ALL_DURACION_OPTIONS.map(o => o.value)) : ALL_DURACION_OPTIONS

  // Determine which fields to show based on card type
  const showCosto = shouldShow('costoTipo') && cardType !== 'Mística' && cardType !== 'Arcana' && cardType !== 'Vínculo'
  const showTrigger = shouldShow('trigger') && cardType !== 'Mística' && cardType !== 'Arcana' && cardType !== 'Vínculo'
  const showObjetivo = shouldShow('objetivo') && cardType !== 'Arcana'
  const showEfecto = shouldShow('efecto') && cardType !== 'Arcana'
  const showDuracion = shouldShow('duracion') && cardType !== 'Arcana'
  const showReagrupar = shouldShow('reagrupar') && data.costoTipo === 'eter_bloqueado' && (cardType === 'Campeón' || cardType === 'Éter')
  const showCondicionSecundaria = shouldShow('condicionSecundaria') && cardType === 'Campeón'

  return (
    <div className="border border-gray-600/50 rounded-lg p-3 bg-gray-900/50">
      <p className="text-xs font-semibold text-gray-300 mb-2">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {shouldShow('tipo') && (
          <SelectField label="Tipo" value={data.tipo} options={tipoOptions} onChange={(v) => update({ tipo: v as EfectoData['tipo'] })} />
        )}
        {showCosto && (
          <SelectField label="Costo" value={data.costoTipo} options={ALL_COSTO_OPTIONS} onChange={(v) => update({ costoTipo: v as EfectoData['costoTipo'] })} />
        )}
        {showCosto && data.costoTipo && data.costoTipo !== 'ninguno' && (
          <NumberInput label="Cantidad" value={data.costoMax} onChange={(v) => update({ costoMax: v })} min={0} max={10} />
        )}
        {showObjetivo && (
          <SelectField label="Objetivo" value={data.objetivo} options={ALL_OBJETIVO_OPTIONS} onChange={(v) => update({ objetivo: v as EfectoData['objetivo'] })} />
        )}
        {showEfecto && (
          <SelectField label="Efecto" value={data.efecto} options={ALL_EFECTO_OPTIONS} onChange={(v) => update({ efecto: v as EfectoData['efecto'] })} />
        )}
        {showDuracion && (
          <SelectField label="Duración" value={data.duracion} options={duracionOptions} onChange={(v) => update({ duracion: v as EfectoData['duracion'] })} />
        )}
        {showTrigger && (
          <SelectField label="Trigger" value={data.trigger} options={triggerOptions} onChange={(v) => update({ trigger: v as EfectoData['trigger'] })} />
        )}
        {shouldShow('maxObjetivos') && (
          <NumberInput label="Máx. objetivos" value={data.maxObjetivos} onChange={(v) => update({ maxObjetivos: v })} min={1} max={10} />
        )}
        {shouldShow('cantidad') && (
          <NumberInput label="Cantidad" value={data.cantidad} onChange={(v) => update({ cantidad: v })} min={1} max={20} />
        )}
      </div>
      {/* Stats inputs for buff/debuff */}
      {shouldShow('stats') && (data.efecto === 'buff' || data.efecto === 'debuff' || data.efecto === 'modificar_stat') && (
        <div className="flex gap-2 mt-2">
          <NumberInput label="ATQ" value={data.stats?.ATQ} onChange={(v) => update({ stats: { ...data.stats, ATQ: v } })} min={-10} max={10} />
          <NumberInput label="RES" value={data.stats?.RES} onChange={(v) => update({ stats: { ...data.stats, RES: v } })} min={-10} max={10} />
        </div>
      )}
      {/* Keyword input */}
      {shouldShow('keyword') && data.efecto === 'keyword' && (
        <div className="flex gap-2 mt-2">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-gray-400">Keyword</label>
            <input
              type="text"
              value={data.keyword ?? ''}
              onChange={(e) => update({ keyword: e.target.value || undefined })}
              placeholder="ej: Inmortal"
              className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200"
            />
          </div>
        </div>
      )}
      {/* Zone activation — for Éter effects */}
      {shouldShow('zonaActivacion') && cardType === 'Éter' && (
        <div className="flex flex-col gap-1 mt-2">
          <SelectField label="Zona de activación" value={data.zonaActivacion} options={ALL_ZONA_ACTIVACION_OPTIONS} onChange={(v) => update({ zonaActivacion: v as any })} />
        </div>
      )}
      {/* Frequency — for activatable effects */}
      {shouldShow('frecuencia') && (data.tipo === 'disparo' || data.tipo === 'continuo' || data.tipo === 'pago') && (
        <div className="flex flex-col gap-1 mt-2">
          <SelectField label="Frecuencia" value={data.frecuencia} options={ALL_FRECUENCIA_OPTIONS} onChange={(v) => update({ frecuencia: v as any })} />
        </div>
      )}
      {/* Duration turns — only when duracion='n_turnos' */}
      {shouldShow('duracionTurnos') && data.duracion === 'n_turnos' && (
        <div className="flex flex-col gap-1 mt-2">
          <NumberInput label="Turnos" value={data.duracionTurnos} onChange={(v) => update({ duracionTurnos: v })} min={1} max={10} />
        </div>
      )}
      {/* Target filter — for cementerio/exilio targets */}
      {shouldShow('filtroObjetivo') && (data.objetivo?.includes('cementerio') || data.objetivo?.includes('exilio')) && (
        <div className="border border-gray-600/30 rounded p-2 mt-2">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Filtros del objetivo</p>
          <div className="grid grid-cols-2 gap-2">
            <SelectField label="Tipo de carta" value={data.filtroObjetivo?.tipo} options={ALL_FILTRO_TIPO_OPTIONS} onChange={(v) => update({ filtroObjetivo: updateFiltro(data.filtroObjetivo, { tipo: v as any }) })} />
            <SelectField label="Faccion" value={data.filtroObjetivo?.faccion} options={[{ value: '', label: 'Cualquiera' }, ...FACCIONES.map(f => ({ value: f, label: f }))]} onChange={(v) => update({ filtroObjetivo: updateFiltro(data.filtroObjetivo, { faccion: v as any }) })} />
            <SelectField label="Esencia" value={data.filtroObjetivo?.esencia} options={[{ value: '', label: 'Cualquiera' }, ...ESENCIAS.map(e => ({ value: e, label: e }))]} onChange={(v) => update({ filtroObjetivo: updateFiltro(data.filtroObjetivo, { esencia: v as any }) })} />
            <SelectField label="Rol" value={data.filtroObjetivo?.rol} options={[{ value: '', label: 'Cualquiera' }, ...ROLES.map(r => ({ value: r, label: r }))]} onChange={(v) => update({ filtroObjetivo: updateFiltro(data.filtroObjetivo, { rol: v as any }) })} />
            <NumberInput label="Coste max." value={data.filtroObjetivo?.costeMax} onChange={(v) => update({ filtroObjetivo: updateFiltro(data.filtroObjetivo, { costeMax: v }) })} min={0} max={20} />
            <NumberInput label="ATQ max." value={data.filtroObjetivo?.atqMax} onChange={(v) => update({ filtroObjetivo: updateFiltro(data.filtroObjetivo, { atqMax: v }) })} min={0} max={99} />
            <NumberInput label="RES max." value={data.filtroObjetivo?.resMax} onChange={(v) => update({ filtroObjetivo: updateFiltro(data.filtroObjetivo, { resMax: v }) })} min={0} max={99} />
          </div>
        </div>
      )}
      {/* Condition text — only for Arcana activation conditions */}
      {shouldShow('condicion') && (
        <div className="flex flex-col gap-1 mt-2">
          <label className="text-[10px] uppercase tracking-wider text-gray-400">Condición de activación</label>
          <input
            type="text"
            value={data.condicion ?? ''}
            onChange={(e) => update({ condicion: e.target.value || undefined })}
            placeholder="ej: coste <= 3"
            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200"
          />
        </div>
      )}
      {/* Regroup ether */}
      {showReagrupar && (
        <div className="flex gap-2 mt-2">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wider text-gray-400">Reagrupar</label>
            <select
              value={data.reagrupar?.fase ?? ''}
              onChange={(e) => {
                if (!e.target.value) {
                  update({ reagrupar: undefined })
                } else {
                  update({
                    reagrupar: {
                      fase: e.target.value as 'alba' | 'choque',
                      turno: data.reagrupar?.turno ?? 'propio',
                    },
                  })
                }
              }}
              className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200"
            >
              <option value="">No reagrupar</option>
              <option value="alba">Alba</option>
              <option value="choque">Choque</option>
            </select>
          </div>
          {data.reagrupar?.fase && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-gray-400">Turno</label>
              <select
                value={data.reagrupar?.turno ?? 'propio'}
                onChange={(e) => update({
                  reagrupar: {
                    fase: data.reagrupar!.fase,
                    turno: e.target.value as 'propio' | 'oponente',
                  },
                })}
                className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200"
              >
                <option value="propio">Propio</option>
                <option value="oponente">Oponente</option>
              </select>
            </div>
          )}
        </div>
      )}
      {/* Secondary condition — only for Campeón */}
      {showCondicionSecundaria && (
        <div className="flex flex-col gap-1 mt-2">
          <label className="text-[10px] uppercase tracking-wider text-gray-400">Condición secundaria</label>
          <select
            value={data.condicionSecundaria?.tipo ?? ''}
            onChange={(e) => {
              if (!e.target.value) {
                update({ condicionSecundaria: undefined })
              } else {
                update({
                  condicionSecundaria: {
                    tipo: e.target.value as any,
                    cantidad: e.target.value === 'controlar_campeones' ? 2 : undefined,
                  },
                })
              }
            }}
            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200"
          >
            <option value="">Sin condición</option>
            <option value="controlar_campeones">Controlar N+ Campeones</option>
            <option value="controlar_eter_bloqueado">Controlar Campeones con Éter bloqueado</option>
            <option value="controlar_otro_campeon">Controlar otro Campeón</option>
          </select>
          {data.condicionSecundaria?.tipo === 'controlar_campeones' && (
            <NumberInput
              label="Mín. campeones"
              value={data.condicionSecundaria.cantidad}
              onChange={(v) => update({ condicionSecundaria: { ...data.condicionSecundaria!, cantidad: v } })}
              min={1}
              max={5}
            />
          )}
        </div>
      )}
    </div>
  )
}
