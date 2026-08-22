# Design system

Direction visuelle de l'app de finances. Dérivée de la référence « Finance App Widgets », déclinée en thème clair et sombre.

---

## 1. Intention

Une app de finances qui ressemble à un tableau de bord, pas à un relevé bancaire. Trois partis pris :

- **Le chiffre est l'image.** Pas d'illustration, pas d'icône décorative. Les grands nombres portent la page. L'icône n'est admise que comme outil : agir, ou se repérer (§9).
- **La couleur est un remplissage, jamais une encre.** Lime et violet ne servent qu'à peindre des surfaces. Ça permet aux tuiles accentuées d'être strictement identiques dans les deux thèmes.
- **Le vert sapin est la marque.** C'est lui qui distingue l'app d'un énième dashboard noir à accent fluo.

**Signature** : l'anneau du mois. Un arc qui revient partout : progression dans le mois, part confirmée du prévisionnel, répartition par catégorie. Un seul motif géométrique, décliné.

---

## 2. Couleur

### 2.0 Thème et palette

Deux réglages, et ils se combinent. Le **thème** dit clair ou sombre, ou suit le système. La **palette** dit avec quelles couleurs. Chaque palette existe dans les deux thèmes, et aucune ne dispense de tester les deux.

`data-palette` vit sur `<html>` à côté de `data-theme`, et les six identités sont déclarées dans `src/styles/palettes.css`. Une palette n'est qu'un **jeu de surcharges** de la couche sémantique : `tokens.css` *est* la palette Classique, qui n'a donc rien à déclarer et ne peut pas dériver. Aucun composant ne connaît la palette courante : c'est tout le propos.

| Palette | Ce qu'elle change |
|---|---|
| Classique | les couleurs d'origine : sapin, vert pomme, violet |
| Monochrome | une seule teinte, du plus clair au plus sombre |
| Douce | les mêmes familles, moins saturées |
| Vive | des teintes franches, qui se distinguent de loin |
| Neutre | presque sans couleur, sauf l'alerte |
| Contrastée | le contraste poussé au maximum |

Trois règles tiennent la couche, et elles sont vérifiées :

- **Ce que toute palette déclare** : `--accent`, `--accent-fg`, `--accent-2`, `--accent-2-fg`, `--danger`, `--danger-fill`, `--danger-fg`, `--cat-1..6`, `--cat-rest`, et par thème `--bg`, `--surface`, `--surface-2`, `--text`, `--text-muted`, `--text-muted-on-surface`, `--danger-text`, `--danger-text-on-surface`, `--focus`.
- **Dans quel bloc, la palette le décide.** Ce qui tient dans les deux thèmes se pose une fois ; le reste se pose deux fois. Une palette qui distingue ses catégories par la **teinte** n'a qu'un jeu à donner ; une palette qui les distingue par la **clarté** doit en donner deux : six pas assez sombres pour se voir sur du blanc sont invisibles sur un fond noir.
- **Un sous-arbre qui force un thème porte aussi sa palette dès qu'il en force une.** Deux attributs sur deux éléments différents rendent la cascade ambiguë, et CSS ne sait pas l'arbitrer.

### 2.1 Palette de base

Ces valeurs ne changent jamais et aucune palette n'y touche : ce sont celles de Classique, dont la couche sémantique est faite. Elles ne sont pas utilisées directement dans les composants.

```css
:root {
  /* Sapin — la couleur d'identité */
  --pine-900: #0E1F1A;
  --pine-700: #1B3B31;
  --pine-500: #2F5D4C;
  --pine-100: #DCE9E2;
  --pine-50:  #F0F5F2;

  /* Accents — remplissage uniquement */
  --lime-500:   #D8F84E;
  --lime-600:   #C2E432;
  --violet-500: #8478F2;
  --violet-600: #6E60E8;

  /* Neutres */
  --ink-950: #0B0E0D;
  --ink-800: #161A19;
  --ink-400: #7C8783;
  --paper:   #FAFAF7;

  /* Alerte — réservée aux dépassements et erreurs */
  --alert-500: #E5484D;
}
```

### 2.2 Tokens sémantiques

C'est la seule couche que les composants consomment.

```css
[data-theme='light'] {
  --bg:          var(--pine-50);
  --surface:     #FFFFFF;
  --surface-2:   var(--pine-100);
  --border:      rgb(11 14 13 / 0.08);
  --text:        var(--ink-950);
  --text-muted:  var(--ink-400);
  --shadow:      0 1px 2px rgb(11 14 13 / 0.04), 0 8px 24px rgb(11 14 13 / 0.06);
}

[data-theme='dark'] {
  --bg:          var(--pine-500);
  --surface:     var(--ink-950);
  --surface-2:   var(--ink-800);
  --border:      rgb(255 255 255 / 0.08);
  --text:        var(--pine-50);
  --text-muted:  #8FA09A;
  --shadow:      none;
}

/* Identiques dans les deux thèmes — c'est volontaire */
:root {
  --accent:      var(--lime-500);
  --accent-fg:   var(--ink-950);
  --accent-2:    var(--violet-500);
  --accent-2-fg: #FFFFFF;
}
```

### 2.3 Règles

| Règle | Pourquoi |
|---|---|
| Les deux accents ne sont jamais une `color`, uniquement un `background` | Une teinte choisie pour remplir n'a pas le contraste d'une encre |
| Chaque remplissage déclare son encre — `--accent-fg`, `--accent-2-fg`, `--danger-fg` — et la paire passe AA | Mesuré palette par palette, pas supposé : une palette qui éclaircit son accent 2 doit pouvoir y poser autre chose que du blanc |
| **Entrées et sorties sont deux rôles distincts, jamais rouge et vert** | Le rouge/vert est illisible pour un daltonien et anxiogène sur du quotidien. C'est la *séparation* qui compte, pas les deux teintes qui la portent |
| L'écart entre les deux vaut au moins 3:1 | C'est ce qui survit au niveau de gris et à la dichromatie, donc exactement ce que la règle ci-dessus protège. Classique tient 3,88 ; une palette monochrome les sépare par la clarté et tient 3,45 |
| Rouge réservé aux dépassements et erreurs | S'il est partout, il ne signale plus rien. Même Neutre le garde : une palette discrète qui décolorerait l'erreur serait muette |
| En thème sombre, pas d'ombre : la hiérarchie passe par la bordure | Les ombres ne se voient pas sur du sapin |

Classique dit les entrées en lime et les sorties en violet. C'est **une** façon de tenir la règle, pas la règle : elle portait ces deux noms tant qu'il n'y avait qu'une palette, et cinq autres n'auraient pas pu exister sans la contredire.

### 2.4 Palette catégories

Six teintes, dans cet ordre, pour les donuts et les barres empilées. Au-delà de six catégories, les suivantes basculent en gris et sont regroupées sous « Autres ». **C'est la palette qui les fournit** : celles de Classique sont ci-dessous.

```css
--cat-1: #D8F84E;  --cat-2: #8478F2;  --cat-3: #4FC3A1;
--cat-4: #F5B575;  --cat-5: #F09BB5;  --cat-6: #7FB8E8;
```

Deux contraintes, mesurées pour chaque palette et chaque thème : deux teintes voisines s'écartent d'au moins **0,08** en distance OKLab, et chacune s'écarte d'au moins **0,15** du fond et des surfaces. Le rapport de contraste ne dit rien d'utile ici — le vert pomme sur du blanc ne donne que 1,20:1 et se voit très bien —, mais la distance dit juste : une teinte qui frôle sa surface disparaît.

Le plancher de 0,08 n'est pas celui de Classique, qui tient 0,122, et c'est délibéré : six pas d'une seule teinte ne peuvent pas s'écarter davantage sans qu'un des six cesse d'être cette teinte. C'est le prix d'une palette monochrome, et le §8 le couvre déjà : une pastille accompagne un libellé, elle ne le remplace pas.

### 2.5 Palette membres

Les mêmes teintes, **moins celle de l'accent**, et dans un autre ordre. Cinq suffisent à un foyer ; au-delà, la palette recommence.

```css
--member-1: var(--cat-3);  --member-2: var(--cat-4);  --member-3: var(--cat-5);
--member-4: var(--cat-6);  --member-5: var(--cat-2);
```

