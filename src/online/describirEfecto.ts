import type { EfectoData, ObjetivoEfecto } from '../shared/types/cards'

/**
 * Describe un EfectoData en texto legible para:
 * - Modal de pre-efectos (EffectPreviewModal)
 * - Log detallado del motor
 *
 * No intenta replicar el texto de Card-Maker al 100% — da la SEMÁNTICA
 * para que el jugador sepa qué entra en juego.
 */

function describirObjetivo(obj?: ObjetivoEfecto): string {
  if (!obj) return 'el objetivo'
  const ctrl = obj.controlador === 'rival' ? 'del rival' : obj.controlador === 'ambos' ? 'de ambos' : 'propio'
  const tipo = obj.tipo
  const mapa: Record<string, string> = {
    self: 'esta carta',
    campeon: `Campeón ${ctrl}`,
    mistica: `Mística ${ctrl}`,
    arcana: `Arcana ${ctrl}`,
    mistica_arcana: `Mística/Arcana ${ctrl}`,
    eter: `Éter ${ctrl}`,
    vinculo: `Vínculo ${ctrl}`,
    carta: `carta ${ctrl}`,
    mano: `mano ${ctrl}`,
    todos_campeones_propios: 'todos tus Campeones',
    todos_campeones_rivales: 'todos los Campeones rivales',
    rival_hand: 'mano del rival',
    equipped_champion: 'Campeón equipado',
  }
  let s = mapa[tipo] ?? tipo
  if (obj.zona && obj.zona !== 'campo' && tipo !== 'mano') {
    s += ` en ${obj.zona}`
  }
  return s
}

function describirCosto(e: EfectoData): string {
  const c = e.costo
  if (!c || c.tipo === 'ninguno') return ''
  const cant = c.cantidad ?? 1
  switch (c.tipo) {
    case 'eter': return ` (costo: ${cant} Éter)`
    case 'eter_bloqueado': return ` (costo: bloquear hasta ${cant} Éter)`
    case 'bloqueo_fijo': return ` (costo: bloquear ${cant} Éter fijo)`
    case 'exhaust': return ' (costo: agotar esta carta)'
    case 'exile_self': return ' (costo: exiliarse)'
    case 'cemetery_self': return ' (costo: ir al Cementerio)'
    default: return ` (costo: ${c.tipo})`
  }
}

function describirTrigger(e: EfectoData): string {
  if (!e.trigger || e.trigger === 'ninguno') return ''
  const mapa: Record<string, string> = {
    al_invocar: 'Al invocar',
    al_atacar: 'Al atacar',
    al_matar_en_combate: 'Al matar en combate',
    al_pagar_eter: 'Al pagar Éter',
    inicio_choque: 'Al inicio de Choque',
    inicio_alba: 'Al inicio de Alba',
    al_jugar_mistica: 'Al jugar Mística',
    al_resolver_cadena: 'Al resolver cadena',
    al_activar_habilidad: 'Al activar habilidad',
    al_ser_enviado_al_cementerio: 'Al ir al Cementerio',
    al_ser_destruido_vinculo: 'Al destruir Vínculo',
    cuando_vinculo_seria_destruido: 'Cuando un Vínculo sería destruido',
  }
  return (mapa[e.trigger] ?? e.trigger) + ' → '
}

/** Una línea por efecto, lista para modal o log. */
export function describirEfecto(e: EfectoData): string {
  const prefijo = describirTrigger(e)
  const obj = describirObjetivo(e.objetivo)
  const costo = describirCosto(e)
  const cant = e.cantidad && e.cantidad > 1 ? `${e.cantidad} ` : ''

  switch (e.efecto) {
    case 'buff': {
      const stats: string[] = []
      if (e.stats?.ATQ) stats.push(`+${Math.abs(e.stats.ATQ)} ATQ`)
      if (e.stats?.RES) stats.push(`+${Math.abs(e.stats.RES)} RES`)
      const porBloqueo = e.buffPerBlockedEther ? ' por cada Éter bloqueado' : ''
      const s = stats.length ? stats.join(' y ') : 'mejoras'
      return `${prefijo}Buff ${s} a ${obj}${porBloqueo}${costo}`
    }
    case 'debuff': {
      const stats: string[] = []
      if (e.stats?.ATQ) stats.push(`-${Math.abs(e.stats.ATQ)} ATQ`)
      if (e.stats?.RES) stats.push(`-${Math.abs(e.stats.RES)} RES`)
      const s = stats.length ? stats.join(' y ') : 'peores stats'
      return `${prefijo}Debuff ${s} a ${obj}${costo}`
    }
    case 'draw':
      return `${prefijo}Roba ${cant || '1 '}carta(s)${costo}`
    case 'destroy':
      return `${prefijo}Destruye ${obj}${costo}`
    case 'exile':
      return `${prefijo}Exilia ${obj}${costo}`
    case 'return_hand':
      return `${prefijo}Devuelve ${obj} a la mano${costo}`
    case 'steal_champion':
      return `${prefijo}Tomas control de ${obj}${costo}`
    case 'steal_ether':
      return `${prefijo}Tomas control de ${obj}${costo}`
    case 'block_ether':
      return `${prefijo}Bloquea ${cant || '1 '}Éter sobre ${obj}${costo}`
    case 'free_ether':
      return `${prefijo}Libera Éter bloqueado${costo}`
    case 'return_ether':
      return `${prefijo}Devuelve Éter${costo}`
    case 'mover':
      return `${prefijo}Mueve ${cant || '1 '}${obj}${e.sinActivarEfecto ? ' (sin activar efecto)' : ''}${costo}`
    case 'toggle_exhaust':
      return `${prefijo}Cambia agotamiento de ${obj}${costo}`
    case 'grant_keyword':
      return `${prefijo}Otorga keyword ${e.keyword ?? '?'} a ${obj}${costo}`
    case 'prevent_destroy':
      return `${prefijo}Previene destrucción de ${obj}${costo}`
    case 'scry':
      return `${prefijo}Mira ${cant || '1 '}carta(s) del mazo${costo}`
    case 'tutor':
      return `${prefijo}Busca carta (tutor)${costo}`
    case 'copy':
      return `${prefijo}Copia atributos de ${obj}${costo}`
    case 'double_attack':
      return `${prefijo}Doble ataque${costo}`
    case 'negar':
      return `${prefijo}Niega (${e.tipoNegacion ?? 'activación'})${costo}`
    case 'rival_discard':
      return `${prefijo}El rival descarta ${cant || '1 '}carta(s)${costo}`
    case 'invocar':
      return `${prefijo}Invoca desde ${e.zonaOrigen ?? 'cementerio'}${costo}`
    case 'invocar_y_equipar':
      return `${prefijo}Invoca y equipa${costo}`
    default:
      return `${prefijo}${e.efecto ?? 'efecto'} sobre ${obj}${costo}`
  }
}

/** Todas las líneas de efectos[] de una carta (para modal pre-ejecución). */
export function describirEfectosDeCarta(meta: { efectos?: EfectoData[]; efectoComandante?: EfectoData; type?: string } | null): string[] {
  if (!meta) return []
  const lineas: string[] = []
  if (meta.efectos?.length) {
    for (const e of meta.efectos) lineas.push(describirEfecto(e))
  }
  if (meta.efectoComandante) {
    lineas.push(`Comandante: ${describirEfecto(meta.efectoComandante)}`)
  }
  return lineas
}
