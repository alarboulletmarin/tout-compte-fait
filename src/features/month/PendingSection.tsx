import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { entryPath } from '@/app/routes'
import { type Money, parseAmount, toAmountInput } from '@/domain/money'
import type { Entry } from '@/domain/types'
import { t } from '@/i18n/strings'
import { formatDateCompact, tpl } from '@/i18n/format'
import { cn } from '@/lib/cn'
import { reveal } from '@/lib/reveal'
import { confirmEntries, confirmEntry, unconfirmEntries, undoable } from '@/store/actions'
import {
  useCategoryMap,
  useCurrentYm,
  useMonthPending,
  useMonthUnconfirmable,
} from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Button } from '@/ui/Button'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { Dot } from '@/ui/Dot'
import { Eyebrow } from '@/ui/Eyebrow'
import { AmountInput } from '@/ui/Field'
import { Check, ToConfirmIcon } from '@/ui/Icons'
import { Tile } from '@/ui/Tile'
import { toast } from '@/ui/toast'

/**
 * La partie ouvrante d'une ligne : tout sauf le contrôle de confirmation.
 *
 * C'est un bouton à part, et non la ligne entière, parce qu'un bouton de
 * confirmation ne peut pas vivre à l'intérieur d'un autre bouton. Elle mène à
 * l'écran de saisie, qui sait déjà corriger un montant, changer une date,
 * réattribuer un membre ou supprimer l'échéance : la confirmation n'a jamais
 * été le seul geste possible sur une échéance prévue, elle était juste le seul
 * qu'on pouvait atteindre.
 */
function OpenPart({
  entry,
  color,
  meta,
  onOpen,
  className,
}: {
  entry: Entry
  color: string
  meta: string
  onOpen: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={tpl(t.month.openEntry, entry.label)}
      className={cn(
        'flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-inner px-1 text-left',
        'transition-colors duration-[var(--dur)] ease-ds hover:bg-surface-2',
        className,
      )}
    >
      <Dot color={color} outlined />
      <span className="flex min-w-0 flex-col">
        <span className="t-body truncate">{entry.label}</span>
        <span className="t-axis truncate">{meta}</span>
      </span>
    </button>
  )
}

/**
 * La colonne de montant, de largeur fixe : c'est elle qui aligne un montant en
 * clair et un champ de saisie d'une ligne à l'autre, au lieu de les laisser
 * flotter chacun au bout du sien.
 */
function AmountCell({ children }: { children: ReactNode }) {
  return <span className="flex w-24 shrink-0 justify-end">{children}</span>
}

/* L'étiquette passe par `aria-label` et non par un `sr-only` adjacent : le
   `gap-2` du bouton espacerait ce dernier comme un vrai contenu, et lui ferait
   coûter neuf pixels de large qui manquent au libellé.
 *
 * Elle **nomme l'échéance**. Douze boutons « Confirmer » se listent douze fois
 * à l'identique dans les contrôles d'un lecteur d'écran, et rien n'y dit lequel
 * on vise : c'est le même défaut que sept parts d'anneau qui s'annonceraient
 * toutes « Voir les lignes », et la légende de « Où part l'argent » le corrige
 * déjà de la même façon. À l'œil, la coche seule suffit — la ligne d'à côté
 * porte le libellé. */
function ConfirmButton({
  label,
  onConfirm,
  disabled,
}: {
  label: string
  onConfirm: () => void
  disabled?: boolean
}) {
  return (
    <Button
      size="sm"
      aria-label={tpl(t.month.confirmEntry, label)}
      className="shrink-0"
      {...(disabled === undefined ? {} : { disabled })}
      onClick={onConfirm}
    >
      <Check size={16} />
    </Button>
  )
}

/** Une échéance à montant fixe : elle se confirme telle quelle. */
function FixedRow({ entry, color, onOpen }: { entry: Entry; color: string; onOpen: () => void }) {
  return (
    <li className="flex items-center gap-2">
      <OpenPart entry={entry} color={color} meta={formatDateCompact(entry.date)} onOpen={onOpen} />
      <AmountCell>
        <Amount value={entry.amount} direction={entry.direction} />
      </AmountCell>
      <ConfirmButton
        label={entry.label}
        onConfirm={() => {
          confirmEntry(entry.id)
          toast(t.month.confirmedOne)
        }}
      />
    </li>
  )
}

/**
 * Une échéance à montant variable. Le champ porte le montant de la dernière
 * échéance confirmée, et sa ligne le dit à sa place — l'explication vaut mieux
 * à côté du champ qu'en tête d'un encadré qu'on aura oublié en y arrivant.
 */
