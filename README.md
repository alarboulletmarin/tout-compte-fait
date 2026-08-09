<div align="center">

# Tout compte fait

**Le suivi de tes finances, sans compte et sans serveur.**
Les données vivent dans le navigateur. Rien ne sort de l'appareil.

[![CI](https://github.com/alarboulletmarin/tout-compte-fait/actions/workflows/ci.yml/badge.svg)](https://github.com/alarboulletmarin/tout-compte-fait/actions/workflows/ci.yml)
[![Licence AGPL-3.0](https://img.shields.io/badge/licence-AGPL--3.0-2F5D4C)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-installable-2F5D4C)](#installation-sur-le-t%C3%A9l%C3%A9phone)

[**Ouvrir l'app**](https://toutcomptefait.xyz) · [Documentation](docs/) · [Contribuer](CONTRIBUTING.md)

![L'écran du mois, en thème sombre](public/captures/mois-sombre.png)

</div>

---

## Ce que c'est

Une app de budget familial qui tient dans un onglet. On y déclare ses
récurrences — salaires, loyer, abonnements, mensualités de crédit — et chaque
mois s'ouvre tout seul en prévision, qu'on confirme au fil de l'eau. Le reste
suit : capacité d'épargne, capital restant dû, répartition des charges communes
au prorata des revenus.

- **Récurrences** à montant fixe ou variable, dépenses et recettes ponctuelles.
- **Prévu puis confirmé** — le mois est une prévision qu'on valide, pas un
  formulaire à remplir.
- **Répartition au prorata des revenus**, avec régularisation du mois suivant
  quand une charge commune a été avancée par une seule personne.
- **Crédits** avec capital restant dû calculé, jamais stocké.
- **Épargne** : capacité, ventilation par support, reste à placer.
- **Historique** et comparatifs mois/mois et année/année.
- **Export / import** du fichier de données, thème clair et sombre, hors ligne.

<table>
<tr>
<td width="62%"><img src="public/captures/mois-clair.png" alt="L'écran du mois en thème clair"></td>
<td width="38%"><img src="public/captures/mois-mobile.png" alt="L'écran du mois sur téléphone"></td>
</tr>
<tr>
<td align="center"><em>Le même écran en thème clair</em></td>
<td align="center"><em>Sur téléphone</em></td>
</tr>
</table>

## Où vont les données

Nulle part. Il n'y a ni compte, ni serveur, ni analytics, ni cookie tiers : le
document vit en IndexedDB dans le navigateur, et l'app fonctionne en mode avion.
Personne — auteur compris — ne peut lire ces données.

La contrepartie est réelle et il faut la connaître : **vider les données du
navigateur efface tout**, et rien ne se synchronise entre deux appareils.
D'où l'export, un fichier JSON qu'on range où l'on veut, et le rappel qui le
propose tous les trente jours.

## Démarrer

Node 22.12 ou plus récent.

```sh
git clone https://github.com/alarboulletmarin/tout-compte-fait.git
cd tout-compte-fait
npm install
npm run dev
```

| Commande | Effet |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` | build de production |
| `npm run preview` | sert le build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run size` | ce que pèse le premier chargement, et son budget |
| `npm run licences` | régénère les notices des paquets qui voyagent dans le build |
| `npm run verify` | les six d'un coup — c'est la porte de sortie |
| `npm run e2e:install` | télécharge Chromium, une fois (~150 Mio) |
| `npm run e2e` | les scénarios de bout en bout, sur l'app construite |

`verify` ne demande que Node ; `e2e` demande en plus un navigateur, et reste donc
à côté plutôt que dedans. La CI joue les deux, en parallèle, avec ces
commandes-là et pas d'autres.

Rien à configurer : aucune variable d'environnement, aucune clé d'API. Pour voir
l'app pleine plutôt que vide, **Plus → Exporter / importer → Jeu d'exemple →
Charger l'exemple**
monte **cinq ans** de données à partir d'aujourd'hui — c'est ce qu'on voit sur
les captures ci-dessus. Cinq ans, parce qu'une durée n'est pas une quantité :
c'est ce qu'il faut pour qu'un crédit aille à son terme et qu'un autre le
remplace, pour qu'un foyer locataire achète, pour qu'un alternant devienne
salarié et fasse basculer le partage des charges communes.

### Installation sur le téléphone

C'est une PWA : ouvrir [toutcomptefait.xyz](https://toutcomptefait.xyz), puis
« Ajouter à l'écran d'accueil » — sur Chrome et Edge, la page de présentation le
propose d'elle-même. Elle s'ouvre ensuite en plein écran et fonctionne hors
ligne.

**Sur iPhone, ce n'est pas un confort.** Safari efface les données d'un site non
installé après environ sept jours sans visite, et les données de cette app-ci
sont dans le navigateur. Installée, elle les garde. Le geste est
« Partager → Sur l'écran d'accueil ».

## Pile technique

React 19 · TypeScript · Vite · Tailwind CSS 4 · zustand · IndexedDB (`idb`) ·
Vitest · vite-plugin-pwa.

Aucune librairie de graphiques : l'anneau, les barres et les courbes sont des
composants SVG maison. Aucun backend, donc aucun coût de fonctionnement.

Douze paquets voyagent dans la version publiée : six sous MIT, un sous ISC, et
les deux fontes — Archivo et Geist Mono — sous **SIL Open Font License 1.1**,
qui demande d'être distribuée avec elles. Leurs notices intégrales sont dans
[`public/licences-tierces.txt`](public/licences-tierces.txt), produit par
`npm run licences` depuis `node_modules` et servi avec l'app. `npm run verify`
échoue s'il a pris du retard : une liste de licences recopiée à la main diverge
au premier `npm update`, et c'est celle qu'on ne relit jamais qui reste fausse.

## Accessibilité

Le [cahier des charges](docs/CAHIER-DES-CHARGES.md#5-contraintes-techniques)
vise le niveau **AA** : contraste sur tout texte, focus clavier visible,
`prefers-reduced-motion` respecté, graphiques doublés d'une lecture textuelle.
Les écarts sont mesurés, tabulés et justifiés dans
[l'architecture](docs/ARCHITECTURE.md#écarts-au-design-system) — un contraste
annoncé et non tenu vaut moins qu'un écart assumé.

Aucune obligation réglementaire ne s'applique ici : le RGAA vise le secteur
public et les très grandes entreprises, et l'European Accessibility Act les
services fournis aux consommateurs. C'est une exigence du projet, pas une
conformité subie.

## Documentation

| Document | Répond à |
|---|---|
| [Cahier des charges](docs/CAHIER-DES-CHARGES.md) | Ce que l'app fait, et ce qu'elle ne fera pas |
| [Design system](docs/DESIGN-SYSTEM.md) | De quoi elle a l'air |
| [Architecture](docs/ARCHITECTURE.md) | Comment le code est rangé, et pourquoi |
| [Déploiement](docs/DEPLOIEMENT.md) | Comment la mettre en ligne |

Le cahier des charges et le design system sont la **source de vérité** : le code
leur obéit, et un écart est un bug. Les écarts assumés sont listés, mesurés et
justifiés dans [l'architecture](docs/ARCHITECTURE.md#écarts-au-design-system).

## Contribuer

C'est un projet personnel dont le code est ouvert : les rapports de bug sont
lus et bienvenus, les propositions de fonctionnalité passent par une issue avant
tout code. Tout est dit dans [CONTRIBUTING.md](CONTRIBUTING.md), et la marche à
suivre pour signaler une faille dans [SECURITY.md](SECURITY.md).

Le code, les commits et les issues sont **en français**. C'est un choix, pas un
oubli — et il vaut aussi pour les commentaires du catalogue anglais.

L'interface, elle, se dit **en français et en anglais**, et se règle dans
« Plus ». Le français reste la langue de référence : c'est
[`src/i18n/fr.ts`](src/i18n/fr.ts) qui décrit la forme d'un catalogue et qui
porte, clé par clé, pourquoi telle formule a été choisie plutôt qu'une autre.

## Licence

[AGPL-3.0-or-later](LICENSE) — reprends, modifie, redistribue, héberge, y
compris pour un usage commercial. Une seule condition, mais elle est ferme :
**ce qui part d'ici reste ouvert.** Toute version modifiée doit être publiée
sous la même licence — et l'article 13 étend l'obligation à la simple mise en
ligne, sans qu'il soit besoin de distribuer quoi que ce soit. Mettre une version
modifiée de cette app sur un domaine, c'est en devoir la source.

C'est un choix, et il remplace la licence MIT qui couvrait le projet jusqu'ici :
le code est ouvert pour se laisser lire et reprendre, pas pour être refermé
ailleurs. Les versions publiées sous MIT le restent, l'AGPL ne vaut que pour la
suite.

Cela ne vaut que pour ce dépôt : les composants tiers gardent la leur, et les
deux fontes sont sous une licence qui pose une condition de plus — voir
[`public/licences-tierces.txt`](public/licences-tierces.txt).

Le service rendu à [toutcomptefait.xyz](https://toutcomptefait.xyz), lui, n'est
pas couvert par l'AGPL : il a ses propres
[mentions légales](https://toutcomptefait.xyz/mentions-legales),
[politique de confidentialité](https://toutcomptefait.xyz/confidentialite) et
[conditions d'utilisation](https://toutcomptefait.xyz/conditions), dont les
textes vivent dans [`src/i18n/legal.ts`](src/i18n/legal.ts).
