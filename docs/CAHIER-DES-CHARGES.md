# Cahier des charges — v1

App de suivi de finances personnelles, seul ou à plusieurs. Full frontend, sans compte ni serveur.

---

## 1. Principes

1. **Aucun backend.** Les données vivent dans le navigateur. Rien ne sort de l'appareil.
2. **Quatre natures, un seul flux.** L'app suit des entrées et des sorties d'argent, rangées en Ressources, Charges, Crédits et Versements. Le sens dit si l'argent entre ou sort ; la nature dit ce qu'il devient. Pas de comptes bancaires, pas d'import de relevés.
3. **Un stock, et un seul : l'épargne.** La v1 disait « pas de bilan patrimonial », et cette règle-ci en est l'assouplissement borné. L'app sait désormais répondre à « combien j'ai mis de côté, et où », parce que la question suit immédiatement celle qu'elle savait déjà traiter — « combien puis-je mettre de côté ce mois-ci » — et qu'y répondre par les seuls flux demanderait de saisir toute l'histoire d'un livret. Elle ne suit **que** l'épargne : ni immobilier, ni véhicules, ni dettes hors crédits suivis, ni valeur nette. Le stock se **relève**, il ne se calcule pas, et il n'entre dans aucun chiffre du mois (§3, §4.6 bis).
4. **Prévu, puis confirmé.** Chaque mois est d'abord une prévision générée depuis les récurrences, que l'utilisateur valide au fil de l'eau.
5. **Rien à configurer pour démarrer.** Trois questions à l'ouverture, toutes sautables, puis l'app est utilisable.

---

## 2. Périmètre

**Dans la v1**

- Récurrences (abonnements, charges, revenus) à montant fixe ou variable
- Dépenses et recettes ponctuelles
- Capital restant dû des crédits en cours
- Ouverture et suivi du mois courant
- Vue calendrier des échéances
- Dashboards du mois
- Historique des mois passés
- Comparatifs mois/mois et année/année
- Catégories rangées en familles, sous quatre natures
- Personnes, comme étiquette
- Répartition des charges communes entre membres, au prorata des revenus
- Régularisation d'un mois sur le suivant, quand une charge commune a été avancée par une seule personne
- Capacité d'épargne, ventilation par support et reste à placer, par personne
- Supports d'épargne : où l'épargne est placée, à qui elle est, et ce qu'elle vaut
- Valorisations : ce qu'un support valait aux dates relevées, et son historique
- Avances : une charge payée en une fois depuis l'épargne, remboursée mois par mois
- Export / import du fichier de données
- Schéma de données à copier ou télécharger, pour faire transcrire des notes déjà écrites
- Jeu d'exemple complet, chargeable en un clic
- Thème clair et sombre, et devise d'affichage

**Hors périmètre** — objectifs d'épargne datés, plans et projections d'épargne, rendement attendu, intérêts composés, scénarios prudent/central/optimiste, allocation de portefeuille, conseil d'investissement, données de marché, comptes bancaires multiples, import de relevés bancaires, synchronisation bancaire, budgets par enveloppe, multi-devise, patrimoine hors épargne, solde roulant entre membres (une dette entre personnes qui court de mois en mois jusqu'à ce qu'un geste la solde ; la régularisation, elle, corrige le mois suivant et s'arrête là).

Les cinq premiers font un chantier à part — **plans et projections** —, et le modèle les accueille sans les implémenter : un plan viserait un ou plusieurs `SavingSupport`, partirait de leur dernière valorisation, ajouterait les versements déjà déclarés, appliquerait une hypothèse de rendement, et comparerait la projection aux valorisations réelles. Rien de tout cela n'est codé, et **aucun champ n'est posé « au cas où »** : un `expectedReturn` inutilisé sur un support serait une promesse dans le modèle, lue par un assistant et par la documentation comme un réglage qui fait quelque chose.

---

## 3. Modèle de données

Tout est stocké dans un document unique versionné.

```ts
type Money = number // centimes, entier signé

type Data = {
  schemaVersion: number
  household: { name: string; members: Member[] }
  families: Family[]
  categories: Category[]
  recurrences: Recurrence[]
  entries: Entry[]
  debts: Debt[]
  advances: Advance[]
  savingSupports: SavingSupport[]
  savingValuations: SavingValuation[]
  months: MonthState[]
  settings: {
    theme: 'light' | 'dark' | 'system'
    // Purement cosmétique, et distincte du thème : chaque palette tient dans
    // les deux. Aucune de ses valeurs ne change un calcul.
    palette: 'classique' | 'monochrome' | 'douce' | 'vive' | 'neutre' | 'contrastee'
    currency: string              // symbole d'affichage, aucune conversion
    monthStartsOn: number         // réservé, sans effet en v1
  }
}

// Le revenu qui sert au prorata n'est pas ici : il se lit sur les récurrences
// de nature `resource` que le membre porte.
type Member = { id: string; name: string; color: string }

// Ce que devient l'argent, par-delà son sens de trésorerie.
type CategoryKind = 'resource' | 'charge' | 'debt' | 'saving'

// Le premier niveau des catégories : l'onglet sous lequel on va chercher.
type Family = { id: string; label: string; kind: CategoryKind }

type Category = {
  id: string
  label: string
  familyId: string              // la famille porte la nature et la teinte
  icon: string
  color: string
  direction: 'in' | 'out'
  archived: boolean
}

type Debt = {
  id: string
  label: string
  categoryId: string
  recurrenceId?: string         // la mensualité qui l'amortit
  principal: Money              // capital emprunté
  startedOn: string
  endsOn: string
  rateBp?: number               // taux annuel en points de base, 450 = 4,50 %
  note?: string
}

// Une charge payée en une fois depuis l'épargne, remboursée à soi-même mois
// par mois. La mensualité est de nature `saving` : la charge a déjà eu lieu.
type Advance = {
  id: string
  label: string
  categoryId: string            // la nature de la charge avancée
  memberId: string              // jamais facultatif : une épargne est à quelqu'un
  savingSupportId?: string      // le support repris, puis reconstitué
  amount: Money                 // ce qui a été payé, en une fois
  paidOn: string                // le jour de la reprise sur le livret
  from: string                  // "2026-08" — premier mois couvert
  to: string                    // "2027-07" — dernier mois couvert, inclus
  recurrenceId?: string         // la mensualité qui reconstitue l'épargne
  note?: string
}

// Où l'épargne est placée, et à qui elle est. La catégorie dit la *nature* du
// mouvement (livret, plan, assurance-vie) ; le support dit *lequel* et *à qui* :
// deux personnes peuvent avoir chacune leur « Livret A ». Aucun capital ici — il
// vit dans les valorisations, et nulle part ailleurs.
type SavingSupport = {
  id: string
  label: string                 // libre, et c'est le champ qui compte
  memberId: string              // jamais facultatif : une épargne est à quelqu'un
  categoryId: string            // une catégorie de nature `saving`
  archived: boolean             // sort des formulaires, reste dans les lectures
  pace?: 'yearly' | 'quarterly' // à quel rythme un relevé est attendu (§4.6 bis)
  note?: string
}

// Ce qu'un support valait à une date — une observation, jamais une opération.
// Les relevés s'empilent : le plus récent est la valeur courante.
type SavingValuation = {
  id: string
  supportId: string
  amount: Money
  date: string                  // ISO date
}

type Recurrence = {
  id: string
  label: string
  categoryId: string
  memberId?: string
  savingSupportId?: string      // sur une règle de nature `saving` seulement
  direction: 'in' | 'out'
  amount: Money | null          // null = montant à saisir à chaque échéance
  estimate?: Money              // montant habituel d'un variable, tant qu'aucune échéance n'est chiffrée
  period: { unit: 'week' | 'month' | 'year'; every: number; anchorDay: number }
  startedOn: string             // ISO date
  endedOn?: string              // récurrence arrêtée
  shared?: boolean              // voir Entry.shared ; les échéances en héritent
  note?: string
}

type Entry = {
  id: string
  recurrenceId?: string         // absent = ponctuel
  label: string
  categoryId: string
  memberId?: string
  savingSupportId?: string      // sur un mouvement de nature `saving` seulement
  direction: 'in' | 'out'
  amount: Money
  date: string                  // ISO date
  status: 'planned' | 'confirmed'
  shared?: boolean              // exception à la règle de partage, jamais sa copie
  note?: string
}

type MonthState = {
  ym: string                    // "2026-07"
  openedAt: string
  closed: boolean
}
```

**Règles**

- Les montants sont des entiers en centimes. Aucun flottant nulle part.
- Une `Entry` est la seule source de vérité pour les statistiques. Une récurrence ne produit jamais de chiffre directement.
- L'historique de prix d’une récurrence se déduit des `Entry` liées à sa `recurrenceId`, il n'est pas stocké.
- **Une récurrence vaut la même chose partout.** « Combien vaut cette récurrence ? » est posée par le total des récurrences, par sa fiche, par le revenu d'un membre et par le montant proposé à l'ouverture d'un mois : une seule fonction y répond, sinon les quatre écrans se contredisent. Trois sources, dans cet ordre — le montant fixe ; sinon l'échéance chiffrée la plus proche, le passé d'abord et le jour même compris ; sinon l'`estimate`. Une échéance encore `planned` dont on a saisi le montant compte : c'est ce qu'on s'attend à payer ou à toucher. La case laissée à zéro par l'ouverture du mois ne compte pas — c'est un emplacement vide, pas un montant nul.
- `estimate` n'est **pas** une seconde vérité à côté de `amount` : c'est la seule qu'une récurrence variable puisse porter avant sa première échéance. Une échéance chiffrée l'emporte toujours, sans quoi une augmentation resterait invisible tant qu'on n'aurait pas pensé à corriger la récurrence.
- **Arrêter et supprimer une récurrence sont deux gestes distincts.** Arrêter la marque `endedOn` et retire ses échéances prévues au-delà : la règle reste, arrêtée, et se reprend. Supprimer l'efface pour de bon, avec ses échéances prévues. Rabattre le second sur le premier dès qu'une échéance avait été confirmée rendait la suppression inatteignable — la règle restait dans la liste pendant que l'écran annonçait qu'elle était supprimée.
- Supprimer une récurrence n'efface pas les `Entry` déjà confirmées : elles ont eu lieu, et **se détachent** de la règle — leur `recurrenceId` est retiré, leur montant et leur date ne bougent pas. Un `Debt` ou une `Advance` qui pointait sur la règle perd son lien, jamais son suivi.
- Une `Entry` `planned` reste sous la coupe de sa récurrence : changer la règle refait les échéances à venir. Une `Entry` `confirmed` **datée dans le passé** s'en détache définitivement — elle a eu lieu, et l'historique ne se réécrit pas. Une `Entry` `confirmed` **datée dans le futur** est une prévision validée d'avance, pas un fait : changer la règle la requalifie — libellé, catégorie, sens, membre, partage — sans jamais toucher à son montant, sa date ni son statut, qui ont pu être saisis à la main. Sans quoi celui qui confirme son mois à venir ne peut plus corriger la récurrence qui l'a produite.
- Un formulaire de reprise envoie l'**état complet** de ce qu'il montre, jamais un correctif : le champ qu'il n'envoie pas a été vidé, et l'enregistrement l'efface. Fusionner ne saurait pas distinguer « inchangé » d'« effacé », et remettre une récurrence à « en commun » n'aurait aucun effet.
- Le sens d'une catégorie découle de la nature de sa famille, jamais l'inverse : `resource` entre, les trois autres sortent. Un versement sort du compte exactement comme une charge — c'est la nature, pas le sens, qui les distingue.
- Un `Debt` ne produit aucun chiffre de trésorerie : ce sont les `Entry` de la récurrence liée qui font sortir l'argent. Il n'ajoute que le capital, que la somme des mensualités ne dit pas dès qu'il y a des intérêts.
- Le revenu d'un membre est **dérivé de ses récurrences** de nature `resource`, ramenées au mois — jamais stocké à côté. Le déclarer en plus en ferait une seconde vérité, et la première augmentation les ferait diverger. C'est aussi ce qui donne au coefficient sa stabilité : une récurrence est une règle, une prime est une `Entry` ponctuelle — elle a lieu, mais elle ne dit rien de ce qu'on gagne.
- Un `Advance` ne produit aucun chiffre de trésorerie non plus : la reprise du jour du paiement et les mensualités qui la reconstituent sont des `Entry`. Il n'ajoute que ce qui a été avancé, donc ce qu'il reste à se rendre.
- **L'épargne se compte en net**, seule des quatre natures : les versements moins les reprises. Une reprise est une `Entry` de sens `in` sur une catégorie `saving` — sans quoi le mois où l'on vide 600 € d'un livret se lirait comme un mois où l'on a mis 600 € de côté.
- **Stock et flux ne se mélangent jamais.** Une `Entry` est un mouvement : elle compte dans le solde, dans la capacité, dans le versé du mois. Un `SavingValuation` est une observation de valeur : « PEA, 18 320 € le 1er août » ne dit pas qu'un virement de 18 320 € a eu lieu ce jour-là, et il n'entre dans **aucun** total du mois. Symétriquement, aucun mouvement ne réécrit un relevé — sur un placement, la valeur bouge aussi avec le marché.
- **Un support est une entité, pas une catégorie.** La catégorie répond à « quelle est la nature de ce mouvement », le support à « où va l'argent, et à qui il est ». Avant la v8, la catégorie faisait les deux : « Livrets » confondait le livret d'Andrea et celui de Marie, et aucun capital ne pouvait s'y attacher. Le support porte donc `categoryId` — c'est sa nature, et le catalogue existant fait déjà ce classement —, et il n'y a **pas** de second champ `type` à côté : deux classifications parallèles finiraient par diverger.
- **`SavingSupport.memberId` n'est jamais facultatif**, comme sur une avance : une épargne est toujours à quelqu'un, et il n'existe pas de support « commun » — l'épargne ne se répartit pas comme une charge. Sans personne au foyer, aucun support ne peut exister : l'écran le dit plutôt que d'inventer un porteur.
- **Le capital ne se pose jamais sur le support.** Il vit dans les `savingValuations`, qui s'empilent plutôt que de s'écraser : la valeur courante est le relevé le plus récent, les précédents font l'historique. Un `currentAmount` mutable serait une seconde vérité, et la première mise à jour perdrait la courbe.
- **Une valeur inconnue n'est pas zéro.** Un support jamais relevé ne vaut rien de connu ; un livret vidé vaut zéro, et c'est une information. Les totaux ne les confondent pas : ils additionnent ce qui est relevé et **comptent à part** ce qui ne l'est pas.
- **La valeur estimée est dérivée, jamais enregistrée** : dernier relevé + mouvements confirmés depuis. Elle s'affiche **qualifiée comme telle** ou pas du tout — elle ignore les variations de marché, et « valeur actuelle : 18 620 € » serait une fausse précision. Le même moteur pour tous les supports, livrets compris : deux façons de calculer un capital donneraient deux vérités à tenir d'accord.
- **Un mouvement d'épargne désigne son support par identifiant**, jamais par libellé ni par catégorie : `Entry.savingSupportId`, `Recurrence.savingSupportId`, `Advance.savingSupportId`. Une échéance générée hérite du support de sa règle. Le champ est facultatif au modèle — un document d'avant la v8 en porte qui n'en désignent aucun —, et un lien mort se **coupe** à l'import comme celui d'un membre, il ne fait pas disparaître la ligne.
- **Un support s'archive plutôt qu'il ne s'efface** dès qu'il a une histoire — un relevé, un mouvement, une règle, une avance. La suppression pure n'est offerte que sur un support qui ne retient rien, et elle coupe alors les liens qui pourraient rester. C'est la règle des catégories, qui ne s'effacent jamais non plus.
- `shared` est une **exception** à la règle de partage, jamais sa copie. Absent, la règle tranche — et c'est ce qui permet à tout ce qui a déjà été saisi de rester exploitable sans être requalifié.

