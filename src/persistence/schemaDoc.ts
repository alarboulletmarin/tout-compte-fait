/* ============================================================================
 * Le modèle de données, sous une forme qu'on peut donner à quelqu'un d'autre.
 *
 * L'app sait déjà importer un document (cahier §4.8), mais rien ne disait à
 * quoi ce document doit ressembler : le seul moyen d'en obtenir un était d'avoir
 * déjà saisi les données qu'on cherche justement à saisir. Quelqu'un dont le
 * budget est écrit dans ses notes n'avait donc aucun raccourci — alors qu'un
 * assistant sait très bien transcrire des notes en JSON, à condition qu'on lui
 * dise dans quel JSON.
 *
 * Rien ici n'est recopié de ce que le code sait déjà dire. Les types sont le
 * source de `domain/types.ts`, embarqué tel quel — commentaires compris, qui
 * expliquent au passage pourquoi `shared` est une exception ou pourquoi le
 * revenu n'est pas stocké. Le catalogue est lu sur `defaults.ts`, la version sur
 * `schema.ts`. Une seconde copie du modèle finirait par diverger de lui, et
 * c'est exactement l'erreur que ce document existe pour éviter chez son lecteur.
 *
 * La prose vit ici et non dans `i18n/fr.ts` : la règle du dépôt vise les
 * composants, et ceci est un document livré, au même titre que le README. Le
 * faire transiter par un dictionnaire de chaînes d'interface le rendrait
 * illisible des deux côtés.
 * ==========================================================================*/

import typesSource from '@/domain/types.ts?raw'
import type { CategoryKind } from '@/domain/types'
import { t } from '@/i18n/strings'
import { defaultCategories, defaultFamilies } from './defaults'
import { CURRENT_SCHEMA_VERSION } from './schema'
import type { ImportReason } from './validate'

export const SCHEMA_FILENAME = 'tout-compte-fait-schema.md'

/**
 * Les types, sans leurs imports.
 *
 * `domain/types.ts` tire `Money`, `ISODate` et `YearMonth` de deux modules
 * voisins : les lignes d'import ne résolvent rien hors du dépôt, et les trois
 * alias sont redonnés juste avant. Le reste passe intact — c'est tout l'intérêt.
 */
