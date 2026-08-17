# Réglages GitHub

Ce que le dépôt contient ne suffit pas : la moitié de ce qui rend un projet ouvrable se règle dans l'interface de GitHub, et ne se commite pas. Cette page est la liste de ces réglages, avec les valeurs à copier telles quelles.

À faire une fois, dans l'ordre. Compter vingt minutes.

---

## 1. La fiche du dépôt

Page d'accueil du dépôt → **⚙️ à droite, sous « About »**.

### Description

Elle est lue dans les résultats de recherche, sur ton profil, et dans l'aperçu d'un lien partagé. GitHub la coupe à 350 caractères.

```
Suivi des finances du foyer, sans compte ni serveur : récurrences, prévision du mois, répartition des charges au prorata des revenus. Les données vivent dans le navigateur, rien ne sort de l'appareil. React + TypeScript, PWA hors ligne, en français.
```

Trois choses y sont volontairement présentes, dans cet ordre : **ce que ça fait**, **où vont les données** — c'est l'argument, autant qu'il soit dans les 250 premiers caractères — et **la pile technique**, parce que c'est ce sur quoi les gens filtrent.

### Website

```
https://toutcomptefait.xyz
```

Coche aussi **« Use your GitHub Pages website »** ? Non : le site est chez Vercel, l'URL ci-dessus suffit.

### Topics

Ils servent à deux choses : être trouvé par `topic:local-first`, et dire d'un coup d'œil ce qu'est le projet. GitHub en accepte **20 maximum**, en minuscules, sans accent, séparés par des tirets. En voici 20, du plus au moins parlant :

```
budget
finances-personnelles
budget-familial
household-budget
personal-finance
money-management
local-first
privacy-first
offline-first
no-backend
pwa
indexeddb
react
typescript
vite
tailwindcss
zustand
french
open-source
progressive-web-app
```

Les six premiers disent le domaine, les quatre suivants la philosophie — c'est par `local-first` et `privacy-first` qu'on tombe sur ce genre de projet — et le reste la pile. `french` compte : il n'y a pas grand-chose en français dans cette catégorie, c'est un angle plutôt qu'une limite.

### Cases sous la description

| Case | Valeur | Pourquoi |
|---|---|---|
| Releases | ✅ | Une fois la v1.0.0 publiée (§5) |
| Packages | ❌ | Rien n'est publié sur un registre |
| Deployments | ✅ | Vercel les remonte, ça montre que le projet est vivant |

---

## 2. Fonctionnalités — onglet Settings → General

| Réglage | Valeur | Pourquoi |
|---|---|---|
| **Issues** | ✅ activé | Les gabarits de `.github/ISSUE_TEMPLATE/` en dépendent |
| **Discussions** | ✅ **à activer** | ⚠️ `config.yml` y renvoie déjà : tant que c'est désactivé, le lien « Poser une question » du sélecteur d'issue tombe sur un 404 |
| **Wiki** | ❌ à désactiver | La doc est dans `docs/`, versionnée avec le code. Un wiki à côté diverge en trois mois, et c'est toujours lui qu'on lit |
| **Projects** | ❌ | Un tableau vide sur un projet à un mainteneur donne l'air abandonné |
| **Sponsorships** | au choix | Si tu l'actives, ajoute `.github/FUNDING.yml` |
| **Preserve this repository** | ✅ | Gratuit, archivage long terme |

### Pull Requests

| Réglage | Valeur | Pourquoi |
|---|---|---|
| Allow merge commits | ❌ | |
| **Allow squash merging** | ✅ | Un commit par PR, un historique lisible. Titre par défaut : **« Pull request title »** |
| Allow rebase merging | ❌ | |
| **Automatically delete head branches** | ✅ | Sans ça, les branches `claude/…` s'accumulent |
| Always suggest updating pull request branches | ✅ | |

---

## 3. Sécurité — onglet Settings → Advanced Security

Trois réglages, tous gratuits sur un dépôt public. Le premier n'est pas optionnel : **`SECURITY.md` renvoie vers un formulaire qui n'existe pas tant qu'il n'est pas activé.**

| Réglage | Valeur | Pourquoi |
|---|---|---|
| **Private vulnerability reporting** | ✅ **indispensable** | C'est le lien « Report a vulnerability » de `SECURITY.md`. Sans lui, une faille arrive dans une issue publique, ou n'arrive pas |
| **Dependabot alerts** | ✅ | Alerte sur une dépendance vulnérable |
| **Dependabot security updates** | ✅ | Ouvre la PR de correctif tout seul. Complémentaire de `.github/dependabot.yml`, qui ne fait que les mises à jour de routine |
| **Secret scanning** + **Push protection** | ✅ | Bloque la poussée d'une clé d'API. Le projet n'en a aucune, ce qui est exactement le moment de l'activer |
| **CodeQL** (Code scanning → Default setup) | ✅ recommandé | Analyse statique sur JS/TS à chaque PR, sans rien écrire |

---

## 4. Protéger `main` — Settings → Rules → Rulesets

Sur un projet à un mainteneur, exiger une PR pour chaque commit devient vite un frein qu'on finit par contourner. Le bon compromis : **laisser pousser, mais interdire de casser.**

