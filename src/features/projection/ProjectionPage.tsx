/* ============================================================================
 * L'écran des projections — un simulateur, et rien de plus (cahier §4.6 ter).
 *
 * **Il ne lit pas le document, et n'y écrit rien.** C'est une calculatrice
 * qu'on interroge, pas une lecture du foyer : aucune `Entry`, aucun support,
 * aucun relevé n'entre ici, et rien de ce qu'on y tape ne ressort dans un
 * export. Brancher une hypothèse sur ce qui est réellement versé est le
 * chantier suivant, et il aura son écran ; le préfigurer en préremplissant les
 * champs depuis les données ferait passer une simulation pour une lecture, ce
 * qui est exactement la confusion que le cahier §4.6 bis passe son temps à
 * séparer — un relevé n'est pas un mouvement, et une projection n'est ni l'un
 * ni l'autre.
 *
 * **Ce qu'il refuse tient plus de place que ce qu'il fait, et c'est voulu.**
 * Les simulateurs qui existent présélectionnent un taux flatteur, comptent en
 * euros courants et affichent le centime sur vingt ans : ce sont des outils de
 * vente. Ici il n'y a rien à vendre. D'où un taux toujours éditable et jamais
 * suggéré comme un rendement de produit, une comparaison de trois hypothèses
 * plutôt qu'un chiffre unique, des montants arrondis à ce que le modèle sait
 * dire, et une phrase de réserve qui ne se replie pas.
 * ==========================================================================*/

