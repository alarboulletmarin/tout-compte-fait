/* ============================================================================
 * La fiche d'un objectif — l'écran où la projection devient utile.
 *
 * Une courbe seule est décorative : on la regarde, on part, rien n'en reste.
 * Ce qui la rend utile, c'est ce qui vient **se poser dessus** — les relevés
 * des comptes rattachés, aux dates où ils ont été saisis. Aucune donnée
 * nouvelle n'est nécessaire pour cela : tout est déjà dans le document, et
 * c'est précisément ce qui manquait au simulateur, qui ne lisait rien qui le
 * concerne.
 *
 * **Le verdict est en toutes lettres, et il précède tout le reste.** « Atteint
 * en mars 2028 — le mois visé » est la seule phrase de l'app qu'aucun relevé de
 * banque ne produit ; l'avancement, le capital et le versement se lisent
 * ailleurs, en mieux. Elle est donc au-dessus de la courbe et non sous elle.
 *
 * **Trois lignes de lecture, pas trois formulaires.** Le versement, les comptes
 * et l'hypothèse se lisent ici et se **modifient ailleurs** — sur le formulaire
 * de l'objectif pour les deux premiers, sur la fiche d'un compte pour le
 * troisième, où le taux se pose daté. C'est la règle qui tient tout l'écran
 * d'épargne : un chiffre a un seul endroit où il s'écrit.
 * ==========================================================================*/

import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { SAVINGS_PATH, goalEditPath, projectionPath, supportPath } from '@/app/routes'
import { ymOf, today } from '@/domain/date'
import { GOAL_HORIZON_MONTHS, goalTrajectory } from '@/domain/goal'
import { ZERO } from '@/domain/money'
import { valuationsOf } from '@/domain/saving'
import { t } from '@/i18n/strings'
import { supports } from '@/i18n/supports'
import { formatMoney, formatPercent, formatRoundedMoney, formatYearMonth, tpl } from '@/i18n/format'
import {
  useGoalBasis,
  useGoalRead,
  useSavingGoal,
  useSavingSupportMap,
  useSavingValuations,
} from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Button } from '@/ui/Button'
import { Eyebrow } from '@/ui/Eyebrow'
import { PageTitle } from '@/ui/PageTitle'
import { Row, RowGroup } from '@/ui/RowGroup'
import { Tile } from '@/ui/Tile'
import { useCurrency } from '@/ui/currency'
import { GoalChart } from './GoalChart'
import { GoalGauge } from './GoalGauge'
import { verdictOf } from './goalVerdict'

