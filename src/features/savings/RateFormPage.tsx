import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { SAVINGS_PATH, supportPath } from '@/app/routes'
import { parseRateBp } from '@/domain/rate'
import { isOrigin } from '@/domain/savingRate'
import type { SavingRate } from '@/domain/types'
import { t } from '@/i18n/strings'
import { formatDate, formatPercent, tpl } from '@/i18n/format'
import { addSavingRate, removeSavingRate, replaceSavingRate, undoable } from '@/store/actions'
import { useSavingSupport, useSupportRates } from '@/store/selectors'
import { Button } from '@/ui/Button'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { DateInput, Field, TextInput } from '@/ui/Field'
import { PageTitle } from '@/ui/PageTitle'
import { Segmented } from '@/ui/Segmented'
import { Tile } from '@/ui/Tile'
import { toast } from '@/ui/toast'
import { useLeaveGuard } from '@/ui/useLeaveGuard'
import { type RateDraft, rateDraftFrom, rateError } from './supportDraft'

/**
 * Poser un taux — ou corriger un palier.
 *
 * Le pendant exact de `ValuationFormPage`, et l'analogie n'est pas une
 * commodité d'écriture : un taux et un capital sont deux faits datés, et les
 * deux gestes sont les mêmes. **Poser empile** : le palier d'avant garde la
 * période qu'il couvrait, et l'évolution déjà tracée ne bouge pas d'un centime.
 * **Corriger réécrit une ligne** : un chiffre mal tapé se rattrape, sinon il
 * reste faux pour toujours.
 *
 * Aucune `Entry` ne bouge dans un cas comme dans l'autre — et aucun total non
 * plus. Un taux ne fabrique pas d'argent dans le document (cahier §4.6 bis) ; la
 * phrase de méthode le dit sous la saisie, parce qu'un pourcentage posé sur une
 * fiche d'épargne se lit spontanément comme un calcul qui va se mettre à
 * tourner.
 */
export function RateFormPage() {
  const { id, rateId } = useParams()
  const support = useSavingSupport(id)
  const rates = useSupportRates(id)
  const rate = rates.find((one) => one.id === rateId) ?? null

  if (support === null) return <Navigate to={SAVINGS_PATH} replace />
  // Corrigé ou supprimé depuis un autre onglet : la fiche reste la bonne cible.
  if (rateId !== undefined && rate === null) return <Navigate to={supportPath(support.id)} replace />

  return (
    <RateForm
      key={rate?.id ?? 'nouveau'}
      supportId={support.id}
      supportLabel={support.label}
      {...(rate === null ? {} : { rateId: rate.id })}
      initial={rateDraftFrom(rate)}
      previous={rates.find((one) => one.id !== rate?.id) ?? null}
    />
  )
}

