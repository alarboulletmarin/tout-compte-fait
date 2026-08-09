/* ============================================================================
 * Ce que la section des objectifs **conclut**, et ce qu'elle refuse de conclure.
 *
 * C'est le seul bloc de l'écran d'épargne qui rende un verdict, et c'est la
 * seule raison de rouvrir l'app quand le capital n'a pas bougé. Trois choses se
 * tiennent ici : que le mot soit là — pas seulement une jauge, pas seulement une
 * couleur (DS §2.3) —, qu'il soit juste dans les deux sens, et que l'écran se
 * taise plutôt que d'écrire un chiffre qu'il ne sait pas.
 * ==========================================================================*/

import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { addMonthsToYm, today, ymOf } from '@/domain/date'
import {
  eur,
  makeCategory,
  makeData,
  makeFamily,
  makeMember,
  makeRecurrence,
  makeSavingGoal,
  makeSavingSupport,
  makeSavingValuation,
} from '@/domain/fixtures'
import { t } from '@/i18n/strings'
import { tpl } from '@/i18n/format'
import { ALL_FILTER, useStore } from '@/store/store'
import { GOAL_PARAM, goalNewPath, projectionPath } from '@/app/routes'
import { GoalsSection } from './GoalsSection'

const pristine = useStore.getState().data
const NOW = ymOf(today())

function show() {
  return render(
    <MemoryRouter>
      <GoalsSection />
    </MemoryRouter>,
  )
}

/**
 * Un livret relevé à 10 000 €, 200 € qui y tombent chaque mois, et un objectif.
 *
 * Aucun taux posé : le compte est donc projeté à 0 %, ce qui rend l'arithmétique
 * du test exacte — 20 000 € visés se réunissent en cinquante mois pile.
 */
function seed(goal: Parameters<typeof makeSavingGoal>[0]) {
  useStore.setState({
    filter: ALL_FILTER,
    data: makeData({
      household: { name: '', members: [makeMember({ id: 'm-1', name: 'Andrea' })] },
      families: [makeFamily({ id: 'fam-saving', kind: 'saving' })],
      categories: [makeCategory({ id: 'passbook', familyId: 'fam-saving' })],
      savingSupports: [makeSavingSupport({ id: 's-1', memberId: 'm-1', label: 'Livret A' })],
      savingValuations: [
        makeSavingValuation({ id: 'v-1', supportId: 's-1', amount: eur(1_000_000), date: today() }),
      ],
      recurrences: [
        makeRecurrence({
          id: 'r-1',
          categoryId: 'passbook',
          savingSupportId: 's-1',
          memberId: 'm-1',
          direction: 'out',
          amount: eur(20_000),
          period: { unit: 'month', every: 1, anchorDay: 5 },
        }),
      ],
      savingGoals: [makeSavingGoal(goal)],
    }),
  })
}

afterEach(() => {
  cleanup()
  useStore.setState({ data: pristine, filter: ALL_FILTER })
})

