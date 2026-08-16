import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { aporteDe, campeonesSacrificables, faccionesCompartidas, getCardMeta, sacrificiosRequeridos } from '../game'
import type { Action, CardInstance, GameState, PlayerId } from '../game'
import { useCardImage } from '../../forge/hooks/useCardImage'
import { MiniCard, TAMANOS } from './MiniCard'
import { CartaZoom } from './CartaZoom'
import { ChampionStatus, FocosChampion } from './ChampionStatus'
import { BlockingInterface } from './BlockingInterface'

interface TableroProps {
  /** Proyección 6.2 del estado para el jugador A (cartas ocultas con cardId null). */
  vista: GameState
  /** Acciones válidas del humano (getValidActions(estado, 'A') cuando le toca). */
  acciones: Action[]
  leTocaA: boolean
  log: string[]
  onAccion: (a: Action) => void
  onAbandonar: () => void
  /** Animaciones de movimiento de cartas (glow en celda destino). */
  animaciones?: Array<{ tipo: string; zona?: string; jugador?: PlayerId; atacantes?: string[]; cardInstanceId?: string; key: number }>
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
  | { tipo: 'bloquear'; accionBase: Action; objetivoCardId: string; campeonSlot: number }
  | null

/** Zonas que abren el panel inferior con su lista completa. */
type ZonaPanel = 'reserva' | 'pagado' | 'cementerio' | 'exilio'
/** Panel inferior abierto: zona de un jugador (2A Reserva / 1A Pagado / 2G Cementerio / 1G Exilio). */
interface PanelAbierto {
  jugador: 'A' | 'B'
  zona: ZonaPanel
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
  colocar_tactica: 'Colocar',
  colocar_arcana: 'Colocar',
  colocar_combate: 'Colocar',
  descartar_carta: 'Descartar',
  responder_cadena: 'Responder',
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
    case 'elegir_ruptura': return a.atacanteId === null ? 'No romper Vínculo' : 'Romper Vínculo'
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
    a.type === 'colocar_tactica' ||
    a.type === 'colocar_arcana' ||
    a.type === 'colocar_combate'
  )
}

/** Acciones que llevan cardInstanceId y se renderizan sobre la carta (cadena). */
function conCarta(a: Action): a is Extract<Action, { cardInstanceId: string }> {
  return 'cardInstanceId' in a && !esDeMano(a)
}

function Boton({ accion, onClick, fase }: { accion: Action; onClick: (a: Action) => void; fase?: string }) {
  return (
    <button
      onClick={() => onClick(accion)}
      className="text-[10px] bg-ether-600/30 hover:bg-ether-600/50 text-ether-200 px-1.5 py-0.5 rounded 
                 transition-colors cursor-pointer whitespace-nowrap"
    >
      {labelAccion(accion, fase)}
    </button>
  )
}

/**
 * Opción de búsqueda de mazo (mecánica tutor, soporte.ts): una carta del
 * propio mazo que cumple el filtro del efecto. Muestra arte, nombre, coste
 * y ATQ/RES para que el jugador VEA qué cartas puede elegir (bug reportado:
 * antes eran botones genéricos "elegir_objetivo" sin nombre).
 */
function OpcionTutor({
  inst,
  onAccion,
}: {
  inst: CardInstance
  onAccion: (a: Action) => void
}) {
  const cardId = inst.cardId ?? undefined
  const meta = cardId ? getCardMeta(cardId) : null
  const imageUrl = useCardImage(cardId, meta?.hasImage, meta?.imageUrl)
  const combate =
    meta?.type === 'Campeón' && 'poder' in meta.stats
      ? `ATQ ${meta.stats.poder} RES ${meta.stats.resistencia}`
      : null
  return (
    <button
      onClick={() => onAccion({ type: 'elegir_objetivo', objetivoId: inst.cardInstanceId })}
      title={meta?.flavorText}
      className="flex items-center gap-2 bg-surface-2 hover:bg-card-border border border-card-border rounded-lg
                 px-2 py-1.5 transition-colors cursor-pointer text-left max-w-[200px]"
    >
      <div
        className="shrink-0 rounded-sm border border-card-border overflow-hidden flex items-center justify-center"
        style={{
          width: 26,
          aspectRatio: '744/1038',
          background: 'linear-gradient(135deg, #14142b 0%, #1e1e3a 60%, #2a2a4e 100%)',
        }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ color: '#4b4b7a', fontFamily: '"Cinzel", serif', fontSize: 8, fontWeight: 700 }}>
            ✦
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-100 truncate">{meta?.name ?? 'Carta'}</p>
        <p className="text-[9px] text-gray-500">
          {meta?.type}
          {meta ? ` · Coste ${meta.stats.cost}` : ''}
          {combate ? ` · ${combate}` : ''}
        </p>
      </div>
    </button>
  )
}

