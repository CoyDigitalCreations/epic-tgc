import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { cardArtPath, getCardById } from '../../shared/data/paquetes'
import { analizarCarta, contextoDeAnalisis, textosDeEfectos } from '../analisisCarta'
import type { AnalisisCarta as Analisis, MargenStat, SemaforoStat } from '../analisisCarta'
import { ETIQUETA_REFERENCIA } from '../componentes/PanelReferencia'
import { SinCartas } from '../componentes/SinCartas'
import { TituloVista } from '../componentes/TituloVista'
import { CONFIG_V1 } from '../config'
import { filtrarCartas, FILTROS_VACIOS } from '../metricas'
import type { FiltrosBalance } from '../metricas'
import type { CartaBalance } from '../tipos'
import type { Referencia } from '../useReferencia'
import { ALTO_ARTE, ANCHO_ARTE } from './constantesUi'
import { NOMBRE_MAZO, num } from './formato'

export interface PropsAnalisisCarta {
  /** Publicadas visibles (ya filtradas). */
  cartas: CartaBalance[]
  /** Las 65 publicadas: el pool contra el que se analiza. Si falta, se usa `cartas`. */
  publicadas?: CartaBalance[]
  filtros?: FiltrosBalance
  /** Carta publicada elegida (viene de la URL, ya validada). */
  carta: string | null
  onCarta: (id: string | null) => void
  referencia?: Referencia
}

const ETIQUETA_PUBLICADAS = 'Publicadas'
const CAMPO = 'rounded-lg border border-card-border bg-surface px-2 py-1.5 text-sm text-gray-100'
const ETIQUETA_CAMPO = 'font-display text-xs uppercase tracking-wider text-gray-400'
const BLOQUE = 'rounded-2xl border border-card-border bg-surface p-4'
const SUBTITULO = 'mb-2 font-display text-sm font-bold uppercase tracking-wider text-ether-200'
const TH = 'whitespace-nowrap border-b border-card-border px-2 py-1 font-display text-xs text-ether-200'
const TD = 'border-b border-card-border/40 px-2 py-1'

const REFERENCIA_APAGADA: Referencia = { activa: false, setActiva: () => {}, estado: 'apagada', cartas: [], crudas: new Map() }

const NOMBRE_STAT: Record<MargenStat['stat'], string> = { atq: 'ATQ', res: 'RES', suma: 'Suma' }

/** Color de cada estado; el texto del estado siempre se muestra al lado, nunca solo el color. */
const COLOR_ESTADO: Record<SemaforoStat, { barra: string; insignia: string }> = {
  verde: { barra: 'bg-green-500', insignia: 'border-green-500/50 bg-green-500/15 text-green-300' },
  amarillo: { barra: 'bg-yellow-500', insignia: 'border-yellow-500/50 bg-yellow-500/15 text-yellow-300' },
  rojo: { barra: 'bg-red-500', insignia: 'border-red-500/50 bg-red-500/15 text-red-300' },
  bajo: { barra: 'bg-sky-500', insignia: 'border-sky-500/50 bg-sky-500/15 text-sky-300' },
  exenta: { barra: 'bg-violet-500', insignia: 'border-violet-500/50 bg-violet-500/15 text-violet-300' },
}

/** Minúsculas y sin acentos, para buscar «elen» y encontrar «Elena» sin pensar en tildes. */
const normalizar = (texto: string): string => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const coincide = (c: CartaBalance, busqueda: string): boolean =>
  busqueda === '' || normalizar(`${c.nombre} ${c.id}`).includes(busqueda)

const textoOpcion = (c: CartaBalance): string => `${c.nombre} (${c.id})`
const plural = (n: number, singular: string, pluralizado: string): string => (n === 1 ? singular : pluralizado)

function Ilustracion({ carta }: { carta: CartaBalance }) {
  const ruta = cardArtPath(carta.id)
  if (ruta === undefined) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-card-border bg-surface-2 p-4 text-center text-sm text-gray-400">
        {carta.esReferencia === true ? 'Sin arte (carta de referencia)' : 'Sin arte'}
      </div>
    )
  }
  return (
    <img
      src={ruta}
      alt={carta.nombre}
      loading="lazy"
      width={ANCHO_ARTE}
      height={ALTO_ARTE}
      className="h-auto w-full rounded-xl border border-card-border"
    />
  )
}