---

## 4. Fonctionnalités

### 4.1 Premier lancement

**Avant les deux étapes : la notice.** Une modale bloquante s'affiche au premier chargement, une seule fois par navigateur et pour tout le monde, y compris qui utilise déjà l'app. Elle dit les quatre choses que l'app ne fait pas de ce qu'on y écrit : aucun compte, aucun cookie ni traceur, aucun serveur, et personne qui lise les données. Elle porte le lien vers la page de confidentialité, et se ferme par un seul bouton « J'ai compris », qu'une case « J'ai lu » active. Ni croix, ni Échap, ni clic sur le fond.

Elle est bloquante parce qu'aucune autre forme ne l'est. La promesse est déjà écrite sur la présentation, à la dernière étape de l'onboarding, sur « à propos » et sur la page de confidentialité, c'est-à-dire partout où il faut lire. Quelqu'un qui arrive méfiant devant une app de finances et qui ne lit pas saisit ses revenus sans en avoir croisé une ligne : la promesse était partout sauf devant lui. La forme est celle d'un bandeau cookies, retournée : là où l'un fait accepter ce qui est pris, celle-ci dit ce qui n'est pas pris.

**Ce n'est pas une question, et c'est ce qui la réconcilie avec le §1.** « Rien à configurer pour démarrer » tient toujours : elle ne configure rien, ne demande aucune information *sur qui la lit*, et l'app se comporte exactement pareil avant et après. Rien n'est enregistré de ce que vaut la case : elle allume le bouton, et c'est tout ce qu'elle fait ; elle est là pour qu'on lise, pas pour qu'on réponde. Le nom du foyer, lui, reste supprimé pour la raison inverse : il exigeait une réponse sur soi, et pour une décoration.

**Aucune des quatre lignes ne dit « aucun traitement de données ».** Servir la page laisse une trace dans les journaux de l'hébergeur, la page de confidentialité le dit en clair, et une notice faite pour être crue ne peut pas se faire prendre sur la seule ligne vérifiable. Les quatre portent donc sur ce que devient *ce qu'on saisit*, ce qui reste vrai, et la nuance se lit sur la page, à un lien de là.

**Trois familles d'écrans ne la reçoivent pas**, et aucune n'est une exception de confort. Les **trois pages juridiques**, parce qu'elle y mène : son lien est la seule chose qu'elle donne à vérifier, et une modale qui recouvre la page qu'il vient d'ouvrir fait passer le lien pour cassé. Elle revient en repartant, décochée, car lire la politique n'est pas dire qu'on l'a lue. Le **nuancier**, qui n'est pas un écran de l'app et qui existe précisément pour inspecter les composants, celui-ci compris. Et un **document qui ne s'ouvre pas** : l'écran d'arrivée porte alors les quatre recours du §5, et retarder un sauvetage de données pour une formalité serait le pire moment de toute l'app pour bloquer. Dans les deux derniers cas le fait de l'avoir lue n'est pas enregistré : elle est due, elle est seulement remise.

Le fait qu'elle a été fermée vit dans le stockage local, hors du document : il décrit ce navigateur-ci, pas le foyer. « Tout effacer » (§4.8) ne le remet donc pas à zéro : l'effacement porte sur les données, pas sur ce qu'on a lu, et rouvrir une modale bloquante devant quelqu'un qui vient de tout effacer serait une punition. La page de confidentialité le dit, plutôt que de promettre qu'il ne reste rien.

Elle ne porte pas la contrepartie du local-first, à savoir que vider le navigateur efface tout et que l'export est le seul recours. Celle-ci reste à la dernière étape de l'onboarding, où elle est déjà nommée : ce sont deux sujets, et un avis qui dirait les deux cesserait d'être lu.

Puis les trois étapes, et **aucune n'exige de réponse** ; **rien à configurer pour démarrer** reste la règle.

1. Personnes. « Avec qui tu partages des dépenses ? » L'utilisateur peut passer directement (usage solo) ou ajouter des personnes, prénom uniquement.
2. **Ce qui revient chaque mois — facultative.** Un montant de salaire par personne (ou un seul, sans propriétaire, quand personne n'est nommé) et ce qu'on verse pour se loger. Chaque montant saisi pose une récurrence mensuelle ; un champ laissé vide ne pose rien, et un bouton « Je le ferai plus tard », aussi visible que le principal, ouvre l'app sans rien poser.
3. **Ton épargne actuelle — facultative.** Un support par ligne : un nom, un propriétaire, un type, le rythme auquel on le relève, et le montant qu'il vaut aujourd'hui. Elle répond à « combien j'ai et où », et à rien d'autre : **ni taux, ni objectif, ni durée, ni allocation, ni scénario**. Le rythme n'y déroge pas — il dit quand un relevé sera *redemandé*, jamais ce que le support rapportera d'ici là —, et c'est la seule question du formulaire à laquelle on répond sans rien consulter : deux choix, l'un présélectionné. Un champ de versement mensuel s'y ajoute, facultatif lui aussi : il pose une récurrence reliée au support, pas un montant recopié dessus. Le bouton qui saute est aussi visible que le principal, et l'épargne s'ajoute à tout moment depuis l'écran Épargne.

**Le nom ne se demande plus.** Il ouvrait l'onboarding — « Comment s'appelle ton foyer ? », pré-rempli « Maison » — et il était la *seule* réponse exigée de toute l'app. Ce qu'il achetait : une ligne de texte en tête de la colonne latérale, qui affiche déjà le nom de l'app au-dessus et se passe très bien d'une seconde. Une question bloquante pour une décoration ne tient pas, et celle-ci demandait en plus à qui vit chez ses parents ou en coloc de nommer un foyer qui n'est pas le sien. Le nom vit désormais dans les réglages, **facultatif** : vide, la ligne ne s'affiche pas, et il n'y a aucun repli à inventer.

La question qui reste porte sur ce dont le calcul se sert. « Qui vit ici ? » supposait la cohabitation, que rien dans le partage n'utilise : le prorata du §4.7 ter marche à l'identique pour deux personnes à deux adresses, deux colocataires, ou quelqu'un qui partage un abonnement avec sa sœur. La question demande donc le partage d'une dépense, et n'exclut plus personne au passage.

La seconde étape n'est pas un questionnaire de configuration, et c'est la condition de son existence : elle ne pose aucune question dont la réponse serait exigée, elle ne demande ni catégorie, ni jour, ni périodicité. Mais « ne rien exiger » et « ne rien proposer » sont deux choses différentes — l'app ne vaut rien tant que les récurrences ne sont pas posées (§4.2), c'est sa thèse, et le seul geste que l'écran du mois offrait ensuite était une dépense ponctuelle, qui n'amorce aucune prévision.

Ses deux lignes ne sont pas choisies au hasard. Le revenu d'une personne ne se déclare nulle part : il se lit sur ses récurrences de nature `resource` (§4.7 ter), donc un salaire par personne est le seul chiffre qui fasse parler le prorata. Le toit est la charge commune la plus répandue, et la première qui rende le partage lisible — mais la ligne ne dit pas « Loyer » tout court : on peut être hébergé, verser une participation, ou ne rien payer, et elle nomme les trois plutôt que de faire du loyer une évidence. Elle dit aussi qu'on peut la laisser vide, ce qu'elle était déjà sans le dire.

Le **jour d'échéance ne se demande pas** — un champ de plus par ligne ramènerait le questionnaire. Les récurrences sont posées au 1er du mois courant, mensuelles, et l'étape le dit en clair : le jour, le libellé et la catégorie s'ajustent ensuite depuis la fiche (§4.2). La ligne du logement ne porte ni membre ni exception de partage : la règle du §4.7 ter la rend commune, et la poser explicitement recopierait la règle au lieu de s'y fier.

Les échéances de ces récurrences naissent à l'ouverture du mois courant, comme celles de n'importe quel mois qui s'ouvre : **à confirmer**, jamais confirmées d'office — l'app ne sait pas si le loyer de ce mois-ci a déjà été payé.

La contrepartie du local-first — vider le navigateur efface tout, l'export est le seul recours — est **nommée à la dernière étape**, sous la promesse de confidentialité. Elle ne se découvrait qu'au bout de trente jours, par le rappel du §4.8. Elle se durcit d'un cran là où ce navigateur a déjà répondu qu'il ne s'engageait pas à conserver (§5) — et là seulement : un « on ne sait pas » n'est pas un refus, et l'annoncer à tout le monde ferait de la phrase honnête un avertissement de plus qu'on n'écoute pas. Dans tous les cas ce n'est qu'une ligne de texte : **rien ne bloque l'onboarding**.

Un jeu de catégories par défaut est créé, modifiable ensuite.

### 4.1 bis Catégories

Deux niveaux. Une **famille** porte une nature — Ressources, Charges, Crédits et dettes, Versements — et ses catégories en héritent leur sens et leur teinte.

Le catalogue par défaut suit le vocabulaire d'un budget familial : Ressources (salaires, allocations, prestations familiales, pensions reçues, aide au logement, revenus fonciers), huit familles de charges (Logement, Communication, Transport, Vie courante, Santé, Famille et scolarité, Impôts et taxes, Loisirs et divers), Crédits et dettes (automobile, immobilier, location longue durée, crédits d'achat, autres), Versements (livrets, plans, assurance vie, épargne retraite, épargne entreprise).

Tout est modifiable : renommer une famille, en créer une avec sa nature, ajouter ou archiver une catégorie. La teinte et le sens ne se saisissent jamais — ils découlent de la famille, et les laisser diverger d'elle n'aurait aucun sens lisible.

Un renommage n'est enregistré qu'à la sortie du champ, jamais à chaque frappe : c'est déjà la règle de tous les formulaires, qui n'écrivent qu'à l'enregistrement.

Le catalogue se **filtre par libellé**. Quarante-six catégories sous onze familles repliées : retrouver « Carburant » demandait de deviner qu'elle est rangée sous Transport, puis d'ouvrir les familles une par une. Une famille dont le nom correspond garde toutes ses catégories ; les autres se réduisent à ce qui correspond, et un résultat s'affiche déplié. L'état de repli n'est pas touché : effacer la recherche retrouve les sections telles qu'on les avait laissées.

### 4.2 Récurrences

