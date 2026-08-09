import { type Money, ZERO, sub, sum } from '@/domain/money'
import { allocate } from '@/domain/split'
import type { Member } from '@/domain/types'
import { t } from '@/i18n/strings'
import { Amount } from '@/ui/Amount'
import { Dot } from '@/ui/Dot'
import { Tile } from '@/ui/Tile'
import { type StarterLine, starterAmount } from './starter'

/**
 * Ce que la réponse en cours change, montré plutôt que promis.
 *
 * La question ne disait pas à quoi elle servait : le hint — « les membres
 * servent d'étiquette » — décrivait un mécanisme, pas un bénéfice. L'aperçu
 * répond à la place, en posant les prénoms devant ce qu'ils débloquent.
 *
 * Pas d'illustration ni de capture : c'est le vrai composant, aux vrais tokens
 * (DS §1).
 */
export function MembersPreview({ members }: { members: readonly Member[] }) {
  return (
    <Tile className="gap-3">
      {members.length === 0 ? (
        <p className="t-label">{t.onboarding.previewMembersEmpty}</p>
      ) : (
        <>
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {members.map((member) => (
              <li key={member.id} className="flex items-center gap-2">
                <Dot color={member.color} />
                <span className="t-body">{member.name}</span>
              </li>
            ))}
          </ul>
          <p className="t-label">{t.onboarding.previewMembers}</p>
        </>
      )}
    </Tile>
  )
}

/**
 * L'aperçu de la troisième étape : le mois que ces montants produiront.
 *
 * Il ne promet pas le prorata, il le calcule — avec `allocate`, la fonction du
 * domaine qui le calcule sur tous les autres écrans. C'est la thèse de l'app,
 * montrée à l'instant où l'on décide de s'en servir plutôt que trente jours
 * plus tard, et montrée avec le vrai composant de montant (DS §1).
 *
 * La part de chacun ne s'affiche qu'à partir de deux revenus : à un seul, elle
 * vaudrait le loyer entier et n'apprendrait rien de plus que la ligne du
 * dessus.
 */
export function StarterPreview({
  lines,
  amounts,
  members,
}: {
  lines: readonly StarterLine[]
  amounts: Readonly<Record<string, string>>
  members: readonly Member[]
}) {
  const filled = lines.map((line) => ({ line, amount: starterAmount(amounts, line.key) }))
  const incomes = filled.filter((row) => row.line.direction === 'in')
  const charges = filled.filter((row) => row.line.direction === 'out')

  if (filled.every((row) => row.amount === null)) {
    return (
      <Tile className="gap-3">
        <p className="t-label">{t.onboarding.previewStarterEmpty}</p>
      </Tile>
    )
  }

  const totalIn = sum(incomes.map((row) => row.amount ?? ZERO))
  const totalOut = sum(charges.map((row) => row.amount ?? ZERO))
  const balance: Money = sub(totalIn, totalOut)

  /* Le partage a besoin de deux revenus chiffrés et de quelque chose à
     partager. En dessous, `allocate` répondrait encore — par des zéros ou par
     le total sur une seule tête —, et c'est justement ce qu'il ne faut pas
     montrer comme une démonstration. */
  const weighted = incomes.filter((row) => row.amount !== null)
  const shares =
    weighted.length > 1 && totalOut > 0
      ? allocate(
          totalOut,
          weighted.map((row) => row.amount ?? ZERO),
        )
      : null

  const memberName = (id: string | undefined): Member | undefined =>
    members.find((member) => member.id === id)

  return (
    <Tile className="gap-3">
      <p className="t-label">{t.onboarding.previewStarterMonth}</p>
      <Amount value={balance} size="tile" />

      {shares !== null && (
        <>
          <p className="t-label">{t.onboarding.previewStarterShare}</p>
          <ul className="flex flex-col gap-1">
            {weighted.map((row, index) => {
              const member = memberName(row.line.memberId)
              return (
                <li key={row.line.key} className="flex items-center gap-2">
                  {member !== undefined && <Dot color={member.color} />}
                  <span className="t-body">{member?.name ?? row.line.label}</span>
                  <Amount
                    value={shares[index] ?? ZERO}
                    size="label"
                    tone="muted"
                    className="ml-auto"
                  />
                </li>
              )
            })}
          </ul>
        </>
      )}
    </Tile>
  )
}
