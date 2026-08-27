import { useEffect } from 'react'
import { useCardStore } from '../store/useCardStore'
import { CARD_TYPES, RARITIES, KEYWORDS } from '../../shared/types'
import { getFormConfig } from '../types/form-config'
import type { CardType } from '../../shared/types'
import type { EfectoData } from '../../shared/types/cards'
import { validateCard } from '../utils/validation'
import { TextField, NumberField, SelectField, TextAreaField, MultiSelectField } from './fields'
import { EffectField } from './fields/EffectField'
import { EffectList } from './EffectList'
import { ImageUpload } from './ImageUpload'
import { PAQUETES } from '../../shared/data/paquetes'

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
          <label key={field.name} className="flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-300">{field.label}</span>
            <select
              value={(value as string) ?? ''}
              onChange={(e) => onChange(e.target.value || undefined)}
              className="bg-surface-2 border border-card-border rounded px-3 py-2 text-gray-100 
                         focus:outline-none focus:border-ether-400 transition-colors"
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
        return (
          <EffectField
            key={field.name}
            label={field.label}
            value={effectData as any}
            onChange={(v) => onChange(v)}
            showFields={field.showEffectFields as any}
          />
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
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-display text-gray-100">
        {isEditing ? 'Editar Carta' : 'Nueva Carta'}
      </h2>

      {/* Card Type Selector */}
      <div className="flex gap-2 flex-wrap">
        {CARD_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => handleTypeChange(type)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors cursor-pointer
              ${draft.type === type
                ? 'bg-ether-600 text-white'
                : 'bg-surface-2 text-gray-300 hover:bg-card-border'
              }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Rarity */}
      <SelectField
        label="Rareza"
        value={(draft.rarity as string) ?? 'Común'}
        onChange={(v) => updateDraft('rarity', v)}
        options={[...RARITIES]}
      />

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

      {/* Dynamic fields from config */}
      {config?.fields?.map(renderField) ?? null}

      {/* Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          className="flex-1 bg-ether-600 hover:bg-ether-700 text-white font-medium py-2 rounded 
                     transition-colors cursor-pointer"
        >
          {isEditing ? 'Actualizar' : 'Guardar'}
        </button>
        <button
          onClick={() => {
            useCardStore.getState().resetDraft()
            setSelectedCardId(null)
          }}
          className="px-4 bg-surface-2 hover:bg-card-border text-gray-300 font-medium py-2 rounded 
                     transition-colors cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
