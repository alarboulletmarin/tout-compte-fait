import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrast, distance, evaluate, over } from './color'
import {
  classDeclarations,
  declaredPalettes,
  paletteDeclarations,
  parseRules,
  resolveTokens,
  subtreeDeclarations,
} from './css'
import { DEFAULT_PALETTE, PALETTES, type PaletteSetting } from '@/domain/types'

/* ============================================================================
 * Le plancher du DS §8, tenu par la mesure et non par la relecture.
 *
 * Une palette est un jeu de valeurs : rien dans le code ne l'empêche d'en poser
 * une illisible, et personne ne recalcule douze rapports de contraste à la main
 * en revoyant une pull request. Ce test lit `tokens.css` et `palettes.css`
 * eux-mêmes — pas une copie de leurs valeurs —, rejoue la cascade pour chaque
 * couple (palette, thème), et mesure.
 *
 * Il rejoue au passage les six ratios déjà écrits en commentaire dans
 * `tokens.css` (5,99 / 4,79 / 5,16 / 4,67 / 7,08 / 6,39). C'est ce qui permet de
 * lui faire confiance sur les autres.
 * ==========================================================================*/

const THEMES = ['light', 'dark'] as const
type Theme = (typeof THEMES)[number]

/* Les feuilles se lisent sur le disque et non par `?raw` : la configuration de
   vitest pose `css: false` (vite.config.ts), ce qui vide tout import de `.css`,
   extension `?raw` comprise. L'activer ferait traverser toute la chaîne CSS à
   chaque exécution de test, pour trois fichiers qu'on ne veut lire qu'en texte.
   Chemin depuis la racine et non depuis `import.meta.url` : sous jsdom, celle-ci
   est une URL http, dont `new URL()` ne fait pas un chemin de fichier. */
const sheet = (name: string): string =>
  readFileSync(join(process.cwd(), 'src', 'styles', `${name}.css`), 'utf8')

const tokensCss = sheet('tokens')
const palettesCss = sheet('palettes')
const componentsCss = sheet('components')

const SHEETS = [tokensCss, palettesCss]

/** Ce que toute palette doit poser, indépendamment du thème. */
const REQUIRED_ANY_THEME = [
  '--accent',
  '--accent-fg',
  '--accent-2',
  '--accent-2-fg',
  '--danger',
  '--danger-fill',
  '--danger-fg',
  '--cat-1',
  '--cat-2',
  '--cat-3',
  '--cat-4',
  '--cat-5',
  '--cat-6',
  '--cat-rest',
]

/** Ce qu'elle doit poser dans chaque thème. */
const REQUIRED_PER_THEME = [
  '--bg',
  '--surface',
  '--surface-2',
  '--text',
  '--text-muted',
  '--text-muted-on-surface',
  '--danger-text',
  '--danger-text-on-surface',
  '--focus',
]

const CATEGORIES = ['--cat-1', '--cat-2', '--cat-3', '--cat-4', '--cat-5', '--cat-6']
const MEMBERS = ['--member-1', '--member-2', '--member-3', '--member-4', '--member-5']

const AA = 4.5
const UI = 3
/* Deux pastilles se distinguent par la teinte autant que par la clarté, ce que
   le contraste ne sait pas dire. Le plancher n'est pas celui de Classique
   (0,122) et c'est délibéré : six pas d'une seule teinte ne peuvent pas
   s'écarter davantage sans qu'un des six cesse d'être cette teinte — Monochrome
   plafonne à 0,108. C'est le prix d'une palette monochrome, et le DS §8 le
   couvre déjà, qui veut qu'une forme ne porte jamais seule ce qu'elle dit : la
   pastille accompagne un libellé, elle ne le remplace pas. */
const HUE_APART = 0.08
/* Un membre ne porte jamais l'accent (DS §2.5) : sa pastille se lirait comme
   une sélection, et disparaîtrait dans une pilule de filtre active, qui passe
   elle-même en accent. Classique tient 0,189. */
const MEMBER_FROM_ACCENT = 0.1
/* Et une pastille se détache de ce sur quoi elle est posée. Le contraste est
   le mauvais instrument ici — le vert pomme de Classique sur du blanc ne donne
   que 1,20:1 et se voit très bien —, mais la distance, elle, dit juste : une
   teinte qui frôle sa surface disparaît, quel que soit son rapport de
   luminance. C'est la contrainte qui interdit à une rampe de clarté de
   descendre jusqu'au fond sombre ou de monter jusqu'au blanc. */
const GROUND_APART = 0.15

/**
 * Les écarts assumés, sur le modèle de la table de `docs/ARCHITECTURE.md`.
 *
 * Un écart déclaré ici reste mesuré : il a son propre plancher, et le test
 * échoue s'il empire. Ce qui n'y est pas doit tenir le plancher du DS.
 */
