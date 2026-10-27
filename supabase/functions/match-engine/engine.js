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

// seed/FuenteEfectos.json
var FuenteEfectos_default = [
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
    updatedAt: "2026-10-24T18:27:28.209Z",
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
        texto: "Bloquea 1 \xC9ter de tu Reserva sobre un Campe\xF3n que pueda recibir \xE9ter bloqueado que controles, una vez por turno.",
        duracion: "1_por_turno"
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
        }
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
    updatedAt: "2026-10-24T18:15:01.960Z",
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
        texto: "Puedes pagar 2 \xC9ter, destruye 1 M\xEDstica o Arcana que controla el rival.",
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
        texto: "Bloquea 4 \xC9ter, toma control de 1 un Campe\xF3n que controla el rival, mientras ese \xC9ter est\xE9 bloqueado, Al inicio de tu Alba reagrupa el \xC9ter usado por este efecto.",
        duracion: "mientras_ester_bloqueado",
        costo: {
          tipo: "bloqueo_fijo",
          cantidad: 4
        },
        reagrupar: {
          fase: "alba",
          turno: "propio"
        },
        unaVezPorTurno: true
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
    updatedAt: "2026-10-24T18:15:14.752Z",
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
        texto: "Puedes pagar 3 \xC9ter, cambia el agotamiento de un Campe\xF3n que controles.",
        costo: {
          tipo: "eter",
          cantidad: 3
        }
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
    updatedAt: "2026-10-24T18:04:16.306Z",
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
        texto: "Puedes pagar 2 \xC9ter, destruye 1 M\xEDstica o Arcana que controla el rival.",
        costo: {
          tipo: "eter",
          cantidad: 2
        }
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
        texto: "Bloquea 3 \xC9ter, esta carta puede declarar 2 veces ataque, mientras ese \xC9ter est\xE9 bloqueado.",
        costo: {
          tipo: "bloqueo_fijo",
          cantidad: 3
        },
        duracion: "mientras_ester_bloqueado",
        unaVezPorTurno: true
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
    updatedAt: "2026-10-14T04:57:30.581Z",
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
        objetivo: {
          tipo: "campeon",
          controlador: "rival",
          zona: "campo"
        },
        stats: {
          ATQ: 0,
          RES: 0
        },
        texto: "Puedes bloquear hasta un m\xE1ximo de 4 \xC9ter (Max. 4), con 2 \xC9teres bloqueados, cambia el agotamiento de un Campe\xF3n que controla el rival, con 4 \xC9teres bloqueados, fija el agotamiento de un Campe\xF3n que est\xE9 agotado que controla el rival, mientras ese \xC9ter est\xE9 bloqueado.",
        costo: {
          tipo: "eter_bloqueado",
          cantidad: 4,
          umbral: 2
        },
        tramos: [
          {
            umbral: 2,
            efecto: "toggle_exhaust"
          },
          {
            umbral: 4,
            efecto: "fix_exhaust",
            filtros: {
              agotado: true
            },
            duracion: "mientras_ester_bloqueado"
          }
        ]
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
    updatedAt: "2026-10-22T01:00:26.833Z",
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
        texto: "Bloquea 3 \xC9ter, copia el efecto de hechizo, el efecto continuo y la recompensa de una M\xEDstica o Arcana que controla el rival, mientras ese \xC9ter est\xE9 bloqueado.",
        duracion: "mientras_ester_bloqueado",
        costo: {
          tipo: "bloqueo_fijo",
          cantidad: 3
        },
        copyAttributes: [
          "mistica_hechizo",
          "mistica_continuo",
          "arcana_recompensa"
        ],
        unaVezPorTurno: true
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
        texto: "El Campe\xF3n equipado con esta carta gana 2 de ATQ."
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
    name: "Titania, Voz del Este",
    type: "Campe\xF3n",
    rarity: "Com\xFAn",
    keywords: [],
    flavorText: "Cae una enviada; llegan las casas.",
    paqueteId: "estasis",
    limiteCopias: "3",
    createdAt: "2026-08-12T00:00:00.000Z",
    updatedAt: "2026-10-14T05:03:38.300Z",
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
        texto: "Bloquea 4 \xC9ter, invoca un Campe\xF3n del Exilio de su due\xF1o y equipa esta carta a ese Campe\xF3n, mientras ese \xC9ter est\xE9 bloqueado.",
        zonaOrigen: "exilio",
        duracion: "mientras_ester_bloqueado",
        costo: {
          tipo: "bloqueo_fijo",
          cantidad: 4
        },
        unaVezPorTurno: true
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
    updatedAt: "2026-10-24T18:15:35.033Z",
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
        texto: "Puedes pagar 4 \xC9ter, destruye 1 Campe\xF3n que controla el rival.",
        costo: {
          tipo: "eter",
          cantidad: 4
        },
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
        },
        unaVezPorTurno: true
      }
    ],
    efectoComandante: {
      tipo: "pasivo",
      efecto: "grant_keyword",
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
          tipo: "invocado",
          controlador: "propio",
          zona: "campo"
        },
        texto: "Cuando pagues esta carta para invocar un Campe\xF3n, ese Campe\xF3n gana 1 de ATQ hasta el final del pr\xF3ximo turno.",
        duracion: "n_turnos",
        duracionTurnos: 2,
        contextoUso: "invocar"
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
    updatedAt: "2026-10-27T00:26:09.195Z",
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
          zona: "reserva",
          zonaDestino: "pagado",
          controladorDestino: "rival"
        },
        zonaDestino: "reserva",
        cantidad: 1,
        texto: "Al matar en combate, puedes devolver 1 \xC9ter de la Reserva a la zona de pago del rival."
      },
      {
        tipo: "disparo",
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
        texto: "Puedes pagar 2 \xC9ter, destruye 1 M\xEDstica que controla el rival."
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
    updatedAt: "2026-10-24T18:16:38.370Z",
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
        costo: {
          tipo: "eter",
          cantidad: 4
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
        texto: "Puedes pagar 4 \xC9ter, destruye 1 Campe\xF3n RES 3 o menos que controla el rival."
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
    updatedAt: "2026-10-27T03:39:56.365Z",
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
      resistencia: 4
    },
    efectos: [
      {
        tipo: "disparo",
        trigger: "ninguno",
        efecto: "negar",
        objetivo: {
          tipo: "campeon",
          controlador: "rival",
          zona: "campo"
        },
        texto: "Puedes pagar 3 \xC9ter, Niega el efecto activo de un Campe\xF3n que controla el rival, hasta el final del turno.",
        duracion: "turno",
        tipoNegacion: "efecto_activo",
        costo: {
          tipo: "eter",
          cantidad: 3
        }
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
    updatedAt: "2026-10-08T05:31:28.150Z",
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
        trigger: "al_invocar",
        efecto: "copy",
        objetivo: {
          tipo: "campeon",
          controlador: "rival",
          zona: "campo"
        },
        texto: "Al ser invocada, puedes copiar el ATQ de un Campe\xF3n que controla el rival, hasta el final del turno.",
        duracion: "turno",
        copyAttributes: [
          "atq"
        ]
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
    updatedAt: "2026-10-27T00:26:22.051Z",
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
        costo: {
          tipo: "eter",
          cantidad: 2
        },
        efecto: "buff",
        stats: {
          ATQ: 1
        },
        objetivo: {
          tipo: "todos_campeones_propios"
        },
        texto: "Puedes pagar 2 \xC9ter, todos tus Campeones ganan 1 de ATQ, hasta el final del turno.",
        duracion: "turno"
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
    updatedAt: "2026-10-24T18:14:00.175Z",
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
        texto: "Puedes pagar 2 \xC9ter, mueve 1 \xC9ter que controla el rival de la zona de pago a la Reserva de su due\xF1o.",
        costo: {
          tipo: "eter",
          cantidad: 2
        }
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
    updatedAt: "2026-10-24T18:17:02.675Z",
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
        tipo: "disparo",
        efecto: "return_hand",
        objetivo: {
          tipo: "campeon",
          controlador: "rival",
          zona: "campo"
        },
        texto: "Puedes pagar 3 \xC9ter, devuelve a la mano de su due\xF1o 1 Campe\xF3n que controla el rival.",
        costo: {
          tipo: "eter",
          cantidad: 3
        }
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
    updatedAt: "2026-10-13T05:16:59.993Z",
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
            costeMax: 3
          }
        },
        texto: "Puedes pagar 3 \xC9ter, invoca un Campe\xF3n de facci\xF3n Caos de coste 3 \xE9ter o menos del Exilio de su due\xF1o y equipa esta carta a ese Campe\xF3n.",
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
    updatedAt: "2026-10-10T01:30:30.657Z",
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
            costeMax: 3
          },
          zonaDestino: "mano"
        },
        zonaDestino: "mano",
        texto: "Busca 1 Campe\xF3n coste 3 o menos de tu mazo y agregalo a tu mano."
      }
    ]
  }
];

