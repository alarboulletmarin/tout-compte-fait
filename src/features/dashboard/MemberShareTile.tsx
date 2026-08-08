import { SPLIT_PATH } from '@/app/routes'
import { addMonthsToYm } from '@/domain/date'
import { add } from '@/domain/money'
import { t } from '@/i18n/strings'
import { cn } from '@/lib/cn'
import {
  de,
  formatMoney,
  formatMonthName,
  formatPercent,
  formatSignedMoney,
  tpl,
} from '@/i18n/format'
import { useCurrentYm, useMemberCharges, useMemberFilter, useMemberMap } from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Eyebrow } from '@/ui/Eyebrow'
import { SplitIcon } from '@/ui/Icons'
import { Ring } from '@/ui/Ring'
import { Tile } from '@/ui/Tile'
import { useCurrency } from '@/ui/currency'
import { DONUT_SIZE, DONUT_THICKNESS } from './donut'

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
 * l'intérieur de sa lecture secondaire ; la tuile en compte toujours quatre.
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
  const percent = formatPercent(charges.shareBp / 10_000, 1)
  const spoken = tpl(t.dashboard.srMemberShare, member?.name ?? '', percent)
  /* Le virement se rattrape : celui qui a trop avancé le mois passé verse moins
     ce mois-ci, et l'autre un peu plus. */
  const toPay = add(charges.common, charges.adjustment)
  const previous = de(formatMonthName(addMonthsToYm(month, -1)))
  /* Une part de rien n'est pas une part : le mois sans charge commune laisse un
     coefficient qui se calcule toujours — il vient des revenus — et un pot vide
     à quoi l'appliquer. L'anneau s'en va, et la preuve prend la largeur qu'il
     occupait, ce dont elle a précisément besoin ce mois-là. */
  const withRing = charges.commonTotal > 0

  return (
    /* 4×2 et non 2×2 comme la Répartition, alors qu'elles portent le même
       gabarit : celle-ci aligne des montants là où l'autre aligne des
       pourcentages. « 1 374,50 € » prend 68 des 94 pixels qu'une demi-colonne
       laisse à côté de l'anneau au point de bascule, et le montant à verser y
       serait posé en corps de tuile sur une colonne qui ne peut pas le tenir.
       Sur téléphone les deux formats sont le même : pleine largeur, deux
       rangées.

       Un lien et non un bouton, comme la Répartition : son contenu porte une
       liste, et le nom unique d'un bouton effaçait les deux montants qu'elle
       sépare exprès. Le lien couvre toute la tuile et le repère reste au coin,
       hors du flux — c'est ce qui lui permet de ne rien coûter aux 148px de
       contenu, qui sont comptés. */
    <Tile
      span="4x2"
      className="gap-3"
      label={t.dashboard.memberShare}
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
      <div className="flex min-h-0 flex-1 items-center gap-4">
        {/* Une jauge et non un donut : la question n'est pas comment le pot
            commun se découpe entre tous — c'est la tuile Répartition — mais
            quelle fraction en revient à cette personne-là. Le pourcentage est
            au centre parce qu'il est la réponse ; les montants qu'il produit
            se lisent à côté. */}
        {withRing && (
          <Ring
            size={DONUT_SIZE}
            thickness={DONUT_THICKNESS}
            value={charges.shareBp / 10_000}
            color={member?.color ?? 'var(--cat-rest)'}
            label={t.dashboard.memberShare}
            srText={spoken}
            className="shrink-0"
          >
            <span className="t-num-body tnum">{percent}</span>
          </Ring>
        )}
        {/* Bornée quand l'anneau est là : sur six colonnes la tuile fait 650px,
            et une liste qui les prendrait toutes séparerait chaque libellé de
            son montant par un demi-écran de vide — on ne lit plus une ligne, on
            la suit. Sans anneau, la preuve est tout ce que la tuile a à
            montrer, et elle prend la largeur. */}
        <div className={cn('flex min-w-0 flex-1 flex-col gap-1', withRing && 'max-w-xs')}>
          {/* Le montant du virement, en corps de tuile : c'est la réponse, et
              on vient la recopier dans une application bancaire.

              Une sortie tant que c'en est une, et un solde sinon : le mois sans
              charge commune ne laisse que le report, et celui qui a tout avancé
              le mois d'avant reçoit alors au lieu de verser. `direction`
              afficherait la valeur absolue et la ferait annoncer « sortie » —
              donc « 282,56 € à verser » à qui on doit cette somme. Le cas
              ordinaire ne bouge ni d'un pixel ni d'un mot. */}
          <Amount
            value={toPay}
            size="tile-fit"
            {...(toPay < 0 ? {} : { direction: 'out' as const })}
          />
          {charges.adjustment !== 0 && (
            <ul className="flex flex-col gap-1 border-t border-border pt-2">
              {/* En `t-axis`, comme les mêmes lignes sur l'écran Répartition, et
                  non dans la graisse d'un montant : à 320px la colonne posée à
                  côté de l'anneau fait 152px, et « Régularisation de janvier »
                  suivi de son montant y demande deux lignes. En 13px elles en
                  demandaient trois, et les deux termes sortaient par le bas
                  d'une tuile qui les coupe.

                  Le montant passe donc sous son libellé plutôt que de le
                  tronquer : c'est le libellé qui porte de quel mois vient le
                  report, et « Régularisation de janv… » ne porte plus rien. Le
                  DS §5 tranche le cas.

                  Avec leurs centimes : ces deux lignes n'existent que pour être
                  vérifiables, et « 1 732,86 + 282,56 = 2 015,42 » ne tombe plus
                  juste si on l'arrondit. */}
              <li className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span className="t-axis min-w-0">{t.split.settlementShare}</span>
                <span className="t-axis tnum">{formatMoney(charges.common, currency)}</span>
              </li>
              <li className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span className="t-axis min-w-0">{tpl(t.split.settlement, previous)}</span>
                {/* Signé, et sans direction : ce n'est pas un flux dont on
                    lirait la valeur absolue, c'est un écart dont le signe est
                    toute la lecture. */}
                <span className="t-axis tnum">
                  {formatSignedMoney(charges.adjustment, currency)}
                </span>
              </li>
            </ul>
          )}
        </div>
      </div>
    </Tile>
  )
}