describe('le verdict d’un objectif', () => {
  /* Le chiffre de la refonte : ni la banque ni un tableur ne le produisent sans
     travail, et c'est ce qui donne une raison de rouvrir l'app. */
  it('dit le retard en toutes lettres, et ce qu’il faudrait verser', () => {
    seed({
      id: 'g-1',
      memberId: 'm-1',
      supportIds: ['s-1'],
      target: eur(2_000_000),
      /* Cinquante mois sont nécessaires au rythme actuel : viser trente-huit
         mois met l'objectif douze mois en retard. */
      targetOn: addMonthsToYm(NOW, 38),
    })
    show()

    expect(screen.getByText(new RegExp(tpl(t.savings.goalLate, 12)))).toBeInTheDocument()
  })

  it('dit qu’on est à l’heure quand on l’est', () => {
    seed({
      id: 'g-1',
      memberId: 'm-1',
      supportIds: ['s-1'],
      target: eur(2_000_000),
      targetOn: addMonthsToYm(NOW, 50),
    })
    show()

    expect(screen.getByText(new RegExp(t.savings.goalOn))).toBeInTheDocument()
  })

  /* Dépasser sa cible est un état à part entière, pas 118 % d'un cap. */
  it('dit « atteint » sur un objectif que le capital couvre déjà', () => {
    seed({
      id: 'g-1',
      memberId: 'm-1',
      supportIds: ['s-1'],
      target: eur(500_000),
      targetOn: addMonthsToYm(NOW, 12),
    })
    show()

    expect(screen.getByText(new RegExp(t.savings.goalReached))).toBeInTheDocument()
  })

  /* Sans versement ni rendement, il n'existe pas de date d'arrivée : en
     inventer une serait pire que se taire. */
  it('se tait sur une arrivée hors d’atteinte', () => {
    seed({ id: 'g-1', memberId: 'm-1', supportIds: ['s-1'], target: eur(2_000_000) })
    useStore.setState({ data: { ...useStore.getState().data, recurrences: [] } })
    show()

    expect(screen.getByText(new RegExp(t.savings.goalNoReach))).toBeInTheDocument()
  })

  /* Le mot, et pas seulement la jauge : une distinction qui ne survit pas au
     niveau de gris n'en est pas une (DS §2.3). */
  it('porte l’avancement en toutes lettres à côté de la jauge', () => {
    seed({
      id: 'g-1',
      memberId: 'm-1',
      supportIds: ['s-1'],
      target: eur(2_000_000),
      targetOn: addMonthsToYm(NOW, 50),
    })
    show()

    expect(screen.getByText(tpl(t.savings.goalProgress, '10 k€', '20 k€'))).toBeInTheDocument()
  })

  /* Un écran vide est une invitation, pas un constat (DS §7). */
  it('propose de poser un cap quand il n’y en a aucun', () => {
    useStore.setState({
      filter: ALL_FILTER,
      data: makeData({ household: { name: '', members: [makeMember({ id: 'm-1' })] } }),
    })
    show()

    expect(screen.getByText(t.savings.goalsEmpty)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t.savings.goalAdd })).toBeInTheDocument()
  })
})

/* ============================================================================
 * La boucle se referme — et c'est ce qui distingue un objectif d'un formulaire.
 *
 * Le simulateur était un cul-de-sac : on réglait quatre choses, on regardait une
 * courbe, on partait, et rien n'était retenu. Ce que ces deux tests tiennent
 * n'est pas une navigation, c'est que **chaque étape produise quelque chose que
 * la suivante consomme** : une simulation devient un cap, un cap rouvre une
 * simulation qui sait d'où elle vient, et le rythme qu'on y essaie revient s'y
 * poser.
 * ==========================================================================*/

describe('la boucle entre l’objectif et le simulateur', () => {
  it('ouvre le simulateur sur la question de l’objectif, et dit d’où l’on vient', () => {
    const path = projectionPath({
      goalId: 'g-1',
      target: eur(2_000_000),
      years: 4,
      source: 'support:s-1',
    })
    /* En clair, comme le sens et la nature d'une saisie : un lien qu'on peut
       lire est un lien qu'on peut corriger. */
    expect(path).toContain(`${GOAL_PARAM}=g-1`)
    expect(path).toContain('cible=2000000')
    expect(path).toContain('duree=4')
    expect(path).toContain('origine=support%3As-1')
  })

  it('emporte vers le formulaire ce qu’on vient de décider, et rien de plus', () => {
    const path = goalNewPath({
      target: eur(2_000_000),
      targetOn: '2030-03',
      monthly: eur(20_000),
      supportIds: ['s-1', 's-2'],
      memberId: 'm-1',
    })
    expect(path).toContain('cible=2000000')
    expect(path).toContain('echeance=2030-03')
    expect(path).toContain('versement=20000')
    expect(path).toContain('comptes=s-1%2Cs-2')
    /* Ce qui ne voyage pas : le taux essayé. Il reste dans `localStorage`,
       parce qu'une hypothèse n'est pas un fait du foyer — c'est la règle qui
       tient tout le simulateur. */
    expect(path).not.toContain('taux')
  })
})
