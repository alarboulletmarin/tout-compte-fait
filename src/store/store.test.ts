import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addMonthsToYm, currentYm } from '@/domain/date'
import { makeData } from '@/domain/fixtures'
import { HORIZON_MONTHS } from '@/domain/month'
import { t } from '@/i18n/strings'
import type { Data } from '@/domain/types'
import type * as dbModule from '@/persistence/db'
import type { LoadedDocument } from '@/persistence/db'
import type * as tabsModule from '@/persistence/tabs'
import type { TabMessage } from '@/persistence/tabs'
import { backupDaily, clearBackups, listBackups, readBackup } from '@/persistence/backups'
import { clearDocument, closeDb, loadDocument, loadRawDocument, saveDocument } from '@/persistence/db'
import {
  dismissReminder,
  markExported,
  readLastExport,
  readReminderDismissed,
} from '@/persistence/transfer'
import { HYDRATION_TIMEOUT_MS } from './store'
import type { useStore as UseStore } from './store'

/**
 * Le store tient son writer et son canal au niveau du module : chaque test en
 * reprend des neufs, sinon la file d'écriture d'un cas déborde sur le suivant
 * et les canaux des tests précédents écoutent encore. C'est aussi ce qui permet
 * de lui glisser une écriture qui échoue — le seul moyen de provoquer un quota
 * plein sans quota.
 *
 * Le canal est toujours remplacé : le transport se teste seul dans
 * `tabs.test.ts`, et ce qui compte ici est la politique, qu'on appelle
 * directement par `onTabMessage`.
 */
let previousStore: typeof UseStore | null = null

async function freshStore(options: {
  write?: (data: Data, rev: number) => Promise<void>
  read?: () => Promise<LoadedDocument | null>
} = {}): Promise<{ store: typeof UseStore; posted: TabMessage[] }> {
  /* Le writer du store précédent finit **avant** qu'on jette son module.
     `vi.resetModules()` ne l'attend pas : il l'abandonne, et l'instance jetée
     continue d'écrire dans la même base `fake-indexeddb`. Son instantané
     atterrissait alors au milieu du test suivant, après le ménage de celui-ci,
     et `backupDaily` refusant de réécrire la clé du jour, ce que le test
     observait dépendait du tempo. Un test sur deux tombait, et pas toujours le
     même — la pire façon d'échouer.
     `flush()` attend toute la chaîne d'écriture, archivage compris : c'est
     exactement ce qu'il faut ici, et c'est le seul endroit d'où l'on connaisse
     encore le store sortant. */
  if (previousStore !== null) {
    await previousStore.getState().flush()
    previousStore = null
  }
  vi.resetModules()
  const { write, read } = options

  if (write === undefined && read === undefined) {
    vi.doUnmock('@/persistence/db')
  } else {
    vi.doMock('@/persistence/db', async () => ({
      ...(await vi.importActual<typeof dbModule>('@/persistence/db')),
      ...(write === undefined ? {} : { saveDocument: write }),
      ...(read === undefined ? {} : { loadDocument: read }),
    }))
  }

  const posted: TabMessage[] = []
  vi.doMock('@/persistence/tabs', async () => ({
    ...(await vi.importActual<typeof tabsModule>('@/persistence/tabs')),
    openTabChannel: () => ({
      post: (message: TabMessage) => posted.push(message),
      close: () => {},
    }),
  }))

  const store = (await import('./store')).useStore
  previousStore = store
  return { store, posted }
}

/** jsdom ne pilote pas la visibilité : on la pose à la main. */
function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
}