/**
 * Ancho MÍNIMO de las casillas de la grilla: igual al ALTO de una carta
 * vertical (md) para que las cartas en HORIZONTAL (campeones cansados,
 * rotados 90°) se vean del MISMO tamaño que las verticales: una vertical
 * mide ancho×alto (92×128.35) y la misma carta girada 128.35×92.
 */
const ANCHO_CELDA = TAMANOS.md * (1038 / 744)

/** Celda de la grilla: rótulo de zona (1A…) + contenido. Los huecos vacíos muestran el límite (6.1). */
function Celda({ zona, children, glow, glowColor, invertida }: { zona: string; children?: ReactNode; glow?: boolean; glowColor?: 'green' | 'red'; invertida?: boolean }) {
  const glowStyles = glow ? {
    boxShadow: `0 0 12px 4px ${glowColor === 'red' ? 'rgba(239, 68, 68, 0.6)' : 'rgba(74, 222, 128, 0.5)'}`,
    borderRadius: 8,
  } : undefined

  return (
    <div
      className={`flex flex-col items-center gap-0.5 relative ${glow ? 'animate-pulse-ring' : ''}`}
      data-zona={zona}
      style={{ minWidth: ANCHO_CELDA, overflow: 'visible', ...glowStyles }}
    >
      <span
        className="text-[7px] font-mono text-gray-600 uppercase leading-none tracking-wider"
        style={invertida ? { transform: 'rotate(180deg)' } : undefined}
      >
        {zona}
      </span>
      {children ?? (
        <div
          style={{ width: TAMANOS.md, aspectRatio: '744/1038', borderRadius: 6, border: '1px dashed #23233c' }}
          aria-hidden="true"
        />
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
}: {
  vista: GameState
  insts: string[]
  marca?: ReactNode
  onClick?: () => void
  onZoom?: () => void
  invertida?: boolean
}) {
  if (insts.length === 0) return null
  const tope = insts[insts.length - 1]
  const rotStyle = invertida ? { transform: 'rotate(180deg)' } : undefined
  return (
    <MiniCard
      inst={vista.instances[tope]}
      tamano="md"
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
  abrirSelector: (accionBase: Action, objetivoCardId: string, campeonSlot?: number) => void
  /** Abre la carta en grande (CartaZoom) para revisar su efecto. */
  abrirZoom: (inst: CardInstance) => void
  /** Abre el panel inferior con la lista completa de una zona (Éter 2A/1A, Cementerio 2G, Exilio 1G). */
  abrirPanel: (jugador: 'A' | 'B', zona: ZonaPanel) => void
  /** Grilla del rival: se renderiza de cabeza (vista desde el otro lado de la mesa). */
  invertida?: boolean
  seleccion: Seleccion
  /** Animaciones de movimiento (glow en celda destino). */
  animaciones?: Array<{ tipo: string; zona?: string; jugador?: PlayerId; atacantes?: string[]; cardInstanceId?: string; key: number }>
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
  animaciones,
}: GrillaProps) {
  const p = vista.players[jugador]
  const soy = jugador === 'A'

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
          tamano="md"
          onClick={enSeleccion ? undefined : () => abrirPanel(jugador, 'reserva')}
          onZoom={() => abrirZoom(vista.instances[topeId])}
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

  /** Campeón propio 2B-2F con sus acciones (Atacar / Bloquear → selector). */
  const campeonPropio = (slot: number, id: string) => {
    const inst = vista.instances[id]
    const ataque = acciones.find(
      (a) => a.type === 'declarar_ataque' && a.atacanteIds.length === 1 && a.atacanteIds[0] === id,
    )
    const bloquear = acciones.find((a) => a.type === 'bloquear_eter' && a.campeonSlot === slot)
    const rotStyle = invertida ? { transform: 'rotate(180deg)' } : undefined
    return (
      <MiniCard key={id} inst={inst} tamano="md" onZoom={() => abrirZoom(inst)}>
        {leTocaA && (ataque || bloquear) && (
          <div className="flex gap-1 flex-wrap justify-center" style={rotStyle}>
            {ataque && <Boton accion={ataque} onClick={onAccion} />}
            {bloquear && (
              <button
                onClick={() => {
                  const meta = inst.cardId ? getCardMeta(inst.cardId) : null
                  if (meta && bloquear.type === 'bloquear_eter') {
                    abrirSelector(bloquear, meta.id, slot)
                  }
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
    )
  }

  const celdas: ReactNode[] = []

  /* ── Fila 1 ── */
  celdas.push(
    <Celda key="1A" zona="1A" invertida={invertida}>
      <Pila
        vista={vista}
        insts={p.eterPagado}
        onClick={() => abrirPanel(jugador, 'pagado')}
        onZoom={() => abrirZoom(vista.instances[p.eterPagado[p.eterPagado.length - 1]])}
        invertida={invertida}
      />
    </Celda>,
  )
  for (let slot = 0; slot < 5; slot++) {
    const bloqueados = eterBloqueadoDe(slot)
    const zona = `1${String.fromCharCode(66 + slot)}` // 1B…1F
    celdas.push(
      <Celda key={zona} zona={zona} invertida={invertida}>
        {bloqueados.length > 0 ? (
          <MiniCard
            inst={bloqueados[0]}
            tamano="md"
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
    <Celda key="1G" zona="1G" invertida={invertida}>
      <Pila
        vista={vista}
        insts={p.exilio}
        onClick={() => abrirPanel(jugador, 'exilio')}
        onZoom={() => abrirZoom(vista.instances[p.exilio[p.exilio.length - 1]])}
        invertida={invertida}
      />
    </Celda>,
  )

  /* ── Fila 2 ── */
  celdas.push(
    <Celda key="2A" zona="2A" invertida={invertida}>
      {reservaCol()}
    </Celda>,
  )
  for (let slot = 0; slot < 5; slot++) {
    const zona = `2${String.fromCharCode(66 + slot)}` // 2B…2F
    const id = p.campo.campeones[slot]
    const hayGlow = animaciones?.some((a) => a.tipo === 'glow' && a.zona === zona && a.jugador === jugador) ?? false
    const hayAtaque = id !== null && (animaciones?.some((a) => a.tipo === 'attack' && a.atacantes?.includes(id)) ?? false)
    celdas.push(
      <Celda key={zona} zona={zona} glow={hayGlow || hayAtaque} glowColor={hayAtaque ? 'red' : 'green'} invertida={invertida}>
        {id ? (
          <div className="relative">
            {soy && leTocaA ? campeonPropio(slot, id) : <MiniCard inst={vista.instances[id]} tamano="md" onZoom={() => abrirZoom(vista.instances[id])} />}
            <ChampionStatus s={vista} id={id} invertida={invertida} />
            <FocosChampion s={vista} id={id} invertida={invertida} />
          </div>
        ) : undefined}
      </Celda>,
    )
  }
  celdas.push(
    <Celda key="2G" zona="2G" invertida={invertida}>
      <Pila
        vista={vista}
        insts={p.cementerio}
        onClick={() => abrirPanel(jugador, 'cementerio')}
        onZoom={() => abrirZoom(vista.instances[p.cementerio[p.cementerio.length - 1]])}
        invertida={invertida}
      />
    </Celda>,
  )

  /* ── Fila 3 ── */
  for (let slot = 0; slot < 3; slot++) {
    const zona = `3${String.fromCharCode(65 + slot)}` // 3A…3C (Místicas/Tácticas)
    const id = p.campo.misticasTacticas[slot]
    celdas.push(
      <Celda key={zona} zona={zona} invertida={invertida}>
        {id ? (
          <MiniCard inst={vista.instances[id]} tamano="md" onZoom={() => abrirZoom(vista.instances[id])} />
        ) : undefined}
      </Celda>,
    )
  }
  for (let slot = 0; slot < 3; slot++) {
    const zona = `3${String.fromCharCode(68 + slot)}` // 3D…3F (Arcanas/Combate)
    const id = p.campo.arcanasCombate[slot]
    const inst = id ? vista.instances[id] : null
    celdas.push(
      <Celda key={zona} zona={zona} invertida={invertida}>
        {inst ? (
          <MiniCard
            inst={inst}
            tamano="md"
            bocaAbajo={!inst.bocaArriba}
            onClick={
              inst.cardId !== null && (soy || inst.bocaArriba === true)
                ? () => abrirZoom(inst)
                : undefined
            }
          />
        ) : undefined}
      </Celda>,
    )
  }
  celdas.push(
    <Celda key="3G" zona="3G" invertida={invertida}>
      <MiniCard inst={{ cardInstanceId: 'mazo', cardId: null, owner: jugador }} tamano="md" />
      <span
        className="text-[8px] text-gray-500 font-mono -mt-0.5"
        style={invertida ? { transform: 'rotate(180deg)' } : undefined}
      >
        {p.mazo.length}
      </span>
    </Celda>,
  )

  /* ── Fila 4 ── */
  for (let slot = 0; slot < 6; slot++) {
    const zona = `4${String.fromCharCode(65 + slot)}` // 4A…4F (Vínculos)
    const id = p.vinculos[slot]
    const inst = id ? vista.instances[id] : null
    celdas.push(
      <Celda key={zona} zona={zona} invertida={invertida}>
        {inst ? (
          <MiniCard
            inst={inst}
            tamano="md"
            bocaAbajo={!inst.bocaArriba}
            onClick={
              inst.cardId !== null && (soy || inst.bocaArriba === true)
                ? () => abrirZoom(inst)
                : undefined
            }
          />
        ) : undefined}
      </Celda>,
    )
  }
  celdas.push(<Celda key="4G" zona="4G" invertida={invertida} />)

  return (
    <div className="overflow-x-auto pb-1">
      <div
        data-testid={`grilla-${jugador}`}
        className="grid grid-cols-7 gap-1.5 w-max"
        style={invertida ? { transform: 'rotate(180deg)' } : undefined}
      >
        {celdas}
      </div>
    </div>
  )
}

export function Tablero({ vista, acciones, leTocaA, log, onAccion, onAbandonar, animaciones }: TableroProps) {
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
  const abrirZoom = (inst: CardInstance) => setZoom(inst)

  // Abrir interfaz de bloqueo automáticamente cuando es turno del defensor y hay bloqueo pendiente
  useEffect(() => {
    if (vista.fase === 'choque' && vista.combate?.paso === 'bloqueo') {
      const defensor = vista.turno === 'A' ? 'B' : 'A'
      const soyElDefensor = defensor === 'A'
      if (soyElDefensor && !bloqueoAbierto) {
        const sinBloquear = vista.combate.atacantes.filter((a) => !(a in vista.combate!.bloqueos))
        if (sinBloquear.length > 0) setBloqueoAbierto(true)
      }
    }
  }, [vista.fase, vista.combate, bloqueoAbierto])

  const abrirSelector = (accionBase: Action, objetivoCardId: string, campeonSlot?: number) => {
    const meta = getCardMeta(objetivoCardId)
    if (!meta) return
    if (campeonSlot !== undefined) {
      setSeleccion({ tipo: 'bloquear', accionBase, objetivoCardId, campeonSlot })
    } else {
      setSeleccion({ tipo: 'pagar', accionBase, objetivoCardId, coste: meta.stats.cost })
    }
    setElegidos(new Set())
    setSacrificiosElegidos([])
    setPanelAbierto(null)
  }

  /** Sacrificios exigidos por el rol del Campeón objetivo (Soberano 1 / Emperador 2). */
  const requeridos = seleccion?.tipo === 'pagar' ? sacrificiosRequeridos(getCardMeta(seleccion.objetivoCardId)?.roles) : 0
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
      else next.add(instanceId)
      return next
    })
  }

  /** Click en una carta de la mano: sin coste → ejecuta; con coste → selector. */
  const onClickMano = (id: string) => {
    if (!leTocaA) return
    const acc = acciones.find((a) => esDeMano(a) && a.cardInstanceId === id)
    if (!acc) return
    if (acc.type === 'colocar_tactica' || acc.type === 'colocar_combate') {
      onAccion(acc)
      return
    }
    const cardId = vista.instances[id]?.cardId
    if (cardId) abrirSelector(acc, cardId)
  }

  /** ¿Se puede confirmar la selección? Pago: Σ aporte ≥ coste (+ sacrificios del rol). Bloqueo: todos de facción compartida. */
  const puedeConfirmar = useMemo(() => {
    if (!seleccion || elegidos.size === 0) return false
    if (seleccion.tipo === 'bloquear') {
      const campeon = getCardMeta(seleccion.objetivoCardId)
      if (!campeon) return false
      return [...elegidos].every((id) => {
        const meta = getCardMeta(vista.instances[id]?.cardId ?? '')
        return meta !== null && faccionesCompartidas(meta.facciones, campeon.facciones)
      })
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
    const accionBase = seleccion.accionBase
    onAccion({
      ...accionBase,
      eterIds: [...elegidos],
      sacrificios: [...sacrificiosElegidos],
    } as Action)
    setSeleccion(null)
    setElegidos(new Set())
    setSacrificiosElegidos([])
  }

  const cancelar = () => {
    setSeleccion(null)
    setElegidos(new Set())
    setSacrificiosElegidos([])
  }

  // Acciones generales (no van sobre una carta ni son de la mano)
  const generales = acciones.filter((a) => {
    if (a.type === 'rendirse') return false // va en el header
    if (a.type === 'elegir_objetivo') return false // búsqueda de mazo: se lista como opciones (OpcionTutor)
    if (esDeMano(a)) return false // va sobre la carta de la mano
    if (conCarta(a)) return false // va sobre la carta en la pila
    if (a.type === 'declarar_ataque') return a.atacanteIds.length > 1 // individual va en el campeón
    if (a.type === 'bloquear_eter') return false // abre el selector desde el campeón
    if (a.type === 'elegir_ruptura' && a.atacanteId !== null) return false // se resume en un botón aparte
    return true
  })
  /** Búsqueda de mazo (tutor): una acción por carta que cumple el filtro. */
  const tutores = acciones.filter(
    (a): a is Extract<Action, { type: 'elegir_objetivo' }> => a.type === 'elegir_objetivo',
  )
  const ruptura = acciones.find((a) => a.type === 'elegir_ruptura' && a.atacanteId !== null)
  const pila = vista.combate?.cadena?.pila ?? []
  const responderDe = (id: string) => acciones.find((a) => a.type === 'responder_cadena' && a.cardInstanceId === id)

  const faseTurno = terminada
    ? 'Partida terminada'
    : fase === 'pre_partida'
      ? vista.turno === 'A'
        ? 'Vos decidís el mulligan'
        : 'El rival decide el mulligan'
      : `${FASE_LABEL[fase] ?? fase} — ${vista.turno === 'A' ? 'tu turno' : 'turno del rival'}`

  const objetivoSeleccion = seleccion
    ? seleccion.tipo === 'pagar' && 'cardInstanceId' in seleccion.accionBase
      ? vista.instances[seleccion.accionBase.cardInstanceId]
      : seleccion.tipo === 'bloquear' && seleccion.campeonSlot !== undefined
        ? vista.players.A.campo.campeones[seleccion.campeonSlot]
          ? vista.instances[vista.players.A.campo.campeones[seleccion.campeonSlot]!]
          : null
        : null
    : null

  return (
    <div className="min-h-screen bg-[#0d0d14] text-gray-100 font-body pb-10 relative">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="border-b border-card-border bg-surface sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-display font-bold tracking-wider leading-none">Éter Online</h1>
            <p className="text-[10px] text-gray-500 mt-0.5">{faseTurno}</p>
          </div>
          <div className="flex gap-2 ml-auto">
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
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 mt-2 flex flex-col xl:flex-row gap-4 items-start">
        {/* ── Tableros (Columna Izquierda) ────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <section className="bg-surface border border-card-border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <p className="text-xs text-gray-400">Rival (B)</p>
              <span className="text-[10px] text-gray-600 font-mono">
                mazo {rival.mazo.length} · ce {rival.cementerio.length} · ex {rival.exilio.length}
              </span>
              <span className="ml-auto text-[10px] text-gray-600 font-mono">
                mano {rival.mano.length}
              </span>
            </div>
            {/* Mano rival: fuera de la grilla, boca abajo */}
            <div className="flex gap-1">
              {rival.mano.map((id) => (
                <MiniCard key={id} inst={vista.instances[id]} tamano="xs" />
              ))}
            </div>
            <GrillaJugador
              vista={vista}
              jugador="B"
              leTocaA={false}
              acciones={[]}
              onAccion={onAccion}
              abrirSelector={abrirSelector}
              abrirZoom={abrirZoom}
              abrirPanel={(j, z) => setPanelAbierto({ jugador: j, zona: z })}
              invertida
              seleccion={null}
              animaciones={animaciones}
            />
          </section>

          <section className="bg-surface border border-card-border rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-ether-400" />
              <p className="text-xs text-gray-400">Tú (A)</p>
              <span className="text-[10px] text-gray-600 font-mono">
                mazo {yo.mazo.length} · ce {yo.cementerio.length} · ex {yo.exilio.length}
              </span>
              <span className="ml-auto text-[10px] text-gray-600 font-mono">
                reserva {yo.eterReserva.length} · pagado {yo.eterPagado.length}
              </span>
            </div>
            <GrillaJugador
              vista={vista}
              jugador="A"
              leTocaA={leTocaA}
              acciones={acciones}
              onAccion={onAccion}
              abrirSelector={abrirSelector}
              abrirZoom={abrirZoom}
              abrirPanel={(j, z) => setPanelAbierto({ jugador: j, zona: z })}
              seleccion={seleccion}
              animaciones={animaciones}
            />
          </section>
        </div>

        {/* ── Panel Lateral (Columna Derecha) ────────────────────────────── */}
        <div className="w-full xl:w-[340px] flex flex-col gap-3 shrink-0">
          <section className="grid grid-cols-1 gap-3">
            <div className="bg-surface border border-card-border rounded-lg p-2 min-h-[72px]">
              <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-1.5">
                Cadena 9.6 {pila.length > 0 ? `(${pila.length})` : ''}
              </p>
              {pila.length === 0 ? (
                <p className="text-[11px] text-gray-600 italic">Sin cadena abierta.</p>
              ) : (
                <div className="flex gap-1.5 flex-wrap items-start">
                  {pila.map((id) => (
                    <MiniCard
                      key={id}
                      inst={vista.instances[id]}
                      tamano="sm"
                      onZoom={() => abrirZoom(vista.instances[id])}
                    >
                      {leTocaA && responderDe(id) && <Boton accion={responderDe(id)!} onClick={onAccion} />}
                    </MiniCard>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-surface border border-card-border rounded-lg p-2 max-h-48 overflow-y-auto">
              <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-1.5">Bitácora</p>
              {log.length === 0 ? (
                <p className="text-[11px] text-gray-600 italic">La partida aún no empieza.</p>
              ) : (
                <ul className="space-y-0.5">
                  {log.map((linea, i) => (
                    <li key={i} className="text-[11px] text-gray-300 leading-snug">
                      {linea}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="bg-surface border border-card-border rounded-lg p-3 space-y-2">
            {/* ── Tu mano (fuera de la grilla) ─────────────────────── */}
            <div>
              <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-1.5">
                Tu mano ({yo.mano.length}){leTocaA ? ' — click en una carta para verla, juega desde el botón' : ''}
              </p>
              <div className="flex gap-2 flex-wrap items-start">
                {yo.mano.map((id) => {
                  const acc = acciones.find((a) => esDeMano(a) && a.cardInstanceId === id)
                  const jugable = leTocaA && !!acc
                  return (
                    <MiniCard
                      key={id}
                      inst={vista.instances[id]}
                      tamano="md"
                      onClick={() => abrirZoom(vista.instances[id])}
                    >
                      {jugable && (
                        <button
                          onClick={() => onClickMano(id)}
                          className="text-[10px] bg-ether-600/30 hover:bg-ether-600/50 text-ether-200 px-1.5 py-0.5 rounded transition-colors cursor-pointer whitespace-nowrap"
                        >
                          {acc!.type === 'colocar_tactica' || acc!.type === 'colocar_combate' ? 'Jugar' : 'Pagar'}
                        </button>
                      )}
                    </MiniCard>
                  )
                })}
              </div>
            </div>

            {/* ── Acciones generales ───────────────────────────────── */}
            {leTocaA && (generales.length > 0 || ruptura) && (
              <div className="flex gap-1.5 flex-wrap items-center pt-2 border-t border-card-border/50">
                <p className="text-[9px] uppercase tracking-wider text-gray-500 mr-1">Acciones</p>
                {generales.map((a, i) => (
                  <Boton key={i} accion={a} onClick={onAccion} fase={fase} />
                ))}
                {ruptura && <Boton accion={ruptura} onClick={onAccion} fase={fase} />}
              </div>
            )}

            {/* ── Búsqueda de mazo (tutor): opciones con nombre y arte ── */}
            {leTocaA && tutores.length > 0 && (
              <div className="mt-2 border border-ether-600/40 rounded-lg p-2 bg-ether-600/10">
                <p className="text-[9px] uppercase tracking-wider text-ether-300 mb-1.5">
                  Búsqueda de mazo — elige una carta
                </p>
                <div className="flex gap-2 flex-wrap">
                  {tutores.map((a) => {
                    const inst = vista.instances[a.objetivoId]
                    return inst ? <OpcionTutor key={a.objetivoId} inst={inst} onAccion={onAccion} /> : null
                  })}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* ── Selector de Éter ────────────────────────────────────── */}
      {seleccion && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-[#0d0d14]/95 border-t border-card-border p-4 shadow-2xl">
          <div className="max-w-7xl mx-auto flex gap-6 items-start flex-wrap">
            {/* Carta objetivo */}
            <div className="flex flex-col items-center gap-1">
              {objetivoSeleccion && (
                <MiniCard
                  inst={objetivoSeleccion}
                  tamano="sm"
                  onZoom={() => abrirZoom(objetivoSeleccion)}
                />
              )}
              <p className="text-[10px] text-gray-400">
                {seleccion.tipo === 'pagar'
                  ? `Coste: ${seleccion.coste}`
                  : `Campeón — ${getCardMeta(seleccion.objetivoCardId)?.name ?? ''}`}
              </p>
            </div>

            <div className="flex-1 min-w-[280px]">
              <p className="text-sm text-gray-200 mb-2">
                {seleccion.tipo === 'pagar'
                  ? 'Elegí los Éteres de tu Reserva (2A) para pagar:'
                  : 'Elegí los Éteres a bloquear (solo facción compartida):'}
              </p>
              {yo.eterReserva.length === 0 ? (
                <p className="text-xs text-gray-500 italic">Tu Reserva está vacía.</p>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  {yo.eterReserva.map((id) => {
                    const inst = vista.instances[id]
                    const cardId = inst?.cardId ?? ''
                    const meta = getCardMeta(cardId)
                    const elegido = elegidos.has(id)
                    const bloqueable =
                      seleccion.tipo === 'bloquear' &&
                      meta !== null &&
                      faccionesCompartidas(meta.facciones, getCardMeta(seleccion.objetivoCardId)?.facciones)
                    const aporte = seleccion.tipo === 'pagar' && meta ? aporteDe(meta.id, seleccion.objetivoCardId) : null
                    const inhabil =
                      seleccion.tipo === 'bloquear' && !bloqueable
                    return (
                      <button
                        key={id}
                        onClick={() => !inhabil && toggleEter(id)}
                        disabled={inhabil}
                        className="flex flex-col items-center gap-0.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 bg-transparent border-none p-0"
                        title={meta?.name}
                      >
                        <MiniCard inst={inst} tamano="sm" seleccionada={elegido} />
                        <span className="text-[9px] font-mono text-gray-400">
                          {aporte !== null ? `aporte ${aporte}` : bloqueable ? 'bloqueable' : 'no comparte'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Sacrificio exigido por el rol (Soberano 1 / Emperador 2) */}
              {seleccion.tipo === 'pagar' && requeridos > 0 && (
                <div className="mt-3 border-t border-card-border/50 pt-3">
                  <p className="text-sm text-gray-200 mb-2">
                    Elegí {requeridos} Campeón{requeridos > 1 ? 'es' : ''} de tu campo para sacrificar:
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {sacrificables.map((id) => {
                      const inst = vista.instances[id]
                      const meta = getCardMeta(inst?.cardId ?? '')
                      const elegido = sacrificiosElegidos.includes(id)
                      const lleno = sacrificiosElegidos.length >= requeridos
                      return (
                        <button
                          key={id}
                          onClick={() => toggleSacrificio(id)}
                          disabled={!elegido && lleno}
                          title={meta?.name}
                          className="flex flex-col items-center gap-0.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 bg-transparent border-none p-0"
                        >
                          <MiniCard inst={inst} tamano="sm" seleccionada={elegido} />
                          <span className="text-[9px] font-mono text-gray-400">{meta?.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center gap-4 flex-wrap">
                {seleccion.tipo === 'pagar' && (
                  <p className="text-xs font-mono text-gray-300">
                    Aportado: <span className={totalAportado >= seleccion.coste ? 'text-ether-300 font-bold' : 'text-red-400'}>
                      {totalAportado}
                    </span>{' '}
                    / {seleccion.coste}
                  </p>
                )}
                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={cancelar}
                    className="text-xs bg-surface-2 hover:bg-card-border text-gray-300 px-4 py-2 rounded transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmar}
                    disabled={!puedeConfirmar}
                    className="text-xs bg-ether-600 hover:bg-ether-500 text-white px-4 py-2 rounded transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {seleccion.tipo === 'pagar' ? 'Pagar y jugar' : 'Bloquear'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Panel inferior: lista completa de una zona (2A Reserva / 1A Pagado / 2G Cementerio / 1G Exilio) ── */}
      {panelAbierto && (() => {
        const pj = vista.players[panelAbierto.jugador]
        const insts =
          panelAbierto.zona === 'reserva'
            ? pj.eterReserva
            : panelAbierto.zona === 'pagado'
              ? pj.eterPagado
              : panelAbierto.zona === 'cementerio'
                ? pj.cementerio
                : pj.exilio
        const titulo =
          panelAbierto.zona === 'reserva'
            ? 'Reserva de Éter'
            : panelAbierto.zona === 'pagado'
              ? 'Éteres pagados'
              : panelAbierto.zona === 'cementerio'
                ? 'Cementerio'
                : 'Exilio'
        const posesivo =
          panelAbierto.jugador === 'A'
            ? panelAbierto.zona === 'pagado'
              ? 'tuyos'
              : 'tuyo'
            : panelAbierto.zona === 'reserva'
              ? 'tu rival'
              : 'del rival'
        return (
          <div className="fixed inset-x-0 bottom-0 z-40 bg-[#0d0d14]/95 border-t border-card-border p-4 shadow-2xl">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <p className="text-sm text-gray-200">
                  {titulo}
                  <span className="text-gray-500"> — {posesivo}</span> ({insts.length})
                </p>
                <p className="text-[10px] text-gray-500">Clic en una carta para verla en grande.</p>
                <button
                  onClick={() => setPanelAbierto(null)}
                  className="ml-auto text-xs bg-surface-2 hover:bg-card-border text-gray-300 px-3 py-1.5 rounded transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
              {insts.length === 0 ? (
                <p className="text-xs text-gray-500 italic">Esta zona está vacía.</p>
              ) : (
                <div className="flex gap-2 flex-wrap items-start">
                  {insts.map((id) => {
                    const inst = vista.instances[id]
                    const nombre = inst.cardId ? (getCardMeta(inst.cardId)?.name ?? '') : ''
                    return (
                      <div key={id} className="flex flex-col items-center gap-0.5">
                        <MiniCard inst={inst} tamano="sm" onZoom={() => abrirZoom(inst)} />
                        <span className="text-[9px] text-gray-500 max-w-[64px] truncate">{nombre}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
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

      {/* ── Overlay de fin ──────────────────────────────────────── */}
      {terminada && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
          <div className="bg-surface border border-card-border rounded-xl p-8 text-center max-w-md mx-4">
            <p className="font-display text-2xl font-bold mb-2">
              {vista.ganador === 'A' ? '¡Ganaste!' : 'Perdiste'}
            </p>
            <p className="text-sm text-gray-400 mb-1">Ganador: {vista.ganador}</p>
            <p className="text-xs text-gray-500 mb-6">Motivo: {vista.motivo}</p>
            <button
              onClick={onAbandonar}
              className="bg-ether-600 hover:bg-ether-500 text-white px-5 py-2 rounded-lg text-sm transition-colors cursor-pointer"
            >
              Volver al menú
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
