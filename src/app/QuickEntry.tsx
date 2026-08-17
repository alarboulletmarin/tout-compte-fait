import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { t } from '@/i18n/strings'
import { cn } from '@/lib/cn'
import { Button } from '@/ui/Button'
import { Plus } from '@/ui/Icons'
import { useHotkeys } from '@/ui/useHotkeys'
import { entryNewPath, isFocusScreen } from './routes'

/**
 * Le geste le plus fréquent de l'app, à portée de pouce et à tout moment.
 *
 * Les trois portes de saisie vivaient en tête de l'écran du mois, dans le flux :
 * elles défilaient avec la page, et disparaissaient tout à fait quand le mois
 * était vide, où l'`EmptyState` prend le relais. Sur un téléphone, saisir une
 * ligne demandait donc de remonter d'abord. Au clavier, « n » le faisait déjà
 * depuis n'importe où ; au doigt, rien.
 *
 * **Trois portes et non une.** L'écran du mois pose la règle : « les deux sens
 * sont deux boutons, jamais un seul » — passer par « Ajouter une dépense » pour
 * saisir un salaire obligeait à découvrir, une fois le formulaire ouvert, une
 * bascule dont rien n'annonçait l'existence. Un bouton flottant unique
 * rétablirait exactement ce qu'elle corrige. Il se déplie donc, et garde les
 * trois portes dans l'ordre de l'écran du mois.
 *
 * **Pas une feuille modale.** `ui/Sheet` sert à ce pour quoi une feuille est
 * faite — une explication qu'on ouvre et qu'on referme sans quitter des yeux ce
 * qu'elle explique. Ici il n'y a rien à lire : trois boutons, au-dessus de
 * celui qu'on vient de toucher, là où le pouce est déjà.
 *
 * **Ni sur un écran de saisie, ni au-delà de 1024px.** La première garde est
 * celle du raccourci « n », mot pour mot : partir créer une dépense par-dessus
 * celle qu'on est en train d'écrire contourne la garde de brouillon, qui ne
 * surveille que les deux boutons de sortie. La seconde tient à ce qu'il n'y a
 * plus rien à régler au-delà — la rangée en flux de l'écran du mois y reste, et
 * elle est à l'écran.
 */
