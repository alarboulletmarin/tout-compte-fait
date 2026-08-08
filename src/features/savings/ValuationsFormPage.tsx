import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SAVINGS_PATH } from '@/app/routes'
import { type ISODate, today } from '@/domain/date'
import { ZERO, parseAmount } from '@/domain/money'
import type { SavingSupport } from '@/domain/types'
import { fr } from '@/i18n/fr'
import { formatDate, formatMoney, tpl } from '@/i18n/format'
import { useActiveSavingSupports, useSupportValue } from '@/store/selectors'
import { addSavingValuations, undoable } from '@/store/actions'
import { Button } from '@/ui/Button'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { EmptyState } from '@/ui/EmptyState'
import { AmountInput, Field, TextInput } from '@/ui/Field'
import { PageTitle } from '@/ui/PageTitle'
import { Tile } from '@/ui/Tile'
import { useCurrency } from '@/ui/currency'
import { useLeaveGuard } from '@/ui/useLeaveGuard'
import { useIndividualScope } from './individualScope'

/**
 * Relever plusieurs supports d'un coup — le raccourci de l'écran Épargne.
 *
 * On ne relève pas ses comptes un par un : les chiffres arrivent ensemble, sur
 * un relevé de banque en fin de mois ou de trimestre. Les poser demandait
 * jusqu'ici d'ouvrir chaque fiche, de mettre à jour, de revenir, et de
 * recommencer — quatre allers-retours pour un seul geste.
 *
 * **Le raccourci n'est pas dans la tuile, et il ne peut pas y être.** Une tuile
 * actionnable est un `<button>`, qui n'admet pas de bouton ; et une tuile à lien
 * étendu ne contient rien d'actionnable non plus (DS §6). Y glisser une action
 * demanderait de retirer à la tuile sa cible pleine — la règle que le DS vient
 * justement de resserrer, parce qu'un coin de 44px sur une tuile de 300px n'est
 * pas une cible. L'action vit donc sur la **section**, qui n'a pas cette
 * contrainte, et elle y gagne : elle les prend tous.
 *
 * Un champ vide ne pose rien. C'est la règle de l'onboarding et celle de la
 * création d'un support : on ne connaît pas forcément tous ses chiffres le même
 * jour, et poser un relevé faute de mieux vaudrait moins que ne rien poser.
 */
export function ValuationsFormPage() {
  const navigate = useNavigate()
  const supports = useActiveSavingSupports()
  /* La même personne que l'écran d'où l'on vient : l'épargne se lit à son nom,
     et proposer les comptes de quelqu'un d'autre ici serait une autre lecture.
     Les archivés sont dehors : on ne relève pas un compte qu'on a fermé. */
  const owner = useIndividualScope()
  const mine = supports.filter((support) => support.memberId === owner)

  const back = (): void => {
    void navigate(SAVINGS_PATH)
  }

  if (mine.length === 0) {
    return (
      <div className="flex max-w-xl flex-col gap-5">
        <PageTitle title={fr.savings.valuesUpdate} onBack={back} />
        <EmptyState message={fr.savings.supportsEmpty} />
      </div>
    )
  }

  return <ValuationsForm key={mine.map((s) => s.id).join()} supports={mine} onDone={back} />
}

type Draft = { date: ISODate; amounts: Record<string, string> }

