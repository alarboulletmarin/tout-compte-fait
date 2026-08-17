# Captures

Les images vivent dans **`public/captures/`**, et non dans `docs/` : trois choses les servent au navigateur, le `README.md`, les `screenshots` du manifest (la fiche d'installation d'Android) et l'`og:image` du partage. Seul ce qui est sous `public/` est servi à la racine du site ; en garder une copie ici en aurait fait deux, qui finissent par diverger. Ce fichier-ci reste dans `docs/` parce qu'il est de la documentation, et que `public/` est servi tel quel.

Toutes prises sur le **jeu d'exemple**, jamais sur un vrai foyer, pour la raison évidente.

| Fichier | Écran | Thème | Viewport | Sert à |
|---|---|---|---|---|
| `mois-sombre.png` | Le mois | sombre | 1280 × 820 @2x | `README.md` |
| `mois-clair.png` | Le mois | clair | 1280 × 820 @2x | `README.md`, manifest (`wide`), `og:image` |
| `mois-mobile.png` | Le mois | sombre | 390 × 844 @2x | `README.md`, manifest (`narrow`) |

Les dimensions déclarées dans le manifest (`vite.config.ts`) sont celles des fichiers, densité comprise : 2560 × 1640 et 780 × 1688. Une capture refaite à une autre taille demande donc de les y corriger : Chrome refuse en silence un `screenshot` dont les `sizes` ne correspondent pas.

Elles sortent du precache (`globIgnores`) : 400 Ko d'images que l'app n'affiche jamais n'ont rien à faire dans le cache hors ligne.

## Les refaire

Elles vieillissent avec l'interface : à reprendre dès qu'un écran change visiblement.

```sh
npm run build && npm run preview
```

Puis, dans le navigateur, sur `http://localhost:4173/bienvenue` :

1. **Charger l'exemple** : le jeu se construit à la date du jour, donc les chiffres ne seront pas ceux d'ici, et c'est normal.
2. Poser deux clés dans le `localStorage`, qui couvrent l'écran sans elles : `tout-compte-fait.lastExport` à la date du jour, sans quoi le rappel d'export prend le haut de l'écran, et `tout-compte-fait.notice` à `1`, sans quoi la notice du premier lancement recouvre tout. Elles se posent avant de charger l'exemple : la notice s'affiche dès le premier rendu.
3. Capturer aux tailles du tableau ci-dessus, en densité 2×.

Le nombre du mois est le même dans les trois captures : c'est volontaire, elles montrent le même foyer au même instant.
