/* ============================================================================
 * Les objectifs — le seul bloc de l'écran qui **conclut**.
 *
 * Tout le reste dit ce qu'on a, où c'est placé et ce qu'on y verse : trois
 * lectures qu'un relevé de banque donne aussi, en mieux et sans qu'on recopie
 * rien. Ce qu'aucun relevé ne donne, c'est l'écart entre ce qu'on vise et ce
 * qu'on tient — et c'est ce mot-là, « à l'heure » ou « sept mois de retard »,
 * qui fait rouvrir l'écran quand le capital n'a pas bougé.
 *
 * C'est pourquoi il est au **centre optique** et non en bas : la section qui
 * conclut ne se descend pas.
 * ==========================================================================*/

import { useNavigate } from 'react-router-dom'
import { GOAL_NEW_PATH, goalPath } from '@/app/routes'
import { ZERO } from '@/domain/money'
import type { SavingGoal } from '@/domain/types'
import { t } from '@/i18n/strings'
import { formatRoundedMoney, formatYearMonth, tpl } from '@/i18n/format'
import { useGoalRead, useScopedSavingGoals } from '@/store/selectors'
import { Button } from '@/ui/Button'
import { Eyebrow } from '@/ui/Eyebrow'
import { Plus } from '@/ui/Icons'
import { Row, RowGroup } from '@/ui/RowGroup'
import { useCurrency } from '@/ui/currency'
import { GoalGauge } from './GoalGauge'
import { verdictClass, verdictOf } from './goalVerdict'

export function GoalsSection() {
  const navigate = useNavigate()
  const goals = useScopedSavingGoals()

  return (
    <section className="flex flex-col gap-3">
      <Eyebrow>{t.savings.goals}</Eyebrow>

      {/* Un écran vide est une invitation, pas un constat (DS §7) : la section
          ne s'efface pas, elle propose le seul geste qui la peuplerait. */}
      {goals.length === 0 ? (
        <p className="t-label">{t.savings.goalsEmpty}</p>
      ) : (
        <RowGroup>
          {goals.map((goal) => (
            <GoalRow key={goal.id} goal={goal} />
          ))}
        </RowGroup>
      )}

      <Button
        size="sm"
        variant="ghost"
        className="w-fit"
        onClick={() => {
          void navigate(GOAL_NEW_PATH)
        }}
      >
        <Plus size={18} />
        {t.savings.goalAdd}
      </Button>
    </section>
  )
}

/**
 * Une rangée : le nom, la jauge, l'avancement, et le verdict en toutes lettres.
 *
 * Le verdict passe **devant** la date d'arrivée, et c'est l'ordre dans lequel
 * la question se pose : « est-ce que ça va ? » avant « quand ? ». Une rangée
 * qui n'annoncerait que « mars 2028 » obligerait à comparer de tête avec une
 * échéance écrite ailleurs — c'est-à-dire à refaire soi-même le seul calcul que
 * cet écran existe pour faire.
 */
function GoalRow({ goal }: { goal: SavingGoal }) {
  const currency = useCurrency()
  const read = useGoalRead(goal)
  if (read === null) return null

  const verdict = verdictOf(read)
  const arrival =
    read.reachOn === null
      ? null
      : tpl(
          t.savings.goalReachOn,
          formatRoundedMoney(goal.target, currency),
          formatYearMonth(read.reachOn),
        )

  return (
    <Row
      label={goal.label}
      /* Le mot d'abord, la date ensuite, et le rattrapage en dessous quand il
         y en a un : c'est la seule chose actionnable de la rangée. */
      description={[verdict.label, arrival].filter((one) => one !== null && one !== '').join(' · ')}
      icon={verdict.icon}
      trailing={
        <span className="flex flex-col items-end gap-1">
          <GoalGauge progress={read.progress} tone={verdict.tone} />
          <span className={`t-label tnum ${verdictClass(verdict.tone)}`}>
            {tpl(
              t.savings.goalProgress,
              formatRoundedMoney(read.capital ?? ZERO, currency),
              formatRoundedMoney(goal.target, currency),
            )}
          </span>
        </span>
      }
      to={goalPath(goal.id)}
    />
  )
}
