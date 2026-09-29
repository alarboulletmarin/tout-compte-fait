# Tout Compte Fait — refonte v1

On repart de zéro. L'ancienne app (budget, projections, épargne) est abandonnée. La v1 fait une seule chose, bien : **répartir les charges fixes d'un foyer de deux personnes au prorata de leurs revenus, et dire à chacun combien virer sur le compte joint.**

Ce document est la source de vérité pour toute la refonte. Les maquettes sont dans `design/maquettes/` (voir la section Design).

---

## 1. Contrat produit (non négociable)

- Gratuit, sans compte, sans serveur, sans cloud, sans pistage, sans pub.
- 100 % front, hors ligne, installable (PWA).
- Les données restent sur l'appareil (IndexedDB). Seule sortie : export/import d'un fichier JSON et partage du récap en texte.
- Licence AGPL-3.0.

## 2. Stack et conventions

Suivre le skill `pwa-front-only` s'il est disponible. À défaut :

- Vite + React + TypeScript (strict), pnpm, `vite-plugin-pwa`.
- CSS pur (custom properties), aucune lib de style.
- Peu de dépendances, légères, uniquement si nécessaire. Candidats acceptables : `idb` (IndexedDB), un routeur léger.
- i18n FR/EN dès le départ (FR par défaut). Thèmes clair / sombre / système.
- Navigation en bas de l'écran sur mobile ; mobile first mais responsive (tablette, desktop).
- Icônes : SVG inline au trait, dessinées à la main comme dans les maquettes. Ni Material, ni Lucide, jamais d'emoji.
- Code en anglais, commentaires en français et peu verbeux.
- Polices auto-hébergées (l'app doit marcher hors ligne) : Geist (interface) et Martian Mono (tous les montants).
- Toast « Nouvelle version disponible · Recharger » à chaque mise à jour du service worker.
- Changelog tenu (CHANGELOG.md) et affiché dans l'écran Nouveautés.
- Accessibilité : viser WCAG AA. L'information ne passe jamais par la couleur seule (formes, texte, icônes).

## 3. Règles métier

### Données

- **Foyer** : exactement 2 membres. Chacun a un prénom et un revenu net mensuel (après impôt, hors primes et 13e mois).
- **Comptes** : 3 comptes implicites, pas de saisie : le compte joint, le compte du membre 1, le compte du membre 2.
- **Charge fixe** : libellé, montant, fréquence (mensuelle, trimestrielle, annuelle), compte qui paie, catégorie (optionnelle).
- **Catégories** : liste modifiable (ajout, renommage, suppression). Supprimer une catégorie ne supprime pas ses charges : elles passent en « Sans catégorie ». Catégories par défaut : Logement, Énergie, Eau, Internet & téléphone, Assurances, Abonnements, Transport, Divers.

### Calcul (tout en centimes, entiers)

1. **Équivalent mensuel** d'une charge = montant ÷ nombre de mois (1, 3 ou 12).
2. **T** = somme des équivalents mensuels de toutes les charges.
3. **Parts** : `part_i = revenu_i / (revenu_1 + revenu_2)`.
   Si un revenu est à 0 ou non renseigné → 50 / 50, avec un message qui le dit.
4. **Dû** : `dû_i = T × part_i`, arrondi au centime de sorte que `dû_1 + dû_2 = T` exactement (méthode du plus fort reste).
5. **Payé en direct** : `payé_i` = somme des charges payées depuis le compte perso du membre i.
6. **Virement vers le joint** : `v_i = dû_i − payé_i`.
   Invariant à tester : `v_1 + v_2 = J`, où J est la somme des charges payées par le compte joint.
7. **Virement négatif.** Si `v_i < 0`, le membre i paie déjà plus que sa part.
   Il ne vire rien. L'autre membre vire J sur le joint, plus `|v_i|` directement au membre i.
   (Exemple des maquettes : Lui paie le loyer de son compte. Il ne vire rien, et Elle vire 42,98 € sur le joint + 622,69 € à Lui.)

### Jeu de données de référence (pour les tests)

Revenus : 2 300 € et 1 948 € (parts 54,1 % et 45,9 %).

| Charge | Montant | Payé depuis |
|---|---|---|
| Loyer | 1 431,29 € | joint |
| Électricité | 45,00 € | membre 1 |
| Gaz | 28,00 € | membre 1 |
| Freebox | 34,99 € | membre 1 |
| Netflix | 7,99 € | membre 1 |
| Assurance auto | 81,00 € | membre 2 |

Résultats attendus :

| Grandeur | Valeur |
|---|---|
| T | 1 628,27 € |
| Dû, membre 1 | 881,60 € |
| Dû, membre 2 | 746,67 € |
| Virement, membre 1 | 765,62 € |
| Virement, membre 2 | 665,67 € |
| Somme des virements | 1 431,29 € (= loyer) |

## 4. Design

Référence de style : le minimalisme de time.fyi. Sobre, monochrome, pas d'ornement.

L'identité tient à **un seul levier : Martian Mono pour tous les montants.** Ne rien ajouter d'autre (pas de serif, pas de dégradés, pas d'illustrations décoratives).

### Maquettes

`design/maquettes/*.dc.html` contient le source HTML de chaque écran (thème clair), exporté de Claude Design. `_index.txt` liste chaque fichier avec le nom de son écran.

- Ces fichiers dépendent d'un runtime (`support.js`) absent ici. **Ne pas les exécuter ni copier leur runtime.** Les lire comme référence exacte : structure, textes, tailles, espacements, couleurs.
- Le thème sombre existe pour tous les écrans. Il s'obtient en remplaçant les tokens ci-dessous. `Main.dc.html` contient les deux palettes dans son script.

### Tokens

| Token | Clair | Sombre |
|---|---|---|
| `--bg` | #F5F4F1 | #0F0F0F |
| `--surface` | #FFFFFF | #181818 |
| `--ink` | #111110 | #EDECE8 |
| `--muted` | #5F5D59 | #A09E99 |
| `--line` | #E4E2DD | #2A2A2A |
| `--soft` | #ECEAE5 | #222222 |
| `--danger` | #A1260D | #FF8A70 |
| overlay | rgba(17,17,16,.45) | rgba(0,0,0,.6) |

Autres constantes :

- Rayons : 10 px (champs, petits boutons), 12 px (boutons), 14 px (cartes, listes), 16 px (grandes cartes), 22 px (feuilles du bas).
- Cibles tactiles : 44 px minimum.
- Chiffres : Martian Mono. Tailles de référence : 36 px pour les virements, 32 à 36 px pour les totaux, 15 px dans les listes.

### Code des formes (partout)

- **Rond plein** : membre 1.
- **Carré plein** : membre 2.
- **Losange au trait** : compte joint.

Dans la barre de répartition, la part du membre 2 est **hachurée**. Partout où les formes apparaissent sans texte, une légende est visible.

## 5. Écrans (fichier de maquette → phase)

| Écran | Fichier | Phase |
|---|---|---|
| Virements (accueil de l'app) | Main | 3 |
| Détail du calcul | Detail | 3 |
| Charges fixes | Charges | 3 |
| Charge annuelle dans la liste | ChargesAnnuelle | 3 |
| Nouvelle charge | Ajout | 3 |
| Modifier une charge | Modifier | 3 |
| Confirmer la suppression, avec l'impact sur les virements | Suppression | 3 |
| Après suppression, toast Annuler | ChargesApres | 3 |
| Foyer (prénoms, revenus) | Foyer | 3 |
| Catégories | Categories | 3 |
| Premier lancement 1/2 | Onboarding | 4 |
| Premier lancement 2/2 | Onboarding2 | 4 |
| Virements vide | MainEmpty | 4 |
| Charges vide | ChargesEmpty | 4 |
| Virement négatif | Negatif | 4 |
| Erreurs du formulaire | AjoutErreurs | 4 |
| Revenu à 0 | FoyerZero | 4 |
| Réglages | Reglages | 5 |
| Confirmer l'import | ImportConfirm | 5 |
| Import impossible | ImportErreur | 5 |
| Tout effacer | Effacer | 5 |
| Envoyer le récap | Recap | 5 |
| Mise à jour disponible | MiseAJour | 5 |
| Nouveautés | Nouveautes | 5 |
| Installer sur iPhone | InstallIOS | 5 |
| Tablette | Tablette | 6 |
| Desktop | Desktop | 6 |
| Version anglaise | MainEN | 6 |
| Landing desktop | Landing | 6 |
| Landing mobile | LandingMobile | 6 |

## 6. Phases

Une phase = une PR. Chaque phase se termine avec :

- lint et typecheck au vert ;
- tests au vert ;
- une courte note de ce qui a été fait et de ce qui reste ;
- un arrêt pour validation avant la phase suivante.

### Phase 0 — Remise à zéro

- Archiver l'ancienne app sur une branche `legacy` et un tag.
- Repartir d'un `main` propre : scaffold Vite + React + TS + `vite-plugin-pwa`, ESLint, Prettier, Vitest.
- `CLAUDE.md` résumant ce document.
- Structure de dossiers :
  - `src/domain` : calcul pur, aucun import React ;
  - `src/storage` ;
  - `src/ui` ;
  - `src/screens` ;
  - `src/i18n`.

### Phase 1 — Domaine

- Types : `Household`, `Member`, `Charge`, `Category`, `Frequency`, `AccountRef`.
- Fonction pure `computeSplit(household, charges)` qui renvoie : T, parts, dûs, payés, virements, et l'éventuel remboursement direct.
- Tests Vitest :
  - le jeu de référence (section 3) ;
  - le virement négatif ;
  - un revenu à 0 → 50 / 50 ;
  - les fréquences trimestrielle et annuelle ;
  - la liste vide ;
  - l'invariant `Σv = J`, avec des tests de propriété sur des montants aléatoires ;
  - l'arrondi au centime, qui doit tomber juste.

### Phase 2 — Stockage

- IndexedDB via `idb`, avec un schéma versionné et des migrations.
- Export JSON : `{ app: "tout-compte-fait", schemaVersion, exportedAt, data }`.
- Import : validation stricte. Refuser tout fichier invalide sans toucher aux données existantes.
- Tout effacer.
- Tests sur la sérialisation, la validation et le rejet des fichiers invalides.

### Phase 3 — Design system et écrans cœur

- Tokens CSS clair et sombre, thème système par défaut, Geist et Martian Mono auto-hébergées.
- Composants :
  - bouton, champ, sélecteur segmenté ;
  - pastilles (chips) ;
  - feuille du bas (bottom sheet) accessible : focus piégé, fermeture avec Échap, `aria-modal` ;
  - toast ;
  - barre de navigation ;
  - marqueurs de forme.
- Écrans de la phase 3 (section 5), branchés sur le domaine et le stockage.
- La suppression passe par une confirmation qui montre l'impact sur les virements, puis un toast avec Annuler.

### Phase 4 — Premier lancement, états vides, cas particuliers

- Onboarding en 2 étapes. L'étape 2 affiche un aperçu des virements en direct.
- États vides.
- Virement négatif.
- Erreurs de formulaire : `aria-invalid`, `aria-describedby`, icône + texte.
- Revenu à 0.

### Phase 5 — Réglages et PWA

- Réglages :
  - thème ;
  - langue ;
  - catégories ;
  - export, import, « Envoyer vers… » (Web Share API avec le fichier, repli sur un téléchargement) ;
  - tout effacer ;
  - nouveautés, code source, licence.
- Envoyer le récap : Web Share API en texte, repli sur « Copier ».
- Service worker : hors ligne complet, toast de mise à jour, aide à l'installation sur iOS (affichée une fois, désactivable).

### Phase 6 — Responsive, anglais, landing, finitions

- Mise en page tablette (2 colonnes) et desktop (barre latérale + grille) d'après les maquettes.
- Traduction anglaise complète.
- Landing desktop et mobile. L'app vit sous `/app` ou sur un sous-domaine, à trancher en début de phase.
- Audit d'accessibilité (clavier, lecteur d'écran, contrastes dans les deux thèmes).
- Lighthouse PWA et performance.
- Déploiement Vercel sur toutcomptefait.xyz.

## 7. Hors périmètre v1

- Historique mois par mois.
- Dépenses variables ou ponctuelles.
- ~~Synchronisation entre appareils (QR animé, parent/enfant).~~ Ajoutée depuis : l'appareil parent affiche un QR animé, l'enfant le filme et remplace ses données (Réglages › Autre appareil).
- Épargne et projections.
- Plus de 2 membres.
