import { useEffect, useMemo, useState } from 'react'
import { useCardStore } from '../forge/store/useCardStore'
import { ALL_CARDS } from '../shared/data/paquetes'
import { registrarCartas, visibleState } from './game'
import type { Dificultad } from './game/bot'
import { MAZOS, mazoParaBot } from './mazos'
import { MenuPartida } from './MenuPartida'
import type { MazoSeleccionado } from './MenuPartida'
import { useMazosStore, type MazoPersonalizado } from './useMazosStore'
import { usePartida, type PartidaConfig } from './usePartida'
import { Tablero } from './components/Tablero'
import { MazoEditor } from './components/MazoEditor'
import { EffectPreviewModal } from './components/EffectPreviewModal'

/**
 * Éter Online — modo vs bot (local).
 * Menú: elegir mazo (set preestablecido o personalizado armado en el editor) y
 * seed (reproducibilidad). Los sets juegan SIEMPRE con los diseños originales
 * (efectos keyed por cardId); la colección local de la forja alimenta el
 * editor del mazo personalizado. Cartas custom con id nuevo se registran en
 * el motor vía registrarCartas y resuelven sus efectos[] data-driven.
 * Partida: el humano es SIEMPRE el jugador A; el bot (B) juega solo.
 */
export default function OnlineApp() {
  const [enPartida, setEnPartida] = useState(false)
  const [enEditor, setEnEditor] = useState(false)
  const [mazoHumano, setMazoHumano] = useState<MazoSeleccionado>({ tipo: 'set', id: 'estasis' })
  const [mazoEditando, setMazoEditando] = useState<MazoPersonalizado | undefined>(undefined)
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 100_000))
  const [dificultad, setDificultad] = useState<Dificultad>('medio')
  const coleccion = useCardStore((s) => s.cards)
  const mazosPersonalizados = useMazosStore((s) => s.mazosPersonalizados)

  // El catálogo del motor debe resolver las cartas custom ANTES de la partida.
  // Solo las custom con id FUERA de ALL_CARDS se registran: los sets quedan
  // puros (un rediseño con id de diseño no debe contaminar el set original).
  useEffect(() => {
    const idsDiseno = new Set(ALL_CARDS.map((c) => c.id))
    registrarCartas(coleccion.filter((c) => !idsDiseno.has(c.id)))
  }, [coleccion])

  const mazoCustomElegido: MazoPersonalizado | undefined =
    mazoHumano.tipo === 'custom'
      ? mazosPersonalizados.find((m) => m.id === mazoHumano.id)
      : undefined

  const empezar = () => setEnPartida(true)
  const salir = () => {
    setEnPartida(false)
    setSeed(Math.floor(Math.random() * 100_000))
  }

  if (enEditor) {
    return (
      <MazoEditor
        inicial={mazoEditando}
        onGuardar={(mazo) => {
          if (mazoEditando) {
            useMazosStore.getState().actualizarMazo(mazoEditando.id, mazo.cardIds)
            useMazosStore.getState().renombrarMazo(mazoEditando.id, mazo.nombre)
          } else {
            useMazosStore.getState().agregarMazo(mazo)
          }
          setMazoEditando(undefined)
          setEnEditor(false)
        }}
        onCancelar={() => {
          setMazoEditando(undefined)
          setEnEditor(false)
        }}
      />
    )
  }

  if (!enPartida) {
    return (
      <MenuPartida
        mazoHumano={mazoHumano}
        onMazo={setMazoHumano}
        mazosPersonalizados={mazosPersonalizados}
        onNuevoMazo={() => {
          setMazoEditando(undefined)
          setEnEditor(true)
        }}
        onEditarMazo={(m) => {
          setMazoEditando(m)
          setEnEditor(true)
        }}
        seed={seed}
        onSeed={setSeed}
        dificultad={dificultad}
        onDificultad={setDificultad}
        onEmpezar={empezar}
      />
    )
  }

  const deckA =
    mazoCustomElegido?.cardIds ??
    MAZOS.find((m) => m.id === mazoHumano.id)?.cardIds ??
    MAZOS[0].cardIds
  const setHumano = mazoHumano.tipo === 'custom' ? 'custom' : mazoHumano.id
  const deckB = mazoParaBot(seed, setHumano).cardIds
  const config: PartidaConfig = { deckA, deckB, seed, delayMs: 350, dificultad }
  const keyPartida = `${mazoHumano.tipo}:${mazoHumano.id}-${seed}-${mazoCustomElegido?.cardIds.length ?? 0}`
  return (
    <Partida key={keyPartida} config={config} onAbandonar={salir} />
  )
}

function Partida({ config, onAbandonar }: { config: PartidaConfig; onAbandonar: () => void }) {
  const partida = usePartida(config)
  const vista = useMemo(() => visibleState(partida.estado, 'A'), [partida.estado])
  const previewInst = partida.preview
    ? partida.estado.instances[partida.preview.cardInstanceId]
    : undefined
  return (
    <>
      <Tablero
        vista={vista}
        acciones={partida.acciones}
        leTocaA={partida.leTocaA}
        log={partida.log}
        logDetallado={partida.logDetallado}
        onAccion={partida.ejecutar}
        onAbandonar={onAbandonar}
        animaciones={partida.animaciones}
        vistaPrevia={partida.vistaPrevia}
        onCiclarVistaPrevia={partida.ciclarVistaPrevia}
      />
      {partida.preview && (
        <EffectPreviewModal
          preview={partida.preview}
          instancia={previewInst}
          onAceptar={partida.aceptarPreview}
          onCancelar={partida.cancelarPreview}
        />
      )}
    </>
  )
}
