import { useId, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ADVANCES_PATH,
  CREDITS_PATH,
  RECURRENCE_NEW_PATH,
  recurrencePath,
} from '@/app/routes'
import { totalRemaining } from '@/domain/advance'
import {
  NO_MEMBER,
  type RecurrenceGroup,
  type RecurrenceGroupBy,
  type RecurrenceSortBy,
  groupRecurrences,
  sortRecurrences,
} from '@/domain/grouping'
import { money } from '@/domain/money'
import { t } from '@/i18n/strings'
import { formatMoney, tpl } from '@/i18n/format'
import {
  useAdvanceStatuses,
  useCategoryMap,
  useKindOf,
  useMemberMap,
  type RecurrenceRow as Row,
  useRecurrenceRows,
  useRecurrenceTotals,
} from '@/store/selectors'
import { type EntryNature, kindsOfNature } from '@/ui/categoryKinds'
import { Amount } from '@/ui/Amount'
import { Button } from '@/ui/Button'
import { Chip } from '@/ui/Chip'
import { Disclosure } from '@/ui/Disclosure'
import { useDisclosureGroup } from '@/ui/useDisclosureGroup'
import { EmptyState } from '@/ui/EmptyState'
import { Eyebrow } from '@/ui/Eyebrow'
import { Select } from '@/ui/Field'
import { ChevronDown, Plus, RecurrencesIcon } from '@/ui/Icons'
import { PageTitle } from '@/ui/PageTitle'
import { Row as GroupRow, RowGroup } from '@/ui/RowGroup'
import { Segmented } from '@/ui/Segmented'
import { Tile } from '@/ui/Tile'
import { useCurrency } from '@/ui/currency'
import { RecurrenceRow } from './RecurrenceRow'

const axes = () => [
  { value: 'category' as const, label: t.recurrences.byCategory },
  { value: 'member' as const, label: t.recurrences.byMember },
]

/* L'ordre était toujours celui du domaine — par prochaine échéance, qui répond
   à « qu'est-ce qui tombe bientôt ». C'est cet écran-là qui porte l'autre
   question, « qu'est-ce qui me coûte le plus », et son chiffre est déjà sur
   chaque ligne. */
const sorts = () => [
  { value: 'due' as const, label: t.recurrences.byDue },
  { value: 'amount' as const, label: t.recurrences.byAmount },
]

/** La nature que la liste montre, ou `null` pour tout. */
type NatureFilter = EntryNature | null

/* L'axe range, le filtre retire — deux gestes différents, deux commandes
   différentes. C'est déjà la règle de la liste du mois, et les mots sont les
   siens : des natures, jamais des sens. Filtrer par sens rangeait la mensualité
   d'épargne sous « Charges » — un mot que la tuile du même nom refuse, elle qui
   compte charges et crédits sans l'épargne. Les mots sont ceux de la saisie,
   positions comprises. */
const natures = (): { value: NatureFilter; label: string }[] => [
  { value: null, label: t.recurrences.showAll },
  { value: 'expense', label: t.recurrences.showOut },
  { value: 'income', label: t.recurrences.showIn },
  { value: 'saving', label: t.recurrences.showSaving },
]

/**
 * Les groupes se replient : c'est un résumé dans lequel on entre, et l'en-tête
 * porte déjà le chiffre.
 */
const OPEN_BY_DEFAULT: Record<RecurrenceGroupBy, boolean> = {
  category: false,
  member: false,
}

/** L'étiquette du total, et la vérification qui l'accompagne. */
const totalLabel = (): Record<string, string> => ({
  all: t.recurrences.totalOut,
  expense: t.recurrences.totalSpending,
  income: t.recurrences.totalIn,
  saving: t.recurrences.totalSaving,
})

const totalScope = (): Record<string, string> => ({
  all: t.recurrences.scopeOut,
  expense: t.recurrences.scopeSpending,
  income: t.recurrences.scopeIn,
  saving: t.recurrences.scopeSaving,
})

/**
 * Ce que les récurrences coûtent — ou rapportent — chaque mois.
 *
 * Le chiffre suit la pastille : câblé sur les seules sorties, il décrivait mal
 * la liste qu'il surplombe dès qu'elle montrait autre chose.
 *
 * **Le périmètre est passé du texte à l'étiquette.** Un total sans périmètre ne
 * se vérifie pas — « 2 008,31 € » n'apprend ni si c'est le foyer entier ou
 * quelqu'un, ni si l'épargne en fait partie — mais « Total par mois » suivi de
 * soixante-dix caractères qui disent que ce total n'est que celui des sorties
 * fait porter la correction à la ligne du dessous. L'étiquette nomme donc le
 * chiffre (DS §6), et ce qui reste sous lui se lit en trois crans : le mensuel,
 * l'annuel, la vérification.
 */
