import { type PointerEvent as ReactPointerEvent, useRef } from 'react'
import { type YearMonth, addMonthsToYm, parseYm } from '@/domain/date'
import { monthName } from '@/i18n/format'
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
export function MonthNav({ value, onChange, min, max, className }: MonthNavProps) {
  const { y, m } = parseYm(value)
  const previous = addMonthsToYm(value, -1)
  const next = addMonthsToYm(value, 1)
  const canGoBack = min === undefined || previous >= min
  const canGoForward = max === undefined || next <= max

  const start = useRef<{ x: number; y: number; id: number } | null>(null)

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    // Le geste ne part jamais d'un chevron : sinon viser le bouton produirait
    // un micro-glissement au lieu d'un clic.
    if ((event.target as HTMLElement).closest('button, a, input, select')) return
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

      <div className="flex flex-col items-center" aria-live="polite">
        <span className="t-section">{monthName(m)}</span>
        <span className="t-axis tnum">{y}</span>
      </div>

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
