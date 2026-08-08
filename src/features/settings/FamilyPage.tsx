import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { CATEGORIES_PATH, categoryNewPath } from '@/app/routes'
import { normalizeText } from '@/domain/search'
import type { Category, Family } from '@/domain/types'
import { t } from '@/i18n/strings'
import { tpl } from '@/i18n/format'
import { archiveCategory, renameFamily, updateCategory } from '@/store/actions'
import { useAllCategoriesByFamily } from '@/store/selectors'
import { Button } from '@/ui/Button'
import { Dot } from '@/ui/Dot'
import { Eyebrow } from '@/ui/Eyebrow'
import { Field, TextInput } from '@/ui/Field'
import { CategoriesIcon } from '@/ui/Icons'
import { PageTitle } from '@/ui/PageTitle'
import { Tile } from '@/ui/Tile'
import { useDraftField } from '@/ui/useDraftField'

/**
 * Une catégorie : son libellé, et l'archivage.
 *
 * Le libellé se corrige sur place — c'est un mot dans une liste de mots, et
 * l'ouvrir dans un écran à lui coûterait deux gestes pour changer une lettre.
 * Ce qui a disparu, c'est de voir les quarante-six d'un coup : il n'y en a plus
 * que celles de la famille où l'on est entré.
 */
function Row({ category }: { category: Category }) {
  const draft = useDraftField(category.label, (next) => {
    updateCategory(category.id, { label: next })
  })

  return (
    <li className="flex h-14 items-center gap-3 rounded-inner bg-surface-2 px-3">
      <Dot color={category.color} outlined={category.archived} />
      <input
        aria-label={t.settings.categoryName}
        maxLength={40}
        {...draft}
        className="t-body h-full min-w-0 flex-1 bg-transparent outline-none"
      />
      <Button
        size="sm"
        variant="ghost"
        aria-label={tpl(
          category.archived ? t.settings.categoryRestore : t.settings.categoryArchive,
          category.label,
        )}
        onClick={() => {
          archiveCategory(category.id, !category.archived)
        }}
      >
        {category.archived ? t.settings.restore : t.settings.archive}
      </Button>
    </li>
  )
}

/**
 * Une famille et ses catégories.
 *
 * Le nom se modifie ici, et non dans l'en-tête de la liste : c'était déjà la
 * règle quand la famille était une section repliable — un champ de saisie dans
 * un `<summary>` se replie à chaque espace qu'on y tape —, et une vue dédiée ne
 * change rien à l'endroit où il est juste de le poser.
 *
 * La nature ne se modifie pas : elle décide du sens et de la teinte des
 * catégories déjà rangées dessous, et la changer les ferait toutes basculer
 * sans qu'on l'ait demandé. Elle se lit donc en tête, à côté du nom.
 */
export function FamilyPage() {
  const { id } = useParams()
  const groups = useAllCategoriesByFamily()
  const group = groups.find((one) => one.family.id === id)

  // Supprimée depuis un autre onglet, ou URL fausse.
  if (group === undefined) return <Navigate to={CATEGORIES_PATH} replace />

  return <FamilyView family={group.family} categories={group.categories} />
}

function FamilyView({ family, categories }: { family: Family; categories: Category[] }) {
  const navigate = useNavigate()
  const draft = useDraftField(family.label, (next) => {
    renameFamily(family.id, next)
  })

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <PageTitle
        title={family.label}
        onBack={() => {
          void navigate(CATEGORIES_PATH)
        }}
      >
        {/* La nature se tait quand la famille porte déjà son nom : le catalogue
            par défaut range les salaires sous « Ressources », de nature
            « Ressources », et « Ressources RESSOURCES » n'apprend rien. C'est la
            règle du repère d'une tuile, qui ne nomme pas une destination
            homonyme (voir `Tile`). */}
        {normalizeText(t.kinds[family.kind]) !== normalizeText(family.label) && (
          <Eyebrow className="shrink-0">{t.kinds[family.kind]}</Eyebrow>
        )}
      </PageTitle>

      <Tile>
        <Field label={t.settings.familyName}>
          {(fieldId) => <TextInput id={fieldId} maxLength={40} {...draft} />}
        </Field>
      </Tile>

      <Tile className="gap-3">
        <Eyebrow icon={CategoriesIcon}>{t.settings.categories}</Eyebrow>
        {/* L'explication reste, et seulement ici : « archiver » n'est pas
            « supprimer », et c'est le genre de conséquence qu'on ne devine pas
            avant d'avoir cliqué. */}
        <p className="t-label">{t.settings.categoriesHint}</p>

        {categories.length === 0 ? (
          <p className="t-label">{t.settings.familyEmpty}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {categories.map((category) => (
              <Row key={category.id} category={category} />
            ))}
          </ul>
        )}

        {/* La famille est connue : la création n'a plus qu'un libellé à
            demander, là où le formulaire du bas de page redemandait à chaque
            fois dans quelle famille ranger. */}
        <Button
          variant="secondary"
          className="w-fit"
          onClick={() => {
            void navigate(categoryNewPath(family.id))
          }}
        >
          {t.settings.categoryAdd}
        </Button>
      </Tile>
    </div>
  )
}