function Estadisticas({ carta, analisis }: { carta: CartaBalance; analisis: Analisis }) {
  const suma = analisis.presupuesto?.suma ?? null
  const filas: [string, string][] = [
    ['Tipo', carta.tipo],
    ['Coste', String(carta.coste)],
    ['ATQ', num(carta.stats?.atq ?? null)],
    ['RES', num(carta.stats?.res ?? null)],
    ['Suma', num(suma)],
    ['Rareza', carta.rareza],
    ['Mazo', carta.mazo === null ? '—' : NOMBRE_MAZO[carta.mazo]],
    ['Keywords', carta.keywords.length === 0 ? 'Ninguna' : carta.keywords.join(', ')],
  ]
  return (
    <section aria-label="Estadísticas de la carta" className={BLOQUE}>
      <h4 className={SUBTITULO}>Estadísticas</h4>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
        {filas.map(([etiqueta, valor]) => (
          <div key={etiqueta}>
            <dt className="text-xs text-gray-500">{etiqueta}</dt>
            <dd className="text-gray-100">{valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

/** «Puede subir hasta +N», «No puede subir» o nada si la carta está exenta. */
function textoPuedeSubir(m: MargenStat): string {
  if (m.puedeSubir === null) return `Tope propio: ${num(m.tope)}`
  return m.puedeSubir > 0 ? `Puede subir hasta +${m.puedeSubir}` : 'No puede subir'
}

function Barra({ m }: { m: MargenStat }) {
  const nombre = NOMBRE_STAT[m.stat]
  const maximo = Math.max(m.tope, m.valor)
  const porcentaje = maximo > 0 ? Math.min(100, Math.round((m.valor / maximo) * 100)) : 0
  return (
    <div
      role="meter"
      aria-label={nombre}
      aria-valuemin={0}
      aria-valuemax={maximo}
      aria-valuenow={m.valor}
      aria-valuetext={`${num(m.valor)} de ${num(m.tope)}`}
      className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
    >
      <div className={`h-full ${COLOR_ESTADO[m.estado].barra}`} style={{ width: `${porcentaje}%` }} />
    </div>
  )
}

function Margenes({ margenes }: { margenes: MargenStat[] }) {
  return (
    <section aria-label="Márgenes de los stats" className={BLOQUE}>
      <h4 className={SUBTITULO}>Márgenes de los stats</h4>
      <ul className="space-y-4">
        {margenes.map((m) => (
          <li key={m.stat}>
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <span className="font-semibold text-gray-100">{NOMBRE_STAT[m.stat]}</span>
              <span className="text-gray-400">
                {num(m.valor)} de {num(m.tope)}
              </span>
            </div>
            <Barra m={m} />
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className={`rounded-full border px-2 py-0.5 font-semibold ${COLOR_ESTADO[m.estado].insignia}`}>{m.texto}</span>
              <span className="text-gray-400">Holgura: {num(m.holgura)}</span>
              <span className="text-gray-300">{textoPuedeSubir(m)}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Aviso de letalidad de subir un stat: lo arma la vista a partir de `superaTecho` y `ganancia`. Nunca bloquea. */
function avisoDeLetalidad(m: MargenStat): string {
  const paso = CONFIG_V1.analisis.pasoSubida
  const nombre = NOMBRE_STAT[m.stat]
  const techo =
    m.superaTecho && m.techoPool !== null
      ? `Subir +${paso} supera el techo del pool (${m.techoPool}). Es solo un aviso: no cambia cuánto puede subir. `
      : `Subir +${paso}: `
  const g = m.ganancia
  if (g === null) return `${nombre}: ${techo}`.trim()
  const n = m.stat === 'atq' ? g.mata : g.loMatan
  if (n === 0) return `${nombre}: ${techo}Sin efecto práctico en el pool.`
  const efecto =
    m.stat === 'atq'
      ? `mataría a ${n} ${plural(n, 'Campeón', 'Campeones')} más del pool.`
      : `${plural(n, 'dejaría', 'dejarían')} de matarla ${n} ${plural(n, 'Campeón', 'Campeones')} del pool.`
  return `${nombre}: ${techo}Con eso ${efecto}`
}

function Letalidad({ analisis }: { analisis: Analisis }) {
  const avisables = analisis.margenes.filter((m) => m.stat !== 'suma' && m.puedeSubir !== null)
  const l = analisis.letalidad
  if (avisables.length === 0 && l === null) return null
  return (
    <section aria-label="Letalidad" className={BLOQUE}>
      <h4 className={SUBTITULO}>Letalidad en el pool</h4>
      {l !== null && (
        <p className="mb-2 text-sm text-gray-300">
          Mata a {l.mata} de {l.total} Campeones ({num(l.pctMata)}%) y la matan {l.loMatan} ({num(l.pctLoMatan)}%).
        </p>
      )}
      {avisables.length > 0 && (
        <ul aria-label="Avisos de letalidad" className="list-disc space-y-1 pl-5 text-sm text-gray-300">
          {avisables.map((m) => (
            <li key={m.stat}>{avisoDeLetalidad(m)}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Razones({ analisis }: { analisis: Analisis }) {
  return (
    <section aria-label="Por qué" className={BLOQUE}>
      <h4 className={SUBTITULO}>Por qué</h4>
      {analisis.razones.length === 0 ? (
        <p className="text-sm text-gray-400">Sin razones: la carta no se sale de rango.</p>
      ) : (
        <ul aria-label="Razones" className="list-disc space-y-1 pl-5 text-sm text-gray-300">
          {analisis.razones.map((r) => (
            <li key={r.texto}>{r.texto}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

function PoderDeLaCarta({ analisis }: { analisis: Analisis }) {
  const { desglose, presupuesto } = analisis
  const filas: [string, string][] = [['Índice de poder', num(desglose.indice)]]
  if (presupuesto !== null) filas.push(['Impuesto a la suma', num(presupuesto.impuesto)])
  if (desglose.esperado !== null) {
    filas.push([`Poder esperado (coste × ${CONFIG_V1.poderPorCoste})`, num(desglose.esperado)])
    filas.push(['Holgura en puntos de poder', num(desglose.holgura)])
  }
  return (
    <section aria-label="Poder de la carta" className={BLOQUE}>
      <h4 className={SUBTITULO}>Poder de la carta</h4>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
        {filas.map(([etiqueta, valor]) => (
          <div key={etiqueta}>
            <dt className="text-xs text-gray-500">{etiqueta}</dt>
            <dd className="text-gray-100">{valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

const COLUMNAS_EFECTO = ['Efecto', 'Verbo', 'Base', 'Tipo', 'Trigger', 'Activación', 'Duración', 'Objetivo', 'Keywords', 'Costo', 'Poder']

function Desglose({ analisis }: { analisis: Analisis }) {
  const { efectos, keywords, totalBruto } = analisis.desglose
  const triggerPorDefecto = Object.keys(CONFIG_V1.poder.trigger).length === 0
  return (
    <section aria-label="Desglose del poder" className={BLOQUE}>
      <h4 className={SUBTITULO}>Desglose del poder</h4>
      {efectos.length === 0 ? (
        <p className="text-sm text-gray-400">Esta carta no tiene efectos.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-gray-300">
            <caption className="mb-1 text-left text-xs text-gray-500">Desglose del poder por efecto</caption>
            <thead>
              <tr>
                {COLUMNAS_EFECTO.map((c) => (
                  <th key={c} scope="col" className={TH}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {efectos.map((e) => (
                <tr key={e.indice} className="odd:bg-surface/50">
                  <td className={TD}>
                    {e.texto ?? 'Sin texto'}
                    {e.esComandante && (
                      <span className="ml-2 rounded-full border border-ether-400/50 px-2 py-0.5 text-xs text-ether-200">Comandante</span>
                    )}
                  </td>
                  <td className={TD}>{e.sinVerbo ? 'Sin verbo (poder 0)' : (e.verbo ?? 'Por tramos')}</td>
                  <td className={TD}>{num(e.componentes.base)}</td>
                  <td className={TD}>{num(e.componentes.tipo)}</td>
                  <td className={TD}>{num(e.componentes.trigger)}</td>
                  <td className={TD}>{num(e.componentes.activacion)}</td>
                  <td className={TD}>{num(e.componentes.duracion)}</td>
                  <td className={TD}>{num(e.componentes.objetivo)}</td>
                  <td className={TD}>{num(e.componentes.keywords)}</td>
                  <td className={TD}>{num(e.componentes.costo)}</td>
                  <td className={`${TD} font-semibold`}>{num(e.componentes.poder)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {triggerPorDefecto && efectos.length > 0 && (
        <p className="mt-2 text-xs text-gray-500">
          Todos los triggers pesan lo mismo ({CONFIG_V1.poder.fallback}): es el peso por defecto, aún no hay pesos por trigger.
        </p>
      )}
      {keywords.length === 0 ? (
        <p className="mt-3 text-sm text-gray-400">Sin keywords propias.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-gray-300">
            <caption className="mb-1 text-left text-xs text-gray-500">Desglose del poder por keyword</caption>
            <thead>
              <tr>
                <th scope="col" className={TH}>Keyword</th>
                <th scope="col" className={TH}>Peso</th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((k) => (
                <tr key={k.keyword} className="odd:bg-surface/50">
                  <td className={TD}>{k.keyword}</td>
                  <td className={TD}>{num(k.peso)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-sm text-gray-400">Poder bruto de efectos y keywords: {num(totalBruto)}</p>
    </section>
  )
}

function Identidad({ analisis, carta }: { analisis: Analisis; carta: CartaBalance }) {
  if (carta.mazo === null) return null
  return (
    <section aria-label="Identidad del mazo" className={BLOQUE}>
      <h4 className={SUBTITULO}>Identidad</h4>
      {analisis.fueraDeIdentidad.length === 0 ? (
        <p className="text-sm text-gray-400">Sin efectos fuera de la identidad de su mazo.</p>
      ) : (
        <ul aria-label="Efectos fuera de identidad" className="list-disc space-y-1 pl-5 text-sm text-gray-300">
          {analisis.fueraDeIdentidad.map((v) => (
            <li key={v}>El verbo «{v}» es identidad del mazo rival.</li>
          ))}
        </ul>
      )}
    </section>
  )
}

function AjustePropuesto({ analisis }: { analisis: Analisis }) {
  const { ajuste, etiquetaAjuste } = analisis
  if (ajuste === null) return <p className="text-sm text-gray-400">Sin ajuste propuesto</p>
  return (
    <section aria-label="Ajuste propuesto" className={BLOQUE}>
      <h4 className={SUBTITULO}>
        Ajuste propuesto{' '}
        <span className="ml-2 rounded-full border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 text-xs normal-case text-amber-200">
          {etiquetaAjuste}
        </span>
      </h4>
      <p className="text-sm text-gray-100">
        {ajuste.antes.poder}/{ajuste.antes.resistencia} → {ajuste.despues.poder}/{ajuste.despues.resistencia}
      </p>
      <p className="mt-1 text-sm text-gray-300">{ajuste.motivo}</p>
      {(ajuste.superaTecho || ajuste.avisos.length > 0) && (
        <ul aria-label="Avisos del ajuste" className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-200">
          {ajuste.superaTecho && <li>El ajuste supera el techo del pool. Es solo un aviso: el ajuste es exploratorio.</li>}
          {ajuste.avisos.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Análisis de una carta: stats, márgenes, razones, desglose y ajuste. Solo lectura. */
export function AnalisisCarta({
  cartas,
  publicadas,
  filtros = FILTROS_VACIOS,
  carta,
  onCarta,
  referencia = REFERENCIA_APAGADA,
}: PropsAnalisisCarta) {
  const idBusqueda = useId()
  const idSelector = useId()
  const titulo = useRef<HTMLHeadingElement>(null)
  const [busqueda, setBusqueda] = useState('')
  const [idReferencia, setIdReferencia] = useState<string | null>(null)
  const pool = publicadas ?? cartas

  // La referencia elegida solo vale mientras el interruptor siga activo.
  useEffect(() => {
    if (!referencia.activa) setIdReferencia(null)
  }, [referencia.activa])

  const consulta = normalizar(busqueda.trim())
  const publicadasEnLista = useMemo(() => cartas.filter((c) => coincide(c, consulta)), [cartas, consulta])
  const referenciaEnLista = useMemo(
    () => filtrarCartas(referencia.cartas, filtros, { incluirReferencia: true }).filter((c) => coincide(c, consulta)),
    [referencia.cartas, filtros, consulta],
  )

  const seleccionReferencia = idReferencia === null ? null : (referencia.cartas.find((c) => c.id === idReferencia) ?? null)
  const seleccionPublicada = carta === null ? null : (pool.find((c) => c.id === carta) ?? null)
  const seleccion = seleccionReferencia ?? seleccionPublicada
  const fueraDeFiltros = seleccionReferencia === null && seleccionPublicada !== null && !cartas.some((c) => c.id === seleccionPublicada.id)

  // Lo caro se calcula una vez por pool; el análisis, una vez por carta elegida.
  const contexto = useMemo(() => contextoDeAnalisis(pool), [pool])
  const analisis = useMemo(() => {
    if (seleccion === null) return null
    const cruda = seleccion.esReferencia === true ? referencia.crudas.get(seleccion.id) : getCardById(seleccion.id)
    return analizarCarta(seleccion, contexto, textosDeEfectos(cruda))
  }, [seleccion, contexto, referencia.crudas])

  // Al elegir otra carta, el foco va al título para que se anuncie el cambio.
  const idSeleccionada = seleccion?.id ?? null
  useEffect(() => {
    if (idSeleccionada !== null) titulo.current?.focus()
  }, [idSeleccionada])

  // La carta elegida siempre está en el selector, aunque los filtros o la búsqueda ya no la incluyan.
  const publicadasOpciones =
    seleccionPublicada !== null && !publicadasEnLista.some((c) => c.id === seleccionPublicada.id)
      ? [seleccionPublicada, ...publicadasEnLista]
      : publicadasEnLista

  const elegir = (id: string) => {
    if (id === '') {
      setIdReferencia(null)
      onCarta(null)
    } else if (referenciaEnLista.some((c) => c.id === id)) {
      setIdReferencia(id)
      onCarta(null)
    } else {
      setIdReferencia(null)
      onCarta(id)
    }
  }

  const sinOpciones = publicadasOpciones.length === 0 && referenciaEnLista.length === 0
  const esReferencia = seleccion?.esReferencia === true

  return (
    <section>
      <TituloVista
        titulo="Análisis de carta"
        descripcion="Elige una carta para ver por qué se sale de rango, cuánto margen tiene y de dónde viene su poder."
      />

      <div aria-live="polite" className="sr-only">
        {analisis === null ? '' : `Analizando ${analisis.nombre}`}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-4 rounded-2xl border border-card-border bg-surface p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor={idBusqueda} className={ETIQUETA_CAMPO}>
            Buscar por nombre o ID
          </label>
          <input
            id={idBusqueda}
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className={CAMPO}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={idSelector} className={ETIQUETA_CAMPO}>
            Carta
          </label>
          <select id={idSelector} value={seleccion?.id ?? ''} onChange={(e) => elegir(e.target.value)} className={CAMPO}>
            <option value="">Elige una carta</option>
            {publicadasOpciones.length > 0 && (
              <optgroup label={ETIQUETA_PUBLICADAS}>
                {publicadasOpciones.map((c) => (
                  <option key={c.id} value={c.id}>
                    {textoOpcion(c)}
                  </option>
                ))}
              </optgroup>
            )}
            {referencia.activa && referenciaEnLista.length > 0 && (
              <optgroup label={ETIQUETA_REFERENCIA}>
                {referenciaEnLista.map((c) => (
                  <option key={c.id} value={c.id}>
                    {textoOpcion(c)}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
        {referencia.activa && referencia.estado === 'cargando' && (
          <p className="text-xs text-gray-400">Cargando cartas de referencia…</p>
        )}
      </div>

      {sinOpciones && seleccion === null && <SinCartas />}

      {fueraDeFiltros && (
        <p className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          Esta carta no cumple los filtros actuales del tablero, pero se analiza de todos modos.
        </p>
      )}

      {seleccion !== null && analisis !== null && (
        <article className="grid gap-6 md:grid-cols-[minmax(0,16rem)_1fr]">
          <Ilustracion carta={seleccion} />
          <div className="space-y-4">
            <header>
              <h3 ref={titulo} tabIndex={-1} className="font-display text-lg font-bold text-gray-100 outline-none focus-visible:ring-2 focus-visible:ring-ether-400">
                {seleccion.nombre} <span className="font-mono text-sm font-normal text-gray-400">{seleccion.id}</span>
              </h3>
              {esReferencia && (
                <p className="mt-1 text-sm text-amber-200">{ETIQUETA_REFERENCIA}: solo lectura, sin ajuste ni exportación.</p>
              )}
              {analisis.estado !== 'sin-semaforo' && (
                <p className="mt-1 text-sm text-gray-300">
                  Estado: <span className="font-semibold">{analisis.etiqueta}</span>
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">Cálculos {analisis.config}</p>
            </header>
            <Estadisticas carta={seleccion} analisis={analisis} />
            {analisis.margenes.length > 0 && <Margenes margenes={analisis.margenes} />}
            <PoderDeLaCarta analisis={analisis} />
            <Razones analisis={analisis} />
            <Letalidad analisis={analisis} />
            <Desglose analisis={analisis} />
            <Identidad analisis={analisis} carta={seleccion} />
            {!esReferencia && <AjustePropuesto analisis={analisis} />}
          </div>
        </article>
      )}
    </section>
  )
}
