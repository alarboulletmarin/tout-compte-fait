import { type ReactNode, useEffect, useRef } from 'react'
import { t } from '@/i18n/strings'
import { cn } from '@/lib/cn'
import { IconButton } from './Button'
import { Close } from './Icons'
import { useSheetDrag } from './useSheetDrag'

export type SheetProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Zone d'actions collée en bas, hors du défilement. */
  footer?: ReactNode
  /**
   * Une ligne posée au-dessus des actions, dans le même pied de feuille.
   *
   * Elle dit ce que la rangée fait quand les libellés n'en ont plus la place :
   * trois boutons dans 320px de fenêtre laissent 88px chacun, et « Ajouter une
   * dépense » n'y tient pas. Sans `footer`, elle n'aurait rien à annoncer et ne
   * se rend pas.
   */
  footerLead?: ReactNode
  /**
   * La feuille se referme en la tirant vers le bas, sous 640px seulement.
   *
   * Réservé aux **lectures** — la journée du calendrier, l'explication d'un
   * chiffre (DS §6). Une question fermée ne le prend pas : elle a deux sorties,
   * toutes deux nommées, et une troisième au doigt et sans mot jetterait sans
   * rien dire des confirmations délibérées.
   *
   * C'est aussi ce qui commande la poignée : **elle n'existe que là où le geste
   * existe.** Elle a longtemps été partout et n'a jamais rien fait — une pilule
   * centrée au bord haut d'une feuille montante ne dit qu'une chose, et c'est
   * « tire-moi ».
   */
  pullToClose?: boolean
  /**
   * Une feuille qu'aucun geste ne referme : ni croix, ni Échap, ni clic sur le
   * fond. Un seul bouton nommé la referme, et c'est celui du pied.
   *
   * C'est l'inverse exact de ce que le DS §6 demande partout ailleurs, et ça
   * n'est permis qu'à la notice du premier lancement (cahier §4.1). L'argument
   * est qu'elle ne pose aucune question : il n'y a pas de « non » à offrir
   * puisqu'il n'y a rien à accepter, et une sortie sans mot, touche Échap ou
   * doigt à côté, ferait passer pour un refus le fait d'avoir cliqué de travers.
   *
   * Ce n'est pas un piège au sens de WCAG 2.1.2 : le piège de focus reste celui
   * du navigateur, et la sortie existe au clavier comme au doigt.
   */
  dismissible?: boolean
  /**
   * L'`id` de ce que la feuille dit, posé en `aria-describedby`.
   *
   * `showModal()` place le focus sur le premier élément focusable du contenu.
   * Une feuille dont le texte *est* le propos, et non le décor d'un
   * formulaire, le ferait donc traverser sans être lu : un lecteur d'écran
   * annoncerait le nom de la feuille puis le premier lien, et rien entre les
   * deux. Là où le contenu doit être entendu, il se désigne.
   */
  describedBy?: string
}

