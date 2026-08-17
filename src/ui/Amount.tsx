import type { Money } from '@/domain/money'
import { decimalSeparator, formatMoney, moneyParts, symbolFirst } from '@/i18n/format'
import { t } from '@/i18n/strings'
import { cn } from '@/lib/cn'
import { useCurrency } from './currency'
import { useIsScreenEntering } from './screenEntry'
import { useCountUp } from './useCountUp'

export type AmountSize = 'hero' | 'hero-fit' | 'tile' | 'tile-fit' | 'body' | 'label'
export type AmountTone = 'default' | 'muted' | 'danger'

export type AmountProps = {
  value: Money
  size?: AmountSize
  /**
   * Renseigné, la valeur est traitée comme un flux : on affiche sa valeur
   * absolue, précédée de « + » pour une entrée. Une sortie ne porte pas de
   * signe, elle se lit à son contexte (DS §3).
   * Laissé vide, la valeur est un solde : le « − » est affiché.
   */
  direction?: 'in' | 'out'
  /** Affiche le « + » sur une valeur positive. Pour un écart, jamais un solde. */
  signed?: boolean
  tone?: AmountTone
  withCents?: boolean
  currency?: string
  className?: string
}

const SIZE_CLASS: Record<AmountSize, string> = {
  hero: 't-hero',
  'hero-fit': 't-hero-fit',
  tile: 't-tile-num',
  'tile-fit': 't-tile-fit',
  body: 't-num-body',
  label: 't-num-label',
}

/** Les centimes d'un chiffre héros passent à 0.5em (DS §3). */
const CENTS_EM: Record<AmountSize, string> = {
  hero: '0.5em',
  'hero-fit': '0.5em',
  tile: '1em',
  'tile-fit': '1em',
  body: '1em',
  label: '1em',
}

const TONE_CLASS: Record<AmountTone, string> = {
  default: 'text-text',
  muted: 'text-muted',
  danger: 'text-danger-text',
}

/**
 * Les tailles qui comptent au premier affichage d'un écran (DS §4).
 *
 * Les chiffres **dimensionnés par leur tuile**, et le héros — c'est-à-dire la
 * grille bento et elle seule. Le DS §1 dit pourquoi : « les grands nombres
 * portent la page », et la page qu'ils portent est le tableau de bord.
 *
 * `tile` en est exclue alors qu'elle fait la même taille que `tile-fit`, et
 * c'est volontaire : c'est la seule des six qui serve à tout, y compris à des
 * rangées de liste — une part par membre sur la répartition, une ligne par
 * crédit —, et à des formulaires où le chiffre se recalcule à mesure qu'on
 * tape. Quarante montants qui s'égrènent chacun pour son compte ne sont pas une
 * arrivée, c'est un scintillement ; et un chiffre qui compte pendant qu'on
 * remplit un champ est du bruit posé sur un geste. Aucune propriété du composant
 * ne distingue ces emplois-là d'un chiffre de tuile : la ligne se trace donc
 * là où elle est nette.
 */
const COUNTS_UP: Record<AmountSize, boolean> = {
  hero: true,
  'hero-fit': true,
  'tile-fit': true,
  tile: false,
  body: false,
  label: false,
}

/**
 * Le composant unique pour tout montant. Il porte seul le tabular-nums, le
 * symbole, les centimes réduits et le signe : aucun autre composant ne met
 * un montant en forme.
 *
 * Les six tailles ne diffèrent que par leur taille : la lettre — Archivo 700
 * élargie à 112 % — est la même partout, déclarée d'un seul bloc dans
 * `base.css`. Un montant de liste et un solde héros doivent se reconnaître
 * comme deux tailles du même chiffre, pas comme deux polices.
 *
 * C'est aussi lui qui porte le comptage du DS §4, et lui seul : il n'y a qu'un
 * endroit où un montant se met en forme, il n'y en a donc qu'un où il peut
 * s'animer. Le chiffre qui s'égrène est celui qu'on voit ; le nom accessible,
 * lui, dit tout de suite le montant du mois — les deux ne divergent que le
 * temps de l'animation, et jamais dans le sens où un lecteur d'écran
 * annoncerait un chiffre en route.
 */
