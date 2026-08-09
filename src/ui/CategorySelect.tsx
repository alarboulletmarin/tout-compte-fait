import type { CategoryKind, Direction } from '@/domain/types'
import { t } from '@/i18n/strings'
import { useCategoriesByFamily } from '@/store/selectors'
import { Select, type SelectProps } from './Field'
import { kindsOfDirection } from './categoryKinds'

/**
 * Choix d'une catégorie, rangée sous sa famille. Un `<optgroup>` natif plutôt
 * qu'une liste maison : le sélecteur du système reste ce que l'appareil sait
 * faire de mieux — molette sur iOS, recherche au clavier ailleurs — et une
 * quarantaine d'entrées à plat y serait illisible.
 */
export function CategorySelect({
  direction,
  kinds,
  ...rest
}: {
  direction: Direction
  /** Restreint la liste, quand le sens ne suffit pas à la décrire — l'épargne
   *  sort du compte comme une charge, et ne se choisit pas dans la même liste. */
  kinds?: readonly CategoryKind[]
} & Omit<SelectProps, 'children'>) {
  const groups = useCategoriesByFamily(kinds ?? kindsOfDirection(direction))

  return (
    <Select {...rest}>
      <option value="">{t.entry.categoryPlaceholder}</option>
      {groups.map((group) => (
        <optgroup key={group.family.id} label={group.family.label}>
          {group.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  )
}