function VariableRow({
  entry,
  color,
  onOpen,
}: {
  entry: Entry
  color: string
  onOpen: () => void
}) {
  const [text, setText] = useState(() => (entry.amount === 0 ? '' : toAmountInput(entry.amount)))
  const parsed: Money | null = parseAmount(text)
  const ready = parsed !== null && parsed > 0

  return (
    <li className="flex items-center gap-2">
      <OpenPart
        entry={entry}
        color={color}
        meta={`${formatDateCompact(entry.date)} · ${t.month.toFill}`}
        onOpen={onOpen}
      />
      {/* La largeur du champ est portée par la colonne, pas par le champ :
          `AmountInput` a déjà `w-full`, et lui poser une seconde largeur laisse
          l'ordre de la feuille générée trancher — c'est ce qui lui faisait
          réclamer toute la ligne, et renvoyer le reste au niveau suivant. */}
      <AmountCell>
        <AmountInput
          value={text}
          aria-label={`${t.entry.amount} — ${entry.label}`}
          placeholder="0,00"
          className="px-2"
          onChange={(e) => {
            setText(e.target.value)
          }}
        />
      </AmountCell>
      <ConfirmButton
        label={entry.label}
        disabled={!ready}
        onConfirm={() => {
          if (parsed === null) return
          confirmEntry(entry.id, parsed)
          toast(t.month.confirmedOne)
        }}
      />
    </li>
  )
}

/**
 * Combien de lignes s'affichent avant qu'on demande le reste, et à partir de
 * quel reliquat la coupe vaut la peine.
 *
 * Cinq, comme les prochaines échéances : c'est ce qu'on lit sans défiler, et
 * ce que la section doit rendre pour laisser la place au détail du mois. Un
 * mois ordinaire en compte une douzaine, et douze lignes de 56px repoussaient
 * « Ce mois » d'un écran entier.
 *
 * Le seuil est à deux et non à un : cacher une seule ligne derrière un bouton
 * n'économise pas sa hauteur, il l'échange contre celle du bouton, et demande
 * un geste pour rien.
 */
const PREVIEW = 5
const WORTH_HIDING = 2

/**
 * Les échéances prévues du mois, en une seule liste par date.
 *
 * Une seule, et non deux : les montants à saisir étaient rangés dans un
 * encadré séparé, ce qui les faisait passer pour autre chose que ce qu'ils
 * sont — des échéances à confirmer, comme les autres, à ceci près qu'il faut
 * d'abord dire combien.
 *
 * **La liste se coupe et se lève.** Elle s'affichait en entier, ce qui est la
 * bonne chose à faire pour trois lignes et la mauvaise pour treize : la section
 * est une tâche, pas un inventaire, et on la traite par le haut — les plus
 * proches d'abord, la liste étant triée par date. Ce qui reste est **compté et
 * annoncé**, jamais tu, et se montre d'un bouton : c'est la coupe de la
 * recherche de l'historique, avec ses mots. La section garde sa place dans la
 * page plutôt que de partir sur un écran à elle — une tâche qu'il faut aller
 * chercher est une tâche qu'on oublie, et le routage n'y gagnerait rien.
 *
 * **Elle est le deuxième étage de l'écran**, entre la situation du mois et les
 * lectures analytiques. Elle en était le sixième, après neuf tuiles et deux
 * sections : la seule chose qui demande un geste arrivait deux écrans plus bas
 * que les chiffres qui n'en demandent aucun.
 *
 * `focus` compte les demandes venues de la tuile de suivi, exactement comme
 * `EntriesSection` compte celles des deux tuiles de flux — un compteur et non
 * un drapeau, sinon redemander la section après avoir fait défiler la page ne
 * changerait aucun état, donc ne défilerait pas.
 */