function Totals({ nature }: { nature: NatureFilter }) {
  const kinds = useMemo(() => (nature === null ? null : kindsOfNature(nature)), [nature])
  const totals = useRecurrenceTotals(kinds)
  const currency = useCurrency()
  const key = nature ?? 'all'

  return (
    <Tile variant="accent">
      <Eyebrow icon={RecurrencesIcon}>{totalLabel()[key]}</Eyebrow>
      <Amount value={totals.monthly} size="tile" className="mt-3" />
      <p className="t-label mt-1 tnum">
        {tpl(t.recurrences.perYear, formatMoney(totals.annual, currency, false))}
      </p>
      <p className="t-axis mt-3">{totalScope()[key]}</p>
      {totals.unknownCount > 0 && (
        <p className="t-axis mt-1">
          {tpl(
            totals.unknownCount > 1
              ? t.recurrences.variableExcluded
              : t.recurrences.variableExcludedOne,
            totals.unknownCount,
          )}
        </p>
      )}
    </Tile>
  )
}

/**
 * Le tri, en sélecteur plutôt qu'en bascule.
 *
 * Trois bascules empilées disaient trois choix de même poids, alors que ce sont
 * trois gestes différents : ranger, trier, retirer. Le sélecteur est le seul des
 * trois contrôles à ne pas avoir besoin de montrer ses positions — on ne trie
 * pas en comparant les options, on trie en changeant d'ordre — et il rend une
 * rangée entière à la liste.
 *
 * Le chevron est dessiné ici et non dans `ui/Field` : le `Select` du DS pose
 * `appearance-none` sans repère, ce qui vaut pour tous les sélecteurs de l'app,
 * mais l'envelopper à la source déciderait de la largeur de tous — dont celui de
 * la devise, qui tient la sienne de sa plus longue option. Un seul appelant, un
 * seul cadre.
 */
