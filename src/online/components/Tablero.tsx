import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { aporteDe, atacantesElegibles, campeonesSacrificables, costeEterHabilidad, faccionesCompartidas, getCardMeta, sacrificiosRequeridos, esBloqueoFijo, maxEterBloqueado, efectoBloqueoAccion, parejasBloqueoOpcion, cadenaActiva, ordenResolucion } from '../game'
import type { Action, CardInstance, GameState, PlayerId } from '../game'
import { Boton as BotonUI } from '../../shared/ui/Boton'
import { Dock } from '../../shared/ui/Dock'
import { Modal } from '../../shared/ui/Modal'
import { Seccion } from '../../shared/ui/Seccion'
import { TileCarta } from '../../shared/ui/TileCarta'
import { ElegirBloqueoModal } from './ElegirBloqueoModal'
import { ElegirObjetivoModal } from './ElegirObjetivoModal'
import { ScryModal } from './ScryModal'
import { MiniCard } from './MiniCard'
import { InspectorCarta } from './InspectorCarta'
import { AnchoTableroContext, CompactoContext, InspeccionContext, useAnchoCarta, useCompacto } from './tableroContext'
import type { Inspeccion } from './tableroContext'
import {
  ANCHO_FLANCO,
  ANCHO_FLANCO_COMPACTO,
  ESCALA_FILA_ETER,
  ESCALA_VINCULO,
  RELACION_CARTA,
  RESERVA_ETIQUETA_CAMPEON,
  esViewportCompacto,
  useAnchoTablero,
  useViewport,
} from './useAnchoTablero'
import { CartaZoom } from './CartaZoom'
import { ChampionStatus, FocosChampion } from './ChampionStatus'
import { BlockingInterface } from './BlockingInterface'
import { ActiveAbilitiesPanel } from './ActiveAbilitiesPanel'
import { PriorityModal } from './PriorityModal'
import { PreventionModal } from './PreventionModal'
import { AnimacionActivaContext, EnVueloContext } from '../animacion/contexto'
import { CapaCombate } from '../animacion/CapaCombate'
import { CapaAnuncios } from '../animacion/CapaAnuncios'
import { useAnimacionCartas } from '../animacion/useAnimacionCartas'
import type { Velocidad } from '../animacion/useAnimacionCartas'
import type { VistaPrevia } from '../usePartida'
import { ManoAbanico } from './ManoAbanico'
import type { OpcionMano } from './ManoAbanico'

interface TableroProps {
  /** Proyección 6.2 del estado para el jugador A (cartas ocultas con cardId null). */
  vista: GameState
  /** Acciones válidas del humano (getValidActions(estado, 'A') cuando le toca). */
  acciones: Action[]
  leTocaA: boolean
  log: string[]
  /** Log detallado con TODOS los eventos (para debugging). */
  logDetallado?: string[]
  onAccion: (a: Action) => void
  onAbandonar: () => void
  /** Animaciones de movimiento de cartas (glow en celda destino). */
  animaciones?: Array<{ tipo: string; zona?: string; jugador?: PlayerId; atacantes?: string[]; cardInstanceId?: string; key: number }>
  /** Modo de la vista previa de efectos; con `onCiclarVistaPrevia` muestra el selector en la barra superior. */
  vistaPrevia?: VistaPrevia
  onCiclarVistaPrevia?: () => void
}

/* ─────────────────────────────────────────────
   Tablero 4×7 (vista desde arriba, manual.html §1).

   Cada jugador tiene SU grilla, con las zonas fijas:
   | 1A | 1B | 1C | 1D | 1E | 1F | 1G |    1A Éter pagado · 1B-1F Éter bloqueado
   | 2A | 2B | 2C | 2D | 2E | 2F | 2G |    sobre cada Campeón · 1G Exilio
   | 3A | 3B | 3C | 3D | 3E | 3F | 3G |    2A Reserva Éter · 2B-2F Campeones
   | 4A | 4B | 4C | 4D | 4E | 4F | 4G |    2G Cementerio · 3A-3C Místicas/
   ──────────────────────────────────────────   Tácticas · 3D-3F Arcanas/Combate
   3G Deck · 4A-4F Vínculos. La mano vive FUERA de la grilla.

   Selección de Éter: click en una carta de mano con coste (o en "Bloquear"
   de un Campeón) abre el selector; se eligen los Éteres de la Reserva (2A)
   y el pago se valida con la economía 7.3 (Σ aporte ≥ coste × 2).
   ───────────────────────────────────────────── */

type Seleccion =
  | { tipo: 'pagar'; accionBase: Action; objetivoCardId: string; coste: number }
  | { tipo: 'bloquear'; accionBase: Action; objetivoCardId: string; targetInstanceId: string }
  | { tipo: 'elegir_slot'; accionBase: Action; objetivoCardId: string; slotsDisponibles: number[]; slotLabels: string[] }
  | { tipo: 'equipar'; artefactoCardId: string; opciones: Extract<Action, { type: 'equipar_artefacto' }>[] }
  | null

/** Zonas que abren el panel inferior con su lista completa. */
type ZonaPanel = 'reserva' | 'pagado' | 'cementerio' | 'exilio' | 'bloqueado'
/** Panel inferior abierto: zona de un jugador (2A Reserva / 1A Pagado / 2G Cementerio / 1G Exilio). */
interface PanelAbierto {
  jugador: 'A' | 'B'
  zona: ZonaPanel
  /** Slot del Campeón (0-4) cuando zona='bloqueado' — solo mostrar sus éteres. */
  campeonSlot?: number
  /** Instance ID de un artefacto (Mística/Arcana) cuando zona='bloqueado'. */
  artefactoId?: string
}

const ETIQUETA_VELOCIDAD: Record<Velocidad, string> = {
  rapida: 'rápida',
  normal: 'normal',
  off: 'apagada',
}

const ETIQUETA_VISTA_PREVIA: Record<VistaPrevia, string> = {
  todas: 'todas',
  'solo-mias': 'solo mías',
  apagada: 'apagada',
}

/** Etiqueta de la opción "jugar" del menú de una carta de la mano, según su acción. */
const ETIQUETA_JUGAR: Record<string, string> = {
  jugar_campeon: 'Invocar',
  jugar_mistica: 'Jugar',
  colocar_arcana: 'Colocar boca abajo',
}

/** Fases jugables del turno, en orden (el Alba se auto-resuelve: manual §8.2). */
const FASES = [
  { id: 'forja', label: 'Forja' },
  { id: 'choque', label: 'Choque' },
  { id: 'ocaso', label: 'Ocaso' },
] as const

/**
 * Panel lateral de un jugador, junto a su campo: nombre, de quién es el turno y las zonas con
 * su NOMBRE y su CÓDIGO del manual (3G, 2G…). Las pilas con cartas se abren con un clic,
 * igual que sus casillas. Aprovecha el ancho que sobra y libera el alto que limita el tamaño de las cartas.
 */
