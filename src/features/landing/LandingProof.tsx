import { type Money, add, sum } from '@/domain/money'
import { t } from '@/i18n/strings'
import { formatMoney, formatPercent, formatSignedMoney, tpl } from '@/i18n/format'
import { landing } from '@/i18n/landing'
import { Amount } from '@/ui/Amount'
import { Dot } from '@/ui/Dot'
import { Eyebrow } from '@/ui/Eyebrow'
import { SavingsIcon, SplitIcon } from '@/ui/Icons'
import { Tile } from '@/ui/Tile'
import { useCurrency } from '@/ui/currency'
import { SAMPLE } from './sample'

/** Ce que verse un membre : sa part du mois, corrigée du report. */
function toPay(share: (typeof SAMPLE.shares)[number]): Money {
  return add(share.due, share.adjustment)
}

/**
 * Le calcul que la page racontait sans jamais le montrer.
 *
 * La grille bento démontre **un** écran : le mois. Ce qui distingue vraiment
 * l'app — la répartition au prorata, la régularisation du mois suivant, la
 * cascade de la capacité d'épargne — n'existait au-dessus qu'en prose, dans
 * `landing.splitBody` et `landing.kindsBody`. C'est le meilleur argument du
 * produit, et il était raconté au lieu d'être montré.
 *
 * Les deux tuiles reprennent les composants et le vocabulaire des vrais
 * écrans, comme `LandingTiles` reprend ceux du tableau de bord : `SplitPage`
 * pour la répartition, jusqu'à sa ligne de vérification ; le bloc `Capacity`
 * de `SavingsPage` pour la cascade. Le DS §1 interdit l'illustration — une page
 * de présentation ne montre pas des captures, elle *est* l'app.
 *
 * **Hors de la grille bento, et c'est délibéré.** Le DS §5 plafonne une tuile
 * de bento à un eyebrow, un chiffre, une lecture secondaire et une
 * visualisation : sept lignes de calcul n'entrent dans aucune des quatre cases.
 * Ces tuiles-ci vivent dans leur propre grille, comme celles de `LandingDoors`,
 * et prennent la hauteur qu'elles demandent.
 *
 * **Après les principes, et pas avant.** La grille dit de quoi l'app a l'air,
 * les principes disent ce qu'elle fait, ceci le prouve. Un calcul posé avant
 * qu'on ait dit ce qu'il calcule ne prouve rien — et `splitBody`, qui promet
 * une ligne au-dessus que « la somme des parts vaut exactement le total », a
 * désormais sa démonstration à portée d'œil.
 */
export function LandingProof() {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 className="t-section">{landing.proof}</h2>
        <p className="t-label max-w-prose">{landing.proofBody}</p>
      </div>

      {/* `lg:items-start` : la répartition demande deux fois la hauteur de la
          cascade, et deux tuiles étirées à la même laisseraient un tiers de la
          seconde vide. Une tuile qui prend sa hauteur ne se remarque pas ; un
          aplat vide, si. */}
      <div className="cols">
        <SplitProof />
        <CapacityProof />
      </div>
    </section>
  )
}

/**
 * La répartition, ligne à ligne, et sa vérification à zéro.
 *
 * C'est `SplitPage` en condensé : le pot commun, la part de chacun au prorata
 * de son revenu, le report du mois précédent, et le total des versements posé
 * à côté du total des charges. Les deux sont égaux au centime — c'est ce que
 * garantit la répartition aux plus forts restes, et le montrer vaut mieux que
 * de l'affirmer. C'est aussi ce qui rend un partage acceptable entre deux
 * personnes, donc la seule chose que cette page avait à démontrer ici.
 *
 * La régularisation n'est pas un décor de démonstration : c'est la moitié de
 * la promesse de `landing.splitBody`, et celle qui ne se lisait nulle part.
 * Les deux reports s'annulent d'un membre à l'autre, si bien que la
 * vérification reste vraie au centime — sans quoi elle ne prouverait rien.
 */
