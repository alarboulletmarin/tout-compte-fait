/* ============================================================================
 * L'inventaire des classes que l'app pose réellement.
 *
 * Il sert à une seule chose : écrire la couche d'utilitaires à la main sans en
 * oublier une, et sans en écrire une seule qui ne serve à personne. Une classe
 * absente casse un écran en silence ; une classe en trop est du poids mort que
 * rien ne signale.
 *
 * Il ne lit pas que les littéraux `class="…"` : `cn()` reçoit des morceaux de
 * chaînes conditionnels, et une classe qui n'apparaît que dans une branche
 * ternaire compte autant que les autres. On ratisse donc **toute** chaîne du
 * source qui a la forme d'une liste de classes, ce qui ramène du bruit — un
 * mot isolé, un identifiant — que le recoupement avec le CSS produit élimine :
 * ce qui n'est pas une classe n'y a pas de règle.
 *
 *   node scripts/classes.mjs            → la liste, une par ligne
 *   node scripts/classes.mjs --count    → le compte par famille
 * ==========================================================================*/

import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const SRC = path.join(ROOT, 'src')

/** Tous les fichiers de source qui peuvent porter une classe. */
function sources(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) {
      out.push(...sources(full))
      continue
    }
    if (/\.(tsx|ts)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(full)
  }
  return out
}

/* Ce qui a la forme d'une classe utilitaire : des minuscules, des chiffres,
   des tirets, et les quatre ponctuations que les variantes emploient — le
   deux-points d'une variante, le point d'une fraction, le crochet d'une valeur
   arbitraire, la barre d'une opacité. */
const CLASS = /^[a-z0-9:[\]/.\-_&>*+()'"#%,\s]+$/

const found = new Set()
for (const file of sources(SRC)) {
  const code = readFileSync(file, 'utf8')
  for (const [, quoted] of code.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`\n]*)`/g)) {
    void quoted
  }
  /* Les trois formes de littéral, prises ensemble : une classe peut vivre dans
     l'une quelconque des trois. */
  for (const match of code.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`\n$]*)`/g)) {
    const raw = match[1] ?? match[2] ?? match[3] ?? ''
    if (raw.trim() === '' || !CLASS.test(raw)) continue
    for (const token of raw.trim().split(/\s+/)) {
      if (token !== '') found.add(token)
    }
  }
}

const list = [...found].sort()

if (process.argv.includes('--count')) {
  const families = new Map()
  for (const cls of list) {
    const bare = cls.includes(':') ? (cls.split(':').at(-1) ?? cls) : cls
    const family = /^-?([a-z]+)/.exec(bare)?.[1] ?? '?'
    families.set(family, (families.get(family) ?? 0) + 1)
  }
  for (const [family, n] of [...families].sort((a, b) => b[1] - a[1])) {
    console.log(`${String(n).padStart(4)}  ${family}`)
  }
  console.log(`\n${String(list.length)} jetons`)
} else {
  for (const cls of list) console.log(cls)
}
