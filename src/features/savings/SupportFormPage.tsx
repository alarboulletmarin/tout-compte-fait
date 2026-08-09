import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { SAVINGS_PATH, PEOPLE_PATH, rateNewPath, supportPath } from '@/app/routes'
import { isOrigin } from '@/domain/savingRate'
import type { SavingSupport } from '@/domain/types'
import { t } from '@/i18n/strings'
import { supports } from '@/i18n/supports'
import { formatDate, formatPercent, tpl } from '@/i18n/format'
import {
  addSavingSupport,
  archiveSavingSupport,
  removeSavingSupport,
  replaceSavingSupport,
  unarchiveSavingSupport,
  undoable,
} from '@/store/actions'
import {
  isSupportEmpty,
  useMembers,
  useSavingSupport,
  useSupportRate,
  useSupportUsage,
} from '@/store/selectors'
import { Button } from '@/ui/Button'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { EmptyState } from '@/ui/EmptyState'
import { Eyebrow } from '@/ui/Eyebrow'
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
 * écran, et « ajouter un relevé » en pose un nouveau — sans quoi l'historique
 * s'effacerait à chaque changement de nom.
 *
 * **C'est aussi ici que le support se gère**, en fin d'écran : archiver, rouvrir,
 * supprimer. Ces gestes tenaient une tuile permanente sur la fiche, sous
 * l'historique — donc le même poids qu'une lecture qu'on ouvre tous les mois,
 * pour deux boutons qu'on touche une fois dans la vie du compte. Ils sont
 * derrière « Modifier le support », qui est exactement l'intention qui y mène.
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
         ne se saisit pas sur ce formulaire — il a son geste, plus bas. */
      const { value: _ignored, note, ...rest } = input
      replaceSavingSupport(support.id, {
        ...rest,
        archived: support.archived,
        ...(note === undefined ? {} : { note }),
      })
      toast(t.savings.supportUpdated)
      void navigate(supportPath(support.id))
      return
    }
    const created = addSavingSupport(input)
    toast(t.savings.supportAdded)
    void navigate(supportPath(created.id), { replace: true })
  }

  /* Sans personne, rien à enregistrer : une épargne est toujours à quelqu'un,
     et l'écran le dit plutôt que de proposer un champ vide — la même règle que
     pour une avance, au même endroit du geste. */
  if (members.length === 0) {
    return (
      <div className="flex max-w-xl flex-col gap-5">
        <PageTitle title={t.savings.supportNew} onBack={back} />
        <EmptyState
          message={t.savings.supportsNoMember}
          actionLabel={t.split.goToSettings}
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
        title={editing ? t.savings.supportEdit : t.savings.supportNew}
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
          {editing ? t.common.save : t.savings.supportAdd}
        </Button>
        <Button variant="secondary" onClick={guard.request}>
          {t.common.cancel}
        </Button>
      </div>

      {/* La phrase sur les relevés a quitté cet écran : on y saisit un nom, un
          titulaire et un type, et aucun des trois ne prête à confondre un
          relevé avec un mouvement. Elle vit là où la confusion est réelle — la
          légende du calcul et les deux formulaires de relevé. */}

      {editing && <RateManagement supportId={support.id} />}
      {editing && <SupportManagement support={support} />}

      <ConfirmDialog {...guard.dialog} />
    </div>
  )
}

/**
 * Le rendement, depuis l'écran où l'on vient justement corriger le compte.
 *
 * Le taux ne se saisit pas ici — voir `SupportFields` : il s'empile daté, et le
 * reprendre depuis un formulaire qui écrase ce qu'il touche réécrirait le passé
 * du compte. Mais l'absence totale de tout renvoi vers lui, sur l'écran même où
 * l'on vient « modifier le support », le rendait introuvable à qui ne savait pas
 * déjà que la fiche porte une section à part. La fiche reste la seule à poser un
 * palier ou à en corriger un ancien ; ce bloc-ci ne fait qu'y mener, avec ce que
 * le compte sert aujourd'hui pour ne pas y renvoyer à l'aveugle.
 */
