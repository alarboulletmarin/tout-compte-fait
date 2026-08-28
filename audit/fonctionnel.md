# Audit fonctionnel — Tout compte fait

Relevé du 27 août 2026, sur l'app **construite** (`npm run build`), dans un
Chromium réel piloté par Playwright — pas dans jsdom. Point de départ : un
retour d'usage disait l'app « pleine de bugs, inutilisable », au point de
vouloir repartir de zéro. L'audit devait départager ce qui fonctionne de ce
qui casse, preuve à l'appui.

**Verdict : l'app fonctionne — mais le retour d'usage avait raison sur un
point, et il était grave.** Deux vraies pertes de données vivaient à la sortie
de page, et elles frappaient précisément le geste le plus ordinaire du monde :
noter une dépense, ranger le téléphone. Les deux sont corrigées et prouvées
corrigées dans le même navigateur qui les a reproduites. Tout le reste tient :
42 vérifications sémantiques passent, sur les chiffres recomposés et non sur la
seule présence des écrans.

## Ce qui était vraiment cassé

Deux défauts, une seule famille : **la fenêtre entre une saisie et son
écriture ne survivait pas à la page.** Le writer regroupe les écritures
(400 ms), et le vidage de `pagehide` ouvrait une transaction IndexedDB — or une
transaction meurt avec la page. Rien ne le disait, et rien n'en restait.

| Défaut | Reproduction | Correction |
|---|---|---|
| **Le foyer créé à l'onboarding se perdait entier.** Recharger ou fermer dans la seconde après « Commencer » : l'app rouvrait sur la présentation, comme si rien n'avait eu lieu. | `sonde-persistance.mjs` — échouait avant, passe après | La première écriture part sans délai (`finishOnboarding` vide le writer aussitôt) — commit `9384414` |
| **Une saisie suivie d'une sortie rapide se perdait.** Ajouter une dépense puis quitter la page dans les 400 ms : la ligne n'existait plus au retour. | `sonde-saisie.mjs` — le cas « navigation immédiate » échouait, le cas « 800 ms après » passait : le formulaire était sain, la fenêtre ne l'était pas | Un filet **synchrone** en `localStorage` posé à la sortie de page, adopté au lancement suivant si la base est restée en retard (`persistence/rescue.ts`) — commit `6eb62ea` |

C'est très plausiblement l'origine du « l'app perd tout » : la perte de
l'onboarding coûtait le document entier au premier contact, et celle des
saisies rongeait la confiance une ligne à la fois — sans un mot à l'écran ni
rien à voir au retour.

## Ce qui fonctionne, mesuré

Quatre scripts, 42 vérifications, zéro erreur JavaScript sur l'ensemble.
Chaque vérification est sémantique : le prorata doit se recomposer au dixième,
les virements au centime.

**`parcours-argent.mjs` — l'argent, de zéro (11/11).** Onboarding d'un foyer
de deux avec revenus et loyer au pavé ; le mois s'ouvre avec ses trois
échéances et ses totaux ; la répartition fait le prorata (66,7 % / 33,3 %,
600 € / 300 €, total = pot) ; « réglé par » inscrit le prêt entre membres et le
déduit des virements (540 / 360 au centime) ; une charge du pot avancée par
quelqu'un se déduit sans s'attribuer (506,67 / 393,33) ; corriger la paie du
mois déplace la part de ce mois ; corriger le loyer « toute la règle » déplace
le pot et la règle ; supprimer puis rétablir rend la ligne ; le mois suivant
s'ouvre seul au nouveau prix.

**`parcours-ecrans.mjs` — tous les écrans, sur le jeu d'exemple (27/27).**
Les 21 écrans s'ouvrent et se nomment, calendrier, historique, récurrences,
épargne (vue, mois, supports, analyse, objectif), crédits, avances,
répartition, flux, personnes, catégories, simulation, réglages, saisies
rapides. La revue s'ouvre et confirmer avance d'une carte. La langue bascule
en anglais et revient. **L'export se réimporte sur un profil neuf** — le
fichier porte son `schemaVersion` et ses membres, et le foyer se retrouve
entier de l'autre côté : c'est la promesse du fichier lisible, tenue.

**`sonde-persistance.mjs` et `sonde-saisie.mjs` (4/4).** Les deux pertes
ci-dessus, rejouées au geste près — ce sont elles qui ont trouvé les défauts,
et elles restent en place pour qu'ils ne reviennent pas. Un test unitaire
garde chacun en plus (`store.test.ts`, `writer.test.ts`).

À côté de l'audit, les portes habituelles restent vertes : `npm run verify`
(2 106 tests unitaires, lint, classes, licences, build, budget de taille,
CSP) et les 29 scénarios `e2e/`.

## Ce qui a semblé cassé, et ne l'était pas

L'audit a d'abord accusé l'app à tort, cinq fois — chaque fausse piste est
documentée parce qu'elle ressemble exactement à un bug depuis un script, et
parfois depuis un doigt :

- **Le pavé lit les chiffres comme des centimes.** Taper « 2000 » donne
  20,00 € — comme un terminal de paiement, le séparateur se pose à deux
  chiffres de la fin. C'est un choix documenté (`ui/keypad.ts`), pas un défaut,
  et le montant s'affiche en grand pendant la frappe.
- **Les chiffres héros comptent en s'animant.** Lire le texte pendant la
  montée donne 379,28 au lieu de 900,00. Tout est neutralisé sous
  `prefers-reduced-motion` — le harnais le demande désormais.
- **`innerText` rend le texte après `text-transform`.** Les étiquettes de
  section se lisent « À CONFIRMER » : toute recherche de texte du harnais est
  insensible à la casse.
- **Chaque `goto` recharge l'app entière.** Lire la page pendant
  l'hydratation trouve l'écran de démarrage : on attend une ancre de l'écran
  avant de lire.
- **Les groupes du mois sont des `<details>` natifs, un seul ouvert.** Le
  jour courant s'ouvre seul (choix documenté, `EntriesSection.tsx`) ; les
  lignes du 1ᵉʳ demandent d'ouvrir leur groupe — l'en-tête est un `<summary>`,
  pas un bouton.

## Rejouer

```bash
npm run build
npx vite preview --port 4174 &
cd audit/fonctionnel
node sonde-persistance.mjs   # la donnée survit-elle à la sortie de page ?
node sonde-saisie.mjs        # une saisie survit-elle à une navigation immédiate ?
node parcours-argent.mjs     # l'argent, de zéro : onboarding → mois suivant
node parcours-ecrans.mjs     # tous les écrans, revue, langue, export → import
```

Chaque script écrit son relevé JSON à côté de lui et une capture par échec
(`échec-NN.png`). Comme le reste d'`audit/`, il relève — rien ici ne refuse un
commit.
