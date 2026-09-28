# Tout compte fait — v1

Source de vérité : `REFONTE-V1.md`. Ce fichier n'en est que le résumé ; en cas de doute, c'est lui qui tranche.

## Le produit

Répartir les charges fixes d'un foyer de **deux** personnes au prorata de leurs revenus, et dire à chacun combien virer sur le compte joint.

- Gratuit, sans compte, sans serveur, sans pistage. 100 % front, hors ligne, PWA installable.
- Données sur l'appareil (IndexedDB). Seules sorties : export/import JSON, partage du récap en texte.
- AGPL-3.0. Hors périmètre v1 : historique mensuel, dépenses variables, synchro, épargne, plus de 2 membres.

## Stack

Vite + React + TypeScript strict, pnpm, `vite-plugin-pwa`, Vitest, ESLint, Prettier.
CSS pur (custom properties), aucune lib de style. Dépendances rares et légères (`idb`, routeur léger au besoin).
i18n FR (défaut) / EN. Thèmes clair / sombre / système. Polices auto-hébergées : Geist (UI), Martian Mono (tous les montants).
Icônes SVG inline au trait, faites main. Jamais Material, Lucide ni emoji.

Code en anglais, commentaires en français, courts.

```bash
pnpm dev | pnpm build | pnpm lint | pnpm typecheck | pnpm test | pnpm format
```

## Structure

- `index.html` : landing statique, montrée à la première visite seulement (`public/boot/landing.js`).
- `app/index.html` : l'app, servie sous `/app` (routeur, service worker et manifeste limités à `/app/`).
- `vercel.json` : réécriture `/app/*` et en-têtes de sécurité, repris par `vite preview`.

- `src/domain` : calcul pur. Aucun import React, navigateur ni `idb` (règle ESLint).
- `src/storage` : IndexedDB, export/import.
- `src/ui` : composants du design system.
- `src/screens` : écrans.
- `src/i18n` : traductions.

## Règles métier

- Foyer = 2 membres (prénom, revenu net mensuel). 3 comptes implicites : joint, membre 1, membre 2.
- Charge : libellé, montant, fréquence (1, 3 ou 12 mois), compte payeur, catégorie optionnelle.
  Supprimer une catégorie laisse ses charges « Sans catégorie ».

Calcul en **centimes entiers** :

1. T = Σ équivalents mensuels (montant ÷ nb de mois).
2. part_i = revenu_i / (revenu_1 + revenu_2) ; revenu à 0 ou vide → 50/50, avec un message.
3. dû_i = T × part_i, plus fort reste pour que dû_1 + dû_2 = T.
4. payé_i = charges payées depuis le compte perso de i.
5. v_i = dû_i − payé_i. Invariant : v_1 + v_2 = J (charges payées par le joint).
6. Si v_i < 0 : i ne vire rien ; l'autre vire J sur le joint et |v_i| directement à i.

Jeu de référence (tests) : revenus 2 300 / 1 948 → T 1 628,27, dûs 881,60 / 746,67, virements 765,62 / 665,67.

## Design

Maquettes : `design/maquettes/*.dc.html` (index dans `_index.txt`). Référence exacte à lire, **jamais exécuter ni copier leur runtime**.
Minimalisme monochrome façon time.fyi. Seul levier d'identité : Martian Mono pour les montants.
Tokens clair/sombre dans `REFONTE-V1.md` §4. Formes : rond plein = membre 1, carré plein = membre 2, losange au trait = joint ; part du membre 2 hachurée. L'information ne passe jamais par la couleur seule (WCAG AA). Cibles tactiles ≥ 44 px.

## Méthode

Une phase à la fois (`REFONTE-V1.md` §6), un commit par phase sur la branche `v1`, arrêt pour validation.
Fin de phase : lint, typecheck et tests au vert, courte note fait/reste.
L'ancienne app est archivée sur la branche `legacy` et le tag `legacy-final`.
