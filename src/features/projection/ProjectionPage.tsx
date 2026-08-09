/* ============================================================================
 * L'écran de simulation — un outil, et rien de plus (cahier §4.6 ter).
 *
 * **Il lit l'épargne, et il n'écrit rien.** C'était une calculatrice isolée :
 * aucune `Entry`, aucun support, aucun relevé n'y entrait, au motif que rien ne
 * devait en sortir. Les deux ne se valaient pas — refuser d'écrire protège le
 * document, refuser de lire ne protégeait rien et obligeait à retaper à la main
 * un capital que l'écran Épargne affiche deux écrans plus haut. L'origine d'une
 * simulation peut donc être un support ou l'épargne d'une personne ; le sens
 * reste unique — de l'épargne vers la simulation, jamais l'inverse.
 *
 * **Douze contrôles, et il en reste quatre.** L'écran exposait tout ce que le
 * modèle savait faire : mode, origine, capital, versement, objectif, durée en
 * deux contrôles, taux par compte à deux champs chacun, presets, trois
 * scénarios, euros constants, inflation, échelle d'effort, curseur d'effort,
 * table de paliers, feuille d'explication. C'était une spécification rendue en
 * JSX. Ce qui décide vraiment de la réponse tient en quatre lignes — d'où l'on
 * part, combien on verse, sur combien de temps, à quel rendement —, et tout le
 * reste est du détail qui s'ouvre.
 *
 * **Quatre mécanismes disaient l'incertitude ; il n'en reste qu'un.** Trois
 * hypothèses libres, trois présélections, un second taux par compte : autant de
 * façons de poser la même chose, dont aucune ne disait laquelle remplaçait les
 * autres. Une fourchette la dit une fois. Trois courbes demandent de choisir
 * laquelle on croit ; une aire montre l'écart sans rien promettre — c'est
 * exactement l'honnêteté que le reste de l'écran cherchait déjà.
 *
 * **La réponse ne quitte plus l'écran.** Elle était en tête, ce qui suffisait
 * tant qu'on ne réglait rien ; mais on vient ici pour tourner des boutons, et
 * régler sans voir ce qu'on change revient à jouer à un jeu dont le score est
 * derrière soi. Elle est collée en haut (`ResultTile`).
 *
 * **Ce qu'il refuse tient toujours plus de place que ce qu'il fait, mais plus à
 * l'écran.** Les simulateurs qui existent présélectionnent un taux flatteur,
 * comptent en euros courants et affichent le centime sur vingt ans : ce sont des
 * outils de vente. Ici il n'y a rien à vendre. D'où un rendement toujours
 * éditable et jamais suggéré, une fourchette plutôt qu'un chiffre unique, des
 * montants arrondis à ce que le modèle sait dire, et une réserve qui ne se
 * replie pas.
 * ==========================================================================*/

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { type Money, ZERO, toAmountInput } from '@/domain/money'
import { milestoneMonths } from '@/domain/projection'
import type { RateKind } from '@/domain/projection'
import type { ProjectionSource } from '@/domain/projectionStart'
import { savingLeft } from '@/domain/stats'
import { GOAL_PARAM, goalNewPath, goalPath } from '@/app/routes'
import { addMonthsToYm, today, ymOf } from '@/domain/date'
import { replaceSavingGoal } from '@/store/actions'
import { toast } from '@/ui/toast'
import { t } from '@/i18n/strings'
import { currencySymbol, formatMoney, formatPercent, formatRoundedMoney, tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'
import {
  useActiveSavingSupports,
  useKindTotals,
  useMembers,
  useProjectionStart,
  useSavingGoal,
} from '@/store/selectors'
import { Button } from '@/ui/Button'
import { Disclosure } from '@/ui/Disclosure'
import { Eyebrow } from '@/ui/Eyebrow'
import { AmountInput, Field, TextInput } from '@/ui/Field'
import { PageTitle } from '@/ui/PageTitle'
import { Row, RowGroup } from '@/ui/RowGroup'
import { Segmented } from '@/ui/Segmented'
import { Tile } from '@/ui/Tile'
import { useCurrency } from '@/ui/currency'
import { EffortStepper } from './EffortStepper'
import { ExplainSheet } from './ExplainSheet'
import { MilestoneTable, type MilestoneColumn } from './MilestoneTable'
import { ProjectionChart } from './ProjectionChart'
import { RateSheet } from './RateSheet'
import { ResultTile } from './ResultTile'
import { SourceSelect } from './SourceSelect'
import { Unit } from './Unit'
import { formatDuration } from './duration'
import {
  type ProjectionDraft,
  type ProjectionMode,
  type SupportRateDraft,
  type SupportSeries,
  MAX_YEARS,
  MIN_YEARS,
  YEAR_PRESETS,
  analyse,
  breakdownOf,
  isPreset,
  readDraft,
  writeDraft,
} from './model'

/** La valeur du cinquième segment de durée — celui qui ouvre le champ. */
const CUSTOM_YEARS = 'custom'

/**
 * Ce qu'un objectif préfixe dans le simulateur, relu et borné.
 *
 * La même méfiance que `readDraft` applique au brouillon local : une URL vient
 * du dehors, et un « duree=abc » n'a pas à casser l'écran. Ce qui ne se lit pas
 * est simplement absent, et le brouillon gardé reste tel quel sur ce champ-là.
 *
 * Le **mode** bascule sur l'objectif dès qu'une cible arrive : on n'ouvre pas le
 * simulateur depuis un objectif pour savoir ce qu'on aura, mais pour savoir
 * combien il faudrait verser.
 *
 * Rend un correctif éventuellement vide plutôt que `null` : il est étalé sur le
 * brouillon relu, et un objet vide n'y change rien — c'est une branche de moins
 * chez l'appelant pour la même chose.
 */
function presetFrom(params: URLSearchParams): Partial<ProjectionDraft> {
  const target = Number(params.get('cible'))
  const years = Number(params.get('duree'))
  const origin = params.get('origine')
  const seed: Partial<ProjectionDraft> = {}

  if (Number.isInteger(target) && target > 0) {
    seed.mode = 'target'
    seed.targetText = toAmountInput(target as Money)
  }
  if (Number.isInteger(years) && years >= MIN_YEARS && years <= MAX_YEARS) seed.years = years
  if (origin !== null) {
    const [kind, id] = origin.split(':')
    if ((kind === 'member' || kind === 'support') && id !== undefined && id !== '') {
      seed.source = { kind, id }
    }
  }
  return seed
}

const modes = (): { value: ProjectionMode; label: string }[] => [
  { value: 'forecast', label: projection.modeForecast },
  { value: 'target', label: projection.modeTarget },
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

/**
 * Le taux essayé sur un compte — posé, retiré, remplacé.
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
       doit pas faire tomber son taux à la fourchette de l'écran. */
    rateText: existing?.rateText ?? '',
    kind: existing?.kind ?? part.kind,
    ...(next.rateText === undefined ? {} : { rateText: next.rateText }),
    ...(next.kind === undefined ? {} : { kind: next.kind }),
  }
  return existing === undefined
    ? [...current, merged]
    : current.map((one) => (one.supportId === part.supportId ? merged : one))
}

