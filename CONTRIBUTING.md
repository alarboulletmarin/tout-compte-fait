# Contribuer

Merci de t'y intéresser. Avant tout, une mise au point honnête sur ce qu'est ce
dépôt, pour que personne ne perde son temps.

## Ce que ce projet est, et ce qu'il n'est pas

**Tout compte fait est un projet personnel dont le code est ouvert.** Il est
publié sous licence AGPL-3.0 : ouvert parce qu'un budget familial qui prétend ne
rien envoyer nulle part doit pouvoir le prouver — c'est-à-dire se laisser lire
—, et sous copyleft parce qu'il n'y a aucune raison qu'il se referme chez
quelqu'un d'autre.

Ce n'est pas un projet communautaire cherchant à s'agrandir. Concrètement :

- **Les rapports de bug sont précieux** et seront lus. C'est la contribution la
  plus utile.
- **Les questions sont les bienvenues** — sur le fonctionnement de l'app comme
  sur un choix de code.
- **Les pull requests ne sont pas activement recherchées.** Elles ne sont pas
  refusées par principe, mais le périmètre est fixé par le
  [cahier des charges](docs/CAHIER-DES-CHARGES.md) et l'apparence par le
  [design system](docs/DESIGN-SYSTEM.md). Une PR qui les contredit sera refusée,
  même bien écrite — d'où la règle qui suit.
- **Le fork est légitime et encouragé.** Si ta vision diverge, la licence est là
  pour ça : forke, renomme, pars. C'est un usage parfaitement normal, pas un
  échec. L'AGPL n'y met qu'une condition — ton fork reste ouvert lui aussi, y
  compris si tu te contentes de le mettre en ligne.

## Signaler un bug

[Ouvre une issue](https://github.com/alarboulletmarin/tout-compte-fait/issues/new/choose)
avec le gabarit « Bug ». Ce qui aide vraiment :

- ce que tu faisais, ce que tu attendais, ce qui s'est passé ;
- le navigateur, sa version, et l'appareil ;
- une capture, si c'est visuel.

**N'attache jamais ton fichier de données exporté.** Il contient tes revenus,
tes crédits et le prénom des gens avec qui tu partages. Si le bug ne se reproduit qu'avec
des données particulières, décris leur *forme* — « une récurrence mensuelle au
31 avec un montant variable » — ou reproduis-le sur le jeu d'exemple.

## Proposer une fonctionnalité

**Ouvre une issue avant d'écrire du code.** Une proposition se discute d'abord
contre le périmètre : le cahier des charges dit ce qui est dans la v1, et sa
section 2 dit explicitement ce qui n'y est pas — comptes bancaires multiples,
import de relevés, budgets par enveloppe, multi-devise. Ces exclusions sont des
décisions, pas des oublis.

Une bonne proposition dit le **problème** avant la solution : « je n'arrive pas
à savoir X » vaut mieux que « ajoutez un bouton Y ».

## Si tu ouvres quand même une pull request

Elle doit tenir sur cinq points.

1. **`npm run verify` passe.** Typecheck, lint, tests, build, et le budget de
   taille du premier chargement. C'est la porte de sortie, et l'intégration
   continue la rejoue à l'identique.
2. **Elle respecte les deux documents.** Le cahier des charges pour le
   comportement, le design system pour l'apparence. Aucun `var(--pine-500)` dans
   un composant, aucun texte en dur hors des catalogues de `src/i18n/`, aucun
   import direct de Phosphor hors de `src/ui/Icons.tsx`.
3. **Une chaîne ajoutée l'est dans les deux langues.** `src/i18n/fr.ts` décrit la
   forme d'un catalogue — le type en est dérivé —, donc une clé qui manque à
   `src/i18n/en.ts` ne compile pas, et tu le sauras avant de pousser. Deux règles
   que le compilateur ne peut pas tenir à ta place : **rien ne lit `t` à
   l'évaluation d'un module** (un tableau de libellés construit au chargement
   fige la langue du démarrage — voir `src/i18n/strings.ts`), et ce qui n'est pas
   un mot mais une **règle de langue** — séparateur décimal, place du symbole,
   ordinal d'un jour — va dans `src/i18n/format.ts`, jamais dans une chaîne.
4. **La logique métier est testée.** Tout ce qui touche à `src/domain/` est du
   calcul pur : ça se teste, et ça se teste avant d'être écrit si tu veux.
5. **Elle fait une seule chose.** Une PR qui corrige un bug *et* refactorise
   deux modules ne se relit pas.

### Conventions

- **Tout est en français** : le code, les commentaires, les commits, les issues.
  Les identifiants de code restent en anglais quand c'est l'usage (`direction`,
  `money`, `openMonth`) — c'est la prose qui est française. Cela vaut aussi dans
  `src/i18n/en.ts` : le catalogue anglais porte des commentaires français, comme
  le reste du dépôt.
- **L'interface, elle, se dit dans les deux langues.** Le français est celle par
  défaut et celle qui fait référence : c'est `src/i18n/fr.ts` qui porte, clé par
  clé, *pourquoi* telle formule a été choisie plutôt qu'une autre. La traduction
  ne recopie pas ce rationale — ces raisons valent pour les deux langues, et les
  redire en ferait deux exemplaires dont l'un finirait faux. On ne commente en
  anglais que ce qui est propre à l'anglais.
- **Le message de commit dit ce que le commit change pour l'utilisateur**, à
  l'indicatif présent, sans préfixe de type. L'historique existant donne le ton :
  « Supprimer supprime, confirmer se défait, et le mois arrête de mentir »,
  « Une tuile dit au coin ce que le clic va faire ».
- **Les commentaires expliquent pourquoi, jamais quoi.** Un commentaire qui
  paraphrase la ligne en dessous est du bruit ; un commentaire qui dit quelle
  autre approche a été essayée et pourquoi elle échouait vaut de l'or.
- **Aucun flottant ne touche un calcul financier.** Les montants sont des
  centimes entiers, les taux des points de base entiers. C'est une règle dure.

## Mettre en place son environnement

Node 22.12 ou plus récent.

```sh
npm install
npm run dev       # serveur de développement
npm run verify    # ce que la CI va rejouer
npm run test:watch
```

`/styleguide` rend chaque token et chaque composant dans les deux thèmes : c'est
là qu'on vérifie qu'un composant nouveau ressemble aux autres.

L'[architecture](docs/ARCHITECTURE.md) explique où vivent les choses et pourquoi
elles y vivent. Elle vaut la lecture avant la première ligne de code.

## Sécurité

Une faille ne se signale pas dans une issue publique — la marche à suivre est
dans [SECURITY.md](SECURITY.md).

## Comportement

Le [code de conduite](CODE_OF_CONDUCT.md) s'applique partout dans le dépôt.
