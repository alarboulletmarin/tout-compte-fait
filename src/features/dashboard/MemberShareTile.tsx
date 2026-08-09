import { SPLIT_PATH } from '@/app/routes'
import { addMonthsToYm } from '@/domain/date'
import { add, sub } from '@/domain/money'
import { t } from '@/i18n/strings'
import { de, formatMoney, formatMonthName, formatSignedMoney, tpl } from '@/i18n/format'
import { useCurrentYm, useMemberCharges, useMemberFilter, useMemberMap } from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Eyebrow } from '@/ui/Eyebrow'
import { SplitIcon } from '@/ui/Icons'
import { Tile } from '@/ui/Tile'
import { useCurrency } from '@/ui/currency'

/**
 * Ce que la personne filtrée doit verser sur le pot commun — et rien d'autre.
 *
 * La tuile sert un geste, et un seul : le virement du mois sur le compte joint.
 * Ce montant est donc le chiffre de tête, en corps de tuile. Le total des
 * charges communes du foyer n'y est pas — c'est un chiffre qu'on ne doit pas,
 * et l'écran Répartition l'ouvre déjà en détail à un doigt d'ici.
 *
 * **Elle portait deux montants qui n'étaient pas des virements**, « Charges
 * perso » et « Total à payer », et c'est l'incohérence qu'elle répare. Un coût
 * est arrêté au mois où la dépense a eu lieu ; un virement se rattrape (cahier
 * §4.7 ter). Le report entrait donc dans le chiffre de tête et pas dans les deux
 * lignes en dessous, si bien qu'un « Total à payer » s'affichait **plus petit**
 * que le « À verser » posé juste au-dessus, dans une carte dont le seul métier
 * est le virement. Et ce total recopiait au centime la tuile Charges de la même
 * page : un doublon et une contradiction pour deux lignes. Le coût du mois a sa
 * tuile — `MemberChargesTile` —, qui l'éclate en perso et part du commun.
 *
 * **À la place, la tuile pose le calcul de son propre chiffre**, dans les mots
 * et l'ordre de `ShareRow` : sa part du mois, plus la régularisation, égale ce
 * qu'elle verse. Le report avait sa tuile à lui, où il se lisait une seconde
 * fois alors qu'il était déjà compris — silencieusement — dans le chiffre de
 * tête : rien ne disait que les deux montants voisins ne s'ajoutaient pas. Ce
 * n'est pas un cinquième élément (DS §5) mais la **composition du chiffre**, à
 * l'intérieur de sa lecture secondaire.
 *
 * **L'anneau est parti, et c'est ce qui reste à dire.** Il dessinait 45,3 % — la
 * part du pot commun que le prorata des revenus met sur cette personne. Or un
 * anneau annonce *une fraction d'un tout*, et ce tout, le total des charges
 * communes du foyer, n'est pas sur la tuile : c'est le premier paragraphe de ce
 * commentaire, et c'est délibéré. Restait une jauge sans son tout, c'est-à-dire
 * un pourcentage sans son « de quoi ». Sur l'écran de tout le monde la question
 * ne se pose pas — la tuile Répartition découpe le pot entre les personnes, et
 * le tout est sous les yeux ; sous un filtre par membre, elle se posait et rien
 * à l'écran n'y répondait.
 *
 * **La règle vise cet anneau-ci, pas les anneaux**, et `MemberChargesTile` en
 * porte un juste à côté sans rien enfreindre : le sien découpe un total qui est
 * au centre du cercle, et ses deux parts se lisent contre lui. Un anneau dont le
 * tout est à l'écran explique ; un anneau dont le tout est ailleurs décore.
 *
 * **Le coefficient ne revient pas en toutes lettres pour autant.** Il ne
 * s'explique pas d'un mot posé à côté de lui : il sort du revenu de chacun
 * rapporté à la somme des revenus, et c'est cette division-là qu'il faut voir
 * pour l'admettre. L'écran Répartition la montre, ligne à ligne, à un doigt
 * d'ici — le prorata contre le revenu dont il vient. Un pourcentage qu'on ne
 * peut pas vérifier sur l'écran où il s'affiche n'explique rien, quel que soit
 * le mot qu'on lui accroche.
 *
 * Les deux lignes ne s'affichent que s'il y a un report — la règle de
 * `ShareRow`, pour la même raison : sans lui, « Sa part du mois » recopierait à
 * l'identique le chiffre de tête, et une régularisation à zéro laisserait croire
 * à un rattrapage là où les comptes tombaient justes.
 *
 * Elle s'efface sans filtre et sans prorata calculable — l'en-tête du mois nomme
 * alors ce qui manque. Elle reste, en revanche, quand le mois n'a **aucune**
 * charge commune mais qu'un report attend : c'est exactement le cas où le
 * virement n'est plus que le report, et le taire le ferait disparaître de
 * l'écran le jour où il est la seule chose à faire.
 */
