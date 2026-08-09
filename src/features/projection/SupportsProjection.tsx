/* ============================================================================
 * La projection **de ce qu'on possède** — l'autre lecture de l'écran.
 *
 * Le simulateur d'à côté ne lit rien : on lui tape quatre nombres. Celui-ci part
 * de ce que l'app sait déjà, et c'est la seule chose qu'elle soit seule à
 * pouvoir faire — une banque connaît le solde d'un livret mais ignore ce qu'on y
 * verse chaque mois, un simulateur connaît le versement mais ignore le solde.
 * Ici les deux bouts sont là, donc la question « ça donne quoi dans dix ans » ne
 * demande **aucune saisie** : ni capital, ni versement. Reste le taux, que rien
 * ne peut deviner et que personne ne doit deviner à la place de qui le pose.
 *
 * **Trois règles tiennent cet écran, et elles viennent toutes du cahier :**
 *
 * - **La lecture est individuelle** (§4.6 bis). Deux personnes qui ont 12 000 €
 *   et 8 000 € de côté n'ont pas « 20 000 € » : le bandeau ne propose que des
 *   personnes, et le total porte le nom de celle qu'on lit.
 * - **Une inconnue n'est pas un zéro** (§4.6 bis). Un support jamais relevé
 *   n'entre ni dans la courbe ni dans le total : il est nommé, et l'écran mène
 *   au geste qui lui manque.
 * - **Rien n'est écrit** (§4.6 ter). Le taux et le versement essayé vivent en
 *   confort local ; les récurrences, elles, ne bougent pas d'un centime parce
 *   qu'on a tapé un autre chiffre ici.
 * ==========================================================================*/

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MemberChips } from '@/app/MemberChips'
import { SUPPORT_NEW_PATH, VALUATIONS_PATH } from '@/app/routes'
import { type Money, ZERO, sub, toAmountInput } from '@/domain/money'
import { type RateKind, milestoneMonths } from '@/domain/projection'
import { MAX_RATE_PERCENT, parseRateBp } from '@/domain/rate'
import { de, enumerate, formatMoney, formatPercent, formatRoundedMoney, tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'
import { t } from '@/i18n/strings'
import { freshness } from '@/features/savings/freshness'
import { useIndividualScope } from '@/features/savings/individualScope'
import { useCategoryMap, useMemberMap, useMembers } from '@/store/selectors'
import { Button } from '@/ui/Button'
import { Dot } from '@/ui/Dot'
import { Eyebrow } from '@/ui/Eyebrow'
import { AmountInput, Field, TextInput } from '@/ui/Field'
import { Segmented } from '@/ui/Segmented'
import { Tile } from '@/ui/Tile'
import { useCurrency } from '@/ui/currency'
import { ConstantMoney } from './ConstantMoney'
import { MilestoneTable, type MilestoneColumn } from './MilestoneTable'
import { ProjectionChart } from './ProjectionChart'
import { YearsField } from './YearsField'
import { formatDuration } from './duration'
import { type Patch, type ProjectionDraft, monthsOf, yearsError } from './model'
import {
  type SupportRow,
  type SupportSetting,
  type SupportSettings,
  analyseSupports,
  readSupportSettings,
  settingOf,
  writeSupportSettings,
} from './supportsModel'
import { useSupportBases } from './useSupportBases'

const kinds = (): { value: RateKind; label: string }[] => [
  { value: 'guaranteed', label: projection.kindGuaranteed },
  { value: 'assumed', label: projection.kindAssumed },
]

/** Le total, en `--accent-2` comme la première courbe du simulateur. */
const TOTAL_COLOR = 'var(--accent-2)'

export function SupportsProjection({ draft, patch }: { draft: ProjectionDraft; patch: Patch }) {
  const navigate = useNavigate()
  const currency = useCurrency()
  /* Pose une personne quand aucune ne l'est, comme l'écran Épargne : une rangée
     de pilules dont aucune n'est active laisserait croire à une lecture qui
     n'existe pas — et sans personne, le total serait la somme du foyer. */
  const owner = useIndividualScope()
  const members = useMembers()
  const memberMap = useMemberMap()
  const categories = useCategoryMap()
  const bases = useSupportBases()

  /* Les réglages sont relus une seule fois, au montage : ils sont le point de
     départ de la saisie, pas une source qui la piloterait. */
  const [settings, setSettings] = useState<SupportSettings>(readSupportSettings)
  useEffect(() => {
    writeSupportSettings(settings)
  }, [settings])

  const change = (supportId: string, next: Partial<SupportSetting>): void => {
    setSettings((current) => ({
      ...current,
      [supportId]: { ...settingOf(current, supportId), ...next },
    }))
  }

  /**
   * Deux écritures, et la ligne entre elles est celle du cahier §4.6 ter : **la
   * précision affichée ne dépasse pas celle du calcul**.
   *
   * Ce qui sort du modèle s'arrondit et porte un « ≈ » — « ≈ 42 300 € dans dix
   * ans », parce qu'une projection à taux constant est juste à quelques
   * milliers d'euros près. Ce qui **entre** dedans est un fait, et s'écrit au
   * centime : le capital estimé est celui de la tuile Capital, le versement est
   * celui de la fiche d'une récurrence, et les arrondir empêcherait de
   * reconnaître ses propres chiffres — sans compter qu'un versement de 254,37 €
   * s'afficherait « 250 € ».
   */
  const money = (value: Money): string => formatRoundedMoney(value, currency)
  const approx = (value: Money): string => tpl(projection.approx, money(value))
  const exact = (value: Money): string => formatMoney(value, currency)

  const years = yearsError(draft.years)
  const months = monthsOf(draft.years)
  /* Une inflation illisible ne vaut pas zéro : elle éteint la lecture en euros
     constants, qui est une lecture de plus et non le calcul lui-même. */
  const inflationText = parseRateBp(draft.inflationText)
  const inflationBp = draft.constant ? (inflationText ?? 0) : 0
  const { rows, projection: result, unvalued, unreadable } = analyseSupports(
    bases,
    settings,
    months,
    inflationBp,
  )

  const ownerName = owner === null ? null : (memberMap.get(owner)?.name ?? null)
  const total = result.total
  const marks = milestoneMonths(months)
  const arrival = total?.balance.at(-1) ?? ZERO
  const paid = total?.contributed.at(-1) ?? ZERO

  /* Le trait est plein quand tout ce qu'il additionne est garanti, tireté dès
     qu'une hypothèse y entre : c'est la forme qui porte la distinction, jamais
     la couleur seule (DS §2.3). Une somme qui contient un PEA n'a rien de
     garanti, même si le livret d'à côté l'est. */
  const guaranteed = result.plans.length > 0 && result.plans.every((p) => p.kind === 'guaranteed')

  const columns: MilestoneColumn[] = [
    ...result.plans.map((plan) => ({
      id: plan.basis.support.id,
      label: plan.basis.support.label,
      values: marks.map((mark) => plan.series.balance[mark] ?? ZERO),
    })),
    /* La colonne du total n'apparaît qu'à partir de deux supports : sur un seul,
       elle recopierait la colonne d'à côté. Elle est en dernier — on lit les
       comptes, puis ce qu'ils font ensemble.
       Le plafond de trois colonnes du simulateur ne vaut pas ici : là-bas les
       colonnes sont des hypothèses concurrentes, qu'on compare et que trois
       couleurs de trait limitent ; ici ce sont des comptes, qui s'additionnent,
       et le tableau défile déjà dans son cadre. */
    ...(result.plans.length > 1 && total !== null
      ? [
          {
            id: '__total__',
            label: projection.supportsTotal,
            values: marks.map((mark) => total.balance[mark] ?? ZERO),
          },
        ]
      : []),
  ]

  return (
    <>
      {/* Le bandeau de l'épargne, sans le mois : une trajectoire sur dix ans ne
          dépend pas du mois qu'on regarde ailleurs dans l'app. */}
      <MemberChips personsOnly />

      <Tile className="gap-2">
        <p className="t-label">{projection.supportsReads}</p>
      </Tile>

      {members.length === 0 ? (
        <Tile>
          <p className="t-label">{t.savings.supportsNoMember}</p>
        </Tile>
      ) : bases.length === 0 ? (
        <Tile className="items-start gap-3">
          <p className="t-label">{t.savings.supportsEmpty}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void navigate(SUPPORT_NEW_PATH)
            }}
          >
            {t.savings.supportAdd}
          </Button>
        </Tile>
      ) : (
        <>
          <Tile className="gap-4">
            <YearsField draft={draft} patch={patch} {...(years === undefined ? {} : { error: years })} />
          </Tile>

          <Tile className="gap-4">
            <Eyebrow>{t.savings.supports}</Eyebrow>
            {/* La convention des taux, dite là où on les saisit — comme sur le
                simulateur, et pour la même raison : c'est elle qui rend tous les
                chiffres de l'écran interprétables. */}
            <p className="t-label">{projection.netRate}</p>

            <div className="flex flex-col gap-4 [&>*+*]:border-t [&>*+*]:border-border [&>*+*]:pt-4">
              {rows.map((row) => (
                <SupportFields
                  key={row.basis.support.id}
                  row={row}
                  color={categories.get(row.basis.support.categoryId)?.color ?? 'var(--cat-rest)'}
                  months={months}
                  arrival={
                    row.plan === null ? null : approx(row.plan.series.balance.at(-1) ?? ZERO)
                  }
                  contribution={exact(row.basis.contribution.monthly)}
                  start={row.basis.initial === null ? null : exact(row.basis.initial)}
                  onChange={(next) => {
                    change(row.basis.support.id, next)
                  }}
                />
              ))}
            </div>
          </Tile>

          {/* Ce que la courbe laisse dehors, et pourquoi — jamais en silence, et
              en un seul endroit : les deux raisons n'appellent pas le même geste,
              mais elles répondent à la même question, « pourquoi ce compte-là
              n'est-il pas dans le total ». Quand plus rien n'est projetable, la
              phrase le dit en entier plutôt que de compter des absences.
              Le geste qui manque est au bout : c'est le point de départ qu'on n'a
              pas encore posé. */}
          {(unvalued.length > 0 || unreadable.length > 0) && (
            <Tile className="items-start gap-3">
              {unvalued.length > 0 && (
                <p className="t-label">
                  {result.plans.length === 0
                    ? projection.supportsNoValue
                    : unvalued.length === 1
                      ? projection.supportsUnvaluedOne
                      : tpl(projection.supportsUnvalued, unvalued.length)}
                </p>
              )}
              {unreadable.length > 0 && (
                <p className="t-label">
                  {tpl(
                    projection.supportsUnreadable,
                    enumerate(unreadable.map((support) => support.label)),
                  )}
                </p>
              )}
              {unvalued.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    void navigate(VALUATIONS_PATH)
                  }}
                >
                  {t.savings.valuesUpdate}
                </Button>
              )}
            </Tile>
          )}

          <ConstantMoney
            draft={draft}
            patch={patch}
            {...(inflationText === null
              ? { error: tpl(projection.rateInvalid, MAX_RATE_PERCENT) }
              : {})}
          />

          {months === 0 ? (
            <Tile>
              <p className="t-label">{years ?? projection.nothingToPlot}</p>
            </Tile>
          ) : total === null ? null : (
            <>
              <Tile className="gap-3">
                <Eyebrow>{projection.chart}</Eyebrow>
                {ownerName !== null && (
                  <p className="t-label">{tpl(projection.supportsOwner, de(ownerName))}</p>
                )}
                {inflationBp > 0 && (
                  <p className="t-label">
                    {tpl(
                      projection.constantOn,
                      formatPercent(inflationBp / 10_000, inflationBp % 100 === 0 ? 0 : 2),
                    )}
                  </p>
                )}
                <ProjectionChart
                  months={months}
                  series={[
                    {
                      id: '__total__',
                      label: projection.supportsTotal,
                      value: approx(arrival),
                      color: TOTAL_COLOR,
                      dashed: !guaranteed,
                      values: total.balance,
                    },
                  ]}
                  area={{
                    label: projection.supportsPaid,
                    value: approx(paid),
                    values: total.contributed,
                  }}
                  label={tpl(projection.chartLabel, formatDuration(months))}
                  srText={[
                    tpl(
                      projection.srChart,
                      projection.supportsTotal,
                      money(total.balance[0] ?? ZERO),
                      money(arrival),
                      formatDuration(months),
                    ),
                    tpl(projection.srPaid, money(paid)),
                  ].join(' ')}
                />
              </Tile>

              <Tile className="gap-3">
                <Eyebrow>{projection.milestones}</Eyebrow>
                <p className="t-label">{projection.milestonesHint}</p>
                <MilestoneTable marks={marks} columns={columns} />
              </Tile>

              <Tile className="gap-3">
                <Eyebrow>{projection.supportsArrival}</Eyebrow>
                <dl className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="t-body min-w-0 truncate">{projection.supportsTotal}</dt>
                    <dd className="t-num-body tnum shrink-0">{approx(arrival)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="t-body min-w-0 truncate">{projection.interest}</dt>
                    <dd className="t-num-body tnum shrink-0">{approx(sub(arrival, paid))}</dd>
                  </div>
                </dl>
              </Tile>
            </>
          )}

          {/* L'étage suivant, nommé et non promis : cet écran projette, il ne
              mesure pas encore l'écart entre le prévu et le confirmé. */}
          <p className="t-label">{projection.plansAhead}</p>
        </>
      )}
    </>
  )
}

