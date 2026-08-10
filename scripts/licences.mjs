/* ============================================================================
 * Les licences de ce qui voyage dans l'app publiée.
 *
 * La plupart sont sous MIT, quelques-uns sous ISC ou BSD, et **deux sous SIL
 * Open Font License 1.1** — Archivo et Geist Mono. L'OFL n'est la licence ni du
 * dépôt ni d'aucun de ces paquets-là, et elle pose sa condition sur des
 * fichiers qui ne sont pas du code : le logiciel de fonte, modifié ou non, se
 * distribue **avec le texte de sa licence et sa notice de copyright**. Or les
 * `.woff2` sont empaquetés dans `dist/assets/` et servis à chaque visite. Sans
 * ce fichier-là, l'app distribuait deux fontes sans leur licence.
 *
 * Le préambule qu'il porte sert une seconde fin depuis que le dépôt est sous
 * AGPL : il nomme la licence de l'app et l'adresse de sa source, dans un
 * fichier servi avec elle. L'article 13 demande que le programme offre sa
 * source à qui s'en sert, et un `LICENSE` resté sur GitHub ne le fait pas.
 *
 * Il est **produit, jamais écrit à la main** : une seconde liste de licences
 * recopiée à côté du `node_modules` divergerait au premier `npm update`, et
 * c'est celle qu'on ne relit jamais qui resterait fausse. C'est la règle du
 * `schemaDoc` et de la version de l'app, appliquée ici.
 *
 * La sortie vit dans `public/`, donc Vite la copie dans `dist/` : elle voyage
 * avec les fontes qu'elle couvre, ce qui est exactement ce que l'OFL demande.
 * En `.txt` et non en `.md` : un navigateur affiche l'un et télécharge l'autre,
 * et une licence qu'il faut télécharger pour lire n'est pas mise à disposition.
 *
 * `--check` rejoue la génération sans écrire et échoue si le fichier commité a
 * pris du retard. C'est ce que `npm run verify` appelle : le jour où une
 * dépendance change de licence, la porte de sortie crie avant que le dépôt ne
 * mente.
 * ==========================================================================*/

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const OUT = 'public/licences-tierces.txt'

/* L'adresse de la source, lue sur le manifeste et non recopiée : c'est l'offre
   que l'article 13 de l'AGPL demande, et une URL fausse dans un fichier servi
   avec l'app serait pire que pas d'URL du tout. Le `git+` et le `.git` sont la
   forme que npm attend, pas celle qu'on ouvre dans un navigateur. */
const REPO_URL = JSON.parse(readFileSync('package.json', 'utf8'))
  .repository.url.replace(/^git\+/, '')
  .replace(/\.git$/, '')

/* Le nom du fichier de licence n'est normalisé nulle part : chaque paquet
   choisit sa casse, son extension — et son orthographe : `decimal.js-light`,
   qui voyage avec le graphique de la simulation, la nomme `LICENCE.md`. On les
   essaie dans l'ordre du plus courant, et on échoue bruyamment plutôt que
   d'omettre une notice. */
const LICENSE_FILES = [
  'LICENSE',
  'LICENSE.md',
  'LICENSE.txt',
  'LICENCE',
  'LICENCE.md',
  'LICENCE.txt',
  'license',
  'license.md',
]

/**
 * Les paquets qui voyagent vraiment.
 *
 * Les `dependencies` du manifeste et, transitivement, les leurs : `react-dom`
 * embarque `scheduler`, `react-router` embarque `cookie`. Les
 * `devDependencies` sont exclues — elles construisent l'app, elles ne partent
 * pas avec elle, et les inscrire ferait passer pour distribué ce qui ne l'est
 * pas.
 */
function shippedPackages() {
  const root = JSON.parse(readFileSync('package.json', 'utf8'))
  const found = new Map()

  const visit = (name) => {
    if (found.has(name)) return
    const dir = join('node_modules', name)
    if (!existsSync(join(dir, 'package.json'))) {
      throw new Error(`Paquet absent de node_modules : ${name}. Lance « npm ci » d'abord.`)
    }
    const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    found.set(name, { dir, manifest })
    for (const dependency of Object.keys(manifest.dependencies ?? {})) visit(dependency)
  }

  for (const dependency of Object.keys(root.dependencies ?? {})) visit(dependency)
  return [...found.entries()].sort(([a], [b]) => a.localeCompare(b, 'en'))
}