function SplitProof() {
  const currency = useCurrency()

  /* Celui dont le report est négatif est celui qui a avancé : il porte déjà sa
     part, on ne lui rend que celle de l'autre. Lu depuis les chiffres plutôt
     que nommé à côté d'eux — un prénom recopié dans la phrase se retrouve un
     jour à désigner l'autre membre. */
  const advancer = SAMPLE.shares.find((share) => share.adjustment < 0)

  return (
    <Tile className="gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <Eyebrow icon={SplitIcon}>{t.split.title}</Eyebrow>
        <Amount value={SAMPLE.shared} size="body" direction="out" />
      </div>
      <p className="t-label">{t.split.subtitle}</p>
      {/* Avant les lignes, et non après : sans elle, les deux reports qui
          s'annulent passent pour une correction inexpliquée, et on ne comprend
          ce qu'on vient de lire qu'une fois arrivé en bas. */}
      {advancer !== undefined && (
        <p className="t-label">
          {tpl(landing.advanced, advancer.label, formatMoney(SAMPLE.advanced, currency))}
        </p>
      )}

      <ul className="flex flex-col">
        {SAMPLE.shares.map((share) => (
          <li key={share.id} className="flex flex-col gap-1 border-t border-border py-3">
            <div className="flex items-center gap-2">
              <Dot color={share.color} />
              <span className="t-body min-w-0 flex-1 truncate font-medium">{share.label}</span>
              {/* Le prorata, à côté du revenu dont il sort : le pourcentage seul
                  est ce que la grille bento montrait déjà, et il ne dit pas d'où
                  il vient. */}
              <span className="t-axis tnum shrink-0">{formatPercent(share.percent / 100)}</span>
            </div>

            {/* Les libellés passent à la ligne, ils ne se tronquent pas :
                « Régularisation du mois dernier » demande 198px de mono 11px et
                la tuile n'en offre que 248 à 320px, symbole compris. Coupée à
                « Régularisation du mois der… », la ligne qui porte l'argument
                de la tuile cessait d'en porter un — et le DS §5 tranche le cas :
                c'est au format d'être choisi pour le libellé, jamais au libellé
                d'être raboté pour le format. Ici le format est une tuile de
                prose, qui prend la hauteur qu'on lui demande. */}
            <div className="flex items-baseline justify-between gap-3">
              <span className="t-axis min-w-0">{t.split.income}</span>
              <span className="t-axis tnum shrink-0">
                {formatMoney(share.income, currency, false)}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="t-axis min-w-0">{t.split.settlementShare}</span>
              <span className="t-axis tnum shrink-0">{formatMoney(share.due, currency)}</span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="t-axis min-w-0">{landing.settlement}</span>
              {/* Signé, et sans `direction` : ce n'est pas un flux dont on lirait
                  la valeur absolue, c'est un écart dont le signe est toute la
                  lecture — la règle qu'applique déjà `MemberShareTile`. */}
              <span className="t-axis tnum shrink-0">
                {formatSignedMoney(share.adjustment, currency)}
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="t-label">{t.split.due}</span>
              <Amount value={toPay(share)} size="body" direction="out" />
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 border-t border-border pt-3">
        <span className="t-body">{t.split.checkTotal}</span>
        {/* Le total des versements, report compris — et non la somme des parts
            avant report, qui vaudrait le même chiffre pour une raison plus
            faible. C'est la ligne entière qui est l'argument. */}
        <Amount value={sum(SAMPLE.shares.map(toPay))} size="body" direction="out" />
      </div>
      <p className="t-label">{t.split.checkHint}</p>
    </Tile>
  )
}

/**
 * La cascade de la capacité d'épargne — le bloc `Capacity` de `SavingsPage`.
 *
 * Le résultat seul se croit sur parole. Les trois lignes qui le produisent se
 * vérifient, et disent surtout ce que la grille bento ne peut pas dire : un
 * crédit qui mange près du quart de ce que le mois dégage ne se voit qu'ici, la
 * tuile « Prévu, puis confirmé » le fond dans son total.
 *
 * **Sans `variant="accent"`.** La page n'a qu'une tuile accentuée — « Rien ne
 * sort d'ici », dans la grille au-dessus —, et le lime est la marque (DS §1) :
 * elle se pose sur ce qui distingue l'app, une fois. `SavingsPage` peut
 * l'accentuer parce que c'est le chiffre de tête de son écran ; ici ce n'en est
 * pas un, et deux aplats de marque sur une même page n'en font plus aucun.
 */
function CapacityProof() {
  return (
    <Tile className="gap-3">
      <Eyebrow icon={SavingsIcon}>{t.savings.capacity}</Eyebrow>
      <Amount value={SAMPLE.savingCapacity} size="tile" />
      {/* La formule plutôt que l'horizon : c'est la lecture secondaire de la
          vraie tuile du mois, et celle des deux qui annonce la cascade posée
          juste dessous. */}
      <span className="t-label">{t.dashboard.capacityHint}</span>

      <ul className="mt-1 flex flex-col gap-1.5 border-t border-border pt-3">
        <Term label={t.savings.flowIncome} value={SAMPLE.income} direction="in" />
        <Term label={t.savings.flowCharges} value={SAMPLE.charges} direction="out" />
        <Term label={t.savings.flowDebts} value={SAMPLE.debtMonthly} direction="out" />
      </ul>

      <p className="t-label">{landing.capacityBody}</p>
    </Tile>
  )
}

/** Une ligne de la cascade : son terme, et ce qu'il pèse. Comme `SavingsPage`. */
function Term({
  label,
  value,
  direction,
}: {
  label: string
  value: Money
  direction: 'in' | 'out'
}) {
  return (
    <li className="flex items-baseline gap-3">
      <span className="t-label min-w-0 flex-1 truncate">{label}</span>
      <Amount value={value} size="body" direction={direction} className="shrink-0" />
    </li>
  )
}
