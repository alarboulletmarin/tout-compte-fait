/* ============================================================================
 * Ce que pèse le premier chargement, et le budget qui le tient.
 *
 * Un découpage par route ne se maintient pas tout seul : il suffit d'un import
 * statique posé dans le mauvais fichier pour ramener un écran entier dans le
 * bundle de tout le monde, sans que rien ne le dise. C'est arrivé au nuancier,
 * neuf cents lignes de route de développement que chaque visiteur téléchargeait.
 *
 * Ce que le script mesure est le **graphe initial** — le module d'entrée et
 * tout ce qu'il importe statiquement, tel que `index.html` le déclare — et non
 * la somme de `dist/`. Un morceau chargé à la demande ne coûte rien tant que
 * personne n'ouvre l'écran qui le demande, et l'additionner masquerait
 * précisément ce qu'on cherche à voir.
 *
 * Compressé, parce que c'est ce qui voyage : tout hébergeur sert ces fichiers
 * en gzip ou mieux, et la taille brute ne dit rien de l'attente réelle.
 * ==========================================================================*/

import { gzipSync } from 'node:zlib'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist'

/* Le budget, en kibioctets compressés.

   L'app en pèse 202 au moment où ce chiffre est posé : la marge est de huit,
   c'est-à-dire de quoi ajouter une fonctionnalité mais pas de quoi ramener un
   écran entier — les quatre qui se chargent à la demande pèsent de 2 à 5 Kio
   chacun. C'est un garde-fou, pas un objectif à raser.

   Le dépasser n'est pas interdit : c'est une décision, et elle se prend en
   changeant ce chiffre, dans un commit qui dit pourquoi. Celui-ci le dit : les
   palettes coûtent 2,3 Kio, dont 1,3 pour `styles/palettes.css` — cinq
   identités de plus sur la couche de tokens — et le reste pour le réglage qui
   les choisit, qui doit être lu avant le premier pixel. Le budget était à 200
   et l'app à 199,9 : il ne restait plus de quoi ajouter quoi que ce soit, ce qui
   n'est pas la marge que ce chiffre est censé tenir.

   Relevé à 214 pour les **supports d'épargne**. Ce que le chantier ajoute au
   graphe initial n'est pas un écran — la fiche d'un support, ses formulaires et
   la courbe de son historique partent à la demande, avec le tracé SVG qu'ils
   emportent — mais un **domaine** : le stock, à côté du flux. `domain/saving.ts`
   et ses sélecteurs sont lus par le tableau de bord, la page Épargne et la
   saisie ; le choix d'un support remplace celui d'une catégorie dans le
   formulaire quotidien, et il faut donc qu'il soit là avec lui. Le reste est la
   prose : une trentaine de chaînes d'interface, que `fr.ts` porte avant le
   premier rendu. Quatre kibioctets de plus, dont on retrouve la marge d'usage —
   de quoi ajouter une fonctionnalité, pas de quoi ramener un écran.

   Relevé à 217 pour le **rangement de « Plus »**, et deux kibioctets en sont la
   mesure exacte. L'écran a absorbé la page d'entrée des réglages, qui se
   chargeait à la demande ; lui ne le peut pas — c'est un onglet de la barre, et
   un aller-retour de réseau pour l'atteindre coûterait plus que ce qu'il pèse.
   Un demi-kibioctet pour ce déplacement : le sélecteur de devise, les noms des
   thèmes et des palettes, quatre groupes de rangées au lieu de deux.

   Un kibioctet et demi pour les **repères**, et c'est la dépense qu'il faut
   assumer explicitement : chaque rangée porte le glyphe de sa destination, donc
   sept définitions Phosphor remontent dans le graphe initial — les personnes,
   les catégories, l'apparence, le stockage, le transfert, la devise, « à
   propos ». Elles ne se chargeaient jusqu'ici qu'avec les écrans qui les
   ouvrent. C'est le prix d'un écran qu'on parcourt à l'œil : sous 1024px la
   barre ne porte que quatre glyphes, et tout ce qu'elle range se lisait en
   texte seul.

   Le budget ne suit pas la mesure au plus juste — il resterait un dixième de
   kibioctet, ce qui n'est plus une marge mais un plafond.

   Relevé à 221 quand l'épargne se met à **répondre**, après avoir seulement
   enregistré : les mois de charges que le capital couvre, et le cumul des
   versements d'une année sur l'autre. L'app en pèse 216,5 à ce moment-là.

   Ce que ce chantier ajoute au graphe initial est plus petit que son étiquette :
   deux lectures de domaine — une série mensuelle consciente des natures et le
   quotient qu'elle nourrit —, lues par la page Épargne, qui est chargée
   d'avance ; et la prose, qui pèse le reste. Le **graphique n'y est pas**, et
   c'est délibéré : la section qui trace l'année part à la demande
   (`SavingsPage`), et les lignes cumulées qu'elle partage avec l'historique
   vivent dans un morceau à elles. Mesuré sans ce découpage, le premier
   chargement prenait quatre kibioctets de plus — pour un bloc qui vit sous le
   pli, et davantage que tout le reste du chantier réuni.

   Le chiffre est donc relevé pour la **marge**, pas pour le poids. Le paragraphe
   précédent l'avait laissée à un dixième de kibioctet, ce qu'il nomme lui-même
   un plafond plutôt qu'une marge ; elle revient à quatre et demi. Ce que ce
   nombre tient n'est pas ce que l'app pèse, c'est la place qui reste — de quoi
   ajouter une fonctionnalité, pas de quoi ramener un écran.

   Relevé à 224 pour la **seconde langue**, et deux kibioctets et demi en sont la
   mesure exacte : l'app pèse 217,6 avec les projections et 220,2 une fois
   l'anglais possible. Le catalogue anglais lui-même n'y est pour rien — il fait
   seize kibioctets et part à la demande, comme les quatre catalogues d'écran,
   qui emportent chacun leurs deux langues. Ce qui reste est ce qui doit être lu
   avant le premier pixel : le catalogue actif et son abonnement, la détection et
   le miroir de la langue, le glyphe du réglage, et surtout les branchements de
   `format.ts` — séparateur, place du symbole, unités, ordinaux. Ces derniers ne
   sont pas de la traduction mais des règles, et elles pèsent partout où un
   montant s'affiche.

   La marge retombait à huit dixièmes, c'est-à-dire au plafond que ce fichier
   refuse deux fois plus haut. Elle revient à près de quatre — la même qu'avant
   ce chantier, ce qui est le seul repère honnête : une langue de plus ne doit
   pas se payer sur la place qui reste aux suivantes.

   Relevé à 229 pour le **plafond qui retient**, et deux kibioctets en sont la
   mesure : l'app pèse 223,1 avant, 225,0 après. Le plafond de versements
   existait déjà dans le document et sur deux écrans qui, eux, se chargent à la
   demande — la fiche d'un support l'affichait, le simulateur écrêtait ses
   versements. Ce qui remonte ici, c'est qu'il **retient la saisie** : verser
   50 € sur un livret plein passait sans un mot, et une règle mensuelle
   continuait d'en poser au-delà de ce que le contrat autorise. Le refus vit
   donc là où le geste se fait — le formulaire quotidien, qui est chargé
   d'avance —, et avec lui la règle du domaine (`domain/savingCap.ts`),
   l'écrêtage des échéances à la génération d'un mois, et l'encadré qui chiffre
   le dépassement et porte ses deux sorties. Le reste est la prose : une
   quinzaine de chaînes, que `fr.ts` porte avant le premier rendu.

   Un plafond qu'on saisit et que rien ne fait respecter se lit comme un réglage
   sans effet, ce qui est pire que pas de champ du tout : c'est la dépense que
   ce chantier assume, et elle tombe sur l'écran le plus lu de l'app parce que
   c'est le seul endroit où elle sert.

   La marge était retombée à neuf dixièmes — le plafond que ce fichier refuse
   deux fois plus haut. Elle revient à quatre. */
