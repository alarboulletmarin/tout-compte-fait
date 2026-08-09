import { useState } from 'react'
import { addMonthsToYm, today, ymOf } from '@/domain/date'
import { t } from '@/i18n/strings'
import { formatYearMonth, tpl } from '@/i18n/format'
import { cn } from '@/lib/cn'
import {
  useMemberFilter,
  useMemberMap,
  useMembers,
  useMonthFilter,
  useMonthBounds,
  useMonthScope,
  useMonthSplit,
} from '@/store/selectors'
import { useStore } from '@/store/store'
import { Button } from '@/ui/Button'
import { Chip } from '@/ui/Chip'
import { InfoIcon } from '@/ui/Icons'
import { MonthNav } from '@/ui/MonthNav'
import { Sheet } from '@/ui/Sheet'
import { useHotkeys } from '@/ui/useHotkeys'

/**
 * Les trois lectures du mois : tout, le commun seul, ou une personne.
 *
 * « Commun » n'est pas le frère de « une personne » — c'est l'autre découpage
 * du même total (voir `MonthFilter`). Il vaut la peine d'être une pilule quand
 * même : le pot est ce qu'on regarde ensemble, et c'était le seul chiffre du
 * foyer qu'aucun tableau de bord ne savait isoler.
 *
 * Seules les personnes portent une pastille : c'est leur couleur, et elle ne
 * désigne qu'elles. En donner une au commun demandait l'accent, qui est bien sa
 * couleur ailleurs — mais une pilule active passe elle-même en accent, et la
 * pastille y disparaissait, exactement comme celle du premier membre avant
 * qu'il quitte le vert pomme.
 *
 * `personsOnly` retire les deux premières, et avec elles le filet qui les
 * séparait : voir `MonthHeaderProps.personsOnly`.
 */
function MonthFilterChips({ personsOnly }: { personsOnly: boolean }) {
  const members = useMembers()
  const filter = useMonthFilter()
  const setFilter = useStore((s) => s.setFilter)
  if (members.length === 0) return null

  if (personsOnly) {
    return (
      <div
        className="filter-scroller -mx-4 -my-1 flex gap-2 px-4 py-1 md:-mx-8 md:px-8"
        role="group"
        aria-label={t.shell.filterByMember}
      >
        {members.map((member) => (
          <Chip
            key={member.id}
            className="shrink-0"
            color={member.color}
            active={filter.kind === 'member' && filter.memberId === member.id}
            onClick={() => {
              setFilter({ kind: 'member', memberId: member.id })
            }}
          >
            {member.name}
          </Chip>
        ))}
      </div>
    )
  }

  return (
    /* Une ligne qui défile, à bord perdu : le cadre de l'en-tête est annulé puis
       reposé sur la piste, pour que la première et la dernière pilule ne soient
       pas rognées et que la rangée file jusqu'au bord de l'écran. Les 4px de
       cadre vertical logent l'anneau de focus, et la marge négative les reprend
       pour que la hauteur du bandeau ne bouge pas. */
    <div
      className="filter-scroller -mx-4 -my-1 flex gap-2 px-4 py-1 md:-mx-8 md:px-8"
      role="group"
      aria-label={t.shell.filterByMember}
    >
      <Chip
        className="shrink-0"
        active={filter.kind === 'all'}
        onClick={() => {
          setFilter({ kind: 'all' })
        }}
      >
        {t.shell.all}
      </Chip>
      {/* Le commun se propose dès le premier membre : seul, la vue du membre
          vaut « tout le monde » au centime, et le pot est justement la seule
          lecture qui distingue encore les charges du foyer de ses lignes à
          lui. */}
      <Chip
        className="shrink-0"
        active={filter.kind === 'common'}
        onClick={() => {
          setFilter({ kind: 'common' })
        }}
      >
        {t.shell.common}
      </Chip>
      {/* Les deux premières pilules n'ont pas de pastille parce qu'elles ne
          désignent personne — une pastille est la couleur de quelqu'un. Sans
          rien pour le dire, cette absence se lit comme un oubli ; le filet la
          rend voulue, et sépare les lectures des personnes.

          En `--text-muted` atténué, et non en `--border` : ce dernier vaut 8 %
          d'encre, calibré pour une bordure posée sur une surface. Le bandeau,
          lui, est sur le fond de page, où un trait d'un pixel à 8 % ne se voit
          pas — un séparateur qu'on ne distingue pas ne sépare rien. */}
      <span aria-hidden="true" className="my-auto h-5 w-px shrink-0 bg-muted opacity-40" />
      {members.map((member) => (
        <Chip
          key={member.id}
          className="shrink-0"
          color={member.color}
          active={filter.kind === 'member' && filter.memberId === member.id}
          onClick={() => {
            setFilter({ kind: 'member', memberId: member.id })
          }}
        >
          {member.name}
        </Chip>
      ))}
    </div>
  )
}

