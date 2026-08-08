import { DONUT_SIZE, DONUT_THICKNESS } from '@/features/dashboard/donut'
import { t } from '@/i18n/strings'
import { formatMoney, formatPercent, tpl } from '@/i18n/format'
import { landing } from '@/i18n/landing'
import { Amount } from '@/ui/Amount'
import { Dot } from '@/ui/Dot'
import { Eyebrow } from '@/ui/Eyebrow'
import { CreditsIcon, DataIcon, ForecastIcon, IncomeIcon, SavingsIcon, SplitIcon } from '@/ui/Icons'
import { Ring } from '@/ui/Ring'
import { BentoGrid, Tile } from '@/ui/Tile'
import { useCurrency } from '@/ui/currency'
import { SAMPLE } from './sample'

/**
 * La démonstration du produit, en six tuiles.
 *
 * Le DS §1 interdit l'illustration : « le chiffre est l'image ». Une page de
 * présentation ne peut donc pas montrer des visuels de l'app — elle doit *être*
 * l'app. Ces six tuiles sont les composants du vrai tableau de bord, avec le
 * vocabulaire du vrai tableau de bord, et quelqu'un qui crée son foyer retrouve
 * la même grille dix secondes plus tard.
 *
 * **Chaque tuile reprend le format que le vrai tableau de bord a choisi pour le
 * même libellé.** Ce n'est pas de la coquetterie : « Capacité d'épargne » est en
 * `4x1` chez `SavingTile`, et son commentaire dit pourquoi — dix-huit caractères
 * d'eyebrow ne tiennent pas dans la centaine de pixels d'une demi-colonne
 * mobile. Posée ici en `2x1`, la pilule se faisait trancher net par
 * l'`overflow-hidden` de la tuile. La fidélité au tableau de bord n'est pas
 * seulement l'argument de la page : c'est ce qui la protège de ses formats.
 *
 * Les tuiles ne portent pas le raisonnement — le DS §5 les plafonne à un
 * eyebrow, un chiffre, une lecture secondaire et une visualisation. Il se lit
 * sous la grille, où rien ne le coupe.
 *
 * Aucune n'est cliquable, donc aucune ne porte d'`affordance` : la règle du DS
 * §6 qui rend les repères lisibles est qu'on n'en pose pas sur ce qui n'agit
 * pas.
 *
 * **L'ordre est porteur.** Les six pavent 6 colonnes sur 4 rangées
 * (8+4+4+2+2+4 = 24) et 2 colonnes sur 7 en mobile, sans un trou de part et
 * d'autre du point de bascule — mais seulement si les deux `2x1` se suivent :
 * séparées, `dense` ne trouve rien d'assez étroit pour combler la demi-case
 * qu'elles laissent, et la rangée mobile reste à moitié vide.
 */
export function LandingTiles() {
  const currency = useCurrency()

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
    <BentoGrid>
      {/* Prévu, puis confirmé — l'anneau signature en jauge, comme sur le mois. */}
      <Tile span="4x2" label={landing.monthTitle}>
        <Eyebrow icon={ForecastIcon}>{landing.monthTitle}</Eyebrow>
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Ring
            size={96}
            value={SAMPLE.monthRatio}
            label={landing.monthRing}
            srText={landing.monthRingRead}
            className="shrink-0"
          >
            <span className="t-num-body tnum">{formatPercent(SAMPLE.monthRatio)}</span>
          </Ring>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="t-num-body tnum">
              {tpl(
                landing.monthOf,
                formatMoney(SAMPLE.monthConfirmed, currency, false),
                formatMoney(SAMPLE.monthForecast, currency, false),
              )}
            </span>
            <span className="t-label">{landing.monthHint}</span>
          </div>
        </div>
      </Tile>

      {/* Le donut de `SplitTile`, au gabarit partagé : deux anneaux de la même
          app qui ne feraient pas la même taille se verraient. Il remplit aussi
          la 2×2, que deux lignes de membres laissaient à moitié vide. */}
      <Tile span="2x2" className="gap-3" label={t.dashboard.split}>
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
            <Amount value={SAMPLE.shared} size="label" direction="out" withCents={false} />
          </Ring>
          <ul className="flex min-w-0 flex-1 flex-col gap-1">
            {SAMPLE.shares.map((share) => (
              <li key={share.id} className="flex items-center gap-2">
                <Dot color={share.color} />
                <span className="t-label min-w-0 flex-1 truncate">{share.label}</span>
                <span className="t-axis tnum shrink-0">
                  {formatPercent(share.percent / 100)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="t-label">{t.dashboard.splitHint}</p>
      </Tile>

      {/* 4×1 et non 2×1, pour la raison que `SavingTile` a déjà écrite : dix-huit
          caractères d'eyebrow ne tiennent pas dans une demi-colonne mobile. */}
      <Tile span="4x1" className="justify-between" label={t.dashboard.capacity}>
        <Eyebrow icon={SavingsIcon}>{t.dashboard.capacity}</Eyebrow>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <Amount value={SAMPLE.savingCapacity} size="tile-fit" withCents={false} />
          {/* Une tuile d'une rangée fait 88px : la seconde lecture ne s'affiche
              qu'au-delà de 1024px, comme sur le vrai tableau de bord. */}
          <span className="t-label max-lg:sr-only">{t.dashboard.capacityHint}</span>
        </div>
      </Tile>

      <Tile span="2x1" className="justify-between" label={t.dashboard.credits}>
        <Eyebrow icon={CreditsIcon}>{t.dashboard.credits}</Eyebrow>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <Amount value={SAMPLE.debtRemaining} size="tile-fit" withCents={false} />
          <span className="t-label max-lg:sr-only">{t.dashboard.creditsRemaining}</span>
        </div>
      </Tile>

      <Tile span="2x1" className="justify-between" label={t.dashboard.income}>
        <Eyebrow icon={IncomeIcon}>{t.dashboard.income}</Eyebrow>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <Amount value={SAMPLE.income} size="tile-fit" direction="in" withCents={false} />
          <span className="t-label max-lg:sr-only">{landing.incomeHint}</span>
        </div>
      </Tile>

      {/* La seule tuile accentuée de la page. Le lime est la marque (DS §1), et
          la marque se pose sur ce qui distingue l'app — pas sur un chiffre.
          En bandeau d'une rangée et non en carré de deux : une phrase de six
          mots laissait la moitié du lime sans rien, et un aplat vide de cette
          taille ne se lit plus comme une marque mais comme un oubli. */}
      <Tile span="4x1" variant="accent" className="justify-between" label={landing.privacyTitle}>
        <Eyebrow icon={DataIcon}>{landing.privacyTitle}</Eyebrow>
        {/* `t-body` et non `t-section` : une 4×1 n'offre que 56px utiles, soit
            l'eyebrow et une ligne — la même règle que le chiffre des autres
            tuiles plates. À 20px la phrase passait à la ligne et se faisait
            couper par le bas. */}
        <p className="t-body">{landing.privacyShort}</p>
      </Tile>
    </BentoGrid>
  )
}
