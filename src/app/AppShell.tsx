import { type ReactNode, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { t } from '@/i18n/strings'
import { cn } from '@/lib/cn'
import { useHouseholdName } from '@/store/selectors'
import { ScreenEntryProvider } from '@/ui/ScreenEntryProvider'
import { ScreenTitleProvider } from '@/ui/ScreenTitleProvider'
import { useHotkeys } from '@/ui/useHotkeys'
import { DataNotice } from './DataNotice'
import { Sidebar, TabBar } from './Nav'
import { QuickEntry } from './QuickEntry'
import { entryQuickPath, isFocusScreen, isFullFrame } from './routes'

/** Coquille de l'app : navigation et gabarit. Aucune règle métier ici. */
export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const householdName = useHouseholdName()
  const navigate = useNavigate()
  const focus = isFocusScreen(pathname)
  /* La revue prend le cadre entier au doigt : pas de barre d'onglets, donc pas
     de cadre bas à lui réserver. Voir `isFullFrame`, qui dit pourquoi elle est
     seule dans ce cas. */
  const fullFrame = isFullFrame(pathname)

  /* Le geste le plus fréquent de l'app, sur une touche. Pas sur un écran de
     saisie : « n » y partirait créer une dépense par-dessus celle qu'on est en
     train d'écrire, et il contournerait la garde de brouillon, qui ne surveille
     que les deux boutons de sortie. */
  useHotkeys({
    n: focus
      ? undefined
      : () => {
          void navigate(entryQuickPath({ direction: 'out' }))
        },
  })

  /* Le focus part au contenu à chaque changement d'écran.

     Changer d'URL ici ne recharge rien : le focus restait donc sur le lien de
     navigation qu'on venait d'activer, à tabuler dans un menu pendant que
     l'écran, lui, avait changé — et le lecteur d'écran n'avait aucune raison de
     lire quoi que ce soit. Le titre se dit en parallèle (`ScreenTitleProvider`),
     et les deux gestes ne se remplacent pas : l'un sert la voix, l'autre le
     clavier.

     Trois gardes. Le premier affichage n'en est pas un — comparer le chemin
     précédent le dit, et survit au double montage du `StrictMode`, ce qu'un
     simple drapeau ne fait pas. Un écran qui a posé son propre focus le garde :
     le premier champ d'une saisie est exactement là où l'on veut être, et le
     renvoyer en haut annulerait le geste qu'on vient de faire. Et le focus est
     programmatique : `:focus-visible` ne s'y applique pas, l'anneau du DS ne se
     dessine donc pas autour de la page entière.

     `preventScroll` parce que ce focus-ci sert la voix, pas l'œil : donner le
     focus à un élément le ramène dans la vue, et `<main>` commence six pixels
     sous le haut du document — un écran ouvert par ce chemin s'affichait donc
     à six pixels du haut au lieu du haut. La position de défilement appartient
     à `ScrollMemory`, qui la décide selon qu'on ouvre un écran ou qu'on y
     revient ; deux mains sur le même volant s'annulent. */
  const main = useRef<HTMLElement>(null)
  const previous = useRef(pathname)

  useEffect(() => {
    if (previous.current === pathname) return
    previous.current = pathname

    const node = main.current
    if (node === null || node.contains(document.activeElement)) return
    node.focus({ preventScroll: true })
  }, [pathname])

  return (
    <ScreenTitleProvider>
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-input focus:bg-surface focus:px-4 focus:py-2"
      >
        {t.a11y.skipToContent}
      </a>

      <div className="mx-auto flex w-full max-w-7xl">
        <Sidebar householdName={householdName} />
        <main
          id="contenu"
          key={pathname}
          ref={main}
          /* Focalisable au script, jamais à la tabulation : le contenu n'est pas
             une étape du parcours clavier, c'est là qu'on le dépose. */
          tabIndex={-1}
          /* Le cadre du bas dégage le bouton flottant, et pas seulement la barre
             d'onglets : les trente derniers pixels de chaque écran vivaient
             sous lui. On ne le voyait pas tant que les écrans finissaient par
             une tuile ou un bouton centré ; la légende du calendrier, elle, est
             du texte qui file jusqu'au bord, et sa dernière ligne y
             disparaissait.

             La mesure suit celle de `QuickEntry`, aux mêmes tokens — un cadre
             écrit en dur se décalerait le jour où le bouton bouge, et il vient
             justement de bouger. Le disque descend maintenant de 20px dans la
             barre au lieu de s'en écarter de 16 : il ne dépasse plus que de
             36px au-dessus d'elle, contre 72 auparavant. Plus une gouttière de
             16, cela fait 52 — et le cadre se resserre d'autant, parce qu'il
             dégageait une hauteur que le bouton n'occupe plus. */
          className={cn(
            'view-enter min-w-0 flex-1 px-4 pt-4 md:px-8 md:pt-8',
            fullFrame
              ? 'pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:pb-10'
              : 'pb-[calc(var(--nav-h)+3.25rem+env(safe-area-inset-bottom))] lg:pb-10',
          )}
        >
          {/* Un seul bandeau pour les trois façons de dire « garde une copie » —
              échec d'écriture, conservation non garantie, export ancien — et une
              seule décision derrière : voir `DataNotice`. Il reçoit `focus`
              plutôt que de s'effacer entièrement sur un écran de saisie, car
              l'échec confirmé, lui, doit s'y montrer : c'est précisément là
              qu'on est en train de perdre du travail. */}
          <DataNotice focus={focus} />
          {/* Sous `key={pathname}` : c'est cette clé qui fait d'un changement
              d'URL une arrivée, et le marqueur d'arrivée doit repartir avec
              elle. Il n'englobe pas les deux bandeaux ci-dessus, qui ne
              dépendent pas de l'écran. */}
          <ScreenEntryProvider>{children}</ScreenEntryProvider>
        </main>
      </div>

      {/* La barre d'onglets s'efface sur les écrans plein cadre, et sur eux
          seuls : la revue est une tâche qui a une fin visible et sa propre
          sortie, pas une section de l'app dans laquelle on entre. */}
      {!fullFrame && <TabBar />}
      {/* Après la barre d'onglets, qu'il surplombe : c'est le même geste au
          doigt que le raccourci « n » au clavier, et il porte la même garde. */}
      <QuickEntry />
    </ScreenTitleProvider>
  )
}
