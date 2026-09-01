const fs = require('fs');
let content = fs.readFileSync('src/shared/data/paquetes.ts', 'utf8');

// Replace catHabilidad: 'xxx' with catHabilidad: ['xxx']
content = content.replace(/catHabilidad: '([^']+)'/g, "catHabilidad: ['$1']");

fs.writeFileSync('src/shared/data/paquetes.ts', content);
console.log('Migrated catHabilidad to arrays in paquetes.ts');