function RateForm({
  supportId,
  supportLabel,
  rateId,
  initial,
  previous,
}: {
  supportId: string
  supportLabel: string
  rateId?: string
  initial: RateDraft
  previous: SavingRate | null
}) {
  const navigate = useNavigate()
  const [draft, setDraft] = useState<RateDraft>(initial)
  const [showError, setShowError] = useState(false)
  const [removing, setRemoving] = useState(false)

  const back = (): void => {
    void navigate(supportPath(supportId))
  }
  const guard = useLeaveGuard(draft, back)
  const error = rateError(draft)

  const submit = (): void => {
    const rateBp = parseRateBp(draft.rateText)
    if (error !== undefined || rateBp === null) {
      setShowError(true)
      return
    }
    const next = { supportId, rateBp, kind: draft.kind, from: draft.from }
    if (rateId === undefined) {
      addSavingRate(next)
      toast(t.savings.rateAdded)
    } else {
      replaceSavingRate(rateId, next)
      toast(t.savings.rateUpdated)
    }
    back()
  }

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <PageTitle
        title={rateId === undefined ? t.savings.rateAdd : t.savings.rateEdit}
        onBack={guard.request}
      />
      <p className="t-label">{supportLabel}</p>

      <form
        id="rate-form"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <Tile className="gap-4">
          <Field
            label={t.savings.rateValue}
            required
            {...(showError && error !== undefined ? { error } : {})}
          >
            {(fieldId, describedBy) => (
              <span className="flex items-center gap-2">
                <TextInput
                  id={fieldId}
                  aria-describedby={describedBy}
                  className="max-w-24"
                  inputMode="decimal"
                  value={draft.rateText}
                  invalid={showError && error !== undefined}
                  autoFocus
                  onChange={(event) => {
                    setDraft((current) => ({ ...current, rateText: event.target.value }))
                  }}
                />
                {/* L'unité au bord du champ : « 3 » posé seul sous un libellé ne
                    dit pas s'il s'agit d'un pourcentage ou d'un montant. */}
                <span className="t-label shrink-0" aria-hidden="true">
                  {t.savings.ratePerYear}
                </span>
              </span>
            )}
          </Field>

          {/* La nature ne change aucun calcul — elle change ce que le chiffre
              *promet*, et c'est celui qui coche qui l'affirme. */}
          <div className="flex flex-col gap-2">
            <Segmented
              options={[
                { value: 'guaranteed' as const, label: t.savings.supportRateGuaranteed },
                { value: 'assumed' as const, label: t.savings.supportRateAssumed },
              ]}
              value={draft.kind}
              onChange={(kind) => {
                setDraft((current) => ({ ...current, kind }))
              }}
              label={t.savings.supportRateKind}
              className="w-fit"
            />
            {draft.kind === 'guaranteed' && (
              <p className="t-label">{t.savings.supportRateGuaranteedHint}</p>
            )}
          </div>

          <Field label={t.savings.rateDate} required hint={t.savings.rateDateHint}>
            {(fieldId, describedBy) => (
              <DateInput
                id={fieldId}
                aria-describedby={describedBy}
                value={draft.from}
                onChange={(event) => {
                  if (event.target.value !== '') {
                    setDraft((current) => ({ ...current, from: event.target.value }))
                  }
                }}
              />
            )}
          </Field>

          {/* Le palier d'avant, pour situer celui qu'on pose : c'est la seule
              chose qui permette de voir qu'on remplace 3 % par 2,40 % et non
              l'inverse. Sous le champ et non dedans — c'est une référence, pas
              une valeur par défaut. */}
          {previous !== null && (
            <div className="flex items-baseline justify-between gap-3 border-t border-border pt-4">
              <span className="t-label min-w-0 flex-1 truncate">
                {isOrigin(previous.from)
                  ? t.savings.rateFromOrigin
                  : tpl(t.savings.rateFrom, formatDate(previous.from))}
              </span>
              <span className="t-num-body tnum shrink-0">
                {formatPercent(previous.rateBp / 10_000, previous.rateBp % 100 === 0 ? 0 : 2)}
              </span>
            </div>
          )}
        </Tile>
      </form>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" form="rate-form">
          {t.common.save}
        </Button>
        <Button variant="secondary" onClick={guard.request}>
          {t.common.cancel}
        </Button>
      </div>

      {/* À distance des boutons qui closent la saisie, comme partout : ce n'est
          pas une façon de sortir de l'écran, c'est une suppression. */}
      {rateId !== undefined && (
        <Tile className="gap-3">
          <p className="t-label">{t.savings.rateMethod}</p>
          <Button
            variant="ghost"
            className="w-fit"
            onClick={() => {
              setRemoving(true)
            }}
          >
            {t.savings.rateRemove}
          </Button>
        </Tile>
      )}

      <ConfirmDialog
        open={removing}
        title={t.savings.rateRemove}
        steps={[{ question: t.savings.rateRemoveConfirm, action: t.common.delete }]}
        onCancel={() => {
          setRemoving(false)
        }}
        onConfirm={() => {
          setRemoving(false)
          if (rateId === undefined) return
          undoable(t.savings.rateRemoved, () => {
            removeSavingRate(rateId)
          })
          back()
        }}
      />

      <ConfirmDialog {...guard.dialog} />
    </div>
  )
}
