import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FAMILY_NEW_PATH, MORE_PATH, familyPath } from '@/app/routes'
import { isSearchable, matchesText, normalizeText } from '@/domain/search'
import type { Category, Family } from '@/domain/types'
import { t } from '@/i18n/strings'
import { tpl } from '@/i18n/format'
import { type FamilyGroup, useAllCategoriesByFamily } from '@/store/selectors'
import { Button } from '@/ui/Button'
import { Dot } from '@/ui/Dot'
import { Field, TextInput } from '@/ui/Field'
import { PageTitle } from '@/ui/PageTitle'
import { Row, RowGroup } from '@/ui/RowGroup'

/** Le compte d'une famille : le chiffre à l'œil, la phrase entière à la voix. */
function Count({ count }: { count: number }) {
  return (
    <>
      <span aria-hidden="true" className="t-axis tnum">
        {String(count)}
      </span>
      <span className="sr-only">
        {tpl(count > 1 ? t.settings.familyCount : t.settings.familyCountOne, count)}
      </span>
    </>
  )
}

type Match = { category: Category; family: Family }

/**
 * Le catalogue, un niveau à la fois.
 *
 * Il tenait dans les réglages : onze familles repliées, quarante-six catégories
 * dessous, un « tout déplier » qui produisait cinquante-sept lignes d'un coup,
 * et deux formulaires ouverts en permanence sous la liste — l'un pour une
 * catégorie, l'autre pour une famille. La section à elle seule faisait la
 * hauteur de tout le reste de la page.
 *
 * Une famille devient donc un pas de navigation. On lit douze lignes, on entre
 * dans celle qu'on cherchait, et la création se déclenche au lieu d'attendre en
 * bas de l'écran. Le « tout déplier » disparaît avec ce qu'il servait à ouvrir.
 *
 * La recherche, elle, reste — c'est elle qui évite d'avoir à deviner sous
 * quelle famille « Carburant » est rangée. Elle traverse les deux niveaux :
 * une famille qui apparie se donne en entier, une catégorie qui apparie se
 * donne avec le nom de la sienne, et les deux mènent au même endroit.
 */
export function CategoriesPage() {
  const groups = useAllCategoriesByFamily()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const searching = isSearchable(query)

  /* Une famille dont le nom apparie se présente entière — c'est elle qu'on
     cherchait. Ses catégories ne se répètent alors pas en dessous : la ligne de
     la famille les contient déjà, et « Transport » suivi de ses cinq lignes
     rendrait six résultats pour une seule intention. */
  const found = useMemo((): { families: FamilyGroup[]; matches: Match[] } => {
    if (!searching) return { families: [], matches: [] }
    const needle = normalizeText(query)
    const families = groups.filter((group) => matchesText(group.family.label, needle))
    const shown = new Set(families.map((group) => group.family.id))
    const matches = groups
      .filter((group) => !shown.has(group.family.id))
      .flatMap((group) =>
        group.categories
          .filter((category) => matchesText(category.label, needle))
          .map((category) => ({ category, family: group.family })),
      )
    return { families, matches }
  }, [groups, query, searching])

  const families = searching ? found.families : groups
  const empty = searching ? families.length + found.matches.length === 0 : groups.length === 0

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <PageTitle
        title={t.settings.categories}
        onBack={() => {
          void navigate(MORE_PATH)
        }}
      />

      {/* Quarante-six catégories sous douze familles : retrouver « Carburant »
          demandait de deviner qu'elle est rangée sous Transport, puis d'ouvrir
          les familles une par une jusqu'à tomber dessus. */}
      <Field label={t.settings.categorySearch}>
        {(id) => (
          <TextInput
            id={id}
            type="search"
            value={query}
            placeholder={t.settings.categorySearchPlaceholder}
            maxLength={40}
            onChange={(event) => {
              setQuery(event.target.value)
            }}
          />
        )}
      </Field>

      {empty ? (
        <p className="t-label">
          {searching
            ? tpl(t.settings.categorySearchEmpty, query.trim())
            : t.settings.familiesEmpty}
        </p>
      ) : (
        /* Sans étiquette pendant une recherche : ce qui s'y affiche n'est plus
           une liste de familles, et « FAMILLES » au-dessus d'une catégorie
           mentirait sur ce qu'on lit. */
        <RowGroup {...(searching ? {} : { title: t.settings.families })}>
          {families.map((group) => (
            <Row
              key={group.family.id}
              label={group.family.label}
              trailing={<Count count={group.categories.length} />}
              to={familyPath(group.family.id)}
            />
          ))}
          {found.matches.map(({ category, family }) => (
            <Row
              key={category.id}
              leading={<Dot color={category.color} outlined={category.archived} />}
              label={category.label}
              /* La famille sous la catégorie : c'est la relation qu'on vient
                 chercher — « où est rangé Carburant » — et c'est aussi ce que la
                 ligne ouvre. */
              description={family.label}
              to={familyPath(family.id)}
            />
          ))}
        </RowGroup>
      )}

      {/* Le formulaire de création n'attend plus en bas de la liste : on le
          demande. Il ouvre sa vue, comme toutes les saisies de l'app. */}
      <Button
        variant="secondary"
        className="w-fit"
        onClick={() => {
          void navigate(FAMILY_NEW_PATH)
        }}
      >
        {t.settings.familyAdd}
      </Button>
    </div>
  )
}
