import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef } from 'react'
import { type ISODate, type YearMonth, parseISO } from '@/domain/date'
import type { Entry } from '@/domain/types'
import { t } from '@/i18n/strings'
import { formatWeekdayDate, formatYearMonth, de, tpl } from '@/i18n/format'
import { cn } from '@/lib/cn'
import { useCategoryMap } from '@/store/selectors'
import { Dot } from '@/ui/Dot'
import { type GridCell, density, keyboardMove, weekdays } from './grid'
import { type CalendarWindow, entriesOn } from './useCalendarWindow'

function countLabel(count: number): string {
  if (count === 0) return t.calendar.noEntry
  if (count === 1) return t.calendar.oneEntry
  return tpl(t.calendar.someEntries, count)
}

function plannedLabel(count: number): string {
  if (count === 0) return ''
  if (count === 1) return t.calendar.onePlanned
  return tpl(t.calendar.somePlanned, count)
}

/**
 * Le nom d'une case, qui dit tout ce que la case montre.
 *
 * Les pastilles sont `aria-hidden` et le « +N » aussi : une couleur et un
 * compte muet ne portent l'information qu'à la vue, ce que le DS §8 refuse. Le
 * cadre d'aujourd'hui et le chiffre atténué d'un voisin sont dans le même cas,
 * d'où les deux mentions ajoutées à la fin.
 *
 * Le pointillé d'une pastille prévue était le seul signe qui n'avait aucun mot :
 * une case disait « 3 échéances » là où l'œil voit deux pleines et une en
 * pointillés. Il en a un maintenant, et c'est le même que celui de la légende.
 */
function cellLabel(cell: GridCell, entries: readonly Entry[], isToday: boolean): string {
  const planned = entries.filter((entry) => entry.status === 'planned').length
  return [
    tpl(t.calendar.dayLabel, formatWeekdayDate(cell.date), countLabel(entries.length)),
    plannedLabel(planned),
    isToday ? t.calendar.dayToday : '',
    cell.inMonth ? '' : t.calendar.dayOutside,
  ]
    .filter((part) => part !== '')
    .join(t.calendar.labelJoin)
}

/* La pilule du quantième, partagée par la case et par la légende : celle-ci
   montre le cadre d'aujourd'hui pour le nommer, et deux cadres qui ne se
   ressemblent pas ne s'expliquent pas l'un l'autre. */
const PILL = 'flex h-5 min-w-5 items-center justify-center rounded-chip border px-1 t-body tnum leading-none'

/** Une pastille par échéance, couleur de la catégorie, en pointillés si prévue. */
function Dots({ entries, colorOf }: { entries: readonly Entry[]; colorOf: (id: string) => string }) {
  const { shown, rest } = density(entries.length)
  return (
    <>
      <span aria-hidden="true" className="flex min-h-1.5 items-center justify-center gap-0.5">
        {entries.slice(0, shown).map((entry) => (
          <Dot
            key={entry.id}
            color={colorOf(entry.categoryId)}
            outlined={entry.status === 'planned'}
            size={6}
          />
        ))}
      </span>
      {/* La seconde ligne est réservée même vide : sans elle, une case qui gagne
          une cinquième échéance grandit et pousse toute sa rangée — et le carré
          demande que les quarante-deux cases portent exactement la même pile. */}
      <span aria-hidden="true" className="t-axis min-h-3 leading-none">
        {rest > 0 ? tpl(t.calendar.more, rest) : ''}
      </span>
    </>
  )
}

