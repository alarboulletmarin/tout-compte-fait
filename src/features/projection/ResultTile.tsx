/* ============================================================================
 * La réponse, avant la question — et c'est le renversement qui tient tout
 * l'écran.
 *
 * L'ordre était : explication, paramètres, taux, inflation, résultat, jalons. Il
 * fallait donc traverser presque tout l'écran pour trouver « ≈ 14 k€ », qui est
 * pourtant la seule chose qu'on vient y chercher. On n'ouvre pas /projections
 * pour remplir un formulaire, on l'ouvre pour savoir où l'on arrive : le
 * résultat passe donc en tête, et les paramètres derrière lui — ils servent à
 * l'ajuster, pas à y accéder.
 *
 * **Un chiffre, puis sa décomposition, puis ses hypothèses.** Le capital projeté
 * est trois choses — ce qu'il y avait, ce qu'on a mis, ce que le taux a ajouté —
 * et un nombre seul les confond : « ≈ 14 000 € » impressionne, « 12 000 €
 * versés et 1 900 € de rendement » informe. C'est ce qui rend inutile la tuile
 * « ce que le taux aura produit », qui vivait tout en bas et disait la moitié de
 * cette phrase-là.
 *
 * **Le mode inverse inverse aussi le héros.** Sa réponse est un versement, pas
 * un capital : c'est lui qui prend la grande taille, et la cible passe en
 * surtitre. Afficher le capital d'arrivée en gros y serait redondant — c'est le
 * chiffre qu'on vient de taper.
 * ==========================================================================*/

