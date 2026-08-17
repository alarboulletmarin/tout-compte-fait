# Audit d'interface — Tout compte fait

Relevé initial du 17 août 2026 sur `main` à `4a0b436`, puis huit lots de
correction sur la branche `audit/ui-2026-08`. Jeu d'exemple chargé.

Chaque défaut porte sa preuve : une mesure du harnais (`audit/`), une capture,
ou une ligne de code. Ce qui n'est pas prouvé n'est pas listé ; ce qui a été
détecté puis écarté est dit avec sa raison.

## Périmètre mesuré

33 écrans × 8 largeurs (320 → 1920) × 2 thèmes × 2 langues = 1 056 captures et
1 056 relevés. axe-core sur 33 écrans × 3 largeurs × 2 thèmes × 2 langues.
Focus clavier tabulé sur 33 écrans × 2 largeurs. Zoom 200 % et 400 %.
Lighthouse sur 4 écrans, mobile et desktop.

Comment rejouer : voir `audit/README.md`.

---

## Résultat, case par case (phase 4)

| Critère | État | Preuve |
|---|---|---|
| Zéro scroll horizontal à 320 px | ☑ **sur les 32 écrans de l'app** · ☐ `/styleguide` | `audit/mesures/*.json` |
| Zéro chevauchement et zéro troncature à 200 % | ☑ | `audit/zoom/fr-light.json` — 0 débordement, 0 chevauchement reproduit |
| Zéro violation axe sérieuse ou critique | ☑ **sur les 32 écrans de l'app** · ☐ `/styleguide` | `audit/axe/*.json` |
| Contrastes texte ≥ 4.5:1, interface ≥ 3:1, deux thèmes | ☑ **sur les 32 écrans de l'app** · ☐ `/styleguide` | 92 assertions `src/theme/palettes.test.ts` + axe |
| Zéro information portée par la seule couleur | ☑ | `Dot` est `aria-hidden`, toujours doublé d'un libellé |
| Zéro cible interactive sous 24×24 | ☑ | `audit/mesures/*.json` — 0 sur les 4 combinaisons |
| Focus visible et jamais masqué | ☑ **sur les 32 écrans de l'app** · ☐ `/styleguide` | `audit/focus/fr-light.json` — 0 masqué partout |
| Aucune valeur affichée deux fois sans distinction explicite | ☑ | `audit/doublons/fr-light.json` + lot 3 |
| 100 % des chaînes en i18n, FR et EN complets | ☑ | 11 assertions `src/i18n/strings.test.ts`, 0 chaîne en dur |
| 100 % des montants et dates par `Intl` | ☑ | 12 `NumberFormat`, 3 `DateTimeFormat`, 3 `RelativeTimeFormat` ; 0 `toFixed`/`toLocaleString` hors `format.ts` |
| Chaque route a un état vide, de chargement et d'erreur | ☐ **critère reformulé** — voir plus bas | 11 écrans avec `EmptyState`, `BootScreen` et `ErrorBoundary` globaux |
| Parité fonctionnelle mobile / desktop | ☑ | Aucun écart trouvé ; `/calendrier` documenté |
| `prefers-reduced-motion` respecté | ☑ | CSS (`base.css:196`, `tokens.css:270`) et JS (`lib/reveal.ts:45`, `ui/useCountUp.ts`) |
| Aucune dépendance runtime ajoutée | ☑ **et deux retirées** | `tailwindcss` et `@tailwindcss/vite` désinstallés ; axe-core en `devDependencies` |
| Lighthouse ≥ 95 Accessibility et Best Practices | ☑ **sur les 4 écrans mesurés** | 100 / 100 sur `/bienvenue`, `/`, `/epargne`, `/repartition`, mobile et desktop |

### Ce qui n'est pas coché, et pourquoi

**`/styleguide`** porte les quatre écarts restants : débordement horizontal sous
414 px (558 px de contenu dans 320), contraste 3,39:1 sur la pilule violette,
et deux champs de démonstration sans anneau de focus. C'est un outil de
développement, pas un écran de l'app — il n'est atteignable que par son URL et
par un lien en pied de colonne. Le contraste est en outre l'**écart déjà
déclaré** dans `src/styles/components.css:80-86`, couvert par un test, et il
n'apparaît sur aucun écran réel : aucune tuile `--accent-2` ne porte d'eyebrow
ailleurs que sur le nuancier.