function Cell({
  cell,
  entries,
  colorOf,
  opened,
  isToday,
  anchored,
  onOpen,
  register,
}: {
  cell: GridCell
  entries: readonly Entry[]
  colorOf: (id: string) => string
  opened: boolean
  isToday: boolean
  anchored: boolean
  onOpen: (date: ISODate) => void
  register: (date: ISODate, node: HTMLButtonElement | null) => void
}) {
  return (
    <button
      type="button"
      ref={(node) => {
        register(cell.date, node)
      }}
      /* Un seul arrêt de tabulation pour quarante-deux cases, comme le curseur
         des graphiques : les flèches déplacent le focus, Tab traverse la
         grille. Sans ça, atteindre le panneau du jour demandait quarante-deux
         tabulations. */
      tabIndex={anchored ? 0 : -1}
      /* Et non `aria-pressed` : la case n'est plus une bascule depuis que le
         jour s'ouvre en feuille — une modale couvre la grille, on ne peut donc
         pas re-toucher la case pour la relâcher. Elle ouvre quelque chose, elle
         le dit. */
      aria-haspopup="dialog"
      aria-label={cellLabel(cell, entries, isToday)}
      onClick={() => {
        onOpen(cell.date)
      }}
      className={cn(
        // Plancher de 44px (DS §8) plutôt qu'une hauteur fixe : c'est la cible
        // qui commande, et la case grandit si son contenu le demande.
        'flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-inner p-1',
        // Le carré n'entre en jeu qu'au-dessus de 448px, où la colonne dépasse
        // enfin la hauteur de la pile (chiffre 20 + pastilles 6 + « +N » 12 +
        // gouttières et cadre = 50px). En dessous, un ratio ne changerait rien :
        // la taille minimale du contenu gagne, ce qui est bien ce qu'on veut.
        'min-[448px]:aspect-square',
        /* Le pressé, que le DS §6 exige sur tout ce qu'on peut actionner et
           que la grille n'avait pas : quarante-deux cases visées au doigt, sur
           un écran qui n'a pas de curseur, ne répondaient rien du tout.
           `scale` et non `transform` — `scale-*` est posé sur la
           propriété du même nom, et une transition déclarée sur `transform` ne
           la verrait pas. Le retrait de 4 % tient dans la gouttière de la
           grille : une case ne peut pas chevaucher sa voisine. */
        'transition-[background-color,scale] duration-[var(--dur)] ease-ds',
        'hover:bg-surface-2 active:scale-[0.96] active:bg-surface-2',
      )}
    >
      {/* Deux formes sur la même pilule, jamais deux teintes (DS §8) :
          aujourd'hui la porte en contour, le jour ouvert en remplissage. Le
          pixel de cadre est réservé d'avance et transparent, faute de quoi le
          chiffre se décalerait d'un pixel en devenant l'un ou l'autre.

          Le remplissage était sur la case entière, et `--cat-1` EST le lime :
          la pastille d'une catégorie 1 disparaissait purement sur le jour qu'on
          venait d'ouvrir. Il tient maintenant dans le chiffre, comme l'onglet
          actif de la barre de navigation — et les pastilles restent sur la
          surface de la tuile, quoi qu'il arrive. */}
      <span
        className={cn(
          PILL,
          isToday && 'font-semibold',
          opened
            ? 'border-accent bg-accent text-accent-fg'
            : cn(
                isToday ? 'border-muted' : 'border-transparent',
                /* Un jour voisin n'est pas un jour éteint : ses échéances
                   existent, c'est son quantième qui n'appartient pas au mois
                   qu'on lit. C'est donc le chiffre qui s'atténue, jamais la
                   donnée — et le nom accessible le dit en toutes lettres.

                   Les deux signaux se composent plutôt que de s'exclure :
                   regarder juillet le 7 août montre un chiffre atténué dans
                   son contour, ce qui est exactement ce qu'il est — un jour
                   voisin, et aujourd'hui. */
                !cell.inMonth && 'text-muted',
              ),
        )}
      >
        {cell.day}
      </span>
      <Dots entries={entries} colorOf={colorOf} />
    </button>
  )
}

function Mark({ sample, children }: { sample: ReactNode; children: string }) {
  return (
    <li className="flex items-center gap-1.5">
      {sample}
      <span className="t-label">{children}</span>
    </li>
  )
}

/**
 * Ce que les marques de la grille veulent dire.
 *
 * Une pastille pleine, une pastille en pointillés, un chiffre dans un contour,
 * un « +4 » : quatre signes, et pas un mot pour les nommer. Le DS §8 demande
 * qu'une forme ne porte jamais seule ce qu'elle dit — la règle valait jusqu'ici
 * pour le nom accessible des cases, et laissait l'œil deviner. Deviner « pas
 * encore confirmée » derrière un contour en pointillés n'arrive à personne.
 *
 * La légende montre la forme et pas la couleur : les pastilles d'exemple sont
 * en `--text-muted`, faute de quoi elles nommeraient une catégorie en plus d'une
 * forme — et le calendrier en sert quarante-sept. C'est la phrase du dessous qui
 * dit ce que la couleur fait, une fois pour toutes ; les catégories, elles, se
 * lisent dans la feuille du jour, où chaque ligne porte son nom à côté de sa
 * pastille.
 *
 * Elle n'apparaît que s'il y a quelque chose à expliquer : une fenêtre sans
 * aucune échéance n'a aucune pastille, et une légende qui nomme des marques
 * absentes est du bruit. Le cadre d'aujourd'hui suit la même règle — il ne se
 * nomme que sur les mois où il se voit.
 */
