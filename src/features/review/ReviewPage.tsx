import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RECURRENCE_NEW_PATH } from '@/app/routes'
import { type YearMonth, addMonthsToYm } from '@/domain/date'
import { monthHorizon } from '@/domain/month'
import type { Money } from '@/domain/money'
import { t } from '@/i18n/strings'
import { prefersReducedMotion } from '@/lib/reveal'
import { confirmEntry, removeEntry, undoable } from '@/store/actions'
import {
  type ReviewLine,
  useCategoryMap,
  useCurrentYm,
  useHasAnyData,
  useReviewLines,
  useReviewQueueIds,
} from '@/store/selectors'
import { useStore } from '@/store/store'
import { EmptyState } from '@/ui/EmptyState'
import { PageTitle } from '@/ui/PageTitle'
import { useHotkeys } from '@/ui/useHotkeys'
import { type Phase, ReviewCard } from './ReviewCard'
import { ReviewHeader } from './ReviewHeader'
import { ReviewNext } from './ReviewNext'
import { counterLong } from './counter'
import { ReviewQueue } from './ReviewQueue'
import { ReviewSummary } from './ReviewSummary'

/* La durée de la sortie de carte, en millisecondes, pour programmer l'échange
   de contenu. C'est `--dur` — le dépôt n'a pas de token à 170ms, celui que le
   handoff demande ici, et dix millisecondes ne valent pas un token de plus. La
   transition, elle, lit le token : ce nombre ne sert qu'à savoir *quand*
   remplacer la carte, jamais à l'animer.

   **L'avancement ne dépend d'aucun `transitionend`.** Sous
   `prefers-reduced-motion`, les deux tokens valent zéro et aucune transition ne
   se termine : une file qui attendrait cet événement n'arriverait jamais à sa
   deuxième carte. La préférence est donc relue à chaque passage, comme
   `reveal()` le fait pour le défilement, et l'échange y devient immédiat. */
const OUT_MS = 160

/**
 * La revue du mois — la file des échéances qui attendent d'être confirmées.
 *
 * Elle n'a pas de porte permanente : on y arrive par la tuile du mois, qui
 * n'existe que lorsqu'il reste quelque chose à confirmer (`REVIEW_PATH`). C'est
 * ce qui donne son sens à sa sortie, qui est un retour au mois et non la
 * fermeture d'une surcouche.
 *
 * **Son état vide a deux causes, et elles n'appellent pas le même geste.** Un
 * mois dont tout est confirmé est un mois fini : il n'y a rien à faire, et le
 * dire est déjà la réponse. Un document qui n'a encore posé aucune règle, lui,
 * n'aura jamais rien à confirmer tant qu'on ne lui en donne pas une — ce n'est
 * pas une tâche finie, c'est une tâche qui n'a pas pu commencer, et l'envoyer
 * vers « ajoute une dépense » lui ferait recommencer tous les mois ce qu'une
 * récurrence écrit une fois. Les deux phrases sont celles de l'écran du mois,
 * au mot près : le même état ne se raconte pas de deux façons selon l'écran
 * d'où on le regarde.
 *
 * **Trois écrans, un seul chemin** : la file, puis le bilan quand elle est
 * épuisée, puis le mois suivant quand on l'a fermée. Les deux premiers se
 * déduisent de l'index de la session ; le troisième est le seul état local de
 * l'écran, et il l'est par nécessité — « fermer août » déplace le curseur du
 * mois, ce qui périme la file, si bien qu'il ne reste plus rien dans le store
 * pour dire où l'on en est.
 *
 * **Ce que chaque geste écrit, et ce qu'il n'écrit pas** :
 *
 * — « C'était bien ça » confirme l'échéance à son montant prévu. Pas de toast :
 *   six confirmations d'affilée en poseraient six, qui recouvriraient les
 *   boutons qu'on est en train d'enchaîner, et la carte qui passe est déjà la
 *   réponse. Le geste inverse reste sur le mois, où la section « À confirmer »
 *   le porte déjà.
 * — « Un autre montant » confirme au montant saisi. La microcopy sous le pavé
 *   dit ce que ça change au-delà de ce mois, et elle diffère selon la règle.
 * — « Pas ce mois-ci » **retire la ligne**, dans un `undoable`. Surtout pas une
 *   confirmation à zéro : une échéance confirmée à zéro entre dans tous les
 *   totaux et dans l'historique de prix, où elle annonce une baisse de 100 %.
 *   La file ne s'avance pas alors — la ligne quitte le document, donc la
 *   suivante prend sa place à l'index courant. Rétablir la remet là où elle
 *   était et la carte revient : la même mécanique, dans l'autre sens.
 */
