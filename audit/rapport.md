# Audit d'interface — Tout compte fait

Relevé du 17 août 2026, sur `main` à `4a0b436`, jeu d'exemple chargé.

Chaque défaut porte sa preuve : une mesure du harnais (`audit/mesures`,
`audit/bords`, `audit/axe`, `audit/zoom`, `audit/doublons`), une capture, ou une
ligne de code. Ce qui n'est pas prouvé n'est pas listé ; ce qui est prouvé mais
discutable est marqué comme tel.

## Comment lire

`[route] [largeur] [thème] — description — preuve — sévérité`

Sévérités : **bloquant** (empêche d'utiliser ou viole AA), **majeur** (dégrade
sérieusement la lecture ou la cohérence), **mineur** (défaut réel sans
conséquence d'usage).

## Périmètre mesuré

33 écrans × 8 largeurs (320 → 1920) × 2 thèmes × 2 langues = 1 056 captures et
1 056 relevés. axe-core sur 33 écrans × 3 largeurs × 2 thèmes × 2 langues.

---

## Ce qui est déjà bon, et qu'il ne faut pas casser

Ces points sont mesurés, pas supposés. Ils bornent le chantier : toute
correction doit les préserver.

| Critère | Mesure |
|---|---|
| Débordement horizontal à 320px | **0** sur les 32 écrans de l'app. Seul `/styleguide` déborde (558px dans 320) |
| Zoom 200 % | **0** débordement horizontal sur 33 écrans |
| Cibles < 44px en mobile | **0** à 375px (`smallTargets: 0` partout) |
| Contrastes des palettes | 92 assertions vertes (`src/theme/palettes.test.ts`), 12 couples palette × thème |
| Parité des clés i18n FR/EN | 11 assertions vertes (`src/i18n/strings.test.ts`) |
| `prefers-reduced-motion` | Respecté en CSS (`base.css:196`, `tokens.css:270`) **et** en JS (`lib/reveal.ts:45`, `ui/useCountUp.ts:39`) |
| Montants via `Intl.NumberFormat` | 12 usages, tous dans `i18n/format.ts` ; aucun `toLocaleString` ni `toFixed` ailleurs |
| Centrage du shell desktop | À 1920 : shell 320→1600, soit 320px de marge de chaque côté. Symétrique |
| Échelle de `z-index` | 10 usages, sur 6 valeurs (10, 20, 30, 40, 50), tous en utilitaires. Non déclarée en token, mais cohérente par paliers |
| Regroupement « par personne » | Présent à toutes les largeurs (`EntriesSection.tsx:236`) |

Les défauts 1, 2, 4, 5 (partiel), 14 de l'annexe A sont **corrigés**. Le détail
est en fin de document.

---

## `/` — Le mois

L'écran le plus dense et le plus chargé en défauts.

### Trois axes de centrage sur le même écran — majeur

À 1920 px, mesuré (`audit/bords/fr-light.json`) :

| Élément | gauche | droite | centre |
|---|---|---|---|
| `main`, en-tête collant | 544 | 1600 | **1072** |
| Grilles bento | 576 | 1568 | **1072** |
| Blocs « Situation » et « Prochaines échéances » | 576 | **1344** | **960** |
| Libellé du mois « août » | 747 | 789 | **768** |

Le bord droit varie de **224 px** entre les grilles bento et les blocs
`max-w-3xl`, empilés dans la même colonne. Et le libellé du mois est centré
**304 px à gauche** de l'axe des cartes qu'il coiffe.

Causes, au code :
- `src/app/MonthHeader.tsx:339` — `MonthNav` porte `max-w-sm` (384 px) dans un
  conteneur aligné à gauche. Le mois se centre donc sur 384 px, pas sur la page.
- `src/features/month/MonthPage.tsx:206` et `:211` — `max-w-3xl` (768 px) sur
  deux blocs, quand le bento occupe les 992 px disponibles.

Preuve visuelle : `audit/screenshots/fr-light/month/1920.jpg`.
Vérifié identique en `fr-dark`, `en-light`, `en-dark`.

### La même valeur affichée trois fois — majeur

`2 922,35 €` apparaît sous trois libellés (`audit/doublons/fr-light.json`) :

1. « Prévisionnel » — *solde attendu en fin de mois, échéances prévues comprises*
2. « Reste à vivre » — *disponible jusqu'à la fin du mois*
3. « 2 922,35 € encore disponibles », lecture secondaire de la tuile « Capacité
   d'épargne »

`src/features/dashboard/SituationSection.tsx:16-47` documente le cas et le
traite : les deux rangées ont quitté le bento pour porter une description qui
tient à toutes les largeurs. Le traitement est réel mais **insuffisant** — le
lecteur voit deux fois le même centime, et la troisième occurrence n'est pas
couverte du tout.

Preuve : `audit/screenshots/fr-light/month/320.jpg` et `.../1920.jpg`.

### « Prochaines échéances » contient du passé — majeur

À la date du relevé, la première ligne du bloc dit **« il y a 12 jours »**.

Cause, au code : `src/domain/stats.ts:396` filtre au **mois**, pas au jour —
`ymOf(e.date) >= fromMonth`. Une échéance du 5 août non confirmée reste donc
listée le 17 août sous un titre qui promet du futur.

Preuve : `audit/screenshots/fr-light/month/1920.jpg`, bloc « Prochaines
échéances ».

> Toucher au filtre relève du domaine, donc hors périmètre. L'arbitrage est
> porté en phase 2.

### « Prochaines échéances » redit « À confirmer » — majeur

Les cinq lignes du bloc sont les cinq lignes du bloc « À confirmer » situé
au-dessus, dans un autre ordre : Mobile 11,99 / Courses 152,00 / Carburant
203,00 / Transports 91,60 / Croquettes 52,00.

C'est structurel : `useMonthPending` rend les `planned` du mois affiché,
`useUpcoming` (`src/store/selectors.ts:509`) rend les `planned` du mois courant
et des suivants. Sur le mois courant, les deux ensembles se recouvrent.

### Cibles interactives sous 24×24 — bloquant (WCAG 2.5.8)

Les quatre boutons de légende du donut « Où part l'argent » mesurent **18,2 px
de haut** à toutes les largeurs, dans les deux thèmes et les deux langues.

Confirmé par axe-core (`target-size`, gravité *serious*, 12 occurrences) et par
la sonde (`audit/mesures/*.json`, `tinyTargets`).

Cause : `src/features/dashboard/BreakdownTile.tsx:114-123` — le bouton n'a
aucune hauteur minimale.

### Quatorze repères d'en-tête sur un écran — majeur

À 375 px, `eyebrowCount: 14` (`audit/mesures/fr-light.json`). Soit : SOLDE DU
MOIS, REVENUS, CHARGES, SUIVI DU MOIS, À CONFIRMER, SITUATION, OÙ PART L'ARGENT,
CAPACITÉ D'ÉPARGNE, RÉPARTITION, CRÉDITS, PROCHAINES ÉCHÉANCES, CE MOIS, plus
deux pilules de contrôle.

Le DS §6 les définit comme un repère. Quatorze repères sur un écran ne repèrent
plus rien : c'est devenu la ponctuation par défaut de toute carte.

### Densité — mineur

3 530 px à 375 px, soit **4,3 écrans** de défilement. C'est le seul écran de
l'app au-dessus du seuil de 4 ; le deuxième, `/recurrences`, est à 2,8.

### L'accent lime porte huit rôles — majeur

Sur la seule capture 320 px : tuile du solde, bouton « Exporter mes données »,
pilule de filtre active, bouton « Confirmer le mois », cinq coches de
validation, onglet actif de la barre, bouton d'ajout flottant, deux pilules de
regroupement actives.

Le DS §2.3 impose que l'accent reste un remplissage, ce qui est respecté ; il ne
dit rien de sa **fréquence**. Preuve : `audit/screenshots/fr-light/month/320.jpg`.

---

## `/repartition` — Répartition

### Bord droit incohérent avec le shell — majeur

À 1440 px : tout le contenu de la page est à **768 px** de large, le bandeau
d'information posé par le shell à **992 px**. Le bandeau dépasse donc de 224 px
à droite de toutes les cartes qu'il surmonte.

Mesure : `audit/bords/fr-light.json`, `slug: "split"`, `width: 1440`.
Même défaut sur `/avances`.

### Le même total sous deux libellés — mineur

`3 824,59 €` apparaît sous « Total des parts » et sous « Ce qui est partagé »
(`audit/doublons/fr-light.json`). Les deux lectures sont voisines mais la
coïncidence n'est pas expliquée.

---

## `/calendrier` — Calendrier

### Une troisième largeur de colonne — majeur

À 1440 px, la grille du calendrier fait **672 px**, le bandeau **992 px**.
L'app compte donc, à cette largeur, quatre gabarits : 992 (majorité), 768
(month, split, advances, onboarding), 672 (calendar), 576 (formulaires de
saisie).

Mesure : `audit/bords/fr-light.json`.

---

## `/bienvenue` — Présentation

### Champ de fichier sans nom accessible — bloquant (WCAG 4.1.2)

`<input accept="application/json,.json" class="sr-only" type="file">` n'a ni
`label`, ni `aria-label`, ni `aria-labelledby`.

Preuve : axe-core, règle `label`, gravité **critical**, 4 occurrences (une par
combinaison langue × thème). Seule violation critique de tout l'audit.

Cause : `src/features/settings/ImportControl.tsx:42-49`. Le champ est piloté par
le bouton adjacent ; il est donc atteignable au clavier sans jamais être
annonçable.

---

## `/styleguide` — Nuancier

### Débordement horizontal sous 414 px — mineur

558 px de contenu dans 320, 375 et 414. Seul écran du dépôt à déborder.
Mesure : `audit/mesures/*.json`.

### Contraste sous AA sur la pilule violette — mineur

`color-contrast` *serious*, 3,39:1 (blanc sur `#887dec`), 12 occurrences, sur
`/styleguide` uniquement.

C'est l'**écart déjà déclaré** dans `src/styles/components.css:80-86` et couvert
par `palettes.test.ts`. Il n'apparaît sur aucun écran réel : aucune tuile
`--accent-2` ne porte d'eyebrow ailleurs que sur le nuancier.

> C'est un écart connu, documenté, et sans effet hors du nuancier.
> Recommandation en phase 2 : ne pas le traiter dans ce chantier.

---

## Défauts transverses

### Le symbole monétaire est un exposant — majeur

`src/ui/Amount.tsx:135-150` rend le symbole à `fontSize: '0.55em'`, avec
`items-start` sur le conteneur et `opacity: 0.6`. Le résultat est un € **réduit
de moitié et aligné en haut**, sur tous les montants de l'app.

La *position* est correctement internationalisée (`symbolFirst()`, `€1,284.50`
en anglais, `1 284,50 €` en français). C'est le **traitement graphique** qui ne
survit à aucune des deux locales : ni `4 435,54 €` ni `€4,435.54` ne s'écrivent
avec un symbole en exposant.

Preuve visuelle nette : `audit/zoom/recurrences-200.jpg` — « 5 453,96 ᵉ ».

L'atténuation à 0,6 pose en outre une question de contraste sur laquelle le
harnais ne tranche pas : axe-core ne signale rien, mais il mesure le texte, pas
un `span` en `aria-hidden`.

### Dates et durées composées à la main — majeur

`Intl.DateTimeFormat` et `Intl.RelativeTimeFormat` ne sont **utilisés nulle
part** (0 occurrence dans tout le dépôt). Toutes les dates sont assemblées à
partir de tables de noms (`t.calendarNames`) et de gabarits littéraux :

- `src/i18n/format.ts:400-422` — `formatWeekdayDate`, `formatDayMonthShort`,
  `formatDayFull`, `formatDateCompact`
- `src/i18n/format.ts:425-437` — `formatRelativeDays`, avec ses dix branches
  écrites en dur dans les deux langues

Les sorties sont correctes pour `fr-FR` et `en-GB`, et le choix est argumenté en
tête de fichier. Mais le critère de la mission demande `Intl` ; le formatage
manuel est une dette, pas un bug constaté.

### Trois bandeaux, trois implémentations de la même carte — mineur

Les trois bandeaux du shell rendent la même surface de trois façons :

| Composant | Implémentation |
|---|---|
| `src/app/DataNotice.tsx` | `className="tile …"` — la classe, sans le composant |
| `src/app/StorageAlert.tsx` | `className="tile …"` — idem, plus `border-danger` |
| `src/app/UpdatePrompt.tsx` | `rounded-tile border border-border bg-surface shadow-tile` — la définition de `.tile` recopiée en cinq utilitaires |

Aucun des trois n'importe `<Tile>`, que 59 autres fichiers utilisent. La
troisième forme est la plus coûteuse : elle recopie une définition qui, si elle
change dans `components.css`, ne la suivra pas.

C'est le seul doublon d'implémentation trouvé dans le dépôt. `RowGroup` compose
bien `Tile` ; `ListRow` et `Row` sont deux composants distincts, et le DS §9.1
dit pourquoi.

### Le lien d'évitement compte comme cible de 1×1 — non-défaut

208 combinaisons signalent une cible sous 24×24 : c'est le lien « Aller au
contenu » en `sr-only`, qui reprend sa taille au focus. WCAG 2.5.8 ne s'applique
pas aux cibles non rendues. **Faux positif de la sonde**, écarté.

### Chevauchements au zoom — non reproduit

La sonde signale 2 écrans avec chevauchement à 200 % et 400 %
(`audit/zoom/fr-light.json`). La capture de contrôle à 200 % sur `/recurrences`
(`audit/zoom/recurrences-200.jpg`) ne montre **aucun** chevauchement : rien
n'est tronqué, rien ne se superpose, la page tient.

Les cas restants viennent d'éléments situés dans des groupes repliés, plus bas
dans la page. Je les déclare **non confirmés** plutôt que de les compter.

---

## État de l'annexe A

| # | Défaut signalé | État | Preuve |
|---|---|---|---|
| 1 | Nav basse et FAB recouvrent le contenu | **Corrigé** | `hiddenUnderFixed` nul après défilement complet ; capture 320 |
| 2 | « Confirmer le mois » chevauche « À confirmer » | **Corrigé** | Capture 320 : le bouton est sur sa propre ligne |
| 3 | Rail de filtre coupé sans affordance | **Partiel** | Rail à 498 px dans 320/375/414 ; `scroll-snap` et pilule coupée en place (`components.css:329`), affordance faible |
| 4 | ~500 px de vide mort à droite, bloc non centré | **Corrigé** | Shell 320→1600 sur 1920, marges symétriques |
| 5 | En-tête de mois centré sur une bande plus étroite | **Confirmé** | Axe à 768 contre 1072 pour les cartes |
| 6 | Carte au bord droit incohérent | **Confirmé et généralisé** | 4 gabarits : 992 / 768 / 672 / 576 |
| 7 | Alternance de largeurs sans logique | **Confirmé** | `/` alterne bento 992 → bloc 768 → bento 992 → bloc 768 |
| 8 | « Prévisionnel » = « Reste à vivre » = « Capacité » | **Confirmé** | Trois occurrences de `2 922,35 €` |
| 9 | « Prochains paiements » redit « À confirmer », et affiche du passé | **Confirmé** | Cinq lignes identiques ; « il y a 12 jours » |
| 10 | L'accent lime porte tous les rôles | **Confirmé** | Huit rôles sur une capture |
| 11 | Membres distingués par la seule couleur | **Corrigé** | `Dot` est `aria-hidden` et toujours accompagné du nom (`Chip.tsx:34`) |
| 12 | Étiquette grise répétée huit fois | **Confirmé, aggravé** | 14 occurrences à 375 px |
| 13 | Chaînes i18n cassées | **Confirmé** | `en.ts:511` et `en.ts:644`, intactes |
| 14 | « Par personne » disparaît en mobile | **Corrigé** | `EntriesSection.tsx:236`, sans classe responsive |
| 15 | Symbole € en exposant | **Partiel** | Position internationalisée ; exposant intact |

---

## Cases de la phase 4, à l'ouverture du chantier

| Critère | État |
|---|---|
| Zéro scroll horizontal à 320 px | ☐ — 32/33 écrans conformes, `/styleguide` déborde |
| Zéro chevauchement à 200 % | ☑ — 0 débordement, chevauchements non reproduits |
| Zéro violation axe sérieuse ou critique | ☐ — 1 critique (`label`), 2 sérieuses (`target-size`, `color-contrast`) |
| Contrastes texte ≥ 4.5:1, interface ≥ 3:1 | ☐ — vrai sur les écrans réels, faux sur `/styleguide` |
| Zéro information par la seule couleur | ☑ |
| Zéro cible sous 24×24 | ☐ — 4 boutons de légende à 18 px |
| Focus visible et jamais masqué | ☐ — non mesuré, à instrumenter |
| Aucune valeur affichée deux fois sans distinction | ☐ — 2 cas réels |
| 100 % des chaînes en i18n | ☑ — aucune chaîne en dur trouvée |
| 100 % des montants et dates par `Intl` | ☐ — montants oui, dates non |
| Chaque route a vide / chargement / erreur | ☐ — 11 écrans avec `EmptyState`, chargement et erreur globaux uniquement |
| Parité mobile / desktop | ☑ |
| `prefers-reduced-motion` respecté | ☑ |
| Aucune dépendance runtime ajoutée | ☑ — `@axe-core/playwright` et `axe-core` en `devDependencies` |
| Lighthouse ≥ 95 A11y et Best Practices | ☐ — non mesuré |