describe('store — échecs de persistance', () => {
  beforeEach(async () => {
    await clearDocument()
    // Le filet de sortie est partagé par `localStorage` : un test qui le pose
    // ne doit pas le laisser au suivant, dont l'hydratation le lirait.
    localStorage.removeItem('tout-compte-fait.rescue')
  })

  afterEach(() => {
    vi.doUnmock('@/persistence/db')
    vi.doUnmock('@/persistence/tabs')
    closeDb()
  })

  it('signale une écriture qui échoue', async () => {
    const { store } = await freshStore({ write: () => Promise.reject(new Error('quota dépassé')) })

    store.getState().finishOnboarding()
    await store.getState().flush()

    expect(store.getState().error).toStrictEqual({
      kind: 'write',
      message: t.storage.writeFailed,
    })
  })

  /* Le bandeau décrit un état, le message rouge se rattache au geste : allumé
     depuis la frappe d'avant, le bandeau ne bouge pas et ne dit donc pas que
     *celle-ci* vient de se perdre. Le design demande les deux, et il n'y en
     avait qu'un. */
  it('annonce en rouge chaque écriture qui échoue', async () => {
    const { store } = await freshStore({ write: () => Promise.reject(new Error('quota dépassé')) })
    /* Le module des messages est repris après `vi.resetModules()` : celui
       qu'importe le store neuf est neuf lui aussi, et l'instance chargée en tête
       de fichier n'écouterait rien. */
    const { useToasts } = await import('@/ui/toast')

    store.getState().finishOnboarding()
    await store.getState().flush()

    expect(useToasts.getState().toasts).toMatchObject([
      { message: t.storage.writeFailedToast, tone: 'danger', count: 1 },
    ])
  })

  /* Une base morte fait rater *toutes* les écritures : sans dédoublonnage, dix
     frappes empileraient dix messages sur l'écran qu'on est en train de remplir.
     `useToasts` les compte, et le compte est ce qui rend l'insistance lisible. */
  it('compte les échecs répétés au lieu de les empiler', async () => {
    const { store } = await freshStore({ write: () => Promise.reject(new Error('quota dépassé')) })
    const { useToasts } = await import('@/ui/toast')

    store.getState().finishOnboarding()
    await store.getState().flush()
    store.getState().mutate((data) => ({ ...data, household: { ...data.household, name: 'A' } }))
    await store.getState().flush()
    store.getState().mutate((data) => ({ ...data, household: { ...data.household, name: 'B' } }))
    await store.getState().flush()

    expect(useToasts.getState().toasts).toMatchObject([
      { message: t.storage.writeFailedToast, tone: 'danger', count: 3 },
    ])
  })

  it('efface le bandeau dès que l’écriture repasse', async () => {
    const write = vi
      .fn<(data: Data, rev: number) => Promise<void>>()
      .mockRejectedValueOnce(new Error('quota dépassé'))
      .mockResolvedValue(undefined)
    const { store } = await freshStore({ write })

    store.getState().finishOnboarding()
    await store.getState().flush()
    expect(store.getState().error?.kind).toBe('write')

    store.getState().mutate((data) => ({ ...data, household: { ...data.household, name: 'ok' } }))
    await store.getState().flush()
    expect(store.getState().error).toBeNull()
  })

  it('n’efface pas un échec de lecture par une écriture réussie', async () => {
    // Rien de ce qu'on écrit ne rend lisible ce qui ne l'était pas.
    const { store } = await freshStore()
    store.getState().setError({ kind: 'read', message: t.storage.readFailed })

    store.getState().finishOnboarding()
    await store.getState().flush()

    expect(store.getState().error).toStrictEqual({
      kind: 'read',
      message: t.storage.readFailed,
    })
  })

  it('signale un document illisible plutôt que d’ouvrir sur du vide', async () => {
    // Un document venu d'une version plus récente : `migrateDocument` refuse.
    await saveDocument({ schemaVersion: 99 } as never, 1)
    const { store } = await freshStore()

    await store.getState().hydrate()

    expect(store.getState().status).toBe('onboarding')
    expect(store.getState().error).toStrictEqual({
      kind: 'read',
      message: t.storage.readFailed,
    })
  })

  it('n’écrase pas un document illisible en créant un foyer', async () => {
    // Le scénario de perte le plus complet : la base contient quelque chose,
    // l'app ne sait pas l'ouvrir, et la première question la réécrivait.
    await saveDocument({ schemaVersion: 99 } as never, 1)
    const { store } = await freshStore()
    await store.getState().hydrate()

    store.getState().finishOnboarding()
    await store.getState().flush()

    expect(store.getState().status).toBe('onboarding')
    await expect(loadRawDocument()).resolves.toStrictEqual({ schemaVersion: 99 })
  })

  it('libère l’onboarding une fois l’illisible effacé, et pas avant', async () => {
    await saveDocument({ schemaVersion: 99 } as never, 1)
    const { store } = await freshStore()
    await store.getState().hydrate()

    await store.getState().discardUnreadable()

    expect(store.getState().error).toBeNull()
    await expect(loadRawDocument()).resolves.toBeUndefined()

    store.getState().finishOnboarding()
    await store.getState().flush()
    expect(store.getState().status).toBe('ready')
  })

  it('cesse d’attendre une base qui ne répond pas', async () => {
    // Une ouverture bloquée par un onglet resté sur la version précédente ne
    // résout jamais sa promesse : `BootScreen` tournait pour toujours.
    vi.useFakeTimers()
    try {
      let settle = (value: LoadedDocument | null): void => void value
      const never = new Promise<LoadedDocument | null>((resolve) => {
        settle = resolve
      })
      const { store } = await freshStore({ read: () => never })

      const hydrating = store.getState().hydrate()
      await vi.advanceTimersByTimeAsync(HYDRATION_TIMEOUT_MS)
      await hydrating

      expect(store.getState().status).toBe('onboarding')
      expect(store.getState().error).toStrictEqual({
        kind: 'read',
        message: t.storage.readTimeout,
      })

      // Le délai gagne définitivement : une lecture tardive ne bascule rien.
      settle({ data: makeData({ household: { name: 'Trop tard', members: [] } }), rev: 1 })
      await vi.advanceTimersByTimeAsync(0)
      expect(store.getState().data.household.name).not.toBe('Trop tard')
    } finally {
      vi.useRealTimers()
    }
  })

  it('recharge au lieu d’écraser quand un autre onglet est plus récent', async () => {
    // Deux onglets : celui-ci a une saisie en attente, l'autre vient d'écrire.
    const { store } = await freshStore()
    await store.getState().hydrate()
    store.getState().finishOnboarding()
    await store.getState().flush()

    const write = vi.spyOn(await import('@/persistence/db'), 'saveDocument')
    await saveDocument(makeData({ household: { name: 'Écrit ailleurs', members: [] } }), 9)
    store.getState().mutate((data) => ({
      ...data,
      household: { ...data.household, name: 'Saisie perdue' },
    }))

    await store.getState().onTabMessage({ type: 'saved', rev: 9 })

    expect(store.getState().data.household.name).toBe('Écrit ailleurs')
    expect(store.getState().rev).toBe(9)
    // L'écriture en attente a été annulée : c'est elle qui aurait écrasé.
    await store.getState().flush()
    expect(write).not.toHaveBeenCalled()
    await expect(loadDocument()).resolves.toMatchObject({
      data: { household: { name: 'Écrit ailleurs' } },
      rev: 9,
    })
  })

  it('annonce chaque écriture aux autres onglets, une seule fois', async () => {
    const { store, posted } = await freshStore()
    await store.getState().hydrate()

    store.getState().finishOnboarding()
    await store.getState().flush()
    store.getState().mutate((data) => ({ ...data, household: { ...data.household, name: 'ok' } }))
    await store.getState().flush()

    // Les révisions se suivent, et c'est ce qui permet à un onglet en retard de
    // savoir qu'il l'est.
    expect(posted).toStrictEqual([
      { type: 'saved', rev: 1 },
      { type: 'saved', rev: 2 },
    ])
  })

  it('ignore une révision qu’il connaît déjà', async () => {
    // Son propre écho, ou un message en retard : cet onglet est à jour.
    const { store } = await freshStore()
    await store.getState().hydrate()
    store.getState().finishOnboarding()
    await store.getState().flush()
    const rev = store.getState().rev

    store.getState().mutate((data) => ({ ...data, household: { ...data.household, name: 'À moi' } }))
    await store.getState().onTabMessage({ type: 'saved', rev })

    expect(store.getState().data.household.name).toBe('À moi')
  })

  it('suit un effacement fait ailleurs', async () => {
    const { store } = await freshStore()
    await store.getState().hydrate()
    store.getState().finishOnboarding()
    await store.getState().flush()

    await store.getState().onTabMessage({ type: 'cleared' })

    expect(store.getState().status).toBe('onboarding')
    expect(store.getState().rev).toBe(0)
  })

  it('archive l’état du démarrage, pas celui qu’il vient d’écrire', async () => {
    // Un point de retour sert à revenir avant ce qui a cassé, et ce qui casse
    // est la session en cours.
    await clearBackups()
    await saveDocument(makeData({ household: { name: 'Au démarrage', members: [] } }), 1)
    const { store } = await freshStore()
    await store.getState().hydrate()

    store.getState().mutate((data) => ({
      ...data,
      household: { ...data.household, name: 'Après coup' },
    }))
    await store.getState().flush()

    const [entry] = await listBackups()
    expect(entry).toBeDefined()
    await expect(readBackup(entry?.on ?? '2000-01-01')).resolves.toMatchObject({
      household: { name: 'Au démarrage' },
    })
  })

  it('n’archive rien après un onboarding : il n’y avait rien avant', async () => {
    await clearBackups()
    const { store } = await freshStore()
    await store.getState().hydrate()

    store.getState().finishOnboarding()
    await store.getState().flush()

    await expect(listBackups()).resolves.toStrictEqual([])
  })

  /* La perte la plus chère de toutes : recharger ou fermer l'onglet dans les
     400 ms qui suivent « Commencer » perdait le document *entier* — la première
     écriture attendait son debounce, et le vidage de `pagehide` n'a pas le
     temps de commettre une transaction pendant que la page se démonte. L'app
     rouvrait sur la présentation, foyer disparu. */
  it('écrit le foyer dès la fin de l’onboarding, sans attendre le debounce', async () => {
    const write = vi.fn<(data: Data, rev: number) => Promise<void>>().mockResolvedValue(undefined)
    const { store } = await freshStore({ write })
    await store.getState().hydrate()

    store.getState().finishOnboarding()
    /* Un tour de micro-tâches, et surtout pas `flush()` : lui déclenche ce qui
       est en attente, donc il ferait passer le test même si l'écriture
       attendait encore son délai. */
    await Promise.resolve()

    expect(write).toHaveBeenCalledWith(expect.anything(), 1)
  })

  /* Le vidage de la sortie de page ouvre une transaction IndexedDB qui meurt
     avec la page : fermer l'onglet dans les 400 ms qui suivent une saisie la
     perdait. Le filet, lui, est synchrone — voir `rescue.ts`. */
  it('pose le filet à la sortie quand une écriture n’a pas atteint le disque', async () => {
    const { store } = await freshStore()
    await store.getState().hydrate()
    store.getState().finishOnboarding()
    await store.getState().flush()

    store.getState().mutate((data) => ({ ...data, household: { ...data.household, name: 'Pressé' } }))
    store.getState().pageHidden()

    // Posé tout de suite, avant que la file soit vidée : c'est le point.
    expect(localStorage.getItem('tout-compte-fait.rescue')).toContain('Pressé')
    // Ici la page survit, l'écriture aboutit : le filet se lève tout seul.
    await store.getState().flush()
    expect(localStorage.getItem('tout-compte-fait.rescue')).toBeNull()
  })

  it('ne pose rien à la sortie quand tout est déjà écrit', async () => {
    const { store } = await freshStore()
    await store.getState().hydrate()
    store.getState().finishOnboarding()
    await store.getState().flush()

    store.getState().pageHidden()

    expect(localStorage.getItem('tout-compte-fait.rescue')).toBeNull()
  })

  it('adopte au lancement un filet plus récent que la base', async () => {
    /* Le store d'abord : `freshStore` vide le writer du test précédent, et une
       écriture qui y traînait écraserait le document que ce test vient poser. */
    const { store } = await freshStore()
    // La fermeture a tué l'écriture : la base est restée à la révision 3, le
    // filet porte ce que la révision 4 aurait écrit.
    await saveDocument(makeData({ household: { name: 'En retard', members: [] } }), 3)
    localStorage.setItem(
      'tout-compte-fait.rescue',
      JSON.stringify({ rev: 4, data: makeData({ household: { name: 'Rescapé', members: [] } }) }),
    )

    await store.getState().hydrate()

    expect(store.getState().status).toBe('ready')
    expect(store.getState().data.household.name).toBe('Rescapé')
    // La base a rattrapé, et le filet est levé.
    await expect(loadDocument()).resolves.toMatchObject({
      data: { household: { name: 'Rescapé' } },
    })
    expect(localStorage.getItem('tout-compte-fait.rescue')).toBeNull()
  })

  it('jette au lancement un filet plus vieux que la base', async () => {
    const { store } = await freshStore()
    // Un autre onglet a continué d'écrire après la sortie : la base fait foi.
    await saveDocument(makeData({ household: { name: 'À jour', members: [] } }), 9)
    localStorage.setItem(
      'tout-compte-fait.rescue',
      JSON.stringify({ rev: 2, data: makeData({ household: { name: 'Périmé', members: [] } }) }),
    )

    await store.getState().hydrate()

    expect(store.getState().data.household.name).toBe('À jour')
    expect(localStorage.getItem('tout-compte-fait.rescue')).toBeNull()
  })

  it('ignore un filet illisible sans empêcher l’ouverture', async () => {
    const { store } = await freshStore()
    await saveDocument(makeData({ household: { name: 'Chez nous', members: [] } }), 2)
    localStorage.setItem('tout-compte-fait.rescue', '{pas du JSON')

    await store.getState().hydrate()

    expect(store.getState().status).toBe('ready')
    expect(store.getState().data.household.name).toBe('Chez nous')
  })

  it('emporte l’anneau quand on efface tout', async () => {
    // La triple confirmation annonce qu'il ne reste rien.
    await backupDaily(makeData({ household: { name: 'hier', members: [] } }), '2026-08-01')
    const { store } = await freshStore()

    await store.getState().resetAll()

    await expect(listBackups()).resolves.toStrictEqual([])
  })

  /* Les deux dates vivent hors du document, donc elles survivaient à
     l'effacement : l'app repartait de zéro en annonçant « dernier export le
     … » d'un document qui n'existe plus. */
  it('oublie la date du dernier export et le refus du rappel', async () => {
    markExported('2026-08-01')
    dismissReminder('2026-08-01')
    const { store } = await freshStore()

    await store.getState().resetAll()

    expect(readLastExport()).toBeNull()
    expect(readReminderDismissed()).toBeNull()
  })

  it('relit sans erreur un document valide', async () => {
    await saveDocument(makeData({ household: { name: 'Chez nous', members: [] } }), 4)
    const { store } = await freshStore()

    await store.getState().hydrate()

    expect(store.getState().status).toBe('ready')
    expect(store.getState().error).toBeNull()
    expect(store.getState().data.household.name).toBe('Chez nous')
  })
})

