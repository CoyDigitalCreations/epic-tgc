/**
 * EffectField — Structured effect editor with dropdowns and inputs.
 * Replaces free-text TextAreaField for effect parameters.
 */
import type { EfectoData } from '../../../shared/types/cards'

interface EffectFieldProps {
  label: string
  value?: EfectoData
  onChange: (val: EfectoData | undefined) => void
  /** Which fields to show (defaults to all) */
  showFields?: (keyof EfectoData)[]
}

const TIPO_OPTIONS = [
  { value: 'pasivo', label: 'Pasivo' },
  { value: 'continuo', label: 'Continuo' },
  { value: 'disparo', label: 'Disparo' },
  { value: 'reserva', label: 'Reserva' },
  { value: 'pago', label: 'Pago' },
  { value: 'bloqueo', label: 'Bloqueo' },
  { value: 'hechizo', label: 'Hechizo' },
  { value: 'vinculo', label: 'Vínculo' },
]

const COSTO_OPTIONS = [
  { value: 'ninguno', label: 'Sin costo' },
  { value: 'eter', label: 'Éter' },
  { value: 'eter_bloqueado', label: 'Éter bloqueado' },
  { value: 'exhaust', label: 'Agotar' },
]

const OBJETIVO_OPTIONS = [
  { value: 'self', label: 'Esta carta' },
  { value: 'campeon_propio', label: 'Campeón propio' },
  { value: 'campeon_rival', label: 'Campeón rival' },
  { value: 'mistica_rival', label: 'Mística rival' },
  { value: 'arcana_rival', label: 'Arcana rival' },
  { value: 'todos_campeones_propios', label: 'Todos tus Campeones' },
  { value: 'todos_campeones_rivales', label: 'Todos los rivales' },
  { value: 'campeon_cementerio_propio', label: 'Campeón del cementerio propio' },
  { value: 'cementerio_rival', label: 'Cementerio rival' },
  { value: 'carta_mazo', label: 'Carta del mazo' },
  { value: 'rival_hand', label: 'Mano del rival' },
  { value: 'ether_pagado_rival', label: 'Éter pagado del rival' },
]

const EFECTO_OPTIONS = [
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
]

const DURACION_OPTIONS = [
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

const TRIGGER_OPTIONS = [
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

export function EffectField({ label, value, onChange, showFields }: EffectFieldProps) {
  const data: EfectoData = value ?? { tipo: 'pasivo' }

  const update = (patch: Partial<EfectoData>) => {
    onChange({ ...data, ...patch })
  }

  const shouldShow = (field: keyof EfectoData) => !showFields || showFields.includes(field)

  return (
    <div className="border border-gray-600/50 rounded-lg p-3 bg-gray-900/50">
      <p className="text-xs font-semibold text-gray-300 mb-2">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {shouldShow('tipo') && (
          <SelectField label="Tipo" value={data.tipo} options={TIPO_OPTIONS} onChange={(v) => update({ tipo: v as EfectoData['tipo'] })} />
        )}
        {shouldShow('costoTipo') && (
          <SelectField label="Costo" value={data.costoTipo} options={COSTO_OPTIONS} onChange={(v) => update({ costoTipo: v as EfectoData['costoTipo'] })} />
        )}
        {shouldShow('costoMax') && data.costoTipo && data.costoTipo !== 'ninguno' && (
          <NumberInput label="Cantidad" value={data.costoMax} onChange={(v) => update({ costoMax: v })} min={0} max={10} />
        )}
        {shouldShow('objetivo') && (
          <SelectField label="Objetivo" value={data.objetivo} options={OBJETIVO_OPTIONS} onChange={(v) => update({ objetivo: v as EfectoData['objetivo'] })} />
        )}
        {shouldShow('efecto') && (
          <SelectField label="Efecto" value={data.efecto} options={EFECTO_OPTIONS} onChange={(v) => update({ efecto: v as EfectoData['efecto'] })} />
        )}
        {shouldShow('duracion') && (
          <SelectField label="Duración" value={data.duracion} options={DURACION_OPTIONS} onChange={(v) => update({ duracion: v as EfectoData['duracion'] })} />
        )}
        {shouldShow('trigger') && (
          <SelectField label="Trigger" value={data.trigger} options={TRIGGER_OPTIONS} onChange={(v) => update({ trigger: v as EfectoData['trigger'] })} />
        )}
        {shouldShow('maxObjetivos') && (
          <NumberInput label="Máx. objetivos" value={data.maxObjetivos} onChange={(v) => update({ maxObjetivos: v })} min={1} max={10} />
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
      {/* Condition text */}
      {shouldShow('condicion') && (
        <div className="flex flex-col gap-1 mt-2">
          <label className="text-[10px] uppercase tracking-wider text-gray-400">Condición (texto)</label>
          <input
            type="text"
            value={data.condicion ?? ''}
            onChange={(e) => update({ condicion: e.target.value || undefined })}
            placeholder="ej: coste <= 3"
            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200"
          />
        </div>
      )}
      {/* Additional field for edge cases */}
      {shouldShow('campoAdicional') && (
        <div className="flex flex-col gap-1 mt-2">
          <label className="text-[10px] uppercase tracking-wider text-gray-400">Campo adicional (texto extra)</label>
          <input
            type="text"
            value={data.campoAdicional ?? ''}
            onChange={(e) => update({ campoAdicional: e.target.value || undefined })}
            placeholder="ej: Éter regresa a reserva"
            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-200"
          />
        </div>
      )}
      {/* Stats while in reserve */}
      {shouldShow('statsReserva') && data.tipo === 'reserva' && (
        <div className="mt-2">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Stats en Reserva</p>
          <div className="flex gap-2">
            <NumberInput label="ATQ" value={data.statsReserva?.ATQ} onChange={(v) => update({ statsReserva: { ...data.statsReserva, ATQ: v } })} min={-10} max={10} />
            <NumberInput label="RES" value={data.statsReserva?.RES} onChange={(v) => update({ statsReserva: { ...data.statsReserva, RES: v } })} min={-10} max={10} />
          </div>
        </div>
      )}
    </div>
  )
}
