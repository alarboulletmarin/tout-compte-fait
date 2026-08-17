# Déploiement

L'app est un site statique : n'importe quel hébergeur de fichiers sait la servir, à deux conditions près, une réécriture SPA et du HTTPS.

## Vercel

L'hébergement de référence, preset **Vite**. `vercel.json` porte déjà tout :

- la **réécriture SPA** : sans elle, un rechargement sur `/calendrier` renverrait un 404, parce qu'aucun fichier ne porte ce nom ;
- les **en-têtes de cache** : `sw.js` et le manifeste jamais mis en cache, les assets empreintés pour un an ;
- les **en-têtes de sécurité**, dont une CSP stricte, voir la section suivante, qui est aussi la seule partie du fichier qu'on ne modifie pas à la main.

Aucune variable d'environnement. Le service worker exige HTTPS, que Vercel fournit d'office.

## Les en-têtes de sécurité

L'app ne demande rien à l'extérieur : aucun `fetch`, aucune ressource tierce, les fontes auto-hébergées. La CSP n'est donc pas une gêne à contourner, c'est la **preuve technique** de l'argument du produit : elle transforme « rien ne sort de ton appareil » en « le navigateur refuse toute transmission », et elle tiendrait même si une dépendance npm était compromise.

| En-tête | Ce qu'il fait ici |
| --- | --- |
| `Content-Security-Policy` | `default-src 'self'` : rien ne se charge ni ne part vers un tiers. `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`. |
| `X-Content-Type-Options` | `nosniff` : un export `.json` ne peut pas être réinterprété en HTML. |
| `Referrer-Policy` | `no-referrer` : aucun lien sortant ne dit d'où l'on vient. |
| `Permissions-Policy` | refuse caméra, micro, géolocalisation, capteurs, paiement, Topics… L'app n'en demande que deux, en `self` : le presse-papiers et la feuille de partage. |

Quatre points de cette politique ne se devinent pas en relisant le code, et chacun a été trouvé en la vérifiant :

- **`script-src` porte un hash `sha256`.** `index.html` contient un script en ligne : le miroir `localStorage` du thème, qui évite une frame en clair avant que la base IndexedDB ne réponde. Ce hash est **calculé, jamais écrit à la main** : recopié, il deviendrait faux au premier caractère changé dans ce script, et l'app partirait en production avec une page qui ne s'affiche pas.
- **`font-src` autorise `data:`.** `@fontsource/geist-mono` embarque plusieurs sous-ensembles en base64 dans le CSS. Sans cette source, toutes les fontes tombent en repli système, sur tous les écrans, sans une erreur visible.
- **`style-src` autorise `'unsafe-inline'`.** Le bloc `<noscript>` porte ses styles en attributs, faute de pouvoir viser une feuille que seul le JavaScript charge. Le hacher demanderait `'unsafe-hashes'`, un instrument plus large que le trou qu'il bouche. La concession ne coûte rien de ce qui compte : une exfiltration par CSS passerait par une `url()` distante, que `img-src` et `connect-src` refusent déjà.
- **`Permissions-Policy` laisse passer `clipboard-write=(self)` et `web-share=(self)`.** Le bouton « copier le schéma » des réglages s'appuie sur le premier, « Envoyer vers… » sur le second. Un refus global les éteint sans un mot : le second est arrivé bloqué, et c'est `csp:check` qui l'a dit, pas un téléphone en production.

### Mettre à jour et vérifier

```sh
npm run build && npm run csp    # recalcule le hash dans vercel.json
npm run csp:check               # échoue s'il a pris du retard, puis audite
```

`csp:check` fait partie de `npm run verify`, donc de la CI. Il lit la politique **telle qu'elle est écrite dans `vercel.json`** — pas une copie idéale gardée à côté — et l'oppose à `dist/` : scripts en ligne, feuilles, `url()` du CSS, icônes du manifeste, précache du service worker, et les API que `Permissions-Policy` gouverne. Ce qu'une directive bloquerait est nommé, avec la directive fautive et le remède.

C'est la raison d'être du contrôle : le risque d'une CSP n'est pas d'être trop faible, c'est de partir en production et de casser un écran que personne n'a rouvert. Le jour où quelqu'un ajoute une police Google, une balise `<style>`, un `onclick=` ou un `preconnect` vers un tiers, la construction échoue avant le déploiement.

