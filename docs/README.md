# Documentation

Trois documents, trois questions. Chacun fait autorité sur la sienne : quand
le code et l'un d'eux divergent, c'est un bug — dans le code ou dans le
document, mais c'est un bug.

| Document | Répond à |
|---|---|
| [Design system](DESIGN-SYSTEM.md) | De quoi elle a l'air. Couleur, typographie, grille, composants, plancher de qualité. |
| [Architecture](ARCHITECTURE.md) | Comment le code est rangé, et pourquoi. Les décisions structurantes et leurs raisons. |
| [Déploiement](DEPLOIEMENT.md) | Comment la mettre en ligne, chez Vercel ou ailleurs. |

Deux autres s'adressent au seul mainteneur :
[**Réglages GitHub**](REGLAGES-GITHUB.md) — la moitié de ce qui rend un projet
ouvrable ne se commite pas. Description, topics, signalement privé des failles,
protection de `main`, libellés : la liste, avec les valeurs à copier. Et
[**Captures**](CAPTURES.md) — où vivent les images, ce qu'elles servent, et
comment les refaire.

À la racine du dépôt, quatre autres fichiers répondent aux questions qu'on se
pose en arrivant : [CONTRIBUTING](../CONTRIBUTING.md) pour proposer quelque
chose, [CODE_OF_CONDUCT](../CODE_OF_CONDUCT.md) pour savoir comment on se parle,
[SECURITY](../SECURITY.md) pour signaler une faille, et
[CHANGELOG](../CHANGELOG.md) pour ce qui a changé.

Enfin, deux livrables ne sont pas des fichiers mais des écrans, parce qu'un
document qui décrit une couleur ment plus vite que la couleur elle-même :

- **`/styleguide`** — chaque token, chaque échelle typographique et chaque
  composant, dans les deux thèmes, rendus par le code de production.
- **`/a-propos`** — ce que l'app dit d'elle-même, avec sa version, son dépôt et
  sa licence.
