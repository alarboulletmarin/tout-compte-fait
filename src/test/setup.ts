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

/* jsdom ne mesure rien, donc il n'implémente pas `ResizeObserver`.
 *
 * C'est le seul manque qui ferait **lever** un composant plutôt que rendre une
 * réponse fausse : la figure de la simulation (Recharts) s'y abonne pour suivre
 * la taille de son cadre, et sans lui le premier rendu de l'écran jette une
 * TypeError. Le bouchon n'observe rien — il n'y a rien à observer, jsdom ne
 * fait pas de mise en page —, si bien que la figure se rend à zéro pixel : les
 * tests de cet écran lisent donc sa lecture textuelle et son tableau, qui sont
 * de toute façon ce que le cahier §5 exige d'elle. */
if (typeof globalThis.ResizeObserver !== 'function') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

/* Le sixième trou, et le seul qui vienne du **moteur** plutôt que de jsdom.
 *
 * Node 26 expose son propre `localStorage`, mais refuse de le servir sans
 * `--localstorage-file` ; il masque au passage celui que jsdom posait, si bien
 * que `localStorage` vaut `undefined` des deux côtés. Trente-neuf tests
 * tombaient là-dessus — la langue, le thème, la notice, les rappels d'export :
 * tout ce qui garde un miroir hors d'IndexedDB —, et ils tombaient sur
 * `localStorage.clear()`, c'est-à-dire dans leur préambule, loin de ce qu'ils
 * vérifient.
 *
 * Le bouchon est une `Storage` complète et en mémoire, pas un objet à trois
 * méthodes : `key()` et `length` font partie du contrat, et un test qui
 * énumère les clés doit lire la même chose qu'un navigateur. Les valeurs sont
 * converties en chaîne comme le fait la vraie API — c'est ce qui distingue un
 * bouchon d'une approximation qui laisserait passer un bug de sérialisation.
 *
 * **Les méthodes vivent sur `Storage.prototype`, pas sur l'instance**, et ce
 * n'est pas une coquetterie : un test de `transfer.ts` espionne
 * `Storage.prototype.setItem` pour compter les écritures d'une date d'export.
 * Une méthode posée en propriété propre masque celle du prototype, l'espion ne
 * voit alors rien passer, et le test échoue en annonçant zéro écriture là où
 * l'app en fait une. Un bouchon qui ment sur sa forme fait échouer les tests
 * qui regardent la forme. */
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>()
  const proto: object = typeof Storage === 'function' ? Storage.prototype : {}
  Object.defineProperties(proto, {
    length: { get: () => store.size, configurable: true },
    key: {
      value: (index: number) => [...store.keys()][index] ?? null,
      configurable: true,
      writable: true,
    },
    getItem: {
      value: (key: string) => store.get(String(key)) ?? null,
      configurable: true,
      writable: true,
    },
    setItem: {
      value: (key: string, value: string) => {
        store.set(String(key), String(value))
      },
      configurable: true,
      writable: true,
    },
    removeItem: {
      value: (key: string) => {
        store.delete(String(key))
      },
      configurable: true,
      writable: true,
    },
    clear: {
      value: () => {
        store.clear()
      },
      configurable: true,
      writable: true,
    },
  })
  const memory = Object.create(proto) as Storage
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memory })
  /* `window` et `globalThis` sont le même objet sous jsdom, mais l'écrire
     protège du jour où ils cesseraient de l'être. */
  if (typeof window !== 'undefined' && window !== (globalThis as unknown)) {
    Object.defineProperty(window, 'localStorage', { configurable: true, value: memory })
  }

  /* Vidé entre deux tests, comme la langue plus haut et pour la même raison :
     le stockage est un état de module, donc partagé par tout un fichier. Sans
     ce retour, un test qui écarte un rappel d'export le laisse écarté pour les
     suivants — et ceux-là échouent loin de la ligne qui a écrit la clé. Quatre
     tests le montraient dès que le bouchon a existé : ils passaient parce que
     l'écriture échouait, pas parce qu'elle était propre. */
  afterEach(() => {
    store.clear()
  })
}