const BUDGET_KIB = 229

const kib = (bytes) => bytes / 1024
const format = (bytes) => `${kib(bytes).toFixed(1)} Kio`

function initialGraph() {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8')
  /* Le module d'entrée et ses préchargements : c'est le navigateur qui les
     réclame avant le premier pixel, et c'est donc la définition de « initial »
     qui compte. Rolldown les déclare tous les deux ici. */
  const entry = [...html.matchAll(/<script[^>]+src="\/([^"]+)"/g)].map((m) => m[1])
  const preloaded = [...html.matchAll(/<link[^>]+modulepreload[^>]+href="\/([^"]+)"/g)].map(
    (m) => m[1],
  )
  const styles = [...html.matchAll(/<link[^>]+stylesheet[^>]+href="\/([^"]+)"/g)].map((m) => m[1])
  return [...entry, ...preloaded, ...styles]
}

function measure(files) {
  return files
    .map((file) => {
      const bytes = readFileSync(join(DIST, file))
      return { file, raw: bytes.length, gzip: gzipSync(bytes).length }
    })
    .sort((a, b) => b.gzip - a.gzip)
}

function onDemand(initial) {
  const known = new Set(initial)
  return readdirSync(join(DIST, 'assets'))
    .filter((name) => name.endsWith('.js') || name.endsWith('.css'))
    .map((name) => `assets/${name}`)
    .filter((file) => !known.has(file))
}

const initial = initialGraph()
if (initial.length === 0) {
  console.error('Aucun module d’entrée trouvé dans dist/index.html — le build a-t-il tourné ?')
  process.exit(1)
}

const measured = measure(initial)
const total = measured.reduce((sum, part) => sum + part.gzip, 0)
const raw = measured.reduce((sum, part) => sum + part.raw, 0)

console.log('Premier chargement — le module d’entrée et ce qu’il importe :\n')
for (const part of measured) {
  console.log(`  ${format(part.gzip).padStart(11)} compressé   ${part.file}`)
}
console.log(`\n  ${format(total).padStart(11)} compressé au total (${format(raw)} brut)`)
console.log(`  ${String(BUDGET_KIB).padStart(6)},0 Kio de budget\n`)

const lazy = measure(onDemand(initial))
if (lazy.length > 0) {
  console.log('À la demande, et donc hors budget :\n')
  for (const part of lazy) {
    console.log(`  ${format(part.gzip).padStart(11)} compressé   ${part.file}`)
  }
  console.log('')
}

if (kib(total) > BUDGET_KIB) {
  console.error(
    `Le premier chargement dépasse le budget de ${format(total - BUDGET_KIB * 1024)}.\n` +
      'Un écran entier est probablement revenu dans le bundle de tout le monde : ' +
      'chercher un import statique vers une route, et le passer en `lazy` ' +
      '(voir `src/app/Routes.tsx`). Si le poids est voulu, relever le budget ici.',
  )
  process.exit(1)
}

console.log(`Dans le budget, avec ${format(BUDGET_KIB * 1024 - total)} de marge.`)
