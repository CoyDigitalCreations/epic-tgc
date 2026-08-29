/**
 * EffectList — Unified effect editor with add/remove/reorder.
 * Replaces separate effect fields with a single list.
 * Auto-generates human-readable text from structured data.
 */
import { useState } from 'react'
import type { EfectoData, CardType, ObjetivoEfecto } from '../../shared/types/cards'
import { EffectField } from './fields/EffectField'

interface EffectListProps {
  cardType: CardType
  effects: EfectoData[]
  onChange: (effects: EfectoData[]) => void
  maxEffects?: number
}

/** Which effect types are allowed per card type */
const ALLOWED_EFFECTS: Record<CardType, EfectoData['tipo'][]> = {
  'Campeón': ['pasivo', 'continuo', 'disparo'],
  'Mística': ['hechizo'],
  'Arcana': ['pasivo'],
  'Éter': ['reserva', 'pago', 'bloqueo'],
  'Vínculo': ['vinculo'],
}

/** Generate target text from structured ObjetivoEfecto */
function generateTargetText(objetivo: ObjetivoEfecto): string {
  const tipoTexts: Record<string, string> = {
    'self': 'esta carta',
    'campeon': 'Campeón',
    'mistica': 'Mística',
    'arcana': 'Arcana',
    'eter': 'Éter',
    'carta': 'carta',
    'mano': 'carta',
  }

  const controladorTexts: Record<string, string> = {
    'propio': 'que controles',
    'rival': 'que controla el rival',
    'ambos': 'en juego',
  }

  const zonaTexts: Record<string, string> = {
    'campo': '',
    'cementerio': 'del Cementerio',
    'exilio': 'del Exilio',
    'reserva': 'de tu Reserva',
    'pagado': 'de tu zona de pago',
    'bloqueado': 'bloqueado',
    'mano': 'de tu mano',
    'mazo': 'de tu mazo',
  }

  const tipo = tipoTexts[objetivo.tipo] || objetivo.tipo
  const controlador = controladorTexts[objetivo.controlador] || ''
  const zona = zonaTexts[objetivo.zona] || ''

  // Special cases
  if (objetivo.tipo === 'self') return 'esta carta'
  if (objetivo.tipo === 'mano' && objetivo.controlador === 'rival') return 'el rival'
  if (objetivo.tipo === 'eter' && objetivo.zona === 'pagado' && objetivo.controlador === 'rival') return 'Éter de su zona de pago'

  // Build text
  let text = ''

  // Article
  if (objetivo.tipo === 'campeon' || objetivo.tipo === 'carta' || objetivo.tipo === 'mano') {
    text = `un${objetivo.tipo === 'carta' || objetivo.tipo === 'mano' ? 'a' : ''} ${tipo}`
  } else if (objetivo.tipo === 'mistica' || objetivo.tipo === 'arcana') {
    text = `una ${tipo}`
  } else if (objetivo.tipo === 'eter') {
    text = 'Éter'
  }

  // Controller
  if (controlador) text += ` ${controlador}`

  // Zone
  if (zona) text += ` ${zona}`

  // Filters
  if (objetivo.filtros) {
    const filters: string[] = []
    if (objetivo.filtros.tipoCarta) filters.push(objetivo.filtros.tipoCarta === 'campeon' ? 'Campeón' : objetivo.filtros.tipoCarta === 'mistica' ? 'Mística' : 'Arcana')
    if (objetivo.filtros.faccion) filters.push(objetivo.filtros.faccion)
    if (objetivo.filtros.esencia) filters.push(objetivo.filtros.esencia)
    if (objetivo.filtros.rol) filters.push(objetivo.filtros.rol)
    if (objetivo.filtros.costeMax !== undefined) filters.push(`coste ${objetivo.filtros.costeMax} o menos`)
    if (objetivo.filtros.atqMax !== undefined) filters.push(`ATQ ${objetivo.filtros.atqMax} o menos`)
    if (objetivo.filtros.resMax !== undefined) filters.push(`RES ${objetivo.filtros.resMax} o menos`)
    if (filters.length > 0) {
      text = `una carta ${filters.join(' ')} ${text}`
    }
  }

  return text || 'un objetivo'
}

