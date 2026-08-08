import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { SAVINGS_PATH, PEOPLE_PATH, supportPath } from '@/app/routes'
import type { SavingSupport } from '@/domain/types'
import { fr } from '@/i18n/fr'
import { addSavingSupport, replaceSavingSupport } from '@/store/actions'
import { useMembers, useSavingSupport } from '@/store/selectors'
import { Button } from '@/ui/Button'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { EmptyState } from '@/ui/EmptyState'
import { PageTitle } from '@/ui/PageTitle'
import { Tile } from '@/ui/Tile'
import { toast } from '@/ui/toast'
import { useLeaveGuard } from '@/ui/useLeaveGuard'
import { SupportFields } from './SupportFields'
import { emptySupportDraft, supportDraftFrom, useSupportDraft } from './supportDraft'

/**
 * Créer un support, ou en corriger un.
 *
 * Un seul écran pour les deux, comme la fiche d'un membre ou celle d'une
 * récurrence : ce sont les mêmes champs, la même validation et le même retour,
 * et deux composants auraient fini par ne plus poser les mêmes questions.
 *
 * Ce que la reprise n'a pas, c'est le champ de valeur : un relevé s'**empile**,
 * il ne se réécrit pas depuis la fiche du compte. Le corriger a son propre
 * écran, et « mettre à jour » en pose un nouveau — sans quoi l'historique
 * s'effacerait à chaque changement de nom.
 */
export function SupportFormPage() {
  const { id } = useParams()
  const support = useSavingSupport(id)

  // Supprimé depuis un autre onglet, ou URL fausse.
  if (id !== undefined && support === null) return <Navigate to={SAVINGS_PATH} replace />

  /* La clef porte l'identité : le brouillon vit en état local, et passer d'un
     support à l'autre sans remonter le composant y laisserait le précédent. */
  return <SupportForm key={support?.id ?? 'nouveau'} {...(support === null ? {} : { support })} />
}

function SupportForm({ support }: { support?: SavingSupport }) {
  const navigate = useNavigate()
  const members = useMembers()
  const editing = support !== undefined

  const { draft, patch, errors, build } = useSupportDraft(
    editing
      ? supportDraftFrom(support)
      : emptySupportDraft(members.length === 1 ? { memberId: members[0]?.id ?? '' } : {}),
  )

  const back = (): void => {
    void navigate(editing ? supportPath(support.id) : SAVINGS_PATH)
  }
  const guard = useLeaveGuard(draft, back)

  const submit = (): void => {
    const input = build()
    if (input === null) return
    if (editing) {
      /* L'état complet de ce que l'écran montre, jamais un correctif : une note
         qu'on vient de vider doit disparaître du document. C'est la règle de
         `replaceRecurrence`, et elle vaut ici pour la même raison. L'archivage
         ne se saisit pas sur ce formulaire — il a son geste, sur la fiche. */
      const { value: _ignored, note, ...rest } = input
      replaceSavingSupport(support.id, {
        ...rest,
        archived: support.archived,
        ...(note === undefined ? {} : { note }),
      })
      toast(fr.savings.supportUpdated)
      void navigate(supportPath(support.id))
      return
    }
    const created = addSavingSupport(input)
    toast(fr.savings.supportAdded)
    void navigate(supportPath(created.id), { replace: true })
  }

  /* Sans personne, rien à enregistrer : une épargne est toujours à quelqu'un,
     et l'écran le dit plutôt que de proposer un champ vide — la même règle que
     pour une avance, au même endroit du geste. */
  if (members.length === 0) {
    return (
      <div className="flex max-w-xl flex-col gap-5">
        <PageTitle title={fr.savings.supportNew} onBack={back} />
        <EmptyState
          message={fr.savings.supportsNoMember}
          actionLabel={fr.split.goToSettings}
          onAction={() => {
            void navigate(PEOPLE_PATH)
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <PageTitle
        title={editing ? fr.savings.supportEdit : fr.savings.supportNew}
        onBack={guard.request}
      />

      <form
        id="support-form"
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <Tile className="gap-4">
          <SupportFields
            draft={draft}
            patch={patch}
            errors={errors}
            withValue={!editing}
            autoFocus
          />
        </Tile>
      </form>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" form="support-form">
          {editing ? fr.common.save : fr.savings.supportAdd}
        </Button>
        <Button variant="secondary" onClick={guard.request}>
          {fr.common.cancel}
        </Button>
      </div>

      {/* Dit une fois, à l'endroit où la confusion serait la plus coûteuse :
          le chiffre saisi ici n'est pas une opération. */}
      <p className="t-label">{fr.savings.valueMethod}</p>

      <ConfirmDialog {...guard.dialog} />
    </div>
  )
}
