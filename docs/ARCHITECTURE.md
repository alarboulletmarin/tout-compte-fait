# Architecture

Comment le code est rangé, et pourquoi il l'est comme ça. Ce document explique
les décisions ; le [cahier des charges](CAHIER-DES-CHARGES.md) dit ce que l'app
doit faire, et le [design system](DESIGN-SYSTEM.md) de quoi elle a l'air.

## Repères

- `src/styles/tokens.css` — les tokens du design system, déclarés une seule fois,
  en quatre couches : palette de base, tokens sémantiques, couche dérivée,
  exposition à Tailwind. Un composant qui écrit `var(--pine-500)` est un bug.
- `src/styles/palettes.css` — les cinq autres identités colorimétriques, en
  surcharges de la couche sémantique. `tokens.css` *est* la palette Classique,
  qui n'y figure donc pas. Aucun composant n'a jamais à savoir laquelle est
  active, et `src/theme/palettes.test.ts` mesure les douze couples
  palette × thème plutôt que de croire ce qui est écrit.
- `/styleguide` — chaque token, chaque échelle typographique et chaque composant,
  dans les deux thèmes. Livrable permanent, maintenu à jour.
- `src/domain/` — logique métier pure, sans UI, entièrement testée.
- `src/store/` — état zustand. Un composant lit un sélecteur et appelle une
  action, rien de plus.
- `src/persistence/writer.ts` — le regroupement des écritures. Il ne connaît pas
  IndexedDB : on lui donne une fonction d'écriture, il décide quand l'appeler et
  rapporte ce qu'elle a fait.
- `src/persistence/tabs.ts` — ce que les onglets se disent, et rien d'autre.
- `src/persistence/health.ts` — la santé du stockage de **cet appareil** : la
  durabilité que le navigateur accorde, le fait qu'on la lui ait demandée, la
  date de la dernière écriture qui a abouti et de la dernière qui a raté. Rien
  n'en voyage dans un export, pour la raison qui vaut déjà pour la révision et
  la date de dernier export. C'est aussi le seul module qui appelle
  `navigator.storage.persist()`.
- `src/app/noticeLevel.ts` — la priorité des messages de sécurité des données,
  en une fonction pure. Le rendu est dans `src/app/DataNotice.tsx`, qui est le
  seul bandeau de la coquille.
- `src/i18n/fr.ts` — toutes les chaînes. Aucun texte en dur dans un composant.
  Trois exceptions, et la même raison : `src/i18n/legal.ts`,
  `src/i18n/landing.ts` et `src/i18n/history.ts`. Ce fichier-ci est importé par
  presque tous les composants, donc il pèse dans le graphe initial que
  `scripts/size.mjs` plafonne ; ces trois-là sont rendues par des écrans chargés
  à la demande. Elles voyagent avec eux. L'historique emportait déjà ses trois
  graphiques, dont aucun autre écran ne se sert : sa prose n'avait pas plus de
  raison qu'eux de peser sur l'écran du mois. Le nom de l'écran, lui, reste dans
  `fr.nav` — la barre d'onglets le dit sans charger la page.
- `src/persistence/schemaDoc.ts` — le modèle de données à donner à un assistant,
  et `src/persistence/example.ts` — le document d'exemple. Tous deux dérivés du
  code, tous deux chargés à la demande.
- `src/app/meta.ts` — le dépôt, la licence et la version. La version est lue sur
  `package.json` à la construction (`define` dans `vite.config.ts`) : la recopier
  dans le source en ferait une seconde vérité, fausse au premier `npm version`.
- `src/ui/Icons.tsx` — le seul module qui connaît la bibliothèque d'icônes. Un
  composant qui importe Phosphor directement est un bug.

## Choix structurants

**Money.** Entier signé en centimes, *branded*. Additionner deux `Money` produit
un `number`, pas un `Money` : le résultat ne peut pas être réaffecté sans
repasser par `money()`, qui rejette tout non-entier. Aucun flottant ne touche un
montant.

**Dates.** Chaînes ISO `YYYY-MM-DD`, arithmétique civile en entiers
(`days_from_civil`). `new Date` n'apparaît que dans `today()`, via ses seuls
accesseurs locaux. Aucune conversion UTC nulle part.

**Échéances.** Le jour d'échéance est borné, jamais reporté : une mensuelle au 31
tombe le 31 janvier, le 28 février, puis de nouveau le 31 mars. Corollaire :
`anchorDay: 31` *est* « le dernier jour du mois », et `describePeriod` le dit
ainsi — annoncer « le 31 » sur une échéance qui tombe le 28 décrivait la saisie
et non ce qui se passe.

**L'horizon de la prochaine échéance se déduit de la période.** Il valait deux
ans en dur, et répondait juste tant que le formulaire ne savait poser un
intervalle que sur les mois. `Period` en accepte un sur les trois unités : une
annuelle tous les trois ans rendait donc `null`, disparaissait de « Prochaines
échéances » et se rangeait en fin de tri, sans qu'aucun écran ne dise pourquoi.
Une constante qui répond juste tant que l'app ne sait pas produire le
contre-exemple n'est pas une borne, c'est un pari — et un document importé
suffisait à le perdre. C'est le même défaut, du côté lecture, que celui que
`period.ts` corrige du côté écriture.

**Taux.** En points de base entiers — 450 = 4,50 %. Aucun flottant ne touche un
calcul financier, pas plus un taux qu'un montant.

**La présentation avant la question.** L'écran d'arrivée était « Comment
s'appelle ton foyer ? » : on demandait de répondre avant d'avoir dit ce que
l'app suit ni où vont les données. Cette question-là n'existe plus du tout —
elle n'achetait qu'un libellé de colonne latérale, et supposait au passage un
foyer qu'on tient, ce que ne fait pas qui vit chez ses parents (cahier §4.1). `/bienvenue` passe devant, et elle est
construite avec les tuiles, l'anneau et les chiffres de l'app plutôt qu'avec des
visuels — le DS §1 interdit l'illustration, et une grille qui *est* le produit
démontre mieux qu'une capture. Elle vit au-dessus du gate, donc à une URL stable
joignable dans les deux états ; ce qu'elle propose, lui, en dépend — les portes
qui remplacent des données ne s'affichent que devant quelqu'un qui n'en a pas.

Corollaire du même déplacement : `resetAll()` retombe sur elle. Le formulaire
s'affichait jusqu'ici à l'URL de l'écran d'où l'on venait, `/reglages` comprise.

**Elle démontre le calcul, pas seulement la grille.** La bento montrait un seul
écran — le mois —, et ce qui distingue vraiment l'app y était *raconté* :
prorata, régularisation du mois suivant, cascade de la capacité d'épargne
n'existaient qu'en prose. `LandingProof` les pose avec les composants et le
vocabulaire des vrais écrans, jusqu'à la ligne de vérification de `SplitPage`.
D'où une contrainte nouvelle sur `features/landing/sample.ts` : **tous ses
montants se recomposent**, d'un bout à l'autre de la page — le mois prévu vaut
charges + crédits, la capacité vaut revenus − charges − crédits, les parts
redonnent le pot au centime, et les deux reports s'annulent pour que ce soit
encore vrai après régularisation. `sample.test.ts` tient ces invariants ; sans
lui, un montant modifié à la main ferait mentir à l'écran la page qui promet que
tout se vérifie.

