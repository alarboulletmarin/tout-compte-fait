/* ============================================================================
 * Toute la prose de la présentation, et le seul endroit où elle s'écrit.
 *
 * **Pourquoi pas dans `fr.ts`.** La même raison que `i18n/legal.ts`, et elle
 * est mesurable : `fr.ts` est importé par presque tous les composants, donc il
 * vit dans le graphe initial que `scripts/size.mjs` plafonne à 200 Kio. Cette
 * page-ci, elle, se charge à la demande (`app/App.tsx`) et personne ne la relit
 * après avoir démarré — sa prose n'a aucune raison de voyager avec
 * l'écran du mois. Elle pesait pourtant dans le budget de tout le monde, et
 * l'audit du 2026-08-06 en demande trois sections de plus.
 *
 * Rien d'autre que la présentation ne lit ce module : `t.nav.landing` reste
 * dans `fr.ts`, parce que « à propos » nomme le lien sans charger la page.
 *
 * **Le vocabulaire du produit n'est pas ici.** Les tuiles de démonstration
 * disent « Répartition », « Capacité d'épargne », « Total des parts » avec les
 * clés du vrai tableau de bord (`t.dashboard`, `t.split`, `t.savings`) : une
 * page qui prétend montrer l'app ne peut pas en réécrire les mots. Ce fichier
 * ne porte que ce qui n'existe qu'ici.
 * ==========================================================================*/

import { en } from './landing.en'
import { currentLocale, subscribeLocale } from './strings'
import type { Widen } from './widen'