/** Le fichier de licence posé à la racine d'un dossier, s'il y en a un. */
function licenseFileIn(dir) {
  for (const file of LICENSE_FILES) {
    const path = join(dir, file)
    if (existsSync(path)) return readFileSync(path, 'utf8').trimEnd()
  }
  return null
}

/**
 * Les licences qu'un paquet **recopie** plutôt que d'en porter une.
 *
 * `victory-vendor` — que le graphique de la simulation emmène par `recharts` —
 * republie les bibliothèques d3 dans `lib-vendor/`, chacune avec sa licence, et
 * n'en pose aucune à sa racine. Les notices qui doivent voyager sont donc
 * exactement celles-là : c'est leur code qui est servi au navigateur, sous le
 * nom de leur hôte.
 *
 * Un seul niveau de profondeur, et nommé : « voici les licences trouvées
 * quelque part dans l'arborescence » ne serait pas une notice, ce serait une
 * trouvaille.
 */
function vendoredLicenses(dir) {
  const vendor = join(dir, 'lib-vendor')
  if (!existsSync(vendor)) return null
  const parts = readdirSync(vendor, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ name: entry.name, text: licenseFileIn(join(vendor, entry.name)) }))
    .filter((part) => part.text !== null)
    .map((part) => `--- ${part.name} ---\n\n${part.text}`)
  return parts.length === 0 ? null : parts.join('\n\n')
}

function licenseTextOf(dir, name) {
  const own = licenseFileIn(dir) ?? vendoredLicenses(dir)
  if (own !== null) return own
  /* Aucun repli : une notice manquante est le problème que ce fichier existe
     pour régler, et la remplacer par « voir le paquet » ne la rend pas. */
  throw new Error(`Aucun fichier de licence trouvé pour ${name} dans ${dir}.`)
}

const RULE = '='.repeat(78)

function render(packages) {
  const lines = [
    'Licences des composants tiers — Tout compte fait',
    RULE,
    '',
    'Tout compte fait est publié sous licence GNU Affero General Public License,',
    'version 3 ou ultérieure. Le texte intégral est dans le fichier LICENSE du',
    `dépôt, et la source complète du programme tel qu’il tourne est ici :`,
    '',
    `  ${REPO_URL}`,
    '',
    'Les composants ci-dessous sont l’œuvre de tiers, portent leur propre licence,',
    'et voyagent dans la version publiée de l’app : leur code ou leurs fichiers de',
    'fonte sont servis au navigateur de qui l’ouvre.',
    '',
    'Deux d’entre eux — les fontes Archivo et Geist Mono — sont sous SIL Open Font',
    'License 1.1, qui demande que le logiciel de fonte soit distribué avec sa',
    'licence et sa notice de copyright. C’est la raison première de ce fichier.',
    '',
    'Il est produit depuis « node_modules » par « npm run licences », jamais écrit',
    'à la main, et « npm run verify » échoue s’il a pris du retard.',
    '',
    RULE,
    '',
  ]

  for (const [name, { manifest }] of packages) {
    lines.push(`  ${name} ${manifest.version} — ${manifest.license ?? 'licence non déclarée'}`)
  }

  lines.push('')
  for (const [name, { dir, manifest }] of packages) {
    lines.push(
      '',
      RULE,
      `${name} ${manifest.version}`,
      `Licence déclarée : ${manifest.license ?? 'non déclarée'}`,
      ...(typeof manifest.homepage === 'string' ? [`Page du projet : ${manifest.homepage}`] : []),
      RULE,
      '',
      licenseTextOf(dir, name),
      '',
    )
  }

  return `${lines.join('\n').trimEnd()}\n`
}

const expected = render(shippedPackages())

if (process.argv.includes('--check')) {
  const actual = existsSync(OUT) ? readFileSync(OUT, 'utf8') : ''
  if (actual !== expected) {
    console.error(
      `${OUT} n’est plus à jour. Lance « npm run licences » et commite le résultat.`,
    )
    process.exit(1)
  }
  console.log(`${OUT} — à jour.`)
} else {
  writeFileSync(OUT, expected)
  console.log(`${OUT} — écrit.`)
}
