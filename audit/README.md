# Le harnais d'audit

Ce qui mesure l'interface, par opposition à ce qui la teste. `e2e/` est une
porte de sortie : il refuse un commit. `audit/` ne refuse rien — il relève, et
c'est `rapport.md` qui juge.

Il a deux volets : l'interface (ce dossier, ci-dessous) et le **fonctionnel**
(`fonctionnel/`, jugé par `fonctionnel.md`) — des parcours complets dans un
Chromium réel, onboarding compris, dont les vérifications recomposent les
chiffres au lieu de constater que les écrans s'ouvrent. Son mode d'emploi est
en tête de `fonctionnel.md`.

## Ce qu'on lance

```bash
# Le serveur est démarré par la configuration ; la construction en fait partie.
npx playwright test -c audit/playwright.audit.config.ts
```

Un fichier de sonde à la fois :

```bash
npx playwright test -c audit/playwright.audit.config.ts capture.spec.ts
npx playwright test -c audit/playwright.audit.config.ts axe.spec.ts
npx playwright test -c audit/playwright.audit.config.ts edges.spec.ts
npx playwright test -c audit/playwright.audit.config.ts zoom.spec.ts
npx playwright test -c audit/playwright.audit.config.ts duplicates.spec.ts
npx playwright test -c audit/playwright.audit.config.ts focus.spec.ts
```

## Ce que ça produit

| Sortie | Ce qu'elle dit |
|---|---|
| `screenshots/<langue>-<thème>/<slug>/<largeur>.jpg` | La page entière, 33 écrans × 8 largeurs × 2 thèmes × 2 langues |
| `mesures/<langue>-<thème>.json` | Débordement, hauteur, cibles sous 24px, rails, répétition des repères |
| `bords/<langue>-<thème>.json` | Les bords gauche et droit de chaque bloc — la cohérence des largeurs |
| `axe/<langue>-<thème>.json` | Le rapport brut d'axe-core, à trois largeurs |
| `zoom/fr-light.json` | Débordements et chevauchements à 200 % et 400 % |
| `doublons/fr-light.json` | Les montants affichés deux fois sous deux libellés |
| `focus/fr-light.json` | Focus clavier : anneau absent, ou recouvert par un élément fixe |

Rien de tout cela n'est versionné : ce sont des relevés, ils se rejouent. Seuls
le harnais et `rapport.md` le sont.

## Ce que le harnais ne peut pas faire

Il ne dit pas si deux libellés désignent deux concepts, ni si un écart de
largeur est voulu. Il compte et il mesure ; le tri se fait à la lecture, et
c'est pour ça que `rapport.md` cite une mesure par défaut plutôt que de
recopier un fichier de sortie.

## Le navigateur

`channel: 'chrome'` — le Chrome installé sur la machine, et non le
`headless_shell` de Playwright, qui est un binaire allégé. Un audit de mise en
page mesure ce qu'un navigateur rend vraiment. La suite `e2e/`, elle, garde le
navigateur de Playwright : c'est une porte de sortie, elle doit donner le même
résultat sur toutes les machines.

## Les préférences

Langue, thème et accusé de lecture de la notice sont posés en `localStorage`
avant le premier rendu (`session.ts`), c'est-à-dire par le miroir que l'app lit
elle-même au démarrage. Ouvrir l'app ainsi revient à l'ouvrir sur un appareil
qui l'a déjà réglée — pas à la piloter par une porte dérobée.
