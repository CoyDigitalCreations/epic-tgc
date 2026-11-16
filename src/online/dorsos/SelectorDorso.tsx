import { useEffect, useState } from 'react'
import { Seccion } from '../../shared/ui/Seccion'
import { supabaseConfigurado } from '../backend/supabase'
import { DorsoCarta } from './DorsoCarta'
import { guardarDorso, guardarDorsoLocal, leerDorsoLocal, leerDorsoPerfil } from './dorsoApi'
import { DORSOS } from './dorsos'
import type { DorsoId } from './dorsos'

/**
 * Elegir el reverso de las cartas entre los 5 patrones. Tu rival verá TUS cartas ocultas (su mano, tus Vínculos) con este reverso.
 * Se guarda al instante en este navegador y, con Supabase, en tu perfil.
 */
export function SelectorDorso() {
  const [elegido, setElegido] = useState<DorsoId>(() => leerDorsoLocal())
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)

  useEffect(() => {
    let vivo = true
    // Lo del perfil manda sobre la copia local (puede haberse elegido desde otro dispositivo)
    void leerDorsoPerfil().then((d) => {
      if (!vivo || d === null) return
      setElegido(d)
      guardarDorsoLocal(d)
    })
    return () => {
      vivo = false
    }
  }, [])

  async function elegir(id: DorsoId) {
    if (id === elegido) return
    setElegido(id)
    setMensaje(null)
    try {
      await guardarDorso(id)
      setMensaje({
        tipo: 'ok',
        texto: supabaseConfigurado() ? 'Reverso guardado. Tu rival lo verá en tus cartas.' : 'Reverso guardado en este navegador.',
      })
    } catch (e) {
      const motivo = e instanceof Error ? e.message : String(e)
      setMensaje({ tipo: 'error', texto: `Se guardó en este navegador, pero no en tu perfil (${motivo}). Tu rival no lo verá.` })
    }
  }

  return (
    <section aria-label="Reverso de las cartas" className="space-y-4">
      <Seccion>Reverso de tus cartas</Seccion>
      <p className="text-xs text-gray-500">Elige el diseño con el que se verán tus cartas boca abajo. Tu rival verá tus cartas ocultas con este reverso.</p>
      <div role="radiogroup" aria-label="Reverso de tus cartas" className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {DORSOS.map((d) => {
          const activo = d.id === elegido
          return (
            <button
              key={d.id}
              type="button"
              role="radio"
              aria-checked={activo}
              aria-label={d.nombre}
              onClick={() => void elegir(d.id)}
              className={`group flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-2 text-center transition focus:outline-none focus-visible:border-ether-400 ${
                activo ? 'border-ether-400 bg-ether-600/10 shadow-[0_0_18px_-4px_rgba(144,144,255,0.5)]' : 'border-white/10 bg-white/[0.02] hover:border-white/25'
              }`}
            >
              <span
                className="block w-full overflow-hidden rounded-md border border-[#3b3b5c]"
                style={{ aspectRatio: '744/1038' }}
              >
                <DorsoCarta id={d.id} />
              </span>
              <span className="space-y-0.5">
                <span className={`block text-xs font-medium ${activo ? 'text-ether-200' : 'text-gray-200'}`}>{d.nombre}</span>
                <span className="block text-[10px] text-gray-500">{d.descripcion}</span>
              </span>
            </button>
          )
        })}
      </div>
      {mensaje && (
        <p role="status" className={`text-xs ${mensaje.tipo === 'ok' ? 'text-emerald-300' : 'text-rose-300'}`}>
          {mensaje.texto}
        </p>
      )}
    </section>
  )
}
