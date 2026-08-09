/* ============================================================================
 * L'écran des projections — un simulateur, et rien de plus (cahier §4.6 ter).
 *
 * **Il lit l'épargne, et il n'écrit rien.** C'était une calculatrice isolée :
 * aucune `Entry`, aucun support, aucun relevé n'y entrait, au motif que rien ne
 * devait en sortir. Les deux ne se valaient pas — refuser d'écrire protège le
 * document, refuser de lire ne protégeait rien et obligeait à retaper à la main
 * un capital que l'écran Épargne affiche deux écrans plus haut. L'origine d'une
 * simulation peut donc être un support ou l'épargne d'une personne ; le sens
 * reste unique, et le **rendement n'est jamais repris** — c'est la seule chose
 * qu'un support ne porte pas, et la seule qui engage.
 *
 * **La réponse avant la question.** L'ordre était : explication, paramètres,
 * taux, inflation, résultat, jalons — soit presque tout l'écran à traverser
 * avant « ≈ 14 k€ », qui est pourtant la seule chose qu'on vient y chercher. Il
 * est maintenant : résultat, paramètres, hypothèses, tracé, détails. Les
 * paramètres servent à ajuster la réponse, pas à y accéder.
 *
 * **Ce qu'il refuse tient toujours plus de place que ce qu'il fait, mais plus à
 * l'écran.** Les simulateurs qui existent présélectionnent un taux flatteur,
 * comptent en euros courants et affichent le centime sur vingt ans : ce sont des
 * outils de vente. Ici il n'y a rien à vendre. D'où un taux toujours éditable et
 * jamais suggéré, une comparaison de trois hypothèses plutôt qu'un chiffre
 * unique, des montants arrondis à ce que le modèle sait dire, et une réserve qui
 * ne se replie pas. Le raisonnement, lui, est passé derrière « Comprendre cette
 * projection » : sept paragraphes intercalés entre des champs faisaient une
 * notice, et personne ne lit une notice.
 * ==========================================================================*/