Ces alias suffisent tant que l'accent n'est pas dans la rampe des catégories. Il l'est dès qu'une palette distingue ses catégories par la clarté : Monochrome et Neutre posent donc leurs cinq membres à la main, sur la moitié de la rampe la plus éloignée de leur accent. La règle qu'ils tiennent est mesurable : **au moins 0,10 de distance OKLab entre un membre et l'accent**, contre 0,039 par le simple alias.

Le vert pomme est `--accent` : le signal « actif » de toute l'app, et la couleur du commun. La tuile Répartition est en accent. **Un membre ne le porte jamais.** Le premier le portait, et sa pastille se lisait comme une sélection : on croyait ne lire que ses données. Sur une pilule de filtre active, qui passe elle-même en `--accent`, elle disparaissait tout à fait.

Turquoise et ambre en tête : un foyer en compte deux le plus souvent, et ce sont les deux teintes les plus éloignées l'une de l'autre. Le violet ferme la marche, parce qu'il avoisine `--accent-2`, qui dit les sorties.

Une pastille désigne **une personne ou une catégorie**, et rien d'autre : c'est sa couleur. Une lecture qui ne désigne personne — « Tout le monde », « Commun » — n'en porte pas, et n'en emprunte pas une non plus, fût-elle l'accent : une pilule active passe elle-même en accent, et la pastille y disparaîtrait. C'est un filet qui marque la séparation (§6).

---

## 3. Typographie

**Archivo** (variable, largeur + graisse) pour tout ce qui se lit. **Geist Mono** pour les libellés utilitaires, les axes de graphique et les dates.

Deux familles, pas trois. La largeur variable d'Archivo remplace un troisième fichier : les grands nombres sont posés en `font-stretch: 112%`, ce qui leur donne la présence de la référence sans changer de fonte.

```css
--font-sans: 'Archivo Variable', system-ui, sans-serif;
--font-mono: 'Geist Mono', ui-monospace, monospace;
```

### Échelle

| Rôle | Fonte | Taille | Graisse | Détails |
|---|---|---|---|---|
| Chiffre héros | sans | 56 / 72px | 700 | `stretch: 112%`, `tracking: -0.03em` |
| Chiffre de tuile | sans | 32px | 700 | ramené à la largeur de sa tuile dans la grille, et à 26px sur une rangée simple |
| Montant de ligne | sans | 15px | 700 | |
| Montant secondaire | sans | 13px | 700 | |
| Titre de section | sans | 20px | 600 | |
| Corps | sans | 15px | 400 | `line-height: 1.5` |
| Libellé secondaire | sans | 13px | 400 | `color: var(--text-muted)` |
| Eyebrow | mono | 11px | 500 | majuscules, `tracking: 0.08em` |
| Axe de graphique | mono | 11px | 400 | `color: var(--text-muted)` |

### Chiffres

`font-variant-numeric: tabular-nums` sur **tout** montant, sans exception. Une colonne de montants qui danse à chaque mise à jour est le défaut le plus visible d'une app de finances.

**Une seule lettre pour tous les montants.** Les quatre tailles ci-dessus sont le même chiffre à quatre échelles : 700, `stretch: 112%`, `tracking: -0.03em`. Seule la taille varie. Un montant de liste et un solde héros doivent se reconnaître comme deux tailles du même chiffre : les faire diverger de graisse et de largeur donne l'impression de deux polices sur le même écran.

Le symbole monétaire se pose à 0.55em de la taille du nombre, aligné en haut, opacité 0.5. Les centimes d'un chiffre héros passent à 0.5em. Le signe n'est affiché que pour les entrées (`+`), une sortie se lit à sa couleur et à son contexte.

Une lecture qui **masque les centimes arrondit l'unité**, elle ne la tronque pas : 56,69 € s'y lit « 57 € ». Tronquer se trompe toujours dans le même sens — celui qui arrange qui lit —, et un reste à payer annoncé plus bas qu'il n'est vaut moins que rien.

---

## 4. Espacement, formes, mouvement

Base 4px. Échelle : `4 8 12 16 20 24 32 40 56 72`.

```css
--r-tile:  24px;   /* tuiles du dashboard */
--r-inner: 14px;   /* éléments dans une tuile */
--r-input: 12px;
--r-chip:  999px;
```

Padding intérieur d'une tuile : 20px en mobile, 24px au-delà. Gouttière de grille : 12px en mobile, 16px au-delà.

Trois autres valeurs sont tenues partout et méritent d'être écrites, faute de quoi chaque nouvel écran les redécide : une **grille de contenu hors bento** écarte ses colonnes de **16px** ; un **titre de section** est à **20px** de son contenu, comme le titre d'écran ; l'**intérieur d'une tuile** respire à **12px**. Le cadre de page est `px-4`, `px-8` au-delà de 768px.

Ce ne sont pas des préférences mais des relations : la même relation visuelle garde la même valeur d'un écran à l'autre. Trois gouttières différentes sur une même page se voient bien avant qu'on sache les nommer.

**Mouvement** : 160ms `cubic-bezier(0.2, 0, 0, 1)` par défaut, 240ms pour l'entrée d'une vue. Les nombres s'animent en comptant uniquement au premier affichage d'un écran, jamais sur mise à jour. Tout est neutralisé sous `prefers-reduced-motion`.

Deux précisions, faute de quoi la règle se lit de deux façons et se voit comme un défaut.

**Quels nombres.** Ceux de la grille bento et le chiffre héros, pas les autres. Une part par membre et une ligne de crédit portent la même taille de chiffre qu'une tuile : quarante montants qui s'égrènent chacun pour son compte ne sont pas une arrivée, c'est un scintillement, et un chiffre qui compte pendant qu'on remplit un formulaire est du bruit posé sur un geste.

**Quel affichage.** Celui de l'**écran**, pas celui du composant. La distinction n'est pas théorique : une tuile apparaît et disparaît pour des raisons qui n'ont rien d'une arrivée, un filtre qui en retire cinq, une lecture qui n'a de sens que sur le mois courant, une tuile qui devient cliquable. Attaché au composant, le comptage repart sur les tuiles remontées pendant que leurs voisines, restées en place, changent de valeur en silence : sur un même geste, le solde s'égrène et les charges sautent. Ce qui apparaît après l'arrivée de l'écran ne compte pas.

**Une surcouche a deux entrées, parce qu'elle est deux objets.** Une feuille montante *monte* du bord bas en 240ms : elle prend 90dvh d'un téléphone, c'est une vue qui arrive. Une boîte centrée ne vient de nulle part : elle se pose, en 160ms, par un fondu et un `scale` de 0,97 à 1. Le fond suit la même durée. Une surcouche qui apparaît d'un coup ne dit pas d'où elle vient, et son contenu ne s'anime pas derrière elle : **la montée de la feuille *est* le mouvement.**

**Une poignée n'existe que là où le geste existe.** Une pilule centrée au bord haut d'une feuille montante ne dit qu'une chose, et c'est « tire-moi ». Elle a longtemps été partout et n'a jamais rien fait. Elle accompagne maintenant le glissement, et lui seul.

**Un état pressé, pas seulement un survol**, sur tout ce qui est actionnable : cases du calendrier, lignes de liste, boutons ; la moitié des écrans n'a pas de curseur. Le fond s'assombrit là où il y en a un ; là où il n'y en a pas, le fond **est** le pressé. Un retrait de 2 à 4 % l'accompagne, et le porte à lui seul là où assombrir ne se voit pas : `--surface-2` en thème sombre.

Une **manipulation directe** n'est pas une animation et n'est donc pas neutralisée sous `prefers-reduced-motion` : c'est le doigt qui la conduit. Seul le retour à sa place, au relâchement, est du mouvement.

---

## 5. Grille bento

Le dashboard est une grille de tuiles de tailles inégales, pas une pile de cartes identiques.

```
mobile (2 col)      tablette (4 col)         desktop (6 col)
┌───────────┐       ┌───────┬───┬───┐        ┌───────┬───┬───────┐
│  solde    │       │ solde │éch│jrs│        │ solde │ € │ répart│
│  2×2      │       │  2×2  ├───┴───┤        │  2×2  ├───┤  2×2  │
├─────┬─────┤       │       │ abos  │        │       │ % │       │
│  €  │  %  │       ├───────┴───────┤        ├───┬───┴───┼───────┤
├─────┴─────┤       │  répartition  │        │éch│ jours │ abos  │
│ répartition│      └───────────────┘        │2×1│  2×1  │ 2×1   │
└───────────┘                                └───┴───────┴───────┘
```