export function Amount({
  value,
  size = 'body',
  direction,
  signed = false,
  tone = 'default',
  withCents = true,
  currency,
  className,
}: AmountProps) {
  const activeCurrency = useCurrency()
  const entering = useIsScreenEntering()
  const code = currency ?? activeCurrency
  const displayed = (direction ? Math.abs(value) : value) as Money
  /* `entering` est lu au montage et n'est plus relu : ce qui apparaît après
     l'arrivée de l'écran ne compte pas, et ce qui comptait déjà va au bout. */
  const counted = useCountUp(displayed, entering && COUNTS_UP[size]) as Money

  // Sans centimes, l'unité s'arrondit plutôt que de se tronquer (DS §3) : c'est
  // `moneyParts` qui le tient, pour le chiffre comme pour le nom accessible.
  const parts = moneyParts(counted, code, !withCents)
  /* Le signe se prend sur la valeur, jamais sur le compte en cours : à zéro,
     `moneyParts` n'en rend aucun, et un solde négatif perdrait son « − » le
     temps de l'animation pour le retrouver à l'arrivée. */
  const signParts = moneyParts(displayed, code, !withCents)
  const sign = direction === 'in' || (signed && displayed > 0) ? '+' : signParts.sign

  /* Le nom accessible sort de la valeur et non du compte. C'est la seule
     entorse à la règle du dessus, et elle va dans le bon sens : un lecteur
     d'écran annonce le montant du mois, pas l'image qu'un œil en a pendant six
     dixièmes de seconde. Lui faire lire une valeur en route serait annoncer un
     chiffre faux. */
  const spoken = `${sign === '+' ? '+' : ''}${formatMoney(displayed, code, withCents)}`
  const label =
    direction === 'out' ? `${t.direction.out.toLowerCase()} ${spoken}` : spoken

  const before = symbolFirst()
  const symbol = (
    <span
      aria-hidden="true"
      // L'atténuation du symbole est un token : une tuile dont la couleur de
      // texte n'a aucune marge de contraste la ramène à 1. Un montant déjà
      // atténué, lui, ne la subit pas du tout.
      className={before ? 'mr-[0.18em]' : 'ml-[0.18em]'}
      style={{
        /* La taille ne bouge pas, et c'est délibéré. Ce qui était faux, c'est
           l'**alignement** — voir le conteneur plus bas —, pas la réduction :
           un symbole un peu plus petit que son chiffre est un usage courant et
           lisible, tant qu'il repose sur la ligne de base.
           L'essai à la taille des centimes a été mesuré et rendu : à 1024
           points, « 3 655,85 € » débordait alors de 4px de la tuile Capacité
           d'épargne, coupé par son `overflow-hidden` — `e2e/mise-en-page` le
           relève, la sonde d'audit non, puisque le document, lui, ne déborde
           pas. Le gain d'un symbole plus grand ne valait pas un chiffre
           tranché. */
        fontSize: '0.55em',
        opacity: tone === 'default' ? 'var(--amount-symbol-opacity)' : 1,
      }}
    >
      {parts.symbol}
    </span>
  )

  return (
    <span
      /* `items-baseline`, et c'est tout le sujet du symbole monétaire.
         Aligné en tête de boîte — `items-start` — et réduit, il se rendait en
         **exposant** : « 4 435,54 ᵉ ». C'est un choix graphique, mais il ne
         survit à aucune des deux langues que l'app parle : ni « 4 435,54 € » ni
         « €4,435.54 » ne s'écrivent avec un symbole surélevé, et un montant est
         justement ce qu'on relit sans y penser. Sur la ligne de base, il reste
         plus petit que l'unité — la hiérarchie du chiffre est intacte — mais il
         est posé là où l'œil l'attend. */
      className={cn(
        'tnum inline-flex items-baseline',
        SIZE_CLASS[size],
        TONE_CLASS[tone],
        className,
      )}
    >
      {/* Le montant en toutes lettres, en texte et non en `aria-label` : cet
          attribut ne vaut que sur un élément qui porte un rôle, et un `span` nu
          n'en a aucun (ARIA 1.2). Les lecteurs d'écran qui appliquent la règle
          l'ignoraient donc — et comme tout le rendu visuel ci-dessous est en
          `aria-hidden`, il ne restait rien à annoncer : le montant passait
          muet. Un texte caché à l'œil se lit partout, sans rôle à inventer. */}
      <span className="sr-only-text">{label}</span>
      {/* Le symbole passe devant le chiffre en anglais — « €1,284.50 » — et le
          reste du rendu ne bouge pas d'un pixel : c'est le même élément, à la
          même taille réduite, avec sa marge du côté où il se trouve. La
          décision est prise par `format.ts` et non ici, comme le séparateur
          décimal juste en dessous : ce composant assemble, il ne tranche pas de
          règle de langue. */}
      {/* Le signe reste en tête, y compris quand le symbole passe devant lui.
          Il était posé avec le chiffre, ce qui rendait « € +7 891,00 » en
          anglais : le symbole, puis le signe, puis le nombre. On n'écrit pas
          « € +7,891.00 » mais « +€7,891.00 » — le signe qualifie le montant
          entier, symbole compris, et le glisser entre les deux le fait lire
          comme un opérateur.
          C'est déjà ce que rend `formatMoney`, donc ce que le lecteur d'écran
          annonçait pendant que l'œil lisait autre chose : les deux disent
          maintenant la même chose. En français le symbole ferme le montant, et
          rien ne bouge. */}
      {sign !== '' && <span aria-hidden="true">{sign}</span>}
      {before && symbol}
      <span aria-hidden="true">
        {parts.integer}
        {withCents && (
          <span style={{ fontSize: CENTS_EM[size] }}>
            {decimalSeparator()}
            {parts.fraction}
          </span>
        )}
      </span>
      {!before && symbol}
    </span>
  )
}