export function QuickEntry() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const doorsRef = useRef<HTMLDivElement>(null)

  /* Le focus part sur la première porte à l'ouverture — sans quoi la tabulation
     repartirait du début du document, alors que ce qui vient d'apparaître est
     juste au-dessus du doigt. Il revient au déclencheur à la fermeture, parce
     que c'est de là qu'on vient et que le bouton est resté là.
     Cherché dans le groupe plutôt que posé sur le premier bouton : `Button` ne
     prend pas de `ref`, et lui en ajouter une pour un seul appelant élargirait
     son contrat pour rien. */
  useEffect(() => {
    if (open) doorsRef.current?.querySelector('button')?.focus()
  }, [open])

  const close = (): void => {
    setOpen(false)
    trigger.current?.focus()
  }

  /* Refermer ce qu'on vient d'ouvrir, la troisième touche de l'app. Enregistrée
     seulement quand il y a quelque chose à refermer : `useHotkeys` appelle
     `preventDefault` sur toute touche qu'il connaît, et un Échap intercepté en
     permanence retirerait la sienne à qui d'autre le voudrait. */
  useHotkeys({ Escape: open ? close : undefined })

  /* Changer d'écran referme les portes. Le composant vit dans la coquille et ne
     se démonte jamais : sans ça, l'état survivrait à la navigation, et revenir
     au mois — par le bouton « retour » du navigateur, par exemple, qui contourne
     tout ce qui est écrit ici — rouvrirait trois boutons que personne n'a
     redemandés.
     Ajusté au rendu et non dans un effet : c'est la forme que React donne à un
     état qui doit se remettre à zéro quand une valeur change, et elle évite le
     rendu de trop que l'effet imposerait — celui où les portes sont encore
     ouvertes sur l'écran suivant. */
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setOpen(false)
  }

  if (isFocusScreen(pathname)) return null

  const create = (path: string): void => {
    setOpen(false)
    void navigate(path)
  }

  const doors = [
    { label: t.entry.newOut, path: entryNewPath({ direction: 'out' }), variant: 'secondary' as const },
    { label: t.entry.newIn, path: entryNewPath({ direction: 'in' }), variant: 'secondary' as const },
    {
      label: t.entry.newSaving,
      path: entryNewPath({ direction: 'out', saving: true }),
      variant: 'secondary' as const,
    },
  ]

  /* Les flèches parcourent le menu, comme le veut le motif ARIA du `role`
     qu'il porte : trois cibles empilées sous le pouce se parcourent aussi au
     clavier, et Tab seul obligerait à traverser la pile pour en sortir. Les
     boutons restent tabulables — un `tabindex` tournant est le motif strict,
     mais il retirerait du parcours de tabulation trois boutons que rien ne
     signale comme un menu à qui n'utilise que Tab. */
  const onKeys = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End']
    if (!keys.includes(event.key)) return
    const items = [...(doorsRef.current?.querySelectorAll('button') ?? [])]
    if (items.length === 0) return
    const from = items.indexOf(document.activeElement as HTMLButtonElement)
    const to =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : // Le parcours boucle : arrivé en bas, on repart en haut.
            (from + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
    event.preventDefault()
    items[to]?.focus()
  }

  return (
    <>
      {/* Le calque fait reculer la page d'un plan, et referme au toucher. Il ne
          noircissait rien : trois boutons posés sur une liste de montants s'y
          confondaient, et rien ne disait qu'on était devant une question plutôt
          que devant l'écran du mois. Douze pour cent suffisent — il s'agit de
          faire reculer, pas de cacher.

          Il s'arrête au-dessus de la barre d'onglets plutôt que de la couvrir :
          elle n'est pas ce qu'on lisait, elle est une sortie, et l'assombrir
          reviendrait à la retirer alors qu'elle reste utilisable — changer
          d'écran referme les portes de toute façon. */}
      <div
        aria-hidden="true"
        onClick={() => {
          setOpen(false)
        }}
        className={cn(
          'quick-scrim fixed inset-x-0 top-0 z-30 lg:hidden',
          'bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom))]',
          'transition-opacity duration-[var(--dur)] ease-ds',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      {/* Au milieu de la barre d'onglets, à cheval sur la fente qu'elle ouvre
          pour lui (`TabBar`) : le disque descend de 20px dans la barre et en
          dépasse de 36, si bien qu'il se rattache à elle au lieu de flotter
          au-dessus. Le coin bas droite le mettait sous le pouce droit et hors
          d'atteinte du gauche ; le milieu ne favorise aucune main, et c'est le
          seul endroit d'une barre où l'on peut lui rendre sa place plutôt que
          la lui laisser prendre à deux onglets.

          Sous le bandeau de mise à jour (`z-50`) : celui-ci est rare, il porte
          une décision, et un bouton qui lui passerait devant en cacherait la
          moitié. */}
      {/* `data-open` vit ici et non sur le menu : c'est cet élément qui porte
          `.quick-doors`, donc la largeur de colonne dont les portes et la croix
          se servent, et le sélecteur qui les replie a besoin des deux sur le
          même nœud. Séparés, il ne désignait rien et les portes restaient
          affichées en permanence. */}
      {/* `pointer-events-none` sur la colonne, `auto` sur ce qui s'y touche.
          Cette colonne fait 168px de large sur plus de 200px de haut — la
          hauteur des trois portes, qui restent montées repliées, plus celle du
          bouton. Sans fond ni bordure elle ne se voit pas, mais un `div` reste
          une cible : tout ce qui passait sous ce rectangle, au coin bas droit
          de chaque écran, recevait les appuis à la place de la page. Les deux
          rangées du bas des récurrences — « Avances », « Crédits et dettes » —
          y perdaient leur moitié droite, chevron compris, là précisément où le
          doigt vise une rangée qui promet une navigation.

          Posé ici et non sur `.quick-door` : ce n'est pas ce qui est replié qui
          bloquait, c'est le cadre qui le porte. Chaque cible le reprend pour
          elle seule, et l'espace entre elles laisse passer — ouvert, il tombe
          alors sur le calque, qui referme, ce qui est exactement ce qu'un appui
          à côté doit faire. */}
      <div
        data-open={open}
        className={cn(
          'quick-doors pointer-events-none fixed left-1/2 z-40 -translate-x-1/2',
          'flex flex-col items-center gap-3',
          'lg:hidden',
          /* Le bas de la colonne est le bas du disque : 20px sous le haut de
             la barre, dans la fente. Les portes se posent au-dessus, à la
             gouttière du groupe. */
          'bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom)-1.25rem)]',
        )}
      >
        {/* Les portes restent montées, repliées comprises : c'est ce qui leur
            donne une fermeture animée autant qu'une ouverture, là où un montage
            conditionnel ne peut animer que l'arrivée. Repliées, elles sortent
            de l'arbre d'accessibilité et du parcours de tabulation — `inert`
            fait les deux dans un navigateur, `aria-hidden` le redit pour les
            outils qui ne le connaissent pas encore.

            La largeur du groupe est fixe et vit dans la feuille de style : elle
            aligne les bords, porte la colonne d'icônes, et surtout permet au
            bouton de fermeture de se centrer dessous — cette position-là dépend
            d'une largeur qu'un contenu variable ne donnerait qu'après coup. */}
        <div
          ref={doorsRef}
          id="portes-de-saisie"
          role="menu"
          inert={!open}
          /* `undefined` et non `false` : `aria-hidden="false"` est licite mais
             se pose dans le DOM pour ne rien dire, et un attribut qui traîne
             finit par se lire comme un état. */
          aria-hidden={open ? undefined : true}
          aria-label={t.shell.quickEntryLabel}
          onKeyDown={onKeys}
          /* Repliées, les portes ne reprennent pas les appuis : `inert` le dit
             déjà aux navigateurs qui le connaissent, mais c'est une garantie
             d'accessibilité, pas de géométrie — trois boutons transparents
             empilés sur la page ne doivent rien intercepter, quel que soit le
             moteur. */
          className={cn(
            'flex flex-col items-stretch gap-2',
            open ? 'pointer-events-auto' : 'pointer-events-none',
          )}
        >
          {doors.map((door, index) => (
            <Button
              key={door.path}
              role="menuitem"
              variant={door.variant}
              // `--i` porte le rang dans l'escalier d'arrivée : la valeur est
              // l'ordre de l'écran du mois, pas une décision de mise en forme.
              style={{ '--i': index } as CSSProperties}
              className="quick-door shadow-tile"
              onClick={() => {
                create(door.path)
              }}
            >
              <span className="quick-door-row">
                <Plus size={18} />
                {door.label}
              </span>
            </Button>
          ))}
        </div>

        {/* Le glyphe pivote plutôt que d'être remplacé par une croix : c'est le
            même bouton, et un `+` qui devient `×` sous le doigt dit mieux qu'il
            se referme que deux icônes qui se succèdent. Le nom accessible, lui,
            change pour de bon — il dit ce que le prochain appui fait.

            Il ne se déplace plus en s'ouvrant. Au coin, les deux positions
            étaient inconciliables — le bouton vivait au bord et les portes se
            dépliaient à sa gauche, donc l'une des deux devait céder. Centré,
            le bouton est déjà sous le milieu de la colonne : la rotation reste
            le seul mouvement, et c'est la bonne quantité de mouvement pour ce
            qu'elle dit. */}
        <button
          ref={trigger}
          type="button"
          aria-expanded={open}
          aria-controls="portes-de-saisie"
          aria-label={open ? t.shell.quickEntryClose : t.shell.quickEntry}
          onClick={() => {
            setOpen((previous) => !previous)
          }}
          className={cn(
            'pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full',
            'bg-accent text-accent-fg',
            /* `rotate` et non `transform` : `rotate-45` est posé sur la
               propriété `rotate`, et une transition déclarée sur `transform` ne
               la voit pas — le glyphe basculait d'un coup. Vérifié en lisant le
               style calculé, pas en relisant la classe. */
            'shadow-tile transition-[rotate,filter] duration-[var(--dur)] ease-ds',
            'hover:brightness-95 active:brightness-90',
            open && 'rotate-45',
          )}
        >
          <Plus size={24} />
        </button>
      </div>
    </>
  )
}
