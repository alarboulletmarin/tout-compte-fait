import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ADVANCE_NEW_PATH, RECURRENCES_PATH } from '@/app/routes'
import type { AdvanceStatus } from '@/domain/advance'
import { t } from '@/i18n/strings'
import { formatMoney, formatYearMonth, tpl } from '@/i18n/format'
import { removeAdvance, undoable } from '@/store/actions'
import { useAdvanceStatuses, useCategoryMap, useMemberMap } from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Button } from '@/ui/Button'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { EmptyState } from '@/ui/EmptyState'
import { Eyebrow } from '@/ui/Eyebrow'
import { Plus } from '@/ui/Icons'
import { PageTitle } from '@/ui/PageTitle'
import { Tile } from '@/ui/Tile'
import { useCurrency } from '@/ui/currency'

/**
 * Une avance, et où elle en est.
 *
 * **Le chiffre de la carte est ce qu'il reste à remettre**, et non la
 * mensualité. Les deux y étaient à la même taille, dans deux rangées qui se
 * ressemblaient : celle du haut disait ce qui repart chaque mois, celle du bas
 * ce qui manque encore, et rien ne disait laquelle on venait chercher. C'est la
 * seconde — la mensualité se lit déjà dans la liste des récurrences, sous son
 * support, puisque c'en est une ; ce que cet écran ajoute est justement ce que
 * la mensualité seule ne dit pas.
 *
 * Les métadonnées descendent en lectures tertiaires, une par ligne, au lieu
 * d'une phrase à trois points : « 56 € par mois sur 12 mois · Alix · Assurance
 * véhicule » se lit comme un seul fait alors qu'elle en dit trois, et se coupait
 * au milieu du troisième à 320px.
 */
function AdvanceCard({ status, onRemove }: { status: AdvanceStatus; onRemove: () => void }) {
  const categories = useCategoryMap()
  const members = useMemberMap()
  const currency = useCurrency()
  const { advance } = status

  return (
    <Tile className="gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="t-body min-w-0 flex-1 truncate font-medium">{advance.label}</span>
        <Amount value={status.monthly} size="body" direction="out" />
      </div>
      <span className="t-axis">
        {tpl(t.advances.monthlyOf, formatMoney(status.monthly, currency, false), status.months)}
      </span>

      <div className="flex flex-col gap-1 border-t border-border pt-3">
        <Eyebrow>{status.settled ? t.advances.settled : t.advances.remaining}</Eyebrow>
        <Amount
          value={status.remaining}
          size="tile"
          tone={status.settled ? 'muted' : 'default'}
          className="mt-1"
        />
        <span className="t-axis mt-1">
          {`${t.advances.restored} ${formatMoney(status.restored, currency)}`}
        </span>
        <span className="t-axis">
          {tpl(t.advances.over, formatYearMonth(advance.from), formatYearMonth(advance.to))}
        </span>
        <span className="t-axis">
          {[
            members.get(advance.memberId)?.name,
            categories.get(advance.categoryId)?.label ?? t.common.other,
          ]
            .filter((part) => part !== undefined && part !== '')
            .join(' · ')}
        </span>
      </div>

      <Button size="sm" variant="ghost" className="self-start" onClick={onRemove}>
        {t.advances.remove}
      </Button>
    </Tile>
  )
}

/**
 * Les avances en cours — une charge payée en une fois, qu'on se remet sur le
 * livret mois par mois.
 *
 * **Un écran et non plus une section**, pour la raison qui donne le sien aux
 * crédits. Ce qu'une avance produit *est* une récurrence — la mensualité qui
 * reconstitue l'épargne, et qui figure d'ailleurs dans la liste des récurrences
 * sous son support. Elle vivait donc là-bas, en pied de page : une tuile pleine
 * par avance, un second bouton « Ajouter » sans rapport avec celui du titre, et
 * tout cela après une liste qu'on venait déjà de faire défiler. La liste n'en
 * garde qu'une rangée, qui dit combien et combien il reste ; le suivi est ici.
 *
 * Ce n'est pas un écran de saisie : il garde la barre d'onglets et le bouton
 * flottant, comme `/credits`. Seul `/avances/nouveau` est un écran plein.
 */
export function AdvancesPage() {
  const statuses = useAdvanceStatuses()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState<string | null>(null)

  const openCreate = (): void => {
    void navigate(ADVANCE_NEW_PATH)
  }

  return (
    /* La largeur de la page, et non une colonne de 768px au milieu de l'écran :
       le bandeau de la coquille, lui, prend cette largeur, et une liste bornée
       plus étroit que le bandeau qui la surmonte donne deux bords droits sur le
       même écran — mesuré à 224px d'écart à 1920 points. */
    <div className="flex flex-col gap-4">
      {/* L'état vide porte déjà le même bouton : le garder en titre l'afficherait
          deux fois dans le même écran. */}
      <PageTitle
        title={t.advances.title}
        onBack={() => {
          void navigate(RECURRENCES_PATH)
        }}
      >
        {statuses.length > 0 && (
          <Button size="sm" className="ml-auto" onClick={openCreate}>
            <Plus size={18} />
            {t.common.add}
          </Button>
        )}
      </PageTitle>

      {/* Ce que le mot recouvre, dit une fois et en tête : « avance » est le
          seul terme de l'app qu'on ne devine pas à sa seule lecture. */}
      <p className="t-label">{t.advances.sectionHint}</p>

      {statuses.length === 0 ? (
        <EmptyState
          message={t.advances.emptyInvite}
          actionLabel={t.advances.add}
          onAction={openCreate}
        />
      ) : (
        /* Deux colonnes de fiches au-delà de 768px, une seule en deçà — et une
           seule aussi tant qu'il n'y a qu'une avance : deux colonnes dont une
           est vide ne sont pas une mise en page (DS §5). Une avance est une
           fiche autonome, pas une rangée : elle se range côte à côte sans qu'on
           ait à suivre une colonne du regard. */
        <ul className={statuses.length > 1 ? 'cols' : 'flex flex-col gap-3'}>
          {statuses.map((status) => (
            <li key={status.advance.id}>
              <AdvanceCard
                status={status}
                onRemove={() => {
                  setConfirming(status.advance.id)
                }}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Une seule boîte pour toute la liste : elle sait laquelle des avances
          elle vise, et n'en monte pas une par ligne dans le DOM. */}
      <ConfirmDialog
        open={confirming !== null}
        title={t.advances.remove}
        steps={[{ question: t.advances.removeConfirm, action: t.common.delete }]}
        onCancel={() => {
          setConfirming(null)
        }}
        onConfirm={() => {
          const id = confirming
          setConfirming(null)
          if (id === null) return
          undoable(t.advances.deleted, () => {
            removeAdvance(id)
          })
        }}
      />
    </div>
  )
}