/**
 * Une ligne : un support, ce qu'on en suppose, et ce qu'il devient.
 *
 * Le versement est **prérempli et modifiable**, et c'est la seule chose de cet
 * écran qu'on puisse « essayer ». Il vaut par défaut ce que les récurrences
 * posent — l'écran est alors une lecture, sans une saisie — et dès qu'on tape un
 * chiffre, la ligne le dit et propose de revenir en arrière : une simulation qui
 * ne se distingue pas d'un fait est une simulation qui ment.
 *
 * Le capital de départ, lui, ne s'édite pas. C'est le seul nombre de la ligne
 * qui soit un **fait** — le relevé, plus ce qui est tombé depuis —, et le
 * modifier ici sans l'écrire nulle part ferait diverger la projection de la
 * tuile Capital sans que rien ne le dise. Le corriger se fait par un relevé,
 * là où les relevés se posent.
 *
 * Les champs vivent dans un groupe **nommé par le support** : quatre comptes
 * font quatre « Taux annuel net » sur le même écran, et sans ce nom un lecteur
 * d'écran ne saurait plus lequel il remplit.
 */
function SupportFields({
  row,
  color,
  months,
  arrival,
  contribution,
  start,
  onChange,
}: {
  row: SupportRow
  color: string
  months: number
  /** Le montant d'arrivée, déjà écrit — `null` quand le support n'est pas projeté. */
  arrival: string | null
  /** Ce que les récurrences posent, déjà écrit. */
  contribution: string
  /** Le capital de départ, déjà écrit — `null` sans relevé. */
  start: string | null
  onChange: (next: Partial<SupportSetting>) => void
}) {
  const { basis, setting } = row
  const support = basis.support
  const feeders = basis.contribution

  return (
    <div className="flex flex-col gap-3" role="group" aria-label={support.label}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="flex min-w-0 items-center gap-2">
          <Dot color={color} />
          <span className="t-body min-w-0 truncate">{support.label}</span>
        </span>
        {arrival !== null && (
          <span className="t-num-body tnum shrink-0">
            {tpl(projection.supportIn, arrival, formatDuration(months))}
          </span>
        )}
      </div>

      {/* Le point de départ, et son âge : « 10 631 € » n'a pas le même poids
          relevé hier ou il y a huit mois, et c'est ce chiffre-là que dix ans de
          capitalisation vont multiplier. */}
      <p className="t-label">
        {start === null
          ? projection.supportNoValue
          : tpl(projection.supportStart, start, freshness(basis.knownOn, support.pace))}
      </p>

      {start !== null && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <Field
              label={projection.scenarioRate}
              className="min-w-0"
              {...(row.rateError === undefined ? {} : { error: row.rateError })}
            >
              {(id, describedBy) => (
                <TextInput
                  id={id}
                  aria-describedby={describedBy}
                  className="max-w-24"
                  inputMode="decimal"
                  value={setting.rateText}
                  invalid={row.rateError !== undefined}
                  onChange={(e) => {
                    onChange({ rateText: e.target.value })
                  }}
                />
              )}
            </Field>

            <Field
              label={projection.monthly}
              className="min-w-0"
              {...(row.monthlyError === undefined ? {} : { error: row.monthlyError })}
            >
              {(id, describedBy) => (
                <AmountInput
                  id={id}
                  aria-describedby={describedBy}
                  className="max-w-32"
                  value={setting.monthlyText ?? toAmountInput(feeders.monthly)}
                  invalid={row.monthlyError !== undefined}
                  onChange={(e) => {
                    onChange({ monthlyText: e.target.value })
                  }}
                />
              )}
            </Field>
          </div>

          <Segmented
            options={kinds()}
            value={setting.kind}
            onChange={(kind) => {
              onChange({ kind })
            }}
            label={projection.kindAxis}
            className="w-fit"
          />

          {/* D'où vient le versement, ou qu'on l'a remplacé. Jamais les deux :
              ce qui compte est de savoir si le chiffre affiché est celui de tes
              règles ou celui que tu viens d'essayer. */}
          {setting.monthlyText !== null ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="t-label">{tpl(projection.supportTried, contribution)}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onChange({ monthlyText: null })
                }}
              >
                {projection.supportReset}
              </Button>
            </div>
          ) : (
            <p className="t-label">
              {feeders.feeders === 0
                ? projection.supportNoRule
                : tpl(projection.supportFromRules, contribution)}
            </p>
          )}

          {feeders.variable > 0 && (
            <p className="t-label">
              {feeders.variable === 1
                ? projection.supportVariableOne
                : tpl(projection.supportVariable, feeders.variable)}
            </p>
          )}
        </>
      )}
    </div>
  )
}