import { useEffect, useState } from 'react'
import { type Money, ZERO, toAmountInput } from '@/domain/money'
import { type RateKind, inflate, milestoneMonths } from '@/domain/projection'
import type { ProjectionSource } from '@/domain/projectionStart'
import { currencySymbol, formatMoney, formatPercent, formatRoundedMoney, tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'
import { t } from '@/i18n/strings'
import { useActiveSavingSupports, useMembers, useProjectionStart } from '@/store/selectors'
import { Button } from '@/ui/Button'
import { Disclosure } from '@/ui/Disclosure'
import { Eyebrow } from '@/ui/Eyebrow'
import { AmountInput, Checkbox, Field, TextInput } from '@/ui/Field'
import { PageTitle } from '@/ui/PageTitle'
import { Row, RowGroup } from '@/ui/RowGroup'
import { Segmented } from '@/ui/Segmented'
import { Tile } from '@/ui/Tile'
import { useCurrency } from '@/ui/currency'
import { EffortTable } from './EffortTable'
import { ExplainSheet } from './ExplainSheet'
import { MilestoneTable, type MilestoneColumn } from './MilestoneTable'
import { ProjectionChart, type ProjectionSerie } from './ProjectionChart'
import { ResultTile } from './ResultTile'
import { SourceSelect } from './SourceSelect'
import { formatDuration } from './duration'
import {
  type ProjectionDraft,
  type ProjectionMode,
  YEAR_PRESETS,
  analyse,
  breakdownOf,
  effortLadder,
  isPreset,
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

/**
 * L'origine gardée, confrontée à ce qui existe encore.
 *
 * Un identifiant survit à ce qu'il désigne : le support a pu être supprimé, la
 * personne retirée du foyer, ou le document entier remplacé par un autre à
 * l'import. Une origine morte retombe en simulation libre plutôt que d'afficher
 * une épargne vide sous le nom d'un compte qui n'existe plus — c'est la règle
 * que `persistence/validate.ts` applique déjà à tout lien mort du document.
 */
function resolveSource(
  source: ProjectionSource,
  members: readonly { id: string }[],
  supports: readonly { id: string }[],
): ProjectionSource {
  if (source.kind === 'support' && !supports.some((one) => one.id === source.id)) {
    return { kind: 'free' }
  }
  if (source.kind === 'member' && !members.some((one) => one.id === source.id)) {
    return { kind: 'free' }
  }
  return source
}

export function ProjectionPage() {
  const currency = useCurrency()
  /* Les derniers réglages sont relus une seule fois, au montage : ils sont le
     point de départ de la saisie, pas une source qui la piloterait. */
  const [draft, setDraft] = useState<ProjectionDraft>(readDraft)
  const [explaining, setExplaining] = useState(false)
  const [detailed, setDetailed] = useState(false)

  const members = useMembers()
  const supports = useActiveSavingSupports()
  const source = resolveSource(draft.source, members, supports)
  /* L'horizon avant l'origine, et non l'inverse : c'est lui qui décide quelles
     règles sont assez durables pour entrer dans un versement constant. */
  const start = useProjectionStart(source, draft.years * 12)

  useEffect(() => {
    writeDraft(draft)
  }, [draft])

  const patch = (next: Partial<ProjectionDraft>): void => {
    setDraft((current) => ({ ...current, ...next }))
  }

  const { errors, result, missing } = analyse({ ...draft, source }, start)
  const marks = result === null ? [] : milestoneMonths(result.months)
  const money = (value: Money): string => formatRoundedMoney(value, currency)
  const approx = (value: Money): string => tpl(projection.approx, money(value))
  /* Ce qui **entre** dans le calcul s'écrit exactement, et sans « ≈ » : un
     objectif tapé, un versement programmé, un capital relevé sont des faits, et
     l'arrondi du modèle ne s'applique qu'à ce qui en sort. Sans cette
     séparation, « Simulation avec 370 €/mois » contredirait le panneau qui
     annonce 366 €/mois deux blocs plus haut. */
  const exact = (value: Money): string => formatMoney(value, currency, false)
  const percent = (rateBp: number): string =>
    formatPercent(rateBp / 10_000, rateBp % 100 === 0 ? 0 : 2)

  const rateLabel = (rateBp: number, kind: RateKind): string =>
    `${percent(rateBp)} · ${
      kind === 'guaranteed' ? projection.kindGuaranteed : projection.kindAssumed
    }`

  const series: ProjectionSerie[] =
    result === null
      ? []
      : result.scenarios.map((scenario, index) => ({
          id: scenario.id,
          /* La première courbe est la somme des supports dès qu'ils ont chacun
             leur taux : lui coller « 3 % » ferait passer l'hypothèse par défaut
             de l'écran pour celle du portefeuille entier. */
          label:
            index === 0 && result.split.some((part) => part.own)
              ? projection.splitRates
              : rateLabel(scenario.rateBp, scenario.kind),
          color: SERIE_COLORS[index] ?? SERIE_COLORS[0],
          dashed: scenario.kind === 'assumed',
          values: scenario.series.balance,
        }))

  const first = result?.scenarios[0]
  /* Une hypothèse : l'écran est une pédagogie, et les deux aires empilées la
     portent — versements en bas, rendement au-dessus, le haut de la pile est le
     capital. Plusieurs : c'est une comparaison, et trois rendements posés sur le
     même versé ne s'empilent pas. */
  const single = result !== null && result.scenarios.length === 1

  /* Trois formes de tableau, et une seule est vraie à la fois.
     — Un portefeuille décomposé : une colonne par support, plus le total. C'est
       la lecture la plus riche, et la seule qui dise *où* le capital est.
     — Une hypothèse sur un capital indivis : versé, rendement, total.
     — Plusieurs hypothèses : une colonne chacune, c'est la comparaison. */
  const columns: MilestoneColumn[] =
    result === null
      ? []
      : result.split.length > 0
        ? [
            ...result.split.map((part) => ({
              id: part.supportId,
              /* Le taux à côté du nom : sans lui, deux colonnes qui divergent
                 n'ont pas d'explication visible. Marqué quand il est emprunté à
                 l'écran, pour qu'un support sans hypothèse ne passe pas pour un
                 support renseigné. */
              label: part.own
                ? `${part.label} · ${percent(part.rateBp)}`
                : `${part.label} · ${tpl(projection.splitBorrowed, percent(part.rateBp))}`,
              values: marks.map((mark) => part.series.balance[mark] ?? ZERO),
            })),
            {
              id: '__total__',
              label: projection.splitTotal,
              values: marks.map((mark) => first?.series.balance[mark] ?? ZERO),
            },
          ]
        : single && first !== undefined
          ? [
              {
                id: 'paid',
                label: projection.contributedArea,
                values: marks.map((mark) => first.series.contributed[mark] ?? ZERO),
              },
              {
                id: 'interest',
                label: projection.interest,
                values: marks.map((mark) => breakdownOf(first.series, mark).interest),
              },
              {
                id: 'total',
                label: projection.breakdownTotal,
                values: marks.map((mark) => first.series.balance[mark] ?? ZERO),
              },
            ]
          : result.scenarios.map((scenario) => ({
              id: scenario.id,
              label: rateLabel(scenario.rateBp, scenario.kind),
              values: marks.map((mark) => scenario.series.balance[mark] ?? ZERO),
            }))

  const arrival = (index: number): Money =>
    result?.scenarios[index]?.series.balance.at(-1) ?? ZERO

  /* Le surtitre et le chiffre héros, qui changent de nature avec le mode : le
     mode direct répond par un capital, le mode inverse par un versement. */
  const heading =
    result === null
      ? ''
      : draft.mode === 'target'
        ? tpl(
            projection.targetHeading,
            exact(result.target ?? ZERO),
            formatDuration(result.months),
          )
        : tpl(projection.resultIn, formatDuration(result.months))

  const hero =
    result === null
      ? ''
      : draft.mode === 'target'
        ? tpl(projection.perMonth, approx(first?.monthly ?? ZERO))
        : approx(arrival(0))

  /* Les hypothèses en une ligne, sous le résultat : ce qui a produit le chiffre,
     et qu'on ne devrait pas avoir à aller relire dans les champs. En mode
     inverse le versement est la réponse, il n'est donc pas une hypothèse. */
  const basis =
    result === null || first === undefined
      ? ''
      : tpl(
          projection.resultBasis,
          draft.mode === 'target'
            ? exact(result.initial)
            : tpl(projection.perMonth, exact(result.monthly ?? ZERO)),
          /* Un portefeuille dont les supports ont chacun leur taux ne suit
             *aucun* taux moyen : en annoncer un ici serait l'inventer, et
             l'inventer dans le sens qui rassure. */
          result.split.some((part) => part.own)
            ? projection.splitRates
            : tpl(projection.perYear, percent(first.rateBp)),
        )

  const rungs = result === null ? [] : effortLadder(result, first)

  return (
    <>
      <PageTitle title={projection.title} />

      <div className="flex max-w-3xl flex-col gap-4">
        {/* Le mode d'abord, et seul : c'est lui qui décide de quelle question
            tout le reste de l'écran est la réponse. Il n'a pas de tuile — une
            bascule à deux positions posée sous le titre est déjà un choix
            lisible, et l'encadrer en ferait une section de plus à franchir avant
            le chiffre. */}
        <Segmented
          options={modes()}
          value={draft.mode}
          onChange={(mode) => {
            patch({ mode })
          }}
          label={projection.modeAxis}
          className="w-fit"
        />

        {result === null ? (
          <Tile>
            <p className="t-label">{missing ?? projection.nothingToPlot}</p>
          </Tile>
        ) : (
          <ResultTile
            heading={heading}
            hero={hero}
            breakdown={breakdownOf(
              (first ?? result.scenarios[0])?.series ?? { balance: [], contributed: [] },
              result.months,
            )}
            basis={basis}
            target={draft.mode === 'target'}
            paidFrom={tpl(
              projection.breakdownPaidFrom,
              tpl(
                projection.perMonth,
                money(result.monthly ?? first?.monthly ?? ZERO),
              ),
              formatDuration(result.months),
            )}
            interestFrom={
              /* Un portefeuille dont les supports ont chacun leur taux ne suit
                 aucun taux moyen : annoncer « 3 %/an » sous le rendement y
                 serait faux, et faux dans le sens qui rassure. */
              result.split.some((part) => part.own)
                ? projection.splitOwn
                : tpl(
                    projection.breakdownInterestFrom,
                    tpl(projection.perYear, percent(first?.rateBp ?? 0)),
                  )
            }
            deflated={
              result.inflationBp > 0
                ? tpl(projection.constantOn, percent(result.inflationBp))
                : null
            }
          />
        )}

        <Tile className="gap-4">
          <Eyebrow>{projection.params}</Eyebrow>

          <SourceSelect
            source={source}
            onChange={(next) => {
              patch({ source: next })
            }}
            start={start}
            members={members}
            supports={supports}
            showMonthly={draft.mode === 'forecast'}
            onDetach={() => {
              /* Le lien se coupe en recopiant ce qu'il apportait : on repart de
                 l'épargne réelle sans y toucher, et le champ dit désormais que
                 le chiffre est à soi. C'est la seule façon de « modifier » une
                 épargne ici — en cessant de la lire. */
              patch({
                source: { kind: 'free' },
                initialText: toAmountInput(start.capital ?? ZERO),
                monthlyText: toAmountInput(start.monthly),
              })
            }}
          />

          <div className="flex flex-wrap gap-4">
            {/* Les deux champs de montant ne s'affichent qu'en simulation libre :
                branchée sur l'épargne, la lecture est au-dessus, et un champ
                pré-rempli avec la même valeur laisserait croire qu'on l'édite. */}
            {source.kind === 'free' && (
              <Field label={projection.initial} optional>
                {(id, describedBy) => (
                  <Unit suffix={currencySymbol(currency)}>
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
                  </Unit>
                )}
              </Field>
            )}

            {draft.mode === 'forecast'
              ? source.kind === 'free' && (
                  <Field
                    label={projection.monthly}
                    {...(errors.monthly === undefined ? {} : { error: errors.monthly })}
                  >
                    {(id, describedBy) => (
                      <Unit suffix={tpl(projection.perMonth, currencySymbol(currency))}>
                        <AmountInput
                          id={id}
                          aria-describedby={describedBy}
                          value={draft.monthlyText}
                          invalid={errors.monthly !== undefined}
                          onChange={(e) => {
                            patch({ monthlyText: e.target.value })
                          }}
                        />
                      </Unit>
                    )}
                  </Field>
                )
              : (
                  <Field
                    label={projection.target}
                    hint={projection.targetHint}
                    {...(errors.target === undefined ? {} : { error: errors.target })}
                  >
                    {(id, describedBy) => (
                      <Unit suffix={currencySymbol(currency)}>
                        <AmountInput
                          id={id}
                          aria-describedby={describedBy}
                          value={draft.targetText}
                          invalid={errors.target !== undefined}
                          onChange={(e) => {
                            patch({ targetText: e.target.value })
                          }}
                        />
                      </Unit>
                    )}
                  </Field>
                )}
          </div>

          {/* Les quatre raccourcis règlent le champ, ils ne le remplacent pas :
              sans lui, un horizon de sept ans serait inatteignable. Mais il ne
              s'affiche plus en permanence — deux contrôles pour une même donnée,
              côte à côte, en font un de trop, et celui qu'on n'utilise presque
              jamais est celui qui doit se demander. */}
          <div className="flex flex-col gap-3">
            <Segmented
              options={YEAR_PRESETS.map((years) => ({
                value: String(years),
                label: tpl(projection.durationPreset, years),
              }))}
              value={String(draft.years)}
              onChange={(value) => {
                patch({ years: Number(value), customYears: false })
              }}
              label={projection.duration}
              className="w-fit"
            />
            {draft.customYears || !isPreset(draft.years) ? (
              <Field
                label={projection.durationYears}
                {...(errors.years === undefined ? {} : { error: errors.years })}
              >
                {(id, describedBy) => (
                  <Unit suffix={tpl(projection.durationPreset, '').trim()}>
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
                  </Unit>
                )}
              </Field>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                className="w-fit"
                onClick={() => {
                  patch({ customYears: true })
                }}
              >
                {projection.durationOther}
              </Button>
            )}
          </div>
        </Tile>

        <Tile className="gap-4">
          <Eyebrow>{projection.scenarios}</Eyebrow>

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
          <p className="t-label">{projection.scenariosHint}</p>
        </Tile>

        {result !== null && (
          <>
            <Tile className="gap-3">
              <Eyebrow>{projection.chart}</Eyebrow>
              {/* La lecture en euros d'aujourd'hui se signale une seule fois, et
                  c'est sous le résultat (`ResultTile`) : elle vaut pour tout
                  l'écran, et la répéter au-dessus de chaque bloc en ferait un
                  bandeau. */}
              {result.targetReached && <p className="t-label">{projection.targetReached}</p>}

              <ProjectionChart
                months={result.months}
                series={series}
                stacked={single}
                {...(result.contributed === null
                  ? {}
                  : {
                      area: {
                        label: projection.contributedArea,
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
                        percent(scenario.rateBp),
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
                    : [tpl(projection.srContributed, money(result.contributed.at(-1) ?? ZERO))]),
                ].join(' ')}
              />
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
                <>
                  <Field
                    label={projection.inflation}
                    {...(errors.inflation === undefined ? {} : { error: errors.inflation })}
                  >
                    {(id, describedBy) => (
                      <Unit suffix={projection.unitYear}>
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
                      </Unit>
                    )}
                  </Field>
                  {/* Ce que l'option change, sur le chiffre qu'on a sous les
                      yeux : « déflate les montants de l'inflation » est exact et
                      n'apprend rien à qui ne sait pas déjà ce qu'est déflater. */}
                  {result.inflationBp > 0 && (
                    <p className="t-label">
                      {tpl(
                        projection.constantExample,
                        approx(inflate(arrival(0), result.inflationBp, result.months)),
                        formatDuration(result.months),
                        approx(arrival(0)),
                      )}
                    </p>
                  )}
                </>
              )}
            </Tile>

            {rungs.length > 1 && (
              <Tile className="gap-3">
                <Eyebrow>{projection.effort}</Eyebrow>
                <p className="t-label">{projection.effortHint}</p>
                <EffortTable rungs={rungs} />
              </Tile>
            )}

            {/* Le tableau doit exister — une courbe ne se lit pas au chiffre
                près, et le cahier §5 demande que tout graphique soit doublé
                d'une lecture textuelle. Il passe derrière un repli parce que le
                curseur du tracé répond désormais à la même question au doigt :
                il n'est plus la seule lecture précise, il est la lecture
                exhaustive. */}
            <Tile className="gap-2">
              <Disclosure
                open={detailed}
                onOpenChange={setDetailed}
                title={<span className="t-body">{projection.milestones}</span>}
              >
                <div className="flex flex-col gap-3 pt-3">
                  <p className="t-label">{projection.milestonesHint}</p>
                  <MilestoneTable marks={marks} columns={columns} />
                </div>
              </Disclosure>
            </Tile>
          </>
        )}

        <RowGroup>
          <Row
            label={projection.explain}
            affordance="explain"
            onClick={() => {
              setExplaining(true)
            }}
          />
        </RowGroup>

        {/* L'étage suivant, nommé et non promis : il aura son chantier, et un
            écran qui annoncerait une date se tromperait. */}
        <p className="t-label">{projection.plansAhead}</p>
      </div>

      <ExplainSheet
        open={explaining}
        onClose={() => {
          setExplaining(false)
        }}
      />
    </>
  )
}

/**
 * Un champ et son unité, posée à côté de lui.
 *
 * « 0 », « 100 » et « 3 » empilés dans une colonne ne disent pas lequel est un
 * capital, lequel un versement mensuel et lequel un pourcentage : le libellé le
 * dit, mais il est au-dessus, et l'œil qui relit ses chiffres ne remonte pas.
 *
 * **À côté du champ et non dedans.** Les montants sont alignés à droite (DS §3,
 * `AmountInput`), donc un suffixe posé à l'intérieur tomberait pile sur le
 * dernier chiffre tapé. `aria-hidden` : l'étiquette du champ porte déjà l'unité
 * en toutes lettres — « Versement mensuel » —, et l'annoncer deux fois ne
 * l'apprendrait pas mieux.
 */
function Unit({ suffix, children }: { suffix: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      {children}
      <span className="t-label shrink-0" aria-hidden="true">
        {suffix}
      </span>
    </span>
  )
}

/**
 * Une hypothèse : son taux, sa nature, et de quoi la retirer.
 *
 * La nature ne change aucun calcul — elle change ce que le chiffre *engage* :
 * un taux garanti est une propriété du contrat, une hypothèse n'engage que qui
 * la pose. Elle se lit dans le mot et dans la forme du trait, jamais dans la
 * seule couleur (DS §2.3).
 *
 * **Sa phrase d'aide ne s'affiche que sur « Taux garanti ».** C'est là qu'elle
 * corrige quelque chose : un livret dont le taux du jour est connu n'est pas
 * garanti sur dix ans, et c'est la confusion la plus coûteuse de tout l'écran.
 * « Rien n'est promis » sous « Rendement hypothétique » ne fait, elle, que
 * répéter le libellé — et une aide qui répète est une ligne de plus à sauter.
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
            <Unit suffix={projection.unitYear}>
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
            </Unit>
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
      {kind === 'guaranteed' && <p className="t-label">{projection.kindGuaranteedHint}</p>}
    </div>
  )
}
