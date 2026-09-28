import type { AccountRef } from '../domain/types'

/** Rond plein : membre 1. Carré plein : membre 2. Losange au trait : joint. */
export function Shape({ account }: { account: AccountRef }) {
  return <span className={`shape shape--${account}`} aria-hidden="true" />
}
