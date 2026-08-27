/* ============================================================================
 * Le regroupement des écritures.
 *
 * Il ne connaît pas IndexedDB : on lui donne une fonction d'écriture, il décide
 * quand l'appeler et rapporte ce qu'elle a fait. C'est ce qui permet de le
 * tester sans base, et au store de router les échecs sans que ce module ait à
 * connaître l'état de l'app.
 * ==========================================================================*/

import type { Data } from '@/domain/types'

export type Writer = {
  /** Programme une écriture. Les appels rapprochés sont fusionnés. */
  schedule: (data: Data) => void
  /**
   * Écrit immédiatement ce qui est en attente, et attend la file entière.
   * Ne rejette jamais — voir `WriterHooks`.
   */
  flush: () => Promise<void>
  cancel: () => void
  /**
   * Vrai tant que quelque chose n'a pas atteint le disque : une écriture
   * encore dans la fenêtre du debounce, ou partie mais pas encore commise.
   * C'est la question que pose la sortie de page — faut-il poser le filet ?
   * (voir `rescue.ts`) — et elle ne se déduit d'aucun des deux autres états :
   * `flush()` consomme l'attente avant que la transaction n'aboutisse.
   */
  dirty: () => boolean
}

/**
 * Ce que le writer a à dire. Sans eux, un `put` qui échoue — quota plein,
 * Safari en navigation privée, base évincée — ne produisait rien du tout : ni
 * exception à attraper, ni valeur de retour à lire. On saisissait une heure,
 * tout s'affichait, rien ne s'enregistrait, et personne ne le disait.
 */
export type WriterHooks = {
  onWritten?: () => void
  onFailed?: (cause: unknown) => void
}

export const WRITE_DELAY_MS = 400

/**
 * Regroupe les écritures. Une saisie au clavier produit une mutation par
 * frappe : sans ce regroupement, chaque frappe déclencherait une transaction.
 */
export function createWriter(
  write: (data: Data) => Promise<void>,
  delay: number = WRITE_DELAY_MS,
  hooks: WriterHooks = {},
): Writer {
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending: Data | null = null
  let chain: Promise<void> = Promise.resolve()
  /* Les maillons posés et pas encore aboutis. Compteur et non booléen : un
     `flush()` pendant qu'un maillon court en pose un second derrière. */
  let inFlight = 0

  const run = (): void => {
    const data = pending
    pending = null
    timer = null
    if (data === null) return
    /* La file se chaîne au lieu de s'écraser. `inFlight = write(data)` laissait
       deux transactions ouvertes en parallèle sur la même clé : elles commettent
       dans l'ordre que le moteur décide, pas dans celui où on les a émises, si
       bien que la dernière saisie pouvait se faire recouvrir par l'avant-
       dernière. Et `flush()` n'attendait que la dernière programmée, jamais
       celle d'avant qui courait encore.
       Le maillon n'échoue jamais : une chaîne rejetée empoisonnerait tous les
       `.then` suivants — une panne passagère deviendrait définitive — et ferait
       rejeter `flush()` dans un gestionnaire `pagehide`, où personne n'est là
       pour rattraper. L'échec sort par `onFailed`, et c'est aussi pourquoi ce
       module n'importe pas le store : c'est à l'appelant d'en faire quelque
       chose. */
    inFlight += 1
    chain = chain.then(async () => {
      try {
        await write(data)
        hooks.onWritten?.()
      } catch (cause) {
        hooks.onFailed?.(cause)
      } finally {
        inFlight -= 1
      }
    })
  }

  return {
    schedule(data) {
      pending = data
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(run, delay)
    },
    async flush() {
      if (timer !== null) {
        clearTimeout(timer)
        run()
      }
      await chain
    },
    cancel() {
      if (timer !== null) clearTimeout(timer)
      timer = null
      pending = null
    },
    dirty() {
      return pending !== null || inFlight > 0
    },
  }
}
