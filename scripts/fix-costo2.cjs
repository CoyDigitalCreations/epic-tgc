const fs = require('fs');
let content = fs.readFileSync('src/shared/data/paquetes.ts', 'utf8');

// Replace costoMax/costoTipo patterns in efectos arrays
// Pattern: 'costoMax':X,'costoTipo':'Y' (single quotes, inside efectos arrays)
content = content.replace(/'costoMax':(\d+),'costoTipo':'(\w+)'/g, "'costo':{'tipo':'$2','cantidad':$1}");

fs.writeFileSync('src/shared/data/paquetes.ts', content);
console.log('Fixed remaining costoMax/costoTipo in efectos arrays');