Formats autorisés : `2×1`, `2×2`, `4×1`, `4×2`, `6×2`. Rien d'autre, sinon la grille se délite.

Trois paliers, et **un format ne change jamais de nom en changeant de palier** : c'est la correspondance format → colonnes qui change, pas la liste. Le palier tablette existe parce que deux colonnes étirées sur les 704px d'un iPad portrait ne sont pas une grille : c'est la mise en page d'un téléphone à trois fois la largeur, donc trois fois le vide. Et six colonnes n'y tiennent pas encore (§ ci-dessous).

| Format | < 768px (2 col) | 768 – 1024px (4 col) | ≥ 1024px (6 col) |
|---|---|---|---|
| `2×1` | demi-colonne | quart | tiers |
| `2×2` | pleine largeur | moitié | tiers |
| `4×1`, `4×2` | pleine largeur | moitié | deux tiers |
| `6×2` | pleine largeur | pleine largeur | pleine largeur |
| Rangée | 88px | 96px | 108px |

La `2×2` est la seule à ne pas se diviser par deux sur le palier tablette : elle porte le chiffre héros et son anneau, et un quart de 704px ne lui laisse que 133px de contenu, où le chiffre passe sous son plancher.

**Une tuile peut prendre plus large que son format sur une bande donnée**, et c'est une exception qui se justifie tuile par tuile : Revenus et Charges sont des `2×1` qui prennent deux colonnes sous 1024px. C'est le seul moyen que leur seconde lecture — « reste 102 € à payer » — s'affiche sur un téléphone, et elles n'ont pas de feuille d'explication pour la porter (§6). Elle coûte deux rangées de défilement, pour les deux chiffres qu'on vient chercher en premier.

Une tuile porte au maximum : un eyebrow, un chiffre, une lecture secondaire, une visualisation. Si elle en demande un cinquième, c'est deux tuiles.

**Et si elle en porte trois, ce n'est pas une `2×2`.** La règle se lit dans les deux sens, et c'est le second qui manquait. Un format à deux rangées offre 146px de contenu sur un téléphone ; une étiquette, un chiffre et deux lignes de lecture en occupent 103. Les quarante-trois qui restent ne sont pas de la respiration, ce sont les pixels d'une visualisation qu'on n'a pas mise, et une tuile vide au milieu d'une grille dont les voisines de même taille portent un anneau se voit immédiatement. Le capital restant dû était dans ce cas : il est passé en `4×1`, où ses trois éléments tiennent. La capacité d'épargne a fait le chemin inverse, parce qu'elle a réellement quatre choses à dire.

Le corollaire vaut d'être écrit : **le format suit le contenu, jamais l'inverse.** On ne remplit pas une `2×2` en inventant une lecture pour occuper le vide, et on ne coupe pas une lecture pour tenir dans une `2×1`.

**Une paire fait le bento, et c'est la contrainte du palier mobile.** Sur deux colonnes, seul un `2×1` se met à côté d'un autre : tout le reste prend la largeur. Une grille dont aucune tuile ne se range par deux n'est donc plus une grille de tailles inégales, c'est une pile de cartes, quelles que soient leurs hauteurs. L'écran du mois en pose une, et c'est celle qui va de soi : ce qui rentre et ce qui sort, la même phrase qu'on ne lit pas par moitié. Le reste prend la largeur autour d'elle, et le pavage se referme sans un trou sur les trois paliers.

Le prix de la demi-colonne est double, et il se mesure. La lecture secondaire attend 1024px : c'est écrit plus haut. Et le **chiffre** y touche son plancher : 104px de contenu à 320px n'acceptent que onze caractères, soit **100 000 € au plus**. Une tuile ne devient une moitié de rangée que si ces deux plafonds sont au-dessus de ce qu'elle a à dire, et que ce qu'elle masque se retrouve ailleurs : sur l'écran au bout de son chevron, sur la feuille qu'elle ouvre, ou sur les lignes vers lesquelles elle mène.

Une liste n'entre pas dans la grille : sa hauteur doit venir de son contenu, jamais d'un format. « Prochaines échéances » y serrait cinq lignes à un pixel d'interligne pour tenir dans les 188px d'une `4×2`, et une sixième n'y serait pas entrée.

**Un écran peut porter deux grilles, et l'écran du mois en porte deux.** Une grille bento range des tuiles côte à côte ; elle ne sait pas dire que l'une répond à une question qu'on se pose *avant* l'autre. Or l'écran du mois en pose trois — où j'en suis, ce que j'ai à faire, pourquoi (cahier §4.6) —, et il les a longtemps servies dans le désordre : neuf tuiles d'un bloc, c'est-à-dire toutes les questions du mois avec le même poids, puis deux sections, et enfin la seule qui demande un geste, à deux écrans de défilement sur un téléphone. La grille se coupe donc là où la narration se coupe : **une grille pour la situation, la tâche entre les deux, une grille pour l'analyse.**

Ce n'est pas une permission générale d'en semer partout. Deux grilles se justifient quand une section non-grille doit s'intercaler **entre** deux familles de tuiles, et pas autrement : deux grilles collées l'une à l'autre sont une seule grille mal écrite, dont le pavage se déliterait à la première tuile absente. Et chacune doit rester un bento pour elle-même : tailles inégales, au moins une paire sur deux colonnes, et un pavage qui se referme. C'est ce qui donne son format à la tuile « Suivi du mois » : `4×1`, parce que c'est le seul qui referme la première grille sans un trou aux trois paliers.

La largeur a son plafond, et c'est lui qui choisit entre `2×1` et `4×1`. La `2×1` reste en demi-colonne sur mobile, seule de tous les formats : elle n'offre que **~104px de contenu à 320px**. L'eyebrow y tient sur une ligne quoi qu'il arrive (§6), donc passé sa dégradation il déborde et se fait trancher. Mesuré : le plafond est de **13 caractères**. « Prévisionnel » (12) et « Reste à vivre » (13) tiennent, « Capacité d'épargne » (18) non, elle déborde de 35px. **Au-delà de 13 caractères, le format est `4×1`.** Un débordement de largeur ne se voit pas « par le bas » : il coupe le libellé au milieu d'un mot, et c'est le pire des deux.

### La grille de contenu, hors bento

Le bento range des tuiles calibrées sur une trame de rangées. Les écrans secondaires ne portent pas ça : ils portent des **blocs dont la hauteur vient de leur contenu** — groupes de rangées, tuiles de texte, panneaux de réglage —, et la règle du dessus le dit déjà, une liste n'entre pas dans la grille. Ils n'avaient pour autant aucune règle à eux, et l'absence de règle a une valeur par défaut qui ne s'était jamais discutée : la colonne unique, plafonnée à 768px.

Elle coûte, et ça se mesure. Sur un desktop, la colonne latérale prend ses 264px et il reste ~950px de contenu : on empilait 768px de large sur deux écrans de défilement, avec un tiers de la fenêtre vide à droite. Sept écrans mesurés à 1440 points, jeu d'exemple chargé : « Plus » passe de 1477 à 1117px de haut, « Crédits » de 1570 à 970, « Données » de 1091 à 918, « Épargne » de 1513 à 1318, « Récurrences » de 2056 à 1818.

**Deux colonnes à partir de 768px, une en dessous, gouttière de 16px** (`.cols`). Le seuil est celui du palier tablette du bento, et non un troisième inventé : au-dessus, les deux états que l'app connaît donnent la même largeur utile, 704px sur une tablette sans colonne latérale, 696px sur un desktop de 1024 qui vient d'en gagner une. Mesuré, les colonnes tombent entre **336 et 488px** de 768 à 1440, jamais sous la largeur d'une rangée de téléphone, qui est le plancher de `ListRow`.

Un `auto-fit` aurait laissé la largeur décider seule du nombre de colonnes. C'est ce que le prototype propose, et c'est ce qu'on écarte : une troisième colonne apparaît vers 1000px et retombe à ~310px, sous ce plancher. Le nombre de colonnes est une décision de mise en page, pas un reste de division.

Trois règles la bordent, et chacune vient d'un mode d'échec réel.

