/* ============================================================================
 * L'hypothèse de rendement d'un support — ce que le formulaire en fait, et ce
 * qu'il refuse d'en faire.
 *
 * Une seule règle tient tout le fichier : **vide n'est pas zéro**. Un support
 * sans hypothèse s'en remet à celle de l'écran des projections ; un support à
 * 0 % dit que son capital ne bouge pas. Les confondre ferait, dans un sens,
 * projeter à plat un compte dont personne n'a rien dit, et dans l'autre,
 * effacer un zéro délibéré à la première modification de la fiche.
 * ==========================================================================*/

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeSavingSupport } from '@/domain/fixtures'
import type { SavingSupportInput } from '@/domain/updates'
import { emptySupportDraft, supportDraftFrom, useSupportDraft } from './supportDraft'

const support = (over: Parameters<typeof makeSavingSupport>[0]) =>
  makeSavingSupport({ memberId: 'm-1', categoryId: 'passbook', ...over })

function built(patch: Partial<ReturnType<typeof emptySupportDraft>>) {
  const { result } = renderHook(() =>
    useSupportDraft({
      ...emptySupportDraft({ memberId: 'm-1', categoryId: 'passbook' }),
      label: 'Livret A',
      ...patch,
    }),
  )
  let payload: SavingSupportInput | null = null
  act(() => {
    payload = result.current.build()
  })
  return { payload: payload as SavingSupportInput | null, errors: result.current.errors }
}

describe('l’hypothèse de rendement d’un support', () => {
  it('n’en pose aucune par défaut', () => {
    // Préremplir 3 % reviendrait à annoncer le rendement d'un produit que l'app
    // ne connaît pas (cahier §4.6 ter).
    expect(emptySupportDraft().rateText).toBe('')
  })

  it('n’écrit rien quand le champ est vide', () => {
    const { payload } = built({})
    expect(payload?.rateBp).toBeUndefined()
    expect(payload?.rateKind).toBeUndefined()
  })

  it('écrit le taux et sa nature quand il est posé', () => {
    const { payload } = built({ rateText: '2,5', rateKind: 'guaranteed' })
    expect(payload?.rateBp).toBe(250)
    expect(payload?.rateKind).toBe('guaranteed')
  })

  it('distingue zéro pour cent d’une absence d’hypothèse', () => {
    // Un compte courant rend zéro : c'est une réponse, pas un silence.
    const { payload } = built({ rateText: '0' })
    expect(payload?.rateBp).toBe(0)
  })

  it('refuse un taux illisible au lieu de l’avaler', () => {
    // Un taux tapé puis ignoré se découvre des mois plus tard, devant une
    // projection qui ne l'a jamais pris.
    const { payload, errors } = built({ rateText: '450' })
    expect(payload).toBe(null)
    expect(errors.rate).toBeDefined()
  })

  it('relit un zéro posé, et ne le confond pas avec un champ vide', () => {
    expect(supportDraftFrom(support({ id: 's-1', rateBp: 0 })).rateText).toBe('0')
    expect(supportDraftFrom(support({ id: 's-1' })).rateText).toBe('')
  })

  it('relit un taux dans la forme du champ, virgule comprise', () => {
    expect(supportDraftFrom(support({ id: 's-1', rateBp: 175 })).rateText).toBe('1,75')
  })

  it('relit une hypothèse là où la nature manque, jamais un taux garanti', () => {
    // « Garanti » est ce qui engage : il ne s'obtient pas par omission.
    expect(supportDraftFrom(support({ id: 's-1', rateBp: 300 })).rateKind).toBe('assumed')
  })
})