/**
 * Feuille modale. S'appuie sur <dialog> natif : le piège de focus, la touche
 * Échap et l'inertie de l'arrière-plan sont fournis par le navigateur, donc
 * corrects. Feuille montante sur mobile, boîte centrée au-delà.
 *
 * Le mouvement d'entrée et de sortie vit dans la feuille de style, sur la
 * classe `.sheet` : `showModal()` n'anime rien, et une feuille montante qui
 * apparaît d'un coup ne dit pas d'où elle vient.
 *
 * `dismissible={false}` retire les trois sorties sans mot, croix, Échap et clic
 * sur le fond, et n'est permis qu'à un seul écran de l'app. Voir la prop.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  footerLead,
  pullToClose = false,
  dismissible = true,
  describedBy,
}: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  /* Le glissement est la quatrième sortie, et elle n'a pas à survivre là où les
     trois autres ont été retirées : `pullToClose` et `dismissible={false}`
     ensemble décriraient une feuille qu'on ne peut pas fermer mais qu'on peut
     jeter au pouce. Les deux props se croisent ici une fois pour toutes, plutôt
     que de compter sur personne pour ne jamais les poser côte à côte. Une seule
     fois, aussi, parce que la poignée suit la même condition que le geste : elle
     n'existe que là où il existe. */
  const draggable = pullToClose && dismissible
  const drag = useSheetDrag({ open, onClose, enabled: draggable })

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      /* `showModal()` donne le focus au premier élément focusable du contenu.
         Sur une feuille ordinaire c'est la croix, en tête : on arrive donc en
         haut. Sur une feuille dont le texte *est* le propos, c'est le premier
         lien du corps, et un lecteur d'écran annonce alors son nom à lui, ce
         qui écrase la description que `describedBy` vient de poser. Le focus va
         donc sur la boîte : le nom et la description sont lus d'abord, et la
         première tabulation atteint le lien. */
      if (!dismissible) dialog.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open, dismissible])

  return (
    <dialog
      ref={ref}
      aria-label={title}
      aria-describedby={describedBy}
      /* Focusable seulement là où l'effet le vise : un `<dialog>` n'est pas
         focusable de lui-même, et le poser partout ferait de toutes les feuilles
         de l'app un conteneur qui prend le focus. `outline-none` avec, parce
         qu'un conteneur focusé au programme dessine son anneau autour de la
         boîte entière, alors que le DS §8 demande un focus visible sur ce qu'on
         actionne, et qu'une boîte n'est pas un bouton. */
      tabIndex={dismissible ? undefined : -1}
      /* `preventDefault` dans les deux cas, et pour deux raisons différentes :
         une feuille ordinaire referme elle-même par son `open` plutôt que de
         laisser le navigateur le faire dans son dos ; une feuille non
         refermable, elle, ne referme pas du tout. */
      onCancel={(event) => {
        event.preventDefault()
        if (dismissible) onClose()
      }}
      onClick={(event) => {
        // Un clic sur le fond ferme ; un clic dans la feuille ne remonte pas.
        if (dismissible && event.target === ref.current) onClose()
      }}
      className={cn(
        // `.sheet` porte l'entrée, la sortie et la couleur du fond. Le fond ne
        // peut pas rester en utilitaire `backdrop:` : la feuille émet la couche
        // `utilities` après `components`, donc il gagnerait quel que soit
        // l'ordre d'écriture, et le fondu ne se verrait jamais.
        'sheet surface m-0 w-full bg-transparent p-0 text-text',
        // La feuille de style du navigateur pose `max-width` et `max-height:
        // calc(100% - 6px - 2em)` sur tout dialog modal — bordure et padding
        // par défaut comptés en dur, que `p-0` ne retire pas du calcul. Comme
        // `max-width` l'emporte sur `width`, `w-full` seul laisse 38px de vide
        // au bord. Les neutraliser rend la taille à nos classes : la largeur
        // ici, la hauteur au `max-h-[90dvh]` du contenu.
        'max-h-none max-w-none',
        'mt-auto sm:m-auto sm:max-w-lg',
        !dismissible && 'outline-none',
      )}
    >
      <div
        /* Le glissement porte sur `transform`, pendant que l'entrée et la
           sortie animent `translate` sur le <dialog> : deux éléments, deux
           propriétés, et aucun style en ligne qui vienne figer l'animation de
           sortie. Le <dialog> est transparent, c'est ce bloc qui porte la
           surface — le déplacer déplace la feuille qu'on voit. */
        style={
          drag.offset === 0 ? undefined : { transform: `translateY(${String(drag.offset)}px)` }
        }
        className={cn(
          'flex max-h-[90dvh] flex-col bg-surface text-text',
          'rounded-t-tile sm:rounded-tile',
          // Pendant le glissement, suivre le doigt sans retard ; au
          // relâchement, le retour à zéro s'anime.
          !drag.dragging && 'transition-transform duration-[var(--dur)] ease-ds',
        )}
      >
        {/* La zone de prise réunit la poignée et l'en-tête : 86px, bien au-delà
            du plancher de 44px du DS §8, et c'est la bande que la poignée
            désignait déjà. Le corps en est exclu — il défile, et `touch-action`
            ne peut pas servir un défilement et un glissement sur le même
            élément.

            `touch-pan-x` cède l'axe horizontal au navigateur et garde le
            vertical : sans lui, le navigateur préempte le mouvement pour faire
            défiler et n'envoie plus un seul `pointermove`. `touch-pinch-zoom`
            rend le zoom, qu'une modale plein écran est justement l'endroit où
            l'on veut. */}
        <div
          {...(drag.live ? drag.handlers : {})}
          className={cn(
            'shrink-0',
            drag.live && 'touch-pan-x touch-pinch-zoom cursor-grab select-none active:cursor-grabbing',
          )}
        >
          {/* Elle dit qu'on est sur une feuille montante, donne au pouce un
              repère au bord de l'écran, et — depuis qu'elle n'apparaît qu'avec
              le geste — ne promet plus rien qu'elle ne tienne. Sans objet sur
              une boîte centrée. */}
          {draggable && (
            <div
              aria-hidden="true"
              className="mx-auto mt-2.5 h-1 w-9 rounded-chip bg-surface-2 sm:hidden"
            />
          )}

          {/* La croix n'apparaît que là où le geste existe : la même règle que
              la poignée, et que les repères d'action du DS §6. Un bouton
              « Fermer » sur une feuille qui ne se ferme pas serait la pire des
              deux : il promettrait la sortie et ne la donnerait pas. */}
          <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
            <h2 className="t-section min-w-0 truncate">{title}</h2>
            {dismissible && (
              <IconButton label={t.common.close} onClick={onClose}>
                <Close />
              </IconButton>
            )}
          </header>
        </div>

        {/* Sans pied de feuille, c'est le contenu qui doit passer au-dessus de
            l'indicateur d'accueil : il colle sinon au bord bas de l'écran, où
            le système le recouvre.

            `overscroll-contain` empêche un défilement arrivé en butée de
            repartir sur la page derrière, qui est justement celle que la
            feuille recouvre. */}
        <div
          className={cn(
            'min-h-0 flex-1 overflow-y-auto overscroll-contain px-5',
            footer === undefined ? 'pb-[max(1.5rem,env(safe-area-inset-bottom))]' : 'pb-5',
          )}
        >
          {children}
        </div>

        {footer !== undefined && (
          <footer className="flex flex-col gap-2 border-t border-border px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footerLead}
            {/* Les actions se partagent la largeur à parts égales : `w-full`
                sur chacune les ferait déborder du pied de feuille. Le partage
                vit sur cette rangée et non sur le pied, qui porte maintenant
                deux enfants de natures différentes — `[&>*]` posé au-dessus
                étirerait la légende comme un bouton. */}
            <div className="flex gap-2 [&>*]:min-w-0 [&>*]:flex-1 [&>*]:basis-0">{footer}</div>
          </footer>
        )}
      </div>
    </dialog>
  )
}