const ÉCARTS: { pair: string; floor: number; why: string }[] = [
  {
    pair: 'eyebrow sur .tile--accent-2',
    floor: 3,
    why:
      "Le voile de la pilule éclaire le fond vers la couleur du texte, ce qui est " +
      "juste sur un accent clair et faux sur un accent sombre. Corriger demande de " +
      "veiler en sens inverse sur cette tuile-là, donc d'en changer l'aspect : " +
      'antérieur à la couche palette, et hors de son périmètre.',
  },
]

function floorFor(pair: string, base: number): number {
  return ÉCARTS.find((e) => e.pair === pair)?.floor ?? base
}

type Scope = {
  tokens: Record<string, string>
  color: (name: string) => ReturnType<typeof evaluate>
}

function scopeOf(palette: PaletteSetting, theme: Theme): Scope {
  const tokens = resolveTokens(SHEETS, palette, theme)
  return { tokens, color: (name) => evaluate(`var(${name})`, tokens) }
}

/** Les paires de texte, qui doivent toutes tenir AA. */
function textPairs(scope: Scope): { pair: string; value: number }[] {
  const { color } = scope
  const accentTile = classDeclarations(componentsCss, '.tile--accent')
  const accent2Tile = classDeclarations(componentsCss, '.tile--accent-2')
  const onTile = (declarations: Record<string, string>, name: string, background: string) =>
    over(evaluate(declarations[name] ?? '', scope.tokens), color(background))

  return [
    { pair: 'texte sur fond', value: contrast(color('--text'), color('--bg')) },
    { pair: 'texte sur surface', value: contrast(color('--text'), color('--surface')) },
    { pair: 'texte sur surface-2', value: contrast(color('--text'), color('--surface-2')) },
    { pair: 'texte atténué sur fond', value: contrast(color('--text-muted'), color('--bg')) },
    {
      pair: 'texte atténué sur surface',
      value: contrast(color('--text-muted-on-surface'), color('--surface')),
    },
    {
      pair: 'texte atténué sur surface-2',
      value: contrast(color('--text-muted-on-surface'), color('--surface-2')),
    },
    { pair: 'texte sur accent', value: contrast(color('--accent-fg'), color('--accent')) },
    { pair: 'texte sur accent-2', value: contrast(color('--accent-2-fg'), color('--accent-2')) },
    { pair: 'texte sur danger', value: contrast(color('--danger-fg'), color('--danger-fill')) },
    { pair: 'erreur sur fond', value: contrast(color('--danger-text'), color('--bg')) },
    {
      pair: 'erreur sur surface',
      value: contrast(color('--danger-text-on-surface'), color('--surface')),
    },
    {
      pair: 'erreur sur surface-2',
      value: contrast(color('--danger-text-on-surface'), color('--surface-2')),
    },
    /* Les tuiles accentuées repointent les tokens pour tout leur sous-arbre :
       ce qu'on y lit n'est plus le texte du thème, mais un voile tiré de
       --accent-fg. C'est là que se voit une palette dont l'accent aurait viré. */
    {
      pair: 'texte atténué sur .tile--accent',
      value: contrast(onTile(accentTile, '--text-muted', '--accent'), color('--accent')),
    },
    {
      pair: 'eyebrow sur .tile--accent',
      value: contrast(
        onTile(accentTile, '--eyebrow-fg', '--accent'),
        onTile(accentTile, '--eyebrow-bg', '--accent'),
      ),
    },
    {
      pair: 'eyebrow sur .tile--accent-2',
      value: contrast(
        onTile(accent2Tile, '--eyebrow-fg', '--accent-2'),
        onTile(accent2Tile, '--eyebrow-bg', '--accent-2'),
      ),
    },
  ]
}

/** Les séparations non textuelles, à 3:1 — WCAG 1.4.11. */
function uiPairs(scope: Scope): { pair: string; value: number }[] {
  const { color } = scope
  return [
    { pair: 'anneau de focus sur fond', value: contrast(color('--focus'), color('--bg')) },
    { pair: 'anneau de focus sur surface', value: contrast(color('--focus'), color('--surface')) },
    {
      pair: 'anneau de focus sur surface-2',
      value: contrast(color('--focus'), color('--surface-2')),
    },
    /* Entrées contre sorties. Le DS §2.3 disait « lime et violet » ; il dit
       maintenant deux rôles distincts, et c'est cette ligne-ci qui le vérifie —
       une palette monochrome a le droit de les séparer par la clarté, pas de ne
       plus les séparer. */
    { pair: 'entrées contre sorties', value: contrast(color('--accent'), color('--accent-2')) },
  ]
}