import { useEffect, useState } from 'react'
import type { Money } from '@/domain/money'
import { ZERO } from '@/domain/money'
import { type RateKind, milestoneMonths } from '@/domain/projection'
import { formatPercent, formatRoundedMoney, tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'
import { t } from '@/i18n/strings'
import { Button } from '@/ui/Button'
import { Eyebrow } from '@/ui/Eyebrow'
import { AmountInput, Checkbox, Field, TextInput } from '@/ui/Field'
import { PageTitle } from '@/ui/PageTitle'
import { Segmented } from '@/ui/Segmented'
import { Tile } from '@/ui/Tile'
import { useCurrency } from '@/ui/currency'
import { MilestoneTable, type MilestoneColumn } from './MilestoneTable'
import { ProjectionChart, type ProjectionSerie } from './ProjectionChart'
import { formatDuration } from './duration'
import {
  type ProjectionDraft,
  type ProjectionMode,
  YEAR_PRESETS,
  analyse,
  interestOf,
  nextSlot,
  readDraft,
  writeDraft,
} from './model'

/**
 * Les trois couleurs de trait de l'app, et il n'y en a pas d'autres.
 *
 * Un trait a besoin d'un contraste de 3:1 (WCAG 1.4.11), et ni le vert pomme ni
 * le violet 500 n'y arrivent sur fond clair — c'est la mesure qui a fixé la
 * palette de `charts/CumulativeLines.tsx`, et elle vaut ici mot pour mot. Trois
 * valeurs tiennent dans les deux thèmes ; c'est aussi pour cela que les
 * scénarios sont plafonnés à trois, et que les versements cumulés sont une aire
 * et non une quatrième courbe.
 */
const SERIE_COLORS = ['var(--accent-2)', 'var(--text)', 'var(--text-muted)'] as const

const modes = (): { value: ProjectionMode; label: string }[] => [
  { value: 'forecast', label: projection.modeForecast },
  { value: 'target', label: projection.modeTarget },
]

const kinds = (): { value: RateKind; label: string }[] => [
  { value: 'guaranteed', label: projection.kindGuaranteed },
  { value: 'assumed', label: projection.kindAssumed },
]

export function ProjectionPage() {
  const currency = useCurrency()
  /* Les derniers réglages sont relus une seule fois, au montage : ils sont le
     point de départ de la saisie, pas une source qui la piloterait. */
  const [draft, setDraft] = useState<ProjectionDraft>(readDraft)

  useEffect(() => {
    writeDraft(draft)
  }, [draft])

  const patch = (next: Partial<ProjectionDraft>): void => {
    setDraft((current) => ({ ...current, ...next }))
  }

  const { errors, result, missing } = analyse(draft)
  const marks = result === null ? [] : milestoneMonths(result.months)
  const money = (value: Money): string => formatRoundedMoney(value, currency)
  const approx = (value: Money): string => tpl(projection.approx, money(value))

  const rateLabel = (rateBp: number, kind: RateKind): string =>
    `${formatPercent(rateBp / 10_000, rateBp % 100 === 0 ? 0 : 2)} · ${
      kind === 'guaranteed' ? projection.kindGuaranteed : projection.kindAssumed
    }`

  const series: ProjectionSerie[] =
    result === null
      ? []
      : result.scenarios.map((scenario, index) => ({
          id: scenario.id,
          label: rateLabel(scenario.rateBp, scenario.kind),
          /* En mode direct, le chiffre qui compte est l'arrivée ; en mode
             inverse, c'est le versement à programmer — la courbe, elle, arrive
             sur la cible qu'on a tapée, et la redire n'apprendrait rien. */
          value:
            draft.mode === 'target'
              ? approx(scenario.monthly)
              : approx(scenario.series.balance.at(-1) ?? ZERO),
          color: SERIE_COLORS[index] ?? SERIE_COLORS[0],
          dashed: scenario.kind === 'assumed',
          values: scenario.series.balance,
        }))

  const columns: MilestoneColumn[] =
    result === null
      ? []
      : result.scenarios.map((scenario) => ({
          id: scenario.id,
          label: rateLabel(scenario.rateBp, scenario.kind),
          values: marks.map((mark) => scenario.series.balance[mark] ?? ZERO),
        }))

  const arrival = (index: number): Money =>
    result?.scenarios[index]?.series.balance.at(-1) ?? ZERO

  return (
    <>
      <PageTitle title={projection.title} />

      <div className="flex max-w-3xl flex-col gap-4">
        {/* Sans eyebrow : le titre de l'écran dit déjà « Projections », deux
            centimètres au-dessus, et une étiquette qui le répète n'ajoute qu'un
            mot à relire. */}
        <Tile className="gap-2">
          <p className="t-body">{projection.lead}</p>
          {/* Elle ne se replie pas et ne s'écarte pas : c'est la seule chose de
              cet écran qui reste vraie quels que soient les chiffres saisis. */}
          <p className="t-label">{projection.caveat}</p>
        </Tile>

        <Tile className="gap-4">
          <Segmented
            options={modes()}
            value={draft.mode}
            onChange={(mode) => {
              patch({ mode })
            }}
            label={projection.modeAxis}
            className="w-fit"
          />

          <div className="flex flex-wrap gap-4">
            <Field label={projection.initial} optional hint={projection.initialHint}>
              {(id, describedBy) => (
                <AmountInput
                  id={id}
                  aria-describedby={describedBy}
                  value={draft.initialText}
                  invalid={errors.initial !== undefined}
                  placeholder="0"
                  onChange={(e) => {
                    patch({ initialText: e.target.value })
                  }}
                />
              )}
            </Field>

            {draft.mode === 'forecast' ? (
              <Field
                label={projection.monthly}
                hint={projection.monthlyHint}
                {...(errors.monthly === undefined ? {} : { error: errors.monthly })}
              >
                {(id, describedBy) => (
                  <AmountInput
                    id={id}
                    aria-describedby={describedBy}
                    value={draft.monthlyText}
                    invalid={errors.monthly !== undefined}
                    onChange={(e) => {
                      patch({ monthlyText: e.target.value })
                    }}
                  />
                )}
              </Field>
            ) : (
              <Field
                label={projection.target}
                hint={projection.targetHint}
                {...(errors.target === undefined ? {} : { error: errors.target })}
              >
                {(id, describedBy) => (
                  <AmountInput
                    id={id}
                    aria-describedby={describedBy}
                    value={draft.targetText}
                    invalid={errors.target !== undefined}
                    onChange={(e) => {
                      patch({ targetText: e.target.value })
                    }}
                  />
                )}
              </Field>
            )}
          </div>

          {/* Les quatre raccourcis règlent le champ, ils ne le remplacent pas :
              sans lui, un horizon de sept ans serait inatteignable. Aucune
              pilule n'est alors active, ce que `Segmented` sait faire. */}
          <div className="flex flex-col gap-3">
            <Segmented
              options={YEAR_PRESETS.map((years) => ({
                value: String(years),
                label: tpl(projection.durationPreset, years),
              }))}
              value={String(draft.years)}
              onChange={(value) => {
                patch({ years: Number(value) })
              }}
              label={projection.duration}
              className="w-fit"
            />
            <Field
              label={projection.durationYears}
              {...(errors.years === undefined ? {} : { error: errors.years })}
            >
              {(id, describedBy) => (
                <TextInput
                  id={id}
                  aria-describedby={describedBy}
                  className="max-w-24"
                  inputMode="numeric"
                  value={String(draft.years)}
                  invalid={errors.years !== undefined}
                  onChange={(e) => {
                    patch({ years: Number(e.target.value.replace(/\D/g, '')) })
                  }}
                />
              )}
            </Field>
          </div>
        </Tile>

        <Tile className="gap-4">
          <Eyebrow>{projection.scenarios}</Eyebrow>
          <p className="t-label">{projection.scenariosHint}</p>
          {/* Dit une fois, au-dessus des champs de taux : c'est la convention
              qui rend tous les chiffres de cet écran interprétables. */}
          <p className="t-label">{projection.netRate}</p>

          <div className="flex flex-col gap-4 [&>*+*]:border-t [&>*+*]:border-border [&>*+*]:pt-4">
            {draft.scenarios.map((scenario) => (
              <ScenarioFields
                key={scenario.id}
                rateText={scenario.rateText}
                kind={scenario.kind}
                error={errors.rates[scenario.id]}
                removable={draft.scenarios.length > 1}
                onChange={(next) => {
                  patch({
                    scenarios: draft.scenarios.map((current) =>
                      current.id === scenario.id ? { ...current, ...next } : current,
                    ),
                  })
                }}
                onRemove={() => {
                  patch({
                    scenarios: draft.scenarios.filter((current) => current.id !== scenario.id),
                  })
                }}
              />
            ))}
          </div>

          {nextSlot(draft.scenarios) !== null && (
            <Button
              variant="secondary"
              onClick={() => {
                const slot = nextSlot(draft.scenarios)
                if (slot === null) return
                patch({
                  scenarios: [
                    ...draft.scenarios,
                    { id: slot, rateText: '', kind: 'assumed' as const },
                  ],
                })
              }}
            >
              {projection.scenarioAdd}
            </Button>
          )}
        </Tile>

        <Tile className="gap-3">
          <Checkbox
            checked={draft.constant}
            onChange={(constant) => {
              patch({ constant })
            }}
            label={projection.constant}
            hint={projection.constantHint}
          />
          {draft.constant && (
            <Field
              label={projection.inflation}
              {...(errors.inflation === undefined ? {} : { error: errors.inflation })}
            >
              {(id, describedBy) => (
                <TextInput
                  id={id}
                  aria-describedby={describedBy}
                  className="max-w-24"
                  inputMode="decimal"
                  value={draft.inflationText}
                  invalid={errors.inflation !== undefined}
                  onChange={(e) => {
                    patch({ inflationText: e.target.value })
                  }}
                />
              )}
            </Field>
          )}
        </Tile>

        {result === null ? (
          <Tile>
            <p className="t-label">{missing ?? projection.nothingToPlot}</p>
          </Tile>
        ) : (
          <>
            <Tile className="gap-3">
              <Eyebrow>{projection.chart}</Eyebrow>
              {/* Signalée dès qu'elle est active, et pas seulement cochée dans
                  un coin : tous les chiffres de l'écran changent de sens. */}
              {result.inflationBp > 0 && (
                <p className="t-label">
                  {tpl(
                    projection.constantOn,
                    formatPercent(result.inflationBp / 10_000, result.inflationBp % 100 === 0 ? 0 : 2),
                  )}
                </p>
              )}
              {result.targetReached && <p className="t-label">{projection.targetReached}</p>}

              <ProjectionChart
                months={result.months}
                series={series}
                {...(result.contributed === null
                  ? {}
                  : {
                      area: {
                        label: projection.contributedArea,
                        value: approx(result.contributed.at(-1) ?? ZERO),
                        values: result.contributed,
                      },
                    })}
                label={tpl(projection.chartLabel, formatDuration(result.months))}
                srText={[
                  ...result.scenarios.map((scenario, index) =>
                    tpl(
                      projection.srChart,
                      tpl(
                        projection.srScenario,
                        formatPercent(scenario.rateBp / 10_000, scenario.rateBp % 100 === 0 ? 0 : 2),
                        scenario.kind === 'guaranteed'
                          ? projection.kindGuaranteed
                          : projection.kindAssumed,
                      ),
                      money(scenario.series.balance[0] ?? ZERO),
                      money(arrival(index)),
                      formatDuration(result.months),
                    ),
                  ),
                  ...(result.contributed === null
                    ? []
                    : [
                        tpl(
                          projection.srContributed,
                          money(result.contributed.at(-1) ?? ZERO),
                        ),
                      ]),
                ].join(' ')}
              />
            </Tile>

            <Tile className="gap-3">
              <Eyebrow>{projection.milestones}</Eyebrow>
              <p className="t-label">{projection.milestonesHint}</p>
              <MilestoneTable marks={marks} columns={columns} />
            </Tile>

            <Tile className="gap-3">
              <Eyebrow>
                {draft.mode === 'target' ? projection.requiredMonthly : projection.interest}
              </Eyebrow>
              <dl className="flex flex-col gap-2">
                {result.scenarios.map((scenario) => (
                  <div key={scenario.id} className="flex items-baseline justify-between gap-3">
                    <dt className="t-body min-w-0 truncate">
                      {rateLabel(scenario.rateBp, scenario.kind)}
                    </dt>
                    <dd className="t-num-body tnum shrink-0">
                      {draft.mode === 'target'
                        ? `${approx(scenario.monthly)} · ${projection.totalPaid} ${money(
                            scenario.series.contributed.at(-1) ?? ZERO,
                          )}`
                        : approx(interestOf(scenario.series, result.months))}
                    </dd>
                  </div>
                ))}
              </dl>
            </Tile>
          </>
        )}

        {/* L'étage suivant, nommé et non promis : il aura son chantier, et un
            écran qui annoncerait une date se tromperait. */}
        <p className="t-label">{projection.plansAhead}</p>
      </div>
    </>
  )
}

/**
 * Une hypothèse : son taux, sa nature, et de quoi la retirer.
 *
 * La nature ne change aucun calcul — elle change ce que le chiffre *engage* :
 * un taux garanti est une propriété du contrat, une hypothèse n'engage que qui
 * la pose. Elle se lit dans le mot et dans la forme du trait, jamais dans la
 * seule couleur (DS §2.3).
 */
function ScenarioFields({
  rateText,
  kind,
  error,
  removable,
  onChange,
  onRemove,
}: {
  rateText: string
  kind: RateKind
  error: string | undefined
  removable: boolean
  onChange: (next: { rateText?: string; kind?: RateKind }) => void
  onRemove: () => void
}) {
  const shown = rateText.trim() === '' ? '0' : rateText

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <Field
          label={projection.scenarioRate}
          {...(error === undefined ? {} : { error })}
          className="min-w-0"
        >
          {(id, describedBy) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              className="max-w-24"
              inputMode="decimal"
              value={rateText}
              invalid={error !== undefined}
              onChange={(e) => {
                onChange({ rateText: e.target.value })
              }}
            />
          )}
        </Field>
        {removable && (
          <Button
            variant="secondary"
            size="sm"
            aria-label={tpl(projection.scenarioRemove, `${shown} %`)}
            onClick={onRemove}
          >
            {t.common.delete}
          </Button>
        )}
      </div>

      <Segmented
        options={kinds()}
        value={kind}
        onChange={(next) => {
          onChange({ kind: next })
        }}
        label={projection.kindAxis}
        className="w-fit"
      />
      <p className="t-label">
        {kind === 'guaranteed' ? projection.kindGuaranteedHint : projection.kindAssumedHint}
      </p>
    </div>
  )
}
