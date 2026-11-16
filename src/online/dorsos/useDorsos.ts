import { useEffect, useMemo, useState } from 'react'
import type { PlayerId } from '../game'
import type { DorsosPorAsiento } from './contexto'
import { dorsosDePartida, guardarDorsoLocal, leerDorsoLocal, leerDorsoPerfil } from './dorsoApi'
import { DORSO_INICIAL, resolverDorsoBot } from './dorsos'
import type { DorsoBotElegido, DorsoId } from './dorsos'

/**
 * Mi reverso: la copia local al instante y, si hay perfil en Supabase, lo que diga el perfil (puede venir de otro dispositivo).
 */
export function useDorsoPropio(): DorsoId {
  const [dorso, setDorso] = useState<DorsoId>(() => leerDorsoLocal())
  useEffect(() => {
    let vivo = true
    void leerDorsoPerfil().then((d) => {
      if (!vivo || d === null) return
      setDorso(d)
      guardarDorsoLocal(d)
    })
    return () => {
      vivo = false
    }
  }, [])
  return dorso
}

/**
 * Reversos de una partida contra el bot: el humano (asiento A) lleva el suyo y el bot el que se eligió en el menú
 * («auto»: uno distinto al tuyo según la semilla).
 */
export function useDorsosContraBot(eleccionBot: DorsoBotElegido = 'auto', semilla = 0): DorsosPorAsiento {
  const propio = useDorsoPropio()
  const bot = resolverDorsoBot(eleccionBot, propio, semilla)
  // Memoizado: es el valor de un contexto, un objeto nuevo en cada render re-pintaría todas las cartas
  return useMemo(() => ({ A: propio, B: bot }), [propio, bot])
}

/**
 * Reversos de una partida online: el asiento propio se pinta ya con mi copia local y el del rival llega de Supabase
 * (`dorsos_de_partida`); mientras llega, o si falla, el rival usa el inicial.
 */
export function useDorsosDePartida(gameId: string, yo: PlayerId): DorsosPorAsiento {
  const propio = useDorsoPropio()
  const [servidor, setServidor] = useState<DorsosPorAsiento | null>(null)
  useEffect(() => {
    let vivo = true
    setServidor(null)
    void dorsosDePartida(gameId).then((d) => {
      if (vivo) setServidor(d)
    })
    return () => {
      vivo = false
    }
  }, [gameId])
  const rival: PlayerId = yo === 'A' ? 'B' : 'A'
  const dorsoRival = servidor?.[rival] ?? DORSO_INICIAL
  return useMemo(() => ({ [yo]: propio, [rival]: dorsoRival }) as DorsosPorAsiento, [yo, rival, propio, dorsoRival])
}