function FlancoJugador({
  nombre,
  color,
  jugador,
  activo,
  ancho,
  onAbrirPanel,
  children,
  compacto = false,
}: {
  nombre: string
  color: string
  jugador: GameState['players'][PlayerId]
  activo: boolean
  /** Ancho (px) del panel; escala con la carta. */
  ancho: number
  onAbrirPanel: (zona: ZonaPanel) => void
  children?: ReactNode
  /** Celular/tablet: cuadrícula de 2 columnas con el código de zona y la cantidad (el nombre va en el title). */
  compacto?: boolean
}) {
  const filas: Array<{ nombre: string; zona: string; cantidad: number; panel?: ZonaPanel }> = [
    { nombre: 'Mazo', zona: '3G', cantidad: jugador.mazo.length },
    { nombre: 'Cementerio', zona: '2G', cantidad: jugador.cementerio.length, panel: 'cementerio' },
    { nombre: 'Exilio', zona: '1G', cantidad: jugador.exilio.length, panel: 'exilio' },
    { nombre: 'Reserva', zona: '2A', cantidad: jugador.eterReserva.length, panel: 'reserva' },
    { nombre: 'Éter pagado', zona: '1A', cantidad: jugador.eterPagado.length, panel: 'pagado' },
    { nombre: 'Mano', zona: '', cantidad: jugador.mano.length },
  ]
  return (
    <div
      className={`shrink-0 flex flex-col rounded-lg border border-card-border/60 bg-surface/50 ${compacto ? 'gap-0.5 p-1' : 'gap-1.5 p-2'}`}
      style={{ width: ancho }}
    >
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full shrink-0 ${color} ${activo ? 'ring-2 ring-white/30' : 'opacity-60'}`} />
        <p className={`${compacto ? 'text-[10px]' : 'text-xs'} truncate ${activo ? 'text-gray-100 font-semibold' : 'text-gray-400'}`}>{nombre}</p>
      </div>
      <ul className={compacto ? 'grid grid-cols-2 gap-x-1 gap-y-0.5' : 'flex flex-col gap-0.5'}>
        {filas.map((f) => {
          const clickeable = f.panel !== undefined && f.cantidad > 0
          const contenido = (
            <>
              <span className="truncate">
                {compacto ? f.zona || f.nombre : f.nombre}
                {!compacto && f.zona && <span className="ml-1 text-gray-600">{f.zona}</span>}
              </span>
              <span className="font-mono text-gray-300">{f.cantidad}</span>
            </>
          )
          return (
            <li key={f.nombre}>
              {clickeable ? (
                <button
                  onClick={() => onAbrirPanel(f.panel as ZonaPanel)}
                  title={`Ver ${f.nombre}${f.zona ? ` (${f.zona})` : ''}`}
                  className={`w-full flex items-center justify-between text-gray-400 rounded hover:bg-white/5 hover:text-gray-200 transition-colors cursor-pointer ${compacto ? 'gap-1 text-[9px] px-0.5' : 'gap-2 text-[10px] px-1 py-0.5'}`}
                >
                  {contenido}
                </button>
              ) : (
                <div
                  title={compacto ? f.nombre : undefined}
                  className={`flex items-center justify-between text-gray-500 ${compacto ? 'gap-1 text-[9px] px-0.5' : 'gap-2 text-[10px] px-1 py-0.5'}`}
                >
                  {contenido}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {children}
    </div>
  )
}

const FASE_LABEL: Record<string, string> = {
  pre_partida: 'Mulligan',
  forja: 'Forja',
  choque: 'Choque',
  ocaso: 'Ocaso',
  terminada: 'Fin',
}

const TIPO_LABEL: Record<string, string> = {
  jugar_campeon: 'Invocar',
  jugar_mistica: 'Jugar',
  colocar_arcana: 'Colocar',
  activar_arcana: 'Activar',
  descartar_carta: 'Descartar',
  responder_cadena: 'Responder',
  elegir_opcion: 'Elegir opción',
}

function labelAccion(a: Action, fase?: string): string {
  switch (a.type) {
    case 'mulligan': return 'Hacer mulligan'
    case 'pasar_mulligan': return 'Pasar mulligan'
    case 'pasar_turno':
      if (fase === 'forja') return 'Pasar a Choque'
      if (fase === 'choque') return 'Pasar a Ocaso'
      if (fase === 'ocaso') return 'Terminar Turno'
      return 'Pasar turno'
    case 'declarar_ataque': return a.atacanteIds.length > 1 ? 'Atacar con todos' : 'Atacar'
    case 'declarar_bloqueo': return 'Bloquear (automático)'
    case 'elegir_ruptura': return 'Romper Vínculo'
    case 'responder_prevenicion': return a.prevenir ? 'Prevenir destrucción' : 'Permitir destrucción'
    case 'pasar_prioridad': return 'Pasar prioridad'
    case 'rendirse': return 'Rendirse'
    default: return TIPO_LABEL[a.type] ?? a.type
  }
}

/** Acciones de la mano del jugador (jugar/colocar en Forja). */
function esDeMano(a: Action): a is Extract<Action, { cardInstanceId: string }> {
  return (
    a.type === 'jugar_campeon' ||
    a.type === 'jugar_mistica' ||
    a.type === 'colocar_arcana'
  )
}

/** Acciones que llevan cardInstanceId y se renderizan sobre la carta (cadena). */
function conCarta(a: Action): a is Extract<Action, { cardInstanceId: string }> {
  return 'cardInstanceId' in a && !esDeMano(a)
}

/** Opción del menú ☰ del modo compacto: alto táctil (≥40px) y mismas etiquetas que los botones del escritorio. */
function ItemMenu({ onClick, children, peligro = false }: { onClick: () => void; children: ReactNode; peligro?: boolean }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={`w-full cursor-pointer rounded-lg px-3 py-2.5 text-left text-xs transition-colors ${
        peligro ? 'text-red-300 hover:bg-red-600/20' : 'text-gray-200 hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  )
}

/** `destacado`: botón de la franja central (fases, mulligan) en ámbar sólido y más grande, para que no se pierda sobre el azul. */
function Boton({ accion, onClick, fase, destacado = false }: { accion: Action; onClick: (a: Action) => void; fase?: string; destacado?: boolean }) {
  return (
    <button
      onClick={() => onClick(accion)}
      className={`${
        destacado
          ? 'text-xs font-bold bg-amber-400 hover:bg-amber-300 text-gray-950 px-3 py-1 rounded-md shadow-[0_0_0_1px_rgba(253,230,138,0.6)]'
          : 'text-[10px] bg-ether-600/30 hover:bg-ether-600/50 text-ether-200 px-1.5 py-0.5 rounded'
      } transition-colors cursor-pointer whitespace-nowrap`}
    >
      {labelAccion(accion, fase)}
    </button>
  )
}

/** Zonas donde puede estar una instancia (para el label de elegir_objetivo). */
type ZonaInstancia =
  | 'mazo' | 'mano' | 'cementerio' | 'exilio'
  | 'reserva' | 'pagado'
  | 'campeon' | 'mistica' | 'arcana' | 'vinculo'
  | 'desconocida'

const ZONA_LABEL: Record<ZonaInstancia, string> = {
  mazo: 'Búsqueda de mazo — elige una carta',
  mano: 'Elección en mano — elige una carta',
  cementerio: 'Elección en cementerio — elige una carta',
  exilio: 'Elección en exilio — elige una carta',
  reserva: 'Elección en Reserva de Éter',
  pagado: 'Elección en Éter pagado',
  campeon: 'Elección en campo — elige un Campeón',
  mistica: 'Elección en campo — elige una Mística/Táctica',
  arcana: 'Elección en campo — elige una Arcana',
  vinculo: 'Elección en campo — elige un Vínculo',
  desconocida: 'Elige un objetivo',
}

/** Ubica una instancia en las zonas (propia o rival — robos/copias). */
function zonaDeInstancia(vista: GameState, instId: string): ZonaInstancia {
  for (const pid of ['A', 'B'] as PlayerId[]) {
    const p = vista.players[pid]
    if (!p) continue
    if (p.mazo.includes(instId)) return 'mazo'
    if (p.mano.includes(instId)) return 'mano'
    if (p.cementerio.includes(instId)) return 'cementerio'
    if (p.exilio.includes(instId)) return 'exilio'
    if (p.eterReserva.includes(instId)) return 'reserva'
    if (p.eterPagado.includes(instId)) return 'pagado'
    if (p.campo.campeones.includes(instId)) return 'campeon'
    if (p.campo.misticasTacticas.includes(instId)) return 'mistica'
    if (p.campo.arcanasCombate.includes(instId)) return 'arcana'
    if (p.vinculos.includes(instId)) return 'vinculo'
  }
  return 'desconocida'
}

/**
 * Label del bloque de opciones `elegir_objetivo` según la zona REAL de las
 * opciones (antes hardcodeaba "Búsqueda de mazo" aunque fueran del campo).
 * Si todas las opciones están en la misma zona → su label; si es mixto → genérico.
 */
function labelOpcionesElegir(vista: GameState, opciones: string[]): string {
  if (opciones.length === 0) return ZONA_LABEL.desconocida
  const zonas = opciones.map((id) => zonaDeInstancia(vista, id))
  const unicas = new Set(zonas)
  if (unicas.size === 1) return ZONA_LABEL[zonas[0]]
  return ZONA_LABEL.desconocida
}

/**
 * Tema de cada zona (nombre + color): los huecos vacíos lo muestran tenue para
 * poder leer el campo de un vistazo (Campeón rojo, Mística violeta, Arcana ámbar…).
 */
function temaZona(zona: string): { nombre: string; color: string } {
  const fila = zona[0]
  const col = zona[1] ?? ''
  if (fila === '1') {
    if (col === 'A') return { nombre: 'Éter pagado', color: '#22d3ee' }
    if (col === 'G') return { nombre: 'Exilio', color: '#94a3b8' }
    return { nombre: 'Éter bloq.', color: '#22d3ee' }
  }
  if (fila === '2') {
    if (col === 'A') return { nombre: 'Reserva', color: '#fbbf24' }
    if (col === 'G') return { nombre: 'Cementerio', color: '#94a3b8' }
    return { nombre: 'Campeón', color: '#ef4444' }
  }
  if (fila === '3') {
    if ('ABC'.includes(col)) return { nombre: 'Mística', color: '#a855f7' }
    if ('DEF'.includes(col)) return { nombre: 'Arcana', color: '#f59e0b' }
    return { nombre: 'Mazo', color: '#7070ff' }
  }
  return { nombre: 'Vínculo', color: '#ec4899' }
}

/**
 * Celda de la grilla. Todas las columnas miden lo mismo: el ALTO de una carta
 * vertical, para que un Campeón cansado (girado 90°) ocupe su casilla sin
 * deformar la grilla. `escala` achica la carta de la fila (Éter, Vínculos) sin
 * tocar el ancho de la columna, salvo `ocupaColumna={false}` (bloque de Vínculos).
 * Los huecos vacíos muestran el tema de la zona (6.1).
 */
function Celda({
  zona,
  children,
  glow,
  glowColor,
  elegible,
  onElegir,
  colorElegible = '#22d3ee',
  etiquetaElegir,
  escala = 1,
  ocupaColumna = true,
  reservaAlto = 0,
}: {
  zona: string
  children?: ReactNode
  glow?: boolean
  glowColor?: 'green' | 'red'
  /** Casilla clickeable que el jugador debe elegir (colocar una carta, Vínculo a romper): se ilumina. */
  elegible?: boolean
  onElegir?: () => void
  /** Color del halo de la casilla elegible (celeste para colocar, rojo para la Ruptura). */
  colorElegible?: string
  /** Nombre accesible de la casilla elegible (por defecto "Colocar en 3D"). */
  etiquetaElegir?: string
  escala?: number
  ocupaColumna?: boolean
  /** Alto extra que la casilla reserva siempre (px): el tablero no cambia de alto cuando entra o sale una etiqueta. */
  reservaAlto?: number
}) {
  const cw = useAnchoCarta()
  const anchoCarta = Math.round(cw * escala)
  const tema = temaZona(zona)
  const glowStyles = elegible
    ? { boxShadow: `0 0 14px 3px ${colorElegible}8c`, outline: `2px solid ${colorElegible}`, borderRadius: 8, cursor: 'pointer' }
    : glow
      ? {
          boxShadow: `0 0 12px 4px ${glowColor === 'red' ? 'rgba(239, 68, 68, 0.6)' : 'rgba(74, 222, 128, 0.5)'}`,
          borderRadius: 8,
        }
      : undefined

  return (
    <div
      className={`flex flex-col items-center justify-start relative ${glow || elegible ? 'animate-pulse-ring' : ''}`}
      data-zona={zona}
      title={tema.nombre}
      role={elegible ? 'button' : undefined}
      aria-label={elegible ? (etiquetaElegir ?? `Colocar en ${zona}`) : undefined}
      tabIndex={elegible ? 0 : undefined}
      onClick={elegible ? onElegir : undefined}
      onKeyDown={
        elegible
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onElegir?.()
              }
            }
          : undefined
      }
      style={{
        minWidth: ocupaColumna ? Math.round(cw * RELACION_CARTA) : anchoCarta,
        minHeight: Math.round(anchoCarta * RELACION_CARTA) + reservaAlto,
        overflow: 'visible',
        ...glowStyles,
      }}
    >
      {/* Elegible: el contenido no captura el clic (una carta ahí abriría su zoom en vez de elegir la casilla) */}
      {elegible && children ? (
        <div style={{ pointerEvents: 'none', display: 'contents' }}>{children}</div>
      ) : (
        (children ?? (
          <div
            aria-hidden="true"
            className="flex items-end justify-center pb-1 select-none"
            style={{
              width: anchoCarta,
              height: Math.round(anchoCarta * RELACION_CARTA),
              borderRadius: 6,
              border: `1px dashed ${tema.color}33`,
              background: `${tema.color}0d`,
            }}
          >
            <span
              data-zona-label
              className="font-mono uppercase tracking-wider leading-none text-center"
              style={{ fontSize: Math.max(6, Math.round(anchoCarta * 0.1)), color: `${tema.color}66` }}
            >
              {zona}
            </span>
          </div>
        ))
      )}
    </div>
  )
}

/** Pila (Exilio/Cementerio/Éter pagado): muestra la carta tope + contador total. */
function Pila({
  vista,
  insts,
  marca,
  onClick,
  onZoom,
  invertida,
  ancho,
}: {
  vista: GameState
  insts: string[]
  marca?: ReactNode
  onClick?: () => void
  onZoom?: () => void
  invertida?: boolean
  /** Ancho (px) de la carta tope. */
  ancho: number
}) {
  if (insts.length === 0) return null
  const tope = insts[insts.length - 1]
  const rotStyle = invertida ? { transform: 'rotate(180deg)' } : undefined
  return (
    <MiniCard
      inst={vista.instances[tope]}
      anchoPx={ancho}
      agotado={false}
      onClick={onClick}
      onZoom={onZoom}
      invertida={invertida}
      marca={
        insts.length > 1 ? (
          <span
            style={{
              position: 'absolute',
              bottom: 2,
              right: 3,
              background: 'rgba(0,0,0,0.75)',
              color: '#e5e7eb',
              fontSize: 8,
              fontWeight: 700,
              padding: '1px 4px',
              borderRadius: 4,
              pointerEvents: 'none',
              ...rotStyle,
            }}
          >
            ×{insts.length}
          </span>
        ) : (
          marca
        )
      }
    />
  )
}

interface GrillaProps {
  vista: GameState
  jugador: 'A' | 'B'
  leTocaA: boolean
  acciones: Action[]
  onAccion: (a: Action) => void
  /** Click en una carta de la mano con coste / botón Bloquear de un Campeón. */
  abrirSelector: (accionBase: Action, objetivoCardId: string) => void
  /** Abre la carta en grande (CartaZoom) para revisar su efecto. */
  abrirZoom: (inst: CardInstance) => void
  /** Abre el panel inferior con la lista completa de una zona (Éter 2A/1A, Cementerio 2G, Exilio 1G). */
  abrirPanel: (jugador: 'A' | 'B', zona: ZonaPanel, campeonSlot?: number, artefactoId?: string) => void
  /** Grilla del rival: se renderiza de cabeza (vista desde el otro lado de la mesa). */
  invertida?: boolean
  seleccion: Seleccion
  setSeleccion: (s: Seleccion) => void
  /** Animaciones de movimiento (glow en celda destino). */
  animaciones?: Array<{ tipo: string; zona?: string; jugador?: PlayerId; atacantes?: string[]; cardInstanceId?: string; key: number }>
  /**
   * A6 (subconjunto de atacantes): el estado vive en Tablero y se pasa por
   * props — GrillaJugador es un scope distinto (fix: nombres inexistentes
   * en campeonPropio → ReferenceError en runtime al declarar ataque).
   */
  selAtaque?: string[]
  esPasoAtaquePropio?: boolean
  onToggleSelAtaque?: (id: string) => void
  /** Casillas (p. ej. '3D') iluminadas para colocar la carta en curso (solo la grilla propia). */
  casillasElegibles?: string[]
  onElegirCasilla?: (zona: string) => void
  /** Ruptura pendiente (§9.4): slots 0-5 de los Vínculos de ESTE campo que el atacante puede romper (a ciegas). */
  vinculosElegibles?: number[]
  onElegirVinculo?: (slot: number) => void
}

