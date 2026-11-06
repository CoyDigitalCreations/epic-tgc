import type { ConfigBalance } from './tipos'

/**
 * Configuración v1 del tablero de balance.
 *
 * Todos los números son BORRADOR calibrable: viven aquí y en ningún otro
 * archivo de src/balance. Los módulos reciben la config por parámetro
 * (por defecto CONFIG_V1), así un test puede cambiar un valor y comprobar
 * que cambia el resultado.
 */
export const CONFIG_V1: ConfigBalance = {
  version: 'v1',

  // Daño >= RES mata, por eso la RES pesa más que el ATQ.
  pesos: { atq: 1.0, res: 1.25 },

  // v1.1: tabla de diseño coste -> suma máxima (ATQ + RES). No existen cartas de coste > 10.
  // sumaMax lo fija el diseño; el resto sale de las proporciones que ya tenía la config:
  //   sumaMin ≈ 80 % de sumaMax (piso: por debajo la carta está regalada),
  //   topeAtq = topeRes ≈ 65 % de sumaMax (evita stats extremos tipo 12/1).
  // Los costes 5-10 aún no tienen cartas reales: son el criterio para diseñar las que vengan.
  bandas: {
    1: { sumaMin: 3, sumaMax: 4, topeAtq: 3, topeRes: 3 },
    2: { sumaMin: 5, sumaMax: 6, topeAtq: 4, topeRes: 4 },
    3: { sumaMin: 6, sumaMax: 8, topeAtq: 5, topeRes: 5 },
    4: { sumaMin: 8, sumaMax: 10, topeAtq: 7, topeRes: 7 },
    5: { sumaMin: 10, sumaMax: 13, topeAtq: 8, topeRes: 8 },
    6: { sumaMin: 13, sumaMax: 16, topeAtq: 10, topeRes: 10 },
    7: { sumaMin: 16, sumaMax: 20, topeAtq: 13, topeRes: 13 },
    8: { sumaMin: 20, sumaMax: 25, topeAtq: 16, topeRes: 16 },
    9: { sumaMin: 22, sumaMax: 27, topeAtq: 18, topeRes: 18 },
    10: { sumaMin: 24, sumaMax: 30, topeAtq: 20, topeRes: 20 },
  },

  // SUPUESTO 1: el sacrificio de Campeones paga la suma de Soberanos y Únicas.
  excepciones: {
    rolesExentos: ['Soberano', 'Emperador'],
    rarezasExentas: ['Única'],
    tope: { suma: 18, atq: 9, res: 9 },
  },

  poder: {
    verbo: {
      buff: 1,
      debuff: 1.5,
      destroy: 3,
      exile: 3,
      return_hand: 1.5,
      draw: 1.5,
      steal_champion: 4,
      steal_ether: 2,
      block_ether: 1.5,
      free_ether: 1,
      return_ether: 1.5,
      toggle_exhaust: 1.5,
      prevent_destroy: 2,
      fix_exhaust: 2,
      scry: 0.5,
      tutor: 1.5,
      copy: 2,
      redirect: 1.5,
      double_attack: 2,
      direct_attack: 2,
      change_type: 1,
      grant_keyword: 1,
      recuperar_campo: 2,
      recuperar_mano: 1.5,
      recuperar_mazo: 1,
      recuperar_mazo_barajar: 1,
      recuperar_mazo_top: 1,
      recuperar_mazo_bottom: 1,
      recuperar_exilio: 2,
      invocar: 2,
      invocar_y_equipar: 2.5,
      mover: 0.5,
      negar: 3,
      rival_discard: 2,
      modificar_regla: 2,
      // Verbos nuevos del rediseño de Estásis (peso propuesto 2 cada uno; BORRADOR calibrable)
      activar_disparo: 2,
      anclar_eter: 2,
    },
    tipo: { pasivo: 1, disparo: 1, continuo: 1, comandante: 1, reserva: 1, pago: 1, bloqueo: 1, hechizo: 1, vinculo: 1 },
    trigger: {},
    activacion: { una_por_turno: 0.8, una_mientras_bloqueado: 0.8 },
    duracion: { permanente: 1, turno: 0.5, n_turnos: 0.75, mientras_en_campo: 1, mientras_ester_bloqueado: 1, mientras_tenga_eter_bloqueado: 1, hasta_fase: 0.5, '1_por_turno': 0.8 },
    objetivo: { self: 1, campeon: 1, todos_campeones_propios: 1.5, todos_campeones_rivales: 1.5 },
    // Peso de cada keyword (misma escala que el verbo). Fundamento según el manual v3.0:
    //  Carga 1       puede atacar al invocarse: tempo, pero una sola vez.
    //  Vigor 1.5     no se agota al atacar: ataca y además defiende cada turno.
    //  Tirador 1     no se agota al disparar: ventaja menor, solo sus efectos Disparo.
    //  Inmortal 2.5  inmune a destrucción por efectos (las Místicas y Arcanas de remoción no lo tocan).
    //  Indestructible 2  inmune a destrucción en batalla; los efectos aún lo matan.
    //  Inexiliable 0.5   inmune solo al exilio: nicho.
    //  Inegable 1.5  la carta no se puede negar: salta el control de Estásis.
    //  Recarga 1.5   al atacar regresa 1 Éter bloqueado: aceleración de Éter.
    //  Protector 2   protege a los demás Campeones de habilidades Activas rivales.
    //  Artefacto 0.5 es sobre todo una forma de jugar la carta (se equipa, y es un riesgo si el Campeón sale).
    //  Presteza 1.5  velocidad media: responde en la cadena, solo se contesta con Presteza o Fugaz.
    //  Fugaz 2.5     velocidad máxima: no se puede responder.
    keyword: {
      Carga: 1,
      Vigor: 1.5,
      Tirador: 1,
      Inmortal: 2.5,
      Indestructible: 2,
      Inexiliable: 0.5,
      Inegable: 1.5,
      Recarga: 1.5,
      Protector: 2,
      Artefacto: 0.5,
      Presteza: 1.5,
      Fugaz: 2.5,
    },
    // Un costo restrictivo resta poder; el Éter bloqueado vuelve en el Alba propia, así que resta más.
    costo: { ninguno: 0, eter: -0.5, eter_bloqueado: -0.75, bloqueo_fijo: -0.75, exhaust: -0.5, exile_self: -1, cemetery_self: -0.5 },
    // El costo nunca resta más del 50 % del poder bruto del efecto (base × multiplicadores): un efecto
    // real, aunque cueste mucho, conserva al menos la mitad de su poder y no se hunde a 0.
    topeCostoProporcion: 0.5,
    fallback: 1,
  },

  // Franquicia: los primeros 2 puntos de poder son gratis (un efecto menor o una keyword
  // no deben rebajar la suma); lo que pasa del umbral paga 0.5 de suma por punto, máx. 3.
  impuesto: { umbral: 2, puntosPorPoder: 0.5, maxImpuesto: 3 },

  // El JSON exportado lleva sangría de dos espacios.
  exportacion: { sangria: 2 },

  // Un Campeón es dominante si mata a al menos 60 % del pool y lo matan a lo sumo 20 %. BORRADOR.
  letalidad: { dominanteMata: 60, dominanteLoMatan: 20 },

  // SUPUESTO 2: toggle_exhaust y fix_exhaust cuentan como control de Éter de Estásis.
  identidad: {
    estasis: {
      identidad: ['block_ether', 'negar', 'toggle_exhaust', 'fix_exhaust', 'prevent_destroy', 'return_hand', 'return_ether', 'anclar_eter'],
      neutral: ['buff', 'grant_keyword', 'mover', 'tutor', 'copy', 'draw', 'invocar_y_equipar'],
    },
    disonancia: {
      // v1.2: steal_ether es la firma de Disonancia (roba Éter del rival); antes contaba como neutral.
      identidad: ['destroy', 'debuff', 'rival_discard', 'exile', 'steal_ether'],
      neutral: ['buff', 'grant_keyword', 'mover', 'tutor', 'copy', 'draw', 'invocar_y_equipar'],
    },
  },

  // Desvío de poder respecto del esperado: verde <= verde, ámbar <= amarillo, rojo en otro caso.
  semaforo: { verde: 0, amarillo: 1.5 },

  // Poder esperado de Éter, Mística, Arcana y Vínculo = coste * 2.
  poderPorCoste: 2,

  // Coste mínimo por verbo: por defecto ceil(peso del verbo en poder.verbo). Aquí solo van
  // los OVERRIDES explícitos { verbo: costeMinimo }; si un verbo aparece, gana sobre la fórmula.
  costeMinimoVerbo: {},

  // v1.2 (Lote 3 de Disonancia): los Éteres no pagan el coste mínimo por verbo. Todos cuestan 1 y no
  // pueden costar más, así que se baja el peso del efecto (el tope coste × 2 sigue aplicando) en vez
  // de subir el coste. Un Campeón o Mística con ese verbo sí lo incumple.
  // NOTA DE CALIBRACIÓN: los pesos de `mover` (0.5) y `steal_ether` (2) están por validar; la fórmula
  // probablemente subestima ambos en la mesa. Se contrastará con simulación (Lote 4), sin tocarlos antes.
  costeMinimoExento: { tipos: ['Éter'] },

  // Análisis de carta (BORRADOR): paso de la simulación «subir +1» y holgura que cuenta como «cerca del tope».
  analisis: { pasoSubida: 1, cercaDelTope: 0.5 },

  // ÍNDICE DE TABÚ (BORRADOR calibrable): cuántas reglas del manual rompe una carta. A mayor tabú, más poderoso es el efecto y más
  // tendría que costar. Es un EJE NUEVO e independiente: no cambia el poder, los stats ni el semáforo.
  //   Nivel 0  no rompe ninguna regla del manual.
  //   Nivel 1  cambia una regla que ya tiene hueco previsto (el manual o el catálogo REGLAS del motor nombran la excepción).
  //   Nivel 2  rompe una regla escrita del manual, sin excepción nombrada.
  //   Nivel 3  rompe un invariante del motor (p. ej. «el Éter nunca va al Cementerio ni al Exilio»).
  // Cada entrada lleva el nivel y la regla del manual que rompe. Los verbos de poder (`poder.verbo`) no cambian con esto.
  tabu: {
    niveles: [0, 1, 2, 3],

    // Una entrada por verbo del seed y de `poder.verbo` (campo `efecto`). Los que no rompen nada van en nivel 0 de forma explícita.
    verbo: {
      buff: { nivel: 0, regla: 'Ninguna: modificar ATQ y RES es lo normal en el juego' },
      debuff: { nivel: 0, regla: 'Ninguna: modificar ATQ y RES es lo normal en el juego' },
      destroy: { nivel: 0, regla: 'Ninguna: la remoción es parte del juego (§9.4, §10)' },
      exile: { nivel: 0, regla: 'Ninguna: exiliar es un efecto normal; Inexiliable ya lo cubre (§10)' },
      return_hand: { nivel: 0, regla: 'Ninguna: devolver a la mano es un efecto normal' },
      draw: { nivel: 0, regla: 'Ninguna: robar cartas es un efecto normal' },
      steal_champion: { nivel: 1, regla: '§7.8: tomar el control de un Campeón rival; el manual ya prevé su Éter y su regreso' },
      steal_ether: { nivel: 1, regla: '§7.1 y §7.3: cada jugador paga con su Éter; el arrebato (§7.6) lo presta hasta el Alba de su dueño' },
      block_ether: { nivel: 0, regla: 'Ninguna: bloquear Éter en un Campeón es la mecánica normal (§7.2)' },
      free_ether: { nivel: 0, regla: 'Ninguna: liberar Éter bloqueado es la mecánica normal (§7.2)' },
      return_ether: { nivel: 1, regla: '§7.4: el Éter pagado vuelve a la Reserva hasta tu próximo Alba; Recarga ya nombra una excepción' },
      toggle_exhaust: { nivel: 0, regla: 'Ninguna: agotar o enderezar es un estado que el manual ya maneja (§9.2)' },
      prevent_destroy: { nivel: 1, regla: '§9.4: la Ruptura destruye un Vínculo; Inmortal e Indestructible ya nombran excepciones (§10)' },
      fix_exhaust: { nivel: 2, regla: '§8.2: el Alba endereza a tus Campeones; fijar el agotamiento lo impide' },
      scry: { nivel: 0, regla: 'Ninguna: mirar el mazo es un efecto normal (§8.2)' },
      tutor: { nivel: 0, regla: 'Ninguna: buscar una carta es un efecto normal' },
      copy: { nivel: 0, regla: 'Ninguna: copiar atributos es un efecto normal (el Comandante es inmutable, §10)' },
      redirect: { nivel: 0, regla: 'Ninguna: redirigir una activación es un efecto de cadena normal' },
      double_attack: { nivel: 2, regla: '§9.2: un Campeón declara un solo ataque y se agota al declararlo' },
      direct_attack: { nivel: 1, regla: '§9.3: el defensor puede bloquear; el manual ya nombra al Campeón que no puede ser bloqueado' },
      change_type: { nivel: 0, regla: 'Ninguna: cambiar el tipo de un Campeón es un efecto normal' },
      grant_keyword: { nivel: 0, regla: 'Ninguna: conceder una keyword es normal; el tabú lo pone la keyword (ver keyword)' },
      recuperar_campo: { nivel: 0, regla: 'Ninguna: recuperar del Cementerio es un efecto normal' },
      recuperar_mano: { nivel: 0, regla: 'Ninguna: recuperar a la mano es un efecto normal' },
      recuperar_mazo: { nivel: 0, regla: 'Ninguna: recuperar al mazo es un efecto normal' },
      recuperar_mazo_barajar: { nivel: 0, regla: 'Ninguna: recuperar al mazo es un efecto normal' },
      recuperar_mazo_top: { nivel: 0, regla: 'Ninguna: recuperar al mazo es un efecto normal' },
      recuperar_mazo_bottom: { nivel: 0, regla: 'Ninguna: recuperar al mazo es un efecto normal' },
      recuperar_exilio: { nivel: 0, regla: 'Ninguna: recuperar del Exilio es un efecto normal' },
      invocar: { nivel: 0, regla: 'Ninguna: invocar por efecto es un efecto normal' },
      invocar_y_equipar: { nivel: 0, regla: 'Ninguna: invocar y equipar es un efecto normal' },
      mover: { nivel: 0, regla: 'Ninguna cuando mueve Éter propio; si mueve Éter del rival aplica el contexto mover_eter_ajeno' },
      negar: { nivel: 0, regla: 'Ninguna: negar es parte de la cadena de efectos' },
      rival_discard: { nivel: 0, regla: 'Ninguna: hacer descartar al rival es un efecto normal' },
      modificar_regla: { nivel: 0, regla: 'Es solo el vehículo: el tabú está en la regla que modifica (ver regla)' },
      activar_disparo: { nivel: 1, regla: '§8.3a: cada Campeón activa sus propios Disparos; aquí uno activa el de otro' },
      anclar_eter: { nivel: 2, regla: '§8.2: todo el Éter fuera de la Reserva se reagrupa en el Alba; el ancla lo impide' },
    },

    // El mismo verbo con otro objetivo: la clave de contexto SUSTITUYE a la del verbo.
    contexto: {
      mover_eter_ajeno: { nivel: 1, regla: '§7.3: solo tú mueves tu Éter de la Reserva; aquí se mueve el Éter del rival sin que él pague' },
      recuperar_mano_al_dueno: { nivel: 1, regla: '§7.8: el Campeón robado regresa a su dueño; aquí lo hace a su mano' },
    },

    // Reglas enumeradas del Card-Maker (`reglaEnumerada`) y reglas del catálogo REGLAS del motor (`regla.id`).
    regla: {
      disparo_sin_agotar: { nivel: 1, regla: '§8.3a: un Disparo con Éter pagado agota al Campeón; Tirador ya nombra la excepción' },
      coste_campeones_rival_mas: { nivel: 1, regla: '§7.3: invocar cuesta lo que dice la carta; el catálogo prevé el Éter extra (costeCampeonesExtra)' },
      olvido_rival: { nivel: 1, regla: '§9.4: lo que muere va al Cementerio; el catálogo prevé el Exilio en su lugar (cementerioAlExilio)' },
      peaje_bloqueo: { nivel: 2, regla: '§9.3: bloquear es gratis y forzoso; el Peaje lo cobra y suspende el bloqueo forzoso' },
      primerTurnoSinAtaques: { nivel: 2, regla: '§8.6: nadie ataca en el primer turno de la partida' },
      limiteMano: { nivel: 1, regla: '§7.1 y §8.5: el límite de mano es 6; el catálogo lo prevé' },
      cartasPorAlba: { nivel: 2, regla: '§8.2: robas 1 carta en el Alba' },
      rupturasPorTurno: { nivel: 1, regla: '§9.4: una sola Ruptura por turno; el manual nombra la excepción (Embestida del Sur)' },
      atacarTrasRuptura: { nivel: 1, regla: '§9.4: tras la Ruptura no se declara otro ataque; el manual nombra la excepción' },
      derrotaPorVinculos: { nivel: 3, regla: '§13: pierdes al quedarte sin Vínculos; es un invariante del motor' },
      costeCampeonesExtra: { nivel: 1, regla: '§7.3: invocar cuesta lo que dice la carta; el catálogo prevé el Éter extra' },
      cementerioAlExilio: { nivel: 1, regla: '§9.4: lo que muere va al Cementerio; el catálogo prevé el Exilio en su lugar' },
      costeBloqueo: { nivel: 2, regla: '§9.3: bloquear es gratis y forzoso' },
      agotadoPuedeBloquear: { nivel: 2, regla: '§9.3: un Campeón agotado no puede bloquear' },
      invocacionCansada: { nivel: 1, regla: '§9.2: no ataca el turno en que se invoca; Carga ya nombra la excepción' },
      atacarAgota: { nivel: 1, regla: '§9.2: atacar agota al Campeón; Vigor ya nombra la excepción' },
      disparoAgota: { nivel: 1, regla: '§8.3a: un Disparo con Éter pagado agota al Campeón; Tirador ya nombra la excepción' },
      ataquesPorTurno: { nivel: 2, regla: '§9.2: un Campeón declara un solo ataque por turno' },
      bloqueosPorTurno: { nivel: 2, regla: '§9.3: un Campeón bloquea un solo ataque por turno' },
      puedeSerBloqueado: { nivel: 1, regla: '§9.3: el atacante puede ser bloqueado; el manual nombra al que no puede serlo' },
      puedeSerExiliada: { nivel: 1, regla: '§10: Inexiliable ya nombra la excepción' },
      puedeSerDestruidaPorEfecto: { nivel: 1, regla: '§10: Inmortal ya nombra la excepción' },
      puedeSerDestruidaEnBatalla: { nivel: 1, regla: '§10: Indestructible ya nombra la excepción' },
      efectosActivos: { nivel: 1, regla: '§10: negar un efecto activo; el Comandante es inmutable y las keywords quedan fuera' },
      puedeSerNegada: { nivel: 1, regla: '§10: Inegable ya nombra la excepción' },
      eterBloqueadoExtra: { nivel: 2, regla: '§7.7: el efecto bloquea exactamente su Éter' },
    },

    // Banderas de un efecto que rompen una regla por sí solas.
    opcion: {
      sin_pagar_costo: { nivel: 2, regla: '§8.3a: un Disparo se activa pagando su costo' },
      reagrupar_todo: { nivel: 1, regla: '§7.6: reagrupa todo el Éter bloqueado en la carta; el manual nombra ese alcance (Aurora y Ragnar)' },
    },

    // Las keywords son el vocabulario de excepciones del propio manual (§10) y su peso ya está en `poder.keyword`: nivel 0 explícito.
    keyword: {
      Carga: { nivel: 0, regla: 'Keyword del manual (§10): la excepción a la invocación cansada ya está nombrada' },
      Vigor: { nivel: 0, regla: 'Keyword del manual (§10): la excepción a «atacar agota» ya está nombrada' },
      Tirador: { nivel: 0, regla: 'Keyword del manual (§10): la excepción a «el Disparo agota» ya está nombrada' },
      Inmortal: { nivel: 0, regla: 'Keyword del manual (§10): la inmunidad a efectos ya está nombrada' },
      Indestructible: { nivel: 0, regla: 'Keyword del manual (§10): la inmunidad a la batalla ya está nombrada' },
      Inexiliable: { nivel: 0, regla: 'Keyword del manual (§10): la inmunidad al Exilio ya está nombrada' },
      Inegable: { nivel: 0, regla: 'Keyword del manual (§10): la inmunidad a la negación ya está nombrada' },
      Recarga: { nivel: 0, regla: 'Keyword del manual (§10): el regreso de Éter bloqueado ya está nombrado' },
      Protector: { nivel: 0, regla: 'Keyword del manual (§10): la protección a los demás Campeones ya está nombrada' },
      Artefacto: { nivel: 0, regla: 'Keyword del manual (§10): el equipamiento ya está nombrado' },
      Presteza: { nivel: 0, regla: 'Keyword del manual (§10): la velocidad media ya está nombrada' },
      Fugaz: { nivel: 0, regla: 'Keyword del manual (§10): la velocidad máxima ya está nombrada' },
    },

    // «A mayor tabú, mayor coste»: 1 punto de tabú por cada punto de coste por encima de 1. Un Éter (coste 1) no puede romper nada
    // dentro de su presupuesto, porque no puede subir de coste; los costes 5-10 aún no tienen cartas reales (criterio para las que vengan).
    tabuMaxPorCoste: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 7: 6, 8: 7, 9: 8, 10: 9 },
  },
}
