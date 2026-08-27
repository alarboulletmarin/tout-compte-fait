import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { type Money, neg, sub, sum } from '@/domain/money'
import { t } from '@/i18n/strings'
import { formatMoney, formatSignedMoney } from '@/i18n/format'
import { LandingProof } from './LandingProof'
import { SAMPLE } from './sample'

/* `getByText` normalise les blancs du nœud avant de comparer : l'espace
   insécable étroite qu'`Intl` glisse devant le symbole y devient une espace
   ordinaire. La chaîne attendue, elle, la garde telle quelle — sans le même
   passage, aucune assertion sur un montant ne retrouverait son texte. */
const said = (text: string): string => text.replace(/\s+/g, ' ').trim()

/** Ce qu'`Amount` donne à lire d'une sortie, en texte hors de l'œil. */
const out = (value: Money): string =>
  said(`${t.direction.out.toLowerCase()} ${formatMoney(value, 'EUR')}`)

describe('La démonstration du calcul', () => {
  /* La raison d'être de la section. La page affirmait — dans `splitBody` — que
     « la somme des parts vaut exactement le total » ; elle le montre désormais,
     et ces deux montants-là sont l'argument entier. S'ils divergent un jour, la
     page dément à l'écran ce qu'elle promet trois centimètres plus haut. */
  it('affiche le même montant sur le pot commun et sur le total des versements', () => {
    render(<LandingProof />)

    // Deux fois : en tête de tuile, et sur la ligne de vérification.
    expect(screen.getAllByText(out(SAMPLE.shared))).toHaveLength(2)
    expect(screen.getByText(t.split.checkTotal)).toBeInTheDocument()
    expect(screen.getByText(t.split.checkHint)).toBeInTheDocument()
  })

  /* La déduction est la moitié de la promesse qui ne se lisait nulle part.
     Elle se voit sur la ligne de qui a avancé — signe compris, c'est lui qui
     dit que le montant se retranche — et sur le total des virements, qui vaut
     le pot moins ce qui est déjà sorti. */
  it('montre ce qui a été avancé, et le total des virements qui s’en déduit', () => {
    render(<LandingProof />)

    const advancer = SAMPLE.shares.find((share) => share.advanced > 0)
    expect(screen.getByText(t.split.advancedLine)).toBeInTheDocument()
    expect(
      screen.getByText(said(formatSignedMoney(neg(advancer?.advanced ?? SAMPLE.advanced), 'EUR'))),
    ).toBeInTheDocument()

    expect(screen.getByText(t.split.checkTransfers)).toBeInTheDocument()
    const transfers = sum(SAMPLE.shares.map((share) => sub(share.due, share.advanced)))
    expect(screen.getByText(out(transfers))).toBeInTheDocument()
  })

  /* La cascade, terme par terme : c'est elle qui distingue la capacité du solde
     du mois, et le résultat seul se croirait sur parole. */
  it('pose les trois termes de la capacité d’épargne', () => {
    render(<LandingProof />)

    expect(screen.getByText(t.savings.flowIncome)).toBeInTheDocument()
    expect(screen.getByText(t.savings.flowCharges)).toBeInTheDocument()
    expect(screen.getByText(t.savings.flowDebts)).toBeInTheDocument()
    expect(screen.getByText(t.dashboard.capacityHint)).toBeInTheDocument()
  })
})
