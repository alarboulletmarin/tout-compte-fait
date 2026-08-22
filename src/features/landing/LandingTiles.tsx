import { DONUT_SIZE, DONUT_THICKNESS } from '@/features/dashboard/donut'
import { t } from '@/i18n/strings'
import { formatPercent, tpl } from '@/i18n/format'
import { landing } from '@/i18n/landing'
import { Amount } from '@/ui/Amount'
import { Dot } from '@/ui/Dot'
import { Eyebrow } from '@/ui/Eyebrow'
import { ForecastIcon, SplitIcon, ToConfirmIcon } from '@/ui/Icons'
import { Ring } from '@/ui/Ring'
import { Tile } from '@/ui/Tile'
import { SAMPLE } from './sample'

/**
 * La démonstration du produit, en trois tuiles posées à côté de la promesse.
 *
 * Le DS §1 interdit l'illustration : « le chiffre est l'image ». Une page qui
 * présente l'app ne peut donc pas en montrer une capture — elle doit *être*
 * l'app. Ce sont les composants du vrai tableau de bord, avec le vocabulaire du
 * vrai tableau de bord, et quelqu'un qui crée son suivi retrouve les mêmes dix
 * secondes plus tard.
 *
 * **Trois, et non six.** La grille bento de six tuiles montrait de quoi l'app a
 * l'air ; elle ne montrait pas ce qu'on y *fait*. Les trois qui restent portent
 * chacune une des trois choses qu'il faut avoir comprises pour vouloir essayer :
 * le mois a un solde attendu et une part déjà confirmée, les charges communes se
 * découpent entre les personnes, et une ligne prévue devient une ligne réelle.
 * Les trois disparues — crédits, revenus, la tuile accentuée « rien ne sort
 * d'ici » — portaient un chiffre chacune et aucun raisonnement : leur argument
 * est plus bas, en prose, où il a la place d'être dit en entier.
 *
 * **Pas de `BentoGrid`.** Ces tuiles vivent dans une colonne de 440px au plus,
 * à côté d'un texte : la trame de rangées du bento est calibrée pour une pleine
 * largeur et imposerait ici des hauteurs qui n'ont rien à tenir. Elles prennent
 * donc leur flux, ce que `Tile` fait sans `span` (DS §5).
 *
 * **Les deux petites s'empilent sous 768px** (`.cols`) : à deux colonnes sur un
 * téléphone, la légende « Camille 38 % » n'a plus la place de tenir sur une
 * ligne et se casse en trois.
 *
 * Aucune n'est cliquable, donc aucune ne porte d'`affordance` : le DS §6 ne pose
 * un repère que sur ce qui agit.
 */
export function LandingTiles() {
  const segments = SAMPLE.shares.map((share) => ({
    id: share.id,
    value: share.percent / 100,
    color: share.color,
    label: share.label,
  }))
  const spoken = SAMPLE.shares
    .map((share) => `${share.label} ${formatPercent(share.percent / 100)}`)
    .join(', ')

  return (
    <div className="flex flex-col gap-3">
      {/* Le prévisionnel et la part confirmée, côte à côte : le chiffre dit où
          l'on va, l'anneau dit où l'on en est. C'est la lecture d'ouverture du
          vrai écran du mois, et le seul chiffre héros de la page. */}
      <Tile className="gap-3" label={t.dashboard.forecast}>
        <div className="flex items-start justify-between gap-4">
          <span className="fit-box flex min-w-0 flex-1 flex-col gap-2">
            <Eyebrow icon={ForecastIcon}>{t.dashboard.forecast}</Eyebrow>
            <Amount value={SAMPLE.forecast} size="hero-fit" />
            {/* Le montant passe par `Amount` et non par la phrase : en anglais
                avec des euros, il s'écrit « €1,920 » et non « 1 920 € ». */}
            <span className="t-axis flex flex-wrap items-baseline gap-1">
              {landing.confirmedToDate}
              <Amount value={SAMPLE.monthConfirmed} size="label" withCents={false} />
            </span>
          </span>
          <Ring
            size={84}
            value={SAMPLE.monthRatio}
            label={landing.monthRing}
            srText={landing.monthRingRead}
            className="shrink-0"
          >
            <span className="t-num-label tnum">{formatPercent(SAMPLE.monthRatio)}</span>
          </Ring>
        </div>
      </Tile>

      <div className="cols">
        {/* Le donut de `SplitTile`, au gabarit partagé : deux anneaux de la même
            app qui ne feraient pas la même taille se verraient d'un écran à
            l'autre. */}
        <Tile className="gap-3" label={t.dashboard.split}>
          <Eyebrow icon={SplitIcon}>{t.dashboard.split}</Eyebrow>
          <div className="flex items-center gap-3">
            <Ring
              size={DONUT_SIZE}
              thickness={DONUT_THICKNESS}
              segments={segments}
              label={t.dashboard.split}
              srText={tpl(t.split.srShares, spoken)}
              className="shrink-0"
            />
            <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
              {SAMPLE.shares.map((share) => (
                <li key={share.id} className="flex items-center gap-2">
                  <Dot color={share.color} />
                  <span className="t-label min-w-0 flex-1 truncate">{share.label}</span>
                  <span className="t-axis tnum shrink-0">{formatPercent(share.percent / 100)}</span>
                </li>
              ))}
            </ul>
          </div>
        </Tile>

        {/* La seule tuile accentuée de la page (DS §6). Le lime est la marque, et
            la marque se pose sur ce qui distingue l'app : pas un chiffre, le
            geste. Une ligne prévue, barrée, et ce qu'elle a réellement coûté.

            Aucune flèche entre les deux montants : le DS §9.1 ne connaît que
            deux emplois d'icône, agir et se repérer, et un glyphe de relation
            n'est ni l'un ni l'autre. Le barré porte déjà le « devient », et la
            phrase du dessous le dit en toutes lettres. */}
        <Tile variant="accent" className="gap-2" label={landing.mechanismLabel}>
          <Eyebrow icon={ToConfirmIcon}>{landing.mechanismLabel}</Eyebrow>
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Amount
              value={SAMPLE.electricityPlanned}
              size="label"
              tone="muted"
              className="line-through"
            />
            <Amount value={SAMPLE.electricityReal} size="tile-fit" />
          </span>
          <p className="t-body">{landing.mechanismBody}</p>
        </Tile>
      </div>
    </div>
  )
}
