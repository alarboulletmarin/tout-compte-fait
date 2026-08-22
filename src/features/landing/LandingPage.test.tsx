import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { currentYm } from '@/domain/date'
import { LANDING_PATH, ONBOARDING_PATH } from '@/app/routes'
import { t } from '@/i18n/strings'
import { landing } from '@/i18n/landing'
import { closeDb } from '@/persistence/db'
import { emptyData } from '@/persistence/defaults'
import { useStore } from '@/store/store'
import { LandingPage } from './LandingPage'

const state = () => useStore.getState()

/** Un appareil neuf : rien d'enregistré, l'app n'a rien à montrer. */
function empty(): void {
  useStore.setState({ status: 'onboarding', data: emptyData(), error: null, ym: currentYm() })
}

/* La présentation vit au-dessus du gate et navigue vers deux endroits — les
   questions et le mois. Les deux destinations sont montées ici, à leur vraie
   URL, pour que le test lise ce que le clic produit et non ce qu'il appelle. */
function open(): void {
  render(
    <MemoryRouter initialEntries={[LANDING_PATH]}>
      <Routes>
        <Route path={LANDING_PATH} element={<LandingPage />} />
        <Route path={ONBOARDING_PATH} element={<p>les questions</p>} />
        <Route path="/" element={<p>le mois</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('la présentation', () => {
  beforeEach(empty)
  afterEach(closeDb)

  /* Le bloc du haut est la page : la promesse, les trois portes, les trois
     arguments, et les tuiles qui montrent l'app plutôt que de la décrire. */
  it('ouvre sur la promesse, ses trois portes et ses trois arguments', () => {
    open()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t.app.tagline)

    // « Créer mon suivi » deux fois : dans la barre du haut et sous la
    // promesse. C'est la même action, à deux hauteurs de défilement.
    expect(screen.getAllByRole('button', { name: landing.start })).toHaveLength(2)
    expect(screen.getByRole('button', { name: t.settings.exampleLoad })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: landing.enterEmpty })).toBeInTheDocument()

    for (const point of [
      landing.pointLocalTitle,
      landing.pointRecurringTitle,
      landing.pointExportTitle,
    ]) {
      expect(screen.getByText(point)).toBeInTheDocument()
    }
  })

  /* Les tuiles sont les vrais composants de l'app, pas une capture (DS §1), et
     la légende qui les suit dit que leurs chiffres sont ceux d'un exemple. Une
     grille de démonstration qui ne se déclare pas est une grille qui ment. */
  it('montre de vraies tuiles, et avoue que leurs chiffres sont un exemple', () => {
    open()
    expect(screen.getByText(t.dashboard.forecast)).toBeInTheDocument()
    expect(screen.getByText(landing.mechanismLabel)).toBeInTheDocument()
    expect(screen.getByText(landing.mechanismBody)).toBeInTheDocument()
    expect(screen.getByText(landing.sample)).toBeInTheDocument()
  })

  /* La contrepartie ferme la page, et elle la ferme *avant* qu'on ait répondu à
     quoi que ce soit : une promesse et son prix se disent ensemble, sinon la
     moitié qui arrive plus tard passe pour un aveu. */
  it('dit la contrepartie en pied de page', () => {
    open()
    expect(screen.getByText(landing.counterpart)).toBeInTheDocument()
  })

  it('mène aux questions', async () => {
    open()
    await userEvent.click(screen.getAllByRole('button', { name: landing.start })[0] as HTMLElement)
    expect(screen.getByText('les questions')).toBeInTheDocument()
  })

  /* La troisième porte : entrer les mains vides. Elle n'écrit qu'un document
     par défaut et ouvre le mois courant — c'est l'état vide du mois qui prend
     le relais, pas la présentation. Le gate n'est pas touché : c'est le statut
     qui décide de l'écran, et il vient de passer à « prêt » (F19). */
  it('ouvre un document vide sans passer par les questions', async () => {
    open()
    await userEvent.click(screen.getByRole('button', { name: landing.enterEmpty }))

    expect(state().status).toBe('ready')
    expect(state().data.entries).toStrictEqual([])
    expect(state().data.recurrences).toStrictEqual([])
    // Le mois courant est ouvert : c'est `finishOnboarding` qui s'en charge.
    expect(state().data.months.map((month) => month.ym)).toStrictEqual([currentYm()])
    expect(screen.getByText('le mois')).toBeInTheDocument()
  })

  /* Tant que l'hydratation n'a pas répondu, on ne sait pas quoi proposer : rien
     plutôt qu'un bouton qui changerait de sens sous le doigt. */
  it('ne propose rien tant que le document n’a pas été lu', () => {
    useStore.setState({ status: 'loading' })
    open()
    expect(screen.queryByRole('button', { name: landing.start })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: landing.enterEmpty })).not.toBeInTheDocument()
    // La page reste lisible pour autant : c'est ce qu'elle est venue faire.
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  /* Un document qui existe et ne se lit pas : ici on répare, on ne commence
     pas. « Créer mon suivi » écraserait ce qu'on n'a pas su ouvrir. */
  it('remplace les portes par la réparation quand le document est illisible', () => {
    useStore.setState({ error: { kind: 'read', message: 'illisible' } })
    open()
    expect(screen.getByRole('alert')).toHaveTextContent('illisible')
    expect(screen.queryByRole('button', { name: landing.start })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: landing.enterEmpty })).not.toBeInTheDocument()
  })
})