function typeDefinitions(): string {
  return typesSource
    .replace(/^import .*\n/gm, '')
    // Les imports retirés laissent leur ligne vide contre celle qui les
    // précédait : deux blancs d'affilée là où le fichier n'en a jamais.
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const PRIMITIVES = `/* Les trois primitives, définies ailleurs dans le code. */

type Money = number      // centimes, entier signé — 12,50 € s'écrit 1250
type ISODate = string    // "AAAA-MM-JJ", date civile, jamais UTC
type YearMonth = string  // "AAAA-MM"`

const RULES = [
  '**Les montants sont des entiers, en centimes.** 12,50 € s’écrit `1250`, et 1 200 € `120000`. Jamais de flottant, jamais de chaîne, jamais de séparateur.',
  '**Les dates sont des chaînes** `"AAAA-MM-JJ"`, les mois `"AAAA-MM"`. Pas d’horodatage, pas de fuseau.',
  '**Les taux sont en points de base**, entiers : `450` vaut 4,50 %. Comme les montants, aucun flottant ne touche un calcul financier.',
  '**Un champ facultatif s’omet**, il ne vaut jamais `null` ni `""`. Seul `Recurrence.amount` accepte `null`, et ça veut dire « montant à saisir à chaque échéance ».',
  '**Le sens découle de la nature de la famille**, jamais l’inverse : une catégorie sous une famille `resource` est en `"in"`, les trois autres natures en `"out"`. Un versement sur un livret sort du compte exactement comme un plein d’essence — c’est la nature qui les distingue, pas le sens. Attention : `Category.direction` est **stocké**, et l’import le reprend tel quel sans jamais le recalculer sur la famille. Une catégorie `resource` qui porterait `"out"` s’importe donc incohérente, sans un mot — c’est à toi de tenir les deux d’accord.',
  '**Une `Entry` est un fait, une `Recurrence` est une règle.** Toute statistique se lit sur les `Entry` ; une récurrence ne produit aucun chiffre par elle-même, elle produit des échéances. Un abonnement mensuel demande donc *et* la récurrence, *et* une `Entry` par mois couvert.',
  '**Le passé est `confirmed`, l’avenir est `planned`.** Une échéance à venir qu’on a déjà validée peut être `confirmed` : ça dit qu’elle aura lieu.',
  '**`months[]` doit lister chaque mois couvert par les entrées.** L’app n’ouvre jamais un mois passé toute seule — sans son `MonthState`, un mois d’historique n’existe pas pour elle.',
  '**Sur une récurrence à montant variable** (`amount: null`), `estimate` porte l’ordre de grandeur habituel. Une échéance chiffrée l’emporte toujours dessus.',
  '**`shared` est une exception, jamais une copie de la règle.** Par défaut, est commune une sortie de nature `charge` ou `debt` que personne ne s’est attribuée. Ne pose `shared` que là où tu veux dire le contraire — typiquement `true` sur une charge qu’une personne règle mais que tout le monde partage.',
  '**Une ligne est à quelqu’un, ou à tout le monde.** Une sortie sans `memberId` et hors partage sort du compte sans apparaître dans le mois de personne. Concrètement : toute entrée d’argent, tout versement d’épargne et toute charge non partagée veulent un `memberId`.',
  '**Le revenu d’une personne ne se déclare nulle part** : il se lit sur ses récurrences de nature `resource`. C’est ce qui répartit les charges communes au prorata — deux revenus veulent donc une récurrence de salaire *par personne*, avec son `memberId`.',
  '**Un `Debt` ou une `Advance` ne produit aucun mouvement d’argent.** Il faut lui lier la récurrence qui pose les mensualités (`recurrenceId`), sinon rien ne s’amortit. Le capital restant dû est dérivé des mensualités confirmées, jamais saisi.',
  '**Une avance demande trois écritures, pas une.** La ligne `Advance` dit ce qui a été payé en une fois ; la récurrence liée pose les mensualités qui reconstituent l’épargne — sur la catégorie **du support**, pas sur celle de la charge avancée ; et une `Entry` de sens `in`, datée de `paidOn`, porte la reprise sur le livret. Sans cette dernière, l’argent est sorti de l’épargne sans que rien ne le dise. Et `to` ne précède jamais `from`, sous peine que la ligne soit écartée.',
  '**`Advance.memberId` est obligatoire** — une épargne est toujours à quelqu’un. Une avance sans lui est écartée à l’import.',
  '**Le stock et le flux ne se mélangent jamais.** Un `SavingValuation` dit ce qu’un support *vaut* à une date : c’est une observation, pas une opération. Il n’entre dans aucun total du mois — ni solde, ni revenus, ni charges, ni capacité d’épargne, ni versements. Ce qui *bouge* est une `Entry`, comme partout ailleurs.',
  '**Un support d’épargne est une entité, pas une catégorie.** La catégorie dit la *nature* du mouvement (livret, plan, assurance-vie) ; le `SavingSupport` dit *lequel* et *à qui*. Deux personnes peuvent avoir chacune leur « Livret A » : ce sont deux supports, sous la même catégorie. `SavingSupport.categoryId` doit désigner une catégorie de nature `saving`.',
  '**`SavingSupport.memberId` est obligatoire**, comme sur une avance : une épargne est toujours à quelqu’un, et il n’existe pas de support commun. Un support sans porteur est écarté à l’import.',
  '**Le capital ne se pose jamais sur le support.** Il vit dans les `savingValuations`, qui s’empilent : la valeur courante est le relevé le plus récent, et les précédents font l’historique. Un support sans relevé a une valeur *inconnue* — ce qui n’est pas zéro, et ce qui ne s’additionne à rien.',
  '**Le taux non plus ne se pose jamais sur le support.** Il vit dans les `savingRates`, qui s’empilent comme les relevés : un `SavingRate` dit ce que le support sert **à partir de** `from`, et le taux courant est le plus récent dont la date est passée. Poser un palier au 1er janvier prochain ne change donc rien à ce qui précède — c’est toute la raison d’être de la collection. Il est **saisi, jamais déduit** : l’app ne connaît aucun produit et n’en pose aucun par défaut. Un support sans palier n’a **pas** de taux, ce qui n’est pas 0 % : l’écran des projections y met alors son hypothèse et le dit, quand un support à 0 % annonce que son capital ne bouge pas.',
  '**`SavingSupport.depositCap` plafonne les versements, jamais le solde.** C’est ce que le contrat autorise à verser **en tout** — 22 950 € sur un Livret A —, en centimes comme tout montant. Les intérêts, eux, passent au-dessus : un plafond de solde arrêterait la courbe à plat là où la réalité continue de monter. Facultatif, **saisi et jamais déduit** — l’app ne pose pas 22 950 € sous « Livret A », parce qu’un barème figé est faux dès qu’il change. Absent ≠ illimité : c’est une question à laquelle personne n’a répondu, et rien n’est alors borné. Posé, il **retient l’écriture** : une saisie qui le dépasse s’arrête et demande à être tranchée, et une récurrence cesse d’y poser des échéances. La place restante se calcule sur le capital, intérêts compris — donc sous-estimée, et jamais opposable sans recours. Un plafond nul ou négatif est **retiré** : « on ne peut plus rien verser » n’est pas un plafond, c’est un compte fermé, et `archived` le dit déjà.',
  '**Un taux ne fabrique aucun euro dans le document.** Il ne change ni le capital relevé, ni la valeur estimée d’un support, ni la couverture, ni un total du mois — un rendement n’est pas un mouvement. Il est lu par les projections et par la courbe d’évolution de l’épargne, qui annoncent toutes deux une **estimation**.',
  '**`SavingSupport.pace` dit à quel rythme un relevé est attendu**, et rien d’autre : `"yearly"` — un livret réglementé, dont la valeur est déterministe entre deux relevés — ou `"quarterly"` — un PEA, un compte-titres, une assurance-vie en unités de compte. Ce n’est ni un rendement ni une projection : l’app s’en sert pour savoir **quand se taire**, pas pour calculer une valeur. Le champ est facultatif ; absent, l’app lit « annuel » sans l’écrire.',
  '**Un mouvement d’épargne désigne son support par identifiant** — `Entry.savingSupportId`, `Recurrence.savingSupportId`, `Advance.savingSupportId` — et jamais par libellé ni par catégorie. Le champ n’a de sens que sur une ligne de nature `saving` ; ailleurs, omets-le. Une échéance générée hérite du support de sa règle.',
  '**Les `id` sont des chaînes libres**, à toi de les choisir. Ils doivent être uniques dans leur tableau, et tout `categoryId`, `memberId`, `familyId` ou `recurrenceId` cité doit désigner quelque chose qui existe.',
  '**L’import ne refuse presque rien : il répare, ou il écarte.** Un lien mort ne fait pas rejeter le fichier — il fait garder un document qui n’est plus celui que tu as écrit. La section « Ce que l’import répare, et ce qu’il écarte » le dit cas par cas ; elle vaut la lecture avant de produire quoi que ce soit.',
  '**`settings.theme` et `settings.palette` sont deux réglages distincts.** Le thème dit `"light"`, `"dark"` ou `"system"` ; la palette dit avec quelles couleurs — `"classique"`, `"monochrome"`, `"douce"`, `"vive"`, `"neutre"` ou `"contrastee"`. Purement cosmétiques : ni l’un ni l’autre ne change un calcul. Une valeur inconnue retombe sur `"classique"` sans que la ligne soit écartée.',
  '**Trois champs sont réservés et sans effet en v1.** `Category.icon`, `MonthState.closed` et `settings.monthStartsOn` sont lus, validés et conservés à l’import, mais aucun écran ne s’en sert : l’icône n’est jamais rendue, un mois n’est jamais clos, et l’app raisonne en mois calendaire. Laisse-les à leur valeur par défaut — `""`, `false`, `1`. Y mettre autre chose ne casse rien et ne fait rien non plus, et ce document préfère le dire plutôt que de te laisser croire à un réglage.',
]

/**
 * Ce qu'un lien mort produit, raison par raison.
 *
 * Un `Record<ImportReason, string>` et non une liste en prose : `ImportReason`
 * est une union fermée, et le compilateur refuse ce fichier si une raison est
 * ajoutée à `validate.ts` sans être décrite ici. C'est le même contrat que
 * `t.settings.reportReason`, qui tient déjà l'écran du rapport d'import — et
 * c'est le seul moyen que cette liste ne devienne pas, à son tour, la seconde
 * description du modèle que ce document existe pour éviter.
 */
const REPAIRS: Record<ImportReason, string> = {
  shape: 'La ligne n’est pas un objet — il n’y a rien à lire. **Écartée.**',
  amount:
    'Montant absent ou fractionnaire — `12.5` là où il fallait `1250`. La ligne est **écartée** : `Entry`, `Advance` ou relevé de valeur.',
  principal: 'Capital d’un crédit absent ou fractionnaire. Le crédit est **écarté**.',
  date: 'Date absente, ou inexistante au calendrier — `"2026-02-30"`. L’`Entry` ou le relevé est **écarté**.',
  month:
    'Sur un `MonthState`, un `ym` absent ou mal formé, ou deux fois le même mois. Le mois est **écarté** — et les entrées qu’il couvrait cessent d’exister pour l’app, sans être supprimées pour autant.',
  noMember:
    '`memberId` absent sur une `Advance` ou un `SavingSupport`. La ligne est **écartée** : une épargne est toujours à quelqu’un, et lui inventer un porteur attribuerait à quelqu’un ce qu’il n’a pas fait.',
  period: 'Sur une avance, `to` précède `from`. Elle est **écartée** — rien ne se reconstituerait jamais.',
  rate: 'Sur un `SavingRate`, taux absent, fractionnaire — `2.5` là où il fallait `250` — ou hors de 0 à 100 %. Le palier est **écarté** : un taux illisible ne se remplace pas par zéro, qui est une hypothèse qu’on peut poser volontairement.',
  duplicateId:
    'Deux lignes au même `id` dans la même collection. La seconde est **renommée** `mon-id~2` — et tout ce qui désignait cet identifiant pointe désormais sur la première, ce qui n’est probablement pas ce que tu voulais.',
  unknownCategory:
    '`categoryId` qui ne désigne rien. La ligne est **reroutée** vers une catégorie « À ranger » que l’import ajoute au document, une par sens. Le lien ne peut pas être coupé : une ligne sans catégorie n’a pas de nature.',
  unknownFamily:
    '`familyId` qui ne désigne rien. La catégorie est **rangée** dans une famille d’accueil, choisie sur son sens — donc pas forcément de la nature que tu croyais lui donner.',
  unknownMember:
    '`memberId` qui ne désigne rien. Sur une `Entry` ou une `Recurrence`, le lien est **coupé** et la ligne devient celle de personne. Sur une `Advance` ou un `SavingSupport`, elle est **écartée** : le porteur n’y est pas facultatif.',
  unknownRecurrence:
    '`recurrenceId` qui ne désigne rien. Le lien est **coupé** : l’échéance devient ponctuelle, et le crédit ou l’avance qui s’y adossait cesse de s’amortir.',
  unknownSupport:
    '`savingSupportId` qui ne désigne rien. Sur une `Entry`, une `Recurrence` ou une `Advance`, le lien est **coupé**. Un `SavingValuation` est **écarté** — un relevé sans support ne vaut plus rien. Et un `SavingSupport` rangé sous une catégorie qui n’est pas d’épargne est **déplacé** sous la première qui l’est.',
}

/**
 * Ce que l'import change sans le dire.
 *
 * Ces coercitions ne produisent aucune notice, et c'est ce qui les rend plus
 * dangereuses que les réparations ci-dessus : le rapport d'import est muet, et
 * seul le résultat diffère. Elles n'ont pas de code dans `ImportReason` — d'où
 * cette liste écrite à la main, la seule du document, et qu'il faut relire
 * quand `validate.ts` change ses valeurs de repli.
 */
const SILENT = [
  '`estimate` est **retiré** si `amount` n’est pas `null`, ou s’il ne vaut pas plus que zéro : un ordre de grandeur n’a de sens que sur un montant variable.',
  'Une date illisible ne fait pas toujours écarter la ligne : `Recurrence.startedOn`, `Debt.startedOn` et `Advance.paidOn` retombent sur **le jour de l’import**. `"08/03/2026"` déplace donc toute une histoire, sans un mot. `Debt.endsOn` illisible retombe sur son `startedOn`, et `Advance.to` sur son `from`.',
  '`endedOn` illisible est **retiré** : la règle devient perpétuelle.',
  '`rateBp` absent, nul ou négatif vaut prêt **sans intérêt** — le capital décroît alors exactement de ce qui est versé.',
  'Sur `period` : une `unit` inconnue vaut `"month"`, un `every` nul ou négatif vaut `1`, un `anchorDay` illisible vaut `1`.',
  '`direction` : tout ce qui n’est pas exactement `"in"` vaut `"out"`. `"IN"`, `"entrée"` et `"+"` sont donc des sorties.',
  '`status` : tout ce qui n’est pas exactement `"confirmed"` vaut `"planned"`.',
  '`shared` non booléen devient **absent**, ce qui n’est pas `false` : la règle par défaut reprend la main.',
  'Un `id` absent devient un identifiant de position — `entry-3` —, qui changera au prochain export.',
  'Un `label` absent devient `"—"`.',
  '`families` vide ou illisible fait **substituer tout le catalogue par défaut** : sans premier niveau, aucune catégorie ne sait plus de quelle nature elle relève. Tes propres catégories se retrouvent alors orphelines de la famille que tu croyais poser.',
  'Un `theme`, une `palette`, une `currency` ou un `monthStartsOn` hors de leurs valeurs retombent sur les valeurs par défaut, sans que la ligne soit écartée.',
  'Un `pace` qui ne vaut ni `"yearly"` ni `"quarterly"` devient **absent**, ce qui n’est pas `"yearly"` : l’app lit alors « annuel » sans que le support porte ce choix, et le formulaire recueillera la vraie réponse.',
  'Sur un `SavingRate`, `kind` : tout ce qui n’est pas exactement `"guaranteed"` vaut `"assumed"` — la lecture qui promet le moins.',
  '`rateBp` et `rateKind` posés **sur un `SavingSupport`** sont ignorés et **perdus sans un mot**. Ils y vivaient jusqu’au schéma 11 ; depuis le 12, le taux est daté et vit dans `savingRates`. Un document annoncé en version antérieure est converti à l’import — un palier par taux, à l’origine des temps —, mais un document qui se déclare à la version courante n’a plus rien à convertir : c’est à toi d’écrire ses paliers.',
]

/**
 * Un document court, mais dont aucune des treize clés n'est vide.
 *
 * Il a longtemps porté `"debts": []` et `"advances": []`, et c'était précisément
 * laisser sans exemple les deux objets qu'on écrit le plus mal : un crédit a son
 * taux en points de base, une avance mêle un jour (`paidOn`) et deux mois
 * (`from`, `to`) et ne vaut rien sans les trois écritures qui l'accompagnent. Une
 * règle en prose ne remplace pas de les voir.
 *
 * Les libellés du catalogue sont ceux de `defaults.ts`, au caractère près : le
 * document se donne comme un extrait du jeu par défaut, et non comme un
 * deuxième catalogue aux mêmes identifiants sous d'autres noms.
 */
const MINIMAL = `{
  "schemaVersion": ${String(CURRENT_SCHEMA_VERSION)},
  "household": {
    "name": "Maison",
    "members": [
      { "id": "m-alix", "name": "Alix", "color": "var(--member-1)" },
      { "id": "m-camille", "name": "Camille", "color": "var(--member-2)" }
    ]
  },
  "families": [
    { "id": "fam-resources", "label": "Ressources", "kind": "resource" },
    { "id": "fam-housing", "label": "Logement", "kind": "charge" },
    { "id": "fam-transport", "label": "Transport", "kind": "charge" },
    { "id": "fam-daily", "label": "Vie courante", "kind": "charge" },
    { "id": "fam-leisure", "label": "Loisirs et divers", "kind": "charge" },
    { "id": "fam-credits", "label": "Crédits et dettes", "kind": "debt" },
    { "id": "fam-savings", "label": "Versements", "kind": "saving" }
  ],
  "categories": [
    {
      "id": "salary",
      "label": "Salaires, retraites ou indemnités",
      "familyId": "fam-resources",
      "icon": "",
      "color": "var(--cat-1)",
      "direction": "in",
      "archived": false
    },
    {
      "id": "rent",
      "label": "Loyer et charges",
      "familyId": "fam-housing",
      "icon": "",
      "color": "var(--cat-2)",
      "direction": "out",
      "archived": false
    },
    {
      "id": "car-insurance",
      "label": "Assurance véhicule",
      "familyId": "fam-transport",
      "icon": "",
      "color": "var(--cat-4)",
      "direction": "out",
      "archived": false
    },
    {
      "id": "groceries",
      "label": "Alimentation",
      "familyId": "fam-daily",
      "icon": "",
      "color": "var(--cat-5)",
      "direction": "out",
      "archived": false
    },
    {
      "id": "outings",
      "label": "Sorties et vacances",
      "familyId": "fam-leisure",
      "icon": "",
      "color": "var(--cat-3)",
      "direction": "out",
      "archived": false
    },
    {
      "id": "car-loan",
      "label": "Automobile",
      "familyId": "fam-credits",
      "icon": "",
      "color": "var(--cat-4)",
      "direction": "out",
      "archived": false
    },
    {
      "id": "passbook",
      "label": "Livrets (A, LEP, CSL)",
      "familyId": "fam-savings",
      "icon": "",
      "color": "var(--cat-5)",
      "direction": "out",
      "archived": false
    }
  ],
  "recurrences": [
    {
      "id": "r-salaire-alix",
      "label": "Salaire",
      "categoryId": "salary",
      "memberId": "m-alix",
      "direction": "in",
      "amount": 275000,
      "period": { "unit": "month", "every": 1, "anchorDay": 28 },
      "startedOn": "2026-01-28"
    },
    {
      "id": "r-salaire-camille",
      "label": "Salaire",
      "categoryId": "salary",
      "memberId": "m-camille",
      "direction": "in",
      "amount": 218000,
      "period": { "unit": "month", "every": 1, "anchorDay": 28 },
      "startedOn": "2026-01-28"
    },
    {
      "id": "r-loyer",
      "label": "Loyer",
      "categoryId": "rent",
      "direction": "out",
      "amount": 95000,
      "period": { "unit": "month", "every": 1, "anchorDay": 5 },
      "startedOn": "2026-01-05"
    },
    {
      "id": "r-courses",
      "label": "Courses",
      "categoryId": "groceries",
      "memberId": "m-camille",
      "direction": "out",
      "amount": null,
      "estimate": 42000,
      "period": { "unit": "month", "every": 1, "anchorDay": 6 },
      "startedOn": "2026-01-06",
      "shared": true,
      "note": "Montant variable : amount vaut null, estimate donne l’ordre de grandeur. Camille règle, le foyer partage — c’est ce que dit shared."
    },
    {
      "id": "r-credit-auto",
      "label": "Crédit voiture",
      "categoryId": "car-loan",
      "direction": "out",
      "amount": 27900,
      "period": { "unit": "month", "every": 1, "anchorDay": 10 },
      "startedOn": "2026-01-10"
    },
    {
      "id": "r-livret-alix",
      "label": "Virement livret",
      "categoryId": "passbook",
      "memberId": "m-alix",
      "savingSupportId": "s-livret-alix",
      "direction": "out",
      "amount": 20000,
      "period": { "unit": "month", "every": 1, "anchorDay": 28 },
      "startedOn": "2026-01-28"
    },
    {
      "id": "r-avance-assurance",
      "label": "Assurance auto",
      "categoryId": "passbook",
      "memberId": "m-alix",
      "savingSupportId": "s-livret-alix",
      "direction": "out",
      "amount": 5600,
      "period": { "unit": "month", "every": 1, "anchorDay": 14 },
      "startedOn": "2026-01-01",
      "endedOn": "2026-12-31",
      "note": "La mensualité qui remet sur le livret ce que l’avance lui a pris. Sa catégorie est celle du support, pas celle de la charge avancée."
    }
  ],
  "entries": [
    {
      "id": "e-1",
      "recurrenceId": "r-salaire-alix",
      "label": "Salaire",
      "categoryId": "salary",
      "memberId": "m-alix",
      "direction": "in",
      "amount": 275000,
      "date": "2026-01-28",
      "status": "planned",
      "note": "Le document est arrêté au 20 janvier : ce qui est tombé avant est confirmed, ce qui reste à venir est planned."
    },
    {
      "id": "e-2",
      "recurrenceId": "r-salaire-camille",
      "label": "Salaire",
      "categoryId": "salary",
      "memberId": "m-camille",
      "direction": "in",
      "amount": 218000,
      "date": "2026-01-28",
      "status": "planned"
    },
    {
      "id": "e-3",
      "recurrenceId": "r-loyer",
      "label": "Loyer",
      "categoryId": "rent",
      "direction": "out",
      "amount": 95000,
      "date": "2026-01-05",
      "status": "confirmed"
    },
    {
      "id": "e-4",
      "recurrenceId": "r-courses",
      "label": "Courses",
      "categoryId": "groceries",
      "memberId": "m-camille",
      "direction": "out",
      "amount": 38750,
      "date": "2026-01-06",
      "status": "confirmed",
      "shared": true,
      "note": "Le montant chiffré l’emporte sur l’estimation de la règle. shared s’hérite de la récurrence : l’échéance le porte aussi."
    },
    {
      "id": "e-5",
      "label": "Restaurant",
      "categoryId": "outings",
      "memberId": "m-camille",
      "direction": "out",
      "amount": 4200,
      "date": "2026-01-17",
      "status": "confirmed",
      "note": "Une dépense ponctuelle n’a pas de recurrenceId."
    },
    {
      "id": "e-6",
      "recurrenceId": "r-credit-auto",
      "label": "Crédit voiture",
      "categoryId": "car-loan",
      "direction": "out",
      "amount": 27900,
      "date": "2026-01-10",
      "status": "confirmed"
    },
    {
      "id": "e-7",
      "label": "Assurance auto",
      "categoryId": "passbook",
      "memberId": "m-alix",
      "savingSupportId": "s-livret-alix",
      "direction": "in",
      "amount": 67200,
      "date": "2026-01-14",
      "status": "confirmed",
      "note": "La reprise sur le livret, le jour du paiement. Sens in : c’est de l’épargne qui revient, pas un revenu. Elle n’a pas de recurrenceId — elle n’arrive qu’une fois."
    },
    {
      "id": "e-8",
      "recurrenceId": "r-avance-assurance",
      "label": "Assurance auto",
      "categoryId": "passbook",
      "memberId": "m-alix",
      "savingSupportId": "s-livret-alix",
      "direction": "out",
      "amount": 5600,
      "date": "2026-01-14",
      "status": "confirmed"
    },
    {
      "id": "e-9",
      "recurrenceId": "r-livret-alix",
      "label": "Virement livret",
      "categoryId": "passbook",
      "memberId": "m-alix",
      "savingSupportId": "s-livret-alix",
      "direction": "out",
      "amount": 20000,
      "date": "2026-01-28",
      "status": "planned",
      "note": "Un versement sort du compte : sens out, nature saving. Celui-ci n’a pas encore eu lieu — il ne pèse donc dans aucune valeur relevée."
    }
  ],
  "debts": [
    {
      "id": "d-auto",
      "label": "Crédit voiture",
      "categoryId": "car-loan",
      "recurrenceId": "r-credit-auto",
      "principal": 1450000,
      "startedOn": "2026-01-10",
      "endsOn": "2030-12-10",
      "rateBp": 490,
      "note": "490 points de base valent 4,90 %. Le capital restant dû se dérive des mensualités confirmées, il ne se saisit jamais."
    }
  ],
  "advances": [
    {
      "id": "a-assurance-auto",
      "label": "Assurance auto",
      "categoryId": "car-insurance",
      "memberId": "m-alix",
      "savingSupportId": "s-livret-alix",
      "amount": 67200,
      "paidOn": "2026-01-14",
      "from": "2026-01",
      "to": "2026-12",
      "recurrenceId": "r-avance-assurance",
      "note": "672 € réglés en une fois depuis le livret, remis 56 € par mois pendant douze mois. paidOn est un jour ; from et to sont des mois."
    }
  ],
  "savingSupports": [
    {
      "id": "s-livret-alix",
      "label": "Livret A",
      "memberId": "m-alix",
      "categoryId": "passbook",
      "archived": false,
      "pace": "yearly",
      "depositCap": 2295000
    }
  ],
  "savingValuations": [
    {
      "id": "v-1",
      "supportId": "s-livret-alix",
      "amount": 1245000,
      "date": "2025-12-31"
    },
    {
      "id": "v-2",
      "supportId": "s-livret-alix",
      "amount": 1183400,
      "date": "2026-01-20"
    }
  ],
  "savingRates": [
    {
      "id": "tx-1",
      "supportId": "s-livret-alix",
      "rateBp": 300,
      "kind": "assumed",
      "from": "2024-02-01"
    },
    {
      "id": "tx-2",
      "supportId": "s-livret-alix",
      "rateBp": 240,
      "kind": "assumed",
      "from": "2025-02-01"
    }
  ],
  "months": [{ "ym": "2026-01", "openedAt": "2026-01-01", "closed": false }],
  "settings": { "theme": "system", "palette": "classique", "currency": "EUR", "monthStartsOn": 1 }
}`

/** Le catalogue, famille par famille, tel qu'une app neuve le pose. */
function catalogue(): string {
  const categories = defaultCategories()
  return defaultFamilies()
    .map((family) => {
      const rows = categories
        .filter((category) => category.familyId === family.id)
        .map((category) => `| \`${category.id}\` | ${category.label} |`)
        .join('\n')
      return [
        `### ${family.label} — \`${family.id}\``,
        '',
        `Nature \`${family.kind}\`, donc sens \`${directionLabel(family.kind)}\`.`,
        '',
        '| id | libellé |',
        '|---|---|',
        rows,
      ].join('\n')
    })
    .join('\n\n')
}

const directionLabel = (kind: CategoryKind): string => (kind === 'resource' ? 'in' : 'out')

const NATURES = (['resource', 'charge', 'debt', 'saving'] as const)
  .map((kind) => `- \`${kind}\` — ${t.kinds[kind]}, sens \`${directionLabel(kind)}\``)
  .join('\n')

const bullets = (lines: readonly string[]): string => lines.map((line) => `- ${line}`).join('\n')

/**
 * Le document, prêt à coller dans un assistant.
 *
 * Recalculé à chaque appel plutôt que figé dans une constante : il lit le
 * catalogue par défaut, qui est du code, et une constante de module l'évaluerait
 * à l'import — soit avant que quiconque l'ait demandé, pour un document qu'on
 * ne consulte qu'une fois.
 */
export function schemaDocument(): string {
  return `# Tout compte fait — modèle de données

Version de schéma : **${String(CURRENT_SCHEMA_VERSION)}**

## À quoi sert ce document

Tout compte fait garde tout dans un seul document JSON — le même que l'app
exporte et réimporte. Ce fichier le décrit en entier.

L'usage prévu : colle ce document dans un assistant, ajoute tes notes de budget
telles qu'elles sont, même en vrac, et demande-lui le JSON correspondant.
Récupère le fichier, puis, dans l'app : **Réglages → Données → Importer**.

L'import remplace intégralement les données existantes. Il vaut mieux exporter
avant, si tu as déjà saisi quelque chose.

## Ce qu'il faut produire

Un seul objet JSON, exactement la forme du type \`Data\` ci-dessous. Pas
d'enveloppe autour, pas de champ en plus, pas de commentaire : du JSON, pas du
JavaScript.

## Les types

C'est le source de l'app, tel quel. Les commentaires disent le pourquoi de
chaque règle — ils valent la lecture.

\`\`\`ts
${PRIMITIVES}

${typeDefinitions()}
\`\`\`

## Les règles

${bullets(RULES)}

## Ce que l'import répare, et ce qu'il écarte

L'app ne refuse un fichier que s'il n'est pas du JSON, ou s'il annonce une
version de schéma qu'elle ne connaît pas encore. Tout le reste passe : ce qu'elle
ne sait pas lire, elle le répare ou l'écarte, ligne à ligne, et garde un document
qui n'est plus tout à fait celui qu'on lui a donné. Elle en rend compte à l'écran
après l'import — mais mieux vaut ne pas avoir à le lire.

${bullets(Object.values(REPAIRS))}

### Et ce qu'elle change sans le dire

Ces corrections-là ne figurent dans aucun rapport. Seul le résultat diffère, ce
qui en fait la liste à relire en premier.

${bullets(SILENT)}

## Les quatre natures

Une famille porte une nature, et ses catégories en héritent leur sens.

${NATURES}

L'épargne se compte **en net** : un versement est une sortie, une reprise sur un
livret est une \`Entry\` de sens \`in\` sur une catégorie \`saving\`.

## Stock et flux

L'épargne se lit de deux façons qui ne s'additionnent pas.

- Le **flux** — ce qu'on verse et ce qu'on reprend — passe par des \`Entry\`, comme
  tout le reste de l'app. Elles désignent leur support par \`savingSupportId\`.
- Le **stock** — ce que le support vaut — passe par des \`SavingValuation\`, des
  relevés datés qui s'empilent. Le plus récent est la valeur courante ; les
  autres font l'historique.

Un relevé n'est **pas** une opération : « PEA, 18 320 € le 1er août » ne dit pas
qu'un virement de 18 320 € a eu lieu ce jour-là. Un versement ne réécrit
symétriquement aucun relevé — sur un placement, la valeur bouge aussi avec le
marché.

Un support sans relevé vaut « inconnu », jamais zéro : l'app le compte à part
plutôt que de l'additionner.

Le **taux** suit la même forme que le stock, pour la même raison : des
\`SavingRate\` datés qui s'empilent, chacun disant ce que le support sert **à
partir de** son \`from\`. Le taux courant est le plus récent dont la date est
passée ; poser celui de l'an prochain ne réécrit donc pas l'année en cours. Un
support sans palier n'a pas de taux, ce qui n'est pas 0 %.

## Le catalogue par défaut

Ces identifiants existent déjà dans une app neuve — réutilise-les plutôt que
d'en inventer, tes entrées se rangeront toutes seules. Rien n'empêche d'ajouter
une famille ou une catégorie : il faut alors la déclarer dans \`families\` ou
\`categories\`, et faire suivre le sens de la nature de sa famille.

${catalogue()}

## Un document complet, qui s'importe tel quel

Deux personnes aux revenus inégaux, un salaire chacune, un loyer commun, des
courses à montant variable que l'une règle et que les deux partagent, une
dépense ponctuelle, un crédit avec son taux et sa mensualité, une avance avec sa
reprise sur le livret et la mensualité qui la reconstitue, et un livret avec deux
relevés dont l'écart s'explique exactement par les mouvements du mois, et deux
paliers de taux dont le second ne réécrit pas le premier.

Il est arrêté au 20 janvier : ce qui est tombé avant est \`confirmed\`, ce qui
reste à venir est \`planned\`. Un document transcrit depuis des notes ressemble à
ça — un mois entamé, pas un mois fini.

Tout ce qui n'est pas ton cas se retire : vide \`debts\`, \`advances\`,
\`savingSupports\`, \`savingValuations\` et \`savingRates\`, le document reste valide
— à condition qu'aucun identifiant encore cité ne disparaisse avec.

\`\`\`json
${MINIMAL}
\`\`\`
`
}