**Ce qu'elle traite en plus de ce qu'elle montre.** Le modèle économique est
énoncé sous la promesse de confidentialité — « rien à vendre puisque rien n'est
collecté, rien à financer puisqu'il n'y a pas de serveur » —, et `LandingQuestions`
répond aux quatre objections qui décident vraiment devant une app de finances
sans compte : changer de téléphone, vider son navigateur, la gratuité, l'éditeur.
Ouvertes et non repliées derrière un chevron : quelqu'un de méfiant n'a pas à
cliquer pour obtenir la réponse qui lèverait sa méfiance. C'est aussi de là que
le cahier des charges et le design system deviennent atteignables — « à propos »
les liait déjà, mais un visiteur qui ne crée rien ne va pas jusque-là.

**Rien ne s'écrit avant que le document existe.** `mutate` ne programme
d'écriture qu'une fois le statut passé à `ready`. Sans cette garde, répondre à la
première question puis fermer l'onglet laissait un document enregistré : au
lancement suivant l'app s'ouvrait « prête » sur un document sans personne, et
les étapes ne revenaient jamais. C'est `finishOnboarding` qui programme la
première écriture — il le faisait déjà explicitement, et cet appel n'avait de
sens que si rien n'avait été écrit avant lui.

**Les écritures sont sérialisées.** Le writer chaîne sa file au lieu de
l'écraser. Deux `put` partis de deux transactions ouvertes en parallèle sur la
même clé commettent dans l'ordre que le moteur décide, pas dans celui où on les
a émis : la dernière saisie pouvait donc se faire recouvrir par l'avant-dernière.
Le chaînage rend l'ordre d'écriture égal à l'ordre de frappe, et c'est aussi ce
qui permet à `flush()` d'attendre la file entière plutôt que sa dernière entrée.

**Une écriture ratée se voit, et `flush()` ne rejette jamais.** Le writer
rapporte par un hook au lieu de lever. Une chaîne rejetée empoisonnerait tous
les `.then` suivants — une panne passagère deviendrait définitive — et ferait
rejeter `flush()` dans un gestionnaire `pagehide`, où personne n'est là pour
rattraper. Le store route l'échec vers un bandeau persistant qui ne s'écarte
pas : la condition est en cours, et un bandeau qu'on chasse laisserait quelqu'un
continuer à saisir dans une app qui n'enregistre plus.

L'erreur porte un `kind`, `read` ou `write`, et c'est lui qui permet à une
écriture réussie d'effacer le bandeau d'écriture sans effacer un échec de
lecture : rien de ce qu'on écrit ne rend lisible ce qui ne l'était pas. Les deux
n'ont d'ailleurs ni la même issue ni le même écran — l'un se règle par un export
depuis la coquille, l'autre par un import depuis l'arrivée. Le bandeau montre
quand même les deux : un échec de lecture n'ouvre l'écran d'arrivée que s'il
tombe à l'hydratation, et une base `blocked` à la réouverture — après qu'un
`terminated` a fermé la connexion — arrive alors que la coquille est déjà montée.
Ce cas-là ne disait rien du tout, pour une conséquence pratique pourtant
identique : plus rien ne s'enregistre.

**On raisonne en conservation, jamais en « navigation privée ».** Aucun
navigateur n'expose ce mode, les détours qu'on lit ailleurs se démentent d'une
version à l'autre, et une app qui affirme « mode privé détecté » a tort tôt ou
tard devant quelqu'un qui ne peut pas la contredire. Ce que l'app sait tient en
trois faits observables : ce que `persisted()` répond, si on le lui a demandé,
et si les écritures passent. `persisted()` a donc **trois** valeurs et non deux
— un navigateur sans l'API n'a pas refusé, il n'a pas répondu, et l'app écrivait
jusqu'ici « rien n'est promis » sur la foi de ce silence. Un `true` n'est pas non
plus une garantie : il engage le navigateur contre l'éviction sous pression
disque, pas contre quelqu'un qui vide ses données de site.

**Trois niveaux, et un seul bandeau.** L'échec confirmé, la conservation non
garantie et l'export ancien disent au fond la même chose — garde une copie —
avec trois gravités. Ils décidaient chacun de leur côté de s'afficher, si bien
que les deux premiers pouvaient s'empiler ; ils passent maintenant par
`dataNoticeLevel`, qui n'en laisse parler qu'un. L'ordre découle de ce que chacun
coûte s'il est ignoré : un échec se paie tout de suite, une conservation fragile
peut-être un jour, un export ancien le jour où l'appareil tombe. Les deux
premiers occupent d'ailleurs deux registres visuels différents — le rouge du DS
est réservé à ce qui a échoué, et un stockage non durable n'a rien raté.

**La demande de durabilité est centralisée, et le résultat est retenu.** Trois
chemins appelaient `persist()` chacun de leur côté, aucun n'en gardait la
réponse : la vérité n'existait que dans l'état local de l'écran des réglages,
donc nulle part pour qui voulait en faire quelque chose. Elle vit dans
`persistence/health.ts`, relue à l'hydratation — une lecture, jamais une demande,
sans quoi Firefox ouvrirait son invite devant quelqu'un qui vient d'ouvrir
l'app — et demandée aux deux moments du cahier §5 : création du document et
import. Le fait d'avoir demandé est gardé sur l'appareil, parce que « on n'a
jamais demandé » et « on a demandé, il a refusé » ne se disent pas pareil : seul
le second autorise à écrire « ce navigateur ne garantit pas ».

**Un document illisible n'est pas un document absent.** `hydrate` bascule sur
l'onboarding dans les deux cas, mais la première écriture qui suit écraserait
des données peut-être intactes : une `ImportError` levée par un `schemaVersion`
plus récent se répare en mettant l'app à jour, pas en effaçant. `finishOnboarding`
refuse donc d'écrire tant qu'un échec de lecture n'a pas été traité, et
`/demarrer` renvoie à l'arrivée — le verrou est aux deux endroits parce qu'un
seul des deux se contourne, l'URL étant un signet.

**La révision vit hors du document.** Même argument que la date de dernier
export : ce qui décrit le rangement de cet appareil ne voyage pas dans un
fichier exporté. Dans `Data`, elle serait dans chaque export, où elle ne veut
rien dire, et un import à la révision 900 dans une base à la révision 3 ferait
croire à l'onglet qu'il est en avance sur ses voisins. Elle est écrite dans la
même transaction que le document — sinon elle n'est la révision de rien — et
fournie par l'appelant plutôt que relue, parce que l'écriture de `pagehide` ne
peut plus se permettre d'aller-retour.