export function GoalPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const currency = useCurrency()
  const goal = useSavingGoal(id)
  const read = useGoalRead(goal)
  const basis = useGoalBasis(goal)
  /* `byId` et non `supports` : le catalogue de chaînes porte déjà ce nom dans
     ce fichier. */
  const byId = useSavingSupportMap()
  const valuations = useSavingValuations()

  // Supprimé depuis un autre onglet, ou URL fausse.
  if (goal === null || read === null || basis === null) {
    return <Navigate to={SAVINGS_PATH} replace />
  }

  const verdict = verdictOf(read)
  const month = ymOf(today())
  const arrival =
    read.reachOn === null
      ? null
      : tpl(
          t.savings.goalReachOn,
          formatRoundedMoney(goal.target, currency),
          formatYearMonth(read.reachOn),
        )
  /* La courbe s'arrête à l'arrivée, ou à l'échéance visée quand celle-ci est
     plus lointaine : tracer les cinquante ans de la recherche donnerait un
     trait plat sur quarante-huit d'entre eux. Deux ans au minimum — une courbe
     de trois points ne se lit pas. */
  const horizon = Math.min(
    GOAL_HORIZON_MONTHS,
    Math.max(24, monthsTo(month, read.reachOn), monthsTo(month, goal.targetOn ?? null)),
  )
  const planned = goalTrajectory(basis, horizon, basis.monthly, month).balance

  /* Les relevés des comptes rattachés, dans l'ordre du temps : ce sont eux qui
     viennent se poser sur le prévu, et ce sont les seuls faits du graphique. */
  const points = goal.supportIds
    .flatMap((supportId) => valuationsOf(valuations, supportId))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  const linked = goal.supportIds.flatMap((supportId) => {
    const support = byId.get(supportId)
    return support === undefined ? [] : [support]
  })

  /* L'étendue des taux qui courent réellement, comme sur le simulateur : ce que
     l'app applique, et non ce que les comptes affichent séparément. */
  const rates = basis.parts.map((part) => part.rateBp ?? 0)
  const low = rates.length === 0 ? null : Math.min(...rates)
  const high = rates.length === 0 ? null : Math.max(...rates)
  const percent = (rateBp: number): string =>
    formatPercent(rateBp / 10_000, rateBp % 100 === 0 ? 0 : 2)

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <PageTitle
        title={goal.label}
        onBack={() => {
          void navigate(SAVINGS_PATH)
        }}
      />

      {/* Le verdict, et il passe avant le chiffre : « sept mois de retard » est
          la conclusion, « 28 400 € sur 42 000 € » n'en est pas une. */}
      <Tile variant="accent" className="gap-2">
        {/* Un objectif sans échéance n'est ni à l'heure ni en retard : il n'a
            pas de verdict, et c'est sa date d'arrivée qui prend la place — un
            surtitre vide se lirait comme un état qu'on n'a pas su calculer. */}
        <Eyebrow icon={verdict.icon}>{verdict.label === '' ? (arrival ?? '') : verdict.label}</Eyebrow>
        {/* `t-tile-fit` et non `t-tile-num` : la ligne porte **deux** montants
            — « 28 400 € sur 42 000 € » —, donc la plus longue chaîne de
            l'écran, et une taille fixe la ferait sortir de la tuile au premier
            capital à six chiffres. */}
        <p className="t-tile-fit tnum">
          {tpl(
            t.savings.goalProgress,
            formatMoney(read.capital ?? ZERO, currency, false),
            formatMoney(goal.target, currency, false),
          )}
        </p>
        <GoalGauge progress={read.progress} tone={verdict.tone} />
        {arrival !== null && verdict.label !== '' && <span className="t-label">{arrival}</span>}
        {goal.targetOn !== undefined && (
          <span className="t-label">
            {tpl(supports.goalTargetOn, formatYearMonth(goal.targetOn))}
          </span>
        )}
        {/* La seule chose actionnable de l'écran : un écart sans ce chiffre se
            contemple, avec lui il se décide. */}
        {read.neededMonthly !== null && (
          <span className="t-label">
            {tpl(
              supports.goalNeeded,
              formatRoundedMoney(
                Math.max(0, read.neededMonthly - read.monthly) as typeof read.monthly,
                currency,
              ),
            )}
          </span>
        )}
      </Tile>

      {/* Le réel posé sur le prévu. C'est la raison d'être de cet écran, et
          elle ne coûte aucune donnée nouvelle. */}
      <Tile className="gap-3">
        <Eyebrow>{supports.goalChart}</Eyebrow>
        {points.length === 0 ? (
          <p className="t-label">{supports.goalChartEmpty}</p>
        ) : (
          <GoalChart planned={planned} from={month} actual={points} target={goal.target} />
        )}
      </Tile>

      {/* Trois lectures, et chacune mène là où elle s'écrit. Aucun champ ici :
          un chiffre a un seul endroit où il se saisit. */}
      <RowGroup>
        <Row
          label={supports.goalCurrent}
          description={goal.monthly === undefined ? supports.goalCurrentFrom : supports.goalCurrentOwn}
          trailing={<Amount value={read.monthly} />}
          onClick={() => {
            void navigate(goalEditPath(goal.id))
          }}
        />
        <Row
          label={supports.goalAccounts}
          description={
            linked.length === 0
              ? supports.goalSupportsNone
              : linked.map((support) => support.label).join(' · ')
          }
          onClick={() => {
            void navigate(goalEditPath(goal.id))
          }}
        />
        <Row
          label={supports.goalRate}
          description={
            low === null || high === null
              ? supports.goalRateNone
              : low === high
                ? percent(low)
                : `${percent(low)} – ${percent(high)}`
          }
          /* Le taux se change sur la fiche du compte, où il se pose **daté** :
             le modifier ici en ferait une seconde vérité, et réécrirait le
             passé du compte. Un seul compte : on y va ; plusieurs : on renvoie
             à la liste, qui est l'écran de leur gestion. */
          {...(linked.length === 1 && linked[0] !== undefined
            ? {
                onClick: () => {
                  void navigate(supportPath(linked[0]?.id ?? ''))
                },
              }
            : {})}
        />
      </RowGroup>

      <p className="t-label">{supports.goalRateHint}</p>

      {/* **La porte du simulateur est ici**, et nulle part ailleurs sur
          l'épargne : c'est le seul endroit où la question « et si je versais
          autrement ? » se pose sur quelque chose de précis — cette cible, cette
          échéance, ces comptes. La rangée qui vivait en fin d'écran d'épargne
          ouvrait le simulateur sur rien du tout ; « Plus » garde son entrée pour
          qui vient sans objectif.
          Le simulateur sait d'où il vient : sa sortie cesse d'être « en faire un
          objectif » pour devenir « adopter ce rythme », qui repose le versement
          sur celui-ci. C'est ce qui referme la boucle. */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            void navigate(
              projectionPath({
                goalId: goal.id,
                target: goal.target,
                /* L'horizon en années, arrondi au supérieur : le simulateur
                   raisonne en années pleines, et rogner l'échéance ferait
                   répondre à une question plus courte que celle qu'on pose. */
                ...(goal.targetOn === undefined
                  ? {}
                  : { years: Math.max(1, Math.ceil(monthsTo(month, goal.targetOn) / 12)) }),
                /* Un seul compte : le simulateur part de lui. Plusieurs :
                   il part de toute l'épargne de la personne — il n'existe pas
                   d'origine « ces trois comptes-là », et en inventer une pour
                   un aller simple coûterait plus qu'elle ne rapporte. */
                source:
                  linked.length === 1 && linked[0] !== undefined
                    ? `support:${linked[0].id}`
                    : `member:${goal.memberId}`,
              }),
            )
          }}
        >
          {t.savings.goalSimulate}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            void navigate(goalEditPath(goal.id))
          }}
        >
          {supports.goalEdit}
        </Button>
      </div>
    </div>
  )
}

/** Le nombre de mois d'ici à un mois donné, jamais négatif. `0` sans mois. */
function monthsTo(from: string, to: string | null): number {
  if (to === null) return 0
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  return Math.max(0, ((ty ?? 0) - (fy ?? 0)) * 12 + ((tm ?? 0) - (fm ?? 0)))
}