**L'ordre du DOM est l'ordre de lecture.** La grille range de gauche à droite puis de haut en bas, et ne réordonne rien : c'est ce qui interdit de composer deux piles à la main pour égaliser leurs hauteurs. Ça se lirait en colonnes, et un groupe passerait devant un autre pour une raison de hauteur. Le blanc sous un bloc court est le prix de l'ordre, et c'est le bon prix. Quand deux blocs doivent rester l'un sous l'autre sans que le flux les sépare, ils partagent une pile (`.cols-stack`) qui est un seul enfant de la grille.

**Les blocs voisins ne s'étirent pas l'un sur l'autre** (`align-items: start`). Un groupe de rangées étiré porterait sa dernière rangée à mi-hauteur d'un vide, et le vide se lirait comme une rangée manquante.

**Une grille à deux colonnes dont une seule est remplie n'est pas une mise en page.** Elle ne déborde pas et ne coupe rien : elle occupe la moitié gauche et laisse l'autre vide, ce qui se voit immédiatement. Le cas naît d'un état de données, pas d'une erreur d'écriture : un seul crédit, plus aucune récurrence active. L'écran reprend alors la pile, et c'est à lui de le décider, et `e2e/mise-en-page.spec.ts` refuse le cas contraire aux trois largeurs.

---

## 6. Composants

**Tile** : `background: var(--surface)`, `border-radius: var(--r-tile)`, bordure 1px en thème sombre, ombre en thème clair. Variante `accent` : fond lime, texte encre. Variante `accent-2` : fond violet, texte blanc. Une seule tuile accentuée par écran.

**Repère d'action d'une tuile** : une tuile cliquable dit au coin ce que le clic fait, parce que rien d'autre ne le dit : le survol qui la soulève d'un pixel n'existe pas au doigt, et douze tuiles identiques à l'œil peuvent cacher trois gestes différents. Mono 11px et glyphe 14px, en `--text-muted`, `aria-hidden` : le nom accessible de la tuile porte déjà le sens.

| Ce que fait le clic | Repère |
|---|---|
| Mène à un autre écran | nom de l'écran + chevron `›` : `ÉPARGNE ›`. Sans le nom quand l'eyebrow le dit déjà : `RÉPARTITION … ›` |
| Ouvre une feuille sur place | glyphe d'information seul. Pas de nom : il n'y a pas de destination |
| Fait défiler vers une section de la page | nom de la section + flèche vers le bas : `CE MOIS ⌄`. Elle descend, elle ne pointe pas de côté |
| Rien | **aucun repère.** C'est cette règle-là qui rend les trois autres lisibles |

Le repère vit en haut à droite, hors du flux : les tuiles ne s'accordent pas sur ce qu'elles posent en tête, et un repère dans le flux les décalerait chacune différemment. Sur une **2×1 étroite** il descend au coin bas : « PRÉVISIONNEL » consomme à lui seul les cent pixels utiles, et la lecture secondaire y est masquée, donc c'est le bas qui est libre. Dès que la tuile est assez large pour porter cette lecture, l'inverse est vrai et le repère remonte.

**C'est la largeur de la tuile qui arbitre, jamais celle de l'écran.** Le seuil est le même que celui de la lecture secondaire — 180px de boîte de contenu, en requête de conteneur — et il doit l'être : sur une tuile plate, les deux se partagent la ligne du bas, et deux seuils différents leur donneraient une bande de largeurs où ils se chevauchent. Un seuil de viewport ne peut pas le dire depuis qu'un même format ne fait plus la même largeur sur les trois paliers (§5).

Une tuile dont le **contenu est une liste à lire** garde un vrai lien plutôt que de devenir un `<button>` : l'envelopper dans un bouton effacerait ses lignes derrière un nom unique pour un lecteur d'écran, et aucun navigateur ne valide une liste dans un bouton.

**Ce lien couvre toute la tuile, et le coin ne garde que le repère.** Il n'a longtemps fait que les 44px du repère lui-même, et cette règle réglait alors un problème d'oreille en en créant un de doigt : une tuile de 300px de large n'offrait qu'un coin à viser, sans rien pour dire lequel, quand sa voisine de même taille et de même apparence se touchait n'importe où, la seule différence étant que celle-là est un bouton. Le lien s'étend donc sur le cadre, en `position: absolute; inset: 0`, **vide** : le repère visible reste au coin en `aria-hidden`, comme sur une tuile-bouton, et le lien ne porte qu'un nom et une surface. Rien ne change pour l'oreille : c'est toujours une section qu'on parcourt ligne à ligne, avec un lien nommé dedans.

L'**anneau de focus** se dessine alors sur la tuile et non sur le lien : le cadre porte `overflow: hidden`, où l'anneau du §8 se ferait rogner sur ses quatre côtés, et il doit de toute façon entourer ce qu'on actionne, la tuile entière, exactement comme sur une tuile-bouton.

Le corollaire se paie et doit être connu : **une tuile à lien étendu ne contient plus rien d'actionnable.** La surface du lien passe devant le contenu, et un bouton posé dans une ligne ne recevrait plus le doigt. Une tuile dont la légende s'ouvre part par part — « Où part l'argent » — ne prend donc pas de lien de tuile : ses parts sont des boutons, et c'est le contenu qui porte les gestes.

Un état **pressé** sur toute tuile actionnable, et pas seulement un survol : la moitié des écrans n'a pas de curseur. Les deux formes le portent — bouton et lien étendu —, parce que les deux se touchent de la même façon et doivent répondre pareil.

**Eyebrow** : mono 11px majuscules dans une pilule `--surface-2`, ancrée en haut à gauche de la tuile. C'est ce qui donne le rythme de la référence : la tuile n'a pas de titre, elle a une étiquette. Elle accepte un repère (§9) à sa gauche, 13px. L'étiquette tient toujours sur une ligne, et se dégrade en trois paliers : elle resserre d'abord ses marges et son interlettrage, abandonne le repère ensuite, rend enfin ce qui lui reste d'interlettrage. C'est le libellé qui porte le sens, on le sacrifie en dernier et jamais. Puis elle n'a plus rien à lâcher : au bout de ces trois paliers, une `2×1` accepte **13 caractères** et pas un de plus (§5). Ce n'est donc pas à l'eyebrow de s'adapter indéfiniment au format, c'est au format d'être choisi pour le libellé.

Les trois paliers se règlent sur le conteneur le plus proche, et par défaut c'est la tuile, ce qui est juste tant que l'étiquette a sa ligne pour elle. **Quand elle la partage** — « Prochaines échéances » et le lien du calendrier —, la tuile fait 286px et ne déclenche aucun palier pendant que l'étiquette, elle, n'a que 168px : elle se fait trancher sans que rien ne déborde. La règle est alors de poser le conteneur sur **ce qui reste** (`.eyebrow-room` en `flex-1 min-w-0`), pas sur la tuile ; le repère part dès le premier palier dans ce cas, puisque la place a déjà été partagée. Une largeur d'écran n'aurait rien pu en dire : c'est une question de place.

**Field** : libellé, contrôle, aide ou erreur. Le libellé porte la mention `· obligatoire` ou `· facultatif`, dans la même graisse atténuée. Elle vit dans le `<label>`, donc dans le nom accessible du contrôle : aucun `aria-required` à poser en plus. On la met sur les formulaires qui créent ou modifient une entité, pas sur les rangées d'ajout à un seul champ : un bouton désactivé tant que le champ est vide y dit déjà tout.

**Une liste déroulante porte un chevron, et il pointe en bas.** Le contrôle natif est repeint pour prendre la forme des autres champs — même rayon, même fond, même hauteur —, et ce repeint enlève la flèche du système : trente-six pixels lui restaient réservés à droite, vides. Une liste avait donc l'aspect exact d'un champ de saisie, et rien n'annonçait qu'il y avait quelque chose à ouvrir. Le chevron est posé par-dessus, sans souris, et masqué à l'oreille — un lecteur d'écran annonce déjà « liste ». **Il ne se confond pas avec celui d'une rangée** : celui-ci pointe à droite et promet un écran, celui-là pointe en bas et annonce ce qui s'ouvre sur place (§6).

**Un contrôle a la largeur de ce qu'il reçoit, et « le format suit le contenu » ne s'arrête pas au bord d'un formulaire.** `w-full` sur tout ce qui se saisit donnait la même boîte à un taux annuel de quatre caractères et à une note de cent quarante : mesuré, **316px sur un téléphone de 390**, sur les trois formulaires de l'app. Le coût n'est pas seulement du vide : un montant est aligné à droite, donc dans une boîte pleine largeur le chiffre qu'on tape se pose à 280px de l'étiquette qui le nomme, et la colonne devient une pile de dalles identiques où plus rien ne distingue deux caractères de cent.