function SortField({
  value,
  onChange,
}: {
  value: RecurrenceSortBy
  onChange: (next: RecurrenceSortBy) => void
}) {
  const id = useId()

  return (
    <div className="flex min-w-0 items-center gap-2">
      {/* Le libellé visible *est* le nom accessible : un « Trier » posé à côté
          d'un contrôle qu'il ne nomme pas laisserait le sélecteur anonyme. */}
      <label htmlFor={id} className="t-axis shrink-0">
        {t.recurrences.sortBy}
      </label>
      {/* La largeur vit sur le cadre et non sur le contrôle : `cn` ne fusionne
          pas les classes de Tailwind, un `w-auto` posé sur un `Select` qui porte
          déjà `w-full` laisserait la cascade trancher. Le sélecteur remplit son
          cadre, et le cadre tient la plus longue des deux options. */}
      <span className="relative inline-flex w-32 items-center">
        <Select
          id={id}
          value={value}
          onChange={(event) => {
            onChange(event.target.value as RecurrenceSortBy)
          }}
        >
          {sorts().map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-3 text-muted"
        />
      </span>
    </div>
  )
}

/** L'échéance la plus proche d'un groupe : sa première ligne, la liste étant déjà rangée. */
function earliest(group: RecurrenceGroup<Row>): string | null {
  return group.rows[0]?.next ?? null
}

/**
 * La liste, rangée sur l'axe choisi, filtrée par sens, et repliable.
 *
 * Un salaire et un abonnement de streaming ne se distinguent que par le « + »
 * que le DS §3 accorde aux entrées — trop peu dans une liste qui les mêle,
 * d'autant que la pastille prend la teinte de la catégorie et non du sens.
 * C'est le filtre qui répond à ça, et non plus deux blocs figés : il retire ce
 * qu'on ne regarde pas au lieu de le ranger à côté, et il se combine aux deux
 * axes plutôt que de leur prendre une position.
 *
 * **Les contrôles vivent dans la tuile de la liste**, comme sur l'écran du mois
 * (`month/EntriesSection`). Posés au-dessus d'elle, ils formaient trois blocs
 * successifs sans cadre — une bascule et un bouton, une bascule seule, quatre
 * pilules — qui prenaient plus de hauteur que les premières lignes de la liste
 * qu'ils commandent, et qui ne disaient pas sur quoi ils agissaient.
 */
function GroupedList({
  rows,
  nature,
  onNature,
  onOpen,
}: {
  rows: Row[]
  nature: NatureFilter
  onNature: (nature: NatureFilter) => void
  onOpen: (id: string) => void
}) {
  const categories = useCategoryMap()
  const kindOf = useKindOf()
  const members = useMemberMap()
  const [by, setBy] = useState<RecurrenceGroupBy>('category')
  const [sort, setSort] = useState<RecurrenceSortBy>('due')

  const shown = useMemo(() => {
    if (nature === null) return rows
    const kinds = kindsOfNature(nature)
    return rows.filter((row) => kinds.includes(kindOf(row.recurrence.categoryId)))
  }, [rows, nature, kindOf])
  /* Le tri passe avant le regroupement, et non après : `groupRecurrences` garde
     l'ordre qu'on lui donne à l'intérieur de chaque groupe. */
  const sorted = useMemo(() => sortRecurrences(shown, sort), [shown, sort])
  /* L'ordre des groupes suit le tri, lui aussi.
     `groupRecurrences` les range toujours par poids, ce qui *est* la réponse au
     tri par montant. Mais les groupes sont repliés au chargement : sous « tri
     par échéance », le seul effet du tri se cachait alors à l'intérieur de
     sections fermées, et l'écran ne bougeait pas d'un pixel. Le domaine n'a rien
     à changer pour ça — la liste qu'il reçoit est déjà rangée par échéance, donc
     la première ligne d'un groupe porte la sienne. */
  const groups = useMemo(() => {
    const built = groupRecurrences(sorted, by)
    if (sort !== 'due') return built
    return [...built].sort((a, b) => {
      const left = earliest(a)
      const right = earliest(b)
      if (left === null) return right === null ? 0 : 1
      if (right === null) return -1
      return left < right ? -1 : left > right ? 1 : 0
    })
  }, [sorted, by, sort])
  const keys = useMemo(() => groups.map((g) => g.key), [groups])
  const disclosure = useDisclosureGroup(keys, OPEN_BY_DEFAULT[by])

  const titleOf = (key: string): string => {
    if (by === 'category') return categories.get(key)?.label ?? t.common.other
    return key === NO_MEMBER ? t.shell.everyone : (members.get(key)?.name ?? t.common.other)
  }

  /* Sous une pilule, le solde d'un groupe parlerait à l'envers du total en
     tête : les charges toutes négatives sous un chiffre positif, l'épargne au
     signe inverse de « ce qui part sur l'épargne ». Le groupe suit donc la
     pilule — sortie pleine, entrée, ou net d'épargne — et garde son solde sur
     « Tout », où les natures se mêlent. */
  const natureAmount = (total: number) => {
    if (nature === null) return <Amount value={money(total)} size="body" signed />
    if (nature === 'income') return <Amount value={money(total)} size="body" direction="in" />
    if (nature === 'expense') return <Amount value={money(total)} size="body" direction="out" />
    return <Amount value={money(-total)} size="body" signed />
  }

  /* La seconde ligne d'un en-tête de groupe : combien de règles, et combien
     d'entre elles manquent au chiffre de droite. Un groupe *entièrement*
     variable n'a pas de chiffre du tout, il n'a donc rien à nuancer. */
  /* À qui la ligne est, quand la liste est rangée par poste : c'est ce que son
     libellé ne dit pas — « Mobile » ne désigne personne — et ce que l'en-tête du
     groupe ne dit pas non plus, puisqu'il nomme le poste.
     Rangée par personne, la réciproque a été essayée et retirée : le poste tient
     rarement en un mot, et « 5 sept. · dans 28 jours · Fra… » ne dit plus rien
     de « Frais de garde ». C'est aussi le cas où la question ne se pose pas —
     « Crèche », « Crédit immobilier », « Impôt sur le revenu » se nomment
     eux-mêmes, là où un prénom ne se devine jamais.

     Rend `{}` et non `{ who: undefined }` : `exactOptionalPropertyTypes`
     interdit de passer explicitement `undefined` à une prop optionnelle. */
  const whoOf = (row: Row): { who?: string } => {
    if (by !== 'category' || row.recurrence.memberId === undefined) return {}
    const name = members.get(row.recurrence.memberId)?.name
    return name === undefined || name === '' ? {} : { who: name }
  }

  const countOf = (group: RecurrenceGroup<Row>): string => {
    const count = tpl(
      group.rows.length > 1 ? t.recurrences.groupCount : t.recurrences.groupCountOne,
      group.rows.length,
    )
    if (group.unknownCount === 0 || group.unknownCount === group.rows.length) return count
    return `${count} · ${tpl(t.recurrences.groupVariable, group.unknownCount)}`
  }

  return (
    <Tile className="gap-3">
      {/* Ranger, et l'action secondaire qui ouvre tout : « tout déplier » n'est
          pas une troisième position de la bascule, et il ne se pose donc pas à
          côté d'elle comme s'il en était une. */}
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          options={axes()}
          value={by}
          onChange={(next) => {
            setBy(next)
            disclosure.reset()
          }}
          label={t.recurrences.groupBy}
        />
        {/* `ml-auto` et non `justify-between` : à 320px la rangée passe à la
            ligne, et un `justify-between` y aurait posé le bouton à gauche, sous
            la bascule, où il se lit comme une troisième position. La marge
            automatique le garde à droite sur les deux mises en page. */}
        <Button size="sm" variant="ghost" className="ml-auto" onClick={disclosure.toggleAll}>
          {disclosure.anyOpen ? t.recurrences.collapseAll : t.recurrences.expandAll}
        </Button>
      </div>

      {/* Retirer, et trier. Les pilules gardent leur groupe à elles : le tri
          n'en est pas une, il ne retire rien. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div role="group" aria-label={t.recurrences.show} className="flex flex-wrap gap-2">
          {natures().map((option) => (
            <Chip
              key={option.label}
              active={option.value === nature}
              onClick={() => {
                onNature(option.value)
              }}
            >
              {option.label}
            </Chip>
          ))}
        </div>
        <SortField value={sort} onChange={setSort} />
      </div>

      {/* Un filtre peut ne rien laisser, alors que la page n'est pas vide : le
          dire, plutôt que de poser une tuile vide qui semble s'être cassée — et
          poser la sortie à côté, parce qu'une liste vide est le moment où l'on
          cherche à revenir, pas celui où l'on relit les commandes. */}
      {shown.length === 0 ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
          <p className="t-label">
            {nature === 'income'
              ? t.recurrences.showEmptyIn
              : nature === 'saving'
                ? t.recurrences.showEmptySaving
                : t.recurrences.showEmptyOut}
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              onNature(null)
            }}
          >
            {t.recurrences.showAllBack}
          </Button>
        </div>
      ) : (
        /* Le débordement rend à la rangée la marge de la tuile : le chevron
           tombe alors sur la ligne de la bascule, et le fond de survol dépasse
           le texte. Un filet entre deux groupes, jamais avant le premier — la
           tuile a déjà un bord. */
        <div className="-mx-3 flex flex-col [&>*+*]:border-t [&>*+*]:border-border">
          {groups.map((group) => (
            <Disclosure
              key={group.key}
              open={disclosure.isOpen(group.key)}
              onOpenChange={(open) => {
                disclosure.setOpen(group.key, open)
              }}
              title={
                /* Deux lignes et non une : le compte prenait au nom la moitié de
                   la largeur, et « Salaires, retraites ou indemnités » se coupait
                   au troisième mot. Sur sa propre ligne, le nom dispose de tout
                   ce que le montant ne prend pas — et le montant, lui, ne bouge
                   pas d'une rangée à l'autre. */
                <span className="flex min-w-0 flex-col py-1">
                  <span className="t-body truncate">{titleOf(group.key)}</span>
                  <span className="t-axis truncate">{countOf(group)}</span>
                </span>
              }
              trailing={
                /* Un groupe dont tout est à montant variable n'a pas de chiffre à
                   montrer : mieux vaut le dire que d'annoncer zéro. */
                group.unknownCount === group.rows.length ? (
                  <span className="t-axis">{t.recurrences.variable}</span>
                ) : (
                  natureAmount(group.monthly)
                )
              }
            >
              {/* Les lignes s'alignent sous le nom du groupe — chevron, sa
                  gouttière et le cadre de l'en-tête — et se séparent d'un filet.
                  Une sous-tuile par récurrence aurait posé un cadre dans un
                  cadre dans un cadre ; l'indentation dit la même chose et ne
                  coûte rien. */}
              <ul className="flex flex-col pl-6 [&>*+*]:border-t [&>*+*]:border-border">
                {group.rows.map((row) => (
                  <li key={row.recurrence.id}>
                    <RecurrenceRow
                      row={row}
                      color={categories.get(row.recurrence.categoryId)?.color ?? 'var(--cat-rest)'}
                      {...whoOf(row)}
                      onOpen={() => {
                        onOpen(row.recurrence.id)
                      }}
                    />
                  </li>
                ))}
              </ul>
            </Disclosure>
          ))}
        </div>
      )}
    </Tile>
  )
}

