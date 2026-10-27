import { useEffect, useState } from 'react'
import { useCardStore } from '../store/useCardStore'
import { CARD_TYPES, RARITIES, KEYWORDS } from '../../shared/types'
import { getFormConfig } from '../types/form-config'
import type { CardType } from '../../shared/types'
import type { EfectoData } from '../../shared/types/cards'
import { validateCard } from '../utils/validation'
import { TextField, NumberField, SelectField, TextAreaField, MultiSelectField } from './fields'
import { EffectField } from './fields/EffectField'
import { CondicionArcanaField } from './fields/CondicionArcanaField'
import { EffectList } from './EffectList'
import { generateEffectText } from './EffectList'
import { EffectManualModal } from './EffectManualModal'
import { ImageUpload } from './ImageUpload'
import { PAQUETES } from '../../shared/data/paquetes'
import { Boton } from '../../shared/ui/Boton'
import { CLASE_CAMPO } from '../../shared/ui/Campo'

/** Color de acento por tipo de carta (mismos tonos del tema). */
const COLOR_TIPO: Record<string, string> = {
  Éter: '#fbbf24',
  Campeón: '#ef4444',
  Mística: '#a855f7',
  Arcana: '#22d3ee',
  Vínculo: '#ec4899',
}

type Pestana = 'datos' | 'efectos' | 'extras'

const PESTANAS: { id: Pestana; etiqueta: string }[] = [
  { id: 'datos', etiqueta: 'Datos' },
  { id: 'efectos', etiqueta: 'Efectos' },
  { id: 'extras', etiqueta: 'Extras' },
]

/** Pestaña de cada campo del configurador; lo que no aparece aquí va en «Datos». */
const PESTANA_DE_CAMPO: Record<string, Pestana> = {
  efectos: 'efectos',
  efectoComandante: 'efectos',
  condicion: 'efectos',
  keywords: 'extras',
  flavorText: 'extras',
  limiteCopias: 'extras',
  id: 'extras',
  paqueteId: 'extras',
  variante: 'extras',
  comentario: 'extras',
}

