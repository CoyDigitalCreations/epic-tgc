/**
 * EffectList — Unified effect editor with add/remove/reorder.
 * 11-layer system: tipo → trigger → costo → objetivo → efecto → stats → cantidad → keyword → duracion → reagrupar → condicion
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
  'Campeón': ['pasivo', 'continuo', 'disparo', 'comandante'],
  'Mística': ['hechizo'],
  'Arcana': ['pasivo', 'hechizo'],
  'Éter': ['reserva', 'pago', 'bloqueo'],
  'Vínculo': ['vinculo'],
}

/** Check if target is plural (affects multiple units) */
function isPluralTarget(objetivo: ObjetivoEfecto | undefined): boolean {
  if (!objetivo) return false
  return objetivo.controlador === 'ambos'
}

/** Conjugate verb to plural in Spanish */
function pluralize(verb: string): string {
  const plurals: Record<string, string> = {
    'gana': 'ganan', 'pierde': 'pierden', 'destruye': 'destruyen',
    'exilia': 'exilian', 'devuelve a la mano': 'devuelven a la mano',
    'roba': 'roban', 'toma control de': 'toman control de',
    'bloquea': 'bloquean', 'libera': 'liberan', 'devuelve': 'devuelven',
    'cambia el agotamiento de': 'cambian el agotamiento de',
    'no es destruido': 'no son destruidos', 'mira': 'miran',
    'busca': 'buscan', 'contrarresta': 'contrarrestan', 'copia': 'copian',
    'cambia': 'cambian', 'ataca dos veces': 'atacan dos veces',
    'ataca directamente': 'atacan directamente', 'se convierte en': 'se convierten en',
    'invoca': 'invocan', 'devuelve a tu mano': 'devuelven a tu mano',
    'devuelve a tu mazo': 'devuelven a tu mazo', 'devuelve del Exilio': 'devuelven del Exilio',
  }
  return plurals[verb] || verb
}