const fr = {
  /* La promesse est déjà `t.app.tagline` — la répéter ici en ferait une
     seconde vérité. Ce qui suit dit le mécanisme, parce que « suivi des
     finances » ne distingue cette app d'aucune autre. */
  intro:
    'Tu écris une fois ce qui revient chaque mois — loyer, abonnements, salaires. Le mois suivant s’ouvre déjà rempli de ce qui est prévu, et tu confirmes au fil de l’eau ce qui est réellement tombé.',
  /* Pas « Commencer » : c'est déjà le libellé du dernier bouton de
     l'onboarding (`t.onboarding.start`). Le DS §7 veut qu'une action garde son
     nom dans le flux — donc que deux actions différentes ne le partagent pas.
     « Suivi » plutôt que « foyer » : le mot supposait qu'on tienne le sien, ce
     qui laisse dehors qui vit chez ses parents ou partage à distance. */
  start: 'Créer mon suivi',
  open: 'Ouvrir mon mois',
  /* Sous la rangée de boutons, et non à côté : la phrase explique le second,
     dont le libellé — « Charger l'exemple » — dit le geste sans dire pourquoi
     on le ferait. Elle était écrite depuis le début et branchée nulle part ;
     seul `t.settings.exampleHint`, qui dit autre chose, servait. */
  exampleHint: 'Juste voir à quoi ça ressemble ? Un mois complet, déjà rempli, en un clic.',

  /* La troisième porte, et la seule qui n'écrit rien d'autre qu'un document
     vide. Elle existe pour qui ne veut ni répondre ni regarder un exemple :
     l'app s'ouvre sur son mois courant, vide, et c'est l'état vide du mois qui
     prend le relais — « Août est vide → Écrire une récurrence ».
     En bouton fantôme et sous les arguments : c'est un raccourci pour qui sait
     déjà ce qu'il fait, pas la porte qu'on recommande. */
  enterEmpty: 'Entrer sans rien charger',

  /* Les trois arguments, en une ligne chacun. Ils ne redisent pas la promesse
     du titre : ils nomment les trois choses que l'app fait et que les autres
     ne font pas — le document reste ici, le mois s'écrit tout seul, et la
     sortie est un fichier qu'on peut relire soi-même. */
  pointLocalTitle: 'Un document, sur cet appareil, à toi seul.',
  pointRecurringTitle: 'Ce qui revient s’écrit une fois, et remplit les mois suivants.',
  pointExportTitle: 'L’export est un fichier lisible, pas une promesse.',

  /* L'installation se propose juste sous les trois arguments, et c'est le seul
     endroit où elle a un sens : « un document sur cet appareil » vient d'être
     écrit, donc la question « et si je change de navigateur » vient d'être
     posée. Le prix, lui, n'a plus de ligne à lui : la réponse tient dans les
     questions du bas, où elle se vérifie au lieu de se promettre. Le texte dit
     ce que l'installation apporte — pas qu'elle est possible, ce que le bouton
     dit déjà.
     La purge de Safari est nommée en clair. Le cahier §5 la connaît, et une app
     dont toute la promesse est que les données restent sur l'appareil doit dire
     ce qui, sur cet appareil, peut les effacer. */
  installTitle: 'Installe-la sur ton appareil',
  installBody:
    'Elle s’ouvre en plein écran, fonctionne hors ligne, et surtout : un site non installé voit ses données effacées par Safari après une semaine sans visite. Installée, elle les garde.',
  installAction: 'Installer',

  /* L'app est hors-ligne d'abord et ne le disait jamais. Le chip ne s'affiche
     que hors ligne : en ligne, il n'aurait rien à apprendre. Il dit ce qui
     continue, pas ce qui manque — c'est une app dont c'est justement
     l'argument, pas un service en panne. */
  offline: 'Hors ligne — tout continue de fonctionner',

  /* Ce que portent les trois tuiles : une étiquette, un chiffre, une lecture
     secondaire. Le raisonnement de chacune est plus bas, en `principles`, où
     rien ne le coupe par le bas (DS §5). */
  monthTitle: 'Prévu, puis confirmé',
  monthRing: 'Part du mois déjà confirmée',
  monthRingRead: '75 % du mois est confirmé, soit 1 920 € sur 2 560 €.',
  /* La seconde lecture de la tuile du prévisionnel : ce qui est déjà tombé, à
     côté de ce qui est attendu. Le montant passe par `Amount`, jamais écrit
     dans la phrase — la devise et le séparateur ne sont pas les mêmes dans les
     deux langues (G22). */
  confirmedToDate: 'confirmé à ce jour',
  splitTitle: 'Chacun sa part',
  privacyTitle: 'Rien ne sort d’ici',

  /* La tuile qui montre le mécanisme plutôt que de le raconter : une ligne
     prévue, barrée, et le montant qu'elle a réellement coûté. C'est le geste
     de la revue, en une image, et c'est la seule tuile accentuée de la page.
     Le libellé est celui d'une ligne du mois — pas un nom de catégorie : le
     catalogue range l'électricité sous « Énergie », et une tuile qui montrerait
     un tiroir au lieu d'une dépense ne montrerait rien. */
  mechanismLabel: 'Électricité',
  mechanismBody: 'le prévu devient réel : c’est tout ce que tu fais, une ligne à la fois',

  /* Les quatre idées qui font l'app, en prose et hors de la grille : elles
     demandent trois lignes chacune, et une tuile qui en porte trois n'est plus
     une tuile. */
  principles: 'Ce qui distingue cette app',
  monthBody:
    'Le mois s’ouvre seul avec tout ce qui revient. Tu coches ce qui est tombé ; le reste continue de s’afficher comme prévu, sans disparaître de la prévision.',
  splitBody:
    'Les charges communes se répartissent entre les membres au prorata de leurs revenus, et la somme des parts vaut exactement le total, au centime près. Ce qu’une seule personne a avancé se régularise le mois suivant.',
  privacyBody:
    'Pas de compte, pas de serveur, pas de mesure d’audience. Tes données vivent dans ce navigateur, et l’export est la seule porte de sortie — c’est toi qui l’ouvres.',

  /* Quatrième principe, et non plus une tuile. « QUATRE NATURES, UN SEUL
     FLUX » fait 28 caractères : sur une 4×1 à 320px, la pilule en demandait
     244 pour 246 disponibles. Deux pixels de marge, c'est-à-dire le même
     débordement que « CAPACITÉ D'ÉPARGNE », mais en sursis. En prose, l'idée
     a de toute façon la place d'être dite en entier. */
  kindsTitle: 'Quatre natures, un seul flux',
  kindsBody:
    'Rien n’est rangé en comptes bancaires : tout est une entrée ou une sortie, sous l’une des quatre natures. Le sens dit si l’argent entre ou sort, la nature dit ce qu’il devient — un virement sur un livret sort du compte comme un plein d’essence, mais l’un est déplacé et l’autre consommé.',

  /* La seule chose qui empêche la grille de mentir. En texte lisible et non
     en filigrane : un avertissement qu'on ne peut pas lire n'en est pas un. */
  /* Sous les tuiles, et non au-dessus : c'est une légende. Elle dit deux
     choses en une ligne — que rien de ce qu'on lit n'est vrai, et qu'on peut
     rendre tout ça vrai d'un bouton, celui qui est juste à gauche. */
  sample: 'chiffres de l’exemple — charge-le pour t’y promener',

  /* La contrepartie, en pied de page et au centre. Elle est plus courte que
     `lossBody`, qui répond plus bas à la même question : celle-ci se lit par
     quelqu'un qui n'a rien demandé, donc elle tient en une phrase et ne
     propose aucun remède. Les deux gestes qui la couvrent — installer,
     exporter — sont dits par `installBody` et par la réponse du bas. */
  counterpart:
    'Tout est effacé si tu effaces ce navigateur, et personne ne peut te le rendre : c’est la contrepartie exacte de « rien ne sort d’ici ». Le fichier d’export est la seule sortie.',

  /* ---- Le calcul, montré ------------------------------------------------ */

  /* La page ne démontrait qu'un écran. Le prorata, la régularisation du mois
     suivant et la cascade de la capacité d'épargne — c'est-à-dire le meilleur
     argument du produit — n'y existaient qu'en prose, juste au-dessus, dans
     `splitBody` et `kindsBody`. Ces deux tuiles-là les montrent, avec les
     composants et le vocabulaire des vrais écrans : la revendication et sa
     démonstration se touchent.
     Le placement est celui-là et pas plus haut : la grille bento dit de quoi
     l'app a l'air, les principes disent ce qu'elle fait, et ceci le prouve. Un
     calcul posé avant qu'on ait dit ce qu'il calcule ne prouve rien. */
  proof: 'Le calcul, en entier',
  proofBody:
    'Le même exemple, du côté du calcul. Un partage entre deux personnes ne se croit pas sur parole : il se vérifie ligne à ligne, et c’est l’écran qui doit le permettre.',

  /* Le libellé de la ligne de report. `t.split.settlement` attend un nom de
     mois — la vraie tuile le tire du mois affiché —, et cette page n'en a
     aucun : inventer « juillet 2026 » sur une démonstration daterait la page au
     premier visiteur d'août. Le mot reste celui du produit. */
  settlement: 'Régularisation du mois dernier',
  /* Pourquoi il y a un report à lire. Sans cette phrase, les deux lignes qui
     s'annulent passent pour une correction inexpliquée. « Avancé » est le mot
     du produit (`t.split.advancedBy`), et il évite d'accorder un participe sur
     un prénom dont on ne sait rien. */
  advanced:
    '%s a avancé %s de charges communes le mois dernier. Chacun en portait sa part : le mois suivant rattrape l’écart, sans changer ce que le mois a coûté à qui que ce soit.',

  /* Ce que la cascade démontre, et que le solde du mois ne sait pas dire.
     C'est `kindsBody` rendu vérifiable : la nature décide de ce que devient
     l'argent, et un chiffre entier en dépend. */
  capacityBody:
    'Un versement sur un livret n’est pas une charge : il sort du compte, mais il reste à qui le fait. Le solde du mois, lui, le compte comme une dépense — c’est pour ça que ce chiffre-ci existe à côté.',

  /* ---- Les questions qu'on se pose avant d'essayer ---------------------- */

  /* Aucune objection n'était traitée. Les deux premières l'étaient en une
     demi-phrase dans `installBody`, les deux autres nulle part — et ce sont
     celles qui décident, devant une app de finances sans compte. Factuelles,
     ouvertes plutôt que repliées : quelqu'un de méfiant n'a pas à cliquer pour
     obtenir la réponse qui lèverait sa méfiance. */
  questions: 'Ce qu’on se demande avant d’essayer',

  deviceTitle: 'Et si je change de téléphone ?',
  deviceBody:
    'Rien ne suit tout seul : les données sont dans ce navigateur-ci. Tu exportes un fichier depuis les réglages, tu l’importes sur le nouvel appareil, et tout est là — membres, récurrences, mois passés. C’est le même fichier qui sert de sauvegarde, et l’app te le rappelle au bout de trente jours.',

  lossTitle: 'Et si je vide mon navigateur ?',
  lossBody:
    'Tout est effacé, et personne ne peut te le rendre : c’est la contrepartie exacte de « rien ne sort d’ici ». Deux gestes la couvrent — installer l’app, ce qui empêche Safari de purger les données après une semaine sans visite, et exporter de temps en temps.',

  catchTitle: 'C’est gratuit — où est le piège ?',
  /* La seconde moitié de la réponse au modèle économique, et la plus forte :
     elle ne dépend pas d'une promesse. Le README l'écrit déjà pour qui lit le
     dépôt ; c'est ici qu'elle manquait. */
  catchBody:
    'Il n’y en a pas, et ça se vérifie au lieu de se promettre : le code est ouvert, sous licence AGPL-3.0. N’importe qui peut lire ce que l’app fait de tes données. Et ce qui repart d’ici reste ouvert — une version modifiée doit être publiée sous la même licence, même quand elle se contente d’être mise en ligne.',

  whoTitle: 'Qui es-tu ?',
  whoBody:
    'Une personne, pas une société : un projet personnel, écrit et maintenu seul, sans équipe ni investisseur. L’éditeur est nommé, avec ses coordonnées, dans les mentions légales — la loi l’exige, et une app de finances qui tairait qui la publie ne mériterait pas qu’on lui confie quoi que ce soit.',

  /* Le cahier des charges et le design system sont l'argument de sérieux le
     plus fort du dépôt, et ils n'étaient liés que depuis « à propos » — pas
     depuis la page que voit un visiteur qui ne crée rien du tout, et qui est
     souvent la seule qu'il verra. */
  verifyTitle: 'Vérifier plutôt que croire',
  verifyBody:
    'Le cahier des charges dit ce que l’app fait et ce qu’elle ne fera pas ; le design system dit de quoi elle a l’air. Les deux font autorité sur le code : quand l’un d’eux et le code divergent, c’est un bug. Ils sont dans le dépôt, avec le reste.',

  /* ---- Les portes ------------------------------------------------------- */

  /* Deux, et non trois : la troisième — celle qui veut seulement voir — est
     servie tout en haut, à côté du bouton principal. C'est une porte d'entrée,
     pas un recours, et le même bouton deux fois sur un même écran ne se lit
     plus comme deux occasions mais comme une redite. */
  doors: 'Deux façons de ne pas commencer par une page blanche',
  /* Déplacées depuis `onboarding` avec les contrôles qu'elles décrivent : une
     clé qui ment sur son lieu d'emploi se retrouve un jour modifiée pour un
     écran qu'elle ne sert plus. */
  importTitle: 'Restaurer un export',
  importHint: 'Tu as déjà un fichier Tout compte fait ? Restaure-le sans passer par les questions.',
  schemaTitle: 'Partir de tes notes',
  schemaHint:
    'Tes comptes sont déjà écrits quelque part ? Donne ce schéma à un assistant avec tes notes, il t’en fera un fichier à importer.',
} as const

export type LandingStrings = Widen<typeof fr>

/**
 * La prose de la présentation, dans la langue active.
 *
 * Même mécanique que `history.ts` : une liaison d'export vivante, et les deux
 * langues dans le même morceau — celui-ci est déjà hors du graphe initial.
 */
export let landing: LandingStrings = currentLocale() === 'en' ? en : fr

subscribeLocale(() => {
  landing = currentLocale() === 'en' ? en : fr
})