**Un onglet en retard recharge, il n'écrase pas.** À réception d'une révision
supérieure, il annule d'abord son écriture en attente : elle porte son document
périmé, et la laisser partir écraserait celui d'en face — c'est exactement le
bug qu'on retire. On jette plutôt qu'on fusionne, parce qu'il n'existe pas de
fusion pour un document unique ; le prix est au pire les 400 ms de frappe en
cours, contre le document entier de l'autre onglet. Et il le dit par un toast :
un montant qui change tout seul sous les yeux sans un mot est sa propre forme
d'inquiétude.

**L'anneau garde l'état d'avant la session.** L'instantané du jour porte le
document tel qu'il était au démarrage, pas celui qu'on vient d'écrire : un point
de retour sert à revenir avant ce qui a cassé, et ce qui casse est la session en
cours. Après un onboarding il n'y a rien à archiver, et c'est juste — il
n'existait aucun état antérieur. La clé est une date ISO, donc l'ordre
lexicographique *est* l'ordre chronologique et le rognage à cinq tient en une
ligne. Une sauvegarde ratée n'est pas une écriture ratée : elle n'allume pas le
bandeau.

**L'écran de secours rend les octets, le bandeau rend la mémoire.** Les deux
boutons portent presque le même nom et n'exportent pas la même chose, pour des
raisons exactement inverses. Le bandeau tombe quand l'écriture a échoué : c'est
le disque qui est en retard, l'écran est intact. L'`ErrorBoundary` tombe quand
le rendu a levé : le document en mémoire est le suspect, et on ne fait pas
passer un sauvetage par `migrateDocument`, qui peut lever. `CrashScreen`
n'importe donc ni le routeur ni le store — n'importe lequel peut être ce qui
vient de casser, et un écran de secours qui plante n'en est pas un.

**Ouverture du mois.** Jamais une tâche pour l'utilisateur : afficher un mois
non passé l'ouvre. Idempotente — une échéance est reconnue à sa paire récurrence
+ date — donc naviguer d'un mois à l'autre ne duplique rien et ne touche aucune
entrée confirmée. Un mois passé ne s'ouvre pas tout seul : y faire apparaître des
échéances que personne n'a confirmées inventerait un historique.

**Règle et fait.** Une récurrence est une règle, une échéance est un fait. Toute
écriture sur une récurrence réaligne ses échéances à venir dans tous les mois
ouverts, dans la même mutation. Les confirmées ne bougent jamais.

**Sens et nature.** `direction` dit si l'argent entre ou sort du compte,
`CategoryKind` dit ce qu'il devient. Un versement sur un livret sort du compte
exactement comme un plein d'essence : seule la nature les distingue. C'est ce
qui permet à la capacité d'épargne d'exister — ressources − charges − crédits,
avant versements — et au camembert de ne pas mettre « Épargne 30 % » à côté de
« Courses 12 % ». La nature est portée par la famille et lue par une fonction,
jamais dupliquée sur la catégorie : deux copies finissent toujours par diverger.

**Capital restant dû.** Dérivé, jamais stocké. `Rₙ = P(1+i)ⁿ − M((1+i)ⁿ − 1)/i`,
avec `n` le nombre de mensualités confirmées. Retrancher les mensualités versées
serait faux dès qu'il y a des intérêts : sur 100 000 € à 4 % sur 20 ans, la
première année amortit ~3 000 € pour ~7 300 € versés, et le raccourci
annoncerait le prêt soldé des années trop tôt.

**Prorata des revenus.** Le revenu d'un membre est *dérivé* de ses récurrences
de nature `resource`, ramenées au mois — il n'est stocké nulle part. Le déclarer
à côté en ferait une seconde vérité, et la première augmentation les ferait
diverger. La distinction règle / fait tient quand même, et sans doublon : c'est
la **récurrence** qui est la règle, l'`Entry` qui est le fait. Une prime est une
entrée ponctuelle, donc elle ne déplace pas la part du loyer ; une augmentation
se saisit dans la récurrence, donc elle la déplace. Le calcul refuse de répondre
— `null`, pas zéro — tant qu'un membre n'a aucune ressource à son nom, qu'un
montant variable n'a pas d'échéance confirmée d'où se lire, ou qu'une de ses
ressources vaut zéro : un prorata au dénominateur incomplet ne vaut pas zéro, il
ne veut rien dire. Le troisième cas se refusait de lui-même quand *tous* les
revenus étaient nuls, jamais quand un seul l'était — le membre à 0 € recevait
alors 0 % des charges communes, un chiffre faux qui a l'air d'un résultat.

Ces refus sont des refus de *comparaison* — et le membre seul n'a personne à
comparer. Son coefficient vaut trivialement 100 %, sans qu'aucun revenu soit
exigé : refuser là aussi faisait diverger le mois filtré sur lui du mois entier,
qui sont pourtant la même personne. `scopeToMember` lui rend alors le mois
entier, montants intacts — le commun au montant plein, et les lignes que
personne ne porte (une paie ou un versement laissés « en commun »), qui ne sont
pas communes et qu'un découpage du prorata ne saurait donc pas lui rendre. La régularisation, elle, se calcule et rend zéro : il
porte 100 % de ce qu'il avance.

L'asymétrie de `isRunningIn` — une règle arrêtée sort du mois, une règle à venir
y compte déjà — est bornée à un trimestre. Sans borne, un salaire déclaré pour
2030 déplaçait la part de chacun dès aujourd'hui ; avec elle, « à venir » veut
dire bientôt, ce qui est le seul sens dans lequel une déclaration parle encore
du mois qu'on regarde.

**Plus forts restes.** Répartir 2 000 € entre trois tiers en arrondissant chaque
part donnerait trois fois 666,67 € et un centime de trop. `split.ts` pose les
parts entières puis distribue le reste aux plus forts restes, à égalité au poids
le plus à gauche : la somme vaut exactement le total, et deux affichages du même
mois donnent le même centime au même membre. Le coefficient est en points de
base, comme les taux — aucun flottant ne touche un calcul financier.

**Partage.** Est commune une sortie de nature `charge` ou `debt` que personne ne
s'est attribuée. La case « à partager » est une *exception* stockée seulement
quand elle diverge de cette règle, jamais une copie : sans quoi tout ce qui a
déjà été saisi serait à requalifier, et deux sources finiraient par diverger.

**Listes longues.** Une liste qui dépasse l'écran se regroupe et se replie,
sur `<details>` natif (`ui/Disclosure.tsx`) : il porte déjà l'état pour un
lecteur d'écran, répond au clavier, et la recherche dans la page sait ouvrir ce
qui est replié. L'en-tête garde une lecture visible même replié — un total, un
compte : une section qu'il faut ouvrir pour savoir si elle vaut la peine ne fait
gagner aucun défilement. Le mois passe ainsi de 2 150 px à 302 px groupé par
personne, et les récurrences de 1 518 px à 708 px. L'état d'un jeu de sections
vit dans `ui/useDisclosureGroup.ts`, une seule fois pour les deux écrans.