/** Generate target text from structured ObjetivoEfecto */
function generateTargetText(objetivo: ObjetivoEfecto): string {
  // Special cases
  if (objetivo.tipo === 'self') return 'esta carta'
  if (objetivo.tipo === 'todos_campeones_propios') return 'todos tus Campeones'
  if (objetivo.tipo === 'todos_campeones_rivales') return 'todos los Campeones que controla el rival'
  if (objetivo.tipo === 'rival_hand') return 'el rival'

  const tipoTexts: Record<string, string> = {
    'campeon': 'Campeón', 'mistica': 'Mística', 'arcana': 'Arcana',
    'mistica_arcana': 'Mística o Arcana', 'eter': 'Éter', 'vinculo': 'Vínculo',
    'carta': 'carta', 'mano': 'carta',
  }
  const controladorTexts: Record<string, string> = {
    'propio': 'que controles', 'rival': 'que controla el rival', 'ambos': 'en juego', 'ninguno': '',
  }
  const zonaTexts: Record<string, string> = {
    'campo': '', 'cementerio': 'del Cementerio', 'exilio': 'del Exilio',
    'reserva': 'de la Reserva', 'pagado': 'de la zona de pago',
    'bloqueado': 'bloqueado', 'mano': 'de la mano', 'mazo': 'del mazo',
  }
  const zonaDestinoTexts: Record<string, string> = {
    'campo': 'al campo', 'cementerio': 'al Cementerio', 'exilio': 'al Exilio',
    'reserva': 'a la Reserva', 'pagado': 'a su zona de pago',
    'bloqueado': 'a bloqueado', 'mano': 'a la mano', 'mazo': 'al mazo',
  }

  const tipo = tipoTexts[objetivo.tipo] || objetivo.tipo
  const controlador = controladorTexts[objetivo.controlador] || ''
  const zona = zonaTexts[objetivo.zona] || ''
  const zonaDestino = objetivo.zonaDestino ? zonaDestinoTexts[objetivo.zonaDestino] || '' : ''

  let text = ''
  
  // Check if filters include tipoCarta - if so, don't add card type to base text
  const hasTipoCartaFilter = objetivo.filtros?.tipoCarta
  
  if (!hasTipoCartaFilter) {
    if (objetivo.tipo === 'campeon' || objetivo.tipo === 'carta' || objetivo.tipo === 'mano') {
      text = `un${objetivo.tipo === 'carta' || objetivo.tipo === 'mano' ? 'a' : ''} ${tipo}`
    } else if (objetivo.tipo === 'mistica' || objetivo.tipo === 'arcana' || objetivo.tipo === 'mistica_arcana') {
      text = `una ${tipo}`
    } else if (objetivo.tipo === 'eter' || objetivo.tipo === 'vinculo') {
      text = tipo
    }
  } else {
    // When tipoCarta filter exists, don't add card type to base text
    text = ''
  }

  // Add filters AFTER card type (for better grammar)
  if (objetivo.filtros) {
    const filters: string[] = []
    
    // Common filters
    if (objetivo.filtros.faccion) filters.push(`de facción ${objetivo.filtros.faccion}`)
    if (objetivo.filtros.keyword) filters.push(`con keyword ${objetivo.filtros.keyword}`)
    if (objetivo.filtros.costeMax !== undefined) filters.push(`coste ${objetivo.filtros.costeMax} o menos`)
    
    // Campeón-specific filters
    if (objetivo.filtros.esencia) filters.push(`de esencia ${objetivo.filtros.esencia}`)
    if (objetivo.filtros.rol) filters.push(`de rol ${objetivo.filtros.rol}`)
    if (objetivo.filtros.catHabilidad) filters.push(`de categoría ${objetivo.filtros.catHabilidad}`)
    if (objetivo.filtros.costeMin !== undefined) filters.push(`de coste ${objetivo.filtros.costeMin} o más`)
    if (objetivo.filtros.atqMax !== undefined) filters.push(`ATQ ${objetivo.filtros.atqMax} o menos`)
    if (objetivo.filtros.resMax !== undefined) filters.push(`RES ${objetivo.filtros.resMax} o menos`)
    if (objetivo.filtros.agotado === true) filters.push('que esté agotado')
    if (objetivo.filtros.agotado === false) filters.push('que no esté agotado')
    if (objetivo.filtros.conEterBloqueado === true) filters.push('con éter bloqueado')
    if (objetivo.filtros.conEterBloqueado === false) filters.push('sin éter bloqueado')
    if (objetivo.filtros.equipado === true) filters.push('equipado')
    if (objetivo.filtros.equipado === false) filters.push('sin equipar')
    
    // Mística-specific filters
    if (objetivo.filtros.tipoEfectoMistica) filters.push(`de tipo ${objetivo.filtros.tipoEfectoMistica}`)
    
    // Arcana-specific filters
    if (objetivo.filtros.bocaArriba === true) filters.push('boca arriba')
    if (objetivo.filtros.bocaArriba === false) filters.push('boca abajo')
    
    // Insert filters after card type
    if (filters.length > 0) text = `${text} ${filters.join(' ')}`
  }

  // Special handling for zones that don't use "que controles"
  // These zones use "de tu X" or "del X del rival" instead
  const zonesWithOwner = ['cementerio', 'mano', 'mazo', 'exilio']
  if (zonesWithOwner.includes(objetivo.zona)) {
    const zonaOwnerTexts: Record<string, { propio: string; rival: string }> = {
      'cementerio': { propio: 'de tu Cementerio', rival: 'del Cementerio del rival' },
      'mano': { propio: 'de tu mano', rival: 'de la mano del rival' },
      'mazo': { propio: 'de tu mazo', rival: 'del mazo del rival' },
      'exilio': { propio: 'del Exilio', rival: 'del Exilio del rival' },
    }
    const zonaText = zonaOwnerTexts[objetivo.zona]
    if (zonaText) {
      text += objetivo.controlador === 'propio' ? ` ${zonaText.propio}` : ` ${zonaText.rival}`
    }
  } else {
    // For other zones (campo, reserva, pagado, bloqueado), use the original logic
    if (controlador) text += ` ${controlador}`
    if (zona) text += ` ${zona}`
  }
  if (zonaDestino) text += ` ${zonaDestino}`

  return text || 'un objetivo'
}

