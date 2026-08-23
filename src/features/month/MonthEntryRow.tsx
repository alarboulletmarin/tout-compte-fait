import { useState } from 'react'
import { type Money, ZERO, add, money, parseAmount, sub, toAmountInput } from '@/domain/money'
import type { Entry } from '@/domain/types'
import { t } from '@/i18n/strings'
import { formatMoney, tpl } from '@/i18n/format'
import { confirmEntry, unconfirmEntry } from '@/store/actions'
import { Amount } from '@/ui/Amount'
import { Button, IconButton } from '@/ui/Button'
import { AmountInput } from '@/ui/Field'
import { Check, ChevronDown, ToConfirmIcon } from '@/ui/Icons'
import { ListRow } from '@/ui/ListRow'
import { SwipeableListRow } from '@/ui/SwipeableListRow'
import { useCurrency } from '@/ui/currency'

/**
 * Le pas du stepper : cinq euros.
 *
 * C'est celui du design, et il ne prétend pas atteindre un montant : de zéro à
 * 104,20 € il faudrait vingt-et-un appuis, et une échéance à montant variable
 * naît justement à zéro. Le pas **corrige** un montant qu'on a déjà — deux
 * euros de plus sur les courses —, le champ en **pose** un. Les deux cohabitent
 * donc dans le panneau, et c'est le champ qui porte le clavier.
 */
const STEP = money(500)

/**
 * Une ligne du mois, et les gestes qu'elle offre selon son état.
 *
 * **Prévue** : le glissé à droite confirme, le glissé à gauche déplie le
 * panneau d'ajustement — et deux boutons font exactement la même chose, pour le
 * clavier et le lecteur d'écran (DS §8). **Confirmée** : elle ne se glisse plus,
 * il n'y a plus rien à confirmer, et le geste inverse est un bouton sur la
 * rangée.
 *
 * **Aucun toast à la confirmation, et c'est une règle d'écran, pas un oubli.**
 * La revue l'a tranché la première : six confirmations d'affilée poseraient six
 * messages empilés en bas de l'écran, c'est-à-dire exactement là où sont les
 * boutons qu'on vise ensuite. Le retour d'information est la ligne elle-même,
 * qui change d'état sous le doigt, et son geste inverse est sur la même rangée,
 * à un appui. Un message dirait moins bien ce qui est déjà visible.
 *
 * **Pas de glyphe d'état sur la ligne** (DS §9.1) : `ListRow` porte déjà la
 * distinction prévu / confirmé — encre secondaire, pastille en pointillés. Le
 * prototype pose une pastille à coche **à la place** de la pastille de
 * catégorie ; ce serait échanger ce qui identifie la ligne contre ce que sa
 * forme dit déjà.
 */