Le repli a une limite, et les réglages l'ont atteinte : replier douze familles
raccourcit la page, mais retrouver « Carburant » demande encore de deviner
sous laquelle elle est rangée, puis de les ouvrir une par une. Passé un
certain volume, une section n'est plus une section — c'est un écran (voir
ci-dessous).

**Les réglages sont une section, pas un écran.** La page portait tout : les
personnes, le catalogue entier, le thème, la devise, le stockage, l'export,
l'import, le schéma, le jeu d'exemple, l'effacement total et « à propos », avec
trois formulaires ouverts en permanence — **3 725 px à 390 px de large**, jeu
d'exemple chargé. C'était une console d'administration, pas une page de réglages
de téléphone : consulter, naviguer, créer et modifier s'y faisaient au même
endroit et au même poids visuel, et changer de thème demandait de traverser
quarante-sept catégories.

Une entrée, donc — **952 px**, cinq groupes, sept rangées, chacune disant sa
valeur — et neuf vues sous `/reglages/…` : l'apparence, les personnes, la fiche
d'un membre, le catalogue, une famille, les deux formulaires de création, le
stockage, les données. Chaque vue porte son URL, ce qui rend le retour du
navigateur, le partage d'un lien et le bouton de l'écran identiques à ceux du
reste de l'app — là où un état de composant n'aurait été connu d'aucun des trois.

**Le thème est descendu dans une vue, et c'est un revirement.** Il restait
réglable sur place, et l'argument tenait : trois positions, un geste, l'enfouir
d'un cran aurait coûté plus que la rangée qu'il occupait. Il ne tient plus depuis
qu'un second réglage d'apparence existe à côté de lui. Une palette ne se choisit
pas à la lecture de son nom — il faut la voir —, et six aperçus n'entrent pas
dans les 250 px utiles d'une rangée à 320. Restait à les séparer : le thème sur
la page d'entrée, la palette dans sa vue. C'était le pire des trois, parce que
les deux se regardent — une palette n'a pas la même allure en clair et en
sombre, et « Sombre » ne dit rien sans savoir de quelle palette il est le sombre.
La page d'entrée ne perd donc pas une rangée, elle en change : « Apparence »
y dit sa valeur — « Système · Douce » — comme toutes les autres. La devise reste
le seul réglage qui se fasse encore sur place, et pour la raison inverse : six
codes dans un sélecteur natif n'ont rien à montrer qu'une vue rendrait mieux.

Deux conséquences, l'une et l'autre écrites une fois : `isFocusScreen` compte
désormais `/reglages/…` mais pas `/reglages`, ce qui retire le bouton flottant
des vues qui ont déjà leur propre action principale (« Ajouter un membre »,
« Ajouter une famille ») ; et la barre d'onglets garde « Réglages » allumé sur
`/a-propos`, qui vit à la racine — elle parle de l'app, pas d'un foyer — mais
qu'on n'atteint, sous 1024px, que par les réglages.

Le groupe et la rangée sont deux primitives de vingt lignes
(`features/settings/SettingsRow.tsx`), au-dessus de `Tile` et d'`Eyebrow` : la
tuile redevient ce que le DS §6 en dit — un groupe logique —, et la hiérarchie
passe à l'intérieur, en filets et en lettres, plutôt qu'en cartes empilées.

**Défaire tient dans un instantané, pas dans une commande.** Toutes les
mutations du domaine sont pures — `updates.ts` rend un `Data` neuf plutôt que de
modifier celui qu'on lui donne —, si bien que le document d'avant est encore là,
intact, à portée de référence. Le reposer *est* l'annulation exacte de
n'importe quel geste, y compris ceux qui touchent à dix endroits à la fois comme
le retrait d'un membre. Une pile de commandes inverses aurait demandé une
fonction par geste, et une de plus à chaque geste nouveau, pour un résultat
moins fidèle. `undoable` capture, applique, annonce et propose ; le message
porte l'offre et vit huit secondes, parce que quatre suffisent à lire
« Dépense supprimée » mais pas à s'apercevoir qu'on s'est trompé et à atteindre
le bouton au pouce.

L'offre ne survit à aucune mutation du document — `mutate` la retire, et les
quatre remplacements qui ne passent pas par lui aussi. C'est ce qui empêche un
instantané d'écraser ce qui a été fait depuis, notamment le document qu'un
onglet voisin vient de relire ; c'est ce qui empêche de rejouer un undo ; et
c'est ce qui fait qu'un seul geste est défaisable à la fois, le dernier. Le
verbe est « Rétablir » : « Annuler » est déjà le bouton qui ferme une boîte de
dialogue.

Les `ConfirmDialog` restent toutes. Le cahier §4.8 demande une confirmation sur
toute suppression, et un retour arrière de huit secondes ne dit pas la même
chose qu'une question posée avant : il rattrape le oui donné trop vite, il ne le
remplace pas. Les retirer se déciderait dans le cahier, pas dans le code.

**Une saisie ne se jette pas sans un mot, et `beforeunload` n'y pouvait rien.**
Les quatre écrans de saisie quittent par le routeur, pas par le navigateur : un
`beforeunload` ne voit pas passer un changement d'URL interne, et n'aurait donc
protégé que la fermeture d'onglet — le seul cas où l'on ne perd pas la saisie
par mégarde. `useLeaveGuard` compare le brouillon à ce qu'il était à
l'ouverture, en surface, et ne pose sa question que s'il a bougé : ouvrir un
formulaire, le regarder et repartir est un geste courant, et le ponctuer d'une
question apprendrait surtout à cliquer sans lire — ce qui coûterait précisément
la fois où la saisie n'était pas vide.

**Aucun indicateur de sauvegarde permanent, et c'est une décision.** L'écriture
est débouncée à 400 ms et regroupée : une pastille qui suivrait son état
clignoterait à chaque frappe pour annoncer ce qui n'a jamais échoué. Ce qu'il
faut savoir, c'est l'anomalie — et elle a déjà son bandeau, persistant, qui ne
s'écarte pas et propose l'export. Un signal permanent à côté de lui apprendrait
surtout à ne plus le voir. Le jour où le silence poserait vraiment problème,
c'est le bandeau qu'il faudrait étendre, pas un second signal qu'il faudrait
ajouter.

**Les raccourcis clavier ont un seul endroit qui décide quand ils se taisent.**
Trois touches, et trois conditions qui comptent autant qu'elles : on tape — un
« n » dans un libellé ne crée pas de dépense ; un modificateur est enfoncé —
`Ctrl+N` et `⌘←` appartiennent au navigateur ; une feuille est ouverte — un
`<dialog>` capte le focus mais pas les écouteurs de `window`, et un raccourci
qui agirait derrière une question de confirmation la laisserait ouverte sur un
écran qui a changé. `n` se tait en plus sur les écrans de saisie, où il
contournerait la garde de brouillon : celle-ci ne surveille que les deux boutons
de sortie, pas les départs qui ne passent pas par eux.

