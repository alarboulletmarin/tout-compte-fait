import { describe, expect, it } from 'vitest'
import { dayOfWeek, daysInMonth, diffDays, parseYm } from '@/domain/date'
import { makeEntry, eur } from '@/domain/fixtures'
import { t } from '@/i18n/strings'
import {
  CELLS,
  MAX_DOTS,
  compareForDay,
  dayNet,
  defaultAnchor,
  density,
  gridRange,
  isInGrid,
  keyboardMove,
  monthGrid,
  weekdays,
} from './grid'

/* Les quatre longueurs qu'un mois peut prendre une fois posé sur des semaines
   entières. Les deux premières sont la régression : elles occupaient quatre et
   cinq rangées, et la tuile changeait donc de hauteur en changeant de mois. */
const MOIS = [
  { ym: '2027-02', rangees: 4 }, // 28 jours, commence un lundi
  { ym: '2026-06', rangees: 5 }, // 30 jours, commence un lundi
  { ym: '2026-02', rangees: 5 }, // 28 jours, commence un dimanche
  { ym: '2026-08', rangees: 6 }, // 31 jours, commence un samedi
]

describe('grid — la fenêtre du mois', () => {
  it('fait quarante-deux cases, quelle que soit la longueur naturelle du mois', () => {
    for (const { ym } of MOIS) {
      expect(monthGrid(ym)).toHaveLength(CELLS)
    }
  })

  it('ouvre toujours un lundi et ferme toujours un dimanche', () => {
    for (const { ym } of MOIS) {
      const cells = monthGrid(ym)
      expect(dayOfWeek(cells[0]?.date ?? '')).toBe(1)
      expect(dayOfWeek(cells.at(-1)?.date ?? '')).toBe(7)
    }
  })

  it('enchaîne des jours contigus, sans trou ni doublon', () => {
    const cells = monthGrid('2026-08')
    for (let i = 0; i < cells.length - 1; i += 1) {
      expect(diffDays(cells[i]?.date ?? '', cells[i + 1]?.date ?? '')).toBe(1)
    }
  })

  it('marque exactement les jours du mois, du 1er au dernier', () => {
    for (const { ym } of MOIS) {
      const { y, m } = parseYm(ym)
      const dedans = monthGrid(ym).filter((cell) => cell.inMonth)
      expect(dedans).toHaveLength(daysInMonth(y, m))
      expect(dedans[0]?.day).toBe(1)
      expect(dedans.at(-1)?.day).toBe(daysInMonth(y, m))
    }
  })

  it('déborde sur les mois voisins, y compris par-dessus une année', () => {
    const janvier = monthGrid('2026-01')
    expect(janvier[0]?.date).toBe('2025-12-29')
    expect(janvier[0]?.inMonth).toBe(false)

    const decembre = monthGrid('2026-12')
    expect(decembre.at(-1)?.date).toBe('2027-01-10')
    expect(decembre.at(-1)?.inMonth).toBe(false)
  })

  it('tient compte des bissextiles', () => {
    expect(monthGrid('2024-02').some((cell) => cell.date === '2024-02-29')).toBe(true)
    expect(monthGrid('2026-02').some((cell) => cell.date === '2026-02-29')).toBe(false)
  })

  /* Les deux changements d'heure européens. Le module ne construit jamais de
     `Date` : la fenêtre traverse donc mars et octobre sans perdre ni gagner un
     jour, ce qu'aucune arithmétique en millisecondes ne garantit. */
  it('ne dérive jamais d’un jour, même sur un changement d’heure', () => {
    for (const ym of ['2026-03', '2026-10']) {
      const cells = monthGrid(ym)
      expect(cells).toHaveLength(CELLS)
      expect(diffDays(cells[0]?.date ?? '', cells.at(-1)?.date ?? '')).toBe(CELLS - 1)
    }
  })

  it('borne la fenêtre exactement sur ses cases', () => {
    const cells = monthGrid('2026-08')
    const { from, to } = gridRange('2026-08')
    expect(from).toBe(cells[0]?.date)
    expect(to).toBe(cells.at(-1)?.date)

    expect(isInGrid('2026-08', from)).toBe(true)
    expect(isInGrid('2026-08', to)).toBe(true)
    expect(isInGrid('2026-08', '2026-07-26')).toBe(false)
    expect(isInGrid('2026-08', '2026-09-07')).toBe(false)
  })
})

