/* ============================================================================
 * Le pavage des deux grilles du mois, pour chaque composition qu'elles peuvent
 * produire.
 *
 * Une case vide dans un bento ne casse rien : pas de débordement, pas de coupe,
 * aucune erreur. Elle se voit, c'est tout — et seulement sur l'écran qu'on n'a
 * pas ouvert, à la largeur qu'on n'a pas essayée, avec le filtre qu'on n'a pas
 * posé. Deux grilles, sept et huit compositions, trois paliers : quarante-cinq
 * écrans à regarder à la main pour répondre à une question que l'arithmétique
 * tranche.
 *
 * Ce fichier la tranche donc. Il simule le placement automatique d'une grille
 * CSS `grid-auto-flow: row dense` — le même algorithme que le navigateur, en
 * quinze lignes — et compte les cases que rien ne couvre. Le simulateur a été
 * calibré contre la mesure réelle : cinq compositions relevées dans Chromium à
 * trois largeurs, et il rend les mêmes nombres. `e2e/mise-en-page.spec.ts` tient
 * l'autre bout, sur les pixels ; celui-ci couvre ce que le jeu d'exemple ne
 * produit pas.
 * ==========================================================================*/

import { describe, expect, it } from 'vitest'
import type { TileSpan } from '@/ui/Tile'
import { analysisPaving } from './composition'

/**
 * L'empreinte d'un format, en (colonnes, rangées), aux trois paliers.
 *
 * Recopiée de `components.css` plutôt qu'importée : ce sont des règles CSS, et
 * aucun module ne les expose. La recopie est donc le prix, et le test le paie
 * en clair — si un format change là-bas sans changer ici, c'est ce tableau
 * qu'on vient corriger, et les assertions diront aussitôt ce que ça déplace.
 */
const FOOTPRINT: Record<TileSpan, Record<number, [number, number]>> = {
  '2x1': { 2: [1, 1], 4: [1, 1], 6: [2, 1] },
  '2x2': { 2: [2, 2], 4: [2, 2], 6: [2, 2] },
  '4x1': { 2: [2, 1], 4: [2, 1], 6: [4, 1] },
  '4x2': { 2: [2, 2], 4: [2, 2], 6: [4, 2] },
  '6x1': { 2: [2, 1], 4: [4, 1], 6: [6, 1] },
  '6x2': { 2: [2, 2], 4: [4, 2], 6: [6, 2] },
}

/** Les trois paliers de la grille bento : téléphone, tablette, bureau. */
const COLUMNS = [2, 4, 6]

/**
 * Les cases que rien ne couvre, une fois la grille placée.
 *
 * `dense` veut dire qu'une tuile repart du début de la grille plutôt que de
 * suivre le curseur : c'est ce qui permet à une `2x1` de venir combler la
 * demi-hauteur laissée libre à côté d'une `2x2`, et c'est aussi ce qui rend le
 * comptage impossible à faire de tête.
 */
function holes(spans: TileSpan[], columns: number): number {
  const busy: boolean[][] = []
  const free = (row: number, column: number, w: number, h: number): boolean => {
    for (let y = row; y < row + h; y += 1)
      for (let x = column; x < column + w; x += 1) if (busy[y]?.[x] === true) return false
    return true
  }

  let used = 0
  let depth = 0
  for (const span of spans) {
    const [w, h] = FOOTPRINT[span][columns] ?? [1, 1]
    let placed = false
    for (let row = 0; !placed; row += 1) {
      for (let column = 0; column + w <= columns; column += 1) {
        if (!free(row, column, w, h)) continue
        for (let y = row; y < row + h; y += 1) {
          const line = (busy[y] ??= [])
          for (let x = column; x < column + w; x += 1) line[x] = true
        }
        depth = Math.max(depth, row + h)
        placed = true
        break
      }
    }
    used += w * h
  }
  return depth * columns - used
}

/** Le compte de cases vides aux trois paliers, dans l'ordre 2 / 4 / 6 colonnes. */
const across = (spans: TileSpan[]): number[] => COLUMNS.map((columns) => holes(spans, columns))