/** Generate human-readable text from EfectoData — 11-layer system */
function generateEffectText(data: EfectoData): string {
  const parts: string[] = []

  // Capa 1: Tipo prefix — Reserva and Bloqueo get contextual prefixes
  if (data.tipo === 'reserva') parts.push('Mientras esté en tu Reserva,')
  if (data.tipo === 'bloqueo') parts.push('Mientras esté bloqueado,')

  // Capa 2: Trigger
  if (data.trigger && data.trigger !== 'ninguno') {
    const triggerTexts: Record<string, string> = {
      'al_invocar': 'Al ser invocada', 'al_atacar': 'Al atacar',
      'al_matar_en_combate': 'Al matar en combate', 'al_pagar_eter': 'Cuando pagues esta carta',
      'inicio_choque': 'Al inicio de tu Choque', 'inicio_alba': 'Al inicio de tu Alba',
      'al_jugar_mistica': 'Al jugar esta Mística', 'al_resolver_cadena': 'Al resolver la cadena',
      'al_activar_habilidad': 'Al activar esta habilidad',
      'al_ser_enviado_al_cementerio': 'Al ser enviada al Cementerio',
      'al_ser_destruido_vinculo': 'Al ser destruido este Vínculo',
      'cuando_vinculo_seria_destruido': 'Cuando un Vínculo que controles fuera a ser destruido',
    }
    let triggerText = triggerTexts[data.trigger] || data.trigger
    // Add zone specification for al_ser_enviado_al_cementerio
    if (data.trigger === 'al_ser_enviado_al_cementerio' && data.triggerZona) {
      const zonaTexts: Record<string, string> = {
        'mano': 'desde tu mano',
        'campo': 'desde el campo',
        'cualquier_zona': 'desde cualquier zona',
      }
      triggerText += ` ${zonaTexts[data.triggerZona]}`
    }
    parts.push(triggerText)
  }

  // Capa 3: Costo
  if (data.costo && data.costo.tipo !== 'ninguno') {
    if (data.costo.tipo === 'eter' && data.costo.cantidad) {
      if (data.efecto === 'block_ether') parts.push(`puedes bloquear ${data.costo.cantidad} Éter`)
      else parts.push(`puedes pagar ${data.costo.cantidad} Éter`)
    } else if (data.costo.tipo === 'eter_bloqueado' && data.costo.cantidad) {
      parts.push(`puedes bloquear hasta un máximo de ${data.costo.cantidad} Éter (Max. ${data.costo.cantidad})`)
    } else if (data.costo.tipo === 'exhaust') {
      parts.push('puedes agotar esta carta')
    } else if (data.costo.tipo === 'exile_self') {
      parts.push('puedes enviar esta carta a tu exilio')
    } else if (data.costo.tipo === 'cemetery_self') {
      parts.push('puedes enviar esta carta a tu Cementerio')
    }
  }

  // Capa 4+5: Objetivo + Efecto
  let targetText = ''
  let effectVerb = ''

  if (data.objetivo && data.efecto) {
    // Special case: bloqueo effects reference the champion that has this ether
    if (data.tipo === 'bloqueo' && data.objetivo.tipo === 'campeon') {
      targetText = 'el Campeón que tenga este Éter'
    } else {
      targetText = generateTargetText(data.objetivo)
    }
    const plural = isPluralTarget(data.objetivo)

    const effectVerbs: Record<string, string> = {
      'buff': 'gana', 'debuff': 'pierde', 'destroy': 'destruye', 'exile': 'exilia',
      'return_hand': 'devuelve a la mano', 'draw': 'roba', 'steal_champion': 'toma control de',
      'steal_ether': 'toma control de', 'block_ether': 'bloquea', 'free_ether': 'libera',
      'return_ether': 'devuelve', 'mover': 'mueve', 'toggle_exhaust': 'cambia el agotamiento de',
      'prevent_destroy': 'no es destruido', 'scry': 'mira', 'tutor': 'busca',
      'counter': 'contrarresta', 'copy': 'copia', 'redirect': 'cambia',
      'direct_attack': 'ataca directamente',
      'change_type': 'se convierte en', 'grant_keyword': 'gana',
      'recuperar_campo': 'invoca', 'recuperar_mano': 'devuelve a tu mano',
      'recuperar_mazo': 'devuelve a tu mazo', 'recuperar_mazo_barajar': 'devuelve a tu mazo y baraja',
      'recuperar_mazo_top': 'pone en la parte superior de tu mazo',
      'recuperar_mazo_bottom': 'pone en la parte inferior de tu mazo',
      'recuperar_exilio': 'devuelve del Exilio',
    }

    // Special case: double_attack - "puede declarar 2 veces ataque"
    if (data.efecto === 'double_attack') {
      targetText = `${targetText} puede declarar 2 veces ataque`
    } else if (data.efecto === 'prevent_destroy' && data.objetivo?.tipo === 'vinculo') {
      // Special case: bond protection - "previniendo la destrucción de ese vínculo"
      targetText = `previniendo la destrucción de ese vínculo`
    } else {
      effectVerb = effectVerbs[data.efecto] || data.efecto
      if (plural) effectVerb = pluralize(effectVerb)

      // Stats handling
      if (data.efecto === 'buff' || data.efecto === 'debuff') {
        const statParts: string[] = []
        if (data.stats?.ATQ) statParts.push(`${data.stats.ATQ > 0 ? '+' : ''}${data.stats.ATQ} de ATQ`)
        if (data.stats?.RES) statParts.push(`${data.stats.RES > 0 ? '+' : ''}${data.stats.RES} de RES`)
        if (statParts.length > 0) targetText = `${targetText} ${effectVerb} ${statParts.join(' y ')}`
      } else if (data.efecto === 'grant_keyword' && data.keyword) {
        targetText = `${targetText} ${effectVerb} ${data.keyword}`
      } else if (['draw', 'destroy', 'exile', 'scry'].includes(data.efecto)) {
        const qty = data.cantidad ?? 1
        targetText = `${effectVerb} ${qty} ${targetText}`
      } else if (['mover', 'return_ether'].includes(data.efecto)) {
        const qty = data.cantidad ?? 1
        targetText = `${effectVerb} ${qty} ${targetText}`
      } else if (data.efecto === 'return_hand') {
        const qty = data.cantidad ?? 1
        targetText = `devuelve a la mano de su dueño ${qty} ${targetText}`
      } else if (['block_ether', 'free_ether'].includes(data.efecto) && data.costo?.tipo) {
        targetText = `sobre ${targetText}`
      } else {
        targetText = `${effectVerb} ${targetText}`
      }
    }
  }

  // Capa 4+5 merged: push target+effect text into parts
  if (targetText) parts.push(targetText)

  // Capa 7: Duración
  if (data.duracion) {
    const durationTexts: Record<string, string> = {
      'permanente': 'de forma permanente', 'turno': 'hasta el final del turno',
      'hasta_alba': 'hasta tu próxima Alba', 'hasta_alba_oponente': 'hasta la próxima Alba del oponente',
      'mientras_ester_bloqueado': 'mientras ese Éter esté bloqueado',
      'mientras_en_campo': 'mientras esta carta esté en el campo', 'mientras_equipped': 'mientras esté equipado',
      '1_por_turno': 'una vez por turno', 'n_turnos': data.duracionTurnos ? `por ${data.duracionTurnos} turnos` : 'por N turnos',
    }
    parts.push(durationTexts[data.duracion] || data.duracion)
  }

  // Sin activar efecto modifier
  if (data.sinActivarEfecto) {
    parts.push('negando su efecto')
  }

  // Capa 8: Reagrupar
  if (data.reagrupar) {
    const faseText = data.reagrupar.fase === 'alba' ? 'Alba' : 'Choque'
    const turnoText = data.reagrupar.turno === 'propio' ? 'tu' : 'del oponente'
    parts.push(`Al inicio de ${turnoText} ${faseText} reagrupa el Éter usado por este efecto`)
  }

  // Build final text
  let text = parts.length > 0 ? parts.join(' ') + '.' : 'Efecto sin definir.'
  if (text.length > 0) text = text.charAt(0).toUpperCase() + text.slice(1)
  return text
}