function Legend({ today, more }: { today: number | null; more: boolean }) {
  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
      <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <Mark sample={<Dot color="var(--text-muted)" size={6} />}>{t.calendar.legendDone}</Mark>
        <Mark sample={<Dot color="var(--text-muted)" size={6} outlined />}>
          {t.calendar.legendPlanned}
        </Mark>
        {today !== null && (
          <Mark
            sample={
              /* Muet pour un lecteur d'écran : le quantième du jour lu ici
                 s'entendrait comme une case de plus, alors que ce n'en est pas
                 une. Le mot à côté suffit, et les cases disent déjà
                 « aujourd'hui » dans leur nom. */
              <span aria-hidden="true" className={cn(PILL, 'border-muted font-semibold')}>
                {today}
              </span>
            }
          >
            {t.calendar.legendToday}
          </Mark>
        )}
      </ul>
      <p className="t-label">
        {[t.calendar.legendDots, more ? t.calendar.legendMore : ''].filter((s) => s !== '').join(' ')}
      </p>
    </div>
  )
}

export type CalendarGridProps = {
  month: YearMonth
  window: CalendarWindow
  /** Le jour ouvert, ou `null`. */
  opened: ISODate | null
  /** Le jour qui porte l'arrêt de tabulation. */
  anchor: ISODate
  onAnchor: (date: ISODate, paging: boolean) => void
  onOpen: (date: ISODate) => void
  /** Vrai si la date est atteignable — hors bornes, la case ne promet rien. */
  reachable: (date: ISODate) => boolean
  /**
   * Le jour à refocaliser après le rendu.
   *
   * Un objet neuf à chaque demande, et non la date seule : redemander deux fois
   * le même jour est un cas courant — refermer la feuille rend le focus à la
   * case qu'on vient de quitter — et une dépendance sur la chaîne ne verrait
   * pas la seconde demande.
   */
  focusOn: { date: ISODate } | null
  today: ISODate
}

