# Politique de sécurité

## Versions suivies

Seule la dernière version en ligne sur [toutcomptefait.xyz](https://toutcomptefait.xyz) et le dernier état de la branche `main` sont suivis. Il n'y a pas de branche de maintenance : un correctif de sécurité est publié sur `main` et déployé.

## Signaler une faille

**N'ouvre pas d'issue publique pour une faille de sécurité.**

Utilise le signalement privé de GitHub :

**[→ Signaler une faille en privé](https://github.com/alarboulletmarin/tout-compte-fait/security/advisories/new)**

*(onglet **Security** du dépôt → **Report a vulnerability**)*

Le rapport n'est visible que du mainteneur tant qu'il n'est pas publié. Ce qui aide à traiter vite :

- ce que la faille permet de faire, concrètement ;
- les étapes pour la reproduire ;
- le navigateur et sa version ;
- si tu en as, un correctif ou une piste.

Réponse sous **7 jours**. Pas de programme de prime : c'est un projet personnel sans budget. Le crédit t'est donné dans l'avis publié, sauf si tu préfères l'anonymat.

## Ce qui est dans le périmètre

L'app est entièrement côté client, sans backend ni compte : il n'y a ni serveur à compromettre, ni base de données de tiers à exfiltrer, ni session à voler. Restent les surfaces suivantes.

- **Exécution de code arbitraire** (XSS) par une donnée saisie ou importée : un nom de catégorie, un libellé, un nom de membre.
- **Import de fichier malveillant** : un `.json` fabriqué qui ferait faire à l'app autre chose que refuser proprement. La validation est dans `src/persistence/validate.ts`.
- **Fuite de données hors de l'appareil** : toute requête réseau émise avec le contenu du document serait une faille grave, et par construction il n'en existe aucune. Une CSP `default-src 'self'` le refuse en plus au niveau du navigateur, y compris si une dépendance était compromise (voir [DEPLOIEMENT.md](docs/DEPLOIEMENT.md#les-en-têtes-de-sécurité)).
- **Corruption ou perte silencieuse de données** : une migration de schéma ou un import qui détruirait un document sans le dire.
- **Contournement du service worker** menant à servir du code périmé ou modifié.
- **Dépendance compromise** dans la chaîne de build.

## Ce qui n'y est pas

- **L'accès physique à un appareil déverrouillé.** Les données sont en clair en IndexedDB, comme n'importe quelle app web sans compte : qui tient le téléphone déverrouillé tient les données. C'est un choix assumé : chiffrer exigerait un mot de passe, donc un moyen de le perdre, donc une perte de données définitive contre une menace que le verrouillage de l'appareil traite déjà.
- **Un fichier d'export mal rangé.** Il est en clair, par conception : il doit rester lisible et réimportable dans dix ans, sans dépendre de l'app.
- **L'effacement des données par le navigateur** : vider le stockage du site efface tout. C'est documenté, c'est la raison d'être de l'export.
- Les rapports d'outil automatique sans démonstration d'impact, et les en-têtes manquants sur un site statique sans authentification.

## Divulgation

Divulgation coordonnée : le correctif est publié d'abord, l'avis ensuite, via les [GitHub Security Advisories](https://github.com/alarboulletmarin/tout-compte-fait/security/advisories) du dépôt. Merci de laisser un délai raisonnable avant toute publication de ton côté.