function StoppedList({ rows, onOpen }: { rows: Row[]; onOpen: (id: string) => void }) {
  const categories = useCategoryMap()
  const keys = useMemo(() => ['stopped'], [])
  const disclosure = useDisclosureGroup(keys, false)

  return (
    <Tile>
      <div className="-mx-3">
        <Disclosure
          open={disclosure.isOpen('stopped')}
          onOpenChange={(open) => {
            disclosure.setOpen('stopped', open)
          }}
          title={
            <span className="flex min-w-0 flex-col py-1">
              <span className="t-body truncate">{t.recurrences.stoppedBadge}</span>
              <span className="t-axis truncate">
                {tpl(
                  rows.length > 1 ? t.recurrences.groupCount : t.recurrences.groupCountOne,
                  rows.length,
                )}
              </span>
            </span>
          }
        >
          <ul className="flex flex-col pl-9 [&>*+*]:border-t [&>*+*]:border-border">
            {rows.map((row) => (
              <li key={row.recurrence.id}>
                <RecurrenceRow
                  row={row}
                  color={categories.get(row.recurrence.categoryId)?.color ?? 'var(--cat-rest)'}
                  onOpen={() => {
                    onOpen(row.recurrence.id)
                  }}
                />
              </li>
            ))}
          </ul>
        </Disclosure>
      </div>
    </Tile>
  )
}