export function CardForm() {
  const draft = useCardStore((s) => s.draft)
  const updateDraft = useCardStore((s) => s.updateDraft)
  const initDraft = useCardStore((s) => s.initDraft)
  const addCard = useCardStore((s) => s.addCard)
  const updateCard = useCardStore((s) => s.updateCard)
  const setDraft = useCardStore((s) => s.setDraft)
  const cards = useCardStore((s) => s.cards)
  const getCard = useCardStore((s) => s.getCard)
  const selectedCardId = useCardStore((s) => s.selectedCardId)
  const setSelectedCardId = useCardStore((s) => s.setSelectedCardId)
  const userPacks = useCardStore((s) => s.userPacks)

  const isEditing = draft.id && cards.some((c) => c.id === draft.id)
  const [showManual, setShowManual] = useState(false)
  const [pestana, setPestana] = useState<Pestana>('datos')

  // Auto-load card data when a card is selected in the collection
  useEffect(() => {
    if (!selectedCardId) return
    // Don't overwrite if already editing this card
    if (draft.id === selectedCardId) return
    const card = getCard(selectedCardId)
    if (card) {
      setDraft(card as unknown as Record<string, unknown>)
    }
  }, [selectedCardId, getCard, setDraft, draft.id])
  const config = draft.type ? getFormConfig(draft.type as CardType) : null

  const handleSave = () => {
    const errors = validateCard(draft)
    if (errors.length > 0) {
      alert(errors.map((e) => `${e.field}: ${e.message}`).join('\n'))
      return
    }

    // Fill defaults for missing fields
    const card = {
      ...draft,
      rarity: (draft.rarity as string) || 'Común',
      keywords: (draft.keywords as string[]) || [],
      flavorText: (draft.flavorText as string) || '',
      // Un multi-select vacío = sin facción (campo ausente, igual que en la data)
      facciones: Array.isArray(draft.facciones) && (draft.facciones as string[]).length === 0 ? undefined : draft.facciones,
      updatedAt: new Date().toISOString(),
      id: draft.id || crypto.randomUUID(),
    } as Parameters<typeof addCard>[0]

    if (isEditing) {
      updateCard(card.id, card)
    } else {
      addCard(card)
    }
    useCardStore.getState().resetDraft()
    setSelectedCardId(null)
  }

  /** Fields that live inside `draft.stats` instead of flat on draft */
  const STATS_FIELDS = new Set(['cost', 'poder', 'resistencia', 'duracion'])

  const handleTypeChange = (type: string) => {
    initDraft(type as CardType)
  }

  const renderField = (field: { name: string; label: string; type: string; required: boolean; options?: string[]; min?: number; max?: number; placeholder?: string; defaultValue?: string; showEffectFields?: string[] }) => {
    // Skip efectoComandante if catHabilidad doesn't include 'Comandante'
    if (field.name === 'efectoComandante') {
      const catHab = draft.catHabilidad as string[] | undefined
      if (!catHab || !catHab.includes('Comandante')) return null
    }

    const isStatsField = STATS_FIELDS.has(field.name)
    const value = isStatsField
      ? (draft.stats as Record<string, unknown>)?.[field.name] ?? ''
      : draft[field.name]
    const onChange = (val: unknown) => {
      if (isStatsField) {
        const currentStats = (draft.stats as Record<string, unknown>) ?? {}
        updateDraft('stats', { ...currentStats, [field.name]: val })
      } else {
        updateDraft(field.name, val)
      }
    }

    switch (field.type) {
      case 'text':
        return (
          <TextField
            key={field.name}
            label={field.label}
            value={(value as string) ?? field.defaultValue ?? ''}
            onChange={(v) => onChange(v)}
            placeholder={field.placeholder}
          />
        )
      case 'number':
        return (
          <NumberField
            key={field.name}
            label={field.label}
            value={value as number}
            onChange={(v) => onChange(v)}
            min={field.min}
            max={field.max}
          />
        )
      case 'select':
        return (
          <SelectField
            key={field.name}
            label={field.label}
            value={(value as string) ?? field.defaultValue ?? ''}
            onChange={(v) => onChange(v)}
            options={field.options ?? []}
          />
        )
      case 'textarea':
        return (
          <TextAreaField
            key={field.name}
            label={field.label}
            value={(value as string) ?? field.defaultValue ?? ''}
            onChange={(v) => onChange(v)}
            placeholder={field.placeholder}
          />
        )
      case 'multi-select': {
        const keywords = (value as string[]) ?? []
        return (
          <MultiSelectField
            key={field.name}
            label={field.label}
            value={keywords}
            onChange={(v) => onChange(v)}
            options={field.options ?? [...KEYWORDS]}
            max={field.max}
          />
        )
      }
      case 'paquete': {
        // Select dedicado: value = paqueteId, label = nombre (estáticos + personalizados)
        const packs = [...PAQUETES, ...userPacks]
        return (
          <label key={field.name} className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">{field.label}</span>
            <select
              value={(value as string) ?? ''}
              onChange={(e) => onChange(e.target.value || undefined)}
              className={`${CLASE_CAMPO} cursor-pointer`}
            >
              <option value="">Sin paquete</option>
              {packs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
        )
      }
      case 'effect': {
        const effectData = value as Record<string, unknown> | undefined
        const effectTexto = effectData?.texto as string | undefined
        return (
          <div>
            <EffectField
              key={field.name}
              label={field.label}
              value={effectData as any}
              onChange={(v) => {
                if (v && typeof v === 'object') {
                  const withText = { ...v, texto: generateEffectText(v as EfectoData) }
                  onChange(withText)
                } else {
                  onChange(v)
                }
              }}
              cardType={(draft.type as CardType) || 'Campeón'}
            />
            {effectTexto && (
              <div className="mt-1.5 rounded-lg border border-ether-400/20 bg-ether-600/[0.06] p-2.5">
                <p className="text-[10px] uppercase tracking-wider text-ether-300/70 mb-0.5">Texto generado</p>
                <p className="text-xs text-gray-300 italic">{effectTexto}</p>
              </div>
            )}
          </div>
        )
      }
      case 'effect-list': {
        const effects = (value as EfectoData[]) ?? []
        return (
          <EffectList
            key={field.name}
            cardType={(draft.type as CardType) || 'Campeón'}
            effects={effects}
            onChange={(v) => onChange(v)}
          />
        )
      }
      case 'condicion-arcana': {
        return (
          <CondicionArcanaField
            key={field.name}
            value={value as any}
            onChange={(v) => onChange(v)}
          />
        )
      }
    }
  }

  // ── Pestañas: todo el configurador sigue accesible, repartido para no hacer scroll interminable ──
  // Los tres paneles se renderizan SIEMPRE (los inactivos solo se ocultan con CSS) para no perder el estado de lo que
  // tengan dentro (p. ej. el efecto abierto en la lista) al cambiar de pestaña.
  const campos = config?.fields ?? []
  const camposDe = (t: Pestana) => campos.filter((f) => (PESTANA_DE_CAMPO[f.name] ?? 'datos') === t)
  const numericos = camposDe('datos').filter((f) => f.type === 'number')
  const otrosDatos = camposDe('datos').filter((f) => f.type !== 'number')
  const nEfectos = Array.isArray(draft.efectos) ? (draft.efectos as unknown[]).length : 0

  return (
    <div className="flex min-h-0 flex-col gap-3 xl:h-full">
      <h2 className="flex shrink-0 items-center gap-2 font-display text-lg text-gray-100">
        {isEditing ? 'Editar Carta' : 'Nueva Carta'}
        {isEditing ? (
          <span aria-hidden="true" className="rounded-full bg-amber-400/15 px-2 py-0.5 font-body text-[10px] font-semibold uppercase tracking-wider text-amber-300">
            editando
          </span>
        ) : null}
      </h2>

      {/* Card Type Selector */}
      <div className="flex shrink-0 flex-wrap gap-1.5">
        {CARD_TYPES.map((type) => {
          const activo = draft.type === type
          const color = COLOR_TIPO[type] ?? '#7070ff'
          return (
            <button
              key={type}
              aria-pressed={activo}
              onClick={() => handleTypeChange(type)}
              className={`cursor-pointer rounded-lg border px-3 py-1 text-sm font-medium transition-colors ${
                activo ? 'text-white' : 'border-white/10 bg-white/[0.03] text-gray-400 hover:bg-white/[0.07] hover:text-gray-200'
              }`}
              style={activo ? { background: `${color}26`, borderColor: `${color}99`, boxShadow: `0 0 14px -4px ${color}80` } : undefined}
            >
              {type}
            </button>
          )
        })}
      </div>

      {/* Barra de pestañas (+ Manual de Efectos a la derecha) */}
      <div className="flex shrink-0 items-end justify-between gap-2 border-b border-white/10">
        <div role="tablist" aria-label="Secciones de la carta" className="flex gap-1">
          {PESTANAS.map((p) => {
            const activa = pestana === p.id
            return (
              <button
                key={p.id}
                role="tab"
                id={`tab-${p.id}`}
                aria-selected={activa}
                aria-controls={`panel-${p.id}`}
                onClick={() => setPestana(p.id)}
                className={`-mb-px cursor-pointer rounded-t-lg border border-b-0 px-3 py-1.5 text-sm font-medium transition-colors ${
                  activa
                    ? 'border-white/15 bg-white/[0.06] text-white'
                    : 'border-transparent text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
                }`}
              >
                {p.etiqueta}
                {p.id === 'efectos' && nEfectos > 0 ? (
                  <span className="ml-1.5 rounded-full bg-ether-600/40 px-1.5 text-[10px] text-ether-100">{nEfectos}</span>
                ) : null}
              </button>
            )
          })}
        </div>
        <Boton variante="fantasma" tam="sm" className="mb-1" onClick={() => setShowManual(true)}>
          📖 Manual de Efectos
        </Boton>
      </div>

      {/* Paneles: el que no está activo se oculta (sigue montado) */}
      <div className="min-h-0 flex-1 pr-1 xl:overflow-y-auto">
        <div role="tabpanel" id="panel-datos" aria-labelledby="tab-datos" className={pestana === 'datos' ? 'flex flex-col gap-3' : 'hidden'}>
          <SelectField
            label="Rareza"
            value={(draft.rarity as string) ?? 'Común'}
            onChange={(v) => updateDraft('rarity', v)}
            options={[...RARITIES]}
          />
          {/* El nombre va primero; las cifras (coste, poder, resistencia) en una sola fila */}
          {otrosDatos.filter((f) => f.name === 'name').map(renderField)}
          {numericos.length > 0 && <div className="grid grid-cols-3 gap-3">{numericos.map(renderField)}</div>}
          {otrosDatos.filter((f) => f.name !== 'name').map(renderField)}
        </div>

        <div role="tabpanel" id="panel-efectos" aria-labelledby="tab-efectos" className={pestana === 'efectos' ? 'flex flex-col gap-3' : 'hidden'}>
          {camposDe('efectos').map(renderField)}
        </div>

        <div role="tabpanel" id="panel-extras" aria-labelledby="tab-extras" className={pestana === 'extras' ? 'flex flex-col gap-3' : 'hidden'}>
          {/* Image upload */}
          <ImageUpload
            value={draft.imageUrl as string | undefined}
            onChange={(dataUrl) => {
              updateDraft('imageUrl', dataUrl)
              // Remover la imagen = marcar hasImage:false para que updateCard la
              // borre de IndexedDB. Si no se toca, hasImage queda true y se conserva.
              if (!dataUrl) updateDraft('hasImage', false)
            }}
          />
          {camposDe('extras').map(renderField)}
        </div>
      </div>

      {/* Acciones: siempre visibles al pie del formulario */}
      <div className="flex shrink-0 gap-2 border-t border-white/10 pt-3">
        <Boton variante="primario" tam="lg" className="flex-1" onClick={handleSave}>
          {isEditing ? 'Actualizar' : 'Guardar'}
        </Boton>
        <Boton
          tam="lg"
          className="px-5"
          onClick={() => {
            useCardStore.getState().resetDraft()
            setSelectedCardId(null)
          }}
        >
          Cancelar
        </Boton>
      </div>

      {/* Manual modal */}
      <EffectManualModal isOpen={showManual} onClose={() => setShowManual(false)} />
    </div>
  )
}