export function ReviewPage() {
  const navigate = useNavigate()
  const ym = useCurrentYm()
  const session = useStore((s) => s.review)
  const startReview = useStore((s) => s.startReview)
  const gotoReviewStep = useStore((s) => s.gotoReviewStep)
  const advanceReview = useStore((s) => s.advanceReview)
  const endReview = useStore((s) => s.endReview)
  const setYm = useStore((s) => s.setYm)

  const queueIds = useReviewQueueIds()
  /* La file de la session si elle existe, sinon celle que le mois dicte. Ce
     repli n'est pas une redondance de l'effet ci-dessous : sans lui, le premier
     rendu d'une arrivée directe se ferait sur une file vide — c'est-à-dire sur
     « tout est confirmé » — et l'effet ne corrigerait qu'à la frame suivante.
     Un écran qui annonce le contraire de la vérité pendant une image est un
     écran qui clignote. */
  const lines = useReviewLines(session?.ids ?? queueIds)
  const hasData = useHasAnyData()
  const categories = useCategoryMap()

  /* Le mois qu'on vient de fermer, et le seul état que cet écran garde pour
     lui. Il tient le dernier écran : `setYm` a effacé la file au moment même
     où on la finissait, donc plus rien dans le store ne dirait d'où l'on
     vient. */
  const [closed, setClosed] = useState<YearMonth | null>(null)

  const index = session?.index ?? 0
  const current = index < lines.length ? lines[index] : undefined

  /* Arriver ici sans file — par l'URL, ou après un rechargement qui l'a perdue
     — la repose plutôt que d'afficher un écran vide sur un mois qui a du
     travail. Jamais après avoir fermé le mois : la file du mois suivant se
     rouvrirait toute seule derrière le dernier écran. */
  useEffect(() => {
    if (closed !== null || session !== null || queueIds.length === 0) return
    startReview(ym, queueIds)
  }, [closed, session, queueIds, ym, startReview])

  const quit = (): void => {
    endReview()
    void navigate('/')
  }

  const confirm = (amount?: Money): void => {
    if (current === undefined) return
    /* L'écriture d'abord, la sortie de carte ensuite : c'est ce qui fait que la
       colonne de gauche se coche pendant l'animation plutôt qu'après elle. */
    confirmEntry(current.entry.id, amount)
    advanceReview()
  }

  const skip = (): void => {
    if (current === undefined) return
    undoable(t.review.skipped, () => {
      removeEntry(current.entry.id)
    })
  }

  const colorOf = (categoryId: string): string =>
    categories.get(categoryId)?.color ?? 'var(--cat-rest)'

  /* Échap sort de la revue, d'où qu'on soit dedans. « Entrée » n'est pas ici :
     c'est la carte qui la porte, et elle la rend au pavé dès qu'il s'ouvre —
     deux propriétaires d'une même touche feraient deux gestes sur une frappe. */
  useHotkeys({ Escape: quit })

  if (closed !== null) {
    return (
      <>
        <PageTitle title={t.review.title} hidden />
        <ReviewNext
          closed={closed}
          onOpen={() => {
            void navigate('/')
          }}
        />
      </>
    )
  }

  const summary = (reviewed: number) => (
    <Summary
      ym={ym}
      reviewed={reviewed}
      onClose={(next) => {
        setClosed(ym)
        if (next === null) quit()
        else setYm(next)
      }}
    />
  )

  /* Rien à confirmer, et rien de commencé : c'est l'état vide, et sa phrase
     dépend de la cause. Une file épuisée, elle, passe par le bilan juste
     dessous — la session est alors là pour le dire. */
  if (session === null && lines.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <PageTitle title={t.review.title} onBack={quit} />
        {hasData ? (
          <EmptyState message={t.month.done} actionLabel={t.review.back} onAction={quit} />
        ) : (
          <EmptyState
            message={t.month.emptyStart}
            actionLabel={t.recurrences.add}
            onAction={() => {
              void navigate(RECURRENCE_NEW_PATH)
            }}
          />
        )}
      </div>
    )
  }

  /* La file est épuisée — soit qu'on l'ait traversée, soit que tout ce qu'elle
     portait ait été retiré. Dans les deux cas c'est une fin, et le bilan la
     dit. */
  if (current === undefined) return summary(lines.length)

  return (
    <Queue
      lines={lines}
      index={index}
      current={current}
      colorOf={colorOf}
      onQuit={quit}
      onGoTo={gotoReviewStep}
      onConfirm={confirm}
      onSkip={skip}
    />
  )
}