export function PendingSection({ focus = 0 }: { focus?: number }) {
  const { fixed, variable } = useMonthPending()
  const categories = useCategoryMap()
  const navigate = useNavigate()
  const unconfirmable = useMonthUnconfirmable()
  const [undoing, setUndoing] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  // Une demande venue de la tuile de suivi : la section vient sous les yeux.
  useEffect(() => {
    if (focus === 0) return
    reveal(root.current)
  }, [focus])

  /* Se referme au changement de mois, et à celui-là seulement : la liste
     dépliée d'août n'a pas été demandée pour septembre. Pas sur `all`, qui
     change à chaque confirmation — replier sous le doigt de qui vient de
     cocher une ligne serait pire que de ne rien replier du tout. Ajusté au
     rendu, comme l'axe de `EntriesSection` : React relance aussitôt, rien ne
     s'affiche entre les deux. */
  const ym = useCurrentYm()
  const [shownYm, setShownYm] = useState(ym)
  if (shownYm !== ym) {
    setShownYm(ym)
    setShowAll(false)
  }

  const all = useMemo(
    () =>
      [...fixed, ...variable].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)),
    [fixed, variable],
  )
  const toFill = useMemo(() => new Set(variable.map((e) => e.id)), [variable])

  const hidden = all.length - PREVIEW
  const cut = !showAll && hidden >= WORTH_HIDING
  const shown = cut ? all.slice(0, PREVIEW) : all

  const undo = (
    <ConfirmDialog
      open={undoing}
      title={t.month.unconfirmAll}
      steps={[
        {
          question: tpl(t.month.unconfirmAllConfirm, unconfirmable.length),
          action: t.month.unconfirm,
        },
      ]}
      onCancel={() => {
        setUndoing(false)
      }}
      onConfirm={() => {
        setUndoing(false)
        undoable(t.month.unconfirmedAll, () => {
          unconfirmEntries(unconfirmable.map((e) => e.id))
        })
      }}
    />
  )

  /* Le mois bouclé n'efface pas la section : c'est ici qu'on a confirmé, c'est
     donc ici qu'on doit pouvoir revenir dessus. Elle se réduit à sa phrase et
     au geste inverse — sans quoi « Confirmer le mois » fait disparaître le seul
     endroit où l'on aurait cherché comment le défaire. */
  if (all.length === 0) {
    if (unconfirmable.length === 0) return null
    return (
      /* La cible du défilement est le cadre et non la tuile : `Tile` ne prend
         pas de `ref`, et lui en poser une pour un seul appelant élargirait son
         contrat. `reveal-target` dégage la section du bandeau collant — sans
         quoi on atterrissait après le titre et après « Confirmer le mois ». */
      <div ref={root} className="reveal-target">
        <Tile className="flex flex-col gap-3">
          <Eyebrow icon={ToConfirmIcon}>{t.month.toConfirm}</Eyebrow>
          <p className="t-label">{t.month.done}</p>
          <Button
            variant="ghost"
            className="self-start"
            onClick={() => {
              setUndoing(true)
            }}
          >
            {t.month.unconfirmAll}
          </Button>
          {undo}
        </Tile>
      </div>
    )
  }

  const colorOf = (categoryId: string): string =>
    categories.get(categoryId)?.color ?? 'var(--cat-rest)'

  const open = (entry: Entry): void => {
    void navigate(entryPath(entry.id))
  }

  const confirmAll = (): void => {
    confirmEntries(fixed.map((e) => e.id))
    toast(t.month.confirmedAll)
  }

  return (
    <div ref={root} className="reveal-target">
      <Tile className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Eyebrow icon={ToConfirmIcon}>
            {tpl(`${t.month.toConfirm} · %s`, all.length)}
          </Eyebrow>
          {fixed.length > 0 && <Button onClick={confirmAll}>{t.month.confirmAll}</Button>}
        </div>

        {/* Dit ce que « Confirmer le mois » laisse derrière lui, plutôt que de
            laisser découvrir que des lignes restent après l'avoir actionné. */}
        {fixed.length > 0 && variable.length > 0 && (
          <p className="t-label">{t.month.confirmAllHint}</p>
        )}

        <ul className="flex flex-col gap-1">
          {shown.map((entry) =>
            toFill.has(entry.id) ? (
              <VariableRow
                key={entry.id}
                entry={entry}
                color={colorOf(entry.categoryId)}
                onOpen={() => {
                  open(entry)
                }}
              />
            ) : (
              <FixedRow
                key={entry.id}
                entry={entry}
                color={colorOf(entry.categoryId)}
                onOpen={() => {
                  open(entry)
                }}
              />
            ),
          )}
        </ul>

        {/* Une coupe annoncée, et qui se lève : la même que celle des résultats
            de recherche de l'historique, avec ses deux morceaux — ce qui reste
            se compte, et un bouton le montre. Sans le compte, une liste tronquée
            se lit comme une liste complète et l'on croit avoir tout confirmé. */}
        {cut && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="t-label">{tpl(t.month.pendingMore, hidden)}</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowAll(true)
              }}
            >
              {t.month.pendingShowAll}
            </Button>
          </div>
        )}

        {/* Le retour en arrière reste atteignable tant qu'il reste quelque chose
            à ramener, y compris quand le mois n'est confirmé qu'à moitié. */}
        {unconfirmable.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => {
              setUndoing(true)
            }}
          >
            {t.month.unconfirmAll}
          </Button>
        )}
        {undo}
      </Tile>
    </div>
  )
}
