import { defaultShared } from '@/domain/split'
import { type CategoryKind, isSpending } from '@/domain/types'
import { t } from '@/i18n/strings'
import { useKindOf, useMembers } from '@/store/selectors'
import { Checkbox } from '@/ui/Field'

/**
 * La case « à partager », posée sur la saisie d'une dépense comme sur celle
 * d’une récurrence.
 *
 * Elle affiche ce que la règle donnerait tant que personne ne l'a touchée, et
 * suit donc le membre et la catégorie qu'on choisit. Cochée ou décochée à la
 * main, elle fige une exception que la règle ne peut plus reprendre.
 *
 * Elle ne s'affiche qu'à partir de deux membres : à un seul, tout est déjà à
 * la même personne et il n'y a rien à répartir.
 *
 * Et seulement sur une **sortie de nature charge ou dette**. C'est la seule
 * nature qui se partage : un revenu ne se répartit pas — on compare ce que
 * chacun gagne, on ne se le redistribue pas —, et un versement d'épargne sort
 * du compte mais reste à qui le fait. Sur les deux autres, la case ne pouvait
 * qu'afficher « non » et proposer un « oui » que le calcul aurait ignoré.
 *
 * Sur « en commun », elle est **cochée et verrouillée**. Une charge que
 * personne ne s'attribue *est* commune, par la règle même : la décocher sans
 * dire à qui elle est produirait une ligne qui sort du compte du foyer sans
 * apparaître dans le mois de personne, et la somme des soldes individuels
 * cesserait de valoir celui du foyer sans que rien ne le dise. La case reste
 * visible plutôt que de disparaître : elle dit ce qui va se passer, et le
 * geste pour en sortir — choisir un membre — se lit juste au-dessus.
 */
export function SharedField({
  categoryId,
  memberId,
  value,
  onChange,
}: {
  categoryId: string
  memberId: string
  /** `undefined` = la règle tranche. */
  value: boolean | undefined
  onChange: (next: boolean | undefined) => void
}) {
  const members = useMembers()
  const kindOf = useKindOf()
  if (members.length < 2) return null

  const kind: CategoryKind = kindOf(categoryId)
  if (!isSpending(kind)) return null

  const byRule = defaultShared(kind, memberId)
  const locked = memberId === ''

  return (
    <Checkbox
      checked={locked ? true : (value ?? byRule)}
      disabled={locked}
      label={t.entry.shared}
      hint={locked ? t.entry.sharedLocked : t.entry.sharedHint}
      onChange={(next) => {
        // Revenu à la valeur de la règle, la case lui rend la main : rien à
        // stocker, et le champ suivra de nouveau le membre et la catégorie.
        onChange(next === byRule ? undefined : next)
      }}
    />
  )
}
