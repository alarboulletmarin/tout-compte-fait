import { useState } from 'react'
import { currentYm } from '@/domain/date'
import { latestValuation, savingTotal } from '@/domain/saving'
import { t } from '@/i18n/strings'
import { tpl } from '@/i18n/format'
import { SupportFields } from '@/features/savings/SupportFields'
import {
  emptySupportDraft,
  supportContribution,
  useSupportDraft,
} from '@/features/savings/supportDraft'
import { addRecurrence, addSavingSupport } from '@/store/actions'
import { useMemberMap, useMembers, useSavingSupports, useSavingValuations } from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Button } from '@/ui/Button'
import { Dot } from '@/ui/Dot'
import { AmountInput, Field } from '@/ui/Field'
import { Plus } from '@/ui/Icons'
import { ListRow } from '@/ui/ListRow'
import { Tile } from '@/ui/Tile'

/**
 * Troisième étape : où se trouve l'épargne d'aujourd'hui. Facultative, et elle
 * le dit.
 *
 * Elle ne demande **que** ce qui répond à « combien j'ai et où » : un nom, un
 * propriétaire, un type, un montant. Ni taux, ni objectif, ni durée, ni
 * allocation — l'onboarding ne devient pas un questionnaire patrimonial, et le
 * cahier §4.1 continue de refuser toute réponse exigée.
 *
 * Elle emploie **les mêmes entités que le reste de l'app** : le formulaire est
 * celui de la page Épargne, la mutation est `createSavingSupport`, et le
 * support créé ici est celui qu'un versement désignera demain. Rien n'est
 * recopié ailleurs à la fin de l'onboarding.
 *
 * Le montant saisi ne s'écrit pas sur le support : il pose sa **première
 * valorisation**, à la date du jour. Un seul chiffre, un seul endroit.
 */
export function SavingsStep({ onSubmit, onSkip }: { onSubmit: () => void; onSkip: () => void }) {
  const members = useMembers()
  const memberMap = useMemberMap()
  const supports = useSavingSupports()
  const valuations = useSavingValuations()
  const [adding, setAdding] = useState(supports.length === 0)

  const { draft, patch, errors, build } = useSupportDraft(
    emptySupportDraft(members.length === 1 ? { memberId: members[0]?.id ?? '' } : {}),
  )

  /* Le versement régulier, à côté du capital et jamais dedans : l'un dit ce
     qu'on possède, l'autre ce qu'on y met chaque mois. C'est la seule question
     de flux de cette étape, et elle produit une vraie récurrence reliée au
     support — pas un champ `monthlyContribution` posé sur le compte, qui serait
     une seconde vérité à côté des `Entry` qu'elle génère. */
  const [contribution, setContribution] = useState('')

  /* Le formulaire repart à neuf après chaque ajout : on saisit rarement un seul
     compte. La clef remonte le composant, ce qui est la façon la plus sûre de
     repartir d'un brouillon vide. */
  const [round, setRound] = useState(0)

  const add = (): void => {
    const input = build()
    if (input === null) return
    const support = addSavingSupport(input)
    const recurrence = supportContribution(support, contribution, currentYm())
    if (recurrence !== null) addRecurrence(recurrence)
    setContribution('')
    setRound((current) => current + 1)
    setAdding(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="t-section">{t.onboarding.savingsTitle}</h1>
        <p className="t-label">{t.onboarding.savingsHint}</p>
      </div>

      {supports.length > 0 && (
        <ul className="flex flex-col">
          {supports.map((support) => {
            const latest = latestValuation(valuations, support.id)
            const member = memberMap.get(support.memberId)
            return (
              <li key={support.id}>
                <ListRow
                  color={member?.color ?? 'var(--cat-rest)'}
                  label={support.label}
                  meta={member?.name ?? ''}
                  trailing={
                    latest === null ? (
                      <span className="t-label">{t.savings.valueNever}</span>
                    ) : (
                      <Amount value={latest.amount} />
                    )
                  }
                />
              </li>
            )
          })}
        </ul>
      )}

      {adding ? (
        <div key={round} className="flex flex-col gap-4">
          <SupportFields draft={draft} patch={patch} errors={errors} autoFocus />
          <Field
            label={t.savings.contribution}
            optional
            hint={t.savings.contributionHint}
          >
            {(id) => (
              <AmountInput
                id={id}
                value={contribution}
                placeholder="0,00"
                onChange={(event) => {
                  setContribution(event.target.value)
                }}
              />
            )}
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={add}>
              {t.savings.supportAdd}
            </Button>
            {supports.length > 0 && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setAdding(false)
                }}
              >
                {t.common.cancel}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="secondary"
          className="w-fit"
          onClick={() => {
            setAdding(true)
          }}
        >
          <Plus size={18} />
          {t.savings.supportAdd}
        </Button>
      )}

      {/* Le second bouton est aussi visible que le premier — la condition que le
          cahier §4.1 met à l'existence d'une étape facultative. */}
      <div className="flex flex-col gap-2">
        <Button type="button" full onClick={onSubmit}>
          {t.onboarding.start}
        </Button>
        <Button type="button" variant="ghost" full onClick={onSkip}>
          {t.onboarding.savingsSkip}
        </Button>
      </div>
    </div>
  )
}

/**
 * L'aperçu de l'étape : ce que ces supports valent, additionné.
 *
 * Le total ne compte que ce qui est renseigné, et dit ce qui manque : c'est la
 * même règle que sur l'écran Épargne, et il vaut mieux l'apprendre ici que
 * devant un patrimoine faux annoncé comme exact.
 */
export function SavingsPreview() {
  const supports = useSavingSupports()
  const valuations = useSavingValuations()
  const members = useMemberMap()

  if (supports.length === 0) {
    return (
      <Tile className="gap-3">
        <p className="t-label">{t.onboarding.previewSavingsEmpty}</p>
      </Tile>
    )
  }

  /* Le même calcul que l'écran Épargne, pas une seconde addition : une inconnue
     n'entre pas dans le total, et le compte de ce qui manque est dit à côté.
     Sans `Entry` à ce stade — rien n'est encore tombé —, l'estimation vaut le
     relevé, ce qui est exact. */
  const total = savingTotal(supports, valuations)

  return (
    <Tile className="gap-3">
      <p className="t-label">{t.savings.total}</p>
      <Amount value={total.known} size="tile" />
      {total.unvalued > 0 && (
        <p className="t-label">
          {total.unvalued === 1
            ? t.savings.totalMissingOne
            : tpl(t.savings.totalMissing, total.unvalued)}
        </p>
      )}
      <ul className="flex flex-col gap-1">
        {supports.map((support) => {
          const member = members.get(support.memberId)
          return (
            <li key={support.id} className="flex items-center gap-2">
              <Dot color={member?.color ?? 'var(--cat-rest)'} />
              <span className="t-body min-w-0 flex-1 truncate">{support.label}</span>
              <span className="t-label shrink-0">{member?.name ?? ''}</span>
            </li>
          )
        })}
      </ul>
    </Tile>
  )
}
