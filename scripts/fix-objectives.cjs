const fs = require('fs');
let content = fs.readFileSync('src/shared/data/paquetes.ts', 'utf8');

// Replace in JSON strings (double quotes, no space after colon)
const jsonReplacements = [
  ['"objetivo":"campeon_propio"', '"objetivo":{ "tipo":"campeon","controlador":"propio","zona":"campo" }'],
  ['"objetivo":"campeon_rival"', '"objetivo":{ "tipo":"campeon","controlador":"rival","zona":"campo" }'],
  ['"objetivo":"mistica_rival"', '"objetivo":{ "tipo":"mistica","controlador":"rival","zona":"campo" }'],
  ['"objetivo":"arcana_rival"', '"objetivo":{ "tipo":"arcana","controlador":"rival","zona":"campo" }'],
  ['"objetivo":"todos_campeones_propios"', '"objetivo":{ "tipo":"campeon","controlador":"propio","zona":"campo" }'],
  ['"objetivo":"todos_campeones_rivales"', '"objetivo":{ "tipo":"campeon","controlador":"rival","zona":"campo" }'],
  ['"objetivo":"cementerio_propio"', '"objetivo":{ "tipo":"campeon","controlador":"propio","zona":"cementerio" }'],
  ['"objetivo":"cementerio_rival"', '"objetivo":{ "tipo":"campeon","controlador":"rival","zona":"cementerio" }'],
  ['"objetivo":"exilio_propio"', '"objetivo":{ "tipo":"campeon","controlador":"propio","zona":"exilio" }'],
  ['"objetivo":"exilio_rival"', '"objetivo":{ "tipo":"campeon","controlador":"rival","zona":"exilio" }'],
  ['"objetivo":"carta_mazo"', '"objetivo":{ "tipo":"carta","controlador":"propio","zona":"mazo" }'],
  ['"objetivo":"rival_hand"', '"objetivo":{ "tipo":"mano","controlador":"rival","zona":"mano" }'],
  ['"objetivo":"ether_pagado_rival"', '"objetivo":{ "tipo":"eter","controlador":"rival","zona":"pagado" }'],
  ['"objetivo":"self"', '"objetivo":{ "tipo":"self","controlador":"propio","zona":"campo" }'],
  // Also match single-quote versions in efectos arrays
  ["'objetivo':'campeon_propio'", "'objetivo':{ 'tipo':'campeon','controlador':'propio','zona':'campo' }"],
  ["'objetivo':'campeon_rival'", "'objetivo':{ 'tipo':'campeon','controlador':'rival','zona':'campo' }"],
  ["'objetivo':'mistica_rival'", "'objetivo':{ 'tipo':'mistica','controlador':'rival','zona':'campo' }"],
  ["'objetivo':'arcana_rival'", "'objetivo':{ 'tipo':'arcana','controlador':'rival','zona':'campo' }"],
  ["'objetivo':'todos_campeones_propios'", "'objetivo':{ 'tipo':'campeon','controlador':'propio','zona':'campo' }"],
  ["'objetivo':'todos_campeones_rivales'", "'objetivo':{ 'tipo':'campeon','controlador':'rival','zona':'campo' }"],
  ["'objetivo':'cementerio_propio'", "'objetivo':{ 'tipo':'campeon','controlador':'propio','zona':'cementerio' }"],
  ["'objetivo':'cementerio_rival'", "'objetivo':{ 'tipo':'campeon','controlador':'rival','zona':'cementerio' }"],
  ["'objetivo':'exilio_propio'", "'objetivo':{ 'tipo':'campeon','controlador':'propio','zona':'exilio' }"],
  ["'objetivo':'exilio_rival'", "'objetivo':{ 'tipo':'campeon','controlador':'rival','zona':'exilio' }"],
  ["'objetivo':'carta_mazo'", "'objetivo':{ 'tipo':'carta','controlador':'propio','zona':'mazo' }"],
  ["'objetivo':'rival_hand'", "'objetivo':{ 'tipo':'mano','controlador':'rival','zona':'mano' }"],
  ["'objetivo':'ether_pagado_rival'", "'objetivo':{ 'tipo':'eter','controlador':'rival','zona':'pagado' }"],
  ["'objetivo':'self'", "'objetivo':{ 'tipo':'self','controlador':'propio','zona':'campo' }"],
];

let count = 0;
for (const [old, rep] of jsonReplacements) {
  const n = content.split(old).length - 1;
  count += n;
  content = content.split(old).join(rep);
}

fs.writeFileSync('src/shared/data/paquetes.ts', content);
console.log('Replaced ' + count + ' objective strings in paquetes.ts');
