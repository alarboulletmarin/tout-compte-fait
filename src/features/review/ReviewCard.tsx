import { type CSSProperties, useState } from 'react'
import { parseISO } from '@/domain/date'
import { type Money, ZERO, isZero } from '@/domain/money'
import type { Entry } from '@/domain/types'
import { formatMoney, formatMonthDay, tpl } from '@/i18n/format'
import { t } from '@/i18n/strings'
import type { ReviewLine } from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Button } from '@/ui/Button'
import { useCurrency } from '@/ui/currency'
import { Dot } from '@/ui/Dot'
import { Keypad } from '@/ui/Keypad'
import { amountFromKeys } from '@/ui/keypad'
import { useHotkeys } from '@/ui/useHotkeys'

/** Les trois temps du passage d'une carte à la suivante. */
export type Phase = 'in' | 'out' | 'pre'

/* La carte sort par la gauche et la suivante entre par la droite : c'est le
   sens de lecture, et c'est ce qui fait qu'une file se lit comme une file et
   non comme une pile. La distance est celle du DS §4, qui borne les
   translations à 28px. */
const SHIFT = 28

/* Les durées viennent des tokens, et c'est le style qui les y lit — voir le
   `transitionDuration` ci-dessous. Le dépôt n'a pas de valeur à 170ms, celle
   que le handoff demande pour la sortie : `--dur` en vaut 160, dix de moins,
   et inventer un token pour dix millisecondes coûterait plus cher que de les
   perdre. */
const DURATION: Record<Phase, string> = {
  out: 'var(--dur)',
  pre: '0ms',
  in: 'var(--dur-view)',
}

const TRANSFORM: Record<Phase, string | undefined> = {
  out: `translateX(${String(-SHIFT)}px)`,
  pre: `translateX(${String(SHIFT)}px)`,
  in: undefined,
}

/** Le sens de la ligne, dit en toutes lettres plutôt que par une couleur. */
function kindLabel(entry: Entry): string {
  return entry.direction === 'in' ? t.review.kindIn : t.review.kindOut
}

/**
 * Une carte de la revue — une échéance, et les trois décisions qu'on peut
 * prendre dessus.
 *
 * **Elle ne décide de rien.** Les trois gestes remontent à la page, qui seule
 * sait ce que la file devient ensuite : la carte ne connaît ni l'index, ni le
 * document, ni ce que « suivante » veut dire. C'est ce qui permet à l'écran de
 * l'animer sans qu'elle sache qu'elle sort.
 *
 * **Le pavé s'ouvre tout seul sur une ligne à montant variable.** Une échéance
 * née d'une récurrence sans montant vaut `amountOn(...) ?? ZERO`, c'est-à-dire
 * le plus souvent zéro : « C'était bien ça » y confirmerait un montant faux, et
 * l'app annoncerait ensuite une baisse de prix de 100 %. La carte ne propose
 * donc pas le choix, elle demande le chiffre.
 */