| Contenu | Largeur |
|---|---|
| Montant, date | plafond commun de **12rem** |
| Entier d'un ou deux chiffres : un quantième, un « tous les N mois » | **6rem** |
| Texte libre, note, `Select` ouvert | pleine largeur : leur contenu n'a pas de longueur connue |
| `Select` à liste **fermée et courte** — quatre cadences, cinq horizons | le même plafond de **12rem** : la règle suit le contenu, pas le contrôle |

Les deux plafonds sont **mesurés, pas décidés** : « 12 345 678,90 » dans la fonte du champ demande 97px, soit 125 avec le cadre ; le capital restant dû d'un crédit, le plus gros chiffre de l'app, en réclame moins. Un `input[type=date]` veut 156px de largeur intrinsèque sous Chrome, davantage sous Safari iOS, qui écrit « 22 septembre 2026 » en toutes lettres là où Chrome écrit une date en chiffres. 12rem couvre les deux et leur laisse de l'air.

**Un plafond, jamais une largeur.** `max-width` borne le `w-full` sans entrer en concurrence avec lui ; deux `width` sur le même élément se départageraient par l'ordre de `utilities.css`, `cn` ne fusionnant rien du tout — il concatène. C'est le piège qu'a rencontré la colonne de « À confirmer », dont le champ garde sa largeur de colonne : 96px, sous le plafond, qui ne la touche donc pas.

La date a son composant, `DateInput`, pour la même raison qu'un montant a le sien : une longueur connue n'a pas à être redécidée par sept appelants. Il reste le contrôle **natif**, qui apporte le clavier de la plateforme, le format local et la saisie au clavier, qu'aucune reconstitution ne rend aussi bien.

**Écrans de saisie** : un formulaire ou une fiche est un écran plein avec son URL, jamais une feuille modale : chevron de retour et titre en haut, le formulaire dans une tuile, les actions dessous dans le flux. Rien à faire glisser, rien à refermer pour revenir. La règle vise la **saisie**, pas la confirmation : une question fermée qui n'attend que oui ou non est exactement ce pour quoi un `<dialog>` existe.

Une **lecture courte et refermable** est le troisième cas, et elle va aussi sur la feuille : la journée qu'on ouvre depuis le calendrier, la feuille d'explication d'une tuile. Elle ne saisit rien : elle montre ce qu'il y a, et passe la main à l'écran plein pour créer. Ce qu'elle y gagne est ce que le §8 demande et que rien d'écrit à la main ne fait aussi bien : piège de focus, touche Échap, clic sur le fond, et retour du focus à ce qui l'a ouverte. En tuile sous le contenu, il fallait réécrire les quatre, et il en manquait toujours un.

**Une lecture se referme aussi en la tirant vers le bas**, sous 640px, et c'est la cinquième sortie : celle du pouce, qu'aucune des quatre autres ne remplace. Le geste vit sur la poignée et l'en-tête, jamais sur le corps : celui-ci défile, et `touch-action` ne peut pas servir un défilement et un glissement sur le même élément. Il porte la poignée avec lui (§4). Au-delà de 640px la feuille est une boîte centrée, et tirer une boîte vers le bas ne veut rien dire.

**Le pied de feuille accepte une légende**, au-dessus de sa rangée d'actions. Elle existe pour un cas précis : trois boutons se partagent 280px sur un téléphone de 320, soit **88px chacun**, et ni « Ajouter une dépense » ni même un « + » devant « Dépense » n'y tiennent. Le glyphe en réclame vingt-quatre de plus que la place restante. Sans elle, trois pilules grises de largeur égale au bas d'un panneau ont la forme exacte d'un `Segmented` : elles disent trois natures, pas trois gestes. Le verbe se dit donc une fois, en `t-eyebrow` atténué, et chaque bouton le reprend dans son **nom accessible** ; la légende est pour l'œil, elle n'est reliée à rien. Une rangée à trois passe en densité `sm` : c'est ce qui rend douze pixels par bouton sans toucher aux 44px de haut du §8.

**ConfirmDialog** : la confirmation d'un geste destructif, la même partout, sur la feuille modale et donc sur `<dialog>` natif : piège de focus, Échap, clic sur le fond et retour du focus au bouton d'origine viennent du navigateur. Le pied de feuille pose ses deux boutons à largeur égale : `Annuler` en `secondary`, l'action en `danger`. **Elle ne prend pas le glissement, ni la poignée** : elle a deux sorties, toutes deux nommées, et une troisième au doigt et sans mot jetterait sans rien dire des confirmations délibérées. L'escalier se redescend à zéro, donc un balayage égaré au troisième pas fait tout recommencer. Le nombre de questions fait la gravité : une pour une ligne, deux pour un import qui remplace tout, trois pour l'effacement des données, avec un compteur `n / N` dès qu'il y en a plus d'une. Chaque question dit **ce qui est perdu** et porte le verbe de l'action sur son bouton, jamais « êtes-vous sûr » suivi d'un « OK ». Une seule boîte par écran, qui sait sur quoi elle porte : une par ligne d'une liste en monterait autant dans le DOM.

**Une feuille sans sortie sans mot n'existe qu'une fois.** `Sheet` accepte `dismissible={false}` : ni croix, ni Échap, ni clic sur le fond, un seul bouton nommé referme. C'est l'inverse exact de ce que tout le reste de cette section demande, et c'est réservé à la notice du premier lancement (cahier §4.1). Ce qui l'autorise : elle ne pose aucune question. Il n'y a pas de « non » à offrir puisqu'il n'y a rien à accepter, et une sortie sans mot, une touche ou un doigt à côté, ferait passer pour un refus le fait d'avoir cliqué de travers. La croix disparaît plutôt que de se désactiver, par la même règle que les repères d'action : un bouton « Fermer » sur une feuille qui ne se ferme pas serait la pire des deux, il promettrait la sortie sans la donner.

Ce n'est pas un piège au sens de WCAG 2.1.2 : le piège de focus reste celui du navigateur, la case répond à la barre d'espace et le bouton à Entrée. La sortie existe au clavier, elle est simplement nommée. Le **glissement**, quatrième sortie, tombe avec les trois autres : la poignée n'existe que là où le geste existe, et cette règle-là ne se négocie pas plus ici qu'ailleurs.

Une feuille dont le **texte est le propos**, et non le décor d'un formulaire, désigne son corps par `describedBy` **et prend le focus elle-même**. Les deux vont ensemble et l'un ne vaut rien sans l'autre : `showModal()` viserait le premier élément focusable, dont un lecteur d'écran annoncerait le nom *à la place* de la description qu'on vient de poser. Le focus va donc sur la boîte, la première tabulation atteint le premier contrôle, et la boîte n'a pas d'anneau : le §8 demande un focus visible sur ce qu'on actionne, et un conteneur n'est pas un bouton.

**Un contrôle qui atteste de ce qu'on lit vit en fin de corps, jamais dans le pied.** Le pied est hors du défilement : une case posée là se coche sur un téléphone étroit sans qu'une ligne du texte ait défilé, et elle n'atteste alors de rien. C'est aussi ce que dit la règle de la légende du pied, « pour l'œil, elle n'est reliée à rien », et un contrôle ne peut pas être cela.

**Un bouton désactivé dit pourquoi, comme une case verrouillée.** La raison ne peut pas vivre sur lui : un `disabled` ne prend pas le focus, donc son nom accessible n'est jamais lu. Elle vit sur le contrôle qui le débloque, l'`hint` de la case, et elle **reste affichée après le déblocage** : la faire disparaître au moment où l'on comprend enfin le lien entre les deux effacerait l'explication au profit de qui n'en a plus besoin.

**Amount** : composant unique pour tout montant. Props : valeur en centimes, taille, sens. Gère seul le tabular-nums, le symbole, les centimes réduits et la couleur.

**Segmented** : groupe de boutons radio, deux à six positions qui s'excluent. Il annonce `radiogroup` et se comporte comme tel : une seule tabulation pour tout le groupe, sur la position cochée, les flèches déplacent choix et focus ensemble et en boucle, Origine et Fin vont aux extrémités. Il passe à la ligne plutôt que de déborder : l'anneau de focus mord de 4px hors du bouton, et un `overflow` le rognerait.

