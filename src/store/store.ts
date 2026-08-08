/* ============================================================================
 * L'état de l'app.
 *
 * Le document est hydraté une fois au démarrage et vit en mémoire ; chaque
 * mutation le remplace et programme une écriture en debounce. Aucun composant
 * ne modifie `data` autrement qu'en appelant une action d'ici.
 * ==========================================================================*/

import { create } from 'zustand'
import { type YearMonth, currentYm, today } from '@/domain/date'
import { makeId } from '@/domain/ids'
import { monthHorizon } from '@/domain/month'
import { openMonth } from '@/domain/updates'
import type { Data, Locale, PaletteSetting, ThemeSetting } from '@/domain/types'
import { t } from '@/i18n/strings'
import { backupDaily, clearBackups } from '@/persistence/backups'
import { clearDocument, loadDocument, saveDocument, setDbEventHandler } from '@/persistence/db'
import { emptyData } from '@/persistence/defaults'
import { askDurability, noteWrite, noteWriteFailure, probeDurability } from '@/persistence/health'
import { type TabChannel, type TabMessage, openTabChannel } from '@/persistence/tabs'
import { forgetExportMarks } from '@/persistence/transfer'
import { WRITE_DELAY_MS, createWriter } from '@/persistence/writer'
import { storeLocale } from '@/i18n/locale'
import { mirrorAppearance, readStoredPalette, storePalette } from '@/theme/palette'
import { readStoredPreference, storePreference } from '@/theme/theme'
import { toast, useToasts } from '@/ui/toast'

export type AppStatus = 'loading' | 'onboarding' | 'ready'

/**
 * Ce qu'on regarde du mois. Trois lectures, et non deux.
 *
 * Le foyer se découpe de deux façons, et elles ne se recouvrent pas :
 *
 *     foyer = commun + les lignes perso de chacun     (par propriété)
 *     foyer = la vue de chaque membre, additionnée    (par personne)
 *
 * `member` relève du second — ses lignes plus sa part du commun, si bien que la
 * somme des vues vaut le foyer. `common` relève du premier : le pot seul, à son
 * montant plein, qui n'appartient à personne. Les confondre était l'ambiguïté
 * d'une seule étiquette « Tout le foyer » qui voulait dire « tout » ici et « le
 * commun » sur l'écran de saisie.
 *
 * Type discriminé plutôt qu'un `string | undefined` avec une valeur convenue :
 * un membre s'appelle par un identifiant, et rien n'aurait empêché de le
 * confondre avec le mot qui désigne le pot.
 */
export type MonthFilter =
  | { kind: 'all' }
  | { kind: 'common' }
  | { kind: 'member'; memberId: string }

export const ALL_FILTER: MonthFilter = { kind: 'all' }

/**
 * Un échec de persistance, et de quel côté il est tombé.
 *
 * Le `kind` n'est pas décoratif : c'est lui qui permet à une écriture réussie
 * d'effacer le bandeau d'échec d'écriture sans effacer un échec de lecture, qui
 * lui n'est jamais réparé par une écriture — le document illisible l'est resté.
 * Les deux n'ont d'ailleurs ni la même issue ni le même écran : l'un se règle
 * par un export depuis la coquille, l'autre par un import depuis l'arrivée.
 */
export type StorageError = { kind: 'read' | 'write'; message: string }

export type StoreState = {
  status: AppStatus
  data: Data
  /** Mois affiché. Toujours un mois valide, jamais dérivé d'un composant. */
  ym: YearMonth
  /** Portée de lecture commune à tous les tableaux de bord. */
  filter: MonthFilter
  /** Dernière erreur de persistance, à afficher telle quelle. */
  error: StorageError | null
  /**
   * Révision de la base connue de cet onglet. Ce n'est pas un compteur de
   * mutations : c'est ce qu'on croit être écrit sur le disque, et c'est à ça
   * qu'on compare ce qu'un autre onglet annonce.
   */
  rev: number
}

