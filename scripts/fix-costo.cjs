const fs = require('fs');
let content = fs.readFileSync('src/shared/data/paquetes.ts', 'utf8');

// Replace "costoMax":X,"costoTipo":"Y" with "costo":{"tipo":"Y","cantidad":X}
content = content.replace(/"costoMax":(\d+),"costoTipo":"(\w+)"/g, '"costo":{"tipo":"$2","cantidad":$1}');

fs.writeFileSync('src/shared/data/paquetes.ts', content);
console.log('Migrated costoMax/costoTipo to costo object in paquetes.ts');