import { type Money, ZERO } from '@/domain/money'
import { formatMoney, formatPercent, formatRoundedMoney, tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'
import { Eyebrow } from '@/ui/Eyebrow'
import { Tile } from '@/ui/Tile'
import { useCurrency } from '@/ui/currency'
import type { Breakdown } from './model'

export type ResultTileProps = {
  /** Le surtitre : « Dans 10 ans », ou « Pour atteindre 50 000 € dans 10 ans ». */
  heading: string
  /** Le chiffre héros, déjà mis en forme — un capital, ou un versement mensuel. */
  hero: string
  /** La décomposition du capital d'arrivée. */
  breakdown: Breakdown
  /** Les hypothèses en une ligne : « Simulation avec 100 €/mois · 3 %/an ». */
  basis: string
  /** Vrai en mode inverse : la décomposition se lit alors sans part de rendement. */
  target: boolean
  /**
   * D'où sortent les deux lignes du milieu : « 616 €/mois pendant 10 ans » et
   * « 3 %/an, composé chaque mois ». Elles répondent à la question que le
   * chiffre seul fait poser — « les versements, c'est le total sur dix ans, ça ? »
   */
  paidFrom: string
  interestFrom: string
  /**
   * Le portefeuille sous les seconds taux, quand au moins un compte en porte
   * un. `null` — le cas par défaut — ne montre rien : l'écran rend un chiffre,
   * et une fourchette n'apparaît que si quelqu'un l'a demandée.
   */
  compared: { total: string; gap: string } | null
  /**
   * La lecture en euros d'aujourd'hui, quand elle est active. Elle vit **ici**,
   * avec les chiffres qu'elle change, et non plus sous le graphique : 616 €/mois
   * pendant dix ans font 74 k€, l'écran en annonce 67, et sans cette phrase à
   * côté l'écart est inexplicable.
   */
  deflated: string | null
}

export function ResultTile({
  heading,
  hero,
  breakdown,
  basis,
  target,
  paidFrom,
  interestFrom,
  compared,
  deflated,
}: ResultTileProps) {
  const currency = useCurrency()
  const money = (value: Money): string => formatRoundedMoney(value, currency)
  const approx = (value: Money): string => tpl(projection.approx, money(value))

  /* Les quatre lignes de la décomposition. Le capital de départ ne s'affiche
     qu'à partir du moment où il existe : une ligne « 0 € » posée en tête d'un
     tableau de quatre en fait une sur quatre qui ne dit rien.
     Il est aussi le seul à s'écrire **exactement**, et sans « ≈ » : c'est ce
     qu'on a aujourd'hui, pas ce que le modèle en fait. Écrire « ≈ 24 k€ » sous
     un panneau qui vient d'annoncer « 23 600 € » donnerait deux réponses à la
     même question, à trois centimètres d'écart. Le « ≈ » commence là où le
     calcul commence — à la première capitalisation. */
  const rows: {
    label: string
    value: Money
    from?: string
    exact?: boolean
    strong?: boolean
  }[] = [
    ...(breakdown.initial === ZERO
      ? []
      : [
          {
            label: projection.breakdownInitial,
            value: breakdown.initial,
            from: projection.breakdownInitialFrom,
            exact: true,
          },
        ]),
    { label: projection.breakdownPaid, value: breakdown.paid, from: paidFrom },
    { label: projection.breakdownInterest, value: breakdown.interest, from: interestFrom },
    { label: projection.breakdownTotal, value: breakdown.total, strong: true },
  ]

  return (
    <Tile className="gap-4">
      <div className="flex flex-col gap-1">
        <Eyebrow>{heading}</Eyebrow>
        {/* `t-hero-fit` plutôt que `t-hero` : « ≈ 1,2 M€ » sur cinquante ans
            déborde d'une colonne de téléphone à la taille pleine. */}
        <p className="t-hero-fit tnum">{hero}</p>
        {/* La décomposition en une ligne, sous le chiffre : c'est elle qu'on lit
            en trois secondes, quand le tableau plus bas est pour qui veut les
            quatre nombres. */}
        {!target && (
          <p className="t-label">
            {tpl(projection.resultSplit, approx(breakdown.paid), approx(breakdown.interest))}
          </p>
        )}
      </div>

      <dl className="flex flex-col gap-3 border-t border-border pt-4">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5">
            <div className="flex items-baseline justify-between gap-3">
              <dt className={row.strong === true ? 't-body text-text' : 't-body'}>{row.label}</dt>
              <dd className="t-num-body tnum shrink-0">
                {row.exact === true ? formatMoney(row.value, currency, false) : approx(row.value)}
              </dd>
            </div>
            {/* D'où sort la ligne, sous la ligne. Le total n'en a pas : il est
                la somme des trois au-dessus, et le dire serait le répéter. */}
            {row.from !== undefined && <p className="t-label">{row.from}</p>}
          </div>
        ))}
      </dl>

      {/* Avec les chiffres qu'elle change, et pas trois cadres plus bas : sans
          elle, 616 €/mois pendant dix ans qui donnent 67 k€ et non 74 sont
          inexplicables. */}
      {deflated !== null && <p className="t-label">{deflated}</p>}

      {/* La fourchette, quand un compte porte un second taux. Sous la
          décomposition et non à sa place : le chiffre héros reste **un**
          chiffre — celui des taux posés —, et la comparaison est une lecture de
          plus, pas une seconde vérité qui viendrait le remplacer.
          Un cadre plutôt qu'une ligne : c'est une autre projection, et la poser
          au fil des autres phrases la ferait lire comme une précision sur
          celle du dessus. */}
      {compared !== null && (
        <div className="flex flex-col gap-0.5 border-t border-border pt-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="t-body min-w-0 flex-1 truncate">{projection.comparedHeading}</span>
            <span className="t-num-body tnum shrink-0">{compared.total}</span>
          </div>
          <p className="t-label">{compared.gap}</p>
        </div>
      )}

      {/* Ce que le rendement pèse dans l'arrivée — la lecture qui donne son sens
          au chiffre, et que rien d'autre ne donne. Muette quand il n'y a rien à
          rapporter : une part de zéro n'est pas zéro pour cent. */}
      {breakdown.share !== null && breakdown.interest > 0 && (
        <p className="t-label">{tpl(projection.interestShare, formatPercent(breakdown.share))}</p>
      )}

      <p className="t-label">{basis}</p>
      {/* La réserve, sous le résultat et jamais ailleurs : c'est le seul endroit
          où elle est lue au moment où elle sert. Elle ne se replie pas. */}
      <p className="t-label">{projection.caveat}</p>
    </Tile>
  )
}
