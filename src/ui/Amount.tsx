import { Fragment, useEffect, useState } from 'react'
import { useI18n } from '../i18n/i18n'
import { odometerSlots } from './odometer'

/** Un chiffre qui défile : le nouveau entre par le bas (ou le haut), l'ancien sort de l'autre côté. */
function Roll(props: { char: string; from: string | null; up: boolean }) {
  const [done, setDone] = useState(false)
  return (
    <span className="odo__slot" data-dir={props.up ? 'up' : 'down'}>
      <span className="odo__in" onAnimationEnd={() => setDone(true)}>
        {props.char}
      </span>
      {props.from !== null && !done && (
        <span className="odo__out" aria-hidden="true">
          {props.from}
        </span>
      )}
    </span>
  )
}

// Dernière valeur affichée par identifiant, d'un écran à l'autre : un total qui a changé
// pendant qu'on était ailleurs défile à l'arrivée, et on voit l'effet de ce qu'on vient de faire.
const remembered = new Map<string, { value: number; text: string }>()

/**
 * Nombre en Martian Mono. Quand il change, seuls les chiffres qui changent défilent
 * (chasse fixe, donc les autres ne bougent pas) ; le sens suit celui de la variation.
 * Rien ne bouge au premier affichage. Le texte reste celui du nombre pour les lecteurs d'écran.
 * `id` : retient la dernière valeur vue pour défiler aussi d'un écran à l'autre.
 */
export function Odometer(props: {
  value: number
  text: string
  className?: string
  as?: 'span' | 'div'
  id?: string
  /** Nom de View Transition : le nombre glisse vers son homologue de l'écran suivant. */
  transitionName?: string
}) {
  const { value, text, id } = props
  const [seen, setSeen] = useState(() => {
    const before = id === undefined ? undefined : remembered.get(id)
    return before && before.value !== value
      ? { value, text, prev: before.text, up: value > before.value, seq: 1 }
      : { value, text, prev: null as string | null, up: true, seq: 0 }
  })
  // Comparé au rendu, sans effet : le montant précédent est gardé dans l'état
  if (seen.value !== value) {
    setSeen({ value, text, prev: seen.text, up: value > seen.value, seq: seen.seq + 1 })
  } else if (seen.text !== text) {
    // Même nombre écrit autrement (changement de langue) : rien à faire défiler
    setSeen({ ...seen, text, prev: null })
  }

  useEffect(() => {
    if (id !== undefined) remembered.set(id, { value, text })
  }, [id, value, text])

  const Tag = props.as ?? 'span'
  const slots = odometerSlots(text, seen.prev)

  return (
    <Tag
      className={`num odo${props.className ? ` ${props.className}` : ''}`}
      style={props.transitionName ? { viewTransitionName: props.transitionName } : undefined}
    >
      {slots.map((slot, i) => {
        // Clé comptée depuis la droite : elle ne bouge pas quand un chiffre de tête apparaît
        const key = text.length - i
        return slot.kind === 'roll' ? (
          <Roll key={`${key}:${seen.seq}`} char={slot.char} from={slot.from} up={seen.up} />
        ) : (
          <Fragment key={key}>{slot.char}</Fragment>
        )
      })}
    </Tag>
  )
}

/** Montant en euros (centimes entiers) qui défile à chaque changement. */
export function Amount(props: {
  cents: number
  className?: string
  as?: 'span' | 'div'
  id?: string
  transitionName?: string
}) {
  const { euros } = useI18n()
  return (
    <Odometer
      value={props.cents}
      text={euros(props.cents)}
      className={props.className}
      as={props.as}
      id={props.id}
      transitionName={props.transitionName}
    />
  )
}

/** Part d'un membre en pourcentage (0,54 → « 54,0 % »), qui défile à chaque changement. */
export function ShareValue(props: { share: number; className?: string }) {
  const { share } = useI18n()
  return <Odometer value={props.share} text={share(props.share)} className={props.className} />
}
