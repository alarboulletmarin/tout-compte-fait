import { t } from '@/i18n/strings'
import { tpl } from '@/i18n/format'
import { useMonthConfirmed, useMonthPending } from '@/store/selectors'
import { Eyebrow } from '@/ui/Eyebrow'
import { ToConfirmIcon } from '@/ui/Icons'
import { Tile } from '@/ui/Tile'

/**
 * Où en est le mois : combien d'opérations sont confirmées, sur combien.
 *
 * **Le couple prévu / confirmé, enfin lu au niveau du mois.** C'est la thèse du
 * produit — une opération se prévoit, puis se confirme —, et elle ne se lisait
 * nulle part comme un avancement : chaque ligne portait son état, le mois ne
 * portait pas le compte. Savoir qu'il restait quatre échéances demandait de
 * descendre jusqu'à la liste et d'en lire le titre, c'est-à-dire d'avoir déjà
 * trouvé ce qu'on cherchait.
 *
 * **Les mêmes sélecteurs que la section « À confirmer ».** `useMonthPending` et
 * `useMonthConfirmed`, sans un calcul de plus ici : deux chiffres voisins qui se
 * compteraient chacun de son côté finiraient par diverger, et c'est exactement
 * ce qui se lit comme une erreur. C'est l'invariant de la tuile, et il vaut
 * sous n'importe quelle lecture — le compte annoncé ici est **exactement** ce
 * que la section du dessous liste, filtre compris.
 *
 * Ce qui la range du bon côté d'une distinction que le cahier §4.6 pose sans
 * ambiguïté : sous un filtre par membre, les **chiffres** proratisent — chacun
 * porte sa part des charges communes — mais les **listes**, elles, gardent les
 * échéances entières, parce qu'on confirme une échéance et jamais une part.
 * Cette tuile compte des opérations, pas des euros : elle lit donc la portée des
 * listes (`useMonthEntries`), et non celle des chiffres (`useMonthScope`). Un
 * ratio à 6,2 / 14,8 ne correspondrait à rien de cliquable.
 *
 * **`4x1`, comme les crédits.** Trois éléments — une étiquette, un chiffre, une
 * lecture secondaire —, et le DS §5 tranche : « si elle en porte trois, ce n'est
 * pas une `2x2` ». Le format suit le contenu.
 *
 * Le geste n'existe que s'il reste quelque chose à confirmer, et le repère avec
 * lui (DS §6). Une flèche vers le bas et non un chevron : la section est plus
 * bas sur cette page, elle n'est pas sur un autre écran — c'est le repère des
 * deux tuiles de flux, qui mènent aux lignes du mois de la même façon.
 */
export function MonthStatusTile({ onShowPending }: { onShowPending?: () => void }) {
  const { fixed, variable } = useMonthPending()
  const confirmed = useMonthConfirmed()

  const pending = fixed.length + variable.length
  const total = confirmed.length + pending

  /* Un mois sans une seule opération n'a pas d'avancement à montrer : « 0 / 0 »
     n'est pas un vide, c'est une division qui n'a pas lieu d'être. L'écran du
     mois montre alors son état vide, qui dit ce qu'il faut faire. */
  if (total === 0) return null

  const go = pending > 0 && onShowPending !== undefined

  return (
    <Tile
      span="4x1"
      className="justify-between"
      /* Cliquable, c'est le nom d'un bouton et il dit le geste ; sinon c'est le
         nom d'une section, et une région ne se nomme pas d'une phrase — les
         deux autres tuiles à liste portent de la même façon leur seul
         libellé. La phrase, elle, se dit alors plus bas. */
      label={
        go
          ? tpl(t.dashboard.srMonthStatusGo, confirmed.length, total)
          : t.dashboard.monthStatus
      }
      {...(go
        ? {
            onClick: onShowPending,
            /* Elle descend, elle ne pointe pas de côté : « plus bas », et non
               « ailleurs ». Vers la liste du mois, qui porte désormais les
               échéances prévues avec les lignes réelles — la section
               « À confirmer » qu'elle désignait avant y a été fondue. Le nom
               court, parce qu'un repère de coin plafonne à 60 % de la largeur
               de sa tuile. */
            affordance: { kind: 'scroll' as const, destination: t.month.entries },
          }
        : {})}
    >
      <Eyebrow icon={ToConfirmIcon}>{t.dashboard.monthStatus}</Eyebrow>
      <div className="flex flex-wrap items-baseline gap-x-2">
        {/* Pas un `Amount` : ce n'est pas de l'argent, il n'y a ni symbole ni
            centimes ni sens à en tirer — et le compteur qui égrène les chiffres
            de la grille au premier affichage (DS §4) n'a rien à faire sur un
            ratio, qu'il ferait défiler comme une somme. `tnum` reste, lui : les
            deux nombres doivent s'aligner d'un mois à l'autre. */}
        <span className="t-tile-fit tnum" aria-hidden="true">
          {confirmed.length} / {total}
        </span>
        {/* Lue par un lecteur d'écran quoi qu'il arrive — le nom accessible de
            la tuile la porte déjà en toutes lettres —, affichée dès que la
            tuile est assez large. C'est la tuile qui décide, pas l'écran. */}
        <span className="t-label tile-hint" aria-hidden="true">
          {t.dashboard.monthStatusConfirmed}
        </span>
      </div>
      {/* Ce que l'œil lit en deux morceaux, l'oreille le lit en une phrase :
          « 12 / 16 » s'annonce « douze barre oblique seize », et la lecture
          secondaire est masquée sur une tuile étroite. Ignoré quand la tuile
          est un bouton — son nom accessible dit déjà la même chose. */}
      <p className="sr-only-text">{tpl(t.dashboard.srMonthStatus, confirmed.length, total)}</p>
    </Tile>
  )
}
