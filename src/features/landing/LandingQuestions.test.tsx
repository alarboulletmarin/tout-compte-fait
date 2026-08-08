import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { DOCS_URL, REPO_URL } from '@/app/meta'
import { LEGAL_NOTICE_PATH } from '@/app/routes'
import { t } from '@/i18n/strings'
import { landing } from '@/i18n/landing'
import { LandingQuestions } from './LandingQuestions'

function show(): void {
  render(
    <MemoryRouter>
      <LandingQuestions />
    </MemoryRouter>,
  )
}

describe('Les questions de la présentation', () => {
  /* Les quatre objections que se pose quelqu'un devant une app de finances sans
     compte. Deux étaient traitées en une demi-phrase, deux ne l'étaient nulle
     part — et ce sont elles qui décident. */
  it('répond aux quatre objections, en clair et sans les replier', () => {
    show()

    for (const { question, answer } of [
      { question: landing.deviceTitle, answer: landing.deviceBody },
      { question: landing.lossTitle, answer: landing.lossBody },
      { question: landing.catchTitle, answer: landing.catchBody },
      { question: landing.whoTitle, answer: landing.whoBody },
    ]) {
      expect(screen.getByRole('heading', { name: question })).toBeInTheDocument()
      // Visible, pas derrière un chevron : une objection cachée reste entière.
      expect(screen.getByText(answer)).toBeVisible()
    }
  })

  /* Le cahier des charges et le design system sont l'argument de sérieux le
     plus fort du dépôt, et ils n'étaient atteignables que depuis « à propos » —
     pas depuis la page que voit un visiteur qui ne crée aucun foyer, et qui est
     souvent la seule qu'il verra. */
  it('mène au code et à la documentation du projet', () => {
    show()

    expect(screen.getByRole('link', { name: new RegExp(t.about.repo) })).toHaveAttribute(
      'href',
      REPO_URL,
    )
    expect(screen.getByRole('link', { name: new RegExp(t.about.docs) })).toHaveAttribute(
      'href',
      DOCS_URL,
    )
  })

  /* « L'éditeur est nommé dans les mentions légales » désigne une page : elle se
     clique, sinon la phrase demande d'être crue sur parole — ce que cette
     section existe pour éviter. */
  it('mène aux mentions légales depuis la question qui les invoque', () => {
    show()

    expect(screen.getByRole('link', { name: t.legal.notice })).toHaveAttribute(
      'href',
      LEGAL_NOTICE_PATH,
    )
  })
})
