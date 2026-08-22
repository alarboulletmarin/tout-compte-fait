import { SPLIT_PATH } from '@/app/routes'
import { t } from '@/i18n/strings'
import { formatMoney, formatPercent, tpl } from '@/i18n/format'
import { useMemberMap, useMonthSplit } from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Dot } from '@/ui/Dot'
import { Eyebrow } from '@/ui/Eyebrow'
import { SplitIcon } from '@/ui/Icons'
import { Ring, type RingSegment } from '@/ui/Ring'
import { Tile } from '@/ui/Tile'
import { useCurrency } from '@/ui/currency'
import { useHasSplit } from './composition'
import { DONUT_SIZE, DONUT_THICKNESS } from './donut'

/**
 * Ce que chacun verse sur les charges communes du mois, et le chemin vers le
 * détail du calcul.
 *
 * Elle s'efface dans trois cas. Sans les revenus de tout le monde, il n'y a
 * pas de prorata à afficher — et un zéro serait un mensonge plutôt qu'un vide.
 * Sous un filtre par membre, elle n'aurait plus rien à montrer : une charge
 * commune n'appartient à personne, donc aucune ne passe le filtre. La faire
 * disparaître dit ça mieux qu'une tuile à zéro. Et seul du foyer, un anneau à
 * 100 % n'apprendrait rien : le pot se lit sur la pilule « Commun », la part
 * sur « Part du foyer ».
 */
export function SplitTile() {
  const { total, shares } = useMonthSplit()
  const members = useMemberMap()
  const currency = useCurrency()
  const visible = useHasSplit()

  if (!visible || shares === null) return null

  const segments: RingSegment[] = shares.map((share) => ({
    id: share.memberId,
    value: share.shareBp / 10_000,
    color: members.get(share.memberId)?.color ?? 'var(--cat-rest)',
    label: members.get(share.memberId)?.name ?? '',
  }))

  const spoken = shares
    .map(
      (share) => `${members.get(share.memberId)?.name ?? ''} ${formatMoney(share.due, currency)}`,
    )
    .join(', ')

  return (
    /* Un lien et non un bouton : son contenu est une liste de parts, ce qu'un
       `<button>` n'admet pas — et qu'un lecteur d'écran aplatissait derrière un
       nom unique, quand c'est justement ligne à ligne qu'on veut l'entendre.
       C'est le motif du DS §6.

       **Toute la tuile est la cible pour autant.** Le lien ne faisait que les
       44px du repère, au coin : la règle réglait un problème d'oreille et en
       créait un de doigt, sur une tuile de 300px de large posée à côté d'une
       Capacité d'épargne qui, elle, se touche n'importe où. Le lien s'étend
       maintenant sur le cadre, vide, et le coin ne garde que le repère — il ne
       coûte donc toujours pas un pixel des 148px de contenu d'une 2×2, comptés
       au pixel dans `donut.ts`.

       Le repère n'a pas de nom de destination à l'écran : l'eyebrow dit déjà
       « Répartition », et l'écrire une seconde fois au coin n'apprendrait rien
       de plus que le chevron seul. Le lien, lui, porte son nom entier — il se
       lit aussi hors de la tuile. */
    <Tile
      span="2x2"
      className="gap-3"
      label={t.dashboard.split}
      link={{ to: SPLIT_PATH, label: t.dashboard.showSplit }}
    >
      <Eyebrow icon={SplitIcon}>{t.dashboard.split}</Eyebrow>
      <div className="flex min-h-0 flex-1 items-center gap-4">
        <Ring
          size={DONUT_SIZE}
          thickness={DONUT_THICKNESS}
          segments={segments}
          label={t.dashboard.split}
          srText={tpl(t.split.srShares, spoken)}
          className="shrink-0"
        >
          <Amount value={total} size="label" direction="out" withCents={false} />
        </Ring>
        <ul className="flex min-w-0 flex-1 flex-col gap-1">
          {shares.map((share) => (
            <li key={share.memberId} className="flex items-center gap-2">
              <Dot color={members.get(share.memberId)?.color ?? 'var(--cat-rest)'} />
              <span className="t-label min-w-0 flex-1 truncate">
                {members.get(share.memberId)?.name ?? ''}
              </span>
              <span className="t-axis tnum shrink-0">{formatPercent(share.shareBp / 10_000)}</span>
            </li>
          ))}
        </ul>
      </div>
      {/* Plus souligné : c'était un faux lien — un texte qui promet un clic
          dans une tuile qui en portait déjà un, sur une autre destination
          supposée. Le repère du coin tient ce rôle, et lui seul. */}
      <p className="t-label">{t.dashboard.splitHint}</p>
    </Tile>
  )
}