// src/shared/data/paquetes.ts
var ALL_CARDS = FuenteEfectos_default;
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
function esArtefactoEquipable(card) {
  if (!("keywords" in card) || !card.keywords?.includes("Artefacto")) return false;
  if ("efectos" in card && card.efectos) {
    if (card.efectos.some((e) => e.efecto === "invocar_y_equipar")) return false;
  }
  return true;
}
function esPermanenteEnMesa(card) {
  if ("efectos" in card && card.efectos) {
    if (card.efectos.some((e) => e.costo?.tipo === "eter_bloqueado" || e.costo?.tipo === "bloqueo_fijo")) {
      return true;
    }
  }
  if ("keywords" in card && card.keywords?.includes("Artefacto")) return true;
  return false;
}
function esCostoBloqueo(costo) {
  return costo?.tipo === "eter_bloqueado" || costo?.tipo === "bloqueo_fijo";
}
function efectoActivableDe(card, conObjetivo) {
  if (!("efectos" in card) || !card.efectos) return null;
  if (conObjetivo) {
    return card.efectos.find((e) => e.tipo === "continuo" && !esCostoBloqueo(e.costo)) ?? null;
  }
  const continuoPago = card.efectos.find((e) => e.tipo === "continuo" && !esCostoBloqueo(e.costo));
  return card.efectos.find((e) => e.tipo === "disparo") ?? continuoPago ?? null;
}
function efectoBloqueoAccion(card) {
  if (!("efectos" in card) || !card.efectos) return null;
  const indice = card.efectos.findIndex((e) => esCostoBloqueo(e.costo) && e.tipo !== "disparo");
  return indice === -1 ? null : { efecto: card.efectos[indice], indice };
}
function costeEterHabilidad(card) {
  if ("efectos" in card && card.efectos) {
    const disparo = card.efectos.find((e) => e.tipo === "disparo");
    if (disparo?.costo?.cantidad !== void 0) return disparo.costo.cantidad;
    const continuo = card.efectos.find((e) => e.tipo === "continuo" && !esCostoBloqueo(e.costo));
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
function campeonElegibleBloqueoEter(card) {
  if (!esCampeon(card)) return false;
  if (!("efectos" in card) || !card.efectos) return false;
  return card.efectos.some(
    (e) => e.tipo === "continuo" && (e.costo?.tipo === "eter_bloqueado" || e.costo?.tipo === "bloqueo_fijo")
  );
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
var TOPE_COPIAS_VINCULO = 3;
function limiteCopiasDe(cardId) {
  const meta = getCardMeta(cardId);
  if (!meta) return 0;
  if (meta.rarity === "\xDAnica") return 1;
  const n = Math.floor(Number(meta.limiteCopias ?? 1));
  const limite = Number.isFinite(n) && n >= 1 ? n : 1;
  return meta.type === "V\xEDnculo" ? Math.min(limite, TOPE_COPIAS_VINCULO) : limite;
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
  const copias = /* @__PURE__ */ new Map();
  for (const id of deck) copias.set(id, (copias.get(id) ?? 0) + 1);
  for (const [id, cantidad] of copias) {
    const limite = limiteCopiasDe(id);
    if (cantidad > limite) {
      const nombreCarta = getCardMeta(id)?.name ?? id;
      throw new Error(`Mazo ${nombre} inv\xE1lido: "${nombreCarta}" (${id}) lleva ${cantidad} copias y su l\xEDmite es ${limite}`);
    }
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

// src/online/game/draw.ts
function robarCarta(s, ctx, jugador) {
  const p = s.players[jugador];
  const tope = p.mazo.shift();
  if (tope === void 0) {
    ctx.emit({ type: "mazo_agotado", jugador });
    if (!s.mazosAgotados?.includes(jugador)) s.mazosAgotados = [...s.mazosAgotados ?? [], jugador];
    return false;
  }
  p.mano.push(tope);
  ctx.emit({ type: "carta_robada", jugador, cardInstanceId: tope });
  return true;
}

// src/online/game/reglasTemporales.ts
function aplicarReglaTemporal(s, regla) {
  const orden = (s.ordenReglas ?? 0) + 1;
  s.ordenReglas = orden;
  s.reglasTemporales = [...s.reglasTemporales ?? [], { ...regla, orden }];
}
var ESTADO_DE_CAMPO = [
  "poder",
  "resistencia",
  "modificadores",
  "keywords",
  "keywordsTemporales",
  "keywordsHastaFase",
  "copyTargetId",
  "copyOneShotDisparado",
  "efectoUmbralDisparado",
  "tramosDisparados",
  "fijadoExhaustTargetId",
  "sostenidos",
  "efectosUmbralDisparados",
  "stolenBy",
  "agotado",
  "bloqueosEsteTurno",
  "efectosUsadosEsteTurno",
  "opcionUsadaEsteTurno",
  "destruccionPendiente"
];
function reiniciarCampeon(s, instId) {
  const inst = s.instances[instId];
  if (!inst) return;
  for (const campo of ESTADO_DE_CAMPO) delete inst[campo];
  if (s.reglasTemporales?.length) {
    const quedan = s.reglasTemporales.filter((r) => !(r.sujeto.tipo === "carta" && r.sujeto.instId === instId));
    if (quedan.length === 0) delete s.reglasTemporales;
    else if (quedan.length !== s.reglasTemporales.length) s.reglasTemporales = quedan;
  }
  if (s.cambiosAtributo?.length) {
    const quedan = s.cambiosAtributo.filter((c) => c.instId !== instId);
    if (quedan.length === 0) delete s.cambiosAtributo;
    else if (quedan.length !== s.cambiosAtributo.length) s.cambiosAtributo = quedan;
  }
  if (s.efectosPrestados?.length) {
    const quedan = s.efectosPrestados.filter((p) => p.instId !== instId);
    if (quedan.length === 0) delete s.efectosPrestados;
    else if (quedan.length !== s.efectosPrestados.length) s.efectosPrestados = quedan;
  }
}
function aplicarCambioAtributo(s, cambio) {
  s.cambiosAtributo = [...s.cambiosAtributo ?? [], cambio];
}
function aplicarEfectosPrestados(s, prestado) {
  s.efectosPrestados = [...s.efectosPrestados ?? [], prestado];
}
function sinVencidas(lista, expira, jugador) {
  return lista.map((r) => expira === "ocaso" && r.turnosRestantes !== void 0 ? { ...r, turnosRestantes: r.turnosRestantes - 1 } : r).filter((r) => {
    if (expira === "ocaso") {
      if (r.turnosRestantes !== void 0) return r.turnosRestantes > 0;
      return r.expira !== "ocaso";
    }
    if (jugador !== void 0 && r.duenio !== jugador) return true;
    return r.expira !== expira;
  });
}
function purgarReglasTemporales(s, expira, jugador) {
  if (s.reglasTemporales?.length) {
    const quedan = sinVencidas(s.reglasTemporales, expira, jugador);
    if (quedan.length === 0) delete s.reglasTemporales;
    else s.reglasTemporales = quedan;
  }
  if (s.cambiosAtributo?.length) {
    const quedan = sinVencidas(s.cambiosAtributo, expira, jugador);
    if (quedan.length === 0) delete s.cambiosAtributo;
    else s.cambiosAtributo = quedan;
  }
  if (s.efectosPrestados?.length) {
    const quedan = sinVencidas(s.efectosPrestados, expira, jugador);
    if (quedan.length === 0) delete s.efectosPrestados;
    else s.efectosPrestados = quedan;
  }
}
function purgarReglasHastaFase(s, fase, turno) {
  const vence = (r) => r.expira === "hasta-fase" && r.expiraFase === fase && r.expiraFaseJugador === turno;
  if (s.reglasTemporales?.length) {
    const quedan = s.reglasTemporales.filter((r) => !vence(r));
    if (quedan.length === 0) delete s.reglasTemporales;
    else if (quedan.length !== s.reglasTemporales.length) s.reglasTemporales = quedan;
  }
  if (s.cambiosAtributo?.length) {
    const quedan = s.cambiosAtributo.filter((r) => !vence(r));
    if (quedan.length === 0) delete s.cambiosAtributo;
    else if (quedan.length !== s.cambiosAtributo.length) s.cambiosAtributo = quedan;
  }
  if (s.efectosPrestados?.length) {
    const quedan = s.efectosPrestados.filter((r) => !vence(r));
    if (quedan.length === 0) delete s.efectosPrestados;
    else if (quedan.length !== s.efectosPrestados.length) s.efectosPrestados = quedan;
  }
}

// src/online/game/eter.ts
function claveEfecto(fuenteId, indiceEfecto) {
  return `${fuenteId}#${indiceEfecto}`;
}
function claveExterno(fuenteId) {
  return `${fuenteId}#ext`;
}
function etiquetarEterExterno(s, eterIds, fuenteId, pagador) {
  for (const id of eterIds) {
    const inst = s.instances[id];
    if (!inst) continue;
    inst.bloqueadoPorEfecto = claveExterno(fuenteId);
    inst.pagadoPor = pagador;
  }
}
function etiquetarEter(s, eterIds, fuenteId, indiceEfecto, pagador) {
  for (const id of eterIds) {
    const inst = s.instances[id];
    if (!inst) continue;
    if (indiceEfecto >= 0) inst.bloqueadoPorEfecto = claveEfecto(fuenteId, indiceEfecto);
    inst.pagadoPor = pagador;
  }
}
function eterDeEfecto(s, cardInstanceId, indiceEfecto) {
  const inst = s.instances[cardInstanceId];
  if (!inst?.eterBloqueado?.length) return [];
  const clave = claveEfecto(cardInstanceId, indiceEfecto);
  return inst.eterBloqueado.filter((id) => {
    const tag = s.instances[id]?.bloqueadoPorEfecto;
    return tag === void 0 || tag === clave;
  });
}
function eterQueCuenta(s, cardInstanceId, indiceEfecto) {
  const inst = s.instances[cardInstanceId];
  if (!inst?.eterBloqueado?.length) return [];
  const clave = claveEfecto(cardInstanceId, indiceEfecto);
  const claveExt = claveExterno(cardInstanceId);
  return inst.eterBloqueado.filter((id) => {
    const tag = s.instances[id]?.bloqueadoPorEfecto;
    return tag === void 0 || tag === clave || tag === claveExt;
  });
}
function contarEterUmbral(s, cardInstanceId, indiceEfecto, efecto) {
  return efecto.costo?.tipo === "eter_bloqueado" ? eterQueCuenta(s, cardInstanceId, indiceEfecto).length : eterDeEfecto(s, cardInstanceId, indiceEfecto).length;
}
function quitarEteres(s, fuenteId, ids) {
  const inst = s.instances[fuenteId];
  if (!inst?.eterBloqueado) return;
  const quedan = inst.eterBloqueado.filter((id) => !ids.includes(id));
  if (quedan.length > 0) inst.eterBloqueado = quedan;
  else delete inst.eterBloqueado;
}
function liberarEterA(s, eteres, destino, fallbackPagador) {
  const grupos = {};
  for (const id of eteres) {
    const j = s.instances[id]?.pagadoPor ?? fallbackPagador;
    (grupos[j] ??= []).push(id);
  }
  for (const [jugador, ids] of Object.entries(grupos)) {
    for (const id of ids) {
      const e = s.instances[id];
      if (e) {
        delete e.bloqueadoPorEfecto;
        delete e.pagadoPor;
      }
    }
    const p = s.players[jugador];
    if (destino === "2A") p.eterReserva.push(...ids);
    else p.eterPagado.push(...ids);
  }
  return grupos;
}
function limpiarFlagsUmbralSiVacia(s, fuenteId) {
  const inst = s.instances[fuenteId];
  if (!inst || (inst.eterBloqueado?.length ?? 0) > 0) return;
  delete inst.efectoUmbralDisparado;
  delete inst.copyOneShotDisparado;
  delete inst.tramosDisparados;
  delete inst.fijadoExhaustTargetId;
  delete inst.sostenidos;
  delete inst.efectosUmbralDisparados;
}
function evaluarFinSteal(s, ctx, fuenteId) {
  const inst = s.instances[fuenteId];
  if (!inst?.cardId) return;
  if ((inst.eterBloqueado?.length ?? 0) > 0) return;
  const meta = getCardMeta(inst.cardId);
  const stealEfecto = meta && "efectos" in meta ? meta.efectos?.find((e) => e.efecto === "steal_champion" && e.duracion === "mientras_ester_bloqueado") : void 0;
  if (!stealEfecto) return;
  retornarCampeonesRobados(s, ctx, fuenteId, inst.owner);
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
      if (other.eterBloqueado && other.eterBloqueado.length > 0) {
        const eteres = [...other.eterBloqueado];
        delete other.eterBloqueado;
        delete other.efectoUmbralDisparado;
        delete other.copyOneShotDisparado;
        delete other.tramosDisparados;
        delete other.fijadoExhaustTargetId;
        delete other.sostenidos;
        delete other.efectosUmbralDisparados;
        const grupos = liberarEterA(s, eteres, "2A", ladron);
        for (const [jugador, ids] of Object.entries(grupos)) {
          ctx.emit({ type: "eter_reagrupado", jugador, eterIds: ids });
        }
      }
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

// src/shared/rules/reglas.ts
var REGLAS = {
  /* ── partida ── */
  primerTurnoSinAtaques: { etiqueta: "Nadie ataca en el primer turno del juego", manual: "\xA78.6", ambito: "partida", base: true },
  /* ── jugador ── */
  limiteMano: { etiqueta: "L\xEDmite de mano", manual: "\xA77.1, \xA78.5", ambito: "jugador", base: 6, min: 0 },
  cartasPorAlba: { etiqueta: "Cartas que se roban en el Alba", manual: "\xA78.2", ambito: "jugador", base: 1, min: 0 },
  rupturasPorTurno: { etiqueta: "V\xEDnculos que rompe la Ruptura por turno", manual: "\xA79.4", ambito: "jugador", base: 1, min: 0 },
  atacarTrasRuptura: { etiqueta: "Se puede seguir atacando tras romper un V\xEDnculo", manual: "\xA79.4", ambito: "jugador", base: false },
  derrotaPorVinculos: { etiqueta: "Pierde la partida al quedarse sin V\xEDnculos", manual: "\xA713", ambito: "jugador", base: true },
  /* ── campeón ── */
  agotadoPuedeBloquear: { etiqueta: "Un Campe\xF3n agotado puede bloquear", manual: "\xA79.3", ambito: "campeon", base: false },
  invocacionCansada: { etiqueta: "No ataca el turno en que es invocado", manual: "\xA79.2", ambito: "campeon", base: true },
  atacarAgota: { etiqueta: "Atacar agota al Campe\xF3n", manual: "\xA79.2", ambito: "campeon", base: true },
  disparoAgota: { etiqueta: "Un Disparo con \xC9ter pagado agota al Campe\xF3n", manual: "\xA75.2, \xA78.3a", ambito: "campeon", base: true },
  ataquesPorTurno: { etiqueta: "Ataques por turno", manual: "\xA79.2", ambito: "campeon", base: 1, min: 0 },
  bloqueosPorTurno: { etiqueta: "Bloqueos por turno", manual: "\xA79.3", ambito: "campeon", base: 1, min: 0 },
  puedeSerBloqueado: { etiqueta: "Puede ser bloqueado al atacar", manual: "\xA79.3", ambito: "campeon", base: true },
  puedeSerExiliada: { etiqueta: "Puede ser exiliada", manual: "\xA710", ambito: "campeon", base: true },
  puedeSerDestruidaPorEfecto: { etiqueta: "Puede ser destruida por efectos", manual: "\xA710", ambito: "campeon", base: true },
  puedeSerDestruidaEnBatalla: { etiqueta: "Puede ser destruida en batalla", manual: "\xA710", ambito: "campeon", base: true },
  // Negar un «efecto activo» (Thane) la prohíbe un tiempo: el Campeón no activa ni mantiene sus efectos. NO alcanza a
  // sus keywords (identidad de la carta) ni a su efecto de Comandante (§10): quien la consulta los exceptúa.
  efectosActivos: { etiqueta: "Sus efectos est\xE1n activos (no negados)", manual: "\xA710", ambito: "campeon", base: true },
  /* ── carta ── */
  puedeSerNegada: { etiqueta: "Sus efectos pueden ser negados o contrarrestados por el rival", manual: "\xA710", ambito: "carta", base: true },
  eterBloqueadoExtra: { etiqueta: "\xC9ter bloqueado extra sobre el tope del efecto", manual: "\xA77.7", ambito: "carta", base: 0, min: 0 }
};
var REGLA_IDS = Object.keys(REGLAS);
function resolverRegla(id, modificadores) {
  const def = REGLAS[id];
  const propios = modificadores.filter((m) => m.regla === id);
  if (typeof def.base === "boolean") {
    if (propios.some((m) => m.operacion === "prohibir")) return false;
    if (propios.some((m) => m.operacion === "permitir")) return true;
    return def.base;
  }
  let valor = def.base;
  const fijados = propios.filter((m) => m.operacion === "fijar" && m.valor !== void 0);
  if (fijados.length > 0) {
    valor = fijados.reduce((a, b) => b.orden >= a.orden ? b : a).valor;
  }
  for (const m of propios) {
    if (m.operacion === "sumar" && m.valor !== void 0) valor += m.valor;
  }
  if (def.min !== void 0) valor = Math.max(def.min, valor);
  if (def.max !== void 0) valor = Math.min(def.max, valor);
  return valor;
}
var KEYWORD_REGLAS = {
  Carga: [{ regla: "invocacionCansada", operacion: "prohibir" }],
  Vigor: [{ regla: "atacarAgota", operacion: "prohibir" }],
  Tirador: [{ regla: "disparoAgota", operacion: "prohibir" }],
  Inexiliable: [{ regla: "puedeSerExiliada", operacion: "prohibir" }],
  Inegable: [{ regla: "puedeSerNegada", operacion: "prohibir" }],
  Inmortal: [{ regla: "puedeSerDestruidaPorEfecto", operacion: "prohibir" }],
  Indestructible: [{ regla: "puedeSerDestruidaEnBatalla", operacion: "prohibir" }]
};

// src/online/game/efectosInstancia.ts
function esEfectoCopiable(efecto) {
  if (efecto.tipo !== "pasivo" && efecto.tipo !== "continuo" && efecto.tipo !== "disparo") return false;
  if (efecto.efecto === "copy") return false;
  if (esCostoBloqueo(efecto.costo) || efecto.tramos?.length) return false;
  return true;
}
function umbralDeBloqueo(efecto) {
  return efecto.costo?.umbral ?? (efecto.costo?.tipo === "bloqueo_fijo" ? efecto.costo.cantidad : void 0) ?? 1;
}
function esContinuoDeBloqueo(efecto) {
  return efecto.tipo === "continuo" && esCostoBloqueo(efecto.costo);
}
var SISTEMA_PROPIO = /* @__PURE__ */ new Set([
  "steal_champion",
  "invocar_y_equipar",
  "double_attack",
  "prevent_destroy",
  "modificar_regla",
  "direct_attack",
  "copy",
  "block_ether",
  "redirect"
]);
var SOSTENIBLES = /* @__PURE__ */ new Set(["buff", "debuff", "grant_keyword"]);
function claseDeContinuo(efecto) {
  const accion = efecto.efecto;
  if (!accion || SISTEMA_PROPIO.has(accion)) return "propio";
  if (accion === "negar" && efecto.tipoNegacion !== "efecto_activo") return "propio";
  if (accion === "fix_exhaust") return "sostenido";
  if (SOSTENIBLES.has(accion) && (efecto.duracion === void 0 || efecto.duracion === "mientras_ester_bloqueado")) return "sostenido";
  return "instantaneo";
}
var SIN_ELECCION = /* @__PURE__ */ new Set(["draw", "scry", "rival_discard", "block_ether", "double_attack"]);
function eligeObjetivo(efecto) {
  if (!efecto.efecto || SIN_ELECCION.has(efecto.efecto)) return false;
  if (efecto.efecto === "negar" && efecto.tipoNegacion !== "efecto_activo") return false;
  const tipo = efecto.objetivo?.tipo;
  return !!tipo && !["self", "todos_campeones_propios", "todos_campeones_rivales", "equipped_champion", "invocado", "rival_hand"].includes(tipo);
}
function efectosPrestadosDe(s, instId) {
  const lista = s.efectosPrestados;
  if (!lista?.length) return [];
  return lista.filter((p) => p.instId === instId).flatMap((p) => p.efectos);
}
function metaDeInstancia(s, instId) {
  const cardId = s.instances[instId]?.cardId;
  const meta = cardId ? getCardMeta(cardId) : null;
  if (!meta || !("efectos" in meta)) return meta;
  const prestados = efectosPrestadosDe(s, instId);
  if (prestados.length === 0) return meta;
  return { ...meta, efectos: [...meta.efectos ?? [], ...prestados] };
}

// src/online/game/reglas.ts
var otro = (j) => j === "A" ? "B" : "A";
function reglaDeEfecto(efecto) {
  if (efecto.efecto === "direct_attack") return { id: "puedeSerBloqueado", operacion: "prohibir" };
  return efecto.efecto === "modificar_regla" ? efecto.regla : void 0;
}
var memoEfectosRegla = /* @__PURE__ */ new Map();
function efectosReglaDe(cardId) {
  const memo = memoEfectosRegla.get(cardId);
  if (memo) return memo;
  const meta = getCardMeta(cardId);
  const lista = meta && "efectos" in meta && meta.efectos ? meta.efectos.map((efecto, indice) => ({ efecto, indice })).filter(({ efecto }) => !!reglaDeEfecto(efecto)) : [];
  memoEfectosRegla.set(cardId, lista);
  return lista;
}
function efectosReglaDeInst(s, inst) {
  const impresos = efectosReglaDe(inst.cardId);
  const prestados = efectosPrestadosDe(s, inst.cardInstanceId);
  if (prestados.length === 0) return impresos;
  const meta = getCardMeta(inst.cardId);
  const n = meta && "efectos" in meta ? meta.efectos?.length ?? 0 : 0;
  return [...impresos, ...prestados.map((efecto, k) => ({ efecto, indice: n + k })).filter(({ efecto }) => !!reglaDeEfecto(efecto))];
}
function fuentesDeReglas(s) {
  const fuentes = [];
  const tiene = (inst) => !!inst?.cardId && efectosReglaDeInst(s, inst).length > 0;
  for (const j of ["A", "B"]) {
    const p = s.players[j];
    for (const id of [...p.campo.campeones, ...p.campo.misticasTacticas, ...p.campo.arcanasCombate]) {
      if (!id) continue;
      const inst = s.instances[id];
      if (!inst) continue;
      if (tiene(inst)) fuentes.push({ inst, origen: "campo", controlador: j });
      for (const eterId of inst.eterBloqueado ?? []) {
        const eter = s.instances[eterId];
        if (tiene(eter)) fuentes.push({ inst: eter, origen: "bloqueo", controlador: j, anfitrion: id });
      }
    }
    for (const id of p.eterReserva) {
      const inst = s.instances[id];
      if (tiene(inst)) fuentes.push({ inst, origen: "reserva", controlador: j });
    }
    for (const id of p.eterPagado) {
      const inst = s.instances[id];
      if (tiene(inst)) fuentes.push({ inst, origen: "pagado", controlador: j });
    }
    for (const id of p.vinculos) {
      const inst = id ? s.instances[id] : void 0;
      if (tiene(inst) && inst.bocaArriba === true) fuentes.push({ inst, origen: "vinculo", controlador: j });
    }
  }
  return fuentes;
}
function efectoActivo(s, f, efecto, indice) {
  if (efecto.trigger !== void 0 && efecto.trigger !== "ninguno") return false;
  switch (f.origen) {
    case "campo": {
      if (efecto.tipo !== "pasivo" && efecto.tipo !== "continuo" && efecto.tipo !== "comandante") return false;
      const meta = f.inst.cardId ? getCardMeta(f.inst.cardId) : null;
      if (meta?.type === "Arcana" && f.inst.bocaArriba !== true) return false;
      const costo = efecto.costo;
      const pagaConBloqueo = costo?.tipo === "eter_bloqueado" || costo?.tipo === "bloqueo_fijo";
      if (pagaConBloqueo || efecto.duracion === "mientras_ester_bloqueado") {
        const requerido = costo?.umbral ?? (costo?.tipo === "bloqueo_fijo" ? costo.cantidad : void 0) ?? 1;
        return contarEterUmbral(s, f.inst.cardInstanceId, indice, efecto) >= requerido;
      }
      return true;
    }
    case "reserva":
      return efecto.tipo === "reserva";
    case "pagado":
      return efecto.tipo === "pago";
    case "bloqueo":
      return efecto.tipo === "bloqueo";
    case "vinculo":
      return efecto.tipo === "vinculo";
  }
}
function jugadoresAfectados(f, efecto) {
  const c = efecto.objetivo?.controlador ?? "propio";
  if (c === "ambos") return ["A", "B"];
  if (c === "rival") return [otro(f.controlador)];
  return [f.controlador];
}
function afectaACarta(s, f, efecto, instId) {
  if (f.origen === "bloqueo") return f.anfitrion === instId;
  const objetivo = efecto.objetivo;
  const destino = s.instances[instId];
  if (!destino) return false;
  const mismoControlador = (j) => s.players[j].campo.campeones.includes(instId) || s.players[j].campo.misticasTacticas.includes(instId) || s.players[j].campo.arcanasCombate.includes(instId);
  switch (objetivo?.tipo ?? "self") {
    case "self":
      return f.inst.cardInstanceId === instId;
    case "equipped_champion":
      return f.inst.equipadoA === instId;
    case "todos_campeones_propios":
      return mismoControlador(f.controlador);
    case "todos_campeones_rivales":
      return mismoControlador(otro(f.controlador));
    case "campeon": {
      const c = objetivo?.controlador ?? "propio";
      if (c === "ambos") return mismoControlador("A") || mismoControlador("B");
      return mismoControlador(c === "rival" ? otro(f.controlador) : f.controlador);
    }
    default:
      return false;
  }
}
var REGLAS_DE_KEYWORD = new Set(Object.values(KEYWORD_REGLAS).flatMap((ms) => ms.map((m) => m.regla)));
function efectosNegados(s, instId) {
  return !reglaBool(s, "efectosActivos", { instId });
}
function modificadoresReglaDe(s, regla, sujeto) {
  const def = REGLAS[regla];
  const mods = [];
  if (sujeto && "instId" in sujeto && REGLAS_DE_KEYWORD.has(regla)) {
    for (const kw of keywordsDe(s, sujeto.instId)) {
      for (const m of KEYWORD_REGLAS[kw] ?? []) if (m.regla === regla) mods.push({ ...m, orden: 0 });
    }
  }
  for (const f of fuentesDeReglas(s)) {
    for (const { efecto, indice } of efectosReglaDeInst(s, f.inst)) {
      const m = reglaDeEfecto(efecto);
      if (!m || m.id !== regla || !efectoActivo(s, f, efecto, indice)) continue;
      if (regla !== "efectosActivos" && f.origen === "campo" && efecto.tipo !== "comandante" && efectosNegados(s, f.inst.cardInstanceId)) continue;
      let alcanza = false;
      if (def.ambito === "partida") alcanza = true;
      else if (def.ambito === "jugador") alcanza = !!sujeto && "jugador" in sujeto && jugadoresAfectados(f, efecto).includes(sujeto.jugador);
      else alcanza = !!sujeto && "instId" in sujeto && afectaACarta(s, f, efecto, sujeto.instId);
      if (alcanza) mods.push({ regla, operacion: m.operacion, valor: m.valor, orden: 0 });
    }
  }
  for (const r of s.reglasTemporales ?? []) {
    if (r.regla !== regla) continue;
    const su = r.sujeto;
    const alcanza = su.tipo === "partida" || su.tipo === "jugador" && !!sujeto && "jugador" in sujeto && su.jugador === sujeto.jugador || su.tipo === "carta" && !!sujeto && "instId" in sujeto && su.instId === sujeto.instId;
    if (alcanza) mods.push({ regla, operacion: r.operacion, valor: r.valor, orden: r.orden });
  }
  return mods;
}
function reglaNumero(s, regla, sujeto) {
  return resolverRegla(regla, modificadoresReglaDe(s, regla, sujeto));
}
function reglaBool(s, regla, sujeto) {
  return resolverRegla(regla, modificadoresReglaDe(s, regla, sujeto));
}

// src/online/game/exilio.ts
function esExiliable(s, cardInstanceId) {
  return reglaBool(s, "puedeSerExiliada", { instId: cardInstanceId });
}
function permitirExilio(s, ctx, cardInstanceId) {
  const inst = s.instances[cardInstanceId];
  if (!inst) return false;
  if (esExiliable(s, cardInstanceId)) return true;
  ctx.emit({ type: "exilio_prevenido", cardInstanceId, jugador: inst.owner });
  return false;
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

// src/online/game/replacements.ts
function moverAlCementerio(s, ctx, cardInstanceId) {
  const inst = s.instances[cardInstanceId];
  if (!inst) return "otra";
  let origen = "otra";
  for (const j of ["A", "B"]) {
    const p2 = s.players[j];
    for (const grupo of ["campeones", "misticasTacticas", "arcanasCombate"]) {
      const idx = p2.campo[grupo].indexOf(cardInstanceId);
      if (idx !== -1) {
        p2.campo[grupo][idx] = null;
        origen = "campo";
        break;
      }
    }
    const manoIdx = p2.mano.indexOf(cardInstanceId);
    if (manoIdx !== -1) {
      p2.mano.splice(manoIdx, 1);
      origen = "mano";
    }
  }
  delete inst.condicionHabilitada;
  if (s.cadena?.pila.includes(cardInstanceId)) {
    s.cadena.pila = s.cadena.pila.filter((id) => id !== cardInstanceId);
  }
  liberarEterBloqueadoCore(s, ctx, cardInstanceId, "1A");
  const p = s.players[inst.owner];
  if (!p.cementerio.includes(cardInstanceId)) p.cementerio.push(cardInstanceId);
  return origen;
}
function enviarAlCementerio(s, ctx, cardInstanceId, desde) {
  const inst = s.instances[cardInstanceId];
  if (!inst) return;
  if (inst.vinculadoA) {
    const vinculados = [].concat(inst.vinculadoA);
    inst.vinculadoA = void 0;
    const p = s.players[inst.owner];
    for (const vinculadoId of vinculados) {
      const slotIdx = p.campo.campeones.indexOf(vinculadoId);
      if (slotIdx === -1) continue;
      p.campo.campeones[slotIdx] = null;
      ctx.emit({ type: "carta_salida_de_zona", cardInstanceId: vinculadoId, zona: `2${String.fromCharCode(66 + slotIdx)}`, jugador: inst.owner });
      enviarAlCementerio(s, ctx, vinculadoId, "campo");
      ctx.emit({ type: "carta_entrada_a_zona", cardInstanceId: vinculadoId, zona: "2G", jugador: inst.owner, bocaArriba: true });
    }
  }
  liberarArtefactosEquipados(s, ctx, cardInstanceId);
  const origen = moverAlCementerio(s, ctx, cardInstanceId);
  liberarEterBloqueado(s, ctx, cardInstanceId, "1A");
  dispararTrigger(s, ctx, "al-ser-enviado-al-cementerio", inst.owner, [cardInstanceId], { zonaOrigen: desde ?? origen });
  reiniciarEnCementerio(s, cardInstanceId);
}
function reiniciarEnCementerio(s, cardInstanceId) {
  const inst = s.instances[cardInstanceId];
  const meta = inst?.cardId ? getCardMeta(inst.cardId) : null;
  if (!inst || !meta || !esCampeon(meta)) return;
  if (s.players[inst.owner].cementerio.includes(cardInstanceId)) reiniciarCampeon(s, cardInstanceId);
}
function liberarArtefactosEquipados(s, ctx, campeonId) {
  const inst = s.instances[campeonId];
  if (!inst?.cardId) return;
  const meta = getCardMeta(inst.cardId);
  if (!meta || !esCampeon(meta)) return;
  for (const otherId of Object.keys(s.instances)) {
    const other = s.instances[otherId];
    if (other && other.equipadoA === campeonId) {
      other.equipadoA = void 0;
      const arcIdx = s.players[other.owner].campo.arcanasCombate.indexOf(otherId);
      const zonaSalida = arcIdx !== -1 ? slotAZona("arcanasCombate", arcIdx) ?? "3D" : "3A";
      moverAlCementerio(s, ctx, otherId);
      ctx.emit({ type: "carta_salida_de_zona", cardInstanceId: otherId, zona: zonaSalida, jugador: other.owner });
      ctx.emit({ type: "carta_entrada_a_zona", cardInstanceId: otherId, zona: "2G", jugador: other.owner, bocaArriba: true });
    }
  }
}
function liberarEterBloqueadoCore(s, ctx, cardInstanceId, destino) {
  const inst = s.instances[cardInstanceId];
  if (!inst?.eterBloqueado || inst.eterBloqueado.length === 0) return;
  const eteres = inst.eterBloqueado;
  delete inst.eterBloqueado;
  delete inst.efectoUmbralDisparado;
  delete inst.copyOneShotDisparado;
  delete inst.tramosDisparados;
  delete inst.fijadoExhaustTargetId;
  delete inst.sostenidos;
  delete inst.efectosUmbralDisparados;
  const fuenteSteal = inst.stolenBy ? s.instances[inst.stolenBy] : void 0;
  const duenoDelEter = fuenteSteal ? fuenteSteal.owner : inst.owner;
  liberarEterA(s, eteres, destino, duenoDelEter);
  evaluarFinSteal(s, ctx, cardInstanceId);
}
function liberarEterBloqueado(s, ctx, cardInstanceId, destino) {
  liberarEterBloqueadoCore(s, ctx, cardInstanceId, destino);
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
    if (elegible && esExiliable(s, fuenteId)) return fuenteId;
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
  if (prevenir && fuenteEnCampo && victim && victim.destruccionPendiente && permitirExilio(s, ctx, front.fuenteId)) {
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
  const origen = moverAlCementerio(s, ctx, cardInstanceId);
  liberarEterBloqueado(s, ctx, cardInstanceId, "1A");
  liberarArtefactosEquipados(s, ctx, cardInstanceId);
  dispararTrigger(s, ctx, "al-ser-enviado-al-cementerio", inst.owner, [cardInstanceId], { zonaOrigen: origen });
  ctx.emit({ type: "carta_muerta", cardInstanceId, jugador: inst.owner, causa });
  ctx.emit({ type: "destruccion", cardInstanceId, jugador: inst.owner, causa });
  reiniciarEnCementerio(s, cardInstanceId);
  return true;
}

// src/online/game/combat.ts
var tieneKeyword = (state, id, kw) => keywordsDe(state, id).includes(kw);
var rupturasHechas = (state) => state.rupturasEsteTurno ?? 0;
var rupturasAgotadas = (state) => rupturasHechas(state) >= reglaNumero(state, "rupturasPorTurno", { jugador: state.turno });
var atacarBloqueadoPorRuptura = (state) => rupturasHechas(state) > 0 && !reglaBool(state, "atacarTrasRuptura", { jugador: state.turno });
var rivalDe = (state) => state.turno === "A" ? "B" : "A";
function controladorDe(s, id) {
  for (const j of ["A", "B"]) {
    if (s.players[j].campo.campeones.includes(id)) return j;
  }
  return null;
}
function atacantesElegibles(state) {
  if (state.primerTurno && reglaBool(state, "primerTurnoSinAtaques")) return [];
  if (atacarBloqueadoPorRuptura(state)) return [];
  const p = state.players[state.turno];
  return p.campo.campeones.filter((id) => {
    if (!id) return false;
    const inst = state.instances[id];
    if (!inst) return false;
    const doubleActivo = tieneDoubleAttackActivo(state, id);
    if (inst.atacoEsteTurno && !doubleActivo) return false;
    if (inst.agotado) {
      if (!(doubleActivo && inst.atacoEsteTurno)) return false;
    }
    if (inst.entradaEsteTurno && reglaBool(state, "invocacionCansada", { instId: id })) return false;
    return true;
  });
}
function rupturaPendiente(s) {
  const combate = s.combate;
  if (!combate || combate.paso !== "resolucion" || rupturasAgotadas(s)) return false;
  const hayVinculoVivo = s.players[rivalDe(s)].vinculos.some((id) => !!id && !s.instances[id]?.bocaArriba);
  if (!hayVinculoVivo) return false;
  return ataquesSinBloquear(s).some((id) => s.players[s.turno].campo.campeones.includes(id));
}
function cerrarCombateSiDoubleAttack(s) {
  const combate = s.combate;
  if (!combate) return;
  if (rupturaPendiente(s)) return;
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
    if (!inst) return false;
    if ((inst.bloqueosEsteTurno ?? 0) >= reglaNumero(state, "bloqueosPorTurno", { instId: id })) return false;
    return !inst.agotado || reglaBool(state, "agotadoPuedeBloquear", { instId: id });
  });
}
function ataquesSinBloquear(state) {
  const combate = state.combate;
  if (!combate) return [];
  return combate.atacantes.filter((a) => !(a in combate.bloqueos));
}
function ataquesBloqueables(state) {
  return ataquesSinBloquear(state).filter((id) => reglaBool(state, "puedeSerBloqueado", { instId: id }));
}
function asignacionForzada(state) {
  const combate = state.combate;
  if (!combate || combate.paso !== "bloqueo") return null;
  const disponibles = bloqueadoresDisponibles(state);
  const sinBloquear = ataquesBloqueables(state);
  const k = Math.min(disponibles.length, sinBloquear.length);
  if (k === 0) return null;
  const asignaciones = {};
  for (let i = 0; i < k; i++) asignaciones[sinBloquear[i]] = disponibles[i];
  return asignaciones;
}
function validarDeclararAtaque(state, atacanteIds) {
  if (state.fase !== "choque") return "declarar_ataque solo en Choque";
  if (state.combate) return "el combate ya fue declarado";
  if (state.primerTurno && reglaBool(state, "primerTurnoSinAtaques")) return "nadie ataca en el primer turno (\xA78.6)";
  if (atacarBloqueadoPorRuptura(state)) return "no se puede atacar despu\xE9s de una Ruptura (\xA79.4)";
  if (atacanteIds.length === 0) return "no declaraste atacantes";
  if (new Set(atacanteIds).size !== atacanteIds.length) return "atacantes duplicados";
  const elegibles = atacantesElegibles(state);
  for (const id of atacanteIds) {
    if (!elegibles.includes(id)) return `el Campe\xF3n no puede atacar: ${id}`;
  }
  return null;
}
function ejecutarDeclararAtaque(s, atacanteIds, ctx) {
  const previos = marcarInicioAccion(s);
  s.combate = {
    paso: "bloqueo",
    atacantes: atacanteIds,
    bloqueos: {},
    rupturaDisponible: true,
    rupturaUsadaEsteTurno: rupturasAgotadas(s)
  };
  for (const id of atacanteIds) {
    const inst = s.instances[id];
    inst.atacoEsteTurno = true;
    if (reglaBool(s, "atacarAgota", { instId: id })) inst.agotado = true;
    if (tieneKeyword(s, id, "Recarga") && inst.eterBloqueado && inst.eterBloqueado.length > 0) {
      const eter = inst.eterBloqueado.shift();
      const pagador = s.instances[eter]?.pagadoPor ?? inst.owner;
      const e = s.instances[eter];
      if (e) {
        delete e.bloqueadoPorEfecto;
        delete e.pagadoPor;
      }
      s.players[pagador].eterReserva.push(eter);
      ctx.emit({ type: "eter_reagrupado", jugador: pagador, eterIds: [eter] });
      evaluarFinSteal(s, ctx, id);
    }
  }
  ctx.emit({ type: "ataque_declarado", jugador: s.turno, atacanteIds });
  const triggers = construirTriggers(s, "al-atacar", s.turno, atacanteIds);
  if (triggers.length === 0) dispararTrigger(s, ctx, "al-atacar", s.turno, atacanteIds);
  const apilados = triggers.length > 0 ? armarTriggers(s, ctx, triggers) : [];
  declararVentana(s, ctx, { tipo: "ataque", jugador: s.turno, ...apilados.length > 0 ? { triggers: apilados } : {} }, previos);
}
function depurarAtacantes(s) {
  const combate = s.combate;
  if (!combate) return false;
  combate.atacantes = combate.atacantes.filter((id) => s.players[s.turno].campo.campeones.includes(id));
  if (combate.atacantes.length === 0) {
    s.combate = void 0;
    return false;
  }
  return true;
}
function abrirVentanaAtaque(s, ctx) {
  if (!depurarAtacantes(s)) return;
  const combate = s.combate;
  if (abrirCadena(s, rivalDe(s))) return;
  if (bloqueadoresDisponibles(s).length === 0 || ataquesBloqueables(s).length === 0) {
    combate.paso = "resolucion";
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
  const sinBloquear = ataquesBloqueables(state);
  const k = Math.min(disponibles.length, sinBloquear.length);
  if (pares.length !== k) {
    return `el bloqueo es forzoso: asigna exactamente ${k} bloqueador(es) (9.3)`;
  }
  const bloqueadoresUsados = /* @__PURE__ */ new Set();
  for (const [atacanteId, bloqueadorId] of pares) {
    if (!sinBloquear.includes(atacanteId)) return `no es un ataque sin bloquear: ${atacanteId}`;
    if (!disponibles.includes(bloqueadorId)) return `el bloqueador no est\xE1 disponible: ${bloqueadorId}`;
    if (bloqueadoresUsados.has(bloqueadorId)) return "un bloqueador no puede cubrir 2 ataques (\xA79.3)";
    bloqueadoresUsados.add(bloqueadorId);
  }
  return null;
}
function ejecutarDeclararBloqueo(s, asignaciones, ctx) {
  const combate = s.combate;
  combate.bloqueos = { ...combate.bloqueos, ...asignaciones };
  for (const bloqueadorId of Object.values(asignaciones)) {
    const b = s.instances[bloqueadorId];
    if (b) b.bloqueosEsteTurno = (b.bloqueosEsteTurno ?? 0) + 1;
  }
  combate.paso = "resolucion";
  combate.rupturaDisponible = ataquesSinBloquear(s).length > 0;
  ctx.emit({ type: "bloqueo_declarado", jugador: rivalDe(s), asignaciones });
  if (abrirCadena(s, rivalDe(s))) {
    combate.danoPendiente = true;
    return;
  }
  resolverCombate(s, ctx);
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
    if (!s.players[s.turno].campo.campeones.includes(atacante)) continue;
    if (!s.players[rivalDe(s)].campo.campeones.includes(bloqueador)) continue;
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
  if (!combate || s.fase !== "choque") return;
  if (combate.paso === "resolucion") {
    if (combate.danoPendiente) {
      delete combate.danoPendiente;
      resolverCombate(s, ctx);
    }
    return;
  }
  if (combate.paso === "bloqueo" && !depurarAtacantes(s)) return;
  if (combate.paso === "bloqueo" && (bloqueadoresDisponibles(s).length === 0 || ataquesBloqueables(s).length === 0)) {
    combate.paso = "resolucion";
    resolverCombate(s, ctx);
    cerrarCombateSiDoubleAttack(s);
  }
}
function validarElegirRuptura(state, atacanteId, vinculoSlot) {
  if (state.fase !== "choque") return "elegir_ruptura solo en Choque";
  const combate = state.combate;
  if (!combate || combate.paso !== "resolucion") return "no hay resoluci\xF3n pendiente";
  if (rupturasAgotadas(state)) return "ya hiciste la Ruptura de este turno (\xA79.4)";
  if (atacanteId === null) {
    return "la Ruptura es obligatoria si hay un ataque sin bloquear (\xA79.4)";
  }
  if (!combate.rupturaDisponible) return "no hay ataques sin bloquear para romper";
  if (!combate.atacantes.includes(atacanteId)) return "no es un atacante declarado";
  if (atacanteId in combate.bloqueos) return "el ataque fue bloqueado: no rompe (\xA79.4-B)";
  if (!state.players[state.turno].campo.campeones.includes(atacanteId)) return "el atacante muri\xF3";
  if (vinculoSlot === void 0 || vinculoSlot < 0 || vinculoSlot > 5) return "vinculoSlot 0-5";
  const vinculoId = state.players[rivalDe(state)].vinculos[vinculoSlot];
  if (!vinculoId) return "no hay V\xEDnculo vivo en ese slot";
  if (state.instances[vinculoId]?.bocaArriba) return "el V\xEDnculo ya fue destruido";
  return null;
}
function ejecutarElegirRuptura(s, atacanteId, vinculoSlot, ctx) {
  if (atacanteId === null || vinculoSlot === void 0) return;
  const vinculoId = s.players[rivalDe(s)].vinculos[vinculoSlot];
  ctx.emit({ type: "ruptura_realizada", atacanteId, vinculoSlot, vinculoId });
  destruirCarta(s, ctx, vinculoId, "ruptura");
  s.rupturasEsteTurno = rupturasHechas(s) + 1;
  if (s.combate) s.combate.rupturaUsadaEsteTurno = rupturasAgotadas(s);
  cerrarCombateSiDoubleAttack(s);
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
    const idx = p.eterReserva.indexOf(id);
    if (idx !== -1) p.eterReserva.splice(idx, 1);
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
function validarBloqueo(state, jugador, eterIds, targetInstanceId, efectoIdx, opciones) {
  const externo = opciones?.externo === true;
  const inst = state.instances[targetInstanceId];
  if (!inst) return "la carta no existe";
  const p = state.players[jugador];
  const enCampo = p.campo.campeones.includes(targetInstanceId) || p.campo.misticasTacticas.includes(targetInstanceId) || p.campo.arcanasCombate.includes(targetInstanceId);
  if (!enCampo) return "la carta no est\xE1 en tu campo";
  const meta = inst.cardId ? getCardMeta(inst.cardId) : null;
  if (!meta) return "carta desconocida";
  if (efectosNegados(state, targetInstanceId)) return "los efectos de esta carta est\xE1n negados";
  if (!p.campo.campeones.includes(targetInstanceId)) {
    if (!cartaNecesitaEterBloqueado(meta)) {
      return "esta carta no tiene efecto que use \xC9ter bloqueado";
    }
  }
  if (eterIds.length === 0) return "no indicaste \xC9teres para bloquear";
  const fuente = efectoIdx !== void 0 && "efectos" in meta && meta.efectos?.[efectoIdx] ? { efecto: meta.efectos[efectoIdx], indice: efectoIdx } : efectoBloqueoAccion(meta);
  const maxEter = fuente?.efecto.costo?.cantidad ?? 1;
  const fijo = fuente?.efecto.costo?.tipo === "bloqueo_fijo";
  const actuales = fuente ? eterDeEfecto(state, targetInstanceId, fuente.indice).length : inst.eterBloqueado?.length ?? 0;
  const total = actuales + eterIds.length;
  if (!externo) {
    if (fijo) {
      if (eterIds.length !== maxEter) {
        return `bloqueo fijo: debes bloquear exactamente ${maxEter} \xC9ter(es) por activaci\xF3n (seleccionaste ${eterIds.length})`;
      }
      if (fuente && fuente.efecto.unaVezPorTurno && (inst.efectosUsadosEsteTurno ?? []).includes(fuente.indice)) {
        return "ya usaste este efecto este turno (una vez por turno)";
      }
    } else if (total > maxEter) {
      return `m\xE1ximo ${maxEter} \xC9ter(es) bloqueado(s) en esta carta (ya tiene ${actuales})`;
    }
  }
  for (const id of eterIds) {
    const eterInst = state.instances[id];
    const eterMeta = eterInst?.cardId ? getCardMeta(eterInst.cardId) : null;
    if (!eterInst || !eterMeta || !esEter(eterMeta)) return `no es un \xC9ter: ${id}`;
    const origenPagado = !externo && fuente?.efecto.costo?.origen === "pagado";
    const zonaOrigen = origenPagado ? p.eterPagado : p.eterReserva;
    if (!zonaOrigen.includes(id)) {
      return origenPagado ? `el \xC9ter no est\xE1 en tu \xC9ter Pagado (1A): ${id}` : `el \xC9ter no est\xE1 en tu Reserva: ${id}`;
    }
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
function bloquearEter(s, ctx, jugador, eterIds, targetInstanceId, efectoIdx) {
  const error = validarBloqueo(s, jugador, eterIds, targetInstanceId, efectoIdx);
  if (error) return error;
  const p = s.players[jugador];
  const instTarget = s.instances[targetInstanceId];
  instTarget.eterBloqueado = [...instTarget.eterBloqueado ?? [], ...eterIds];
  const meta = instTarget.cardId ? getCardMeta(instTarget.cardId) : null;
  const fuente = efectoIdx !== void 0 && meta && "efectos" in meta && meta.efectos?.[efectoIdx] ? { efecto: meta.efectos[efectoIdx], indice: efectoIdx } : meta ? efectoBloqueoAccion(meta) : null;
  const zonaOrigen = fuente?.efecto.costo?.origen === "pagado" ? p.eterPagado : p.eterReserva;
  for (const id of eterIds) {
    const idx = zonaOrigen.indexOf(id);
    if (idx !== -1) zonaOrigen.splice(idx, 1);
  }
  etiquetarEter(s, eterIds, targetInstanceId, fuente?.indice ?? -1, jugador);
  if (fuente?.efecto.costo?.tipo === "bloqueo_fijo" && fuente.efecto.unaVezPorTurno) {
    instTarget.efectosUsadosEsteTurno = [...instTarget.efectosUsadosEsteTurno ?? [], fuente.indice];
  }
  ctx.emit({ type: "eter_bloqueado", jugador, eterIds, campeonId: targetInstanceId });
  return null;
}
function reagruparEter(s, ctx, jugador) {
  const p = s.players[jugador];
  if (p.eterPagado.length === 0) return;
  const reagrupados = p.eterPagado;
  for (const id of reagrupados) delete s.instances[id]?.opcionUsadaEsteTurno;
  p.eterReserva.push(...reagrupados);
  p.eterPagado = [];
  ctx.emit({ type: "eter_reagrupado", jugador, eterIds: reagrupados });
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
      quitarEteres(s, ep.fuente, eteresVivos);
      const grupos = liberarEterA(s, eteresVivos, "2A", ep.owner);
      for (const [pagador, ids] of Object.entries(grupos)) {
        ctx.emit({ type: "eter_reagrupado", jugador: pagador, eterIds: ids });
      }
      evaluarFinSteal(s, ctx, ep.fuente);
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
        enviarAlCementerio(s, ctx, accion.objetivo, "campo");
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
      for (let i = 0; i < accion.cantidad; i++) {
        if (s.fase === "terminada") break;
        if (!robarCarta(s, ctx, ep.owner)) break;
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
        enviarAlCementerio(s, ctx, accion.objetivo, "campo");
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

// src/online/game/habilidadPago.ts
function eterIdsParaHabilidad(state, jugador, efecto) {
  const p = state.players[jugador];
  const costo = efecto.costo?.cantidad ?? 0;
  if (esCostoBloqueo(efecto.costo)) {
    const zona = efecto.costo?.origen === "pagado" ? p.eterPagado : p.eterReserva;
    if (costo <= 0 || zona.length < costo) return null;
    return zona.slice(0, costo);
  }
  const necesarios = costo > 0 ? costo : 1;
  return p.eterReserva.length >= necesarios ? p.eterReserva.slice(0, necesarios) : null;
}
function pagarHabilidad(s, ctx, jugador, instId, efectoSel, eterIds) {
  const p = s.players[jugador];
  const inst = s.instances[instId];
  const meta = inst.cardId ? getCardMeta(inst.cardId) : null;
  if (!meta) return;
  if (esCostoBloqueo(efectoSel.costo)) {
    const zonaOrigen = efectoSel.costo?.origen === "pagado" ? p.eterPagado : p.eterReserva;
    for (const eterId of eterIds) {
      const idx = zonaOrigen.indexOf(eterId);
      if (idx !== -1) zonaOrigen.splice(idx, 1);
    }
    inst.eterBloqueado = [...inst.eterBloqueado ?? [], ...eterIds];
    const idxSel = meta.efectos?.indexOf(efectoSel) ?? -1;
    etiquetarEter(s, [...eterIds], instId, idxSel, jugador);
    const efectoConReagrupar = meta.efectos && "efectos" in meta ? meta.efectos.find((e) => e.reagrupar && esCostoBloqueo(e.costo)) : void 0;
    if (efectoConReagrupar?.reagrupar) {
      registrarEfectoPendiente(s, {
        fuente: instId,
        owner: jugador,
        triggerFase: efectoConReagrupar.reagrupar.fase,
        triggerOwner: efectoConReagrupar.reagrupar.turno === "propio" ? "due\xF1o" : "rival",
        accion: { tipo: "liberar-eter", eterIds: [...eterIds], destino: "reserva" },
        duracion: hastaAlba()
      });
    }
    ctx.emit({ type: "eter_bloqueado", jugador, eterIds: [...eterIds], campeonId: instId });
    inst.opcionUsadaEsteTurno = true;
    if (efectoSel.tipo === "continuo") inst.agotado = true;
    return;
  }
  for (const eterId of eterIds) {
    const idx = p.eterReserva.indexOf(eterId);
    if (idx !== -1) p.eterReserva.splice(idx, 1);
    p.eterPagado.push(eterId);
  }
  if (eterIds.length > 0) {
    ctx.emit({ type: "eter_pagado", jugador, eterIds: [...eterIds], costo: eterIds.length, aportado: eterIds.length });
  }
  if (efectoSel.tipo !== "disparo") inst.opcionUsadaEsteTurno = true;
  if (efectoSel.tipo === "disparo" && reglaBool(s, "disparoAgota", { instId })) inst.agotado = true;
}

// src/online/game/chain.ts
function velocidadRequeridaDe(state) {
  const cadena = cadenaActiva(state);
  if (!cadena) return "normal";
  const tope = cadena.pila.length > 0 ? cadena.pila[cadena.pila.length - 1] : cadena.efectoActual?.cardInstanceId;
  return tope ? velocidadDe(state, tope) : "normal";
}
function puedeResponder(vel, requerida) {
  if (requerida === "fugaz") return false;
  if (requerida === "presteza") return vel === "presteza" || vel === "fugaz";
  return true;
}
function motivoArcanaNoActivable(state, jugador, id) {
  const inst = state.instances[id];
  const meta = inst?.cardId ? getCardMeta(inst.cardId) : null;
  if (!inst || !meta) return "instancia no encontrada";
  if (!esArcana(meta)) return "no es una Arcana";
  const p = state.players[jugador];
  if (!p.campo.arcanasCombate.includes(id)) return "la Arcana no est\xE1 en el campo";
  if (inst.bocaArriba) return "la Arcana ya est\xE1 boca arriba";
  if (inst.entradaEsteTurno) return "la Arcana no se puede activar el turno en que fue colocada (\xA75.4)";
  const condicion = "condicion" in meta ? meta.condicion : void 0;
  if (condicionEsCandado(condicion)) {
    if (!inst.condicionHabilitada) return "la condici\xF3n de la Arcana no se cumpli\xF3 al inicio de su momento (Alba/Choque)";
  } else {
    const condError = condicionCumple(state, condicion, jugador);
    if (condError) return condError;
  }
  if (esArtefactoEquipable(meta) && !p.campo.campeones.some((c) => c !== null)) {
    return "no puedes activar un ARTEFACTO sin un Campe\xF3n en tu campo";
  }
  return null;
}
function disparoDeRespuesta(meta) {
  if (!meta || !("efectos" in meta) || !meta.efectos) return null;
  const efectoIdx = meta.efectos.findIndex((e) => e.tipo === "disparo" && !!e.efecto && (!e.trigger || e.trigger === "ninguno"));
  return efectoIdx === -1 ? null : { efecto: meta.efectos[efectoIdx], efectoIdx };
}
function motivoNoResponde(state, jugador, id, origen) {
  const cadena = cadenaActiva(state);
  const inst = state.instances[id];
  const meta = metaDeInstancia(state, id);
  if (!inst || !meta) return "carta desconocida";
  if (cadena && (cadena.pila.includes(id) || cadena.opener?.cardInstanceId === id)) return "la carta ya est\xE1 en la pila";
  const p = state.players[jugador];
  const vel = velocidadDe(state, id);
  const requerida = velocidadRequeridaDe(state);
  if (!puedeResponder(vel, requerida)) {
    return requerida === "fugaz" ? "una jugada FUGAZ no se puede responder" : "una jugada PRESTEZA solo se responde con PRESTEZA o FUGAZ";
  }
  if (origen === "mano") {
    if (!p.mano.includes(id)) return "la carta no est\xE1 en tu mano";
    if (!esMistica(meta)) return "no es una M\xEDstica";
    if (vel === "normal") return "solo cartas con PRESTEZA o FUGAZ juegan desde la mano como respuesta";
    if (esPermanenteEnMesa(meta)) {
      if (!p.campo.misticasTacticas.includes(null)) return "no tienes un slot libre para una carta que permanece en mesa";
      if (esArtefactoEquipable(meta) && !p.campo.campeones.some((c) => c !== null)) {
        return "no puedes jugar un ARTEFACTO sin un Campe\xF3n en tu campo";
      }
    }
    if (etersParaPagar(state, jugador, meta.id) === null) return "no puedes pagar su coste";
    return null;
  }
  if (esMistica(meta)) return "las M\xEDsticas solo se juegan desde la mano: una M\xEDstica en el campo no responde (\xA75.3)";
  if (esArcana(meta)) {
    const motivo = motivoArcanaNoActivable(state, jugador, id);
    if (motivo) return motivo;
    return etersParaPagar(state, jugador, meta.id) === null ? "no puedes pagar su coste" : null;
  }
  if (meta.type === "Campe\xF3n" && "efectos" in meta && meta.efectos?.some((e) => e.tipo === "disparo")) {
    if (efectosNegados(state, id)) return "los efectos de esta carta est\xE1n negados";
    if (inst.agotado && !meta.efectos.some((e) => e.tipo === "disparo" && esCostoBloqueo(e.costo))) return "el Campe\xF3n est\xE1 agotado";
    const disparo = disparoDeRespuesta(meta);
    if (disparo) {
      if (esCostoBloqueo(disparo.efecto.costo) && inst.opcionUsadaEsteTurno) return "ya usaste esta habilidad este turno";
      if (eterIdsParaHabilidad(state, jugador, disparo.efecto) === null) return "no puedes pagar su coste";
    }
    return null;
  }
  return "esta carta no puede responder";
}
function respondiblesDe(state, playerId) {
  const p = state.players[playerId];
  const enCampo = [...p.campo.misticasTacticas, ...p.campo.arcanasCombate, ...p.campo.campeones];
  return enCampo.filter((id) => !!id && motivoNoResponde(state, playerId, id, "campo") === null);
}
function abrirCadena(s, primerRespondedor) {
  const combate = s.combate;
  if (!combate) return false;
  if (respondiblesDe(s, primerRespondedor).length === 0 && respuestasDeMano(s, primerRespondedor).length === 0) return false;
  s.cadena = { origen: "combate", pila: [], prioridad: primerRespondedor, pasesConsecutivos: 0, faseAbierta: s.fase };
  return true;
}
function respuestasDeMano(state, playerId) {
  return state.players[playerId].mano.filter((id) => motivoNoResponde(state, playerId, id, "mano") === null);
}
function abrirCadenaGlobal(s, jugadorActivo, efecto, incluirMano = false) {
  const vel = velocidadDe(s, efecto.cardInstanceId);
  if (vel === "fugaz") return false;
  const rival = jugadorActivo === "A" ? "B" : "A";
  s.cadena = {
    origen: "global",
    pila: [],
    prioridad: rival,
    // el rival responde primero
    pasesConsecutivos: 0,
    faseAbierta: s.fase,
    efectoActual: { jugador: jugadorActivo, ...efecto },
    velocidadActual: vel
  };
  const conCampo = respondiblesDe(s, rival).length > 0;
  const conMano = incluirMano && respuestasDeMano(s, rival).length > 0;
  if (!conCampo && !conMano) {
    s.cadena = void 0;
    return false;
  }
  return true;
}
function cadenaActiva(s) {
  return s.cadena;
}
function validarResponderCadena(state, cardInstanceId, eterIds) {
  const cadena = cadenaActiva(state);
  if (!cadena) return "no hay cadena abierta";
  if (!respondiblesDe(state, cadena.prioridad).includes(cardInstanceId)) {
    return "esa carta no puede responder ahora";
  }
  const meta = metaDeInstancia(state, cardInstanceId);
  if (meta && esArcana(meta) && eterIds !== void 0 && meta.stats.cost > 0) {
    const pago = validarPago(state, cadena.prioridad, eterIds, meta.id);
    if (!pago.ok) return pago.error ?? "pago inv\xE1lido";
  }
  const disparo = meta?.type === "Campe\xF3n" ? disparoDeRespuesta(meta) : null;
  if (disparo && eterIds !== void 0) {
    const esperado = eterIdsParaHabilidad(state, cadena.prioridad, disparo.efecto);
    if (!esperado) return "no puedes pagar su coste";
    if (eterIds.length !== esperado.length) return `${meta.name} requiere exactamente ${esperado.length} \xC9ter(es), indicaste ${eterIds.length}`;
    const p = state.players[cadena.prioridad];
    const zona = esCostoBloqueo(disparo.efecto.costo) && disparo.efecto.costo?.origen === "pagado" ? p.eterPagado : p.eterReserva;
    if (new Set(eterIds).size !== eterIds.length) return "\xE9teres repetidos";
    for (const id of eterIds) if (!zona.includes(id)) return `el \xC9ter ${id} no est\xE1 en la zona de pago`;
  }
  return null;
}
function validarPasarPrioridad(state) {
  if (!cadenaActiva(state)) return "no hay cadena abierta";
  return null;
}
function validarJugarRespuesta(state, cardInstanceId, eterIds) {
  const cadena = cadenaActiva(state);
  if (!cadena) return "no hay cadena abierta";
  const jugador = cadena.prioridad;
  const motivo = motivoNoResponde(state, jugador, cardInstanceId, "mano");
  if (motivo) return motivo;
  const meta = getCardMeta(state.instances[cardInstanceId].cardId);
  if ((meta.stats.cost ?? 0) > 0) {
    const pago = validarPago(state, jugador, eterIds, meta.id);
    if (!pago.ok) return pago.error ?? "pago inv\xE1lido";
  }
  return null;
}
function ejecutarJugarRespuesta(s, cardInstanceId, eterIds, ctx) {
  const cadena = cadenaActiva(s);
  if (!cadena) return;
  const jugador = cadena.prioridad;
  const p = s.players[jugador];
  const inst = s.instances[cardInstanceId];
  if (!inst?.cardId) return;
  const previos = marcarInicioAccion(s);
  const contextoUso = { tipo: "jugar", cardInstanceId };
  aplicarPago(s, ctx, jugador, eterIds, inst.cardId, contextoUso);
  const manoIdx = p.mano.indexOf(cardInstanceId);
  if (manoIdx !== -1) p.mano.splice(manoIdx, 1);
  ctx.emit({ type: "carta_salida_de_zona", cardInstanceId, zona: "mano", jugador });
  const meta = getCardMeta(inst.cardId);
  if (meta && esPermanenteEnMesa(meta)) {
    const slot = p.campo.misticasTacticas.indexOf(null);
    p.campo.misticasTacticas[slot] = cardInstanceId;
    inst.entradaEsteTurno = true;
    ctx.emit({ type: "carta_entrada_a_zona", cardInstanceId, zona: slotAZona("misticasTacticas", slot) ?? "3A", jugador, bocaArriba: true });
    ctx.emit({ type: "carta_invocada", cardInstanceId, tipo: "M\xEDstica", slot });
  }
  declararRespuesta(s, ctx, { jugador, cardInstanceId, origen: "mano" }, previos);
}
function ejecutarResponderCadena(s, cardInstanceId, ctx, eterIds) {
  const cadena = cadenaActiva(s);
  if (!cadena) return;
  const jugador = cadena.prioridad;
  const previos = marcarInicioAccion(s);
  const inst = s.instances[cardInstanceId];
  const meta = metaDeInstancia(s, cardInstanceId);
  if (inst && meta && esArcana(meta)) {
    const pagos = eterIds ?? etersParaPagar(s, jugador, meta.id) ?? [];
    if (pagos.length > 0) aplicarPago(s, ctx, jugador, pagos, meta.id, { tipo: "habilidad", cardInstanceId });
  }
  if (meta && esArcana(meta)) {
    inst.bocaArriba = true;
    const slot = s.players[jugador].campo.arcanasCombate.indexOf(cardInstanceId);
    ctx.emit({ type: "carta_activada", cardInstanceId, jugador, slot });
  }
  if (meta && meta.type === "Campe\xF3n" && "efectos" in meta && meta.efectos?.some((e) => e.tipo === "disparo")) {
    inst.bocaArriba = true;
    const disparo = disparoDeRespuesta(meta);
    if (disparo) pagarHabilidad(s, ctx, jugador, cardInstanceId, disparo.efecto, eterIds ?? eterIdsParaHabilidad(s, jugador, disparo.efecto) ?? []);
  }
  declararRespuesta(s, ctx, { jugador, cardInstanceId, origen: "campo" }, previos);
}
function ejecutarPasarPrioridad(s, ctx) {
  const cadena = cadenaActiva(s);
  if (!cadena) return;
  const jugador = cadena.prioridad;
  cadena.pasesConsecutivos++;
  ctx.emit({ type: "prioridad_pasada", jugador });
  if (cadena.pasesConsecutivos >= 2) {
    cerrarCadena(s, ctx);
  } else {
    cadena.prioridad = jugador === "A" ? "B" : "A";
  }
}
function hechizosDeRespuesta(s, id, origen) {
  const meta = metaDeInstancia(s, id);
  if (meta && meta.type === "Campe\xF3n" && origen === "campo") {
    const disparo = disparoDeRespuesta(meta);
    return disparo ? [disparo] : [];
  }
  const aportaHechizos = !!meta && (esArcana(meta) || esMistica(meta) && origen === "mano");
  return aportaHechizos ? hechizosDelOpener(s, id).hechizos : [];
}
function declararRespuesta(s, ctx, respuesta, previos) {
  const { jugador, cardInstanceId, origen } = respuesta;
  const inst = s.instances[cardInstanceId];
  if (inst) {
    const meta = inst.cardId ? getCardMeta(inst.cardId) : null;
    if (meta && esArtefactoEquipable(meta) && !inst.equipadoA) {
      const opciones = s.players[jugador].campo.campeones.filter((c) => c !== null);
      if (opciones.length > 0) {
        s.objetivosPendientes = [...s.objetivosPendientes ?? [], { jugador, instId: cardInstanceId, trigger: "equipar", opciones, equipar: true }];
      }
    }
    const costoPagado = meta?.type === "Campe\xF3n";
    for (const { efecto, efectoIdx } of hechizosDeRespuesta(s, cardInstanceId, origen)) {
      interpretEffect(s, ctx, inst, efecto, { jugador, fromTrigger: true, declararOpener: { efectoIdx }, ...costoPagado ? { costoPagado } : {} });
    }
    dispararTrigger(s, ctx, "al-resolver-cadena", jugador, [cardInstanceId], { declarar: true, cobrarCosto: false });
  }
  declararVentana(s, ctx, { tipo: "respuesta", jugador, respuesta: { jugador, cardInstanceId, origen } }, previos);
}
function asentarRespuesta(s, ctx, respuesta, triggers) {
  const cadena = cadenaActiva(s);
  if (!cadena) return;
  const { jugador, cardInstanceId, origen, objetivos } = respuesta;
  cadena.pila.push(cardInstanceId);
  cadena.respuestas = { ...cadena.respuestas, [cardInstanceId]: { jugador, origen, ...objetivos ? { objetivos } : {} } };
  cadena.pasesConsecutivos = 0;
  asentarTriggers(s, triggers);
  cadena.velocidadActual = velocidadDe(s, cardInstanceId);
  ctx.emit({ type: "respuesta_encadenada", jugador, cardInstanceId });
  cadena.prioridad = jugador === "A" ? "B" : "A";
  if (cadena.velocidadActual === "fugaz") cerrarCadena(s, ctx);
}
function equiparComoRespuesta(s, ctx, pendiente, campeonId) {
  const inst = s.instances[pendiente.instId];
  if (!inst || !s.instances[campeonId]) return;
  inst.equipadoA = campeonId;
  ctx.emit({ type: "carta_activada", cardInstanceId: pendiente.instId, jugador: pendiente.jugador, slot: -1 });
}
function cerrarCadena(s, ctx) {
  const origen = s.cadena?.origen;
  resolverPila(s, ctx);
  if (origen === "combate" && s.combate) continuarCombateTrasCadena(s, ctx);
}
function sinReceptor(s, ctx, id) {
  const inst = s.instances[id];
  if (!inst) return;
  for (const grupo of ["misticasTacticas", "arcanasCombate"]) {
    const idx = s.players[inst.owner].campo[grupo].indexOf(id);
    if (idx === -1) continue;
    ctx.emit({ type: "carta_salida_de_zona", cardInstanceId: id, zona: slotAZona(grupo, idx) ?? "3A", jugador: inst.owner });
    enviarAlCementerio(s, ctx, id);
    ctx.emit({ type: "carta_entrada_a_zona", cardInstanceId: id, zona: "2G", jugador: inst.owner, bocaArriba: true });
    return;
  }
}
function resolverRespuesta(s, ctx, id, datos) {
  const inst = s.instances[id];
  const meta = inst?.cardId ? getCardMeta(inst.cardId) : null;
  if (!inst || !meta) return;
  const p = s.players[inst.owner];
  if (esArtefactoEquipable(meta) && !inst.equipadoA) {
    sinReceptor(s, ctx, id);
    return;
  }
  const enCampo = p.campo.campeones.includes(id) || p.campo.misticasTacticas.includes(id) || p.campo.arcanasCombate.includes(id);
  const origen = datos?.origen ?? (enCampo ? "campo" : "mano");
  const objetivos = datos?.objetivos;
  const jugador = datos?.jugador ?? inst.owner;
  const opciones = { jugador, fromTrigger: true, sinEleccion: true, revalidarObjetivo: true };
  const hechizos = () => {
    for (const { efecto, efectoIdx } of hechizosDeRespuesta(s, id, origen)) {
      const objetivoId = objetivos?.[efectoIdx];
      interpretEffect(s, ctx, inst, efecto, { ...opciones, contextoUso: objetivoId ? "objetivo-elegido" : void 0, objetivoId });
    }
  };
  const trigger = () => dispararTrigger(s, ctx, "al-resolver-cadena", jugador, [id], { sinEleccion: true, revalidarObjetivo: true, objetivosElegidos: objetivos });
  if (esMistica(meta) && origen === "mano") {
    hechizos();
    trigger();
    if (esPermanenteEnMesa(meta)) return;
    if (p.exilio.includes(id)) return;
    enviarAlCementerio(s, ctx, id);
    ctx.emit({ type: "carta_entrada_a_zona", cardInstanceId: id, zona: "2G", jugador: inst.owner, bocaArriba: true });
    return;
  }
  if (esArcana(meta)) {
    hechizos();
    if (esPermanenteEnMesa(meta)) {
      trigger();
      return;
    }
    const idx = p.campo.arcanasCombate.indexOf(id);
    if (idx !== -1) {
      const zona = slotAZona("arcanasCombate", idx) ?? "3D";
      ctx.emit({ type: "carta_salida_de_zona", cardInstanceId: id, zona, jugador: inst.owner });
      enviarAlCementerio(s, ctx, id);
      ctx.emit({ type: "carta_entrada_a_zona", cardInstanceId: id, zona: "2G", jugador: inst.owner, bocaArriba: true });
    }
    trigger();
    return;
  }
  if (meta.type === "Campe\xF3n" && enCampo && !efectosNegados(s, id)) {
    for (const { efecto, efectoIdx } of hechizosDeRespuesta(s, id, origen)) {
      const objetivoId = objetivos?.[efectoIdx];
      interpretEffect(s, ctx, inst, efecto, { ...opciones, costoPagado: true, contextoUso: objetivoId ? "objetivo-elegido" : void 0, objetivoId });
    }
  }
  trigger();
}
function resolverPila(s, ctx) {
  const cadena = s.cadena;
  if (!cadena) return;
  enResolucion(s, () => {
    const pasos = ordenResolucion(cadena);
    for (const [i, paso] of pasos.entries()) {
      s.pasoResolviendo = i;
      if ("trigger" in paso) {
        resolverTrigger(s, ctx, paso.trigger);
        continue;
      }
      const id = paso.respuesta;
      if (!cadena.pila.includes(id)) continue;
      resolverRespuesta(s, ctx, id, cadena.respuestas?.[id]);
    }
    s.pasoResolviendo = pasos.length;
    if (cadena.opener) resolverOpener(s, ctx, cadena.opener);
  });
  delete s.pasoResolviendo;
  s.cadena = void 0;
}
function hechizosDelOpener(s, cardInstanceId) {
  const inst = s.instances[cardInstanceId];
  const meta = inst?.cardId ? getCardMeta(inst.cardId) : null;
  const res = [];
  if (!inst || !meta || !("efectos" in meta) || !meta.efectos) return { inst, meta, hechizos: res };
  meta.efectos.forEach((efecto, efectoIdx) => {
    if (efecto.tipo === "hechizo" && !efecto.trigger && efecto.efecto) res.push({ efecto, efectoIdx });
  });
  return { inst, meta, hechizos: res };
}
function marcarInicioAccion(s) {
  return new Set(s.objetivosPendientes ?? []);
}
function reclamarPendientes(s, previos) {
  const cola = s.objetivosPendientes ?? [];
  const nuevos = cola.filter((pp) => !previos.has(pp));
  if (nuevos.length === 0) return 0;
  s.objetivosPendientes = [...nuevos, ...cola.filter((pp) => previos.has(pp))];
  return nuevos.length;
}
function declararVentana(s, ctx, declaracion, previos) {
  const pendientes = reclamarPendientes(s, previos);
  if (pendientes > 0) {
    s.declaracionEnEleccion = { ...declaracion, pendientes };
    return;
  }
  abrirVentana(s, ctx, declaracion);
}
function continuarDeclaracion(s, ctx, previos) {
  const declaracion = s.declaracionEnEleccion;
  if (!declaracion) return;
  declaracion.pendientes += reclamarPendientes(s, previos) - 1;
  if (declaracion.pendientes > 0) return;
  delete s.declaracionEnEleccion;
  if (s.fase === "terminada") return;
  abrirVentana(s, ctx, declaracion);
}
function abrirVentana(s, ctx, declaracion) {
  const triggers = declaracion.triggers;
  if (declaracion.tipo === "opener") {
    abrirOpener(s, ctx, declaracion.opener, triggers);
  } else if (declaracion.tipo === "ataque") {
    if (triggers && triggers.length > 0 && s.combate) {
      if (abrirCadena(s, rivalDe(s))) {
        asentarTriggers(s, triggers);
        return;
      }
      resolverTriggersInmediatos(s, ctx, triggers);
    }
    abrirVentanaAtaque(s, ctx);
  } else if (declaracion.tipo === "respuesta") {
    asentarRespuesta(s, ctx, declaracion.respuesta, triggers);
  } else if (declaracion.tipo === "triggers") {
    abrirVentanaTriggers(s, ctx, declaracion);
  } else {
    const id = declaracion.cardInstanceId;
    const cardId = s.instances[id]?.cardId;
    if (abrirCadenaGlobal(s, declaracion.jugador, { cardInstanceId: id, descripcion: (cardId ? getCardMeta(cardId)?.name : null) ?? id }, true)) {
      asentarTriggers(s, triggers);
    } else {
      resolverTriggersInmediatos(s, ctx, triggers);
    }
  }
}
function declararOpener(s, ctx, opener, previos = marcarInicioAccion(s), triggers) {
  if (opener.tipo !== "habilidad") {
    const { inst, hechizos } = hechizosDelOpener(s, opener.cardInstanceId);
    if (inst) {
      for (const { efecto, efectoIdx } of hechizos) {
        interpretEffect(s, ctx, inst, efecto, { jugador: opener.jugador, fromTrigger: true, declararOpener: { efectoIdx } });
      }
    }
  }
  const apilados = triggers && triggers.length > 0 ? armarTriggers(s, ctx, triggers) : void 0;
  declararVentana(s, ctx, { tipo: "opener", jugador: opener.jugador, opener, ...apilados && apilados.length > 0 ? { triggers: apilados } : {} }, previos);
}
function registrarObjetivoOpener(s, pendiente, objetivoId) {
  if (registrarObjetivoTrigger(s, pendiente, objetivoId)) return;
  const destino = s.declaracionEnEleccion?.opener ?? s.declaracionEnEleccion?.respuesta;
  if (!destino || !pendiente.opener) return;
  if (s.instances[objetivoId]) destino.objetivos = { ...destino.objetivos, [pendiente.opener.efectoIdx]: objetivoId };
}
function abrirOpener(s, ctx, opener, triggers) {
  const meta = s.instances[opener.cardInstanceId]?.cardId ? getCardMeta(s.instances[opener.cardInstanceId].cardId) : null;
  const abierto = abrirCadenaGlobal(
    s,
    opener.jugador,
    { cardInstanceId: opener.cardInstanceId, descripcion: meta?.name ?? opener.cardInstanceId },
    true
    // incluirMano: Místicas Presteza pagables del rival en mano también cuentan
  );
  if (abierto && s.cadena) {
    s.cadena.opener = opener;
    asentarTriggers(s, triggers);
    return;
  }
  resolverTriggersInmediatos(s, ctx, triggers);
  resolverOpener(s, ctx, opener);
}
function resolverOpener(s, ctx, opener) {
  const inst = s.instances[opener.cardInstanceId];
  const meta = metaDeInstancia(s, opener.cardInstanceId);
  if (!inst || !meta) return;
  const sinReceptorOpener = opener.tipo !== "habilidad" && esArtefactoEquipable(meta) && !inst.equipadoA;
  if (sinReceptorOpener) {
    sinReceptor(s, ctx, opener.cardInstanceId);
    return;
  }
  const habilidadNegada = opener.tipo === "habilidad" && efectosNegados(s, opener.cardInstanceId);
  if (!opener.negada && !habilidadNegada) {
    if (opener.tipo === "habilidad") {
      const efecto = "efectos" in meta ? meta.efectos?.[opener.efectoIdx ?? -1] : void 0;
      const objetivoId = opener.objetivos?.[opener.efectoIdx ?? -1];
      if (efecto) {
        interpretEffect(s, ctx, inst, efecto, {
          jugador: opener.jugador,
          contextoUso: objetivoId ? "objetivo-elegido" : void 0,
          objetivoId,
          costoPagado: true
          // activar_habilidad ya cobró el coste (Reserva → 1A / bloqueado): no se vuelve a exigir
        });
      }
    } else {
      for (const { efecto, efectoIdx } of hechizosDelOpener(s, opener.cardInstanceId).hechizos) {
        const objetivoId = opener.objetivos?.[efectoIdx];
        interpretEffect(s, ctx, inst, efecto, {
          jugador: opener.jugador,
          fromTrigger: true,
          contextoUso: objetivoId ? "objetivo-elegido" : void 0,
          objetivoId
        });
      }
    }
  }
  if (opener.tipo === "habilidad" || esPermanenteEnMesa(meta)) return;
  const slots = opener.tipo === "mistica" ? s.players[opener.jugador].campo.misticasTacticas : s.players[opener.jugador].campo.arcanasCombate;
  const slotIdx = slots.indexOf(opener.cardInstanceId);
  if (slotIdx === -1) return;
  const zonaSlot = slotAZona(opener.tipo === "mistica" ? "misticasTacticas" : "arcanasCombate", slotIdx) ?? (opener.tipo === "mistica" ? "3A" : "3D");
  ctx.emit({ type: "carta_salida_de_zona", cardInstanceId: opener.cardInstanceId, zona: zonaSlot, jugador: opener.jugador });
  enviarAlCementerio(s, ctx, opener.cardInstanceId);
  ctx.emit({ type: "carta_entrada_a_zona", cardInstanceId: opener.cardInstanceId, zona: "2G", jugador: opener.jugador, bocaArriba: true });
}

// src/online/game/triggers.ts
var TRIGGERS_APILABLES = ["al-invocar", "al-atacar", "al-jugar-mistica"];
var MAX_PROFUNDIDAD_TRIGGERS = 8;
function esTriggerApilable(trigger) {
  return TRIGGERS_APILABLES.includes(trigger);
}
function construirTriggers(s, trigger, jugador, ids, payload) {
  if (!esTriggerApilable(trigger)) return [];
  const datos = {};
  if (payload?.killerId) datos.killerId = payload.killerId;
  if (payload?.victimaId) datos.victimaId = payload.victimaId;
  if (payload?.contextoUso) datos.contextoUso = payload.contextoUso;
  return triggersQueMatchean(s, trigger, jugador, ids).map((m) => ({
    jugador,
    cardInstanceId: m.inst.cardInstanceId,
    trigger,
    efectoIdx: m.efectoIdx,
    ...Object.keys(datos).length > 0 ? { payload: { ...datos } } : {}
  }));
}
function ordenarTriggers(s, lista) {
  return [...lista.filter((t) => t.jugador === s.turno), ...lista.filter((t) => t.jugador !== s.turno)];
}
function matchDe(s, t, alResolver = false) {
  return triggersQueMatchean(s, t.trigger, t.jugador, [t.cardInstanceId], alResolver ? { evaluarCondicion: false } : void 0).find((m) => m.efectoIdx === t.efectoIdx);
}
function payloadBase(t) {
  return {
    jugador: t.jugador,
    fromTrigger: true,
    ...t.payload?.killerId ? { killerId: t.payload.killerId } : {},
    ...t.payload?.victimaId ? { victimaId: t.payload.victimaId } : {}
  };
}
function armarTriggers(s, ctx, lista) {
  const armados = [];
  for (const t of ordenarTriggers(s, lista)) {
    if (!esTriggerApilable(t.trigger)) continue;
    const inst = s.instances[t.cardInstanceId];
    const match = matchDe(s, t);
    if (!inst || !match) continue;
    ctx.emit({ type: "trigger_apilado", jugador: t.jugador, cardInstanceId: t.cardInstanceId, trigger: t.trigger, efectoIdx: t.efectoIdx });
    interpretEffect(s, ctx, inst, match.efecto, {
      ...payloadBase(t),
      cobrarCosto: false,
      declararOpener: { efectoIdx: t.efectoIdx },
      ...t.payload?.contextoUso ? { contextoUso: t.payload.contextoUso } : {}
    });
    armados.push({
      jugador: t.jugador,
      cardInstanceId: t.cardInstanceId,
      trigger: t.trigger,
      efectoIdx: t.efectoIdx,
      ...t.payload ? { payload: { ...t.payload } } : {}
    });
  }
  return armados;
}
function registrarObjetivoTrigger(s, pendiente, objetivoId) {
  const t = s.declaracionEnEleccion?.triggers?.find(
    (x) => x.objetivoId === void 0 && x.cardInstanceId === pendiente.instId && x.efectoIdx === pendiente.opener?.efectoIdx
  );
  if (!t) return false;
  if (s.instances[objetivoId]) t.objetivoId = objetivoId;
  return true;
}
function apilarTriggers(s, ctx, lista, previos = marcarInicioAccion(s)) {
  const validas = lista.filter((t) => esTriggerApilable(t.trigger) && !!s.instances[t.cardInstanceId]);
  if (validas.length === 0) return;
  if ((s.profundidadTriggers ?? 0) > 0) {
    resolverTriggersDeEfecto(s, ctx, validas);
    return;
  }
  const triggers = armarTriggers(s, ctx, validas);
  if (triggers.length === 0) return;
  declararVentana(s, ctx, { tipo: "triggers", jugador: s.turno, triggers }, previos);
}
function resolverTriggersDeEfecto(s, ctx, lista) {
  const validas = lista.filter((t) => esTriggerApilable(t.trigger) && !!s.instances[t.cardInstanceId]);
  if (validas.length === 0) return;
  const resolver = () => {
    for (const t of [...ordenarTriggers(s, validas)].reverse()) {
      ctx.emit({ type: "trigger_apilado", jugador: t.jugador, cardInstanceId: t.cardInstanceId, trigger: t.trigger, efectoIdx: t.efectoIdx });
      resolverTrigger(s, ctx, t, "inmediato");
    }
  };
  if ((s.profundidadTriggers ?? 0) > 0) resolver();
  else enResolucion(s, resolver);
}
function asentarTriggers(s, triggers) {
  const cadena = s.cadena;
  if (!cadena || !triggers || triggers.length === 0) return;
  const sobre = cadena.pila.length > 0 ? cadena.pila[cadena.pila.length - 1] : void 0;
  cadena.triggers = [...cadena.triggers ?? [], ...triggers.map((t) => sobre ? { ...t, sobre } : { ...t })];
  cadena.pasesConsecutivos = 0;
}
function resolverTriggersInmediatos(s, ctx, triggers) {
  for (const t of [...triggers ?? []].reverse()) resolverTrigger(s, ctx, t, "elegido");
}
function abrirVentanaTriggers(s, ctx, declaracion) {
  const triggers = declaracion.triggers ?? [];
  if (triggers.length === 0) return;
  if (s.cadena) {
    asentarTriggers(s, triggers);
    return;
  }
  const ultimo = triggers[triggers.length - 1];
  const cardId = s.instances[ultimo.cardInstanceId]?.cardId;
  const descripcion = (cardId ? getCardMeta(cardId)?.name : null) ?? ultimo.cardInstanceId;
  if (abrirCadenaGlobal(s, declaracion.jugador, { cardInstanceId: ultimo.cardInstanceId, descripcion }, true)) {
    asentarTriggers(s, triggers);
    return;
  }
  resolverTriggersInmediatos(s, ctx, triggers);
}
function ordenResolucion(cadena) {
  const triggers = cadena.triggers ?? [];
  const abajoArriba = triggers.filter((t) => !t.sobre || !cadena.pila.includes(t.sobre)).map((trigger) => ({ trigger }));
  for (const id of cadena.pila) {
    abajoArriba.push({ respuesta: id });
    for (const t of triggers) if (t.sobre === id) abajoArriba.push({ trigger: t });
  }
  return abajoArriba.reverse();
}
function enResolucion(s, fn) {
  s.profundidadTriggers = (s.profundidadTriggers ?? 0) + 1;
  try {
    fn();
  } finally {
    const n = (s.profundidadTriggers ?? 1) - 1;
    if (n <= 0) delete s.profundidadTriggers;
    else s.profundidadTriggers = n;
  }
}
function fuenteEnJuego(s, t) {
  const id = t.cardInstanceId;
  if (instanciasEnCampo(s, t.jugador).includes(id)) return true;
  const cadena = s.cadena;
  return !!cadena && cadena.pila.includes(id);
}
function resolverTrigger(s, ctx, t, modo = "elegido") {
  if (s.fase === "terminada") return;
  if ((s.profundidadTriggers ?? 0) >= MAX_PROFUNDIDAD_TRIGGERS) return;
  const inst = s.instances[t.cardInstanceId];
  if (!inst || !fuenteEnJuego(s, t)) return;
  const match = matchDe(s, t, true);
  if (!match) return;
  const { efecto } = match;
  const contextoUso = t.payload?.contextoUso;
  enResolucion(s, () => {
    if (modo === "inmediato") {
      interpretEffect(s, ctx, inst, efecto, { ...payloadBase(t), cobrarCosto: true, ...contextoUso ? { contextoUso } : {} });
      return;
    }
    if (t.objetivoId !== void 0) {
      if (!canExecuteEffect(s, efecto.efecto, t.jugador)) return;
      if (efecto.objetivo && efecto.objetivo.tipo !== "self") {
        if (!resolveTargets(s, objetivoCompleto(efecto), t.jugador, t.cardInstanceId).includes(t.objetivoId)) return;
      }
      if (efecto.costo && !cobrarCostoEter(s, ctx, inst, efecto.costo, t.jugador)) return;
      interpretEffect(s, ctx, inst, efecto, { ...payloadBase(t), sinEleccion: true, contextoUso: "objetivo-elegido", objetivoId: t.objetivoId });
      return;
    }
    interpretEffect(s, ctx, inst, efecto, { ...payloadBase(t), cobrarCosto: true, sinEleccion: true, ...contextoUso ? { contextoUso } : {} });
  });
}

// src/online/game/atributos.ts
function ultimoCambio(s, instId, atributo) {
  const lista = s.cambiosAtributo;
  if (!lista?.length) return void 0;
  for (let i = lista.length - 1; i >= 0; i--) {
    if (lista[i].instId === instId && lista[i].atributo === atributo) return lista[i];
  }
  return void 0;
}
function cambioDe(s, instId, atributo) {
  return ultimoCambio(s, instId, atributo)?.valor;
}
function metaDe(s, instId) {
  const cardId = s.instances[instId]?.cardId;
  return cardId ? getCardMeta(cardId) : null;
}
function esenciaDe(s, instId) {
  const cambio = cambioDe(s, instId, "esencia");
  if (cambio) return cambio;
  const meta = metaDe(s, instId);
  return meta && "esencia" in meta ? meta.esencia : void 0;
}
function rolesDe(s, instId) {
  const cambio = cambioDe(s, instId, "rol");
  if (cambio) return [cambio];
  const meta = metaDe(s, instId);
  return meta && "roles" in meta ? meta.roles : void 0;
}
function faccionesDe(s, instId) {
  const cambio = ultimoCambio(s, instId, "faccion");
  if (cambio) return cambio.valores ?? [cambio.valor];
  const meta = metaDe(s, instId);
  return meta && "facciones" in meta ? meta.facciones : void 0;
}

// src/online/game/scry.ts
function cartasVigentesScry(s, p) {
  const mazo = s.players[p.mazoDe].mazo;
  return p.cartas.filter((id) => mazo.includes(id));
}
function scryActual(s) {
  const frente = s.scryPendientes?.[0];
  return frente && cartasVigentesScry(s, frente).length > 0 ? frente : void 0;
}
function descartarScryMuertos(s) {
  while (s.scryPendientes && s.scryPendientes.length > 0 && cartasVigentesScry(s, s.scryPendientes[0]).length === 0) {
    s.scryPendientes = s.scryPendientes.slice(1);
  }
  if (s.scryPendientes?.length === 0) delete s.scryPendientes;
}
function iniciarScry(s, ctx, jugador, mazoDe, cantidad) {
  const cartas = s.players[mazoDe].mazo.slice(0, Math.max(0, cantidad));
  if (cartas.length === 0) return;
  s.scryPendientes = [...s.scryPendientes ?? [], { jugador, mazoDe, cartas }];
  ctx.emit({ type: "mazo_mirado", jugador, cantidad: cartas.length });
}
function validarOrdenarMazo(state, action) {
  const pendiente = scryActual(state);
  if (!pendiente) return "no hay un mazo por ordenar";
  if (action.jugador !== void 0 && action.jugador !== pendiente.jugador) return "el mazo lo ordena quien lo mira";
  const vigentes = cartasVigentesScry(state, pendiente);
  const enviadas = [...action.arriba, ...action.fondo];
  if (new Set(enviadas).size !== enviadas.length) return "cartas repetidas";
  if (enviadas.length !== vigentes.length || !vigentes.every((id) => enviadas.includes(id))) {
    return "debes ordenar exactamente las cartas que miraste";
  }
  return null;
}
function ejecutarOrdenarMazo(s, action, ctx) {
  const pendiente = scryActual(s);
  if (!pendiente) return;
  const miradas = new Set(action.arriba.concat(action.fondo));
  const p = s.players[pendiente.mazoDe];
  const resto = p.mazo.filter((id) => !miradas.has(id));
  p.mazo = [...action.arriba, ...resto, ...action.fondo];
  s.scryPendientes = s.scryPendientes.slice(1);
  if (s.scryPendientes.length === 0) delete s.scryPendientes;
  ctx.emit({ type: "mazo_ordenado", jugador: pendiente.jugador, arriba: action.arriba.length, fondo: action.fondo.length });
}

// src/online/game/redirect.ts
function esDeFuente(paso, id) {
  if (!paso) return false;
  return "respuesta" in paso ? paso.respuesta === id : paso.trigger.cardInstanceId === id;
}
function esCandidato(s, efecto, controlador, fuenteId, nuevo) {
  if (!efecto?.objetivo || efecto.objetivo.tipo === "self") return false;
  return resolveTargets(s, objetivoCompleto(efecto), controlador, fuenteId).includes(nuevo);
}
function redirigirObjetivos(s, objetivos, cardInstanceId, controlador, nuevo) {
  const cardId = s.instances[cardInstanceId]?.cardId;
  const meta = cardId ? getCardMeta(cardId) : null;
  const efectos = meta && "efectos" in meta ? meta.efectos : void 0;
  if (!objetivos || !efectos) return false;
  const indices = Object.keys(objetivos).map(Number).sort((a, b) => a - b);
  const idx = indices.find((i) => esCandidato(s, efectos[i], controlador, cardInstanceId, nuevo));
  if (idx === void 0) return false;
  objetivos[idx] = nuevo;
  return true;
}
function ejecutarRedirect(s, ctx, fuente, targetIds, jugador) {
  const nuevo = targetIds[0];
  const cadena = s.cadena;
  const i = s.pasoResolviendo;
  if (!nuevo || !s.instances[nuevo] || !cadena || i === void 0) return;
  const pasos = ordenResolucion(cadena);
  if (!esDeFuente(pasos[i], fuente.cardInstanceId)) return;
  const debajo = pasos[i + 1];
  const cartaDebajo = debajo ? "trigger" in debajo ? debajo.trigger.cardInstanceId : debajo.respuesta : cadena.opener?.cardInstanceId;
  const duenioDebajo = debajo ? "trigger" in debajo ? debajo.trigger.jugador : cadena.respuestas?.[debajo.respuesta]?.jugador ?? s.instances[debajo.respuesta]?.owner : cadena.opener?.jugador;
  if (cartaDebajo && duenioDebajo !== jugador && !reglaBool(s, "puedeSerNegada", { instId: cartaDebajo })) return;
  let entrada;
  let cambio = false;
  if (debajo && "trigger" in debajo) {
    const t = debajo.trigger;
    const cardId = s.instances[t.cardInstanceId]?.cardId;
    const meta = cardId ? getCardMeta(cardId) : null;
    const efecto = meta && "efectos" in meta ? meta.efectos?.[t.efectoIdx] : void 0;
    if (t.objetivoId !== void 0 && esCandidato(s, efecto, t.jugador, t.cardInstanceId, nuevo)) {
      t.objetivoId = nuevo;
      entrada = t.cardInstanceId;
      cambio = true;
    }
  } else if (debajo) {
    const datos = cadena.respuestas?.[debajo.respuesta];
    const controlador = datos?.jugador ?? s.instances[debajo.respuesta]?.owner;
    if (controlador && redirigirObjetivos(s, datos?.objetivos, debajo.respuesta, controlador, nuevo)) {
      entrada = debajo.respuesta;
      cambio = true;
    }
  } else if (cadena.opener && !cadena.opener.negada) {
    const o = cadena.opener;
    if (o.tipo === "habilidad") {
      const cardId = s.instances[o.cardInstanceId]?.cardId;
      const meta = cardId ? getCardMeta(cardId) : null;
      const efecto = meta && "efectos" in meta ? meta.efectos?.[o.efectoIdx ?? -1] : void 0;
      if (o.objetivos && o.efectoIdx !== void 0 && esCandidato(s, efecto, o.jugador, o.cardInstanceId, nuevo)) {
        o.objetivos[o.efectoIdx] = nuevo;
        entrada = o.cardInstanceId;
        cambio = true;
      }
    } else if (redirigirObjetivos(s, o.objetivos, o.cardInstanceId, o.jugador, nuevo)) {
      entrada = o.cardInstanceId;
      cambio = true;
    }
  }
  if (cambio && entrada) ctx.emit({ type: "objetivo_redirigido", jugador, cardInstanceId: entrada, objetivoId: nuevo });
}

// src/online/game/effectInterpreter.ts
function interpretEffect(s, ctx, inst, efectoData, payload) {
  const { efecto, objetivo, costo } = efectoData;
  const jugador = payload.jugador;
  if (payload.contextoUso === "objetivo-elegido" && payload.objetivoId) {
    if (!canExecuteEffect(s, efecto, jugador)) {
      return;
    }
    if (objetivo && objetivo.tipo !== "self") {
      if (!resolveTargets(s, objetivoCompleto(efectoData), jugador, inst.cardInstanceId).includes(payload.objetivoId)) return;
    }
    const targetIds2 = [payload.objetivoId];
    executeEffect(s, ctx, inst, efecto, targetIds2, jugador, efectoData);
    return;
  }
  if (!efectoData.trigger && efectoData.tipo !== "continuo" && costo && costo.tipo !== "ninguno" && !payload.costoPagado) {
    if (costo.tipo !== "eter_bloqueado" && costo.tipo !== "bloqueo_fijo") {
      if (!validateCost(s, jugador, costo, inst)) {
        return;
      }
    }
  }
  if (payload.cobrarCosto && costo && costo.tipo === "eter" && inst.cardId) {
    if (!cobrarCostoEter(s, ctx, inst, costo, jugador)) return;
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
    } else if (objetivo.tipo === "invocado") {
      targetIds = payload.contextoUso === "invocar" && payload.objetivoId && s.instances[payload.objetivoId] ? [payload.objetivoId] : [];
    } else {
      targetIds = resolveTargets(s, objetivoCompleto(efectoData), jugador, inst.cardInstanceId);
    }
  }
  const isTriggered = payload.fromTrigger === true;
  const autoResolver = efecto === "mover" && efectoData.esHasta === true;
  const mergedFiltros = efectoData.filtros ? { ...objetivo?.filtros, ...efectoData.filtros } : objetivo?.filtros;
  const hasAutoSelect = mergedFiltros?.seleccionar != null;
  const needsPending = isTriggered ? targetIds.length > 0 && !hasAutoSelect : targetIds.length > 1;
  if (needsPlayerChoice(objetivo, efecto, efectoData.tipoNegacion) && !autoResolver && needsPending) {
    if (!canExecuteEffect(s, efecto, jugador)) {
      return;
    }
    if (payload.sinEleccion) return;
    s.objetivosPendientes = [...s.objetivosPendientes ?? [], {
      jugador,
      instId: inst.cardInstanceId,
      trigger: toHyphenTrigger(efectoData.trigger) ?? umbralTrigger(efectoData) ?? "ninguno",
      opciones: targetIds,
      ...payload.declararOpener ? { opener: payload.declararOpener } : {}
    }];
    return;
  }
  if (payload.declararOpener) return;
  executeEffect(s, ctx, inst, efecto, targetIds, jugador, efectoData);
}
function cobrarCostoEter(s, ctx, inst, costo, jugador) {
  if (costo.tipo !== "eter" || !inst.cardId) return true;
  const cant = costo.cantidad ?? 1;
  const pCobro = s.players[jugador];
  if (pCobro.eterReserva.length < cant) return false;
  if (cant > 0) {
    const eterIdsCobro = pCobro.eterReserva.slice(0, cant);
    aplicarPago(s, ctx, jugador, eterIdsCobro, inst.cardId, { tipo: "habilidad", cardInstanceId: inst.cardInstanceId });
  }
  return true;
}
function objetivoCompleto(efectoData) {
  const objetivo = efectoData.objetivo;
  let mergedObjetivo = efectoData.filtros ? { ...objetivo, filtros: { ...objetivo.filtros, ...efectoData.filtros } } : objetivo;
  if (!mergedObjetivo.zona && efectoData.zonaOrigen) {
    mergedObjetivo = { ...mergedObjetivo, zona: efectoData.zonaOrigen };
  }
  return mergedObjetivo;
}
function needsPlayerChoice(objetivo, efecto, tipoNegacion) {
  if (!objetivo) return false;
  if (efecto === "negar" && tipoNegacion === "efecto_activo") return true;
  if (objetivo.tipo === "self" || objetivo.tipo === "todos_campeones_propios" || objetivo.tipo === "todos_campeones_rivales" || objetivo.tipo === "rival_hand" || objetivo.tipo === "equipped_champion" || objetivo.tipo === "invocado") {
    return false;
  }
  if (efecto === "draw" || efecto === "scry" || efecto === "rival_discard" || efecto === "block_ether" || efecto === "double_attack" || efecto === "negar") {
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
    "al_resolver_cadena": "al-resolver-cadena"
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
      if (esAuraEquipada(efectoData)) break;
      executeBuffDebuff(s, targetIds, stats, duracion, efectoData.buffPerBlockedEther, efecto, efectoData.duracionTurnos, jugador, efectoData.duracionFase, efectoData.duracionControlador);
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
    case "change_type":
      executeChangeType(s, targetIds, jugador, efectoData);
      break;
    case "redirect":
      ejecutarRedirect(s, ctx, inst, targetIds, jugador);
      break;
    case "scry":
      iniciarScry(s, ctx, jugador, objetivo?.controlador === "rival" ? jugador === "A" ? "B" : "A" : jugador, cantidad ?? 1);
      break;
    case "grant_keyword":
      executeGrantKeyword(s, targetIds, keyword, duracion, jugador, efectoData.duracionFase, efectoData.duracionControlador);
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
      executeReturnEther(s, ctx, targetIds, objetivo?.zonaDestino, cantidad, jugador, objetivo?.controladorDestino);
      break;
    case "mover":
      executeMover(s, ctx, cantidad ? targetIds.slice(0, cantidad) : targetIds, objetivo?.zonaDestino, jugador, objetivo?.controladorDestino);
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
    case "invocar":
    case "recuperar_campo":
    case "recuperar_mano":
    case "recuperar_mazo":
    case "recuperar_mazo_barajar":
    case "recuperar_mazo_top":
    case "recuperar_mazo_bottom":
    case "recuperar_exilio":
      executeRecuperar(s, ctx, efecto, targetIds, jugador, efectoData);
      break;
    case "block_ether":
      crearOpcionBloqueo(s, jugador, inst.cardInstanceId);
      break;
    case "double_attack":
      break;
    case "modificar_regla":
    case "direct_attack":
      executeModificarRegla(s, targetIds, jugador, efectoData);
      break;
    case "negar": {
      if (efectoData.tipoNegacion === "efecto_activo") {
        executeNegarEfectosActivos(s, ctx, inst, targetIds, jugador, efectoData);
        break;
      }
      const cadenaNeg = cadenaActiva(s);
      const pend = cadenaNeg?.opener;
      if (pend && !pend.negada && pend.jugador !== jugador && reglaBool(s, "puedeSerNegada", { instId: pend.cardInstanceId })) {
        pend.negada = true;
        ctx.emit({ type: "activacion_negada", jugador, cardInstanceId: pend.cardInstanceId, fuente: inst.cardInstanceId });
      }
      break;
    }
    case "copy":
      if (targetIds.length > 0) {
        const tMeta = s.instances[targetIds[0]]?.cardId ? getCardMeta(s.instances[targetIds[0]].cardId) : null;
        if (tMeta && esCampeon(tMeta)) {
          executeCopiaCampeon(s, inst, targetIds[0], jugador, efectoData);
        } else {
          inst.copyTargetId = targetIds[0];
        }
      }
      break;
  }
}
function executeInvocarEquipar(s, ctx, inst, targetIds, jugador) {
  if (targetIds.length === 0) return;
  const objetivoId = targetIds[0];
  if (!invocarAlCampo(s, ctx, jugador, objetivoId)) return;
  inst.equipadoA = objetivoId;
  inst.vinculadoA = [...inst.vinculadoA ?? [], objetivoId];
  dispararAlInvocar(s, ctx, jugador, objetivoId);
}
function dispararAlInvocar(s, ctx, jugador, campeonId) {
  const triggers = construirTriggers(s, "al-invocar", jugador, [campeonId]);
  if (triggers.length === 0) {
    dispararTrigger(s, ctx, "al-invocar", jugador, [campeonId]);
    return;
  }
  resolverTriggersDeEfecto(s, ctx, triggers);
}
function invocarAlCampo(s, ctx, jugador, campeonId) {
  const campo = s.players[jugador].campo;
  const slotLibre = campo.campeones.indexOf(null);
  if (slotLibre === -1) return false;
  const inst = s.instances[campeonId];
  if (!inst) return false;
  const p = s.players[inst.owner];
  for (const arr of [p.cementerio, p.exilio, p.mano, p.mazo]) {
    const idx = arr.indexOf(campeonId);
    if (idx !== -1) {
      arr.splice(idx, 1);
      campo.campeones[slotLibre] = campeonId;
      reiniciarCampeon(s, campeonId);
      inst.entradaEsteTurno = true;
      ctx.emit({ type: "carta_invocada", cardInstanceId: campeonId, tipo: "Campe\xF3n", slot: slotLibre });
      return true;
    }
  }
  return false;
}
function destinoDeRecuperar(efecto, efectoData) {
  switch (efecto) {
    case "recuperar_mano":
      return { zona: "mano" };
    case "recuperar_mazo":
      return { zona: "mazo", posicion: "fondo" };
    case "recuperar_mazo_bottom":
      return { zona: "mazo", posicion: "fondo" };
    case "recuperar_mazo_top":
      return { zona: "mazo", posicion: "tope" };
    case "recuperar_mazo_barajar":
      return { zona: "mazo", posicion: "barajar" };
    case "recuperar_campo":
    case "invocar":
      return { zona: "campo" };
    default: {
      const z = efectoData.objetivo?.zonaDestino;
      if (z === "campo" || z === "cementerio") return { zona: z };
      if (z === "mazo") return { zona: "mazo", posicion: "fondo" };
      return { zona: "mano" };
    }
  }
}
function sacarDeSuZona(s, id) {
  for (const j of ["A", "B"]) {
    const p = s.players[j];
    const zonas = [
      { zona: "mano", arr: p.mano },
      { zona: "mazo", arr: p.mazo },
      { zona: "cementerio", arr: p.cementerio },
      { zona: "exilio", arr: p.exilio }
    ];
    for (const { zona, arr } of zonas) {
      const i = arr.indexOf(id);
      if (i !== -1) {
        arr.splice(i, 1);
        return { zona };
      }
    }
    for (const grupo of ["campeones", "misticasTacticas", "arcanasCombate"]) {
      const i = p.campo[grupo].indexOf(id);
      if (i !== -1) {
        p.campo[grupo][i] = null;
        return { zona: "campo" };
      }
    }
  }
  return null;
}
function executeRecuperar(s, ctx, efecto, targetIds, jugador, efectoData) {
  const destino = destinoDeRecuperar(efecto, efectoData);
  for (const id of targetIds) {
    const inst = s.instances[id];
    if (!inst) continue;
    if (destino.zona === "campo") {
      const meta = inst.cardId ? getCardMeta(inst.cardId) : null;
      if (meta && esCampeon(meta) && invocarAlCampo(s, ctx, jugador, id)) dispararAlInvocar(s, ctx, jugador, id);
      continue;
    }
    const origen = sacarDeSuZona(s, id);
    if (!origen) continue;
    if (origen.zona === "campo") {
      liberarEterBloqueado(s, ctx, id, "1A");
      liberarArtefactosEquipados(s, ctx, id);
    }
    const dueno = jugadorDestino(efectoData.objetivo?.controladorDestino, jugador, inst);
    const p = s.players[dueno];
    if (destino.zona === "mano") {
      p.mano.push(id);
      ctx.emit({ type: "carta_devuelta_a_mano", cardInstanceId: id, jugador: dueno });
    } else if (destino.zona === "cementerio") {
      enviarAlCementerio(s, ctx, id);
    } else {
      if (destino.posicion === "tope") p.mazo.unshift(id);
      else p.mazo.push(id);
      if (destino.posicion === "barajar") p.mazo = shuffleFisherYates(ctx, p.mazo);
      ctx.emit({ type: "carta_entrada_a_zona", cardInstanceId: id, zona: "3G", jugador: dueno, bocaArriba: false });
    }
  }
}
function dispararUmbralBloqueo(s, ctx, targetInstanceId, activacionIdx) {
  const inst = s.instances[targetInstanceId];
  if (!inst?.cardId) return;
  const meta = getCardMeta(inst.cardId);
  if (!meta || !("efectos" in meta) || !meta.efectos) return;
  if (efectosNegados(s, targetInstanceId)) return;
  const bloqueadosEn = (idxEfecto, efecto) => contarEterUmbral(s, targetInstanceId, idxEfecto, efecto);
  for (const [idxEfecto, efecto] of meta.efectos.entries()) {
    if (efecto.tramos && efecto.tramos.length > 0) {
      if (efecto.costo?.tipo !== "eter_bloqueado") continue;
      const bloqueados = bloqueadosEn(idxEfecto, efecto);
      const nuevosPendientes = [];
      for (const tramo of [...efecto.tramos].sort((a, b) => a.umbral - b.umbral)) {
        if (bloqueados < tramo.umbral) continue;
        if (inst.tramosDisparados?.includes(tramo.umbral)) continue;
        if (!efecto.objetivo) continue;
        const objetivoTramo = {
          ...efecto.objetivo,
          filtros: { ...efecto.objetivo.filtros, ...tramo.filtros }
        };
        const opciones = resolveTargets(s, objetivoTramo, inst.owner);
        if (opciones.length === 0) continue;
        inst.tramosDisparados = [...inst.tramosDisparados ?? [], tramo.umbral];
        ctx.emit({ type: "tramo_disparado", jugador: inst.owner, fuenteId: inst.cardInstanceId, umbral: tramo.umbral, efecto: tramo.efecto });
        nuevosPendientes.push({
          jugador: inst.owner,
          instId: inst.cardInstanceId,
          trigger: "al-bloquear-eter",
          opciones,
          tramoUmbral: tramo.umbral
        });
      }
      if (nuevosPendientes.length > 0) {
        s.objetivosPendientes = [...nuevosPendientes, ...s.objetivosPendientes ?? []];
      }
      continue;
    }
    if (efecto.costo?.tipo !== "eter_bloqueado" && efecto.costo?.tipo !== "bloqueo_fijo") continue;
    const fijo = efecto.costo?.tipo === "bloqueo_fijo";
    if (fijo && idxEfecto !== activacionIdx) continue;
    const conSuCamino = efecto.efecto === "steal_champion" || efecto.efecto === "invocar_y_equipar";
    if (!conSuCamino) {
      if (efecto.tipo !== "continuo" || claseDeContinuo(efecto) === "propio") continue;
      if (!fijo && bloqueadosEn(idxEfecto, efecto) < umbralDeBloqueo(efecto)) continue;
      if (!fijo && inst.efectosUmbralDisparados?.includes(idxEfecto)) continue;
      armarContinuoDeBloqueo(s, ctx, inst, efecto, idxEfecto, fijo);
      continue;
    }
    const umbral = efecto.costo?.cantidad;
    if (!umbral) continue;
    if (!fijo && bloqueadosEn(idxEfecto, efecto) < umbral) continue;
    if (!fijo && inst.efectoUmbralDisparado) continue;
    if (efecto.efecto === "steal_champion") {
      const yaRobo = Object.values(s.instances).some((i) => i.stolenBy === inst.cardInstanceId);
      if (!fijo && yaRobo) continue;
      if (!canExecuteSteal(s, inst.owner)) continue;
      if (!fijo) inst.efectoUmbralDisparado = true;
      const pendientesAntes = s.objetivosPendientes?.length ?? 0;
      interpretEffect(s, ctx, inst, efecto, { jugador: inst.owner, fromTrigger: true });
      const pendientesDespues = s.objetivosPendientes?.length ?? 0;
      if (pendientesDespues > pendientesAntes && s.objetivosPendientes) {
        const nuevo = s.objetivosPendientes.pop();
        s.objetivosPendientes.unshift(nuevo);
      }
      continue;
    }
    if (efecto.efecto !== "invocar_y_equipar") continue;
    if (!fijo) inst.efectoUmbralDisparado = true;
    ejecutarInvocarEquiparUmbral(s, ctx, inst, efecto, inst.owner);
  }
}
function armarContinuoDeBloqueo(s, ctx, inst, efecto, idxEfecto, fijo = false) {
  const clase = claseDeContinuo(efecto);
  if (clase === "sostenido" && efecto.efecto !== "fix_exhaust" && !eligeObjetivo(efecto)) return;
  const marcar = () => {
    if (!fijo) inst.efectosUmbralDisparados = [...inst.efectosUmbralDisparados ?? [], idxEfecto];
  };
  if (clase === "sostenido" || eligeObjetivo(efecto)) {
    const opciones = efecto.objetivo ? resolveTargets(s, objetivoCompleto(efecto), inst.owner, inst.cardInstanceId) : [];
    if (opciones.length === 0) return;
    marcar();
    s.objetivosPendientes = [
      { jugador: inst.owner, instId: inst.cardInstanceId, trigger: "al-bloquear-eter", opciones, efectoUmbralIdx: idxEfecto },
      ...s.objetivosPendientes ?? []
    ];
    return;
  }
  marcar();
  interpretEffect(s, ctx, inst, efecto, { jugador: inst.owner, fromTrigger: true, costoPagado: true });
}
function resolverUmbralElegido(s, ctx, fuenteId, efectoIdx, objetivoId) {
  const inst = s.instances[fuenteId];
  const meta = inst?.cardId ? getCardMeta(inst.cardId) : null;
  const efecto = meta && "efectos" in meta ? meta.efectos?.[efectoIdx] : void 0;
  if (!inst || !efecto) return;
  if (efectosNegados(s, fuenteId)) return;
  if (contarEterUmbral(s, fuenteId, efectoIdx, efecto) < umbralDeBloqueo(efecto)) return;
  if (claseDeContinuo(efecto) === "sostenido") {
    if (efecto.efecto === "fix_exhaust") {
      inst.fijadoExhaustTargetId = objetivoId;
      ctx.emit({ type: "exhaust_fijado", jugador: inst.owner, campeonId: objetivoId, fuenteId });
      return;
    }
    inst.sostenidos = [...inst.sostenidos ?? [], { efectoIdx, objetivoId }];
    return;
  }
  interpretEffect(s, ctx, inst, efecto, { jugador: inst.owner, contextoUso: "objetivo-elegido", objetivoId, costoPagado: true });
}
function canExecuteSteal(s, jugador) {
  return s.players[jugador].campo.campeones.includes(null);
}
function ejecutarTramo(s, ctx, fuenteId, umbral, objetivoId) {
  const inst = s.instances[fuenteId];
  if (!inst?.cardId) return;
  const meta = getCardMeta(inst.cardId);
  if (!meta || !("efectos" in meta) || !meta.efectos) return;
  const efectoRaiz = meta.efectos.find((e) => e.tramos?.some((t) => t.umbral === umbral));
  const tramo = efectoRaiz?.tramos?.find((t) => t.umbral === umbral);
  if (!efectoRaiz || !tramo) return;
  if (tramo.efecto === "fix_exhaust") {
    inst.fijadoExhaustTargetId = objetivoId;
    ctx.emit({ type: "exhaust_fijado", jugador: inst.owner, campeonId: objetivoId, fuenteId: inst.cardInstanceId });
    return;
  }
  const efectoTramo = {
    ...efectoRaiz,
    efecto: tramo.efecto,
    stats: tramo.stats ?? efectoRaiz.stats,
    keyword: tramo.keyword,
    cantidad: tramo.cantidad,
    duracion: tramo.duracion ?? efectoRaiz.duracion,
    duracionTurnos: tramo.duracionTurnos,
    costo: void 0,
    // el costo lo declara el raíz — ya pagado con el bloqueo
    trigger: void 0,
    tramos: void 0,
    objetivo: {
      ...efectoRaiz.objetivo,
      filtros: { ...efectoRaiz.objetivo?.filtros, ...tramo.filtros }
    }
  };
  interpretEffect(s, ctx, inst, efectoTramo, {
    jugador: inst.owner,
    contextoUso: "objetivo-elegido",
    objetivoId
  });
}
function exhaustFijado(s, champId) {
  for (const jugador of ["A", "B"]) {
    const campo = [
      ...s.players[jugador].campo.campeones,
      ...s.players[jugador].campo.misticasTacticas,
      ...s.players[jugador].campo.arcanasCombate
    ];
    for (const id of campo) {
      if (!id) continue;
      const fuente = s.instances[id];
      if (fuente?.fijadoExhaustTargetId !== champId) continue;
      if (!fuente.cardId) continue;
      const meta = getCardMeta(fuente.cardId);
      if (!meta || !("efectos" in meta) || !meta.efectos) continue;
      const efecto = meta.efectos.find((e) => e.tramos?.some((t) => t.efecto === "fix_exhaust"));
      const tramo = efecto?.tramos?.find((t) => t.efecto === "fix_exhaust");
      if (!tramo) {
        const idxRaiz = meta.efectos.findIndex((e) => e.efecto === "fix_exhaust" && !e.tramos?.length);
        if (idxRaiz !== -1 && !efectosNegados(s, id) && contarEterUmbral(s, id, idxRaiz, meta.efectos[idxRaiz]) >= umbralDeBloqueo(meta.efectos[idxRaiz])) return true;
        continue;
      }
      if ((fuente.eterBloqueado?.length ?? 0) >= tramo.umbral) return true;
    }
  }
  return false;
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
    const idxReagrupar = meta.efectos.findIndex(
      (e) => e.reagrupar?.fase === "alba" && e.reagrupar?.turno === "propio" && (e.costo?.tipo === "bloqueo_fijo" || e.costo?.tipo === "eter_bloqueado")
    );
    if (idxReagrupar === -1) continue;
    const eteres = eterDeEfecto(s, id, idxReagrupar);
    if (eteres.length === 0) continue;
    quitarEteres(s, id, eteres);
    const grupos = liberarEterA(s, eteres, "2A", jugador);
    for (const [pagador, ids] of Object.entries(grupos)) {
      ctx.emit({ type: "eter_reagrupado", jugador: pagador, eterIds: ids });
    }
    limpiarFlagsUmbralSiVacia(s, id);
    evaluarFinSteal(s, ctx, id);
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
      inst.vinculadoA = [...inst.vinculadoA ?? [], id];
      dispararAlInvocar(s, ctx, jugador, id);
    }
    break;
  }
}
function executeTutor(s, ctx, targetIds, jugador, efectoData) {
  const zonaOrigen = efectoData.objetivo?.zona ?? efectoData.zonaOrigen ?? "mazo";
  const zonaDestino = efectoData.objetivo?.zonaDestino ?? "mano";
  const p = s.players[jugador];
  if (zonaDestino === "campo" && p.campo.campeones.indexOf(null) === -1) return;
  if (zonaDestino !== "mano" && zonaDestino !== "campo" && zonaDestino !== "cementerio" && zonaDestino !== "exilio" && zonaDestino !== "mazo") return;
  for (const targetId of targetIds) {
    if (zonaDestino === "exilio" && !permitirExilio(s, ctx, targetId)) continue;
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
        const instT = s.instances[targetId];
        const metaT = instT?.cardId ? getCardMeta(instT.cardId) : null;
        if (instT) {
          reiniciarCampeon(s, targetId);
          instT.entradaEsteTurno = true;
        }
        ctx.emit({ type: "carta_invocada", cardInstanceId: targetId, tipo: "Campe\xF3n", slot: slotLibre });
        if (metaT && esCampeon(metaT)) dispararAlInvocar(s, ctx, jugador, targetId);
      }
    } else if (zonaDestino === "cementerio") {
      enviarAlCementerio(s, ctx, targetId);
      ctx.emit({ type: "carta_entrada_a_zona", cardInstanceId: targetId, zona: "2G", jugador, bocaArriba: true });
    } else if (zonaDestino === "exilio") {
      p.exilio.push(targetId);
      ctx.emit({ type: "carta_exiliada", cardInstanceId: targetId, jugador });
    } else if (zonaDestino === "mazo") {
      p.mazo.push(targetId);
      ctx.emit({ type: "carta_entrada_a_zona", cardInstanceId: targetId, zona: "3G", jugador, bocaArriba: false });
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
      return esExiliable(s, inst.cardInstanceId);
    case "cemetery_self":
      return true;
    default:
      return true;
  }
}
function duracionTemporal(efectoData, jugador) {
  const { duracion, duracionTurnos, duracionFase, duracionControlador } = efectoData;
  const expira = duracion === void 0 || duracion === "permanente" || duracion === "mientras_en_campo" || duracion === "mientras_ester_bloqueado" || duracion === "mientras_equipped" ? "permanente" : duracion === "hasta_fase" ? "hasta-fase" : "ocaso";
  return {
    duenio: jugador,
    expira,
    ...duracion === "n_turnos" ? { turnosRestantes: duracionTurnos } : {},
    ...expira === "hasta-fase" && duracionFase ? { expiraFase: duracionFase, expiraFaseJugador: duracionControlador === "rival" ? jugador === "A" ? "B" : "A" : jugador } : {}
  };
}
function executeChangeType(s, targetIds, jugador, efectoData) {
  const cambio = efectoData.cambioTipo;
  if (!cambio) return;
  const duracion = duracionTemporal(efectoData, jugador);
  const atributos = [["esencia", cambio.esencia], ["rol", cambio.rol], ["faccion", cambio.faccion]];
  for (const instId of targetIds) {
    for (const [atributo, valor] of atributos) {
      if (valor) aplicarCambioAtributo(s, { instId, atributo, valor, ...duracion });
    }
  }
}
function executeModificarRegla(s, targetIds, jugador, efectoData) {
  const m = reglaDeEfecto(efectoData);
  if (!m) return;
  const def = REGLAS[m.id];
  const comunes = {
    regla: m.id,
    operacion: m.operacion,
    valor: m.valor,
    ...duracionTemporal(efectoData, jugador)
  };
  const rival = jugador === "A" ? "B" : "A";
  if (def.ambito === "partida") {
    aplicarReglaTemporal(s, { ...comunes, sujeto: { tipo: "partida" } });
  } else if (def.ambito === "jugador") {
    const c = efectoData.objetivo?.controlador ?? "propio";
    const afectados = c === "ambos" ? ["A", "B"] : c === "rival" ? [rival] : [jugador];
    for (const j of afectados) aplicarReglaTemporal(s, { ...comunes, sujeto: { tipo: "jugador", jugador: j } });
  } else {
    for (const instId of targetIds) aplicarReglaTemporal(s, { ...comunes, sujeto: { tipo: "carta", instId } });
  }
}
function cancelarEstadoEnCurso(s, ctx, instId, meta) {
  const inst = s.instances[instId];
  if (!inst) return;
  delete inst.fijadoExhaustTargetId;
  delete inst.sostenidos;
  delete inst.efectosUmbralDisparados;
  const roboContinuo = "efectos" in meta && !!meta.efectos?.some((e) => e.efecto === "steal_champion" && e.duracion === "mientras_ester_bloqueado");
  if (roboContinuo) {
    const ladron = s.players.A.campo.campeones.includes(instId) ? "A" : "B";
    retornarCampeonesRobados(s, ctx, instId, ladron);
  }
}
function executeNegarEfectosActivos(s, ctx, inst, targetIds, jugador, efectoData) {
  const duracion = duracionTemporal({ ...efectoData, duracion: efectoData.duracion ?? "turno" }, jugador);
  for (const instId of targetIds) {
    const objetivo = s.instances[instId];
    const meta = objetivo?.cardId ? getCardMeta(objetivo.cardId) : null;
    if (!objetivo || !meta || !esCampeon(meta)) continue;
    if (!reglaBool(s, "puedeSerNegada", { instId })) continue;
    aplicarReglaTemporal(s, { regla: "efectosActivos", operacion: "prohibir", ...duracion, sujeto: { tipo: "carta", instId } });
    cancelarEstadoEnCurso(s, ctx, instId, meta);
    ctx.emit({ type: "efectos_negados", jugador, cardInstanceId: instId, fuente: inst.cardInstanceId });
  }
}
function executeCopiaCampeon(s, inst, objetivoId, jugador, efectoData) {
  const objetivo = s.instances[objetivoId];
  const meta = objetivo?.cardId ? getCardMeta(objetivo.cardId) : null;
  if (!objetivo || !meta || !esCampeon(meta)) return;
  const atributos = efectoData.copyAttributes ?? [];
  const { duracion, duracionTurnos, duracionFase, duracionControlador } = efectoData;
  const propio = statsDe(s, inst.cardInstanceId);
  const stats = {
    ATQ: atributos.includes("atq") ? (objetivo.poder ?? meta.stats?.poder ?? 0) - propio.poder : 0,
    RES: atributos.includes("res") ? (objetivo.resistencia ?? meta.stats?.resistencia ?? 0) - propio.resistencia : 0
  };
  if (stats.ATQ !== 0 || stats.RES !== 0) {
    executeBuffDebuff(s, [inst.cardInstanceId], stats, duracion, void 0, "buff", duracionTurnos, jugador, duracionFase, duracionControlador);
  }
  if (atributos.includes("keyword")) {
    for (const keyword of keywordsDe(s, objetivoId)) {
      executeGrantKeyword(s, [inst.cardInstanceId], keyword, duracion, jugador, duracionFase, duracionControlador);
    }
  }
  if (atributos.includes("faccion")) {
    const facciones = faccionesDe(s, objetivoId);
    if (facciones && facciones.length > 0) {
      aplicarCambioAtributo(s, {
        instId: inst.cardInstanceId,
        atributo: "faccion",
        valor: facciones[0],
        ...facciones.length > 1 ? { valores: [...facciones] } : {},
        ...duracionTemporal(efectoData, jugador)
      });
    }
  }
  if (atributos.includes("efecto")) {
    const copiables = (meta.efectos ?? []).filter(esEfectoCopiable);
    if (copiables.length > 0) {
      aplicarEfectosPrestados(s, {
        instId: inst.cardInstanceId,
        origenId: objetivoId,
        efectos: structuredClone(copiables),
        ...duracionTemporal(efectoData, jugador)
      });
    }
  }
}
function executeBuffDebuff(s, targetIds, stats, duracion, buffPerBlockedEther, efecto, duracionTurnos, caster, duracionFase, duracionControlador) {
  if (!stats) return;
  const expira = duracion === "permanente" ? "permanente" : duracion === "mientras_en_campo" ? "permanente" : duracion === "mientras_ester_bloqueado" ? "permanente" : duracion === "mientras_equipped" ? "permanente" : duracion === "hasta_fase" ? "hasta-fase" : "ocaso";
  const hastaFase = expira === "hasta-fase" && duracionFase && caster ? { fase: duracionFase, jugador: duracionControlador === "rival" ? caster === "A" ? "B" : "A" : caster } : void 0;
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
      aplicarMod(s, targetId, "poder", atqDelta, expira, turnosRestantes, hastaFase);
    }
    if (resDelta !== 0) {
      aplicarMod(s, targetId, "resistencia", resDelta, expira, turnosRestantes, hastaFase);
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
    if (!permitirExilio(s, ctx, targetId)) continue;
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
      liberarArtefactosEquipados(s, ctx, targetId);
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
    if (s.cadena?.pila.includes(targetId)) {
      p.exilio.push(targetId);
      ctx.emit({ type: "carta_exiliada", cardInstanceId: targetId, jugador: owner });
    }
  }
}
function executeDraw(s, ctx, jugador, cantidad) {
  for (let i = 0; i < cantidad; i++) {
    if (s.fase === "terminada") return;
    if (!robarCarta(s, ctx, jugador)) return;
  }
}
function executeGrantKeyword(s, targetIds, keyword, duracion, caster, duracionFase, duracionControlador) {
  if (!keyword) return;
  const hastaFase = duracion === "hasta_fase" && duracionFase && caster ? { fase: duracionFase, jugador: duracionControlador === "rival" ? caster === "A" ? "B" : "A" : caster } : void 0;
  for (const targetId of targetIds) {
    if (hastaFase) {
      const inst = s.instances[targetId];
      if (inst) {
        inst.keywordsHastaFase = [...inst.keywordsHastaFase ?? [], { keyword, ...hastaFase }];
      }
    } else {
      const temporal = duracion !== "permanente";
      otorgarKeyword(s, targetId, keyword, temporal);
    }
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
    liberarArtefactosEquipados(s, ctx, targetId);
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
    if (targetInst.eterBloqueado && targetInst.eterBloqueado.length > 0) {
      const eteres = [...targetInst.eterBloqueado];
      delete targetInst.eterBloqueado;
      delete targetInst.efectoUmbralDisparado;
      delete targetInst.copyOneShotDisparado;
      delete targetInst.tramosDisparados;
      delete targetInst.fijadoExhaustTargetId;
      delete targetInst.sostenidos;
      delete targetInst.efectosUmbralDisparados;
      const grupos = liberarEterA(s, eteres, "2A", targetInst.owner);
      for (const [pagador, ids] of Object.entries(grupos)) {
        ctx.emit({ type: "eter_reagrupado", jugador: pagador, eterIds: ids });
      }
    }
    rivalCampo[idx] = null;
    const playerCampo = s.players[jugador].campo.campeones;
    const slotLibre = playerCampo.indexOf(null);
    if (slotLibre === -1) {
      rivalCampo[idx] = targetId;
      continue;
    }
    playerCampo[slotLibre] = targetId;
    targetInst.stolenBy = inst.cardInstanceId;
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
  for (const j of [owner, owner === "A" ? "B" : "A"]) {
    const p = s.players[j];
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
  }
  return false;
}
function jugadorDestino(controladorDestino, jugador, inst) {
  if (controladorDestino === "propio") return jugador;
  if (controladorDestino === "rival") return jugador === "A" ? "B" : "A";
  return inst.owner;
}
function executeReturnEther(s, ctx, targetIds, zonaDestino, cantidad, jugador, controladorDestino) {
  if (!esDestinoEter(zonaDestino)) return;
  const limit = cantidad ?? targetIds.length;
  let count = 0;
  for (const targetId of targetIds) {
    if (count >= limit) break;
    const inst = s.instances[targetId];
    if (!inst) continue;
    if (zonaDestino === "exilio" && !permitirExilio(s, ctx, targetId)) continue;
    const owner = inst.owner;
    const destino = jugador !== void 0 ? jugadorDestino(controladorDestino, jugador, inst) : owner;
    const removed = removeEterFromCurrentZone(s, targetId, owner);
    if (!removed) continue;
    count++;
    moverEterADestino(s, ctx, targetId, destino, zonaDestino);
  }
}
function esDestinoEter(zonaDestino) {
  return zonaDestino === "reserva" || zonaDestino === "pagado" || zonaDestino === "mano" || zonaDestino === "cementerio" || zonaDestino === "exilio";
}
function moverEterADestino(s, ctx, eterId, owner, destino) {
  const p = s.players[owner];
  if (destino === "reserva") {
    p.eterReserva.push(eterId);
    ctx.emit({ type: "eter_movido", cardInstanceId: eterId, destino: "reserva", jugador: owner });
  } else if (destino === "pagado") {
    p.eterPagado.push(eterId);
    ctx.emit({ type: "eter_movido", cardInstanceId: eterId, destino: "pagado", jugador: owner });
  } else if (destino === "mano") {
    p.mano.push(eterId);
    ctx.emit({ type: "eter_movido", cardInstanceId: eterId, destino: "mano", jugador: owner });
  } else if (destino === "cementerio") {
    p.cementerio.push(eterId);
    ctx.emit({ type: "eter_movido", cardInstanceId: eterId, destino: "cementerio", jugador: owner });
  } else if (destino === "exilio") {
    p.exilio.push(eterId);
    ctx.emit({ type: "eter_movido", cardInstanceId: eterId, destino: "exilio", jugador: owner });
  }
}
function executeMover(s, ctx, targetIds, zonaDestino, jugador, controladorDestino) {
  if (!esDestinoEter(zonaDestino)) return;
  for (const targetId of targetIds) {
    const inst = s.instances[targetId];
    if (!inst) continue;
    const owner = inst.owner;
    const destino = jugador !== void 0 ? jugadorDestino(controladorDestino, jugador, inst) : owner;
    const removed = removeEterFromCurrentZone(s, targetId, owner);
    if (!removed) continue;
    moverEterADestino(s, ctx, targetId, destino, zonaDestino);
  }
}
function executeToggleExhaust(s, targetIds) {
  for (const targetId of targetIds) {
    const inst = s.instances[targetId];
    if (!inst) continue;
    if (exhaustFijado(s, targetId)) continue;
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
    enviarAlCementerio(s, ctx, cardId, "mano");
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

// src/online/game/habilidades.ts
function validarActivarArcana(state, action) {
  if (state.fase !== "forja" && state.fase !== "choque" && state.fase !== "ocaso") {
    return "activar_arcana solo en Forja/Choque/Ocaso (\xA78.3a: nunca en Alba)";
  }
  const inst = state.instances[action.cardInstanceId];
  if (!inst) return "instancia no encontrada";
  const meta = inst.cardId ? getCardMeta(inst.cardId) : null;
  if (!meta) return "carta desconocida";
  const p = state.players[state.turno];
  const motivo = motivoArcanaNoActivable(state, state.turno, action.cardInstanceId);
  if (motivo) return motivo;
  const idx = p.campo.arcanasCombate.indexOf(action.cardInstanceId);
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
  const meta = metaDeInstancia(state, action.cardInstanceId);
  if (!meta) return "carta desconocida";
  if (efectosNegados(state, action.cardInstanceId)) return "los efectos de esta carta est\xE1n negados";
  const efectoSel = efectoActivableDe(meta, !!action.objetivoId);
  if (!efectoSel) {
    return "esta carta se activa bloqueando \xC9ter (usa la acci\xF3n bloquear_eter)";
  }
  const esBloqueado = esCostoBloqueo(efectoSel.costo);
  if (esBloqueado) {
    if (inst.opcionUsadaEsteTurno) return "ya usaste esta habilidad este turno";
    const costoEsperado = efectoSel.costo?.cantidad ?? 0;
    if (costoEsperado > 0 && action.eterIds.length !== costoEsperado) {
      return `${meta.name} requiere exactamente ${costoEsperado} \xC9ter(es), indicaste ${action.eterIds.length}`;
    }
    if (action.eterIds.length === 0) return "no indicaste \xC9teres para bloquear";
    if (new Set(action.eterIds).size !== action.eterIds.length) return "\xE9teres repetidos";
    const zonaOrigen = efectoSel.costo?.origen === "pagado" ? p.eterPagado : p.eterReserva;
    for (const eterId of action.eterIds) {
      if (!zonaOrigen.includes(eterId)) {
        return efectoSel.costo?.origen === "pagado" ? `el \xC9ter ${eterId} no est\xE1 en tu \xC9ter Pagado (1A)` : `el \xC9ter ${eterId} no est\xE1 en tu Reserva`;
      }
      const eterInst = state.instances[eterId];
      const eterMeta = eterInst?.cardId ? getCardMeta(eterInst.cardId) : null;
      if (!eterMeta) return `\xC9ter desconocido: ${eterId}`;
    }
  } else {
    if (inst.agotado) return "la carta ya est\xE1 agotada";
    if (efectoSel.tipo !== "disparo" && inst.opcionUsadaEsteTurno) return "ya usaste esta habilidad este turno";
    const costoEsperado = efectoSel.costo?.cantidad ?? 0;
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
function parejasBloqueoOpcion(s, jugador) {
  const p = s.players[jugador];
  const parejas = [];
  for (const campeonId of p.campo.campeones) {
    if (!campeonId) continue;
    const metaC = s.instances[campeonId]?.cardId ? getCardMeta(s.instances[campeonId].cardId) : null;
    if (!metaC || !campeonElegibleBloqueoEter(metaC)) continue;
    for (const eterId of p.eterReserva) {
      const metaE = s.instances[eterId]?.cardId ? getCardMeta(s.instances[eterId].cardId) : null;
      if (!metaE || !faccionesCompartidas(faccionesDe(s, eterId), faccionesDe(s, campeonId))) continue;
      if (validarBloqueo(s, jugador, [eterId], campeonId, void 0, { externo: true }) !== null) continue;
      parejas.push({ campeonId, eterId });
    }
  }
  return parejas;
}
function validarElegirOpcion(state, action) {
  const pendiente = state.opcionesPendientes?.find(
    (o) => o.jugador === state.turno && o.eterId === action.opcionId
  );
  if (pendiente) {
    if (state.fase !== "forja") return "elegir_opcion solo en Forja";
  } else if (pasivosBloqueo1A(state, state.turno).includes(action.opcionId)) {
    if (state.fase !== "forja" && state.fase !== "choque" && state.fase !== "ocaso") {
      return "el Pasivo 1A solo en Forja/Choque/Ocaso (\xA78.3a: nunca en Alba)";
    }
    if (state.fase === "choque" && state.combate) return "el Pasivo 1A no se usa durante un combate";
  } else {
    return "no hay opci\xF3n pendiente para este jugador";
  }
  if (action.campeonId === void 0 !== (action.eterId === void 0)) {
    return "elegir_opcion: indica Campe\xF3n y \xC9ter juntos";
  }
  if (action.campeonId !== void 0 && action.eterId !== void 0) {
    const { campeonId, eterId } = action;
    const legal = parejasBloqueoOpcion(state, state.turno).some((q) => q.campeonId === campeonId && q.eterId === eterId);
    if (!legal) return "la pareja Campe\xF3n/\xC9ter no es v\xE1lida para esta opci\xF3n";
  }
  return null;
}
function validarElegirObjetivo(state, action) {
  const pendiente = state.objetivosPendientes?.[0];
  if (!pendiente) return "no hay objetivo pendiente";
  if (action.jugador !== void 0 && action.jugador !== pendiente.jugador) return "el objetivo lo elige el due\xF1o del pendiente";
  if (!state.declaracionEnEleccion && pendiente.jugador !== state.turno && electorAjeno(state) !== pendiente) {
    return "no es tu turno para elegir objetivo";
  }
  if (!pendiente.opciones.includes(action.objetivoId)) return "el objetivo no est\xE1 entre las opciones v\xE1lidas";
  const vigentes = opcionesVigentes(state, pendiente);
  if (vigentes.length === 0) {
    if (state.declaracionEnEleccion && action.objetivoId === pendiente.opciones[0]) return null;
    return "el objetivo ya no es v\xE1lido";
  }
  if (!vigentes.includes(action.objetivoId)) return "el objetivo ya no es v\xE1lido";
  return null;
}
function ejecutarActivarArcana(s, action, ctx) {
  const id = action.cardInstanceId;
  const inst = s.instances[id];
  if (!inst) return;
  const previos = marcarInicioAccion(s);
  const contextoUso = { tipo: "habilidad", cardInstanceId: id };
  aplicarPago(s, ctx, s.turno, action.eterIds, inst.cardId, contextoUso);
  inst.bocaArriba = true;
  ctx.emit({ type: "carta_activada", cardInstanceId: id, jugador: s.turno, slot: action.slot });
  const meta = getCardMeta(inst.cardId);
  if (meta && esArtefactoEquipable(meta)) {
    s.equiparPendiente = { artefactoId: id, jugador: s.turno, contexto: "activar_arcana" };
    return;
  }
  declararOpener(s, ctx, { tipo: "arcana", jugador: s.turno, cardInstanceId: id }, previos);
}
function ejecutarActivarHabilidad(s, action, ctx) {
  const inst = s.instances[action.cardInstanceId];
  const meta = metaDeInstancia(s, action.cardInstanceId);
  if (!meta) return;
  const efectoSel = efectoActivableDe(meta, !!action.objetivoId);
  if (!efectoSel) return;
  const previos = marcarInicioAccion(s);
  pagarHabilidad(s, ctx, s.turno, action.cardInstanceId, efectoSel, action.eterIds);
  declararHabilidad(s, ctx, inst, meta, efectoSel, previos, action.objetivoId);
}
function declararHabilidad(s, ctx, inst, meta, efectoSel, previos, objetivoId) {
  const efectoIdx = "efectos" in meta && meta.efectos ? meta.efectos.indexOf(efectoSel) : -1;
  if (efectoIdx === -1) {
    interpretEffect(s, ctx, inst, efectoSel, {
      jugador: s.turno,
      contextoUso: objetivoId ? "objetivo-elegido" : void 0,
      objetivoId,
      costoPagado: true
    });
    return;
  }
  declararOpener(s, ctx, {
    tipo: "habilidad",
    jugador: s.turno,
    cardInstanceId: inst.cardInstanceId,
    efectoIdx,
    objetivos: objetivoId ? { [efectoIdx]: objetivoId } : void 0
  }, previos);
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
  enviarAlCementerio(s, ctx, id, "campo");
  ctx.emit({ type: "carta_entrada_a_zona", cardInstanceId: id, zona: "2G", jugador: inst.owner, bocaArriba: true });
}
function ejecutarElegirOpcion(s, action, ctx) {
  const j = s.turno;
  const p = s.players[j];
  const pendiente = s.opcionesPendientes?.find((o) => o.jugador === j && o.eterId === action.opcionId);
  const pasivoVivo = !pendiente && pasivosBloqueo1A(s, j).includes(action.opcionId);
  if (!pendiente && !pasivoVivo) return;
  const pareja = action.campeonId !== void 0 && action.eterId !== void 0 ? { campeonId: action.campeonId, eterId: action.eterId } : parejasBloqueoOpcion(s, j)[0];
  if (!pareja) {
    if (pendiente) s.opcionesPendientes = s.opcionesPendientes.filter((o) => !(o.jugador === j && o.eterId === action.opcionId));
    return;
  }
  const elegido = { targetInstanceId: pareja.campeonId, eterId: pareja.eterId };
  const instCampeon = s.instances[elegido.targetInstanceId];
  instCampeon.eterBloqueado = [...instCampeon.eterBloqueado ?? [], elegido.eterId];
  const eterIdx = p.eterReserva.indexOf(elegido.eterId);
  if (eterIdx !== -1) p.eterReserva.splice(eterIdx, 1);
  etiquetarEterExterno(s, [elegido.eterId], elegido.targetInstanceId, j);
  ctx.emit({ type: "eter_bloqueado", jugador: j, eterIds: [elegido.eterId], campeonId: elegido.targetInstanceId });
  const eterPasivo = s.instances[action.opcionId];
  if (eterPasivo) eterPasivo.opcionUsadaEsteTurno = true;
  if (pendiente) s.opcionesPendientes = s.opcionesPendientes.filter((o) => !(o.jugador === j && o.eterId === action.opcionId));
}
function ejecutarElegirObjetivo(s, action, ctx) {
  const pendiente = s.objetivosPendientes?.[0];
  if (!pendiente) return;
  const vigente = opcionesVigentes(s, pendiente).includes(action.objetivoId);
  s.objetivosPendientes = s.objetivosPendientes.slice(1);
  const enDeclaracion = !!s.declaracionEnEleccion;
  const previos = marcarInicioAccion(s);
  if (!vigente) {
  } else if (pendiente.equipar) {
    equiparComoRespuesta(s, ctx, pendiente, action.objetivoId);
  } else if (pendiente.opener) {
    registrarObjetivoOpener(s, pendiente, action.objetivoId);
  } else if (pendiente.efectoUmbralIdx !== void 0) {
    resolverUmbralElegido(s, ctx, pendiente.instId, pendiente.efectoUmbralIdx, action.objetivoId);
  } else if (pendiente.tramoUmbral !== void 0) {
    ejecutarTramo(s, ctx, pendiente.instId, pendiente.tramoUmbral, action.objetivoId);
  } else {
    dispararTrigger(s, ctx, pendiente.trigger, pendiente.jugador, [pendiente.instId], {
      contextoUso: "objetivo-elegido",
      objetivoId: action.objetivoId
    });
  }
  if (enDeclaracion) continuarDeclaracion(s, ctx, previos);
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
  if (efecto.tipo === "disparo") return false;
  if (efecto.tipo === "continuo") {
    if (!esContinuoDeBloqueo(efecto) || claseDeContinuo(efecto) !== "sostenido" || eligeObjetivo(efecto)) return false;
  } else if (efecto.duracion !== "mientras_ester_bloqueado") {
    return false;
  }
  if (!esEfectoStat(efecto)) return false;
  const t = efecto.objetivo?.tipo;
  return t === "todos_campeones_propios" || t === "todos_campeones_rivales" || t === "self";
}
function exigeEterBloqueado(efecto) {
  return efecto.duracion === "mientras_ester_bloqueado" || esContinuoDeBloqueo(efecto);
}
function esAuraEquipada(efecto) {
  if (efecto.efecto !== "buff" && efecto.efecto !== "debuff") return false;
  if (efecto.objetivo?.tipo !== "equipped_champion") return false;
  if (efecto.buffPerBlockedEther) return efecto.costo?.tipo === "eter_bloqueado" || efecto.costo?.tipo === "bloqueo_fijo";
  return efecto.tipo === "hechizo";
}
function esAuraVinculo(efecto) {
  if (efecto.tipo !== "vinculo") return false;
  if (!esEfectoStat(efecto)) return false;
  if (efecto.duracion !== "mientras_en_campo") return false;
  return efecto.trigger === void 0 || efecto.trigger === null;
}
function statsImpresasDe(s, id) {
  const inst = s.instances[id];
  const meta = inst?.cardId ? getCardMeta(inst.cardId) : null;
  const stats = meta && esCampeon(meta) ? meta.stats : void 0;
  return { poder: stats?.poder ?? 0, resistencia: stats?.resistencia ?? 0 };
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
function esAuraContraRivales(efecto) {
  return efecto.objetivo?.tipo === "todos_campeones_rivales" && (esAuraZona(efecto) || esAuraCondicionada(efecto));
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
      if (esComandante && aplica) {
        const fuenteMeta = fuente.cardId ? getCardMeta(fuente.cardId) : null;
        const objetivoMeta = objetivoInst.cardId ? getCardMeta(objetivoInst.cardId) : null;
        if (fuenteMeta && objetivoMeta && "facciones" in fuenteMeta && "facciones" in objetivoMeta) {
          aplica = faccionesCompartidas(faccionesDe(s, fuente.cardInstanceId), faccionesDe(s, objetivoId));
        }
      }
      excluirSelf = !esComandante && origen === "campo" && esAuraZona(efecto) && !esAuraCondicionada(efecto);
      break;
    case "todos_campeones_rivales":
      aplica = !mismoDueno;
      break;
    case "campeon":
      if (objetivo.controlador === "propio") aplica = mismoDueno;
      else if (objetivo.controlador === "rival") aplica = !mismoDueno;
      else aplica = true;
      if (aplica && objetivo.filtros?.seleccionar) {
        const { stat, orden, valor } = objetivo.filtros.seleccionar;
        const statsRanking = valor === "original" ? statsImpresasDe : statsBaseDe;
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
        let mejorVal = stat === "poder" ? statsRanking(s, pool[0]).poder : statsRanking(s, pool[0]).resistencia;
        for (const cid of pool.slice(1)) {
          const val = stat === "poder" ? statsRanking(s, cid).poder : statsRanking(s, cid).resistencia;
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
  if (exigeEterBloqueado(efecto) && origen !== "bloqueo") {
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
  return contribucionDeEfecto(efecto, escala);
}
function contribucionDeEfecto(efecto, escala = 1) {
  const signo = efecto.efecto === "debuff" && !statsDebuffYaNegativos(efecto) ? -1 : 1;
  const resultado = {};
  if (efecto.efecto === "buff" || efecto.efecto === "debuff") {
    if (efecto.stats?.ATQ) resultado.poder = efecto.stats.ATQ * signo * escala;
    if (efecto.stats?.RES) resultado.resistencia = efecto.stats.RES * signo * escala;
  }
  if (efecto.efecto === "grant_keyword" && efecto.keyword) {
    resultado.keywords = [efecto.keyword];
  }
  return resultado;
}
function aportesSostenidos(s, objetivoId) {
  const total = { poder: 0, resistencia: 0, keywords: [] };
  for (const j of ["A", "B"]) {
    for (const fuenteId of s.players[j].campo.campeones) {
      const fuente = fuenteId ? s.instances[fuenteId] : void 0;
      if (!fuenteId || !fuente?.sostenidos?.length || !fuente.cardId) continue;
      const meta = getCardMeta(fuente.cardId);
      if (!meta || !("efectos" in meta) || !meta.efectos) continue;
      for (const { efectoIdx, objetivoId: elegido } of fuente.sostenidos) {
        const efecto = meta.efectos[efectoIdx];
        if (elegido !== objetivoId || !efecto || !esEfectoStat(efecto)) continue;
        if (efectosNegados(s, fuenteId)) continue;
        if (contarEterUmbral(s, fuenteId, efectoIdx, efecto) < umbralDeBloqueo(efecto)) continue;
        const aporte = contribucionDeEfecto(efecto);
        total.poder += aporte.poder ?? 0;
        total.resistencia += aporte.resistencia ?? 0;
        if (aporte.keywords) total.keywords.push(...aporte.keywords);
      }
    }
  }
  return total;
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
    const fuenteMeta = metaDeInstancia(s, fuenteId);
    if (!fuenteMeta) continue;
    if (fuenteMeta.type === "Arcana" && fuenteInst.bocaArriba !== true) continue;
    if (fuenteMeta.type === "Campe\xF3n" && fuenteMeta.efectoComandante) {
      candidatos.push({ inst: fuenteInst, meta: fuenteMeta, esComandante: true, origen: "campo" });
    }
    if ("efectos" in fuenteMeta && fuenteMeta.efectos?.some((e) => esAuraZona(e) || esAuraCondicionada(e) || esAuraEquipada(e))) {
      candidatos.push({ inst: fuenteInst, meta: fuenteMeta, esComandante: false, origen: "campo" });
    }
  }
  const rivalDelObjetivo = owner === "A" ? "B" : "A";
  const campoRival = s.players[rivalDelObjetivo].campo;
  for (const fuenteId of [...campoRival.campeones, ...campoRival.misticasTacticas, ...campoRival.arcanasCombate]) {
    if (!fuenteId) continue;
    const fuenteInst = s.instances[fuenteId];
    const fuenteMeta = fuenteInst?.cardId ? metaDeInstancia(s, fuenteId) : null;
    if (!fuenteInst || !fuenteMeta || !("efectos" in fuenteMeta)) continue;
    if (fuenteMeta.efectos?.some(esAuraContraRivales)) {
      candidatos.push({ inst: fuenteInst, meta: fuenteMeta, esComandante: false, origen: "campo", soloRivales: true });
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
    const negada = c.origen === "campo" && efectosNegados(s, c.inst.cardInstanceId);
    if (c.esComandante && c.meta.type === "Campe\xF3n" && c.meta.efectoComandante) {
      efectos.push(c.meta.efectoComandante);
    }
    if ("efectos" in c.meta && c.meta.efectos) {
      for (const e of c.meta.efectos) {
        if (c.origen === "reserva" && e.tipo === "reserva" && esAuraZona(e)) efectos.push(e);
        else if (c.origen === "bloqueo" && e.tipo === "bloqueo" && esAuraZona(e)) efectos.push(e);
        else if (c.origen === "vinculo" && e.tipo === "vinculo" && esAuraVinculo(e)) efectos.push(e);
        else if (c.origen === "campo" && !negada && c.soloRivales) {
          if (esAuraContraRivales(e)) efectos.push(e);
        } else if (c.origen === "campo" && !negada && (esAuraZona(e) || esAuraCondicionada(e) || esAuraEquipada(e))) efectos.push(e);
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
  const sostenidos = aportesSostenidos(s, id);
  poder += sostenidos.poder;
  resistencia += sostenidos.resistencia;
  keywords.push(...sostenidos.keywords);
  return { poder, resistencia, keywords: [...new Set(keywords)] };
}
function condicionCumple(s, condicion, jugador) {
  if (!condicion || typeof condicion !== "object" || !("trigger" in condicion)) return null;
  for (const cond of condicion.condiciones ?? []) {
    const checkRival = cond.tipo === "rival_controla_minimo" || cond.tipo === "rival_controla_maximo" || (cond.objetivo?.controlador !== void 0 ? cond.objetivo.controlador === "rival" : condicion.controladorTrigger === "rival");
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
var TRIGGERS_CANDADO = ["inicio_alba", "inicio_choque"];
function condicionEsCandado(condicion) {
  return !!condicion && typeof condicion === "object" && TRIGGERS_CANDADO.includes(condicion.trigger);
}
function evaluarCandadosArcanas(s, trigger, activo) {
  for (const dueno of ["A", "B"]) {
    for (const id of s.players[dueno].campo.arcanasCombate) {
      const inst = id ? s.instances[id] : void 0;
      const meta = inst?.cardId ? getCardMeta(inst.cardId) : null;
      if (!id || !inst || !meta || meta.type !== "Arcana" || inst.bocaArriba || inst.entradaEsteTurno) continue;
      const condicion = meta.condicion;
      if (!condicion || typeof condicion !== "object" || condicion.trigger !== trigger) continue;
      const duenoDelTrigger = condicion.controladorTrigger === "rival" ? dueno === "A" ? "B" : "A" : dueno;
      if (duenoDelTrigger !== activo) continue;
      inst.condicionHabilitada = condicionCumple(s, condicion, dueno) === null;
    }
  }
}
function hayParejaBloqueo(s, jugador) {
  return parejasBloqueoOpcion(s, jugador).length > 0;
}
function pasivosBloqueo1A(s, jugador) {
  return s.players[jugador].eterPagado.filter((id) => {
    const inst = s.instances[id];
    if (!inst || inst.opcionUsadaEsteTurno) return false;
    const meta = inst.cardId ? getCardMeta(inst.cardId) : null;
    if (!meta || !("efectos" in meta) || !meta.efectos) return false;
    return meta.efectos.some((e) => e.efecto === "block_ether" && !e.trigger && e.tipo === "pago");
  });
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
var TRIGGER_A_JSON = {
  "al-invocar": "al_invocar",
  "al-atacar": "al_atacar",
  "al-matar-en-combate": "al_matar_en_combate",
  "al-inicio-alba": "inicio_alba",
  "al-inicio-choque": "inicio_choque",
  "al-pagar-eter": "al_pagar_eter",
  "al-jugar-mistica": "al_jugar_mistica",
  "al-ser-enviado-al-cementerio": "al_ser_enviado_al_cementerio",
  "al-ser-destruido-vinculo": "al_ser_destruido_vinculo",
  "al-resolver-cadena": "al_resolver_cadena"
};
function triggersQueMatchean(s, trigger, jugador, ids, opts) {
  const res = [];
  const efectoTrigger = TRIGGER_A_JSON[trigger];
  for (const id of [...ids].sort()) {
    const inst = s.instances[id];
    const cardId = inst?.cardId;
    if (!inst || !cardId) continue;
    const meta = metaDeInstancia(s, id);
    if (!meta || !("efectos" in meta)) continue;
    if (meta.type === "V\xEDnculo" && inst.bocaArriba !== true) continue;
    if (opts?.evaluarCondicion !== false && "condicion" in meta) {
      const condicion = meta.condicion;
      if (condicion && typeof condicion === "object" && "trigger" in condicion) {
        if (efectoTrigger === condicion.trigger && condicionCumple(s, condicion, jugador) !== null) continue;
      }
    }
    const efectos = meta.efectos;
    if (!efectos || !Array.isArray(efectos)) continue;
    const negada = efectosNegados(s, id);
    efectos.forEach((efecto, efectoIdx) => {
      if (negada && efecto.tipo !== "comandante") return;
      if (trigger === "al-ser-enviado-al-cementerio" && !opts?.ignorarZonaOrigen && efecto.triggerZona && efecto.triggerZona !== "cualquier_zona" && efecto.triggerZona !== opts?.zonaOrigen) return;
      const triggerDelEfecto = efecto.trigger === "ninguno" ? void 0 : efecto.trigger;
      const esUmbral = trigger === "al-bloquear-eter";
      const matchea = esUmbral ? !triggerDelEfecto && (efecto.costo?.tipo === "bloqueo_fijo" || efecto.costo?.tipo === "eter_bloqueado") && !!efecto.efecto : triggerDelEfecto === efectoTrigger && !!efecto.efecto;
      if (matchea) res.push({ inst, efecto, efectoIdx });
    });
  }
  return res;
}
function dispararTrigger(s, ctx, trigger, jugador, instancias, payloadExtra) {
  const porCarta = registro.get(trigger);
  const ids = instancias ?? instanciasEnCampo(s, jugador);
  const orden = [...ids].sort();
  const payload = { jugador, fromTrigger: true, cobrarCosto: true, ...payloadExtra };
  for (const id of orden) {
    const inst = s.instances[id];
    const cardId = inst?.cardId;
    if (!inst || !cardId) continue;
    let handled = false;
    const meta = getCardMeta(cardId);
    if (meta && meta.type === "V\xEDnculo" && inst.bocaArriba !== true) continue;
    if (efectosNegados(s, id)) continue;
    const primero = triggersQueMatchean(s, trigger, payload.jugador, [id], {
      zonaOrigen: payload.zonaOrigen,
      ignorarZonaOrigen: payload.contextoUso === "objetivo-elegido"
      // resolución de una elección ya armada
    })[0];
    if (primero) {
      const { efecto, efectoIdx } = primero;
      const pendientesAntes = s.objetivosPendientes?.length ?? 0;
      const objetivoElegido = payload.objetivosElegidos?.[efectoIdx];
      interpretEffect(s, ctx, inst, efecto, {
        ...payload,
        ...payload.declarar ? { declararOpener: { efectoIdx } } : {},
        ...objetivoElegido ? { contextoUso: "objetivo-elegido", objetivoId: objetivoElegido } : {}
      });
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
          const targetIds = efecto.objetivo ? resolveTargets(s, efecto.objetivo, payload.jugador, id) : [];
          if (targetIds.length > 0) {
            handled = true;
          }
        } else {
          handled = true;
        }
      }
    }
    if (handled) continue;
    if (payload.declarar) continue;
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
function keywordsDe(s, id) {
  const inst = s.instances[id];
  const cardId = inst?.cardId ?? null;
  const meta = cardId ? getCardMeta(cardId) : null;
  const deData = meta && "keywords" in meta && meta.keywords ? meta.keywords : [];
  const mods = modificadoresJSONDe(s, id);
  const hastaFase = (inst?.keywordsHastaFase ?? []).map((k) => k.keyword);
  return [.../* @__PURE__ */ new Set([...deData, ...inst?.keywords ?? [], ...inst?.keywordsTemporales ?? [], ...hastaFase, ...mods.keywords])];
}
function velocidadDe(s, id) {
  const kws = keywordsDe(s, id);
  if (kws.includes("Fugaz")) return "fugaz";
  if (kws.includes("Presteza")) return "presteza";
  return "normal";
}
function aplicarMod(s, id, stat, valor, expira, turnosRestantes, hastaFase) {
  const inst = s.instances[id];
  if (!inst) return;
  inst.modificadores = [
    ...inst.modificadores ?? [],
    { stat, valor, expira, turnosRestantes, ...hastaFase ? { expiraFase: hastaFase.fase, expiraFaseJugador: hastaFase.jugador } : {} }
  ];
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
  purgarReglasTemporales(s, expira, jugador);
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
function purgarHastaFase(s, fase, turno) {
  purgarReglasHastaFase(s, fase, turno);
  for (const inst of Object.values(s.instances)) {
    if (inst.modificadores?.length) {
      const quedan = inst.modificadores.filter(
        (m) => !(m.expira === "hasta-fase" && m.expiraFase === fase && m.expiraFaseJugador === turno)
      );
      if (quedan.length !== inst.modificadores.length) inst.modificadores = quedan;
    }
    if (inst.keywordsHastaFase?.length) {
      const expiradas = inst.keywordsHastaFase.filter((k) => k.fase === fase && k.jugador === turno);
      if (expiradas.length > 0) {
        for (const k of expiradas) {
          inst.keywordsTemporales = (inst.keywordsTemporales ?? []).filter((x) => x !== k.keyword);
        }
        const quedan = inst.keywordsHastaFase.filter((k) => !(k.fase === fase && k.jugador === turno));
        if (quedan.length > 0) inst.keywordsHastaFase = quedan;
        else delete inst.keywordsHastaFase;
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

// src/online/game/targetResolver.ts
function resolveTargets(s, objetivo, jugador, fuenteId) {
  const { tipo, controlador, zona, filtros } = objetivo;
  let baseTargets = getTargetsByZone(s, tipo, zona, controlador, jugador, fuenteId);
  if (controlador === "rival" && tipo === "campeon" && zona === "campo") {
    const rival = jugador === "A" ? "B" : "A";
    const rivalChamps = s.players[rival].campo.campeones.filter((id) => id !== null);
    const esProtector = (id) => {
      const inst = s.instances[id];
      const meta = inst?.cardId ? getCardMeta(inst.cardId) : null;
      return meta !== null && esCampeon(meta) && !!meta.keywords?.includes("Protector");
    };
    if (rivalChamps.some(esProtector)) baseTargets = rivalChamps.filter(esProtector);
  }
  const filtered = applyFilters(s, baseTargets, filtros);
  if (filtros?.seleccionar) {
    return selectByRanking(s, filtered, filtros.seleccionar);
  }
  return filtered;
}
function coincideTipo(s, id, tipo) {
  if (tipo === "carta" || tipo === "mano") return true;
  const cardId = s.instances[id]?.cardId;
  const meta = cardId ? getCardMeta(cardId) : null;
  if (!meta) return false;
  if (tipo === "campeon") return esCampeon(meta);
  if (tipo === "mistica") return esMistica(meta);
  if (tipo === "arcana") return esArcana(meta);
  if (tipo === "mistica_arcana") return esMistica(meta) || esArcana(meta);
  if (tipo === "eter") return meta.type === "\xC9ter";
  return true;
}
function getTargetsByZone(s, tipo, zona, controlador, jugador, fuenteId) {
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
    const equipadoA = fuenteId ? s.instances[fuenteId]?.equipadoA : void 0;
    if (!equipadoA) return [];
    const enCampo = [...s.players.A.campo.campeones, ...s.players.B.campo.campeones].includes(equipadoA);
    return enCampo ? [equipadoA] : [];
  }
  if (tipo === "rival_hand") {
    return [rival];
  }
  if (tipo === "vinculo") {
    const res = [];
    for (const player of playersToCheck) {
      res.push(
        ...s.players[player].vinculos.filter((id) => {
          if (!id) return false;
          const v = s.instances[id];
          return !!v && v.bocaArriba !== true;
        })
      );
    }
    return res;
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
        targets.push(...p.cementerio.filter((id) => id !== null && coincideTipo(s, id, tipo)));
        break;
      }
      case "exilio": {
        targets.push(...p.exilio.filter((id) => id !== null && coincideTipo(s, id, tipo)));
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
        targets.push(...p.mano.filter((id) => id !== null && coincideTipo(s, id, tipo)));
        break;
      }
      case "mazo": {
        targets.push(...p.mazo.filter((id) => id !== null && coincideTipo(s, id, tipo)));
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
      if ("facciones" in card && !faccionesDe(s, id)?.includes(filtros.faccion)) {
        return false;
      }
    }
    if (filtros.esencia) {
      const card = meta;
      if ("esencia" in card && esenciaDe(s, id) !== filtros.esencia) {
        return false;
      }
    }
    if (filtros.rol) {
      const card = meta;
      if ("roles" in card && !rolesDe(s, id)?.includes(filtros.rol)) {
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
      if (filtros.atqMin !== void 0) {
        if (!meta.stats || meta.stats.poder < filtros.atqMin) return false;
      }
      if (filtros.resMin !== void 0) {
        if (!meta.stats || meta.stats.resistencia < filtros.resMin) return false;
      }
      if (filtros.atqActualMax !== void 0 && statsDe(s, id).poder > filtros.atqActualMax) return false;
      if (filtros.resActualMax !== void 0 && statsDe(s, id).resistencia > filtros.resActualMax) return false;
      if (filtros.atqActualMin !== void 0 && statsDe(s, id).poder < filtros.atqActualMin) return false;
      if (filtros.resActualMin !== void 0 && statsDe(s, id).resistencia < filtros.resActualMin) return false;
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
  const actual = seleccionar.valor === "actual";
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
      const valorDe = (id, meta) => {
        if (actual) return seleccionar.stat === "poder" ? statsDe(s, id).poder : statsDe(s, id).resistencia;
        return (seleccionar.stat === "poder" ? meta.stats?.poder : meta.stats?.resistencia) ?? 0;
      };
      valueA = valorDe(a, metaA);
      valueB = valorDe(b, metaB);
    }
    return seleccionar.orden === "mayor" ? valueB - valueA : valueA - valueB;
  });
  return [sorted[0]];
}

// src/online/game/pendientes.ts
function claveTrigger(efecto) {
  return toHyphenTrigger(efecto.trigger) ?? umbralTrigger(efecto) ?? "ninguno";
}
function opcionesVigentes(s, p) {
  const vivas = p.opciones.filter((id) => s.instances[id]);
  if (vivas.length === 0) return vivas;
  if (p.equipar) return vivas.filter((id) => s.players[p.jugador].campo.campeones.includes(id));
  const fuente = s.instances[p.instId];
  const meta = fuente?.cardId ? getCardMeta(fuente.cardId) : null;
  const efectos = meta && "efectos" in meta ? meta.efectos : void 0;
  if (!fuente || !efectos) return vivas;
  if (p.tramoUmbral !== void 0) {
    const raiz = efectos.find((e) => e.tramos?.some((t) => t.umbral === p.tramoUmbral));
    const tramo = raiz?.tramos?.find((t) => t.umbral === p.tramoUmbral);
    if (!raiz?.objetivo || !tramo) return vivas;
    const candidatos2 = resolveTargets(s, { ...raiz.objetivo, filtros: { ...raiz.objetivo.filtros, ...tramo.filtros } }, fuente.owner);
    return vivas.filter((id) => candidatos2.includes(id));
  }
  if (p.efectoUmbralIdx !== void 0) {
    const raiz = efectos[p.efectoUmbralIdx];
    if (!raiz?.objetivo) return vivas;
    const candidatos2 = resolveTargets(s, objetivoCompleto(raiz), fuente.owner, p.instId);
    return vivas.filter((id) => candidatos2.includes(id));
  }
  const armadores = p.opener ? [efectos[p.opener.efectoIdx]].filter((e) => !!e?.objetivo && e.objetivo.tipo !== "self") : efectos.filter((e) => !!e.objetivo && e.objetivo.tipo !== "self" && claveTrigger(e) === p.trigger);
  if (armadores.length === 0) return vivas;
  const candidatos = /* @__PURE__ */ new Set();
  for (const e of armadores) for (const id of resolveTargets(s, objetivoCompleto(e), p.jugador, p.instId)) candidatos.add(id);
  return vivas.filter((id) => candidatos.has(id));
}
function esDeUmbral(p) {
  return p.tramoUmbral !== void 0 || p.trigger === "al-bloquear-eter";
}
function electorAjeno(s) {
  if (s.declaracionEnEleccion) return void 0;
  const frente = s.objetivosPendientes?.[0];
  if (!frente || frente.jugador === s.turno || esDeUmbral(frente)) return void 0;
  return opcionesVigentes(s, frente).length > 0 ? frente : void 0;
}
function descartarFrentesMuertos(s) {
  if (s.declaracionEnEleccion) return 0;
  let quitados = 0;
  while (s.objetivosPendientes && s.objetivosPendientes.length > 0) {
    const frente = s.objetivosPendientes[0];
    if (opcionesVigentes(s, frente).length > 0) break;
    s.objetivosPendientes = s.objetivosPendientes.slice(1);
    quitados++;
  }
  return quitados;
}
function descartarPendientesObsoletos(s) {
  const cola = s.objetivosPendientes;
  if (!cola || cola.length === 0 || s.declaracionEnEleccion) return 0;
  const vigentes = cola.filter((p) => esDeUmbral(p) && s.instances[p.instId] && opcionesVigentes(s, p).length > 0);
  if (vigentes.length === cola.length) return 0;
  const descartados = cola.length - vigentes.length;
  s.objetivosPendientes = vigentes;
  return descartados;
}

// src/online/game/finPartida.ts
var JUGADORES = ["A", "B"];
function derrotadoPorVinculos(s, jugador) {
  const insts = s.players[jugador].vinculos.filter((id) => !!id).map((id) => s.instances[id]).filter((v) => !!v);
  const vivos = insts.filter((v) => !v.bocaArriba).length;
  const destruidos = insts.length - vivos;
  return vivos === 0 && destruidos > 0 && reglaBool(s, "derrotaPorVinculos", { jugador });
}
function motivoDerrota(s, jugador) {
  if (derrotadoPorVinculos(s, jugador)) return "vinculos";
  if (s.mazosAgotados?.includes(jugador)) return "mazo_vacio";
  return null;
}
function hayPendienteObligatorio(s) {
  return !!cadenaActiva(s) || !!s.declaracionEnEleccion || !!s.equiparPendiente || (s.preventivosPendientes?.length ?? 0) > 0 || !!electorAjeno(s) || !!scryActual(s);
}
function confirmarFinDePartida(s, ctx) {
  if (s.fase === "terminada" || hayPendienteObligatorio(s)) return;
  const derrotas = JUGADORES.map((j) => ({ jugador: j, motivo: motivoDerrota(s, j) })).filter((d) => d.motivo !== null);
  if (derrotas.length === 0) return;
  s.fase = "terminada";
  if (derrotas.length === JUGADORES.length) {
    delete s.ganador;
    s.motivo = "empate";
    ctx.emit({ type: "partida_terminada", ganador: null, motivo: "empate" });
    return;
  }
  const { jugador: perdedor, motivo } = derrotas[0];
  const ganador = perdedor === "A" ? "B" : "A";
  const m = motivo;
  s.ganador = ganador;
  s.motivo = m;
  ctx.emit({ type: "partida_terminada", ganador, motivo: m });
}

// src/online/game/phases.ts
function resolverAlba(s, ctx, jugador) {
  const p = s.players[jugador];
  resolverFaseEfectos(s, ctx, "alba", jugador);
  purgarHastaFase(s, "alba", jugador);
  purgarEfectosTemporales(s, "alba-due\xF1o", jugador, ctx);
  for (const slot of p.campo.campeones) {
    if (slot) {
      const inst = s.instances[slot];
      if (inst.agotado && !exhaustFijado(s, slot)) delete inst.agotado;
      if (inst.atacoEsteTurno) delete inst.atacoEsteTurno;
      if (inst.opcionUsadaEsteTurno) delete inst.opcionUsadaEsteTurno;
    }
  }
  for (const id of [...p.campo.misticasTacticas, ...p.campo.arcanasCombate]) {
    if (id && s.instances[id]?.entradaEsteTurno) delete s.instances[id].entradaEsteTurno;
  }
  reagruparEter(s, ctx, jugador);
  reagruparEfectosBloqueoAlba(s, ctx, jugador);
  evaluarCandadosArcanas(s, "inicio_alba", jugador);
  const vinculosSnapshot = p.vinculos.filter((id) => {
    if (!id) return false;
    return s.instances[id]?.bocaArriba === true;
  });
  const enCampoJugador = [
    ...p.campo.campeones,
    ...p.campo.misticasTacticas,
    ...p.campo.arcanasCombate
  ].filter((id) => id !== null);
  const albaInstances = [...vinculosSnapshot, ...enCampoJugador];
  if (albaInstances.length > 0) {
    dispararTrigger(s, ctx, "al-inicio-alba", jugador, albaInstances);
  }
  if (scryActual(s)) {
    s.albaPendiente = jugador;
    return;
  }
  robarDelAlba(s, ctx, jugador);
}
function robarDelAlba(s, ctx, jugador) {
  robarCarta(s, ctx, jugador);
  confirmarFinDePartida(s, ctx);
}
function reanudarAlba(s, ctx) {
  const jugador = s.albaPendiente;
  if (jugador === void 0 || scryActual(s)) return;
  delete s.albaPendiente;
  robarDelAlba(s, ctx, jugador);
}
function limpiarCombate(s) {
  s.combate = void 0;
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
    return m !== null && esCampeon(m) && faccionesCompartidas(faccionesDe(state, id), meta.facciones);
  });
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
    if (!faccionesCompartidas(faccionesDe(state, id), meta.facciones)) return `el sacrificio no comparte facci\xF3n con el Campe\xF3n: ${id}`;
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
  if (esArtefactoEquipable(meta)) {
    const p = state.players[state.turno];
    if (!p.campo.campeones.some((id) => id !== null)) {
      return "no puedes jugar un ARTEFACTO sin un Campe\xF3n en tu campo";
    }
  }
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
  reiniciarCampeon(s, id);
  const previos = marcarInicioAccion(s);
  const contextoUso = { tipo: "invocar", cardInstanceId: id };
  aplicarPago(s, ctx, s.turno, action.eterIds, cardId, contextoUso);
  for (const sacId of action.sacrificios ?? []) {
    const slotIdx = p.campo.campeones.indexOf(sacId);
    const zona2 = slotAZona("campeones", slotIdx) ?? "2B";
    ctx.emit({ type: "carta_salida_de_zona", cardInstanceId: sacId, zona: zona2, jugador: s.turno });
    p.campo.campeones[slotIdx] = null;
    liberarEterBloqueado(s, ctx, sacId, "2A");
    enviarAlCementerio(s, ctx, sacId, "campo");
    ctx.emit({ type: "carta_entrada_a_zona", cardInstanceId: sacId, zona: "2G", jugador: s.turno, bocaArriba: true });
  }
  const manoIdx = p.mano.indexOf(id);
  if (manoIdx !== -1) p.mano.splice(manoIdx, 1);
  const zona = slotAZona("campeones", action.slot) ?? "2B";
  ctx.emit({ type: "carta_salida_de_zona", cardInstanceId: id, zona: "mano", jugador: s.turno });
  p.campo.campeones[action.slot] = id;
  s.instances[id].entradaEsteTurno = true;
  ctx.emit({ type: "carta_entrada_a_zona", cardInstanceId: id, zona, jugador: s.turno, bocaArriba: true });
  ctx.emit({ type: "carta_invocada", cardInstanceId: id, tipo: "Campe\xF3n", slot: action.slot });
  const triggers = construirTriggers(s, "al-invocar", s.turno, [id]);
  if (triggers.length === 0) dispararTrigger(s, ctx, "al-invocar", s.turno, [id]);
  const apilados = triggers.length > 0 ? armarTriggers(s, ctx, triggers) : [];
  declararVentana(s, ctx, { tipo: "invocacion", jugador: s.turno, cardInstanceId: id, ...apilados.length > 0 ? { triggers: apilados } : {} }, previos);
}
function ejecutarJugarMistica(s, action, ctx) {
  const p = s.players[s.turno];
  const id = action.cardInstanceId;
  const previos = marcarInicioAccion(s);
  const contextoUso = { tipo: "jugar", cardInstanceId: id };
  aplicarPago(s, ctx, s.turno, action.eterIds, s.instances[id].cardId, contextoUso);
  const manoIdxM = p.mano.indexOf(id);
  if (manoIdxM !== -1) p.mano.splice(manoIdxM, 1);
  const zona = slotAZona("misticasTacticas", action.slot) ?? "3A";
  ctx.emit({ type: "carta_salida_de_zona", cardInstanceId: id, zona: "mano", jugador: s.turno });
  p.campo.misticasTacticas[action.slot] = id;
  s.instances[id].entradaEsteTurno = true;
  ctx.emit({ type: "carta_entrada_a_zona", cardInstanceId: id, zona, jugador: s.turno, bocaArriba: true });
  ctx.emit({ type: "carta_invocada", cardInstanceId: id, tipo: "M\xEDstica", slot: action.slot });
  const inst = s.instances[id];
  const meta = inst.cardId ? getCardMeta(inst.cardId) : null;
  if (meta && esArtefactoEquipable(meta)) {
    s.equiparPendiente = { artefactoId: id, jugador: s.turno, contexto: "jugar_mistica" };
    return;
  }
  const triggers = construirTriggers(s, "al-jugar-mistica", s.turno, [id]);
  if (triggers.length === 0) dispararTrigger(s, ctx, "al-jugar-mistica", s.turno, [id]);
  declararOpener(s, ctx, { tipo: "mistica", jugador: s.turno, cardInstanceId: id }, previos, triggers);
}
function ejecutarColocarArcana(s, action, ctx) {
  const p = s.players[s.turno];
  const id = action.cardInstanceId;
  const manoIdxA = p.mano.indexOf(id);
  if (manoIdxA !== -1) p.mano.splice(manoIdxA, 1);
  const zona = slotAZona("arcanasCombate", action.slot) ?? "3D";
  ctx.emit({ type: "carta_salida_de_zona", cardInstanceId: id, zona: "mano", jugador: s.turno });
  p.campo.arcanasCombate[action.slot] = id;
  s.instances[id].bocaArriba = false;
  s.instances[id].entradaEsteTurno = true;
  delete s.instances[id].condicionHabilitada;
  ctx.emit({ type: "carta_entrada_a_zona", cardInstanceId: id, zona, jugador: s.turno, bocaArriba: false });
  ctx.emit({ type: "carta_invocada", cardInstanceId: id, tipo: "Arcana", slot: action.slot });
}
function ejecutarColocarVinculo(s, action, ctx) {
  const p = s.players[s.turno];
  const id = action.cardInstanceId;
  const manoIdxV = p.mano.indexOf(id);
  if (manoIdxV !== -1) p.mano.splice(manoIdxV, 1);
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
  if (s.equiparPendiente && s.equiparPendiente.artefactoId === action.cardInstanceId) {
    const { contexto } = s.equiparPendiente;
    delete s.equiparPendiente;
    resolverEfectosArtefacto(s, ctx, action.cardInstanceId, contexto);
  }
}
function resolverEfectosArtefacto(s, ctx, id, contexto) {
  const inst = s.instances[id];
  if (!inst) return;
  const previos = marcarInicioAccion(s);
  let triggers;
  if (contexto === "jugar_mistica") {
    triggers = construirTriggers(s, "al-jugar-mistica", s.turno, [id]);
    if (triggers.length === 0) dispararTrigger(s, ctx, "al-jugar-mistica", s.turno, [id]);
  }
  declararOpener(s, ctx, { tipo: contexto === "jugar_mistica" ? "mistica" : "arcana", jugador: s.turno, cardInstanceId: id }, previos, triggers);
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

// src/online/game/economia.ts
function actorDeBloqueo(state) {
  const cadena = cadenaActiva(state);
  return cadena ? cadena.prioridad : state.turno;
}
function validarBloquearEter(state, action) {
  if (state.fase !== "forja" && state.fase !== "choque" && state.fase !== "ocaso") {
    return "bloquear_eter solo en Forja/Choque/Ocaso (\xA78.3a: nunca en Alba)";
  }
  if (cadenaActiva(state) && state.fase !== "forja") return "un efecto continuo solo puede responder en la Forja (\xA78.3a)";
  return validarBloqueo(state, actorDeBloqueo(state), action.eterIds, action.targetInstanceId, action.efectoIdx);
}
function ejecutarBloquearEter(s, action, ctx) {
  bloquearEter(s, ctx, actorDeBloqueo(s), action.eterIds, action.targetInstanceId, action.efectoIdx);
  const meta = getCardMeta(s.instances[action.targetInstanceId]?.cardId ?? "");
  const activacionIdx = action.efectoIdx ?? (meta ? efectoBloqueoAccion(meta)?.indice : void 0);
  dispararUmbralBloqueo(s, ctx, action.targetInstanceId, activacionIdx);
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
    case "ocaso": {
      const limite = reglaNumero(state, "limiteMano", { jugador: state.turno });
      return p.mano.length > limite ? `no puedes pasar el turno con m\xE1s de ${limite} cartas en mano` : null;
    }
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
      evaluarCandadosArcanas(s, "inicio_choque", s.turno);
      const p = s.players[s.turno];
      const campeones = p.campo.campeones.filter((x) => x !== null);
      const misticas = p.campo.misticasTacticas.filter((x) => x !== null);
      const arcanas = p.campo.arcanasCombate.filter((x) => x !== null);
      const vinculos = p.vinculos.filter((x) => x !== null && s.instances[x]?.bocaArriba === true);
      const choqueInstances = [...p.eterReserva, ...campeones, ...misticas, ...arcanas, ...vinculos];
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
    purgarHastaFase(s, siguiente, s.turno);
    ctx.emit({ type: "fase_iniciada", fase: siguiente, jugador: s.turno });
    return;
  }
  const rival = s.turno === "A" ? "B" : "A";
  if (s.primerTurno && s.turno === s.primerJugador) s.primerTurno = false;
  for (const inst of Object.values(s.instances)) {
    if (inst.entradaEsteTurno) delete inst.entradaEsteTurno;
    if (inst.bloqueosEsteTurno) delete inst.bloqueosEsteTurno;
    if (inst.efectosUsadosEsteTurno) delete inst.efectosUsadosEsteTurno;
  }
  delete s.rupturasEsteTurno;
  descartarPendientesObsoletos(s);
  s.turno = rival;
  ctx.emit({ type: "turno_iniciado", jugador: rival });
  ctx.emit({ type: "fase_iniciada", fase: "alba", jugador: rival });
  resolverAlba(s, ctx, rival);
  if (s.fase !== "terminada") {
    s.fase = "forja";
    purgarHastaFase(s, "forja", s.turno);
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
    enviarAlCementerio(s, ctx, id, "mano");
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
  descartarFrentesMuertos(s);
  descartarScryMuertos(s);
  reanudarAlba(s, ctx);
  confirmarFinDePartida(s, ctx);
  return { ok: true, state: s, events: [...ctx.events] };
}
var ACCIONES_CON_CADENA_ABIERTA = /* @__PURE__ */ new Set([
  "responder_cadena",
  "jugar_respuesta",
  "pasar_prioridad",
  "bloquear_eter",
  "rendirse",
  "responder_prevenicion",
  "ordenar_mazo"
]);
function validarAccion(state, action) {
  const preven = state.preventivosPendientes?.[0];
  if (preven && action.type !== "responder_prevenicion") {
    return "hay una prevenicion pendiente de resolver";
  }
  if (state.declaracionEnEleccion && action.type !== "elegir_objetivo" && action.type !== "rendirse" && action.type !== "responder_prevenicion") {
    return "hay un objetivo por elegir antes de abrir la ventana";
  }
  if (electorAjeno(state) && action.type !== "elegir_objetivo" && action.type !== "rendirse" && action.type !== "responder_prevenicion") {
    return "el rival debe elegir un objetivo antes de continuar";
  }
  if (scryActual(state) && !state.declaracionEnEleccion && !electorAjeno(state) && action.type !== "ordenar_mazo" && action.type !== "rendirse") {
    return "hay un mazo por ordenar antes de continuar";
  }
  if (cadenaActiva(state) && !state.declaracionEnEleccion && !ACCIONES_CON_CADENA_ABIERTA.has(action.type)) {
    return "hay una cadena abierta: solo se puede responder o pasar prioridad";
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
    case "jugar_respuesta":
      return validarJugarRespuesta(state, action.cardInstanceId, action.eterIds);
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
    case "ordenar_mazo":
      return validarOrdenarMazo(state, action);
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
      return validarResponderCadena(state, action.cardInstanceId, action.eterIds);
    case "pasar_prioridad":
      return validarPasarPrioridad(state);
    default:
      return "accion no disponible en esta fase";
  }
}
function ejecutarAccion(s, action, ctx) {
  switch (action.type) {
    case "rendirse": {
      const quien = action.jugador ?? s.turno;
      ctx.emit({ type: "rendicion", jugador: quien });
      const ganador = quien === "A" ? "B" : "A";
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
    case "jugar_respuesta": {
      ejecutarJugarRespuesta(s, action.cardInstanceId, action.eterIds, ctx);
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
    case "ordenar_mazo": {
      ejecutarOrdenarMazo(s, action, ctx);
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
      ejecutarResponderCadena(s, action.cardInstanceId, ctx, action.eterIds);
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
  if (estado.declaracionEnEleccion) {
    const pendiente = estado.objetivosPendientes?.[0];
    if (pendiente) return pendiente.jugador;
  }
  const ajeno = electorAjeno(estado);
  if (ajeno) return ajeno.jugador;
  const scry = scryActual(estado);
  if (scry) return scry.jugador;
  const cadena = cadenaActiva(estado);
  if (cadena) return cadena.prioridad;
  if (estado.fase === "choque" && estado.combate?.paso === "bloqueo") {
    return estado.turno === "A" ? "B" : "A";
  }
  return estado.turno;
}
function accionesBloqueoEter(state, playerId, enCadena = false) {
  const acciones = [];
  if (!enCadena && state.fase === "choque" && state.combate) return acciones;
  const p = state.players[playerId];
  const generarBloqueos = (targets) => {
    for (const t of targets) {
      if (efectosNegados(state, t.id)) continue;
      if (!("efectos" in t.meta) || !t.meta.efectos) continue;
      const fuentes = t.meta.efectos.map((efecto, i) => ({ efecto, i })).filter(({ efecto }) => esCostoBloqueo(efecto.costo) && efecto.tipo !== "disparo");
      if (fuentes.length === 0) continue;
      for (const { efecto, i } of fuentes) {
        const zonaOrigen = efecto.costo?.origen === "pagado" ? p.eterPagado : p.eterReserva;
        const disponibles = zonaOrigen.filter((id) => {
          const meta = state.instances[id]?.cardId ? getCardMeta(state.instances[id].cardId) : null;
          return meta !== null;
        });
        const actuales = eterDeEfecto(state, t.id, i).length;
        const maxEter = efecto.costo?.cantidad ?? 1;
        const fijo = efecto.costo?.tipo === "bloqueo_fijo";
        const multi = fuentes.length > 1 ? { efectoIdx: i } : {};
        if (fijo) {
          const usado = efecto.unaVezPorTurno === true && (t.inst.efectosUsadosEsteTurno ?? []).includes(i);
          if (!usado && disponibles.length >= maxEter) {
            acciones.push({
              type: "bloquear_eter",
              eterIds: disponibles.slice(0, maxEter),
              targetInstanceId: t.id,
              ...multi
            });
          }
        } else {
          let generados = actuales;
          for (const eterId of disponibles) {
            if (generados >= maxEter) break;
            acciones.push({ type: "bloquear_eter", eterIds: [eterId], targetInstanceId: t.id, ...multi });
            generados++;
          }
        }
      }
    }
  };
  const campeonesBloqueo = p.campo.campeones.filter((id) => id !== null).map((id) => ({ id, inst: state.instances[id], meta: state.instances[id]?.cardId ? getCardMeta(state.instances[id].cardId) : null })).filter((t) => t.inst != null && t.meta != null);
  generarBloqueos(campeonesBloqueo);
  const artefactosBloqueo = [...p.campo.misticasTacticas, ...p.campo.arcanasCombate].filter((id) => id !== null).map((id) => ({ id, inst: state.instances[id], meta: state.instances[id]?.cardId ? getCardMeta(state.instances[id].cardId) : null })).filter((t) => t.inst != null && t.meta != null);
  generarBloqueos(artefactosBloqueo);
  return acciones;
}
function asignacionesMaximales(state) {
  const ataques = ataquesBloqueables(state);
  const k = Math.min(bloqueadoresDisponibles(state).length, ataques.length);
  if (k === 0) return [];
  const disponibles = bloqueadoresDisponibles(state);
  const perms = (arr, largo) => {
    if (largo === 0) return [[]];
    const out = [];
    for (let i = 0; i < arr.length; i++) {
      const resto = [...arr.slice(0, i), ...arr.slice(i + 1)];
      for (const tail of perms(resto, largo - 1)) out.push([arr[i], ...tail]);
    }
    return out;
  };
  const combos = (arr, largo) => {
    if (largo === 0) return [[]];
    const out = [];
    for (let i = 0; i <= arr.length - largo; i++) {
      for (const tail of combos(arr.slice(i + 1), largo - 1)) out.push([arr[i], ...tail]);
    }
    return out;
  };
  const greedy = asignacionForzada(state);
  const resultado = [];
  if (greedy) resultado.push(greedy);
  for (const subAtaques of combos(ataques, k)) {
    for (const ordenBloqueadores of perms(disponibles, k)) {
      const asig = {};
      subAtaques.forEach((atk, i) => {
        asig[atk] = ordenBloqueadores[i];
      });
      if (greedy && JSON.stringify(asig) === JSON.stringify(greedy)) continue;
      resultado.push(asig);
    }
  }
  return resultado;
}
function subconjuntosNoVacios(arr) {
  const out = [arr];
  const n = arr.length;
  for (let mask = 1; mask < (1 << n) - 1; mask++) {
    const sub = [];
    for (let i = 0; i < n; i++) if (mask & 1 << i) sub.push(arr[i]);
    if (sub.length > 0 && sub.length < n) out.push(sub);
  }
  return out;
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
  const equipPend = state.equiparPendiente;
  if (equipPend) {
    const instPend = state.instances[equipPend.artefactoId];
    if (instPend?.equipadoA) {
      delete state.equiparPendiente;
    } else {
      if (playerId !== equipPend.jugador) return [{ type: "rendirse", jugador: playerId }];
      const accionesEquip = [{ type: "rendirse", jugador: playerId }];
      if (instPend) {
        const p = state.players[playerId];
        for (const campeonId of p.campo.campeones) {
          if (!campeonId) continue;
          const accion = { type: "equipar_artefacto", cardInstanceId: equipPend.artefactoId, campeonInstanceId: campeonId };
          if (validarEquiparArtefacto(state, accion) !== null) continue;
          accionesEquip.push(accion);
        }
      }
      return accionesEquip;
    }
  }
  if (state.fase === "terminada") return [];
  const acciones = [{ type: "rendirse", jugador: playerId }];
  if (state.declaracionEnEleccion) {
    const pendiente = state.objetivosPendientes?.[0];
    if (pendiente && pendiente.jugador === playerId) {
      const vivas = opcionesVigentes(state, pendiente);
      for (const objetivoId of vivas.length > 0 ? vivas : pendiente.opciones.slice(0, 1)) {
        acciones.push({ type: "elegir_objetivo", objetivoId });
      }
    }
    return acciones;
  }
  descartarFrentesMuertos(state);
  const ajeno = electorAjeno(state);
  if (ajeno) {
    if (ajeno.jugador === playerId) {
      for (const objetivoId of opcionesVigentes(state, ajeno)) acciones.push({ type: "elegir_objetivo", objetivoId });
    }
    return acciones;
  }
  const scry = scryActual(state);
  if (scry) {
    if (scry.jugador === playerId) acciones.push({ type: "ordenar_mazo", arriba: cartasVigentesScry(state, scry), fondo: [] });
    return acciones;
  }
  if (state.turno === playerId && state.fase === "pre_partida") {
    const p = state.players[playerId];
    if (!p.mulliganUsado) acciones.push({ type: "mulligan" });
    acciones.push({ type: "pasar_mulligan" });
  }
  const cadena = cadenaActiva(state);
  if (cadena) {
    if (cadena.prioridad === playerId) {
      for (const id of respondiblesDe(state, playerId)) {
        const metaR = metaDeInstancia(state, id);
        const disparo = metaR?.type === "Campe\xF3n" ? disparoDeRespuesta(metaR) : null;
        const eterIds = disparo ? eterIdsParaHabilidad(state, playerId, disparo.efecto) : null;
        acciones.push(eterIds ? { type: "responder_cadena", cardInstanceId: id, eterIds } : { type: "responder_cadena", cardInstanceId: id });
      }
      for (const id of respuestasDeMano(state, playerId)) {
        const instR = state.instances[id];
        if (!instR?.cardId) continue;
        const eterIds = etersParaPagar(state, playerId, instR.cardId);
        if (eterIds !== null) {
          acciones.push({ type: "jugar_respuesta", cardInstanceId: id, eterIds });
        }
      }
      if (state.fase === "forja") acciones.push(...accionesBloqueoEter(state, playerId, true));
      acciones.push({ type: "pasar_prioridad" });
    }
    return acciones;
  }
  if (state.turno === playerId) {
    const p = state.players[playerId];
    descartarFrentesMuertos(state);
    const pendiente = state.objetivosPendientes?.[0];
    if (pendiente && pendiente.jugador === playerId) {
      for (const objetivoId of opcionesVigentes(state, pendiente)) {
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
      const meta = metaDeInstancia(state, champId);
      if (!meta) continue;
      if (efectosNegados(state, champId)) continue;
      const efectoAct = efectoActivableDe(meta, false);
      if (efectoAct && inst) {
        const costoBloqueo = esCostoBloqueo(efectoAct.costo);
        const costo = efectoAct.costo?.cantidad ?? 0;
        const zonaAct = costoBloqueo && efectoAct.costo?.origen === "pagado" ? p.eterPagado : p.eterReserva;
        const eteresValidos = zonaAct.filter((id) => {
          const eterMeta = state.instances[id]?.cardId ? getCardMeta(state.instances[id].cardId) : null;
          return eterMeta !== null;
        });
        if (costoBloqueo) {
          if (inst.opcionUsadaEsteTurno) continue;
          if (costo > 0 && eteresValidos.length >= costo) {
            acciones.push({ type: "activar_habilidad", cardInstanceId: champId, eterIds: eteresValidos.slice(0, costo) });
          }
        } else if (efectoAct.tipo === "continuo") {
          if (inst.agotado || inst.opcionUsadaEsteTurno) continue;
          if (costo > 0 && eteresValidos.length >= costo) {
            acciones.push({ type: "activar_habilidad", cardInstanceId: champId, eterIds: eteresValidos.slice(0, costo) });
          } else if (costo === 0 && eteresValidos.length > 0) {
            acciones.push({ type: "activar_habilidad", cardInstanceId: champId, eterIds: [eteresValidos[0]] });
          }
        } else {
          if (inst.agotado) continue;
          const costoReal = costo > 0 ? costo : 1;
          if (p.eterReserva.length >= costoReal) {
            acciones.push({ type: "activar_habilidad", cardInstanceId: champId, eterIds: p.eterReserva.slice(0, costoReal) });
          }
        }
      }
    }
    const faseGeneralOk = state.fase === "forja" || state.fase === "choque" && !state.combate || state.fase === "ocaso" && p.mano.length <= reglaNumero(state, "limiteMano", { jugador: playerId });
    if (faseGeneralOk) {
      acciones.push(...accionesBloqueoEter(state, playerId));
      if (hayParejaBloqueo(state, playerId)) {
        for (const eterId of pasivosBloqueo1A(state, playerId)) {
          acciones.push({ type: "elegir_opcion", opcionId: eterId });
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
    }
    if (state.fase === "forja") {
      for (const id of p.mano) {
        const accion = generarAccionesForja(state, playerId, id);
        if (accion) acciones.push(accion);
      }
      for (const opcion of state.opcionesPendientes ?? []) {
        if (opcion.jugador === playerId) {
          acciones.push({ type: "elegir_opcion", opcionId: opcion.eterId });
        }
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
          for (const sub of subconjuntosNoVacios(elegibles)) {
            acciones.push({ type: "declarar_ataque", atacanteIds: sub });
          }
        }
        for (const id of p.mano) {
          const accion = generarAccionesForja(state, playerId, id);
          if (accion) acciones.push(accion);
        }
        acciones.push({ type: "pasar_turno" });
      } else if (combate.paso === "resolucion") {
        const opcionesRuptura = [];
        if (!combate.rupturaUsadaEsteTurno && combate.rupturaDisponible) {
          const rival = rivalDe(state);
          for (const atacanteId of ataquesSinBloquear(state)) {
            if (!state.players[state.turno].campo.campeones.includes(atacanteId)) continue;
            state.players[rival].vinculos.forEach((vinculoId, slot) => {
              const v = vinculoId ? state.instances[vinculoId] : void 0;
              if (vinculoId && !v?.bocaArriba) {
                opcionesRuptura.push({ type: "elegir_ruptura", atacanteId, vinculoSlot: slot });
              }
            });
          }
        }
        if (opcionesRuptura.length > 0) {
          acciones.push(...opcionesRuptura);
        } else {
          acciones.push({ type: "pasar_turno" });
        }
      }
    } else if (state.fase === "ocaso") {
      if (p.mano.length <= reglaNumero(state, "limiteMano", { jugador: playerId })) {
        acciones.push({ type: "pasar_turno" });
      } else {
        for (const id of p.mano) {
          acciones.push({ type: "descartar_carta", cardInstanceIds: [id] });
        }
      }
    }
  } else if (state.fase === "choque" && playerId === rivalDe(state) && state.combate?.paso === "bloqueo") {
    for (const asig of asignacionesMaximales(state)) {
      acciones.push({ type: "declarar_bloqueo", asignaciones: asig });
    }
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
  const pila = cadenaActiva(v)?.pila ?? [];
  for (const id of pila) ocultar.delete(id);
  const opener = cadenaActiva(v)?.opener;
  if (opener) ocultar.delete(opener.cardInstanceId);
  const enEleccion = v.declaracionEnEleccion?.opener;
  if (enEleccion) ocultar.delete(enEleccion.cardInstanceId);
  const respondiendo = v.declaracionEnEleccion?.respuesta;
  if (respondiendo) ocultar.delete(respondiendo.cardInstanceId);
  for (const t of cadenaActiva(v)?.triggers ?? []) ocultar.delete(t.cardInstanceId);
  for (const t of v.declaracionEnEleccion?.triggers ?? []) ocultar.delete(t.cardInstanceId);
  const pendiente = v.objetivosPendientes?.[0];
  if (pendiente && pendiente.jugador === playerId) {
    for (const id of pendiente.opciones) ocultar.delete(id);
  }
  const scry = scryActual(v);
  if (scry && scry.jugador === playerId) {
    for (const id of cartasVigentesScry(v, scry)) ocultar.delete(id);
  }
  for (const id of ocultar) {
    const inst = v.instances[id];
    if (inst) {
      inst.cardId = null;
      delete inst.condicionHabilitada;
    }
  }
  return v;
}

// src/online/game/invariants.ts
function verificarZonaUnica(estado) {
  const zonasDe = /* @__PURE__ */ new Map();
  const anotar = (id, zona) => {
    if (!id) return;
    const lista = zonasDe.get(id);
    if (lista) lista.push(zona);
    else zonasDe.set(id, [zona]);
  };
  for (const p of ["A", "B"]) {
    const st = estado.players[p];
    for (const id of st.mano) anotar(id, `${p}.mano`);
    for (const id of st.mazo) anotar(id, `${p}.mazo`);
    for (const id of st.cementerio) anotar(id, `${p}.cementerio`);
    for (const id of st.exilio) anotar(id, `${p}.exilio`);
    for (const id of st.eterReserva) anotar(id, `${p}.eterReserva`);
    for (const id of st.eterPagado) anotar(id, `${p}.eterPagado`);
    for (const grupo of ["campeones", "misticasTacticas", "arcanasCombate"]) {
      st.campo[grupo].forEach((id, i) => anotar(id, `${p}.campo.${grupo}[${i}]`));
    }
    st.vinculos.forEach((id, i) => anotar(id, `${p}.vinculos[${i}]`));
    for (const grupo of ["campeones", "misticasTacticas", "arcanasCombate"]) {
      for (const portador of st.campo[grupo]) {
        for (const eterId of (portador ? estado.instances[portador]?.eterBloqueado : void 0) ?? []) {
          anotar(eterId, `${p}.eterBloqueado(${portador})`);
        }
      }
    }
  }
  const violaciones = [];
  for (const [id, zonas] of zonasDe) {
    if (zonas.length > 1) violaciones.push(`${id}: en ${zonas.length} zonas a la vez (${zonas.join(", ")})`);
  }
  return violaciones;
}
function verificarInvariantes(estado) {
  const violaciones = verificarZonaUnica(estado);
  const esEterId = (id) => {
    const inst = estado.instances[id];
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null;
    return meta !== null && esEter(meta);
  };
  const eterDe = (p) => {
    const st = estado.players[p];
    let n = st.eterReserva.filter(esEterId).length + st.eterPagado.filter(esEterId).length + st.mano.filter(esEterId).length + st.cementerio.filter(esEterId).length + st.exilio.filter(esEterId).length + st.mazo.filter(esEterId).length;
    for (const grupo of ["campeones", "misticasTacticas", "arcanasCombate"]) {
      for (const id of st.campo[grupo]) {
        if (!id) continue;
        n += estado.instances[id]?.eterBloqueado?.length ?? 0;
      }
    }
    return n;
  };
  const idsEnZonasDe = (p) => {
    const st = estado.players[p];
    const enCampo = [...st.campo.campeones, ...st.campo.misticasTacticas, ...st.campo.arcanasCombate].filter((x) => x !== null);
    const bloqueados = enCampo.flatMap((id) => estado.instances[id]?.eterBloqueado ?? []);
    return [
      ...st.mano,
      ...st.mazo,
      ...st.cementerio,
      ...st.exilio,
      ...st.eterReserva,
      ...st.eterPagado,
      ...enCampo,
      ...st.vinculos.filter((x) => x !== null),
      ...bloqueados
    ];
  };
  const noEterDeDueno = (p) => [...idsEnZonasDe("A"), ...idsEnZonasDe("B")].filter((id) => !esEterId(id) && estado.instances[id]?.owner === p).length;
  const eterGlobal = eterDe("A") + eterDe("B");
  if (eterGlobal !== 30) violaciones.push(`global: ${eterGlobal} \xC9ter \u2260 30 (transferido/fuente perdida o duplicada)`);
  for (const p of ["A", "B"]) {
    const st = estado.players[p];
    if (st.mano.length > 45) violaciones.push(`${p}: mano ${st.mano.length} > 45 (imposible: mazo principal = 45)`);
    const noEter = noEterDeDueno(p);
    if (noEter !== 51) violaciones.push(`${p}: cartas no-\xC9ter ${noEter} \u2260 51`);
    const campeones = st.campo.campeones.filter((x) => x !== null).length;
    if (campeones > 5) violaciones.push(`${p}: ${campeones} Campeones > 5`);
    const misticas = st.campo.misticasTacticas.filter((x) => x !== null).length;
    if (misticas > 3) violaciones.push(`${p}: ${misticas} M\xEDsticas/T\xE1cticas > 3`);
    const arcanas = st.campo.arcanasCombate.filter((x) => x !== null).length;
    if (arcanas > 3) violaciones.push(`${p}: ${arcanas} Arcanas/Combates > 3`);
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
  { type: "tramo_disparado", jugador: "A", fuenteId: "c1", umbral: 2, efecto: "toggle_exhaust" },
  { type: "exhaust_fijado", jugador: "A", campeonId: "c2", fuenteId: "c1" },
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
  { type: "exilio_prevenido", cardInstanceId: "c1", jugador: "A" },
  { type: "prevenicion_pendiente", victimId: "c3", fuenteId: "c1", jugador: "A", causa: "efecto" },
  { type: "ruptura_realizada", atacanteId: "c1", vinculoSlot: 2, vinculoId: "c3" },
  { type: "respuesta_encadenada", jugador: "B", cardInstanceId: "c4" },
  { type: "prioridad_pasada", jugador: "A" },
  { type: "carta_activada", cardInstanceId: "c1", jugador: "A", slot: 0 },
  { type: "activacion_negada", jugador: "B", cardInstanceId: "c1", fuente: "c4" },
  // Negar un «efecto activo» (Thane): los efectos del Campeón quedan negados un tiempo
  { type: "efectos_negados", jugador: "B", cardInstanceId: "c1", fuente: "c4" },
  // F5d-3 (decisión 10a): triggers apilados sobre la jugada que los provocó
  { type: "trigger_apilado", jugador: "A", cardInstanceId: "c1", trigger: "al-jugar-mistica", efectoIdx: 0 },
  // F9c: scry (mirar y ordenar el tope del mazo)
  { type: "mazo_mirado", jugador: "A", cantidad: 3 },
  { type: "mazo_ordenado", jugador: "A", arriba: 2, fondo: 1 },
  // F9d: redirect (cambiar el objetivo de la entrada inferior de la pila)
  { type: "objetivo_redirigido", jugador: "B", cardInstanceId: "c1", objetivoId: "c2" }
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
    case "tramo_disparado":
      return;
    case "exhaust_fijado":
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
    case "exilio_prevenido":
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
    case "activacion_negada":
      return;
    case "efectos_negados":
      return;
    case "trigger_apilado":
      return;
    case "mazo_mirado":
      return;
    case "mazo_ordenado":
      return;
    case "objetivo_redirigido":
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
  const cantidadFavorables = Object.keys(asignacionesFavorables).length;
  if (cantidadFavorables > 0) {
    return cantidadFavorables === Object.keys(asignaciones).length ? { type: "declarar_bloqueo", asignaciones: asignacionesFavorables } : declararBloqueo;
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
  const cantidadFavorables = Object.keys(asignacionesFavorables).length;
  if (cantidadFavorables > 0) {
    return cantidadFavorables === Object.keys(asignaciones).length ? { type: "declarar_bloqueo", asignaciones: asignacionesFavorables } : declararBloqueo;
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
  if (state.declaracionEnEleccion) {
    if (actorActual(state) !== playerId) return null;
    return getValidActions(state, playerId).find((a) => a.type === "elegir_objetivo") ?? null;
  }
  if (electorAjeno(state)) {
    if (actorActual(state) !== playerId) return null;
    return getValidActions(state, playerId).find((a) => a.type === "elegir_objetivo") ?? null;
  }
  if (scryActual(state)) {
    if (actorActual(state) !== playerId) return null;
    return getValidActions(state, playerId).find((a) => a.type === "ordenar_mazo") ?? null;
  }
  const cadena = cadenaActiva(state);
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
function simularPartida(deckA, deckB, seed, maxTurnos = 1e3, dificultadA = "facil", dificultadB = "facil") {
  const { state, ctx } = createInitialState(deckA, deckB, seed);
  const eventos = [];
  let iteraciones = 0;
  let estado = state;
  while (estado.fase !== "terminada" && iteraciones < maxTurnos) {
    const actor = actorActual(estado) ?? estado.turno;
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
  TRIGGERS_APILABLES,
  actorActual,
  apilarTriggers,
  aplicarMod,
  aplicarPago,
  aporteDe,
  applyAction,
  atacantesElegibles,
  bloqueadoresDisponibles,
  bloquearEter,
  botTonto,
  cadenaActiva,
  campeonNecesitaEterBloqueado,
  campeonesSacrificables,
  construirTriggers,
  copiasEnCampo,
  costeEterHabilidad,
  createCtx,
  createCtxFromDraws,
  createInitialState,
  dispararTrigger,
  dispararUmbralBloqueo,
  efectoBloqueoAccion,
  ejecutarTramo,
  esArcana,
  esBloqueoFijo,
  esCampeon,
  esEter,
  esMistica,
  esSingular,
  esTriggerApilable,
  esVinculo,
  exhaustFijado,
  faccionesCompartidas,
  getCardMeta,
  getValidActions,
  hastaAlba,
  keywordsDe,
  limiteSlots,
  limpiarRegistroEfectos,
  maxEterBloqueado,
  ordenResolucion,
  otorgarKeyword,
  parejasBloqueoOpcion,
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
  validarDeck,
  validarExhaustividadEventos,
  validarPago,
  validarPasarPrioridad,
  validarResponderCadena,
  verificarInvariantes,
  verificarZonaUnica,
  visibleState
};