**Un écart de zéro n'est pas une lecture.** `compareMonths` rend l'union des
catégories des deux mois, et une catégorie présente de part et d'autre au même
montant y figure avec un écart nul. Affichées ensemble, ces lignes-là noyaient
les autres : sur le catalogue par défaut, quinze « 0,00 € · 0 % » pour deux
vraies variations, et la comparaison mensuelle devenait à elle seule la moitié
de la hauteur de l'écran. `splitDeltas` sépare donc ce qui a bougé de ce qui n'a
pas bougé — c'est une distinction métier, pas une mise en page, d'où sa place
dans le domaine. Le repli des inchangées ne les cache pas : il change ce qu'on
lit d'elles. Une catégorie qui n'a pas bougé n'a rien à dire d'un écart, mais
elle a quelque chose à dire de ce qu'elle pèse, et c'est **le montant commun aux
deux mois** qui s'y affiche, classé du plus lourd au plus léger. Elles arrivent
toutes à égalité sous le tri par ampleur d'écart, donc sans ce second tri leur
ordre serait celui de l'itération d'un `Set`.

**Deux années ne se comparent qu'au même mois.** Le cumul annuel courait
jusqu'en décembre pour les deux séries : huit mois d'une année en cours s'y
lisaient contre douze de la précédente, et le mois de plus passait pour un
écart. `yearHorizon` rend le rang du dernier mois que l'année **choisie** sait
chiffrer, et c'est à ce rang que les deux se lisent. La lecture au curseur était
déjà juste — elle compare le mois *n* au mois *n* par construction —, c'est le
résumé accessible qui mentait. Le tracé, lui, garde les deux années entières :
rogner l'année d'avant cacherait des données réelles, ce qui est un autre défaut
que celui qu'on corrige, et l'œil voit très bien où l'année en cours s'arrête.
L'écran le dit quand même en toutes lettres — un chiffre juste qu'on ne comprend
pas se lit comme un chiffre faux.

**La recherche est du calcul pur, et elle vit sur l'historique.** L'appariement
est dans `domain/search.ts`, testé : casse et accents mis de côté — on ne tape
pas ses accents au pouce —, en sous-chaîne, et muet en dessous de deux lettres,
où une seule apparie la moitié des lignes et rend plus long que la liste qu'elle
réduit. La recherche globale n'a pas de sixième onglet : la barre en porte cinq
et n'en tient pas six à 320px (DS §5). Elle est sur l'historique, qui est de
toute façon l'écran de la question — « ce prélèvement de mars » est un regard en
arrière. Ce que la limite de vingt laisse de côté est compté et dit : une coupe
silencieuse se lirait comme une réponse.

**Un renommage en ligne n'écrit qu'à la sortie du champ.** Taper « Carburant »
posait neuf mutations du document, neuf rendus de tout ce qui lit le store et
neuf écritures programmées, dont huit portaient un mot inachevé. C'était déjà la
règle de tous les formulaires — ils tiennent leur saisie en état local et
n'écrivent qu'à l'enregistrement : les renommages étaient l'exception, pas le
modèle, et `useDraftField` les y ramène. Ce qu'on perd en fermant l'onglet au
milieu d'un mot est donc ce que perd déjà n'importe quel autre champ de l'app.

**La réparation des liens est une normalisation, pas une migration.** Rien ne
vérifiait qu'une `categoryId`, une `memberId` ou une `recurrenceId` désignait
quelque chose, et chaque lien mort avait sa façon d'être faux en silence : une
catégorie inconnue retombait sur `charge` par le double repli de
`kindOfCategory`, donc la dépense devenait commune et partagée ; un membre
inconnu faisait disparaître une entrée de toutes les vues filtrées tout en la
laissant peser sur le total. Le contrôle vit dans `validate.ts` et non dans une
étape de `MIGRATIONS`, parce que la normalisation est ce que **tout** document
traverse — y compris un fichier déjà à la version courante et écrit à la main,
qu'une migration ne verrait jamais. Elle ne change pas la forme du document, et
n'a donc rien à incrémenter.

Trois gestes, et le plus doux qui règle chaque cas. Un lien facultatif se
**coupe** : la ligne rend son membre ou sa règle au commun et reste modifiable.
La catégorie, qui n'est pas facultative, se **redirige** vers une catégorie de
réparation visible — même famille d'accueil qu'avant, donc même nature : ce qui
change n'est pas le calcul, c'est qu'on la voit. Ce qui ne peut être ni coupé ni
redirigé — une avance dont le porteur n'existe pas — est **écarté**. Un
identifiant en double est renommé et jamais supprimé : rien ne dit laquelle des
deux lignes est la bonne, et le suffixe est déterministe pour que deux lectures
du même fichier donnent le même document.

**Une lecture qui écarte le dit.** Le rapport remonte jusqu'à la confirmation
d'import, ligne par ligne — la collection, le nom ou le rang, la raison. Un
import remplace tout le document : c'est le dernier instant où l'on peut encore
comparer avec ce qu'il y avait avant, et une dépense jetée en silence à ce
moment-là ne se retrouve plus jamais.

**Le schéma se lit sur le code.** Le document qu'on donne à un assistant pour
faire transcrire ses notes embarque le source de `domain/types.ts` — par
`?raw`, donc les types décrits *sont* les types, commentaires de rationale
compris — et son catalogue de catégories est lu sur `persistence/defaults.ts`.
Le recopier eût été une seconde description du modèle, qui aurait divergé de lui
et enseigné un document que l'app refuse : exactement l'erreur qu'il existe pour
éviter chez son lecteur.

Ce qu'il dit de l'import est dérivé de la même façon. La liste des réparations
est un `Record<ImportReason, …>` indexé sur l'union de `persistence/validate.ts` :
une raison ajoutée là-bas sans être décrite ici ne compile pas. Le garde-fou est
tenu par le compilateur et non par un test — un test qu'on peut oublier d'écrire
n'en est pas un. Le même raisonnement vaut pour les clés du document, que le test
lit désormais sur `emptyData()` : la liste des dix noms qu'il recopiait s'était
périmée en silence le jour où l'épargne en a ajouté deux.

**L'exemple est construit, pas commité.** `exampleData(on)` bâtit un document de
quinze mois à partir d'une date, en posant des récurrences puis en *ouvrant*
chaque mois par `openMonth` — jamais en écrivant une `Entry` à la main. Deux
conséquences : le jeu est toujours à l'heure, là où un `.json` figé serait vide
du mois courant dès le mois suivant, c'est-à-dire l'écran vide qu'il existe pour
éviter ; et il est produit par les mêmes règles que l'usage réel, donc une règle
qui change le change avec elle. Les salaires y tombent en tête de mois, ce qui
n'est pas cosmétique : chargé le 2, le jeu s'ouvrait sinon sur un solde à zéro.

