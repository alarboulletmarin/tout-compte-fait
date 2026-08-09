import { type ReactNode, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { CATEGORIES_PATH, familyPath } from '@/app/routes'
import type { CategoryKind } from '@/domain/types'
import { t } from '@/i18n/strings'
import { addCategory, addFamily } from '@/store/actions'
import { useFamilies } from '@/store/selectors'
import { Button } from '@/ui/Button'
import { Eyebrow } from '@/ui/Eyebrow'
import { Field, Select, TextInput } from '@/ui/Field'
import { PageTitle } from '@/ui/PageTitle'
import { Tile } from '@/ui/Tile'

const kinds = (): { value: CategoryKind; label: string }[] => [
  { value: 'charge', label: t.kinds.charge },
  { value: 'resource', label: t.kinds.resource },
  { value: 'debt', label: t.kinds.debt },
  { value: 'saving', label: t.kinds.saving },
]

/**
 * Le châssis des deux créations du catalogue : un titre, un retour, un champ,
 * un bouton. Écrit une fois — deux formulaires d'une ligne qui divergeraient
 * sur la place du bouton ou la largeur de la colonne se remarqueraient à
 * l'aller-retour entre les deux.
 */
function FormScreen({
  title,
  badge,
  onBack,
  onSubmit,
  submit,
  disabled,
  children,
}: {
  title: string
  badge?: string
  onBack: () => void
  onSubmit: () => void
  submit: string
  disabled: boolean
  children: ReactNode
}) {
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <PageTitle title={title} onBack={onBack}>
        {badge !== undefined && <Eyebrow className="shrink-0">{badge}</Eyebrow>}
      </PageTitle>
      <Tile>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (disabled) return
            onSubmit()
          }}
        >
          {children}
          <Button type="submit" disabled={disabled} className="w-fit">
            {submit}
          </Button>
        </form>
      </Tile>
    </div>
  )
}

/**
 * Une nouvelle famille.
 *
 * Le formulaire attendait en permanence sous la liste, nom et nature déployés,
 * pour un geste qu'on fait une fois par an. Il s'ouvre maintenant sur demande —
 * et il atterrit sur la famille créée plutôt que de revenir à la liste : on
 * crée une famille pour y ranger quelque chose, et c'est le geste suivant.
 *
 * Le retour de la famille remplace cette vue dans l'historique : revenir en
 * arrière depuis elle rend la liste, pas le formulaire qu'on vient de valider.
 */
export function FamilyNewPage() {
  const navigate = useNavigate()
  const [label, setLabel] = useState('')
  const [kind, setKind] = useState<CategoryKind>('charge')
  const trimmed = label.trim()

  return (
    <FormScreen
      title={t.settings.familyAdd}
      submit={t.settings.familyAdd}
      disabled={trimmed === ''}
      onBack={() => {
        void navigate(CATEGORIES_PATH)
      }}
      onSubmit={() => {
        const family = addFamily({ label: trimmed, kind })
        void navigate(familyPath(family.id), { replace: true })
      }}
    >
      <Field label={t.settings.familyName}>
        {(id) => (
          <TextInput
            id={id}
            value={label}
            placeholder={t.settings.familyPlaceholder}
            maxLength={40}
            autoFocus
            onChange={(event) => {
              setLabel(event.target.value)
            }}
          />
        )}
      </Field>
      {/* La nature est le seul choix irréversible du formulaire : elle décide du
          sens et de la teinte de tout ce qu'on rangera dessous. */}
      <Field label={t.settings.familyKind}>
        {(id) => (
          <Select
            id={id}
            value={kind}
            onChange={(event) => {
              setKind(event.target.value as CategoryKind)
            }}
          >
            {kinds().map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </FormScreen>
  )
}

/**
 * Une nouvelle catégorie, dans la famille d'où l'on vient.
 *
 * Le formulaire demandait un libellé **et** une famille, alors qu'on venait
 * précisément d'ouvrir une famille : la question était déjà répondue, et son
 * sélecteur offrait surtout l'occasion de se tromper. La famille porte la
 * nature et la teinte, qui ne se saisissent pas non plus (voir `addCategory`) —
 * il ne reste donc qu'un mot à écrire.
 */
export function CategoryNewPage() {
  const { id } = useParams()
  const families = useFamilies()
  const family = families.find((one) => one.id === id)

  if (family === undefined) return <Navigate to={CATEGORIES_PATH} replace />

  return <CategoryNewForm familyId={family.id} familyLabel={family.label} />
}

function CategoryNewForm({ familyId, familyLabel }: { familyId: string; familyLabel: string }) {
  const navigate = useNavigate()
  const [label, setLabel] = useState('')
  const trimmed = label.trim()

  return (
    <FormScreen
      title={t.settings.categoryAdd}
      badge={familyLabel}
      submit={t.settings.categoryAdd}
      disabled={trimmed === ''}
      onBack={() => {
        void navigate(familyPath(familyId))
      }}
      onSubmit={() => {
        addCategory({ label: trimmed, familyId, icon: '' })
        void navigate(familyPath(familyId), { replace: true })
      }}
    >
      <Field label={t.settings.categoryName}>
        {(id) => (
          <TextInput
            id={id}
            value={label}
            placeholder={t.settings.categoryPlaceholder}
            maxLength={40}
            autoFocus
            onChange={(event) => {
              setLabel(event.target.value)
            }}
          />
        )}
      </Field>
    </FormScreen>
  )
}