/** Panel colapsable de log detallado para debugging, con botón de copiar. */
function LogDetallado({ lineas }: { lineas: string[] }) {
  const [abierto, setAbierto] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (abierto && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lineas.length, abierto])

  const copiarLog = async () => {
    const texto = lineas.join('\n')
    try {
      await navigator.clipboard.writeText(texto)
    } catch {
      // Fallback para contextos sin clipboard API (http, permisos)
      const ta = document.createElement('textarea')
      ta.value = texto
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopiado(true)
    window.setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="bg-[#0a0a12] border border-card-border rounded-lg p-2">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setAbierto(!abierto)}
          className="text-[9px] uppercase tracking-wider text-gray-500 hover:text-gray-300 transition-colors cursor-pointer flex items-center gap-1"
        >
          <span className={`text-[8px] transition-transform ${abierto ? 'rotate-90' : ''}`}>▶</span>
          Log Detallado ({lineas.length})
        </button>
        {lineas.length > 0 && (
          <button
            onClick={copiarLog}
            disabled={copiado}
            title="Copiar todo el log al portapapeles"
            className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded transition-colors cursor-pointer
                       bg-surface-2 hover:bg-card-border text-gray-400 hover:text-gray-200
                       disabled:text-ether-300 disabled:bg-ether-600/20"
          >
            {copiado ? '¡Copiado!' : 'Copiar'}
          </button>
        )}
      </div>
      {abierto && lineas.length > 0 && (
        <div ref={scrollRef} className="mt-1.5 max-h-60 overflow-y-auto font-mono text-[10px] leading-relaxed">
          {lineas.map((linea, i) => (
            <div key={i} className="text-gray-400 hover:text-gray-200 transition-colors whitespace-pre">
              {linea}
            </div>
          ))}
        </div>
      )}
      {abierto && lineas.length === 0 && (
        <p className="text-[10px] text-gray-600 italic mt-1">Sin eventos aún.</p>
      )}
    </div>
  )
}

/** Grilla 4×7 de un jugador, fiel a la vista desde arriba del manual. */
function GrillaJugador({
  vista,
  jugador,
  leTocaA,
  acciones,
  onAccion,
  abrirSelector,
  abrirZoom,
  abrirPanel,
  invertida,
  seleccion,
  setSeleccion,
  animaciones,
  selAtaque = [],
  esPasoAtaquePropio = false,
  onToggleSelAtaque,
  casillasElegibles,
  onElegirCasilla,
  vinculosElegibles,
  onElegirVinculo,
}: GrillaProps) {
  const p = vista.players[jugador]
  const soy = jugador === 'A'
  /** Ancho de carta del tablero (responsivo) y de las cartas más chicas: fila de Éter y Vínculos. */
  const cw = useAnchoCarta()
  /** La etiqueta ATQ/RES + keywords que cuelga de cada Campeón: su espacio se reserva siempre (en compacto va en una línea chica). */
  const reservaEtiqueta = useCompacto() ? 0 : RESERVA_ETIQUETA_CAMPEON
  const cwEter = Math.round(cw * ESCALA_FILA_ETER)
  const cwVinculo = Math.round(cw * ESCALA_VINCULO)
  /** ¿Esta casilla propia está iluminada para colocar la carta en curso? */
  const elegible = (zona: string) => soy && (casillasElegibles?.includes(zona) ?? false)

  /** Selector de pago/bloqueo abierto: los Éteres se eligen en el panel inferior. */
  const enSeleccion = seleccion !== null && soy && leTocaA

  /** Campeón del slot 2B-2F (slots 0-4) y sus Éteres bloqueados (1B-1F). */
  const campeonSlot = (slot: number) => {
    const id = p.campo.campeones[slot]
    return id ? vista.instances[id] : null
  }
  const eterBloqueadoDe = (slot: number): CardInstance[] =>
    (campeonSlot(slot)?.eterBloqueado ?? []).map((id) => vista.instances[id])

  /** Reserva 2A: solo el tope visible + contador; clic → panel inferior con la lista completa. */
  const reservaCol = (): ReactNode => {
    const topeId = p.eterReserva[p.eterReserva.length - 1]
    if (!topeId) {
      return <span className="text-[8px] text-gray-500 font-mono">0</span>
    }
    const extra = p.eterReserva.length - 1
    return (
      <div className="flex flex-col gap-1 items-center">
        <MiniCard
          inst={vista.instances[topeId]}
          anchoPx={cw}
          onClick={enSeleccion ? undefined : () => abrirPanel(jugador, 'reserva')}
          onZoom={() => abrirZoom(vista.instances[topeId])}
          invertida={invertida}
          marca={
            extra > 0 ? (
              <span
                style={{
                  position: 'absolute',
                  bottom: 2,
                  left: 3,
                  background: 'rgba(0,0,0,0.75)',
                  color: '#e5e7eb',
                  fontSize: 8,
                  fontWeight: 700,
                  padding: '1px 4px',
                  borderRadius: 4,
                  pointerEvents: 'none',
                  ...(invertida ? { transform: 'rotate(180deg)' } : undefined),
                }}
              >
                +{extra}
              </span>
            ) : undefined
          }
        />
      </div>
    )
  }

  /** Campeón propio 2B-2F con sus acciones (Atacar / Bloquear / Activar). */
  const campeonPropio = (id: string) => {
    const inst = vista.instances[id]
    const ataque = acciones.find(
      (a) => a.type === 'declarar_ataque' && a.atacanteIds.length === 1 && a.atacanteIds[0] === id,
    )
    const bloquear = acciones.find((a) => a.type === 'bloquear_eter' && a.targetInstanceId === id)
    const transmutar = acciones.find((a) => a.type === 'usar_transmutar' && a.cardInstanceId === id)
    const activarHabilidad = acciones.find((a) => a.type === 'activar_habilidad' && a.cardInstanceId === id)
    const rotStyle = invertida ? { transform: 'rotate(180deg)' } : undefined
    return (
      <MiniCard key={id} inst={inst} anchoPx={cw} rotarSiAgotado hijosSobreCarta onZoom={() => abrirZoom(inst)} invertida={invertida}>
        {leTocaA && (ataque || bloquear || transmutar || activarHabilidad) && (
          <div className="flex gap-1 flex-wrap justify-center" style={rotStyle}>
            {ataque && <Boton accion={ataque} onClick={onAccion} />}
            {ataque && esPasoAtaquePropio && (
              <button
                onClick={() => onToggleSelAtaque?.(id)}
                title="Agregar a la selección de atacantes (A6: elige con cuántos atacar)"
                className={`text-[10px] px-1.5 py-0.5 rounded transition-colors cursor-pointer whitespace-nowrap ${
                  selAtaque.includes(id)
                    ? 'bg-ether-600 text-white ring-1 ring-ether-400'
                    : 'bg-surface-2 text-gray-400 hover:text-gray-200 border border-card-border'
                }`}
              >
                {selAtaque.includes(id) ? '✓' : '+'}
              </button>
            )}
            {bloquear && (
              <button
                onClick={() => {
                  const meta = inst.cardId ? getCardMeta(inst.cardId) : null
                  if (meta && bloquear.type === 'bloquear_eter') {
                    abrirSelector(bloquear, meta.id)
                  }
                }}
                className="text-[10px] bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 px-1.5 py-0.5 rounded 
                           transition-colors cursor-pointer whitespace-nowrap"
              >
                Bloquear
              </button>
            )}
            {(transmutar || activarHabilidad) && (
              <button
                onClick={() => {
                  if (activarHabilidad && activarHabilidad.type === 'activar_habilidad') {
                    // Abrir selector de pago para que el usuario elija qué éteres pagar
                    const meta = inst.cardId ? getCardMeta(inst.cardId) : null
                    if (meta) abrirSelector(activarHabilidad, meta.id)
                  } else if (transmutar) {
                    onAccion(transmutar)
                  }
                }}
                className="text-[10px] bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 px-1.5 py-0.5 rounded 
                           transition-colors cursor-pointer whitespace-nowrap"
              >
                Activar
              </button>
            )}
          </div>
        )}
      </MiniCard>
    )
  }

  const celdas: ReactNode[] = []

  /* ── Fila 1 ── */
  celdas.push(
    <Celda key="1A" zona="1A" escala={ESCALA_FILA_ETER}>
      <Pila
        vista={vista}
        insts={p.eterPagado}
        onClick={() => abrirPanel(jugador, 'pagado')}
        onZoom={() => abrirZoom(vista.instances[p.eterPagado[p.eterPagado.length - 1]])}
        invertida={invertida}
        ancho={cwEter}
      />
    </Celda>,
  )
  for (let slot = 0; slot < 5; slot++) {
    const bloqueados = eterBloqueadoDe(slot)
    const zona = `1${String.fromCharCode(66 + slot)}` // 1B…1F
    celdas.push(
      <Celda key={zona} zona={zona} escala={ESCALA_FILA_ETER}>
        {bloqueados.length > 0 ? (
          <MiniCard
            inst={bloqueados[0]}
            anchoPx={cwEter}
            onZoom={() => abrirZoom(bloqueados[0])}
            onClick={() => abrirPanel(jugador, 'bloqueado', slot)}
            invertida={invertida}
            marca={
              bloqueados.length > 1 ? (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 2,
                    right: 3,
                    background: 'rgba(0,0,0,0.75)',
                    color: '#e5e7eb',
                    fontSize: 8,
                    fontWeight: 700,
                    padding: '1px 4px',
                    borderRadius: 4,
                    pointerEvents: 'none',
                    ...(invertida ? { transform: 'rotate(180deg)' } : undefined),
                  }}
                >
                  ×{bloqueados.length}
                </span>
              ) : undefined
            }
          />
        ) : undefined}
      </Celda>,
    )
  }
  celdas.push(
    <Celda key="1G" zona="1G" escala={ESCALA_FILA_ETER}>
      <Pila
        vista={vista}
        insts={p.exilio}
        onClick={() => abrirPanel(jugador, 'exilio')}
        onZoom={() => abrirZoom(vista.instances[p.exilio[p.exilio.length - 1]])}
        ancho={cwEter}
      />
    </Celda>,
  )

  /* ── Fila 2 ── */
  celdas.push(
    <Celda key="2A" zona="2A" glow={animaciones?.some((a) => a.tipo === 'glow' && a.zona === '2A' && a.jugador === jugador) ?? false}>
      {reservaCol()}
    </Celda>,
  )
  for (let slot = 0; slot < 5; slot++) {
    const zona = `2${String.fromCharCode(66 + slot)}` // 2B…2F
    const id = p.campo.campeones[slot]
    const hayGlow = animaciones?.some((a) => a.tipo === 'glow' && a.zona === zona && a.jugador === jugador) ?? false
    const hayAtaque = id !== null && (animaciones?.some((a) => a.tipo === 'attack' && a.atacantes?.includes(id)) ?? false)
    celdas.push(
      <Celda key={zona} zona={zona} glow={hayGlow || hayAtaque} glowColor={hayAtaque ? 'red' : 'green'} elegible={elegible(zona)} onElegir={() => onElegirCasilla?.(zona)} reservaAlto={reservaEtiqueta}>
        {id ? (
          <div className="relative">
            {soy && leTocaA ? campeonPropio(id) : <MiniCard inst={vista.instances[id]} anchoPx={cw} rotarSiAgotado onZoom={() => abrirZoom(vista.instances[id])} invertida={invertida} />}
            <ChampionStatus s={vista} id={id} invertida={invertida} />
            <FocosChampion s={vista} id={id} invertida={invertida} />
          </div>
        ) : undefined}
      </Celda>,
    )
  }
  celdas.push(
    <Celda key="2G" zona="2G">
      <Pila
        vista={vista}
        insts={p.cementerio}
        onClick={() => abrirPanel(jugador, 'cementerio')}
        onZoom={() => abrirZoom(vista.instances[p.cementerio[p.cementerio.length - 1]])}
        ancho={cw}
      />
    </Celda>,
  )

  /* ── Fila 3 ── */
  for (let slot = 0; slot < 3; slot++) {
    const zona = `3${String.fromCharCode(65 + slot)}` // 3A…3C (Místicas/Tácticas)
    const id = p.campo.misticasTacticas[slot]
    const instMist = id ? vista.instances[id] : null
    // Buscar acciones de equipar_artefacto para esta carta
    const accionesEquipar = soy && leTocaA && id
      ? acciones.filter((a) => a.type === 'equipar_artefacto' && a.cardInstanceId === id)
      : []
    // Fase 3a: Bloquear Éter en Artefactos (Místicas con costo-bloqueado, §7.7)
    const bloquearMist = soy && leTocaA && id
      ? acciones.find((a) => a.type === 'bloquear_eter' && a.targetInstanceId === id)
      : undefined
    // Éteres bloqueados como cartas encima + nombre del campeón equipado
    const eteresMist = (instMist?.eterBloqueado ?? [])
      .map((eid) => vista.instances[eid])
      .filter((e): e is NonNullable<typeof e> => e != null)
    const equipadoAMist = instMist?.equipadoA
      ? getCardMeta(vista.instances[instMist.equipadoA]?.cardId ?? '')?.name ?? undefined
      : undefined
    celdas.push(
      <Celda key={zona} zona={zona} elegible={elegible(zona)} onElegir={() => onElegirCasilla?.(zona)}>
        {id ? (
          <MiniCard
            inst={vista.instances[id]}
            anchoPx={cw}
            onZoom={() => abrirZoom(vista.instances[id])}
            invertida={invertida}
            hijosSobreCarta
            equipadoANombre={equipadoAMist}
            eteresBloqueados={eteresMist.length > 0 ? eteresMist : undefined}
            onÉterClick={eteresMist.length > 0 ? () => abrirPanel(jugador, 'bloqueado', undefined, id) : undefined}
          >
            {(accionesEquipar.length > 0 || bloquearMist) && (
              <div className="flex gap-1 flex-wrap justify-center">
                {accionesEquipar.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const meta = vista.instances[id]?.cardId ? getCardMeta(vista.instances[id]!.cardId!) : null
                      setSeleccion({ tipo: 'equipar', artefactoCardId: meta?.id ?? '', opciones: accionesEquipar as Extract<Action, { type: 'equipar_artefacto' }[]> })
                    }}
                    className="text-[10px] bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 px-1.5 py-0.5 rounded 
                               transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Equipar
                  </button>
                )}
                {bloquearMist && bloquearMist.type === 'bloquear_eter' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const meta = vista.instances[id]?.cardId ? getCardMeta(vista.instances[id]!.cardId!) : null
                      if (meta) abrirSelector(bloquearMist, meta.id)
                    }}
                    className="text-[10px] bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 px-1.5 py-0.5 rounded 
                               transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Bloquear
                  </button>
                )}
              </div>
            )}
          </MiniCard>
        ) : undefined}
      </Celda>,
    )
  }
  for (let slot = 0; slot < 3; slot++) {
    const zona = `3${String.fromCharCode(68 + slot)}` // 3D…3F (Arcanas/Combate)
    const id = p.campo.arcanasCombate[slot]
    const inst = id ? vista.instances[id] : null
    // Buscar acción de activar_arcana para esta Arcana
    const activarArcana = soy && leTocaA && id && !inst?.bocaArriba
      ? acciones.find((a) => a.type === 'activar_arcana' && a.cardInstanceId === id)
      : undefined
    // Fase 3a: Bloquear Éter en Artefactos (Arcanas con costo-bloqueado)
    const bloquearArc = soy && leTocaA && id
      ? acciones.find((a) => a.type === 'bloquear_eter' && a.targetInstanceId === id)
      : undefined
    // Éteres bloqueados como cartas encima + nombre del campeón equipado
    const eteresArc = (inst?.eterBloqueado ?? [])
      .map((eid) => vista.instances[eid])
      .filter((e): e is NonNullable<typeof e> => e != null)
    const equipadoAArc = inst?.equipadoA
      ? getCardMeta(vista.instances[inst.equipadoA]?.cardId ?? '')?.name ?? undefined
      : undefined
    celdas.push(
      <Celda key={zona} zona={zona} elegible={elegible(zona)} onElegir={() => onElegirCasilla?.(zona)}>
        {inst ? (
          <MiniCard
            inst={inst}
            anchoPx={cw}
            bocaAbajo={!inst.bocaArriba}
            onClick={
              inst.cardId !== null && (soy || inst.bocaArriba === true)
                ? () => abrirZoom(inst)
                : undefined
            }
            invertida={invertida}
            hijosSobreCarta
            equipadoANombre={equipadoAArc}
            eteresBloqueados={eteresArc.length > 0 ? eteresArc : undefined}
            onÉterClick={eteresArc.length > 0 ? () => abrirPanel(jugador, 'bloqueado', undefined, id ?? undefined) : undefined}
          >
            {(activarArcana || bloquearArc) && (
              <div className="flex gap-1 flex-wrap justify-center">
                {activarArcana && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      // Abrir selector de pago para que el usuario elija qué éteres pagar
                      const meta = inst.cardId ? getCardMeta(inst.cardId) : null
                      if (meta) abrirSelector(activarArcana, meta.id)
                    }}
                    className="text-[10px] bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 px-1.5 py-0.5 rounded 
                               transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Activar
                  </button>
                )}
                {bloquearArc && bloquearArc.type === 'bloquear_eter' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      const meta = inst.cardId ? getCardMeta(inst.cardId) : null
                      if (meta) abrirSelector(bloquearArc, meta.id)
                    }}
                    className="text-[10px] bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 px-1.5 py-0.5 rounded 
                               transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Bloquear
                  </button>
                )}
              </div>
            )}
          </MiniCard>
        ) : undefined}
      </Celda>,
    )
  }
  celdas.push(
    <Celda key="3G" zona="3G">
      <MiniCard
        inst={{ cardInstanceId: 'mazo', cardId: null, owner: jugador }}
        anchoPx={cw}
        invertida={invertida}
        marca={
          <span
            style={{
              position: 'absolute',
              bottom: 2,
              right: 3,
              background: 'rgba(0,0,0,0.75)',
              color: '#e5e7eb',
              fontSize: 9,
              fontWeight: 700,
              padding: '1px 4px',
              borderRadius: 4,
              pointerEvents: 'none',
              ...(invertida ? { transform: 'rotate(180deg)' } : undefined),
            }}
          >
            {p.mazo.length}
          </span>
        }
      />
    </Celda>,
  )

  /* ── Vínculos 4A-4F: bloque lateral de 2×3 — la VIDA del jugador (manual §5.5) ── */
  const vinculosRestantes = p.vinculos.filter((id) => id && !vista.instances[id]?.bocaArriba).length
  const vinculos = (
    <div className="flex flex-col items-center justify-center gap-1.5 self-center" aria-label="Vínculos">
      <div className="grid grid-cols-2 gap-1">
        {p.vinculos.map((id, slot) => {
          const zona = `4${String.fromCharCode(65 + slot)}` // 4A…4F
          const inst = id ? vista.instances[id] : null
          return (
            <Celda
              key={zona}
              zona={zona}
              escala={ESCALA_VINCULO}
              ocupaColumna={false}
              elegible={vinculosElegibles?.includes(slot) ?? false}
              onElegir={() => onElegirVinculo?.(slot)}
              colorElegible="#f43f5e"
              etiquetaElegir={`Romper Vínculo ${zona}`}
            >
              {inst ? (
                <MiniCard
                  inst={inst}
                  anchoPx={cwVinculo}
                  bocaAbajo={!inst.bocaArriba}
                  onClick={
                    inst.cardId !== null && (soy || inst.bocaArriba === true)
                      ? () => abrirZoom(inst)
                      : undefined
                  }
                  invertida={invertida}
                />
              ) : undefined}
            </Celda>
          )
        })}
      </div>
      <span
        className="text-[9px] font-semibold uppercase tracking-wider text-pink-300/80 whitespace-nowrap"
        style={invertida ? { transform: 'rotate(180deg)' } : undefined}
      >
        Vínculos {vinculosRestantes}/{p.vinculos.length}
      </span>
    </div>
  )

  return (
    <div
      data-testid={`grilla-${jugador}`}
      className="flex items-stretch gap-4 w-max"
      style={invertida ? { transform: 'rotate(180deg)' } : undefined}
    >
      {vinculos}
      <div className="grid grid-cols-7 gap-x-2 gap-y-1.5">{celdas}</div>
    </div>
  )
}

