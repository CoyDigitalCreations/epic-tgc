const fs = require('fs');
let content = fs.readFileSync('src/shared/data/paquetes.ts', 'utf8');

// Replace condicion: 'string' with condicion: { trigger: "ninguno", condiciones: [] }
// Pattern: condicion: 'text' (single quotes)
content = content.replace(/condicion:\s*'([^']+)'/g, "condicion:{\"trigger\":\"ninguno\",\"condiciones\":[]}");

fs.writeFileSync('src/shared/data/paquetes.ts', content);
console.log('Fixed condicion strings to objects in paquetes.ts');