/** Check if target is plural (affects multiple units) */
function isPluralTarget(objetivo: ObjetivoEfecto | undefined): boolean {
  if (!objetivo) return false
  return objetivo.controlador === 'ambos' || (objetivo.tipo === 'campeon' && objetivo.zona === 'campo')
}

/** Conjugate verb to plural in Spanish */
function pluralize(verb: string): string {
  const plurals: Record<string, string> = {
    'gana': 'ganan',
    'pierde': 'pierden',
    'destruye': 'destruyen',
    'roba': 'roban',
    'devuelve': 'devuelven',
    'tiene': 'tienen',
    'libera': 'liberan',
    'exilia': 'exilian',
    'cambia': 'cambian',
  }
  return plurals[verb] || verb
}

/** Generate human-readable text from EfectoData — comprehensive Spanish */
function generateEffectText(data: EfectoData): string {
  const parts: string[] = []

  // Trigger
  if (data.trigger && data.trigger !== 'ninguno') {
    const triggerTexts: Record<string, string> = {
      'al_invocar': 'Al ser invocada',
      'al_atacar': 'Al atacar',
      'al_matar_en_combate': 'Al matar en combate',
      'al_pagar_eter': 'Cuando pagues esta carta',
      'inicio_choque': 'Al inicio de tu Choque',
      'inicio_alba': 'Al inicio de tu Alba',
      'al_jugar_mistica': 'Al jugar esta Mística',
      'al_resolver_cadena': 'Al resolver la cadena',
      'al_activar_habilidad': 'Al activar esta habilidad',
      'al_ser_enviado_al_cementerio': 'Al ser enviada al Cementerio',
      'al_ser_destruido_vinculo': 'Al ser destruido este Vínculo',
    }
    parts.push(triggerTexts[data.trigger] || data.trigger)
  }

  // Secondary condition
  if (data.condicionSecundaria) {
    const condTexts: Record<string, string> = {
      'controlar_campeones': `si controlas ${data.condicionSecundaria.cantidad ?? 2}+ Campeones`,
      'controlar_eter_bloqueado': 'si controlas Campeones con Éter bloqueado',
      'controlar_otro_campeon': 'si controlas otro Campeón',
    }
    parts.push(condTexts[data.condicionSecundaria.tipo] || data.condicionSecundaria.tipo)
  }

  // Target + Effect action
  const effectTexts: Record<string, string> = {
    'buff': 'gana',
    'debuff': 'pierde',
    'destruir': 'destruye',
    'robar': 'roba',
    'invocar_cementerio': 'puede invocar desde tu Cementerio',
    'devolver_mano': 'devuelve a la mano',
    'equipar': 'Se equipa a',
    'modificar_stat': 'gana',
    'keyword': 'tiene',
    'toggle_agotamiento': 'cambia el agotamiento de',
    'steal_champion': 'toma control de',
    'steal_ether': 'toma control de',
    'release_ether': 'libera',
    'return_ether': 'devuelve',
    'force_return_ether': 'el rival devuelve',
    'rival_discard': 'el rival pierde 1 carta de su mano al azar',
    'conditional_trigger': 'gana',
    'equip_grant_ability': 'Se equipa a',
    'prevent_destroy': 'no es destruido',
    'exile': 'exilia',
    'mover_ether': 'mueve',
    'bloquear_ether': 'bloquea',
  }

  let targetText = ''

  if (data.efecto && data.objetivo) {
    const target = generateTargetText(data.objetivo)
    let effect = effectTexts[data.efecto] || data.efecto
    const plural = isPluralTarget(data.objetivo)

    // Pluralize verb if target is plural
    if (plural) {
      effect = pluralize(effect)
    }

    // Use target text from generateTargetText
    targetText = target

    // For effects already handled in cost section, use preposition instead of verb
    const handledInCost = data.costoTipo && data.costoTipo !== 'ninguno' && 
      (data.efecto === 'bloquear_ether' || data.efecto === 'mover_ether')

    if (data.efecto === 'buff' || data.efecto === 'debuff' || data.efecto === 'modificar_stat' || data.efecto === 'conditional_trigger') {
      const stats = data.stats || {}
      const statParts: string[] = []
      if (stats.ATQ) statParts.push(`${stats.ATQ > 0 ? '+' : ''}${stats.ATQ} de ATQ`)
      if (stats.RES) statParts.push(`${stats.RES > 0 ? '+' : ''}${stats.RES} de RES`)
      if (statParts.length > 0) {
        targetText = `${targetText} ${effect} ${statParts.join(' y ')}`
      }
    } else if (data.efecto === 'keyword' && data.keyword) {
      targetText = `${targetText} ${effect} ${data.keyword}`
    } else if (data.efecto === 'robar') {
      const qty = data.cantidad ?? 1
      targetText = `${effect} ${qty} carta${qty > 1 ? 's' : ''}`
    } else if (handledInCost) {
      // Already handled in cost section — use preposition
      targetText = `sobre ${targetText}`
    } else {
      targetText = `${effect} ${targetText}`
    }
  }

  // Zone activation — for Éter effects (FIRST: "Mientras esté en tu zona de pago")
  if (data.zonaActivacion) {
    const zonaTexts: Record<string, string> = {
      'reserva': 'en tu Reserva',
      'pago': 'en tu zona de pago',
      'bloqueo': 'mientras esté bloqueado',
      'campo': 'en el campo',
    }
    parts.push(`Mientras esté ${zonaTexts[data.zonaActivacion] || data.zonaActivacion}`)
  }

  // Frequency — for activatable effects (SECOND: "una vez por turno")
  if (data.frecuencia === '1_por_turno') {
    parts.push('una vez por turno')
  }

  // Cost — only for activatable effects (THIRD: "puedes bloquear 1 Éter")
  if (data.costoTipo && data.costoTipo !== 'ninguno') {
    if (data.costoTipo === 'eter' && data.costoMax) {
      // Check if effect is 'bloquear_ether' to use correct verb
      if (data.efecto === 'bloquear_ether') {
        parts.push(`puedes bloquear ${data.costoMax} Éter`)
      } else {
        parts.push(`puedes pagar ${data.costoMax} Éter`)
      }
    } else if (data.costoTipo === 'eter_bloqueado' && data.costoMax) {
      parts.push(`puedes bloquear hasta un máximo de ${data.costoMax} Éter (Max. ${data.costoMax})`)
    } else if (data.costoTipo === 'exhaust') {
      parts.push('puedes agotar esta carta')
    }
  }

  // Target + Effect (FOURTH: "sobre un Campeón que controles")
  if (targetText) {
    parts.push(targetText)
  }

  // Duration
  if (data.duracion && data.duracion !== 'instant') {
    const durationTexts: Record<string, string> = {
      'permanente': 'de forma permanente',
      'turno': 'hasta el final del turno',
      'hasta_alba': 'hasta tu próxima Alba',
      'mientras_ester_bloqueado': 'mientras ese Éter esté bloqueado',
      'mientras_en_campo': 'mientras esta carta esté en el campo',
      'mientras_equipped': 'mientras esté equipado',
      '1_por_turno': 'una vez por turno',
      'n_turnos': data.duracionTurnos ? `por ${data.duracionTurnos} turnos` : 'por N turnos',
    }
    parts.push(durationTexts[data.duracion] || data.duracion)
  }

  // Condition (Arcana activation)
  if (data.condicion) {
    parts.push(`Condición: ${data.condicion}`)
  }

  // Regroup ether
  if (data.reagrupar) {
    const faseText = data.reagrupar.fase === 'alba' ? 'Alba' : 'Choque'
    const turnoText = data.reagrupar.turno === 'propio' ? 'tu' : 'del oponente'
    parts.push(`Al inicio de ${turnoText} ${faseText} reagrupa el Éter usado por este efecto`)
  }

  // Build final text
  let text = parts.length > 0 ? parts.join(' ') + '.' : 'Efecto sin definir.'

  // Capitalize first letter after effect type label (e.g., "Pasivo: text...")
  // The first letter of the generated text should be uppercase
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1)
  }

  return text
}

