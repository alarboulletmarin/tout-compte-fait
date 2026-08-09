import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { fr } from '@/i18n/fr'
import { setCatalog } from '@/i18n/strings'

afterEach(() => {
  cleanup()
})

/* La langue revient au français entre deux tests.
 *
 * Le catalogue actif est un état de module (`i18n/strings.ts`), donc partagé par
 * tout un fichier de test : sans ce retour, un test qui passe l'app en anglais
 * laisse les suivants s'exécuter en anglais — et ils échouent loin de la ligne
 * qui a changé la langue, ce qui est la pire façon de les lire. Le reste de la
 * suite parle français parce que c'est la langue par défaut, pas parce qu'elle
 * a de la chance. */
afterEach(() => {
  setCatalog('fr', fr)
})

/* jsdom n'implémente pas matchMedia : le module de thème s'en sert au boot.
 *
 * `prefers-reduced-motion: reduce` répond vrai, et c'est délibéré : jsdom n'a
 * pas de compositeur, donc pas d'images à composer — une assertion posée sur un
 * montant à la moitié de son comptage ne teste pas le comptage, elle teste le
 * hasard de la première frame. Les tests lisent donc partout la valeur
 * d'arrivée, qui est ce dont ils parlent ; le comptage lui-même a son test, qui
 * rétablit la préférence chez lui pour l'exercer pour de bon.
 *
 * Les requêtes de largeur, elles, répondent sur `window.innerWidth` — que jsdom
 * pose à 1024. Répondre « faux » à tout donnait la bonne réponse par accident :
 * un composant qui demande « suis-je au-delà de 640px ? » l'entendait toujours
 * comme un téléphone, y compris dans un test qui parlait d'un écran large. Un
 * test qui parle d'une largeur la règle maintenant, et l'écrit. */
function matches(query: string): boolean {
  if (query.includes('prefers-reduced-motion')) return true
  const min = /min-width:\s*(\d+)px/.exec(query)
  if (min?.[1] !== undefined) return window.innerWidth >= Number(min[1])
  const max = /max-width:\s*(\d+)px/.exec(query)
  if (max?.[1] !== undefined) return window.innerWidth <= Number(max[1])
  return false
}

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      /* Lu au moment de la question, jamais figé à la construction : un test
         qui change `innerWidth` entre deux rendus doit changer de réponse. */
      get matches() {
        return matches(query)
      },
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

/* jsdom pose l'élément `<dialog>` mais pas ses méthodes. `Sheet` s'appuie
   dessus pour tout ce qui rend une feuille correcte — piège de focus, Échap,
   clic sur le fond — et c'est justement pour ne pas le réécrire qu'on l'a
   choisi : le combler ici plutôt que de tester une feuille qui n'est pas celle
   de l'app. L'attribut `open` suffit, c'est lui que `Sheet` lit. */
if (typeof HTMLDialogElement === 'function' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
}

/* Même trou, même bouchon : jsdom pose les événements de pointeur mais pas la
   capture, dont les trois gestes de l'app se servent pour que le relâchement
   leur revienne même sorti du cadre. Sans ça, le premier `pointerdown` d'un
   test lève une TypeError. La capture n'a rien à simuler ici — jsdom ne route
   les événements que vers la cible qu'on lui nomme. */
if (typeof Element === 'function' && !Element.prototype.setPointerCapture) {
  const captured = new WeakMap<Element, Set<number>>()
  Element.prototype.setPointerCapture = function set(this: Element, id: number) {
    const ids = captured.get(this) ?? new Set<number>()
    ids.add(id)
    captured.set(this, ids)
  }
  Element.prototype.releasePointerCapture = function release(this: Element, id: number) {
    captured.get(this)?.delete(id)
  }
  Element.prototype.hasPointerCapture = function has(this: Element, id: number) {
    return captured.get(this)?.has(id) ?? false
  }
}