describe('palettes', () => {
  it('déclare dans le CSS exactement les palettes que connaît le code', () => {
    expect(declaredPalettes(palettesCss)).toEqual(
      PALETTES.filter((palette) => palette !== DEFAULT_PALETTE),
    )
  })

  it('laisse Classique entièrement à tokens.css', () => {
    /* Elle n'a rien à surcharger, et c'est ce qui garantit qu'elle ne dérive
       pas : une palette par défaut qui se redéclarerait ailleurs finirait par
       dire deux choses. Sur les sélecteurs et non sur le texte : `palettes.css`
       nomme Classique en commentaire pour expliquer justement pourquoi elle n'y
       est pas déclarée, et une explication n'est pas une déclaration. */
    for (const rule of parseRules(palettesCss)) {
      expect(rule.selector, rule.selector).not.toContain(`[data-palette='${DEFAULT_PALETTE}']`)
    }
  })

  for (const palette of PALETTES) {
    describe(palette, () => {
      if (palette !== DEFAULT_PALETTE) {
        it('déclare tous les tokens exigés', () => {
          const declared = paletteDeclarations(palettesCss, palette)
          for (const token of [...REQUIRED_ANY_THEME, ...REQUIRED_PER_THEME]) {
            expect([...declared], `${palette} déclare ${token}`).toContain(token)
          }
        })
      }

      for (const theme of THEMES) {
        describe(theme, () => {
          const scope = scopeOf(palette, theme)

          /* Un sous-arbre — la vignette des réglages, le panneau du styleguide —
             n'est pas <html> : ce que seul `:root` déclare ne s'y redéclare pas,
             et il hérite alors la valeur de la palette ambiante au lieu de la
             sienne. C'était le cas de Classique, dont l'identité vivait dans le
             `:root` invariant de `tokens.css` : sa vignette virait au sapin sous
             Monochrome. Le thème, lui, n'a jamais eu ce défaut, ses deux blocs
             portant `[data-theme='…']`. */
          it('se redéclare entièrement dans un sous-arbre', () => {
            const declared = subtreeDeclarations(SHEETS, palette, theme)
            for (const token of [...REQUIRED_ANY_THEME, ...REQUIRED_PER_THEME]) {
              expect([...declared], `${palette}/${theme} redéclare ${token}`).toContain(token)
            }
          })

          it('résout chaque token exigé en une couleur', () => {
            for (const token of [...REQUIRED_ANY_THEME, ...REQUIRED_PER_THEME, ...MEMBERS]) {
              expect(() => scope.color(token), token).not.toThrow()
            }
          })

          it('tient le plancher AA sur tout texte', () => {
            for (const { pair, value } of textPairs(scope)) {
              expect(value, `${pair} — ${value.toFixed(2)}:1`).toBeGreaterThanOrEqual(
                floorFor(pair, AA),
              )
            }
          })

          it('sépare focus, entrées et sorties à 3:1', () => {
            for (const { pair, value } of uiPairs(scope)) {
              expect(value, `${pair} — ${value.toFixed(2)}:1`).toBeGreaterThanOrEqual(
                floorFor(pair, UI),
              )
            }
          })

          it('distingue ses six catégories les unes des autres', () => {
            for (let i = 0; i < CATEGORIES.length; i += 1) {
              for (let j = i + 1; j < CATEGORIES.length; j += 1) {
                const a = CATEGORIES[i] ?? ''
                const b = CATEGORIES[j] ?? ''
                const d = distance(scope.color(a), scope.color(b))
                expect(d, `${a} / ${b} — ${d.toFixed(3)}`).toBeGreaterThanOrEqual(HUE_APART)
              }
            }
          })

          it('détache ses teintes du fond et des surfaces', () => {
            for (const token of [...CATEGORIES, '--accent', '--accent-2']) {
              for (const ground of ['--bg', '--surface', '--surface-2']) {
                const d = distance(scope.color(token), scope.color(ground))
                expect(d, `${token} sur ${ground} — ${d.toFixed(3)}`).toBeGreaterThanOrEqual(
                  GROUND_APART,
                )
              }
            }
          })

          it('ne donne l’accent à aucun membre', () => {
            for (const member of MEMBERS) {
              const d = distance(scope.color(member), scope.color('--accent'))
              expect(d, `${member} — ${d.toFixed(3)} de l’accent`).toBeGreaterThanOrEqual(
                MEMBER_FROM_ACCENT,
              )
            }
          })
        })
      }
    })
  }

  it('retrouve les ratios écrits dans tokens.css', () => {
    /* Le calcul doit être celui qui a servi à écrire ces commentaires-là, sinon
       le reste du fichier ne mesure rien de connu. */
    const clair = scopeOf('classique', 'light')
    const sombre = scopeOf('classique', 'dark')
    const round = (value: number) => Number(value.toFixed(2))

    expect(round(contrast(clair.color('--text-muted'), clair.color('--surface')))).toBe(5.99)
    expect(round(contrast(clair.color('--text-muted'), clair.color('--surface-2')))).toBe(4.79)
    expect(round(contrast(clair.color('--danger-text'), clair.color('--bg')))).toBe(5.16)
    expect(round(contrast(clair.color('--accent-2-fg'), clair.color('--accent-2')))).toBe(4.67)
    expect(round(contrast(sombre.color('--text-muted-on-surface'), sombre.color('--surface')))).toBe(
      7.08,
    )
    expect(
      round(contrast(sombre.color('--danger-text-on-surface'), sombre.color('--surface'))),
    ).toBe(6.39)
  })
})