export type StoreActions = {
  hydrate: () => Promise<void>
  /** Remplace le document. Le seul point d'écriture de `data`. */
  mutate: (recipe: (data: Data) => Data) => void
  setYm: (ym: YearMonth) => void
  setFilter: (filter: MonthFilter) => void
  setTheme: (theme: ThemeSetting) => void
  /**
   * L'identité colorimétrique, à côté du thème et indépendante de lui.
   *
   * Les six palettes vivent dans `styles/palettes.css` : ce réglage-ci ne fait
   * que poser `data-palette` sur <html>. Aucun composant n'en sait rien, et rien
   * du document n'est réécrit — les teintes stockées sur une catégorie ou un
   * membre sont des noms de tokens, donc elles suivent.
   */
  setPalette: (palette: PaletteSetting) => void
  /**
   * La langue de l'interface.
   *
   * Écrite dans le document, comme le thème et la palette, et pour la même
   * raison : c'est un choix, et il doit survivre au navigateur qui l'a
   * recueilli. Elle ne touche à aucune donnée saisie — les noms de catégories
   * d'un foyer restent ceux qu'il a écrits (voir `Locale`).
   */
  setLocale: (locale: Locale) => void
  /**
   * La devise dans laquelle les montants s'affichent.
   *
   * Elle était stockée, validée, migrée, exportée et lue par tous les montants
   * de l'app — et réglable nulle part : elle valait « EUR » à perpétuité, sans
   * que rien ne le dise. Ce n'est pas la multi-devise, que le cahier §2 laisse
   * hors v1 : aucun taux n'est appliqué, aucune conversion n'a lieu, et les
   * centimes restent des centimes. C'est le symbole sous lequel on les lit.
   */
  setCurrency: (currency: string) => void
  finishOnboarding: () => void
  /**
   * Ouvre un mois s'il ne l'a jamais été, à condition qu'il ne soit pas passé.
   * Idempotent.
   */
  ensureMonthOpen: (ym?: YearMonth) => void
  replaceData: (data: Data) => Promise<void>
  resetAll: () => Promise<void>
  /** Efface un document que l'app n'a pas su lire, et rouvre l'onboarding. */
  discardUnreadable: () => Promise<void>
  setError: (error: StorageError | null) => void
  flush: () => Promise<void>
  /** Ce qu'un autre onglet vient d'annoncer. Public pour être testable seul. */
  onTabMessage: (message: TabMessage) => Promise<void>
}

export type Store = StoreState & StoreActions

/**
 * Le canal des onglets, ouvert une fois pour toutes à la première hydratation.
 * Pas au chargement du module : un test qui n'hydrate pas n'a aucune raison
 * d'ouvrir un canal, et `hydrate` part deux fois sous `StrictMode`.
 */
let channel: TabChannel | null = null

/**
 * Le document tel qu'il était au démarrage. C'est lui qu'archive l'anneau de
 * sauvegardes, et non celui qu'on écrit : voir `persist`.
 */
let bootSnapshot: Data | null = null

/**
 * L'écriture, révision comprise. Le compteur est tenu en mémoire plutôt que
 * relu avant chaque écriture : le relire imposerait un aller-retour avec la
 * base au moment précis — `pagehide` — où il ne faut plus rien attendre.
 */
async function persist(data: Data): Promise<void> {
  const rev = useStore.getState().rev + 1
  /* Le seul endroit d'où part une écriture du document — le writer et les
     remplacements passent tous deux par ici —, donc le seul où la santé du
     stockage puisse se tenir à jour sans être notée à deux endroits qui
     finiraient par diverger. La marque est posée sur la transaction commise,
     pas sur l'appel : c'est toute la différence entre « l'écran a changé » et
     « c'est écrit ». */
  try {
    await saveDocument(data, rev)
  } catch (cause) {
    noteWriteFailure()
    throw cause
  }
  noteWrite()
  useStore.setState({ rev })
  channel?.post({ type: 'saved', rev })

  /* L'instantané du jour porte l'état **du démarrage**, pas celui qu'on vient
     d'écrire : un point de retour sert à revenir avant ce qui a cassé, et ce
     qui casse est la session en cours. Après un onboarding, il n'y a rien à
     archiver — et c'est juste, il n'existait aucun état antérieur.
     Une sauvegarde ratée n'est pas une écriture ratée : elle ne doit pas
     allumer le bandeau ni faire échouer ce qui vient d'aboutir. */
  if (bootSnapshot !== null) {
    try {
      await backupDaily(bootSnapshot)
    } catch {
      /* rien à en dire */
    }
  }
}

/**
 * Les hooks référencent `useStore` dans leur corps et non à l'évaluation : le
 * writer est construit avant que le store existe, mais aucun d'eux ne peut
 * partir avant la première écriture, donc bien après.
 */
