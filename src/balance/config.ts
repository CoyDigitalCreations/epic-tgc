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
}