describe('le simulateur de placement', () => {
  /* Les cinq compositions relevées dans Chromium — jeu d'exemple, filtres du
     mois, largeurs 320 / 768 / 1440. Si le simulateur cessait de leur répondre
     juste, tout ce qui suit ne vaudrait plus rien. */
  it.each([
    [
      ['4x2', '2x2', '2x1', '2x1', '2x2', '4x1'],
      [0, 0, 0],
    ],
    [
      ['2x2', '4x1'],
      [0, 2, 4],
    ],
    [
      ['2x2', '2x1', '4x1'],
      [1, 1, 2],
    ],
    [
      ['4x2', '2x1', '2x1', '2x2', '4x1'],
      [0, 0, 4],
    ],
    [
      ['2x2', '2x2', '4x2', '4x1'],
      [0, 2, 10],
    ],
  ] as [TileSpan[], number[]][])('rend ce que le navigateur a mesuré sur %s', (spans, measured) => {
    expect(across(spans)).toEqual(measured)
  })
})

describe('SituationGrid — le pavage de chaque composition', () => {
  /* Les formats sont ceux que la grille pose, dans l'ordre du DOM. Le solde
     s'élargit quand la Répartition s'en va ; les charges s'élargissent sur le
     pot commun, où les revenus ne sont plus là pour se ranger à côté. */
  it('referme la lecture complète', () => {
    expect(across(['4x2', '2x2', '2x1', '2x1', '2x2', '4x1'])).toEqual([0, 0, 0])
  })

  it('referme une lecture filtrée sur une personne, sans Répartition', () => {
    expect(across(['6x2', '2x1', '2x1', '2x2', '4x1'])).toEqual([0, 0, 0])
  })

  it('referme le pot commun, où trois tuiles s’effacent', () => {
    expect(across(['2x2', '4x1', '4x1'])).toEqual([0, 0, 0])
  })

  /* Ce que l'ancien pavage laissait, et qui a motivé le changement. Le test le
     garde pour que la valeur du remède reste lisible : ce ne sont pas des
     formats équivalents. */
  it('laissait quatre cases vides au bureau avant que le solde ne s’élargisse', () => {
    expect(across(['4x2', '2x1', '2x1', '2x2', '4x1'])).toEqual([0, 0, 4])
  })
})

describe('AnalysisGrid — le pavage que la table choisit', () => {
  /* Les sept compositions, décrites par leurs trois entrées : la lecture de
     membre est-elle là, quel format la part s'est-elle donné, y a-t-il un
     crédit. Le format de la part est une **entrée** — il vient de son contenu,
     pas de la grille. */
  const compositions: [string, boolean, TileSpan | null, boolean, number[]][] = [
    ['tout le monde, avec crédit', false, null, true, [0, 0, 0]],
    ['tout le monde, sans crédit', false, null, false, [0, 0, 0]],
    ['une personne, report, avec crédit', true, '4x2', true, [0, 0, 0]],
    ['une personne, report, sans crédit', true, '4x2', false, [0, 0, 0]],
    ['une personne, sans report, avec crédit', true, '4x1', true, [0, 0, 0]],
    ['une personne, sans part, avec crédit', true, null, true, [0, 0, 0]],
    ['une personne, sans part, sans crédit', true, null, false, [0, 0, 0]],
  ]

  it.each(compositions)('referme : %s', (_label, memberCharges, share, credits, expected) => {
    const spans = analysisPaving(memberCharges, share, credits)
    const laid: TileSpan[] = [spans.breakdown]
    if (memberCharges) laid.push(spans.memberCharges)
    if (share !== null) laid.push(share)
    if (credits) laid.push(spans.credits)
    expect(across(laid)).toEqual(expected)
  })

  /* La seule qui ne referme pas, et l'en-tête de `AnalysisGrid` dit pourquoi :
     deux anneaux et une lecture plate ne font une rangée pleine à aucun palier,
     et donner deux rangées à la lecture plate rouvrirait à l'intérieur de la
     tuile le vide qu'on referme dans la grille. Le test fige le moindre mal :
     s'il s'aggravait, il faudrait le savoir. */
  it('garde deux cases vides sur la lecture sans report ni crédit', () => {
    const spans = analysisPaving(true, '4x1', false)
    expect(across([spans.breakdown, spans.memberCharges, '4x1'])).toEqual([0, 2, 2])
  })
})