function ValuationsForm({
  supports,
  onDone,
}: {
  supports: readonly SavingSupport[]
  onDone: () => void
}) {
  const [draft, setDraft] = useState<Draft>({ date: today(), amounts: {} })
  const [showErrors, setShowErrors] = useState(false)
  const guard = useLeaveGuard({ date: draft.date, ...draft.amounts }, onDone)

  const filled = supports.flatMap((support) => {
    const text = draft.amounts[support.id] ?? ''
    if (text.trim() === '') return []
    const amount = parseAmount(text)
    return [{ support, text, amount }]
  })
  const invalid = filled.some((row) => row.amount === null || row.amount < ZERO)

  const submit = (): void => {
    if (invalid || filled.length === 0) {
      setShowErrors(true)
      return
    }
    /* Un seul geste, donc une seule écriture et un seul retour arrière : quatre
       relevés qu'on annulerait en quatre fois ne seraient pas ce qu'on vient de
       faire. */
    undoable(
      filled.length === 1
        ? fr.savings.valueAdded
        : tpl(fr.savings.valuesAdded, filled.length),
      () => {
        addSavingValuations(
          filled.map((row) => ({
            supportId: row.support.id,
            amount: row.amount ?? ZERO,
            date: draft.date,
          })),
        )
      },
    )
    onDone()
  }

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <PageTitle title={fr.savings.valuesUpdate} onBack={guard.request} />
      <p className="t-label">{fr.savings.valuesHint}</p>

      <form
        id="valuations-form"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <Tile className="gap-4">
          {/* Une seule date pour tous : c'est celle du relevé qu'on a sous les
              yeux. Corriger un chiffre à une autre date se fait sur la fiche du
              support, où l'on ne parle que de lui. */}
          <Field label={fr.savings.valueDate} required hint={fr.savings.valuesDateHint}>
            {(id) => (
              <TextInput
                id={id}
                type="date"
                value={draft.date}
                onChange={(event) => {
                  if (event.target.value !== '') {
                    setDraft((current) => ({ ...current, date: event.target.value }))
                  }
                }}
              />
            )}
          </Field>

          {supports.map((support, index) => (
            <SupportField
              key={support.id}
              support={support}
              value={draft.amounts[support.id] ?? ''}
              showError={showErrors}
              autoFocus={index === 0}
              onChange={(next) => {
                setDraft((current) => ({
                  ...current,
                  amounts: { ...current.amounts, [support.id]: next },
                }))
              }}
            />
          ))}
        </Tile>
      </form>

      {/* Désactivé plutôt qu'un message d'erreur après coup : il n'y a rien à
          enregistrer tant qu'aucun chiffre n'est saisi, et un bouton qui accepte
          le clic pour répondre « non » fait faire le geste pour rien.
          La raison ne peut pas vivre sur lui — un `disabled` ne prend pas le
          focus, donc son nom accessible n'est jamais lu (DS §6) : elle est dans
          l'aide au-dessus, qui reste affichée une fois le bouton débloqué. */}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" form="valuations-form" disabled={filled.length === 0}>
          {fr.common.save}
        </Button>
        <Button variant="secondary" onClick={guard.request}>
          {fr.common.cancel}
        </Button>
      </div>

      <p className="t-label">{fr.savings.valueMethod}</p>

      <ConfirmDialog {...guard.dialog} />
    </div>
  )
}

/**
 * Un support, son champ, et ce qu'on sait déjà de lui.
 *
 * Le dernier relevé se lit à côté du champ, avec sa date : c'est le seul moyen
 * de repérer un chiffre tapé de travers. Et l'estimation quand elle diffère —
 * « tu as versé 1 200 € depuis » —, parce que c'est précisément le chiffre que
 * la banque va confirmer ou corriger.
 */
function SupportField({
  support,
  value,
  showError,
  autoFocus,
  onChange,
}: {
  support: SavingSupport
  value: string
  showError: boolean
  autoFocus: boolean
  onChange: (next: string) => void
}) {
  const currency = useCurrency()
  const known = useSupportValue(support.id)
  const amount = value.trim() === '' ? null : parseAmount(value)
  const error = showError && value.trim() !== '' && (amount === null || amount < ZERO)

  const last =
    known?.known === null || known === null
      ? fr.savings.valueNever
      : tpl(
          fr.savings.valuesLast,
          formatMoney(known.known, currency),
          formatDate(known.knownOn ?? ''),
        )
  const drift =
    known !== null && known.movedSince !== ZERO && known.estimated !== null
      ? tpl(fr.savings.valuesDrift, formatMoney(known.estimated, currency))
      : undefined

  return (
    <Field
      label={support.label}
      optional
      hint={drift === undefined ? last : `${last} — ${drift}`}
      {...(error ? { error: fr.savings.valueRequired } : {})}
    >
      {/* « Nouvelle valeur » et non « 0,00 » : sous « Dernier relevé :
          10 631,00 € », un placeholder chiffré se lit comme une valeur déjà
          enregistrée, et un champ laissé tel quel promettrait alors d'écrire
          zéro plutôt que rien. C'est la confusion la plus coûteuse de cet écran,
          puisqu'elle porte sur tous les comptes à la fois. */}
      {(id, describedBy) => (
        <AmountInput
          id={id}
          aria-describedby={describedBy}
          value={value}
          invalid={error}
          placeholder={fr.savings.valueNew}
          autoFocus={autoFocus}
          onChange={(event) => {
            onChange(event.target.value)
          }}
        />
      )}
    </Field>
  )
}
