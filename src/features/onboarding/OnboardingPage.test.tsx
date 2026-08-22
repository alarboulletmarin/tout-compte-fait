import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addMonthsToYm, currentYm, startOfMonth } from '@/domain/date'
import { money } from '@/domain/money'
import { t } from '@/i18n/strings'
import { formatMoney, tpl } from '@/i18n/format'
import { closeDb } from '@/persistence/db'
import { emptyData } from '@/persistence/defaults'
import { useStorageHealth } from '@/persistence/health'
import { useStore } from '@/store/store'
import { OnboardingPage } from './OnboardingPage'
import { FALLBACK_CATEGORY } from './queue'

/* Le premier lancement, tel qu'il se présente : rien d'enregistré, statut
   « onboarding ». C'est cette garde-là qui fait que les récurrences posées par
   la file n'ont encore aucune échéance — elles naissent à l'ouverture du mois,
   dans `finishOnboarding`. */
function firstLaunch(): void {
  useStore.setState({ status: 'onboarding', data: emptyData(), error: null, ym: currentYm() })
}

const state = () => useStore.getState()

function open(): void {
  render(
    <MemoryRouter>
      <OnboardingPage />
    </MemoryRouter>,
  )
}

/** Le compteur du haut, tel qu'il s'écrit : « 3 / 7 ». */
function counter(): string {
  return screen.getByText(/\d+ \/ \d+/).textContent ?? ''
}

/** Combien de cartes la file compte, lu sur le compteur et non sur le code. */
function total(): number {
  return Number(counter().split('/')[1]?.trim() ?? '0')
}

const click = async (name: string): Promise<void> => {
  await userEvent.click(screen.getByRole('button', { name }))
}

/* Un `Segmented` est un groupe de boutons radio, pas une rangée de boutons :
   c'est la règle APG qu'il suit, et le test la suit avec lui. */
const pick = async (name: string): Promise<void> => {
  await userEvent.click(screen.getByRole('radio', { name }))
}

/** Frappe un montant au pavé, touche par touche. */
async function keypad(digits: string): Promise<void> {
  for (const digit of digits) await click(digit)
}

/** Passe à la carte suivante. */
const next = (): Promise<void> => click(t.common.next)

/** Nomme les personnes du foyer, qui répond compris. */
async function household(names: readonly string[]): Promise<void> {
  await pick(t.onboarding.whoMulti)
  for (const name of names) {
    await userEvent.type(screen.getByLabelText(new RegExp(t.onboarding.namesLabel)), name)
    await click(t.onboarding.namesAdd)
  }
}

/* Le montant tel qu'un lecteur d'écran l'entend. Les espaces fines insécables
   d'`Amount` sont ramenées à l'espace ordinaire, comme le fait la normalisation
   de `getByText` sur le texte du DOM. */
const spoken = (cents: number): string => formatMoney(money(cents), 'EUR').replace(/\s/g, ' ')

