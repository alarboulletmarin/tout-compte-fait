import 'fake-indexeddb/auto'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { currentYm, startOfMonth } from '@/domain/date'
import { money } from '@/domain/money'
import { t } from '@/i18n/strings'
import { formatMoney, tpl } from '@/i18n/format'
import { closeDb } from '@/persistence/db'
import { emptyData } from '@/persistence/defaults'
import { useStorageHealth } from '@/persistence/health'
import { useStore } from '@/store/store'
import { OnboardingPage } from './OnboardingPage'

/* Le premier lancement, tel qu'il se présente : rien d'enregistré, statut
   « onboarding ». C'est cette garde-là qui fait que les récurrences posées à la
   seconde étape n'ont encore aucune échéance — voir `startWith`. */
function firstLaunch(): void {
  useStore.setState({ status: 'onboarding', data: emptyData(), error: null, ym: currentYm() })
}

const state = () => useStore.getState()

/* Aucun nom ne se demande plus : les personnes sont la première *question*. Le
   nom affiché vit dans les réglages, facultatif — il n'a jamais rien décidé, et
   l'exiger pour continuer était la seule question bloquante de l'app.

   L'écran s'ouvre désormais sur un énoncé qui ne demande rien — la thèse et sa
   contrepartie, avant qu'on saisisse quoi que ce soit. Il se franchit d'un
   bouton, et c'est ce que fait `openPrinciple` : les scénarios ci-dessous
   portent sur les réponses, pas sur la lecture qui les précède. */
async function openPrinciple(): Promise<void> {
  render(
    <MemoryRouter>
      <OnboardingPage />
    </MemoryRouter>,
  )
  await userEvent.click(screen.getByRole('button', { name: t.onboarding.principleNext }))
}

/** Répond à la première question et s'arrête sur la suivante. */
async function answerFirst(names: readonly string[]): Promise<void> {
  await openPrinciple()

  for (const name of names) {
    /* Sans `exact`, « Prénom » attraperait aussi les champs de renommage des
       membres déjà ajoutés, qui s'appellent « Prénom de Alix ». */
    await userEvent.type(screen.getByLabelText(t.onboarding.membersLabel), name)
    await userEvent.click(screen.getByRole('button', { name: t.onboarding.membersAdd }))
  }

  await userEvent.click(
    screen.getByRole('button', {
      name: names.length === 0 ? t.onboarding.solo : t.common.next,
    }),
  )
}

const fill = async (label: string, amount: string): Promise<void> => {
  await userEvent.type(screen.getByLabelText(new RegExp(label)), amount)
}

/* Le montant tel qu'un lecteur d'écran l'entend. Les espaces fines insécables
   d'`Amount` sont ramenées à l'espace ordinaire, comme le fait la
   normalisation de `getByText` sur le texte du DOM — sans quoi les deux
   chaînes se compareraient sur deux caractères d'espace différents. */
const spoken = (cents: number): string => formatMoney(money(cents), 'EUR').replace(/\s/g, ' ')

/** Quitte la seconde étape, puis la troisième, et ouvre l'app. */
async function finishFrom(step: 2 | 3, keep: boolean): Promise<void> {
  if (step === 2) {
    await userEvent.click(
      screen.getByRole('button', {
        name: keep ? t.common.next : t.onboarding.starterSkip,
      }),
    )
  }
  await userEvent.click(screen.getByRole('button', { name: t.onboarding.savingsSkip }))
}

