import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ADVANCES_PATH } from '@/app/routes'
import { monthlyInstalment, monthsCovered } from '@/domain/advance'
import { type ISODate, type YearMonth, currentYm, today, ymOf } from '@/domain/date'
import { parseAmount } from '@/domain/money'
import { t } from '@/i18n/strings'
import { formatMoney, tpl } from '@/i18n/format'
import { addAdvance } from '@/store/actions'
import { SupportSelect } from '@/features/savings/SupportSelect'
import { useActiveSavingSupports, useMembers } from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Button } from '@/ui/Button'
import { CategorySelect } from '@/ui/CategorySelect'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { AmountInput, Checkbox, DateInput, Field, TextInput } from '@/ui/Field'
import { PageTitle } from '@/ui/PageTitle'
import { Tile } from '@/ui/Tile'
import { useCurrency } from '@/ui/currency'
import { toast } from '@/ui/toast'
import { useLeaveGuard } from '@/ui/useLeaveGuard'

type Draft = {
  label: string
  amountText: string
  paidOn: ISODate
  categoryId: string
  savingSupportId: string
  memberId: string
  from: YearMonth
  to: YearMonth
  shared: boolean
}

/** Douze mois, bornes comprises : la période d'une assurance ou d'une taxe. */
function defaultDraft(): Draft {
  const now = currentYm()
  const [y, m] = now.split('-')
  const year = Number(y)
  const month = Number(m)
  const endYear = month === 1 ? year : year + 1
  const endMonth = month === 1 ? 12 : month - 1
  return {
    label: '',
    amountText: '',
    paidOn: today(),
    categoryId: '',
    savingSupportId: '',
    memberId: '',
    from: now,
    to: `${String(endYear)}-${String(endMonth).padStart(2, '0')}`,
    shared: false,
  }
}

/**
 * Poser une avance : ce qui a été payé, quand, sur quel support, et la période
 * que ça couvre. La mensualité s'en déduit — on ne la saisit pas, sinon les
 * deux chiffres finiraient par ne plus se répondre.
 *
 * Pas d'écran de reprise : une avance décrit un paiement qui a eu lieu, une
 * fois. La corriger, c'est la retirer et la reposer — ce qui est déjà revenu
 * sur le livret reste, comme pour un crédit qu'on cesse de suivre.
 */
