import { useEffect, useMemo, useRef, useState } from 'react'
import { today } from '@/domain/date'
import { type GroupBy, NO_MEMBER, groupEntries } from '@/domain/grouping'
import { money, sum } from '@/domain/money'
import type { Entry } from '@/domain/types'
import { t } from '@/i18n/strings'
import { formatDayFull, tpl } from '@/i18n/format'
import { cn } from '@/lib/cn'
import { reveal } from '@/lib/reveal'
import {
  useCategoryMap,
  useFamilyMap,
  useFamilyOf,
  useKindOf,
  useMemberFilter,
  useMemberMap,
  useMembers,
  useMonthEntries,
  useMonthUnconfirmable,
} from '@/store/selectors'
import { unconfirmEntries, undoable } from '@/store/actions'
import { type EntryNature, kindsOfNature } from '@/ui/categoryKinds'
import { Amount } from '@/ui/Amount'
import { Button } from '@/ui/Button'
import { Chip } from '@/ui/Chip'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { Disclosure } from '@/ui/Disclosure'
import { useDisclosureGroup } from '@/ui/useDisclosureGroup'
import { Eyebrow } from '@/ui/Eyebrow'
import { Close, EntriesIcon } from '@/ui/Icons'
import { familyColor } from '@/persistence/defaults'
import { ListRow } from '@/ui/ListRow'
import { Segmented } from '@/ui/Segmented'
import { Tile } from '@/ui/Tile'
import { MonthEntryRow } from './MonthEntryRow'

/** La nature que la liste montre, ou `null` pour tout. */
export type NatureFilter = EntryNature | null

const allAxes = () => [
  { value: 'day' as const, label: t.month.byDay },
  { value: 'category' as const, label: t.month.byCategory },
  { value: 'member' as const, label: t.month.byMember },
]

/* L'axe range, le filtre retire — deux gestes différents, deux commandes
   différentes. La bascule dit sur quoi la liste est rangée, les pilules ce
   qu'elle montre : c'est déjà la règle de l'en-tête du mois, qui filtre par
   membre avec les mêmes pilules.

   Les pilules disent des natures, jamais des sens : un versement d'épargne
   sort du compte mais n'est pas une charge, et une reprise n'est pas un
   revenu. Filtrer par sens rangeait l'un sous « Charges » et l'autre sous
   « Revenus » — deux mots empruntés aux tuiles, qui comptent par nature et
   excluent l'épargne. Les mots sont ceux de la saisie, positions comprises. */
const natures = (): { value: NatureFilter; label: string }[] => [
  { value: null, label: t.month.showAll },
  { value: 'expense', label: t.month.showOut },
  { value: 'income', label: t.month.showIn },
  { value: 'saving', label: t.month.showSaving },
]

/**
 * Le sous-libellé d'une ligne : à qui elle est, et ce qu'on a noté dessus.
 *
 * La note se saisissait et ne se relisait nulle part — ni ici, ni au
 * calendrier, ni dans les résultats de recherche : il fallait rouvrir la ligne
 * pour la voir, et rien n'annonçait qu'il y en avait une. Une fiche de
 * récurrence, elle, affiche la sienne depuis toujours ; c'était une asymétrie,
 * pas une décision.
 *
 * Les deux se joignent plutôt que de se chasser : « Alix · avance de janvier »
 * répond aux deux questions sur une ligne qui n'en a qu'une à donner, et
 * `ListRow` la tronque comme le reste.
 *
 * Rend `{}` et non `{ meta: undefined }` : `exactOptionalPropertyTypes`
 * interdit de passer explicitement `undefined` à une prop optionnelle.
 */
function rowMeta(
  members: Map<string, { name: string }>,
  entry: Entry,
  withMember: boolean,
): { meta?: string } {
  const name =
    withMember && entry.memberId !== undefined ? members.get(entry.memberId)?.name : undefined
  const note = entry.note?.trim()
  const meta = [name, note === '' ? undefined : note].filter((part) => part !== undefined).join(' · ')
  return meta === '' ? {} : { meta }
}

