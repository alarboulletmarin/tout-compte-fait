<!--
Merci pour ta proposition.

Rappel utile avant d'aller plus loin : ce dépôt est un projet personnel ouvert. Les PR ne sont pas refusées par principe, mais le périmètre est fixé par le cahier des charges et l'apparence par le design system. Si ta PR n'est rattachée à aucune issue discutée, elle risque d'être refusée sur le périmètre plutôt que sur le code, ce serait dommage pour le travail déjà fait.

CONTRIBUTING.md dit tout ça en détail.
-->

## Ce que ça change

<!-- Pour un utilisateur de l'app, pas pour le code. Une ou deux phrases. -->

## Pourquoi

<!-- Le problème réglé. Si une issue le décrit : « Résout #123 ». -->

## Comment

<!--
L'approche retenue, et surtout celles écartées et pourquoi : c'est ce qui
     se perd le plus vite, et c'est ce qui manque le plus à la relecture.
-->

## Vérifications

- [ ] `npm run verify` passe (typecheck, lint, tests, build)
- [ ] La logique métier ajoutée ou modifiée est couverte par des tests
- [ ] Aucun texte en dur : les chaînes sont dans `src/i18n/fr.ts`
- [ ] Aucun token de palette (`var(--pine-500)`) dans un composant
- [ ] Aucun import direct de Phosphor hors de `src/ui/Icons.tsx`
- [ ] Aucun flottant dans un calcul financier (centimes et points de base entiers)
- [ ] Relu dans les deux thèmes, et de 320px à desktop si l'UI change

## Captures

<!-- Si l'interface change : avant / après, thème clair et thème sombre. -->