const writer = createWriter(persist, WRITE_DELAY_MS, {
  onWritten() {
    // Une écriture qui passe efface le bandeau d'échec d'écriture. Pas un échec
    // de lecture : rien de ce qu'on écrit ne rend lisible ce qui ne l'était pas.
    const { error, setError } = useStore.getState()
    if (error?.kind === 'write') setError(null)
  },
  onFailed() {
    useStore.getState().setError({ kind: 'write', message: t.storage.writeFailed })
  },
})

/**
 * Un incident de connexion est un échec d'écriture qui n'attend pas la
 * prochaine écriture pour se savoir : les trois cas laissent la base
 * inutilisable jusqu'au rechargement. `blocked` est le seul qui touche à la
 * lecture — il tombe pendant l'ouverture, donc avant qu'il y ait quoi que ce
 * soit à écrire.
 */
setDbEventHandler((event) => {
  useStore.getState().setError(
    event === 'blocked'
      ? { kind: 'read', message: t.storage.blocked }
      : { kind: 'write', message: event === 'blocking' ? t.storage.blocking : t.storage.terminated },
  )
})

/**
 * Au-delà, on cesse d'attendre. Une ouverture `blocked` — un onglet resté sur
 * une version antérieure de la base — ne résout jamais sa promesse : sans ce
 * délai, `BootScreen` tournait pour toujours, sans un mot et sans issue.
 */
export const HYDRATION_TIMEOUT_MS = 10_000

/**
 * Document de départ. Le thème et la palette reprennent leur miroir localStorage
 * pour que rien ne clignote entre le premier rendu et la fin de l'hydratation :
 * ce sont les deux réglages qui décident des couleurs avant que le document ne
 * soit lu.
 */
function initialData(): Data {
  const data = emptyData()
  return {
    ...data,
    settings: {
      ...data.settings,
      theme: readStoredPreference(),
      palette: readStoredPalette(),
    },
  }
}