describe('les quatre étapes du premier lancement', () => {
  beforeEach(firstLaunch)

  afterEach(() => {
    closeDb()
    useStorageHealth.setState({ durable: 'unknown', probed: false, asked: false })
  })

  it('pose un salaire par personne et un loyer commun, puis ouvre le mois', async () => {
    await answerFirst(['Alix', 'Camille'])

    await fill(tpl(t.onboarding.starterSalaryOf, 'Alix'), '2400')
    await fill(tpl(t.onboarding.starterSalaryOf, 'Camille'), '1850')
    await fill(t.onboarding.starterRent, '980')
    await finishFrom(2, true)

    const { data, status } = state()
    expect(status).toBe('ready')

    const [alix, camille] = data.household.members
    expect(data.recurrences).toHaveLength(3)

    const salaries = data.recurrences.filter((r) => r.categoryId === 'salary')
    expect(salaries.map((r) => r.memberId)).toStrictEqual([alix?.id, camille?.id])
    expect(salaries.map((r) => r.amount)).toStrictEqual([240_000, 185_000])
    expect(salaries.every((r) => r.direction === 'in')).toBe(true)
    /* Le nom de la ligne, pas celui du tiroir : « Salaires, retraites ou
       indemnités » décrit la catégorie, et la pastille du membre dit déjà de
       qui c'est le salaire. */
    expect(salaries.every((r) => r.label === t.onboarding.starterSalaryLabel)).toBe(true)

    /* Le loyer n'est à personne et ne force rien : `defaultShared` le rend
       commun parce que c'est une charge que personne ne s'attribue. Poser
       `shared: true` ici recopierait la règle au lieu de s'y fier — et la
       ligne cesserait de suivre si la règle changeait. */
    const rent = data.recurrences.find((r) => r.categoryId === 'rent')
    expect(rent?.memberId).toBeUndefined()
    expect(rent?.shared).toBeUndefined()
    expect(rent?.direction).toBe('out')
    expect(rent?.label).toBe(t.onboarding.starterRentLabel)

    // Mensuelles au 1er, sans qu'on ait eu à le demander.
    const ym = currentYm()
    expect(data.recurrences.map((r) => r.startedOn)).toStrictEqual(Array(3).fill(startOfMonth(ym)))
    expect(data.recurrences.map((r) => r.period)).toStrictEqual(
      Array(3).fill({ unit: 'month', every: 1, anchorDay: 1 }),
    )

    /* Le vrai résultat de l'étape : on n'arrive pas sur un mois à zéro. Les
       échéances naissent à l'ouverture du mois, donc dans `finishOnboarding`,
       et elles arrivent à confirmer comme n'importe quel mois qui s'ouvre. */
    const planned = data.entries.filter((e) => e.date.startsWith(ym))
    expect(planned).toHaveLength(3)
    expect(planned.every((e) => e.status === 'planned')).toBe(true)
    expect(data.months.map((m) => m.ym)).toStrictEqual([ym])
  })

  it('accepte un revenu sans personne à qui l’attribuer — l’usage solo', async () => {
    await answerFirst([])

    await fill(t.onboarding.starterSalarySolo, '1700')
    await finishFrom(2, true)

    const { data, status } = state()
    expect(status).toBe('ready')
    expect(data.recurrences).toHaveLength(1)
    expect(data.recurrences[0]?.categoryId).toBe('salary')
    expect(data.recurrences[0]?.memberId).toBeUndefined()
  })

  /* Le cahier §4.1 ne cède pas : l'app reste utilisable sans cette étape, et le
     bouton qui la saute est visible. Sans ce test, « facultative » ne serait
     qu'une intention écrite dans un commentaire. */
  it('s’ouvre quand même quand on saute les deux étapes', async () => {
    await answerFirst(['Alix'])

    await finishFrom(2, false)

    expect(state().status).toBe('ready')
    expect(state().data.recurrences).toStrictEqual([])
    expect(state().data.savingSupports).toStrictEqual([])
  })

  it('ignore un champ vide sans retenir les autres', async () => {
    await answerFirst(['Alix'])

    // Le loyer reste vide, et le salaire passe quand même.
    await fill(tpl(t.onboarding.starterSalaryOf, 'Alix'), '2400')
    await finishFrom(2, true)

    expect(state().data.recurrences).toHaveLength(1)
    expect(state().data.recurrences[0]?.categoryId).toBe('salary')
  })

  /* Scénario A du chantier : une personne, un livret à 10 000 €, un versement
     mensuel de 200 €. Ce qui compte est ce qui *ne* doit pas exister — un
     second support, une seconde valorisation, un montant recopié. */
  it('pose le support, sa valeur et le versement qui l’alimente, sans doublon', async () => {
    await answerFirst(['Andrea'])
    await userEvent.click(screen.getByRole('button', { name: t.onboarding.starterSkip }))

    await userEvent.type(screen.getByLabelText(new RegExp(t.savings.supportLabel)), 'Livret A')
    await userEvent.selectOptions(
      screen.getByLabelText(new RegExp(t.savings.supportKind)),
      'passbook',
    )
    await userEvent.type(screen.getByLabelText(new RegExp(t.savings.valueInitial)), '10000')
    await userEvent.type(screen.getByLabelText(new RegExp(t.savings.contribution)), '200')
    await userEvent.click(screen.getByRole('button', { name: t.savings.supportAdd }))

    const { data } = state()
    const [member] = data.household.members
    const [support] = data.savingSupports
    expect(data.savingSupports).toHaveLength(1)
    expect(support?.label).toBe('Livret A')
    expect(support?.memberId).toBe(member?.id)

    /* Le capital vit dans la valorisation, et **nulle part** sur le support :
       c'est la règle qui interdit qu'ils divergent. */
    expect(data.savingValuations).toHaveLength(1)
    expect(data.savingValuations[0]?.amount).toBe(1_000_000)
    expect(data.savingValuations[0]?.supportId).toBe(support?.id)
    expect(JSON.stringify(support)).not.toContain('1000000')

    /* Le versement mensuel est une récurrence reliée au support, pas un champ
       posé dessus : c'est elle qui produira les `Entry`. */
    expect(data.recurrences).toHaveLength(1)
    expect(data.recurrences[0]?.savingSupportId).toBe(support?.id)
    expect(data.recurrences[0]?.amount).toBe(20_000)
    expect(data.recurrences[0]?.direction).toBe('out')
    expect(data.recurrences[0]?.categoryId).toBe('passbook')

    await userEvent.click(screen.getByRole('button', { name: t.onboarding.start }))
    expect(state().status).toBe('ready')
  })

  /* L'épargne est toujours à quelqu'un : sans personne, l'étape n'a rien à
     proposer, et elle le dit plutôt que d'inventer un porteur. */
  it('n’enregistre aucun support quand personne n’a été ajouté', async () => {
    await answerFirst([])
    await userEvent.click(screen.getByRole('button', { name: t.onboarding.starterSkip }))

    await userEvent.type(screen.getByLabelText(new RegExp(t.savings.supportLabel)), 'Livret A')
    await userEvent.selectOptions(
      screen.getByLabelText(new RegExp(t.savings.supportKind)),
      'passbook',
    )
    await userEvent.click(screen.getByRole('button', { name: t.savings.supportAdd }))

    expect(state().data.savingSupports).toStrictEqual([])
    expect(screen.getByText(t.savings.supportOwnerRequired)).toBeInTheDocument()
  })

  it('montre la part de chacun dès que deux revenus et un loyer sont posés', async () => {
    await answerFirst(['Alix', 'Camille'])

    // Rien encore : l'aperçu dit ce que l'étape débloque plutôt qu'un zéro.
    expect(screen.getByText(t.onboarding.previewStarterEmpty)).toBeInTheDocument()

    await fill(tpl(t.onboarding.starterSalaryOf, 'Alix'), '3000')
    await fill(tpl(t.onboarding.starterSalaryOf, 'Camille'), '1000')
    await fill(t.onboarding.starterRent, '1000')

    expect(screen.getByText(t.onboarding.previewStarterShare)).toBeInTheDocument()
    // 3 000 contre 1 000 : trois quarts, un quart. Et la somme fait le loyer.
    expect(screen.getByText(spoken(75_000))).toBeInTheDocument()
    expect(screen.getByText(spoken(25_000))).toBeInTheDocument()
    // Et le solde du mois au-dessus : 4 000 de revenus moins 1 000 de loyer.
    expect(screen.getByText(spoken(300_000))).toBeInTheDocument()
  })

  /* L'export ne se découvrait qu'au bout de trente jours, par un bandeau. Il se
     nomme désormais là où la promesse de confidentialité est faite. */
  it('nomme l’export à la dernière étape, et pas avant', async () => {
    await openPrinciple()
    expect(screen.queryByText(t.onboarding.backup)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: t.onboarding.solo }))
    expect(screen.queryByText(t.onboarding.backup)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: t.onboarding.starterSkip }))
    expect(screen.getByText(t.onboarding.backup)).toBeInTheDocument()
  })

  /* La contrepartie, elle, se dit d'entrée : c'est l'étape d'ouverture qui la
     porte, avant qu'on ait rien saisi. Elle n'attend plus la fin — apprendre au
     bout de trois écrans que tout peut disparaître, c'est l'apprendre trop tard
     pour en tenir compte. */
  it('dit la contrepartie avant de demander quoi que ce soit', async () => {
    render(
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>,
    )
    expect(screen.getByText(t.onboarding.principleCatch)).toBeInTheDocument()
    /* Aucun champ sur cet écran : c'est ce qui en fait un énoncé et non une
       question de plus. */
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: t.onboarding.principleNext }))
    expect(screen.queryByText(t.onboarding.principleCatch)).not.toBeInTheDocument()
    expect(screen.getByLabelText(t.onboarding.membersLabel)).toBeInTheDocument()
  })

  /* Le retour rend le rang précédent, et non la première étape : la table qui
     le calculait était juste pour trois étapes et renvoyait la quatrième à
     l'énoncé. */
  it('revient d’une étape à la fois', async () => {
    await answerFirst([])
    await userEvent.click(screen.getByRole('button', { name: t.onboarding.starterSkip }))
    expect(screen.getByText(t.onboarding.savingsTitle)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: tpl(t.onboarding.backToStep, 3) }))
    expect(screen.getByText(t.onboarding.starterTitle)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: tpl(t.onboarding.backToStep, 2) }))
    expect(screen.getByLabelText(t.onboarding.membersLabel)).toBeInTheDocument()
  })

  /* La phrase se durcit d'un cran là où le navigateur a répondu qu'il ne
     s'engageait pas — et là seulement. Un « on ne sait pas » n'est pas un refus,
     et l'annoncer à tout le monde ferait de la phrase honnête un avertissement
     de plus qu'on n'écoute pas. */
  it('ne durcit la phrase que sur un refus dont on est sûr', async () => {
    useStorageHealth.setState({ probed: true, durable: 'unknown', asked: true })
    await openPrinciple()
    await userEvent.click(screen.getByRole('button', { name: t.onboarding.solo }))
    // La phrase vit à la dernière étape, celle de l'épargne.
    await userEvent.click(screen.getByRole('button', { name: t.onboarding.starterSkip }))
    expect(screen.getByText(t.onboarding.backup)).toBeInTheDocument()

    act(() => {
      useStorageHealth.setState({ durable: false })
    })
    expect(screen.getByText(t.onboarding.backupFragile)).toBeInTheDocument()
    expect(screen.queryByText(t.onboarding.backup)).not.toBeInTheDocument()
  })
})