/**
 * Une phrase, et le reste dans une feuille.
 *
 * La règle de lecture tenait sur trois lignes de gris, en tête de chaque écran
 * du mois, sous la rangée de pilules et avant le premier chiffre : c'est-à-dire
 * qu'on la relisait tous les jours pour l'avoir comprise une fois. Ce qui doit
 * rester à l'écran est ce qui change la lecture d'un chiffre — la part du commun
 * est comprise —, et non la mécanique qui le produit.
 *
 * La phrase entière est la cible, et pas un glyphe posé à côté : une rangée de
 * 44px se vise au pouce, un point d'interrogation de seize pixels non (DS §6,
 * qui fait déjà de la tuile entière la cible des quatre soldes). Le glyphe reste
 * au bout, `aria-hidden`, pour dire qu'il y a quelque chose à ouvrir.
 */
function ProrataSummary({ short, full, title }: { short: string; full: string; title: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true)
        }}
        className={cn(
          '-mx-2 flex min-h-11 w-fit max-w-full items-center gap-2 rounded-inner px-2 text-left',
          'transition-colors duration-[var(--dur)] ease-ds hover:bg-surface-2 active:bg-surface-2',
        )}
      >
        <span className="t-label">{short}</span>
        <InfoIcon size={16} className="shrink-0 text-muted" aria-hidden="true" />
      </button>

      <Sheet
        open={open}
        onClose={() => {
          setOpen(false)
        }}
        title={title}
        pullToClose
      >
        <p className="t-body">{full}</p>
      </Sheet>
    </>
  )
}

/**
 * Comment se lisent les chiffres sous un filtre.
 *
 * Un mois filtré sur quelqu'un ne montre pas que ses lignes : il y ajoute sa
 * part des charges communes. C'est une règle de lecture, elle se dit là où on
 * choisit le filtre — sans quoi le chiffre paraît sorti de nulle part, puisque
 * la liste dessous n'en porte aucune trace.
 *
 * Quand le prorata ne se calcule pas, ce qui manque est nommé : on retombe sur
 * ses seules lignes, et un total qui ignore le loyer sans le dire vaut moins
 * qu'un total qui l'avoue. Ces trois-là ne s'ouvrent pas : elles nomment déjà ce
 * qui manque, et il n'y a rien de plus à en dire que le geste qu'elles
 * appellent.
 */
function ProrataNote() {
  const filter = useMonthFilter()
  const active = useMemberFilter()
  const { prorated, partial } = useMonthScope()
  const members = useMemberMap()
  const { unknown } = useMonthSplit()

  // Le commun se lit à son montant plein, sans prorata : la note dit ce qui
  // entre dans le pot, puisque c'est la seule question qu'on se pose devant.
  if (filter.kind === 'common') {
    return (
      <ProrataSummary
        short={t.shell.commonShort}
        full={t.shell.commonNote}
        title={t.shell.common}
      />
    )
  }

  if (active === undefined) return null
  const name = members.get(active)?.name ?? ''

  if (prorated) {
    // Seul du foyer, « au prorata des revenus » serait un mensonge poli : la
    // part vaut 100 % et n'a demandé aucun revenu. La note dit ce qui se
    // passe vraiment — ses chiffres sont ceux du foyer entier.
    const solo = members.size === 1
    return (
      <ProrataSummary
        short={solo ? t.shell.prorataSoloShort : t.shell.prorataShort}
        full={tpl(solo ? t.shell.prorataSolo : t.shell.prorata, name)}
        title={t.shell.prorataSheet}
      />
    )
  }
  if (!partial) return null

  const missing = unknown.map((member) => member.name).join(', ')
  if (missing === '') return <p className="t-label">{t.shell.prorataOnlyOwn}</p>

  const wording = unknown.length > 1 ? t.shell.prorataMissingMany : t.shell.prorataMissingOne
  return <p className="t-label">{tpl(wording, missing)}</p>
}

/**
 * En-tête des écrans rattachés à un mois. Le mois courant vit dans le store :
 * changer de mois ici le change partout.
 */
