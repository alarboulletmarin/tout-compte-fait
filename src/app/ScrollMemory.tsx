import { useEffect, useLayoutEffect, useRef } from 'react'
import { NavigationType, useLocation, useNavigationType } from 'react-router-dom'

/**
 * La position de défilement de chaque entrée d'historique.
 *
 * Au module et non dans un état : elle survit aux remontages de l'arbre — dont
 * celui que provoque un changement de langue —, et elle n'a jamais à provoquer
 * de rendu. Les clés sont celles que le routeur donne à ses entrées, donc
 * uniques et jetables : une session longue en accumule quelques dizaines, ce
 * qui ne pèse rien.
 */
const remembered = new Map<string, number>()

/* Combien d'images on laisse au document pour grandir avant de renoncer.
   Une page qui arrive par `import()` est d'abord une coquille : le navigateur
   rabat toute position au-delà de sa hauteur, et une seule tentative se ferait
   donc écraser à zéro. Trente images font une demi-seconde à 60 Hz, ce qui
   couvre un chargement de bundle depuis le cache ; au-delà, on est sur un
   réseau où l'utilisateur a de toute façon vu la page se construire. */
const FRAMES = 30

/**
 * Ramène en haut d'un écran qu'on ouvre, et là où on était sur un retour.
 *
 * Sans elle, le défilement ne bougeait pas d'un écran à l'autre : on lisait le
 * mois à neuf cents pixels du haut, on touchait la tuile Répartition, et l'écran
 * de la répartition s'ouvrait au milieu. Le retour arrière ne valait pas mieux —
 * il rendait la position qu'on avait sur l'écran *quitté*, pas celle qu'on avait
 * laissée sur celui qu'on retrouvait.
 *
 * Les cas où ça semblait marcher étaient des accidents : le navigateur rabat
 * toute position que le nouveau document ne peut pas porter, et une fiche courte
 * ramenait donc à zéro par pure arithmétique. C'est ce qui rendait la panne
 * difficile à voir — elle ne se manifestait que sur les écrans assez longs pour
 * ne rien rabattre.
 *
 * **Deux gestes, deux réponses.** Ouvrir un écran est un aller : on le prend par
 * le haut, comme on ouvrirait une page. Revenir est un retour : on retrouve ce
 * qu'on regardait, et c'est ce que le navigateur promet depuis toujours ailleurs
 * que dans une application d'une seule page.
 *
 * **`scrollRestoration` passe en manuel**, sinon le navigateur tente sa propre
 * restauration au `popstate` — c'est-à-dire avant que React n'ait rendu la page
 * plus haute, donc sur un document trop court pour la porter. Sa tentative est
 * rabattue, la nôtre la suivrait, et deux corrections successives se voient. Le
 * prix est qu'un rechargement complet repart du haut : la mémoire vit dans cette
 * page-ci, et il n'y a rien d'honnête à restaurer une position dont on n'a plus
 * la trace.
 *
 * En `useLayoutEffect` pour la raison qui fait celui de `useApplyLocale` : la
 * position se repose après que le nouvel arbre est écrit et avant que le
 * navigateur ne peigne, si bien qu'aucun état intermédiaire ne se voit.
 */
export function ScrollMemory() {
  const location = useLocation()
  const navigationType = useNavigationType()
  /* L'écran d'où l'on vient. Comparé au chemin et non à la clé : retoucher
     l'onglet actif crée bien une entrée d'historique, mais ne change pas
     d'écran — et cette remontée-là appartient à `scrollToTop`, qui la fait en
     douceur depuis la barre. La couper net serait un mouvement de plus pour le
     même geste. */
  const from = useRef<string | null>(null)
  /* L'entrée d'historique à laquelle attribuer ce qu'on lit du défilement. */
  const current = useRef(location.key)

  /**
   * On relève la position **au moment où l'on décide de partir**.
   *
   * Ni dans un effet, ni au fil du défilement, et les deux ont été essayés.
   *
   * Un effet de mise en page s'exécute après que le nouvel arbre est écrit dans
   * le document : la page a déjà changé de hauteur, et le navigateur a déjà
   * rabattu la position si le nouvel écran est plus court. On y relèverait la
   * position *rabattue*.
   *
   * Un écouteur de défilement ne s'en sort pas mieux, et c'est moins évident :
   * ce rabattement **émet un `scroll`**, et il l'émet avant que l'effet n'ait pu
   * changer d'entrée d'historique. Mesuré — un mois quitté à 900 se voyait
   * réécrit à 219 par le rabattement de la répartition, qui est plus courte. Le
   * dernier `scroll` d'un écran n'est donc pas celui qu'on regardait.
   *
   * Restent les deux instants où la page est encore la bonne : le clic qui va
   * faire naviguer, capté avant que le routeur ne l'entende, et le `popstate`
   * d'un retour, qui précède le rendu. Une navigation lancée sans clic — après
   * un enregistrement, par exemple — retiendra la position du dernier clic ;
   * c'est le même écran, à ce qu'on a fait défiler depuis près.
   */
  useEffect(() => {
    const note = (): void => {
      remembered.set(current.current, window.scrollY)
    }
    window.addEventListener('click', note, { capture: true, passive: true })
    window.addEventListener('popstate', note)
    return () => {
      window.removeEventListener('click', note, { capture: true })
      window.removeEventListener('popstate', note)
    }
  }, [])

  useLayoutEffect(() => {
    const path = location.pathname
    const key = location.key
    const same = from.current === path
    from.current = path
    /* Avant tout déplacement : ce qui suit va faire défiler, et ces mouvements-là
       appartiennent déjà à l'écran qui arrive. */
    current.current = key

    if (typeof window === 'undefined') return
    if (history.scrollRestoration !== 'manual') history.scrollRestoration = 'manual'
    if (same) return

    if (navigationType === NavigationType.Pop) restore(remembered.get(key) ?? 0)
    else window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.key, location.pathname, navigationType])

  return null
}

/**
 * Repose une position, en laissant au document le temps de grandir.
 *
 * Un écran chargé à la demande n'a pas encore sa hauteur au moment où l'on
 * voudrait le remettre en place : la position demandée est rabattue, et une
 * seule tentative rendrait le haut de la page. On redemande donc à chaque image
 * jusqu'à ce que la position tienne — ou jusqu'à ce qu'il devienne clair
 * qu'elle ne tiendra pas, parce que la page est réellement plus courte
 * qu'avant.
 *
 * Jamais `smooth` : on ne défile pas, on remet là où on était. C'est la règle
 * que `useApplyLocale` suit déjà pour le même geste.
 */
function restore(top: number): void {
  if (top === 0) {
    window.scrollTo({ top: 0, behavior: 'auto' })
    return
  }
  let left = FRAMES
  const step = (): void => {
    window.scrollTo({ top, behavior: 'auto' })
    left -= 1
    if (Math.round(window.scrollY) >= top - 1 || left <= 0) return
    requestAnimationFrame(step)
  }
  step()
}