export function MonthEntryRow({
  entry,
  color,
  meta,
  onOpen,
}: {
  entry: Entry
  color: string
  /** Ce que la ligne dit sous son libellé : sa date, son membre, sa note. */
  meta?: string
  onOpen: () => void
}) {
  const currency = useCurrency()
  const [editing, setEditing] = useState(false)
  /* Le brouillon part du montant prévu, et d'une chaîne vide quand il vaut zéro
     — une échéance variable naît à zéro, et « 0,00 » serait un montant à
     effacer avant d'en poser un. C'est déjà la règle du champ de la revue. */
  const [text, setText] = useState('')

  const planned = entry.status === 'planned'
  const parsed: Money | null = parseAmount(text)
  const ready = parsed !== null && parsed > 0

  const row = (
    <ListRow
      color={color}
      label={entry.label}
      {...(meta === undefined ? {} : { meta })}
      planned={planned}
      trailing={<Amount value={entry.amount} direction={entry.direction} />}
      onClick={onOpen}
    />
  )

  if (!planned) {
    /* Le retour en prévu n'est offert qu'aux échéances nées d'une règle : une
       saisie ponctuelle est un fait, pas une prévision en attente, et le
       domaine refuse de la renvoyer dans « à confirmer » (`updates.ts`). Un
       bouton qui ne ferait rien vaut moins que son absence — c'est aussi la
       liste que « Remettre le mois à confirmer » ramène, au mot près. */
    const reversible = entry.recurrenceId !== undefined

    return (
      <SwipeableListRow
        disabled
        /* La même réserve que les rangées à confirmer : c'est ce qui fait que
           les montants d'un même jour tombent sur une seule verticale, qu'une
           ligne porte deux boutons, un seul, ou aucun. */
        reserve={2}
        {...(reversible
          ? {
              trailing: (
                /* 44px, et non les 36 que le design accorde aux boutons
                   d'annulation de ligne : rien n'oblige ici à descendre sous la
                   cible du DS §8 — une rangée confirmée ne porte qu'un bouton,
                   et la place y est. */
                <IconButton
                  label={tpl(t.month.unconfirmEntry, entry.label)}
                  className="shrink-0"
                  onClick={() => {
                    unconfirmEntry(entry.id)
                  }}
                >
                  <ToConfirmIcon size={18} />
                </IconButton>
              ),
            }
          : {})}
      >
        {row}
      </SwipeableListRow>
    )
  }

  const openPanel = (): void => {
    setText(entry.amount === ZERO ? '' : toAmountInput(entry.amount))
    setEditing(true)
  }

  /* Le pas s'applique à ce qui est affiché, et non au montant prévu : deux
     appuis sur « plus » font dix euros de plus, pas cinq deux fois. Et il ne
     descend pas sous zéro — un montant négatif n'est pas une correction, c'est
     un sens inversé, et le sens se change sur la fiche. */
  const step = (up: boolean): void => {
    const from = parsed ?? entry.amount
    const next = up ? add(from, STEP) : sub(from, STEP)
    setText(toAmountInput(next < 0 ? ZERO : next))
  }

  const confirm = (amount?: Money): void => {
    setEditing(false)
    if (amount === undefined) confirmEntry(entry.id)
    else confirmEntry(entry.id, amount)
  }

  return (
    <SwipeableListRow
      reserve={2}
      right={{
        label: t.month.confirmOne,
        buttonLabel: tpl(t.month.confirmEntry, entry.label),
        icon: Check,
        onAction: () => {
          confirm()
        },
      }}
      left={{
        label: t.month.adjust,
        buttonLabel: tpl(t.month.adjustEntry, entry.label),
        /* Un chevron et non un crayon : ce bouton ne mène pas à la fiche, il
           déplie un panneau sous la rangée — et c'est le glyphe que l'app pose
           déjà partout où quelque chose s'ouvre en dessous. Il porte
           `aria-expanded`, sans quoi rien ne dirait que le panneau est là. */
        icon: ChevronDown,
        expanded: editing,
        onAction: () => {
          if (editing) setEditing(false)
          else openPanel()
        },
      }}
      panel={
        editing ? (
          /* `--surface-2` sous la rangée : le panneau appartient à la ligne, il
             n'est pas une seconde ligne. C'est le fond que le design lui donne,
             et c'est aussi celui du fond révélé à gauche — le glissé et le
             panneau sont le même geste, l'un ouvrant l'autre. */
          <div className="flex flex-col gap-3 border-t border-border bg-surface-2 px-4 py-4">
            <div className="flex max-w-sm items-center gap-2">
              {/* Le signe, en texte et non en glyphe : c'est ce que le design
                  pose, et le moins est le vrai — U+2212, comme partout où l'app
                  écrit un montant négatif. Un glyphe de plus dans le morceau
                  d'entrée coûterait ses cent cinquante octets pour dessiner un
                  caractère que la police a déjà. */}
              <IconButton
                label={t.month.adjustLess}
                variant="secondary"
                onClick={() => {
                  step(false)
                }}
              >
                <span aria-hidden="true" className="t-section">
                  −
                </span>
              </IconButton>
              <AmountInput
                value={text}
                aria-label={`${t.entry.amount} — ${entry.label}`}
                placeholder="0,00"
                className="min-w-0 flex-1"
                onChange={(event) => {
                  setText(event.target.value)
                }}
              />
              <IconButton
                label={t.month.adjustMore}
                variant="secondary"
                onClick={() => {
                  step(true)
                }}
              >
                <span aria-hidden="true" className="t-section">
                  +
                </span>
              </IconButton>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={!ready}
                onClick={() => {
                  if (parsed !== null) confirm(parsed)
                }}
              >
                {t.month.confirmAmount}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false)
                }}
              >
                {t.common.cancel}
              </Button>
            </div>
            {/* Ce que l'écart devient, dit là où on le crée : un montant réel
                plus élevé que le prévu ne disparaît pas, il se retire du reste
                à vivre — c'est la seule conséquence que la ligne ait sur le
                reste de l'écran. */}
            <span className="t-axis">
              {tpl(t.month.adjustHint, formatMoney(entry.amount, currency))}
            </span>
          </div>
        ) : undefined
      }
    >
      {row}
    </SwipeableListRow>
  )
}
