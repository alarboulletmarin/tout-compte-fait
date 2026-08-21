import { type PointerEvent as ReactPointerEvent, useRef } from 'react'
import { type YearMonth, addMonthsToYm, parseYm } from '@/domain/date'
import { formatYearMonth, monthName, tpl } from '@/i18n/format'
import { t } from '@/i18n/strings'
import { cn } from '@/lib/cn'
import { IconButton } from './Button'
import { ChevronLeft, ChevronRight } from './Icons'

export type MonthNavProps = {
  value: YearMonth
  onChange: (next: YearMonth) => void
  /** Bornes incluses. Au-delà, le chevron correspondant est désactivé. */
  min?: YearMonth
  max?: YearMonth
  /**
   * Le mois où le bloc titre ramène — le mois courant, partout où c'est posé.
   *
   * Absent, ou égal au mois affiché, le bloc n'est pas actionnable : il redevient
   * un simple titre, qui ne prend pas le focus et n'annonce aucune action. C'est
   * la règle des repères d'action du DS §6 appliquée au titre lui-même — un
   * geste qui ne bougerait rien apprend à ignorer ceux qui bougent quelque
   * chose —, et c'est aussi pourquoi la décision se prend ici plutôt que chez
   * l'appelant : lui n'a qu'un mois à nommer, pas deux états à écrire.
   */
  returnTo?: YearMonth
  className?: string
}

const SWIPE_THRESHOLD = 48

/**
 * Chevrons de part et d'autre du mois, année en mono dessous. DS §6.
 *
 * Le mois se change aussi au balayage, et en Pointer Events comme `SwipeAway` :
 * en TouchEvents, le geste n'existait qu'au doigt — souris et stylet en étaient
 * exclus, alors que le seul autre geste balayable de l'app les acceptait. Deux
 * grammaires pour un même mouvement, à un écran d'écart.
 *
 * `touch-action: pan-y` est l'exact pendant du `pan-x` du bandeau d'export :
 * il rend la page défilante à la verticale tout en laissant l'horizontale ici.
 * Sans lui, le navigateur préempte le mouvement et n'envoie plus rien.
 */
export function MonthNav({ value, onChange, min, max, returnTo, className }: MonthNavProps) {
  const { y, m } = parseYm(value)
  const previous = addMonthsToYm(value, -1)
  const next = addMonthsToYm(value, 1)
  const canGoBack = min === undefined || previous >= min
  const canGoForward = max === undefined || next <= max
  const returnable = returnTo !== undefined && returnTo !== value

  const start = useRef<{ x: number; y: number; id: number } | null>(null)
  /**
   * Le glissé vient-il de faire changer de mois ?
   *
   * Le bloc titre est une cible de clic **et** le milieu de la piste de
   * balayage, or le navigateur émet le `click` juste après le `pointerup` :
   * sans ce drapeau, un balayage parti du titre changeait de mois puis
   * repartait aussitôt au mois courant. L'exclure de la piste, comme les
   * chevrons, aurait été l'autre issue — mais elle coûte la moitié de la
   * largeur balayable à 320 points, sur le seul geste que cette barre offre au
   * pouce. Il se remet à zéro à chaque pression, jamais à la lecture : un
   * relâchement hors du bloc ne produit pas de clic, et un drapeau qui
   * attendrait le sien mangerait le suivant.
   */
  const swiped = useRef(false)

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    swiped.current = false
    /* Le geste ne part jamais d'un chevron : sinon viser le bouton produirait
       un micro-glissement au lieu d'un clic. Le bloc titre fait exception et le
       dit — il occupe le milieu de la barre, c'est-à-dire l'essentiel de la
       piste, et l'en retirer reviendrait à retirer le balayage. */
    const control = (event.target as HTMLElement).closest('a, input, select, button')
    if (control !== null && control.getAttribute('data-swipe') !== 'true') return
    start.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
    // La capture garantit que le relâchement revient ici, même hors du cadre.
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const from = start.current
    start.current = null
    if (from === null || from.id !== event.pointerId) return
    const dx = event.clientX - from.x
    // Plus horizontal que vertical, sans quoi un défilement de page qui dérive
    // un peu changerait de mois.
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(event.clientY - from.y)) return
    swiped.current = true
    if (dx > 0 && canGoBack) onChange(previous)
    if (dx < 0 && canGoForward) onChange(next)
  }

  return (
    <div
      className={cn('flex items-center justify-between gap-2 select-none', className)}
      style={{ touchAction: 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        start.current = null
      }}
    >
      <IconButton
        label={t.a11y.previousMonth}
        title={t.a11y.previousMonthKey}
        disabled={!canGoBack}
        onClick={() => {
          onChange(previous)
        }}
      >
        <ChevronLeft />
      </IconButton>

      {/* Le bloc titre, tapable seulement quand il ramène quelque part.

          Il porte alors un nom accessible complet — « Revenir à août 2026 » —
          parce que rien dans son contenu ne le donnerait : un lecteur d'écran y
          lirait « revenir à août février 2025 », c'est-à-dire deux mois dans la
          même phrase et aucune destination claire. Le texte visible de l'action
          reste contenu dans ce nom, ce que le §8 demande.

          La ligne du dessous s'allonge au lieu de se remplacer : le design y
          met le retour **à la place** du millésime, et c'est précisément le pas
          de côté qui rend le millésime utile — sans lui, douze mois en arrière
          affichent « juillet » sans qu'on sache lequel. L'année reste donc, et
          le retour la suit, en encre pleine plutôt qu'en gris : c'est ce qui
          distingue une destination d'une mention. Mesuré à 320 points, la ligne
          entière — « 2025 · revenir à août » — tient dans les 232px que les deux
          chevrons laissent. */}
      {returnable ? (
        <button
          type="button"
          data-swipe="true"
          aria-label={tpl(t.shell.thisMonthTitle, formatYearMonth(returnTo))}
          onClick={() => {
            /* Le balayage vient de changer de mois : ce clic-ci est sa suite
               mécanique, pas une intention. */
            if (swiped.current) return
            onChange(returnTo)
          }}
          className={cn(
            'flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-inner px-3',
            'transition-colors duration-[var(--dur)] ease-ds hover:bg-surface-2 active:bg-surface-2',
          )}
        >
          <span aria-live="polite" className="t-section">
            {monthName(m)}
          </span>
          <span className="t-axis">
            <span className="tnum">{y}</span>
            <span className="text-text">
              {` · ${tpl(t.shell.returnToShort, monthName(parseYm(returnTo).m))}`}
            </span>
          </span>
        </button>
      ) : (
        <div className="flex flex-col items-center" aria-live="polite">
          <span className="t-section">{monthName(m)}</span>
          <span className="t-axis tnum">{y}</span>
        </div>
      )}

      <IconButton
        label={t.a11y.nextMonth}
        title={t.a11y.nextMonthKey}
        disabled={!canGoForward}
        onClick={() => {
          onChange(next)
        }}
      >
        <ChevronRight />
      </IconButton>
    </div>
  )
}
