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
 * Le recoupement est aussi une **vérification** : `--check` échoue quand une
 * classe posée par le source n'a aucune règle en face. C'est la seule façon de
 * voir cette panne-là, qui ne casse ni la compilation ni un test — elle laisse
 * l'écran s'afficher, simplement de travers. Trois l'avaient traversée : le
 * fond d'un glissé réduit à la hauteur de son texte faute d'`inset-y-0`, une
 * gouttière de rangée absente, un anneau de focus qui ne peignait rien.
 *
 *   node scripts/classes.mjs            → la liste, une par ligne
 *   node scripts/classes.mjs --count    → le compte par famille
 *   node scripts/classes.mjs --check    → échoue sur une classe sans règle
 * ==========================================================================*/

import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const SRC = path.join(ROOT, 'src')
const STYLES = path.join(SRC, 'styles')

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
/* Chaque littéral retenu, avec le fichier d'où il vient : `--check` en a besoin
   pour dire *où* corriger, et pour peser une liste entière plutôt qu'un jeton
   isolé. */
const literals = []
for (const file of sources(SRC)) {
  const code = readFileSync(file, 'utf8')
  /* Les trois formes de littéral, prises ensemble : une classe peut vivre dans
     l'une quelconque des trois. */
  for (const match of code.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`\n$]*)`/g)) {
    const raw = match[1] ?? match[2] ?? match[3] ?? ''
    if (raw.trim() === '' || !CLASS.test(raw)) continue
    const tokens = raw.trim().split(/\s+/).filter((token) => token !== '')
    for (const token of tokens) found.add(token)
    literals.push({ file: path.relative(ROOT, file), tokens })
  }
}

const list = [...found].sort()

/* ---------------------------------------------------------------------------
 * Le recoupement avec les règles écrites.
 * ------------------------------------------------------------------------- */

/** Toutes les feuilles du dossier de styles, bout à bout. */
function stylesheet() {
  return readdirSync(STYLES)
    .filter((name) => name.endsWith('.css'))
    .map((name) => readFileSync(path.join(STYLES, name), 'utf8'))
    .join('\n')
}

/* L'échappement CSS d'un nom de classe : tout ce qui n'est ni lettre, ni
   chiffre, ni tiret, ni souligné se préfixe d'une contre-oblique. C'est la
   convention qu'emploie la couche d'utilitaires, héritée de la librairie qui
   l'écrivait avant. */
const escaped = (cls) => cls.replaceAll(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`)

/* Ce qui peut suivre un sélecteur de classe : la fin du sélecteur, une
   virgule, une accolade, un combinateur, une pseudo-classe, ou la parenthèse
   fermante d'un `:where(…)` — c'est sous cette dernière forme que vit `peer`,
   qui n'a jamais de règle à son nom. */
const AFTER = [' ', ',', '{', ':', '\n', '>', ')']

/**
 * Cette classe a-t-elle une règle quelque part ?
 *
 * La recherche est textuelle, et c'est suffisant : ces feuilles sont écrites à
 * la main, un sélecteur y tient sur une ligne, et la question posée n'est pas
 * « quelle règle s'applique » mais « en existe-t-il une ».
 */
function ruled(css, cls) {
  const selector = `.${escaped(cls)}`
  return AFTER.some((end) => css.includes(selector + end))
}

if (process.argv.includes('--check')) {
  const css = stylesheet()
  const known = new Map()
  const has = (cls) => {
    const seen = known.get(cls)
    if (seen !== undefined) return seen
    const answer = ruled(css, cls)
    known.set(cls, answer)
    return answer
  }

  /* Le tri du bruit : on ne juge que les littéraux qui *sont* des listes de
     classes, et on le reconnaît au fait que la plupart de leurs jetons en
     sont. Une phrase, un identifiant, un gabarit d'URL n'y arrivent jamais ;
     une liste de dix classes dont une manque, si. Le seuil est aux trois
     cinquièmes, et deux jetons au moins — en dessous, un mot isolé qui aurait
     par hasard le nom d'une classe suffirait à faire passer son voisin pour un
     oubli. */
  const missing = new Map()
  for (const { file, tokens } of literals) {
    if (tokens.length < 2) continue
    const rules = tokens.filter(has).length
    if (rules * 5 < tokens.length * 3) continue
    for (const token of tokens) {
      if (has(token)) continue
      const where = missing.get(token) ?? new Set()
      where.add(file)
      missing.set(token, where)
    }
  }

  if (missing.size === 0) {
    console.log(`${String(list.length)} jetons relevés, aucune classe sans règle.`)
  } else {
    console.error(`${String(missing.size)} classe(s) posée(s) sans aucune règle en face :\n`)
    for (const [cls, files] of [...missing].sort()) {
      console.error(`  ${cls.padEnd(36)} ${[...files].sort().join(', ')}`)
    }
    console.error(`\nÉcris-les dans src/styles/utilities.css, ou retire-les du source.`)
    process.exitCode = 1
  }
} else if (process.argv.includes('--count')) {
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
