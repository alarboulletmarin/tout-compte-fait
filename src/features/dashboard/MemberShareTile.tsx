import { SPLIT_PATH } from '@/app/routes'
import { addMonthsToYm } from '@/domain/date'
import { type Money, add } from '@/domain/money'
import { fr } from '@/i18n/fr'
import { de, formatMonthName, tpl } from '@/i18n/format'
import { useCurrentYm, useMemberCharges, useMemberFilter, useMemberMap } from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Eyebrow } from '@/ui/Eyebrow'
import { SplitIcon } from '@/ui/Icons'
import { Tile } from '@/ui/Tile'

/**
 * Un terme du calcul : ce qu'il vaut, et ce qu'il est.
 *
 * `signed` pour le report, `direction` pour la part : l'un est un écart dont le
 * signe est toute la lecture, l'autre un versement dont on lit le montant.
 */
function Line({ label, value, signed }: { label: string; value: Money; signed?: boolean }) {
  return (
    <li className="flex items-baseline gap-2">
      <span className="t-label min-w-0 flex-1 truncate">{label}</span>
      <Amount
        value={value}
        size="label"
        className="shrink-0"
        {...(signed === true ? { signed: true } : { direction: 'out' as const })}
      />
    </li>
  )
}

/**
 * Ce que la personne filtrée doit verser sur le pot commun — et, quand le
 * montant n'est pas sa seule part, l'addition qui le donne.
 *
 * La tuile sert un geste, et un seul : le virement du mois sur le compte joint.
 * Ce montant est donc le chiffre de tête, celui qu'on recopie dans une
 * application bancaire. **Tout le reste de la tuile n'existe que pour le
 * justifier**, et rien qui ne le justifie pas n'y a sa place.
 *
 * **L'anneau est parti, et c'est le sujet de cette version.** Il dessinait
 * 45,3 % — la part du pot commun que le prorata des revenus met sur cette
 * personne. Un anneau annonce « telle fraction de ce tout-là » ; or ce tout, le
 * total des charges communes du foyer, n'est pas sur la tuile, et à dessein :
 * c'est un chiffre qu'on ne doit pas. Restait une jauge sans son tout,
 * c'est-à-dire un pourcentage sans son « de quoi » — sur l'écran de tout le
 * monde la question ne se pose pas, la tuile Répartition découpe le pot entre
 * les personnes et le tout est sous les yeux ; sous un filtre par membre, elle
 * se posait et rien n'y répondait.
 *
 * **Le coefficient ne revient pas en toutes lettres pour autant.** Il ne
 * s'explique pas d'un mot posé à côté de lui : il sort du revenu de chacun
 * rapporté à la somme des revenus, et c'est cette division-là qu'il faut voir
 * pour l'admettre. L'écran Répartition la montre, ligne à ligne, à un doigt
 * d'ici — le prorata contre le revenu dont il vient. Un pourcentage qu'on ne
 * peut pas vérifier sur l'écran où il s'affiche n'est pas une explication, quel
 * que soit le mot qu'on lui accroche.
 *
 * **Le report du mois précédent rentre à sa place, et sa tuile disparaît.** Il
 * vivait à part parce que la ligne qu'il demandait ici passait à la ligne dans
 * une colonne de 222px — les 80px d'anneau plus la gouttière mangeaient la
 * moitié de la tuile. L'anneau parti, la colonne fait la largeur entière, et
 * l'objection tombe avec ce qui la causait. Le gain n'est pas de la place :
 * c'est que le chiffre de tête devient **vérifiable**. Il vaut la part du mois
 * plus le report, et la tuile affichait jusqu'ici trois montants dont aucun des
 * deux termes — « 1 788,96 € » se lisait au-dessus de « 37,97 € » et
 * « 1 697,80 € », qui ne le redonnent pas.
 *
 * **Sans report, il n'y a rien à additionner et la tuile ne dit que le
 * montant.** Sa part vaut alors le virement au centime : une ligne « sa part du
 * mois » y recopierait le chiffre de tête un cran plus bas, et deux fois le
 * même nombre à trois lignes d'écart se lit comme une erreur avant de se lire
 * comme une égalité.
 *
 * Elle s'efface dans les mêmes cas que sa jumelle Répartition — pas de filtre,
 * pas de prorata calculable (l'en-tête du mois nomme alors ce qui manque), ou
 * aucune charge commune à porter : une part de rien n'est pas une part.
 */