describe('la file du premier lancement', () => {
  beforeEach(firstLaunch)

  afterEach(() => {
    closeDb()
    useStorageHealth.setState({ durable: 'unknown', probed: false, asked: false })
  })

  /* La promesse de l'écran : le nombre de cartes dépend des réponses. Sans ce
     test, « file adaptative » ne serait qu'une intention écrite en commentaire. */
  it('s’allonge d’une carte par personne, et se raccourcit quand on en retire une', async () => {
    open()
    // Solo : foyer, un revenu, logement, autres charges, départ, récapitulatif.
    expect(total()).toBe(6)

    await pick(t.onboarding.whoMulti)
    // Personne de nommé : la file ne bouge pas, la carte de revenu reste « toi ».
    expect(total()).toBe(6)

    await userEvent.type(screen.getByLabelText(new RegExp(t.onboarding.namesLabel)), 'Alix')
    await click(t.onboarding.namesAdd)
    expect(total()).toBe(6)

    await userEvent.type(screen.getByLabelText(new RegExp(t.onboarding.namesLabel)), 'Camille')
    await click(t.onboarding.namesAdd)
    expect(total()).toBe(7)

    await click(tpl(t.onboarding.namesRemove, 'Camille'))
    expect(total()).toBe(6)

    // Et repasser en solo ramène la file à sa longueur de départ.
    await pick(t.onboarding.whoSolo)
    expect(total()).toBe(6)
  })

  /* Solo = zéro membre, et c'est la décision qui commande toute la file :
     `scopeToMember` et `memberCharges` ont un chemin solo explicite, qui
     n'existe que si personne n'est nommé. Un membre « moi » inventé ici les
     rendrait morts. */
  it('ne crée aucun membre en solo, et pose le revenu sans propriétaire', async () => {
    open()
    await next() // foyer
    await keypad('170000') // 1 700,00
    await next()
    await next() // logement, vide
    await next() // autres charges, vide
    await next() // point de départ
    await click(t.onboarding.start)

    const { data, status } = state()
    expect(status).toBe('ready')
    expect(data.household.members).toStrictEqual([])
    expect(data.recurrences).toHaveLength(1)
    expect(data.recurrences[0]?.categoryId).toBe('salary')
    expect(data.recurrences[0]?.amount).toBe(170_000)
    expect(data.recurrences[0]?.memberId).toBeUndefined()
  })

  /* Le cas nominal à deux : un salaire par personne, le loyer commun, et les
     trois règles au 1er du mois courant. Le loyer ne porte ni membre ni
     `shared` — `defaultShared` le rend commun parce que c'est une charge que
     personne ne s'attribue. */
  it('pose un salaire par personne et un logement commun, puis ouvre le mois', async () => {
    open()
    await household(['Alix', 'Camille'])
    await next()

    await keypad('240000')
    await next()
    await keypad('185000')
    await next()
    await keypad('98000')
    await next()
    await next() // autres charges, vide
    await next() // point de départ
    await click(t.onboarding.start)

    const { data, status } = state()
    expect(status).toBe('ready')

    const [alix, camille] = data.household.members
    expect(data.recurrences).toHaveLength(3)

    const salaries = data.recurrences.filter((rule) => rule.categoryId === 'salary')
    expect(salaries.map((rule) => rule.memberId)).toStrictEqual([alix?.id, camille?.id])
    expect(salaries.map((rule) => rule.amount)).toStrictEqual([240_000, 185_000])
    expect(salaries.every((rule) => rule.direction === 'in')).toBe(true)
    /* Le nom de la ligne, pas celui du tiroir, et il vient du chemin rapide
       vers une règle : deux écrans qui écriraient « Salaire » chacun de leur
       côté finiraient par ne plus écrire la même chose. */
    expect(salaries.every((rule) => rule.label === t.quickRule.nameSalary)).toBe(true)

    const rent = data.recurrences.find((rule) => rule.categoryId === 'rent')
    expect(rent?.memberId).toBeUndefined()
    expect(rent?.shared).toBeUndefined()
    expect(rent?.direction).toBe('out')
    expect(rent?.label).toBe(t.quickRule.nameRent)

    const ym = currentYm()
    expect(data.recurrences.map((rule) => rule.startedOn)).toStrictEqual(
      Array(3).fill(startOfMonth(ym)),
    )
    expect(data.recurrences.map((rule) => rule.period)).toStrictEqual(
      Array(3).fill({ unit: 'month', every: 1, anchorDay: 1 }),
    )

    /* Le vrai résultat de la file : on n'arrive pas sur un mois à zéro. Les
       échéances naissent à l'ouverture du mois, donc dans `finishOnboarding`. */
    const planned = data.entries.filter((entry) => entry.date.startsWith(ym))
    expect(planned).toHaveLength(3)
    expect(planned.every((entry) => entry.status === 'planned')).toBe(true)
  })

  /* E16 : une charge répétable produit une **récurrence**, jamais une entrée du
     mois — sinon elle ne remplirait pas septembre, ce qui est la promesse de
     l'écran. Et `categoryId` est obligatoire : chaque ligne libre atterrit sur
     le repli, que l'écran nomme. */
  it('transforme chaque charge libre en règle mensuelle rangée sous le repli', async () => {
    open()
    await next() // foyer, solo
    await next() // revenu, vide
    await next() // logement, vide

    const fallback = state().data.categories.find((one) => one.id === FALLBACK_CATEGORY)
    expect(fallback).toBeDefined()
    expect(screen.getByText(tpl(t.onboarding.extrasFallback, fallback?.label ?? ''))).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(new RegExp(t.onboarding.extrasName)), 'Netflix')
    await userEvent.type(screen.getByLabelText(new RegExp(t.onboarding.extrasAmount)), '13,49')
    await click(t.onboarding.extrasAdd)

    await userEvent.type(screen.getByLabelText(new RegExp(t.onboarding.extrasName)), 'Mutuelle')
    await userEvent.type(screen.getByLabelText(new RegExp(t.onboarding.extrasAmount)), '42')
    await click(t.onboarding.extrasAdd)

    // Le total en pied de carte, additionné et non recalculé à l'écran.
    expect(screen.getByText(spoken(5_549))).toBeInTheDocument()

    await next() // point de départ
    await next() // récapitulatif
    await click(t.onboarding.start)

    const { data } = state()
    expect(data.recurrences).toHaveLength(2)
    expect(data.recurrences.map((rule) => rule.label)).toStrictEqual(['Netflix', 'Mutuelle'])
    expect(data.recurrences.map((rule) => rule.amount)).toStrictEqual([1_349, 4_200])
    for (const rule of data.recurrences) {
      expect(rule.categoryId).toBe(FALLBACK_CATEGORY)
      // Une catégorie qui existe vraiment dans le document, pas un identifiant
      // en dur qu'une suppression rendrait mort.
      expect(data.categories.some((one) => one.id === rule.categoryId)).toBe(true)
      expect(rule.direction).toBe('out')
      expect(rule.period).toStrictEqual({ unit: 'month', every: 1, anchorDay: 1 })
    }
    // Aucune ligne du mois écrite à la main : ce sont les règles qui les font.
    expect(data.entries.every((entry) => entry.recurrenceId !== undefined)).toBe(true)
  })

  /* E17 : « point de départ » choisit le mois **affiché**, pas le mois ouvert.
     On ne peut pas *ne pas* ouvrir le mois courant — `hydrate` le rouvre à
     chaque lancement, et l'app en fait un invariant. */
  it('démarre au mois suivant sans empêcher le mois courant de s’ouvrir', async () => {
    open()
    await next() // foyer
    await keypad('200000')
    await next()
    await next() // logement, vide
    await next() // autres charges, vide
    await pick(t.onboarding.startNext)
    await next() // récapitulatif
    await click(t.onboarding.start)

    const ym = currentYm()
    const nextYm = addMonthsToYm(ym, 1)
    const { data } = state()

    // Le mois affiché est celui qu'on a choisi.
    expect(state().ym).toBe(nextYm)
    // Les deux mois sont ouverts : le courant parce qu'il l'est toujours, le
    // suivant parce qu'on vient d'y aller.
    expect(data.months.map((month) => month.ym).sort()).toStrictEqual([ym, nextYm])
    // Et la règle ne court qu'à partir du suivant : le courant reste vide.
    expect(data.recurrences[0]?.startedOn).toBe(startOfMonth(nextYm))
    expect(data.entries.filter((entry) => entry.date.startsWith(ym))).toStrictEqual([])
    expect(data.entries.filter((entry) => entry.date.startsWith(nextYm))).toHaveLength(1)
  })

  /* Le récapitulatif compose les réponses, et il nomme son dernier chiffre
     « Prévisionnel » : « reste à vivre » désigne autre chose dans le domaine —
     un solde arrêté la veille de la prochaine rentrée d'argent. */
  it('récapitule le foyer, le partage et le prévisionnel', async () => {
    open()
    await household(['Alix', 'Camille'])
    await next()
    await keypad('300000')
    await next()
    await keypad('100000')
    await next()
    await keypad('90000')
    await next()
    await userEvent.type(screen.getByLabelText(new RegExp(t.onboarding.extrasName)), 'Netflix')
    await userEvent.type(screen.getByLabelText(new RegExp(t.onboarding.extrasAmount)), '10')
    await click(t.onboarding.extrasAdd)
    await next()
    await next() // point de départ

    expect(screen.getByText(t.onboarding.summaryTitle)).toBeInTheDocument()
    expect(screen.getByText('Alix et Camille')).toBeInTheDocument()
    expect(screen.getByText(t.onboarding.summaryShareValue)).toBeInTheDocument()
    expect(screen.getByText(t.onboarding.summaryExtrasOne)).toBeInTheDocument()
    // 4 000 de revenus, 900 de logement, 10 d'abonnement : 3 090 de prévu.
    expect(await screen.findByText(spoken(309_000))).toBeInTheDocument()
  })

  /* Le partage ne se propose pas, il s'énonce : le modèle ne connaît que le
     prorata des revenus. La phrase apparaît là où la réponse se donne, et
     disparaît quand il n'y a plus personne avec qui partager. */
  it('énonce la règle de partage dès deux personnes, et se tait à une', async () => {
    open()
    await household(['Alix'])
    expect(screen.getByText(tpl(t.onboarding.namesShareOne, 'Alix'))).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(new RegExp(t.onboarding.namesLabel)), 'Camille')
    await click(t.onboarding.namesAdd)
    expect(
      screen.getByText(tpl(t.onboarding.namesShare, 'Alix et Camille')),
    ).toBeInTheDocument()
  })

  /* « Plus tard » est aussi visible que l'action principale — la condition que
     le cahier §4.1 met à l'existence de chaque question — et il n'écrit rien. */
  it('s’ouvre quand même quand on saute tout', async () => {
    open()
    for (let step = 0; step < 5; step += 1) await click(t.onboarding.later)
    await click(t.onboarding.start)

    expect(state().status).toBe('ready')
    expect(state().data.recurrences).toStrictEqual([])
    expect(state().data.household.members).toStrictEqual([])
  })

  /* Le pavé accepte la frappe, et c'est ce qui rend la file tenable au clavier :
     six chiffres au doigt sur chacune des cartes de montant serait pénible. */
  it('accepte la frappe au clavier sur une carte de montant', async () => {
    open()
    await next()
    await userEvent.keyboard('123456')
    expect(screen.getByText(spoken(123_456))).toBeInTheDocument()
  })

  /* Le retour rend la carte précédente sans rien perdre : les réponses vivent
     dans le brouillon, pas dans les cartes. */
  it('revient d’une carte à la fois, et garde ce qui a été saisi', async () => {
    open()
    await next()
    await keypad('50000')
    await next()
    expect(screen.getByText(t.onboarding.rentTitle)).toBeInTheDocument()

    await click(t.onboarding.back)
    expect(screen.getByText(spoken(50_000))).toBeInTheDocument()
  })

  /* La phrase de sauvegarde ne se durcit que là où le navigateur a répondu
     qu'il ne s'engageait pas, et elle attend le récapitulatif : la dire sur les
     sept cartes en ferait un avertissement de plus qu'on n'écoute pas. */
  it('nomme l’export au récapitulatif, et pas avant', async () => {
    open()
    expect(screen.queryByText(t.onboarding.backup)).not.toBeInTheDocument()
    for (let step = 0; step < 5; step += 1) await click(t.onboarding.later)
    expect(screen.getByText(t.onboarding.backup)).toBeInTheDocument()
  })
})
