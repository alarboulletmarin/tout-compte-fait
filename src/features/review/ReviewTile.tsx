import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { REVIEW_PATH } from '@/app/routes'
import { tpl } from '@/i18n/format'
import { t } from '@/i18n/strings'
import {
  useCurrentYm,
  useIsCurrentMonth,
  useMonthFilter,
  useReviewLines,
  useReviewQueueIds,
} from '@/store/selectors'
import { useStore } from '@/store/store'
import { Button } from '@/ui/Button'
import { Eyebrow } from '@/ui/Eyebrow'
import { ToConfirmIcon } from '@/ui/Icons'
import { Tile } from '@/ui/Tile'

/**
 * Va chercher le morceau de la revue sans l'ouvrir.
 *
 * `Routes.tsx` charge la revue à la demande, pour les 3,2 Kio qu'elle pesait
 * dans le morceau d'entrée. Le prix d'un chargement à la demande est une attente
 * au moment du tap, et celle-là tomberait au pire endroit : au début d'une tâche
 * qu'on vient de décider de faire. On la déplace donc à l'affichage de la tuile,
 * où personne ne l'attend — le navigateur a tout le temps de la servir pendant
 * qu'on lit « six lignes à confirmer ».
 *
 * Le spécificateur est le même que celui de `Routes.tsx`, au caractère près :
 * c'est ce qui fait que les deux désignent un seul morceau, et donc que ceci
 * précharge bien cela. Un échec ne se voit pas et ne doit pas se voir — le
 * `lazy` de la route rejouera l'import, et c'est lui qui a un écran pour le
 * dire.
 */
function preloadReview(): void {
  void import('@/features/review/ReviewPage').catch(() => undefined)
}

/**
 * La porte de la revue, sur l'écran du mois.
 *
 * **C'est la tuile accentuée de l'écran, et il n'y en a qu'une** (DS §6). Elle
 * la prend au solde, qui la portait : entre un chiffre qu'on lit et une tâche
 * qui attend, l'accent va à ce qui demande un geste — c'est aussi ce que fait
 * le design, dont la tuile de solde est une tuile ordinaire.
 *
 * **Elle se retire dès qu'un filtre est actif.** La revue est une tâche du
 * foyer : on confirme une échéance entière, jamais la part de quelqu'un.
 * Annoncer « six lignes à confirmer » au-dessus d'une liste filtrée qui n'en
 * montre que deux ferait deux comptes pour une même chose ; et proposer une
 * tâche qui commencerait par défaire le filtre qu'on vient de poser serait pire
 * encore. C'est la règle que la répartition applique déjà pour la même raison.
 * Sous filtre, la liste du mois reste, elle, et chacune de ses lignes se
 * confirme d'un glissé ou d'un bouton — ce qui se fait échéance par échéance ne
 * demande pas qu'on parle au nom du foyer.
 *
 * **Elle ne s'affiche que sur le mois qu'on vit.** Un mois à venir est plein
 * d'échéances prévues — c'est même à ça qu'il sert —, et rien n'y est à
 * confirmer : confirmer, c'est constater qu'un mouvement a eu lieu, et il n'a
 * pas eu lieu. Un mois passé, lui, se relit ; s'il lui reste des prévues, elles
 * se reprennent une par une sur ses lignes, pas par une file qui annoncerait
 * une tâche du jour vieille de trois mois.
 *
 * Deux états, et le second n'existe que le temps d'une session : la file vit
 * en mémoire, jamais dans le document, donc un rechargement retombe sur
 * « Commencer la revue ». C'est assumé — reprendre une revue perdue ne coûte
 * que de retraverser des lignes déjà confirmées, qui n'y sont plus.
 */
export function ReviewTile() {
  const navigate = useNavigate()
  const ym = useCurrentYm()
  const filter = useMonthFilter()
  const queueIds = useReviewQueueIds()
  const session = useStore((s) => s.review)
  const startReview = useStore((s) => s.startReview)
  const lines = useReviewLines(session?.ids ?? [])

  const isCurrent = useIsCurrentMonth()

  const waiting = queueIds.length
  const shown = waiting > 0 && filter.kind === 'all' && isCurrent

  /* Avant le retour anticipé : un effet ne se saute pas. Il ne part que lorsque
     la tuile s'affiche vraiment — un mois sans rien à confirmer ne télécharge
     pas un écran qu'il n'ouvrira pas. */
  useEffect(() => {
    if (shown) preloadReview()
  }, [shown])

  if (!shown) return null

  /* « En cours » veut dire : commencée, et pas finie. À l'index zéro rien n'a
     été fait — proposer de « reprendre » au début n'aurait rien à reprendre —
     et au-delà de la dernière ligne la file est épuisée, donc ce qui reste à
     confirmer ne vient pas d'elle. */
  const resuming =
    session !== null && session.ym === ym && session.index > 0 && session.index < lines.length

  const open = (fresh: boolean): void => {
    if (fresh) startReview(ym, queueIds)
    void navigate(REVIEW_PATH)
  }

  return (
    <Tile variant="accent" className="gap-3">
      <Eyebrow icon={ToConfirmIcon}>{t.month.toConfirm}</Eyebrow>
      <span className="t-tile-num">
        {resuming
          ? tpl(t.review.resumeAt, session.index + 1, lines.length)
          : waiting === 1
            ? t.review.tileTitleOne
            : tpl(t.review.tileTitle, waiting)}
      </span>
      <p className="t-body max-w-[44ch]">
        {resuming ? t.review.resumeBody : t.review.tileBody}
      </p>

      {resuming && (
        /* La barre dessine ce que le titre écrit juste au-dessus. Elle n'a donc
           rien à annoncer d'elle-même — `aria-hidden`, comme les segments de
           l'en-tête de la revue, et pour la même raison : une nuance ne porte
           jamais seule ce qu'elle dit (DS §8). */
        <span
          aria-hidden="true"
          className="block h-1 overflow-hidden rounded-chip bg-surface-2"
        >
          <span
            className="block h-1 rounded-chip bg-accent-fg"
            style={{ width: `${String(Math.round((session.index / lines.length) * 100))}%` }}
          />
        </span>
      )}

      <div className="flex flex-wrap gap-2">
        {/* `secondary` et non `primary` : sur un fond lime, un bouton lime ne
            se détacherait pas de sa tuile. C'est la variante que le DS pose sur
            une surface accentuée. */}
        <Button
          variant="secondary"
          onClick={() => {
            open(!resuming)
          }}
        >
          {resuming ? t.review.resume : t.review.start}
        </Button>
        {resuming && (
          <Button
            variant="ghost"
            onClick={() => {
              open(true)
            }}
          >
            {t.review.restart}
          </Button>
        )}
      </div>
    </Tile>
  )
}
