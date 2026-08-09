import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { RECURRENCES_PATH, SAVINGS_PATH, PEOPLE_PATH } from '@/app/routes'
import type { Member } from '@/domain/types'
import { t } from '@/i18n/strings'
import { formatMoney, formatPercent, tpl } from '@/i18n/format'
import { addMember, removeMember, renameMember, undoable } from '@/store/actions'
import {
  useAdvances,
  useMemberIncomes,
  useMemberSharesOfIncome,
  useMembers,
  useSavingSupports,
} from '@/store/selectors'
import { Button } from '@/ui/Button'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { Dot } from '@/ui/Dot'
import { Eyebrow } from '@/ui/Eyebrow'
import { Field, TextInput } from '@/ui/Field'
import { IncomeIcon } from '@/ui/Icons'
import { PageTitle } from '@/ui/PageTitle'
import { Tile } from '@/ui/Tile'
import { useCurrency } from '@/ui/currency'

/**
 * Ce que le retrait d'un membre annonce, selon ce qu'il emporte vraiment.
 *
 * Tout ce qu'il libère est réversible — une entrée rendue au commun se
 * réattribue —, sauf ses avances et ses supports d'épargne : leur `memberId`
 * n'est pas facultatif, une épargne est toujours à quelqu'un. Une question qui
 * annonce « rien n'est effacé » ne peut donc pas les taire.
 *
 * Les supports sont dits **en plus** et non à la place : ce sont deux pertes
 * distinctes, et une phrase qui n'en nommerait qu'une serait fausse sur
 * l'autre. L'historique financier, lui, ne bouge dans aucun des deux cas.
 */
function removeQuestion(name: string, advances: number, supports: number): string {
  const base =
    advances === 0
      ? tpl(t.settings.memberRemoveConfirm, name)
      : advances === 1
        ? tpl(t.settings.memberRemoveConfirmAdvanceOne, name)
        : tpl(t.settings.memberRemoveConfirmAdvances, advances, name)
  if (supports === 0) return base
  const about =
    supports === 1
      ? t.settings.memberRemoveSupportOne
      : tpl(t.settings.memberRemoveSupports, supports)
  return `${about} ${base}`
}

/**
 * La fiche d'un membre — ou le formulaire qui en crée un.
 *
 * Un seul écran pour les deux, comme le formulaire des récurrences : c'est le
 * même champ, la même validation et le même retour, et deux composants auraient
 * fini par ne plus poser la même question. Ce que l'ajout n'a pas, c'est ce qui
 * n'existe pas encore — un revenu à lire, un retrait à proposer.
 *
 * Le prénom se corrigeait jusqu'ici sur place, dans la liste : neuf lignes de
 * réglages portaient neuf champs de saisie, et rien ne distinguait la
 * consultation de l'édition. Il se valide maintenant, comme dans tous les
 * formulaires de l'app.
 */
export function MemberPage() {
  const { id } = useParams()
  const members = useMembers()
  const member = id === undefined ? undefined : members.find((one) => one.id === id)

  // Retiré depuis un autre onglet, ou URL fausse.
  if (id !== undefined && member === undefined) {
    return <Navigate to={PEOPLE_PATH} replace />
  }

  /* La clef porte l'identité de la fiche : le champ tient son brouillon en état
     local, et passer d'un membre à l'autre sans remonter le composant y
     laisserait le prénom du précédent. La coquille remonte déjà tout à chaque
     changement d'URL (`AppShell`), mais une fiche ne doit pas dépendre de ce
     que fait son cadre pour rester juste. */
  return <MemberView key={member?.id ?? 'nouveau'} {...(member === undefined ? {} : { member })} />
}