/** Generate text for Comandante effect — applies to all champions of same faction */
export function generateComandanteText(data: EfectoData): string {
  const parts: string[] = []

  // Effect action
  const effectTexts: Record<string, string> = {
    'buff': 'ganan',
    'debuff': 'pierden',
    'keyword': 'adquieren',
  }

  if (data.efecto) {
    const effect = effectTexts[data.efecto] || data.efecto

    if (data.efecto === 'buff' || data.efecto === 'debuff') {
      const stats = data.stats || {}
      const statParts: string[] = []
      if (stats.ATQ) statParts.push(`${stats.ATQ > 0 ? '+' : ''}${stats.ATQ} de ATQ`)
      if (stats.RES) statParts.push(`${stats.RES > 0 ? '+' : ''}${stats.RES} de RES`)
      if (statParts.length > 0) {
        parts.push(`${effect} ${statParts.join(' y ')}`)
      }
    } else if (data.efecto === 'keyword' && data.keyword) {
      parts.push(`${effect} ${data.keyword}`)
    }
  }

  let text = parts.length > 0 ? parts.join(' ') + '.' : 'Efecto sin definir.'
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1)
  }
  return text
}

export function EffectList({ cardType, effects, onChange, maxEffects = 3 }: EffectListProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const allowedTypes = ALLOWED_EFFECTS[cardType] || []
  const usedTypes = effects.map((e) => e.tipo)
  const availableTypes = allowedTypes.filter((t) => !usedTypes.includes(t))

  const addEffect = () => {
    if (effects.length >= maxEffects) return
    if (availableTypes.length === 0) return

    const newEffect: EfectoData = {
      tipo: availableTypes[0],
    }
    onChange([...effects, newEffect])
    setExpandedIdx(effects.length)
  }

  const removeEffect = (idx: number) => {
    const newEffects = effects.filter((_, i) => i !== idx)
    onChange(newEffects)
    if (expandedIdx === idx) setExpandedIdx(null)
    else if (expandedIdx !== null && expandedIdx > idx) setExpandedIdx(expandedIdx - 1)
  }

  const updateEffect = (idx: number, data: EfectoData) => {
    const newEffects = [...effects]
    newEffects[idx] = data
    // Auto-generate text
    newEffects[idx].texto = generateEffectText(data)
    onChange(newEffects)
  }

  const canAdd = effects.length < maxEffects && availableTypes.length > 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-300">
          Efectos ({effects.length}/{maxEffects})
        </p>
        {canAdd && (
          <button
            onClick={addEffect}
            className="text-xs bg-ether-600/30 hover:bg-ether-600/50 text-ether-200 px-2 py-1 rounded transition-colors cursor-pointer"
          >
            + Agregar Efecto
          </button>
        )}
      </div>

      {effects.length === 0 && (
        <p className="text-xs text-gray-500 italic">Sin efectos definidos — presiona "+ Agregar Efecto" para comenzar</p>
      )}

      {effects.map((effect, idx) => {
        const isExpanded = expandedIdx === idx
        const effectLabel = effect.tipo ? effect.tipo.charAt(0).toUpperCase() + effect.tipo.slice(1) : `Efecto ${idx + 1}`

        return (
          <div key={idx} className="border border-gray-600/50 rounded-lg overflow-hidden">
            {/* Header — always visible */}
            <div
              className="flex items-center justify-between px-3 py-2 bg-gray-800/50 cursor-pointer hover:bg-gray-800/80 transition-colors"
              onClick={() => setExpandedIdx(isExpanded ? null : idx)}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-400">#{idx + 1}</span>
                <span className="text-sm font-medium text-gray-200">{effectLabel}</span>
                {effect.texto && (
                  <span className="text-xs text-gray-500 truncate max-w-[300px]">
                    — {effect.texto}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); removeEffect(idx) }}
                  className="text-xs text-red-400 hover:text-red-300 px-1"
                >
                  ✕
                </button>
                <span className="text-xs text-gray-500">{isExpanded ? '▲' : '▼'}</span>
              </div>
            </div>

            {/* Expanded editor */}
            {isExpanded && (
              <div className="p-3 border-t border-gray-700">
                <EffectField
                  label=""
                  value={effect}
                  onChange={(v) => { if (v) updateEffect(idx, v) }}
                  showFields={['tipo', 'costoTipo', 'costoMax', 'zonaActivacion', 'frecuencia', 'trigger', 'objetivo', 'efecto', 'stats', 'keyword', 'duracion', 'duracionTurnos', 'condicion', 'cantidad', 'maxObjetivos', 'reagrupar', 'condicionSecundaria', 'statsReserva']}
                  cardType={cardType}
                />
                {/* Auto-generated text preview */}
                {effect.texto && (
                  <div className="mt-2 p-2 bg-gray-900/50 rounded border border-gray-700/50">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Texto generado (auto)</p>
                    <p className="text-xs text-gray-300 italic">{effect.texto}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
