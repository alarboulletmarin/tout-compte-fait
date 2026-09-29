import { useId, useState } from 'react'
import { deleteCategory, findCategoryByName } from '../domain/data'
import type { Category } from '../domain/types'
import { useI18n } from '../i18n/i18n'
import { useStore } from '../storage/store'
import { PencilIcon, PlusIcon, TrashIcon } from '../ui/icons'
import { FieldError } from '../ui/Notes'
import { SubScreen } from '../ui/Screens'
import { useToast } from '../ui/Toast'
import { insertAt } from './common'

const NEW = 'new'

/** Remet le focus sur un élément une fois l'édition refermée. */
const focusLater = (id: string) => requestAnimationFrame(() => document.getElementById(id)?.focus())

export function Categories() {
  const { t } = useI18n()
  const { data, update } = useStore()
  const toast = useToast()
  const [editing, setEditing] = useState<string | null>(null)

  const count = (id: string) => data.charges.filter((c) => c.categoryId === id).length

  function close(focusId: string) {
    setEditing(null)
    focusLater(focusId)
  }

  function save(id: string, name: string) {
    update((d) => ({
      ...d,
      categories:
        id === NEW
          ? [...d.categories, { id: crypto.randomUUID(), name }]
          : d.categories.map((c) => (c.id === id ? { ...c, name } : c)),
    }))
    close(id === NEW ? 'category-add' : `rename-${id}`)
  }

  function remove(category: Category) {
    const index = data.categories.findIndex((c) => c.id === category.id)
    const affected = new Set(
      data.charges.filter((c) => c.categoryId === category.id).map((c) => c.id),
    )
    update((d) => deleteCategory(d, category.id))
    close('category-add')
    toast({
      message: t.categories.deleted(category.name),
      action: {
        label: t.undo,
        run: () =>
          update((d) => ({
            ...d,
            categories: insertAt(d.categories, index, category),
            charges: d.charges.map((c) =>
              affected.has(c.id) ? { ...c, categoryId: category.id } : c,
            ),
          })),
      },
    })
  }

  return (
    <SubScreen
      title={t.categories.title}
      back="/settings"
      backLabel={t.categories.back}
      className="categories"
    >
      <ul className="group">
        {data.categories.map((c) =>
          editing === c.id ? (
            <EditRow
              key={c.id}
              label={t.categories.renameLabel(count(c.id))}
              initial={c.name}
              taken={(name) => !!findCategoryByName(data.categories, name, c.id)}
              onSave={(name) => save(c.id, name)}
              onCancel={() => close(`rename-${c.id}`)}
              onDelete={() => remove(c)}
            />
          ) : (
            <li key={c.id} className="category">
              <div className="row__text">
                <span className="row__title">{c.name}</span>
                <span className="row__sub">{t.chargesCount(count(c.id))}</span>
              </div>
              <button
                id={`rename-${c.id}`}
                type="button"
                className="icon-button icon-button--muted"
                aria-label={t.categories.rename(c.name)}
                onClick={() => setEditing(c.id)}
              >
                <PencilIcon />
              </button>
            </li>
          ),
        )}
        {editing === NEW && (
          <EditRow
            label={t.categories.newLabel}
            initial=""
            taken={(name) => !!findCategoryByName(data.categories, name)}
            onSave={(name) => save(NEW, name)}
            onCancel={() => close('category-add')}
          />
        )}
      </ul>

      {editing !== NEW && (
        <button
          id="category-add"
          type="button"
          className="button-dashed"
          onClick={() => setEditing(NEW)}
        >
          <PlusIcon size={16} />
          {t.categories.add}
        </button>
      )}
      <p className="categories__note">{t.categories.note}</p>
    </SubScreen>
  )
}

function EditRow(props: {
  label: string
  initial: string
  /** Le nom est déjà celui d'une autre catégorie. */
  taken: (name: string) => boolean
  onSave: (name: string) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const { t } = useI18n()
  const id = useId()
  const [name, setName] = useState(props.initial)
  const [duplicate, setDuplicate] = useState(false)
  const save = () => {
    const clean = name.trim()
    if (!clean) return
    if (props.taken(clean)) return setDuplicate(true)
    props.onSave(clean)
  }

  return (
    <li className="category-edit">
      <label htmlFor={id} className="field__label field__label--small">
        {props.label}
      </label>
      <input
        id={id}
        className="input input--active"
        autoComplete="off"
        autoCapitalize="sentences"
        enterKeyHint="done"
        autoFocus
        value={name}
        aria-invalid={duplicate}
        aria-describedby={duplicate ? `${id}-error` : undefined}
        onChange={(e) => {
          setName(e.target.value)
          setDuplicate(false)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') props.onCancel()
        }}
      />
      {duplicate && <FieldError id={`${id}-error`}>{t.categories.duplicate}</FieldError>}
      <div className="category-edit__actions">
        {props.onDelete && (
          <button
            type="button"
            className="button-small button-small--danger"
            onClick={props.onDelete}
          >
            <TrashIcon />
            {t.categories.delete}
          </button>
        )}
        <button
          type="button"
          className="button-small category-edit__cancel"
          onClick={props.onCancel}
        >
          {t.categories.cancel}
        </button>
        <button type="button" className="button-small button-small--primary" onClick={save}>
          {t.categories.save}
        </button>
      </div>
    </li>
  )
}