export const useStore = create<Store>()((set, get) => ({
  status: 'loading',
  data: initialData(),
  ym: currentYm(),
  filter: ALL_FILTER,
  error: null,
  rev: 0,

  async hydrate() {
    // Idempotent : `StrictMode` fait partir l'effet deux fois en développement.
    channel ??= openTabChannel((message) => void get().onTabMessage(message))

    /* Une lecture, jamais une demande — voir `probeDurability`. Hors du chemin
       d'hydratation : ce que le navigateur promet ne conditionne rien de ce
       qu'on affiche, et faire attendre le document derrière une API de
       stockage serait payer une seconde d'écran de démarrage pour un bandeau. */
    void probeDurability()

    /* Le délai gagne définitivement : une lecture qui aboutit après coup est
       jetée. Remplacer tout le document sous quelqu'un qui a commencé à
       répondre aux deux questions serait pire que lui demander de recharger —
       et le rechargement, lui, retombe sur une base désormais chaude. */
    let timer: ReturnType<typeof setTimeout> | null = null
    const expired = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => {
        resolve('timeout')
      }, HYDRATION_TIMEOUT_MS)
    })

    try {
      const stored = await Promise.race([loadDocument(), expired])
      if (stored === 'timeout') {
        set({ status: 'onboarding', error: { kind: 'read', message: t.storage.readTimeout } })
        return
      }
      if (stored === null) {
        set({ status: 'onboarding', data: initialData() })
        return
      }
      mirrorAppearance(stored.data.settings)
      bootSnapshot = stored.data
      set({ status: 'ready', data: stored.data, rev: stored.rev })
      // Cahier §4.3 : l'ouverture est déclenchée au premier lancement du mois.
      get().ensureMonthOpen()
    } catch {
      set({ status: 'onboarding', error: { kind: 'read', message: t.storage.readFailed } })
    } finally {
      if (timer !== null) clearTimeout(timer)
    }
  },

  mutate(recipe) {
    const next = recipe(get().data)
    set({ data: next })
    /* Le document change : les retours arrière encore proposés portent un
       instantané d'avant, et le remettre par-dessus ce qui vient d'être fait
       l'emporterait. L'offre s'efface donc à chaque mutation — celle de l'undo
       compris, ce qui empêche de le rejouer —, et c'est aussi ce qui fait
       qu'un seul geste est défaisable à la fois : le dernier. */
    useToasts.getState().clearActions()
    /* Rien ne s'écrit tant que le foyer n'existe pas. Sans cette garde,
       répondre à la première question puis fermer l'onglet suffisait à laisser
       un document enregistré : au lancement suivant `loadDocument` le trouvait,
       l'app s'ouvrait « prête » sur un foyer sans membre et un mois vide, et
       les deux questions ne revenaient jamais. C'est `finishOnboarding` qui
       programme la première écriture — il le faisait déjà explicitement, et cet
       appel-là n'a de sens que si rien n'a été écrit avant lui.
       Le thème fait exception sans le savoir : `setTheme` mire déjà sa
       préférence en `localStorage`, d'où `initialData` la relit. */
    if (get().status !== 'onboarding') writer.schedule(next)
  },

  setYm(ym) {
    set({ ym })
    // Consulter un mois à venir suffit à le peupler. Sans quoi il s'affiche
    // vide — pas d'échéance au calendrier, rien dans le prévisionnel — alors
    // que les récurrences qui doivent y tomber sont déjà connus.
    get().ensureMonthOpen(ym)
  },

  setFilter(filter) {
    set({ filter })
  },

  setTheme(theme) {
    storePreference(theme)
    get().mutate((data) => ({ ...data, settings: { ...data.settings, theme } }))
  },

  /* Miroir aussi, et pour la même raison que le thème : une palette change le
     fond de page, donc elle doit être juste avant le premier pixel. */
  setPalette(palette) {
    storePalette(palette)
    get().mutate((data) => ({ ...data, settings: { ...data.settings, palette } }))
  },

  /* Miroir aussi, et c'est celui des trois qui compte le plus : le thème se
     rattrape en une frame, quand un catalogue mal choisi doit être *téléchargé*
     avant de pouvoir l'être. Sans lui, une app réglée en anglais s'ouvrirait en
     français à chaque lancement à froid, le temps d'un aller-retour. */
  setLocale(locale) {
    storeLocale(locale)
    get().mutate((data) => ({ ...data, settings: { ...data.settings, locale } }))
  },

  /* Pas de miroir en `localStorage`, contrairement à l'apparence : celle-ci
     évite un éclair de blanc avant le premier rendu, alors qu'un symbole
     monétaire n'apparaît qu'une fois le document lu. */
  setCurrency(currency) {
    get().mutate((data) => ({ ...data, settings: { ...data.settings, currency } }))
  },

  finishOnboarding() {
    /* Sans `persist()`, le navigateur a le droit d'évincer IndexedDB sous
       pression disque, sur une app dont c'est le seul endroit où vivent les
       données. Rien n'est annoncé du résultat ici — voir `askDurability` —,
       mais il est désormais retenu : c'est ce qui permet aux réglages et à
       l'avis de conservation de dire ce qu'il en est plutôt que de redemander. */
    void askDurability()

    /* Un document illisible n'est pas un document absent. `hydrate` bascule sur
       l'onboarding dans les deux cas — l'app n'a rien d'utilisable à montrer —
       mais la première écriture qui suit écraserait ici des données qui, elles,
       sont peut-être intactes : une `ImportError` levée par un `schemaVersion`
       plus récent se répare en mettant l'app à jour, pas en effaçant. Tant que
       l'échec de lecture n'a pas été traité, on n'écrit rien. */
    if (get().error?.kind === 'read') return
    set({ status: 'ready' })
    get().ensureMonthOpen()
    writer.schedule(get().data)
  },

  ensureMonthOpen(ym = currentYm()) {
    // Un mois passé ne s'ouvre pas tout seul : y faire apparaître des
    // échéances qui n'ont jamais été confirmées inventerait un historique.
    if (ym < currentYm()) return
    /* Et un mois trop lointain non plus. Ouvrir écrit toutes les échéances de
       toutes les récurrences, définitivement : sans cette borne, la navigation
       se repoussait elle-même — chaque « mois suivant » ouvrait le mois, ce qui
       reculait la borne d'un cran, ce qui laissait aller plus loin. Cent clics
       valaient cent mois de prévisionnel écrits pour de bon.

       `navigationBounds` s'arrête au même horizon : un mois au-delà ne se
       propose pas. La garde est ici quand même — le mois vient aussi d'une URL
       ou d'un document importé, et c'est l'écriture qu'on borne, pas seulement
       le chevron qui y mène. Le mois s'affiche alors avec ce qu'il a. */
    if (ym > monthHorizon()) return
    if (get().status !== 'ready') return
    if (get().data.months.some((m) => m.ym === ym)) return
    get().mutate((data) => openMonth(data, ym, makeId, today()).data)
  },

  async replaceData(data) {
    writer.cancel()
    /* Les trois remplacements de document et la lecture d'un onglet voisin
       n'appellent pas `mutate` : ils posent le document entier. Le retour
       arrière encore proposé porte pourtant un instantané de celui qu'on
       remplace, et le rétablirait par-dessus — c'est-à-dire annulerait
       l'import qu'on vient de confirmer deux fois. */
    useToasts.getState().clearActions()
    // Un import ou le jeu d'exemple créent un foyer tout autant : quelqu'un qui
    // restaure un export sur un appareil neuf ne passe jamais par l'onboarding.
    void askDurability()
    mirrorAppearance(data.settings)
    set({ data, status: 'ready', error: null, ym: currentYm(), filter: ALL_FILTER })
    // Le fichier importé peut dater : le mois courant n'y est pas forcément.
    get().ensureMonthOpen()
    // Hors du writer, donc hors de ses hooks : cette écriture-là a besoin de son
    // propre filet. Un import qui ne s'enregistre pas et qui ne le dit pas est
    // la pire des pertes — on vient d'effacer ce qu'il remplace.
    try {
      await persist(get().data)
    } catch {
      set({ error: { kind: 'write', message: t.storage.writeFailed } })
    }
  },

  async resetAll() {
    writer.cancel()
    useToasts.getState().clearActions()
    await clearDocument()
    // La triple confirmation annonce qu'il ne reste rien : laisser cinq
    // instantanés derrière en ferait un mensonge. La date du dernier export
    // aussi — elle vit hors du document, donc elle survivait à l'effacement, et
    // l'app repartait de zéro en annonçant la sauvegarde d'un document disparu.
    await clearBackups()
    forgetExportMarks()
    bootSnapshot = null
    const fresh = emptyData()
    mirrorAppearance(fresh.settings)
    set({
      data: fresh,
      status: 'onboarding',
      error: null,
      rev: 0,
      ym: currentYm(),
      filter: ALL_FILTER,
    })
    channel?.post({ type: 'cleared' })
  },

  async discardUnreadable() {
    /* Le seul geste qui lève la garde de `finishOnboarding`, et il efface pour
       de bon. Il est à part de `resetAll` : celui-là énumère en trois questions
       ce qui va partir, alors qu'ici on ne sait justement pas ce qu'il y avait
       — c'est tout le problème. Deux questions, comme un import. */
    writer.cancel()
    useToasts.getState().clearActions()
    await clearDocument()
    set({ data: initialData(), status: 'onboarding', error: null, rev: 0 })
    channel?.post({ type: 'cleared' })
  },

  setError(error) {
    set({ error })
  },

  async flush() {
    await writer.flush()
  },

  async onTabMessage(message) {
    if (message.type === 'cleared') {
      writer.cancel()
      useToasts.getState().clearActions()
      set({
        data: initialData(),
        status: 'onboarding',
        error: null,
        rev: 0,
        ym: currentYm(),
        filter: ALL_FILTER,
      })
      toast(t.storage.otherTabCleared)
      return
    }

    // Une révision qu'on connaît déjà : c'est notre propre écho, ou un message
    // en retard. Cet onglet est à jour, ou en avance — son écriture va tomber.
    if (message.rev <= get().rev) return

    /* L'annulation d'abord, et c'est tout le point. L'écriture en attente porte
       notre document périmé : la laisser partir écraserait celui de l'autre
       onglet, ce qui est exactement le bug qu'on retire. On jette plutôt qu'on
       fusionne — il n'existe pas de fusion pour un document unique — et le prix
       est au pire les 400 ms de frappe en cours, contre le document entier
       d'en face. */
    writer.cancel()
    useToasts.getState().clearActions()
    const loaded = await loadDocument()
    if (loaded === null) return
    mirrorAppearance(loaded.data.settings)
    set({ data: loaded.data, rev: loaded.rev, status: 'ready', error: null })
    // Un toast, pas une modale : arrêter quelqu'un pour lui dire qu'il n'a rien
    // perdu serait pire que le lui dire en passant.
    toast(t.storage.otherTab)
  },
}))
