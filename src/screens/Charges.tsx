import { useId, useState } from 'react'
import { Link } from 'wouter'
import { monthlyAmount } from '../domain/split'
import type { Charge } from '../domain/types'
import { useI18n } from '../i18n/i18n'
import { useStore } from '../storage/store'
import { ChevronIcon, PlusIcon } from '../ui/icons'
import { TabScreen } from '../ui/Screens'
import { Shape } from '../ui/Shape'
import { useAccountTotals } from './common'

// Valeur du filtre « Sans catégorie »
const NONE = '__none'

export function Charges() {
  const { t, euros } = useI18n()
  const { data, split } = useStore()
  const accounts = useAccountTotals()
  const filterId = useId()
  // '' = toutes, NONE = sans catégorie, sinon l'id de la catégorie ; une catégorie supprimée ne filtre plus
  const [pick, setPick] = useState('')
  const filter = pick === NONE || data.categories.some((c) => c.id === pick) ? pick : ''
  const shown = (c: Charge) =>
    filter === '' || (filter === NONE ? c.categoryId === null : c.categoryId === filter)
  const selection = data.charges.filter(shown)

  return (
    <TabScreen title={t.nav.charges} kicker={t.charges.kicker} className="charges">
      <div className="stack stack--6">
        <h1 className="lead">{t.charges.total}</h1>
        <div className={`num amount-xl${data.charges.length === 0 ? ' amount-xl--muted' : ''}`}>
          {euros(split.total)}
        </div>
      </div>

      {data.charges.length === 0 && <Empty />}

      {data.categories.length > 0 && data.charges.length > 1 && (
        <div className="field field--tight">
          <label htmlFor={filterId} className="field__label field__label--small">
            {t.charges.filter}
          </label>
          <select
            id={filterId}
            className="input select"
            value={filter}
            onChange={(e) => setPick(e.target.value)}
          >
            <option value="">{t.charges.allCategories}</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value={NONE}>{t.charges.noCategory}</option>
          </select>
          {filter !== '' && (
            <p className="caption-13">
              {t.charges.selection(
                selection.length,
                euros(selection.reduce((sum, c) => sum + monthlyAmount(c), 0)),
              )}
            </p>
          )}
        </div>
      )}

      {accounts.map(({ ref, who, title, subtotal }) => {
        const charges = selection.filter((c) => c.paidFrom === ref)
        if (charges.length === 0) return null
        // Filtrée, la liste ne montre qu'une partie : son sous-total suit
        const sum = filter === '' ? subtotal : charges.reduce((n, c) => n + monthlyAmount(c), 0)
        return (
          <section key={ref} className="stack stack--6" aria-labelledby={`account-${ref}`}>
            <div className="account-head">
              <h2 id={`account-${ref}`} className="account-head__title">
                <Shape of={who} />
                {title}
              </h2>
              <span className="num">{euros(sum)}</span>
            </div>
            <ul className="rows">
              {charges.map((c) => (
                <li key={c.id}>
                  <ChargeRow charge={c} />
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      <Link href="/charges/new" className="fab">
        <PlusIcon />
        {t.charges.add}
      </Link>
    </TabScreen>
  )
}

function Empty() {
  const { t } = useI18n()
  return (
    <>
      <section className="stack stack--10" aria-labelledby="examples-title">
        <h2 id="examples-title" className="caption-13 examples__title">
          {t.charges.examples}
        </h2>
        <div className="chips chips--8">
          {t.examples.map((example, index) => (
            <Link
              key={example.label}
              href={`/charges/new?example=${index}`}
              className="chip chip--new chip--example"
              aria-label={t.charges.addExample(example.label)}
            >
              <span aria-hidden="true">+</span>
              {example.label}
            </Link>
          ))}
        </div>
      </section>
      <div className="charges__empty">
        <div className="ghosts ghosts--small" aria-hidden="true">
          <span className="ghost ghost--member1" />
          <span className="ghost ghost--joint" />
          <span className="ghost ghost--member2" />
        </div>
        <p>{t.charges.empty}</p>
      </div>
    </>
  )
}

function ChargeRow({ charge }: { charge: Charge }) {
  const { t, euros } = useI18n()
  const { categories } = useStore().data
  const category = categories.find((c) => c.id === charge.categoryId)?.name ?? t.charges.noCategory
  const monthly = charge.frequency === 'monthly'

  return (
    <Link href={`/charges/${charge.id}`} className="row">
      <div className="row__text">
        <span className="row__title">{charge.label}</span>
        <span className="row__sub">
          {category} ·{' '}
          {monthly ? (
            t.charges.frequency.monthly
          ) : (
            <>
              <span className="num">{euros(charge.amount)}</span> /{' '}
              {t.charges.per[charge.frequency]}
            </>
          )}
        </span>
      </div>
      <span className="row__end">
        <span className="row__amounts">
          <span className="num row__amount">{euros(monthlyAmount(charge))}</span>
          {!monthly && <span className="row__per">{t.charges.perMonth}</span>}
        </span>
        <ChevronIcon />
      </span>
    </Link>
  )
}