describe('grid — le clavier', () => {
  // Un mercredi de plein mois : aucun bord ne masque le déplacement testé.
  const mercredi = '2026-08-12'
  const dateOf = (key: string, from: string): string | null => keyboardMove(key, from)?.date ?? null

  it('déplace d’un jour et d’une semaine', () => {
    expect(dateOf('ArrowLeft', mercredi)).toBe('2026-08-11')
    expect(dateOf('ArrowRight', mercredi)).toBe('2026-08-13')
    expect(dateOf('ArrowUp', mercredi)).toBe('2026-08-05')
    expect(dateOf('ArrowDown', mercredi)).toBe('2026-08-19')
  })

  it('mène aux deux bords de la semaine, jamais à ceux du mois', () => {
    expect(dateOf('Home', mercredi)).toBe('2026-08-10')
    expect(dateOf('End', mercredi)).toBe('2026-08-16')
    // Un lundi et un dimanche sont déjà leur propre bord.
    expect(dateOf('Home', '2026-08-10')).toBe('2026-08-10')
    expect(dateOf('End', '2026-08-16')).toBe('2026-08-16')
  })

  it('traverse les mois par les flèches comme par les pages', () => {
    expect(dateOf('ArrowLeft', '2026-03-01')).toBe('2026-02-28')
    expect(dateOf('ArrowDown', '2026-08-31')).toBe('2026-09-07')
    expect(dateOf('PageUp', '2026-08-12')).toBe('2026-07-12')
    expect(dateOf('PageDown', '2026-08-12')).toBe('2026-09-12')
  })

  /* Seules les touches de page paginent : une flèche qui atteint un jour voisin
     déjà affiché ne doit pas faire basculer la grille entière. */
  it('ne réclame le changement de mois que pour les touches de page', () => {
    expect(keyboardMove('PageUp', mercredi)?.paging).toBe(true)
    expect(keyboardMove('PageDown', mercredi)?.paging).toBe(true)
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End']) {
      expect(keyboardMove(key, mercredi)?.paging).toBe(false)
    }
  })

  /* Rien n'est écrit pour le 31 : `addMonths` ramène déjà au dernier jour du
     mois d'arrivée. Le test est là pour que ça reste vrai. */
  it('ramène un 31 au dernier jour du mois d’arrivée', () => {
    expect(dateOf('PageUp', '2026-03-31')).toBe('2026-02-28')
    expect(dateOf('PageDown', '2026-01-31')).toBe('2026-02-28')
    expect(dateOf('PageDown', '2024-01-31')).toBe('2024-02-29')
  })

  it('laisse passer ce qui ne le regarde pas', () => {
    expect(keyboardMove('Escape', mercredi)).toBeNull()
    expect(keyboardMove('Tab', mercredi)).toBeNull()
    expect(keyboardMove('Enter', mercredi)).toBeNull()
    expect(keyboardMove('a', mercredi)).toBeNull()
  })
})

describe('grid — l’ancre du focus', () => {
  it('vise aujourd’hui sur le mois courant, le 1er ailleurs', () => {
    expect(defaultAnchor('2026-08', '2026-08-12')).toBe('2026-08-12')
    expect(defaultAnchor('2026-09', '2026-08-12')).toBe('2026-09-01')
    expect(defaultAnchor('2026-07', '2026-08-12')).toBe('2026-07-01')
  })
})

describe('grid — les pastilles', () => {
  it('en montre au plus quatre, et compte le reste', () => {
    expect(density(0)).toEqual({ shown: 0, rest: 0 })
    expect(density(4)).toEqual({ shown: 4, rest: 0 })
    expect(density(9)).toEqual({ shown: MAX_DOTS, rest: 9 - MAX_DOTS })
  })

  it('accepte un autre budget sans que le compte mente', () => {
    expect(density(9, 3)).toEqual({ shown: 3, rest: 6 })
    expect(density(2, 3)).toEqual({ shown: 2, rest: 0 })
  })
})

describe('grid — l’ordre d’un jour', () => {
  const loyer = makeEntry({
    id: 'loyer',
    date: '2026-08-12',
    label: 'Loyer',
    amount: eur(90_000),
    status: 'planned',
  })
  const cafe = makeEntry({
    id: 'cafe',
    date: '2026-08-12',
    label: 'Café',
    amount: eur(250),
  })
  const courses = makeEntry({
    id: 'courses',
    date: '2026-08-12',
    label: 'Courses',
    amount: eur(4_200),
  })

  it('range le confirmé avant le prévu, puis le plus gros en tête', () => {
    expect([loyer, cafe, courses].slice().sort(compareForDay).map((entry) => entry.id)).toEqual([
      'courses',
      'cafe',
      'loyer',
    ])
  })

  /* Deux montants égaux doivent se ranger toujours dans le même sens : sinon la
     liste bouge au premier re-rendu sans que rien n'ait changé. */
  it('départage deux montants égaux par le libellé, puis par l’identifiant', () => {
    const a = makeEntry({ id: 'z', date: '2026-08-12', label: 'Aaa', amount: eur(1_000) })
    const b = makeEntry({ id: 'a', date: '2026-08-12', label: 'Bbb', amount: eur(1_000) })
    const c = makeEntry({ id: 'b', date: '2026-08-12', label: 'Bbb', amount: eur(1_000) })
    expect([c, b, a].slice().sort(compareForDay).map((entry) => entry.id)).toEqual(['z', 'a', 'b'])
  })
})

describe('grid — le net du jour', () => {
  it('retranche ce qui sort de ce qui rentre', () => {
    const salaire = makeEntry({
      id: 'in',
      date: '2026-08-12',
      direction: 'in',
      amount: eur(200_000),
    })
    const loyer = makeEntry({ id: 'out', date: '2026-08-12', amount: eur(90_000) })
    expect(dayNet([salaire, loyer])).toBe(eur(110_000))
    expect(dayNet([loyer])).toBe(eur(-90_000))
    expect(dayNet([])).toBe(eur(0))
  })
})

describe('grid — les en-têtes de colonnes', () => {
  it('donne sept jours, du lundi au dimanche, aux clés uniques', () => {
    const jours = weekdays()
    expect(jours).toHaveLength(7)
    expect(jours[0]?.name).toBe('lundi')
    expect(jours.at(-1)?.name).toBe('dimanche')
    expect(jours.map((j) => j.initial)).toEqual([...t.calendarNames.weekdaysNarrow])
    // Les initiales ne sont pas uniques — mardi et mercredi donnent « M ».
    // Les noms, si : ce sont eux qui servent de clé de rendu.
    expect(new Set(jours.map((j) => j.name)).size).toBe(7)
  })
})