Une position peut se dire **court** (`short`) : un carré de 44px où tient un code de langue ou un glyphe, le libellé complet passant en `aria-label`. Ce qui rétrécit est la boîte, pas le sens : même forme, même vert de position active, même clavier. Un groupe l'emploie pour toutes ses positions ou pour aucune : trois pilules dont une seule serait un carré ne se liraient plus comme un même choix, et les cibles cesseraient d'avoir la même valeur. Réservé aux écrans où le réglage **n'est pas le sujet** : la présentation et `PlainShell` ; voir plus bas « un réglage qui peut être faux se règle là où il peut l'être », qui dit à quelle condition on a le droit de raccourcir. La vue qui a le réglage pour titre garde les libellés pleins.

**Checkbox** : un attribut vrai ou faux, pas un choix entre deux modes : `Segmented` sert à choisir parmi des positions qui s'excluent, la case dit qu'une chose est vraie ou ne l'est pas. Carré de 24px dans une cible de 44px, coché en `--accent` sur texte encre ; lime reste un remplissage. La case native reste dans le DOM, masquée : c'est elle qui porte l'état pour un lecteur d'écran et qui répond à la barre d'espace. Elle peut être **verrouillée**, cochée, non modifiable, et alors toujours accompagnée d'un `hint` qui dit pourquoi : une case bloquée sans raison se lit comme une panne. Elle garde sa couleur de texte pleine, contrairement aux boutons désactivés : elle n'est pas hors service, elle informe, et atténuer sous le plancher AA du §8 ce qu'on met là pour être lu reviendrait à le cacher. Elle reste affichée plutôt que de disparaître quand elle informe de ce qui va se passer ; elle se retire quand la question ne se pose pas.

**Disclosure** : section repliable, sur `<details>` natif : il porte déjà l'état pour un lecteur d'écran, répond au clavier, et la recherche dans la page sait ouvrir ce qui est replié. En-tête de 44px, chevron qui pivote, et une lecture de droite — total ou compte — qui reste visible replié : une section qu'il faut ouvrir pour savoir si elle vaut la peine ne fait pas gagner de défilement. Une liste longue s'accompagne d'un « tout replier ».

**Chip** : pilule pour catégories, membres et filtres. Pastille de couleur 8px + libellé 13px, sur une ligne : un libellé coupé en deux dans une pilule de 44px la déforme, c'est à la rangée de s'adapter. État actif : fond `--surface-2` → `--accent`.

**Rangée de filtres** : une ligne qui **défile**, jamais qui passe à la ligne. Elle vit dans le bandeau collant du mois, où une seconde ligne coûte 52px de haut d'écran à chaque défilement et fait dépendre la hauteur du bandeau du nombre de membres. À 320px, « Tout le monde » et « Commun » consomment déjà 205 des 288px utiles : aucune mise en page ne les fait tenir avec les prénoms.

| Règle | Pourquoi |
|---|---|
| Piste à bord perdu : le cadre de la page est annulé, puis reposé sur la piste | Sans quoi la première et la dernière pilule sont rognées à mi-hauteur, et la rangée s'arrête avant le bord de l'écran |
| 4px de cadre vertical, repris par une marge négative | L'anneau de focus déborde de 4px hors du bouton (§8), et un `overflow` le rognerait. C'est exactement l'objection qui fait passer `Segmented` à la ligne, mais une bascule vit dans une tuile, dont la largeur *est* le cadre |
| `scroll-padding-inline: 16px` | Une pilule qui prend le focus au clavier ne se colle pas au bord |
| Accroche `proximity`, jamais `mandatory` | La pilule coupée en fin de piste **est** l'affordance de défilement ; `mandatory` la supprimerait |
| Pas de dégradé de bord | Il éteindrait l'anneau de focus de cette même pilule |
| Pas de `touch-action` | Un défileur natif arbitre seul l'axe dominant : un glissement vertical parti des pilules fait défiler la page, et `MonthNav` garde son balayage horizontal juste au-dessus |

Les pilules qui ne désignent personne n'ont pas de pastille (§2.5), et un filet d'un pixel les sépare des personnes : sans lui, l'absence se lit comme un oubli. Le filet est en `--text-muted` atténué et non en `--border`, calibré pour une bordure sur une surface et invisible sur le fond de page.

**ListRow** : pastille de catégorie, libellé, sous-libellé mono (date ou périodicité), montant à droite. Hauteur 56px. Un `planned` s'affiche à 60% d'opacité avec un contour en pointillés sur la pastille.

**RowGroup** : une tuile, son étiquette, et des rangées séparées d'un filet. C'est la réponse à « deux ou trois portes voisines », là où une tuile chacune donnerait le même poids à tout et empilerait des cadres : les réglages en comptaient huit, l'écran des récurrences finissait par un paragraphe et un lien souligné. Le titre est facultatif : une liste de familles ou de résultats de recherche est un groupe sans nom.

C'est aussi la réponse à « **deux lectures qu'une tuile ne sait pas distinguer** », et l'écran du mois en fait un usage, un seul. Le prévisionnel et le reste à vivre annoncent régulièrement le même montant au centime — sans rentrée d'argent en vue, leurs horizons coïncident —, et ce qui les sépare tient dans une phrase qu'aucune tuile plate n'affiche sous 1024px. La rangée donne ce que la tuile ne pouvait pas : sa `description` **passe à la ligne**, donc elle se lit à toutes les largeurs. Une microcopy qui n'existe qu'au-delà de 1024px n'existe pas, et c'est le seul motif qui justifie de sortir une lecture de la grille, pas la place qu'elle y prend.

Une rangée prend l'élément de son geste : un `<Link>` quand elle mène ailleurs, un `<button>` quand elle agit sur place, un bloc quand elle ne fait que se lire. **Le repère n'apparaît que là où le geste existe**, exactement comme celui d'une tuile — une rangée sans repère est une rangée qu'on lit —, et il dit *lequel* : chevron vers un écran, glyphe d'information pour une feuille qui s'ouvre sur place. C'est la taxonomie des repères de tuile, réduite aux deux cas qu'une rangée connaît ; un chevron posé sur une rangée qui ouvre une feuille annonce un écran qui ne vient jamais. Le libellé se tronque, la seconde ligne passe à la ligne : un nom doit tenir sur une rangée, mais une valeur coupée en deux n'avertit plus de rien.

**Navigation** : deux formes d'une même table (`app/routes.ts`), et **la barre d'onglets ne décide plus de l'architecture**.

Elle en portait cinq, ce qui était son plafond à 320px, et ce plafond décidait de tout : il mettait « Récurrences », qu'on écrit une fois, au même rang que « Le mois », qu'on ouvre tous les jours, et surtout il condamnait quatre écrans réels de l'app (épargne, répartition, crédits, avances) à n'avoir aucune adresse de navigation. On n'y arrivait que par une tuile du mois, laquelle s'efface précisément quand elle n'a rien à montrer : un écran atteignable seulement quand on n'en a pas besoin.

| | Barre d'onglets (< 1024px) | Colonne latérale (≥ 1024px) |
|---|---|---|
| Contenu | **quatre** destinations : les trois lectures qu'on ouvre pour regarder, puis « Plus » | les mêmes quatre, dont « Gérer » déplié |
| Ce qui est rangé | un écran « Plus », qui liste cinq groupes en rangées | ce que « Plus » range au-delà de « Gérer » : la colonne dépliait tout tant qu'il tenait en deux groupes, mais douze destinations la doubleraient et l'une d'elles est un sélecteur, pas un lien |
| Groupes | — | sans titre, puis « Gérer », puis « Plus » seul |

**« Plus » range par intention, pas par commodité.** Il a porté un groupe « Réglages » qui contenait les personnes, les catégories, l'apparence, la devise, les données et « à propos » : six natures de tâches derrière un mot qui n'en nomme aucune. Le critère n'est pas « où peut-on ranger cette fonctionnalité ? » mais « avec quelle intention vient-on ? », et il en sort cinq : **Gérer** (ce qui décide de ce que le budget calcule), **Organiser** (qui y figure, sous quelles étiquettes), **Données** (où elles vivent, comment en sortir une copie), **Application** (ce qui ne touche qu'à la présentation). Trois verbes et un nom, parce que le quatrième ne se fait pas.