export function CalendarGrid({
  month,
  window: grid,
  opened,
  anchor,
  onAnchor,
  onOpen,
  reachable,
  focusOn,
  today,
}: CalendarGridProps) {
  const categories = useCategoryMap()
  const colorOf = (id: string): string => categories.get(id)?.color ?? 'var(--cat-rest)'
  const hintId = useId()
  const cells = useRef(new Map<ISODate, HTMLButtonElement>())

  /* La fenêtre entière, et pas seulement le mois : une pastille de débord est
     une pastille qu'on voit, et la légende explique ce qui est à l'écran. */
  const hasEntries = grid.cells.some((cell) => entriesOn(grid, cell.date).length > 0)
  const hasMore = grid.cells.some((cell) => density(entriesOn(grid, cell.date).length).rest > 0)
  const showsToday = grid.cells.some((cell) => cell.date === today && reachable(cell.date))

  const register = (date: ISODate, node: HTMLButtonElement | null): void => {
    if (node === null) cells.current.delete(date)
    else cells.current.set(date, node)
  }

  /* Le focus est reposé après le rendu, et pas dans le gestionnaire de touche :
     une flèche qui sort de la fenêtre change de mois, et le bouton d'origine
     est démonté avant qu'un `.focus()` synchrone puisse l'atteindre. L'effet
     sans dépendances part à chaque rendu, ce qui est exactement ce qu'on veut —
     il ne fait que servir une demande en attente. */
  useEffect(() => {
    if (focusOn === null) return
    cells.current.get(focusOn.date)?.focus()
  }, [focusOn])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    // Les mêmes modificateurs que `useHotkeys` : ⌘← remonte dans l'historique
    // du navigateur, ce geste-là ne nous appartient pas.
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const move = keyboardMove(event.key, anchor)
    if (move === null) return

    /* `preventDefault` avant tout examen, et même quand le déplacement est
       refusé : sans lui la page défile sous ↓ et Page suivante, et surtout
       `useHotkeys` s'efface sur une frappe déjà consommée. Sans lui, une flèche
       déplacerait le jour *et* changerait le mois, à deux étages. Refuser un
       déplacement sans consommer la touche donnerait à la même flèche deux
       effets différents selon qu'on est au bord ou non. */
    event.preventDefault()
    if (!reachable(move.date)) return
    onAnchor(move.date, move.paging)
  }

  return (
    <div>
      {/* Les deux rangées portent la même gouttière : sans quoi le nom du jour
          cesse de tomber au-dessus de sa colonne dès que la grille en a une. */}
      <div className="mb-1 grid grid-cols-7 gap-1 max-[479px]:gap-x-0" aria-hidden="true">
        {weekdays().map((day) => (
          // Le nom complet en clé : les initiales ne sont pas uniques en
          // français — mardi et mercredi donnent tous deux « M ».
          <span key={day.name} className="t-axis text-center">
            {day.initial}
          </span>
        ))}
      </div>

      {/* Sept colonnes de 44px demandent 308px, et sur un téléphone il n'y en a
          pas 308 : à 375px, le cadre de la page (2 × 16) et celui de la tuile
          (2 × 16) en laissent 311 — soit 44,4px par colonne, et seulement si les
          six gouttières valent zéro.

          Ce qu'on abandonne est donc la gouttière, et **jamais le cadre**. La
          grille est partie un temps à bord perdu pour tenir 44px de large
          partout ; ça rendait quelques pixels et ça coûtait la carte — une bande
          d'un bord à l'autre de l'écran, sans coin ni ombre, qui ne se lit plus
          comme une surface posée sur la page. Sous 480px, la tuile resserre donc
          son cadre à 16px, comme le fait déjà une tuile plate, et les colonnes
          se joignent :

            320px → 36,6px      375px → 44,4px      414px → 50,0px

          En dessous de 375px, la cible perd en largeur ce qu'elle garde en
          hauteur : la case tient ses 44px de haut par son `min-h-11`, et l'écart
          est du même ordre que celui, mesuré et assumé, du curseur des
          graphiques. Sept cases jointives de 37px valent mieux que sept cases de
          33px séparées par du vide — et le jour ouvert se distingue à la pilule
          derrière son chiffre, jamais à la gouttière.

          `items-start` est indispensable au carré : un élément de grille est
          étiré par sa rangée, et un ratio posé sur une case étirée est ignoré.
          Les sept colonnes ayant la même largeur et les quarante-deux cases la
          même pile, la rangée reste régulière sans l'étirement. */}
      <div
        role="group"
        aria-label={tpl(t.calendar.gridLabel, de(formatYearMonth(month)))}
        aria-describedby={hintId}
        onKeyDown={onKeyDown}
        className="grid grid-cols-7 items-start gap-1 max-[479px]:gap-x-0"
      >
        {grid.cells.map((cell) =>
          reachable(cell.date) ? (
            <Cell
              key={cell.date}
              cell={cell}
              entries={entriesOn(grid, cell.date)}
              colorOf={colorOf}
              opened={cell.date === opened}
              isToday={cell.date === today}
              anchored={cell.date === anchor}
              onOpen={onOpen}
              register={register}
            />
          ) : (
            /* Un jour de débord dont le mois sort des bornes du store garde son
               chiffre et perd son geste : on ne propose jamais un mois que le
               store refuse d'ouvrir, c'est déjà la règle des chevrons. Muet
               pour un lecteur d'écran, parce qu'un quantième nu qu'on ne peut
               pas atteindre n'apprend rien. */
            <span
              key={cell.date}
              aria-hidden="true"
              /* Exactement la boîte et la pile d'une case active : même
                 `flex-col`, même gouttière, même réserve de pastilles. Sans
                 elles, la case inerte n'avait qu'un chiffre à centrer quand sa
                 voisine en centre une pile de 42px, et son quantième tombait
                 11px plus bas — la ligne des chiffres se cassait sur la
                 première et la dernière semaine. Centrer la pile ne suffisait
                 pas : dès que le carré rend la case plus haute que son contenu,
                 deux piles de hauteurs différentes ne tombent plus au même y. */
              className="flex min-h-11 flex-col items-center justify-center gap-0.5 p-1 min-[448px]:aspect-square"
            >
              <span className={cn(PILL, 'border-transparent text-muted opacity-50')}>
                {cell.day}
              </span>
              <Dots entries={[]} colorOf={colorOf} />
            </span>
          ),
        )}
      </div>

      <p id={hintId} className="sr-only-text">
        {t.a11y.calendarGridHint}
      </p>

      {/* Hors du `role="group"` : la légende explique la grille, elle n'en est
          pas une case. Dedans, elle s'annoncerait comme un enfant de plus d'une
          fenêtre qui en compte quarante-deux. */}
      {hasEntries && <Legend today={showsToday ? parseISO(today).d : null} more={hasMore} />}
    </div>
  )
}