/**
 * Ce qui est ouvert à l'arrivée : **un groupe, et un seul**.
 *
 * Par jour, la liste s'ouvrait en entier — c'est l'ordre de la lecture, et
 * c'était juste tant qu'on ne comptait pas la hauteur. Un mois ordinaire tient
 * une dizaine de jours et une quarantaine de lignes, soit près de deux mille
 * pixels dépliés d'office, tout en bas d'une page qui en faisait déjà quatre
 * mille. Tout replier n'est pas la réponse non plus : la section devient un
 * accordéon mort, et le jour qu'on vient lire demande un clic de plus.
 *
 * Le jour courant s'ouvre donc seul, et à défaut le premier groupe — le plus
 * récent, la liste étant triée du plus récent au plus ancien. Sur un mois passé
 * ou à venir, « aujourd'hui » n'y est pas, et c'est bien le dernier jour
 * mouvementé qu'on vient voir.
 *
 * Par poste ou par personne, rien ne s'ouvre : c'est un résumé dans lequel on
 * entre, et l'en-tête porte déjà la réponse.
 */
function defaultOpenKeys(by: GroupBy, keys: readonly string[]): readonly string[] {
  if (by !== 'day') return []
  const now = today()
  if (keys.includes(now)) return [now]
  return keys.length === 0 ? [] : [keys[0] as string]
}

/**
 * **Le mois, ligne à ligne** — la liste unique de l'écran, rangée sur un axe et
 * filtrée par nature.
 *
 * **Elle porte maintenant les échéances prévues avec les lignes réelles**, et
 * c'est la fusion qui fait disparaître « À confirmer ». Les deux listaient le
 * même mois à deux endroits : l'une ce qui attendait, l'autre ce qui était
 * fait, si bien qu'une ligne confirmée sautait de la première à la seconde et
 * qu'on descendait deux fois le même mois pour le lire en entier. Une ligne
 * change ici d'état sans changer de place — c'est ce que le glissé promet, et
 * une liste qui se vide sous le doigt ne le tiendrait pas.
 *
 * Le glissé et ses deux boutons vivent sur la rangée (`MonthEntryRow`) ; ce qui
 * reste ici est ce qui vaut pour la liste entière : son rangement, ses filtres,
 * et le geste inverse en masse.
 *
 * **« Remettre le mois à confirmer » a été relogé ici**, avec ses trois marches
 * de confirmation. C'est le seul geste que la revue et le glissé n'offrent pas
 * — les deux avancent, aucun ne recule en bloc —, et il n'avait plus d'écran
 * sans la section « À confirmer ». Sa place est sous les lignes qu'il ramène.
 *
 * Le filtre est tenu par la page, pas ici : les tuiles du tableau de bord le
 * posent aussi. `focus` compte les demandes de défilement venues d'elles — un
 * compteur plutôt qu'un drapeau, sinon redemander la même nature après avoir
 * fait défiler la page ne changerait aucun état, donc ne défilerait pas.
 */
