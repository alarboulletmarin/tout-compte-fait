import { ZERO } from '@/domain/money'
import { Amount } from '@/ui/Amount'
import { Keypad } from '@/ui/Keypad'
import { keyedAmount } from './queue'

/**
 * Une carte à un seul chiffre : le montant, en grand, et le pavé sous lui.
 *
 * Trois cartes de la file ont exactement cette forme — le revenu de chacun, le
 * logement — et une quatrième l'aurait recopiée. Ce qui change d'une à l'autre
 * est le titre et le nom accessible du pavé, rien d'autre.
 *
 * **Le pavé est celui de l'app** (`ui/Keypad`), pas un second : il gère une
 * chaîne de chiffres, la frappe au clavier passe par `useHotkeys` — qui est le
 * seul endroit du dépôt à décider quand un raccourci se tait, dans un champ ou
 * derrière une feuille — et la conversion en montant vit à côté de lui.
 *
 * Le chiffre part de zéro et suit la frappe : c'est la même place et la même
 * taille que sur la carte de la revue, et il dit la vérité — il n'y a pas encore
 * de montant.
 */
export function AmountCard({
  keys,
  onChange,
  label,
  onSubmit,
}: {
  /** La chaîne de chiffres frappée. Jamais un montant. */
  keys: string
  onChange: (keys: string) => void
  /** Ce qu'on saisit, pour le groupe de touches. */
  label: string
  /** « Entrée » : l'action principale du pied de la file. */
  onSubmit: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <span className="fit-box block">
        <Amount value={keyedAmount(keys) ?? ZERO} size="hero-fit" />
      </span>
      <Keypad value={keys} onChange={onChange} label={label} onSubmit={onSubmit} />
    </div>
  )
}