/** La file elle-même : la colonne, l'en-tête, et la carte qui se remplace. */
function Queue({
  lines,
  index,
  current,
  colorOf,
  onQuit,
  onGoTo,
  onConfirm,
  onSkip,
}: {
  lines: ReviewLine[]
  index: number
  current: ReviewLine
  colorOf: (categoryId: string) => string
  onQuit: () => void
  onGoTo: (step: number) => void
  onConfirm: (amount?: Money) => void
  onSkip: () => void
}) {
  const { phase, line } = useCardTransition(current)

  return (
    /* La grille de la revue : une colonne au doigt, `320px | 1fr` à partir de
       1024px. `.cols` ne convenait pas — elle partage à parts égales dès 768px,
       quand cette colonne-ci est une liste qui n'a pas à prendre la moitié de
       l'écran, et la carte a besoin du reste pour son chiffre héros. */
    <div className="grid gap-4 lg:grid-cols-[320px_1fr] lg:items-start">
      {/* Le titre ne s'affiche pas : l'en-tête de la revue porte déjà la sortie
          et l'avancement, et un titre d'écran par-dessus ferait deux têtes. Il
          existe pour l'annonce du changement d'écran, comme sur le mois. */}
      <PageTitle title={t.review.title} hidden />
      <ReviewQueue lines={lines} index={index} colorOf={colorOf} onGoTo={onGoTo} onQuit={onQuit} />
      <div className="flex min-w-0 flex-col gap-3">
        <ReviewHeader index={index} total={lines.length} onQuit={onQuit} />
        {/* Le compteur long est celui de la colonne de gauche ; sur écran
            étroit elle n'existe pas, et les segments ne disent pas ce qui
            reste derrière. */}
        <p className="t-axis lg:hidden">{counterLong(index, lines.length)}</p>
        {/* La carte change sans que le focus bouge : qui écoute reste sur le
            bouton qu'il vient d'activer, et rien ne lui dirait qu'une autre
            échéance a pris la place. Une région polie l'annonce — le compteur
            d'abord, parce que savoir où l'on en est change la façon de
            répondre. Elle porte l'échéance **courante** et non celle qui sort :
            l'animation est une affaire d'yeux. */}
        <p aria-live="polite" className="sr-only">
          {`${counterLong(index, lines.length)} · ${current.entry.label}`}
        </p>
        <ReviewCard
          line={line}
          color={colorOf(line.entry.categoryId)}
          phase={phase}
          onConfirm={onConfirm}
          onSkip={onSkip}
        />
      </div>
    </div>
  )
}

/** Le bilan, et la seule question qu'il pose : y a-t-il un mois où aller ? */
function Summary({
  ym,
  reviewed,
  onClose,
}: {
  ym: YearMonth
  reviewed: number
  onClose: (next: YearMonth | null) => void
}) {
  const next = addMonthsToYm(ym, 1)
  /* Au-delà de l'horizon, l'app n'ouvre plus de mois — ouvrir écrit toutes les
     échéances de toutes les règles, définitivement. La porte n'existe alors
     pas, et le bouton retombe sur le retour au mois. */
  const canClose = next <= monthHorizon()
  return (
    <>
      <PageTitle title={t.review.title} hidden />
      <ReviewSummary
        ym={ym}
        reviewed={reviewed}
        canClose={canClose}
        onClose={() => {
          onClose(canClose ? next : null)
        }}
      />
    </>
  )
}

/**
 * La machine à trois temps du passage d'une carte à la suivante.
 *
 * `out` emmène la carte sortante vers la gauche, `pre` repose la suivante à
 * droite sans transition, `in` la ramène en place. Trois temps et non deux :
 * sans le `pre`, la carte entrante viendrait de la position de la sortante,
 * c'est-à-dire de la gauche — la file se lirait à l'envers.
 *
 * Le changement se détecte sur l'identité de la ligne et non sur l'index : une
 * ligne retirée fait avancer la file sans que l'index bouge, et une carte qui
 * ne s'annoncerait pas dans ce cas-là changerait de contenu sans transition.
 *
 * Pendant la sortie, c'est **la ligne d'avant** qui reste à l'écran : une carte
 * qui sortirait en montrant déjà le contenu suivant ferait disparaître la
 * réponse qu'on vient de donner.
 */
function useCardTransition(current: ReviewLine): { phase: Phase; line: ReviewLine } {
  const [phase, setPhase] = useState<Phase>('in')
  const [leaving, setLeaving] = useState<ReviewLine | null>(null)
  const shown = useRef(current)

  /* Sur l'identité de la ligne : elle change à chaque fois que la file bouge,
     et la garde de la référence départage ce qui est un vrai changement de
     carte de ce qui n'est qu'un recalcul du mémo. */
  useEffect(() => {
    const previous = shown.current
    if (previous.entry.id === current.entry.id) {
      shown.current = current
      return
    }
    shown.current = current
    /* Sous `prefers-reduced-motion`, il n'y a rien à jouer et rien à retenir :
       la carte suivante est déjà la bonne. La passer en `out` la ferait
       disparaître pour de bon — à durée nulle, aucune transition ne se termine
       pour la ramener. */
    if (prefersReducedMotion()) return
    setLeaving(previous)
    setPhase('out')
  }, [current])

  useEffect(() => {
    if (phase === 'in') return
    const timer = setTimeout(
      () => {
        if (phase === 'out') {
          setLeaving(null)
          setPhase('pre')
        } else setPhase('in')
      },
      phase === 'out' ? OUT_MS : 0,
    )
    return () => {
      clearTimeout(timer)
    }
  }, [phase])

  return { phase, line: phase === 'out' ? (leaving ?? current) : current }
}