export function MemberShareTile() {
  const charges = useMemberCharges()
  const filter = useMemberFilter()
  const members = useMemberMap()
  const month = useCurrentYm()
  const currency = useCurrency()

  // Ni part à verser ni report à rattraper : il n'y a pas de virement, et une
  // tuile à zéro le dirait moins bien que son absence.
  if (filter === undefined || charges === null) return null
  if (charges.commonTotal <= 0 && charges.adjustment === 0) return null

  const member = members.get(filter)
  /* Les trois termes du virement, et rien d'autre.

     La part **qui coûte** en premier : c'est le montant que la tuile « Perso et
     commun » annonce, au centime, et c'est ce qui les rend enfin lisibles
     ensemble. Elles portaient jusqu'ici deux libellés presque identiques sur
     deux montants à vingt-cinq euros l'un de l'autre — « Sa part du mois »
     1 659,83 € ici, « Part du commun » 1 634,45 € à côté —, sans que rien à
     l'écran ne dise lequel était lequel ni pourquoi.

     Puis ce qui les séparait, qui a maintenant sa ligne : la mensualité d'une
     avance, de nature épargne donc hors de tout total de charges, et pourtant
     due — le foyer rembourse qui a réglé une dépense commune depuis son
     épargne.

     Puis le report, qui se rattrape : celui qui a trop avancé le mois passé
     verse moins ce mois-ci, et l'autre un peu plus. */
  const refund = sub(charges.common, add(charges.commonCharge, charges.commonDebt))
  const spending = sub(charges.common, refund)
  const settled = charges.adjustment !== 0 || refund !== 0
  const toPay = add(charges.common, charges.adjustment)
  const previous = de(formatMonthName(addMonthsToYm(month, -1)))

  /* Le montant du virement, en corps de tuile : c'est la réponse, et on vient
     la recopier dans une application bancaire.

     Une sortie tant que c'en est une, et un solde sinon : le mois sans charge
     commune ne laisse que le report, et celui qui a tout avancé le mois d'avant
     reçoit alors au lieu de verser. `direction` afficherait la valeur absolue et
     la ferait annoncer « sortie » — donc « 282,56 € à verser » à qui on doit
     cette somme. */
  const amount = (
    <Amount value={toPay} size="tile-fit" {...(toPay < 0 ? {} : { direction: 'out' as const })} />
  )

  return (
    /* **Le format suit le contenu, et ce contenu a deux tailles** (DS §5). Avec
       un report, la tuile porte un chiffre et l'addition qui le donne : deux
       rangées, qui se remplissent du calcul là où elles se remplissaient d'un
       anneau de 80px. Sans report, elle ne porte plus que son chiffre — et une
       `4x2` y laisserait exactement les quarante pixels de vide que le DS
       reproche à une tuile de deux rangées sans visualisation. C'est alors la
       tuile plate, qui tient un eyebrow et un montant.

       `4x1` et non `2x1` : l'eyebrow fait vingt et un caractères, quand une
       demi-colonne en accepte treize.

       Un lien et non un bouton, comme la Répartition : son contenu porte une
       liste, et le nom unique d'un bouton effaçait les deux montants qu'elle
       sépare exprès. Le lien couvre toute la tuile et le repère reste au coin,
       hors du flux — c'est ce qui lui permet de ne rien coûter aux 148px de
       contenu, qui sont comptés. */
    <Tile
      span={settled ? '4x2' : '4x1'}
      className={settled ? 'gap-3' : 'justify-between'}
      /* Le nom du membre nomme la région : rien dans le contenu ne le porte —
         il vient du filtre, que la tuile ne redit pas —, et il vivait jusqu'ici
         dans la lecture parlée de l'anneau, partie avec lui. Un lecteur d'écran
         parcourt les régions d'une page hors de leur voisinage. */
      label={tpl(t.dashboard.memberShareOf, member?.name ?? '')}
      /* Le repère nu, sans nommer sa destination : « À VERSER SUR LE COMMUN »
         est l'eyebrow le plus long de la grille (~195px en mono 11px, sans
         césure possible) et « Répartition › » en demande 95 de plus, quand la
         tuile n'en offre que 288 sur un écran de 360. Les deux se croisaient.
         `SplitTile` passe déjà son repère nu, pour la même raison. Le nom du
         lien, lui, est entier : il ne coûte aucun pixel. */
      link={{ to: SPLIT_PATH, label: t.dashboard.showMemberShare }}
    >
      {/* L'eyebrow nomme le chiffre, au lieu qu'un libellé le refasse juste
          au-dessus : la tuile portait cinq éléments là où le DS §5 en autorise
          quatre, et les trente pixels de trop se coupaient en haut comme en
          bas — le libellé remontait sous l'eyebrow, le total à payer sortait
          par le bas. */}
      <Eyebrow icon={SplitIcon}>{t.dashboard.memberShare}</Eyebrow>
      {settled ? (
        <div className="flex min-h-0 flex-1 flex-col justify-center gap-1">
          {amount}
          {/* En `t-axis`, comme les mêmes lignes sur l'écran Répartition : c'est
              le même calcul, dans les mêmes mots et le même ordre, et deux
              graisses pour une seule preuve la feraient lire comme deux.

              La colonne fait désormais la largeur de la tuile — l'anneau et sa
              gouttière lui en prenaient 96 —, si bien que chaque montant reste
              sur la ligne de son libellé au lieu de passer dessous à 320px. Le
              `flex-wrap` demeure : c'est lui qui garantit qu'aucun des deux ne
              se tronque le jour où un libellé s'allonge, et le DS §5 tranche le
              cas — c'est au format d'être choisi pour le libellé, jamais au
              libellé d'être raboté pour le format.

              Avec leurs centimes : ces deux lignes n'existent que pour être
              vérifiables, et « 1 732,86 + 282,56 = 2 015,42 » ne tombe plus
              juste si on l'arrondit. */}
          <ul className="flex flex-col gap-1 border-t border-border pt-2">
            <li className="flex flex-wrap items-baseline justify-between gap-x-2">
              <span className="t-axis min-w-0">{t.split.settlementShare}</span>
              <span className="t-axis tnum">{formatMoney(spending, currency)}</span>
            </li>
            {/* Presque jamais, et c'est bien pour ça qu'elle manquait tant : le
                seul écart entre ce qu'on verse et ce que le mois coûte venait
                d'elle, et aucun écran ne le nommait. */}
            {refund !== 0 && (
              <li className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span className="t-axis min-w-0">{t.split.settlementRefund}</span>
                <span className="t-axis tnum">{formatMoney(refund, currency)}</span>
              </li>
            )}
            {charges.adjustment !== 0 && (
              <li className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span className="t-axis min-w-0">{tpl(t.split.settlement, previous)}</span>
                {/* Signé, et sans direction : ce n'est pas un flux dont on
                    lirait la valeur absolue, c'est un écart dont le signe est
                    toute la lecture. */}
                <span className="t-axis tnum">
                  {formatSignedMoney(charges.adjustment, currency)}
                </span>
              </li>
            )}
          </ul>
        </div>
      ) : (
        amount
      )}
    </Tile>
  )
}