export function EffectList({ cardType, effects, onChange, maxEffects = 3 }: EffectListProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const allowedTypes = ALLOWED_EFFECTS[cardType] || []
  const usedTypes = effects.map((e) => e.tipo)
  const availableTypes = allowedTypes.filter((t) => !usedTypes.includes(t))

  const addEffect = () => {
    if (effects.length >= maxEffects || availableTypes.length === 0) return
    const newEffect: EfectoData = {
      tipo: availableTypes[0],
      efecto: 'buff',
      objetivo: { tipo: 'campeon', controlador: 'propio', zona: 'campo' },
      stats: { ATQ: 0, RES: 0 },
    }
    // Generate text immediately
    newEffect.texto = generateEffectText(newEffect)
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
    newEffects[idx].texto = generateEffectText(data)
    onChange(newEffects)
  }

  const canAdd = effects.length < maxEffects && availableTypes.length > 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-300">Efectos ({effects.length}/{maxEffects})</p>
        {canAdd && (
          <button onClick={addEffect} className="text-xs bg-ether-600/30 hover:bg-ether-600/50 text-ether-200 px-2 py-1 rounded transition-colors cursor-pointer">
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
          <div key={idx} className="border border-gray-600/50 rounded-lg">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-800/50 cursor-pointer hover:bg-gray-800/80 transition-colors"
              onClick={() => setExpandedIdx(isExpanded ? null : idx)}>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xs font-mono text-gray-400 shrink-0">#{idx + 1}</span>
                <span className="text-sm font-medium text-gray-200 shrink-0">{effectLabel}</span>
                {effect.texto && (
                  <span className="text-xs text-gray-500 truncate min-w-0">— {effect.texto}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => { e.stopPropagation(); removeEffect(idx) }}
                  className="text-xs text-red-400 hover:text-red-300 px-1">✕</button>
                <span className="text-xs text-gray-500">{isExpanded ? '▲' : '▼'}</span>
              </div>
            </div>
            {isExpanded && (
              <div className="p-3 border-t border-gray-700">
                <EffectField label="" value={effect}
                  onChange={(v) => { if (v) updateEffect(idx, v) }}
                  cardType={cardType} />
                {effect.texto && (
                  <div className="mt-2 p-2 bg-gray-900/50 rounded border border-gray-700/50">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Texto generado</p>
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