**Et ce qu'il contient est une liste d'états, pas une collection de lignes
vraisemblables.** Chaque graine y est parce qu'un écran s'efface sans elle : un
crédit soldé, une avance entièrement reconstituée, un support d'épargne archivé,
un autre sans relevé — dont la valeur est donc *inconnue*, ce qui n'est pas zéro
—, une règle qui s'arrêtera le mois prochain et une autre qui n'a pas encore
commencé, un troisième membre au revenu très inférieur pour que le prorata cesse
d'être un miroir. `persistence/example.test.ts` **est** cette liste, et le seul
endroit où elle est vérifiée.

Les deux modules valent une trentaine de kilo-octets pour des gestes qu'on fait
une fois dans sa vie : ils sont chargés en `import()` dynamique, et le schéma
est préparé à l'affichage de son contrôle — écrire dans le presse-papiers exige
de rester dans la tâche du clic, qu'un `await` au milieu du gestionnaire perdrait
sur Safari.

**Graphiques.** Aucune librairie. L'anneau, les barres empilées et les courbes
sont des composants SVG maison, dans `src/ui/Ring.tsx` et `src/charts/`.

**Icônes.** Phosphor, graisse `bold`, réexportée sous des noms à nous par
`src/ui/Icons.tsx` — changer de bibliothèque ne doit toucher qu'un fichier.
Import par chemin (`@phosphor-icons/react/dist/csr/<Nom>`) et non depuis l'index,
dont le barrel de neuf mille icônes ralentit le démarrage en dev. Coût réel :
environ 2,5 ko brut par icône, parce que chaque module embarque ses six graisses
dans une `Map` lue à l'exécution — on n'en affiche qu'une, aucun bundler ne peut
élaguer les autres. Les deux emplois autorisés sont fixés au DS §9.

## Écarts au design system

Le DS impose en section 8 un contraste AA sur tout texte. Six de ses propres
valeurs ne le tiennent pas. Chaque écart est commenté à l'endroit où il est
appliqué, et reste réversible en une ligne.

| Point | Valeur du DS | Mesure | Retenu |
|---|---|---|---|
| `--text-muted` en clair | `--ink-400` | 3,72:1 sur `--surface` | même teinte à 75 % → 5,99:1 |
| `--text-muted` en sombre | `#8FA09A` | 2,75:1 sur `--bg`, qui est du sapin | `--pine-100` sur le fond, valeur du DS dans les surfaces |
| `--accent-2` | `--violet-500` | blanc à 3,53:1, alors que le DS §2.3 l'annonce AA | `--violet-600` → 4,67:1, déjà dans la palette |
| anneau de focus en sombre | `--accent-2` | **1,61:1 sur `--bg`**, qui est du sapin : l'anneau ne se voyait pas sur le fond de page, là où WCAG 1.4.11 demande 3:1 | `--focus`, repointé sur `--violet-300` en sombre → 3,56 sur `--bg`, 9,17 sur `--surface`. Le clair ne bouge pas |
| eyebrow d'une `.tile--accent-2` | blanc sur blanc à 18 % | 3,39:1 — le voile éclaire le fond *vers* la couleur du texte, ce qui est juste sur un accent clair et faux sur un accent sombre | **écart conservé**, déclaré dans `theme/palettes.test.ts` : le corriger demande de veiler en sens inverse sur cette tuile, donc d'en changer l'aspect |
| voile des tuiles accentuées | 62 % partout | 3,65:1 sur l'accent le plus sourd — le contraste d'un voile d'encre monte avec la clarté de son fond, et le vert pomme est très clair | `--accent-veil`, posé par palette : 62 % pour Classique, jusqu'à 72 % pour Neutre |
| texte d'alerte | `--alert-500` | 3,55:1 sur `--bg` | `--danger-text` ; `--danger` reste un remplissage |
| symbole monétaire | opacité 0.5 | 3,65:1 sur `--surface` | 0.6, et 1 là où la couleur de texte n'a aucune marge |
| échéance prévue | opacité 60 % | ruine le contraste du libellé | pastille en pointillés + couleur de texte secondaire |

Trois autres points relèvent de la lecture plutôt que du contraste :

- **Trois champs réservés, et le schéma le dit.** `Category.icon` existe au
  modèle mais reste vide et n'est jamais rendu — le DS §9 n'admet l'icône que
  pour agir ou se repérer, et sur une ligne de liste la pastille de couleur tient
  déjà ce rôle : deux marqueurs côte à côte n'en font plus aucun.
  `settings.monthStartsOn` est stocké, validé et migrable, mais la v1 raisonne en
  mois calendaire — les `ym` du cahier sont de la forme `"2026-07"`.
  `MonthState.closed` est écrit à `false` et jamais lu.

  Les trois restent au modèle : les retirer coûterait une migration, et deux
  d'entre eux sont exactement ce qu'un chantier déjà envisagé — clôture de mois,
  « mon mois va du 27 au 27 » — redemanderait aussitôt. Ce qui change est que
  `persistence/schemaDoc.ts` les **annonce comme réservés**. Ce document est
  donné à un assistant pour faire transcrire des notes : il enseignait trois
  champs sans effet comme s'ils réglaient quelque chose, ce qui est précisément
  l'erreur qu'il existe pour éviter chez son lecteur. Un champ mort qu'on assume
  et un champ mort qu'on enseigne ne sont pas le même écart.
- **Les périodes d'un graphique ne font pas 44px de large.** Le DS §8 pose ce
  plancher pour toute cible tactile ; le curseur de lecture des graphiques
  (`src/charts/ChartCursor.tsx`) n'en tient que la hauteur. Mesuré à 320px : la
  page laisse 248px à la tuile, son cadre 40, l'axe des ordonnées une
  cinquantaine — restent ~190px pour douze mois, soit **16px chacun**. Tenir 44
  demanderait 528px de tracé, donc un défileur horizontal, qui détruirait la
  seule chose que ce graphique fait — douze mois d'un coup d'œil. La période
  fait en revanche toute la hauteur du tracé (160px), et la lecture existe par
  trois autres chemins : le clavier (flèches, `Origine`, `Fin`), le nom
  accessible de chaque mois, et la lecture d'ensemble en `sr-only`.

- **Le manifeste PWA ne suit pas la palette.** `background_color` et
  `theme_color` (`vite.config.ts`) sont du JSON construit une fois : ils gardent
  les valeurs de Classique, et rien ne peut les faire varier avec un réglage qui
  vit dans le navigateur. L'écart est borné à ce qu'ils peignent — l'écran de
  démarrage d'une app installée. La barre système, elle, suit : `theme.ts` lit
  `--bg` sur la feuille et le recopie dans la balise `theme-color`, qui a perdu
  ses deux variantes conditionnelles pour cette raison.

- **Le manifeste PWA dit encore « foyer », seul de toute l'app.** Le mot a été
  retiré partout ailleurs — interface, page d'accueil, métadonnées, README —
  parce qu'il suppose un foyer qu'on tient, ce que ne fait ni qui vit seul, ni
  qui vit chez ses parents, ni qui partage à distance (cahier §4.1). Le `name`
  de `vite.config.ts` reste : il porte l'identité des installations déjà en
  place, et le changer renomme l'icône sur l'écran d'accueil de gens qui n'ont
  rien demandé. L'écart est donc temporaire par nature — il tombera au prochain
  changement de manifeste qui s'imposera pour une autre raison.

