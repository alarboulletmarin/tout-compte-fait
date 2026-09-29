import { useEffect, useId, useState } from 'react'
import { Link } from 'wouter'
import { monthlyAmount } from '../domain/split'
import type { Charge } from '../domain/types'
import { useI18n } from '../i18n/i18n'
import { useStore } from '../storage/store'
import { ChevronIcon, PlusIcon } from '../ui/icons'
import { Amount } from '../ui/Amount'
import { TabScreen } from '../ui/Screens'
import { Shape } from '../ui/Shape'
import { useAccountTotals, useLive } from './common'

// Valeur du filtre « Sans catégorie »
const NONE = '__none'

// Charges vues à la dernière visite de cet écran : ce qui a changé depuis s'anime à l'arrivée
// (la nouvelle charge s'ouvre, la supprimée se referme). Rien au premier affichage.
let lastSeen: readonly Charge[] | null = null

export function Charges() {
  const { t, euros } = useI18n()
  const { data, split } = useStore()
  const accounts = useAccountTotals()
  const live = useLive()
  const filterId = useId()
  // '' = toutes, NONE = sans catégorie, sinon l'id de la catégorie ; une catégorie supprimée ne filtre plus
  const [pick, setPick] = useState('')
  const filter = pick === NONE || data.categories.some((c) => c.id === pick) ? pick : ''
  const shown = (c: Charge) =>
    filter === '' || (filter === NONE ? c.categoryId === null : c.categoryId === filter)
  const selection = data.charges.filter(shown)

  const [before] = useState(lastSeen)
  useEffect(() => {
    lastSeen = data.charges
  }, [data.charges])
  const [added] = useState(
    () =>
      new Set(
        before
          ? data.charges.filter((c) => !before.some((b) => b.id === c.id)).map((c) => c.id)
          : [],
      ),
  )
  const [gone, setGone] = useState<ReadonlySet<string>>(new Set())
  const removed = (before ?? []).filter(
    (b) => !gone.has(b.id) && !data.charges.some((c) => c.id === b.id),
  )

  return (
    <TabScreen title={t.nav.charges} kicker={t.charges.kicker} className="charges">
      <div className="stack stack--6">
        <h1 className="lead">{t.charges.total}</h1>
        <Amount
          cents={split.total}
          as="div"
          id={live('total')}
          className={`amount-xl${data.charges.length === 0 ? ' amount-xl--muted' : ''}`}
        />
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
        // Une charge supprimée reste le temps de se refermer, à sa place d'avant
        const rows = charges.map((charge) => ({ charge, leaving: false }))
        const previous = (before ?? []).filter((b) => b.paidFrom === ref)
        for (const charge of removed.filter((b) => b.paidFrom === ref && shown(b))) {
          rows.splice(Math.min(previous.indexOf(charge), rows.length), 0, {
            charge,
            leaving: true,
          })
        }
        if (rows.length === 0) return null
        // Filtrée, la liste ne montre qu'une partie : son sous-total suit
        const sum = filter === '' ? subtotal : charges.reduce((n, c) => n + monthlyAmount(c), 0)
        return (
          <section key={ref} className="stack stack--6" aria-labelledby={`account-${ref}`}>
            <div className="account-head">
              <h2 id={`account-${ref}`} className="account-head__title">
                <Shape of={who} />
                {title}
              </h2>
              <Amount cents={sum} />
            </div>
            <ul className="rows">
              {rows.map(({ charge, leaving }) => (
                <li
                  key={charge.id}
                  className={`row-item${leaving ? ' row-item--leave' : added.has(charge.id) ? ' row-item--enter' : ''}`}
                  onAnimationEnd={
                    leaving ? () => setGone((all) => new Set(all).add(charge.id)) : undefined
                  }
                >
                  <div className="row-item__inner" aria-hidden={leaving || undefined}>
                    <ChargeRow charge={charge} leaving={leaving} />
                  </div>
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

function ChargeRow({ charge, leaving }: { charge: Charge; leaving: boolean }) {
  const { t } = useI18n()
  const live = useLive()
  const { categories } = useStore().data
  const category = categories.find((c) => c.id === charge.categoryId)?.name ?? t.charges.noCategory
  const monthly = charge.frequency === 'monthly'

  const content = (
    <>
      <div className="row__text">
        <span className="row__title">{charge.label}</span>
        <span className="row__sub">
          {category} ·{' '}
          {monthly ? (
            t.charges.frequency.monthly
          ) : (
            <>
              <Amount cents={charge.amount} /> / {t.charges.per[charge.frequency]}
            </>
          )}
        </span>
      </div>
      <span className="row__end">
        <span className="row__amounts">
          <Amount
            cents={monthlyAmount(charge)}
            className="row__amount"
            id={leaving ? undefined : live(`charge:${charge.id}`)}
          />
          {!monthly && <span className="row__per">{t.charges.perMonth}</span>}
        </span>
        <ChevronIcon />
      </span>
    </>
  )

  // Une charge qui se referme n'est plus un lien : elle ne reçoit ni clic ni focus
  return leaving ? (
    <div className="row" aria-hidden="true">
      {content}
    </div>
  ) : (
    <Link href={`/charges/${charge.id}`} className="row">
      {content}
    </Link>
  )
}