/* ============================================================================
 * L'horizon d'ouverture — jusqu'où la navigation écrit dans le document.
 * ==========================================================================*/

describe('store — l’horizon des mois', () => {
  const opened = (store: typeof UseStore): string[] =>
    store.getState().data.months.map((m) => m.ym)

  it('ouvre le mois qu’on va consulter', async () => {
    const { store } = await freshStore()
    store.setState({ status: 'ready', data: makeData() })

    store.getState().setYm(addMonthsToYm(currentYm(), 1))

    expect(opened(store)).toContain(addMonthsToYm(currentYm(), 1))
  })

  /* Le geste sans fin : chaque « mois suivant » ouvrait le mois, y écrivait
     toutes les échéances, et reculait la borne d'un cran. Cent clics valaient
     cent mois de prévisionnel définitivement écrits. */
  it('n’écrit plus rien au-delà de douze mois', async () => {
    const { store } = await freshStore()
    store.setState({ status: 'ready', data: makeData() })

    const tooFar = addMonthsToYm(currentYm(), HORIZON_MONTHS + 1)
    store.getState().setYm(tooFar)

    expect(opened(store)).not.toContain(tooFar)
    // Le mois s'affiche quand même : c'est l'écriture qu'on borne.
    expect(store.getState().ym).toBe(tooFar)
  })

  it('ouvre encore le dernier mois de l’horizon', async () => {
    const { store } = await freshStore()
    store.setState({ status: 'ready', data: makeData() })

    const last = addMonthsToYm(currentYm(), HORIZON_MONTHS)
    store.getState().setYm(last)

    expect(opened(store)).toContain(last)
  })

  it('n’ouvre pas un mois passé, qui inventerait un historique', async () => {
    const { store } = await freshStore()
    store.setState({ status: 'ready', data: makeData() })

    const before = addMonthsToYm(currentYm(), -1)
    store.getState().setYm(before)

    expect(opened(store)).not.toContain(before)
  })
})

