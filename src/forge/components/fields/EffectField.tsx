/**
 * EffectField — Structured effect editor with dropdowns and inputs.
 * Replaces free-text TextAreaField for effect parameters.
 * Auto-generates texto from structured fields.
 * Filters options by card type for better UX.
 */
import type { EfectoData, CardType } from '../../../shared/types/cards'
import { FACCIONES, ESENCIAS, ROLES, KEYWORDS } from '../../../shared/types/enums'
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

const ALL_OBJETIVO_TIPO_OPTIONS = [
  { value: 'self', label: 'Esta carta' },
  { value: 'campeon', label: 'Campeón' },
  { value: 'mistica', label: 'Mística' },
  { value: 'arcana', label: 'Arcana' },
  { value: 'eter', label: 'Éter' },
  { value: 'carta', label: 'Carta' },
  { value: 'mano', label: 'Mano' },
]

const ALL_CONTROLADOR_OPTIONS = [
  { value: 'propio', label: 'Propio' },
  { value: 'rival', label: 'Rival' },
  { value: 'ambos', label: 'Ambos' },
]

const ALL_ZONA_OBJETIVO_OPTIONS = [
  { value: 'campo', label: 'Campo' },
  { value: 'cementerio', label: 'Cementerio' },
  { value: 'exilio', label: 'Exilio' },
  { value: 'reserva', label: 'Reserva' },
  { value: 'pagado', label: 'Pagado' },
  { value: 'bloqueado', label: 'Bloqueado' },
  { value: 'mano', label: 'Mano' },
  { value: 'mazo', label: 'Mazo' },
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

const ALL_CONDICION_OPTIONS = [
  { value: 'no_activar_turno_colocada', label: 'No se puede activar el turno en que fue colocada' },
  { value: 'controlar_2_campeones', label: 'Si controlas 2+ Campeones' },
  { value: 'controlar_campeon_eter_bloqueado', label: 'Si controlas un Campeón con Éter bloqueado' },
  { value: 'controlar_otro_campeon', label: 'Si controlas otro Campeón' },
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
  const showReagrupar = shouldShow('reagrupar') && (data.costoTipo === 'eter_bloqueado' || data.costoTipo === 'eter') && (cardType === 'Campeón' || cardType === 'Éter')
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
          <SelectField label="Tipo objetivo" value={data.objetivo?.tipo} options={ALL_OBJETIVO_TIPO_OPTIONS} onChange={(v) => update({ objetivo: { tipo: v as any, controlador: data.objetivo?.controlador ?? 'propio', zona: data.objetivo?.zona ?? 'campo', filtros: data.objetivo?.filtros } })} />
        )}
        {showObjetivo && (
          <SelectField label="Controlador" value={data.objetivo?.controlador} options={ALL_CONTROLADOR_OPTIONS} onChange={(v) => update({ objetivo: { tipo: data.objetivo?.tipo ?? 'campeon', controlador: v as any, zona: data.objetivo?.zona ?? 'campo', filtros: data.objetivo?.filtros } })} />
        )}
        {showObjetivo && (
          <SelectField label="Zona" value={data.objetivo?.zona} options={ALL_ZONA_OBJETIVO_OPTIONS} onChange={(v) => update({ objetivo: { tipo: data.objetivo?.tipo ?? 'campeon', controlador: data.objetivo?.controlador ?? 'propio', zona: v as any, filtros: data.objetivo?.filtros } })} />
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
      {/* Keyword select */}
      {shouldShow('keyword') && data.efecto === 'keyword' && (
        <div className="flex flex-col gap-1 mt-2">
          <SelectField label="Keyword" value={data.keyword} options={[{ value: '', label: 'Seleccionar...' }, ...KEYWORDS.map(k => ({ value: k, label: k }))]} onChange={(v) => update({ keyword: v || undefined })} />
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
      {/* Target filters — show when objective is set and not 'self' */}
      {showObjetivo && data.objetivo?.tipo && data.objetivo.tipo !== 'self' && (
        <div className="border border-gray-600/30 rounded p-2 mt-2">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Filtros del objetivo</p>
          <div className="grid grid-cols-2 gap-2">
            <SelectField label="Tipo carta" value={data.objetivo?.filtros?.tipoCarta} options={ALL_FILTRO_TIPO_OPTIONS} onChange={(v) => update({ objetivo: { ...data.objetivo!, filtros: { ...data.objetivo?.filtros, tipoCarta: v as any } } })} />
            <SelectField label="Faccion" value={data.objetivo?.filtros?.faccion} options={[{ value: '', label: 'Cualquiera' }, ...FACCIONES.map(f => ({ value: f, label: f }))]} onChange={(v) => update({ objetivo: { ...data.objetivo!, filtros: { ...data.objetivo?.filtros, faccion: v as any } } })} />
            <SelectField label="Esencia" value={data.objetivo?.filtros?.esencia} options={[{ value: '', label: 'Cualquiera' }, ...ESENCIAS.map(e => ({ value: e, label: e }))]} onChange={(v) => update({ objetivo: { ...data.objetivo!, filtros: { ...data.objetivo?.filtros, esencia: v as any } } })} />
            <SelectField label="Rol" value={data.objetivo?.filtros?.rol} options={[{ value: '', label: 'Cualquiera' }, ...ROLES.map(r => ({ value: r, label: r }))]} onChange={(v) => update({ objetivo: { ...data.objetivo!, filtros: { ...data.objetivo?.filtros, rol: v as any } } })} />
            <NumberInput label="Coste max." value={data.objetivo?.filtros?.costeMax} onChange={(v) => update({ objetivo: { ...data.objetivo!, filtros: { ...data.objetivo?.filtros, costeMax: v } } })} min={0} max={20} />
            <NumberInput label="ATQ max." value={data.objetivo?.filtros?.atqMax} onChange={(v) => update({ objetivo: { ...data.objetivo!, filtros: { ...data.objetivo?.filtros, atqMax: v } } })} min={0} max={99} />
            <NumberInput label="RES max." value={data.objetivo?.filtros?.resMax} onChange={(v) => update({ objetivo: { ...data.objetivo!, filtros: { ...data.objetivo?.filtros, resMax: v } } })} min={0} max={99} />
          </div>
        </div>
      )}
      {/* Condition select — for Arcana activation conditions */}
      {shouldShow('condicion') && (
        <div className="flex flex-col gap-1 mt-2">
          <SelectField label="Condición de activación" value={data.condicion} options={[{ value: '', label: 'Ninguna' }, ...ALL_CONDICION_OPTIONS]} onChange={(v) => update({ condicion: v || undefined })} />
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