/**
 * Les deux suivis qui prolongent les récurrences, sur deux rangées.
 *
 * Ils prenaient le bas de l'écran à eux seuls : une tuile pleine par avance,
 * avec son propre bouton « Ajouter », puis un paragraphe et un lien souligné
 * vers les crédits. Or ce sont deux destinations, pas deux sections — ce qu'on
 * vient y chercher est ce que la mensualité seule ne dit pas, capital restant dû
 * d'un côté, reste à remettre de l'autre. Deux rangées dans un cadre le disent,
 * et rendent à la liste la hauteur qu'elles occupaient.
 *
 * Hors du branchement de l'état vide, comme avant : une avance ou un crédit
 * s'enregistrent très bien avant la première récurrence saisie à la main.
 */
function Trackers() {
  const statuses = useAdvanceStatuses()
  const currency = useCurrency()

  const advances =
    statuses.length === 0
      ? t.advances.empty
      : [
          tpl(
            statuses.length > 1 ? t.advances.count : t.advances.countOne,
            statuses.length,
          ),
          tpl(
            t.advances.remainingTotal,
            formatMoney(totalRemaining(statuses), currency, false),
          ),
        ].join(' · ')

  return (
    <RowGroup>
      <GroupRow label={t.advances.section} description={advances} to={ADVANCES_PATH} />
      <GroupRow
        label={t.credits.title}
        description={t.recurrences.creditsHint}
        to={CREDITS_PATH}
      />
    </RowGroup>
  )
}

export function RecurrencesPage() {
  const rows = useRecurrenceRows()
  const navigate = useNavigate()

  /* La nature vit sur la page et non dans la liste : le total en tête la suit
     aussi, et deux états séparés les feraient annoncer deux choses. */
  const [nature, setNature] = useState<NatureFilter>(null)

  const active = useMemo(() => rows.filter((row) => !row.stopped), [rows])
  const stopped = useMemo(() => rows.filter((row) => row.stopped), [rows])

  const openCreate = (): void => {
    void navigate(RECURRENCE_NEW_PATH)
  }

  const openDetail = (id: string): void => {
    void navigate(recurrencePath(id))
  }

  return (
    <>
      {/* L'état vide porte déjà le même bouton : le garder en titre l'affiche
          deux fois dans le même écran.

          Il reste malgré le bouton flottant, et ce n'est pas un doublon : celui
          d'en bas ouvre les trois portes de saisie d'une opération ponctuelle,
          celui-ci pose une règle. Le nom accessible le dit en toutes lettres, là
          où « Ajouter » seul laisse deviner quoi. */}
      <PageTitle title={t.recurrences.title}>
        {rows.length > 0 && (
          <Button onClick={openCreate} aria-label={t.recurrences.add}>
            <Plus size={18} />
            {t.common.add}
          </Button>
        )}
      </PageTitle>

      <div className="flex max-w-3xl flex-col gap-4">
        {rows.length === 0 ? (
          <EmptyState
            message={t.recurrences.empty}
            actionLabel={t.recurrences.add}
            onAction={openCreate}
          />
        ) : (
          <>
            <Totals nature={nature} />
            {active.length > 0 && (
              <GroupedList rows={active} nature={nature} onNature={setNature} onOpen={openDetail} />
            )}
            {stopped.length > 0 && <StoppedList rows={stopped} onOpen={openDetail} />}
          </>
        )}

        <Trackers />
      </div>
    </>
  )
}