/* ============================================================================
 * Ce que la santé du stockage retient de la chaîne complète : mutation, file,
 * transaction, succès ou échec. Une saisie n'est pas en sécurité parce que
 * l'écran a changé — elle l'est quand la transaction a commis, et c'est la
 * seule chose que ces marques disent.
 * ==========================================================================*/
describe('store — la santé du stockage', () => {
  beforeEach(async () => {
    await clearDocument()
  })

  afterEach(() => {
    vi.doUnmock('@/persistence/db')
    vi.doUnmock('@/persistence/tabs')
    closeDb()
    setVisibility('visible')
  })

  it('date l’écriture qui aboutit, puis celle qui rate, puis le retour', async () => {
    const write = vi
      .fn<(data: Data, rev: number) => Promise<void>>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('quota dépassé'))
      .mockResolvedValue(undefined)
    const { store } = await freshStore({ write })
    const { useStorageHealth } = await import('@/persistence/health')

    store.getState().finishOnboarding()
    await store.getState().flush()
    expect(useStorageHealth.getState().lastWriteAt).not.toBeNull()
    expect(useStorageHealth.getState().lastFailureAt).toBeNull()

    store.getState().mutate((data) => ({ ...data, household: { ...data.household, name: 'A' } }))
    await store.getState().flush()
    const failedAt = useStorageHealth.getState().lastFailureAt
    expect(failedAt).not.toBeNull()

    store.getState().mutate((data) => ({ ...data, household: { ...data.household, name: 'B' } }))
    await store.getState().flush()
    /* L'incident garde sa date — c'est `error` qui décide de ce qui s'affiche,
       pas la santé, qui n'est qu'un relevé —, et la dernière écriture réussie
       ne lui est plus antérieure : c'est ça, un retour à la normale. */
    expect(useStorageHealth.getState().lastFailureAt).toBe(failedAt)
    expect(useStorageHealth.getState().lastWriteAt ?? 0).toBeGreaterThanOrEqual(failedAt ?? 0)
  })

  /* L'anneau vit derrière l'écriture du document : le jour où celle-ci apprend
     à échouer proprement, il faut vérifier qu'il n'est pas parti avec. Rien
     n'est archivé sur une écriture ratée — il n'y a rien à archiver, la
     transaction n'a pas commis — et la première qui repasse le fait. */
  it('archive encore après un échec suivi d’une écriture qui passe', async () => {
    await clearBackups()
    await saveDocument(makeData({ household: { name: 'Au démarrage', members: [] } }), 1)
    const write = vi
      .fn((data: Data, rev: number) => saveDocument(data, rev))
      .mockRejectedValueOnce(new Error('quota dépassé'))
    const { store } = await freshStore({ write })
    await store.getState().hydrate()

    store.getState().mutate((data) => ({ ...data, household: { ...data.household, name: 'A' } }))
    await store.getState().flush()
    expect(store.getState().error?.kind).toBe('write')
    await expect(listBackups()).resolves.toStrictEqual([])

    store.getState().mutate((data) => ({ ...data, household: { ...data.household, name: 'B' } }))
    await store.getState().flush()
    expect(store.getState().error).toBeNull()

    const [entry] = await listBackups()
    await expect(readBackup(entry?.on ?? '2000-01-01')).resolves.toMatchObject({
      household: { name: 'Au démarrage' },
    })
  })

  /* Les deux événements de sortie partent souvent ensemble — un onglet fermé
     émet `pagehide` puis passe `hidden`. Deux flush ne doivent pas produire
     deux transactions sur la même clé : elles commettraient dans l'ordre du
     moteur, pas dans le nôtre. */
  it('vide la file quand la page part, une fois et une seule', async () => {
    // L'écriture est comptée mais pas simulée : ce test-ci veut aussi vérifier
    // que la saisie des 400 dernières millisecondes est bien sur le disque.
    const write = vi.fn((data: Data, rev: number) => saveDocument(data, rev))
    const { store } = await freshStore({ write })
    const { onPageHidden } = await import('@/persistence/lifecycle')

    store.getState().finishOnboarding()
    await store.getState().flush()
    write.mockClear()

    const stop = onPageHidden(() => {
      void store.getState().flush()
    })
    store.getState().mutate((data) => ({ ...data, household: { ...data.household, name: 'Parti' } }))

    window.dispatchEvent(new Event('pagehide'))
    setVisibility('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    await store.getState().flush()
    stop()

    expect(write).toHaveBeenCalledTimes(1)
    expect(write.mock.calls[0]?.[0].household.name).toBe('Parti')
    // La saisie des 400 dernières millisecondes est bien sur le disque.
    expect((await loadDocument())?.data.household.name).toBe('Parti')
  })

  it('n’écrit rien de plus quand la page part sans rien en attente', async () => {
    const write = vi.fn<(data: Data, rev: number) => Promise<void>>().mockResolvedValue(undefined)
    const { store } = await freshStore({ write })
    const { onPageHidden } = await import('@/persistence/lifecycle')

    store.getState().finishOnboarding()
    await store.getState().flush()
    write.mockClear()

    const stop = onPageHidden(() => {
      void store.getState().flush()
    })
    setVisibility('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    await store.getState().flush()
    stop()

    expect(write).not.toHaveBeenCalled()
  })
})

/* ============================================================================
 * La revue en session.
 *
 * Elle ne touche ni au document ni au disque : ce sont cinq gestes sur un
 * champ de l'état, et deux garde-fous qui décident quand la file se périme.
 * D'où un store neuf mais pas d'hydratation — il n'y a rien à hydrater.
 * ==========================================================================*/
describe('store — la file de la revue', () => {
  it('pose la file et remet la lecture sur le foyer', async () => {
    const { store } = await freshStore()
    store.setState({ filter: { kind: 'member', memberId: 'm1' } })
    store.getState().startReview('2026-08', ['e-1', 'e-2'])

    expect(store.getState().review).toEqual({ ym: '2026-08', ids: ['e-1', 'e-2'], index: 0 })
    /* On confirme une échéance entière, jamais la part de quelqu'un : une file
       bâtie sur le foyer sous un bilan filtré répondrait à deux questions. */
    expect(store.getState().filter).toEqual({ kind: 'all' })
  })

  it('avance jusqu’au bout, puis s’arrête sur la fin', async () => {
    const { store } = await freshStore()
    store.getState().startReview('2026-08', ['e-1', 'e-2'])
    store.getState().advanceReview()
    store.getState().advanceReview()
    /* `ids.length` et non `null` : c'est ce qui fait basculer l'écran sur le
       bilan, qui a besoin de savoir combien de lignes il vient de fermer. */
    expect(store.getState().review?.index).toBe(2)
    store.getState().advanceReview()
    expect(store.getState().review?.index).toBe(2)
  })

  it('borne le saut direct à la file', async () => {
    const { store } = await freshStore()
    store.getState().startReview('2026-08', ['e-1', 'e-2'])
    store.getState().gotoReviewStep(-3)
    expect(store.getState().review?.index).toBe(0)
    store.getState().gotoReviewStep(9)
    expect(store.getState().review?.index).toBe(2)
  })

  /* La file porte les échéances d'un mois : la garder en changeant de mois
     ferait sauter la revue d'un mois à l'autre au premier « suivant ». */
  it('périme la file au changement de mois', async () => {
    const { store } = await freshStore()
    store.getState().startReview(currentYm(), ['e-1'])
    store.getState().setYm(addMonthsToYm(currentYm(), 1))
    expect(store.getState().review).toBeNull()
  })

  it('ne reprend rien quand il n’y a rien à reprendre', async () => {
    const { store } = await freshStore()
    store.getState().resumeReview()
    expect(store.getState().review).toBeNull()
  })

  /* Le document change entièrement sous la file : ses identifiants ne
     désignent plus rien. */
  it('jette la file avec le document qu’elle désignait', async () => {
    const { store } = await freshStore()
    store.getState().startReview(currentYm(), ['e-1'])
    await store.getState().replaceData(makeData())
    expect(store.getState().review).toBeNull()
  })
})
