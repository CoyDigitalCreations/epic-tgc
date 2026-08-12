import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { aporteDe, faccionesCompartidas, getCardMeta } from '../game'
import type { Action, CardInstance, GameState } from '../game'
import { MiniCard } from './MiniCard'

interface TableroProps {
  /** Proyección 6.2 del estado para el jugador A (cartas ocultas con cardId null). */
  vista: GameState
  /** Acciones válidas del humano (getValidActions(estado, 'A') cuando le toca). */
  acciones: Action[]
  leTocaA: boolean
  log: string[]
  onAccion: (a: Action) => void
  onAbandonar: () => void
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

function labelAccion(a: Action): string {
  switch (a.type) {
    case 'mulligan': return 'Hacer mulligan'
    case 'pasar_mulligan': return 'Pasar mulligan'
    case 'pasar_turno': return 'Pasar turno'
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

function Boton({ accion, onClick }: { accion: Action; onClick: (a: Action) => void }) {
  return (
    <button
      onClick={() => onClick(accion)}
      className="text-[10px] bg-ether-600/30 hover:bg-ether-600/50 text-ether-200 px-1.5 py-0.5 rounded 
                 transition-colors cursor-pointer whitespace-nowrap"
    >
      {labelAccion(accion)}
    </button>
  )
}

const ANCHO_CELDA = 92

/** Celda de la grilla: rótulo de zona (1A…) + contenido. Los huecos vacíos muestran el límite (6.1). */
function Celda({ zona, children }: { zona: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-0.5" data-zona={zona}>
      <span className="text-[7px] font-mono text-gray-600 uppercase leading-none tracking-wider">{zona}</span>
      {children ?? (
        <div
          style={{ width: ANCHO_CELDA, aspectRatio: '744/1038', borderRadius: 6, border: '1px dashed #23233c' }}
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
}: {
  vista: GameState
  insts: string[]
  marca?: ReactNode
  onClick?: () => void
}) {
  if (insts.length === 0) return null
  const tope = insts[insts.length - 1]
  return (
    <MiniCard
      inst={vista.instances[tope]}
      tamano="md"
      onClick={onClick}
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
  /** Click en un Éter de la Reserva (2A) con el selector abierto. */
  toggleEter: (instanceId: string) => void
  seleccion: Seleccion
  elegidos: Set<string>
}

/** Grilla 4×7 de un jugador, fiel a la vista desde arriba del manual. */
function GrillaJugador({
  vista,
  jugador,
  leTocaA,
  acciones,
  onAccion,
  abrirSelector,
  toggleEter,
  seleccion,
  elegidos,
}: GrillaProps) {
  const p = vista.players[jugador]
  const soy = jugador === 'A'

  /** Campeón del slot 2B-2F (slots 0-4) y sus Éteres bloqueados (1B-1F). */
  const campeonSlot = (slot: number) => {
    const id = p.campo.campeones[slot]
    return id ? vista.instances[id] : null
  }
  const eterBloqueadoDe = (slot: number): CardInstance[] =>
    (campeonSlot(slot)?.eterBloqueado ?? []).map((id) => vista.instances[id])

  /** Éter de la Reserva: clickeable solo con selector abierto (modo pago/bloqueo). */
  const eterReserva = (instanceId: string) => {
    const inst = vista.instances[instanceId]
    const enSeleccion = seleccion !== null && soy && leTocaA
    const elegido = elegidos.has(instanceId)
    const eterCardId = inst.cardId
    let aporte: number | null = null
    if (enSeleccion && seleccion && seleccion.tipo === 'pagar' && eterCardId) {
      aporte = aporteDe(eterCardId, seleccion.objetivoCardId)
    }
    return (
      <MiniCard
        key={instanceId}
        inst={inst}
        tamano="md"
        seleccionada={elegido}
        onClick={enSeleccion ? () => toggleEter(instanceId) : undefined}
        marca={
          aporte !== null ? (
            <span
              style={{
                position: 'absolute',
                top: 2,
                right: 3,
                background: aporte >= 2 ? '#065f46' : '#7c2d12',
                color: '#fff',
                fontSize: 8,
                fontWeight: 700,
                padding: '1px 4px',
                borderRadius: 4,
                pointerEvents: 'none',
              }}
            >
              {aporte}
            </span>
          ) : undefined
        }
        title={undefined}
      />
    )
  }

  /** Reserva 2A: hasta 3 Éteres visibles + contador (15 al inicio). */
  const reservaCol = (): ReactNode => {
    const visibles = p.eterReserva.slice(0, 3)
    const extra = p.eterReserva.length - visibles.length
    return (
      <div className="flex flex-col gap-1 items-center">
        {visibles.map((id) => eterReserva(id))}
        {extra > 0 && (
          <span className="text-[8px] text-gray-500 font-mono">+{extra}</span>
        )}
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
    return (
      <MiniCard key={id} inst={inst} tamano="md">
        {leTocaA && (ataque || bloquear) && (
          <div className="flex gap-1 flex-wrap justify-center">
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
    <Celda key="1A" zona="1A">
      <Pila vista={vista} insts={p.eterPagado} />
    </Celda>,
  )
  for (let slot = 0; slot < 5; slot++) {
    const bloqueados = eterBloqueadoDe(slot)
    const zona = `1${String.fromCharCode(66 + slot)}` // 1B…1F
    celdas.push(
      <Celda key={zona} zona={zona}>
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
    <Celda key="1G" zona="1G">
      <Pila vista={vista} insts={p.exilio} />
    </Celda>,
  )

  /* ── Fila 2 ── */
  celdas.push(
    <Celda key="2A" zona="2A">
      {reservaCol()}
    </Celda>,
  )
  for (let slot = 0; slot < 5; slot++) {
    const zona = `2${String.fromCharCode(66 + slot)}` // 2B…2F
    const id = p.campo.campeones[slot]
    celdas.push(
      <Celda key={zona} zona={zona}>
        {id ? (soy && leTocaA ? campeonPropio(slot, id) : <MiniCard inst={vista.instances[id]} tamano="md" />) : undefined}
      </Celda>,
    )
  }
  celdas.push(
    <Celda key="2G" zona="2G">
      <Pila vista={vista} insts={p.cementerio} />
    </Celda>,
  )

  /* ── Fila 3 ── */
  for (let slot = 0; slot < 3; slot++) {
    const zona = `3${String.fromCharCode(65 + slot)}` // 3A…3C (Místicas/Tácticas)
    const id = p.campo.misticasTacticas[slot]
    celdas.push(
      <Celda key={zona} zona={zona}>
        {id ? <MiniCard inst={vista.instances[id]} tamano="md" /> : undefined}
      </Celda>,
    )
  }
  for (let slot = 0; slot < 3; slot++) {
    const zona = `3${String.fromCharCode(68 + slot)}` // 3D…3F (Arcanas/Combate)
    const id = p.campo.arcanasCombate[slot]
    celdas.push(
      <Celda key={zona} zona={zona}>
        {id ? <MiniCard inst={vista.instances[id]} tamano="md" /> : undefined}
      </Celda>,
    )
  }
  celdas.push(
    <Celda key="3G" zona="3G">
      <MiniCard inst={{ cardInstanceId: 'mazo', cardId: null, owner: jugador }} tamano="md" />
      <span className="text-[8px] text-gray-500 font-mono -mt-0.5">{p.mazo.length}</span>
    </Celda>,
  )

  /* ── Fila 4 ── */
  for (let slot = 0; slot < 6; slot++) {
    const zona = `4${String.fromCharCode(65 + slot)}` // 4A…4F (Vínculos)
    const id = p.vinculos[slot]
    celdas.push(
      <Celda key={zona} zona={zona}>
        {id ? <MiniCard inst={vista.instances[id]} tamano="md" /> : undefined}
      </Celda>,
    )
  }
  celdas.push(<Celda key="4G" zona="4G" />)

  return (
    <div className="overflow-x-auto pb-1">
      <div className="grid grid-cols-7 gap-1.5 w-max">{celdas}</div>
    </div>
  )
}

export function Tablero({ vista, acciones, leTocaA, log, onAccion, onAbandonar }: TableroProps) {
  const yo = vista.players.A
  const rival = vista.players.B
  const fase = vista.fase
  const terminada = fase === 'terminada'

  const [seleccion, setSeleccion] = useState<Seleccion>(null)
  const [elegidos, setElegidos] = useState<Set<string>>(new Set())

  const abrirSelector = (accionBase: Action, objetivoCardId: string, campeonSlot?: number) => {
    const meta = getCardMeta(objetivoCardId)
    if (!meta) return
    if (campeonSlot !== undefined) {
      setSeleccion({ tipo: 'bloquear', accionBase, objetivoCardId, campeonSlot })
    } else {
      setSeleccion({ tipo: 'pagar', accionBase, objetivoCardId, coste: meta.stats.cost })
    }
    setElegidos(new Set())
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

  /** ¿Se puede confirmar la selección? Pago: Σ aporte ≥ coste×2. Bloqueo: todos de facción compartida. */
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
    return total >= seleccion.coste * 2
  }, [seleccion, elegidos, vista])

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
    onAccion({ ...accionBase, eterIds: [...elegidos] } as Action)
    setSeleccion(null)
    setElegidos(new Set())
  }

  const cancelar = () => {
    setSeleccion(null)
    setElegidos(new Set())
  }

  // Acciones generales (no van sobre una carta ni son de la mano)
  const generales = acciones.filter((a) => {
    if (a.type === 'rendirse') return false // va en el header
    if (esDeMano(a)) return false // va sobre la carta de la mano
    if (conCarta(a)) return false // va sobre la carta en la pila
    if (a.type === 'declarar_ataque') return a.atacanteIds.length > 1 // individual va en el campeón
    if (a.type === 'bloquear_eter') return false // abre el selector desde el campeón
    if (a.type === 'elegir_ruptura' && a.atacanteId !== null) return false // se resume en un botón aparte
    return true
  })
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

      <main className="max-w-7xl mx-auto px-4 mt-4 space-y-4">
        {/* ── Tablero rival (arriba) ────────────────────────────── */}
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
            toggleEter={toggleEter}
            seleccion={null}
            elegidos={elegidos}
          />
        </section>

        {/* ── Centro: cadena + log ──────────────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-surface border border-card-border rounded-lg p-2 min-h-[72px]">
            <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-1.5">
              Cadena 9.6 {pila.length > 0 ? `(${pila.length})` : ''}
            </p>
            {pila.length === 0 ? (
              <p className="text-[11px] text-gray-600 italic">Sin cadena abierta.</p>
            ) : (
              <div className="flex gap-1.5 flex-wrap items-start">
                {pila.map((id) => (
                  <MiniCard key={id} inst={vista.instances[id]} tamano="sm">
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

        {/* ── Tablero propio (abajo) ────────────────────────────── */}
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
            toggleEter={toggleEter}
            seleccion={seleccion}
            elegidos={elegidos}
          />

          {/* ── Tu mano (fuera de la grilla) ─────────────────────── */}
          <div className="pt-2 border-t border-card-border/50">
            <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-1.5">
              Tu mano ({yo.mano.length}){leTocaA ? ' — click en una carta para jugarla' : ''}
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
                    onClick={jugable ? () => onClickMano(id) : undefined}
                    marca={
                      jugable ? (
                        <span
                          style={{
                            position: 'absolute',
                            top: 2,
                            left: 3,
                            background: 'rgba(34,211,238,0.85)',
                            color: '#062a35',
                            fontSize: 8,
                            fontWeight: 700,
                            padding: '1px 4px',
                            borderRadius: 4,
                            pointerEvents: 'none',
                          }}
                        >
                          {acc!.type === 'colocar_tactica' || acc!.type === 'colocar_combate' ? 'Jugar' : 'Pagar'}
                        </span>
                      ) : undefined
                    }
                  />
                )
              })}
            </div>
          </div>

          {/* ── Acciones generales ───────────────────────────────── */}
          {leTocaA && (generales.length > 0 || ruptura) && (
            <div className="flex gap-1.5 flex-wrap items-center pt-1">
              <p className="text-[9px] uppercase tracking-wider text-gray-500 mr-1">Acciones</p>
              {generales.map((a, i) => (
                <Boton key={i} accion={a} onClick={onAccion} />
              ))}
              {ruptura && <Boton accion={ruptura} onClick={onAccion} />}
            </div>
          )}
        </section>
      </main>

      {/* ── Selector de Éter ────────────────────────────────────── */}
      {seleccion && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-[#0d0d14]/95 border-t border-card-border p-4 shadow-2xl">
          <div className="max-w-7xl mx-auto flex gap-6 items-start flex-wrap">
            {/* Carta objetivo */}
            <div className="flex flex-col items-center gap-1">
              {objetivoSeleccion && (
                <MiniCard inst={objetivoSeleccion} tamano="sm" />
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

              <div className="mt-3 flex items-center gap-4 flex-wrap">
                {seleccion.tipo === 'pagar' && (
                  <p className="text-xs font-mono text-gray-300">
                    Aportado: <span className={totalAportado >= seleccion.coste * 2 ? 'text-ether-300 font-bold' : 'text-red-400'}>
                      {totalAportado}
                    </span>{' '}
                    / {seleccion.coste * 2}
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
