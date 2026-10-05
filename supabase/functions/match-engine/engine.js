// src/shared/types/enums.ts
var FACCION_COLORS = {
  Orden: "#e5e7eb",
  Caos: "#3b82f6",
  Creaci\u00F3n: "#22c55e",
  Destrucci\u00F3n: "#ef4444",
  Ley: "#eab308",
  Purga: "#f97316",
  Entrop\u00EDa: "#a855f7",
  Mutaci\u00F3n: "#22d3ee"
};

// seed/PrimerColeccionEfectos.json
var PrimerColeccionEfectos_default = [
  {
    id: "FB-001",
    name: "\xC9ter del Alba Primigenia",
    type: "\xC9ter",
    rarity: "Rara",
    keywords: [],
    flavorText: "El primer latido del \xC9ter se sinti\xF3 en el norte, y las casas abrieron los ojos.",
    paqueteId: "estasis",
    limiteCopias: "2",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-29T05:03:05.407Z",
    stats: {
      cost: 1
    },
    efectos: [
      {
        tipo: "pago",
        efecto: "buff",
        objetivo: {
          tipo: "campeon",
          controlador: "propio",
          zona: "campo"
        },
        stats: {
          ATQ: 1,
          RES: 0
        },
        texto: "Cuando pagues esta carta, un Campe\xF3n que controles gana 1 de ATQ, hasta el final del turno.",
        duracion: "turno",
        trigger: "al_pagar_eter"
      }
    ]
  },
  {
    id: "FB-002",
    name: "\xC9ter del Reino Perdido",
    type: "\xC9ter",
    rarity: "Poco Com\xFAn",
    keywords: [],
    flavorText: "Las casas cayeron, pero su memoria no.",
    paqueteId: "estasis",
    limiteCopias: "1",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-29T05:03:18.487Z",
    stats: {
      cost: 1
    },
    efectos: [
      {
        tipo: "pago",
        efecto: "grant_keyword",
        objetivo: {
          tipo: "campeon",
          controlador: "propio",
          zona: "campo"
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Cuando pagues esta carta, un Campe\xF3n que controles gana Vigor, hasta el final del turno.",
        keyword: "Vigor",
        duracion: "turno",
        trigger: "al_pagar_eter"
      }
    ]
  },
  {
    id: "FB-003",
    name: "\xC9ter de la Sangre Eterna",
    type: "\xC9ter",
    rarity: "Com\xFAn",
    keywords: [],
    flavorText: "Lo que corre por sus venas no es sangre: es promesa.",
    paqueteId: "estasis",
    limiteCopias: "2",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-29T05:03:30.287Z",
    stats: {
      cost: 1
    },
    variantePago: "Gatillo",
    efectos: [
      {
        tipo: "pago",
        efecto: "draw",
        objetivo: {
          tipo: "carta",
          controlador: "propio",
          zona: "mazo"
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Cuando pagues esta carta, roba 1 carta de tu mazo.",
        trigger: "al_pagar_eter",
        cantidad: 1
      }
    ]
  },
  {
    id: "FB-004",
    name: "\xC9ter del Conducto Roto",
    type: "\xC9ter",
    rarity: "Com\xFAn",
    keywords: [],
    flavorText: "A\xFAn roto, el cristal recuerda c\xF3mo cantar.",
    paqueteId: "estasis",
    limiteCopias: "2",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-29T05:04:09.856Z",
    stats: {
      cost: 1
    },
    variantePago: "Gatillo",
    efectos: [
      {
        tipo: "pago",
        efecto: "buff",
        objetivo: {
          tipo: "campeon",
          controlador: "propio",
          zona: "campo"
        },
        stats: {
          ATQ: 0,
          RES: 2
        },
        texto: "Cuando pagues esta carta, un Campe\xF3n que controles gana 2 de RES, hasta el final del turno.",
        trigger: "al_pagar_eter",
        duracion: "turno"
      }
    ]
  },
  {
    id: "FB-005",
    name: "\xC9ter de la Voz de las Casas",
    type: "\xC9ter",
    rarity: "Com\xFAn",
    keywords: [],
    flavorText: "Cada hermana es la voz de una casa que ya no existe.",
    paqueteId: "estasis",
    limiteCopias: "2",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-29T05:04:33.760Z",
    stats: {
      cost: 1
    },
    variantePago: "Pasivo",
    efectos: [
      {
        tipo: "pago",
        efecto: "block_ether",
        objetivo: {
          tipo: "campeon",
          controlador: "propio",
          zona: "campo",
          filtros: {
            puedeBloquearEter: true
          }
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Bloquea 1 \xC9ter de tu Reserva sobre un Campe\xF3n que pueda recibir \xE9ter bloqueado que controles."
      }
    ]
  },
  {
    id: "FB-006",
    name: "\xC9ter del Cristal Hu\xE9rfano",
    type: "\xC9ter",
    rarity: "Rara",
    keywords: [],
    flavorText: "Ninguna casa las reclam\xF3. El \xC9ter s\xED.",
    paqueteId: "estasis",
    limiteCopias: "1",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-29T05:04:43.456Z",
    stats: {
      cost: 1
    },
    variantePago: "Gatillo",
    efectos: [
      {
        tipo: "pago",
        texto: "Cuando pagues esta carta, devuelve 1 \xC9ter de la zona de pago a tu Reserva.",
        trigger: "al_pagar_eter",
        efecto: "return_ether",
        objetivo: {
          tipo: "eter",
          controlador: "propio",
          zona: "pagado",
          zonaDestino: "reserva"
        },
        cantidad: 1
      }
    ]
  },
  {
    id: "FB-007",
    name: "\xC9ter de la Primog\xE9nita",
    type: "\xC9ter",
    rarity: "\xC9pica",
    keywords: [],
    flavorText: "La primera en fusionarse. La que marc\xF3 el camino.",
    paqueteId: "estasis",
    limiteCopias: "1",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-03T23:46:08.738Z",
    stats: {
      cost: 1
    },
    efectos: [
      {
        tipo: "bloqueo",
        efecto: "buff",
        objetivo: {
          tipo: "campeon",
          controlador: "propio",
          zona: "campo"
        },
        stats: {
          ATQ: 1,
          RES: 0
        },
        texto: "Mientras est\xE9 bloqueado, el Campe\xF3n que tenga este \xC9ter gana +1 de ATQ."
      }
    ]
  },
  {
    id: "FB-008",
    name: "\xC9ter del Despertar",
    type: "\xC9ter",
    rarity: "Poco Com\xFAn",
    keywords: [],
    flavorText: "Cuando el cristal despierta, la hija despierta con \xE9l.",
    paqueteId: "estasis",
    limiteCopias: "2",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-29T05:05:47.218Z",
    stats: {
      cost: 1
    },
    efectos: [
      {
        tipo: "bloqueo",
        efecto: "grant_keyword",
        objetivo: {
          tipo: "campeon",
          controlador: "propio",
          zona: "campo"
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Mientras est\xE9 bloqueado, el Campe\xF3n que tenga este \xC9ter gana Inmortal.",
        keyword: "Inmortal"
      }
    ]
  },
  {
    id: "FB-009",
    name: "\xC9ter de la \xDAltima Casa",
    type: "\xC9ter",
    rarity: "Com\xFAn",
    keywords: [],
    flavorText: "La \xFAltima en caer no fue la m\xE1s d\xE9bil: fue la que resisti\xF3.",
    paqueteId: "estasis",
    limiteCopias: "2",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-29T05:06:06.106Z",
    stats: {
      cost: 1
    },
    efectos: [
      {
        tipo: "bloqueo",
        texto: "Mientras est\xE9 bloqueado, el Campe\xF3n que tenga este \xC9ter gana 1 de RES.",
        objetivo: {
          tipo: "campeon",
          controlador: "propio",
          zona: "campo"
        },
        efecto: "buff",
        stats: {
          RES: 1
        },
        zonaActivacion: "bloqueo"
      }
    ]
  },
  {
    id: "FB-010",
    name: "Aurora, La Primog\xE9nita",
    type: "Campe\xF3n",
    rarity: "\xDAnica",
    keywords: [
      "Inmortal"
    ],
    flavorText: "No somos hijas de ning\xFAn reino. Somos el Reino.",
    paqueteId: "estasis",
    limiteCopias: "1",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-29T05:06:58.179Z",
    facciones: [
      "Orden"
    ],
    esencia: "C\xE9leste",
    roles: [
      "Soberano"
    ],
    catHabilidad: [
      "Comandante",
      "Singular"
    ],
    stats: {
      cost: 4,
      poder: 9,
      resistencia: 9
    },
    disparoAgota: "No",
    disparoUnSoloUso: "No",
    efectos: [
      {
        tipo: "disparo",
        efecto: "destroy",
        objetivo: {
          tipo: "mistica_arcana",
          controlador: "rival",
          zona: "campo"
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Puedes pagar 2 \xC9ter, destruye 1 M\xEDstica o Arcana que controla el rival, una vez por turno.",
        duracion: "1_por_turno",
        costo: {
          tipo: "eter",
          cantidad: 2
        }
      },
      {
        tipo: "continuo",
        efecto: "steal_champion",
        objetivo: {
          tipo: "campeon",
          controlador: "rival",
          zona: "campo"
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Bloquea 4 \xC9ter, toma control de 1 un Campe\xF3n que controla el rival, mientras ese \xC9ter est\xE9 bloqueado, Al inicio de tu Alba reagrupa el \xC9ter usado por este efecto.",
        duracion: "mientras_ester_bloqueado",
        costo: {
          tipo: "bloqueo_fijo",
          cantidad: 4
        },
        reagrupar: {
          fase: "alba",
          turno: "propio"
        }
      }
    ],
    efectoComandante: {
      tipo: "pasivo",
      efecto: "buff",
      texto: "Todos tus Campeones ganan 2 de ATQ y 2 de RES.",
      stats: {
        ATQ: 2,
        RES: 2
      },
      costo: {},
      objetivo: {
        tipo: "todos_campeones_propios",
        controlador: "propio",
        zona: "campo"
      }
    }
  },
  {
    id: "FB-011",
    name: "Vaela, Sed de Alba",
    type: "Campe\xF3n",
    rarity: "Com\xFAn",
    keywords: [
      "Carga"
    ],
    flavorText: "Ataca antes de que el alba termine de cantar.",
    paqueteId: "estasis",
    limiteCopias: "3",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-29T05:07:17.147Z",
    facciones: [
      "Orden"
    ],
    esencia: "C\xE9leste",
    roles: [
      "Normal"
    ],
    catHabilidad: [
      "Efecto"
    ],
    stats: {
      cost: 2,
      poder: 5,
      resistencia: 3
    },
    efectos: [
      {
        tipo: "pasivo",
        efecto: "mover",
        objetivo: {
          tipo: "eter",
          controlador: "rival",
          zona: "reserva",
          zonaDestino: "pagado",
          controladorDestino: "rival"
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Al matar en combate, puedes mover 1 \xC9ter que controla el rival de la Reserva a la zona de pago del rival.",
        trigger: "al_matar_en_combate"
      }
    ]
  },
  {
    id: "FB-012",
    name: "Mira, Cristal Hu\xE9rfano",
    type: "Campe\xF3n",
    rarity: "Com\xFAn",
    keywords: [],
    flavorText: "Recupera lo que otros dan por perdido.",
    paqueteId: "estasis",
    limiteCopias: "3",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-29T05:07:54.116Z",
    facciones: [
      "Orden"
    ],
    esencia: "C\xE9leste",
    roles: [
      "\xC9ter"
    ],
    catHabilidad: [
      "Efecto"
    ],
    stats: {
      cost: 2,
      poder: 4,
      resistencia: 4
    },
    efectos: [
      {
        tipo: "pasivo",
        efecto: "tutor",
        objetivo: {
          tipo: "campeon",
          controlador: "propio",
          zona: "cementerio",
          zonaDestino: "mano",
          filtros: {
            faccion: "Orden",
            esencia: "C\xE9leste"
          }
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Al ser enviada al Cementerio desde cualquier zona, puedes buscar 1 Campe\xF3n de facci\xF3n Orden de esencia C\xE9leste de tu Cementerio y agregalo a tu mano.",
        trigger: "al_ser_enviado_al_cementerio",
        triggerZona: "cualquier_zona"
      }
    ]
  },
  {
    id: "FB-013",
    name: "Seraphina, Voz de las Casas",
    type: "Campe\xF3n",
    rarity: "Com\xFAn",
    keywords: [],
    flavorText: "Sus palabras a\xFAn resuenan en las ruinas de las casas.",
    paqueteId: "estasis",
    limiteCopias: "3",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-20T04:17:50.942Z",
    facciones: [
      "Orden"
    ],
    esencia: "Espectro",
    roles: [
      "Normal"
    ],
    catHabilidad: [
      "Efecto"
    ],
    stats: {
      cost: 3,
      poder: 4,
      resistencia: 3
    },
    disparoAgota: true,
    disparoUnSoloUso: true,
    efectos: [
      {
        tipo: "disparo",
        efecto: "toggle_exhaust",
        objetivo: {
          tipo: "campeon",
          controlador: "propio",
          zona: "campo"
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Puedes pagar 3 \xC9ter, cambia el agotamiento de un Campe\xF3n que controles, una vez por turno.",
        costo: {
          tipo: "eter",
          cantidad: 3
        },
        duracion: "1_por_turno"
      }
    ]
  },
  {
    id: "FB-014",
    name: "Isolde, \xDAltima Casa",
    type: "Campe\xF3n",
    rarity: "Poco Com\xFAn",
    keywords: [
      "Protector"
    ],
    flavorText: "Muro de carne, promesa de cristal.",
    paqueteId: "estasis",
    limiteCopias: "2",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-29T05:08:34.741Z",
    facciones: [
      "Orden"
    ],
    esencia: "C\xE9leste",
    roles: [
      "Soporte"
    ],
    catHabilidad: [
      "Efecto"
    ],
    stats: {
      cost: 3,
      poder: 3,
      resistencia: 7
    },
    disparoAgota: true,
    disparoUnSoloUso: true,
    efectos: [
      {
        tipo: "disparo",
        efecto: "destroy",
        objetivo: {
          tipo: "mistica_arcana",
          controlador: "rival",
          zona: "campo"
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Puedes pagar 2 \xC9ter, destruye 1 M\xEDstica o Arcana que controla el rival, una vez por turno.",
        costo: {
          tipo: "eter",
          cantidad: 2
        },
        duracion: "1_por_turno"
      }
    ]
  },
  {
    id: "FB-015",
    name: "Elena, Despertar del \xC9ter",
    type: "Campe\xF3n",
    rarity: "Poco Com\xFAn",
    keywords: [
      "Recarga"
    ],
    flavorText: "El \xC9ter que la despierta tambi\xE9n la alimenta.",
    paqueteId: "estasis",
    limiteCopias: "2",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-29T05:18:22.728Z",
    facciones: [
      "Orden"
    ],
    esencia: "C\xE9leste",
    roles: [
      "Normal"
    ],
    catHabilidad: [
      "Efecto"
    ],
    stats: {
      cost: 3,
      poder: 3,
      resistencia: 0
    },
    efectos: [
      {
        tipo: "continuo",
        efecto: "double_attack",
        objetivo: {
          tipo: "self"
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Bloquea 3 \xC9ter, esta carta puede declarar 2 veces ataque, mientras ese \xC9ter est\xE9 bloqueado.",
        costo: {
          tipo: "bloqueo_fijo",
          cantidad: 3
        },
        duracion: "mientras_ester_bloqueado"
      }
    ],
    variante: "normal"
  },
  {
    id: "FB-016",
    name: "Cassandra, Vig\xEDa del Reino Perdido",
    type: "Campe\xF3n",
    rarity: "Com\xFAn",
    keywords: [],
    flavorText: "Vio caer su reino y jur\xF3 que el pr\xF3ximo no caer\xE1.",
    paqueteId: "estasis",
    limiteCopias: "3",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-29T05:20:29.050Z",
    facciones: [
      "Orden"
    ],
    esencia: "Espectro",
    roles: [
      "Soporte"
    ],
    catHabilidad: [
      "Efecto"
    ],
    stats: {
      cost: 4,
      poder: 3,
      resistencia: 5
    },
    disparoAgota: false,
    disparoUnSoloUso: false,
    efectos: [
      {
        tipo: "continuo",
        efecto: "toggle_exhaust",
        objetivo: {
          tipo: "campeon",
          controlador: "rival",
          zona: "campo"
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Al ser invocada, bloquea 4 \xC9ter, cambia el agotamiento de un Campe\xF3n que controla el rival, mientras ese \xC9ter est\xE9 bloqueado.",
        costo: {
          tipo: "bloqueo_fijo",
          cantidad: 4
        },
        duracion: "mientras_ester_bloqueado",
        trigger: "al_invocar"
      }
    ]
  },
  {
    id: "FB-017",
    name: "Nymeria, Conducto Roto",
    type: "Campe\xF3n",
    rarity: "Poco Com\xFAn",
    keywords: [],
    flavorText: "Rompe lo que ata. Libera lo que fue tomado.",
    paqueteId: "estasis",
    limiteCopias: "2",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-20T04:19:59.201Z",
    facciones: [
      "Orden"
    ],
    esencia: "Espectro",
    roles: [
      "\xC9ter"
    ],
    catHabilidad: [
      "Efecto"
    ],
    stats: {
      cost: 4,
      poder: 4,
      resistencia: 5
    },
    disparoAgota: true,
    disparoUnSoloUso: true,
    efectos: [
      {
        tipo: "disparo",
        efecto: "mover",
        objetivo: {
          tipo: "eter",
          controlador: "rival",
          zona: "bloqueado",
          zonaDestino: "pagado"
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Puedes pagar 2 \xC9ter, mueve 1 \xC9ter que controla el rival bloqueado a su zona de pago, hasta la pr\xF3xima Alba del oponente, negando su efecto.",
        costo: {
          tipo: "eter",
          cantidad: 2
        },
        cantidad: 1,
        sinActivarEfecto: true,
        duracion: "hasta_alba_oponente"
      }
    ]
  },
  {
    id: "FB-018",
    name: "Rowena, V\xEDnculo Eterno",
    type: "Campe\xF3n",
    rarity: "Com\xFAn",
    keywords: [],
    flavorText: "El v\xEDnculo es la vida. Nadie lo tocar\xE1.",
    paqueteId: "estasis",
    limiteCopias: "3",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-29T05:25:08.295Z",
    facciones: [
      "Orden"
    ],
    esencia: "C\xE9leste",
    roles: [
      "Soporte"
    ],
    catHabilidad: [
      "Efecto"
    ],
    stats: {
      cost: 4,
      poder: 3,
      resistencia: 6
    },
    efectos: [
      {
        tipo: "pasivo",
        efecto: "prevent_destroy",
        objetivo: {
          tipo: "vinculo",
          controlador: "propio",
          zona: "campo"
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Cuando un V\xEDnculo que controles fuera a ser destruido, puedes enviar esta carta a tu exilio, previniendo la destrucci\xF3n de ese v\xEDnculo.",
        trigger: "cuando_vinculo_seria_destruido",
        costo: {
          tipo: "exile_self"
        }
      }
    ]
  },
  {
    id: "FB-019",
    name: "Heredad del Alba",
    type: "M\xEDstica",
    rarity: "Com\xFAn",
    keywords: [],
    flavorText: "Lo que la casa construy\xF3, la casa reclama.",
    paqueteId: "estasis",
    limiteCopias: "3",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-24T05:20:42.139Z",
    stats: {
      cost: 2
    },
    efectos: [
      {
        tipo: "hechizo",
        efecto: "return_hand",
        objetivo: {
          tipo: "campeon",
          controlador: "rival",
          zona: "campo",
          filtros: {
            atqMax: 5
          }
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Devuelve a la mano de su due\xF1o 1 un Campe\xF3n ATQ 5 o menos que controla el rival."
      }
    ]
  },
  {
    id: "FB-020",
    name: "Lamento de las Casas",
    type: "M\xEDstica",
    rarity: "Com\xFAn",
    keywords: [
      "Artefacto"
    ],
    flavorText: "El dolor de una casa es el poder de otra.",
    paqueteId: "estasis",
    limiteCopias: "3",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-29T00:47:03.948Z",
    stats: {
      cost: 1
    },
    efectos: [
      {
        tipo: "hechizo",
        efecto: "buff",
        objetivo: {
          tipo: "equipped_champion",
          controlador: "propio",
          zona: "campo"
        },
        stats: {
          ATQ: 2,
          RES: 0
        },
        texto: "Puedes bloquear hasta un m\xE1ximo de 3 \xC9ter (Max. 3), el Campe\xF3n equipado con esta carta gana 2 de ATQ por cada \xC9ter bloqueado.",
        costo: {
          tipo: "eter_bloqueado",
          cantidad: 3
        },
        buffPerBlockedEther: true
      }
    ]
  },
  {
    id: "FB-021",
    name: "Marcha de las Primeras",
    type: "M\xEDstica",
    rarity: "Com\xFAn",
    keywords: [
      "Presteza"
    ],
    flavorText: "Unidas por la sangre y el \xC9ter, no hay muro que las detenga.",
    paqueteId: "estasis",
    limiteCopias: "3",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-20T04:23:33.301Z",
    stats: {
      cost: 3
    },
    efectos: [
      {
        tipo: "hechizo",
        efecto: "negar",
        objetivo: {
          tipo: "campeon",
          controlador: "rival",
          zona: "campo"
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Niega la activaci\xF3n del efecto de un Campe\xF3n que controla el rival.",
        tipoNegacion: "activacion"
      }
    ]
  },
  {
    id: "FB-022",
    name: "\xDAltimo Refugio",
    type: "M\xEDstica",
    rarity: "Com\xFAn",
    keywords: [
      "Fugaz"
    ],
    flavorText: "Cuando todo cae, queda el juramento.",
    paqueteId: "estasis",
    limiteCopias: "3",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-20T04:24:17.470Z",
    stats: {
      cost: 3
    },
    efectos: [
      {
        tipo: "hechizo",
        efecto: "copy",
        objetivo: {
          tipo: "mistica_arcana",
          controlador: "rival",
          zona: "campo"
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Puedes bloquear hasta un m\xE1ximo de 3 \xC9ter (Max. 3), copia el efecto de hechizo, el efecto continuo y la recompensa de una M\xEDstica o Arcana que controla el rival, mientras ese \xC9ter est\xE9 bloqueado.",
        duracion: "mientras_ester_bloqueado",
        costo: {
          tipo: "eter_bloqueado",
          cantidad: 3
        },
        copyAttributes: [
          "mistica_hechizo",
          "mistica_continuo",
          "arcana_recompensa"
        ]
      }
    ]
  },
  {
    id: "FB-023",
    name: "El Reino Perdido",
    type: "Arcana",
    rarity: "Rara",
    keywords: [],
    flavorText: "El trono vac\xEDo a\xFAn exige respuestas.",
    paqueteId: "estasis",
    limiteCopias: "3",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-24T05:23:08.788Z",
    stats: {
      cost: 2
    },
    condicion: {
      trigger: "inicio_alba",
      condiciones: [
        {
          tipo: "controlar_minimo",
          cantidad: 2,
          objetivo: {
            tipo: "campeon",
            controlador: "propio",
            filtros: {
              conEterBloqueado: true
            }
          }
        }
      ]
    },
    recompensa: "Roba 2 cartas y un Campe\xF3n que controles gana +3 de Poder hasta el final del turno.",
    efectos: [
      {
        tipo: "hechizo",
        efecto: "draw",
        objetivo: {
          tipo: "carta",
          controlador: "propio",
          zona: "mazo",
          filtros: {}
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Roba 2 carta de tu mazo.",
        cantidad: 2
      }
    ]
  },
  {
    id: "FB-024",
    name: "Filo del \xC9ter Primigenio",
    type: "Arcana",
    rarity: "Com\xFAn",
    keywords: [
      "Artefacto",
      "Presteza"
    ],
    flavorText: "El cristal no corta: recuerda.",
    paqueteId: "estasis",
    limiteCopias: "3",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-24T05:25:15.643Z",
    facciones: [
      "Orden"
    ],
    stats: {
      cost: 2
    },
    recompensa: 'Un Campe\xF3n que controles gana +2 de ATQ hasta el final del turno. Si destruye a un Campe\xF3n que controla el rival este turno, roba 1 carta."',
    condicion: {
      trigger: "inicio_alba",
      condiciones: [
        {
          tipo: "controlar_minimo",
          cantidad: 2,
          objetivo: {
            tipo: "campeon",
            controlador: "rival"
          }
        }
      ]
    },
    efectos: [
      {
        tipo: "hechizo",
        efecto: "buff",
        objetivo: {
          tipo: "equipped_champion",
          controlador: "propio",
          zona: "campo"
        },
        stats: {
          ATQ: 2,
          RES: 0
        },
        texto: "El Campe\xF3n equipado con esta carta gana 2 de ATQ.",
        costo: {
          cantidad: 1
        }
      }
    ]
  },
  {
    id: "FB-025",
    name: "Primer Juramento",
    type: "V\xEDnculo",
    rarity: "Com\xFAn",
    keywords: [],
    flavorText: "El primero de todos los pactos no se rompe jam\xE1s.",
    paqueteId: "estasis",
    limiteCopias: "1",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-20T04:25:45.232Z",
    stats: {
      cost: 0
    },
    efectos: [
      {
        tipo: "vinculo",
        efecto: "block_ether",
        objetivo: {
          tipo: "campeon",
          controlador: "propio",
          zona: "campo",
          filtros: {
            puedeBloquearEter: true
          }
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Al inicio de tu Alba, puedes bloquear hasta un m\xE1ximo de 1 \xC9ter (Max. 1), sobre un Campe\xF3n que pueda recibir \xE9ter bloqueado que controles, una vez por turno.",
        trigger: "inicio_alba",
        duracion: "1_por_turno",
        costo: {
          tipo: "eter_bloqueado",
          cantidad: 1
        }
      }
    ]
  },
  {
    id: "FB-026",
    name: "Heredad de Orden",
    type: "V\xEDnculo",
    rarity: "Com\xFAn",
    keywords: [],
    flavorText: "El norte recuerda a sus hijas.",
    paqueteId: "estasis",
    limiteCopias: "1",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-20T03:46:49.106Z",
    stats: {
      cost: 0
    },
    efectos: [
      {
        tipo: "vinculo",
        efecto: "toggle_exhaust",
        objetivo: {
          tipo: "campeon",
          controlador: "rival",
          zona: "campo"
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Al inicio del Choque del rival, cambia el agotamiento de un Campe\xF3n que controla el rival.",
        trigger: "inicio_choque",
        controladorTrigger: "rival"
      }
    ]
  },
  {
    id: "FB-027",
    name: "Refugio de las Casas",
    type: "V\xEDnculo",
    rarity: "Com\xFAn",
    keywords: [],
    flavorText: "En la ca\xEDda, las hermanas se abrazan.",
    paqueteId: "estasis",
    limiteCopias: "1",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-20T04:45:14.270Z",
    stats: {
      cost: 0
    },
    efectos: [
      {
        tipo: "vinculo",
        efecto: "mover",
        objetivo: {
          tipo: "eter",
          controlador: "ambos",
          zona: "campo",
          zonaDestino: "pagado"
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Al inicio de tu Alba, mueve hasta 3 \xC9ter en juego a la zona de pago de su due\xF1o, una vez por turno.",
        esHasta: true,
        cantidad: 3,
        duracion: "1_por_turno",
        trigger: "inicio_alba"
      }
    ]
  },
  {
    id: "FB-028",
    name: "Cristal de la \xDAltima Casa",
    type: "V\xEDnculo",
    rarity: "Poco Com\xFAn",
    keywords: [],
    flavorText: "El \xFAltimo fragmento sigue ardiendo.",
    paqueteId: "estasis",
    limiteCopias: "1",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-20T04:52:52.280Z",
    stats: {
      cost: 0
    },
    efectos: [
      {
        tipo: "vinculo",
        efecto: "grant_keyword",
        objetivo: {
          tipo: "campeon",
          controlador: "propio",
          zona: "campo"
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Al inicio de la Alba del rival, un Campe\xF3n que controles gana Inmortal, una vez por turno.",
        duracion: "1_por_turno",
        keyword: "Inmortal",
        trigger: "inicio_alba",
        controladorTrigger: "rival"
      }
    ]
  },
  {
    id: "FB-029",
    name: "Voz del Alba",
    type: "V\xEDnculo",
    rarity: "Poco Com\xFAn",
    keywords: [],
    flavorText: "El alba devuelve lo que la noche tom\xF3.",
    paqueteId: "estasis",
    limiteCopias: "1",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-24T05:27:02.124Z",
    stats: {
      cost: 0
    },
    efectos: [
      {
        tipo: "vinculo",
        efecto: "return_hand",
        objetivo: {
          tipo: "campeon",
          controlador: "propio",
          zona: "cementerio",
          filtros: {
            costeMax: 3
          }
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Al inicio de tu Alba, puedes devolver a la mano de su due\xF1o 1 un Campe\xF3n coste 3 o menos de tu Cementerio, una vez por turno.",
        trigger: "inicio_alba",
        duracion: "1_por_turno"
      }
    ]
  },
  {
    id: "FB-030",
    name: "Lamento de la Primog\xE9nita",
    type: "V\xEDnculo",
    rarity: "Rara",
    keywords: [],
    flavorText: "El lamento de la primera todav\xEDa se escucha.",
    paqueteId: "estasis",
    limiteCopias: "1",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-20T04:57:19.829Z",
    stats: {
      cost: 0
    },
    efectos: [
      {
        tipo: "vinculo",
        efecto: "debuff",
        objetivo: {
          tipo: "campeon",
          controlador: "rival",
          zona: "campo",
          filtros: {
            seleccionar: {
              stat: "resistencia",
              orden: "mayor"
            }
          }
        },
        stats: {
          ATQ: 3,
          RES: 3
        },
        texto: "El Campe\xF3n con mayor RES que controla el rival pierde 3 de ATQ y 3 de RES, mientras esta carta est\xE9 en el campo.",
        duracion: "mientras_en_campo"
      }
    ]
  },
  {
    id: "FB-031",
    name: "Enviada de las Casas, Voz del Este",
    type: "Campe\xF3n",
    rarity: "Com\xFAn",
    keywords: [],
    flavorText: "Cae una enviada; llegan las casas.",
    paqueteId: "estasis",
    limiteCopias: "3",
    createdAt: "2026-08-12T00:00:00.000Z",
    updatedAt: "2026-09-29T02:11:25.346Z",
    facciones: [
      "Orden"
    ],
    esencia: "C\xE9leste",
    roles: [
      "Normal"
    ],
    catHabilidad: [
      "Efecto"
    ],
    stats: {
      cost: 2,
      poder: 4,
      resistencia: 3
    },
    efectos: [
      {
        tipo: "pasivo",
        efecto: "tutor",
        objetivo: {
          tipo: "campeon",
          zonaDestino: "mano",
          filtros: {
            faccion: "Orden",
            esencia: "C\xE9leste",
            costeMax: 4
          }
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Al ser enviada al Cementerio desde el campo, puedes buscar 1 Campe\xF3n de facci\xF3n Orden coste 4 o menos de esencia C\xE9leste de tu mazo y agregalo a tu mano.",
        trigger: "al_ser_enviado_al_cementerio",
        triggerZona: "campo",
        zonaOrigen: "mazo"
      }
    ]
  },
  {
    id: "FB-032",
    name: "Rito del Alba",
    type: "M\xEDstica",
    rarity: "Poco Com\xFAn",
    keywords: [
      "Artefacto"
    ],
    flavorText: "El alba devuelve lo que la noche escondi\xF3.",
    paqueteId: "estasis",
    limiteCopias: "2",
    createdAt: "2026-08-12T00:00:00.000Z",
    updatedAt: "2026-09-21T02:14:22.895Z",
    stats: {
      cost: 2
    },
    efectos: [
      {
        tipo: "hechizo",
        efecto: "invocar_y_equipar",
        objetivo: {
          tipo: "campeon",
          controlador: "propio",
          zona: "campo"
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Bloquea 4 \xC9ter, invoca un Campe\xF3n del Exilio de su due\xF1o y equipa esta carta a ese Campe\xF3n, mientras ese \xC9ter est\xE9 bloqueado.",
        zonaOrigen: "exilio",
        duracion: "mientras_ester_bloqueado",
        costo: {
          tipo: "bloqueo_fijo",
          cantidad: 4
        }
      }
    ]
  },
  {
    id: "DS-001",
    name: "Ragnar, Voz del Nudo",
    type: "Campe\xF3n",
    rarity: "\xDAnica",
    keywords: [
      "Indestructible"
    ],
    flavorText: "El norte canta su Reino. El sur aprieta su Nudo.",
    paqueteId: "disonancia",
    limiteCopias: "1",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-24T05:29:37.077Z",
    facciones: [
      "Caos"
    ],
    esencia: "Abisal",
    roles: [
      "Soberano"
    ],
    catHabilidad: [
      "Singular",
      "Comandante"
    ],
    stats: {
      cost: 4,
      poder: 9,
      resistencia: 9
    },
    efectos: [
      {
        tipo: "disparo",
        efecto: "destroy",
        objetivo: {
          tipo: "campeon",
          controlador: "rival",
          zona: "campo"
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Puedes pagar 4 \xC9ter, destruye 1 Campe\xF3n que controla el rival, una vez por turno.",
        costo: {
          tipo: "eter",
          cantidad: 4
        },
        duracion: "1_por_turno",
        cantidad: 1
      },
      {
        tipo: "continuo",
        efecto: "grant_keyword",
        objetivo: {
          tipo: "campeon",
          controlador: "propio",
          zona: "campo"
        },
        stats: {
          ATQ: 4,
          RES: 0
        },
        texto: "Bloquea 2 \xC9ter, un Campe\xF3n que controles gana Indestructible, mientras ese \xC9ter est\xE9 bloqueado, Al inicio de tu Alba reagrupa el \xC9ter usado por este efecto.",
        keyword: "Indestructible",
        costo: {
          tipo: "bloqueo_fijo",
          cantidad: 2
        },
        duracion: "mientras_ester_bloqueado",
        reagrupar: {
          fase: "alba",
          turno: "propio"
        }
      }
    ],
    efectoComandante: {
      tipo: "pasivo",
      efecto: "grant_keyword",
      stats: {
        ATQ: 3
      },
      objetivo: {
        tipo: "todos_campeones_propios",
        controlador: "propio",
        zona: "campo"
      },
      texto: "Todos tus Campeones ganan Indestructible.",
      keyword: "Indestructible"
    }
  },
  {
    id: "DS-002",
    name: "\xC9ter del Nudo",
    type: "\xC9ter",
    rarity: "Rara",
    keywords: [],
    flavorText: "El Nudo aprieta todo lo que toca.",
    paqueteId: "disonancia",
    limiteCopias: "2",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z",
    stats: {
      cost: 1
    },
    efectos: [
      {
        tipo: "reserva",
        trigger: "ninguno",
        efecto: "debuff",
        stats: {
          ATQ: 1
        },
        objetivo: {
          tipo: "campeon",
          controlador: "rival",
          zona: "campo"
        },
        texto: "Mientras est\xE9 en tu Reserva, los Campeones que controla el rival pierden 1 de ATQ."
      }
    ]
  },
  {
    id: "DS-003",
    name: "\xC9ter de la Tormenta",
    type: "\xC9ter",
    rarity: "Poco Com\xFAn",
    keywords: [],
    flavorText: "La Tormenta no anuncia su llegada: la sientes.",
    paqueteId: "disonancia",
    limiteCopias: "1",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z",
    stats: {
      cost: 1
    },
    efectos: [
      {
        tipo: "reserva",
        trigger: "inicio_choque",
        efecto: "grant_keyword",
        keyword: "Carga",
        objetivo: {
          tipo: "campeon",
          controlador: "propio",
          zona: "campo"
        },
        texto: "Al inicio de tu Choque, si est\xE1 en tu Reserva, un Campe\xF3n que controlas gana Carga hasta el final del turno.",
        duracion: "turno"
      }
    ]
  },
  {
    id: "DS-004",
    name: "\xC9ter del Trueno",
    type: "\xC9ter",
    rarity: "Com\xFAn",
    keywords: [],
    flavorText: "El trueno no avisa: llega.",
    paqueteId: "disonancia",
    limiteCopias: "2",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z",
    stats: {
      cost: 1
    },
    efectos: [
      {
        tipo: "pago",
        trigger: "al_pagar_eter",
        efecto: "rival_discard",
        objetivo: {
          tipo: "mano",
          controlador: "rival",
          zona: "mano"
        },
        cantidad: 1,
        texto: "Cuando pagues esta carta, el rival pierde 1 carta de su mano al azar."
      }
    ]
  },
  {
    id: "DS-005",
    name: "\xC9ter de la Marea",
    type: "\xC9ter",
    rarity: "Com\xFAn",
    keywords: [],
    flavorText: "La marea del sur no retrocede.",
    paqueteId: "disonancia",
    limiteCopias: "2",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z",
    stats: {
      cost: 1
    },
    efectos: [
      {
        tipo: "pago",
        trigger: "al_pagar_eter",
        efecto: "buff",
        stats: {
          ATQ: 1
        },
        objetivo: {
          tipo: "campeon",
          controlador: "propio",
          zona: "campo"
        },
        texto: "Cuando pagues esta carta para invocar un Campe\xF3n, ese Campe\xF3n gana 1 de ATQ hasta el final del pr\xF3ximo turno.",
        duracion: "n_turnos",
        duracionTurnos: 2
      }
    ]
  },
  {
    id: "DS-006",
    name: "\xC9ter del Viento",
    type: "\xC9ter",
    rarity: "Com\xFAn",
    keywords: [],
    flavorText: "El viento no pide permiso para moverse.",
    paqueteId: "disonancia",
    limiteCopias: "2",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-22T04:22:48.600Z",
    stats: {
      cost: 1
    },
    efectos: [
      {
        tipo: "pago",
        efecto: "block_ether",
        objetivo: {
          tipo: "campeon",
          controlador: "propio",
          zona: "campo",
          filtros: {
            puedeBloquearEter: true
          }
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Bloquea 1 \xC9ter de tu Reserva sobre un Campe\xF3n que pueda recibir \xE9ter bloqueado que controles, una vez por turno.",
        duracion: "1_por_turno"
      }
    ]
  },
  {
    id: "DS-007",
    name: "\xC9ter del Desgarro",
    type: "\xC9ter",
    rarity: "Rara",
    keywords: [],
    flavorText: "Lo que el sur toma, el norte lo llora.",
    paqueteId: "disonancia",
    limiteCopias: "1",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-22T05:28:16.218Z",
    stats: {
      cost: 1
    },
    efectos: [
      {
        tipo: "pago",
        efecto: "mover",
        objetivo: {
          tipo: "eter",
          controlador: "rival",
          zona: "reserva",
          zonaDestino: "pagado",
          controladorDestino: "rival"
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Cuando pagues esta carta, mueve 1 \xC9ter de la Reserva a la zona de pago del rival.",
        trigger: "al_pagar_eter"
      }
    ]
  },
  {
    id: "DS-008",
    name: "\xC9ter del Primog\xE9nito",
    type: "\xC9ter",
    rarity: "\xC9pica",
    keywords: [],
    flavorText: "El primero del sur despert\xF3 con el Nudo en el pecho.",
    paqueteId: "disonancia",
    limiteCopias: "1",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-22T18:49:22.302Z",
    stats: {
      cost: 1
    },
    efectos: [
      {
        tipo: "bloqueo",
        efecto: "buff",
        objetivo: {
          tipo: "campeon",
          controlador: "propio",
          zona: "campo"
        },
        stats: {
          RES: 1
        },
        texto: "Mientras est\xE9 bloqueado, el Campe\xF3n que tenga este \xC9ter gana 1 de RES."
      }
    ]
  },
  {
    id: "DS-009",
    name: "\xC9ter de la Ruptura",
    type: "\xC9ter",
    rarity: "Poco Com\xFAn",
    keywords: [],
    flavorText: "Nada rompe lo que el Nudo aprieta.",
    paqueteId: "disonancia",
    limiteCopias: "2",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-22T18:48:41.813Z",
    stats: {
      cost: 1
    },
    efectos: [
      {
        tipo: "bloqueo",
        efecto: "grant_keyword",
        objetivo: {
          tipo: "campeon",
          controlador: "propio",
          zona: "campo"
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Mientras est\xE9 bloqueado, el Campe\xF3n que tenga este \xC9ter gana Indestructible.",
        keyword: "Indestructible"
      }
    ]
  },
  {
    id: "DS-010",
    name: "\xC9ter del \xDAltimo Trueno",
    type: "\xC9ter",
    rarity: "Com\xFAn",
    keywords: [],
    flavorText: "El \xFAltimo trueno es el que m\xE1s duele.",
    paqueteId: "disonancia",
    limiteCopias: "2",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-22T18:49:47.863Z",
    stats: {
      cost: 1
    },
    efectos: [
      {
        tipo: "bloqueo",
        efecto: "buff",
        objetivo: {
          tipo: "campeon",
          controlador: "propio",
          zona: "campo"
        },
        stats: {
          ATQ: 1,
          RES: 0
        },
        texto: "Mientras est\xE9 bloqueado, el Campe\xF3n que tenga este \xC9ter gana 1 de ATQ."
      }
    ]
  },
  {
    id: "DS-011",
    name: "Kael, Filo del Nudo",
    type: "Campe\xF3n",
    rarity: "Com\xFAn",
    keywords: [
      "Carga"
    ],
    flavorText: "El Nudo corta lo que toca.",
    paqueteId: "disonancia",
    limiteCopias: "3",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-22T19:36:31.857Z",
    facciones: [
      "Caos"
    ],
    esencia: "Abisal",
    roles: [
      "Normal"
    ],
    catHabilidad: [
      "Efecto"
    ],
    stats: {
      cost: 2,
      poder: 5,
      resistencia: 3
    },
    efectos: [
      {
        tipo: "pasivo",
        efecto: "debuff",
        objetivo: {
          tipo: "campeon",
          controlador: "rival",
          zona: "campo"
        },
        stats: {
          ATQ: 1,
          RES: 0
        },
        texto: "Al atacar, un Campe\xF3n que controla el rival pierde 1 de ATQ.",
        trigger: "al_atacar"
      }
    ]
  },
  {
    id: "DS-012",
    name: "Draven, Rompecadenas",
    type: "Campe\xF3n",
    rarity: "Com\xFAn",
    keywords: [],
    flavorText: "Lo que rompe, lo cobra.",
    paqueteId: "disonancia",
    limiteCopias: "3",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-22T21:05:01.655Z",
    facciones: [
      "Caos"
    ],
    esencia: "Abisal",
    roles: [
      "\xC9ter"
    ],
    catHabilidad: [
      "Efecto"
    ],
    stats: {
      cost: 2,
      poder: 4,
      resistencia: 4
    },
    efectos: [
      {
        tipo: "pasivo",
        trigger: "al_matar_en_combate",
        efecto: "return_ether",
        objetivo: {
          tipo: "eter",
          controlador: "rival",
          zona: "pagado",
          zonaDestino: "reserva",
          controladorDestino: "rival"
        },
        zonaDestino: "reserva",
        cantidad: 1,
        texto: "Al matar en combate, devuelve 1 \xC9ter de la zona de pago a la Reserva del rival."
      },
      {
        tipo: "disparo",
        trigger: "al_activar_habilidad",
        costo: {
          tipo: "eter",
          cantidad: 2
        },
        efecto: "destroy",
        objetivo: {
          tipo: "mistica",
          controlador: "rival",
          zona: "campo"
        },
        texto: "Al activar esta habilidad, puedes pagar 2 \xC9ter, destruye 1 M\xEDstica que controla el rival, una vez por turno.",
        duracion: "1_por_turno"
      }
    ]
  },
  {
    id: "DS-013",
    name: "Varek, Cazador de Agotados",
    type: "Campe\xF3n",
    rarity: "Com\xFAn",
    keywords: [],
    flavorText: "El agotado ya est\xE1 muerto: solo falta cobrar.",
    paqueteId: "disonancia",
    limiteCopias: "3",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-22T21:05:35.592Z",
    facciones: [
      "Caos"
    ],
    esencia: "Abisal",
    roles: [
      "Normal"
    ],
    catHabilidad: [
      "Efecto"
    ],
    stats: {
      cost: 3,
      poder: 4,
      resistencia: 3
    },
    efectos: [
      {
        tipo: "disparo",
        trigger: "al_activar_habilidad",
        costo: {
          tipo: "eter",
          cantidad: 1
        },
        efecto: "destroy",
        objetivo: {
          tipo: "campeon",
          controlador: "rival",
          zona: "campo",
          filtros: {
            resMax: 3
          }
        },
        texto: "Al activar esta habilidad, puedes pagar 1 \xC9ter, destruye 1 Campe\xF3n RES 3 o menos que controla el rival, una vez por turno.",
        duracion: "1_por_turno"
      }
    ]
  },
  {
    id: "DS-014",
    name: "Thane, Voz del Trueno",
    type: "Campe\xF3n",
    rarity: "Poco Com\xFAn",
    keywords: [
      "Protector"
    ],
    flavorText: "El trueno abre paso a los suyos.",
    paqueteId: "disonancia",
    limiteCopias: "2",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z",
    facciones: [
      "Caos"
    ],
    esencia: "Abisal",
    roles: [
      "Soporte"
    ],
    catHabilidad: [
      "Efecto"
    ],
    stats: {
      cost: 3,
      poder: 3,
      resistencia: 7
    },
    efectos: [
      {
        tipo: "pasivo",
        trigger: "ninguno",
        efecto: "buff",
        stats: {
          ATQ: 1
        },
        objetivo: {
          tipo: "todos_campeones_propios"
        },
        texto: "Los otros Campeones que controlas ganan 1 de ATQ."
      }
    ]
  },
  {
    id: "DS-015",
    name: "Marek, Cosecha del Nudo",
    type: "Campe\xF3n",
    rarity: "Poco Com\xFAn",
    keywords: [
      "Recarga"
    ],
    flavorText: "Cada nudo que aprieta el norte lo alimenta.",
    paqueteId: "disonancia",
    limiteCopias: "2",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z",
    facciones: [
      "Caos"
    ],
    esencia: "Abisal",
    roles: [
      "Normal"
    ],
    catHabilidad: [
      "Efecto"
    ],
    stats: {
      cost: 3,
      poder: 5,
      resistencia: 4
    },
    efectos: [
      {
        tipo: "pasivo",
        trigger: "ninguno",
        efecto: "buff",
        buffPerBlockedEther: true,
        stats: {
          ATQ: 1
        },
        objetivo: {
          tipo: "campeon",
          controlador: "rival",
          zona: "campo"
        },
        texto: "Mientras un Campe\xF3n que controla el rival tenga al menos 1 \xC9ter bloqueado, esta carta gana 1 de ATQ (m\xE1x. +3)."
      }
    ]
  },
  {
    id: "DS-016",
    name: "Korr, Viento del Sur",
    type: "Campe\xF3n",
    rarity: "Com\xFAn",
    keywords: [],
    flavorText: "El sur empuja a los suyos hacia adelante.",
    paqueteId: "disonancia",
    limiteCopias: "3",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z",
    facciones: [
      "Caos"
    ],
    esencia: "Abisal",
    roles: [
      "Soporte"
    ],
    catHabilidad: [
      "Efecto"
    ],
    stats: {
      cost: 3,
      poder: 3,
      resistencia: 5
    },
    efectos: [
      {
        tipo: "disparo",
        trigger: "al_activar_habilidad",
        costo: {
          tipo: "eter_bloqueado",
          cantidad: 1
        },
        efecto: "buff",
        stats: {
          ATQ: 1
        },
        objetivo: {
          tipo: "todos_campeones_propios"
        },
        texto: "Puedes bloquear 1 \xC9ter para que los Campeones que controlas ganen 1 de ATQ mientras est\xE9 bloqueado.",
        duracion: "mientras_ester_bloqueado"
      }
    ]
  },
  {
    id: "DS-017",
    name: "Vorlag, El Que Aprieta",
    type: "Campe\xF3n",
    rarity: "Poco Com\xFAn",
    keywords: [],
    flavorText: "El Nudo cobra lo que el norte bloquea.",
    paqueteId: "disonancia",
    limiteCopias: "2",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-24T05:33:27.061Z",
    facciones: [
      "Caos"
    ],
    esencia: "Abisal",
    roles: [
      "\xC9ter"
    ],
    catHabilidad: [
      "Efecto"
    ],
    stats: {
      cost: 4,
      poder: 4,
      resistencia: 5
    },
    efectos: [
      {
        tipo: "disparo",
        efecto: "mover",
        objetivo: {
          tipo: "eter",
          controlador: "rival",
          zona: "pagado",
          zonaDestino: "reserva"
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Bloquea 3 \xC9ter, mueve 1 \xC9ter que controla el rival de la zona de pago a tu Reserva, mientras ese \xC9ter est\xE9 bloqueado.",
        costo: {
          tipo: "bloqueo_fijo",
          cantidad: 3
        },
        duracion: "mientras_ester_bloqueado"
      }
    ]
  },
  {
    id: "DS-018",
    name: "Skarn, Rompev\xEDnculos",
    type: "Campe\xF3n",
    rarity: "Com\xFAn",
    keywords: [],
    flavorText: "Los v\xEDnculos del norte se rompen como el hielo.",
    paqueteId: "disonancia",
    limiteCopias: "3",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-21T00:00:00.000Z",
    facciones: [
      "Caos"
    ],
    esencia: "Abisal",
    roles: [
      "Soporte"
    ],
    catHabilidad: [
      "Efecto"
    ],
    stats: {
      cost: 4,
      poder: 3,
      resistencia: 6
    },
    efectos: [
      {
        tipo: "pasivo",
        trigger: "inicio_choque",
        efecto: "destroy",
        objetivo: {
          tipo: "vinculo",
          controlador: "rival",
          zona: "campo"
        },
        texto: "Una vez por turno, al inicio de tu Choque, si controlas otro Campe\xF3n, destruye un V\xEDnculo que controla el rival.",
        duracion: "1_por_turno"
      }
    ]
  },
  {
    id: "DS-019",
    name: "Tormenta del Sur",
    type: "M\xEDstica",
    rarity: "Com\xFAn",
    keywords: [],
    flavorText: "La tormenta no negocia: arrasa.",
    paqueteId: "disonancia",
    limiteCopias: "3",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-22T21:06:01.065Z",
    facciones: [
      "Caos"
    ],
    stats: {
      cost: 2
    },
    efectos: [
      {
        tipo: "hechizo",
        efecto: "destroy",
        objetivo: {
          tipo: "campeon",
          controlador: "rival",
          zona: "campo",
          filtros: {
            resMax: 3
          }
        },
        texto: "Destruye 1 Campe\xF3n RES 3 o menos que controla el rival."
      }
    ]
  },
  {
    id: "DS-020",
    name: "Grito del Nudo",
    type: "M\xEDstica",
    rarity: "Com\xFAn",
    keywords: [],
    flavorText: "El Nudo aprieta: el aliento del rival se acorta.",
    paqueteId: "disonancia",
    limiteCopias: "3",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-22T21:06:58.050Z",
    stats: {
      cost: 1
    },
    efectos: [
      {
        tipo: "hechizo",
        efecto: "debuff",
        stats: {
          ATQ: 3
        },
        objetivo: {
          tipo: "campeon",
          controlador: "rival",
          zona: "campo"
        },
        texto: "Un Campe\xF3n que controla el rival pierde 3 de ATQ, hasta el final del turno.",
        duracion: "turno"
      }
    ]
  },
  {
    id: "DS-021",
    name: "El Nudo Aprieta",
    type: "M\xEDstica",
    rarity: "Com\xFAn",
    keywords: [
      "Artefacto"
    ],
    flavorText: "Cada cristal que el norte ancla, el sur lo aprieta.",
    paqueteId: "disonancia",
    limiteCopias: "3",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-22T21:30:39.855Z",
    stats: {
      cost: 1
    },
    efectos: [
      {
        tipo: "hechizo",
        efecto: "buff",
        objetivo: {
          tipo: "equipped_champion",
          controlador: "propio",
          zona: "campo"
        },
        stats: {
          ATQ: 3,
          RES: 0
        },
        texto: "El Campe\xF3n equipado con esta carta gana 3 de ATQ."
      }
    ]
  },
  {
    id: "DS-022",
    name: "Maldici\xF3n del Sur",
    type: "M\xEDstica",
    rarity: "Com\xFAn",
    keywords: [
      "Artefacto"
    ],
    flavorText: "El sur no llora a sus muertos: los cobra.",
    paqueteId: "disonancia",
    limiteCopias: "3",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-22T21:40:36.428Z",
    stats: {
      cost: 3
    },
    efectos: [
      {
        tipo: "hechizo",
        efecto: "invocar_y_equipar",
        objetivo: {
          tipo: "campeon",
          controlador: "propio",
          zona: "exilio",
          filtros: {
            faccion: "Caos",
            costeMax: 5
          }
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Puedes pagar 3 \xC9ter, invoca un Campe\xF3n de facci\xF3n Caos de coste 5 \xE9ter o menos del Exilio de su due\xF1o y equipa esta carta a ese Campe\xF3n.",
        zonaOrigen: "exilio",
        costo: {
          tipo: "eter",
          cantidad: 3
        }
      }
    ]
  },
  {
    id: "DS-023",
    name: "El Nudo",
    type: "Arcana",
    rarity: "Rara",
    keywords: [],
    flavorText: "El Nudo aprieta cuando el Eje tiembla. Y el Eje siempre tiembla.",
    paqueteId: "disonancia",
    limiteCopias: "3",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-22T21:43:48.000Z",
    facciones: [
      "Caos"
    ],
    stats: {
      cost: 3
    },
    condicion: {
      trigger: "inicio_choque",
      condiciones: [
        {
          tipo: "rival_controla_minimo",
          cantidad: 3,
          objetivo: {
            tipo: "campeon",
            controlador: "rival",
            filtros: {
              conEterBloqueado: true
            }
          }
        }
      ]
    },
    recompensa: "Un Campe\xF3n que controla el rival pierde 3 de RES de forma permanente. Roba 1 carta.",
    efectos: [
      {
        tipo: "hechizo",
        efecto: "debuff",
        stats: {
          RES: 3
        },
        duracion: "permanente",
        objetivo: {
          tipo: "campeon",
          controlador: "rival",
          zona: "campo"
        },
        texto: "Un Campe\xF3n que controla el rival pierde 3 de RES, de forma permanente."
      },
      {
        tipo: "hechizo",
        efecto: "draw",
        cantidad: 1,
        objetivo: {
          tipo: "carta"
        },
        texto: "Roba 1 carta."
      }
    ]
  },
  {
    id: "DS-024",
    name: "Golpe del Nudo",
    type: "Arcana",
    rarity: "Com\xFAn",
    keywords: [],
    flavorText: "El golpe no recompensa: cobra.",
    paqueteId: "disonancia",
    limiteCopias: "3",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-22T21:44:39.977Z",
    stats: {
      cost: 1
    },
    condicion: {
      trigger: "activacion",
      condiciones: [
        {
          tipo: "controlar_minimo",
          cantidad: 2,
          objetivo: {
            tipo: "campeon",
            controlador: "propio"
          }
        }
      ]
    },
    recompensa: "Un Campe\xF3n que controlas gana 2 de ATQ hasta el final del turno. Si destruye a un Campe\xF3n que controla el rival este turno, el rival pierde 1 carta de su mano al azar.",
    efectos: [
      {
        tipo: "hechizo",
        efecto: "buff",
        stats: {
          ATQ: 2,
          RES: 2
        },
        duracion: "turno",
        objetivo: {
          tipo: "campeon",
          controlador: "propio",
          zona: "campo"
        },
        texto: "Un Campe\xF3n que controles gana 2 de ATQ y 2 de RES, hasta el final del turno."
      }
    ]
  },
  {
    id: "DS-025",
    name: "Primer Nudo",
    type: "V\xEDnculo",
    rarity: "Com\xFAn",
    keywords: [],
    flavorText: "El primer nudo at\xF3 el sur al Caos.",
    paqueteId: "disonancia",
    limiteCopias: "1",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-22T22:00:25.165Z",
    stats: {
      cost: 0
    },
    efectos: [
      {
        tipo: "vinculo",
        trigger: "inicio_alba",
        efecto: "buff",
        stats: {
          ATQ: 2
        },
        objetivo: {
          tipo: "campeon",
          controlador: "propio",
          zona: "campo"
        },
        texto: "Al inicio de tu Alba, un Campe\xF3n que controles gana 2 de ATQ, hasta el final del turno.",
        duracion: "turno"
      }
    ]
  },
  {
    id: "DS-026",
    name: "Heredad de Caos",
    type: "V\xEDnculo",
    rarity: "Com\xFAn",
    keywords: [],
    flavorText: "El sur no hereda: arrebata.",
    paqueteId: "disonancia",
    limiteCopias: "1",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-10-01T23:56:39.123Z",
    stats: {
      cost: 0
    },
    efectos: [
      {
        tipo: "vinculo",
        efecto: "rival_discard",
        objetivo: {
          tipo: "carta",
          controlador: "rival",
          zona: "mano"
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Al inicio de tu Alba, puedes descartar una carta de la mano del rival, una vez por turno.",
        duracion: "1_por_turno",
        trigger: "inicio_alba"
      }
    ]
  },
  {
    id: "DS-027",
    name: "Refugio del Nudo",
    type: "V\xEDnculo",
    rarity: "Com\xFAn",
    keywords: [],
    flavorText: "Lo que el norte pag\xF3, el sur lo devuelve.",
    paqueteId: "disonancia",
    limiteCopias: "1",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-10-01T23:57:22.156Z",
    stats: {
      cost: 0
    },
    efectos: [
      {
        tipo: "vinculo",
        efecto: "mover",
        objetivo: {
          tipo: "eter",
          controlador: "rival",
          zona: "reserva",
          zonaDestino: "pagado",
          controladorDestino: "rival"
        },
        zonaDestino: "reserva",
        cantidad: 2,
        esHasta: true,
        texto: "Al inicio del Choque del rival, puedes mover hasta 2 \xC9ter que controla el rival de la Reserva a la zona de pago del rival, una vez por turno.",
        duracion: "1_por_turno",
        trigger: "inicio_choque",
        controladorTrigger: "rival"
      }
    ]
  },
  {
    id: "DS-028",
    name: "Cristal del Nudo",
    type: "V\xEDnculo",
    rarity: "Poco Com\xFAn",
    keywords: [],
    flavorText: "El cristal del sur no brilla: aguanta.",
    paqueteId: "disonancia",
    limiteCopias: "1",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-29T00:49:28.982Z",
    stats: {
      cost: 0
    },
    efectos: [
      {
        tipo: "vinculo",
        efecto: "grant_keyword",
        objetivo: {
          tipo: "campeon",
          controlador: "propio",
          zona: "campo"
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Al inicio de tu Alba, un Campe\xF3n que controles puedes ganar Indestructible, hasta la pr\xF3xima Forja del rival.",
        duracion: "hasta_fase",
        duracionFase: "forja",
        duracionControlador: "rival",
        keyword: "Indestructible",
        trigger: "inicio_alba"
      }
    ]
  },
  {
    id: "DS-029",
    name: "Voz del Nudo",
    type: "V\xEDnculo",
    rarity: "Poco Com\xFAn",
    keywords: [],
    flavorText: "El Nudo no devuelve lo que cobra.",
    paqueteId: "disonancia",
    limiteCopias: "1",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-23T04:29:18.291Z",
    stats: {
      cost: 0
    },
    efectos: [
      {
        tipo: "vinculo",
        efecto: "exile",
        objetivo: {
          tipo: "campeon",
          controlador: "ambos",
          zona: "cementerio"
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Al inicio de tu Alba, puedes exiliar 1 Campe\xF3n de cualquier Cementerio, una vez por turno.",
        trigger: "inicio_alba",
        duracion: "1_por_turno"
      }
    ]
  },
  {
    id: "DS-030",
    name: "Grito del Primog\xE9nito",
    type: "V\xEDnculo",
    rarity: "Rara",
    keywords: [],
    flavorText: "El primer grito del sur todav\xEDa rompe.",
    paqueteId: "disonancia",
    limiteCopias: "1",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-10-02T00:21:14.360Z",
    stats: {
      cost: 0
    },
    efectos: [
      {
        tipo: "vinculo",
        efecto: "buff",
        stats: {
          RES: 4
        },
        duracion: "mientras_en_campo",
        objetivo: {
          tipo: "campeon",
          controlador: "propio",
          zona: "campo",
          filtros: {
            seleccionar: {
              stat: "resistencia",
              orden: "menor"
            }
          }
        },
        texto: "El Campe\xF3n con menor RES gana 4 de RES, mientras esta carta est\xE9 en el campo."
      }
    ]
  },
  {
    id: "DS-031",
    name: "Emisario del Nudo, Voz del Sur",
    type: "Campe\xF3n",
    rarity: "Poco Com\xFAn",
    keywords: [],
    flavorText: "El Nudo cobra, y el Nudo reparte.",
    paqueteId: "disonancia",
    limiteCopias: "2",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-23T04:37:25.717Z",
    facciones: [
      "Caos"
    ],
    esencia: "Abisal",
    roles: [
      "Normal"
    ],
    catHabilidad: [
      "Efecto"
    ],
    stats: {
      cost: 2,
      poder: 4,
      resistencia: 3
    },
    efectos: [
      {
        tipo: "pasivo",
        trigger: "al_ser_enviado_al_cementerio",
        triggerZona: "cualquier_zona",
        efecto: "tutor",
        cantidad: 1,
        objetivo: {
          tipo: "campeon",
          controlador: "propio",
          zona: "mazo",
          filtros: {
            costeMax: 2
          },
          zonaDestino: "mano"
        },
        zonaDestino: "mano",
        texto: "Al ser enviada al Cementerio desde cualquier zona, puedes buscar 1 Campe\xF3n coste 2 o menos de tu mazo y agregalo a tu mano."
      }
    ]
  },
  {
    id: "DS-032",
    name: "El Nudo Desata",
    type: "Arcana",
    rarity: "Poco Com\xFAn",
    keywords: [],
    flavorText: "El Nudo se desata cuando la tormenta aprieta.",
    paqueteId: "disonancia",
    limiteCopias: "2",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-23T04:40:37.001Z",
    stats: {
      cost: 3
    },
    condicion: {
      trigger: "inicio_choque",
      condiciones: [
        {
          tipo: "controlar_minimo",
          cantidad: 2,
          objetivo: {
            tipo: "campeon",
            controlador: "propio",
            filtros: {
              conEterBloqueado: true
            }
          }
        }
      ]
    },
    recompensa: "Agrega de tu cementerio a tu mano 1 carta de coste 3 o menos.",
    efectos: [
      {
        tipo: "hechizo",
        efecto: "tutor",
        cantidad: 1,
        objetivo: {
          tipo: "carta",
          controlador: "propio",
          zona: "cementerio",
          filtros: {
            costeMax: 3
          },
          zonaDestino: "mano"
        },
        zonaDestino: "mano",
        texto: "Busca 1 carta coste 3 o menos de tu Cementerio y agregalo a tu mano."
      }
    ]
  },
  {
    id: "DS-033",
    name: "Invocaci\xF3n del Sur",
    type: "M\xEDstica",
    rarity: "Rara",
    keywords: [],
    flavorText: "El sur no llama dos veces.",
    paqueteId: "disonancia",
    limiteCopias: "1",
    createdAt: "2026-08-03T00:00:00.000Z",
    updatedAt: "2026-09-23T04:41:34.498Z",
    facciones: [
      "Caos"
    ],
    stats: {
      cost: 3
    },
    efectos: [
      {
        tipo: "hechizo",
        efecto: "tutor",
        cantidad: 1,
        objetivo: {
          tipo: "campeon",
          controlador: "propio",
          zona: "mazo",
          filtros: {
            costeMax: 4
          },
          zonaDestino: "mano"
        },
        zonaDestino: "mano",
        texto: "Busca 1 Campe\xF3n coste 4 o menos de tu mazo y agregalo a tu mano."
      }
    ]
  }
];

// src/shared/data/paquetes.ts
var ALL_CARDS = PrimerColeccionEfectos_default;
var ESTASIS_CARDS = ALL_CARDS.filter((c) => c.paqueteId === "estasis");
var DISONANCIA_CARDS = ALL_CARDS.filter((c) => c.paqueteId === "disonancia");
var PAQUETES = [
  {
    id: "estasis",
    nombre: "Est\xE1sis",
    tipo: "Mazo Tem\xE1tico",
    color: FACCION_COLORS.Orden,
    facciones: ["Orden"],
    entrega: "Primog\xE9nitos",
    distribucion: { eter: 15, principal: 45, vinculos: 6 },
    lore: 'Est\xE1sis ("El Ancla") es el mazo tem\xE1tico de la facci\xF3n Orden y la primera entrega de Los Primog\xE9nitos. Antes de la Gran Escisi\xF3n, cuando las facciones a\xFAn no hab\xEDan tomado sus nombres, el polo del norte se llamaba Est\xE1sis: el Ancla y el Eje de la realidad. De la tensi\xF3n entre los polos del \xC9ter nacieron los Primog\xE9nitos del \xC9ter: los primeros seres humanos en fusionarse con la energ\xEDa primigenia, cada uno elegido al nacer por su casa noble para portar un cristal de \xC9ter. En esta primera entrega, las primog\xE9nitas de Orden son mujeres y los primog\xE9nitos de Caos, hombres. Aurora, la Primog\xE9nita, fue la primera de todas y su sangre se convirti\xF3 en la fuente del poder de las casas.\n\nCuando la Gran Escisi\xF3n parti\xF3 el Eje y las casas cayeron en la guerra, las primog\xE9nitas del norte se negaron a elegir bando y formaron una hermandad errante, unidas por la sangre y el \xC9ter: "No somos hijos de ning\xFAn reino. Somos el Reino."\n\nEl mazo juega con la econom\xEDa de \xC9ter: bloquear, devolver y reciclar recursos mientras los Campeones se fortalecen con cada cristal anclado.'
  },
  {
    id: "disonancia",
    nombre: "Disonancia",
    tipo: "Mazo Tem\xE1tico",
    color: FACCION_COLORS.Caos,
    facciones: ["Caos"],
    entrega: "Primog\xE9nitos",
    distribucion: { eter: 15, principal: 45, vinculos: 6 },
    lore: 'Disonancia ("La Tormenta") es el mazo tem\xE1tico de la facci\xF3n Caos y la segunda entrega de Los Primog\xE9nitos. En el sur, donde el Eje termina en un Nudo, los primog\xE9nitos de Caos son hombres: despertaron con el cristal del Nudo clavado en el pecho, y el Nudo aprieta cada vez que el Eje tiembla. Mientras Est\xE1sis ancla, Disonancia aprieta: la Tormenta no retiene lo que toma, lo rompe y lo suelta. Ragnar, Voz del Nudo, es el primero de todos \u2014 el hombre que habla por el sur y el \xFAnico capaz de mirar a Aurora sin pesta\xF1ear.\n\nEl mazo juega con la presi\xF3n y la destrucci\xF3n: romper los Campeones del rival y estrangular su econom\xEDa de \xC9ter mientras los Campeones de Caos avanzan como la tormenta que no se detiene.'
  }
];
var CARD_ART_IDS = /* @__PURE__ */ new Set([
  ...ESTASIS_CARDS.map((c) => c.id),
  ...DISONANCIA_CARDS.map((c) => c.id)
]);

// src/online/game/cards.ts
var INDICE_CARTAS = new Map(ALL_CARDS.map((c) => [c.id, c]));
function getCardMeta(cardId) {
  return INDICE_CARTAS.get(cardId) ?? null;
}
function registrarCartas(cartas) {
  for (const c of cartas) {
    if (c?.id) INDICE_CARTAS.set(c.id, c);
  }
}
function faccionesCompartidas(a, b) {
  if (!a || a.length === 0 || !b || b.length === 0) return true;
  return a.some((f) => b.includes(f));
}
function esCampeon(card) {
  return card.type === "Campe\xF3n";
}
function esMistica(card) {
  return card.type === "M\xEDstica";
}
function esArcana(card) {
  return card.type === "Arcana";
}
function esEter(card) {
  return card.type === "\xC9ter";
}
function esVinculo(card) {
  return card.type === "V\xEDnculo";
}
function costeEterHabilidad(card) {
  if ("efectos" in card && card.efectos) {
    const disparo = card.efectos.find((e) => e.tipo === "disparo");
    if (disparo?.costo?.cantidad !== void 0) return disparo.costo.cantidad;
    const continuo = card.efectos.find((e) => e.tipo === "continuo");
    if (continuo?.costo?.cantidad !== void 0) return continuo.costo.cantidad;
  }
  return 0;
}
function campeonNecesitaEterBloqueado(card) {
  return cartaNecesitaEterBloqueado(card);
}
function cartaNecesitaEterBloqueado(card) {
  if ("efectos" in card && card.efectos) {
    for (const e of card.efectos) {
      if (e.costo?.tipo === "eter_bloqueado" || e.costo?.tipo === "bloqueo_fijo") return true;
    }
  }
  return false;
}

// src/shared/rng.ts
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// src/online/game/rng.ts
function createCtx(seed) {
  const rand = mulberry32(seed);
  let eventos = [];
  let draws = 0;
  return {
    next: () => {
      draws += 1;
      return rand();
    },
    emit: (e) => {
      eventos.push(e);
    },
    get events() {
      return eventos;
    },
    get draws() {
      return draws;
    }
  };
}
function createCtxFromDraws(seed, draws) {
  const ctx = createCtx(seed);
  for (let i = 0; i < draws; i++) ctx.next();
  return ctx;
}
function shuffleFisherYates(rng, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

// src/online/game/initialState.ts
var DIST_ETER = 15;
var DIST_PRINCIPAL = 45;
var DIST_VINCULOS = 6;
var MANO_INICIAL = 5;
var TOTAL_MAZO = DIST_ETER + DIST_PRINCIPAL + DIST_VINCULOS;
function crearPlayerState(id) {
  return {
    id,
    mano: [],
    mazo: [],
    cementerio: [],
    exilio: [],
    eterReserva: [],
    eterPagado: [],
    campo: {
      campeones: [null, null, null, null, null],
      misticasTacticas: [null, null, null],
      arcanasCombate: [null, null, null]
    },
    vinculos: [null, null, null, null, null, null],
    mulliganUsado: false
  };
}
function tipoDe(cardId) {
  return getCardMeta(cardId)?.type;
}
function validarDeck(deck, nombre) {
  if (deck.length !== TOTAL_MAZO) {
    throw new Error(`Mazo ${nombre} inv\xE1lido: ${deck.length} cartas (se esperaban ${TOTAL_MAZO})`);
  }
  const eter = deck.filter((id) => tipoDe(id) === "\xC9ter").length;
  const vinculos = deck.filter((id) => tipoDe(id) === "V\xEDnculo").length;
  const principal = deck.length - eter - vinculos;
  if (eter !== DIST_ETER || principal !== DIST_PRINCIPAL || vinculos !== DIST_VINCULOS) {
    throw new Error(
      `Mazo ${nombre} inv\xE1lido: ${eter} \xC9ter + ${principal} Principal + ${vinculos} V\xEDnculos (se esperaban 15/45/6)`
    );
  }
  for (const id of deck) {
    if (!getCardMeta(id)) throw new Error(`Mazo ${nombre} inv\xE1lido: cardId desconocido "${id}"`);
  }
}
function validarOrdenVinculos(orden, vinculoIdsDeck, instances) {
  const cardIdsDeck = vinculoIdsDeck.map((id) => instances[id].cardId);
  if (orden.length !== DIST_VINCULOS) {
    throw new Error(`Orden de V\xEDnculos inv\xE1lido: ${orden.length} cartas (se esperaban ${DIST_VINCULOS})`);
  }
  const setDeck = new Set(cardIdsDeck);
  for (const cardId of orden) {
    if (!setDeck.has(cardId)) throw new Error(`Orden de V\xEDnculos inv\xE1lido: "${cardId}" no es un V\xEDnculo de este mazo`);
  }
  if (new Set(orden).size !== orden.length) {
    throw new Error("Orden de V\xEDnculos inv\xE1lido: cartas duplicadas");
  }
}
function createInitialState(deckA, deckB, seed, opts) {
  validarDeck(deckA, "A");
  validarDeck(deckB, "B");
  const ctx = createCtx(seed);
  const state = {
    version: 1,
    seed,
    fase: "pre_partida",
    turno: "A",
    primerJugador: "A",
    // se decide con la moneda (extracción 99)
    primerTurno: true,
    instances: {},
    players: { A: crearPlayerState("A"), B: crearPlayerState("B") }
  };
  let n = 1;
  const registrarDeck = (owner, deck) => {
    const ids = [];
    for (const cardId of deck) {
      const cardInstanceId = `c${n++}`;
      state.instances[cardInstanceId] = { cardInstanceId, cardId, owner };
      ids.push(cardInstanceId);
    }
    return ids;
  };
  const idsA = registrarDeck("A", deckA);
  const idsB = registrarDeck("B", deckB);
  const clasificar = (ids) => {
    const eter = [];
    const principal = [];
    const vinculo = [];
    for (const id of ids) {
      const tipo = tipoDe(state.instances[id].cardId);
      if (tipo === "\xC9ter") eter.push(id);
      else if (tipo === "V\xEDnculo") vinculo.push(id);
      else principal.push(id);
    }
    return { eter, principal, vinculo };
  };
  const a = clasificar(idsA);
  const b = clasificar(idsB);
  const mazoABarajado = shuffleFisherYates(ctx, a.principal);
  const mazoBBarajado = shuffleFisherYates(ctx, b.principal);
  shuffleFisherYates(ctx, a.vinculo);
  shuffleFisherYates(ctx, b.vinculo);
  state.primerJugador = ctx.next() < 0.5 ? "A" : "B";
  const montarZonas = (jugador, grupos, mazoBarajado, ordenVinculos) => {
    const p = state.players[jugador];
    p.eterReserva = grupos.eter;
    const orden = ordenVinculos ?? grupos.vinculo.map((id) => state.instances[id].cardId);
    validarOrdenVinculos(orden, grupos.vinculo, state.instances);
    const porCardId = new Map(grupos.vinculo.map((id) => [state.instances[id].cardId, id]));
    p.vinculos = orden.map((cardId) => porCardId.get(cardId));
    p.mano = mazoBarajado.slice(0, MANO_INICIAL);
    p.mazo = mazoBarajado.slice(MANO_INICIAL);
  };
  montarZonas("A", a, mazoABarajado, opts?.vinculosA);
  montarZonas("B", b, mazoBBarajado, opts?.vinculosB);
  return { state, ctx };
}

// src/online/game/campo.ts
function sacrificiosRequeridos(roles) {
  if (!roles) return 0;
  if (roles.includes("Soberano")) return 1;
  if (roles.includes("Emperador")) return 2;
  return 0;
}
function esSingular(card) {
  return card.type === "Campe\xF3n" && (card.catHabilidad?.includes("Singular") ?? false);
}
function copiasEnCampo(state, jugador, cardId) {
  const p = state.players[jugador];
  return p.campo.campeones.filter((id) => id !== null && state.instances[id]?.cardId === cardId).length;
}
function campeonesSacrificables(state, jugador, campeonCardId) {
  const meta = getCardMeta(campeonCardId);
  if (!meta) return [];
  const p = state.players[jugador];
  return p.campo.campeones.filter((id) => {
    if (!id) return false;
    const inst = state.instances[id];
    const m = inst?.cardId ? getCardMeta(inst.cardId) : null;
    return m !== null && esCampeon(m) && faccionesCompartidas(m.facciones, meta.facciones);
  });
}

// src/online/game/targetResolver.ts
function resolveTargets(s, objetivo, jugador) {
  const { tipo, controlador, zona, filtros } = objetivo;
  const baseTargets = getTargetsByZone(s, tipo, zona, controlador, jugador);
  if (controlador === "rival" && tipo === "campeon" && zona === "campo") {
    const rival = jugador === "A" ? "B" : "A";
    const rivalChamps = s.players[rival].campo.campeones.filter((id) => id !== null);
    const hasProtector = rivalChamps.some((id) => {
      const inst = s.instances[id];
      const meta = inst?.cardId ? getCardMeta(inst.cardId) : null;
      return meta !== null && esCampeon(meta) && meta.keywords?.includes("Protector");
    });
    if (hasProtector) {
      return rivalChamps.filter((id) => {
        const inst = s.instances[id];
        const meta = inst?.cardId ? getCardMeta(inst.cardId) : null;
        return meta !== null && esCampeon(meta) && meta.keywords?.includes("Protector");
      });
    }
  }
  const filtered = applyFilters(s, baseTargets, filtros);
  if (filtros?.seleccionar) {
    return selectByRanking(s, filtered, filtros.seleccionar);
  }
  return filtered;
}
function getTargetsByZone(s, tipo, zona, controlador, jugador) {
  const rival = jugador === "A" ? "B" : "A";
  const playersToCheck = controlador === "ambos" ? ["A", "B"] : controlador === "rival" ? [rival] : controlador === "ninguno" ? [] : [jugador];
  if (tipo === "self") {
    return [];
  }
  if (tipo === "todos_campeones_propios") {
    return s.players[jugador].campo.campeones.filter((id) => id !== null);
  }
  if (tipo === "todos_campeones_rivales") {
    return s.players[rival].campo.campeones.filter((id) => id !== null);
  }
  if (tipo === "equipped_champion") {
    const allChampions = [
      ...s.players.A.campo.campeones,
      ...s.players.B.campo.campeones
    ].filter((id) => id !== null);
    return allChampions.filter((id) => {
      const inst = s.instances[id];
      return inst?.equipadoA !== void 0;
    });
  }
  if (tipo === "rival_hand") {
    return [rival];
  }
  const targets = [];
  for (const player of playersToCheck) {
    const p = s.players[player];
    switch (zona) {
      case "campo": {
        if (tipo === "campeon" || tipo === "carta" || tipo === "mano") {
          targets.push(...p.campo.campeones.filter((id) => id !== null));
        }
        if (tipo === "mistica" || tipo === "mistica_arcana" || tipo === "carta") {
          targets.push(...p.campo.misticasTacticas.filter((id) => id !== null));
        }
        if (tipo === "arcana" || tipo === "mistica_arcana" || tipo === "carta") {
          targets.push(...p.campo.arcanasCombate.filter((id) => id !== null));
        }
        break;
      }
      case "cementerio": {
        targets.push(...p.cementerio.filter((id) => id !== null));
        break;
      }
      case "exilio": {
        targets.push(...p.exilio.filter((id) => id !== null));
        break;
      }
      case "reserva": {
        if (tipo === "eter") {
          targets.push(...p.eterReserva.filter((id) => id !== null));
        }
        break;
      }
      case "pagado": {
        if (tipo === "eter") {
          targets.push(...p.eterPagado.filter((id) => id !== null));
        }
        break;
      }
      case "bloqueado": {
        if (tipo === "eter") {
          for (const champId of p.campo.campeones) {
            if (champId === null) continue;
            const inst = s.instances[champId];
            if (inst?.eterBloqueado) {
              targets.push(...inst.eterBloqueado);
            }
          }
        }
        break;
      }
      case "mano": {
        targets.push(...p.mano.filter((id) => id !== null));
        break;
      }
      case "mazo": {
        targets.push(...p.mazo.filter((id) => {
          if (id === null) return false;
          if (tipo === "carta") return true;
          const meta = s.instances[id]?.cardId ? getCardMeta(s.instances[id].cardId) : null;
          if (!meta) return false;
          if (tipo === "campeon") return esCampeon(meta);
          if (tipo === "mistica") return esMistica(meta);
          if (tipo === "arcana") return esArcana(meta);
          return true;
        }));
        break;
      }
    }
  }
  return targets;
}
function applyFilters(s, targets, filtros) {
  if (!filtros || Object.keys(filtros).length === 0) return targets;
  return targets.filter((id) => {
    const inst = s.instances[id];
    if (!inst) return false;
    const meta = inst.cardId ? getCardMeta(inst.cardId) : null;
    if (!meta) return false;
    if (filtros.faccion) {
      const card = meta;
      if ("facciones" in card && !card.facciones?.includes(filtros.faccion)) {
        return false;
      }
    }
    if (filtros.esencia) {
      const card = meta;
      if ("esencia" in card && card.esencia !== filtros.esencia) {
        return false;
      }
    }
    if (filtros.rol) {
      const card = meta;
      if ("roles" in card && !card.roles?.includes(filtros.rol)) {
        return false;
      }
    }
    if (filtros.costeMin !== void 0) {
      if (!meta.stats || meta.stats.cost < filtros.costeMin) return false;
    }
    if (filtros.costeMax !== void 0) {
      if (!meta.stats || meta.stats.cost > filtros.costeMax) return false;
    }
    if (esCampeon(meta)) {
      if (filtros.atqMax !== void 0) {
        if (!meta.stats || meta.stats.poder > filtros.atqMax) return false;
      }
      if (filtros.resMax !== void 0) {
        if (!meta.stats || meta.stats.resistencia > filtros.resMax) return false;
      }
    }
    if (filtros.agotado !== void 0) {
      if (inst.agotado !== filtros.agotado) return false;
    }
    if (filtros.conEterBloqueado !== void 0) {
      const hasBlocked = (inst.eterBloqueado?.length ?? 0) > 0;
      if (hasBlocked !== filtros.conEterBloqueado) return false;
    }
    if (filtros.puedeBloquearEter !== void 0) {
      if (!esCampeon(meta)) return false;
    }
    if (filtros.equipado !== void 0) {
      const isEquipped = inst.equipadoA !== void 0;
      if (isEquipped !== filtros.equipado) return false;
    }
    if (filtros.keyword) {
      const keywords = meta.keywords ?? [];
      if (!keywords.includes(filtros.keyword)) return false;
    }
    if (filtros.catHabilidad) {
      const card = meta;
      if ("catHabilidad" in card && !card.catHabilidad?.includes(filtros.catHabilidad)) {
        return false;
      }
    }
    return true;
  });
}
function selectByRanking(s, targets, seleccionar) {
  if (targets.length === 0) return [];
  const sorted = [...targets].sort((a, b) => {
    const metaA = s.instances[a]?.cardId ? getCardMeta(s.instances[a].cardId) : null;
    const metaB = s.instances[b]?.cardId ? getCardMeta(s.instances[b].cardId) : null;
    let valueA = 0;
    let valueB = 0;
    if (seleccionar.stat === "coste") {
      valueA = metaA?.stats?.cost ?? 0;
      valueB = metaB?.stats?.cost ?? 0;
    } else if (metaA && metaB && esCampeon(metaA) && esCampeon(metaB)) {
      valueA = seleccionar.stat === "poder" ? metaA.stats?.poder ?? 0 : metaA.stats?.resistencia ?? 0;
      valueB = seleccionar.stat === "poder" ? metaB.stats?.poder ?? 0 : metaB.stats?.resistencia ?? 0;
    }
    return seleccionar.orden === "mayor" ? valueB - valueA : valueA - valueB;
  });
  return [sorted[0]];
}

// src/online/game/replacements.ts
function keywordsDe(s, id) {
  const inst = s.instances[id];
  const cardId = inst?.cardId;
  const meta = cardId ? getCardMeta(cardId) : null;
  const deData = meta && esCampeon(meta) ? meta.keywords : [];
  return [.../* @__PURE__ */ new Set([...deData, ...inst?.keywords ?? []])];
}
function moverAlCementerio(s, cardInstanceId) {
  const inst = s.instances[cardInstanceId];
  if (!inst) return;
  for (const j of ["A", "B"]) {
    const p2 = s.players[j];
    for (const grupo of ["campeones", "misticasTacticas", "arcanasCombate"]) {
      const idx = p2.campo[grupo].indexOf(cardInstanceId);
      if (idx !== -1) {
        p2.campo[grupo][idx] = null;
        break;
      }
    }
  }
  liberarEterBloqueadoCore(s, cardInstanceId, "1A");
  const p = s.players[inst.owner];
  if (!p.cementerio.includes(cardInstanceId)) p.cementerio.push(cardInstanceId);
}
function enviarAlCementerio(s, ctx, cardInstanceId) {
  const inst = s.instances[cardInstanceId];
  if (!inst) return;
  if (inst.vinculadoA) {
    const vinculadoId = inst.vinculadoA;
    inst.vinculadoA = void 0;
    const p = s.players[inst.owner];
    const slotIdx = p.campo.campeones.indexOf(vinculadoId);
    if (slotIdx !== -1) {
      p.campo.campeones[slotIdx] = null;
      ctx.emit({ type: "carta_salida_de_zona", cardInstanceId: vinculadoId, zona: `2${String.fromCharCode(66 + slotIdx)}`, jugador: inst.owner });
      enviarAlCementerio(s, ctx, vinculadoId);
      ctx.emit({ type: "carta_entrada_a_zona", cardInstanceId: vinculadoId, zona: "2G", jugador: inst.owner, bocaArriba: true });
    }
  }
  if (inst.cardId) {
    const meta = getCardMeta(inst.cardId);
    if (meta && esCampeon(meta)) {
      for (const otherId of Object.keys(s.instances)) {
        const other = s.instances[otherId];
        if (other && other.equipadoA === cardInstanceId) {
          other.equipadoA = void 0;
          moverAlCementerio(s, otherId);
          ctx.emit({ type: "carta_salida_de_zona", cardInstanceId: otherId, zona: "3A", jugador: other.owner });
          ctx.emit({ type: "carta_entrada_a_zona", cardInstanceId: otherId, zona: "2G", jugador: other.owner, bocaArriba: true });
        }
      }
    }
  }
  moverAlCementerio(s, cardInstanceId);
  liberarEterBloqueado(s, ctx, cardInstanceId, "1A");
  dispararTrigger(s, ctx, "al-ser-enviado-al-cementerio", inst.owner, [cardInstanceId]);
}
function liberarEterBloqueadoCore(s, cardInstanceId, destino) {
  const inst = s.instances[cardInstanceId];
  if (!inst?.eterBloqueado || inst.eterBloqueado.length === 0) return;
  const eteres = inst.eterBloqueado;
  delete inst.eterBloqueado;
  delete inst.efectoUmbralDisparado;
  delete inst.copyOneShotDisparado;
  if (inst.cardId) {
    const meta = getCardMeta(inst.cardId);
    const stealEfecto = meta && "efectos" in meta ? meta.efectos?.find((e) => e.efecto === "steal_champion") : void 0;
    if (stealEfecto?.duracion === "mientras_ester_bloqueado") {
      for (const other of Object.values(s.instances)) {
        if (other.stolenBy !== cardInstanceId) continue;
        const enCampoLadron = s.players[inst.owner].campo.campeones.includes(other.cardInstanceId);
        if (!enCampoLadron) {
          delete other.stolenBy;
          continue;
        }
        const duenoOriginal = other.owner;
        const campoOriginal = s.players[duenoOriginal].campo.campeones;
        const slotLibre = campoOriginal.indexOf(null);
        if (slotLibre !== -1 && duenoOriginal !== inst.owner) {
          const idxLadron = s.players[inst.owner].campo.campeones.indexOf(other.cardInstanceId);
          if (idxLadron !== -1) s.players[inst.owner].campo.campeones[idxLadron] = null;
          campoOriginal[slotLibre] = other.cardInstanceId;
        }
        delete other.stolenBy;
      }
    }
  }
  const p = s.players[inst.owner];
  if (destino === "2A") {
    p.eterReserva.push(...eteres);
  } else {
    p.eterPagado.push(...eteres);
  }
}
function liberarEterBloqueado(s, _ctx, cardInstanceId, destino) {
  liberarEterBloqueadoCore(s, cardInstanceId, destino);
}
function verificarDerrotaVinculos(s, ctx, owner) {
  if (s.fase === "terminada") return;
  const vivos = s.players[owner].vinculos.filter((id) => {
    if (!id) return false;
    const inst = s.instances[id];
    return !!inst && !inst.bocaArriba;
  }).length;
  if (vivos === 0) {
    const ganador = owner === "A" ? "B" : "A";
    s.fase = "terminada";
    s.ganador = ganador;
    s.motivo = "vinculos";
    ctx.emit({ type: "partida_terminada", ganador, motivo: "vinculos" });
  }
}
function buscarFuentePreventDestroy(s, dueno) {
  const p = s.players[dueno];
  for (const fuenteId of p.campo.campeones) {
    if (!fuenteId) continue;
    const inst = s.instances[fuenteId];
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null;
    if (!meta || !("efectos" in meta) || !meta.efectos) continue;
    const elegible = meta.efectos.some(
      (e) => e.efecto === "prevent_destroy" && e.trigger === "cuando_vinculo_seria_destruido" && e.costo?.tipo === "exile_self"
    );
    if (elegible) return fuenteId;
  }
  return null;
}
function ejecutarDestruccionVinculo(s, ctx, cardInstanceId, causa) {
  const inst = s.instances[cardInstanceId];
  if (!inst) return false;
  delete inst.destruccionPendiente;
  const vivos = s.players[inst.owner].vinculos.filter((id) => {
    if (!id) return false;
    const v = s.instances[id];
    return !!v && !v.bocaArriba;
  }).length;
  if (vivos - 1 <= 0 && !s.sextoVinculoResuelto) {
    s.sextoVinculoResuelto = true;
  }
  inst.bocaArriba = true;
  dispararTrigger(s, ctx, "al-ser-destruido-vinculo", inst.owner, [cardInstanceId]);
  ctx.emit({ type: "destruccion", cardInstanceId, jugador: inst.owner, causa });
  verificarDerrotaVinculos(s, ctx, inst.owner);
  return true;
}
function validarResponderPrevenicion(state, jugador) {
  const front = state.preventivosPendientes?.[0];
  if (!front) return "no hay prevenicion pendiente";
  if (front.jugador !== jugador) return "no es tu turno de responder la prevenicion";
  return null;
}
function ejecutarResponderPrevenicion(s, ctx, jugador, prevenir) {
  const pendientes = s.preventivosPendientes ?? [];
  const front = pendientes[0];
  if (!front || front.jugador !== jugador) return;
  s.preventivosPendientes = pendientes.slice(1);
  const victim = s.instances[front.victimId];
  const fuenteEnCampo = s.players[jugador].campo.campeones.includes(front.fuenteId);
  if (prevenir && fuenteEnCampo && victim && victim.destruccionPendiente) {
    const p = s.players[jugador];
    const slot = p.campo.campeones.indexOf(front.fuenteId);
    if (slot !== -1) p.campo.campeones[slot] = null;
    if (!p.exilio.includes(front.fuenteId)) p.exilio.push(front.fuenteId);
    ctx.emit({ type: "carta_exiliada", cardInstanceId: front.fuenteId, jugador });
    delete victim.destruccionPendiente;
    ctx.emit({ type: "destruccion_prevenida", cardInstanceId: front.victimId, jugador, causa: front.causa });
    return;
  }
  if (victim?.destruccionPendiente) {
    ejecutarDestruccionVinculo(s, ctx, front.victimId, front.causa);
  }
}
function destruirCarta(s, ctx, cardInstanceId, causa) {
  const inst = s.instances[cardInstanceId];
  if (!inst) return false;
  const cardId = inst.cardId;
  const meta = cardId ? getCardMeta(cardId) : null;
  const esCampeonCard = meta !== null && esCampeon(meta);
  const esVinculoCard = meta !== null && esVinculo(meta);
  if (esCampeonCard) {
    const kw = keywordsDe(s, cardInstanceId);
    if (causa === "efecto" && kw.includes("Inmortal") || causa === "combate" && kw.includes("Indestructible")) {
      ctx.emit({ type: "destruccion_prevenida", cardInstanceId, jugador: inst.owner, causa });
      return false;
    }
  }
  if (esVinculoCard && !inst.destruccionPendiente) {
    const fuente = buscarFuentePreventDestroy(s, inst.owner);
    if (fuente) {
      inst.destruccionPendiente = true;
      s.preventivosPendientes = [...s.preventivosPendientes ?? [], {
        jugador: inst.owner,
        fuenteId: fuente,
        victimId: cardInstanceId,
        causa
      }];
      ctx.emit({ type: "prevenicion_pendiente", victimId: cardInstanceId, fuenteId: fuente, jugador: inst.owner, causa });
      return false;
    }
  }
  if (esVinculoCard) {
    return ejecutarDestruccionVinculo(s, ctx, cardInstanceId, causa);
  }
  moverAlCementerio(s, cardInstanceId);
  liberarEterBloqueado(s, ctx, cardInstanceId, "1A");
  dispararTrigger(s, ctx, "al-ser-enviado-al-cementerio", inst.owner, [cardInstanceId]);
  ctx.emit({ type: "carta_muerta", cardInstanceId, jugador: inst.owner, causa });
  ctx.emit({ type: "destruccion", cardInstanceId, jugador: inst.owner, causa });
  return true;
}

// src/online/game/effectInterpreter.ts
function interpretEffect(s, ctx, inst, efectoData, payload) {
  const { efecto, objetivo, costo } = efectoData;
  const jugador = payload.jugador;
  if (payload.contextoUso === "objetivo-elegido" && payload.objetivoId) {
    if (!canExecuteEffect(s, efecto, jugador)) {
      return;
    }
    const targetIds2 = [payload.objetivoId];
    executeEffect(s, ctx, inst, efecto, targetIds2, jugador, efectoData);
    return;
  }
  if (!efectoData.trigger && efectoData.tipo !== "continuo" && costo && costo.tipo !== "ninguno") {
    if (costo.tipo !== "eter_bloqueado" && costo.tipo !== "bloqueo_fijo") {
      if (!validateCost(s, jugador, costo, inst)) {
        return;
      }
    }
  }
  if (efectoData.contextoUso && efectoData.contextoUso !== "ninguno") {
    if (payload.contextoUso !== efectoData.contextoUso) {
      return;
    }
  }
  let targetIds = [];
  if (objetivo) {
    if (objetivo.tipo === "self") {
      targetIds = [inst.cardInstanceId];
    } else {
      let mergedObjetivo = efectoData.filtros ? { ...objetivo, filtros: { ...objetivo.filtros, ...efectoData.filtros } } : objetivo;
      if (!mergedObjetivo.zona && efectoData.zonaOrigen) {
        mergedObjetivo = { ...mergedObjetivo, zona: efectoData.zonaOrigen };
      }
      targetIds = resolveTargets(s, mergedObjetivo, jugador);
    }
  }
  const isTriggered = payload.fromTrigger === true;
  const autoResolver = efecto === "mover" && efectoData.esHasta === true;
  const mergedFiltros = efectoData.filtros ? { ...objetivo?.filtros, ...efectoData.filtros } : objetivo?.filtros;
  const hasAutoSelect = mergedFiltros?.seleccionar != null;
  const needsPending = isTriggered ? targetIds.length > 0 && !hasAutoSelect : targetIds.length > 1;
  if (needsPlayerChoice(objetivo, efecto) && !autoResolver && needsPending) {
    if (!canExecuteEffect(s, efecto, jugador)) {
      return;
    }
    s.objetivosPendientes = [...s.objetivosPendientes ?? [], {
      jugador,
      instId: inst.cardInstanceId,
      trigger: toHyphenTrigger(efectoData.trigger) ?? umbralTrigger(efectoData) ?? "ninguno",
      opciones: targetIds
    }];
    return;
  }
  executeEffect(s, ctx, inst, efecto, targetIds, jugador, efectoData);
}
function needsPlayerChoice(objetivo, efecto) {
  if (!objetivo) return false;
  if (objetivo.tipo === "self" || objetivo.tipo === "todos_campeones_propios" || objetivo.tipo === "todos_campeones_rivales" || objetivo.tipo === "rival_hand") {
    return false;
  }
  if (efecto === "draw" || efecto === "rival_discard" || efecto === "block_ether" || efecto === "double_attack") {
    return false;
  }
  return true;
}
function canExecuteEffect(s, efecto, jugador) {
  if (efecto === "steal_champion") {
    const playerCampo = s.players[jugador].campo.campeones;
    return playerCampo.includes(null);
  }
  return true;
}
function toHyphenTrigger(trigger) {
  if (!trigger) return void 0;
  const triggerMap = {
    "inicio_choque": "al-inicio-choque",
    "inicio_alba": "al-inicio-alba",
    "al_invocar": "al-invocar",
    "al_atacar": "al-atacar",
    "al_matar_en_combate": "al-matar-en-combate",
    "al_pagar_eter": "al-pagar-eter",
    "al_jugar_mistica": "al-jugar-mistica",
    "al_ser_enviado_al_cementerio": "al-ser-enviado-al-cementerio",
    "al_ser_destruido_vinculo": "al-ser-destruido-vinculo",
    "al_resolver_cadena": "al-resolver-cadena",
    "al_activar_habilidad": "al-activar-habilidad"
  };
  return triggerMap[trigger] ?? trigger.replace(/_/g, "-");
}
function umbralTrigger(efectoData) {
  if (efectoData.trigger) return void 0;
  if (efectoData.costo?.tipo === "bloqueo_fijo" || efectoData.costo?.tipo === "eter_bloqueado") {
    return "al-bloquear-eter";
  }
  return void 0;
}
function executeEffect(s, ctx, inst, efecto, targetIds, jugador, efectoData) {
  const { stats, cantidad, keyword, duracion, objetivo } = efectoData;
  switch (efecto) {
    case "buff":
    case "debuff":
      executeBuffDebuff(s, targetIds, stats, duracion, efectoData.buffPerBlockedEther, efecto, efectoData.duracionTurnos);
      break;
    case "destroy":
      executeDestroy(s, ctx, targetIds);
      break;
    case "exile":
      executeExile(s, ctx, targetIds);
      break;
    case "draw":
      executeDraw(s, ctx, jugador, cantidad ?? 1);
      break;
    case "grant_keyword":
      executeGrantKeyword(s, targetIds, keyword, duracion);
      break;
    case "return_hand":
      executeReturnHand(s, ctx, targetIds);
      break;
    case "steal_champion":
      executeStealChampion(s, ctx, targetIds, jugador, inst);
      break;
    case "steal_ether":
      executeStealEther(s, ctx, targetIds, jugador);
      break;
    case "free_ether":
      executeFreeEther(s, ctx, targetIds, jugador);
      break;
    case "return_ether":
      executeReturnEther(s, ctx, targetIds, objetivo?.zonaDestino, cantidad);
      break;
    case "mover":
      executeMover(s, ctx, cantidad ? targetIds.slice(0, cantidad) : targetIds, objetivo?.zonaDestino);
      break;
    case "toggle_exhaust":
      executeToggleExhaust(s, targetIds);
      break;
    case "tutor":
      executeTutor(s, ctx, targetIds, jugador, efectoData);
      break;
    case "rival_discard":
      executeRivalDiscard(s, ctx, jugador, cantidad ?? 1);
      break;
    case "invocar_y_equipar":
      executeInvocarEquipar(s, ctx, inst, targetIds, jugador);
      break;
    case "block_ether":
      crearOpcionBloqueo(s, jugador, inst.cardInstanceId);
      break;
    case "double_attack":
      break;
    case "negar":
      if (targetIds.length > 0) {
        inst.negadoTargetId = targetIds[0];
      }
      break;
    case "copy":
      if (targetIds.length > 0) {
        inst.copyTargetId = targetIds[0];
      }
      break;
  }
}
function executeInvocarEquipar(s, ctx, inst, targetIds, jugador) {
  if (targetIds.length === 0) return;
  const objetivoId = targetIds[0];
  if (!invocarAlCampo(s, ctx, jugador, objetivoId)) return;
  inst.equipadoA = objetivoId;
  inst.vinculadoA = objetivoId;
}
function invocarAlCampo(s, ctx, jugador, campeonId) {
  const p = s.players[jugador];
  const slotLibre = p.campo.campeones.indexOf(null);
  if (slotLibre === -1) return false;
  const zonas = [
    { arr: p.cementerio, nombre: "cementerio" },
    { arr: p.exilio, nombre: "exilio" },
    { arr: p.mano, nombre: "mano" },
    { arr: p.mazo, nombre: "mazo" }
  ];
  for (const { arr } of zonas) {
    const idx = arr.indexOf(campeonId);
    if (idx !== -1) {
      arr.splice(idx, 1);
      p.campo.campeones[slotLibre] = campeonId;
      s.instances[campeonId].agotado = true;
      s.instances[campeonId].entradaEsteTurno = true;
      ctx.emit({ type: "carta_invocada", cardInstanceId: campeonId, tipo: "Campe\xF3n", slot: slotLibre });
      return true;
    }
  }
  return false;
}
function dispararUmbralBloqueo(s, ctx, targetInstanceId) {
  const inst = s.instances[targetInstanceId];
  if (!inst?.cardId || inst.efectoUmbralDisparado) return;
  const meta = getCardMeta(inst.cardId);
  if (!meta || !("efectos" in meta) || !meta.efectos) return;
  const bloqueados = inst.eterBloqueado?.length ?? 0;
  for (const efecto of meta.efectos) {
    const umbral = efecto.costo?.cantidad;
    if (!umbral) continue;
    if (efecto.costo?.tipo !== "eter_bloqueado" && efecto.costo?.tipo !== "bloqueo_fijo") continue;
    if (bloqueados < umbral) continue;
    if (efecto.efecto === "steal_champion") {
      const yaRobo = Object.values(s.instances).some((i) => i.stolenBy === inst.cardInstanceId);
      if (yaRobo) continue;
      if (!canExecuteSteal(s, inst.owner)) continue;
      inst.efectoUmbralDisparado = true;
      interpretEffect(s, ctx, inst, efecto, { jugador: inst.owner, fromTrigger: true });
      continue;
    }
    if (efecto.efecto !== "invocar_y_equipar") continue;
    inst.efectoUmbralDisparado = true;
    ejecutarInvocarEquiparUmbral(s, ctx, inst, efecto, inst.owner);
  }
}
function canExecuteSteal(s, jugador) {
  return s.players[jugador].campo.campeones.includes(null);
}
function reagruparEfectosBloqueoAlba(s, ctx, jugador) {
  const p = s.players[jugador];
  const enCampo = [
    ...p.campo.campeones,
    ...p.campo.misticasTacticas,
    ...p.campo.arcanasCombate
  ].filter((id) => id !== null);
  for (const id of enCampo) {
    const inst = s.instances[id];
    if (!inst?.cardId || !inst.eterBloqueado || inst.eterBloqueado.length === 0) continue;
    const meta = getCardMeta(inst.cardId);
    if (!meta || !("efectos" in meta) || !meta.efectos) continue;
    const efectoReagrupar = meta.efectos.find(
      (e) => e.reagrupar?.fase === "alba" && e.reagrupar?.turno === "propio" && (e.costo?.tipo === "bloqueo_fijo" || e.costo?.tipo === "eter_bloqueado")
    );
    if (!efectoReagrupar) continue;
    const eteres = [...inst.eterBloqueado];
    delete inst.eterBloqueado;
    delete inst.efectoUmbralDisparado;
    delete inst.copyOneShotDisparado;
    p.eterReserva.push(...eteres);
    ctx.emit({ type: "eter_reagrupado", jugador, eterIds: eteres });
    if (efectoReagrupar.efecto === "steal_champion" && efectoReagrupar.duracion === "mientras_ester_bloqueado") {
      retornarCampeonesRobados(s, ctx, id, jugador);
    }
  }
}
function retornarCampeonesRobados(s, ctx, fuenteId, ladron) {
  for (const other of Object.values(s.instances)) {
    if (other.stolenBy !== fuenteId) continue;
    const enCampoLadron = s.players[ladron].campo.campeones.includes(other.cardInstanceId);
    if (!enCampoLadron) {
      delete other.stolenBy;
      continue;
    }
    const duenoOriginal = other.owner;
    const campoOriginal = s.players[duenoOriginal].campo.campeones;
    const slotLibre = campoOriginal.indexOf(null);
    if (slotLibre !== -1 && duenoOriginal !== ladron) {
      const idxLadron = s.players[ladron].campo.campeones.indexOf(other.cardInstanceId);
      if (idxLadron !== -1) s.players[ladron].campo.campeones[idxLadron] = null;
      campoOriginal[slotLibre] = other.cardInstanceId;
      delete other.stolenBy;
      ctx.emit({
        type: "carta_entrada_a_zona",
        cardInstanceId: other.cardInstanceId,
        zona: `2${String.fromCharCode(66 + slotLibre)}`,
        jugador: duenoOriginal,
        bocaArriba: true
      });
    } else {
      delete other.stolenBy;
    }
  }
}
function ejecutarInvocarEquiparUmbral(s, ctx, inst, efecto, jugador) {
  const zona = efecto.zonaOrigen ?? "exilio";
  const p = s.players[jugador];
  const arr = zona === "cementerio" ? p.cementerio : zona === "mano" ? p.mano : zona === "mazo" ? p.mazo : p.exilio;
  for (const id of arr) {
    const meta = s.instances[id]?.cardId ? getCardMeta(s.instances[id].cardId) : null;
    if (!meta || !esCampeon(meta)) continue;
    if (invocarAlCampo(s, ctx, jugador, id)) {
      inst.equipadoA = id;
      inst.vinculadoA = id;
    }
    break;
  }
}
function executeTutor(s, ctx, targetIds, jugador, efectoData) {
  const zonaOrigen = efectoData.objetivo?.zona ?? "mazo";
  const zonaDestino = efectoData.objetivo?.zonaDestino ?? "mano";
  const p = s.players[jugador];
  if (zonaDestino === "campo" && p.campo.campeones.indexOf(null) === -1) return;
  for (const targetId of targetIds) {
    let removed = false;
    if (zonaOrigen === "mazo") {
      const idx = p.mazo.indexOf(targetId);
      if (idx !== -1) {
        p.mazo.splice(idx, 1);
        removed = true;
      }
    } else if (zonaOrigen === "cementerio") {
      const idx = p.cementerio.indexOf(targetId);
      if (idx !== -1) {
        p.cementerio.splice(idx, 1);
        removed = true;
      }
    } else if (zonaOrigen === "exilio") {
      const idx = p.exilio.indexOf(targetId);
      if (idx !== -1) {
        p.exilio.splice(idx, 1);
        removed = true;
      }
    } else if (zonaOrigen === "mano") {
      const idx = p.mano.indexOf(targetId);
      if (idx !== -1) {
        p.mano.splice(idx, 1);
        removed = true;
      }
    }
    if (!removed) continue;
    if (zonaDestino === "mano") {
      p.mano.push(targetId);
      ctx.emit({ type: "carta_robada", jugador, cardInstanceId: targetId });
    } else if (zonaDestino === "campo") {
      const slotLibre = p.campo.campeones.indexOf(null);
      if (slotLibre !== -1) {
        p.campo.campeones[slotLibre] = targetId;
        ctx.emit({ type: "carta_invocada", cardInstanceId: targetId, tipo: "Campe\xF3n", slot: slotLibre });
      }
    }
  }
}
function validateCost(s, jugador, costo, inst) {
  const p = s.players[jugador];
  switch (costo.tipo) {
    case "eter":
      return p.eterReserva.length >= (costo.cantidad ?? 1);
    case "eter_bloqueado":
      let totalBlocked = 0;
      for (const champId of p.campo.campeones) {
        if (champId === null) continue;
        const inst2 = s.instances[champId];
        totalBlocked += inst2?.eterBloqueado?.length ?? 0;
      }
      return totalBlocked >= (costo.cantidad ?? 1);
    case "bloqueo_fijo":
      return p.eterReserva.length >= (costo.cantidad ?? 1);
    case "exhaust":
      return !inst?.agotado;
    case "exile_self":
      return true;
    case "cemetery_self":
      return true;
    default:
      return true;
  }
}
function executeBuffDebuff(s, targetIds, stats, duracion, buffPerBlockedEther, efecto, duracionTurnos) {
  if (!stats) return;
  const expira = duracion === "permanente" ? "permanente" : duracion === "mientras_en_campo" ? "permanente" : duracion === "mientras_ester_bloqueado" ? "permanente" : duracion === "mientras_equipped" ? "permanente" : "ocaso";
  const turnosRestantes = duracion === "n_turnos" ? duracionTurnos : void 0;
  const sign = efecto === "debuff" ? -1 : 1;
  for (const targetId of targetIds) {
    let atqDelta = (stats.ATQ ?? 0) * sign;
    let resDelta = (stats.RES ?? 0) * sign;
    if (buffPerBlockedEther) {
      const targetInst = s.instances[targetId];
      const blockedCount = targetInst?.eterBloqueado?.length ?? 0;
      atqDelta *= blockedCount;
      resDelta *= blockedCount;
    }
    if (atqDelta !== 0) {
      aplicarMod(s, targetId, "poder", atqDelta, expira, turnosRestantes);
    }
    if (resDelta !== 0) {
      aplicarMod(s, targetId, "resistencia", resDelta, expira, turnosRestantes);
    }
  }
}
function executeDestroy(s, ctx, targetIds) {
  for (const targetId of targetIds) {
    destruirCarta(s, ctx, targetId, "efecto");
  }
}
function executeExile(s, ctx, targetIds) {
  for (const targetId of targetIds) {
    const inst = s.instances[targetId];
    if (!inst) continue;
    const owner = inst.owner;
    const p = s.players[owner];
    const cemIdx = p.cementerio.indexOf(targetId);
    if (cemIdx !== -1) {
      p.cementerio.splice(cemIdx, 1);
      p.exilio.push(targetId);
      ctx.emit({ type: "carta_exiliada", cardInstanceId: targetId, jugador: owner });
      continue;
    }
    const campoIdx = p.campo.campeones.indexOf(targetId);
    if (campoIdx !== -1) {
      p.campo.campeones[campoIdx] = null;
      liberarEterBloqueado(s, ctx, targetId, "1A");
      p.exilio.push(targetId);
      ctx.emit({ type: "carta_exiliada", cardInstanceId: targetId, jugador: owner });
      continue;
    }
    const mistIdx = p.campo.misticasTacticas.indexOf(targetId);
    if (mistIdx !== -1) {
      p.campo.misticasTacticas[mistIdx] = null;
      liberarEterBloqueado(s, ctx, targetId, "1A");
      p.exilio.push(targetId);
      ctx.emit({ type: "carta_exiliada", cardInstanceId: targetId, jugador: owner });
      continue;
    }
    const arcIdx = p.campo.arcanasCombate.indexOf(targetId);
    if (arcIdx !== -1) {
      p.campo.arcanasCombate[arcIdx] = null;
      liberarEterBloqueado(s, ctx, targetId, "1A");
      p.exilio.push(targetId);
      ctx.emit({ type: "carta_exiliada", cardInstanceId: targetId, jugador: owner });
      continue;
    }
  }
}
function executeDraw(s, ctx, jugador, cantidad) {
  const p = s.players[jugador];
  for (let i = 0; i < cantidad; i++) {
    if (p.mazo.length === 0) break;
    const cardId = p.mazo.shift();
    p.mano.push(cardId);
    ctx.emit({ type: "carta_robada", cardInstanceId: cardId, jugador });
  }
}
function executeGrantKeyword(s, targetIds, keyword, duracion) {
  if (!keyword) return;
  const temporal = duracion !== "permanente";
  for (const targetId of targetIds) {
    otorgarKeyword(s, targetId, keyword, temporal);
  }
}
function executeReturnHand(s, ctx, targetIds) {
  for (const targetId of targetIds) {
    const inst = s.instances[targetId];
    if (!inst) continue;
    const owner = inst.owner;
    const p = s.players[owner];
    const removed = removeFromCurrentZone(s, targetId, owner);
    if (!removed) continue;
    liberarEterBloqueado(s, ctx, targetId, "1A");
    p.mano.push(targetId);
    ctx.emit({ type: "carta_devuelta_a_mano", cardInstanceId: targetId, jugador: owner });
  }
}
function executeStealChampion(s, ctx, targetIds, jugador, inst) {
  const rival = jugador === "A" ? "B" : "A";
  for (const targetId of targetIds) {
    const targetInst = s.instances[targetId];
    if (!targetInst) continue;
    const rivalCampo = s.players[rival].campo.campeones;
    const idx = rivalCampo.indexOf(targetId);
    if (idx === -1) continue;
    rivalCampo[idx] = null;
    const playerCampo = s.players[jugador].campo.campeones;
    const slotLibre = playerCampo.indexOf(null);
    if (slotLibre === -1) {
      rivalCampo[idx] = targetId;
      continue;
    }
    playerCampo[slotLibre] = targetId;
    targetInst.stolenBy = inst.cardInstanceId;
    targetInst.agotado = true;
    ctx.emit({ type: "campeon_robado", cardInstanceId: targetId, jugador, rival });
  }
}
function executeStealEther(s, ctx, targetIds, jugador) {
  const rival = jugador === "A" ? "B" : "A";
  for (const targetId of targetIds) {
    const rivalP = s.players[rival];
    const idx = rivalP.eterReserva.indexOf(targetId);
    if (idx !== -1) {
      rivalP.eterReserva.splice(idx, 1);
      s.players[jugador].eterReserva.push(targetId);
      ctx.emit({ type: "eter_robado", cardInstanceId: targetId, jugador, rival });
    }
  }
}
function executeFreeEther(s, ctx, targetIds, jugador) {
  for (const targetId of targetIds) {
    const p = s.players[jugador];
    const idx = p.eterPagado.indexOf(targetId);
    if (idx !== -1) {
      p.eterPagado.splice(idx, 1);
      p.eterReserva.push(targetId);
      ctx.emit({ type: "eter_liberado", cardInstanceId: targetId, jugador });
    }
  }
}
function removeEterFromCurrentZone(s, targetId, owner) {
  const p = s.players[owner];
  const resIdx = p.eterReserva.indexOf(targetId);
  if (resIdx !== -1) {
    p.eterReserva.splice(resIdx, 1);
    return true;
  }
  const paidIdx = p.eterPagado.indexOf(targetId);
  if (paidIdx !== -1) {
    p.eterPagado.splice(paidIdx, 1);
    return true;
  }
  return false;
}
function executeReturnEther(s, ctx, targetIds, zonaDestino, cantidad) {
  const limit = cantidad ?? targetIds.length;
  let count = 0;
  for (const targetId of targetIds) {
    if (count >= limit) break;
    const inst = s.instances[targetId];
    if (!inst) continue;
    const owner = inst.owner;
    const removed = removeEterFromCurrentZone(s, targetId, owner);
    if (!removed) continue;
    count++;
    if (zonaDestino === "reserva") {
      s.players[owner].eterReserva.push(targetId);
      ctx.emit({ type: "eter_reagrupado", jugador: owner, eterIds: [targetId] });
    }
  }
}
function executeMover(s, ctx, targetIds, zonaDestino) {
  for (const targetId of targetIds) {
    const inst = s.instances[targetId];
    if (!inst) continue;
    const owner = inst.owner;
    const p = s.players[owner];
    const removed = removeEterFromCurrentZone(s, targetId, owner);
    if (!removed) continue;
    if (zonaDestino === "pagado") {
      p.eterPagado.push(targetId);
      ctx.emit({ type: "eter_movido", cardInstanceId: targetId, destino: "pagado", jugador: owner });
    } else if (zonaDestino === "reserva") {
      p.eterReserva.push(targetId);
      ctx.emit({ type: "eter_movido", cardInstanceId: targetId, destino: "reserva", jugador: owner });
    }
  }
}
function executeToggleExhaust(s, targetIds) {
  for (const targetId of targetIds) {
    const inst = s.instances[targetId];
    if (!inst) continue;
    inst.agotado = !inst.agotado;
  }
}
function executeRivalDiscard(s, ctx, jugador, cantidad) {
  const rival = jugador === "A" ? "B" : "A";
  const p = s.players[rival];
  for (let i = 0; i < cantidad; i++) {
    if (p.mano.length === 0) break;
    const idx = Math.floor(ctx.next() * p.mano.length);
    const cardId = p.mano.splice(idx, 1)[0];
    enviarAlCementerio(s, ctx, cardId);
    ctx.emit({ type: "carta_descartada", jugador: rival, cardInstanceIds: [cardId] });
  }
}
function removeFromCurrentZone(s, targetId, owner) {
  const p = s.players[owner];
  const cemIdx = p.cementerio.indexOf(targetId);
  if (cemIdx !== -1) {
    p.cementerio.splice(cemIdx, 1);
    return true;
  }
  const campoIdx = p.campo.campeones.indexOf(targetId);
  if (campoIdx !== -1) {
    p.campo.campeones[campoIdx] = null;
    return true;
  }
  const mistIdx = p.campo.misticasTacticas.indexOf(targetId);
  if (mistIdx !== -1) {
    p.campo.misticasTacticas[mistIdx] = null;
    return true;
  }
  const arcIdx = p.campo.arcanasCombate.indexOf(targetId);
  if (arcIdx !== -1) {
    p.campo.arcanasCombate[arcIdx] = null;
    return true;
  }
  const exiIdx = p.exilio.indexOf(targetId);
  if (exiIdx !== -1) {
    p.exilio.splice(exiIdx, 1);
    return true;
  }
  return false;
}

// src/online/game/efectos.ts
var registro = /* @__PURE__ */ new Map();
function esEfectoStat(efecto) {
  return efecto.efecto === "buff" || efecto.efecto === "debuff" || efecto.efecto === "grant_keyword";
}
function esAuraZona(efecto) {
  if (!esEfectoStat(efecto)) return false;
  const sinTriggerDeEvento = efecto.trigger === void 0 || efecto.trigger === "ninguno";
  return (efecto.tipo === "pasivo" || efecto.tipo === "reserva" || efecto.tipo === "bloqueo") && sinTriggerDeEvento;
}
function esAuraCondicionada(efecto) {
  if (efecto.tipo === "disparo" || efecto.tipo === "continuo") return false;
  if (efecto.duracion !== "mientras_ester_bloqueado") return false;
  if (!esEfectoStat(efecto)) return false;
  const t = efecto.objetivo?.tipo;
  return t === "todos_campeones_propios" || t === "self";
}
function esAuraEquipada(efecto) {
  if (efecto.efecto !== "buff" && efecto.efecto !== "debuff") return false;
  if (!efecto.buffPerBlockedEther) return false;
  if (efecto.costo?.tipo !== "eter_bloqueado" && efecto.costo?.tipo !== "bloqueo_fijo") return false;
  return efecto.objetivo?.tipo === "equipped_champion";
}
function esAuraVinculo(efecto) {
  if (efecto.tipo !== "vinculo") return false;
  if (!esEfectoStat(efecto)) return false;
  if (efecto.duracion !== "mientras_en_campo") return false;
  return efecto.trigger === void 0 || efecto.trigger === null;
}
function statsBaseDe(s, id) {
  const inst = s.instances[id];
  const meta = inst?.cardId ? getCardMeta(inst.cardId) : null;
  const esCamp = !!meta && esCampeon(meta);
  const stats = esCamp ? meta.stats : void 0;
  let poder = inst?.poder ?? stats?.poder ?? 0;
  let resistencia = inst?.resistencia ?? stats?.resistencia ?? 0;
  for (const m of inst?.modificadores ?? []) {
    if (m.stat === "poder") poder += m.valor;
    else resistencia += m.valor;
  }
  return { poder, resistencia };
}
function championNegado(s, champId) {
  const champInst = s.instances[champId];
  if (!champInst) return false;
  for (const j of ["A", "B"]) {
    const p = s.players[j];
    for (const grupo of ["campeones", "misticasTacticas", "arcanasCombate"]) {
      for (const id of p.campo[grupo]) {
        if (!id) continue;
        const inst = s.instances[id];
        if (!inst?.negadoTargetId || inst.negadoTargetId !== champId) continue;
        const meta = inst.cardId ? getCardMeta(inst.cardId) : null;
        if (meta && "efectos" in meta && meta.efectos?.some((e) => e.efecto === "negar")) return true;
      }
    }
  }
  return false;
}
function evaluarAura(s, efecto, fuente, esComandante, objetivoId, objetivoInst, origen) {
  const objetivo = efecto.objetivo;
  if (!objetivo) return null;
  const mismoDueno = fuente.owner === objetivoInst.owner;
  let aplica = false;
  let excluirSelf = false;
  switch (objetivo.tipo) {
    case "self":
      aplica = objetivoId === fuente.cardInstanceId;
      break;
    case "todos_campeones_propios":
      aplica = mismoDueno;
      excluirSelf = !esComandante && origen === "campo" && esAuraZona(efecto) && !esAuraCondicionada(efecto);
      break;
    case "campeon":
      if (objetivo.controlador === "propio") aplica = mismoDueno;
      else if (objetivo.controlador === "rival") aplica = !mismoDueno;
      else aplica = true;
      if (aplica && objetivo.filtros?.seleccionar) {
        const { stat, orden } = objetivo.filtros.seleccionar;
        const pool = [];
        for (const j of ["A", "B"]) {
          const esDuenoFiltro = objetivo.controlador === "propio" ? j === fuente.owner : objetivo.controlador === "rival" ? j !== fuente.owner : true;
          if (!esDuenoFiltro) continue;
          for (const cid of s.players[j].campo.campeones) {
            if (cid) pool.push(cid);
          }
        }
        if (pool.length === 0) return null;
        let mejorId = pool[0];
        let mejorVal = stat === "poder" ? statsBaseDe(s, pool[0]).poder : statsBaseDe(s, pool[0]).resistencia;
        for (const cid of pool.slice(1)) {
          const val = stat === "poder" ? statsBaseDe(s, cid).poder : statsBaseDe(s, cid).resistencia;
          if (orden === "mayor" ? val > mejorVal : val < mejorVal) {
            mejorId = cid;
            mejorVal = val;
          }
        }
        if (mejorId !== objetivoId) return null;
      }
      break;
    case "equipped_champion":
      aplica = mismoDueno && fuente.equipadoA === objetivoId;
      break;
    default:
      return null;
  }
  if (!aplica) return null;
  if (excluirSelf && objetivoId === fuente.cardInstanceId) return null;
  if (origen === "reserva") {
    if (!s.players[fuente.owner].eterReserva.includes(fuente.cardInstanceId)) return null;
    if (objetivo.controlador === "rival" && objetivoInst.owner === fuente.owner) return null;
    if (objetivo.controlador === "propio" && objetivoInst.owner !== fuente.owner) return null;
  }
  if (origen === "bloqueo") {
    if (!(objetivoInst.eterBloqueado ?? []).includes(fuente.cardInstanceId)) return null;
  }
  if (efecto.duracion === "mientras_ester_bloqueado" && origen !== "bloqueo") {
    if ((fuente.eterBloqueado?.length ?? 0) === 0) return null;
  }
  let escala = 1;
  if (efecto.buffPerBlockedEther) {
    if (objetivo.tipo === "equipped_champion") {
      const bloqueadosFuente = fuente.eterBloqueado?.length ?? 0;
      if (bloqueadosFuente === 0) return null;
      escala = efecto.cantidadMax !== void 0 ? Math.min(bloqueadosFuente, efecto.cantidadMax) : bloqueadosFuente;
    } else {
      const rival = objetivoInst.owner === "A" ? "B" : "A";
      const bloqueadosRival = s.players[rival].campo.campeones.filter((cId) => cId !== null).reduce((acc, cId) => acc + (s.instances[cId]?.eterBloqueado?.length ?? 0), 0);
      if (bloqueadosRival === 0) return null;
      escala = efecto.cantidadMax !== void 0 ? Math.min(bloqueadosRival, efecto.cantidadMax) : bloqueadosRival;
    }
  }
  const signo = efecto.efecto === "debuff" && !statsDebuffYaNegativos(efecto) ? -1 : 1;
  const resultado = {};
  if (efecto.stats?.ATQ) resultado.poder = efecto.stats.ATQ * signo * escala;
  if (efecto.stats?.RES) resultado.resistencia = efecto.stats.RES * signo * escala;
  if (efecto.efecto === "grant_keyword" && efecto.keyword) {
    resultado.keywords = [efecto.keyword];
  }
  return resultado;
}
function statsDebuffYaNegativos(efecto) {
  const atq = efecto.stats?.ATQ ?? 0;
  const res = efecto.stats?.RES ?? 0;
  return atq < 0 || atq === 0 && res < 0;
}
function modificadoresJSONDe(s, id) {
  const vacio = { poder: 0, resistencia: 0, keywords: [] };
  const inst = s.instances[id];
  if (!inst) return vacio;
  const meta = inst.cardId ? getCardMeta(inst.cardId) : null;
  if (!meta || !esCampeon(meta)) return vacio;
  const owner = inst.owner;
  const candidatos = [];
  const campo = s.players[owner].campo;
  const fuentesCampo = [
    ...campo.campeones,
    ...campo.misticasTacticas,
    ...campo.arcanasCombate
  ].filter((x) => x !== null);
  for (const fuenteId of fuentesCampo) {
    const fuenteInst = s.instances[fuenteId];
    if (!fuenteInst?.cardId) continue;
    const fuenteMeta = getCardMeta(fuenteInst.cardId);
    if (!fuenteMeta) continue;
    if (fuenteMeta.type === "Campe\xF3n" && fuenteMeta.efectoComandante) {
      candidatos.push({ inst: fuenteInst, meta: fuenteMeta, esComandante: true, origen: "campo" });
    }
    if ("efectos" in fuenteMeta && fuenteMeta.efectos?.some((e) => esAuraZona(e) || esAuraCondicionada(e) || esAuraEquipada(e))) {
      candidatos.push({ inst: fuenteInst, meta: fuenteMeta, esComandante: false, origen: "campo" });
    }
  }
  for (const eterOwner of ["A", "B"]) {
    for (const eterId of s.players[eterOwner].eterReserva) {
      const eterInst = s.instances[eterId];
      if (!eterInst?.cardId) continue;
      const eterMeta = getCardMeta(eterInst.cardId);
      if (!eterMeta) continue;
      if ("efectos" in eterMeta && eterMeta.efectos?.some((e) => e.tipo === "reserva" && esAuraZona(e))) {
        candidatos.push({ inst: eterInst, meta: eterMeta, esComandante: false, origen: "reserva" });
      }
    }
  }
  for (const eterId of inst.eterBloqueado ?? []) {
    const eterInst = s.instances[eterId];
    if (!eterInst?.cardId) continue;
    const eterMeta = getCardMeta(eterInst.cardId);
    if (!eterMeta) continue;
    if ("efectos" in eterMeta && eterMeta.efectos?.some((e) => e.tipo === "bloqueo" && esAuraZona(e))) {
      candidatos.push({ inst: eterInst, meta: eterMeta, esComandante: false, origen: "bloqueo" });
    }
  }
  for (const vincOwner of ["A", "B"]) {
    for (const vincId of s.players[vincOwner].vinculos) {
      if (!vincId) continue;
      const vincInst = s.instances[vincId];
      if (!vincInst?.cardId) continue;
      if (vincInst.bocaArriba !== true) continue;
      const vincMeta = getCardMeta(vincInst.cardId);
      if (!vincMeta) continue;
      if ("efectos" in vincMeta && vincMeta.efectos?.some((e) => esAuraVinculo(e))) {
        candidatos.push({ inst: vincInst, meta: vincMeta, esComandante: false, origen: "vinculo" });
      }
    }
  }
  let poder = 0;
  let resistencia = 0;
  const keywords = [];
  for (const c of candidatos) {
    const efectos = [];
    if (c.esComandante && c.meta.type === "Campe\xF3n" && c.meta.efectoComandante) {
      efectos.push(c.meta.efectoComandante);
    }
    if ("efectos" in c.meta && c.meta.efectos) {
      for (const e of c.meta.efectos) {
        if (c.origen === "reserva" && e.tipo === "reserva" && esAuraZona(e)) efectos.push(e);
        else if (c.origen === "bloqueo" && e.tipo === "bloqueo" && esAuraZona(e)) efectos.push(e);
        else if (c.origen === "vinculo" && e.tipo === "vinculo" && esAuraVinculo(e)) efectos.push(e);
        else if (c.origen === "campo" && (esAuraZona(e) || esAuraCondicionada(e) || esAuraEquipada(e))) efectos.push(e);
      }
    }
    for (const efecto of efectos) {
      const resultado = evaluarAura(s, efecto, c.inst, c.esComandante, id, inst, c.origen);
      if (!resultado) continue;
      poder += resultado.poder ?? 0;
      resistencia += resultado.resistencia ?? 0;
      if (resultado.keywords) keywords.push(...resultado.keywords);
    }
  }
  return { poder, resistencia, keywords: [...new Set(keywords)] };
}
function condicionCumple(s, condicion, jugador) {
  if (!condicion || typeof condicion !== "object" || !("trigger" in condicion)) return null;
  for (const cond of condicion.condiciones ?? []) {
    const checkRival = cond.tipo === "rival_controla_minimo" || cond.tipo === "rival_controla_maximo" || condicion.controladorTrigger === "rival";
    const j = checkRival ? jugador === "A" ? "B" : "A" : jugador;
    const min = cond.cantidad ?? cond.objetivo?.cantidad ?? 1;
    if (cond.tipo === "controlar_maximo" || cond.tipo === "rival_controla_maximo") {
      const count = s.players[j].campo.campeones.filter((id) => id !== null).length;
      if (count > min) return `m\xE1ximo ${min} Campeones en campo`;
    } else if (cond.tipo === "tener_mano_maximo") {
      if (s.players[j].mano.length > min) return `m\xE1ximo ${min} cartas en mano`;
    } else if (cond.tipo === "tener_mano_minimo") {
      if (s.players[j].mano.length < min) return `se requieren ${min} cartas en mano`;
    } else if (cond.tipo === "tener_eter_pagado") {
      if (s.players[j].eterPagado.length < min) return `se requieren ${min} \xC9teres pagados`;
    } else if (cond.tipo === "tener_eter_bloqueado" || cond.objetivo?.tipo === "campeon_con_eter") {
      const count = s.players[j].campo.campeones.filter(
        (id) => id !== null && (s.instances[id]?.eterBloqueado?.length ?? 0) >= 1
      ).length;
      if (count < min) return `se requieren ${min} o m\xE1s Campeones con \xC9ter bloqueado`;
    } else if (cond.tipo === "controlar_minimo" || cond.tipo === "rival_controla_minimo") {
      const conEter = cond.objetivo?.filtros?.conEterBloqueado === true;
      const count = s.players[j].campo.campeones.filter(
        (id) => id !== null && (!conEter || (s.instances[id]?.eterBloqueado?.length ?? 0) >= 1)
      ).length;
      if (count < min) {
        return conEter ? `se requieren ${min} o m\xE1s Campeones con \xC9ter bloqueado` : `se requieren ${min} o m\xE1s Campeones en campo`;
      }
    }
  }
  return null;
}
function hayParejaBloqueo(s, jugador) {
  const p = s.players[jugador];
  if (!p.campo.campeones.some(Boolean)) return false;
  for (const eterId of p.eterReserva) {
    const metaE = s.instances[eterId]?.cardId ? getCardMeta(s.instances[eterId].cardId) : null;
    if (!metaE) continue;
    for (const campeonId of p.campo.campeones) {
      if (!campeonId) continue;
      const metaC = s.instances[campeonId]?.cardId ? getCardMeta(s.instances[campeonId].cardId) : null;
      if (metaC && faccionesCompartidas(metaE.facciones, metaC.facciones)) return true;
    }
  }
  return false;
}
function crearOpcionBloqueo(s, jugador, fuenteInstanceId) {
  const inst = s.instances[fuenteInstanceId];
  if (!inst) return false;
  if (inst.opcionUsadaEsteTurno) return false;
  if (!hayParejaBloqueo(s, jugador)) return false;
  s.opcionesPendientes = [...s.opcionesPendientes ?? [], { jugador, eterId: fuenteInstanceId }];
  return true;
}
function tieneDoubleAttackActivo(s, id) {
  const inst = s.instances[id];
  if (!inst?.cardId || (inst.eterBloqueado?.length ?? 0) === 0) return false;
  const meta = getCardMeta(inst.cardId);
  if (!meta || !("efectos" in meta) || !meta.efectos) return false;
  return meta.efectos.some(
    (e) => e.efecto === "double_attack" && e.duracion === "mientras_ester_bloqueado"
  );
}
function registrarEfecto(trigger, cardId, fn) {
  let porCarta = registro.get(trigger);
  if (!porCarta) {
    porCarta = /* @__PURE__ */ new Map();
    registro.set(trigger, porCarta);
  }
  porCarta.set(cardId, fn);
}
function limpiarRegistroEfectos() {
  registro.clear();
}
function instanciasEnCampo(s, jugador) {
  const p = s.players[jugador];
  return [
    ...p.campo.campeones,
    ...p.campo.misticasTacticas,
    ...p.campo.arcanasCombate,
    ...p.vinculos
  ].filter((id) => id !== null);
}
var registroGenerico = /* @__PURE__ */ new Map();
function dispararTrigger(s, ctx, trigger, jugador, instancias, payloadExtra) {
  const porCarta = registro.get(trigger);
  const ids = instancias ?? instanciasEnCampo(s, jugador);
  const orden = [...ids].sort();
  const payload = { jugador, fromTrigger: true, ...payloadExtra };
  const triggerMapping = {
    "al-invocar": "al_invocar",
    "al-atacar": "al_atacar",
    "al-matar-en-combate": "al_matar_en_combate",
    "al-inicio-alba": "inicio_alba",
    "al-inicio-choque": "inicio_choque",
    "al-pagar-eter": "al_pagar_eter",
    "al-jugar-mistica": "al_jugar_mistica",
    "al-ser-enviado-al-cementerio": "al_ser_enviado_al_cementerio",
    "al-ser-destruido-vinculo": "al_ser_destruido_vinculo",
    "al-resolver-cadena": "al_resolver_cadena",
    "al-activar-habilidad": "al_activar_habilidad"
  };
  for (const id of orden) {
    const inst = s.instances[id];
    const cardId = inst?.cardId;
    if (!inst || !cardId) continue;
    let handled = false;
    const meta = getCardMeta(cardId);
    if (meta && meta.type === "V\xEDnculo" && inst.bocaArriba !== true) continue;
    if (meta && "efectos" in meta) {
      let conditionPassed = true;
      if ("condicion" in meta) {
        const condicion = meta.condicion;
        if (condicion && typeof condicion === "object" && "trigger" in condicion) {
          const efectoTrigger = triggerMapping[trigger];
          if (efectoTrigger === condicion.trigger && condicionCumple(s, condicion, payload.jugador) !== null) {
            conditionPassed = false;
          }
        }
      }
      if (conditionPassed) {
        const efectos = "efectos" in meta ? meta.efectos : void 0;
        if (efectos && Array.isArray(efectos)) {
          const efectoTrigger = triggerMapping[trigger];
          for (const efecto of efectos) {
            const esUmbral = trigger === "al-bloquear-eter";
            const matchea = esUmbral ? !efecto.trigger && (efecto.costo?.tipo === "bloqueo_fijo" || efecto.costo?.tipo === "eter_bloqueado") && !!efecto.efecto : efecto.trigger === efectoTrigger && !!efecto.efecto;
            if (matchea && efecto.efecto) {
              const pendientesAntes = s.objetivosPendientes?.length ?? 0;
              interpretEffect(s, ctx, inst, efecto, payload);
              const pendientesDespues = s.objetivosPendientes?.length ?? 0;
              if (pendientesDespues > pendientesAntes) {
                handled = true;
              } else {
                const needsTargeting = [
                  "steal_champion",
                  "toggle_exhaust",
                  "destroy",
                  "return_ether",
                  "mover",
                  "copy",
                  "tutor",
                  "block_ether"
                ].includes(efecto.efecto);
                if (needsTargeting) {
                  const targetIds = efecto.objetivo ? resolveTargets(s, efecto.objetivo, payload.jugador) : [];
                  if (targetIds.length > 0) {
                    handled = true;
                  }
                } else {
                  handled = true;
                }
              }
              break;
            }
          }
        }
      }
    }
    if (handled) continue;
    const hasCardHandler = porCarta?.has(cardId) ?? false;
    if (!hasCardHandler) {
      for (const [efectoTipo, genericFn] of registroGenerico) {
        if (!meta || !("efectos" in meta) || !meta.efectos) continue;
        const tieneEfecto = meta.efectos.some((e) => e.efecto === efectoTipo);
        if (tieneEfecto) {
          genericFn(s, ctx, inst, payload);
          handled = true;
          break;
        }
      }
    }
    if (handled) continue;
    const fn = porCarta?.get(cardId);
    if (fn) {
      fn(s, ctx, inst, payload);
    }
  }
}
function statsDe(s, id) {
  const inst = s.instances[id];
  const cardId = inst?.cardId ?? null;
  const meta = cardId ? getCardMeta(cardId) : null;
  const esCamp = !!meta && esCampeon(meta);
  let poder = inst?.poder ?? (esCamp && meta.stats ? meta.stats.poder : 0);
  let resistencia = inst?.resistencia ?? (esCamp && meta.stats ? meta.stats.resistencia : 0);
  for (const m of inst?.modificadores ?? []) {
    if (m.stat === "poder") poder += m.valor;
    else resistencia += m.valor;
  }
  const mods = modificadoresJSONDe(s, id);
  poder += mods.poder;
  resistencia += mods.resistencia;
  return { poder: Math.max(0, poder), resistencia: Math.max(0, resistencia) };
}
function keywordsDe2(s, id) {
  const inst = s.instances[id];
  const cardId = inst?.cardId ?? null;
  const meta = cardId ? getCardMeta(cardId) : null;
  const deData = meta && esCampeon(meta) ? meta.keywords : [];
  const mods = modificadoresJSONDe(s, id);
  return [.../* @__PURE__ */ new Set([...deData, ...inst?.keywords ?? [], ...inst?.keywordsTemporales ?? [], ...mods.keywords])];
}
function velocidadDe(s, id) {
  const kws = keywordsDe2(s, id);
  if (kws.includes("Fugaz")) return "fugaz";
  if (kws.includes("Presteza")) return "presteza";
  return "normal";
}
function aplicarMod(s, id, stat, valor, expira, turnosRestantes) {
  const inst = s.instances[id];
  if (!inst) return;
  inst.modificadores = [...inst.modificadores ?? [], { stat, valor, expira, turnosRestantes }];
}
function otorgarKeyword(s, id, kw, temporal = false) {
  const inst = s.instances[id];
  if (!inst) return;
  if (temporal) {
    inst.keywordsTemporales = [.../* @__PURE__ */ new Set([...inst.keywordsTemporales ?? [], kw])];
  } else {
    inst.keywords = [.../* @__PURE__ */ new Set([...inst.keywords ?? [], kw])];
  }
}
function purgarEfectosTemporales(s, expira, jugador, _ctx) {
  const jugadores = jugador ? [jugador] : ["A", "B"];
  for (const j of jugadores) {
    for (const id of instanciasEnCampo(s, j)) {
      const inst = s.instances[id];
      if (!inst?.modificadores) continue;
      if (expira === "ocaso") {
        const restantes = inst.modificadores.map((m) => {
          if (m.turnosRestantes !== void 0) {
            return { ...m, turnosRestantes: m.turnosRestantes - 1 };
          }
          return m;
        }).filter((m) => {
          if (m.turnosRestantes !== void 0) return m.turnosRestantes > 0;
          return m.expira !== expira;
        });
        inst.modificadores = restantes;
      } else {
        const restantes = inst.modificadores.filter((m) => m.expira !== expira);
        inst.modificadores = restantes;
      }
    }
  }
}
function purgarKeywordsTemporales(s) {
  for (const j of ["A", "B"]) {
    for (const id of instanciasEnCampo(s, j)) {
      const inst = s.instances[id];
      if (inst?.keywordsTemporales && inst.keywordsTemporales.length > 0) {
        inst.keywordsTemporales = [];
      }
    }
  }
}

// src/online/game/payments.ts
function aporteDe(eterCardId, _objetivoCardId) {
  const eter = getCardMeta(eterCardId);
  if (!eter) return 0;
  return 1;
}
function validarPago(state, jugador, eterIds, objetivoCardId) {
  if (eterIds.length === 0) return { ok: false, error: "no indicaste \xC9teres para pagar" };
  const objetivo = getCardMeta(objetivoCardId);
  if (!objetivo) return { ok: false, error: `carta objetivo desconocida: ${objetivoCardId}` };
  const p = state.players[jugador];
  const vistos = /* @__PURE__ */ new Set();
  let suma = 0;
  for (const id of eterIds) {
    if (vistos.has(id)) return { ok: false, error: `\xC9ter duplicado: ${id}` };
    vistos.add(id);
    const inst = state.instances[id];
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null;
    if (!inst || !meta || !esEter(meta)) return { ok: false, error: `no es un \xC9ter: ${id}` };
    if (!p.eterReserva.includes(id)) return { ok: false, error: `el \xC9ter no est\xE1 en tu Reserva: ${id}` };
    suma += aporteDe(meta.id, objetivoCardId);
  }
  if (suma < objetivo.stats.cost) return { ok: false, error: "pago insuficiente" };
  if (suma > objetivo.stats.cost) return { ok: false, error: "sobrepago no permitido \u2014 selecciona exactamente el coste" };
  return { ok: true, aportado: suma };
}
function aplicarPago(s, ctx, jugador, eterIds, objetivoCardId, contextoUso) {
  const validado = validarPago(s, jugador, eterIds, objetivoCardId);
  if (!validado.ok || validado.aportado === void 0) return s;
  const objetivo = getCardMeta(objetivoCardId);
  if (!objetivo) return s;
  const p = s.players[jugador];
  for (const id of eterIds) {
    p.eterReserva.splice(p.eterReserva.indexOf(id), 1);
    p.eterPagado.push(id);
  }
  ctx.emit({
    type: "eter_pagado",
    jugador,
    eterIds,
    costo: objetivo.stats.cost,
    aportado: validado.aportado
  });
  const gatillos = eterIds.filter((id) => {
    const inst = s.instances[id];
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null;
    if (!meta || !esEter(meta)) return false;
    if ("efectos" in meta && meta.efectos) {
      return meta.efectos.some((e) => e.trigger === "al_pagar_eter");
    }
    return false;
  });
  for (const id of gatillos) {
    dispararTrigger(s, ctx, "al-pagar-eter", jugador, [id], {
      contextoUso: contextoUso?.tipo,
      objetivoId: contextoUso?.cardInstanceId
    });
  }
  return s;
}
function etersParaPagar(state, jugador, objetivoCardId) {
  const objetivo = getCardMeta(objetivoCardId);
  if (!objetivo) return null;
  const p = state.players[jugador];
  const coste = objetivo.stats.cost;
  const eteres = [];
  for (const id of p.eterReserva) {
    const inst = state.instances[id];
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null;
    if (!meta) continue;
    eteres.push({ id, contrib: aporteDe(meta.id, objetivoCardId) });
  }
  function buscar(start, sumaActual, seleccionados) {
    if (sumaActual === coste) return seleccionados;
    if (sumaActual > coste) return null;
    for (let i = start; i < eteres.length; i++) {
      const resultado = buscar(i + 1, sumaActual + eteres[i].contrib, [...seleccionados, eteres[i].id]);
      if (resultado) return resultado;
    }
    return null;
  }
  return buscar(0, 0, []);
}
function validarBloqueo(state, jugador, eterIds, targetInstanceId) {
  const inst = state.instances[targetInstanceId];
  if (!inst) return "la carta no existe";
  const p = state.players[jugador];
  const enCampo = p.campo.campeones.includes(targetInstanceId) || p.campo.misticasTacticas.includes(targetInstanceId) || p.campo.arcanasCombate.includes(targetInstanceId);
  if (!enCampo) return "la carta no est\xE1 en tu campo";
  const meta = inst.cardId ? getCardMeta(inst.cardId) : null;
  if (!meta) return "carta desconocida";
  if (!p.campo.campeones.includes(targetInstanceId)) {
    if (!cartaNecesitaEterBloqueado(meta)) {
      return "esta carta no tiene efecto que use \xC9ter bloqueado";
    }
  }
  if (eterIds.length === 0) return "no indicaste \xC9teres para bloquear";
  const maxEter = maxEterBloqueado(meta);
  const fijo = esBloqueoFijo(meta);
  const actuales = inst.eterBloqueado?.length ?? 0;
  const total = actuales + eterIds.length;
  if (fijo) {
    if (total !== maxEter) {
      return `bloqueo fijo: debes bloquear exactamente ${maxEter} \xC9ter(es) en esta carta (ya tiene ${actuales}, seleccionaste ${eterIds.length})`;
    }
  } else if (total > maxEter) {
    return `m\xE1ximo ${maxEter} \xC9ter(es) bloqueado(s) en esta carta (ya tiene ${actuales})`;
  }
  for (const id of eterIds) {
    const eterInst = state.instances[id];
    const eterMeta = eterInst?.cardId ? getCardMeta(eterInst.cardId) : null;
    if (!eterInst || !eterMeta || !esEter(eterMeta)) return `no es un \xC9ter: ${id}`;
    if (!p.eterReserva.includes(id)) return `el \xC9ter no est\xE1 en tu Reserva: ${id}`;
    if (inst.eterBloqueado?.includes(id)) return `el \xC9ter ya est\xE1 bloqueado en esta carta`;
    for (const grupo of ["campeones", "misticasTacticas", "arcanasCombate"]) {
      for (const cid of p.campo[grupo]) {
        if (cid && cid !== targetInstanceId) {
          const ci = state.instances[cid];
          if (ci?.eterBloqueado?.includes(id)) return `el \xC9ter ya est\xE1 bloqueado en otra carta`;
        }
      }
    }
  }
  return null;
}
function maxEterBloqueado(card) {
  if ("efectos" in card && card.efectos) {
    for (const e of card.efectos) {
      if (e.costo?.tipo === "eter_bloqueado" && e.costo.cantidad !== void 0) {
        return e.costo.cantidad;
      }
      if (e.costo?.tipo === "bloqueo_fijo" && e.costo.cantidad !== void 0) {
        return e.costo.cantidad;
      }
    }
  }
  return 1;
}
function esBloqueoFijo(card) {
  if ("efectos" in card && card.efectos) {
    return card.efectos.some((e) => e.costo?.tipo === "bloqueo_fijo");
  }
  return false;
}
function bloquearEter(s, ctx, jugador, eterIds, targetInstanceId) {
  const error = validarBloqueo(s, jugador, eterIds, targetInstanceId);
  if (error) return error;
  const p = s.players[jugador];
  const instTarget = s.instances[targetInstanceId];
  instTarget.eterBloqueado = [...instTarget.eterBloqueado ?? [], ...eterIds];
  for (const id of eterIds) {
    p.eterReserva.splice(p.eterReserva.indexOf(id), 1);
  }
  ctx.emit({ type: "eter_bloqueado", jugador, eterIds, campeonId: targetInstanceId });
  return null;
}
function reagruparEter(s, ctx, jugador) {
  const p = s.players[jugador];
  if (p.eterPagado.length === 0) return;
  const reagrupados = p.eterPagado;
  p.eterReserva.push(...reagrupados);
  p.eterPagado = [];
  ctx.emit({ type: "eter_reagrupado", jugador, eterIds: reagrupados });
}

// src/online/game/zones.ts
var SLOTS_CAMPEONES = 5;
var SLOTS_MISTICAS_TACTICAS = 3;
var SLOTS_ARCANAS_COMBATE = 3;
var SLOTS_VINCULOS = 6;
var LIMITE_MANO = 6;
var LETRAS_CAMPEONES = ["B", "C", "D", "E", "F"];
var LETRAS_MISTICAS = ["A", "B", "C"];
var LETRAS_ARCANAS = ["D", "E", "F"];
var LETRAS_VINCULOS = ["A", "B", "C", "D", "E", "F"];
function limiteSlots(grupo) {
  switch (grupo) {
    case "campeones":
      return SLOTS_CAMPEONES;
    case "misticasTacticas":
      return SLOTS_MISTICAS_TACTICAS;
    case "arcanasCombate":
      return SLOTS_ARCANAS_COMBATE;
    case "vinculos":
      return SLOTS_VINCULOS;
  }
}
function slotAZona(grupo, slot) {
  if (slot < 0) return null;
  switch (grupo) {
    case "campeones":
      return slot < LETRAS_CAMPEONES.length ? `2${LETRAS_CAMPEONES[slot]}` : null;
    case "misticasTacticas":
      return slot < LETRAS_MISTICAS.length ? `3${LETRAS_MISTICAS[slot]}` : null;
    case "arcanasCombate":
      return slot < LETRAS_ARCANAS.length ? `3${LETRAS_ARCANAS[slot]}` : null;
    case "vinculos":
      return slot < LETRAS_VINCULOS.length ? `4${LETRAS_VINCULOS[slot]}` : null;
  }
}

// src/online/game/combat.ts
var tieneKeyword = (state, id, kw) => keywordsDe2(state, id).includes(kw);
var rivalDe = (state) => state.turno === "A" ? "B" : "A";
function controladorDe(s, id) {
  for (const j of ["A", "B"]) {
    if (s.players[j].campo.campeones.includes(id)) return j;
  }
  return null;
}
function atacantesElegibles(state) {
  if (state.primerTurno) return [];
  const p = state.players[state.turno];
  return p.campo.campeones.filter((id) => {
    if (!id) return false;
    const inst = state.instances[id];
    if (!inst) return false;
    const doubleActivo = tieneDoubleAttackActivo(state, id);
    if (inst.atacoEsteTurno && !doubleActivo) return false;
    if (inst.agotado && !tieneKeyword(state, id, "Carga")) {
      if (!(doubleActivo && inst.atacoEsteTurno)) return false;
    }
    return true;
  });
}
function cerrarCombateSiDoubleAttack(s) {
  const combate = s.combate;
  if (!combate) return;
  const dobles = combate.atacantes.some(
    (id) => s.players[s.turno].campo.campeones.includes(id) && tieneDoubleAttackActivo(s, id)
  );
  if (dobles) s.combate = void 0;
}
function bloqueadoresDisponibles(state) {
  const defensor = rivalDe(state);
  const p = state.players[defensor];
  return p.campo.campeones.filter((id) => {
    if (id === null) return false;
    const inst = state.instances[id];
    return !!inst;
  });
}
function ataquesSinBloquear(state) {
  const combate = state.combate;
  if (!combate) return [];
  return combate.atacantes.filter((a) => !(a in combate.bloqueos));
}
function asignacionForzada(state) {
  const combate = state.combate;
  if (!combate || combate.paso !== "bloqueo") return null;
  const disponibles = bloqueadoresDisponibles(state);
  const sinBloquear = ataquesSinBloquear(state);
  const k = Math.min(disponibles.length, sinBloquear.length);
  if (k === 0) return null;
  const asignaciones = {};
  for (let i = 0; i < k; i++) asignaciones[sinBloquear[i]] = disponibles[i];
  return asignaciones;
}
function validarDeclararAtaque(state, atacanteIds) {
  if (state.fase !== "choque") return "declarar_ataque solo en Choque";
  if (state.combate) return "el combate ya fue declarado";
  if (state.primerTurno) return "nadie ataca en el primer turno (\xA78.6)";
  if (atacanteIds.length === 0) return "no declaraste atacantes";
  if (new Set(atacanteIds).size !== atacanteIds.length) return "atacantes duplicados";
  const elegibles = atacantesElegibles(state);
  for (const id of atacanteIds) {
    if (!elegibles.includes(id)) return `el Campe\xF3n no puede atacar: ${id}`;
  }
  return null;
}
function ejecutarDeclararAtaque(s, atacanteIds, ctx) {
  s.combate = {
    paso: "bloqueo",
    atacantes: atacanteIds,
    bloqueos: {},
    rupturaDisponible: true,
    rupturaUsadaEsteTurno: false
  };
  for (const id of atacanteIds) {
    const inst = s.instances[id];
    inst.atacoEsteTurno = true;
    if (!tieneKeyword(s, id, "Vigor")) inst.agotado = true;
    if (tieneKeyword(s, id, "Recarga") && inst.eterBloqueado && inst.eterBloqueado.length > 0) {
      const eter = inst.eterBloqueado.shift();
      s.players[inst.owner].eterReserva.push(eter);
      ctx.emit({ type: "eter_reagrupado", jugador: inst.owner, eterIds: [eter] });
    }
  }
  ctx.emit({ type: "ataque_declarado", jugador: s.turno, atacanteIds });
  dispararTrigger(s, ctx, "al-atacar", s.turno, atacanteIds);
  if (abrirCadena(s, rivalDe(s))) return;
  if (bloqueadoresDisponibles(s).length === 0) {
    s.combate.paso = "resolucion";
    resolverCombate(s, ctx);
    cerrarCombateSiDoubleAttack(s);
  }
}
function validarDeclararBloqueo(state, asignaciones) {
  if (state.fase !== "choque") return "declarar_bloqueo solo en Choque";
  const combate = state.combate;
  if (!combate || combate.paso !== "bloqueo") return "no hay bloqueo pendiente";
  const pares = Object.entries(asignaciones);
  if (pares.length === 0) return "no asignaste bloqueadores";
  const disponibles = bloqueadoresDisponibles(state);
  const sinBloquear = ataquesSinBloquear(state);
  const k = Math.min(disponibles.length, sinBloquear.length);
  if (pares.length !== k) {
    return `el bloqueo es forzoso: asigna exactamente ${k} bloqueador(es) (9.3)`;
  }
  const bloqueadoresUsados = /* @__PURE__ */ new Set();
  for (const [atacanteId, bloqueadorId] of pares) {
    if (!sinBloquear.includes(atacanteId)) return `no es un ataque sin bloquear: ${atacanteId}`;
    if (!disponibles.includes(bloqueadorId)) return `el bloqueador no est\xE1 disponible: ${bloqueadorId}`;
    if (bloqueadoresUsados.has(bloqueadorId)) return "un bloqueador no puede cubrir 2 ataques (L1099)";
    bloqueadoresUsados.add(bloqueadorId);
  }
  return null;
}
function ejecutarDeclararBloqueo(s, asignaciones, ctx) {
  const combate = s.combate;
  combate.bloqueos = { ...combate.bloqueos, ...asignaciones };
  combate.paso = "resolucion";
  combate.rupturaDisponible = ataquesSinBloquear(s).length > 0;
  ctx.emit({ type: "bloqueo_declarado", jugador: rivalDe(s), asignaciones });
  resolverCombate(s, ctx);
  abrirCadena(s, s.turno);
}
function resolverCombate(s, ctx) {
  const combate = s.combate;
  if (!combate) return;
  const muertosAtacantes = [];
  const muertosBloqueadores = [];
  const killerDe = /* @__PURE__ */ new Map();
  for (const atacante of combate.atacantes) {
    const bloqueador = combate.bloqueos[atacante];
    if (!bloqueador) continue;
    const statsAtacante = statsDe(s, atacante);
    const statsBloqueador = statsDe(s, bloqueador);
    if (statsAtacante.poder >= statsBloqueador.resistencia) {
      muertosBloqueadores.push(bloqueador);
      killerDe.set(bloqueador, atacante);
    }
    if (statsBloqueador.poder >= statsAtacante.resistencia) {
      muertosAtacantes.push(atacante);
      killerDe.set(atacante, bloqueador);
    }
  }
  const controladores = /* @__PURE__ */ new Map();
  for (const id of [...muertosAtacantes, ...muertosBloqueadores]) {
    const killerId = killerDe.get(id);
    if (killerId && !controladores.has(killerId)) {
      const c = controladorDe(s, killerId);
      if (c) controladores.set(killerId, c);
    }
  }
  for (const id of [...muertosAtacantes, ...muertosBloqueadores]) {
    const killerId = killerDe.get(id);
    const jugador = killerId ? controladores.get(killerId) : void 0;
    if (destruirCarta(s, ctx, id, "combate") && killerId && jugador) {
      dispararTrigger(s, ctx, "al-matar-en-combate", jugador, [id, killerId], { killerId, victimaId: id });
    }
  }
}
function continuarCombateTrasCadena(s, ctx) {
  const combate = s.combate;
  if (!combate) return;
  if (combate.paso === "bloqueo" && bloqueadoresDisponibles(s).length === 0) {
    combate.paso = "resolucion";
    resolverCombate(s, ctx);
    cerrarCombateSiDoubleAttack(s);
  }
}
function validarElegirRuptura(state, atacanteId, vinculoSlot) {
  if (state.fase !== "choque") return "elegir_ruptura solo en Choque";
  const combate = state.combate;
  if (!combate || combate.paso !== "resolucion") return "no hay resoluci\xF3n pendiente";
  if (combate.rupturaUsadaEsteTurno) return "ya usaste la Ruptura este turno de ataque";
  if (atacanteId === null) {
    if (vinculoSlot !== void 0) return "sin atacante no hay slot de V\xEDnculo";
    return null;
  }
  if (!combate.rupturaDisponible) return "no hay ataques sin bloquear para romper";
  if (!combate.atacantes.includes(atacanteId)) return "no es un atacante declarado";
  if (atacanteId in combate.bloqueos) return "el ataque fue bloqueado: no rompe (L1123)";
  if (!state.players[state.turno].campo.campeones.includes(atacanteId)) return "el atacante muri\xF3";
  if (vinculoSlot === void 0 || vinculoSlot < 0 || vinculoSlot > 5) return "vinculoSlot 0-5";
  const vinculoId = state.players[rivalDe(state)].vinculos[vinculoSlot];
  if (!vinculoId) return "no hay V\xEDnculo vivo en ese slot";
  if (state.instances[vinculoId]?.bocaArriba) return "el V\xEDnculo ya fue destruido";
  return null;
}
function ejecutarElegirRuptura(s, atacanteId, vinculoSlot, ctx) {
  if (atacanteId !== null && vinculoSlot !== void 0) {
    const vinculoId = s.players[rivalDe(s)].vinculos[vinculoSlot];
    ctx.emit({ type: "ruptura_realizada", atacanteId, vinculoSlot, vinculoId });
    destruirCarta(s, ctx, vinculoId, "ruptura");
    if (s.combate) s.combate.rupturaUsadaEsteTurno = true;
    cerrarCombateSiDoubleAttack(s);
  } else {
    s.combate = void 0;
  }
}

// src/online/game/chain.ts
function respondiblesDe(state, playerId) {
  const p = state.players[playerId];
  const cadena = state.combate?.cadena ?? state.cadena;
  const enPila = new Set(cadena?.pila ?? []);
  let velocidadRequerida = "normal";
  if (cadena && cadena.pila.length > 0) {
    const ultimoId = cadena.pila[cadena.pila.length - 1];
    const velUltimo = velocidadDe(state, ultimoId);
    if (velUltimo === "fugaz") return [];
    if (velUltimo === "presteza") velocidadRequerida = "presteza";
  }
  const res = [];
  for (const id of p.campo.misticasTacticas) {
    if (!id) continue;
    if (enPila.has(id)) continue;
    const inst = state.instances[id];
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null;
    if (meta && esMistica(meta) && !inst.entradaEsteTurno) {
      const vel = velocidadDe(state, id);
      if (puedeResponder(vel, velocidadRequerida)) res.push(id);
    }
  }
  for (const id of p.campo.arcanasCombate) {
    if (!id) continue;
    if (enPila.has(id)) continue;
    const inst = state.instances[id];
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null;
    if (!meta) continue;
    if (esArcana(meta) && !inst.entradaEsteTurno) {
      const vel = velocidadDe(state, id);
      if (puedeResponder(vel, velocidadRequerida)) res.push(id);
    }
  }
  for (const id of p.campo.campeones) {
    if (!id) continue;
    if (enPila.has(id)) continue;
    const inst = state.instances[id];
    if (inst?.agotado) continue;
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null;
    if (meta && meta.type === "Campe\xF3n" && "efectos" in meta && meta.efectos?.some((e) => e.tipo === "disparo")) {
      const vel = velocidadDe(state, id);
      if (puedeResponder(vel, velocidadRequerida)) res.push(id);
    }
  }
  return res;
}
function puedeResponder(vel, requerida) {
  if (requerida === "fugaz") return false;
  if (requerida === "presteza") return vel === "presteza" || vel === "fugaz";
  return true;
}
function abrirCadena(s, primerRespondedor) {
  const combate = s.combate;
  if (!combate) return false;
  if (respondiblesDe(s, primerRespondedor).length === 0) return false;
  combate.cadena = { pila: [], prioridad: primerRespondedor, pasesConsecutivos: 0, faseAbierta: s.fase };
  return true;
}
function abrirCadenaGlobal(s, jugadorActivo, efecto) {
  const vel = velocidadDe(s, efecto.cardInstanceId);
  if (vel === "fugaz") return false;
  const rival = jugadorActivo === "A" ? "B" : "A";
  if (respondiblesDe(s, rival).length === 0) return false;
  s.cadena = {
    pila: [],
    prioridad: rival,
    // el rival responde primero
    pasesConsecutivos: 0,
    faseAbierta: s.fase,
    efectoActual: { jugador: jugadorActivo, ...efecto },
    velocidadActual: vel
  };
  return true;
}
function cadenaActiva(s) {
  return s.combate?.cadena ?? s.cadena;
}
function esCadenaDeCombate(s) {
  return !!s.combate?.cadena;
}
function validarResponderCadena(state, cardInstanceId) {
  const cadena = cadenaActiva(state);
  if (!cadena) return "no hay cadena abierta";
  if (!respondiblesDe(state, cadena.prioridad).includes(cardInstanceId)) {
    return "esa carta no puede responder ahora";
  }
  return null;
}
function validarPasarPrioridad(state) {
  if (!cadenaActiva(state)) return "no hay cadena abierta";
  return null;
}
function ejecutarResponderCadena(s, cardInstanceId, ctx) {
  const cadena = cadenaActiva(s);
  if (!cadena) return;
  const jugador = cadena.prioridad;
  cadena.pila.push(cardInstanceId);
  cadena.pasesConsecutivos = 0;
  cadena.velocidadActual = velocidadDe(s, cardInstanceId);
  const inst = s.instances[cardInstanceId];
  const meta = inst?.cardId ? getCardMeta(inst.cardId) : null;
  if (meta && esArcana(meta)) inst.bocaArriba = true;
  if (meta && meta.type === "Campe\xF3n" && "efectos" in meta && meta.efectos?.some((e) => e.tipo === "disparo")) {
    inst.bocaArriba = true;
  }
  ctx.emit({ type: "respuesta_encadenada", jugador, cardInstanceId });
  cadena.prioridad = jugador === "A" ? "B" : "A";
}
function ejecutarPasarPrioridad(s, ctx) {
  const cadena = cadenaActiva(s);
  if (!cadena) return;
  const jugador = cadena.prioridad;
  cadena.pasesConsecutivos++;
  ctx.emit({ type: "prioridad_pasada", jugador });
  if (cadena.pasesConsecutivos >= 2) {
    if (esCadenaDeCombate(s)) {
      resolverCadenaCombate(s, ctx);
    } else {
      resolverCadenaGlobal(s, ctx);
    }
  } else {
    cadena.prioridad = jugador === "A" ? "B" : "A";
  }
}
function resolverCadenaCombate(s, ctx) {
  const combate = s.combate;
  const cadena = combate?.cadena;
  if (!combate || !cadena) return;
  for (const id of [...cadena.pila].reverse()) {
    const inst = s.instances[id];
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null;
    if (!meta) continue;
    if (esArcana(meta)) {
      const p = s.players[inst.owner];
      const idx = p.campo.arcanasCombate.indexOf(id);
      const zona = slotAZona("arcanasCombate", idx) ?? "3D";
      ctx.emit({ type: "carta_salida_de_zona", cardInstanceId: id, zona, jugador: inst.owner });
      enviarAlCementerio(s, ctx, id);
      ctx.emit({ type: "carta_entrada_a_zona", cardInstanceId: id, zona: "2G", jugador: inst.owner, bocaArriba: true });
      dispararTrigger(s, ctx, "al-resolver-cadena", inst.owner, [id]);
    }
  }
  combate.cadena = void 0;
  continuarCombateTrasCadena(s, ctx);
}
function resolverCadenaGlobal(s, ctx) {
  const cadena = s.cadena;
  if (!cadena) return;
  for (const id of [...cadena.pila].reverse()) {
    const inst = s.instances[id];
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null;
    if (!meta) continue;
    if (esArcana(meta)) {
      const p = s.players[inst.owner];
      const idx = p.campo.arcanasCombate.indexOf(id);
      const zona = slotAZona("arcanasCombate", idx) ?? "3D";
      ctx.emit({ type: "carta_salida_de_zona", cardInstanceId: id, zona, jugador: inst.owner });
      enviarAlCementerio(s, ctx, id);
      ctx.emit({ type: "carta_entrada_a_zona", cardInstanceId: id, zona: "2G", jugador: inst.owner, bocaArriba: true });
      dispararTrigger(s, ctx, "al-resolver-cadena", inst.owner, [id]);
    } else {
      dispararTrigger(s, ctx, "al-resolver-cadena", inst.owner, [id]);
    }
  }
  s.cadena = void 0;
}

// src/online/game/movimientos.ts
function requisitoDeMeta(state, meta, jugador) {
  if (!meta || !("condicion" in meta)) return null;
  const condicion = meta.condicion;
  return condicionCumple(state, condicion, jugador);
}
function cartaEnMano(state, cardInstanceId) {
  const p = state.players[state.turno];
  if (!p.mano.includes(cardInstanceId)) return { error: "la carta no est\xE1 en tu mano" };
  const inst = state.instances[cardInstanceId];
  const cardId = inst?.cardId ?? null;
  if (!inst || cardId === null) return { error: "carta desconocida" };
  return { inst, cardId };
}
function validarJugarCampeon(state, action) {
  if (state.fase !== "forja") return "jugar_campeon solo en Forja";
  const base = cartaEnMano(state, action.cardInstanceId);
  if ("error" in base) return base.error;
  const meta = getCardMeta(base.cardId);
  if (!meta || !esCampeon(meta)) return "no es un Campe\xF3n";
  if (action.slot < 0 || action.slot >= SLOTS_CAMPEONES) return "slot inv\xE1lido";
  const p = state.players[state.turno];
  const ocupante = p.campo.campeones[action.slot];
  const sacrificios = action.sacrificios ?? [];
  if (ocupante !== null && !sacrificios.includes(ocupante)) return "slot ocupado";
  const pago = validarPago(state, state.turno, action.eterIds, meta.id);
  if (!pago.ok) return pago.error ?? "pago inv\xE1lido";
  const requeridos = sacrificiosRequeridos(meta.roles);
  if (new Set(sacrificios).size !== sacrificios.length) return "sacrificios duplicados";
  if (sacrificios.length !== requeridos) {
    return requeridos === 0 ? "este Campe\xF3n no exige sacrificios" : `este Campe\xF3n exige ${requeridos} sacrificio(s)`;
  }
  for (const id of sacrificios) {
    const slotIdx = p.campo.campeones.indexOf(id);
    if (slotIdx === -1) return `el sacrificio no es un Campe\xF3n tuyo en tu campo: ${id}`;
    const sInst = state.instances[id];
    const sMeta = sInst?.cardId ? getCardMeta(sInst.cardId) : null;
    if (!sInst || !sMeta || !esCampeon(sMeta)) return `el sacrificio no es un Campe\xF3n: ${id}`;
    if (!faccionesCompartidas(sMeta.facciones, meta.facciones)) return `el sacrificio no comparte facci\xF3n con el Campe\xF3n: ${id}`;
  }
  if (esSingular(meta) && copiasEnCampo(state, state.turno, meta.id) >= 1) {
    return "Singular: solo puede haber 1 copia en el campo";
  }
  return null;
}
function validarJugarMistica(state, action) {
  if (state.fase !== "forja") return "jugar_mistica solo en Forja";
  const base = cartaEnMano(state, action.cardInstanceId);
  if ("error" in base) return base.error;
  const meta = getCardMeta(base.cardId);
  if (!meta || !esMistica(meta)) return "no es una M\xEDstica";
  if (action.slot < 0 || action.slot >= SLOTS_MISTICAS_TACTICAS) return "slot inv\xE1lido";
  if (state.players[state.turno].campo.misticasTacticas[action.slot] !== null) return "slot ocupado";
  const pago = validarPago(state, state.turno, action.eterIds, meta.id);
  if (!pago.ok) return pago.error ?? "pago inv\xE1lido";
  return null;
}
function validarColocarArcana(state, action) {
  if (state.fase !== "forja") return "colocar_arcana solo en Forja";
  const base = cartaEnMano(state, action.cardInstanceId);
  if ("error" in base) return base.error;
  const meta = getCardMeta(base.cardId);
  if (!meta || !esArcana(meta)) return "no es una Arcana";
  if (action.slot < 0 || action.slot >= SLOTS_ARCANAS_COMBATE) return "slot inv\xE1lido";
  if (state.players[state.turno].campo.arcanasCombate[action.slot] !== null) return "slot ocupado";
  return null;
}
function validarColocarVinculo(state, action) {
  if (state.fase !== "pre_partida") return "colocar_vinculo solo en pre_partida";
  const inst = state.instances[action.cardInstanceId];
  if (!inst) return "instancia no encontrada";
  const meta = inst.cardId ? getCardMeta(inst.cardId) : null;
  if (!meta || !esVinculo(meta)) return "no es un V\xEDnculo";
  const p = state.players[state.turno];
  if (!p.mano.includes(action.cardInstanceId)) return "el V\xEDnculo no est\xE1 en tu mano";
  if (action.slot < 0 || action.slot > 5) return "slot inv\xE1lido (0-5)";
  if (p.vinculos[action.slot] !== null) return "el slot de V\xEDnculo ya est\xE1 ocupado";
  return null;
}
function validarEquiparArtefacto(state, action) {
  if (state.fase !== "forja") return "equipar_artefacto solo en Forja";
  const inst = state.instances[action.cardInstanceId];
  if (!inst) return "carta no encontrada";
  const meta = inst.cardId ? getCardMeta(inst.cardId) : null;
  if (!meta) return "carta desconocida";
  if (!("keywords" in meta) || !meta.keywords?.includes("Artefacto")) return "esta carta no tiene ARTEFACTO";
  const p = state.players[state.turno];
  const enMT = p.campo.misticasTacticas.includes(action.cardInstanceId);
  const enAC = p.campo.arcanasCombate.includes(action.cardInstanceId);
  if (!enMT && !enAC) return "la carta no est\xE1 en el campo";
  if (inst.equipadoA) return "la carta ya est\xE1 equipada";
  const campeonInst = state.instances[action.campeonInstanceId];
  if (!campeonInst) return "campe\xF3n no encontrado";
  if (!p.campo.campeones.includes(action.campeonInstanceId)) return "el campe\xF3n no est\xE1 en tu campo";
  const campeonMeta = campeonInst.cardId ? getCardMeta(campeonInst.cardId) : null;
  if (!campeonMeta || !esCampeon(campeonMeta)) return "el objetivo no es un Campe\xF3n";
  return null;
}
function ejecutarJugarCampeon(s, action, ctx) {
  const p = s.players[s.turno];
  const id = action.cardInstanceId;
  const cardId = s.instances[id].cardId;
  const contextoUso = { tipo: "invocar", cardInstanceId: id };
  aplicarPago(s, ctx, s.turno, action.eterIds, cardId, contextoUso);
  for (const sacId of action.sacrificios ?? []) {
    const slotIdx = p.campo.campeones.indexOf(sacId);
    const zona2 = slotAZona("campeones", slotIdx) ?? "2B";
    ctx.emit({ type: "carta_salida_de_zona", cardInstanceId: sacId, zona: zona2, jugador: s.turno });
    p.campo.campeones[slotIdx] = null;
    liberarEterBloqueado(s, ctx, sacId, "2A");
    enviarAlCementerio(s, ctx, sacId);
    ctx.emit({ type: "carta_entrada_a_zona", cardInstanceId: sacId, zona: "2G", jugador: s.turno, bocaArriba: true });
  }
  p.mano.splice(p.mano.indexOf(id), 1);
  const zona = slotAZona("campeones", action.slot) ?? "2B";
  ctx.emit({ type: "carta_salida_de_zona", cardInstanceId: id, zona: "mano", jugador: s.turno });
  p.campo.campeones[action.slot] = id;
  s.instances[id].agotado = true;
  s.instances[id].entradaEsteTurno = true;
  ctx.emit({ type: "carta_entrada_a_zona", cardInstanceId: id, zona, jugador: s.turno, bocaArriba: true });
  ctx.emit({ type: "carta_invocada", cardInstanceId: id, tipo: "Campe\xF3n", slot: action.slot });
  dispararTrigger(s, ctx, "al-invocar", s.turno, [id]);
  const metaC = getCardMeta(s.instances[id].cardId);
  abrirCadenaGlobal(s, s.turno, { cardInstanceId: id, descripcion: metaC?.name ?? id });
}
function ejecutarJugarMistica(s, action, ctx) {
  const p = s.players[s.turno];
  const id = action.cardInstanceId;
  const contextoUso = { tipo: "jugar", cardInstanceId: id };
  aplicarPago(s, ctx, s.turno, action.eterIds, s.instances[id].cardId, contextoUso);
  p.mano.splice(p.mano.indexOf(id), 1);
  const zona = slotAZona("misticasTacticas", action.slot) ?? "3A";
  ctx.emit({ type: "carta_salida_de_zona", cardInstanceId: id, zona: "mano", jugador: s.turno });
  p.campo.misticasTacticas[action.slot] = id;
  s.instances[id].entradaEsteTurno = true;
  ctx.emit({ type: "carta_entrada_a_zona", cardInstanceId: id, zona, jugador: s.turno, bocaArriba: true });
  ctx.emit({ type: "carta_invocada", cardInstanceId: id, tipo: "M\xEDstica", slot: action.slot });
  dispararTrigger(s, ctx, "al-jugar-mistica", s.turno, [id]);
  const inst = s.instances[id];
  const meta = inst.cardId ? getCardMeta(inst.cardId) : null;
  if (meta && "efectos" in meta && meta.efectos) {
    for (const efecto of meta.efectos) {
      if (efecto.tipo === "hechizo" && !efecto.trigger && efecto.efecto) {
        interpretEffect(s, ctx, inst, efecto, { jugador: s.turno, fromTrigger: true });
      }
    }
  }
  const metaM = getCardMeta(s.instances[id].cardId);
  abrirCadenaGlobal(s, s.turno, { cardInstanceId: id, descripcion: metaM?.name ?? id });
}
function ejecutarColocarArcana(s, action, ctx) {
  const p = s.players[s.turno];
  const id = action.cardInstanceId;
  p.mano.splice(p.mano.indexOf(id), 1);
  const zona = slotAZona("arcanasCombate", action.slot) ?? "3D";
  ctx.emit({ type: "carta_salida_de_zona", cardInstanceId: id, zona: "mano", jugador: s.turno });
  p.campo.arcanasCombate[action.slot] = id;
  s.instances[id].bocaArriba = false;
  s.instances[id].entradaEsteTurno = true;
  ctx.emit({ type: "carta_entrada_a_zona", cardInstanceId: id, zona, jugador: s.turno, bocaArriba: false });
  ctx.emit({ type: "carta_invocada", cardInstanceId: id, tipo: "Arcana", slot: action.slot });
}
function ejecutarColocarVinculo(s, action, ctx) {
  const p = s.players[s.turno];
  const id = action.cardInstanceId;
  p.mano.splice(p.mano.indexOf(id), 1);
  const zona = `4${String.fromCharCode(65 + action.slot)}`;
  ctx.emit({ type: "carta_salida_de_zona", cardInstanceId: id, zona: "mano", jugador: s.turno });
  p.vinculos[action.slot] = id;
  s.instances[id].bocaArriba = false;
  ctx.emit({ type: "carta_entrada_a_zona", cardInstanceId: id, zona, jugador: s.turno, bocaArriba: false });
  ctx.emit({ type: "carta_invocada", cardInstanceId: id, tipo: "V\xEDnculo", slot: action.slot });
}
function ejecutarEquiparArtefacto(s, action, ctx) {
  const inst = s.instances[action.cardInstanceId];
  if (!inst) return;
  inst.equipadoA = action.campeonInstanceId;
  ctx.emit({ type: "carta_activada", cardInstanceId: action.cardInstanceId, jugador: s.turno, slot: -1 });
}
function generarAccionesForja(state, playerId, cardInstanceId) {
  const p = state.players[playerId];
  const inst = state.instances[cardInstanceId];
  const cardId = inst?.cardId ?? null;
  const meta = cardId ? getCardMeta(cardId) : null;
  if (!meta) return null;
  switch (meta.type) {
    case "Campe\xF3n": {
      const eterIds = etersParaPagar(state, playerId, meta.id);
      if (!eterIds) return null;
      const requeridos = sacrificiosRequeridos(meta.roles);
      const sacrificables = campeonesSacrificables(state, playerId, meta.id);
      if (sacrificables.length < requeridos) return null;
      const sacrificios = sacrificables.slice(0, requeridos);
      let slot;
      if (requeridos > 0 && sacrificios.length > 0) {
        slot = p.campo.campeones.indexOf(sacrificios[0]);
      } else {
        slot = p.campo.campeones.findIndex((c) => c === null);
        if (slot === -1) return null;
      }
      const accion = { type: "jugar_campeon", cardInstanceId, slot, eterIds, sacrificios };
      if (validarJugarCampeon(state, accion) !== null) return null;
      if (requisitoDeMeta(state, meta, playerId) !== null) return null;
      return accion;
    }
    case "M\xEDstica": {
      const eterIds = etersParaPagar(state, playerId, meta.id);
      if (!eterIds) return null;
      const slot = p.campo.misticasTacticas.findIndex((c) => c === null);
      if (slot === -1) return null;
      const accion = { type: "jugar_mistica", cardInstanceId, slot, eterIds };
      if (validarJugarMistica(state, accion) !== null) return null;
      if (requisitoDeMeta(state, meta, playerId) !== null) return null;
      return accion;
    }
    case "Arcana": {
      const slot = p.campo.arcanasCombate.findIndex((c) => c === null);
      if (slot === -1) return null;
      const accion = { type: "colocar_arcana", cardInstanceId, slot };
      if (validarColocarArcana(state, accion) !== null) return null;
      return accion;
    }
    default:
      return null;
  }
}

// src/online/game/effectRegistry.ts
function generarId(s) {
  const count = s.efectosPendientes?.length ?? 0;
  return `ep-${count + 1}`;
}
function registrarEfectoPendiente(s, params) {
  if (!s.efectosPendientes) s.efectosPendientes = [];
  const id = generarId(s);
  const efecto = {
    id,
    fuente: params.fuente,
    owner: params.owner,
    triggerFase: params.triggerFase,
    triggerOwner: params.triggerOwner ?? "due\xF1o",
    accion: params.accion,
    duracion: params.duracion
  };
  s.efectosPendientes.push(efecto);
  return id;
}
function resolverFaseEfectos(s, ctx, fase, jugadorActual) {
  if (!s.efectosPendientes || s.efectosPendientes.length === 0) return;
  const aResolver = s.efectosPendientes.filter((ep) => {
    if (ep.triggerFase !== fase) return false;
    if (ep.triggerOwner === "due\xF1o" && ep.owner !== jugadorActual) return false;
    if (ep.triggerOwner === "rival" && ep.owner === jugadorActual) return false;
    if (ep.resuelto) return false;
    return true;
  });
  for (const ep of aResolver) {
    ejecutarAccionEfecto(s, ctx, ep);
    ep.resuelto = true;
  }
  purgarEfectosPendientes(s, fase, jugadorActual);
}
function ejecutarAccionEfecto(s, ctx, ep) {
  const accion = ep.accion;
  switch (accion.tipo) {
    case "modificar": {
      const inst = s.instances[accion.objetivo];
      if (!inst) return;
      if (!inst.modificadores) inst.modificadores = [];
      inst.modificadores.push({
        stat: accion.stat,
        valor: accion.delta,
        expira: duracionAExpira(ep.duracion),
        turnosRestantes: ep.duracion.tipo === "turnos" ? ep.duracion.restantes : void 0
      });
      break;
    }
    case "liberar-eter": {
      const inst = s.instances[ep.fuente];
      if (!inst?.eterBloqueado || inst.eterBloqueado.length === 0) break;
      const eteresVivos = accion.eterIds.filter((id) => inst.eterBloqueado.includes(id));
      if (eteresVivos.length === 0) break;
      inst.eterBloqueado = inst.eterBloqueado.filter((id) => !eteresVivos.includes(id));
      const p = s.players[ep.owner];
      p.eterReserva.push(...eteresVivos);
      ctx.emit({ type: "eter_reagrupado", jugador: ep.owner, eterIds: eteresVivos });
      if (inst.cardId) {
        const meta = getCardMeta(inst.cardId);
        const stealEfecto = meta && "efectos" in meta ? meta.efectos?.find((e) => e.efecto === "steal_champion") : void 0;
        if (stealEfecto?.duracion === "mientras_ester_bloqueado") {
          for (const other of Object.values(s.instances)) {
            if (other.stolenBy !== ep.fuente) continue;
            const enCampoLadron = s.players[ep.owner].campo.campeones.includes(other.cardInstanceId);
            if (!enCampoLadron) {
              delete other.stolenBy;
              continue;
            }
            const duenoOriginal = other.owner;
            const campoOriginal = s.players[duenoOriginal].campo.campeones;
            const slotLibre = campoOriginal.indexOf(null);
            if (slotLibre !== -1 && duenoOriginal !== ep.owner) {
              const idxLadron = s.players[ep.owner].campo.campeones.indexOf(other.cardInstanceId);
              if (idxLadron !== -1) s.players[ep.owner].campo.campeones[idxLadron] = null;
              campoOriginal[slotLibre] = other.cardInstanceId;
            }
            delete other.stolenBy;
          }
        }
      }
      break;
    }
    case "destruir": {
      const inst = s.instances[accion.objetivo];
      if (!inst) return;
      const p = s.players[inst.owner];
      const slotIdx = p.campo.campeones.indexOf(accion.objetivo);
      if (slotIdx !== -1) {
        p.campo.campeones[slotIdx] = null;
        ctx.emit({ type: "carta_salida_de_zona", cardInstanceId: accion.objetivo, zona: `2${String.fromCharCode(66 + slotIdx)}`, jugador: inst.owner });
        enviarAlCementerio(s, ctx, accion.objetivo);
        ctx.emit({ type: "carta_entrada_a_zona", cardInstanceId: accion.objetivo, zona: "2G", jugador: inst.owner, bocaArriba: true });
      }
      break;
    }
    case "agotar": {
      const inst = s.instances[accion.objetivo];
      if (inst) inst.agotado = true;
      break;
    }
    case "robar-cartas": {
      const p = s.players[ep.owner];
      for (let i = 0; i < accion.cantidad; i++) {
        if (p.mazo.length === 0) break;
        const cartaId = p.mazo.shift();
        p.mano.push(cartaId);
        ctx.emit({ type: "carta_robada", jugador: ep.owner, cardInstanceId: cartaId });
      }
      break;
    }
    case "keyword-temporal": {
      const inst = s.instances[accion.objetivo];
      if (!inst) return;
      if (!inst.keywordsTemporales) inst.keywordsTemporales = [];
      if (!inst.keywordsTemporales.includes(accion.keyword)) {
        inst.keywordsTemporales.push(accion.keyword);
      }
      break;
    }
    case "enviar-cementerio": {
      const inst = s.instances[accion.objetivo];
      if (!inst) break;
      const p = s.players[inst.owner];
      const slotMT = p.campo.misticasTacticas.indexOf(accion.objetivo);
      if (slotMT !== -1) {
        const zona = `3${String.fromCharCode(65 + slotMT)}`;
        ctx.emit({ type: "carta_salida_de_zona", cardInstanceId: accion.objetivo, zona, jugador: inst.owner });
        p.campo.misticasTacticas[slotMT] = null;
        p.cementerio.push(accion.objetivo);
        ctx.emit({ type: "carta_entrada_a_zona", cardInstanceId: accion.objetivo, zona: "2G", jugador: inst.owner, bocaArriba: true });
        break;
      }
      const slotAC = p.campo.arcanasCombate.indexOf(accion.objetivo);
      if (slotAC !== -1) {
        const zona = `3${String.fromCharCode(68 + slotAC)}`;
        ctx.emit({ type: "carta_salida_de_zona", cardInstanceId: accion.objetivo, zona, jugador: inst.owner });
        p.campo.arcanasCombate[slotAC] = null;
        p.cementerio.push(accion.objetivo);
        ctx.emit({ type: "carta_entrada_a_zona", cardInstanceId: accion.objetivo, zona: "2G", jugador: inst.owner, bocaArriba: true });
        break;
      }
      const slotCP = p.campo.campeones.indexOf(accion.objetivo);
      if (slotCP !== -1) {
        const zona = `2${String.fromCharCode(66 + slotCP)}`;
        ctx.emit({ type: "carta_salida_de_zona", cardInstanceId: accion.objetivo, zona, jugador: inst.owner });
        p.campo.campeones[slotCP] = null;
        enviarAlCementerio(s, ctx, accion.objetivo);
        ctx.emit({ type: "carta_entrada_a_zona", cardInstanceId: accion.objetivo, zona: "2G", jugador: inst.owner, bocaArriba: true });
      }
      break;
    }
  }
}
function purgarEfectosPendientes(s, fase, jugadorActual) {
  if (!s.efectosPendientes) return;
  s.efectosPendientes = s.efectosPendientes.filter((ep) => {
    if (ep.resuelto && ep.duracion.tipo !== "permanente") {
      if (ep.duracion.tipo === "turnos" && ep.duracion.restantes !== void 0 && ep.duracion.restantes > 0) {
        return true;
      }
      return false;
    }
    if (ep.duracion.tipo === "turnos" && fase === "ocaso" && ep.owner === jugadorActual) {
      if (ep.duracion.restantes !== void 0) {
        ep.duracion.restantes -= 1;
        if (ep.duracion.restantes <= 0) return false;
      }
      return true;
    }
    if (ep.duracion.tipo === "hasta-fase" && ep.duracion.hastaFase === fase) {
      if (ep.duracion.ownerTrigger === "due\xF1o" && ep.owner === jugadorActual) return false;
      if (ep.duracion.ownerTrigger === "rival" && ep.owner !== jugadorActual) return false;
      if (ep.duracion.ownerTrigger === "cualquiera") return false;
    }
    return true;
  });
}
function duracionAExpira(duracion) {
  switch (duracion.tipo) {
    case "turnos":
      return "ocaso";
    case "hasta-fase":
      return duracion.hastaFase === "alba" ? "alba-due\xF1o" : "ocaso";
    case "permanente":
      return "permanente";
  }
}
function hastaAlba() {
  return { tipo: "hasta-fase", hastaFase: "alba", ownerTrigger: "due\xF1o" };
}

// src/online/game/habilidades.ts
function validarActivarArcana(state, action) {
  if (state.fase !== "forja") return "activar_arcana solo en Forja";
  const inst = state.instances[action.cardInstanceId];
  if (!inst) return "instancia no encontrada";
  const meta = inst.cardId ? getCardMeta(inst.cardId) : null;
  if (!meta) return "carta desconocida";
  const p = state.players[state.turno];
  const idx = p.campo.arcanasCombate.indexOf(action.cardInstanceId);
  if (idx === -1) return "la Arcana no est\xE1 en el campo";
  if (inst.bocaArriba) return "la Arcana ya est\xE1 boca arriba";
  if (inst.entradaEsteTurno) return "la Arcana no se puede activar el turno en que fue colocada (\xA75.4)";
  const condicion = "condicion" in meta ? meta.condicion : void 0;
  const condError = condicionCumple(state, condicion, state.turno);
  if (condError) return condError;
  if (action.slot !== idx) return "el slot no coincide con la posici\xF3n de la Arcana";
  const pago = validarPago(state, state.turno, action.eterIds, meta.id);
  if (!pago.ok) return pago.error ?? "pago inv\xE1lido";
  return null;
}
function validarActivarHabilidad(state, action) {
  const p = state.players[state.turno];
  const inst = state.instances[action.cardInstanceId];
  if (!inst) return "la carta no existe";
  if (!p.campo.campeones.includes(action.cardInstanceId)) return "la carta no est\xE1 en tu campo";
  if (championNegado(state, action.cardInstanceId)) {
    return "este campe\xF3n est\xE1 negado: no puede activar efectos";
  }
  const meta = inst.cardId ? getCardMeta(inst.cardId) : null;
  if (!meta) return "carta desconocida";
  const tieneEfectos = "efectos" in meta && meta.efectos;
  const tieneContinuo = tieneEfectos && meta.efectos.some((e) => e.tipo === "continuo");
  const tieneDisparo = tieneEfectos && meta.efectos.some((e) => e.tipo === "disparo");
  if (!tieneContinuo && !tieneDisparo) return "esta carta no tiene efecto activo";
  const esContinuo = tieneContinuo;
  const esBloqueado = esContinuo || meta.efectos.some((e) => e.costo?.tipo === "eter_bloqueado");
  if (esBloqueado) {
    const costoEsperado = costeEterHabilidad(meta);
    if (costoEsperado > 0 && action.eterIds.length !== costoEsperado) {
      return `${meta.name} requiere exactamente ${costoEsperado} \xC9ter(es), indicaste ${action.eterIds.length}`;
    }
    if (action.eterIds.length === 0) return "no indicaste \xC9teres para bloquear";
    if (new Set(action.eterIds).size !== action.eterIds.length) return "\xE9teres repetidos";
    for (const eterId of action.eterIds) {
      if (!p.eterReserva.includes(eterId)) return `el \xC9ter ${eterId} no est\xE1 en tu Reserva`;
      const eterInst = state.instances[eterId];
      const eterMeta = eterInst?.cardId ? getCardMeta(eterInst.cardId) : null;
      if (!eterMeta) return `\xC9ter desconocido: ${eterId}`;
    }
  } else {
    if (inst.agotado) return "la carta ya est\xE1 agotada";
    if (inst.opcionUsadaEsteTurno) return "ya usaste esta habilidad este turno";
    const costoEsperado = costeEterHabilidad(meta);
    const costoReal = costoEsperado > 0 ? costoEsperado : 1;
    if (action.eterIds.length !== costoReal) {
      return `${meta.name} requiere exactamente ${costoReal} \xC9ter(es), indicaste ${action.eterIds.length}`;
    }
    for (const eterId of action.eterIds) {
      if (!p.eterReserva.includes(eterId)) return `el \xC9ter ${eterId} no est\xE1 en tu Reserva`;
    }
  }
  return null;
}
function validarUsarTransmutar(state, action) {
  const p = state.players[state.turno];
  const inst = state.instances[action.cardInstanceId];
  if (!inst) return "la carta no existe";
  if (!tieneKeyword(state, action.cardInstanceId, "Transmutar")) return "la carta no tiene Transmutar";
  if (!p.campo.campeones.includes(action.cardInstanceId)) return "la carta no est\xE1 en tu campo";
  if (action.eterIds.length > 2) return "m\xE1ximo 2 \xC9teres pagados";
  if (new Set(action.eterIds).size !== action.eterIds.length) return "\xE9teres repetidos";
  for (const eterId of action.eterIds) {
    if (!p.eterPagado.includes(eterId)) return "un \xC9ter no est\xE1 pagado (1A)";
  }
  return null;
}
function validarElegirOpcion(state, action) {
  if (state.fase !== "forja") return "elegir_opcion solo en Forja";
  const pendiente = state.opcionesPendientes?.find(
    (o) => o.jugador === state.turno && o.eterId === action.opcionId
  );
  if (!pendiente) return "no hay opci\xF3n pendiente para este jugador";
  return null;
}
function validarElegirObjetivo(state, action) {
  const pendiente = state.objetivosPendientes?.[0];
  if (!pendiente) return "no hay objetivo pendiente";
  if (pendiente.jugador !== state.turno) return "no es tu turno para elegir objetivo";
  if (!pendiente.opciones.includes(action.objetivoId)) return "el objetivo no est\xE1 entre las opciones v\xE1lidas";
  return null;
}
function ejecutarActivarArcana(s, action, ctx) {
  const id = action.cardInstanceId;
  const inst = s.instances[id];
  if (!inst) return;
  const contextoUso = { tipo: "habilidad", cardInstanceId: id };
  aplicarPago(s, ctx, s.turno, action.eterIds, inst.cardId, contextoUso);
  inst.bocaArriba = true;
  ctx.emit({ type: "carta_activada", cardInstanceId: id, jugador: s.turno, slot: action.slot });
  const meta = getCardMeta(inst.cardId);
  if (meta && "efectos" in meta && meta.efectos) {
    for (const efecto of meta.efectos) {
      if (efecto.tipo === "hechizo" && !efecto.trigger && efecto.efecto) {
        interpretEffect(s, ctx, inst, efecto, { jugador: s.turno, fromTrigger: true });
      }
    }
  }
  abrirCadenaGlobal(s, s.turno, { cardInstanceId: id, descripcion: meta?.name ?? id });
}
function ejecutarActivarHabilidad(s, action, ctx) {
  const p = s.players[s.turno];
  const inst = s.instances[action.cardInstanceId];
  const meta = inst.cardId ? getCardMeta(inst.cardId) : null;
  if (!meta) return;
  const tieneEfectos = "efectos" in meta && meta.efectos;
  const esContinuo = tieneEfectos && meta.efectos.some((e) => e.tipo === "continuo");
  const esBloqueado = esContinuo || tieneEfectos && meta.efectos.some((e) => e.costo?.tipo === "eter_bloqueado");
  if (esContinuo || esBloqueado) {
    for (const eterId of action.eterIds) {
      p.eterReserva.splice(p.eterReserva.indexOf(eterId), 1);
    }
    inst.eterBloqueado = [...inst.eterBloqueado ?? [], ...action.eterIds];
    if (tieneEfectos) {
      const efectoConReagrupar = meta.efectos.find((e) => e.reagrupar);
      if (efectoConReagrupar?.reagrupar) {
        registrarEfectoPendiente(s, {
          fuente: action.cardInstanceId,
          owner: s.turno,
          triggerFase: efectoConReagrupar.reagrupar.fase,
          triggerOwner: efectoConReagrupar.reagrupar.turno === "propio" ? "due\xF1o" : "rival",
          accion: { tipo: "liberar-eter", eterIds: [...action.eterIds], destino: "reserva" },
          duracion: hastaAlba()
        });
      }
    }
    ctx.emit({ type: "eter_bloqueado", jugador: s.turno, eterIds: action.eterIds, campeonId: action.cardInstanceId });
    if (esContinuo) {
      inst.agotado = true;
    }
    ejecutarEfectoDesdeJSON(s, ctx, meta, action.cardInstanceId, action.objetivoId);
  } else {
    for (const eterId of action.eterIds) {
      p.eterReserva.splice(p.eterReserva.indexOf(eterId), 1);
      p.eterPagado.push(eterId);
    }
    if (action.eterIds.length > 0) {
      ctx.emit({ type: "eter_pagado", jugador: s.turno, eterIds: action.eterIds, costo: action.eterIds.length, aportado: action.eterIds.length });
    }
    inst.opcionUsadaEsteTurno = true;
    ejecutarEfectoDesdeJSON(s, ctx, meta, action.cardInstanceId, action.objetivoId);
  }
}
function ejecutarEfectoDesdeJSON(s, ctx, meta, cardInstanceId, objetivoId) {
  if (!("efectos" in meta) || !meta.efectos) return;
  const inst = s.instances[cardInstanceId];
  if (!inst) return;
  const efecto = objetivoId ? meta.efectos.find((e) => e.tipo === "continuo") : meta.efectos.find((e) => e.tipo === "disparo");
  if (!efecto) return;
  const payload = {
    jugador: s.turno,
    contextoUso: objetivoId ? "objetivo-elegido" : void 0,
    objetivoId
  };
  interpretEffect(s, ctx, inst, efecto, payload);
}
function ejecutarUsarTransmutar(s, action, ctx) {
  const p = s.players[s.turno];
  const id = action.cardInstanceId;
  const inst = s.instances[id];
  for (const eterId of action.eterIds) {
    const idx = p.eterPagado.indexOf(eterId);
    if (idx !== -1) p.eterPagado.splice(idx, 1);
  }
  p.eterReserva.push(...action.eterIds);
  if (action.eterIds.length > 0) {
    ctx.emit({ type: "eter_reagrupado", jugador: s.turno, eterIds: action.eterIds });
  }
  const slotIdx = p.campo.campeones.indexOf(id);
  const zona = slotAZona("campeones", slotIdx) ?? "2B";
  ctx.emit({ type: "carta_salida_de_zona", cardInstanceId: id, zona, jugador: s.turno });
  p.campo.campeones[slotIdx] = null;
  liberarEterBloqueado(s, ctx, id, "1A");
  enviarAlCementerio(s, ctx, id);
  ctx.emit({ type: "carta_entrada_a_zona", cardInstanceId: id, zona: "2G", jugador: inst.owner, bocaArriba: true });
}
function ejecutarElegirOpcion(s, action, ctx) {
  const j = s.turno;
  const p = s.players[j];
  const pendiente = s.opcionesPendientes.find((o) => o.jugador === j && o.eterId === action.opcionId);
  if (!pendiente) return;
  let elegido = null;
  for (const campeonId of p.campo.campeones) {
    if (!campeonId) continue;
    const metaC = s.instances[campeonId]?.cardId ? getCardMeta(s.instances[campeonId].cardId) : null;
    if (!metaC) continue;
    for (const eterId of p.eterReserva) {
      const metaE = s.instances[eterId]?.cardId ? getCardMeta(s.instances[eterId].cardId) : null;
      if (metaE && faccionesCompartidas(metaE.facciones, metaC.facciones)) {
        elegido = { targetInstanceId: campeonId, eterId };
        break;
      }
    }
  }
  if (!elegido) {
    s.opcionesPendientes = s.opcionesPendientes.filter((o) => !(o.jugador === j && o.eterId === action.opcionId));
    return;
  }
  const error = validarBloqueo(s, j, [elegido.eterId], elegido.targetInstanceId);
  if (error) {
    s.opcionesPendientes = s.opcionesPendientes.filter((o) => !(o.jugador === j && o.eterId === action.opcionId));
    return;
  }
  const instCampeon = s.instances[elegido.targetInstanceId];
  instCampeon.eterBloqueado = [...instCampeon.eterBloqueado ?? [], elegido.eterId];
  p.eterReserva.splice(p.eterReserva.indexOf(elegido.eterId), 1);
  ctx.emit({ type: "eter_bloqueado", jugador: j, eterIds: [elegido.eterId], campeonId: elegido.targetInstanceId });
  const eterPasivo = s.instances[pendiente.eterId];
  if (eterPasivo) eterPasivo.opcionUsadaEsteTurno = true;
  s.opcionesPendientes = s.opcionesPendientes.filter((o) => !(o.jugador === j && o.eterId === action.opcionId));
}
function ejecutarElegirObjetivo(s, action, ctx) {
  const pendiente = s.objetivosPendientes?.[0];
  if (!pendiente) return;
  s.objetivosPendientes = s.objetivosPendientes.slice(1);
  dispararTrigger(s, ctx, pendiente.trigger, pendiente.jugador, [pendiente.instId], {
    contextoUso: "objetivo-elegido",
    objetivoId: action.objetivoId
  });
}

// src/online/game/economia.ts
function validarBloquearEter(state, action) {
  if (state.fase !== "forja") return "bloquear_eter solo en Forja";
  return validarBloqueo(state, state.turno, action.eterIds, action.targetInstanceId);
}
function ejecutarBloquearEter(s, action, ctx) {
  bloquearEter(s, ctx, s.turno, action.eterIds, action.targetInstanceId);
  dispararUmbralBloqueo(s, ctx, action.targetInstanceId);
}

// src/online/game/phases.ts
function resolverAlba(s, ctx, jugador) {
  const p = s.players[jugador];
  resolverFaseEfectos(s, ctx, "alba", jugador);
  purgarEfectosTemporales(s, "alba-due\xF1o", jugador, ctx);
  for (const slot of p.campo.campeones) {
    if (slot) {
      const inst = s.instances[slot];
      if (inst.agotado) delete inst.agotado;
      if (inst.atacoEsteTurno) delete inst.atacoEsteTurno;
    }
  }
  for (const id of [...p.campo.misticasTacticas, ...p.campo.arcanasCombate]) {
    if (id && s.instances[id]?.entradaEsteTurno) delete s.instances[id].entradaEsteTurno;
  }
  const vinculosSnapshot = p.vinculos.filter((id) => {
    if (!id) return false;
    return s.instances[id]?.bocaArriba === true;
  });
  const albaInstances = [...p.eterPagado, ...vinculosSnapshot];
  if (albaInstances.length > 0) {
    dispararTrigger(s, ctx, "al-inicio-alba", jugador, albaInstances);
  }
  for (const eterId of p.eterPagado) {
    const eterInst = s.instances[eterId];
    const eterMeta = eterInst?.cardId ? getCardMeta(eterInst.cardId) : null;
    if (!eterMeta || !("efectos" in eterMeta) || !eterMeta.efectos) continue;
    const esPasivoBloqueo = eterMeta.efectos.some(
      (e) => e.efecto === "block_ether" && !e.trigger && e.tipo === "pago"
    );
    if (!esPasivoBloqueo) continue;
    if (eterInst) eterInst.opcionUsadaEsteTurno = false;
    crearOpcionBloqueo(s, jugador, eterId);
  }
  reagruparEter(s, ctx, jugador);
  reagruparEfectosBloqueoAlba(s, ctx, jugador);
  robarCarta(s, ctx, jugador);
}
function robarCarta(s, ctx, jugador) {
  const p = s.players[jugador];
  const tope = p.mazo.shift();
  if (tope === void 0) {
    ctx.emit({ type: "mazo_agotado", jugador });
    const ganador = jugador === "A" ? "B" : "A";
    s.fase = "terminada";
    s.ganador = ganador;
    s.motivo = "mazo_vacio";
    ctx.emit({ type: "partida_terminada", ganador, motivo: "mazo_vacio" });
    return;
  }
  p.mano.push(tope);
  ctx.emit({ type: "carta_robada", jugador, cardInstanceId: tope });
}
function limpiarCombate(s) {
  s.combate = void 0;
}

// src/online/game/partida.ts
function validarMulligan(state) {
  if (state.fase !== "pre_partida") return "mulligan solo en pre_partida";
  const activo = state.players[state.turno];
  if (activo.mulliganUsado) return "el mulligan ya se us\xF3";
  return null;
}
function validarPasarTurno(state) {
  const p = state.players[state.turno];
  switch (state.fase) {
    case "forja":
      return null;
    case "choque":
      return state.combate && state.combate.paso !== "resolucion" ? "resuelve el combate antes de pasar el turno" : null;
    case "ocaso":
      return p.mano.length > 6 ? "no puedes pasar el turno con m\xE1s de 6 cartas en mano" : null;
    case "pre_partida":
      return "pasar_turno solo durante la partida";
    case "terminada":
      return "la partida termin\xF3";
  }
}
function validarDescartarCarta(state, action) {
  if (state.fase !== "ocaso") return "descartar_carta solo en Ocaso";
  if (action.cardInstanceIds.length === 0) return "no indicaste cartas para descartar";
  if (new Set(action.cardInstanceIds).size !== action.cardInstanceIds.length) {
    return "no puedes descartar cartas duplicadas";
  }
  const p = state.players[state.turno];
  for (const id of action.cardInstanceIds) {
    if (!p.mano.includes(id)) return `la carta no est\xE1 en tu mano: ${id}`;
  }
  return null;
}
function avanzarMulligan(s, ctx) {
  const decisor = s.turno;
  s.turno = decisor === "A" ? "B" : "A";
  if (decisor === "B") iniciarPartida(s, ctx);
}
function iniciarPartida(s, ctx) {
  const pj = s.primerJugador;
  s.fase = "forja";
  s.turno = pj;
  s.primerTurno = true;
  ctx.emit({ type: "partida_iniciada", primerJugador: pj });
  ctx.emit({ type: "turno_iniciado", jugador: pj });
  ctx.emit({ type: "fase_iniciada", fase: "alba", jugador: pj });
  resolverAlba(s, ctx, pj);
  if (s.fase === "forja") {
    ctx.emit({ type: "fase_iniciada", fase: "forja", jugador: pj });
  }
}
function ejecutarPasarTurno(s, ctx) {
  if (s.fase === "forja" || s.fase === "choque") {
    const siguiente = s.fase === "forja" ? "choque" : "ocaso";
    if (s.fase === "choque") {
      limpiarCombate(s);
      resolverFaseEfectos(s, ctx, "ocaso", s.turno);
      purgarEfectosTemporales(s, "ocaso", void 0, ctx);
      purgarKeywordsTemporales(s);
    }
    if (s.fase === "forja") {
      const p = s.players[s.turno];
      const campeones = p.campo.campeones.filter((x) => x !== null);
      const arcanas = p.campo.arcanasCombate.filter((x) => x !== null);
      const vinculos = p.vinculos.filter((x) => x !== null && s.instances[x]?.bocaArriba === true);
      const choqueInstances = [...p.eterReserva, ...campeones, ...arcanas, ...vinculos];
      if (choqueInstances.length > 0) {
        dispararTrigger(s, ctx, "al-inicio-choque", s.turno, choqueInstances);
      }
      const rival2 = s.turno === "A" ? "B" : "A";
      const vinculosRivales = s.players[rival2].vinculos.filter((x) => {
        if (!x) return false;
        const vInst = s.instances[x];
        if (!vInst || vInst.bocaArriba !== true) return false;
        const vMeta = vInst.cardId ? getCardMeta(vInst.cardId) : null;
        return !!vMeta && "efectos" in vMeta && !!vMeta.efectos?.some(
          (e) => e.trigger === "inicio_choque" && e.controladorTrigger === "rival"
        );
      });
      if (vinculosRivales.length > 0) {
        dispararTrigger(s, ctx, "al-inicio-choque", rival2, vinculosRivales);
      }
    }
    s.fase = siguiente;
    ctx.emit({ type: "fase_iniciada", fase: siguiente, jugador: s.turno });
    return;
  }
  const rival = s.turno === "A" ? "B" : "A";
  if (s.primerTurno && s.turno === s.primerJugador) s.primerTurno = false;
  s.turno = rival;
  ctx.emit({ type: "turno_iniciado", jugador: rival });
  ctx.emit({ type: "fase_iniciada", fase: "alba", jugador: rival });
  resolverAlba(s, ctx, rival);
  if (s.fase !== "terminada") {
    s.fase = "forja";
    ctx.emit({ type: "fase_iniciada", fase: "forja", jugador: rival });
  }
}
function ejecutarDescartarCarta(s, action, ctx) {
  const p = s.players[s.turno];
  const descartadas = [];
  for (const id of action.cardInstanceIds) {
    const idx = p.mano.indexOf(id);
    if (idx === -1) continue;
    p.mano.splice(idx, 1);
    enviarAlCementerio(s, ctx, id);
    descartadas.push(id);
  }
  if (descartadas.length > 0) {
    ctx.emit({ type: "carta_descartada", jugador: s.turno, cardInstanceIds: descartadas });
  }
}

// src/online/game/core.ts
function applyAction(state, action, ctx) {
  ctx.events.length = 0;
  const error = validarAccion(state, action);
  if (error) return { ok: false, state, error };
  const s = structuredClone(state);
  ejecutarAccion(s, action, ctx);
  return { ok: true, state: s, events: [...ctx.events] };
}
function validarAccion(state, action) {
  const preven = state.preventivosPendientes?.[0];
  if (preven && action.type !== "responder_prevenicion") {
    return "hay una prevenicion pendiente de resolver";
  }
  switch (action.type) {
    case "rendirse":
      return state.fase === "terminada" ? "la partida ya termino" : null;
    case "responder_prevenicion":
      return validarResponderPrevenicion(state, preven?.jugador ?? state.turno);
    case "mulligan":
      return validarMulligan(state);
    case "pasar_mulligan":
      return state.fase !== "pre_partida" ? "pasar_mulligan solo en pre_partida" : null;
    case "pasar_turno":
      return validarPasarTurno(state);
    case "descartar_carta":
      return validarDescartarCarta(state, action);
    case "jugar_campeon":
      return validarJugarCampeon(state, action);
    case "jugar_mistica":
      return validarJugarMistica(state, action);
    case "colocar_arcana":
      return validarColocarArcana(state, action);
    case "colocar_vinculo":
      return validarColocarVinculo(state, action);
    case "activar_arcana":
      return validarActivarArcana(state, action);
    case "equipar_artefacto":
      return validarEquiparArtefacto(state, action);
    case "bloquear_eter":
      return validarBloquearEter(state, action);
    case "elegir_opcion":
      return validarElegirOpcion(state, action);
    case "elegir_objetivo":
      return validarElegirObjetivo(state, action);
    case "usar_transmutar":
      return validarUsarTransmutar(state, action);
    case "activar_habilidad":
      return validarActivarHabilidad(state, action);
    case "declarar_ataque":
      return validarDeclararAtaque(state, action.atacanteIds);
    case "declarar_bloqueo":
      return validarDeclararBloqueo(state, action.asignaciones);
    case "elegir_ruptura":
      return validarElegirRuptura(state, action.atacanteId, action.vinculoSlot);
    case "responder_cadena":
      return validarResponderCadena(state, action.cardInstanceId);
    case "pasar_prioridad":
      return validarPasarPrioridad(state);
    default:
      return "accion no disponible en esta fase";
  }
}
function ejecutarAccion(s, action, ctx) {
  switch (action.type) {
    case "rendirse": {
      ctx.emit({ type: "rendicion", jugador: s.turno });
      const ganador = s.turno === "A" ? "B" : "A";
      s.fase = "terminada";
      s.ganador = ganador;
      s.motivo = "rendicion";
      ctx.emit({ type: "partida_terminada", ganador, motivo: "rendicion" });
      return;
    }
    case "mulligan": {
      const jugador = s.turno;
      const p = s.players[jugador];
      const mazoReconstruido = shuffleFisherYates(ctx, [...p.mano, ...p.mazo]);
      p.mano = mazoReconstruido.slice(0, 5);
      p.mazo = mazoReconstruido.slice(5);
      p.mulliganUsado = true;
      ctx.emit({ type: "mulligan_realizado", jugador });
      avanzarMulligan(s, ctx);
      return;
    }
    case "pasar_mulligan": {
      avanzarMulligan(s, ctx);
      return;
    }
    case "pasar_turno": {
      ejecutarPasarTurno(s, ctx);
      return;
    }
    case "descartar_carta": {
      ejecutarDescartarCarta(s, action, ctx);
      return;
    }
    case "jugar_campeon": {
      ejecutarJugarCampeon(s, action, ctx);
      return;
    }
    case "jugar_mistica": {
      ejecutarJugarMistica(s, action, ctx);
      return;
    }
    case "colocar_arcana": {
      ejecutarColocarArcana(s, action, ctx);
      return;
    }
    case "colocar_vinculo": {
      ejecutarColocarVinculo(s, action, ctx);
      return;
    }
    case "activar_arcana": {
      ejecutarActivarArcana(s, action, ctx);
      return;
    }
    case "equipar_artefacto": {
      ejecutarEquiparArtefacto(s, action, ctx);
      return;
    }
    case "bloquear_eter": {
      ejecutarBloquearEter(s, action, ctx);
      return;
    }
    case "elegir_opcion": {
      ejecutarElegirOpcion(s, action, ctx);
      return;
    }
    case "elegir_objetivo": {
      ejecutarElegirObjetivo(s, action, ctx);
      return;
    }
    case "usar_transmutar": {
      ejecutarUsarTransmutar(s, action, ctx);
      return;
    }
    case "activar_habilidad": {
      ejecutarActivarHabilidad(s, action, ctx);
      return;
    }
    case "declarar_ataque": {
      ejecutarDeclararAtaque(s, action.atacanteIds, ctx);
      return;
    }
    case "declarar_bloqueo": {
      ejecutarDeclararBloqueo(s, action.asignaciones, ctx);
      return;
    }
    case "elegir_ruptura": {
      ejecutarElegirRuptura(s, action.atacanteId, action.vinculoSlot, ctx);
      return;
    }
    case "responder_cadena": {
      ejecutarResponderCadena(s, action.cardInstanceId, ctx);
      return;
    }
    case "pasar_prioridad": {
      ejecutarPasarPrioridad(s, ctx);
      return;
    }
    case "responder_prevenicion": {
      const front = s.preventivosPendientes?.[0];
      ejecutarResponderPrevenicion(s, ctx, front?.jugador ?? s.turno, action.prevenir);
      return;
    }
  }
}

// src/online/game/validActions.ts
function actorActual(estado) {
  if (estado.fase === "terminada") return null;
  const preven = estado.preventivosPendientes?.[0];
  if (preven) return preven.jugador;
  const cadena = estado.combate?.cadena ?? estado.cadena;
  if (cadena) return cadena.prioridad;
  if (estado.fase === "choque" && estado.combate?.paso === "bloqueo") {
    return estado.turno === "A" ? "B" : "A";
  }
  return estado.turno;
}
function getValidActions(state, playerId) {
  const preven = state.preventivosPendientes?.[0];
  if (preven) {
    if (playerId !== preven.jugador) return [];
    return [
      { type: "responder_prevenicion", prevenir: true },
      { type: "responder_prevenicion", prevenir: false }
    ];
  }
  if (state.fase === "terminada") return [];
  const acciones = [{ type: "rendirse" }];
  if (state.turno === playerId && state.fase === "pre_partida") {
    const p = state.players[playerId];
    if (!p.mulliganUsado) acciones.push({ type: "mulligan" });
    acciones.push({ type: "pasar_mulligan" });
  }
  const cadena = state.combate?.cadena ?? state.cadena;
  if (cadena) {
    if (cadena.prioridad === playerId) {
      for (const id of respondiblesDe(state, playerId)) {
        acciones.push({ type: "responder_cadena", cardInstanceId: id });
      }
      acciones.push({ type: "pasar_prioridad" });
    }
    return acciones;
  }
  if (state.turno === playerId) {
    const p = state.players[playerId];
    const pendiente = state.objetivosPendientes?.[0];
    if (pendiente && pendiente.jugador === playerId) {
      for (const objetivoId of pendiente.opciones) {
        acciones.push({ type: "elegir_objetivo", objetivoId });
      }
    }
    for (const champId of p.campo.campeones) {
      if (!champId || !tieneKeyword(state, champId, "Transmutar")) continue;
      if (p.eterPagado.length > 0) {
        acciones.push({ type: "usar_transmutar", cardInstanceId: champId, eterIds: p.eterPagado.slice(0, 2) });
      }
    }
    for (const champId of p.campo.campeones) {
      if (!champId) continue;
      const inst = state.instances[champId];
      const meta = inst?.cardId ? getCardMeta(inst.cardId) : null;
      if (!meta) continue;
      const tieneEfectos = "efectos" in meta && meta.efectos;
      const tieneContinuo = tieneEfectos && meta.efectos.some((e) => e.tipo === "continuo");
      const tieneDisparo = tieneEfectos && meta.efectos.some((e) => e.tipo === "disparo");
      if (tieneContinuo) {
        if (inst.agotado) continue;
        const costo = costeEterHabilidad(meta);
        const eteresValidos = p.eterReserva.filter((id) => {
          const eterMeta = state.instances[id]?.cardId ? getCardMeta(state.instances[id].cardId) : null;
          return eterMeta !== null;
        });
        if (costo > 0 && eteresValidos.length >= costo) {
          acciones.push({ type: "activar_habilidad", cardInstanceId: champId, eterIds: eteresValidos.slice(0, costo) });
        } else if (costo === 0 && eteresValidos.length > 0) {
          acciones.push({ type: "activar_habilidad", cardInstanceId: champId, eterIds: [eteresValidos[0]] });
        }
      } else if (tieneDisparo) {
        const esBloqueado = meta.efectos.some((e) => e.costo?.tipo === "eter_bloqueado");
        if (esBloqueado) {
          const costo = costeEterHabilidad(meta);
          const eteresValidos = p.eterReserva.filter((id) => {
            const eterMeta = state.instances[id]?.cardId ? getCardMeta(state.instances[id].cardId) : null;
            return eterMeta !== null;
          });
          if (costo > 0 && eteresValidos.length >= costo) {
            acciones.push({ type: "activar_habilidad", cardInstanceId: champId, eterIds: eteresValidos.slice(0, costo) });
          } else if (costo === 0 && eteresValidos.length > 0) {
            acciones.push({ type: "activar_habilidad", cardInstanceId: champId, eterIds: [eteresValidos[0]] });
          }
        } else {
          if (inst.agotado || inst.opcionUsadaEsteTurno) continue;
          const costo = costeEterHabilidad(meta);
          const costoReal = costo > 0 ? costo : 1;
          if (p.eterReserva.length >= costoReal) {
            acciones.push({ type: "activar_habilidad", cardInstanceId: champId, eterIds: p.eterReserva.slice(0, costoReal) });
          }
        }
      }
    }
    if (state.fase === "forja") {
      for (const id of p.mano) {
        const accion = generarAccionesForja(state, playerId, id);
        if (accion) acciones.push(accion);
      }
      const generarBloqueos = (targets) => {
        for (const t of targets) {
          if (!cartaNecesitaEterBloqueado(t.meta)) continue;
          const actuales = t.inst.eterBloqueado?.length ?? 0;
          const maxEter = maxEterBloqueado(t.meta);
          const fijo = esBloqueoFijo(t.meta);
          const disponibles = p.eterReserva.filter((id) => {
            const meta = state.instances[id]?.cardId ? getCardMeta(state.instances[id].cardId) : null;
            return meta !== null;
          });
          if (fijo) {
            const falta = maxEter - actuales;
            if (falta > 0 && disponibles.length >= falta) {
              acciones.push({
                type: "bloquear_eter",
                eterIds: disponibles.slice(0, falta),
                targetInstanceId: t.id
              });
            }
          } else {
            let generados = actuales;
            for (const eterId of disponibles) {
              if (generados >= maxEter) break;
              acciones.push({ type: "bloquear_eter", eterIds: [eterId], targetInstanceId: t.id });
              generados++;
            }
          }
        }
      };
      const campeonesBloqueo = p.campo.campeones.filter((id) => id !== null).map((id) => ({ id, inst: state.instances[id], meta: state.instances[id]?.cardId ? getCardMeta(state.instances[id].cardId) : null })).filter((t) => t.inst != null && t.meta != null);
      generarBloqueos(campeonesBloqueo);
      const artefactosBloqueo = [...p.campo.misticasTacticas, ...p.campo.arcanasCombate].filter((id) => id !== null).map((id) => ({ id, inst: state.instances[id], meta: state.instances[id]?.cardId ? getCardMeta(state.instances[id].cardId) : null })).filter((t) => t.inst != null && t.meta != null);
      generarBloqueos(artefactosBloqueo);
      for (const opcion of state.opcionesPendientes ?? []) {
        if (opcion.jugador === playerId) {
          acciones.push({ type: "elegir_opcion", opcionId: opcion.eterId });
        }
      }
      for (const id of p.campo.arcanasCombate) {
        if (!id) continue;
        const inst = state.instances[id];
        if (!inst || inst.bocaArriba) continue;
        const meta = inst.cardId ? getCardMeta(inst.cardId) : null;
        if (!meta || !esArcana(meta)) continue;
        const eterIds = etersParaPagar(state, playerId, meta.id);
        if (!eterIds) continue;
        const slot = p.campo.arcanasCombate.indexOf(id);
        const accion = { type: "activar_arcana", cardInstanceId: id, slot, eterIds };
        if (validarActivarArcana(state, accion) !== null) continue;
        acciones.push(accion);
      }
      for (const id of [...p.campo.misticasTacticas, ...p.campo.arcanasCombate]) {
        if (!id) continue;
        const inst = state.instances[id];
        if (!inst || inst.equipadoA) continue;
        const meta = inst.cardId ? getCardMeta(inst.cardId) : null;
        if (!meta || !("keywords" in meta) || !meta.keywords?.includes("Artefacto")) continue;
        for (const campeonId of p.campo.campeones) {
          if (!campeonId) continue;
          const accion = { type: "equipar_artefacto", cardInstanceId: id, campeonInstanceId: campeonId };
          if (validarEquiparArtefacto(state, accion) !== null) continue;
          acciones.push(accion);
        }
      }
      acciones.push({ type: "pasar_turno" });
    } else if (state.fase === "choque") {
      const combate = state.combate;
      if (!combate) {
        const elegibles = atacantesElegibles(state);
        if (elegibles.length > 0) {
          acciones.push({ type: "declarar_ataque", atacanteIds: elegibles });
          for (const id of elegibles) {
            acciones.push({ type: "declarar_ataque", atacanteIds: [id] });
          }
        }
        for (const id of p.mano) {
          const accion = generarAccionesForja(state, playerId, id);
          if (accion) acciones.push(accion);
        }
        acciones.push({ type: "pasar_turno" });
      } else if (combate.paso === "resolucion") {
        if (!combate.rupturaUsadaEsteTurno) {
          acciones.push({ type: "elegir_ruptura", atacanteId: null });
          if (combate.rupturaDisponible) {
            const rival = rivalDe(state);
            for (const atacanteId of ataquesSinBloquear(state)) {
              if (!state.players[state.turno].campo.campeones.includes(atacanteId)) continue;
              state.players[rival].vinculos.forEach((vinculoId, slot) => {
                const v = vinculoId ? state.instances[vinculoId] : void 0;
                if (vinculoId && !v?.bocaArriba) {
                  acciones.push({ type: "elegir_ruptura", atacanteId, vinculoSlot: slot });
                }
              });
            }
          }
        }
        acciones.push({ type: "pasar_turno" });
      }
    } else if (state.fase === "ocaso") {
      if (p.mano.length <= 6) {
        acciones.push({ type: "pasar_turno" });
      } else {
        for (const id of p.mano) {
          acciones.push({ type: "descartar_carta", cardInstanceIds: [id] });
        }
      }
    }
  } else if (state.fase === "choque" && playerId === rivalDe(state) && state.combate?.paso === "bloqueo") {
    const asignaciones = asignacionForzada(state);
    if (asignaciones) acciones.push({ type: "declarar_bloqueo", asignaciones });
  }
  return acciones;
}

// src/online/game/visibleState.ts
function visibleState(state, playerId) {
  const v = structuredClone(state);
  const rival = playerId === "A" ? "B" : "A";
  const ocultar = /* @__PURE__ */ new Set();
  for (const p of ["A", "B"]) {
    for (const id of v.players[p].mazo) ocultar.add(id);
  }
  for (const id of v.players[rival].mano) ocultar.add(id);
  for (const id of v.players[rival].campo.arcanasCombate) if (id) ocultar.add(id);
  for (const id of v.players[rival].vinculos) if (id && !v.instances[id]?.bocaArriba) ocultar.add(id);
  const pila = v.combate?.cadena?.pila ?? [];
  for (const id of pila) ocultar.delete(id);
  const pendiente = v.objetivosPendientes?.[0];
  if (pendiente && pendiente.jugador === playerId) {
    for (const id of pendiente.opciones) ocultar.delete(id);
  }
  for (const id of ocultar) {
    const inst = v.instances[id];
    if (inst) inst.cardId = null;
  }
  return v;
}

// src/online/game/invariants.ts
function verificarInvariantes(estado) {
  const violaciones = [];
  for (const p of ["A", "B"]) {
    const st = estado.players[p];
    if (st.mano.length > 7) violaciones.push(`${p}: mano ${st.mano.length} > 7`);
    let bloqueados = 0;
    for (const grupo of ["campeones", "misticasTacticas", "arcanasCombate"]) {
      for (const id of st.campo[grupo]) {
        if (!id) continue;
        bloqueados += estado.instances[id]?.eterBloqueado?.length ?? 0;
      }
    }
    const eter = st.eterReserva.length + st.eterPagado.length + bloqueados;
    if (eter !== 15) violaciones.push(`${p}: ${eter} \xC9ter \u2260 15`);
    const campeones = st.campo.campeones.filter((x) => x !== null).length;
    if (campeones > 5) violaciones.push(`${p}: ${campeones} Campeones > 5`);
    const misticas = st.campo.misticasTacticas.filter((x) => x !== null).length;
    if (misticas > 3) violaciones.push(`${p}: ${misticas} M\xEDsticas/T\xE1cticas > 3`);
    const arcanas = st.campo.arcanasCombate.filter((x) => x !== null).length;
    if (arcanas > 3) violaciones.push(`${p}: ${arcanas} Arcanas/Combates > 3`);
    const vinculos = st.vinculos.filter((x) => x !== null).length;
    const total = st.mano.length + st.mazo.length + st.cementerio.length + st.exilio.length + st.eterReserva.length + st.eterPagado.length + campeones + misticas + arcanas + vinculos + bloqueados;
    if (total !== 66) violaciones.push(`${p}: ${total} cartas \u2260 66`);
  }
  return violaciones;
}

// src/online/game/events.ts
var CATALOGO_EVENTOS = [
  { type: "partida_iniciada", primerJugador: "A" },
  { type: "turno_iniciado", jugador: "A" },
  { type: "fase_iniciada", fase: "alba", jugador: "A" },
  { type: "carta_entrada_a_zona", cardInstanceId: "c1", zona: "2B", jugador: "A", bocaArriba: true },
  { type: "carta_salida_de_zona", cardInstanceId: "c1", zona: "mano", jugador: "A" },
  { type: "carta_robada", jugador: "A", cardInstanceId: "c1" },
  { type: "carta_invocada", cardInstanceId: "c1", tipo: "Campe\xF3n", slot: 0 },
  { type: "carta_descartada", jugador: "A", cardInstanceIds: ["c1"] },
  { type: "carta_devuelta_a_mano", cardInstanceId: "c1", jugador: "A" },
  { type: "carta_exiliada", cardInstanceId: "c1", jugador: "A" },
  { type: "campeon_robado", cardInstanceId: "c1", jugador: "A", rival: "B" },
  { type: "eter_robado", cardInstanceId: "c1", jugador: "A", rival: "B" },
  { type: "eter_liberado", cardInstanceId: "c1", jugador: "A" },
  { type: "eter_movido", cardInstanceId: "c1", destino: "reserva", jugador: "A" },
  { type: "eter_pagado", jugador: "A", eterIds: ["c2"], costo: 3, aportado: 3 },
  { type: "eter_bloqueado", jugador: "A", eterIds: ["c2"], campeonId: "c1" },
  { type: "eter_reagrupado", jugador: "A", eterIds: ["c2"] },
  { type: "mazo_agotado", jugador: "A" },
  { type: "mulligan_realizado", jugador: "A" },
  { type: "rendicion", jugador: "A" },
  { type: "partida_terminada", ganador: "B", motivo: "rendicion" },
  // Apéndice de combate (change 2, spec #1227 R14)
  { type: "ataque_declarado", jugador: "A", atacanteIds: ["c1"] },
  { type: "bloqueo_declarado", jugador: "B", asignaciones: { c1: "c2" } },
  { type: "carta_muerta", cardInstanceId: "c2", jugador: "B", causa: "combate" },
  { type: "destruccion", cardInstanceId: "c2", jugador: "B", causa: "combate" },
  { type: "destruccion_prevenida", cardInstanceId: "c1", jugador: "A", causa: "combate" },
  { type: "prevenicion_pendiente", victimId: "c3", fuenteId: "c1", jugador: "A", causa: "efecto" },
  { type: "ruptura_realizada", atacanteId: "c1", vinculoSlot: 2, vinculoId: "c3" },
  { type: "respuesta_encadenada", jugador: "B", cardInstanceId: "c4" },
  { type: "prioridad_pasada", jugador: "A" },
  { type: "carta_activada", cardInstanceId: "c1", jugador: "A", slot: 0 }
];
function assertNunca(x) {
  throw new Error(`Evento inesperado del cat\xE1logo: ${String(x)}`);
}
function validarExhaustividadEventos(tipo) {
  switch (tipo) {
    case "partida_iniciada":
      return;
    case "turno_iniciado":
      return;
    case "fase_iniciada":
      return;
    case "carta_entrada_a_zona":
      return;
    case "carta_salida_de_zona":
      return;
    case "carta_robada":
      return;
    case "carta_invocada":
      return;
    case "carta_descartada":
      return;
    case "carta_devuelta_a_mano":
      return;
    case "carta_exiliada":
      return;
    case "campeon_robado":
      return;
    case "eter_robado":
      return;
    case "eter_liberado":
      return;
    case "eter_movido":
      return;
    case "eter_pagado":
      return;
    case "eter_bloqueado":
      return;
    case "eter_reagrupado":
      return;
    case "mazo_agotado":
      return;
    case "mulligan_realizado":
      return;
    case "rendicion":
      return;
    case "partida_terminada":
      return;
    case "ataque_declarado":
      return;
    case "bloqueo_declarado":
      return;
    case "carta_muerta":
      return;
    case "destruccion":
      return;
    case "destruccion_prevenida":
      return;
    case "prevenicion_pendiente":
      return;
    case "ruptura_realizada":
      return;
    case "respuesta_encadenada":
      return;
    case "prioridad_pasada":
      return;
    case "carta_activada":
      return;
    default:
      assertNunca(tipo);
  }
}

// src/online/game/botStrategies.ts
function elegirPrevenicion(state, jugador) {
  const vivos = state.players[jugador].vinculos.filter(
    (id) => id !== null && !state.instances[id]?.bocaArriba
  ).length;
  return vivos <= 1;
}
function botFacil(state, playerId) {
  const acciones = getValidActions(state, playerId);
  if (acciones.length === 0) return null;
  const orden = [
    "jugar_campeon",
    "activar_habilidad",
    "equipar_artefacto",
    "jugar_mistica",
    "colocar_arcana",
    "bloquear_eter",
    "activar_arcana",
    "pasar_turno"
  ];
  for (const tipo of orden) {
    const accion = acciones.find((a) => a.type === tipo);
    if (accion) return accion;
  }
  return acciones.find((a) => a.type !== "rendirse" && a.type !== "usar_transmutar") ?? null;
}
function botMedio(state, playerId) {
  const acciones = getValidActions(state, playerId);
  if (acciones.length === 0) return null;
  if (state.fase === "choque") {
    return estrategiaChoque(state, playerId, acciones);
  }
  return estrategiaForja(state, playerId, acciones);
}
function estrategiaForja(state, playerId, acciones) {
  const p = state.players[playerId];
  const activarDestructivo = acciones.find((a) => {
    if (a.type !== "activar_habilidad") return false;
    const meta = getCardMeta(state.instances[a.cardInstanceId]?.cardId ?? "");
    if (!meta || !("efectos" in meta)) return false;
    return meta.efectos?.some((e) => e.tipo === "disparo" && e.efecto === "destroy");
  });
  if (activarDestructivo) return activarDestructivo;
  const campeonesEnCampo = p.campo.campeones.filter(Boolean).length;
  if (campeonesEnCampo < 3) {
    const invocar = acciones.find((a) => a.type === "jugar_campeon");
    if (invocar) return invocar;
  }
  const equipar = acciones.find((a) => a.type === "equipar_artefacto");
  if (equipar) return equipar;
  const activarBuff = acciones.find((a) => a.type === "activar_habilidad");
  if (activarBuff) return activarBuff;
  if (p.campo.misticasTacticas.filter(Boolean).length < 3) {
    const mistica = acciones.find((a) => a.type === "jugar_mistica");
    if (mistica) return mistica;
  }
  if (p.campo.arcanasCombate.filter(Boolean).length < 3) {
    const arcana = acciones.find((a) => a.type === "colocar_arcana");
    if (arcana) return arcana;
  }
  const activarArcana = acciones.find((a) => a.type === "activar_arcana");
  if (activarArcana) return activarArcana;
  const bloquear = acciones.find((a) => a.type === "bloquear_eter");
  if (bloquear) return bloquear;
  return acciones.find((a) => a.type === "pasar_turno") ?? acciones[0];
}
function estrategiaChoque(state, playerId, acciones) {
  const rival = playerId === "A" ? "B" : "A";
  if (state.combate?.paso === "bloqueo") {
    return decidirBloqueo(state, acciones);
  }
  const declararAtaque = acciones.find((a) => a.type === "declarar_ataque");
  if (!declararAtaque) {
    return acciones.find((a) => a.type === "pasar_turno" || a.type === "elegir_ruptura") ?? acciones[0];
  }
  if (declararAtaque.type === "declarar_ataque") {
    const atacantes = declararAtaque.atacanteIds;
    const campeonesRival = state.players[rival].campo.campeones.filter(Boolean);
    if (campeonesRival.length === 0) {
      return declararAtaque;
    }
    const atacantesFavorables = atacantes.filter((id) => {
      const stats = statsDe(state, id);
      const resPromedio = campeonesRival.reduce((acc, rid) => {
        const rStats = statsDe(state, rid);
        return acc + rStats.resistencia;
      }, 0) / (campeonesRival.length || 1);
      return stats.poder > resPromedio;
    });
    if (atacantesFavorables.length > 0) {
      return { type: "declarar_ataque", atacanteIds: atacantesFavorables };
    }
    return acciones.find((a) => a.type === "pasar_turno") ?? declararAtaque;
  }
  return declararAtaque;
}
function decidirBloqueo(state, acciones) {
  const declararBloqueo = acciones.find((a) => a.type === "declarar_bloqueo");
  if (!declararBloqueo || declararBloqueo.type !== "declarar_bloqueo") return acciones[0];
  const asignaciones = declararBloqueo.asignaciones;
  const asignacionesFavorables = {};
  for (const [atacanteId, bloqueadorId] of Object.entries(asignaciones)) {
    const atacanteStats = statsDe(state, atacanteId);
    const bloqueadorStats = statsDe(state, bloqueadorId);
    if (bloqueadorStats.resistencia > atacanteStats.poder) {
      asignacionesFavorables[atacanteId] = bloqueadorId;
    }
  }
  if (Object.keys(asignacionesFavorables).length > 0) {
    return { type: "declarar_bloqueo", asignaciones: asignacionesFavorables };
  }
  return acciones.find((a) => a.type === "pasar_prioridad") ?? acciones[0];
}
function botDificil(state, playerId) {
  const acciones = getValidActions(state, playerId);
  if (acciones.length === 0) return null;
  if (state.fase === "choque") {
    return estrategiaChoqueAvanzada(state, playerId, acciones);
  }
  return estrategiaForjaAvanzada(state, playerId, acciones);
}
function estrategiaForjaAvanzada(state, playerId, acciones) {
  const puntuadas = acciones.map((a) => ({
    accion: a,
    puntos: evaluarAccionForja(state, playerId, a)
  })).sort((a, b) => b.puntos - a.puntos);
  return puntuadas[0]?.accion ?? null;
}
function evaluarAccionForja(state, playerId, accion) {
  const p = state.players[playerId];
  switch (accion.type) {
    case "jugar_campeon": {
      const campeonesEnCampo = p.campo.campeones.filter(Boolean).length;
      let puntos = 10 + (3 - campeonesEnCampo) * 3;
      const meta = getCardMeta(state.instances[accion.cardInstanceId]?.cardId ?? "");
      if (meta && "efectos" in meta && meta.efectos?.length) {
        puntos += 5;
      }
      return puntos;
    }
    case "activar_habilidad": {
      const meta = getCardMeta(state.instances[accion.cardInstanceId]?.cardId ?? "");
      if (!meta || !("efectos" in meta)) return 5;
      const efecto = meta.efectos?.[0];
      if (!efecto) return 5;
      if (efecto.efecto === "destroy") return 15;
      if (efecto.efecto === "buff") return 12;
      if (efecto.efecto === "steal_champion") return 18;
      return 8;
    }
    case "equipar_artefacto": {
      const campeonesEnCampo = p.campo.campeones.filter(Boolean).length;
      return campeonesEnCampo > 0 ? 10 : 0;
    }
    case "jugar_mistica": {
      const misticasEnCampo = p.campo.misticasTacticas.filter(Boolean).length;
      return misticasEnCampo < 3 ? 7 : 2;
    }
    case "colocar_arcana": {
      const arcanasEnCampo = p.campo.arcanasCombate.filter(Boolean).length;
      return arcanasEnCampo < 3 ? 6 : 1;
    }
    case "activar_arcana": {
      return 9;
    }
    case "bloquear_eter": {
      return 3;
    }
    case "pasar_turno": {
      return 0;
    }
    default:
      return 1;
  }
}
function estrategiaChoqueAvanzada(state, playerId, acciones) {
  const rival = playerId === "A" ? "B" : "A";
  if (state.combate?.paso === "bloqueo") {
    return decidirBloqueoAvanzado(state, acciones);
  }
  const declararAtaque = acciones.find((a) => a.type === "declarar_ataque");
  if (!declararAtaque) {
    return acciones.find((a) => a.type === "pasar_turno" || a.type === "elegir_ruptura") ?? acciones[0];
  }
  if (declararAtaque.type === "declarar_ataque") {
    const atacantes = declararAtaque.atacanteIds;
    const campeonesRival = state.players[rival].campo.campeones.filter(Boolean);
    if (campeonesRival.length === 0) {
      return declararAtaque;
    }
    const atacantesFavorables = [];
    for (const atacanteId of atacantes) {
      const atacanteStats = statsDe(state, atacanteId);
      const inst = state.instances[atacanteId];
      if (!inst) continue;
      if (inst.atacoEsteTurno && !tieneDoubleAttackActivo(state, atacanteId)) continue;
      let favorable = true;
      for (const bloqueadorId of campeonesRival) {
        const bloqueadorStats = statsDe(state, bloqueadorId);
        if (bloqueadorStats.resistencia >= atacanteStats.poder && atacanteStats.poder < bloqueadorStats.resistencia) {
          favorable = false;
          break;
        }
      }
      if (favorable) {
        atacantesFavorables.push(atacanteId);
      }
    }
    if (atacantesFavorables.length > 0) {
      return { type: "declarar_ataque", atacanteIds: atacantesFavorables };
    }
    return acciones.find((a) => a.type === "pasar_turno") ?? declararAtaque;
  }
  return declararAtaque;
}
function decidirBloqueoAvanzado(state, acciones) {
  const declararBloqueo = acciones.find((a) => a.type === "declarar_bloqueo");
  if (!declararBloqueo || declararBloqueo.type !== "declarar_bloqueo") return acciones[0];
  const asignaciones = declararBloqueo.asignaciones;
  const asignacionesFavorables = {};
  for (const [atacanteId, bloqueadorId] of Object.entries(asignaciones)) {
    const atacanteStats = statsDe(state, atacanteId);
    const bloqueadorStats = statsDe(state, bloqueadorId);
    const bloqueadorSobrevive = bloqueadorStats.resistencia > atacanteStats.poder;
    const atacanteAmenaza = atacanteStats.poder > 5;
    if (bloqueadorSobrevive || atacanteAmenaza) {
      asignacionesFavorables[atacanteId] = bloqueadorId;
    }
  }
  if (Object.keys(asignacionesFavorables).length > 0) {
    return { type: "declarar_bloqueo", asignaciones: asignacionesFavorables };
  }
  return acciones.find((a) => a.type === "pasar_prioridad") ?? acciones[0];
}

// src/online/game/bot.ts
function botTonto(state, playerId, dificultad = "facil") {
  const preven = state.preventivosPendientes?.[0];
  if (preven) {
    if (preven.jugador !== playerId) return null;
    return { type: "responder_prevenicion", prevenir: elegirPrevenicion(state, playerId) };
  }
  const cadena = state.combate?.cadena ?? state.cadena;
  if (cadena) {
    return cadena.prioridad === playerId ? { type: "pasar_prioridad" } : null;
  }
  const esDefensor = state.fase === "choque" && state.combate?.paso === "bloqueo" && playerId !== state.turno;
  if (state.turno !== playerId && !esDefensor) return null;
  let accion;
  switch (dificultad) {
    case "dificil":
      accion = botDificil(state, playerId);
      break;
    case "medio":
      accion = botMedio(state, playerId);
      break;
    case "facil":
    default:
      accion = botFacil(state, playerId);
      break;
  }
  if (accion && (accion.type === "rendirse" || accion.type === "usar_transmutar")) {
    const acciones = getValidActions(state, playerId);
    return acciones.find((a) => a.type !== "rendirse" && a.type !== "usar_transmutar") ?? null;
  }
  return accion;
}
function simularPartida(deckA, deckB, seed, maxTurnos = 500, dificultadA = "facil", dificultadB = "facil") {
  const { state, ctx } = createInitialState(deckA, deckB, seed);
  const eventos = [];
  let iteraciones = 0;
  let estado = state;
  while (estado.fase !== "terminada" && iteraciones < maxTurnos) {
    const preven = estado.preventivosPendientes?.[0];
    const cadena = estado.combate?.cadena ?? estado.cadena;
    const actor = preven ? preven.jugador : cadena ? cadena.prioridad : estado.fase === "choque" && estado.combate?.paso === "bloqueo" ? estado.turno === "A" ? "B" : "A" : estado.turno;
    const dif = actor === "A" ? dificultadA : dificultadB;
    const accion = botTonto(estado, actor, dif);
    if (!accion) throw new Error("el bot no encontr\xF3 acci\xF3n v\xE1lida (sin progreso)");
    const r = applyAction(estado, accion, ctx);
    if (!r.ok) throw new Error(`la acci\xF3n del bot fall\xF3 (${accion.type}): ${r.error}`);
    eventos.push(...r.events);
    estado = r.state;
    iteraciones++;
  }
  const turnos = eventos.filter((e) => e.type === "turno_iniciado").length;
  return { estado, turnos, eventos };
}

// src/online/game/handlers/index.ts
function registrarEfectos() {
}

// src/online/game/index.ts
registrarEfectos();
export {
  CATALOGO_EVENTOS,
  LIMITE_MANO,
  SLOTS_ARCANAS_COMBATE,
  SLOTS_CAMPEONES,
  SLOTS_MISTICAS_TACTICAS,
  SLOTS_VINCULOS,
  actorActual,
  aplicarMod,
  aplicarPago,
  aporteDe,
  applyAction,
  bloquearEter,
  botTonto,
  campeonNecesitaEterBloqueado,
  campeonesSacrificables,
  copiasEnCampo,
  costeEterHabilidad,
  createCtx,
  createCtxFromDraws,
  createInitialState,
  dispararTrigger,
  dispararUmbralBloqueo,
  esArcana,
  esBloqueoFijo,
  esCampeon,
  esEter,
  esMistica,
  esSingular,
  esVinculo,
  faccionesCompartidas,
  getCardMeta,
  getValidActions,
  hastaAlba,
  keywordsDe2 as keywordsDe,
  limiteSlots,
  limpiarRegistroEfectos,
  maxEterBloqueado,
  otorgarKeyword,
  purgarEfectosTemporales,
  purgarKeywordsTemporales,
  reagruparEfectosBloqueoAlba,
  reagruparEter,
  registrarCartas,
  registrarEfecto,
  registrarEfectoPendiente,
  registrarEfectos,
  resolverAlba,
  resolverFaseEfectos,
  respondiblesDe,
  retornarCampeonesRobados,
  robarCarta,
  sacrificiosRequeridos,
  shuffleFisherYates,
  simularPartida,
  slotAZona,
  statsDe,
  validarExhaustividadEventos,
  validarPago,
  validarPasarPrioridad,
  validarResponderCadena,
  verificarInvariantes,
  visibleState
};
