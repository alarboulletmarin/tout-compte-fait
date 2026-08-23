import { useState } from 'react'
import { diffDays, today } from '@/domain/date'
import { type Money, ZERO, add, money, parseAmount, sub, toAmountInput } from '@/domain/money'
import { isCostly } from '@/domain/priceHistory'
import { t } from '@/i18n/strings'
import { de, formatDayMonthShort, formatMoney, formatRelativeDays, tpl } from '@/i18n/format'
import { cn } from '@/lib/cn'
import { setRecurrenceAmount, undoable } from '@/store/actions'
import { type RecurrenceRow as Row, useKindOf } from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Button, IconButton } from '@/ui/Button'
import { Dot } from '@/ui/Dot'
import { AmountInput } from '@/ui/Field'
import { ChevronDown, TrashIcon, Warning } from '@/ui/Icons'
import { SwipeableListRow } from '@/ui/SwipeableListRow'
import { useCurrency } from '@/ui/currency'

/**
 * Le pas du stepper : cinq euros, le même que sur la liste du mois.
 *
 * Un geste appris sur un écran vaut sur l'autre, et ce pas-là ne prétend pas
 * atteindre un montant : il **corrige** un prix qui a bougé de deux euros, là
 * où le champ en **pose** un. Les deux cohabitent dans le panneau.
 */
const STEP = money(500)

/**
 * La seconde ligne : quand ça tombe, et — quand la liste ne le dit pas déjà par
 * son axe — à qui c'est.
 *
 * Les deux se joignent plutôt que de se chasser, comme sur la liste du mois :
 * « 12 janv. · dans 3 jours · Alix » répond aux trois questions sur une ligne
 * qui n'en a qu'une à donner. Un prénom y tient ; c'est la raison pour laquelle
 * l'appelant n'y met que ça (voir `whoOf`).
 */
function meta(row: Row, who: string | undefined): string {
  if (row.stopped) return t.recurrences.stoppedBadge
  /* Un support plein retient les échéances de la règle sans l'arrêter : la
     ligne le dit, sans quoi elle disparaîtrait du mois sans cause visible. La
     place peut revenir d'une reprise, d'où « en attente » et non « arrêtée ». */
  if (row.capped) return t.recurrences.cappedBadge
  const when =
    row.next === null
      ? t.recurrences.noNextDue
      : `${formatDayMonthShort(row.next)} · ${formatRelativeDays(diffDays(today(), row.next))}`
  return who === undefined ? when : `${when} · ${who}`
}

/**
 * Le coût annuel n'est une lecture que là où il en est une.
 *
 * Sur une mensuelle, il vaut douze fois le chiffre juste au-dessus : il
 * n'apprend rien et fait le quatrième nombre d'une ligne qui en portait déjà
 * trop. Sur une hebdomadaire, une trimestrielle ou une annuelle, le mensuel est
 * un amortissement — un chiffre qu'on n'a jamais payé tel quel — et l'annuel est
 * alors la somme réelle. Il reste sur la fiche dans tous les cas.
 */
function showsAnnual(row: Row): boolean {
  const { unit, every } = row.recurrence.period
  return !(unit === 'month' && every === 1)
}

/**
 * Le panneau qui change le montant, déplié sous la rangée.
 *
 * **Il a exactement la forme de celui de la liste du mois** — stepper à deux
 * boutons de 44px, champ au milieu, deux verbes dessous, une ligne d'axe qui
 * dit la conséquence. C'est la règle 4 du handoff : un glissé se comporte
 * pareil dans la liste du mois et dans les récurrences. Ce qui change est la
 * conséquence, et elle seule : là-bas on chiffre **une** échéance, ici on
 * change **la règle**.
 *
 * **La note de la maquette était fausse et elle est corrigée.** Elle annonçait
 * « à partir de septembre ». `syncRecurrenceEntries` ne touche jamais une
 * confirmée et refait les prévues datées **après aujourd'hui** : la coupure est
 * le jour même, pas le mois prochain. Un foyer qui corrige son loyer le 3 août
 * verrait donc l'échéance du 5 août changer, contre ce que la phrase promet.
 */