export function ProjectionPage() {
  const currency = useCurrency()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  /* L'objectif d'où l'on vient, s'il y en a un. C'est lui qui décide de la
     sortie de l'écran : « adopter ce rythme » plutôt que « en faire un
     objectif ». Un identifiant qui ne désigne plus rien rend `null`, et l'écran
     retombe sur la sortie ordinaire — la règle de toutes les origines mortes. */
  const from = useSavingGoal(params.get(GOAL_PARAM) ?? undefined)
  /* Les derniers réglages sont relus une seule fois, au montage : ils sont le
     point de départ de la saisie, pas une source qui la piloterait.
     Le préréglage d'un objectif se pose **par-dessus**, dans l'initialisateur et
     non dans un effet : il ne doit s'appliquer qu'une fois — rejoué à chaque
     rendu, il empêcherait de toucher au moindre champ — et un état initial est
     exactement l'endroit où React exprime « une fois ». */
  const [draft, setDraft] = useState<ProjectionDraft>(() => ({
    ...readDraft(),
    ...presetFrom(params),
  }))
  const [explaining, setExplaining] = useState(false)
  const [rating, setRating] = useState(false)
  const [detailed, setDetailed] = useState(false)
  /* En état local et non dans le brouillon : ce qui doit survivre à une visite,
     c'est la **durée**, et une durée hors raccourci ramène son champ toute
     seule. Le garder dans le brouillon en aurait fait un second contrôle pour
     une donnée qui en a déjà un. */
  const [customYears, setCustomYears] = useState(false)

  const members = useMembers()
  const supports = useActiveSavingSupports()
  const source = resolveSource(draft.source, members, supports)
  /* L'horizon avant l'origine, et non l'inverse : c'est lui qui décide quelles
     règles sont assez durables pour entrer dans un versement constant. */
  const start = useProjectionStart(source, draft.years * 12)
  /* La capacité d'épargne restante du mois — la même donnée que l'écran
     Épargne et le tableau de bord, sous le même filtre : reprise, jamais
     recalculée. Elle n'entre dans aucune simulation d'elle-même, mais un
     versement libre peut la reprendre d'un geste plutôt que d'être retapé. */
  const totals = useKindTotals(true)
  const capacityLeft = savingLeft(totals)

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
     l'arrondi du modèle ne s'applique qu'à ce qui en sort. */
  const exact = (value: Money): string => formatMoney(value, currency, false)
  const percent = (rateBp: number): string =>
    formatPercent(rateBp / 10_000, rateBp % 100 === 0 ? 0 : 2)

  const lastLow = result?.low.series.balance.at(-1) ?? ZERO
  const lastHigh = result?.high.series.balance.at(-1) ?? ZERO

  /* Le surtitre et le chiffre héros, qui changent de nature avec le mode : le
     mode direct répond par un capital, le mode inverse par un versement. */
  const heading =
    result === null
      ? ''
      : result.target === null
        ? tpl(projection.resultIn, formatDuration(result.months))
        : tpl(projection.targetHeading, exact(result.target), formatDuration(result.months))

  const hero =
    result === null
      ? ''
      : result.target !== null
        ? result.single
          ? tpl(projection.perMonth, approx(result.low.monthly))
          : tpl(
              projection.perMonth,
              tpl(projection.rangeShort, approx(result.low.monthly), approx(result.high.monthly)),
            )
        : result.single
          ? approx(lastLow)
          : tpl(projection.rangeShort, approx(lastLow), approx(lastHigh))

  /* La ligne de dessous : la décomposition quand il n'y a qu'un chiffre, l'écart
     quand il y a une fourchette. Les deux répondent à la même question — d'où
     sort ce nombre — par le bout qui compte dans chaque cas. */
  const heroHint =
    result === null
      ? null
      : result.target !== null
        ? null
        : result.single
          ? (() => {
              const breakdown = breakdownOf(result.low.series, result.months)
              return tpl(
                projection.resultSplit,
                approx(breakdown.paid),
                approx(breakdown.interest),
              )
            })()
          : tpl(projection.rangeGap, approx((lastHigh - lastLow) as Money))

  const columns: MilestoneColumn[] =
    result === null
      ? []
      : [
          {
            id: 'paid',
            label: projection.contributedArea,
            values: marks.map((mark) => result.low.series.contributed[mark] ?? ZERO),
          },
          {
            id: 'low',
            label: result.single ? projection.breakdownTotal : projection.rangeLowColumn,
            values: marks.map((mark) => result.low.series.balance[mark] ?? ZERO),
          },
          ...(result.single
            ? []
            : [
                {
                  id: 'high',
                  label: projection.rangeHighColumn,
                  values: marks.map((mark) => result.high.series.balance[mark] ?? ZERO),
                },
              ]),
        ]

  /**
   * Reprendre un versement essayé : le même geste que « Modifier pour cette
   * simulation » (`SourceSelect`), déclenché depuis le réglage d'effort plutôt
   * que depuis le panneau d'origine. Repartir de l'épargne réelle sans y toucher
   * — le champ dit ensuite que le chiffre est à soi — puis poser le montant
   * essayé à la place de celui qu'elle lisait.
   */
  const applyEffort = (monthly: Money): void => {
    patch(
      source.kind === 'free'
        ? { monthlyText: toAmountInput(monthly) }
        : {
            source: { kind: 'free' },
            initialText: toAmountInput(start.capital ?? ZERO),
            monthlyText: toAmountInput(monthly),
          },
    )
  }

  const showYearsField = customYears || !isPreset(draft.years)

  /**
   * Les trois chiffres qu'on vient de décider, prêts pour le formulaire d'un
   * objectif : ce qu'on vise, pour quand, à quel rythme.
   *
   * La cible est l'arrivée de la **borne basse** en mode direct — celle qui
   * promet le moins —, et l'objectif tapé en mode inverse : on ne transforme pas
   * en cap un chiffre qui suppose que tout s'est bien passé.
   *
   * Le versement ne voyage **que** depuis une simulation libre. Branché sur
   * l'épargne réelle, il vient déjà des règles posées sur les comptes, et
   * l'objectif saura le relire tout seul : l'écrire en dur ferait une seconde
   * vérité que la première augmentation ferait diverger.
   */
  const seedForGoal = (): Parameters<typeof goalNewPath>[0] => {
    if (result === null) return {}
    const owner = source.kind === 'member' ? source.id : undefined
    const accounts = result.split.map((part) => part.supportId)
    return {
      target: result.target ?? lastLow,
      targetOn: addMonthsToYm(ymOf(today()), result.months),
      ...(source.kind === 'free' && result.monthly !== null && result.monthly > ZERO
        ? { monthly: result.monthly }
        : {}),
      ...(accounts.length === 0 ? {} : { supportIds: accounts }),
      ...(owner === undefined ? {} : { memberId: owner }),
    }
  }

  /**
   * Reposer sur l'objectif d'où l'on vient le rythme qu'on vient d'essayer.
   *
   * Le **versement**, et rien d'autre : ni la cible ni l'échéance ne se
   * changent ici — elles se corrigent sur le formulaire de l'objectif, qui est
   * leur écran. Ce qu'on adopte est un rythme, pas un cap.
   *
   * En mode inverse c'est le versement requis de la borne haute — la plus
   * exigeante des deux — qui est adopté : adopter la borne basse serait adopter
   * le rendement le plus flatteur, et manquer la date de peu.
   */
  const adopt = (): void => {
    if (from === null || result === null) return
    const monthly = result.monthly ?? result.high.monthly
    if (monthly <= ZERO) return
    const { id: _dropped, ...rest } = from
    replaceSavingGoal(from.id, { ...rest, monthly })
    toast(t.savings.goalAdopted)
    void navigate(goalPath(from.id))
  }

  return (
    <>
      <PageTitle title={projection.title} />

      <div className="flex max-w-3xl flex-col gap-4">
        {/* La réponse, collée en haut : elle ne quitte pas l'écran pendant qu'on
            règle. C'est la seule chose qu'on vient chercher ici, et un écran de
            réglages dont le résultat défile hors du champ de vision oblige à
            faire l'aller-retour à chaque essai. */}
        {result === null ? (
          <Tile>
            <p className="t-label">{missing ?? projection.nothingToPlot}</p>
          </Tile>
        ) : (
          <ResultTile heading={heading} hero={hero} hint={heroHint} />
        )}

        {result !== null && (
          <Tile className="gap-3">
            <ProjectionChart
              months={result.months}
              low={result.low.series.balance}
              high={result.high.series.balance}
              single={result.single}
              guaranteed={result.guaranteed}
              {...(result.contributed === null
                ? {}
                : { area: { label: projection.contributedArea, values: result.contributed } })}
              label={tpl(projection.chartLabel, formatDuration(result.months))}
              srText={[
                tpl(
                  result.single ? projection.srChart : projection.srChartRange,
                  money(result.low.series.balance[0] ?? ZERO),
                  money(lastLow),
                  result.single ? formatDuration(result.months) : money(lastHigh),
                  formatDuration(result.months),
                ),
                ...(result.contributed === null
                  ? []
                  : [tpl(projection.srContributed, money(result.contributed.at(-1) ?? ZERO))]),
              ].join(' ')}
            />
            {result.targetReached && <p className="t-label">{projection.targetReached}</p>}
            {result.inflationBp > 0 && (
              <p className="t-label">{tpl(projection.constantOn, percent(result.inflationBp))}</p>
            )}
            {/* La réserve, sous le tracé et jamais repliée : c'est la seule
                chose de cet écran qui soit vraie quels que soient les chiffres
                saisis, et une mise en garde qu'il faut ouvrir n'en est plus une. */}
            <p className="t-label">{projection.caveat}</p>
          </Tile>
        )}

        {/* Les quatre réglages, et il n'y en a pas un cinquième. Le mode décide
            de quelle question tout le reste est la réponse ; l'origine, le
            versement et la durée disent d'où l'on part et jusqu'où ; le
            rendement tient sur une ligne, et son détail s'ouvre. */}
        <Tile className="gap-4">
          <Eyebrow>{projection.params}</Eyebrow>

          <Segmented
            options={modes()}
            value={draft.mode}
            onChange={(mode) => {
              patch({ mode })
            }}
            label={projection.modeAxis}
            className="w-fit"
          />

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

            {draft.mode === 'forecast' ? (
              source.kind === 'free' && (
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
            ) : (
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

          {/* Le versement libre peut reprendre la capacité restante du mois —
              la même donnée que l'écran Épargne et le tableau de bord, sous le
              même filtre — plutôt que d'être retapé. Elle ne s'affiche que là
              où le champ est éditable, et seulement s'il reste quelque chose à
              reprendre : à zéro ou en dépassement, il n'y a rien à proposer. */}
          {draft.mode === 'forecast' && source.kind === 'free' && capacityLeft > ZERO && (
            <div className="flex flex-wrap items-center gap-3">
              <p className="t-label">
                {tpl(projection.capacityLeft, tpl(projection.perMonth, exact(capacityLeft)))}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  patch({ monthlyText: toAmountInput(capacityLeft) })
                }}
              >
                {tpl(projection.capacityUse, exact(capacityLeft))}
              </Button>
            </div>
          )}

          {/* Un seul contrôle pour la durée : quatre raccourcis et un cinquième
              segment qui ouvre le champ. Le champ vivait à côté d'eux en
              permanence — deux contrôles pour une même donnée, dont l'un ne sert
              qu'aux horizons que les autres ne savent pas dire. Il revient de
              lui-même sur une durée hors raccourci : sans quoi sept ans
              reviendraient sans rien pour les relire. */}
          <div className="flex flex-col gap-3">
            <Segmented
              options={[
                ...YEAR_PRESETS.map((years) => ({
                  value: String(years),
                  label: tpl(projection.durationPreset, years),
                })),
                { value: CUSTOM_YEARS, label: projection.durationOther },
              ]}
              value={showYearsField ? CUSTOM_YEARS : String(draft.years)}
              onChange={(value) => {
                if (value === CUSTOM_YEARS) {
                  setCustomYears(true)
                  return
                }
                setCustomYears(false)
                patch({ years: Number(value) })
              }}
              label={projection.duration}
              className="w-fit"
            />
            {showYearsField && (
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
            )}
          </div>

          {/* Le rendement en **une ligne**, et son détail derrière une porte.
              C'est le contrôle qui prenait le plus de place — presets, trois
              hypothèses, un champ par compte, un second champ par compte — pour
              une question à laquelle une fourchette répond en deux nombres. La
              rangée dit ceux qui courent réellement, et non ceux qui sont tapés :
              un Livret A posé à 2,40 % et un PEA muet donnent « 2,40 % – 7 % ». */}
          <RowGroup>
            <Row
              label={projection.rate}
              description={
                result === null
                  ? projection.rangeUnknown
                  : result.rateSpan.low === result.rateSpan.high
                    ? percent(result.rateSpan.low)
                    : tpl(
                        projection.rangeShort,
                        percent(result.rateSpan.low),
                        percent(result.rateSpan.high),
                      )
              }
              onClick={() => {
                setRating(true)
              }}
            />
          </RowGroup>
        </Tile>

        {/* La seule lecture actionnable de l'écran : « combien j'aurai » se
            contemple, « ce que 50 € de plus changeraient » se décide. Elle n'a de
            sens qu'en mode direct — le mode inverse répond déjà par un versement. */}
        {result !== null && result.monthly !== null && result.monthly > ZERO && (
          <EffortStepper result={result} onApply={applyEffort} />
        )}

        {result !== null && (
          /* Le tableau doit exister — une courbe ne se lit pas au chiffre près,
             et le cahier §5 demande que tout graphique soit doublé d'une lecture
             textuelle. Il passe derrière un repli parce que le curseur du tracé
             répond à la même question au doigt : il n'est plus la seule lecture
             précise, il est la lecture exhaustive. */
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

        {/* **La sortie**, et c'est elle qui fait cesser le cul-de-sac. On réglait
            quatre choses, on regardait une courbe, on partait : rien n'était
            retenu, rien n'était décidé, rien ne revenait. Le brouillon
            `localStorage` sauvait la saisie, pas l'intention.

            Ce qui sort n'est pas la simulation — un taux essayé reste dehors,
            c'est la règle qui tient tout l'écran — mais **une intention adoptée
            par un geste explicite**, ce qui est un fait du foyer exactement
            comme un crédit souscrit. Elle passe par le formulaire d'un objectif,
            préréglé : rien ne s'écrit sans qu'on ait vu ce qu'on écrit.

            Venu d'un objectif, le même bouton dit l'autre moitié de la boucle :
            reposer sur lui le rythme qu'on vient d'essayer. */}
        {result !== null && (
          <Button
            onClick={() => {
              if (from !== null) {
                adopt()
                return
              }
              void navigate(goalNewPath(seedForGoal()))
            }}
          >
            {from === null ? t.savings.goalFromSimulation : t.savings.goalAdopt}
          </Button>
        )}
      </div>

      <RateSheet
        open={rating}
        onClose={() => {
          setRating(false)
        }}
        lowText={draft.lowText}
        highText={draft.highText}
        onRate={patch}
        errors={errors}
        result={result}
        supportRates={draft.supportRates}
        onSupportRate={(part, next) => {
          patch({ supportRates: setSupportRate(draft.supportRates, part, next) })
        }}
        onSupportReset={(part) => {
          patch({
            supportRates: draft.supportRates.filter((one) => one.supportId !== part.supportId),
          })
        }}
        constant={draft.constant}
        onConstant={(constant) => {
          patch({ constant })
        }}
        inflationText={draft.inflationText}
        onInflation={(inflationText) => {
          patch({ inflationText })
        }}
        percent={percent}
      />

      <ExplainSheet
        open={explaining}
        onClose={() => {
          setExplaining(false)
        }}
      />
    </>
  )
}