export function MemberShareTile() {
  const charges = useMemberCharges()
  const filter = useMemberFilter()
  const members = useMemberMap()
  const month = useCurrentYm()

  if (filter === undefined || charges === null || charges.commonTotal <= 0) return null

  const member = members.get(filter)
  /* Le virement se rattrape : celui qui a trop avancé le mois passé verse moins
     ce mois-ci, et l'autre un peu plus. Rien à rattraper, rien à dire — une
     ligne à zéro laisserait croire à une régularisation là où les comptes
     tombaient justes. */
  const settled = charges.adjustment !== 0
  const toPay = add(charges.common, charges.adjustment)
  const previous = de(formatMonthName(addMonthsToYm(month, -1)))

  return (
    /* **Le format suit le contenu, et ce contenu a deux tailles** (DS §5). Avec
       un report, la tuile porte un chiffre et l'addition qui le donne : deux
       rangées, qui se remplissent du calcul là où elles se remplissaient d'un
       anneau de 80px. Sans report, elle ne porte plus que son chiffre — une
       `4x2` y laisserait les quarante pixels de vide que le DS reproche
       précisément à une tuile de deux rangées sans visualisation, et c'est la
       tuile plate qui tient un eyebrow et un montant.

       Un lien et non un bouton, comme la Répartition : son contenu est une
       liste, et le nom unique d'un bouton effacerait les deux lignes qu'elle
       sépare exprès. Le lien couvre toute la tuile et le repère reste au coin,
       hors du flux. */
    <Tile
      span={settled ? '4x2' : '4x1'}
      className={settled ? 'gap-3' : 'justify-between'}
      /* Le nom du membre vit ici : rien dans le contenu ne le porte — il vient
         du filtre, que la tuile ne redit pas —, et un lecteur d'écran qui
         parcourt les régions d'une page les entend hors de leur voisinage. */
      label={tpl(fr.dashboard.memberShareOf, member?.name ?? '')}
      /* Le repère nu, sans nommer sa destination : « À VERSER SUR LE COMMUN »
         est l'eyebrow le plus long de la grille (~195px en mono 11px, sans
         césure possible) et « Répartition › » en demande 95 de plus, quand la
         tuile n'en offre que 288 sur un écran de 360. Les deux se croisaient.
         `SplitTile` passe déjà son repère nu, pour la même raison. Le nom du
         lien, lui, est entier : il ne coûte aucun pixel. */
      link={{ to: SPLIT_PATH, label: fr.dashboard.showMemberShare }}
    >
      {/* L'eyebrow nomme le chiffre, au lieu qu'un libellé le refasse juste
          au-dessus : la tuile portait cinq éléments là où le DS §5 en autorise
          quatre, et les trente pixels de trop se coupaient en haut comme en
          bas. */}
      <Eyebrow icon={SplitIcon}>{fr.dashboard.memberShare}</Eyebrow>
      {settled ? (
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-1">
          <Amount value={toPay} size="tile-fit" direction="out" />
          {/* Les deux termes, dans l'ordre où l'addition se fait, sous le
              chiffre qu'ils redonnent. C'est tout ce que la tuile a à dire de
              plus que son montant. */}
          <ul className="flex flex-col gap-1 border-t border-border pt-2">
            <Line label={fr.dashboard.memberShareCommon} value={charges.common} />
            <Line
              label={tpl(fr.dashboard.settlementOf, previous)}
              value={charges.adjustment}
              signed
            />
          </ul>
        </div>
      ) : (
        <Amount value={toPay} size="tile-fit" direction="out" />
      )}
    </Tile>
  )
}