La date du dernier export vit en `localStorage`, hors du document : elle décrit
l'état de sauvegarde de cet appareil, et l'inclure ferait qu'un fichier importé
prétendrait avoir été sauvegardé à l'instant. Le refus du rappel y vit pour la
même raison, et sous la même forme : une date, pas un booléen, pour qu'un refus
vaille un cycle de trente jours et non l'éternité.

**L'accusé de lecture de la notice y vit aussi, et se sépare des deux sur un
point.** `resetAll` efface les deux dates, qui décrivent des données qui ne
sont plus là, et l'app repartirait de zéro en annonçant la sauvegarde d'un
document disparu. Le drapeau de la notice, lui, traverse l'effacement, comme le
thème et la palette : il décrit ce qu'on a lu, pas l'état des données. C'est la
ligne de partage de tout ce qui vit en `localStorage` ici : décrire le document,
ou décrire l'appareil et la personne devant lui. Il est lu de façon **synchrone
au premier rendu**, ce qui est sa seconde raison d'y vivre : la notice doit
répondre avant qu'IndexedDB n'ait dit quoi que ce soit, faute de quoi elle
s'afficherait une frame chez quelqu'un qui l'a déjà fermée.

## Responsive

Mobile d'abord : le style non préfixé vise le téléphone, les variantes `md:` et
`lg:` ajoutent le confort au-delà. **Une seule bascule de navigation, à 1024px**
— la barre d'onglets et le bouton de saisie flottant en dessous, la colonne
latérale au-dessus. La grille bento du DS §5, elle, a **trois paliers** :

| Bande | Colonnes | Rangée | Navigation |
|---|---|---|---|
| < 768px | 2 | 88px | barre de 4 onglets + écran « Plus » + bouton flottant |
| 768 – 1024px | 4 | 96px | idem |
| ≥ 1024px | 6 | 108px | colonne latérale, en trois groupes |

La barre porte **quatre** onglets — Le mois, Calendrier, Historique, Plus — et non
plus cinq. Ce n'est pas un choix de largeur mais d'architecture : cinq était le
plafond à 320px, et ce plafond décidait qu'un écran de plus n'aurait aucune
adresse. Quatre écrans réels vivaient dans ce cas. Le quatrième onglet range ce
qui déborde ; la colonne latérale, qui a la place, déplie les mêmes groupes
(`SIDEBAR_GROUPS` et `MORE_SECTIONS`, `app/routes.ts`). Voir le DS §6.

L'écran du mois porte **deux** grilles bento et non une, séparées par la section
« À confirmer » : la grille sait ranger des tuiles côte à côte, elle ne sait pas
dire que l'une répond à une question qu'on se pose avant l'autre (DS §5,
cahier §4.6).

Les six colonnes n'arrivent qu'à **1024px, et non 768**. La colonne latérale
consomme 224px : les déclencher en même temps qu'elle ne laisse que ~480px de
contenu sur une tablette portrait, et chaque tuile tombe sous 80px de large.
Mais deux colonnes étirées sur les 704px d'un iPad portrait ne sont pas une
grille non plus — c'est la mise en page d'un téléphone à trois fois la largeur,
donc trois fois le vide. D'où le palier intermédiaire à quatre colonnes, qui ne
touche à aucun format : seule la correspondance format → colonnes y change.

Une conséquence à connaître : **la largeur d'un même format n'est plus déductible
de celle de l'écran.** Deux tuiles — Revenus et Charges — prennent deux colonnes
sous 1024px alors qu'elles sont déclarées `2x1`, pour que leur seconde lecture
tienne. C'est ce qui fait que les règles d'affichage de cette ligne sont des
requêtes de conteneur et non des `max-lg:` (voir plus bas).

Vérifié sans débordement horizontal de 320 à 1920px sur tous les écrans.

Le débordement qui se glisse le plus facilement n'est pas celui de la page mais
celui d'une **pilule d'eyebrow dans une tuile plate**. Une `2×1` reste en
demi-colonne sur mobile, seule de tous les formats, et n'offre que ~104px de
contenu à 320px : l'eyebrow y tient sur une ligne quoi qu'il arrive, resserre
son interlettrage, lâche son icône, rend le reste de son interlettrage, puis se
fait trancher. Le plafond est de **13 caractères** — au-delà, le format est
`4×1`, comme la tuile Capacité d'épargne (DS §5).

Il se contrôle en mesurant, pas en relisant : sur chaque `.eyebrow-pill`, on
compare son `scrollWidth` à la boîte de contenu de sa tuile, et le `scrollHeight`
de chaque `.tile` à son `clientHeight`. À 320px une coupe de quatre pixels se lit
comme un mot qu'on n'a pas su lire, pas comme un défaut — c'est exactement ce
qu'une relecture laisse passer. « Reste à vivre » débordait ainsi de 4px sur
l'écran du mois ; c'est le troisième palier de dégradation qui l'a réglé.

**Ce qui se masque faute de place se décide sur la place, pas sur l'écran.** La
seconde lecture d'une tuile plate — « reste 102 € à payer » — était en
`max-lg:sr-only` : un seuil de viewport pour une question de largeur de tuile.
Elle répondait juste tant qu'un format gardait la même largeur à un écran donné,
et faux dès qu'un format en changeait — c'est exactement ce qui rendait cette
ligne illisible partout sous 1024px sur les deux tuiles de flux. La tuile est
déjà un conteneur de requête (`container-type: inline-size`, pour le chiffre
héros), le seuil se pose donc sur elle : `.tile-hint` s'affiche au-delà de
**180px de boîte de contenu**, mesurés sur les quatre largeurs où une `2x1`
existe. Le repère d'action du coin porte le même seuil, et il doit le porter :
sur une tuile plate les deux se partagent la ligne du bas, et deux seuils
différents leur donneraient une bande où ils se chevauchent.

L'exception est écrite dans le CSS : les `4x1` gardent `max-lg:sr-only`. Elles
ont la largeur, mais leur seconde lecture est une phrase qui repasse à la ligne
et se fait trancher par les 56px utiles d'une rangée — une contrainte de
hauteur, qu'une requête de largeur ne sait pas dire.

Saisies et fiches sont des écrans pleins avec leur URL, pas des feuilles
modales : rien à faire glisser, rien à refermer pour revenir. `ui/Sheet.tsx`
sert à ce pour quoi une feuille est faite — une explication qu'on ouvre et
qu'on referme sans quitter des yeux ce qu'elle explique. C'est le cas des
quatre soldes du tableau de bord : leur lecture secondaire ne tient pas dans
une tuile d'une rangée sur un téléphone, et l'explication s'y perdait.

