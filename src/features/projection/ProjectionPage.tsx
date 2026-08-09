/* ============================================================================
 * L'écran des projections — un simulateur, et rien de plus (cahier §4.6 ter).
 *
 * **Il lit l'épargne, et il n'écrit rien.** C'était une calculatrice isolée :
 * aucune `Entry`, aucun support, aucun relevé n'y entrait, au motif que rien ne
 * devait en sortir. Les deux ne se valaient pas — refuser d'écrire protège le
 * document, refuser de lire ne protégeait rien et obligeait à retaper à la main
 * un capital que l'écran Épargne affiche deux écrans plus haut. L'origine d'une
 * simulation peut donc être un support ou l'épargne d'une personne ; le sens
 * reste unique — de l'épargne vers la simulation, jamais l'inverse.
 *
 * **Le rendement se relit, il ne se devine pas.** La règle disait « jamais
 * repris », et elle visait juste : prêter à un PEA le rendement de sa dernière
 * décennie est le tour de passe-passe des simulateurs de vente. Ce qui est
 * repris ici n'est pas deviné — c'est le palier que son propriétaire a posé sur
 * la fiche du compte, daté. Un compte qui n'en porte aucun emprunte l'hypothèse
 * de l'écran, **et la colonne le dit** ; un taux qu'on modifie ici ne vaut que
 * pour la simulation, et ne redescend nulle part.
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
import { StackedAreas, type StackedBand } from '@/charts/StackedAreas'
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
  type SupportRateDraft,
  type SupportSeries,
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

/**
 * Les teintes des bandes empilées, et pourquoi elles ne sont pas les trois
 * ci-dessus.
 *
 * Une **aire** ne porte aucune lecture par elle-même : ce qui la nomme et la
 * chiffre est la légende, et ce qui la distingue de sa voisine est le filet de
 * la couleur du fond que `StackedAreas` trace entre elles. Le contraste de 3:1
 * de WCAG 1.4.11, qui a fixé la palette des traits, ne s'y applique donc pas —
 * et la contrainte des trois traits reste entière pour les scénarios, qui en
 * sont.
 *
 * Le nuancier des catégories, comme sur l'écran Épargne : c'est déjà celui de
 * l'anneau « Où part l'argent », six teintes faites pour tenir l'une contre
 * l'autre dans les six palettes et les deux thèmes. Par rang et non par
 * catégorie, ici : deux comptes de même nature sont fréquents dans un
 * portefeuille, et l'écran des projections ne montre aucune autre pastille à
 * laquelle il faudrait s'accorder.
 */
const BAND_COLORS = [
  'var(--cat-1)',
  'var(--cat-2)',
  'var(--cat-3)',
  'var(--cat-4)',
  'var(--cat-5)',
  'var(--cat-6)',
] as const

/**
 * Les rangs tracés d'une pile — bien moins que les mois de l'horizon.
 *
 * Une projection sur cinquante ans porte six cent un points pour trois cents
 * pixels : deux par pixel, dont aucun ne se voit. `ProjectionChart` échantillonne
 * en interne ; ici c'est l'appelant qui le fait, parce que la pile a besoin des
 * mêmes rangs pour ses bandes, son curseur et son axe. Quarante-huit suffisent à
 * une courbe lisse, et le dernier est toujours gardé — c'est le seul dont le
 * montant est écrit ailleurs.
 */
const MAX_STACK_POINTS = 48

