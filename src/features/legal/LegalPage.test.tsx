import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LEGAL_NOTICE_PATH, legalRoutes, PRIVACY_PATH, TERMS_PATH } from '@/app/routes'
import { HOST, legalNotice, privacyPolicy, terms } from '@/i18n/legal'
import { LegalNoticePage, PrivacyPage, TermsPage } from './LegalPage'

function renderAt(path: string, node: React.JSX.Element) {
  return render(<MemoryRouter initialEntries={[path]}>{node}</MemoryRouter>)
}

/** Le libellé que la table des routes donne à une page — la seule source. */
function labelOf(path: string): string {
  const label = legalRoutes().find((route) => route.path === path)?.label
  if (label === undefined) throw new Error(`Route juridique inconnue : ${path}`)
  return label
}

describe('pages juridiques', () => {
  it('titre chaque page avec le libellé de sa route, et non un second mot', () => {
    for (const [path, node] of [
      [LEGAL_NOTICE_PATH, <LegalNoticePage key="n" />],
      [PRIVACY_PATH, <PrivacyPage key="p" />],
      [TERMS_PATH, <TermsPage key="t" />],
    ] as const) {
      const { unmount } = renderAt(path, node)
      expect(screen.getByRole('heading', { level: 1, name: labelOf(path) })).toBeInTheDocument()
      unmount()
    }
  })

  it('rend chaque section de chaque document', () => {
    for (const [path, node, doc] of [
      [LEGAL_NOTICE_PATH, <LegalNoticePage key="n" />, legalNotice],
      [PRIVACY_PATH, <PrivacyPage key="p" />, privacyPolicy],
      [TERMS_PATH, <TermsPage key="t" />, terms],
    ] as const) {
      const { unmount } = renderAt(path, node)
      for (const section of doc.sections) {
        expect(screen.getByRole('heading', { level: 2, name: section.heading })).toBeInTheDocument()
      }
      unmount()
    }
  })

  /* La loi impose de nommer l'hébergeur avec son adresse *et* son téléphone :
     une mention qui n'en porte qu'un ne remplit pas l'obligation, et c'est le
     genre de ligne qui se perd au premier remaniement de la page. */
  it('nomme l’hébergeur avec son adresse et son téléphone', () => {
    renderAt(LEGAL_NOTICE_PATH, <LegalNoticePage />)
    const host = screen.getByText(new RegExp(HOST.name.replace('.', '\\.')))
    expect(host).toHaveTextContent(HOST.address)
    expect(host).toHaveTextContent(HOST.phone)
  })

  /* Les fontes sont sous OFL 1.1, qui demande d'être distribuée avec elles :
     sans ce lien, la distribution cesse d'être conforme sans que rien ne casse. */
  it('mène aux notices des composants tiers', () => {
    renderAt(PRIVACY_PATH, <PrivacyPage />)
    const link = screen.getByRole('link', { name: /licences des composants tiers/i })
    expect(link).toHaveAttribute('href', '/licences-tierces.txt')
  })

  /* On arrive sur l'une et on cherche presque toujours l'autre — mais jamais un
     lien vers la page qu'on est en train de lire. */
  it('renvoie aux deux autres pages, jamais à elle-même', () => {
    renderAt(PRIVACY_PATH, <PrivacyPage />)
    expect(screen.getByRole('link', { name: labelOf(LEGAL_NOTICE_PATH) })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: labelOf(TERMS_PATH) })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: labelOf(PRIVACY_PATH) })).not.toBeInTheDocument()
  })
})
