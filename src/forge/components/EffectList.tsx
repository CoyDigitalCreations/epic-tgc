/**
 * EffectList — Unified effect editor with add/remove/reorder.
 * 11-layer system: tipo → trigger → costo → objetivo → efecto → stats → cantidad → keyword → duracion → reagrupar → condicion
 * Auto-generates human-readable text from structured data.
 */
import { useState } from 'react'
import type { EfectoData, CardType, ObjetivoEfecto, CopyAttribute } from '../../shared/types/cards'
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
  'Arcana': ['hechizo'],
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
function generateTargetText(objetivo: ObjetivoEfecto, sinArticulo = false): string {
  // Special cases
  if (objetivo.tipo === 'self') return 'esta carta'
  if (objetivo.tipo === 'todos_campeones_propios') return 'todos tus Campeones'
  if (objetivo.tipo === 'todos_campeones_rivales') return 'todos los Campeones que controla el rival'
  if (objetivo.tipo === 'rival_hand') return 'el rival'
  if (objetivo.tipo === 'equipped_champion') return 'el Campeón equipado con esta carta'

  // Ranking selection: "el Campeón con mayor ATQ", etc.
  if (objetivo.filtros?.seleccionar) {
    const { stat, orden } = objetivo.filtros.seleccionar
    const statTexts: Record<string, string> = { 'poder': 'ATQ', 'resistencia': 'RES', 'coste': 'coste' }
    const ordenTexts: Record<string, string> = { 'mayor': 'mayor', 'menor': 'menor' }
    const controllerText = objetivo.controlador === 'rival' ? ' que controla el rival'
      : objetivo.controlador === 'ambos' ? ' en juego'
      : ''
    return `el Campeón con ${ordenTexts[orden]} ${statTexts[stat]}${controllerText}`
  }

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
    'reserva': 'a la Reserva', 'pagado': 'a la zona de pago de su dueño',
    'bloqueado': 'a bloqueado', 'mano': 'a la mano', 'mazo': 'al mazo',
  }

  const tipo = tipoTexts[objetivo.tipo] || objetivo.tipo
  const controlador = controladorTexts[objetivo.controlador] || ''
  const zona = zonaTexts[objetivo.zona] || ''
  const zonaDestino = objetivo.zonaDestino ? zonaDestinoTexts[objetivo.zonaDestino] || '' : ''

  let text = ''
  
  if (objetivo.tipo === 'campeon' || objetivo.tipo === 'carta' || objetivo.tipo === 'mano') {
    text = sinArticulo ? tipo : `un${objetivo.tipo === 'carta' || objetivo.tipo === 'mano' ? 'a' : ''} ${tipo}`
  } else if (objetivo.tipo === 'mistica' || objetivo.tipo === 'arcana' || objetivo.tipo === 'mistica_arcana') {
    text = sinArticulo ? tipo : `una ${tipo}`
  } else if (objetivo.tipo === 'eter' || objetivo.tipo === 'vinculo') {
    text = tipo
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
    if (objetivo.filtros.puedeBloquearEter === true) filters.push('que pueda recibir éter bloqueado')
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
  if (zonaDestino && !text.includes('de su dueño')) text += ` ${zonaDestino}`

  return text || 'un objetivo'
}

/** Labels for copy attributes in natural Spanish */
const COPY_ATTRIBUTE_LABELS: Record<CopyAttribute, string> = {
  // Campeón
  faccion: 'la facción',
  keyword: 'la keyword',
  atq: 'el ATQ',
  res: 'el RES',
  efecto: 'el efecto',
  // Mística
  mistica_hechizo: 'el efecto de hechizo',
  mistica_continuo: 'el efecto continuo',
  // Arcana
  arcana_condicion: 'la condición',
  arcana_recompensa: 'la recompensa',
  // Éter
  eter_reserva: 'el efecto de reserva',
  eter_pago: 'el efecto de pago',
  eter_bloqueo: 'el efecto de bloqueo',
  // Vínculo
  vinculo_efecto: 'el efecto',
}