export function ReviewCard({
  line,
  color,
  phase,
  onConfirm,
  onSkip,
}: {
  line: ReviewLine
  color: string
  phase: Phase
  onConfirm: (amount?: Money) => void
  onSkip: () => void
}) {
  const currency = useCurrency()
  const { entry } = line
  /* Le pavé s'ouvre à la main sur une ligne chiffrée, tout seul sur une ligne
     à saisir. L'état est indexé par l'échéance : sans cette clé, ouvrir le pavé
     sur une carte le laisserait ouvert sur la suivante, et la file se
     transformerait en formulaire au premier « autre montant ». */
  const [openedFor, setOpenedFor] = useState<string | null>(null)
  const [keys, setKeys] = useState('')
  const open = line.variable || openedFor === entry.id

  const typed = amountFromKeys(keys)
  /* Zéro ne se confirme pas — c'est le geste « pas ce mois-ci », et une
     échéance confirmée à zéro entrerait dans tous les totaux et dans
     l'historique de prix, où elle annoncerait une baisse de 100 %. */
  const usable = typed !== null && !isZero(typed)

  const openPad = (): void => {
    setOpenedFor(entry.id)
    setKeys('')
  }

  const closePad = (): void => {
    setOpenedFor(null)
    setKeys('')
  }

  const savePad = (): void => {
    if (!usable) return
    onConfirm(typed)
    /* Remis à zéro pour la carte suivante : l'état est indexé par l'échéance,
       mais la chaîne de chiffres, elle, n'appartient à personne. */
    setKeys('')
    setOpenedFor(null)
  }

  /* « Entrée » confirme, et la carte en est le seul propriétaire : dès que le
     pavé s'ouvre, c'est lui qui la prend pour valider le montant saisi. Deux
     écouteurs sur la même touche feraient deux gestes sur une frappe — une
     confirmation au montant prévu *et* une au montant tapé. */
  useHotkeys({
    Enter: open
      ? undefined
      : () => {
          onConfirm()
        },
  })

  const style: CSSProperties = {
    opacity: phase === 'in' ? 1 : 0,
    transform: TRANSFORM[phase],
    transitionDuration: DURATION[phase],
  }

  const day = formatMonthDay(parseISO(entry.date).d)
  const meta = open
    ? isZero(entry.amount)
      ? t.review.padMetaEmpty
      : tpl(t.review.padMeta, formatMoney(entry.amount, currency))
    : tpl(line.variable ? t.review.metaEstimate : t.review.metaPlanned, day)

  return (
    <section className="tile flex flex-col overflow-hidden p-0">
      <div
        /* Les deux propriétés animées et la courbe sont en classe, la durée en
            style : c'est elle seule qui change d'une phase à l'autre, et la
            faire passer par une classe ferait trois classes pour une valeur.
            Les deux tokens valent `0ms` sous `prefers-reduced-motion`, si bien
            que la neutralisation ne se décide pas ici (DS §4). */
        /* Le corps occupe le cadre et centre ce qu'il porte. Sans plancher, la
           carte se serrait en haut d'un écran aux deux tiers vides : la revue
           est le seul écran où la carte *est* la page, et une page qui flotte
           en haut de son cadre ne se lit pas comme une file. Le pavé ouvert
           dépasse ce plancher, et c'est très bien — il ne le fixe pas, il
           l'établit. */
        className="flex min-h-72 flex-col justify-center gap-4 p-5 transition-[transform,opacity] ease-ds md:p-6 lg:min-h-90"
        style={style}
      >
        <span className="eyebrow-pill t-eyebrow inline-flex w-fit items-center gap-1.5 rounded-chip py-1.5">
          <Dot color={color} />
          {kindLabel(entry)}
        </span>
        <h2 className="t-section">{entry.label}</h2>
        {/* Le montant saisi remplace le montant prévu, en direct : c'est la
            même place et la même taille, si bien qu'on voit ce qu'on écrit là
            où on lisait ce qui était attendu.

            **Et il part de zéro, pas du prévu.** Laisser le prévu tant que rien
            n'est tapé le dit deux fois — la méta juste en dessous l'annonce
            déjà, « prévu 98,00 € » —, et surtout il ment sur l'état : un
            montant en grand au-dessus d'un « Confirmer » éteint donne à lire un
            chiffre qu'on ne peut pas valider. Zéro dit la vérité, qui est qu'il
            n'y a pas encore de montant. C'est aussi ce que fait la maquette. */}
        <span className="fit-box block">
          <Amount value={open ? (typed ?? ZERO) : entry.amount} size="hero-fit" />
        </span>
        <span className="t-axis">{meta}</span>
        {open && (
          <Keypad
            value={keys}
            onChange={setKeys}
            label={t.review.padLabel}
            onSubmit={savePad}
            {...(line.variable ? {} : { onClose: closePad })}
          />
        )}
      </div>

      {/* Le pied ne bouge pas avec la carte : il porte les gestes, et un bouton
          qui s'efface sous le doigt au moment où l'on va l'atteindre est le
          seul mouvement que cet écran ne peut pas se permettre. */}
      <div className="flex flex-col gap-2 border-t border-border bg-surface p-4 md:p-6">
        {open ? (
          <>
            <Button full disabled={!usable} onClick={savePad}>
              {usable ? tpl(t.review.padConfirm, formatMoney(typed, currency)) : t.common.confirm}
            </Button>
            {/* Ce que la confirmation change **au-delà de ce mois**, et ce
                n'est pas la même chose selon la règle. Une récurrence à montant
                fixe ne bouge pas : seule l'échéance change. Une récurrence sans
                montant n'a que ses échéances chiffrées pour dire ce qu'elle
                vaut, et celle qu'on écrit devient la plus proche. Dit avant le
                geste, pas après : un toast arrive quand la décision est prise. */}
            {line.variable ? (
              <span className="t-axis text-center">{t.review.padNoteVariable}</span>
            ) : (
              entry.recurrenceId !== undefined && (
                <span className="t-axis text-center">{t.review.padNoteFixed}</span>
              )
            )}
            {line.variable ? (
              <Button variant="ghost" full onClick={onSkip}>
                {t.review.skip}
              </Button>
            ) : (
              <Button variant="ghost" full onClick={closePad}>
                {t.review.padBack}
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              full
              onClick={() => {
                onConfirm()
              }}
            >
              {t.review.yes}
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={openPad}>
                {t.review.other}
              </Button>
              <Button variant="ghost" className="flex-1" onClick={onSkip}>
                {t.review.skip}
              </Button>
            </div>
            {/* Sur écran large seulement : au doigt, ces deux touches
                n'existent pas, et annoncer un raccourci introuvable est pire
                que de se taire. */}
            <span className="t-axis hidden justify-center lg:flex">{t.review.keys}</span>
          </>
        )}
      </div>
    </section>
  )
}