Une rangée dit **sa valeur** quand elle en a une — « Maison · 3 membres », « 47 catégories · 12 familles », « Système · Classique » —, une phrase sinon. Jamais un chiffre du budget : chaque écran d'arrivée dit déjà le sien, et les répéter ici ferait un second tableau de bord, en retard d'une règle sur le premier.

Un groupe se titre en `t-eyebrow` atténué, `aria-hidden` : ce n'est pas une région, c'est une suite de liens qu'une étiquette sépare à l'œil. **Le premier groupe n'a pas de titre** : la colonne doit s'ouvrir sur les destinations quotidiennes, pas sur un mot à lire avant elles.

L'onglet « Plus » reste allumé dans tout ce qu'il range. `NavLink` n'apparie que son propre préfixe ; la table des préfixes vit dans `routes.ts`, et sans elle on quittait l'onglet dès le premier pas à l'intérieur : quatre onglets éteints, sans rien pour dire d'où l'on venait.

Le prix est assumé et se dit : les récurrences passent de un à deux appuis, et elles restent à un appui depuis l'état vide du mois, qui est l'endroit où l'on va justement en poser une. Les réglages, eux, en gagnent un : « Plus → Catégories » remplace « Plus → Réglages → Catégories ».

**Un réglage qui peut être faux se règle là où il peut l'être.** La langue et le thème vivaient derrière l'app — « Plus » pour l'une, « Apparence » pour l'autre —, c'est-à-dire **derrière la création d'un document**. Or la langue est *détectée* sur `navigator.languages`, et une détection se trompe : un francophone sur un système en anglais lisait toute la présentation et tout l'onboarding en anglais, et la seule façon d'en sortir était de créer un foyer dans une langue dont il ne voulait pas, puis d'aller le corriger.

Les deux réglages sont donc aussi sur les écrans d'avant le foyer — la présentation et les quatre pages de `PlainShell` —, dans le même contrôle qu'à l'intérieur : un concept garde sa forme partout. Le `Segmented` est ce qu'il faut ici plus qu'ailleurs, parce qu'on vient l'y chercher *précisément parce qu'on ne lit pas* ce qui est affiché : un contrôle replié, qui n'affiche que sa valeur courante, demanderait de l'ouvrir pour savoir ce qu'il propose. En tête et non en pied : celui qui lit dans la mauvaise langue lit depuis le haut.

**Mais un réglage secondaire ne prend pas la première position.** Les deux bascules l'ont prise : cinq pilules à libellé plein — « Français | English » et « Clair | Sombre | Système » — ouvraient la présentation, remplissaient la largeur d'un téléphone et se lisaient avant le nom du produit. Le parcours de cette page est « produit → promesse → explication → action », et il commençait par « réglages ». Ce qui est là ne sert pas le job-to-be-done de la page, il sert **celui qui est arrivé au mauvais endroit du réglage** : il faut qu'il le trouve, pas qu'on le lui mette devant le titre.

D'où la **densité courte** du `Segmented` (`short`), qui est la même bascule et non une seconde : « FR | EN » et trois glyphes — soleil, lune, demi-disque —, cinq carrés de 44px au lieu de cinq pilules, environ 250px contre la largeur entière d'une 320. Ce qui rétrécit est la boîte, pas le sens : le libellé complet reste le **nom accessible** du bouton, et un code ISO se reconnaît sans lire un mot de ce qui l'entoure, exactement comme « English », c'est tout ce qu'on demande à ce sélecteur. La rangée est alors collée au-dessus de l'étiquette du titre plutôt que séparée par la gouttière de section : à `gap-10` elle formait une bande à elle seule, que l'œil comptait comme une section.

**« Système » reste une position visible**, et non un repli derrière un appui long. Un appui long ne s'annonce nulle part et n'existe pas au clavier, ce qui rangerait le mode le plus utile là où personne ne le trouve, mais l'argument dirimant est ailleurs : c'est le **défaut**, donc l'état de la quasi-totalité des visiteurs, et une bascule à deux positions ne saurait pas le montrer. Ni le soleil ni la lune ne serait allumé, ou l'un des deux mentirait. Un glyphe de plus coûte 44px et dit l'état vrai.

Rien ne s'enregistre pour autant. `setLocale` et `setTheme` mirent leur préférence en `localStorage` *avant* de toucher au document, et `mutate` ne programme aucune écriture tant que le statut vaut « onboarding » : la garde qui empêche un foyer fantôme est celle qui rend ces contrôles possibles sans exception nouvelle. L'onboarding, lui, ne les porte pas : son en-tête est une jauge, cinq positions de plus l'écrasent à 320px, et son premier retour ramène à la présentation, qui les a.

La densité courte s'arrête là. « Apparence » et « Plus » gardent les libellés pleins : ce sont les vues du réglage, on y vient exprès, et un écran qui a pour sujet le thème n'a pas à faire deviner ce que désigne un demi-disque.

**Bouton de saisie flottant** : un disque de 56px en lime, **au milieu de la barre d'onglets et à cheval sur elle**, sous les surcouches. Il n'existe que sous 1024px : au-delà, la rangée de boutons en tête de l'écran du mois est à l'écran et ne défile jamais hors de vue. Une porte par largeur et pas deux : les mêmes trois boutons deux fois sur un écran ne font pas deux occasions.

Il a vécu au coin bas-droit, et le coin a deux torts. Il place l'action principale sous le pouce droit et hors d'atteinte du gauche, ce qu'aucune autre décision de ce système ne fait. Et il flotte : rien ne le rattache à la barre, si bien qu'il a déjà volé les appuis d'un coin entier d'écran une fois. Le rectangle invisible qui le porte mangeait la moitié droite des rangées qui passaient dessous.

**La barre s'ouvre pour lui, elle ne le subit pas.** Un disque centré sur une rangée de quatre onglets tombe sur la frontière du deuxième et du troisième : posé par-dessus, il mange une part des deux. La rangée porte donc une **fente de 64px** en son milieu, deux onglets de chaque côté, et c'est la corde et non le diamètre qui la mesure : le disque ne descend que de **20px** dans la barre et son centre est 8px au-dessus d'elle, si bien que ce qu'il occupe *dans* la rangée est un arc de 54px au ras du filet, qui se referme à zéro vingt pixels plus bas. Les libellés vivent trente pixels plus bas encore : il ne les approche jamais.

Le prix se mesure et se paie ailleurs : la fente reprend 64px que les quatre `flex-1` se partageaient, et le cadre d'un onglet passe de 4 à 2px de chaque côté pour les rendre. À 320 points, « Calendrier » garde 5,3px de marge avant sa troncature, mesuré dans les deux langues, le français étant le plus long.

Il **se déplie** sur les trois portes de saisie, dans l'ordre de l'écran du mois, plutôt que d'en promettre une seule : « les deux sens sont deux boutons, jamais un seul » (§7) vaut aussi pour lui, et un `+` flottant qui ouvrirait toujours une dépense rétablirait exactement ce que cette règle corrige. Le glyphe pivote de 45° au lieu d'être remplacé par une croix : c'est le même bouton ; le nom accessible, lui, change, parce qu'il dit ce que le prochain appui fait. Il se referme sur Échap, sur un appui à côté, et à tout changement d'écran.

Rien sur un écran de saisie : il partirait créer une ligne par-dessus celle qu'on écrit, en contournant la garde de brouillon qui ne surveille que les deux boutons de sortie. C'est mot pour mot la garde du raccourci « n », dont il est la version au doigt.

**MonthNav** : chevrons de part et d'autre du mois courant, mois en sans 20px, année en mono 11px dessous. Balayage horizontal sur mobile.

Un **retour au mois courant** vit **dans le bloc titre**, et n'existe que lorsqu'on n'est pas sur ce mois : c'est la règle des repères d'action appliquée au titre lui-même — celui qui ne bouge rien apprend à ignorer ceux qui bougent quelque chose. Douze chevrons pour revenir de février à août n'est pas une navigation, c'est une pénalité. Le bloc devient alors un bouton d'au moins 44px, et la ligne d'année dit où il mène : « 2025 · revenir à août ». L'année reste, contre le prototype qui la remplace — sans elle, douze mois en arrière affichent « juillet » sans qu'on sache lequel.

