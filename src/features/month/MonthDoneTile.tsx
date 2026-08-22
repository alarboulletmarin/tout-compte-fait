import { addMonthsToYm } from '@/domain/date'
import { monthHorizon } from '@/domain/month'
import { t } from '@/i18n/strings'
import { de, formatDateCompact, formatMonthName, tpl } from '@/i18n/format'
import { useCurrentYm, useUpcoming } from '@/store/selectors'
import { useStore } from '@/store/store'
import { Button } from '@/ui/Button'
import { Eyebrow } from '@/ui/Eyebrow'
import { ToConfirmIcon } from '@/ui/Icons'
import { Tile } from '@/ui/Tile'

/**
 * « Août est à jour » — la fin visible de la tâche du mois.
 *
 * Elle prend la place de la tuile de revue, qui se retire quand il n'y a plus
 * rien à confirmer : les deux ne s'affichent jamais ensemble, et c'est ce qui
 * garde une seule tuile accentuée par écran (DS §6). Celle-ci n'est pas
 * accentuée — elle constate, elle ne demande rien.
 *
 * **Elle dit la prochaine échéance, et c'est tout son intérêt.** « Tout est
 * confirmé » referme la tâche sans dire quand la suivante s'ouvre : sans cette
 * phrase, la seule façon de savoir s'il faut revenir demain ou dans trois
 * semaines est de descendre la liste. `useUpcoming` la connaît déjà, et elle
 * regarde au-delà du mois affiché — c'est justement ce qu'il faut le 31.
 *
 * **« Fermer août » n'écrit rien** : `MonthState.closed` est un champ réservé,
 * écrit à `false` et jamais lu, et le bilan de la revue le dit déjà — un mois
 * fermé reste modifiable. Le bouton est une navigation vers le mois suivant,
 * que l'app ouvre toute seule en y arrivant. Les mots sont ceux du bilan, au
 * caractère près : le nom d'une action ne change pas d'un écran à l'autre
 * (DS §7).
 *
 * **« Défaire la dernière » n'existe pas, et c'est mesuré.** Une `Entry` ne
 * porte ni date ni ordre de confirmation (`types.ts:388`) : « la dernière »
 * désignerait, au mieux, la plus récente **par date d'échéance**, c'est-à-dire
 * pas du tout celle qu'on vient de confirmer. Inventer un champ pour ça
 * coûterait une migration de schéma, un export à faire évoluer et une valeur de
 * plus à valider, pour un geste qui existe déjà deux fois : chaque ligne
 * confirmée porte son propre retour en arrière sur sa rangée, et la liste porte
 * celui de tout le mois. Le bouton renvoie donc à ces lignes plutôt que de
 * deviner laquelle viser.
 */
export function MonthDoneTile({ onShowEntries }: { onShowEntries: () => void }) {
  const ym = useCurrentYm()
  const setYm = useStore((s) => s.setYm)
  const upcoming = useUpcoming(1)

  const next = addMonthsToYm(ym, 1)
  /* Ouvrir un mois écrit toutes les échéances de toutes les règles : la borne
     des douze mois existe pour que la navigation ne se repousse pas elle-même.
     Au-delà, il n'y a nulle part où aller, et le bouton ne le promet pas. */
  const canClose = next <= monthHorizon()
  const first = upcoming[0]

  return (
    <Tile className="gap-3">
      <Eyebrow icon={ToConfirmIcon}>{t.month.nothingToConfirm}</Eyebrow>
      <span className="t-tile-num">{tpl(t.month.upToDate, formatMonthName(ym))}</span>
      <p className="t-body max-w-[44ch]">
        {first === undefined
          ? t.month.upToDateNoNext
          : tpl(t.month.upToDateNext, formatDateCompact(first.entry.date), first.entry.label)}
      </p>
      <div className="flex flex-wrap gap-2">
        {canClose && (
          <Button
            onClick={() => {
              setYm(next)
            }}
          >
            {tpl(t.review.close, formatMonthName(ym))}
          </Button>
        )}
        {/* Vers les lignes plutôt que vers une devinette : c'est là que se
            trouvent les deux retours en arrière que l'app sait faire. */}
        <Button variant="ghost" onClick={onShowEntries}>
          {tpl(t.month.reopenLines, de(formatMonthName(ym)))}
        </Button>
      </div>
    </Tile>
  )
}
