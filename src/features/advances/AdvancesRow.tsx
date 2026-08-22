import { ADVANCES_PATH } from '@/app/routes'
import { totalRemaining } from '@/domain/advance'
import { t } from '@/i18n/strings'
import { formatMoney, tpl } from '@/i18n/format'
import { useAdvanceStatuses } from '@/store/selectors'
import { Row } from '@/ui/RowGroup'
import { useCurrency } from '@/ui/currency'

/**
 * La porte des avances, et ce qu'elle dit d'elle-même — une rangée, deux
 * chiffres, un chevron.
 *
 * Elle vit dans son propre fichier parce que **deux écrans y mènent** : la liste
 * des récurrences, où l'avance est la mensualité qui reconstitue l'épargne, et
 * les crédits, où le design la range parce que c'est de l'argent qu'on doit.
 * Les deux lectures sont justes, et la rangée est la même : écrite deux fois,
 * elle aurait fini par annoncer deux chiffres.
 *
 * **Elle ne recopie pas la liste des avances**, contrairement à ce que le
 * design dessine sur l'écran des crédits. Une avance porte cinq lectures — ce
 * qu'il reste à remettre, la mensualité, la période, la personne, la catégorie —
 * et son geste de suppression passe par une boîte de confirmation ; c'est une
 * fiche, pas une ligne, et `/avances` est l'écran qui la porte. Le doubler ici
 * ferait deux endroits où l'on croirait agir, dont un seul le peut.
 */
export function AdvancesRow() {
  const statuses = useAdvanceStatuses()
  const currency = useCurrency()

  /* Combien, et combien il reste. Le second seul ne dirait pas s'il vient d'une
     avance ou de six. */
  const description =
    statuses.length === 0
      ? t.advances.empty
      : [
          tpl(statuses.length > 1 ? t.advances.count : t.advances.countOne, statuses.length),
          tpl(t.advances.remainingTotal, formatMoney(totalRemaining(statuses), currency, false)),
        ].join(' · ')

  return <Row label={t.advances.section} description={description} to={ADVANCES_PATH} />
}