export function EntriesSection({
  nature,
  onNature,
  family,
  onFamily,
  focus,
  onOpen,
  readOnly = false,
}: {
  nature: NatureFilter
  onNature: (nature: NatureFilter) => void
  /** Une famille de « Où part l'argent », ou `null` pour toutes. */
  family: string | null
  onFamily: (family: string | null) => void
  focus: number
  onOpen: (entry: Entry) => void
  /**
   * Un autre mois que celui qu'on vit : la liste se lit, elle ne s'écrit pas.
   *
   * Ni glissé, ni boutons de confirmation, ni retour en arrière en masse. Un
   * mois passé est réel de bout en bout et n'attend rien ; un mois à venir n'a
   * que du prévu, et confirmer aujourd'hui une échéance de novembre écrirait
   * comme un fait ce qui n'a pas eu lieu. La correction d'une ligne reste
   * offerte par sa fiche, qui sait dater, requalifier et supprimer.
   */
  readOnly?: boolean
}) {
  const lines = useMonthEntries()
  const unconfirmable = useMonthUnconfirmable()
  const [undoing, setUndoing] = useState(false)
  /* Ce qui reste à confirmer dans ce que la liste montre — c'est ce qui décide
     si la phrase du glissé a lieu d'être. Sur un mois entièrement réel, il n'y
     a plus un geste à apprendre. */
  const pending = lines.filter((entry) => entry.status === 'planned').length
  const categories = useCategoryMap()
  const kindOf = useKindOf()
  const familyOf = useFamilyOf()
  const families = useFamilyMap()
  const members = useMemberMap()
  const memberList = useMembers()
  const memberFilter = useMemberFilter()
  const root = useRef<HTMLDivElement>(null)

  /* Regrouper par personne ne rend qu'un seul groupe quand la liste ne montre
     qu'une personne — sous un filtre par membre, elle ne montre que ses lignes
     — ou quand le foyer n'en compte aucune. L'axe ne se propose alors pas :
     c'est une position de plus dans la barre pour une réponse déjà connue. */
  const byMemberSplits = memberList.length > 0 && memberFilter === undefined
  const axes = useMemo(
    () => (byMemberSplits ? allAxes() : allAxes().filter((axis) => axis.value !== 'member')),
    [byMemberSplits],
  )

  const [by, setBy] = useState<GroupBy>('day')
  const entries = useMemo(() => {
    const kinds = nature === null ? null : kindsOfNature(nature)
    if (kinds === null && family === null) return lines
    return lines.filter(
      (entry) =>
        (kinds === null || kinds.includes(kindOf(entry.categoryId))) &&
        (family === null || familyOf(entry.categoryId) === family),
    )
  }, [lines, nature, kindOf, family, familyOf])
  const groups = useMemo(() => groupEntries(entries, by), [entries, by])
  const keys = useMemo(() => groups.map((g) => g.key), [groups])
  const open = useMemo(() => defaultOpenKeys(by, keys), [by, keys])
  const disclosure = useDisclosureGroup(keys, open)

  // Une demande venue d'une tuile : la section vient sous les yeux.
  useEffect(() => {
    if (focus === 0) return
    reveal(root.current)
  }, [focus])

  /* L'axe courant peut cesser d'être proposé — il suffit d'activer un filtre
     par membre. On retombe alors sur le jour, plutôt que de laisser la barre
     sans position active. Ajusté au rendu : React relance aussitôt, rien ne
     s'affiche entre les deux. */
  if (!axes.some((axis) => axis.value === by)) {
    setBy('day')
    disclosure.reset()
  }

  if (lines.length === 0) return null

  /* Lu au rendu et non mémorisé : un onglet laissé ouvert la nuit du 31 doit
     marquer le jour qu'on est le lendemain. C'est déjà la règle du bandeau du
     mois et de tous les sélecteurs voisins, qui appellent `today()` au calcul. */
  const now = today()

  const titleOf = (key: string): string => {
    if (by === 'day') return formatDayFull(key)
    if (by === 'category') return categories.get(key)?.label ?? t.common.other
    return key === NO_MEMBER ? t.shell.everyone : (members.get(key)?.name ?? t.common.other)
  }

  /* Sous une pilule, les totaux parlent sa langue plutôt que celle du solde :
     « Charges » en sortie pleine, comme la tuile du même nom ; « Revenus » en
     entrée ; « Épargne » en net — les versements moins les reprises, comme
     partout, et non l'inverse que donnerait le solde. Le solde reste la
     lecture de « Tout », où les natures se mêlent (cahier §4.4 bis).

     Ils comptent le mois entier depuis que la liste porte le prévu : c'est
     l'horizon des tuiles de flux, et deux chiffres du même écran qui ne
     compteraient pas les mêmes lignes se liraient comme une erreur. */
  const natureAmount = (total: number, size: 'label' | 'body') => {
    if (nature === null) return <Amount value={money(total)} size={size} signed />
    if (nature === 'income') return <Amount value={money(total)} size={size} direction="in" />
    if (nature === 'expense') return <Amount value={money(total)} size={size} direction="out" />
    return <Amount value={money(-total)} size={size} signed />
  }

  return (
    <div ref={root} className="reveal-target">
      <Tile className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Le titre du design, et non plus « Ce mois » : la liste porte
              désormais tout le mois, prévu compris, et son nom doit le dire. Le
              repère des tuiles qui mènent ici garde le nom court — un coin de
              tuile plafonne à 60 % de sa largeur (DS §6). */}
          <Eyebrow icon={EntriesIcon}>{t.month.lineByLine}</Eyebrow>
          <Button size="sm" variant="ghost" onClick={disclosure.toggleAll}>
            {disclosure.anyOpen ? t.month.collapseAll : t.month.expandAll}
          </Button>
        </div>

        {/* Trois commandes de trois natures différentes, et donc trois poids.
            Elles se partageaient une rangée sans un mot : la bascule range, les
            pilules retirent, le bouton agit — trois gestes qu'on ne distingue
            pas d'un coup d'œil quand rien ne les nomme, d'autant que `Segmented`
            ne rend son `label` qu'en nom accessible. Chacune porte donc le sien
            à l'œil, sur sa propre rangée ; l'action, elle, reste seule dans
            l'en-tête, en `ghost`, là où on ne la confond avec aucun état.
            Les pilules passent à la ligne plutôt que de défiler : la piste
            défilante du DS §6 est celle du bandeau collant, à bord perdu, et
            dans une tuile de largeur contrainte un `overflow` rognerait leur
            anneau de focus — c'est l'objection que `Segmented` écrit déjà. */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="t-axis">{t.month.groupBy}</span>
            <Segmented
              options={axes}
              value={by}
              onChange={(next) => {
                setBy(next)
                disclosure.reset()
              }}
              label={t.month.groupBy}
            />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="t-axis">{t.month.show}</span>
            <div role="group" aria-label={t.month.show} className="flex flex-wrap gap-2">
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
          </div>
        </div>

        {/* Le filtre venu de « Où part l'argent ». Il se montre parce qu'il se
            retire : une liste réduite par un geste fait deux écrans plus haut,
            et qu'aucune commande visible ne défait, se lit comme un mois où il
            manque des lignes. Une pilule à part des natures, et non une de
            plus parmi elles : celles-là sont un choix entre quatre, celle-ci
            est une condition en cours. */}
        {family !== null && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="t-axis">{t.month.familyFilter}</span>
            <Chip
              active
              color={familyColor(family)}
              onClick={() => {
                onFamily(null)
              }}
            >
              {families.get(family)?.label ?? t.common.other}
              {/* Une croix sur un contrôle qui retire : c'est la famille ACTION
                  du DS §9, la seule que la pilule admette. Le nom accessible
                  dit le geste, que la croix seule ne dit pas. */}
              <Close size={14} />
              <span className="sr-only-text">{t.month.familyFilterClear}</span>
            </Chip>
          </div>
        )}

        {/* Hors filtre, ce total est le solde prévisionnel du mois, que la
            situation porte déjà deux blocs plus haut : le redire ici en ferait
            une seconde vérité. Sous filtre, en revanche, il descend en dessous
            d'un total de tuile — celui des charges ne connaît pas le poste ni
            la personne sur lesquels la liste vient d'être réduite. */}
        {nature !== null && entries.length > 0 && (
          <div className="flex items-baseline gap-2">
            <span className="t-axis">
              {tpl(
                entries.length > 1 ? t.month.groupCount : t.month.groupCountOne,
                entries.length,
              )}
            </span>
            {natureAmount(sum(groups.map((group) => group.total)), 'label')}
          </div>
        )}

        {/* Un filtre peut ne rien laisser, alors que le mois n'est pas vide :
            le dire, plutôt que de laisser une tuile qui semble s'être cassée. */}
        {entries.length === 0 && (
          <p className="t-label">
            {nature === 'income'
              ? t.month.showEmptyIn
              : nature === 'saving'
                ? t.month.showEmptySaving
                : t.month.showEmptyOut}
          </p>
        )}

        <div className="flex flex-col gap-1">
          {groups.map((group) => (
            <Disclosure
              key={group.key}
              open={disclosure.isOpen(group.key)}
              onOpenChange={(open) => {
                disclosure.setOpen(group.key, open)
              }}
              title={
                /* Par jour, l'en-tête passe à la ligne plutôt que de tronquer :
                   un quantième est court et borné, alors qu'un nom de poste ne
                   l'est pas — c'est la même règle qu'une rangée, où le libellé
                   se tronque et la seconde lecture passe à la ligne. Sans quoi
                   le jour courant, seul à porter trois éléments, voyait sa date
                   écrasée à « sam. … » par le mot qui l'accompagne : le libellé
                   est ce qu'on sacrifie en dernier, et jamais. */
                <span
                  className={cn(
                    'flex min-w-0 items-baseline gap-x-2 gap-y-0.5',
                    by === 'day' && 'flex-wrap',
                  )}
                >
                  {/* Le jour courant passe en encre pleine et se nomme. Une
                      accentuation légère, comme le veut la règle — mais jamais
                      la nuance seule : le DS §8 demande qu'une forme ou une
                      couleur ne porte pas à elle seule ce qu'elle dit, et
                      « le jour un peu plus foncé » n'arrive à personne. */}
                  <span
                    className={cn(
                      'truncate',
                      by === 'day' && group.key !== now ? 't-axis' : 't-body',
                    )}
                  >
                    {titleOf(group.key)}
                  </span>
                  {by === 'day' && group.key === now && (
                    <span className="t-axis shrink-0">{t.month.today}</span>
                  )}
                  <span className="t-axis shrink-0">
                    {tpl(
                      group.entries.length > 1 ? t.month.groupCount : t.month.groupCountOne,
                      group.entries.length,
                    )}
                  </span>
                </span>
              }
              trailing={natureAmount(group.total, 'body')}
            >
              <ul className="flex flex-col">
                {group.entries.map((entry) => (
                  <li key={entry.id}>
                    {readOnly ? (
                      <ListRow
                        color={categories.get(entry.categoryId)?.color ?? 'var(--cat-rest)'}
                        label={entry.label}
                        {...rowMeta(members, entry, by !== 'member')}
                        planned={entry.status === 'planned'}
                        trailing={<Amount value={entry.amount} direction={entry.direction} />}
                        onClick={() => {
                          onOpen(entry)
                        }}
                      />
                    ) : (
                      <MonthEntryRow
                        entry={entry}
                        color={categories.get(entry.categoryId)?.color ?? 'var(--cat-rest)'}
                        {...rowMeta(members, entry, by !== 'member')}
                        onOpen={() => {
                          onOpen(entry)
                        }}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </Disclosure>
          ))}
        </div>

        {/* Le geste s'apprend en le lisant, une fois : rien sur une rangée ne
            dit qu'elle se glisse, et le doigt ne découvre pas tout seul un
            fond qu'il faut déplacer de quatre-vingt-douze pixels pour voir.
            La phrase nomme aussi les deux boutons qui font la même chose. */}
        {/* `leading-tight` : `t-axis` a un interligne de 1, taillé pour une
            étiquette d'axe d'une ligne. Cette phrase-ci en fait 123 caractères
            et tombe sur trois à quatre lignes à 390px, collées les unes aux
            autres sans un pixel de blanc. */}
        {!readOnly && pending > 0 && (
          <p className="t-axis leading-tight">{t.month.swipeHint}</p>
        )}

        {/* Le retour en arrière en masse — le seul geste que ni la revue ni le
            glissé n'offrent, et le seul qui recule. Il reste atteignable tant
            qu'il y a quelque chose à ramener, y compris sur un mois confirmé à
            moitié. Sa boîte de confirmation reste : un mois entier remis à
            confirmer ne se rattrape pas d'un toast de huit secondes. */}
        {!readOnly && unconfirmable.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => {
              setUndoing(true)
            }}
          >
            {t.month.unconfirmAll}
          </Button>
        )}
      </Tile>

      <ConfirmDialog
        open={undoing}
        title={t.month.unconfirmAll}
        steps={[
          {
            question: tpl(t.month.unconfirmAllConfirm, unconfirmable.length),
            action: t.month.unconfirm,
          },
        ]}
        onCancel={() => {
          setUndoing(false)
        }}
        onConfirm={() => {
          setUndoing(false)
          undoable(t.month.unconfirmedAll, () => {
            unconfirmEntries(unconfirmable.map((entry) => entry.id))
          })
        }}
      />
    </div>
  )
}