function AmountPanel({
  recurrence,
  onClose,
}: {
  recurrence: Row['recurrence']
  onClose: () => void
}) {
  /* Le brouillon part du montant en cours : ici, contrairement à une échéance
     à confirmer, il y en a toujours un — une règle à montant variable n'ouvre
     pas ce panneau du tout. */
  const [text, setText] = useState(() =>
    recurrence.amount === null ? '' : toAmountInput(recurrence.amount),
  )

  const parsed: Money | null = parseAmount(text)
  const ready = parsed !== null && parsed > 0

  /* Le pas s'applique à ce qui est affiché, et non au montant enregistré : deux
     appuis sur « plus » font dix euros de plus, pas cinq deux fois. Et il ne
     descend pas sous zéro — un montant négatif n'est pas une correction, c'est
     un sens inversé, et le sens se change sur la fiche. */
  const step = (up: boolean): void => {
    const from = parsed ?? recurrence.amount ?? ZERO
    const next = up ? add(from, STEP) : sub(from, STEP)
    setText(toAmountInput(next < 0 ? ZERO : next))
  }

  const save = (): void => {
    if (parsed === null) return
    onClose()
    /* Annulable, comme le demande le design : le retour arrière repose le
       document d'avant, échéances replanifiées comprises. Le verbe du message
       est « Rétablir » — « Annuler » est déjà le bouton qui ferme une boîte. */
    undoable(t.recurrences.updated, () => {
      setRecurrenceAmount(recurrence.id, parsed)
    })
  }

  return (
    /* `--surface-2` sous la rangée : le panneau appartient à la ligne, il n'est
       pas une seconde ligne. C'est aussi le fond révélé par le glissé qui
       l'ouvre — le geste et le panneau sont la même chose, l'un menant à
       l'autre. */
    <div className="flex flex-col gap-3 border-t border-border bg-surface-2 px-4 py-4">
      <div className="flex max-w-sm items-center gap-2">
        {/* Le signe en texte et non en glyphe : le moins est le vrai — U+2212,
            comme partout où l'app écrit un montant négatif. C'est déjà le choix
            du panneau de la liste du mois. */}
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
          aria-label={`${t.entry.amount} — ${recurrence.label}`}
          placeholder="0,00"
          className="min-w-0 flex-1 px-2"
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
        <Button size="sm" disabled={!ready} onClick={save}>
          {t.common.save}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          {t.common.cancel}
        </Button>
      </div>
      {/* Ce que l'enregistrement change, et **jusqu'où** : la maquette écrivait
          « à partir de septembre », le code dit aujourd'hui. Le champ porte
          déjà le montant en cours, il n'a pas à être répété ici. */}
      <span className="t-axis">{t.recurrences.amountAhead}</span>
    </div>
  )
}

/**
 * Une ligne de récurrence : prochaine échéance à gauche, coût mensuel amorti à
 * droite. Un changement de prix se signale ici.
 *
 * **Elle se glisse, et les deux gestes sont doublés d'un bouton** (DS §8) :
 * seuils, bornes, durées et `data-no-swipe` viennent de `SwipeableListRow`, qui
 * les tient déjà pour la liste du mois — rien n'est redécidé ici.
 *
 * — **à droite**, le panneau qui change le montant ;
 * — **à gauche**, `destructive`, qui **ouvre la question** au lieu de
 *   supprimer. Le principe 2 du handoff voudrait que l'annulation remplace la
 *   confirmation ; `ARCHITECTURE.md` écrit l'inverse en toutes lettres — « les
 *   retirer se déciderait dans le cahier, pas dans le code » — et un retour
 *   arrière de huit secondes ne dit pas la même chose qu'une question posée
 *   avant : il rattrape le oui donné trop vite, il ne le remplace pas.
 *
 * **La boîte n'est pas montée ici** : le DS §6 refuse une boîte par ligne de
 * liste, qui en poserait autant dans le DOM. La page n'en tient qu'une, et la
 * rangée lui dit seulement sur qui elle porte.
 *
 * Deux règles n'offrent pas le premier geste. Une règle **à montant variable**
 * n'a pas de montant à corriger — le chiffre se saisit à chaque échéance — et
 * une règle **arrêtée** n'a plus d'échéance à venir à réaligner : dans les deux
 * cas un panneau qui ne changerait rien vaut moins que son absence.
 */
