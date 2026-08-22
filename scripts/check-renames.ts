import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const cards = JSON.parse(readFileSync(resolve(process.cwd(), 'seed', 'EstasisDisonancia-clean.json'), 'utf8'))
const paq = readFileSync(resolve(process.cwd(), 'src', 'shared', 'data', 'paquetes.ts'), 'utf8')

for (const c of cards) {
  if (!c.efectoDisparo) continue
  const idx = paq.indexOf(`id: '${c.id}'`)
  if (idx === -1) continue
  const block = paq.substring(idx, idx + 1500)
  
  const hasContinuo = block.includes('efectoContinuo')
  const hasDisparo = /efectoDisparo\s*:/.test(block)
  
  if (hasContinuo && !hasDisparo) {
    console.log(`${c.id} (${c.name}): RENAME efectoContinuo → efectoDisparo`)
  } else if (!hasContinuo && !hasDisparo) {
    console.log(`${c.id} (${c.name}): ADD efectoDisparo (no tiene efectoContinuo)`)
  } else if (hasContinuo && hasDisparo) {
    console.log(`${c.id} (${c.name}): HAS BOTH — needs cleanup`)
  }
}