Il a été un bouton posé à droite du bandeau, et deux affordances pour un même geste valent moins qu'une : celui-là décalait le nom du mois de sa propre largeur, et n'apparaissait qu'une fois qu'on s'était éloigné, c'est-à-dire au moment précis où l'on cherche le titre pour savoir où l'on est. Le bloc titre, lui, est déjà là et déjà sous le pouce. Le prix est un **nom accessible explicite** — « Revenir à août 2026 » —, parce qu'un geste posé sur un titre n'est annoncé par rien d'autre ; il contient le texte visible de l'action, ce que le §8 exige. Le balayage n'est pas perdu au change : le bloc reste sur la piste, et un glissé qui a changé de mois éteint le clic qui suivrait.

**Le calendrier avait le sien, qui disait « aujourd'hui ». Il n'en a plus.** La règle des repères d'action porte sur ce qu'on voit, et ce bouton-là n'apparaissait pas quand on était parti : il apparaissait quand l'**ancre du clavier** avait quitté le jour, un état qu'aucun pixel ne montre, et que le moindre appui sur une case déplace. Sur le mois courant, ouvrir puis refermer un jour le faisait donc surgir sans que rien n'ait bougé, et l'appuyer ne rouvrait qu'une feuille sur une grille qui, elle, ne bougeait pas. **La condition d'apparition d'un repère d'action doit se voir à l'écran, et son effet aussi** : c'est le §6 lu jusqu'au bout, et ce bouton l'enfreignait par les deux bouts. Ce qu'il promettait vit ailleurs : le bloc titre ramène le mois quand on l'a quitté, la case ramène au jour, et la légende de la grille dit lequel.

**Légende de la grille du calendrier** : sous les six semaines, séparée d'un filet : pastille pleine « Confirmée », pastille en pointillés « Prévue », quantième dans son contour « Aujourd'hui », et dessous la phrase qui dit ce que la couleur fait. Le §8 demande qu'une forme ne porte jamais seule ce qu'elle dit ; la règle valait pour le nom accessible des cases et laissait l'œil deviner « pas encore confirmée » derrière un contour en pointillés, ce qui n'arrive à personne. Les pastilles d'exemple sont en `--text-muted` : la légende montre la **forme**, pas la couleur ; nommer une catégorie en exemple sur quarante-sept en désignerait une au hasard. Elle n'explique que ce qui est à l'écran : rien sans aucune échéance dans la fenêtre, pas de cadre du jour sur un mois qui ne le montre pas, pas de phrase sur le « + » sans « +N » nulle part.

**Ring** : l'anneau. Épaisseur 12px, extrémités arrondies, départ à midi, sens horaire, fond de piste en `--surface-2`. Sert de progression du mois, de jauge et de donut de répartition. Le contenu central est un `Amount`.

**Toast** : trois au plus à l'écran, et un message qui se répète porte son compte (« Échéance confirmée · 10 ») au lieu de se dupliquer. Une pile qui recouvre l'écran ne dit plus rien de ce qui vient de se passer, et cache ce sur quoi on est en train d'agir. Le compte à rebours repart à chaque répétition.

**EmptyState** : un anneau vide, une phrase qui dit quoi faire, un bouton. Jamais d'illustration, jamais d'excuse.

---

## 7. Conventions d'écriture

Français, phrases en casse normale, pas de majuscule décorative sur les boutons.

Le nom d'une action ne change pas dans le flux : le bouton dit « Confirmer le mois », le toast dit « Mois confirmé ». Les libellés parlent de ce que l'utilisateur manipule — « abonnement », « échéance », « mois » — jamais de récurrence, d'entrée ou de schéma.

Une erreur dit ce qui s'est passé et quoi faire, sans s'excuser. Un écran vide est une invitation, pas un constat : « Aucun abonnement pour l'instant. Ajoute le premier. »

---

## 8. Plancher de qualité

Contraste AA sur tout texte. Focus clavier visible sur tout élément interactif, anneau 2px `--focus` avec 2px de décalage. L'anneau porte son propre token, et ne vaut plus `--accent-2` par écrit : sur un fond sombre, il faut pouvoir le repointer sans changer la couleur des sorties. Il tient 3:1 sur le fond comme sur les surfaces, ce que WCAG 1.4.11 demande d'un indicateur de focus. Cible tactile minimale 44px. Chaque graphique est doublé d'une lecture accessible aux lecteurs d'écran. Les deux thèmes sont testés sur chaque écran avant de considérer l'écran terminé.

**Ce plancher est prouvé, pas affirmé.** `src/theme/palettes.test.ts` lit `tokens.css` et `palettes.css`, rejoue la cascade pour chacun des douze couples palette × thème et mesure : quinze paires de texte à 4,5:1, quatre séparations non textuelles à 3:1, et les distances du §2.4. Il rejoue au passage les ratios écrits en commentaire dans `tokens.css`, ce qui est le test du test. Les écarts assumés y sont déclarés un par un, avec leur plancher propre : un écart non déclaré fait échouer la construction, et un écart déclaré qui empire aussi.

Deux écarts à la cible de 44px, et pas un de plus. Ils ont en commun d'être **mesurés, écrits à côté du code, et compensés sur l'autre axe** : une largeur d'écran ne se négocie pas, et un composant qui divise cette largeur par sept ou par douze finit par tomber en dessous. Le curseur d'un graphique donne seize pixels par mois sur un téléphone de 320, et la lecture existe aussi au clavier et dans le doublon accessible. Une case de calendrier tombe à 37px de large sous 375px de fenêtre, et garde ses 44px de haut. Ce qui n'est jamais négociable, en revanche, c'est la hauteur : une cible aplatie n'a plus rien pour être visée.

---

## 9. Icônes

Phosphor, graisse `bold`, celle qui retombe sur le trait de 2px du reste du système. Jamais `fill` : le glyphe est un trait, pas une tache.

Un seul point d'entrée, `ui/Icons.tsx`, qui réexporte sous des noms à nous. Aucun composant n'importe Phosphor directement : changer de bibliothèque ne doit toucher qu'un fichier. Import par chemin (`@phosphor-icons/react/dist/csr/<Nom>`) et non depuis l'index, dont le barrel de neuf mille icônes ralentit le démarrage en dev.

### 9.1 Deux emplois, et pas un de plus

| Emploi | Où | Taille |
|---|---|---|
| **Action** | Sur un contrôle qui fait quelque chose : chevron, plus, croix, coche, les trois positions du thème en densité courte | 16–20px |
| **Repère** | Sur un onglet, une tuile, une section, une rangée de navigation, pour la retrouver à l'œil sans relire son libellé | 13px dans un eyebrow, 18px en navigation |

Rien en dehors. Une icône qui n'aide ni à agir ni à se repérer décore, et §1 ne veut pas de décor. En particulier : **jamais d'icône sur une ligne de données**. Une entrée du mois porte déjà sa pastille de catégorie, et deux marqueurs à la même place n'en font plus aucun.

La frontière est là, et pas ailleurs : une `ListRow` montre une **donnée** — elle est identifiée par ce qu'elle contient —, une `Row` de « Plus » montre une **destination**, qui a un glyphe et le même partout (§9.2). L'écran « Plus » est la navigation sous 1024px, où la barre ne porte que quatre repères : sans eux, tout ce qu'elle range se parcourt en lisant onze libellés. La rangée porte donc son repère à gauche et son chevron à droite, et les deux ne se doublent pas : l'un dit *vers quoi*, l'autre *qu'on y va*. Une rangée qui porte déjà une pastille n'y a pas droit.

### 9.2 Règles

| Règle | Pourquoi |
|---|---|
| `aria-hidden` systématique | Le libellé adjacent porte déjà le sens ; annoncer le glyphe le dirait deux fois |
| Un glyphe seul dans un contrôle : le libellé passe en `aria-label` du contrôle | La règle du dessus rendrait le bouton muet : il faut que le nom existe quelque part, et c'est le contrôle qui le porte, jamais le glyphe |
| Un glyphe par destination, déclaré une seule fois (`app/routes.ts`) | La barre d'onglets et la colonne latérale ne peuvent pas diverger |
| L'onglet actif est une pilule `--accent` derrière le glyphe | Lime reste un remplissage, jamais une `color` (§2.3) |
| Le même concept garde le même glyphe partout | « Abonnements » est le même cycle en navigation, en tuile et en total |
