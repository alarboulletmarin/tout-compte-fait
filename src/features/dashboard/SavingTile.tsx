import { useNavigate } from 'react-router-dom'
import { SAVINGS_PATH } from '@/app/routes'
import { ZERO, abs } from '@/domain/money'
import { savingCapacity, savingLeft } from '@/domain/stats'
import { fr } from '@/i18n/fr'
import { formatMoney, tpl } from '@/i18n/format'
import { useKindTotals } from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Eyebrow } from '@/ui/Eyebrow'
import { SavingsIcon } from '@/ui/Icons'
import { Ring } from '@/ui/Ring'
import { Tile } from '@/ui/Tile'
import { useCurrency } from '@/ui/currency'

/**
 * Capacité d'épargne : ressources − charges − crédits, donc avant versements.
 *
 * C'est ce que le solde du mois ne dit pas. Lui compte un versement comme une
 * sortie — exact en trésorerie — si bien qu'un mois où l'on met 300 € de côté
 * se lit comme un mois où l'on a dépensé 300 € de plus.
 *
 * Le chiffre est celui du mois entier, échéances prévues comprises, comme les
 * tuiles Revenus et Charges dont il est exactement la soustraction. Lu au seul
 * confirmé — ce qu'il faisait — il annonçait presque zéro un 3 du mois, et ne
 * valait pas la différence des deux tuiles posées trois cases plus haut : deux
 * chiffres voisins qui ne se recomposent pas se lisent comme une erreur.
 *
 * Elle mène à l'écran de l'épargne plutôt qu'à une feuille qui la définit,
 * comme la Répartition mène au partage : devant « Capacité : 1 100 € », la
 * question suivante n'est pas « qu'est-ce qu'une capacité » mais « où je la
 * place, et combien m'en reste-t-il ». La feuille répondait à l'autre.
 *
 * **Sa seconde lecture porte deux clauses, et les deux au même horizon que le
 * chiffre.** Ce qui est versé et ce qu'il reste à placer sont les deux moitiés
 * de la capacité : posés à côté d'elle, ils doivent la redonner, sinon la tuile
 * se lit comme une erreur de calcul. Ce qui interdit de dire le versement au
 * seul confirmé, si tentant que ce soit — le mois entier compte alors dans
 * deux des trois chiffres, et il manque à l'écran ce qui est programmé sans
 * être parti. L'écran de l'épargne, qui compte le mois entier lui aussi, dirait
 * de surcroît un autre montant sous le même mot.
 *
 * Le versement se dit avec ou sans filtre. Il ne se disait que filtré, au motif
 * qu'une somme d'épargnes individuelles ne décide de rien : ça vaut pour le
 * reste à placer, qui appelle un geste et se décide sur un compte à la fois,
 * pas pour un constat — l'écran de l'épargne additionne d'ailleurs déjà les
 * versements du foyer. Hors filtre et sur un téléphone, le mois ne disait donc
 * nulle part ce qu'il avait mis de côté, quand son solde comptait le versement
 * comme une dépense.
 *
 * Les deux clauses s'affichent désormais **toutes les deux, à toutes les
 * largeurs**, l'une sous l'autre. Elles se partageaient la ligne du bas d'une
 * tuile plate et n'y tenaient pas ensemble : chacune avait donc son seuil, et
 * il existait des largeurs où l'une des deux moitiés du chiffre manquait à
 * l'écran. Deux rangées de hauteur règlent ce que deux seuils ne réglaient pas.
 *
 * **Elle ne montre toujours aucun patrimoine, et c'est délibéré.** Le tableau de
 * bord est un tableau de bord de *flux* : ce que le mois fait rentrer, ce qu'il
 * fait payer, ce qu'il dégage. Ce que l'épargne *vaut* est une autre question,
 * qui ne change pas d'un mois à l'autre au rythme des échéances — elle vit sur
 * l'écran qu'ouvre cette tuile, et une seconde grosse section patrimoniale ici
 * ferait lire deux chiffres sans rapport sous la même grille. Le « versé »
 * ci-dessous vient des `Entry` liées aux supports : exactement celles que
 * l'écran d'épargne ventile, au centime.
 */