Le geste le plus fréquent — saisir une ligne — a une porte par largeur, et une
seule : la rangée de trois boutons en tête de l'écran du mois à partir de
1024px, le bouton flottant de la coquille en dessous. Il se déplie sur les trois
mêmes portes plutôt que d'en promettre une : « les deux sens sont deux boutons,
jamais un seul » vaut aussi pour lui. Il porte la garde du raccourci « n », mot
pour mot — rien sur un écran de saisie, où il contournerait la garde de
brouillon.

Le mois se balaie horizontalement au doigt, le rappel d'export se chasse d'un
balayage vers le haut, une feuille de lecture se referme en la tirant vers le
bas, et les cibles tactiles font 44px partout. Les trois gestes sont en Pointer
Events : souris et stylet balaient comme un doigt, sans code séparé. `MonthNav`
a longtemps été en TouchEvents, donc réservé au doigt — deux grammaires pour un
même mouvement, à un écran d'écart.

Un piège à connaître sur les gestes : `touch-action` est ce qui rend le
balayage possible, sur l'axe qu'on ne prend pas. `pan-x` sur le bandeau
d'export, qu'on chasse vers le haut ; `pan-y` sur le mois, qu'on balaie sur le
côté ; `pan-x pinch-zoom` sur la prise d'une feuille, qui garde le zoom d'une
surcouche plein écran. Sans lui, le navigateur préempte le mouvement pour faire
défiler la page et n'envoie plus un seul `pointermove`.

C'est ce piège, et pas un choix de confort, qui **borne la prise d'une feuille à
sa poignée et à son en-tête**. Le corps défile, donc il lui faut l'axe vertical ;
le glissement le veut aussi, et un même élément ne peut pas donner les deux. Le
« glisser depuis le corps quand il est en haut » que font les bibliothèques
demande `touch-action: none` sur toute la feuille plus un verrou de défilement
écrit à la main — c'est-à-dire réécrire ce que `<dialog>` est là pour ne pas
avoir à écrire.

Les seuils suivent une règle, et il faut trois points pour la voir : **56 pour le
bandeau d'export, 48 pour le mois, 96 pour une feuille — une hauteur d'objet
chacun.** On valide un geste quand on a déplacé la chose au-delà d'elle-même.
Jamais un pourcentage : une feuille d'un jour vide fait trois cents pixels et une
feuille pleine sept cents, et un seuil relatif ferait dire deux choses
différentes au même geste sur le même composant. Un lancer — plus d'un demi-pixel
par milliseconde, mesuré sur au moins 60ms — est l'autre porte, faute de quoi
chasser une feuille d'un coup de pouce ne ferait rien.

L'entrée et la sortie des feuilles vivent dans la feuille de style, sur
`.sheet` : `showModal()` n'anime rien. Elles s'appuient sur `@starting-style` et
sur `transition-behavior: allow-discrete` — `display` et `overlay` sont des
propriétés discrètes, et sans elles le nœud quitte la couche du dessus à
l'instant du `close()`, avant d'avoir pu s'en aller. Les propriétés de
transition sont écrites une par une et non en raccourci : un item invalide dans
une liste `transition` invalide la déclaration entière, donc un navigateur qui
ne connaîtrait pas `allow-discrete` y perdrait aussi le fondu. Là où
`@starting-style` manque, la feuille arrive d'un coup à sa place — le
comportement d'avant, sans une ligne de garde en JS.

Une lecture qui n'a pas de réponse s'efface plutôt que d'afficher un nombre.
« Reste à vivre » arrête le prévisionnel à la prochaine rentrée d'argent *à
partir d'aujourd'hui* : hors du mois courant, l'horizon est derrière ou devant,
le chiffre se calcule quand même et ne répond pas à la question posée. C'est la
règle qui retire déjà cinq tuiles sous la lecture du commun.

`CreditsPage` n'a volontairement pas de `MonthHeader`, contrairement à
`SplitPage` : rien sur cet écran ne dépend du mois affiché. `useDebtStatuses`
dérive le capital restant dû des échéances confirmées à la date du jour et ne
lit jamais `ym`. Un navigateur de mois qui ne change rien à l'écran vaut moins
que son absence.

## PWA

Tout se configure dans `vite.config.ts`, sauf ce qui s'adresse à quelqu'un.

`registerType: 'prompt'` : une nouvelle version ne remplace jamais l'app en
cours d'usage sans le dire (`app/UpdatePrompt.tsx`). Les données étant locales,
un rechargement surprise en pleine saisie serait impardonnable.

**L'installation est une exigence, pas un bonus** (cahier §5) : sur iOS, un site
non installé voit son IndexedDB purgé après environ sept jours sans visite — et
l'IndexedDB, ici, *est* les données. Elle se propose donc, mais seulement là où
l'argument porte : sur la page de présentation, sous la phrase qui vient
d'expliquer qu'il n'y a ni compte ni serveur, donc aucune copie ailleurs.

`beforeinstallprompt` est un événement qu'on n'a pas le droit de rater : il se
déclenche une fois, tôt, souvent avant que React ait monté quoi que ce soit, et
ne se rejoue pas. `lib/install.ts` pose donc son écouteur **à l'évaluation du
module**, importé par `main.tsx` avant le premier rendu ; l'interface s'y abonne
par `useSyncExternalStore`. Un `useEffect` arriverait après lui une fois sur
deux. Le module oublie l'événement dès qu'il est consommé — il ne se rouvre pas,
et un bandeau qui resterait offrirait un bouton qui ne fait plus rien.

Rien n'est proposé quand l'événement ne s'est pas déclenché : ni détection de
navigateur, ni marche à suivre écrite d'avance. Un texte qui explique comment
installer une app déjà installée coûte plus qu'il ne rapporte, et Safari ne dit
pas laquelle des deux situations est la sienne.

`navigator.onLine` est une réponse pessimiste : vrai veut seulement dire qu'une
interface réseau est active. Faux, en revanche, est fiable — et c'est le seul
des deux dont `lib/online.ts` se serve. Le chip vit sur la même page, pour la
même raison : c'est là que la promesse est faite, donc là qu'elle se vérifie.
Dans la coquille, il aurait clignoté à chaque tunnel de métro sur une app qui,
précisément, ne change pas de comportement.

Trois réglages du service worker existent pour que les pannes soient bruyantes :
`maximumFileSizeToCacheInBytes` (Workbox exclut en silence au-delà de sa borne —
une app qui reste installable et cesse de fonctionner hors ligne sans rien
dire), `globIgnores` sur les captures (400 Ko d'images que l'app n'affiche
jamais), et `navigateFallbackDenylist`, qui évite de servir la coquille HTML
sous le nom de `robots.txt`.

Le manifest porte un `id` fixe, indépendant de `start_url` : sans lui, changer
un jour la page d'arrivée ferait de l'app une seconde app, à installer à côté de
la première — dont les données resteraient là où plus personne ne va les
chercher. Et il ne verrouille pas l'orientation : la grille passe à quatre
colonnes dès 768px et à six dès 1024, ce qu'une tablette n'atteint qu'en
paysage.