function chartStops(months: number): number[] {
  const count = Math.min(MAX_STACK_POINTS, months + 1)
  if (count <= 1) return [0]
  const marks: number[] = []
  for (let stop = 0; stop < count; stop += 1) {
    const mark = Math.round((months * stop) / (count - 1))
    if (!marks.includes(mark)) marks.push(mark)
  }
  return marks
}

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

  /* Un taux qui vient de la fiche du support, ou d'un champ tapé ici : dans les
     deux cas le portefeuille ne suit **aucun** taux moyen, et l'annoncer serait
     l'inventer — dans le sens qui rassure. */
  const mixed = result !== null && result.split.some((part) => part.origin !== 'screen')

  /**
   * L'en-tête d'une colonne, et d'où son taux vient.
   *
   * Trois marques et pas une de moins : un compte muet ne doit pas passer pour
   * un compte renseigné, un chiffre essayé ne doit pas passer pour un chiffre
   * enregistré, et un taux qui change en route ne doit pas se lire comme
   * constant sur tout l'horizon.
   */
  const splitLabel = (part: SupportSeries): string => {
    const rate = percent(part.rateBp)
    if (part.origin === 'screen') return `${part.label} · ${tpl(projection.splitBorrowed, rate)}`
    if (part.origin === 'simulated') return `${part.label} · ${tpl(projection.splitSimulated, rate)}`
    return `${part.label} · ${part.dated ? tpl(projection.splitDated, rate) : rate}`
  }

  const series: ProjectionSerie[] =
    result === null
      ? []
      : result.scenarios.map((scenario, index) => ({
          id: scenario.id,
          /* La première courbe est la somme des supports dès qu'ils ont chacun
             leur taux : lui coller « 3 % » ferait passer l'hypothèse par défaut
             de l'écran pour celle du portefeuille entier. */
          label:
            index === 0 && mixed ? projection.splitRates : rateLabel(scenario.rateBp, scenario.kind),
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
                 n'ont pas d'explication visible. Et sa provenance avec, pour la
                 raison écrite sur `splitLabel`. */
              label: splitLabel(part),
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

  /* Le tracé décomposé, quand le portefeuille l'est : une bande par compte,
     dont la somme est exactement la courbe de la première hypothèse — c'est
     `sumSeries` qui le garantit, et non un troisième calcul posé à côté.
     Il ne remplace le tracé habituel qu'à une hypothèse : à deux ou trois, la
     comparaison redevient le propos, et `result.split` est de toute façon vide. */
  const stackRanks = result === null || result.split.length === 0 ? [] : chartStops(result.months)
  const chartRanks = stackRanks.map((rank) =>
    rank === 0 ? projection.start : tpl(projection.chartAt, formatDuration(rank)),
  )
  const stack: StackedBand[] =
    result === null
      ? []
      : result.split.map((part, index) => ({
          id: part.supportId,
          /* Le nom sans son taux : la légende d'un tracé n'a pas la place d'une
             en-tête de tableau, et la provenance de chaque taux se lit deux
             blocs plus haut, dans les champs qui la portent. */
          label: part.label,
          color: BAND_COLORS[index % BAND_COLORS.length] ?? 'var(--cat-rest)',
          values: stackRanks.map((rank) => part.series.balance[rank] ?? ZERO),
        }))

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
          mixed
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
              mixed
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

        {/* Le rendement compte par compte, quand il y a des comptes. Il vient
            **avant** l'hypothèse générale : c'est la question précise, et celle
            d'en dessous n'est plus qu'un repli pour ce qu'elle ne couvre pas.
            Sans lui, projeter tout le portefeuille d'une personne revenait à
            poser un taux unique sur un Livret A et un PEA — ce qu'aucun des
            deux ne fait, et ce dont la somme n'est celle d'aucun taux moyen. */}
        {result !== null && result.split.length > 0 && (
          <Tile className="gap-4">
            <Eyebrow>{projection.supportRates}</Eyebrow>

            <div className="flex flex-col gap-4 [&>*+*]:border-t [&>*+*]:border-border [&>*+*]:pt-4">
              {result.split.map((part) => (
                <SupportRateFields
                  key={part.supportId}
                  label={part.label}
                  part={part}
                  rateText={
                    draft.supportRates.find((one) => one.supportId === part.supportId)?.rateText ??
                    ''
                  }
                  placeholder={
                    part.origin === 'screen' ? projection.supportRateEmpty : percent(part.rateBp)
                  }
                  onChange={(next) => {
                    patch({ supportRates: setSupportRate(draft.supportRates, part, next) })
                  }}
                  onReset={() => {
                    patch({
                      supportRates: draft.supportRates.filter(
                        (one) => one.supportId !== part.supportId,
                      ),
                    })
                  }}
                />
              ))}
            </div>

            <p className="t-label">{projection.supportRatesHint}</p>
          </Tile>
        )}

        <Tile className="gap-4">
          <Eyebrow>{projection.scenarios}</Eyebrow>
          {/* Sur un portefeuille décomposé, l'hypothèse d'écran n'est plus le
              taux de la simulation : c'est le repli des comptes qui n'en
              portent pas. Le dire ici évite de la lire comme un taux global qui
              écraserait les précédents. */}
          {result !== null && result.split.length > 0 && (
            <p className="t-label">{projection.screenRateHint}</p>
          )}

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

              {/* Deux tracés, et une seule condition les sépare : **on n'empile
                  que ce qui s'additionne**. Des supports, oui — leur somme *est*
                  le portefeuille, et une bande par compte dit enfin *où* le
                  capital se trouve. Deux ou trois hypothèses de rendement, non :
                  elles partent du même versé et ne s'additionnent pas (cahier
                  §4.6 ter). L'aire du versé se retire alors : empilée sous des
                  capitaux par compte, elle compterait deux fois ce qui est déjà
                  dedans — la décomposition versé/rendement reste sur le résultat
                  et dans le tableau des jalons. */}
              {stack.length > 0 ? (
                <StackedAreas
                  bands={stack}
                  ranks={chartRanks}
                  totalLabel={projection.chartTotal}
                  label={projection.chartStack}
                  srText={tpl(
                    projection.srChartStack,
                    money(result.initial),
                    money(arrival(0)),
                    formatDuration(result.months),
                    result.split.length,
                  )}
                />
              ) : (
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
 * Le taux essayé sur un support — posé, retiré, remplacé.
 *
 * Le brouillon ne garde **que ce qui a été tapé** : un compte dont on n'a rien
 * changé n'y figure pas, et son taux reste celui de sa fiche. C'est ce qui
 * permet à « Reprendre le taux du support » de n'être qu'une suppression, et à
 * un changement de taux sur la fiche de se voir immédiatement ici.
 */
function setSupportRate(
  current: readonly SupportRateDraft[],
  part: SupportSeries,
  next: { rateText?: string; kind?: RateKind },
): SupportRateDraft[] {
  const existing = current.find((one) => one.supportId === part.supportId)
  const merged: SupportRateDraft = {
    supportId: part.supportId,
    /* Le champ part de ce que le compte porte déjà : changer sa seule nature ne
       doit pas faire tomber son taux à l'hypothèse de l'écran. */
    rateText: existing?.rateText ?? '',
    kind: existing?.kind ?? part.kind,
    ...next,
  }
  return existing === undefined
    ? [...current, merged]
    : current.map((one) => (one.supportId === part.supportId ? merged : one))
}

/**
 * Un compte, et le rendement qu'on lui prête pour cette simulation.
 *
 * Le champ est **vide par défaut**, et son placeholder dit ce qui s'applique en
 * attendant : le taux de la fiche, ou l'hypothèse de l'écran. Un champ
 * prérempli avec le taux du support laisserait croire qu'on l'édite — c'est
 * exactement ce que les deux champs de montant évitent déjà en ne s'affichant
 * pas hors simulation libre.
 */
function SupportRateFields({
  label,
  part,
  rateText,
  placeholder,
  onChange,
  onReset,
}: {
  label: string
  part: SupportSeries
  rateText: string
  placeholder: string
  onChange: (next: { rateText?: string; kind?: RateKind }) => void
  onReset: () => void
}) {
  const simulated = part.origin === 'simulated'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-3">
        <Field label={label} className="min-w-0">
          {(id, describedBy) => (
            <Unit suffix={projection.unitYear}>
              <TextInput
                id={id}
                aria-describedby={describedBy}
                className="max-w-24"
                inputMode="decimal"
                value={rateText}
                placeholder={placeholder}
                onChange={(e) => {
                  onChange({ rateText: e.target.value })
                }}
              />
            </Unit>
          )}
        </Field>
        {simulated && (
          <Button variant="secondary" size="sm" onClick={onReset}>
            {projection.supportRateReset}
          </Button>
        )}
      </div>

      {/* La nature ne se demande que sur un taux qu'on a tapé : sur un taux
          repris, elle est celle de la fiche, et l'offrir ici ferait croire
          qu'on modifie le compte. */}
      {simulated && (
        <Segmented
          options={kinds()}
          value={part.kind}
          onChange={(next) => {
            onChange({ kind: next })
          }}
          label={projection.kindAxis}
          className="w-fit"
        />
      )}

      {/* D'où vient le taux qui s'applique — et il y a trois réponses, dont
          aucune ne se devine du seul chiffre affiché. */}
      <p className="t-label">
        {simulated
          ? projection.supportRateSimulated
          : part.origin === 'screen'
            ? projection.supportRateBorrowed
            : projection.supportRateOwn}
      </p>
      {!simulated && part.dated && <p className="t-label">{projection.supportRateDated}</p>}
    </div>
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