export function RecurrenceRow({
  row,
  color,
  who,
  onOpen,
  onRemove,
}: {
  row: Row
  color: string
  /** À qui elle est, quand la liste ne le dit pas déjà par son axe. */
  who?: string
  onOpen: () => void
  /** Demande à la page d'ouvrir sa boîte de suppression sur cette règle. */
  onRemove: () => void
}) {
  const currency = useCurrency()
  const kindOf = useKindOf()
  const [editing, setEditing] = useState(false)
  const { recurrence, monthly, annual, priceChange, stopped } = row
  const kind = kindOf(recurrence.categoryId)
  const costly = priceChange !== null && isCostly(priceChange, recurrence.direction, kind)
  const editable = recurrence.amount !== null && !stopped

  const line = (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        /* Quatre chiffres par ligne — le mensuel, l'annuel, la date, le délai —
           et deux lignes de texte qui se touchaient : la liste se lisait comme
           un bloc. L'annuel n'y est plus quand il ne dit rien (voir
           `showsAnnual`) ; le reste sert, et c'est l'espace qui lui manquait.
           Le cadre passe donc de 10 à 12px, et les deux niveaux de chaque
           colonne se décollent l'un de l'autre. */
        'flex w-full items-center gap-3 rounded-inner px-3 py-3 text-left',
        'transition-colors duration-[var(--dur)] ease-ds hover:bg-surface-2 active:bg-surface-2',
      )}
    >
      <Dot color={color} outlined={stopped} />

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn('t-body truncate', stopped && 'text-muted')}>{recurrence.label}</span>
        <span className="t-axis truncate">{meta(row, who)}</span>
        {priceChange !== null && (
          /* L'alerte ne se déclenche que quand le changement coûte : une charge
             qui monte, un revenu qui baisse — jamais l'épargne, qui reste au
             foyer. Un salaire augmenté en rouge avec un panneau d'avertissement
             dirait le contraire de ce qui arrive — et le DS §2.3 réserve le
             rouge aux dépassements et aux erreurs. */
          <span
            className={cn('t-label mt-0.5 flex items-center gap-1', costly && 'text-danger-text')}
          >
            {costly && <Warning size={14} className="shrink-0" />}
            <span className="tnum truncate">
              {tpl(
                // Un virement d'épargne n'a pas de prix : son montant change.
                kind === 'saving' ? t.recurrences.amountChanged : t.recurrences.priceChanged,
                formatMoney(priceChange.previous, currency),
                formatMoney(priceChange.current, currency),
              )}
            </span>
          </span>
        )}
      </span>

      <span className="flex shrink-0 flex-col items-end gap-0.5">
        {monthly === null ? (
          <span className="t-label">{t.recurrences.variable}</span>
        ) : (
          <>
            <Amount value={monthly} direction={recurrence.direction} />
            {annual !== null && showsAnnual(row) && (
              /* `row-aside` : la lecture cède la place aux deux boutons de
                 geste sur une tuile étroite — voir `components.css`, où le
                 calcul est écrit. */
              <span className="row-aside t-axis tnum">
                {tpl(t.recurrences.perYear, formatMoney(annual, currency, false))}
              </span>
            )}
          </>
        )}
      </span>
    </button>
  )

  return (
    <SwipeableListRow
      /* Voir `MonthEntryRow` : une règle modifiable porte deux boutons, une
         règle arrêtée un seul, et sans réserve leurs montants tombaient à 48px
         l'un de l'autre dans la même liste. */
      reserve={2}
      {...(editable
        ? {
            right: {
              label: t.recurrences.changeAmount,
              buttonLabel: tpl(t.recurrences.changeAmountOf, de(recurrence.label)),
              /* Un chevron et non un crayon : le bouton ne mène pas à la fiche,
                 il déplie un panneau sous la rangée — et c'est le glyphe que
                 l'app pose partout où quelque chose s'ouvre en dessous. */
              icon: ChevronDown,
              expanded: editing,
              onAction: () => {
                setEditing((open) => !open)
              },
            },
          }
        : {})}
      left={{
        label: t.common.delete,
        buttonLabel: tpl(t.recurrences.removeOf, de(recurrence.label)),
        icon: TrashIcon,
        onAction: onRemove,
      }}
      destructive
      panel={
        editing ? (
          <AmountPanel
            recurrence={recurrence}
            onClose={() => {
              setEditing(false)
            }}
          />
        ) : undefined
      }
    >
      {line}
    </SwipeableListRow>
  )
}
