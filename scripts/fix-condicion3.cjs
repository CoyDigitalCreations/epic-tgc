const fs = require('fs');
let content = fs.readFileSync('src/shared/data/paquetes.ts', 'utf8');

// Revert: change condicion objects back to strings for ArcanaCard level
// Pattern: condicion:{"trigger":"ninguno","condiciones":[]} → condicion: 'original text'
// This is tricky because we lost the original text. Let's just make condicion optional in ArcanaCard.

// Actually, the simpler fix is to make condicion in ArcanaCard accept both string and CondicionEfecto
// But that's a schema change. For now, let's just remove the condicion field from ArcanaCard level
// since it's a legacy field anyway.

// The real fix: condicion at ArcanaCard level should stay as string (legacy)
// The regex incorrectly converted it. Let's revert by reading the original.
// Since we can't recover the original text, let's just set condicion to empty string.

content = content.replace(/condicion:\{"trigger":"ninguno","condiciones":\[\]\}/g, "condicion:''");

fs.writeFileSync('src/shared/data/paquetes.ts', content);
console.log('Reverted condicion objects back to empty strings');