/** Join copy attributes with proper Spanish grammar: "la facción y keyword" or "la facción, keyword y ATQ" */
function joinCopyAttributes(attrs: CopyAttribute[]): string {
  if (attrs.length === 0) return ''
  const labels = attrs.map((a) => COPY_ATTRIBUTE_LABELS[a])
  if (labels.length === 1) return labels[0]
  if (labels.length === 2) return `${labels[0]} y ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')} y ${labels[labels.length - 1]}`
}

/** Generate human-readable text from EfectoData — 11-layer system */
function generateEffectText(data: EfectoData): string {
  const parts: string[] = []

  // Helper: add part with trailing comma (will be cleaned at the end)
  const addPart = (text: string) => parts.push(text)

  // Capa 1: Tipo prefix — Reserva and Bloqueo get contextual prefixes
  if (data.tipo === 'reserva') addPart('Mientras esté en tu Reserva,')
  if (data.tipo === 'bloqueo') addPart('Mientras esté bloqueado,')

  // Capa 2: Trigger
  if (data.trigger && data.trigger !== 'ninguno') {
    const esRival = data.controladorTrigger === 'rival'
    const triggerTexts: Record<string, { propio: string; rival: string }> = {
      'al_invocar': { propio: 'Al ser invocada', rival: 'Al ser invocada por el rival' },
      'al_atacar': { propio: 'Al atacar', rival: 'Al atacar el rival' },
      'al_matar_en_combate': { propio: 'Al matar en combate', rival: 'Al matar en combate el rival' },
      'al_pagar_eter': { propio: 'Cuando pagues esta carta', rival: 'Cuando el rival pague esta carta' },
      'inicio_choque': { propio: 'Al inicio de tu Choque', rival: 'Al inicio del Choque del rival' },
      'inicio_alba': { propio: 'Al inicio de tu Alba', rival: 'Al inicio de la Alba del rival' },
      'al_jugar_mistica': { propio: 'Al jugar esta Mística', rival: 'Al jugar esta Mística el rival' },
      'al_resolver_cadena': { propio: 'Al resolver la cadena', rival: 'Al resolver la cadena el rival' },
      'al_activar_habilidad': { propio: 'Al activar esta habilidad', rival: 'Al activar esta habilidad el rival' },
      'al_ser_enviado_al_cementerio': { propio: 'Al ser enviada al Cementerio', rival: 'Al ser enviada al Cementerio por el rival' },
      'al_ser_destruido_vinculo': { propio: 'Al ser destruido este Vínculo', rival: 'Al ser destruido este Vínculo por el rival' },
      'cuando_vinculo_seria_destruido': { propio: 'Cuando un Vínculo que controles fuera a ser destruido', rival: 'Cuando un Vínculo del rival fuera a ser destruido' },
    }
    let triggerText = triggerTexts[data.trigger]?.[esRival ? 'rival' : 'propio'] ?? data.trigger
    // Add zone specification for al_ser_enviado_al_cementerio
    if (data.trigger === 'al_ser_enviado_al_cementerio' && data.triggerZona) {
      const zonaTexts: Record<string, string> = {
        'mano': 'desde tu mano',
        'campo': 'desde el campo',
        'cualquier_zona': 'desde cualquier zona',
      }
      triggerText += ` ${zonaTexts[data.triggerZona]}`
    }
    addPart(`${triggerText},`)
  }

  // Capa 3: Costo
  if (data.costo && data.costo.tipo !== 'ninguno') {
    if (data.costo.tipo === 'eter' && data.costo.cantidad) {
      if (data.efecto === 'block_ether') addPart(`puedes bloquear ${data.costo.cantidad} Éter,`)
      else addPart(`puedes pagar ${data.costo.cantidad} Éter,`)
    } else if (data.costo.tipo === 'eter_bloqueado' && data.costo.cantidad) {
      addPart(`puedes bloquear hasta un máximo de ${data.costo.cantidad} Éter (Max. ${data.costo.cantidad}),`)
    } else if (data.costo.tipo === 'bloqueo_fijo' && data.costo.cantidad) {
      addPart(`bloquea ${data.costo.cantidad} Éter,`)
    } else if (data.costo.tipo === 'exhaust') {
      addPart('puedes agotar esta carta,')
    } else if (data.costo.tipo === 'exile_self') {
      addPart('puedes enviar esta carta a tu exilio,')
    } else if (data.costo.tipo === 'cemetery_self') {
      addPart('puedes enviar esta carta a tu Cementerio,')
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
      'return_hand': 'devuelve a la mano de su dueño', 'draw': 'roba', 'steal_champion': 'toma control de',
      'steal_ether': 'toma control de', 'block_ether': 'bloquea', 'free_ether': 'libera',
      'return_ether': 'devuelve', 'mover': 'mueve', 'toggle_exhaust': 'cambia el agotamiento de',
      'prevent_destroy': 'no es destruido', 'scry': 'mira', 'tutor': 'busca',
      'copy': 'copia', 'redirect': 'cambia',
      'direct_attack': 'ataca directamente',
      'change_type': 'se convierte en', 'grant_keyword': 'gana',
      'recuperar_campo': 'invoca del Cementerio', 'recuperar_mano': 'devuelve a la mano de su dueño',
      'recuperar_mazo': 'devuelve al mazo de su dueño', 'recuperar_mazo_barajar': 'devuelve al mazo de su dueño y baraja',
      'recuperar_mazo_top': 'pone en la parte superior del mazo de su dueño',
      'recuperar_mazo_bottom': 'pone en la parte inferior del mazo de su dueño',
      'recuperar_exilio': 'devuelve del Exilio',
    }

    // Special case: double_attack - "puede declarar 2 veces ataque"
    if (data.efecto === 'double_attack') {
      targetText = `${targetText} puede declarar 2 veces ataque`
    } else if (data.efecto === 'invocar' || data.efecto === 'invocar_y_equipar') {
      // Composite effect: summon from zone (+ optionally equip)
      const zonaTexts: Record<string, string> = {
        'cementerio': 'del Cementerio',
        'exilio': 'del Exilio',
        'mano': 'de tu mano',
        'mazo': 'de tu mazo',
      }
      const zona = zonaTexts[data.zonaOrigen ?? 'cementerio']

      // Build champion description with filters
      const filtros: string[] = []
      if (data.objetivo?.filtros?.faccion) filtros.push(`de facción ${data.objetivo.filtros.faccion}`)
      if (data.objetivo?.filtros?.costeMax !== undefined) filtros.push(`de coste ${data.objetivo.filtros.costeMax} éter o menos`)
      if (data.objetivo?.filtros?.esencia) filtros.push(`de esencia ${data.objetivo.filtros.esencia}`)
      if (data.objetivo?.filtros?.keyword) filtros.push(`con keyword ${data.objetivo.filtros.keyword}`)
      const filtrosStr = filtros.length > 0 ? ` ${filtros.join(' ')}` : ''

      if (data.efecto === 'invocar') {
        targetText = `invoca un Campeón${filtrosStr} ${zona} de su dueño`
      } else {
        targetText = `invoca un Campeón${filtrosStr} ${zona} de su dueño y equipa esta carta a ese Campeón`
      }
    } else if (data.efecto === 'prevent_destroy' && data.objetivo?.tipo === 'vinculo') {
      // Special case: bond protection - "previniendo la destrucción de ese vínculo"
      targetText = `previniendo la destrucción de ese vínculo`
    } else if (data.efecto === 'negar') {
      // Special case: negation effects — prepend negation text, keep target
      const negacionTexts: Record<string, string> = {
        'invocacion': 'Niega la invocación',
        'activacion': 'Niega la activación del efecto',
        'resolucion': 'Niega la resolución',
        'efecto_activo': 'Niega el efecto activo',
        'pago': 'Niega el pago',
        'ataque': 'Niega el ataque',
        'bloqueo': 'Niega la declaración de bloqueo',
        'robo': 'Niega el robo',
      }
      const negText = negacionTexts[data.tipoNegacion || 'activacion'] || 'Niega'
      targetText = `${negText} de ${targetText}`
    } else {
      effectVerb = effectVerbs[data.efecto] || data.efecto
      if (plural) effectVerb = pluralize(effectVerb)

      // Stats handling
      if (data.efecto === 'buff' || data.efecto === 'debuff') {
        const statParts: string[] = []
        if (data.stats?.ATQ) statParts.push(`${Math.abs(data.stats.ATQ)} de ATQ`)
        if (data.stats?.RES) statParts.push(`${Math.abs(data.stats.RES)} de RES`)
        if (statParts.length > 0) {
          if (data.buffPerBlockedEther) {
            targetText = `${targetText} gana ${statParts.join(' y ')} por cada Éter bloqueado`
          } else {
            targetText = `${targetText} ${effectVerb} ${statParts.join(' y ')}`
          }
        }
      } else if (data.efecto === 'grant_keyword' && data.keyword) {
        targetText = `${targetText} ${effectVerb} ${data.keyword}`
      } else if (['draw', 'destroy', 'exile', 'scry', 'tutor', 'return_hand', 'recuperar_campo', 'recuperar_mano', 'recuperar_mazo', 'recuperar_mazo_barajar', 'recuperar_mazo_top', 'recuperar_mazo_bottom', 'recuperar_exilio'].includes(data.efecto)) {
        const qty = data.cantidad ?? 1
        const hasta = data.esHasta ? 'hasta ' : ''
        targetText = `${effectVerb} ${hasta}${qty} ${targetText}`
        // tutor: agregar zona origen y destino
        if (data.efecto === 'tutor') {
          if (data.zonaOrigen) {
            const zonaOrigenTexts: Record<string, string> = {
              'cementerio': 'de tu Cementerio', 'exilio': 'del Exilio',
              'mano': 'de tu mano', 'mazo': 'de tu mazo',
            }
            targetText += ` ${zonaOrigenTexts[data.zonaOrigen] ?? ''}`
          }
          if (data.objetivo?.zonaDestino) {
            const destinoTexts: Record<string, string> = {
              'mano': 'a tu mano', 'campo': 'al campo',
              'cementerio': 'a tu Cementerio', 'exilio': 'al Exilio',
            }
            targetText += ` y ${destinoTexts[data.objetivo.zonaDestino] ?? `a ${data.objetivo.zonaDestino}`}`
          }
        }
      } else if (['mover', 'return_ether'].includes(data.efecto)) {
        const qty = data.cantidad ?? 1
        const hasta = data.esHasta ? 'hasta ' : ''
        targetText = `${effectVerb} ${hasta}${qty} ${targetText}`
      } else if (['block_ether', 'free_ether'].includes(data.efecto) && data.costo?.tipo) {
        targetText = `sobre ${targetText}`
      } else if (data.efecto === 'copy' && data.copyAttributes && data.copyAttributes.length > 0) {
        // Copy effect: "copia la facción y keyword de un Campeón que controla el rival"
        const attrText = joinCopyAttributes(data.copyAttributes)
        targetText = `${effectVerb} ${attrText} de ${targetText}`
      } else {
        targetText = `${effectVerb} ${targetText}`
      }
    }
  }

  // Capa 4+5 merged: push target+effect text into parts
  if (targetText) addPart(`${targetText},`)

  // Capa 7: Duración
  if (data.duracion) {
    const durationTexts: Record<string, string> = {
      'permanente': 'de forma permanente', 'turno': 'hasta el final del turno',
      'hasta_alba': 'hasta tu próxima Alba', 'hasta_alba_oponente': 'hasta la próxima Alba del oponente',
      'mientras_ester_bloqueado': 'mientras ese Éter esté bloqueado',
      'mientras_en_campo': 'mientras esta carta esté en el campo', 'mientras_equipped': 'mientras esté equipado',
      '1_por_turno': 'una vez por turno', 'n_turnos': data.duracionTurnos ? `por ${data.duracionTurnos} turnos` : 'por N turnos',
    }
    addPart(`${durationTexts[data.duracion] || data.duracion},`)
  }

  // Sin activar efecto modifier
  if (data.sinActivarEfecto) {
    addPart('negando su efecto,')
  }

  // Capa 8: Reagrupar (no comma at end)
  if (data.reagrupar) {
    const faseText = data.reagrupar.fase === 'alba' ? 'Alba' : 'Choque'
    const turnoText = data.reagrupar.turno === 'propio' ? 'tu' : 'del oponente'
    addPart(`Al inicio de ${turnoText} ${faseText} reagrupa el Éter usado por este efecto`)
  }

  // Build final text
  let text = parts.length > 0 ? parts.join(' ') + '.' : 'Efecto sin definir.'
  // Clean up: remove double commas, trailing commas before period
  text = text.replace(/,\./g, '.').replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim()
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