**New ruleset → New branch ruleset**, nommé `main`, ciblant `Default branch`, avec :

- ✅ **Restrict deletions** : personne ne supprime `main`, toi compris ;
- ✅ **Block force pushes** : l'historique ne se réécrit pas ;
- ✅ **Require status checks to pass** → ajouter **`Vérification`** (le job de `.github/workflows/ci.yml`). Une PR rouge ne se fusionne pas ;
- ✅ **Require a pull request before merging** : à n'activer que le jour où quelqu'un d'autre pousse. Coche alors **Dismiss stale approvals**.

> Le nom du check est `Vérification`, avec l'accent : c'est le `name:` du job. > S'il n'apparaît pas dans la liste, c'est que la CI n'a pas encore tourné une > fois. Pousse, puis reviens le sélectionner.

### Actions — Settings → Actions → General

| Réglage | Valeur |
|---|---|
| Actions permissions | **Allow enterprise/owner actions, and select non-owner actions** → autoriser les actions vérifiées par GitHub |
| Workflow permissions | **Read repository contents permission** (lecture seule) |
| Allow GitHub Actions to create and approve pull requests | ❌ |

Le workflow déclare déjà `permissions: contents: read` de son côté : les deux réglages se doublent volontairement, celui du dépôt étant le filet.

---

## 5. Publier la version 1.0.0

Le `CHANGELOG.md` annonce une `v1.0.0` qui n'existe pas encore comme tag. Depuis la racine du dépôt, une fois cette branche fusionnée :

```sh
git checkout main
git pull origin main
git tag -a v1.0.0 -m "Première version publique"
git push origin v1.0.0
```

Puis **Releases → Draft a new release** → tag `v1.0.0`, titre `v1.0.0 — Première version publique`, et coller la section correspondante du `CHANGELOG.md` dans le corps.

Une release change trois choses : le dépôt cesse d'avoir l'air d'un chantier, on peut pointer une version précise dans un rapport de bug, et les liens de comparaison du changelog fonctionnent.

---

## 6. Les libellés d'issues

Les gabarits posent les libellés `bug` et `proposition`. Le premier existe par défaut, le second non : à créer, avec le reste en français. **Issues → Labels**, ou en une fois si tu as la CLI `gh` :

```sh
gh label create proposition --color 0E8A16 --description "Une évolution proposée, à discuter avant tout code" --force
gh label create "hors périmètre" --color 6C757D --description "Recevable, mais exclu par la section 2 du cahier des charges" --force
gh label create "design system" --color 8478F2 --description "Touche à l'apparence ou aux tokens" --force
gh label create accessibilité --color 5319E7 --description "Contraste, clavier, lecteur d'écran, cibles tactiles" --force
gh label create données --color 1D76DB --description "Modèle, migration de schéma, export/import" --force
gh label create "bonne première issue" --color 7057FF --description "Bon point d'entrée pour une première contribution" --force

gh label delete enhancement --yes
gh label delete "good first issue" --yes
gh label delete "help wanted" --yes
```

Les trois suppressions correspondent aux libellés anglais remplacés. Garder `bug`, `documentation`, `duplicate`, `invalid`, `question`, `wontfix` : ils sont compris de tout le monde et déjà appliqués par les gabarits.

---

## 7. L'image de partage

**Settings → General → Social preview.** Sans elle, un lien partagé sur Slack, Discord, Mastodon ou LinkedIn affiche un carré gris générique.

Format **1280 × 640 px**, PNG. Le plus juste ici, vu le design system : le fond sapin `#2F5D4C`, « Tout compte fait » en Archivo, la baseline « Le suivi des finances du foyer, sans compte ni serveur », et l'anneau du mois.

Le raccourci qui marche tout de suite : recadrer [`public/captures/mois-sombre.png`](../public/captures/mois-sombre.png) au format demandé. C'est déjà l'écran du mois en thème sombre, sur le jeu d'exemple. C'est le seul endroit où montrer le produit plutôt que le dire.

---

## 8. Vérifier que tout est en place

**Insights → Community Standards** liste ce que GitHub attend d'un dépôt public. Après cette branche, les six lignes doivent être vertes :

| Ligne | Fichier |
|---|---|
| Description | §1 ci-dessus |
| README | `README.md` |
| Code of conduct | `CODE_OF_CONDUCT.md` |
| Contributing | `CONTRIBUTING.md` |
| License | `LICENSE` |
| Security policy | `SECURITY.md` |
| Issue templates | `.github/ISSUE_TEMPLATE/` |
| Pull request template | `.github/PULL_REQUEST_TEMPLATE.md` |

---

## Ce qui reste facultatif

- **`.github/FUNDING.yml`** : seulement si les sponsors sont activés.
- **Un dépôt `.github` sur ton profil** : pour partager les mêmes gabarits entre plusieurs projets. Inutile tant qu'il n'y en a qu'un.
- **`CITATION.cff`** : pour un projet cité dans des publications. Sans objet ici.
- **Une traduction anglaise du README** : le français est un choix assumé. Si tu changes d'avis un jour, la forme habituelle est un `README.en.md` avec un sélecteur en haut des deux fichiers, pas une traduction du dépôt entier.