- Création et reprise : **le formulaire de saisie du §4.4**, ouvert avec le rythme réglé sur « Récurrence ». Pas un second écran — c'est le même objet qu'on décrit, et deux formulaires pour un objet finissent toujours par ne plus poser les mêmes questions. Ses champs, ses règles et ses mots sont donc ceux du §4.4, y compris « membre » (§4.7 ter) : une récurrence pose une échéance par période, si bien que sans propriétaire ni partage, elle creuserait le trou à chaque fois.
- Périodicités : hebdomadaire, mensuelle, trimestrielle, annuelle — et **un intervalle sur chacune des trois unités** : toutes les *n* semaines, tous les *n* mois, tous les *n* ans. Le modèle porte un `every` sur les trois depuis toujours ; le formulaire n'en proposait un que sur les mois, si bien qu'une quinzaine — le rythme d'une paie sur deux — ne se saisissait pas, et qu'une périodicité importée que le formulaire ne savait pas montrer se faisait **réécrire à sa première reprise**, en silence : un écran renvoie l'état complet de ce qu'il montre (§3), et ce qu'il ne montre pas s'efface.
- Le jour d'échéance est **borné, jamais reporté** : une mensuelle au 31 tombe le 31 janvier, le 28 février, puis de nouveau le 31 mars. Saisir 31 est donc la façon de dire « le dernier jour du mois », et les écrans le disent avec ces mots-là plutôt que d'annoncer « le 31 » sur une échéance qui tombe le 28.
- Liste triée par prochaine échéance, avec le coût mensuel équivalent et le coût annuel.
- Ordre au choix à l'intérieur d'un groupe : **prochaine échéance** par défaut, ou **montant**. Le premier répond à « qu'est-ce qui tombe bientôt », le second à « qu'est-ce qui me coûte le plus » — c'est l'écran de cette question-là, et son chiffre est déjà sur chaque ligne. Le montant se lit en valeur absolue, la liste mêlant les deux sens ; une récurrence variable non chiffrable passe en fin de liste plutôt que d'être rangée comme un zéro.
- Liste regroupée sur un axe au choix : **catégorie** ou **personne**, chaque groupe portant son nombre de récurrences et son solde mensuel, et **filtrée par nature** — Tout, Charges, Revenus, Épargne. Le « + » que le DS accorde aux entrées ne suffit pas à distinguer un salaire d’une charge dans une liste qui les mêle, d'autant que la pastille prend la teinte de la catégorie et pas du sens : c'est le filtre qui répond à ça. Et il dit des **natures**, jamais des sens : une mensualité d'épargne sort du compte mais n'est pas une charge — filtrée par sens, elle se rangeait sous « Charges », un mot que la tuile du même nom refuse. Le total en tête de page suit le filtre ; sans filtre, il ne compte que les sorties, épargne et crédits compris, et le dit. Les en-têtes de groupes suivent la même règle que la liste du mois (§4.4 bis) : la langue de la pilule sous un filtre — l'épargne en net, reprises déduites —, le solde sous « Tout ».
- Un groupe dont tout est à montant variable affiche « montant variable » plutôt qu'un zéro, et un groupe qui n'en contient qu'une partie ne compte que ce qu'il sait chiffrer.
- Les périodicités non mensuelles sont amorties au mois dans toutes les statistiques.
- Une récurrence peut être arrêtée sans être supprimée — et supprimée sans être seulement arrêtée : les deux gestes existent côte à côte sur sa fiche, et chacun fait ce qu'il dit (§3). Les deux demandent confirmation, l'arrêt comme la suppression : le premier emporte les échéances prévues à venir.
- Créer, modifier ou reprendre une récurrence réaligne ses échéances à venir dans la foulée, dans tous les mois ouverts à partir du mois courant. L'utilisateur n'a jamais à demander cette régénération : poser la règle et en tirer les échéances sont un seul geste.
- Détection automatique de changement de prix : si le montant confirmé diffère du précédent, l'app le signale sur la fiche. L'alerte — rouge et panneau — n'apparaît que quand le changement coûte : une charge qui monte, un revenu qui baisse. Une augmentation de salaire se lit sans alarme — et l'épargne n'alarme jamais : verser plus sur un livret ne coûte rien, l'argent reste à qui le place. Le changement se lit quand même, et se dit « montant » plutôt que « prix » : un virement d'épargne n'en a pas.

### 4.3 Ouverture du mois

L'ouverture est un mécanisme interne, jamais une tâche : aucun écran ne demande de l'actionner.

1. Un mois s'ouvre dès qu'on l'affiche, s'il n'est pas passé — le mois courant à la première visite, un mois à venir dès qu'on y navigue.
2. L'app génère une `Entry` `planned` pour chaque échéance de récurrence tombant dans le mois.
3. Les échéances du mois se lisent en **une seule liste**, par date. Celles à montant variable y portent leur champ de saisie, pré-rempli du montant de la dernière échéance confirmée, et leur ligne le dit — une explication en tête de section est oubliée le temps d'arriver au champ qu'elle décrit. Toutes les lignes tiennent sur **un seul niveau**, de 320 à 1920px, et leurs montants — saisis ou non — s'alignent dans une même colonne de largeur fixe. Un libellé trop long tronque ; il ne renvoie jamais à la ligne.
4. L'utilisateur confirme en bloc ou une par une. « Confirmer le mois » ne touche pas aux montants à saisir, et l'écran le dit avant qu'on l'actionne.
4. bis **Confirmer se défait.** Une échéance confirmée redevient prévue, à l'unité depuis son écran ou pour tout le mois depuis la section « À confirmer » — qui ne disparaît donc plus une fois le mois bouclé : c'est là qu'on a confirmé, c'est là qu'on doit pouvoir revenir dessus. Le montant saisi est conservé : reconfirmer le retrouve tel quel. Seule une échéance de récurrence fait demi-tour ; une saisie ponctuelle est un fait, pas une prévision en attente, et se corrige ou se supprime.
5. Une échéance prévue **s'ouvre** : elle mène à l'écran de saisie, qui sait corriger un montant, changer une date, réattribuer un membre ou la supprimer. Confirmer n'a jamais été le seul geste possible, seulement le seul qu'on pouvait atteindre. Modifier ne confirme pas : la confirmation a son geste.

Un mois passé ne s'ouvre jamais tout seul : y faire apparaître des échéances que personne n'a confirmées inventerait un historique.

**Et l'ouverture s'arrête à douze mois.** Ouvrir écrit des échéances pour de bon : sans borne, chaque « mois suivant » ouvrait le mois, ce qui repoussait la navigation d'un cran, ce qui laissait aller plus loin — cent clics valaient cent mois de prévisionnel dans le document, inélaguables autrement qu'entrée par entrée. Douze mois, c'est la fenêtre de l'historique et celle d'une assurance annuelle ; au-delà, on ne consulte plus un prévisionnel, on spécule sur des récurrences qui auront changé. La navigation ne propose donc pas de mois plus lointain, sauf pour rejoindre des données qu'un document importé porterait déjà là-bas — mais elle n'y ouvre plus rien.

L'opération est idempotente — une échéance est reconnue à sa paire récurrence + date — donc naviguer d'un mois à l'autre ne duplique rien.

Une `Entry` `planned` compte dans les prévisions, jamais dans le réalisé.

**Un mois vide n'a pas toujours la même cause, et n'appelle donc pas le même geste.** Tant qu'aucune récurrence n'existe, c'est un document qui n'a pas démarré : l'état vide propose d'abord d'en poser une, parce qu'une dépense ponctuelle n'amorce aucune prévision. Dès qu'il en existe une, le mois vide redevient un mois ordinaire et les deux portes de saisie reprennent leur rang. Les trois restent offertes dans les deux cas — au-delà de 1024px, la rangée d'actions est masquée sur un mois vide, et l'état vide est alors la seule porte de saisie de l'écran.

### 4.4 Saisie

**Un seul formulaire, plusieurs états initiaux.** Décrire une dépense de ce matin et décrire un loyer mensuel sont le même geste à une case près, celle qui dit « ça se répète ». Il y en avait pourtant deux — un pour l'`Entry`, un pour la `Recurrence` — et ils avaient nécessairement divergé : ordre des champs différent, libellés et messages différents, champs présents d'un côté et absents de l'autre, une correction sur deux qui n'atteignait qu'une moitié des utilisateurs. Deux formulaires pour un objet, c'est laisser croire qu'il existe deux sortes de récurrences.

Il n'en reste qu'un. Les portes d'entrée ne transmettent **que des valeurs initiales**, jamais un formulaire différent :

| Porte | Nature | Rythme |
| --- | --- | --- |
| Dépense / Revenu / Épargne | présélectionnée | **Ponctuel** |
| Récurrences → Ajouter | Dépense | **Récurrence** |

Rien à l'écran ne dit par où l'on est passé — mêmes champs, mêmes mots, mêmes espacements, mêmes comportements. Et rien n'y enferme : arrivé par « Ajouter une récurrence » pour constater qu'il s'agit d'un achat unique, un doigt suffit, sans ressortir chercher l'autre porte.

Écran plein, avec son URL. Trois choix successifs, en tête : **Dépense / Revenu / Épargne**, puis **Ponctuel / Récurrence**, puis — seulement en récurrence, où la question existe — **Montant fixe / Montant variable**. Puis les champs communs aux deux rythmes : montant, catégorie, libellé, membre, charge commune, note. Le rythme n'ajoute qu'une chose : la **date** devient la **première échéance**, et la périodicité s'affiche avec ce qu'elle demande.

Le **titre** ne nomme donc plus ce qu'on croit enregistrer — « Ajouter une opération », à la création, quelles que soient les bascules. Un titre qui suivrait les six combinaisons donnerait l'impression de changer d'écran sans bouger, et « Ajouter une récurrence » s'affichait déjà au-dessus d'un formulaire qu'un seul geste ramenait au ponctuel. C'est le **bouton** qui nomme ce qui va être créé — « Ajouter l'opération », « Ajouter la récurrence » : le dernier endroit où le dire, et le seul qui ne change plus rien après. En reprise, en revanche, ni la nature ni le rythme ne bougent plus, et le titre redevient précis.

La **note** ferme un aller sans retour : `Entry.note` se lit sur la ligne du mois (§4.4 bis), se cherche depuis l'historique et survit à une reprise, mais aucun écran ne permettait d'en écrire une — elle n'entrait dans le document que par un import. Elle est en dernier : c'est le champ dont on se passe.

Le membre est **facultatif tant que le partage prend la ligne en charge, obligatoire dès qu'il ne la prend pas** — voir « à quelqu'un, ou à tout le monde » en §4.7 ter. Le champ le dit à l'ouverture, avec la raison, et pas seulement après un échec d'enregistrement.

Une bascule **Nature** y siège en tête : **Dépense**, **Revenu**, **Épargne**. Elle ne demande pas le sens de trésorerie, elle demande ce qu'on enregistre — et en déduit le sens. Verser sur un livret sort du compte, donc se saisissait par « Dépense », et il fallait aller chercher « Livrets » entre les courses et le carburant : on ne dépense pas son épargne, on la déplace. Les catégories d'épargne ne figurent donc plus dans la liste d'une dépense, et réciproquement.

