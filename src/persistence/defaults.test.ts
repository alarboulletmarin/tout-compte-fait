import { afterEach, describe, expect, it } from 'vitest'
import { fr } from '@/i18n/fr'
import { applyLocale, setCatalog } from '@/i18n/strings'
import { defaultCategories, defaultFamilies, emptyData, familyColor } from './defaults'

afterEach(() => {
  setCatalog('fr', fr)
})

/**
 * Le catalogue par défaut suit la langue du moment — et rien d'autre ne la suit.
 *
 * C'est le seul endroit de l'app où la langue touche à une **donnée** : les
 * quarante-six catégories d'un document neuf sont écrites dans la langue qu'on
 * lisait en le créant. Elles deviennent alors des données du foyer, comme un
 * nom de membre : repasser l'app en français ne les réécrit pas, et c'est
 * délibéré — on ne renomme pas ce que quelqu'un a pu modifier depuis.
 */
describe('le catalogue par défaut', () => {
  it('naît en français quand l’app se lit en français', () => {
    expect(defaultFamilies()[0]?.label).toBe(fr.defaultFamilies.resources)
    expect(defaultCategories()[0]?.label).toBe(fr.defaultCategories.salary)
  })

  it('naît en anglais quand l’app se lit en anglais', async () => {
    await applyLocale('en')

    expect(defaultFamilies()[0]?.label).toBe('Income')
    expect(defaultCategories()[0]?.label).toBe('Salary, pension or benefits')
  })

  /* La table qui porte l'ordre, les identifiants et les natures ne dépend
     d'aucune langue : c'est ce qui permet à `familyColor` de rester une lecture
     de rang, appelée une fois par ligne de liste. */
  it('garde les mêmes identifiants et les mêmes teintes d’une langue à l’autre', async () => {
    const french = defaultCategories().map((category) => category.id)
    const colors = defaultFamilies().map((family) => familyColor(family.id))

    await applyLocale('en')

    expect(defaultCategories().map((category) => category.id)).toEqual(french)
    expect(defaultFamilies().map((family) => familyColor(family.id))).toEqual(colors)
  })

  /* Le document neuf prend acte de la langue qu'on est en train de lire : c'est
     lui qui fera foi ensuite, sur tous les appareils qui l'ouvriront. */
  it('inscrit la langue lue dans le document qu’il crée', async () => {
    expect(emptyData().settings.locale).toBe('fr')

    await applyLocale('en')

    expect(emptyData().settings.locale).toBe('en')
  })
})
