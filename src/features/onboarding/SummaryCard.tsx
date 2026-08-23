import type { ReactNode } from 'react'
import type { Member } from '@/domain/types'
import { enumerate, tpl } from '@/i18n/format'
import { t } from '@/i18n/strings'
import { Amount } from '@/ui/Amount'
import { cascadeStyle, useCascade } from '@/ui/cascade'
import { Eyebrow } from '@/ui/Eyebrow'
import type { OnboardingTotals } from './queue'

/** Une ligne du récapitulatif : ce qu'on a répondu, et ce que ça vaut. */
function Line({
  label,
  value,
  rank,
  shown,
}: {
  label: string
  value: ReactNode
  rank: number
  shown: number
}) {
  return (
    <div
      className="flex items-baseline justify-between gap-3 transition-[transform,opacity] ease-ds"
      style={cascadeStyle(rank, shown)}
    >
      <span className="t-body text-muted">{label}</span>
      {value}
    </div>
  )
}

/**
 * La dernière carte : ce que les réponses ont composé, avant d'ouvrir l'app.
 *
 * **Les lignes arrivent en cascade**, au même pas que le bilan de la revue —
 * le hook vit dans `ui/cascade.ts` justement pour que les deux ne divergent
 * pas. Sous `prefers-reduced-motion`, tout est là au premier rendu : une
 * cascade qui ne partirait pas laisserait un récapitulatif vide, ce qui est le
 * mode d'échec de toutes les cascades.
 *
 * **Le dernier chiffre s'appelle « Prévisionnel », pas « reste à vivre ».** Les
 * deux mots désignent deux chiffres différents dans le domaine : le
 * prévisionnel est revenus moins charges, le reste à vivre (`domain/stats.ts`)
 * est le solde arrêté la veille de la prochaine rentrée d'argent. Sur un foyer
 * payé le 28, l'écart vaut presque un mois de charges — les confondre ici
 * ferait mentir la première lecture de l'app sur elle-même, et sur un écran que
 * l'utilisateur reverra sous ce nom-là dès le lendemain.
 *
 * **La ligne « Partage » n'apparaît qu'à plusieurs**, et elle énonce la règle
 * plutôt que de la proposer : le modèle n'en connaît qu'une.
 */
export function SummaryCard({
  members,
  totals,
}: {
  members: readonly Member[]
  totals: OnboardingTotals
}) {
  /* Une ligne par réponse, dans l'ordre où elles ont été données. Le partage ne
     compte que s'il y a quelqu'un avec qui partager, les charges libres que
     s'il y en a : une ligne « 0 autres charges » n'apprendrait rien. */
  const lines: { label: string; value: ReactNode }[] = [
    {
      label: t.onboarding.summaryHousehold,
      value: (
        <span className="t-body min-w-0 text-right">
          {members.length === 0
            ? t.onboarding.summaryHouseholdSolo
            : enumerate(members.map((member) => member.name))}
        </span>
      ),
    },
    ...(members.length > 1
      ? [
          {
            label: t.onboarding.summaryShare,
            value: (
              <span className="t-body min-w-0 text-right">
                {t.onboarding.summaryShareValue}
              </span>
            ),
          },
        ]
      : []),
    {
      label: t.onboarding.summaryIncome,
      value: <Amount value={totals.income} size="body" direction="in" />,
    },
    { label: t.onboarding.summaryRent, value: <Amount value={totals.rent} size="body" /> },
    ...(totals.extrasCount > 0
      ? [
          {
            label:
              totals.extrasCount === 1
                ? t.onboarding.summaryExtrasOne
                : tpl(t.onboarding.summaryExtras, totals.extrasCount),
            value: <Amount value={totals.extras} size="body" />,
          },
        ]
      : []),
  ]

  /* Les lignes, puis la tuile du prévisionnel : un temps de plus. Elle vient en
     dernier parce que c'est la conclusion — on ne conclut pas avant d'avoir
     posé les termes. */
  const shown = useCascade(lines.length + 1)

  return (
    <div className="flex flex-col gap-4">
      <section className="tile flex flex-col gap-3 p-5 md:p-6">
        {lines.map((line, rank) => (
          <Line key={line.label} rank={rank} shown={shown} label={line.label} value={line.value} />
        ))}
      </section>

      <section
        /* Le cadre de sa jumelle du bilan de revue, au pixel près
           (`ReviewSummary`) : 12px de gouttière — l'intérieur d'une tuile
           respire à 12 (DS §4) — et un vrai `Eyebrow`, dont le `py-1.5`
           manquait à l'étiquette écrite à la main. Les deux tuiles portent le
           même couple étiquette + chiffre héros ; elles ne peuvent pas
           l'espacer de deux façons. */
        className="tile flex flex-col gap-3 p-5 transition-[transform,opacity] ease-ds md:p-6"
        style={cascadeStyle(lines.length, shown)}
      >
        <Eyebrow>{t.onboarding.summaryForecast}</Eyebrow>
        <span className="fit-box block">
          <Amount value={totals.forecast} size="hero-fit" />
        </span>
      </section>
    </div>
  )
}
