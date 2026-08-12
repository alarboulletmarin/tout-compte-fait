import { Link } from 'react-router-dom'
import { LANDING_PATH } from '@/app/routes'
import { t } from '@/i18n/strings'
import { tpl } from '@/i18n/format'
import { ChevronLeft } from '@/ui/Icons'
import { Ring } from '@/ui/Ring'

/**
 * Les quatre rangs de l'onboarding : ce qu'il énonce, puis les trois questions
 * qu'il pose. Le type vit ici, avec la jauge qui le divise — écrit à la main
 * dans la page et dans l'en-tête, l'un des deux aurait fini par compter une
 * étape de moins que l'autre.
 */
export type OnboardingStep = 1 | 2 | 3 | 4

/**
 * L'en-tête des deux étapes : le retour, le nom de l'app, et la progression.
 *
 * La progression était une phrase — « Étape 1 sur 2 ». Elle est maintenant
 * l'anneau signature en jauge, à l'épaisseur du DS §6, celle qu'utilisent déjà
 * l'écran de démarrage et les états vides. Le DS §1 le dit ainsi : un seul
 * motif géométrique, décliné. La phrase reste, pour les lecteurs d'écran et
 * parce qu'un anneau ne se compte pas au premier coup d'œil.
 *
 * Le retour n'est pas décoratif : en app installée il n'y a pas de bouton
 * retour du navigateur, et sans lui quelqu'un qui veut relire la présentation
 * ou charger l'exemple n'a plus qu'à répondre ou à fermer.
 */
/** Le nombre d'étapes. Vit ici parce que c'est ici que la jauge le divise. */
const STEPS = 4

export function StepProgress({ step, onBack }: { step: OnboardingStep; onBack?: () => void }) {
  const label = tpl(t.onboarding.progress, step)

  return (
    <header className="flex items-center gap-4">
      {onBack === undefined ? (
        <Link to={LANDING_PATH} className={BACK} aria-label={t.onboarding.backToLanding}>
          <ChevronLeft size={18} />
        </Link>
      ) : (
        /* Le retour nomme l'étape où il ramène : un lecteur d'écran qui
           n'entend que « retour » ne sait pas s'il perd une réponse. */
        <button
          type="button"
          onClick={onBack}
          className={BACK}
          aria-label={tpl(t.onboarding.backToStep, step - 1)}
        >
          <ChevronLeft size={18} />
        </button>
      )}

      {/* L'anneau colle à son libellé plutôt que de fuir au bord droit : une
          jauge posée à l'autre bout de la ligne ne se rattache plus à rien. */}
      <Ring size={56} value={step / STEPS} label={label} srText={label} className="shrink-0" />

      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="t-eyebrow text-muted">{t.app.name}</span>
        <span className="t-label">{tpl(t.onboarding.step, step)}</span>
      </div>
    </header>
  )
}

const BACK =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-input text-muted hover:bg-surface-2'