export function MonthHeader({
  withMemberFilter = true,
  personsOnly = false,
  prorataNote = false,
}: {
  withMemberFilter?: boolean
  /**
   * Les personnes seules, sans « Tout le monde » ni « Commun ».
   *
   * Réservé à l'épargne, et ce n'est pas une simplification d'affichage mais la
   * règle du domaine : une épargne est toujours à quelqu'un. « Commun » ne
   * rendrait que des zéros — elle ne se partage jamais —, et « Tout le monde »
   * rendrait pire qu'un zéro : une somme. Deux personnes qui ont 12 000 € et
   * 8 000 € de côté n'ont pas « 20 000 € », elles ont deux comptes, deux
   * décisions et deux capacités ; le total du foyer ne se place nulle part et ne
   * se décide par personne.
   *
   * L'écran qui la pose s'assure qu'une personne est bien choisie : une rangée
   * de pilules dont aucune n'est active laisserait croire à une lecture qui
   * n'existe pas.
   */
  personsOnly?: boolean
  /* Réservé aux écrans de chiffres : le calendrier montre les échéances
     réelles, où une charge commune tombe en entier et n'est à personne. */
  prorataNote?: boolean
}) {
  const ym = useStore((s) => s.ym)
  const setYm = useStore((s) => s.setYm)
  const bounds = useMonthBounds()
  /* Lu au rendu et non mémorisé : un onglet laissé ouvert la nuit du 31 doit
     ramener au mois qu'on est le lendemain, pas à celui qu'on était en
     l'ouvrant. C'est déjà la règle des sélecteurs voisins, qui appellent tous
     `today()` au calcul. */
  const currentYm = ymOf(today())

  /* Les flèches font ce que font les deux chevrons, aux mêmes bornes : le mois
     se balaie au doigt depuis toujours et se cliquait à la souris, il n'avait
     rien au clavier. Le raccourci vit ici parce que c'est le seul composant qui
     connaisse à la fois le mois, son remplaçant et ses bornes — et il ne vit
     que sur les écrans rattachés à un mois, ceux qui le portent. */
  useHotkeys({
    ArrowLeft: () => {
      const previous = addMonthsToYm(ym, -1)
      if (bounds.min === undefined || previous >= bounds.min) setYm(previous)
    },
    ArrowRight: () => {
      const next = addMonthsToYm(ym, 1)
      if (bounds.max === undefined || next <= bounds.max) setYm(next)
    },
  })

  return (
    /* C'est l'en-tête lui-même qui colle, et non un bloc à l'intérieur : un
       élément collant ne dépasse jamais les bornes de son parent, et un parent
       haut de deux commandes le laisse partir au premier écran de défilement.
       Son parent à lui est `main`, c'est-à-dire la page entière — et la note de
       lecture sort donc de l'en-tête pour ne pas coller avec.

       Les marges négatives annulent le cadre de `main` : sans elles, le fond
       s'arrête aux bords du contenu et les lignes passent dans les gouttières
       pendant qu'elles défilent dessous. Le fond est celui de la page, pas
       d'une tuile — le bandeau n'est pas une surface de plus, c'est la page qui
       reste en place. Le cadre vertical est le sien, et non celui de `main` qui
       défile : sans lui, le mois toucherait le bord de l'écran une fois figé.

       Sous la barre d'onglets (`z-20`) et sous les surcouches : un bandeau
       collant qui passerait devant un toast masquerait ce qu'on vient de
       faire. */
    <>
      <header
        className={cn(
          'sticky top-0 z-10 -mx-4 flex flex-col gap-4 bg-bg px-4 py-3',
          'md:-mx-8 md:px-8',
        )}
      >
        {/* Le retour au mois courant, à côté de la navigation et non dedans :
            `MonthNav` capture le pointeur pour son balayage, et un bouton posé
            sous cette capture attraperait le geste au lieu du clic.

            Il n'existe que lorsqu'il fait quelque chose — c'est la règle du DS
            §6 sur les repères d'action, celle qui rend les autres lisibles : un
            « ce mois-ci » affiché sur le mois courant serait un bouton qui ne
            bouge rien. Il apparaît donc au premier pas de côté, et la
            navigation se resserre d'autant ; mesuré à 320px, elle a la place.

            Aucune borne à vérifier : `useMonthBounds` fait toujours entrer le
            mois courant entre son minimum et son maximum. */}
        <div className="flex items-center gap-2">
          <MonthNav
            value={ym}
            onChange={setYm}
            min={bounds.min}
            max={bounds.max}
            className="min-w-0 max-w-sm flex-1"
          />
          {ym !== currentYm && (
            <Button
              size="sm"
              variant="secondary"
              className="shrink-0"
              title={tpl(t.shell.thisMonthTitle, formatYearMonth(currentYm))}
              onClick={() => {
                setYm(currentYm)
              }}
            >
              {t.shell.thisMonth}
            </Button>
          )}
        </div>
        {withMemberFilter && <MonthFilterChips personsOnly={personsOnly} />}
      </header>

      {/* La note de lecture ne colle pas : c'est une phrase qui s'explique une
          fois, pas une commande, et elle coûterait deux lignes de haut d'écran
          à chaque défilement sur téléphone.

          Le bloc est rendu même vide : sa marge est celle que l'en-tête portait
          avant de coller, et une marge sur un élément collant laisserait une
          bande transparente sous le bandeau, dans laquelle le contenu se
          verrait défiler. */}
      <div className="mb-5">{withMemberFilter && prorataNote && <ProrataNote />}</div>
    </>
  )
}