export function AdvanceFormPage() {
  const members = useMembers()
  const supports = useActiveSavingSupports()
  const currency = useCurrency()
  const navigate = useNavigate()
  const location = useLocation()
  const [draft, setDraft] = useState<Draft>(defaultDraft)
  const [showErrors, setShowErrors] = useState(false)

  const amount = parseAmount(draft.amountText)
  const errors = {
    label: draft.label.trim() === '' ? t.advances.labelRequired : undefined,
    amount: amount === null || amount <= 0 ? t.advances.amountRequired : undefined,
    category: draft.categoryId === '' ? t.advances.categoryRequired : undefined,
    saving: draft.savingSupportId === '' ? t.advances.savingSupportRequired : undefined,
    period: draft.to < draft.from ? t.advances.periodInvalid : undefined,
  }
  // Le type doit rester celui de `errors` : `{}` littéral perdrait les clés, et
  // chaque champ irait chercher une propriété que TypeScript ne connaît plus.
  const shown: Partial<typeof errors> = showErrors ? errors : {}

  /* Choisir le support répond aussi à « qui a avancé » : l'argent vient d'un
     compte, et ce compte est à quelqu'un. Un second champ « Avancé par » ferait
     une réponse de plus, qui pourrait contredire la première — l'avance de
     Camille se reconstituerait alors sur le livret d'Alix. */
  const patch = (next: Partial<Draft>): void => {
    setDraft((current) => {
      if (next.savingSupportId === undefined) return { ...current, ...next }
      const support = supports.find((one) => one.id === next.savingSupportId)
      return { ...current, ...next, memberId: support?.memberId ?? '' }
    })
  }

  const back = (): void => {
    if (location.key === 'default') void navigate(ADVANCES_PATH)
    else void navigate(-1)
  }

  const guard = useLeaveGuard(draft, back)

  const months = monthsCovered(draft)
  const monthly = amount === null ? null : monthlyInstalment({ ...draft, amount })

  const submit = (): void => {
    if (Object.values(errors).some((error) => error !== undefined) || amount === null) {
      setShowErrors(true)
      return
    }
    addAdvance({
      label: draft.label.trim(),
      categoryId: draft.categoryId,
      savingSupportId: draft.savingSupportId,
      memberId: draft.memberId,
      amount,
      paidOn: draft.paidOn,
      from: draft.from,
      to: draft.to,
      ...(draft.shared ? { shared: true } : {}),
    })
    toast(t.advances.added)
    void navigate(ADVANCES_PATH)
  }

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <PageTitle title={t.advances.add} onBack={guard.request} />

      {/* Sans support, rien à enregistrer : une avance se prend sur une épargne
          qui existe, et qui est à quelqu'un. L'écran le dit plutôt que de
          proposer un champ vide — et il dit *laquelle* des deux choses manque. */}
      {members.length === 0 ? (
        <p className="t-label">{t.advances.memberNone}</p>
      ) : supports.length === 0 ? (
        <p className="t-label">{t.advances.savingSupportNone}</p>
      ) : (
        <>
          {/* La gouttière de l'écran, `gap-5`, jusqu'au bout : les blocs du
              formulaire s'écartaient de 16px par des `mt-4` posés à la main,
              soit un rythme de moins que la pile qui les contient. */}
          <form
            id="advance-form"
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
          >
            <Tile className="gap-4">
              <Field
                label={t.advances.label}
                required
                {...(shown.label === undefined ? {} : { error: shown.label })}
              >
                {(id, describedBy) => (
                  <TextInput
                    id={id}
                    aria-describedby={describedBy}
                    value={draft.label}
                    invalid={shown.label !== undefined}
                    placeholder={t.advances.labelPlaceholder}
                    maxLength={60}
                    autoFocus
                    onChange={(e) => {
                      patch({ label: e.target.value })
                    }}
                  />
                )}
              </Field>

              <Field
                label={t.advances.amount}
                required
                hint={t.advances.amountHint}
                {...(shown.amount === undefined ? {} : { error: shown.amount })}
              >
                {(id, describedBy) => (
                  <AmountInput
                    id={id}
                    aria-describedby={describedBy}
                    value={draft.amountText}
                    invalid={shown.amount !== undefined}
                    placeholder="600,00"
                    onChange={(e) => {
                      patch({ amountText: e.target.value })
                    }}
                  />
                )}
              </Field>

              <Field label={t.advances.paidOn} required>
                {(id) => (
                  <DateInput
                    id={id}
                    value={draft.paidOn}
                    onChange={(e) => {
                      const next = e.target.value
                      // Le mois de départ suit le paiement tant qu'on ne l'a pas
                      // déplacé soi-même : une avance couvre presque toujours la
                      // période qui commence le mois où on l'a réglée.
                      patch(
                        ymOf(draft.paidOn) === draft.from
                          ? { paidOn: next, from: ymOf(next) }
                          : { paidOn: next },
                      )
                    }}
                  />
                )}
              </Field>

              <Field
                label={t.advances.category}
                required
                {...(shown.category === undefined ? {} : { error: shown.category })}
              >
                {(id, describedBy) => (
                  <CategorySelect
                    id={id}
                    aria-describedby={describedBy}
                    direction="out"
                    value={draft.categoryId}
                    invalid={shown.category !== undefined}
                    onChange={(e) => {
                      patch({ categoryId: e.target.value })
                    }}
                  />
                )}
              </Field>

              <Field
                label={t.advances.savingSupport}
                required
                hint={t.advances.savingSupportHint}
                {...(shown.saving === undefined ? {} : { error: shown.saving })}
              >
                {(id, describedBy) => (
                  <SupportSelect
                    id={id}
                    aria-describedby={describedBy}
                    value={draft.savingSupportId}
                    invalid={shown.saving !== undefined}
                    onChange={(e) => {
                      patch({ savingSupportId: e.target.value })
                    }}
                  />
                )}
              </Field>

              <div className="flex flex-wrap gap-4">
                <Field label={t.advances.from} className="min-w-40 flex-1">
                  {(id) => (
                    <TextInput
                      id={id}
                      type="month"
                      /* Borné comme les autres champs de date de l'app : un
                         `YYYY-MM` a une longueur connue, et pleine largeur il
                         faisait sauter le bord droit de la colonne. */
                      className="max-w-48"
                      value={draft.from}
                      onChange={(e) => {
                        patch({ from: e.target.value })
                      }}
                    />
                  )}
                </Field>
                <Field
                  label={t.advances.to}
                  className="min-w-40 flex-1"
                  {...(shown.period === undefined ? {} : { error: shown.period })}
                >
                  {(id, describedBy) => (
                    <TextInput
                      id={id}
                      type="month"
                      /* Borné comme les autres champs de date de l'app : un
                         `YYYY-MM` a une longueur connue, et pleine largeur il
                         faisait sauter le bord droit de la colonne. */
                      className="max-w-48"
                      aria-describedby={describedBy}
                      value={draft.to}
                      invalid={shown.period !== undefined}
                      onChange={(e) => {
                        patch({ to: e.target.value })
                      }}
                    />
                  )}
                </Field>
              </div>

              {/* La case ne s'affiche qu'à partir de deux membres, comme sur la
                  saisie : à un seul, tout est déjà à la même personne. */}
              {members.length > 1 && (
                <Checkbox
                  checked={draft.shared}
                  label={t.entry.shared}
                  hint={t.advances.methodShared}
                  onChange={(next) => {
                    patch({ shared: next })
                  }}
                />
              )}
            </Tile>

            {/* La mensualité se lit avant d'enregistrer : c'est le chiffre qui
                tombera chaque mois, et le seul moyen de vérifier que la période
                saisie est la bonne. */}
            {monthly !== null && errors.period === undefined && (
              <Tile variant="accent" className="gap-1">
                <span className="t-label">{t.advances.monthly}</span>
                <Amount value={monthly} size="tile" direction="out" />
                <span className="t-axis">
                  {tpl(t.advances.monthlyOf, formatMoney(monthly, currency, false), months)}
                </span>
              </Tile>
            )}
          </form>

          {/* Hors du formulaire, comme sur les six autres écrans de saisie : un
              bouton pleine largeur enfermé dedans cassait la gouttière de
              l'écran et n'avait pas la forme de ses pairs. `form=` le relie
              sans le contenir. */}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" form="advance-form">
              {t.common.save}
            </Button>
          </div>
        </>
      )}

      <Tile className="gap-2">
        <span className="t-label font-medium">{t.advances.method}</span>
        <p className="t-label">{t.advances.methodDrawdown}</p>
        <p className="t-label">{t.advances.methodInstalments}</p>
        <p className="t-label">{t.advances.methodExpense}</p>
      </Tile>

      <ConfirmDialog {...guard.dialog} />
    </div>
  )
}