export function Tablero({
  vista,
  acciones,
  leTocaA,
  logDetallado = [],
  onAccion,
  onAbandonar,
  animaciones,
  vistaPrevia,
  onCiclarVistaPrevia,
}: TableroProps) {
  const yo = vista.players.A
  const rival = vista.players.B
  const fase = vista.fase
  const terminada = fase === 'terminada'

  const [seleccion, setSeleccion] = useState<Seleccion>(null)
  const [elegidos, setElegidos] = useState<Set<string>>(new Set())
  /** Campeones propios elegidos como sacrificio (rol Soberano/Emperador). */
  const [sacrificiosElegidos, setSacrificiosElegidos] = useState<string[]>([])
  const [zoom, setZoom] = useState<CardInstance | null>(null)
  /** Panel inferior con la lista completa de una zona (2A Reserva / 1A Pagado / 2G Cementerio / 1G Exilio). */
  const [panelAbierto, setPanelAbierto] = useState<PanelAbierto | null>(null)
  /** Interfaz de bloqueo manual abierta */
  const [bloqueoAbierto, setBloqueoAbierto] = useState(false)
  /** A6 (2026-10-22): subconjunto de atacantes elegidos para declarar un único ataque múltiple */
  const [selAtaque, setSelAtaque] = useState<string[]>([])
  /** Pasivo 1A (FB-005/DS-006): opción de bloqueo disponible. Es VOLUNTARIA: no se abre sola, solo cuando el jugador pulsa «Puedes bloquear Éter». */
  const opcionBloqueo = acciones.find((a): a is Extract<Action, { type: 'elegir_opcion' }> => a.type === 'elegir_opcion')
  const opcionBloqueoId = opcionBloqueo?.opcionId ?? null
  const [opcionAbierta, setOpcionAbierta] = useState<string | null>(null)
  useEffect(() => {
    if (opcionBloqueoId === null) setOpcionAbierta(null)
  }, [opcionBloqueoId])
  const abrirZoom = (inst: CardInstance) => setZoom(inst)
  /** Contenedor donde se miden las cartas para animar su movimiento (los modales quedan fuera). */
  const tableroRef = useRef<HTMLElement>(null)
  const anim = useAnimacionCartas(vista, tableroRef)
  /** La mesa se mide para que los dos campos entren en pantalla sin scroll (ancho de carta responsivo). */
  const mesaRef = useRef<HTMLDivElement>(null)
  /** Celular/tablet en horizontal: el lateral pasa a panel desplegable y el chrome se afina (el escritorio no cambia). */
  const { ancho: anchoVentana, alto: alturaVentana } = useViewport()
  const compacto = esViewportCompacto(anchoVentana, alturaVentana)
  const [panelLateralAbierto, setPanelLateralAbierto] = useState(false)
  const [menuAbierto, setMenuAbierto] = useState(false)
  /** Celular en vertical: la mesa no entra (necesita ~640px de ancho). Se pide girar el dispositivo. */
  const esRetrato = compacto && anchoVentana < 600 && anchoVentana < alturaVentana
  const cw = useAnchoTablero(mesaRef, compacto)
  /** La mano se dimensiona por el alto de la ventana (no por la mesa: evita una dependencia circular). */
  const manoAncho = compacto
    ? Math.min(132, Math.max(46, Math.round(alturaVentana * (alturaVentana < 600 ? 0.13 : 0.115))))
    : Math.min(132, Math.max(88, Math.round(alturaVentana * 0.115)))
  const franjaMano = Math.round(manoAncho * RELACION_CARTA * 0.78)
  /** El panel lateral de cada jugador escala con la carta (las zonas de la grilla no cambian). */
  const anchoFlanco = compacto ? ANCHO_FLANCO_COMPACTO : Math.round(cw * ANCHO_FLANCO)
  /** Carta bajo el mouse (inspector lateral): conserva la última vista. */
  const [inspeccion, setInspeccion] = useState<Inspeccion | null>(null)

  /** Fase 2 (c): el bloqueo en curso ¿paga desde Éter Pagado (1A)? (costo.origen) */
  const metaSelBloqueo = seleccion?.tipo === 'bloquear' ? getCardMeta(seleccion.objetivoCardId) : null
  const origenPagadoBloqueo = metaSelBloqueo
    ? efectoBloqueoAccion(metaSelBloqueo)?.efecto.costo?.origen === 'pagado'
    : false
  /** Zona de la que salen los Éteres del selector (2A Reserva / 1A Éter Pagado). */
  const eteresSelector = origenPagadoBloqueo ? yo.eterPagado : yo.eterReserva

  // A6: paso de ataque propio (sin combate en curso) — habilita la selección multi
  const esPasoAtaquePropio = vista.fase === 'choque' && !vista.combate && vista.turno === 'A'
  const toggleSelAtaque = (id: string) =>
    setSelAtaque((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  const atacarSeleccionados = () => {
    const acc = acciones.find(
      (a) =>
        a.type === 'declarar_ataque' &&
        a.atacanteIds.length === selAtaque.length &&
        selAtaque.every((id) => a.atacanteIds.includes(id)),
    )
    if (acc) {
      onAccion(acc)
      setSelAtaque([])
    }
  }

  // Abrir interfaz de bloqueo automáticamente cuando es turno del defensor y hay bloqueo pendiente
  // NOTA: dependemos de propiedades PRIMITIVAS (fase, paso, turno) para evitar loops infinitos.
  const faseActual = vista.fase
  const pasoCombate = vista.combate?.paso
  const turnoActual = vista.turno
  useEffect(() => {
    if (faseActual === 'choque' && pasoCombate === 'bloqueo') {
      const defensor = turnoActual === 'A' ? 'B' : 'A'
      const soyElDefensor = defensor === 'A'
      if (soyElDefensor && !bloqueoAbierto) {
        const sinBloquear = vista.combate!.atacantes.filter((a) => !(a in vista.combate!.bloqueos))
        if (sinBloquear.length > 0) setBloqueoAbierto(true)
      }
    }
  }, [faseActual, pasoCombate, turnoActual])

  // A6: la selección de atacantes vive solo en el paso de ataque propio —
  // si cambia la fase/combate/turno, se limpia (evita subsets obsoletos).
  useEffect(() => {
    if (!(faseActual === 'choque' && !pasoCombate && turnoActual === 'A')) setSelAtaque([])
  }, [faseActual, pasoCombate, turnoActual])

  // Si deja de tocarte (el rival actuó, cambió la fase), un pago o una casilla a medio elegir ya no tiene sentido
  useEffect(() => {
    if (!leTocaA && seleccion) {
      setSeleccion(null)
      setElegidos(new Set())
      setSacrificiosElegidos([])
    }
  }, [leTocaA, seleccion])

  const abrirSelector = (accionBase: Action, objetivoCardId: string) => {
    const meta = getCardMeta(objetivoCardId)
    if (!meta) return
    if (accionBase.type === 'bloquear_eter') {
      setSeleccion({ tipo: 'bloquear', accionBase, objetivoCardId, targetInstanceId: accionBase.targetInstanceId })
    } else {
      const costo = accionBase.type === 'activar_habilidad'
        ? (costeEterHabilidad(meta) || 1)
        : meta.stats.cost
      setSeleccion({ tipo: 'pagar', accionBase, objetivoCardId, coste: costo })
    }
    setElegidos(new Set())
    setSacrificiosElegidos([])
    setPanelAbierto(null)
  }

  /** Sacrificios exigidos por el rol del Campeón — SOLO al invocar (jugar_campeon).
   *  Activar habilidad NO requiere sacrificio (el costo es solo Éter). */
  const requeridos = seleccion?.tipo === 'pagar' && seleccion.accionBase.type === 'jugar_campeon'
    ? sacrificiosRequeridos(getCardMeta(seleccion.objetivoCardId)?.roles)
    : 0
  /** Campeones propios en 2B-2F con facción compartida, elegibles como sacrificio. */
  const sacrificables =
    seleccion?.tipo === 'pagar' && requeridos > 0 ? campeonesSacrificables(vista, 'A', seleccion.objetivoCardId) : []

  const toggleSacrificio = (id: string) => {
    setSacrificiosElegidos((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= requeridos) return prev
      return [...prev, id]
    })
  }

  const toggleEter = (instanceId: string) => {
    setElegidos((prev) => {
      const next = new Set(prev)
      if (next.has(instanceId)) next.delete(instanceId)
      else {
        // Bloqueo fijo: no dejar seleccionar de más (el confirm ya exige el exacto)
        if (seleccion?.tipo === 'bloquear') {
          const meta = getCardMeta(seleccion.objetivoCardId)
          if (meta && esBloqueoFijo(meta)) {
            // N exactos POR ACTIVACIÓN: el Éter que ya tiene la carta (otras activaciones o el externo del Pasivo 1A) no cuenta
            if (next.size >= maxEterBloqueado(meta)) return prev
          }
        }
        next.add(instanceId)
      }
      return next
    })
  }

  /**
   * Casillas propias donde puede colocarse la carta de la acción (índice de slot + rótulo 2B…).
   * Campeón: 2B-2F vacías o liberadas por el sacrificio. Mística: 3A-3C. Arcana: 3D-3F.
   */
  const casillasDe = (accion: Action): { slotsDisponibles: number[]; slotLabels: string[] } => {
    const slotsDisponibles: number[] = []
    const slotLabels: string[] = []
    const recorrer = (ocupantes: (string | null)[], base: number, libre: (ocupante: string | null) => boolean) => {
      ocupantes.forEach((ocupante, i) => {
        if (!libre(ocupante)) return
        slotsDisponibles.push(i)
        slotLabels.push(`${base === 66 ? 2 : 3}${String.fromCharCode(base + i)}`)
      })
    }
    if (accion.type === 'jugar_campeon') {
      const sacrificios = accion.sacrificios ?? []
      recorrer(yo.campo.campeones, 66, (o) => !o || sacrificios.includes(o))
    } else if (accion.type === 'jugar_mistica') {
      recorrer(yo.campo.misticasTacticas, 65, (o) => !o)
    } else if (accion.type === 'colocar_arcana') {
      recorrer(yo.campo.arcanasCombate, 68, (o) => !o)
    }
    return { slotsDisponibles, slotLabels }
  }

  /** Click en la opción de jugar de una carta de la mano: con coste → selector de Éter; Arcana (sin coste) → elegir casilla. */
  const onClickMano = (id: string) => {
    if (!leTocaA) return
    const acc = acciones.find((a) => esDeMano(a) && a.cardInstanceId === id)
    if (!acc) return
    if (acc.type === 'colocar_arcana') {
      const { slotsDisponibles, slotLabels } = casillasDe(acc)
      if (slotsDisponibles.length > 1) {
        setSeleccion({
          tipo: 'elegir_slot',
          accionBase: acc,
          objetivoCardId: vista.instances[id]?.cardId ?? '',
          slotsDisponibles,
          slotLabels,
        })
        setElegidos(new Set())
        setSacrificiosElegidos([])
        setPanelAbierto(null)
      } else if (slotsDisponibles.length === 1) {
        onAccion({ ...acc, slot: slotsDisponibles[0] ?? acc.slot })
      } else {
        // Sin casillas: el validador del motor rechaza con su mensaje
        onAccion(acc)
      }
      return
    }
    const cardId = vista.instances[id]?.cardId
    if (cardId) abrirSelector(acc, cardId)
  }

  /** Menú contextual de una carta de la mano (estilo Master Duel): solo las opciones válidas ahora. */
  const opcionesMano = (id: string): OpcionMano[] => {
    const opciones: OpcionMano[] = []
    const inst = vista.instances[id]
    if (leTocaA) {
      const jugar = acciones.find((a) => esDeMano(a) && a.cardInstanceId === id)
      if (jugar) {
        opciones.push({ etiqueta: ETIQUETA_JUGAR[jugar.type] ?? 'Jugar', tono: 'principal', onElegir: () => onClickMano(id) })
      }
      const descartar = acciones.find((a) => a.type === 'descartar_carta' && a.cardInstanceIds.includes(id))
      if (descartar) opciones.push({ etiqueta: 'Descartar', tono: 'peligro', onElegir: () => onAccion(descartar) })
    }
    if (inst?.cardId) opciones.push({ etiqueta: 'Ver carta', tono: 'neutro', onElegir: () => abrirZoom(inst) })
    return opciones
  }

  /** Clic en una casilla iluminada (elegir_slot): ejecuta la acción en ese slot. */
  const elegirCasilla = (zona: string) => {
    if (seleccion?.tipo !== 'elegir_slot') return
    const i = seleccion.slotLabels.indexOf(zona)
    const slot = seleccion.slotsDisponibles[i]
    if (slot === undefined) return
    onAccion({ ...seleccion.accionBase, slot } as Action)
    setSeleccion(null)
    setElegidos(new Set())
    setSacrificiosElegidos([])
  }

  /** ¿Se puede confirmar la selección? Pago: Σ aporte ≥ coste (+ sacrificios del rol). Bloqueo: fijo=exacto, flexible=>0. Equipar: siempre. */
  const puedeConfirmar = useMemo(() => {
    if (!seleccion) return false
    if (seleccion.tipo === 'equipar') return elegidos.size === 1
    if (elegidos.size === 0) return false
    if (seleccion.tipo === 'bloquear') {
      const meta = getCardMeta(seleccion.objetivoCardId)
      if (meta && esBloqueoFijo(meta)) {
        // "Bloquea X Éter" → pago EXACTO por activación (lo ya bloqueado en la carta no se descuenta)
        return elegidos.size === maxEterBloqueado(meta)
      }
      // "hasta X" → al menos 1 (el validador del motor corta el exceso)
      return elegidos.size > 0
    }
    if (seleccion.tipo === 'elegir_slot') {
      return true
    }
    const total = [...elegidos].reduce((acc, id) => {
      const cardId = vista.instances[id]?.cardId
      return acc + (cardId ? aporteDe(cardId, seleccion.objetivoCardId) : 0)
    }, 0)
    return total >= seleccion.coste && sacrificiosElegidos.length >= requeridos
  }, [seleccion, elegidos, vista, sacrificiosElegidos, requeridos])

  const totalAportado = useMemo(() => {
    if (!seleccion || seleccion.tipo !== 'pagar') return 0
    return [...elegidos].reduce((acc, id) => {
      const cardId = vista.instances[id]?.cardId
      return acc + (cardId ? aporteDe(cardId, seleccion.objetivoCardId) : 0)
    }, 0)
  }, [seleccion, elegidos, vista])

  const confirmar = () => {
    if (!seleccion || !puedeConfirmar) return

    // Equipar: ejecutar directamente la acción elegida
    if (seleccion.tipo === 'equipar') {
      const elegidoId = [...elegidos][0]
      const accion = seleccion.opciones.find((a) => a.campeonInstanceId === elegidoId)
      if (accion) {
        onAccion(accion)
      }
      setSeleccion(null)
      setElegidos(new Set())
      setSacrificiosElegidos([])
      return
    }

    const accionBase = seleccion.accionBase
    const accionConPago = {
      ...accionBase,
      eterIds: [...elegidos],
      sacrificios: [...sacrificiosElegidos],
    } as Action

    // ¿Necesita selección de casilla?
    const necesitaSlot = accionConPago.type === 'jugar_campeon' ||
      accionConPago.type === 'jugar_mistica' ||
      accionConPago.type === 'colocar_arcana'

    if (necesitaSlot) {
      const { slotsDisponibles, slotLabels } = casillasDe(accionConPago)

      if (slotsDisponibles.length === 1) {
        // Solo 1 slot → ejecutar directo
        onAccion({ ...accionConPago, slot: slotsDisponibles[0] } as Action)
        setSeleccion(null)
        setElegidos(new Set())
        setSacrificiosElegidos([])
      } else if (slotsDisponibles.length > 1) {
        // Mostrar selector de casilla
        setSeleccion({ tipo: 'elegir_slot', accionBase: accionConPago, objetivoCardId: seleccion.objetivoCardId, slotsDisponibles, slotLabels })
      } else {
        // No hay slots → ejecutar con slot por defecto (el validador rechazará)
        onAccion(accionConPago)
        setSeleccion(null)
        setElegidos(new Set())
        setSacrificiosElegidos([])
      }
    } else {
      // Sin selección de casilla → ejecutar directo
      onAccion(accionConPago)
      setSeleccion(null)
      setElegidos(new Set())
      setSacrificiosElegidos([])
    }
  }

  const cancelar = () => {
    setSeleccion(null)
    setElegidos(new Set())
    setSacrificiosElegidos([])
  }

  /** Parejas Campeón + Éter que el motor acepta para el Pasivo 1A (vacío = la opción no tiene qué elegir). */
  const parejasOpcion = opcionBloqueo && leTocaA ? parejasBloqueoOpcion(vista, 'A') : []
  // Acciones generales (no van sobre una carta ni son de la mano)
  const generales = acciones.filter((a) => {
    if (a.type === 'rendirse') return false // va en el header
    if (a.type === 'elegir_opcion' && parejasOpcion.length > 0) return false // se resuelve en ElegirBloqueoModal
    if (a.type === 'elegir_objetivo') return false // se lista como opciones con label de zona (OpcionTutor)
    if (a.type === 'ordenar_mazo') return false // vive en el ScryModal
    if (a.type === 'descartar_carta') return false // va debajo de la carta de la mano
    if (a.type === 'pasar_prioridad') return false // vive SOLO en el PriorityModal (2026-10-14)
    if (esDeMano(a)) return false // va sobre la carta de la mano
    if (conCarta(a)) return false // va sobre la carta en la pila
    if (a.type === 'declarar_ataque') {
      // A6 (2026-10-22): en Acciones solo vive "Atacar con todos" (conjunto
      // completo) — los subconjuntos se arman con la selección multi (+) de
      // cada campeón y se confirman con el botón "Atacar con N".
      const elegibles = atacantesElegibles(vista)
      return elegibles.length > 1 && a.atacanteIds.length === elegibles.length
    }
    if (a.type === 'bloquear_eter') return false // abre el selector desde el campeón
    if (a.type === 'elegir_ruptura' && a.atacanteId !== null) return false // se resume en un botón aparte
    return true
  })
  /** elegir_objetivo: una acción por carta opción (zona según pendiente). */
  const tutores = acciones.filter(
    (a): a is Extract<Action, { type: 'elegir_objetivo' }> => a.type === 'elegir_objetivo',
  )
  /** Scry pendiente de quien mira (F9c): el motor ofrece la jugada canónica con las cartas vigentes. */
  const accionScry = acciones.find((a): a is Extract<Action, { type: 'ordenar_mazo' }> => a.type === 'ordenar_mazo')
  /** Carta fuente del pendiente actual (para el label: "Enviada de las Casas" + "Búsqueda de mazo"). */
  const pendienteActual = vista.objetivosPendientes?.[0]
  const fuenteNombre = pendienteActual
    ? (getCardMeta(vista.instances[pendienteActual.instId]?.cardId ?? '')?.name ?? null)
    : null
  /**
   * Ruptura pendiente (§9.4): el atacante ELIGE qué Vínculo rival romper, a ciegas.
   * El motor ofrece una acción por (atacante sin bloquear × Vínculo vivo); el poder del
   * atacante no importa, así que alcanza con la primera acción de cada slot.
   */
  const opcionesRuptura = acciones.filter(
    (a): a is Extract<Action, { type: 'elegir_ruptura' }> =>
      a.type === 'elegir_ruptura' && a.atacanteId !== null && a.vinculoSlot !== undefined,
  )
  const slotsRuptura = [...new Set(opcionesRuptura.map((a) => a.vinculoSlot as number))]
  const elegirVinculoARomper = (slot: number) => {
    const accion = opcionesRuptura.find((a) => a.vinculoSlot === slot)
    if (accion) onAccion(accion)
  }
  /** ¿Hay jugadas reales (no solo pasar/rendirse)? Para el hint de "sin jugadas". */
  const hayJugablesSignificativas = acciones.some((a) =>
    [
      'jugar_campeon', 'jugar_mistica', 'colocar_arcana', 'colocar_vinculo',
      'activar_habilidad', 'equipar_artefacto', 'activar_arcana', 'bloquear_eter',
      'declarar_ataque', 'declarar_bloqueo', 'responder_cadena', 'responder_prevenicion',
      'elegir_objetivo', 'elegir_opcion', 'elegir_ruptura', 'usar_transmutar', 'ordenar_mazo',
    ].includes(a.type),
  )
  const cadenaVista = cadenaActiva(vista)
  const pila = cadenaVista?.pila ?? []
  const triggersCadena = cadenaVista?.triggers ?? [] // F5d-2: triggers apilados
  const ordenCadena = cadenaVista && triggersCadena.length > 0 ? ordenResolucion(cadenaVista) : []
  const efectoActual = cadenaVista?.efectoActual

  const faseTurno = terminada
    ? 'Partida terminada'
    : fase === 'pre_partida'
      ? vista.turno === 'A'
        ? 'Tú decides el mulligan'
        : 'El rival decide el mulligan'
      : `${FASE_LABEL[fase] ?? fase} — ${vista.turno === 'A' ? 'tu turno' : 'turno del rival'}`

  const objetivoSeleccion = seleccion
    ? seleccion.tipo === 'pagar' && 'cardInstanceId' in seleccion.accionBase
      ? vista.instances[seleccion.accionBase.cardInstanceId]
      : seleccion.tipo === 'bloquear'
        ? vista.instances[seleccion.targetInstanceId] ?? null
        : seleccion.tipo === 'equipar'
          ? seleccion.opciones.length > 0
            ? vista.instances[seleccion.opciones[0].cardInstanceId]
            : null
          : null
    : null

  return (
    <EnVueloContext.Provider value={anim.ocultas}>
    <AnimacionActivaContext.Provider value={anim.velocidad !== 'off'}>
    <AnchoTableroContext.Provider value={cw}>
    <CompactoContext.Provider value={compacto}>
    <InspeccionContext.Provider value={setInspeccion}>
    {/* overflow-clip (no hidden): hidden se puede scrollear por foco (clic en una carta de la mano) y correría toda la UI */}
    <div className={`${compacto ? 'h-dvh touch-manipulation' : 'h-screen'} flex flex-col overflow-clip bg-[#0a0a12] text-gray-100 font-body relative`}>
      {anim.capa}
      <CapaCombate entradas={animaciones} activa={anim.velocidad !== 'off'} />
      <CapaAnuncios entradas={animaciones} instancias={vista.instances} activa={anim.velocidad !== 'off'} />

      {esRetrato && (
        <div role="alert" className="absolute inset-0 z-[70] flex flex-col items-center justify-center gap-3 bg-[#0a0a12] p-6 text-center">
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-ether-300" aria-hidden="true">
            <rect x="7" y="2" width="10" height="20" rx="2" />
            <path d="M3 9a8 8 0 0 1 4-5M21 15a8 8 0 0 1-4 5" strokeLinecap="round" />
          </svg>
          <p className="font-display text-base font-bold">Gira tu dispositivo</p>
          <p className="max-w-60 text-xs text-gray-400">Éter Online se juega en horizontal: así entran los dos campos y tu mano.</p>
          <button onClick={onAbandonar} className="mt-2 cursor-pointer rounded bg-surface-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-card-border">
            Abandonar partida
          </button>
        </div>
      )}

      {/* ── Barra superior: fase del turno + controles ───────────── */}
      {compacto ? (
        <header className="shrink-0 h-7 flex items-center gap-2 px-2 border-b border-card-border/70 bg-surface/90 z-30">
          <nav aria-label="Fases del turno" className="flex items-center">
            <span
              aria-current="step"
              className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                fase === 'pre_partida'
                  ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40'
                  : vista.turno === 'A'
                    ? 'bg-ether-600/40 text-ether-100 ring-1 ring-ether-400/60'
                    : 'bg-red-600/30 text-red-200 ring-1 ring-red-400/50'
              }`}
            >
              {fase === 'pre_partida' ? 'Mulligan' : (FASE_LABEL[fase] ?? fase)}
            </span>
          </nav>
          <span className="min-w-0 truncate text-[9px] text-gray-500">
            {terminada
              ? 'Partida terminada'
              : fase === 'pre_partida'
                ? vista.turno === 'A'
                  ? 'Decides el mulligan'
                  : 'El rival decide el mulligan'
                : vista.turno === 'A'
                  ? 'Tu turno'
                  : 'Turno del rival'}
          </span>
          <h1 className="sr-only">Éter Online</h1>
          <button
            onClick={() => setMenuAbierto((abierto) => !abierto)}
            aria-label="Menú"
            aria-haspopup="menu"
            aria-expanded={menuAbierto}
            className="ml-auto grid size-6 shrink-0 cursor-pointer place-items-center rounded bg-surface-2 text-gray-300 transition-colors hover:bg-card-border"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </header>
      ) : (
      <header className="shrink-0 h-12 flex items-center gap-4 px-4 border-b border-card-border/70 bg-surface/90 z-20">
        <div>
          <h1 className="text-base font-display font-bold tracking-wider leading-none">Éter Online</h1>
          <p className="text-[10px] text-gray-500 mt-0.5 leading-none">{faseTurno}</p>
        </div>
        <nav aria-label="Fases del turno" className="flex items-center gap-1">
          {fase === 'pre_partida' ? (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40">
              Mulligan
            </span>
          ) : (
            FASES.map((f) => (
              <span
                key={f.id}
                aria-current={fase === f.id ? 'step' : undefined}
                className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full transition-colors ${
                  fase === f.id
                    ? vista.turno === 'A'
                      ? 'bg-ether-600/40 text-ether-100 ring-1 ring-ether-400/60'
                      : 'bg-red-600/30 text-red-200 ring-1 ring-red-400/50'
                    : 'text-gray-600'
                }`}
              >
                {f.label}
              </span>
            ))
          )}
        </nav>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={anim.ciclarVelocidad}
            title="Velocidad de la animación de cartas (clic para cambiar)"
            className="text-xs bg-surface-2 hover:bg-card-border text-gray-300 px-3 py-1.5 rounded transition-colors cursor-pointer"
          >
            Animación: {ETIQUETA_VELOCIDAD[anim.velocidad]}
          </button>
          {vistaPrevia && onCiclarVistaPrevia && (
            <button
              onClick={onCiclarVistaPrevia}
              title="Vista previa de efectos: pausa el juego para revisar qué se va a resolver. Todas = tus jugadas y las del rival · Solo mías = el rival corre sin interrumpir · Apagada = nunca (clic para cambiar)"
              className="text-xs bg-surface-2 hover:bg-card-border text-gray-300 px-3 py-1.5 rounded transition-colors cursor-pointer"
            >
              Vista previa: {ETIQUETA_VISTA_PREVIA[vistaPrevia]}
            </button>
          )}
          {leTocaA && (
            <button
              onClick={() => {
                const r = acciones.find((a) => a.type === 'rendirse')
                if (r) onAccion(r)
              }}
              className="text-xs bg-red-600/30 hover:bg-red-600/50 text-red-300 px-3 py-1.5 rounded transition-colors cursor-pointer"
            >
              Rendirse
            </button>
          )}
          <button
            onClick={onAbandonar}
            className="text-xs bg-surface-2 hover:bg-card-border text-gray-300 px-3 py-1.5 rounded transition-colors cursor-pointer"
          >
            Abandonar
          </button>
        </div>
      </header>
      )}

      {compacto && menuAbierto && (
        <>
          <button type="button" aria-label="Cerrar menú" tabIndex={-1} onClick={() => setMenuAbierto(false)} className="fixed inset-0 z-[35] cursor-default" />
          <div role="menu" aria-label="Menú de la partida" className="absolute right-1 top-8 z-40 flex w-56 flex-col gap-0.5 rounded-xl border border-card-border bg-[#12121c]/98 p-1 shadow-2xl">
            <ItemMenu
              onClick={() => {
                setPanelLateralAbierto((abierto) => !abierto)
                setMenuAbierto(false)
              }}
            >
              {panelLateralAbierto ? 'Cerrar panel' : 'Cadena, efectos y log'}
            </ItemMenu>
            <ItemMenu onClick={anim.ciclarVelocidad}>Animación: {ETIQUETA_VELOCIDAD[anim.velocidad]}</ItemMenu>
            {vistaPrevia && onCiclarVistaPrevia && (
              <ItemMenu onClick={onCiclarVistaPrevia}>Vista previa: {ETIQUETA_VISTA_PREVIA[vistaPrevia]}</ItemMenu>
            )}
            {leTocaA && (
              <ItemMenu
                peligro
                onClick={() => {
                  const r = acciones.find((x) => x.type === 'rendirse')
                  setMenuAbierto(false)
                  if (r) onAccion(r)
                }}
              >
                Rendirse
              </ItemMenu>
            )}
            <ItemMenu
              onClick={() => {
                setMenuAbierto(false)
                onAbandonar()
              }}
            >
              Abandonar
            </ItemMenu>
          </div>
        </>
      )}

      <main ref={tableroRef} className={`flex-1 min-h-0 flex ${compacto ? 'gap-1 p-1' : 'gap-3 p-3'}`}>
        {/* ── Mesa: los dos campos + la mano ──────────────────────── */}
        <section className="flex-1 min-w-0 flex flex-col">
          <div
            ref={mesaRef}
            className={`flex-1 min-h-0 flex flex-col items-center justify-center rounded-2xl border border-card-border/60 ${compacto ? 'px-1 py-0.5' : 'px-3 py-1'}`}
            style={{
              background:
                'radial-gradient(ellipse at 50% 50%, rgba(64,64,255,0.07) 0%, rgba(64,64,255,0) 60%), linear-gradient(180deg, #11111b 0%, #0d0d16 50%, #11111b 100%)',
            }}
          >
            <div className={`w-full flex items-center justify-center ${compacto ? 'gap-1' : 'gap-4'}`}>
            <div
              className={`${compacto ? 'py-0' : 'px-1.5 py-1'} rounded-xl transition-shadow`}
              style={vista.turno === 'B' && !terminada ? { boxShadow: '0 0 0 1px rgba(248,113,113,0.30), 0 0 32px rgba(248,113,113,0.10)' } : undefined}
            >
              <GrillaJugador
                vista={vista}
                jugador="B"
                leTocaA={false}
                acciones={[]}
                onAccion={onAccion}
                abrirSelector={abrirSelector}
                abrirZoom={abrirZoom}
                abrirPanel={(j, z, slot, artefactoId) => setPanelAbierto({ jugador: j, zona: z, campeonSlot: slot, artefactoId })}
                invertida
                seleccion={null}
                setSeleccion={setSeleccion}
                animaciones={animaciones}
                vinculosElegibles={leTocaA ? slotsRuptura : undefined}
                onElegirVinculo={elegirVinculoARomper}
              />
            </div>
            <FlancoJugador
              nombre="Rival (B)"
              color="bg-red-400"
              jugador={rival}
              activo={vista.turno === 'B'}
              ancho={anchoFlanco}
              compacto={compacto}
              onAbrirPanel={(zona) => setPanelAbierto({ jugador: 'B', zona })}
            >
              {/* Mano del rival: dorsos (sus cartas son información oculta) */}
              {rival.mano.length > 0 && (
                <div className="flex items-center pt-1">
                  {rival.mano.map((id) => (
                    <div key={id} className={`${compacto ? '-ml-2' : '-ml-3'} first:ml-0`}>
                      <MiniCard inst={vista.instances[id]} anchoPx={compacto ? 16 : 22} />
                    </div>
                  ))}
                </div>
              )}
            </FlancoJugador>
            </div>

            {/* ── Franja central: acciones del turno (pasar fase, atacar, mulligan…) ── */}
            <div className={`w-full ${compacto ? 'h-7' : 'h-11'} shrink-0 flex items-center justify-center gap-2 flex-wrap border-y border-ether-500/15 bg-ether-600/5`}>
              {pila.length > 0 && (
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/40">
                  Cadena ({pila.length})
                </span>
              )}
              {leTocaA && (generales.length > 0 || parejasOpcion.length > 0 || opcionesRuptura.length > 0 || selAtaque.length > 0) ? (
                <>
                  {!hayJugablesSignificativas && (fase === 'forja' || fase === 'choque') && (
                    <span className="text-[10px] text-amber-400/90">Sin jugadas — pasa el turno para continuar</span>
                  )}
                  {generales.map((a, i) => (
                    <Boton key={i} accion={a} onClick={onAccion} fase={fase} destacado />
                  ))}
                  {parejasOpcion.length > 0 && (
                    <button
                      onClick={() => setOpcionAbierta(opcionBloqueoId)}
                      className="text-xs font-bold bg-amber-400 hover:bg-amber-300 text-gray-950 px-3 py-1 rounded-md shadow-[0_0_0_1px_rgba(253,230,138,0.6)] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Puedes bloquear Éter (Pasivo)
                    </button>
                  )}
                  {opcionesRuptura.length > 0 && (
                    <span className="text-[11px] font-semibold text-rose-300">
                      Ruptura: elige qué Vínculo del rival romper (a ciegas)
                    </span>
                  )}
                  {/* A6: confirmación del subconjunto de atacantes seleccionado con los (+) */}
                  {selAtaque.length > 0 && esPasoAtaquePropio && (
                    <button
                      onClick={atacarSeleccionados}
                      className="text-xs font-bold bg-amber-400 hover:bg-amber-300 text-gray-950 px-3 py-1 rounded-md shadow-[0_0_0_1px_rgba(253,230,138,0.6)] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Atacar con {selAtaque.length} campeón{selAtaque.length > 1 ? 'es' : ''} (✓)
                    </button>
                  )}
                </>
              ) : (
                <span className="text-[10px] uppercase tracking-[0.2em] text-gray-600">
                  {terminada ? 'Fin de la partida' : vista.turno === 'A' ? 'Tu turno' : 'Turno del rival'}
                </span>
              )}
            </div>

            <div className={`w-full flex items-center justify-center ${compacto ? 'gap-1' : 'gap-4'}`}>
            <div
              className={`${compacto ? 'py-0' : 'px-1.5 py-1'} rounded-xl transition-shadow`}
              style={vista.turno === 'A' && !terminada ? { boxShadow: '0 0 0 1px rgba(112,112,255,0.35), 0 0 32px rgba(64,64,255,0.12)' } : undefined}
            >
              <GrillaJugador
                vista={vista}
                jugador="A"
                leTocaA={leTocaA}
                acciones={acciones}
                onAccion={onAccion}
                abrirSelector={abrirSelector}
                abrirZoom={abrirZoom}
                abrirPanel={(j, z, slot, artefactoId) => setPanelAbierto({ jugador: j, zona: z, campeonSlot: slot, artefactoId })}
                seleccion={seleccion}
                setSeleccion={setSeleccion}
                animaciones={animaciones}
                selAtaque={selAtaque}
                esPasoAtaquePropio={esPasoAtaquePropio}
                onToggleSelAtaque={toggleSelAtaque}
                casillasElegibles={seleccion?.tipo === 'elegir_slot' ? seleccion.slotLabels : undefined}
                onElegirCasilla={elegirCasilla}
              />
            </div>
            <FlancoJugador
              nombre="Tú (A)"
              color="bg-ether-400"
              jugador={yo}
              activo={vista.turno === 'A'}
              ancho={anchoFlanco}
              compacto={compacto}
              onAbrirPanel={(zona) => setPanelAbierto({ jugador: 'A', zona })}
            />
            </div>
          </div>

          {/* ── Franja de la mano (abanico estilo Master Duel; dentro de <main> para que el FLIP la mida) ── */}
          <div className="relative shrink-0" style={{ height: franjaMano }}>
            <ManoAbanico vista={vista} ids={yo.mano} opcionesDe={opcionesMano} atenuada={seleccion !== null} ancho={manoAncho} />
          </div>
        </section>

        {/* ── Lateral: elección de objetivo, inspector, cadena, efectos y log ── */}
        {compacto && panelLateralAbierto && (
          <button type="button" aria-label="Cerrar panel" tabIndex={-1} onClick={() => setPanelLateralAbierto(false)} className="fixed inset-0 z-20 cursor-default" />
        )}
        <aside
          id="panel-lateral"
          className={
            compacto
              ? `${panelLateralAbierto ? 'flex' : 'hidden'} absolute right-1 top-8 bottom-1 z-30 w-64 max-w-[55vw] flex-col gap-2 overflow-y-auto rounded-xl border border-card-border bg-[#0a0a12]/97 p-2 shadow-2xl`
              : 'w-80 shrink-0 flex flex-col gap-2 overflow-y-auto pr-0.5'
          }
        >
          {/* Compacto: sin inspector — en táctil no hay hover y un toque sobre la carta ya abre CartaZoom */}
          {!compacto && (
            <section className="bg-surface border border-card-border rounded-lg p-3">
              <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-2">Carta</p>
              <InspectorCarta seleccion={inspeccion} />
            </section>
          )}

          <section className="bg-surface border border-card-border rounded-lg p-2 min-h-18">
            <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-1.5">
              {cadenaVista?.origen === 'global' && pila.length > 0 ? 'Cadena Global' : 'Cadena 9.6'}{pila.length > 0 ? ` (${pila.length})` : ''}
            </p>
            {efectoActual && (
              <p className="text-[10px] text-gray-400 mb-1 italic">
                {vista.instances[efectoActual.cardInstanceId]?.cardId
                  ? `Activó: ${vista.instances[efectoActual.cardInstanceId]!.cardId}`
                  : 'Efecto activado'}
              </p>
            )}
            {pila.length === 0 && triggersCadena.length === 0 ? (
              <p className="text-[11px] text-gray-600 italic">Sin cadena abierta.</p>
            ) : (
              <div className="flex gap-1.5 flex-wrap items-start">
                {pila.map((id) => (
                  <MiniCard
                    key={id}
                    inst={vista.instances[id]}
                    tamano="sm"
                    onZoom={() => abrirZoom(vista.instances[id])}
                  />
                ))}
                {/* F5d-2: triggers apilados, con su orden de resolución (1° = el primero en resolver) */}
                {triggersCadena.map((t, i) => (
                  <div key={`trigger-${t.cardInstanceId}-${t.efectoIdx}-${i}`} className="flex flex-col items-center gap-0.5">
                    <MiniCard inst={vista.instances[t.cardInstanceId]} tamano="sm" onZoom={() => abrirZoom(vista.instances[t.cardInstanceId])} />
                    <span className="rounded-full bg-amber-500/20 px-1.5 py-px font-mono text-[9px] text-amber-200">
                      {`trigger · resuelve ${ordenCadena.findIndex((p) => 'trigger' in p && p.trigger === t) + 1}°`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Habilidades activas: auras, keywords y Éter con efecto que están afectando el juego ── */}
          <ActiveAbilitiesPanel s={vista} />

          {/* ── Log Detallado (debugging) ─────────────────────── */}
          <LogDetallado lineas={logDetallado} />
        </aside>
      </main>

      {/* ── Elegir casilla (después del pago): se clickea la casilla iluminada del tablero ── */}
      {seleccion?.tipo === 'elegir_slot' && (
        <Dock
          etiquetaAria="Elegir casilla"
          titulo="Elige la casilla"
          subtitulo={
            <>
              Elige en tu tablero la casilla iluminada para{' '}
              <span className="font-semibold text-cyan-300">{getCardMeta(seleccion.objetivoCardId)?.name ?? 'tu carta'}</span>
            </>
          }
          acciones={<BotonUI onClick={cancelar}>Cancelar</BotonUI>}
        />
      )}

      {/* ── Selector de Éter: pagar, bloquear o equipar ──────────────── */}
      {seleccion && seleccion.tipo !== 'elegir_slot' && (
        <Dock
          etiquetaAria={seleccion.tipo === 'pagar' ? 'Pagar con Éter' : seleccion.tipo === 'bloquear' ? 'Bloquear Éter' : 'Equipar Artefacto'}
          titulo={seleccion.tipo === 'pagar' ? 'Pagar con Éter' : seleccion.tipo === 'bloquear' ? 'Bloquear Éter' : 'Equipar Artefacto'}
          subtitulo={
            seleccion.tipo === 'pagar'
              ? 'Elige los Éteres de tu Reserva (2A) para pagar:'
              : seleccion.tipo === 'bloquear'
                ? (() => {
                    const meta = getCardMeta(seleccion.objetivoCardId)
                    const zonaTxt = origenPagadoBloqueo ? ' de tu Éter Pagado (1A)' : ''
                    if (meta && esBloqueoFijo(meta)) {
                      return `Bloquea exactamente ${maxEterBloqueado(meta)} Éter(es) sobre ${meta.name}${zonaTxt}:`
                    }
                    return `Elige los Éteres a bloquear${zonaTxt} (hasta el máximo):`
                  })()
                : 'Elige el Campeón al que quieres equipar este Artefacto:'
          }
          pie={
            <>
              {seleccion.tipo === 'pagar' && (
                <div className="flex items-center gap-3">
                  <p className="font-mono text-xs text-gray-300">
                    Aportado:{' '}
                    <span className={totalAportado >= seleccion.coste ? 'font-bold text-emerald-300' : 'text-rose-300'}>
                      {totalAportado}
                    </span>{' '}
                    / {seleccion.coste}
                  </p>
                  <div aria-hidden="true" className="h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full transition-all duration-200 ${
                        totalAportado >= seleccion.coste ? 'bg-emerald-400' : 'bg-gradient-to-r from-ether-400 to-ether-200'
                      }`}
                      style={{ width: `${Math.min(100, (totalAportado / Math.max(1, seleccion.coste)) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              <div className="ml-auto flex gap-2">
                <BotonUI onClick={cancelar}>Cancelar</BotonUI>
                <BotonUI variante="primario" onClick={confirmar} disabled={!puedeConfirmar}>
                  {seleccion.tipo === 'pagar' ? 'Pagar y jugar' : seleccion.tipo === 'equipar' ? 'Equipar' : 'Bloquear'}
                </BotonUI>
              </div>
            </>
          }
        >
          <div className="flex items-start gap-5">
            {/* Carta objetivo */}
            <div className="flex w-24 shrink-0 flex-col items-center gap-1.5">
              {objetivoSeleccion && (
                <MiniCard inst={objetivoSeleccion} anchoPx={84} sinTooltip onZoom={() => abrirZoom(objetivoSeleccion)} />
              )}
              <p className="text-center text-[11px] leading-tight text-gray-300">
                {seleccion.tipo === 'pagar'
                  ? `Coste: ${seleccion.coste}`
                  : seleccion.tipo === 'equipar'
                    ? `Artefacto — ${getCardMeta(seleccion.artefactoCardId)?.name ?? ''}`
                    : `Campeón — ${getCardMeta(seleccion.objetivoCardId)?.name ?? ''}`}
              </p>
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              {/* Selector de éteres (pago/bloqueo) */}
              {seleccion.tipo !== 'equipar' && (
                <>
                  {eteresSelector.length === 0 ? (
                    <p className="text-xs italic text-gray-500">
                      {origenPagadoBloqueo ? 'Tu Éter Pagado (1A) está vacío.' : 'Tu Reserva está vacía.'}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {eteresSelector.map((id) => {
                        const inst = vista.instances[id]
                        const cardId = inst?.cardId ?? ''
                        const meta = getCardMeta(cardId)
                        const elegido = elegidos.has(id)
                        const bloqueable =
                          seleccion.tipo === 'bloquear' &&
                          meta !== null &&
                          faccionesCompartidas(meta.facciones, getCardMeta(seleccion.objetivoCardId)?.facciones)
                        const aporte = seleccion.tipo === 'pagar' && meta ? aporteDe(meta.id, seleccion.objetivoCardId) : null
                        const inhabil = seleccion.tipo === 'bloquear' && !bloqueable
                        return (
                          <TileCarta
                            key={id}
                            seleccionada={elegido}
                            disabled={inhabil}
                            onClick={() => !inhabil && toggleEter(id)}
                            title={meta?.name}
                            pie={aporte !== null ? `aporte ${aporte}` : bloqueable ? 'bloqueable' : 'no comparte'}
                          >
                            <MiniCard inst={inst} anchoPx={58} sinTooltip />
                          </TileCarta>
                        )
                      })}
                    </div>
                  )}

                  {/* Sacrificio exigido por el rol (Soberano 1 / Emperador 2) */}
                  {seleccion.tipo === 'pagar' && requeridos > 0 && (
                    <div className="border-t border-white/5 pt-3">
                      <Seccion tono="alerta">
                        Elige {requeridos} Campeón{requeridos > 1 ? 'es' : ''} de tu campo para sacrificar:
                      </Seccion>
                      <div className="flex flex-wrap gap-1.5">
                        {sacrificables.map((id) => {
                          const inst = vista.instances[id]
                          const meta = getCardMeta(inst?.cardId ?? '')
                          const elegido = sacrificiosElegidos.includes(id)
                          const lleno = sacrificiosElegidos.length >= requeridos
                          return (
                            <TileCarta
                              key={id}
                              seleccionada={elegido}
                              disabled={!elegido && lleno}
                              onClick={() => toggleSacrificio(id)}
                              title={meta?.name}
                              pie={meta?.name}
                            >
                              <MiniCard inst={inst} anchoPx={58} sinTooltip />
                            </TileCarta>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Selector de equipar: elegir campeón objetivo */}
              {seleccion.tipo === 'equipar' && (
                <div className="flex flex-wrap gap-1.5">
                  {seleccion.opciones.map((a) => {
                    const inst = vista.instances[a.campeonInstanceId]
                    if (!inst) return null
                    const meta = inst.cardId ? getCardMeta(inst.cardId) : null
                    const elegido = elegidos.has(a.campeonInstanceId)
                    return (
                      <TileCarta
                        key={a.campeonInstanceId}
                        seleccionada={elegido}
                        onClick={() => {
                          setElegidos(new Set([a.campeonInstanceId]))
                        }}
                        title={meta?.name}
                        pie={meta?.name}
                      >
                        <MiniCard inst={inst} anchoPx={58} sinTooltip />
                      </TileCarta>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </Dock>
      )}

      {/* ── Panel de pila: lista completa de una zona (2A Reserva / 1A Pagado / 2G Cementerio / 1G Exilio / 1B-1F Bloqueado) ── */}
      {panelAbierto && (() => {
        const pj = vista.players[panelAbierto.jugador]
        const insts =
          panelAbierto.zona === 'reserva'
            ? pj.eterReserva
            : panelAbierto.zona === 'pagado'
              ? pj.eterPagado
              : panelAbierto.zona === 'cementerio'
                ? pj.cementerio
                : panelAbierto.zona === 'exilio'
                  ? pj.exilio
                  : panelAbierto.artefactoId !== undefined && vista.instances[panelAbierto.artefactoId]
                    ? vista.instances[panelAbierto.artefactoId]?.eterBloqueado ?? []
                    : panelAbierto.campeonSlot !== undefined && pj.campo.campeones[panelAbierto.campeonSlot] !== null
                      ? vista.instances[pj.campo.campeones[panelAbierto.campeonSlot]!]?.eterBloqueado ?? []
                      : pj.campo.campeones
                        .filter((id): id is string => id !== null)
                        .flatMap((cid) => vista.instances[cid]?.eterBloqueado ?? [])
        const nombreArtefacto = panelAbierto.artefactoId
          ? getCardMeta(vista.instances[panelAbierto.artefactoId]?.cardId ?? '')?.name ?? 'Artefacto'
          : null
        const titulo =
          panelAbierto.zona === 'reserva'
            ? 'Reserva de Éter'
            : panelAbierto.zona === 'pagado'
              ? 'Éteres pagados'
              : panelAbierto.zona === 'cementerio'
                ? 'Cementerio'
                : panelAbierto.zona === 'exilio'
                  ? 'Exilio'
                  : nombreArtefacto
                    ? `Éteres bloqueados — ${nombreArtefacto}`
                    : panelAbierto.campeonSlot !== undefined
                      ? `Éteres bloqueados — Campeón ${panelAbierto.campeonSlot + 1}`
                      : 'Éteres bloqueados'
        const posesivo =
          panelAbierto.jugador === 'A'
            ? panelAbierto.zona === 'pagado'
              ? 'tuyos'
              : 'tuyo'
            : panelAbierto.zona === 'reserva'
              ? 'tu rival'
              : 'del rival'
        return (
          <Dock
            etiquetaAria={titulo}
            tono={panelAbierto.jugador === 'A' ? 'ether' : 'rival'}
            titulo={
              <>
                {titulo}
                <span className="font-sans text-sm font-normal text-gray-500"> — {posesivo}</span>{' '}
                <span className="font-mono text-sm font-normal text-gray-400">({insts.length})</span>
              </>
            }
            subtitulo="Clic en una carta para verla en grande."
            onCerrar={() => setPanelAbierto(null)}
          >
            {insts.length === 0 ? (
              <p className="py-2 text-xs italic text-gray-500">Esta zona está vacía.</p>
            ) : (
              <div className="flex flex-wrap items-start gap-2.5 pt-1">
                {insts.map((id: string) => {
                  const inst = vista.instances[id]
                  const nombre = inst.cardId ? (getCardMeta(inst.cardId)?.name ?? '') : ''
                  return (
                    <div key={id} className="flex flex-col items-center gap-1">
                      <MiniCard inst={inst} anchoPx={68} agotado={false} onZoom={() => abrirZoom(inst)} />
                      <span className="line-clamp-2 w-[72px] text-center text-[10px] leading-tight text-gray-500">{nombre}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </Dock>
        )
      })()}

      {/* ── Elegir objetivo (búsqueda de mazo, elegir un Campeón…): galería con inspector ── */}
      {leTocaA && tutores.length > 0 && (
        <ElegirObjetivoModal
          vista={vista}
          opciones={tutores.map((a) => a.objetivoId)}
          titulo={fuenteNombre ?? 'Elige una carta'}
          subtitulo={labelOpcionesElegir(vista, tutores.map((a) => a.objetivoId))}
          onElegir={(objetivoId) => onAccion({ type: 'elegir_objetivo', objetivoId })}
        />
      )}

      {/* ── Scry (F9c): ordenar las cartas miradas del tope del mazo. Obligatorio: la partida espera ── */}
      {leTocaA && accionScry && (
        <ScryModal
          vista={vista}
          cartas={accionScry.arriba}
          onConfirmar={(arriba, fondo) => onAccion({ type: 'ordenar_mazo', arriba, fondo })}
        />
      )}

      {/* ── Pasivo 1A (FB-005/DS-006): elegir Campeón + Éter a bloquear. Voluntario: "Ahora no" lo deja para después ── */}
      {leTocaA && tutores.length === 0 && opcionBloqueo && parejasOpcion.length > 0 && opcionAbierta === opcionBloqueo.opcionId && (
        <ElegirBloqueoModal
          vista={vista}
          parejas={parejasOpcion}
          fuenteNombre={getCardMeta(vista.instances[opcionBloqueo.opcionId]?.cardId ?? '')?.name ?? 'Bloquear Éter'}
          onElegir={(pareja) => onAccion({ type: 'elegir_opcion', opcionId: opcionBloqueo.opcionId, ...pareja })}
          onCerrar={() => setOpcionAbierta(null)}
        />
      )}

      {/* ── Modal de prevenión (checkpoint prevent_destroy, Fase 2c) ── */}
      {leTocaA && (
        <PreventionModal
          state={vista}
          playerId="A"
          acciones={acciones}
          onAccion={onAccion}
          onZoom={abrirZoom}
        />
      )}

      {/* ── Modal de prioridad (cadena abierta) ───────────────────── */}
      {leTocaA && (() => {
        if (!cadenaActiva(vista)) return null
        return (
          <PriorityModal
            state={vista}
            playerId="A"
            acciones={acciones}
            onAccion={onAccion}
            onZoom={abrirZoom}
          />
        )
      })()}

      {/* ── Zoom de carta (revisar el efecto en grande) ─────────── */}
      {zoom && <CartaZoom inst={zoom} onClose={() => setZoom(null)} />}

      {/* ── Interfaz de bloqueo manual ─────────────────────────── */}
      {bloqueoAbierto && vista.combate?.paso === 'bloqueo' && (() => {
        const defensor = vista.turno === 'A' ? 'B' : 'A'
        const sinBloquear = vista.combate.atacantes.filter((a) => !(a in vista.combate!.bloqueos))
        return (
          <BlockingInterface
            s={vista}
            defensor={defensor}
            atacantes={sinBloquear}
            onBloquear={(asignaciones) => {
              onAccion({ type: 'declarar_bloqueo', asignaciones })
              setBloqueoAbierto(false)
            }}
            onCancelar={() => setBloqueoAbierto(false)}
          />
        )
      })()}

      {/* ── Fin de la partida ───────────────────────────────────── */}
      {terminada && (() => {
        const empate = vista.motivo === 'empate' // F6: ambos jugadores derrotados a la vez; no hay ganador
        const gane = vista.ganador === 'A'
        const motivoTexto =
          empate
            ? 'Ambos jugadores cumplieron una condición de derrota al mismo tiempo.'
            : vista.motivo === 'vinculos'
            ? gane
              ? 'Destruiste todos los Vínculos de tu rival.'
              : 'Todos tus Vínculos fueron destruidos.'
            : vista.motivo === 'mazo_vacio'
              ? gane
                ? 'Tu rival se quedó sin cartas en el Mazo Principal.'
                : 'Te quedaste sin cartas en el Mazo Principal.'
              : vista.motivo === 'rendicion'
                ? gane
                  ? 'Tu rival se rindió.'
                  : 'Te rendiste.'
                : 'La partida terminó.'
        const vinculosVivos = (j: PlayerId) =>
          vista.players[j].vinculos.filter((id) => id && !vista.instances[id]?.bocaArriba).length
        const conAnimacion = anim.velocidad !== 'off'
        return (
          <>
          {conAnimacion && !empate && (
            <div
              aria-hidden="true"
              data-testid="fin-efecto"
              className={`pointer-events-none fixed inset-0 z-[49] ${gane ? 'anim-fin-victoria' : 'anim-fin-derrota'}`}
              style={{
                background: gane
                  ? 'radial-gradient(circle at 50% 45%, rgba(251,191,36,0.55) 0%, rgba(251,191,36,0.15) 35%, transparent 65%)'
                  : 'radial-gradient(circle at 50% 50%, transparent 30%, rgba(127,29,29,0.55) 100%)',
              }}
            />
          )}
          <Modal
            titulo={empate ? 'Empate' : gane ? '¡Ganaste!' : 'Perdiste'}
            subtitulo={motivoTexto}
            icono={<span className={conAnimacion ? 'anim-fin-icono inline-block' : undefined}>{empate ? '⚖' : gane ? '🏆' : '☠'}</span>}
            tono={empate ? 'ether' : gane ? 'exito' : 'peligro'}
            ancho="sm"
            pie={
              <BotonUI variante="primario" onClick={onAbandonar}>
                Volver al menú
              </BotonUI>
            }
          >
            <div className="grid grid-cols-2 gap-3 text-center">
              {(['A', 'B'] as PlayerId[]).map((j) => (
                <div key={j} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">{j === 'A' ? 'Tú' : 'Rival'}</p>
                  <p className="mt-1 font-display text-2xl font-bold text-gray-100">
                    {vinculosVivos(j)}
                    <span className="text-base text-gray-500">/{vista.players[j].vinculos.length}</span>
                  </p>
                  <p className="text-[10px] text-gray-500">Vínculos</p>
                </div>
              ))}
            </div>
          </Modal>
          </>
        )
      })()}
    </div>
    </InspeccionContext.Provider>
    </CompactoContext.Provider>
    </AnchoTableroContext.Provider>
    </AnimacionActivaContext.Provider>
    </EnVueloContext.Provider>
  )
}