function RateManagement({ supportId }: { supportId: string }) {
  const navigate = useNavigate()
  const rate = useSupportRate(supportId)

  return (
    <Tile className="gap-3">
      <Eyebrow>{supports.rates}</Eyebrow>
      {rate === null ? (
        <p className="t-label">{supports.ratesEmpty}</p>
      ) : (
        <div className="flex items-baseline justify-between gap-3">
          <span className="t-label min-w-0 flex-1 truncate">
            {isOrigin(rate.from) ? supports.rateFromOrigin : tpl(supports.rateFrom, formatDate(rate.from))}
          </span>
          <span className="t-num-body tnum shrink-0">
            {`${formatPercent(rate.rateBp / 10_000, rate.rateBp % 100 === 0 ? 0 : 2)} · ${
              rate.kind === 'guaranteed' ? t.savings.supportRateGuaranteed : t.savings.supportRateAssumed
            }`}
          </span>
        </div>
      )}
      <Button
        variant="secondary"
        size="sm"
        className="w-fit"
        onClick={() => {
          void navigate(rateNewPath(supportId))
        }}
      >
        {rate === null ? supports.rateFirst : supports.rateAdd}
      </Button>
    </Tile>
  )
}

/**
 * Ce qu'on fait d'un support dont on ne veut plus.
 *
 * À distance des boutons qui closent la saisie, comme partout : ce n'est pas une
 * façon de sortir de l'écran. Le geste de suppression n'existe que sur ce qui
 * n'a pas d'histoire ; ailleurs c'est l'archivage, et l'écran dit pourquoi
 * plutôt que de laisser chercher un bouton qui n'est pas là.
 */
function SupportManagement({ support }: { support: SavingSupport }) {
  const navigate = useNavigate()
  const usage = useSupportUsage(support.id)
  const [archiving, setArchiving] = useState(false)
  const [removing, setRemoving] = useState(false)

  const deletable = isSupportEmpty(usage)
  const running = usage.runningRecurrences
  const toSavings = (): void => {
    void navigate(SAVINGS_PATH)
  }

  return (
    <>
      <Tile className="gap-3">
        <Eyebrow>{t.savings.manage}</Eyebrow>
        <p className="t-label">{t.savings.archivedHint}</p>
        {/* Pourquoi le bouton « Supprimer » n'est pas là : la règle se lit, elle
            ne se devine pas à l'absence d'un bouton. */}
        {!support.archived && !deletable && <p className="t-label">{t.savings.removeBlocked}</p>}
        <div className="flex flex-wrap gap-2">
          {support.archived ? (
            <Button
              variant="ghost"
              className="w-fit"
              onClick={() => {
                undoable(t.savings.supportUnarchived, () => {
                  unarchiveSavingSupport(support.id)
                })
              }}
            >
              {t.savings.unarchive}
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="w-fit"
              onClick={() => {
                setArchiving(true)
              }}
            >
              {t.savings.archive}
            </Button>
          )}
          {deletable && (
            <Button
              variant="ghost"
              className="w-fit"
              onClick={() => {
                setRemoving(true)
              }}
            >
              {t.savings.remove}
            </Button>
          )}
        </div>
      </Tile>

      {/* Un support archivé qui continue de recevoir 300 € par mois serait un
          compte invisible qui grossit tout seul : la question le dit, et le
          bouton fait les deux gestes d'un coup. */}
      <ConfirmDialog
        open={archiving}
        title={t.savings.archive}
        steps={[
          {
            question:
              running === 0
                ? t.savings.archiveConfirm
                : `${running === 1 ? t.savings.archiveRunningOne : tpl(t.savings.archiveRunning, running)} ${t.savings.archiveConfirm}`,
            action:
              running === 0
                ? t.savings.archive
                : running === 1
                  ? t.savings.archiveAndStop
                  : t.savings.archiveAndStopMany,
          },
        ]}
        onCancel={() => {
          setArchiving(false)
        }}
        onConfirm={() => {
          setArchiving(false)
          undoable(t.savings.supportArchived, () => {
            archiveSavingSupport(support.id, { stopRecurrences: running > 0 })
          })
          toSavings()
        }}
      />

      <ConfirmDialog
        open={removing}
        title={t.savings.remove}
        steps={[{ question: t.savings.removeConfirm, action: t.common.delete }]}
        onCancel={() => {
          setRemoving(false)
        }}
        onConfirm={() => {
          setRemoving(false)
          undoable(t.savings.supportRemoved, () => {
            removeSavingSupport(support.id)
          })
          toSavings()
        }}
      />
    </>
  )
}
