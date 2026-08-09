import { t } from '@/i18n/strings'
import { Button } from '@/ui/Button'
import { AmountInput, Field } from '@/ui/Field'
import type { StarterLine } from './starter'

/**
 * Seconde étape : ce qui revient chaque mois. Facultative, et elle le dit.
 *
 * La question qui précède suffit à démarrer, et le cahier §4.1 a raison de
 * refuser un questionnaire de configuration. Mais « ne rien exiger » et « ne
 * rien proposer » sont deux choses différentes : l'app ne vaut rien tant que
 * les récurrences ne sont pas posées — c'est sa thèse, écrite en première ligne
 * de la présentation —, et rien n'y conduisait. On arrivait sur un tableau de
 * bord à zéro dont le seul geste offert, une dépense ponctuelle, n'amorce
 * aucune prévision.
 *
 * D'où deux lignes, pas dix : un salaire par personne — le seul chiffre qui
 * fasse parler le prorata — et ce qu'on verse pour se loger. Rien n'est
 * obligatoire, un champ vide ne bloque rien, et « Je le ferai plus tard » est
 * un vrai bouton posé à côté du principal, pas un lien qu'il faut chercher.
 *
 * Aucun champ de jour : voir `starterRecurrences`.
 */
export function StarterStep({
  lines,
  amounts,
  onAmount,
  onSubmit,
  onSkip,
}: {
  lines: readonly StarterLine[]
  amounts: Readonly<Record<string, string>>
  onAmount: (key: string, value: string) => void
  onSubmit: () => void
  onSkip: () => void
}) {
  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div className="flex flex-col gap-2">
        <h1 className="t-section">{t.onboarding.starterTitle}</h1>
        <p className="t-label">{t.onboarding.starterHint}</p>
      </div>

      <div className="flex flex-col gap-4">
        {lines.map((line, index) => (
          <Field
            key={line.key}
            label={line.label}
            optional
            {...(line.hint === undefined ? {} : { hint: line.hint })}
          >
            {(id) => (
              <AmountInput
                id={id}
                value={amounts[line.key] ?? ''}
                placeholder="0,00"
                autoFocus={index === 0}
                onChange={(event) => {
                  onAmount(line.key, event.target.value)
                }}
              />
            )}
          </Field>
        ))}
      </div>

      <p className="t-label">{t.onboarding.starterDayNote}</p>

      {/* Le second bouton est aussi visible que le premier, et c'est la
          condition que le cahier §4.1 met à l'existence de cette étape. Il
          reste secondaire : sauter est un choix légitime, ce n'est pas celui
          qu'on recommande. */}
      {/* « Continuer » et non « Commencer » : l'étape n'est plus la dernière —
          l'épargne actuelle se demande après, et un bouton qui annoncerait
          l'ouverture de l'app mentirait d'un écran. */}
      <div className="flex flex-col gap-2">
        <Button type="submit" full>
          {t.common.next}
        </Button>
        <Button type="button" variant="ghost" full onClick={onSkip}>
          {t.onboarding.starterSkip}
        </Button>
      </div>
    </form>
  )
}
