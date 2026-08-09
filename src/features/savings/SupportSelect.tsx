import { useState } from 'react'
import { t } from '@/i18n/strings'
import { addSavingSupport } from '@/store/actions'
import { useActiveSavingSupports, useMemberMap, useMembers } from '@/store/selectors'
import { Button } from '@/ui/Button'
import { Select, type SelectProps } from '@/ui/Field'
import { Sheet } from '@/ui/Sheet'
import { toast } from '@/ui/toast'
import { SupportFields } from './SupportFields'
import { emptySupportDraft, useSupportDraft } from './supportDraft'

/**
 * Le choix d'un support d'épargne, rangé par propriétaire.
 *
 * Par propriétaire et non par poste : deux personnes peuvent avoir chacune leur
 * « Livret A », et c'est justement ce que la catégorie seule ne savait pas
 * distinguer. Le nom du support seul serait alors ambigu dans la liste.
 *
 * Les archivés n'y sont pas : un compte clôturé ne se propose plus à la saisie,
 * même s'il reste lisible partout ailleurs.
 */
export function SupportSelect(props: Omit<SelectProps, 'children'>) {
  const supports = useActiveSavingSupports()
  const members = useMemberMap()

  /* Un groupe par personne, dans l'ordre où les supports ont été créés. Un
     `<optgroup>` natif, comme `CategorySelect` : le sélecteur du système reste
     ce que l'appareil sait faire de mieux. */
  const owners = [...new Set(supports.map((support) => support.memberId))]

  return (
    <Select {...props}>
      <option value="">{t.entry.categoryPlaceholder}</option>
      {owners.map((memberId) => (
        <optgroup key={memberId} label={members.get(memberId)?.name ?? ''}>
          {supports
            .filter((support) => support.memberId === memberId)
            .map((support) => (
              <option key={support.id} value={support.id}>
                {support.label}
              </option>
            ))}
        </optgroup>
      ))}
    </Select>
  )
}

/**
 * Créer un support sans quitter la saisie en cours.
 *
 * Renvoyer vers la page Épargne perdrait le brouillon — le montant, la date, le
 * libellé déjà tapés —, et revenir demanderait de tout retaper. La feuille pose
 * le même formulaire que la page dédiée, appelle la **même** mutation, et le
 * support créé revient présélectionné dans le champ.
 *
 * Une feuille et non un bloc dans le formulaire : deux `<form>` imbriqués ne
 * sont pas du HTML valide, et « Entrée » y validerait la mauvaise saisie.
 */
export function SupportCreateSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  /** L'identifiant du support créé, pour que l'appelant le sélectionne. */
  onCreated: (supportId: string) => void
}) {
  /* La feuille reste montée — c'est elle qui porte l'entrée et la sortie —,
     mais son formulaire est remonté à chaque ouverture : le brouillon vit en
     état local, et rouvrir après un premier support y laisserait son nom. */
  const [round, setRound] = useState(0)

  return (
    <SupportCreateForm
      key={round}
      open={open}
      onClose={() => {
        setRound((current) => current + 1)
        onClose()
      }}
      onCreated={(supportId) => {
        setRound((current) => current + 1)
        onCreated(supportId)
      }}
    />
  )
}

function SupportCreateForm({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (supportId: string) => void
}) {
  const members = useMembers()
  const { draft, patch, errors, build } = useSupportDraft(
    emptySupportDraft(members.length === 1 ? { memberId: members[0]?.id ?? '' } : {}),
  )

  const submit = (): void => {
    const input = build()
    if (input === null) return
    const created = addSavingSupport(input)
    toast(t.savings.supportAdded)
    onCreated(created.id)
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t.savings.supportNew}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} full>
            {t.common.cancel}
          </Button>
          <Button onClick={submit} full>
            {t.savings.supportAdd}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SupportFields draft={draft} patch={patch} errors={errors} />
      </div>
    </Sheet>
  )
}