En **Épargne**, une seconde bascule dit le mouvement : **Je place** (l'argent quitte le compte pour un support) ou **Je reprends** (il en revient). Le second n'existait nulle part : le sens « entrée » ne proposait que des ressources, et un retrait de livret n'en est pas une. C'est la même écriture que la reprise d'une avance — une `Entry` de sens `in` sur une catégorie `saving` — et l'épargne se comptant en net, elle s'y retranche des versements.

En **Épargne** toujours, le champ central n'est pas la catégorie mais le **support** : la question de ce geste-là est « où va l'argent », et le support y répond seul — il porte le poste sous lequel le mouvement se range *et* la personne à qui il est. Les deux se **dérivent** de lui : les redemander donnerait trois réponses pour un seul fait, dont deux peuvent se contredire — un versement sur le PEA d'Andrea, rangé en « Livrets », au nom de Marie. Quand aucun support n'existe encore, l'écran en propose la **création sur place**, dans une feuille : partir vers l'écran Épargne perdrait le montant et la date déjà saisis, et le support créé revient présélectionné. Sans personne au foyer, aucun support ne peut exister, et la saisie retombe sur la catégorie — tout ce qu'on peut alors savoir du mouvement.

La case « à partager » ne s'affiche qu'en Dépense, et seulement sur une catégorie de nature `charge` ou `debt` : un versement d'épargne sort du compte mais reste à qui le fait, et un revenu ne se répartit pas davantage — on compare ce que chacun gagne, on ne se le redistribue pas. Ailleurs, la case ne pouvait qu'afficher « non » et proposer un « oui » que le calcul aurait ignoré. Sur « en commun », elle est cochée et verrouillée (§4.7 ter).

La bascule **Ponctuel / Récurrence** n'existe qu'à la création. En récurrence, l'écran ne pose plus un fait mais une règle : une `Recurrence` est créée à la place de l'`Entry`. En reprise, la bascule disparaît — convertir après coup une dépense passée en récurrence, ou l'inverse, réécrirait un historique.

**Ce qu'il advient de la première échéance ne dépend pas de la porte, mais de la seule question qui compte : a-t-elle eu lieu ?** Elle part **confirmée** si elle est datée d'aujourd'hui ou d'avant *et* que le montant est fixe — c'est « j'ai payé le loyer, et c'est tous les mois », le geste le plus fréquent de la saisie. Elle part **prévue**, comme les suivantes, si elle est à venir — rien n'a eu lieu — ou si la règle est à montant variable : la marquer payée l'enregistrerait à l'estimation, c'est-à-dire à une supposition. L'écran le dit sous le champ de date, **avant** l'enregistrement : ce qui va se passer ne se découvre pas après coup.

Le **montant** est exigé partout, sauf sur une règle à montant variable où il devient facultatif — il n'y chiffre plus l'opération mais l'ordre de grandeur qu'on lui prête, en attendant la première échéance chiffrée (`Recurrence.estimate`, §4.2). Un chiffre saisi n'est jamais avalé en silence pour autant : zéro ou illisible reste une erreur.

Le **jour du mois** et le **jour de la semaine** se préremplissent depuis la première échéance : « le 1er mars » répond déjà à « quel jour du mois », et le redemander serait poser deux fois la même question. Ils restent modifiables — c'est la date suivante qui les reprend.

Dépense, revenu et épargne sont trois points d'entrée distincts, côte à côte, sur le mois, sur le bouton flottant comme sur le calendrier : la nature est choisie avant d'ouvrir le formulaire, qui s'ouvre déjà réglé. On ne met pas de côté par « Dépense » — la troisième porte existe partout où les deux premières existent. La **confirmation** suit ce qui a été enregistré — on n'annonce pas « dépense ajoutée » après un salaire, ni « dépense ajoutée » après une récurrence.

La date proposée est aujourd'hui si l'on est dans le mois affiché, sinon le premier de ce mois — et le jour sélectionné quand la saisie part du calendrier. La règle vaut pour les deux portes.

### 4.4 bis Liste du mois

Ce qui a eu lieu, regroupé sur un axe au choix : **jour**, **catégorie** ou **personne**. Chaque groupe porte son nombre de lignes et son **solde** — pas une somme : un jour où l'on touche un salaire et où l'on paie le loyer ne se résume pas en additionnant les deux.

La liste se **filtre par nature** — Tout, Charges, Revenus, Épargne : les mots de la saisie et des tuiles, qui comptent par nature. Un versement d'épargne sort du compte mais n'est pas une charge, une reprise rentre mais n'est pas un revenu : filtré par sens, l'un se rangeait sous « Charges » et l'autre sous « Revenus », et le sous-total du filtre contredisait la tuile voisine, qui exclut l'épargne. Les deux tuiles de flux mènent à la liste filtrée sur leur nature — le clic montre exactement ce que le chiffre compte, ni plus ni moins.

Sous une pilule, les totaux — le sous-total du filtre et l'en-tête de chaque groupe — parlent la langue de la pilule et non celle du solde : les charges en sortie pleine, comme la tuile du même nom, les revenus en entrée, et l'épargne **en net** — les versements moins les reprises, comme partout, et non l'inverse que donnerait le solde, où mettre 300 € de côté se lirait « −300 € » sous une pilule nommée Épargne. Le solde reste la lecture de « Tout », où les natures se mêlent.

Elle se filtre aussi **par poste**, quand on y arrive depuis l'anneau « Où part l'argent » (§4.6). Le filtre se nomme et se retire d'une pilule : une liste réduite par un geste fait deux écrans plus haut, et qu'aucune commande visible ne défait, se lit comme un mois où il manque des lignes. Choisir une nature l'efface — les deux se contredisent dès qu'on sort des charges.

**La note d'une ligne se lit dans la liste**, jointe au membre par un point médian. Elle se saisissait et ne se relisait nulle part : il fallait rouvrir la ligne pour la voir, et rien n'annonçait qu'il y en avait une — alors qu'une fiche de récurrence affiche la sienne depuis toujours. C'était une asymétrie, pas une décision.

Les groupes se replient, et **un seul est ouvert à l'arrivée**. Par jour, c'est celui d'aujourd'hui, ou à défaut le plus récent : la liste s'ouvrait en entier — c'est l'ordre de la lecture, et c'était juste tant qu'on ne comptait pas la hauteur. Un mois ordinaire tient une dizaine de jours et une quarantaine de lignes, soit près de deux mille pixels dépliés d'office, tout en bas d'une page qui en faisait déjà quatre mille. Tout replier n'est pas la réponse non plus : la section devient un accordéon mort et le jour qu'on vient lire demande un clic de plus. Par catégorie ou par personne, rien ne s'ouvre : c'est un résumé dans lequel on entre, et l'en-tête porte déjà la réponse. Un « tout déplier / tout replier » vaut pour la liste entière, et son libellé suit l'état.

Sur le mois courant, le groupe du jour se **nomme** — « 8 août · aujourd'hui » — et passe en encre pleine. L'accentuation est légère, mais elle n'est jamais portée par la seule nuance : une couleur qui dit toute seule ce qu'elle veut dire n'est lue par personne.

Les trois commandes de la liste sont de trois natures — l'axe **range**, les pilules **retirent**, « tout replier » **agit** — et chacune porte son libellé à l'œil. Elles se partageaient une rangée sans un mot, et trois gestes différents y avaient exactement la même apparence.

Par jour, du plus récent au plus ancien. Sur les deux autres axes, le plus gros mouvement d'abord.

### 4.5 Calendrier

Vue mensuelle. Chaque jour porte une pastille par échéance, couleur de la catégorie, opacité réduite si `planned`. Un jour sélectionné ouvre la liste de ses entrées.

### 4.6 Dashboards du mois

**L'écran répond à trois questions, dans cet ordre, et rien ne se lit avant ce qui le précède.**

1. **Où j'en suis** — le solde du mois, les deux totaux qu'il combine, l'avancement des confirmations, puis les deux soldes qui projettent le mois.
2. **Ce que j'ai à faire** — les échéances à confirmer (§4.3).
3. **Pourquoi mon mois ressemble à ça** — où part l'argent, ce qu'on peut mettre de côté, comment le foyer se répartit, ce qu'on doit encore ; puis ce qui tombe bientôt, puis le détail des lignes.

Ce n'est pas une préférence de mise en page, c'est ce que l'écran a longtemps refusé de faire. Il montrait d'abord **toutes** les lectures du mois d'un coup, avec le même poids — six chiffres d'argent d'affilée —, puis les deux soldes projetés, puis les prochaines échéances, et **seulement ensuite** la seule chose qui demande un geste. Mesuré sur un téléphone, « À confirmer » commençait à ~1 290px du haut, ~1 600px avec deux membres et un crédit : deux écrans de défilement pour trouver sa tâche du jour, sur un produit dont la thèse est qu'on confirme ce qui était prévu. La grille se coupe donc là où la narration se coupe — une grille pour la situation, une pour l'analyse, et la tâche entre les deux (§ design system).

- **Solde du mois** : entrées confirmées − sorties confirmées.
- **Revenus** : ce que le mois fait rentrer — les ressources, `planned` comprises —, avec ce qui reste à tomber en seconde lecture.
- **Charges** : ce que le mois fait payer — charges et crédits, `planned` compris —, avec le reste à payer en seconde lecture. L'épargne en est exclue, comme partout : un versement sort du compte mais reste à qui le fait, et personne ne le réclame.
- **Part du commun**, sous un filtre par membre seulement : ce que la personne filtrée porte des charges communes, le coefficient qui le produit, et ses charges à elle en regard. Ses chiffres comprennent déjà sa part du pot commun (§4.7 ter) — sans quoi elle se lirait comme si elle vivait sans loyer —, mais une fois fondue dans le total des charges, cette part ne se voit plus : le solde valait bien ses revenus moins ses charges moins sa part du commun, et le troisième terme n'apparaissait nulle part. Elle vient donc juste après ce qui rentre et ce qui se paie, dont elle est la suite de la même phrase. C'est la contrepartie exacte de la tuile Répartition, qui montre les parts de tout le monde et s'efface sous un filtre : l'une ou l'autre est visible, jamais les deux, et elles mènent au même écran de détail. Les montants s'affichent au centime — arrondis, la part et les charges personnelles ne redonneraient plus le total annoncé par la tuile voisine. Elle vaut aussi pour qui est seul·e : sa part est le pot entier, à 100 % (§4.7 ter).
- **Suivi du mois** : combien d'opérations sont confirmées, sur combien — « 12 / 16 ». C'est le couple prévu / confirmé lu au niveau du mois, et il ne se lisait nulle part : chaque ligne portait son état, le mois ne portait pas le compte, et savoir qu'il restait quatre échéances demandait d'avoir déjà trouvé la liste qu'on cherchait. Des **opérations** et non des échéances : le compte additionne les lignes ponctuelles — des faits, jamais prévues — à ce qu'une règle a produit, et « échéance » est réservé au second (§4.3). Elle compte **exactement ce que la section « À confirmer » liste**, filtre compris : deux chiffres voisins qui se compteraient chacun de leur côté finiraient par diverger. C'est donc la portée des **listes** qu'elle suit et non celle des chiffres — sous un filtre par membre, les listes gardent les échéances entières là où les montants proratisent, et un ratio à 6,2 / 14,8 ne correspondrait à rien de cliquable. Un ratio en toutes lettres et non une jauge : une forme ne porte jamais seule ce qu'elle dit. Sur le commun, elle reste : le pot a ses propres échéances à confirmer.
- **Solde prévisionnel** : en incluant les `planned` restantes.
- **Reste à vivre** : solde prévisionnel jusqu'à la prochaine entrée d'argent.
- **Capacité d'épargne** : ressources − charges − crédits, donc avant versements, avec le taux d'épargne en seconde lecture. C'est ce que le solde ne dit pas : lui compte un versement comme une sortie, si bien qu'un mois où l'on met 300 € de côté se lit comme un mois où l'on a dépensé 300 € de plus.
- **Où part l'argent** : répartition par famille, sur les charges et les crédits. L'épargne en est exclue et se lit à part — elle sort du compte mais reste à qui la fait. Et elle ne s'y lit pas non plus en seconde lecture : un « mis de côté » sous l'anneau se lisait au seul confirmé quand l'anneau compte aussi les prévues, et venait mêler à une répartition de dépenses un chiffre qui n'en est pas une. Ce qui est versé se dit sur **Capacité d'épargne** — avec ou sans filtre, sur le mois entier comme la capacité et le reste qui l'encadrent — et se détaille sur l'écran de l'épargne. **Chaque part de la légende s'ouvre** sur les lignes du mois qu'elle compte (§4.4 bis) : les deux tuiles de flux mènent depuis longtemps à la liste filtrée sur leur nature, et voir « Logement 890 € » sans pouvoir demander ce qu'il y a dedans était un geste sans réponse. Le lien est sur la ligne et non sur la tuile — une tuile cliquable enfermerait la légende dans un bouton, et ne saurait pas laquelle des sept parts on visait. « Autres » ne s'ouvre pas : ce n'est pas une famille mais le reste de la liste.
- **Capacité d'épargne**, seconde lecture : deux clauses, « versé · reste à placer », **toutes deux sur le mois entier** comme le chiffre qu'elles encadrent. Ce sont les deux moitiés de la capacité, et elles doivent la redonner : posés à côté d'elle, trois chiffres qui ne s'additionnent pas se lisent comme une erreur de calcul. C'est ce qui interdit de dire le versement au seul confirmé, plus juste pourtant sur le mot — il manquerait alors à l'écran ce qui est programmé sans être encore parti, et l'écran de l'épargne, qui compte le mois entier, annoncerait un autre montant sous le même mot. Le versement se dit **avec ou sans filtre** : la somme d'épargnes individuelles ne décide de rien, ce qui vaut pour un reste à placer — il appelle un geste, et le geste se fait sur un compte à la fois — et non pour un constat, que l'écran de l'épargne additionne d'ailleurs déjà. Hors filtre et sous 1024px, le mois ne disait nulle part ce qu'il avait mis de côté, quand son solde comptait le versement comme une dépense. Les deux clauses n'ont pas le même seuil d'affichage : le versement est court — « 804 € versé sur le mois » — et suit la largeur de sa tuile, la phrase du reste attend 1024px (§ design system). Réunies en une seule, elles ne tenaient à aucune largeur en deçà.
- **Crédits** : capital restant dû, tous crédits confondus, et le nombre de crédits en cours. Une synthèse et un chemin, pas une lecture quotidienne du mois : elle tient sur une rangée simple, et le montant y renonce à ses centimes — c'est le plus gros chiffre de l'app, et deux centimes ne changent rien à un capital qu'on met vingt ans à rendre.
- **Dépenses par jour**, barres empilées par catégorie — sur les charges et les crédits, hors épargne, comme partout.
- **Prochaines échéances**, les 5 suivantes avec le nombre de jours restants. Elle ne s'arrête pas aux mois déjà ouverts : au-delà, les échéances sont **projetées depuis les règles**, sans rien écrire. Une récurrence ne pose d'`Entry` que dans un mois affiché, si bien que la tuile sautait par-dessus les mois jamais visités et annonçait « dans 92 jours » quand deux mois d'échéances tombaient avant. Dans un mois ouvert, en revanche, l'échéance posée fait foi et rien n'est projeté : sa date ou son montant ont pu être corrigés, et l'une d'elles supprimée. Les **retards** du mois courant y figurent, en jours négatifs : une échéance passée que personne n'a confirmée est la plus proche de toutes.

Les quatre soldes — mois, prévisionnel, reste à vivre, capacité d'épargne — se ressemblent à l'œil sans dire la même chose, et aucun ne répond à « combien je gagne, combien je paie » : un solde a déjà fait la soustraction. C'est pourquoi les deux totaux qu'il combine se lisent à côté de lui, avant les trois autres.

**Les quatre soldes s'ouvrent sur une feuille** qui donne leur calcul et, surtout, ce qui les sépare de leurs voisines. La tuile ou la rangée entière est la cible : sur une rangée simple, un bouton d'aide et l'étiquette ne tiennent pas côte à côte.

**Le prévisionnel et le reste à vivre se lisent en rangées, sous « Situation », et eux seuls.** La raison n'est pas la hiérarchie mais un fait de calcul : sans rentrée d'argent restant à venir, le reste à vivre prend la fin du mois pour horizon, donc **il vaut le prévisionnel au centime**. Deux tuiles voisines annonçaient alors deux fois le même montant sous deux noms, et la phrase qui l'explique — l'horizon de chacun — vivait sur une lecture secondaire qu'aucune tuile plate n'affiche en deçà de 1024px. La `description` d'une rangée, elle, passe à la ligne : les deux horizons se lisent à toutes les largeurs, et la coïncidence s'explique au lieu de passer pour une erreur de calcul. C'est la seule chose qui sorte ces deux lectures de la grille ; les autres y restent.

Même exigence sur « versé », en seconde lecture de la capacité d'épargne : le chiffre compte le mois entier, échéances prévues comprises, et le mot seul laissait croire à un virement déjà parti. Il le dit — « 804 € versé sur le mois ».

**Les prochaines échéances sortent de la grille aussi**, pour une autre raison : ce n'est pas un chiffre qu'on lit d'un coup d'œil mais une liste qu'on parcourt, et sa hauteur doit venir de son contenu plutôt que d'un format — cinq lignes s'y serraient à un pixel d'interligne. Elle se lit en section sous la grille, avec les deux autres listes de l'écran.

**Trois lectures du mois, et non deux.** Le mois se découpe de deux façons, et elles ne se recouvrent pas : `tout = commun + les lignes perso de chacun` d'un côté, `tout = la vue de chaque membre, additionnée` de l'autre. Le filtre porte donc trois positions — **tout le monde**, **le commun**, **une personne**.

- **Le commun** montre le pot seul, à son **montant plein** : aucune part n'y est calculée. C'est l'exact inverse de la lecture par membre, qui découpe ces mêmes lignes en parts. Il répond à ce qu'aucun écran ne savait dire — où part l'argent qu'on paie ensemble, quand ses échéances tombent, et ce qu'il coûtait le mois d'avant.
- Sous cette lecture, cinq tuiles s'effacent au lieu d'annoncer un zéro : un revenu ne se partage jamais, donc le pot n'en a aucun, et les quatre lectures qui soustraient des charges à des ressources — solde, prévisionnel, reste à vivre, capacité d'épargne — vaudraient toutes les charges au signe près. L'épargne s'en va pour la même raison qui l'exclut de « Où part l'argent ». Restent les charges, le suivi du mois — le pot a ses propres échéances à confirmer, et elles se comptent —, la répartition par famille, les prochaines échéances et la Répartition entre membres.
- **« Tout le monde » n'est pas « en commun ».** Le premier est une lecture — tout ce qui a eu lieu ; le second est ce que vaut une ligne que personne ne porte, donc commune. Les deux ont porté la même étiquette — « tout le foyer » —, à un écran d'écart, en voulant dire le contraire. La saisie dit désormais « en commun », le mot du filtre voisin, et la collision tombe.
- L'épargne n'a ni lecture commune ni lecture d'ensemble : elle ne se partage jamais, et une somme de comptes individuels ne se décide nulle part. Son écran ne propose donc que les personnes (§4.6 bis) — c'est le seul de l'app dans ce cas.
- **Le commun se propose dès la première personne.** Seule, sa vue vaut « tout le monde » au centime (§4.7 ter) : le pot est alors la seule lecture qui distingue encore les charges communes de ses lignes perso — la retirer au motif qu'il n'y a personne avec qui partager retirerait précisément la distinction qui reste.

Tous les dashboards acceptent ce filtre. Filtrer sur quelqu'un ne se réduit pas à ne garder que ses lignes : une charge commune n'appartient à personne, donc aucune ne passerait le filtre, et chacun se lirait comme s'il vivait sans loyer ni électricité — capacité d'épargne à peine inférieure au salaire, « aucune sortie ce mois-ci » sur la répartition. Un membre voit donc **ses lignes et sa part de chaque charge commune**, au prorata des revenus (§4.7 ter). L'en-tête le dit là où le filtre se choisit, et nomme ce qui manque quand le prorata ne se calcule pas — on retombe alors sur ses seules lignes, faute de mieux, mais on le sait. **Une phrase à l'écran, la règle dans une feuille** : ce qui doit rester visible est ce qui change la lecture d'un chiffre — « les chiffres incluent sa part des charges communes » —, et non la mécanique qui le produit. Celle-ci tenait trois lignes de gris en tête de chaque écran du mois, sous les pilules et avant le premier chiffre, c'est-à-dire qu'on la relisait tous les jours pour l'avoir comprise une fois ; elle s'ouvre désormais, comme le calcul des quatre soldes. La phrase entière est la cible du geste, pas un glyphe posé à côté. Les avertissements de prorata incomplet, eux, ne s'ouvrent pas : ils nomment déjà ce qui manque, et il n'y a rien de plus à en dire que le geste qu'ils appellent. Ce repli ne concerne que le cas à plusieurs : seule, une personne voit son prorata se calculer toujours, et sa vue est celle de l'ensemble, lignes de personne comprises — jusqu'aux listes, qui n'ont alors rien à retrancher.

Les **listes** ne suivent pas cette règle : à confirmer, entrées du mois, calendrier montrent les échéances réelles, en entier. On confirme une échéance, jamais une part.

**Le tableau de bord reste un tableau de bord de flux.** Ce que l'épargne *vaut* n'y figure pas, et c'est délibéré : le patrimoine ne bouge pas au rythme des échéances, et une seconde grosse section patrimoniale ferait lire deux chiffres sans rapport sous la même grille. La tuile Capacité d'épargne mène à l'écran qui en parle, et son « versé » vient des mêmes `Entry` que la ventilation par support — au centime, sous filtre comme sans.

### 4.6 bis Épargne — le stock et le flux

L'écran de l'épargne répond à six questions, dans cet ordre : **combien j'ai**, **combien de temps ça tient**, **où c'est placé**, **à qui c'est**, **ce que le mois y a mis**, et **ce que l'année a accumulé**. La dernière du lot d'origine est celle que la v1 savait déjà traiter, et elle ne bouge pas.

**L'écran ne concourt pas sur « combien j'ai ».** La banque y répond mieux — sans qu'on saisisse rien, plus vite, et sans se tromper —, si bien que chaque relevé demandé ici est une **transcription** : on recopie un nombre lu trente secondes plus tôt ailleurs. Ce que cette app est seule à pouvoir dire tient au fait qu'elle porte les deux bouts, le stock *et* ce qui le nourrit : la banque voit le solde, elle ne sait pas lesquelles des sorties sont des charges, lesquelles sont des virements vers soi-même. D'où deux lectures qu'aucune autre application ne produit, et qui sont ce qui **rend un relevé utile** :

- **Combien de temps le capital tient**, si les revenus s'arrêtaient : capital estimé ÷ charges d'un mois moyen. « 10 450 € » est une anecdote ; « tu tiens 4,2 mois » est une décision. Trois choix font la justesse du chiffre, et aucun autre écran ne les dit : les **mensualités de crédit comptent** au dénominateur — elles ne s'arrêtent pas quand le revenu s'arrête —, les **versements d'épargne non** — c'est la première chose qu'on coupe —, et le **mois en cours ne compte pas**, faute d'avoir tout dépensé. Le piège est que les trois sortent du compte : lus en trésorerie ils se confondent, et le nombre de mois serait sous-estimé d'un tiers chez qui épargne. La moyenne porte sur les douze derniers mois **vécus**, jamais sur douze cases — diviser par douze un foyer qui saisit depuis trois mois inventerait neuf mois sans charges. Sans mois complet ou sans charge, l'écran **nomme ce qui manque** plutôt que d'écrire « 0 mois » : un quotient sans dénominateur ne vaut pas zéro, il ne veut rien dire. Et sans relevé, la lecture ne s'affiche pas du tout — la tuile Capital dit déjà l'absence, et deux fois la même absence se lit comme deux absences.
- **Ce qui est mis de côté au fil de l'année**, en cumul mois après mois, année N contre année N−1. C'est du **flux pur** : les mêmes `Entry` que la capacité et la ventilation, comptées en net, et **aucun relevé n'y entre**. L'app est une machine à mois — tout y est borné par `ym` —, et l'épargne est la seule notion qu'on y ait greffée qui n'ait aucun sens à l'intérieur d'un mois : on voyait douze états mensuels, jamais une trajectoire, alors que la donnée était là depuis le premier jour. Le tracé, la coupe des mois vides et l'horizon commun aux deux années sont **ceux de la comparaison d'années** de l'historique (§4.9) : deux dessins du même cumul finiraient par ne plus se lire pareil.

**Quatre notions, quatre mots, et aucun qui se prête à un autre.** L'écran en montre quatre à la fois — le **capital** qu'on possède, les **mouvements** qui l'alimentent ou l'entament, la **capacité** que le budget dégage, et les **relevés** qui donnent le capital —, et trois d'entre elles portaient le même mot : « Épargne d'Andrea » pour le capital, « Où c'est placé » pour les supports, « Où ça se place » pour les versements du mois. Deux étiquettes à un mot près pour le stock et pour le flux, sur le même écran, c'est-à-dire pour exactement les deux notions que ce § existe pour séparer. La distinction se tient dans le vocabulaire, jamais dans un paragraphe ajouté pour rattraper la confusion : **Capital d'épargne**, **Mes supports**, **Capacité d'épargne**, **Répartition des versements**, **relevé**.

**Le stock.**

- **Un total nommé, et ce qui lui manque.** L'écran additionne les **dernières valorisations connues** des supports de la personne lue, et annonce à côté combien n'en ont aucune : « 32 450 € · somme des derniers relevés d'Andrea · 1 support sans relevé ». Une inconnue n'est pas un zéro, et un patrimoine présenté comme exact alors qu'il ne l'est pas est pire que pas de chiffre. L'étiquette porte la notion — « Capital d'épargne » —, et le **nom de la personne se lit sous le chiffre** : un montant de cette taille sans propriétaire à côté se lirait comme la somme du foyer, que l'écran refuse d'afficher, mais l'étiquette, elle, ne change pas d'une personne à l'autre.
- **Et ce qui a bougé depuis ces relevés**, quand il y a quelque chose : « valeur estimée 11 200 € · versé depuis les derniers relevés +1 200 € ». Verser 200 € par mois pendant six mois sans jamais relever sa valeur laissait un total figé au chiffre de départ, alors que l'app connaît les 1 200 € partis dessus : les taire n'est pas de la prudence, c'est cacher ce qu'on sait. Le relevé reste le chiffre principal — c'est le fait, et il porte sa date ; l'estimation se lit sous lui, nommée, avec la réserve qui vaut partout : elle ignore ce que le marché a pu faire. C'est le même calcul que la fiche d'un support, par la même fonction, si bien que le total et le détail ne peuvent pas diverger d'un centime.
- **Un support par rangée** : sa pastille, son nom, l'âge de son dernier relevé, sa dernière valeur et ce que le mois y a mis en net. Sans relevé, la rangée dit « aucun relevé » et un tiret cadratin — jamais « 0 € ». Une tuile par support était le premier dessin, et il ne passait pas l'échelle : une `2×2` prend toute la largeur sous 768px (DS §5), si bien que quatre supports faisaient quatre écrans de défilement et qu'une grille dont rien ne se range par deux n'était plus un bento mais une pile de cartes. Ce qu'il y a à lire ici — pastille, libellé, sous-libellé mono, montant à droite — est mot pour mot la définition d'une rangée de liste, et une liste n'entre pas dans une grille : sa hauteur vient de son contenu.
- **Le titulaire ne se répète pas sur chaque ligne — dans cette liste-là, et nulle part ailleurs.** L'écran ne montre jamais que les supports d'une seule personne — c'est le filtre du bandeau qui l'impose —, et le bandeau comme le capital la nomment déjà : la place sert à ce qu'aucune date seule ne dit, depuis quand ce chiffre n'a pas bougé. **La ventilation des versements, elle, garde le nom**, et elle en a besoin : elle compte des `Entry`, et une mensualité d'avance cochée « à partager » est de nature épargne (§4.7 quater), si bien que Camille porte sa part sur le livret d'Alix. Deux « Livret A » se retrouvent alors dans la même liste, où le titulaire est la seule chose qui les départage.
- **L'âge d'un relevé se lit en toutes lettres**, en trois paliers : « relevé le 8 août » le premier mois, « relevé il y a 2 mois » ensuite, « à actualiser · relevé il y a 7 mois » une fois la **cadence du support** dépassée. Une date seule ne dit pas ce qu'elle vaut — personne ne compte les mois de tête devant un « 8 février » posé sous un chiffre. Et **sans une couleur** : un capital qu'on n'a pas revu n'est pas une erreur, c'est un chiffre qui attend d'être confirmé, quand le rouge est réservé aux dépassements et aux erreurs (DS §2.3).
- **Le relevé est un arrêté, pas une corvée mensuelle**, et sa cadence est une propriété du support (`pace`). Le réflexe est comptable : une entreprise ne réévalue pas ses actifs tous les mois, elle fait un inventaire à la clôture et vit sur les flux le reste de l'année. Un **livret réglementé** ne bouge qu'avec les versements — que l'app connaît déjà — et des intérêts capitalisés une seule fois au 31 décembre : sa valeur est déterministe entre deux relevés, et **un relevé par an suffit**. Un **PEA, un compte-titres, une assurance-vie en unités de compte** sont imprévisibles entre deux relevés, mais consulter son PEA tous les mois n'est pas du budget : le **trimestre** est large. Un seuil unique de six mois se trompait donc dans les deux sens à la fois — il déclarait périmé un livret dont l'app connaît le capital à l'euro près, et laissait passer pour frais un PEA que le marché avait refait.
- **La cadence se demande, elle ne se déduit pas.** Le catalogue de catégories est libre : rien ne garantit qu'un « Livret A » soit rangé ailleurs que sous « Divers », et une cadence lue sur le classement se tromperait en silence — le défaut même qu'elle existe pour corriger. Ce n'est pas non plus un rendement déguisé : elle ne sert à projeter **aucune** valeur, seulement à savoir quand se taire. Le champ est facultatif au modèle ; **absent, l'app lit « annuel » sans l'écrire**, parce qu'un document d'avant le champ n'a jamais répondu à la question et qu'écrire une réponse à sa place ferait passer un silence pour un choix. L'année plutôt que le trimestre comme repli : se taire trop est un défaut réparable, réclamer à tort ne produit que de la culpabilité.
- **L'écran ne réclame un relevé que lorsqu'il y en a un à faire.** Le raccourci « Mettre à jour les relevés » est posé en permanence — corriger un chiffre reste possible n'importe quand —, mais **son poids dit s'il y a quelque chose à faire** : appuyé quand au moins un support a dépassé sa cadence ou n'a jamais été relevé, discret sinon, comme « Ajouter un support » juste en dessous. Un décompte l'accompagne alors — « 2 relevés à faire » —, et **rien** ne s'affiche le reste du temps. Ni couleur ni panneau : un capital qu'on n'a pas revu n'est pas une erreur. Un support archivé n'est jamais réclamé : un compte clôturé n'a plus de valeur à confirmer.
- **Une fiche par support**, qui ouvre l'histoire : le dernier relevé avec son âge, la valeur **estimée** quand des mouvements sont tombés depuis, les versements et reprises du mois, l'historique des relevés avec sa courbe, et la liste des mouvements liés. Les deux listes se coupent et **se déplient d'un bouton** : « et 15 de plus » annonçait quinze lignes sans donner le moyen de les atteindre, et un compte sans geste est une impasse.
- **Ajouter un relevé pose une ligne de plus**, il n'écrase jamais la précédente : c'est ce qui fait exister la courbe, et ce qui permettra plus tard de comparer une projection au réel. Le libellé le dit — « ajouter un relevé », et non « mettre à jour la valeur », qui laissait entendre qu'on remplaçait un chiffre. Un relevé mal saisi se corrige ou se supprime, ligne à ligne, avec la même question et le même retour arrière que partout ailleurs (§4.8). Deux relevés d'un même jour — une saisie et sa correction — se départagent par leur **ordre d'arrivée**, le dernier posé faisant foi.
- **Relever tous ses supports d'un coup**, depuis l'écran : une date, un champ par support de la personne, et une case vide n'enregistre rien. C'est le geste réel — un relevé de banque donne tous les chiffres en même temps, et les poser demandait d'ouvrir chaque fiche, de mettre à jour, de revenir. Un seul geste, donc une seule écriture et un seul retour arrière. Chaque champ rappelle le dernier chiffre connu avec sa date et, quand des mouvements sont tombés depuis, l'estimation que la banque va confirmer ou corriger. Corriger un seul chiffre à une autre date reste sur la fiche du support, où l'on ne parle que de lui.
- **Un champ de relevé vide ne ressemble jamais à un zéro.** Son invite dit « Nouvelle valeur » et non « 0,00 » : posée sous « Dernier relevé : 10 631,00 € », une invite chiffrée se lit comme une valeur déjà enregistrée, et le champ qu'on laisse alors tel quel ne promet plus « rien » mais « ce compte est vide ». C'est la confusion la plus coûteuse de l'écran de relevé groupé, puisqu'elle porte sur tous les comptes à la fois — et vide et zéro doivent rester deux réponses distinctes, la seconde étant une information financière réelle. Pour la même raison, **le bouton d'enregistrement est désactivé tant qu'aucun chiffre n'est saisi** : il n'y a rien à écrire, et l'accepter pour répondre « non » fait faire le geste pour rien.
- **La valeur estimée est qualifiée comme telle, ou tue.** Dernier relevé + mouvements confirmés depuis : elle ignore ce que le marché a fait, et l'annoncer comme « valeur actuelle » serait une fausse précision. Le même moteur pour tous les supports, livrets compris — deux façons de calculer un capital donneraient deux vérités à tenir d'accord.
- **Une courbe ne trace que les points relevés.** Le trait qui les relie est une représentation, pas une donnée : entre deux relevés, personne ne sait ce que le support valait. L'échelle part du minimum relevé et non de zéro, faute de quoi un capital qui progresse de 6 % serait une ligne plate.

**Le flux**, aux mêmes chiffres : capacité d'épargne, ce qui est versé, ce qu'il reste à placer. Ce qui change est **où** ça se ventile : par support et non plus par catégorie — la catégorie confondait le livret d'Andrea et celui de Marie. Les lignes de la ventilation sont **exactement** les `Entry` que compte le versé du tableau de bord.

**Les trois s'additionnent, donc ils se lisent ensemble.** Capacité = versé + reste à placer. Les trois vivaient dans trois tuiles voisines, chacune avec son étiquette et son gros chiffre, séparées par deux écrans de défilement : posés à cette distance, on ne peut pas vérifier qu'ils tombent, et trois montants qui ne se recomposent pas se lisent comme une erreur de calcul. Une seule tuile les porte — la capacité en chiffre, ses deux moitiés sous elle.

**Le calcul se replie.** La cascade qui produit la capacité — revenus, charges, crédits — reste indispensable : un crédit qui mange la moitié de la capacité ne se voit qu'ici, le tableau de bord le fond dans « Charges ». Mais c'est une **vérification**, pas une lecture qu'on vient chercher chaque mois, et affichée en permanence avec les quatre paragraphes de méthode elle occupait le dernier tiers de l'écran. Elle vit sous « Comprendre le calcul », repliée, avec la règle qui fait exister ce § — un relevé n'est pas un mouvement.

**Les deux ne s'additionnent jamais.** Un relevé n'entre dans aucun total du mois ; un versement ne réécrit aucun relevé. C'est la règle qui fait exister ce §, et la seule façon de se tromper ici est de la perdre de vue.

**Gestes.** Un support se crée depuis l'écran Épargne, depuis l'onboarding, ou depuis la saisie d'un versement quand il n'en existe pas encore — trois portes, **un seul formulaire et une seule mutation**. Un support créé pendant une saisie y revient présélectionné. Un support s'archive dès qu'il a une histoire, et l'archivage propose d'arrêter les récurrences qui l'alimentent encore : un compte invisible qui grossit tout seul serait un état incohérent. La suppression pure n'est offerte que sur un support qui ne retient rien.

**Les gestes se rangent par nature, et pas en rang d'oignons.** L'écran en porte quatre, et ils n'ont ni la même fréquence ni le même objet : **placer** et **reprendre** sont transactionnels, on les fait tous les mois, et ils suivent le chiffre qui les appelle — « reste à placer ». **Relever ses comptes** et **ouvrir un support** relèvent de la gestion du patrimoine, et ils vivent sur la section des supports, dont ils sont l'entretien. Alignés tous les quatre en tête d'écran, ils annonçaient quatre actions de même poids avant le premier chiffre, dont une — ouvrir un compte — qu'on fait une fois dans la vie du support.

**Archiver, rouvrir et supprimer sont au bout de « Modifier le support ».** Ces gestes tenaient une tuile permanente sur la fiche, sous l'historique : le poids d'une lecture quotidienne pour deux boutons qu'on touche une fois. Ils ne disparaissent pas, ils se rangent là où l'intention y mène — on ouvre la modification pour agir sur le compte, pas pour le lire. Le comportement, lui, ne bouge pas : l'archivage propose toujours d'arrêter les récurrences, la suppression n'est offerte que sur un support sans histoire, et les deux se défont.

**La lecture est individuelle, et elle n'a pas d'autre forme.** C'est le seul écran de l'app dont le bandeau ne propose ni « Tout le monde » ni « Commun », seulement les personnes — et une est toujours active. Les deux lectures absentes ne manquent pas, elles n'existent pas : « Commun » ne rendrait que des zéros, puisque l'épargne ne se partage jamais ; et « Tout le monde » rendrait pire qu'un zéro, une **somme**. Deux personnes qui ont 12 000 € et 8 000 € de côté n'ont pas « 20 000 € », et deux qui dégagent 300 € et 900 € n'ont pas « 1 200 € à placer » : elles ont deux comptes, deux capacités et deux décisions, dont aucune ne se prend sur un total. Le stock et le flux suivent la même personne, par le même filtre — celui du bandeau, qui applique déjà le prorata des charges communes. Le total **nomme** cette personne : un chiffre de cette taille sans propriétaire à côté se lirait comme la somme qu'on refuse d'afficher.

Arriver sur l'écran sans personne filtrée en **pose une** — la première du foyer. Une rangée de pilules dont aucune n'est active laisserait croire à une lecture qui n'existe pas, et le choix se change d'une pilule. Seul·e du foyer, il n'y a personne entre qui choisir, mais le total porte quand même son nom : c'est son épargne, pas celle d'un foyer. Sans personne du tout, il n'y a rien à filtrer et rien à posséder — l'écran demande quelqu'un avant de parler d'épargne.

**Une personne sans support est invitée à en ouvrir un**, y compris quand ses versements du mois disent qu'elle en aurait besoin. La section disparaissait dans ce cas, et avec elle le seul endroit d'où l'on peut agir : un écran vide est une invitation, pas une absence.

**Un versement laissé « en commun » se signale**, et il se signale désormais toujours : il n'est à personne, il n'entre donc dans la lecture d'aucune, et sans cette phrase il n'apparaîtrait plus nulle part. C'est le pendant du salaire non attribué de la répartition (§4.7 ter).

### 4.7 Historique et comparatifs

- Navigation mois par mois sur toute la période couverte par les données.
- **Recherche par libellé**, tous mois confondus, entrées et récurrences. Retrouver « ce prélèvement de mars » imposait sinon de naviguer mois par mois. Elle vit ici parce que c'est l'écran du regard en arrière, et parce que la barre d'onglets en porte cinq et n'en tient pas six. Casse et accents mis de côté, appariement en sous-chaîne, muette en dessous de deux lettres. Chaque résultat mène à sa fiche, et porte sa note à côté de sa date — c'est souvent elle qui distingue deux lignes au même libellé. Ce qu'une limite d'affichage laisse de côté est compté, annoncé, et **se montre** : « précise la recherche » était un conseil et non une commande, et il ne sert à rien quand tout ce qui dépasse porte réellement le même mot. Le premier écran reste court — répondre à « ce prélèvement de mars » demande dix lignes, pas deux cents —, et « Tout afficher » lève la coupe pour la recherche en cours, jamais pour la suivante.
- Courbe entrées / sorties / solde sur les 12 derniers mois.
- Comparaison de deux mois au choix, écart par catégorie en valeur et en pourcentage. **Ce qui a changé d'abord** : la liste montrait l'union des catégories des deux mois, écarts nuls compris, soit quinze lignes à « 0,00 € · 0 % » pour deux vraies variations sur le catalogue par défaut. Les inchangées passent derrière un repli, où l'on ne lit plus d'elles un écart — elles n'en ont pas — mais **le montant qu'elles pèsent dans les deux mois**, du plus lourd au plus léger. Un compte et l'écart net tiennent lieu de synthèse, et deux mois identiques donnent une phrase plutôt qu'une liste de zéros. Un pourcentage impossible — mois de référence à zéro — se dit avec un mot : la catégorie est nouvelle.
- Comparaison d'années : cumul par mois, année N contre année N−1. **Les deux se lisent au même mois** : arrêter l'année choisie à son dernier mois chiffré et lire la précédente jusqu'en décembre comparerait huit mois à douze, et annoncerait comme un écart ce qui n'est qu'un mois de plus. Le mois d'arrêt est nommé à l'écran quand l'année n'est pas finie. Le tracé, lui, garde les deux années entières : rogner la précédente cacherait des données réelles, ce qui est l'inverse du défaut qu'on corrige.
- Une comparaison ne montre qu'une période à la fois — mois ou années —, et les deux se choisissent au même endroit : c'est le même geste, poser deux périodes l'une contre l'autre.
- Les périodes sans donnée affichent un état vide explicite, pas un graphique à zéro.

### 4.7 bis Crédits et dettes

Un crédit se déclare avec son capital emprunté, ses dates de première et dernière mensualité, un taux annuel facultatif, et la récurrence qui le rembourse.

- Le **capital restant dû** est dérivé, jamais saisi : `Rₖ = Rₖ₋₁(1+i) − Mₖ`, appliqué à chaque mensualité **effectivement confirmée**, à son montant à elle. C'est la formule d'amortissement classique — `Rₙ = P(1+i)ⁿ − M((1+i)ⁿ − 1)/i` — écrite sous forme de récurrence : les deux donnent le même chiffre à mensualité constante, mais seule la récurrence accepte qu'un versement diffère des autres. Une renégociation, un différé, un remboursement anticipé changent le montant en cours de route, et rejouer le passé à la mensualité d'aujourd'hui inventerait un historique. La mensualité de la récurrence liée ne sert donc qu'à annoncer la suite.
- Une échéance **antérieure à la date de début** du crédit ne le rembourse pas : la récurrence a pu servir à autre chose avant d'y être rattachée.
- Sans taux, le capital décroît exactement de ce qui a été versé.
- Sans récurrence liée, le capital ne bouge pas — et l'écran le dit plutôt que de laisser croire à un crédit figé.
- Retirer un crédit du suivi n'efface ni les mensualités versées ni la récurrence qui les pose. Seul le suivi du capital s'arrête.

### 4.7 ter Répartition entre membres

À deux revenus inégaux, des parts égales ne le sont pas : sur 2 500 € et 2 000 €, un loyer partagé en deux pèse un quart plus lourd pour le second. La répartition dit ce que chacun verse sur les charges communes, **au prorata des revenus déclarés**.

- **Coefficient** : `revenu du membre ÷ la somme des revenus`. Sur 2 500 € et 2 000 €, 55,6 % et 44,4 %.
- **Le revenu ne se saisit nulle part** : il est la somme des récurrences de nature `resource` du membre — salaire, allocations, pension — ramenées au mois. Le montant de chacune est celui du §3 — la même fonction que pour le total des récurrences : le salaire qui pèse dans le prorata est au centime celui qu'affiche sa fiche. Une augmentation se saisit là où elle a lieu, dans la récurrence, et la répartition suit.
- **Un salaire à montant variable pèse dès qu'un chiffre existe** — dernière échéance chiffrée, ou montant habituel déclaré sur la récurrence. C'est le montage le plus courant quand les revenus bougent, et rien ne doit obliger à attendre un mois entier pour que le partage se calcule.
- **Le revenu se lit sur le mois affiché, jamais sur le jour où l'on regarde.** La répartition d'août se lit avec les revenus d'août, qu'on l'ouvre le 31 juillet ou le 15 août. Une récurrence compte pour un mois tant qu'elle n'est pas arrêtée avant ce mois ; une première échéance encore à venir ne l'exclut pas — elle a été déclarée, elle va tomber. C'est la même asymétrie que le total des récurrences, qui compte une récurrence à venir et exclut une récurrence arrêtée. Sans quoi celui qui pose ses deux salaires au 1er du mois prochain n'a aucune répartition, et en aurait une le lendemain : un chiffre de partage ne peut pas dépendre du moment où on ouvre l'écran.
- **Une ressource laissée « en commun » ne compte dans le revenu de personne** : le prorata compare ce que chacun gagne, et un revenu commun ne dit rien de cet écart. Elle rentre bien sur le mois, mais elle ne pèse dans aucune part — les écrans qui parlent de revenus le **disent**, parce que c'est la première explication d'une répartition qui ne se calcule pas et la seule qui ne se devinait nulle part.
- **Charges communes** : les sorties de nature `charge` ou `debt` que personne ne s'est attribuées, plus celles cochées « à partager ». C'est la frontière de la capacité d'épargne, et pour la même raison : un versement sort du compte mais reste à qui le fait, il n'a rien à faire dans un partage.
- **La case « à partager » ne s'affiche que là où elle décide de quelque chose**, c'est-à-dire sur une sortie de nature `charge` ou `debt` : un revenu ne se répartit pas, un versement d'épargne non plus. Et sur « en commun » elle est **cochée et verrouillée** : une charge que personne ne s'attribue *est* commune, par la règle même. La décocher sans dire à qui elle est produirait une ligne qui sort du compte sans apparaître dans le mois de personne. Elle reste visible plutôt que de disparaître — elle dit ce qui va se passer, et le geste pour en sortir est de choisir un membre, juste au-dessus. Choisir « en commun » efface au passage une exception posée avant : deux vérités, dont celle qu'on ne voit pas gagnerait au calcul.
- Les échéances **prévues** comptent : la question est « combien verser ce mois-ci », pas « combien a déjà été payé ». Répondre au réalisé ferait grimper la part de chacun au fil du mois.
- La somme des parts vaut **exactement** le total, au centime. Arrondir chaque part dans son coin ne le garantirait pas ; les centimes restants vont aux plus forts restes, et l'écran affiche le total des parts pour qu'on le vérifie.
- Le partage se fait **charge par charge**, et non sur leur somme. Les deux donnent le même total au centime près, mais seul le découpage par charge se recompose : la part d'un poste, d'un jour ou d'une moitié de mois s'additionne alors exactement pour redonner la part du mois. C'est ce qui permet à l'écran du mois filtré sur quelqu'un et à celui-ci d'annoncer le même chiffre, et non deux chiffres à un centime l'un de l'autre.
- Le calcul ne se fait pas, à deux membres ou plus, tant qu'un membre n'a aucune ressource récurrente à son nom. L'écran **nomme ce qui manque** au lieu d'afficher un zéro : un prorata au dénominateur incomplet ne vaut pas zéro, il ne veut rien dire.
- **À un seul membre, le coefficient vaut trivialement 100 %**, sans qu'aucun revenu soit déclaré : un prorata à un participant n'est pas indéfini, il n'a personne à comparer. La lecture filtrée sur lui vaut alors « tout le monde » au centime — lignes que personne ne porte comprises, revenus et épargne aussi, que le découpage du commun ne saurait pas lui rendre —, et la distinction qui reste est celle du pot : le commun d'un côté, ses lignes perso de l'autre. La régularisation se calcule et rend zéro — il porte 100 % de ce qu'il avance.
- Et il nomme **laquelle des deux raisons** c'est : aucune récurrence de ressource, ou bien une récurrence variable pas encore chiffrée. Les deux n'appellent pas le même geste — envoyer créer un revenu qui existe déjà fait ajouter un doublon là où il ne manque qu'un montant.
- Lecture : une tuile sur l'écran du mois, et un écran plein `/repartition` qui montre le calcul. La tuile s'efface sans revenus complets, sous un filtre par membre — une charge commune n'appartient à personne, aucune ne passerait le filtre — et quand une seule personne est nommée, où un anneau à 100 % n'apprendrait rien. Sous le filtre, c'est la tuile **Part du commun** (§4.6) qui prend le relais : la même règle, lue du point de vue d'une seule personne, et le même écran de détail au bout — qui reste debout seul·e, avec une seule ligne à 100 % : c'est là que le pot se vérifie.
- Le total **s'ouvre** sur la liste de ce qu'il compte, de la plus lourde à la plus légère. Un chiffre de répartition qu'on ne peut pas vérifier ne se vérifie pas, et une dépense qui n'a rien à faire dans le pot commun ne se repère qu'en la voyant.
- **Retirer une personne emporte ce qui ne peut appartenir à personne d'autre**, et rien de plus : ses avances et ses supports d'épargne, avec l'historique de valeur de ces derniers — leur `memberId` n'est pas facultatif, et un livret que personne ne porte n'est le livret de personne. Le reste est **libéré**, pas effacé : ses entrées et ses récurrences repassent en commun, et les mouvements d'épargne gardent leur montant et leur date, seul leur lien vers le support disparu étant coupé — exactement comme une échéance se détache de la récurrence qu'on supprime. La question posée avant le dit, en nommant les deux pertes ; l'écran propose de **réattribuer** les supports avant, ce qui est le même geste que changer leur propriétaire depuis leur fiche ; et le retour arrière repose le document entier.
- **À quelqu'un, ou à tout le monde.** Une ligne sans propriétaire et hors partage sort du compte sans apparaître dans le mois de personne : la somme des soldes individuels cesse alors de valoir le solde total, sans que rien ne le dise. C'est le cas d'un versement d'épargne que personne ne revendique — l'épargne ne se partage jamais —, d'une dépense dont on a décoché « à partager » sans dire à qui elle est, et de toute entrée d'argent, qui ne se partage pas davantage. La saisie exige donc le membre dans ces cas-là, et seulement dans ces cas-là : ailleurs, la règle de partage sait déjà où ranger la ligne. C'est une contrainte de saisie, pas une validation d'import : un document plus ancien garde ses lignes telles quelles, et les corriger se fait en les rouvrant.
- **Une charge commune avancée par une seule personne se régularise le mois suivant.** Elle a réglé une dépense dont chacun portait sa part : sans rien pour la rattraper, l'écart reste entre les deux et l'app le tait. Le mois suivant, celui qui n'a pas payé verse un peu plus, celui qui a avancé un peu moins. Ce que chacun a avancé moins ce qui lui en revenait, au prorata **du mois d'origine** : l'écart s'est creusé sous ses revenus à lui, et le rattraper au coefficient d'aujourd'hui rendrait une somme que personne n'a avancée.
- **Seules les charges communes qui portent un membre entrent dans le report.** Celles que personne ne s'est attribuées ont été réglées par le pot : elles n'avancent rien à personne, et elles sont donc hors du calcul des deux côtés à la fois. C'est cette symétrie qui fait que la somme des reports vaut **exactement zéro**, et donc que la somme des versements du mois suivant vaut encore, au centime, ses charges communes. La ligne de vérification continue de le montrer.
- **Confirmées seulement**, à rebours de la répartition. Une échéance prévue n'a été payée par personne, et dire d'elle qu'un membre l'a avancée inventerait un fait. C'est déjà la règle de tout chiffre rétrospectif dérivé — le capital restant dû d'un crédit et ce qui reste à remettre sur une avance ne comptent que les échéances effectivement confirmées.
- **Un report ne change pas ce qu'un mois a coûté à quelqu'un, seulement ce qu'il verse.** Le coût est arrêté au mois où la dépense a eu lieu ; ce qui se rattrape est un virement. Il n'entre donc dans aucun total de charges — ni dans le mois filtré, ni dans « ses charges » ni dans le coût de son mois, qui doivent continuer de se recomposer exactement — et se lit à côté d'eux, sur le montant à verser.
- Le report **s'ouvre** comme le pot lui-même, sur les charges avancées qui le produisent et le nom de qui les a réglées : c'est le chiffre qu'on discute le plus, et une régularisation qu'on ne peut pas vérifier ne se vérifie pas.
- Il porte sur **un mois, sans cumul** : l'écart de juillet corrige août, puis disparaît. L'app ne voit pas le compte joint — elle ne peut pas savoir si le virement corrigé a eu lieu, et un solde roulant qu'aucun geste ne vient solder dériverait sans fin.
- La v1 s'arrête là : elle dit ce que chacun doit verser, régularisation du mois précédent comprise, mais elle ne tient pas de compte courant entre les personnes.

### 4.7 quater Avances

Une **avance** est une charge payée en une fois depuis l'épargne, et remboursée à soi-même mois par mois. L'assurance auto se règle en un versement de 600 € qui couvre douze mois : la payer depuis un livret et se reverser 50 € chaque mois est le montage le plus courant quand on n'encaisse pas un tel coup sur un seul mois.

Elle se déclare avec ce qui a été payé, la date du paiement, la nature de la charge, le **support d'épargne** repris, et la période couverte — deux mois, bornes comprises. Qui a avancé ne se demande plus : le support porte son propriétaire, et un second champ pourrait le contredire — l'avance de Camille se reconstituerait alors sur le livret d'Alix.

- **La mensualité n'est pas une charge.** La charge a eu lieu, une fois. Ce qui se passe ensuite est un retour d'épargne : on remet sur le livret ce qu'on lui a pris. Elle est donc de nature `saving`, ne pèse pas dans les charges du mois, et réduit le reste à placer plutôt que la capacité d'épargne.
- **La mensualité se déduit, elle ne se saisit pas.** Répartie aux plus forts restes sur les mois couverts : sept mois à 85,71 € laisseraient trois centimes qu'aucune mensualité ne rendrait jamais. Deux chiffres saisis séparément finiraient de toute façon par ne plus se répondre.
- Comme un crédit, une avance ne produit aucun chiffre de trésorerie par elle-même : c'est **la récurrence liée** qui pose les mensualités, sur le support à reconstituer. Elle figure donc dans la liste des récurrences, sous ce support.
- **Le jour du paiement, une reprise d'épargne est enregistrée** : une `Entry` de sens `in` sur le support, du montant avancé. Le livret baisse d'autant, et cet argent redevient disponible. La dépense qu'elle a financée se saisit comme les autres — l'app ne l'invente pas à la place de qui l'a faite.
- **L'épargne se compte donc en net**, seule des quatre natures : ce qu'on y met moins ce qu'on y reprend. Sans quoi le mois où l'on vide 600 € d'un livret se lirait comme un mois où l'on a mis 600 € de côté. Les trois autres natures n'ont qu'un sens possible, il n'y a rien à y compenser.
- **Ce qui reste à remettre est dérivé**, jamais saisi : le montant avancé moins les échéances **effectivement confirmées**, à leur montant à elles, et jamais négatif. Même raison qu'un crédit — on peut se rembourser plus vite, sauter un mois, corriger un montant, et rejouer le passé au montant d'aujourd'hui inventerait un historique. Une échéance antérieure au paiement ne compte pas.
- Cochée « à partager », la mensualité entre dans les charges communes : chacun en porte sa part au prorata, et celui qui a avancé se retrouve remboursé.
- Le membre n'est **jamais facultatif** : une épargne est toujours à quelqu'un, et une avance que personne ne porte ne se reconstituerait sur le livret de personne. Il se lit sur le support.
- **Tout pointe vers le même support, par identifiant** : la reprise du jour du paiement, chaque mensualité de reconstitution, et l'avance elle-même. C'est ce qui interdit de vider un livret et d'en remplir un autre. Sans support d'épargne au document, l'écran ne propose pas de poser une avance : il dit ce qui manque.
- **Pas d'écran de reprise** : une avance décrit un paiement qui a eu lieu, une fois. La corriger, c'est la retirer et la reposer. Le retrait emporte la mensualité à venir — une avance qu'on ne suit plus n'a plus de raison de se reverser — mais jamais ce qui est déjà revenu sur le livret.

### 4.8 Données

- **Export** : un fichier `.json` contenant le document complet et son `schemaVersion` — supports d'épargne, valorisations et liens compris. Un aller-retour export / import rend exactement le même document, relations comprises.
- **Migrations** : chaque changement de forme incrémente `schemaVersion` et ajoute une étape déterministe. Un export ancien reste importable. La migration v8 sépare le support de la catégorie : elle crée **un support par paire (catégorie d'épargne, personne) réellement employée** — pas un de plus —, relie chaque `Entry`, `Recurrence` et `Advance` d'épargne au sien, et **n'invente aucun capital** : les supports naissent sans valorisation, parce que rien dans un document v7 ne dit ce que le livret valait, et que zéro serait une information financière réelle. Ce qui n'est à personne reste sans support : un support est toujours à quelqu'un, et lui inventer un porteur attribuerait à quelqu'un une épargne qu'il n'a pas faite.
- **Import** : remplace intégralement les données, après **double** confirmation — c'est un effacement déguisé, le fichier arrive et tout le reste part. Le fichier est lu et validé avant qu'on demande quoi que ce soit : on ne fait pas confirmer un remplacement par un fichier illisible. Un import d'un `schemaVersion` antérieur passe par les migrations.
- **Schéma de données** : le modèle complet, en Markdown, à copier ou à télécharger. C'est le pendant de l'import, et il existe pour la même raison que lui : beaucoup de gens ont déjà tout écrit ailleurs — un carnet, une note, un tableur — et ressaisir vingt formulaires pour retrouver ce qu'on a sous les yeux décourage avant la première récurrence. Le document se donne à un assistant avec ces notes, et revient en fichier importable. Il porte les types, les règles qu'aucun type n'exprime — centimes entiers, dates ISO, taux en points de base, sens déduit de la nature —, le catalogue de catégories avec ses identifiants, et un document d'exemple complet qui s'importe tel quel : aucune de ses douze clés n'est vide, crédit et avance compris, parce que ce sont les deux objets qu'on écrit le plus mal et qu'une règle en prose ne remplace pas de les voir. Il dit aussi **ce que l'import répare ou écarte tout seul** — catégorie inconnue reroutée, membre ou règle inconnus coupés, identifiant en double suffixé, et la liste de ce qu'il change sans rien dire —, parce qu'un document qui enseignait « doit désigner quelque chose qui existe » sans ajouter que la violation produit un fichier muté plutôt qu'un refus promettait une garantie qui n'existe pas. Il est **dérivé du code**, jamais recopié à côté : le bloc de types est le source de l'app, le catalogue est lu sur le jeu par défaut, et la liste des réparations est indexée sur les raisons du rapport d'import — une raison ajoutée sans être décrite ne compile pas. Une seconde description du modèle finirait par diverger de lui, ce qui est exactement l'erreur que ce document existe pour éviter chez son lecteur.
- **Jeu d'exemple** : un document complet — trois personnes aux revenus très inégaux, quatre crédits dont un soldé, trois avances dont une entièrement reconstituée, sept supports d'épargne dont un archivé et un sans relevé, plus d'un an d'historique — chargeable en un clic. Ce qu'il contient n'est pas une collection de lignes vraisemblables mais une **liste d'états**, chacun retenu parce qu'un écran s'efface sans lui. Une app neuve n'a rien à montrer : pas de courbe, pas de répartition, pas de capital restant dû, et tout ce qui fait son intérêt demande des mois de données que personne ne saisit pour décider s'il va s'en servir. Le jeu est **construit à la date du jour**, jamais figé : le mois courant a ses échéances, l'historique remonte derrière, les comparatifs ont leurs deux années. Il remplace les données comme un import, donc **double** confirmation — sauf au premier lancement, où rien n'a encore été enregistré et où faire confirmer la perte de rien n'apprendrait qu'une chose, que les questions de cette app ne veulent rien dire.
- Le schéma et l'exemple sont aussi accessibles **au premier lancement**, à côté de l'import : les deux personnes qu'ils servent — celle qui a déjà tout écrit, celle qui veut seulement voir — sont précisément celles qui n'ont encore rien créé, et les envoyer en créer un pour trouver de quoi s'en passer serait l'inverse du service rendu.
- **Réinitialisation** : efface tout, **triple** confirmation. Trois questions différentes — ce qui part, le fait qu'il n'y a pas de retour, la dernière chance d'exporter : trois fois la même phrase ne se lit plus, elle se clique.
- **Toute suppression demande confirmation**, et par la même boîte : supprimer une entrée, une récurrence, un crédit, une avance, un support d'épargne ou un relevé de valeur, retirer un membre, arrêter une récurrence, archiver un support, remettre le mois à confirmer. Le nombre de questions fait la gravité — une pour une ligne, deux pour un import, trois pour l'effacement. Chacune dit ce qui est perdu, jamais « êtes-vous sûr ». Archiver une catégorie n'en demande pas : rien n'y est supprimé, et l'archivage se défait.
- **Et toute suppression se défait**, le temps que son message reste à l'écran. Le retour arrière ne remplace pas la question : celle-ci se pose avant, celui-là rattrape le oui donné trop vite. Il ne survit à aucune modification faite depuis — il remettrait l'état d'avant par-dessus, et l'emporterait avec lui — si bien qu'un seul geste est défaisable à la fois, le dernier.
- **Une saisie en cours ne se jette pas sans un mot.** Quitter un formulaire modifié, par « Annuler » comme par le retour, demande confirmation en une question. Un formulaire ouvert puis quitté sans rien changer n'en demande aucune : ponctuer ce geste-là d'une question apprendrait à cliquer sans lire.
- **Aucun indicateur de sauvegarde permanent.** L'écriture est débouncée et regroupée : un témoin qui suivrait son état clignoterait pour annoncer ce qui n'a jamais échoué. Ce qu'il faut savoir est l'anomalie, et elle a son bandeau.
- **Sauvegardes locales** : cinq instantanés tournants, un par jour de saisie, listés avec leur date et ce qu'ils contiennent, restaurables après **double** confirmation — c'est un remplacement, exactement comme un import, et la sauvegarde est relue et validée avant qu'on demande quoi que ce soit. Elles vivent dans ce navigateur et disparaîtraient avec lui : elles ne remplacent pas un export, elles rattrapent l'accident du jour. « Tout effacer » les emporte, sans quoi la triple confirmation mentirait.
- **Récupération** : si le document stocké ne se lit pas, l'écran d'arrivée propose l'import, le téléchargement de la copie brute — un document que l'app ne sait pas ouvrir n'est pas forcément un document perdu —, le rechargement, puis l'effacement après **double** confirmation. Tant que rien n'est tranché, la création d'un document est barrée : elle écraserait ce qu'on n'a pas su lire.
- **Devise d'affichage** : le symbole sous lequel les montants se lisent, choisi dans une courte liste. Ce n'est **pas** la multi-devise, qui reste hors v1 : aucun taux n'est appliqué, rien n'est converti, les centimes saisis restent les mêmes centimes — et l'écran le dit, parce qu'un sélecteur de devise invite précisément à croire le contraire. Le champ existait au modèle depuis la v1, lu par tous les montants de l'app et réglable nulle part : il valait « EUR » à perpétuité sans que rien ne le dise.
- **État du stockage, en tête de la vue.** Trois lignes — où vivent les données, ce que le navigateur promet d'en conserver, à quand remonte le dernier export — parce que ce sont les trois faits qui décident si l'on clique sur « Exporter », et qu'ils étaient répartis entre deux vues : la conservation invisible ici, l'export invisible là-bas. Ce n'est pas une vue de plus : « Sur cet appareil » garde le détail, les chiffres, les sauvegardes et le bouton qui redemande la conservation, et un lien y mène.
- Une bannière rappelle l'export si le dernier date de plus de 30 jours, ou n'a jamais eu lieu — le texte dit alors ce qu'il en est plutôt que d'invoquer un export inexistant.
- Elle s'écarte à la croix ou d'un balayage vers le haut. Le refus est enregistré sur l'appareil et vaut pour un cycle de trente jours : une croix ne condamne pas au silence des données qui ne sont sauvegardées nulle part. Un export l'oublie.
- **Un seul bandeau à la fois.** Ce rappel, l'avis de conservation et le bandeau d'échec d'écriture disent au fond la même chose — garde une copie — à trois gravités. Ils ne s'empilent pas : le plus grave masque les autres, dans l'ordre du §5.

---

## 5. Contraintes techniques

**Stack** — React 19 + Vite + TypeScript, aligné sur Zoned. Déploiement Vercel.

**Stockage** — IndexedDB, un seul enregistrement contenant le document. Hydratation complète en mémoire au démarrage, calculs de statistiques à la volée, persistance en debounce sur mutation. Pas d'index, pas de requêtes. Les écritures sont sérialisées, et la file est vidée quand la page part — `pagehide` et `visibilitychange` sur `hidden`, les deux seuls événements sur lesquels un téléphone rende la main ; pas de `beforeunload`, qui n'est pas plus fiable et qui n'a rien à demander, on enregistre et on ne retient pas. Une révision est écrite avec le document, dans la même transaction ; elle décrit cet appareil et ne figure pas dans les exports. La durabilité est demandée au navigateur (`navigator.storage.persist()`) à la création du document et après un import, **depuis un seul endroit**, et le résultat est retenu pour l'appareil.

**Santé du stockage** — ce que l'app sait du navigateur, et rien de plus. Elle ne prétend **pas détecter la navigation privée** : aucun navigateur ne l'expose, et une app qui l'affirme a tort tôt ou tard devant quelqu'un qui ne peut pas la contredire. Elle raisonne en conservation et en écritures réelles.

- `navigator.storage.persisted()` a **trois** réponses : accordée, refusée, ou rien du tout là où l'API n'existe pas ou lève. Un silence n'est pas un refus, et un `true` n'est pas une garantie — il engage le navigateur contre l'éviction sous pression disque, pas contre quelqu'un qui vide ses données de site. Aucune erreur de cette API ne fait tomber quoi que ce soit.
- Le fait d'avoir demandé la conservation est gardé sur l'appareil : « on n'a jamais demandé » et « on a demandé, il a refusé » ne se disent pas pareil, et seul le second autorise à écrire « ce navigateur ne garantit pas ». C'est ce qui décide si la dernière étape de l'onboarding (§4.1) durcit sa phrase.
- L'état vit dans la couche technique, jamais dans le document : comme la révision et la date de dernier export, il décrit cet appareil et n'a aucun sens dans un fichier exporté.

**Fiabilité** — c'est la contrepartie de « tout vit sur ton appareil » : aucune perte ne doit être silencieuse. Trois niveaux, et **un seul bandeau à la fois** : le plus grave masque les plus faibles, dans l'ordre qui suit.

- **Rien ne s'écrit** — quota plein, stockage indisponible, base évincée : un bandeau persistant le dit et propose l'export immédiat **depuis la copie en mémoire**, sans relire la base, depuis n'importe quel écran, y compris une saisie en cours. Il ne s'écarte pas ; il s'éteint quand une écriture repasse.
- **Rien n'est promis** — les écritures passent, mais le navigateur ne s'est pas engagé à conserver. Un avis sobre, sans couleur de danger : rien n'a échoué, et le rouge du DS est réservé à ce qui a raté. Il ne s'affiche qu'une fois qu'il y a quelque chose à perdre, il s'écarte comme le rappel d'export, et le refus vaut pour le même cycle de trente jours — deux cadences différentes se seraient croisées une semaine sur deux.
- **Rien ne se lit** — un document présent mais illisible n'ouvre pas les deux questions, qui l'écraseraient. L'écran d'arrivée porte quatre recours dans l'ordre de ce qu'ils sauvent : importer un export, télécharger la copie brute telle qu'elle est stockée, recharger, puis effacer — derrière deux confirmations. Cet écran suppose que l'échec tombe à l'hydratation ; une base devenue illisible **après** l'ouverture n'y arrivera jamais, et passe par le bandeau du premier point — la conséquence est la même, plus rien ne s'enregistre.
- **La base ne répond pas** — l'hydratation abandonne au bout de dix secondes plutôt que de laisser tourner l'écran de démarrage, et une lecture qui aboutit après coup est jetée.
- **Deux onglets** — l'onglet qui reçoit une révision supérieure annule son écriture en attente et relit, plutôt que d'écraser. Il le dit en passant.
- **Le rendu casse** — un écran de secours remplace l'écran blanc et propose d'abord de récupérer les données, puis de recharger, puis de réinstaller l'app en vidant le cache du service worker — sans quoi la version cassée se ressert à chaque rechargement.
- **Sauvegardes locales** — cinq instantanés tournants, un par jour de saisie, chacun portant l'état d'avant les modifications du jour, restaurables depuis les réglages. Elles ne remplacent pas un export : elles vivent dans le même navigateur.

**PWA** — installable, manifest complet, service worker de cache applicatif. C'est une exigence, pas un bonus : sur iOS, un site non installé voit son IndexedDB purgé après environ 7 jours sans visite.

**Migrations** — chaque changement de forme du document incrémente `schemaVersion` et fournit une fonction de migration. À écrire dès la v1, y compris pour la version 1 → 1.

**Accessibilité** — contraste AA sur tout texte, focus clavier visible, `prefers-reduced-motion` respecté, graphiques doublés d'une lecture textuelle.

**Raccourcis clavier** — ils doublent les gestes les plus fréquents, ils n'en ouvrent aucun qui n'existe ailleurs : `←` et `→` changent de mois aux bornes des chevrons, `n` ouvre une dépense, `Échap` referme le panneau du jour au calendrier. Ils se taisent pendant qu'on tape, sous un modificateur — ces combinaisons appartiennent au navigateur —, et tant qu'une feuille est ouverte. `n` se tait en plus sur un écran de saisie, où il contournerait la garde de brouillon. Chacun se dit en infobulle sur le geste qu'il double : un raccourci que personne ne découvre ne sert personne.

**Langue** — français uniquement en v1, mais aucune chaîne en dur dans les composants.

---

## 6. Critères de sortie

La v1 est livrable quand :

- un utilisateur peut installer l'app, démarrer, saisir ses récurrences et boucler un mois complet sans documentation ;
- les données survivent à la fermeture du navigateur et à un redémarrage de l'appareil — y compris quand l'onglet se ferme dans la seconde qui suit une saisie ;
- aucune perte n'est silencieuse : une écriture qui échoue, une base illisible, un onglet en retard et un rendu qui casse ont chacun un signal et une issue, et l'issue propose l'export ;
- un export réimporté restitue un état strictement identique ;
- les comparatifs se comportent correctement avec un seul mois de données ;
- les deux thèmes sont complets, aucun écran n'est cassé dans l'un ou l'autre.