## Ailleurs

Le build sort dans `dist/`. Pour l'héberger autre part :

```sh
npm ci
npm run build
```

Puis servir `dist/` avec deux règles à reporter depuis `vercel.json` :

1. toute URL qui ne correspond à aucun fichier renvoie `index.html` (Netlify : un `_redirects` avec `/* /index.html 200` ; Nginx : `try_files $uri /index.html` ; GitHub Pages : dupliquer `index.html` en `404.html`) ;
2. `sw.js` et `manifest.webmanifest` servis en `max-age=0, must-revalidate` : les mettre en cache fige les utilisateurs sur une version périmée, et le prompt de mise à jour ne remonterait jamais.

Et une troisième, qui n'est pas une condition de fonctionnement mais la preuve de ce que l'app promet : reporter aussi les **en-têtes de sécurité** de la règle `/(.*)`, hash `sha256` compris. Un hébergeur qui ne sait pas poser d'en-têtes sert une app qui marche et qui ne prouve plus rien. C'est un choix, il mérite d'être fait sciemment.

HTTPS est obligatoire : sans lui, pas de service worker, donc pas de mode hors ligne ni d'installation sur l'écran d'accueil. `localhost` est la seule exception, ce qui suffit au développement.

## Ce qui est servi à la racine

Trois choses sortent de `public/` et ne sont pas du code :

- **`robots.txt`** : tout est ouvert à l'indexation. Il existe pour que la réponse soit un 200 et non la coquille de l'app : le rewrite épargne déjà tout chemin contenant un point, et le service worker ne lui sert pas `index.html` (`navigateFallbackDenylist`).
- **`captures/`** : les images du `README`, qui servent aussi les `screenshots` du manifest et l'`og:image` du partage. Un seul exemplaire, et il est ici : seul ce qui est sous `public/` est servi à la racine. Voir [CAPTURES.md](CAPTURES.md).
- les **icônes** et `favicon.svg`, déclarées dans le manifest.

Les captures sont **hors du precache** (`globIgnores`) : 400 Ko d'images que l'app n'affiche jamais n'ont rien à faire dans le cache hors ligne. Elles tombent donc sous le cache par défaut de l'hébergeur, ce qui convient : une capture refaite garde son nom, et doit se rafraîchir.

## Essayer le service worker en développement

Il ne s'enregistre pas sous `npm run dev` : il resservirait du code figé à chaque rechargement, ce qui est le contraire de ce qu'on attend d'un serveur de développement. Pour la session où c'est lui qu'on regarde :

```sh
PWA_DEV=1 npm run dev
```

Le reste — bandeau d'installation, `screenshots`, raccourcis du manifest — se vérifie sur un vrai build, l'onglet Application des outils de développement ouvert :

```sh
npm run build && npm run preview
```

## Vérification avant mise en ligne

`npm run verify` enchaîne typecheck, lint, licences, tests, build, budget de taille et audit des en-têtes : c'est la porte de sortie, et c'est exactement ce que joue l'intégration continue sur chaque push.

Au-delà du script, chaque écran a été relu dans les deux thèmes, en téléphone, tablette et desktop. Le contraste, les noms accessibles et les cibles tactiles sont audités sur toutes les routes, dans les deux thèmes : aucun point en suspens.

Aux cinq destinations de la navigation s'ajoutent les écrans qu'on n'atteint que par une action — `/depense`, `/depense/:id`, `/recurrences/nouveau`, `/recurrences/:id`, `/recurrences/:id/modifier`, `/credits`, `/credits/nouveau`, `/credits/:id`, `/repartition` —, les trois écrans qui parlent de l'app plutôt que du foyer — `/bienvenue`, `/demarrer`, `/a-propos` — et `/styleguide`.

`/credits` et `/repartition` ne figurent pas dans la navigation : six onglets ne tiennent pas à 320px sans tronquer « Récurrences » en « Récurren… ». On y accède par la tuile correspondante de l'écran du mois, comme on accède aux récurrences par la sienne. Chacune s'efface quand elle n'a rien à dire : aucun crédit suivi, ou pas de quoi calculer un prorata.