function MemberView({ member }: { member?: Member }) {
  const navigate = useNavigate()
  const incomes = useMemberIncomes()
  const shares = useMemberSharesOfIncome()
  const advances = useAdvances()
  const supports = useSavingSupports()
  const currency = useCurrency()
  const [name, setName] = useState(member?.name ?? '')
  const [removing, setRemoving] = useState(false)

  const trimmed = name.trim()
  const back = (): void => {
    void navigate(PEOPLE_PATH)
  }

  const read = member === undefined ? undefined : incomes.find((one) => one.memberId === member.id)
  const shareBp = member === undefined ? undefined : shares?.get(member.id)
  const removedAdvances =
    member === undefined ? 0 : advances.filter((advance) => advance.memberId === member.id).length
  const ownedSupports =
    member === undefined ? [] : supports.filter((support) => support.memberId === member.id)

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <PageTitle title={member?.name ?? t.settings.memberAdd} onBack={back}>
        {member !== undefined && <Dot color={member.color} size={10} className="shrink-0" />}
      </PageTitle>

      <Tile className="gap-4">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (trimmed === '') return
            if (member === undefined) addMember(trimmed)
            else renameMember(member.id, trimmed)
            back()
          }}
        >
          <Field label={t.settings.memberName}>
            {(fieldId) => (
              <TextInput
                id={fieldId}
                value={name}
                placeholder={t.settings.memberPlaceholder}
                maxLength={24}
                /* Le champ prend le focus à la création, où l'écran n'existe
                   que pour lui — jamais sur une fiche qu'on vient consulter,
                   où le clavier du téléphone recouvrirait ce qu'on venait
                   lire. La coquille laisse un écran qui pose son focus le
                   garder (voir `AppShell`). */
                autoFocus={member === undefined}
                onChange={(event) => {
                  setName(event.target.value)
                }}
              />
            )}
          </Field>
          <Button type="submit" disabled={trimmed === ''} className="w-fit">
            {member === undefined ? t.settings.memberAdd : t.common.save}
          </Button>
        </form>

        {/* Le revenu se lit, il ne se saisit pas : il vient des récurrences de
            ressources du membre, et c'est la seule vérité. Les deux cas où la
            récurrence existe déjà mènent au même écran, sous deux verbes
            différents — il manque un chiffre, ou le chiffre qui est là ne dit
            rien. */}
        {member !== undefined && (
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <Eyebrow icon={IncomeIcon}>{t.settings.memberIncome}</Eyebrow>
            <p className="t-body tnum">
              {read?.income != null
                ? formatMoney(read.income, currency, false)
                : read?.gap === 'unpriced'
                  ? t.settings.memberIncomeUnpriced
                  : read?.gap === 'zero'
                    ? t.settings.memberIncomeZero
                    : t.settings.memberNoIncome}
            </p>
            {shareBp !== undefined && (
              <p className="t-label">
                {tpl(t.settings.memberShareOf, formatPercent(shareBp / 10_000, 1))}
              </p>
            )}
            {(read?.gap === 'unpriced' || read?.gap === 'zero') && (
              <Link
                to={RECURRENCES_PATH}
                className="t-label inline-flex min-h-11 w-fit items-center rounded-input underline underline-offset-2"
              >
                {read.gap === 'unpriced'
                  ? t.settings.memberIncomeUnpricedFix
                  : t.settings.memberIncomeZeroFix}
              </Link>
            )}
          </div>
        )}
      </Tile>

      {/* À part, en bas, et jamais dans la même rangée qu'« Enregistrer » : le
          retrait touche les entrées, les récurrences, les avances et le filtre
          du mois d'un seul geste. C'est la distance qui le sépare, comme sur la
          fiche d'une récurrence — et le bouton reste discret parce que le geste
          se rattrape : la question est posée avant, et le message qui suit
          propose de revenir dessus. Le rouge est réservé à ce qui ne se
          rattrape pas. */}
      {member !== undefined && (
        <Tile className="gap-3">
          <p className="t-label">{t.settings.memberRemoveHint}</p>
          {/* Réattribuer avant de retirer : c'est le même geste que changer le
              propriétaire depuis la fiche d'un support, et il vaut mieux le
              proposer avant qu'après. */}
          {ownedSupports.length > 0 && (
            <>
              <p className="t-label">{t.settings.memberSupportsReassign}</p>
              <Link
                to={SAVINGS_PATH}
                className="t-label inline-flex min-h-11 w-fit items-center rounded-input underline underline-offset-2"
              >
                {t.settings.memberSupportsGo}
              </Link>
            </>
          )}
          <Button
            variant="ghost"
            className="w-fit"
            onClick={() => {
              setRemoving(true)
            }}
          >
            {tpl(t.settings.memberRemove, member.name)}
          </Button>
        </Tile>
      )}

      <ConfirmDialog
        open={removing}
        title={tpl(t.settings.memberRemove, member?.name ?? '')}
        steps={[
          {
            question: removeQuestion(member?.name ?? '', removedAdvances, ownedSupports.length),
            action: t.common.delete,
          },
        ]}
        onCancel={() => {
          setRemoving(false)
        }}
        onConfirm={() => {
          setRemoving(false)
          if (member === undefined) return
          /* Le seul des six gestes qui n'annonçait rien. C'est aussi celui qui
             touche le plus d'endroits à la fois — ses entrées et ses
             récurrences rendues au commun, ses avances supprimées, le filtre du
             mois rabattu sur « tout le monde », ses supports d'épargne et leurs
             relevés effacés — et donc celui où l'instantané rend le plus de
             service : aucun geste inverse ne les recollerait un par un. */
          undoable(tpl(t.settings.memberRemoved, member.name), () => {
            removeMember(member.id)
          })
          back()
        }}
      />
    </div>
  )
}
