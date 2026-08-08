import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { money } from '@/domain/money'
import { formatMoney } from '@/i18n/format'
import { CumulativeLines, type Serie } from './CumulativeLines'

const euros = (cents: number): string => formatMoney(money(cents), 'EUR', false)

const serie = (id: string, values: (number | null)[], dashed = false): Serie => ({
  id,
  label: id,
  values,
  color: 'var(--accent-2)',
  ...(dashed ? { dashed } : {}),
})

const twelve = (...values: (number | null)[]): (number | null)[] =>
  Array.from({ length: 12 }, (_, i) => values[i] ?? null)

const draw = (series: Serie[]) => {
  /* L'écart n'est pas une série : il se lit, il ne se trace pas. Le composant
     le reçoit à part, et l'appelant le calcule — ici comme dans `YearCompare`. */
  const [current, before] = series
  const extra =
    current !== undefined && before !== undefined
      ? {
          label: 'Écart',
          values: current.values.map((value, index) => {
            const other = before.values[index]
            return value === null || other === null || other === undefined ? null : value - other
          }),
        }
      : undefined

  return render(
    <CumulativeLines
      series={series}
      {...(extra === undefined ? {} : { extra })}
      label="Cumul du solde"
      srText="Cumul 2026 contre 2025 : …"
    />,
  )
}

const ticks = (): string[] =>
  [...document.querySelectorAll('.t-axis.absolute')].map((t) => t.textContent ?? '')

describe('CumulativeLines', () => {
  it('pose le maximum, zéro et le minimum', () => {
    draw([serie('2026', twelve(-50_000, 120_000))])
    expect(ticks()).toEqual([euros(120_000), euros(0), euros(-50_000)])
  })

  /* `min` est borné à zéro par le haut : une année qui ne passe jamais en
     négatif a son minimum *à* zéro, et l'écrire deux fois serait un bug à
     l'œil. */
  it('n’écrit pas zéro deux fois quand le minimum est zéro', () => {
    draw([serie('2026', twelve(30_000, 120_000))])
    expect(ticks()).toEqual([euros(120_000), euros(0)])
  })

  /* Un mois est une période, pas un instant : son point tombe au milieu de sa
     tranche, là où le curseur et la bande des mois le désignent. Le tracé
     partait autrefois du bord, et janvier se lisait une demi-tranche à gauche
     de la lettre qui le nomme. */
  it('centre le premier point dans sa tranche', () => {
    const { container } = draw([serie('2026', twelve(10_000, 20_000))])
    // 240 de large sur douze mois : la tranche fait 20, son milieu 10.
    expect(container.querySelector('path')?.getAttribute('d')).toMatch(/^M 10 /)
  })

  it('lit par défaut le dernier mois chiffré', () => {
    // Le nom du mois lu, et non celui de la bande sous le tracé : « mars » ne
    // s'abrège pas, et les deux se ressemblent au point de se confondre. Il
    // porte le rang du sujet de la lecture (`t-section`) et non celui d'une
    // étiquette de plus, qui le rendait indiscernable de l'eyebrow de la tuile.
    const { container } = draw([serie('2026', twelve(10_000, 20_000, 30_000))])
    expect(container.querySelector('.t-section')).toHaveTextContent('mars')
  })

  /* La synthèse annuelle vit dans cette lecture-ci, et non dans un second bloc
     au-dessus du tracé qui aurait réécrit les deux mêmes nombres — c'est
     l'argument qui a déjà retiré les légendes d'ici. */
  it('lit l’écart entre les deux séries, signé et au rang des autres', () => {
    const { container } = draw([serie('2026', twelve(30_000)), serie('2025', twelve(12_000), true)])
    expect(screen.getByText('Écart')).toBeInTheDocument()
    expect([...container.querySelectorAll('.t-num-body')].map((n) => n.textContent)).toEqual([
      euros(30_000),
      euros(12_000),
      `+${euros(18_000)}`,
    ])
  })

  /* Pas de pastille sur l'écart : elle désignerait un trait qui n'existe pas.
     C'est le filet qui le sépare des deux séries. */
  it('ne donne de repère de couleur qu’aux séries tracées', () => {
    const { container } = draw([serie('2026', twelve(30_000)), serie('2025', twelve(12_000), true)])
    expect(container.querySelectorAll('.rounded-chip')).toHaveLength(2)
  })

  /* Cahier §4.7 : un mois sans donnée n'est pas un mois à zéro. */
  it('lit « — » sur un mois sans valeur, jamais un zéro', () => {
    draw([serie('2026', twelve(10_000, 20_000))])
    fireEvent.pointerOver(screen.getAllByRole('option')[5] as HTMLElement)

    expect(screen.getAllByRole('option')[5]).toHaveAttribute('aria-label', 'juin : 2026 —')
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  /* Ce qui se lit à l'œil se lit à l'oreille : l'écart entre dans le nom
     accessible du mois, à sa place dans la phrase. */
  it('donne les deux années et leur écart sur un mois qu’elles portent toutes deux', () => {
    draw([serie('2026', twelve(10_000)), serie('2025', twelve(8_000), true)])
    expect(screen.getAllByRole('option')[0]).toHaveAttribute(
      'aria-label',
      `janvier : 2026 ${euros(10_000)}, 2025 ${euros(8_000)}, Écart +${euros(2_000)}`,
    )
  })

  it('garde la lecture accessible du graphique', () => {
    draw([serie('2026', twelve(10_000))])
    expect(screen.getByText('Cumul 2026 contre 2025 : …')).toHaveClass('sr-only-text')
    expect(screen.getByRole('img')).toHaveAccessibleName('Cumul du solde')
  })

  /* Le défaut que règle ce changement : le graphique ne portait son nom que
     dans l'`aria-label` du SVG, et les trois montants n'avaient au-dessus d'eux
     que « 2026 », « 2025 » et « Écart » — de quelle année, jamais de quelle
     grandeur. */
  it('écrit au-dessus des chiffres ce qu’ils mesurent', () => {
    const { container } = draw([serie('2026', twelve(10_000, 20_000))])
    const title = screen.getByText('Cumul du solde')
    expect(title).toBeVisible()
    expect(title).toHaveClass('t-label')
    // Le titre précède le mois lu, qui garde son rang.
    expect(title.nextElementSibling).toBe(container.querySelector('.t-section'))
  })
})