export function SavingTile() {
  const totals = useKindTotals(true)
  const currency = useCurrency()
  const navigate = useNavigate()

  const capacity = savingCapacity(totals)
  const left = savingLeft(totals)

  /* L'épargne se compte en net : une reprise — l'assurance de l'année payée
     depuis le livret — la fait passer sous zéro, et le montant se nomme alors
     pour ce qu'il est. À zéro, rien : une lecture sans réponse vaut mieux
     absente que fausse. */
  const placedHint =
    totals.saving === ZERO
      ? null
      : totals.saving > ZERO
        ? tpl(fr.dashboard.savingPlaced, formatMoney(totals.saving, currency))
        : tpl(fr.dashboard.savingWithdrawn, formatMoney(abs(totals.saving), currency))

  /* Le dépassement n'est pas un reste : placer plus qu'on ne dégage est une
     information, et « reste −57 € » n'en serait pas une. */
  const leftHint =
    left < 0
      ? tpl(fr.savings.overHint, formatMoney(abs(left), currency))
      : tpl(fr.dashboard.savingLeft, formatMoney(left, currency))

  /* La part de la capacité déjà placée : c'est ce que l'anneau dessine, et
     c'est la question qu'on se pose devant ce chiffre — « combien j'ai déjà
     mis de côté sur ce que le mois dégage ». `Ring` borne lui-même entre 0 et
     1, ce qui range aussi bien le mois où l'on place plus que la capacité que
     celui où l'on reprend. */
  const placedShare = capacity > 0 && totals.saving > ZERO ? totals.saving / capacity : 0

  return (
    /* **`2x2`, et non plus `4x1`.** Elle portait deux clauses et un chiffre
       dans les 56px utiles d'une tuile plate, où l'étiquette et le nombre en
       prennent déjà 52 : les deux lectures se disputaient la ligne du bas et
       s'affichaient à tour de rôle, chacune derrière son seuil. Sur deux
       rangées elles se posent l'une sous l'autre et se lisent toutes les deux,
       à toutes les largeurs.
       La hauteur se remplit parce qu'un anneau l'accompagne, comme sur les deux
       autres `2x2` de la grille — sans lui, une tuile de cette taille qui ne
       porte que du texte laisse un vide de quarante pixels, ce que le format
       « crédits » démontrait juste à côté. Le gabarit est celui du solde : le
       chiffre sur sa ligne, l'anneau de 48px sous lui avec la lecture à côté.
       Les 80px des donuts voisins ne conviendraient pas — ils ne laissent que
       89px de colonne à 1024px, où « 1 717,05 € » en demande 128. */
    <Tile
      span="2x2"
      className="justify-between"
      onClick={() => {
        void navigate(SAVINGS_PATH)
      }}
      label={tpl(fr.dashboard.showSavings, fr.dashboard.capacity)}
      /* Repère nu, sans nommer l'écran d'arrivée : « CAPACITÉ D'ÉPARGNE » est
         l'étiquette la plus longue de la grille, et une `2x2` n'offre que 185px
         à 1024px. « Épargne › » en demandait soixante de plus et passait par
         dessus. `SplitTile` et `MemberShareTile` passent le leur nu pour la même
         raison exactement. */
      affordance={{ kind: 'navigate' }}
    >
      <Eyebrow icon={SavingsIcon}>{fr.dashboard.capacity}</Eyebrow>
      <div className="flex flex-col gap-1">
        {/* L'anneau contre le chiffre, et les deux clauses sur toute la largeur
            dessous. Posées *à côté* de l'anneau elles n'avaient plus que 129px
            à 1024px et se coupaient toutes les deux en deux lignes ; ici elles
            disposent des 185px entiers et tiennent chacune sur la sienne.
            L'anneau, lui, se contente des 48px qu'un chiffre laisse à côté de
            lui — les 80px des donuts voisins ne laisseraient pas la place au
            montant. */}
        <div className="flex min-w-0 items-center gap-2">
          <Ring
            size={48}
            thickness={8}
            value={placedShare}
            label={fr.dashboard.capacity}
            className="shrink-0"
          />
          <Amount value={capacity} size="tile-fit" tone={capacity < 0 ? 'danger' : 'default'} />
        </div>
        {/* Les deux clauses, chacune sur sa ligne et sans seuil : ce sont les
            deux moitiés de la capacité, elles doivent la redonner, et trois
            chiffres dont deux s'affichent à tour de rôle se lisent comme une
            erreur de calcul. C'est ce que la rangée simple ne permettait pas. */}
        {placedHint !== null && <span className="t-label">{placedHint}</span>}
        <span className="t-label">{leftHint}</span>
      </div>
    </Tile>
  )
}