**Le critère « chaque route a un état vide »** est mal calibré pour cette app et
je ne l'ai pas ajusté en silence : `/apparence`, `/mentions-legales` ou
`/stockage` n'ont pas d'état vide possible — leurs données n'existent pas. La
formulation qui se mesure est : *chaque route dont les données peuvent être
vides a un état vide* (11 écrans l'ont), *le chargement et l'erreur sont
couverts globalement* par `BootScreen` et `ErrorBoundary`. Sous cette forme, il
est vert.

**Lighthouse** a été mesuré sur 4 écrans, pas 33 : l'outil n'a pas de mode
batch ici et chaque passe coûte ~2 s d'audit plus la navigation. Les 4 couvrent
les deux coquilles (publique et applicative) et les deux formes de contenu
(bento et colonne). Rien n'indique que les 29 autres divergeraient — axe, qui
tourne sur les 33, ne relève rien de sérieux ailleurs — mais ce n'est pas
mesuré, et je ne le compte donc pas comme tel.

---

## Les huit lots

| Lot | Issue | Commit |
|---|---|---|
| Harnais d'audit | — | `e185a6c` |
| 1 — accessibilité bloquante | #92 | `62392b5` |
| 8 — chaînes anglaises | #93 | `5069fe6` |
| 7 — doublon des bandeaux | #94 | `c7806a7`, `c3bd356` |
| 0b — sortie de Tailwind | #95 | `9d9b8e4` |
| 2 — un bord, un axe | #96 | `8065bb3` |
| 4 — symbole monétaire | — | `37ad6d0`, `ffbc9b2` |
| 3 — déduplication | — | `566e453` |
| 5 — accent et repères | — | `266e5b4` |
| 6 — dates par `Intl` | — | `03081c8` |

### Ce que chaque lot a changé, mesuré

**Lot 1 — accessibilité bloquante.** Le champ fichier de l'import laissait un
contrôle sans nom dans l'arbre d'accessibilité (axe `label`, *critical*, 4
occurrences). Les quatre boutons de légende du donut mesuraient 18,2 px de haut
(axe `target-size`, *serious*, 12 occurrences). Après : **0 et 0**, hauteurs de
page inchangées aux 8 largeurs.

**Lot 8 — chaînes anglaises.** `en.ts:511` et `en.ts:644` étaient les deux
signalées ; deux autres calques ont été trouvés à côté (`persistAsked`,
`showMemberShare`).

**Lot 7 — doublon des bandeaux.** Quatre composants rendaient la même surface de
quatre façons, dont une qui recopiait la définition de `.tile` en cinq
utilitaires. Un seul composant `ui/Banner` désormais. Le lot a aussi rendu à
jsdom un `localStorage` que Node 26 masquait : **39 tests mouraient dans leur
propre préambule** et ne s'exécutaient pas du tout.

**Lot 0b — sortie de Tailwind.** La contrainte du projet est le CSS pur ; la
librairie était active (`@import 'tailwindcss'`, `@theme inline`, plugin Vite,
~2 000 occurrences d'utilitaires). La couche est maintenant écrite à la main
dans `src/styles/utilities.css`, avec un reset court à côté. Les noms de classes
n'ont pas bougé — ce qui change est *ce qui produit les règles*, pas le
balisage, ce qui rend la non-régression mesurable. Après : **hauteurs de page et
bords de blocs identiques au pixel sur les 32 écrans de l'app**, dans les deux
thèmes ; seul `/styleguide` bouge, de 192 px. CSS de 88,9 → 76,2 Ko.

**Lot 2 — un bord, un axe.** À 1920, `/` portait trois axes de centrage (bento
1072, blocs `max-w-3xl` 960, libellé du mois 768) et son bord droit alternait
992/768/992/768 en descendant la page. Après : **un seul axe** — mesuré à 752 à
1280 et 1072 à 1920 pour le mois, le bento et `main` — et le bord 1344 a disparu
partout. `/avances` gagne deux colonnes de fiches : **2 061 → 1 162 px** de
défilement à 1280 et au-delà.

**Lot 4 — symbole monétaire.** Il était rendu à 0,55 em avec `items-start`,
c'est-à-dire en exposant : « 4 435,54 ᵉ ». Il repose désormais sur la ligne de
base. Un premier essai l'agrandissait aussi à la taille des centimes ; il a été
**rendu** parce que `e2e/mise-en-page` a montré qu'il poussait « 3 655,85 € »
4 px hors de la tuile Capacité à 1024 — un défaut que la sonde d'audit ne voyait
pas, le document ne débordant pas.

**Lot 3 — déduplication.** « Prochaines échéances » ouvrait sur « il y a
12 jours » et répétait les cinq lignes d'« À confirmer » : les deux blocs lisent
les mêmes échéances non confirmées. Le bloc montre maintenant ce qui tombe
*après* le mois affiché, ce qui retire le recoupement et le passé d'un même
geste. « Prévisionnel » et « Reste à vivre » coïncident au centime dès qu'aucune
rentrée n'est attendue : l'écran le dit désormais, au lieu de laisser conclure à
une erreur de calcul.

**Lot 5 — accent et repères.** L'accent lime portait huit rôles sur l'écran du
mois. Les rôles **répétés** le rendent : les coches de confirmation passent en
secondaire, le bouton qui confirme le mois entier le garde. L'eyebrow garde son
libellé, son glyphe et son contraste, et perd sa pilule grise sur les surfaces
plates — 14 pilules identiques sur un écran ne repèrent plus rien. Elle est
rendue à ce qui la justifie : détacher l'étiquette d'une tuile colorée. Il en
reste exactement une par écran.

**Lot 6 — dates par `Intl`.** 38 chaînes par catalogue redisaient ce que le
moteur sait exactement, et 10 branches faisaient le travail de
`RelativeTimeFormat`. Vérifié chaîne par chaîne : `Intl` rend les mêmes valeurs,
avec une correction (« Sept » plutôt que « Sep » en `en-GB`) et deux ajouts que
le français obtient gratuitement, « avant-hier » et « après-demain ».

---

## État de l'annexe A

| # | Défaut signalé | État à l'ouverture | État final |
|---|---|---|---|
| 1 | Nav basse et FAB recouvrent le contenu | Déjà corrigé | ☑ |
| 2 | « Confirmer le mois » chevauche son étiquette | Déjà corrigé | ☑ |
| 3 | Rail de filtre coupé sans affordance | Partiel | Inchangé — `scroll-snap` et pilule coupée en place ; affordance faible, assumée |
| 4 | ~500 px de vide mort à droite | Déjà corrigé | ☑ |
| 5 | En-tête de mois sur un axe plus étroit | Confirmé (768 vs 1072) | ☑ lot 2 |
| 6 | Bord droit incohérent | Confirmé et généralisé (4 gabarits) | ☑ lot 2 |
| 7 | Alternance de largeurs sans logique | Confirmé | ☑ lot 2 |
| 8 | Trois lectures, une seule valeur | Confirmé | ☑ lot 3 |
| 9 | « Prochaines échéances » redit et affiche du passé | Confirmé | ☑ lot 3 |
| 10 | L'accent lime porte tous les rôles | Confirmé (8 rôles) | ☑ lot 5 |
| 11 | Membres distingués par la seule couleur | Déjà corrigé | ☑ |
| 12 | Étiquette grise répétée | Confirmé, aggravé (14×) | ☑ lot 5 |
| 13 | Chaînes i18n cassées | Confirmé | ☑ lot 8 |
| 14 | « Par personne » disparaît en mobile | Déjà corrigé | ☑ |
| 15 | Symbole € en exposant | Partiel | ☑ lot 4 |

---

## Détecté, examiné, non-défaut

Ce que le harnais signale et qui n'en est pas. Chacun a été vérifié plutôt
qu'écarté d'office.

**Le lien d'évitement compte comme cible de 1×1.** 208 occurrences dans la
première passe. Il reprend sa taille au focus, et WCAG 2.5.8 ne s'applique pas
aux cibles non rendues. La sonde le filtre désormais.

**Chevauchements au zoom.** La sonde en signalait 4 écrans, puis 2 après avoir
appris à ignorer les groupes repliés. La capture de contrôle à 200 % sur
`/recurrences` (`audit/zoom/recurrences-200.jpg`) n'en montre aucun. Déclarés
**non confirmés** plutôt que comptés.

**Contenu masqué par la barre du bas.** La première mesure annonçait 37 cas sur
37 : elle regardait sans avoir défilé, question à laquelle toute page plus haute
qu'un écran répond oui. Après correction — défiler à fond, puis borner chaque
élément par ses ancêtres coupants — **il n'en reste aucun**.

**Montants répétés dans `/recurrences`, `/split`, `/month`.** Sept cas restants
sont des coïncidences du jeu d'exemple : deux récurrences distinctes qui valent
150 €, deux catégories à 311 €. Un seul est structurel et il est voulu : sur
`/repartition`, « Total des parts » vaut « Ce qui est partagé » **par
construction** — c'est une vérification, et `checkHint` l'annonce déjà (« La
somme des parts vaut le total au centime près »).

**`/calendrier` à 672 px.** C'est le seul écran de l'app qui garde une largeur
propre, et c'est décidé par le contenu : sept colonnes de jours étalées sur
992 px donnent des cases de 140 px, qui ne sont plus un calendrier. Écart assumé
et écrit dans le code.

---

## Ce qui reste ouvert

**`store.test.ts` est instable.** Deux tests d'archivage échouent environ 40 %
du temps selon l'ordre d'exécution. Ils ne s'exécutaient **pas du tout** avant le
lot 7 — ils mouraient sur `localStorage.clear()` —, donc ce n'est pas une
régression mais une fuite d'état révélée : les deux `describe` vident le document
en `beforeEach` mais pas les sauvegardes, et `backupDaily` ne réécrit pas une
clé du jour déjà posée. Deux correctifs ont été tentés et rendus (l'un sans
effet, l'autre faisant passer de 1 à 2 fichiers rouges). Laissé en l'état plutôt
que rustiné à l'aveugle : c'est de la plomberie de test de persistance, hors du
périmètre de cet audit. Le fichier passe 3/3 lancé seul.

**Défaut découvert en phase 3, non traité.** En anglais, le signe se pose entre
le symbole et le nombre : « € +7,891.00 » là où l'usage écrit « +€7,891.00 ».
Antérieur à cet audit et sans rapport avec les lots livrés — signalé ici comme
la phase 3 le demande, plutôt qu'embarqué dans un lot en cours.

**Le rail de filtre par personne** déborde à 320, 375 et 414 px (498 px de
contenu). Son affordance est une pilule coupée au bord, avec `scroll-snap`. Elle
est faible mais existante et documentée (`components.css:329`) ; la renforcer
demanderait un dégradé de bord, qui éteindrait l'anneau de focus de la pilule —
c'est l'objection que le code écrit déjà.
