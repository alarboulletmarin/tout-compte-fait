/* ============================================================================
 * L'hypothèse de rendement d'un support — ce que le formulaire en fait, et ce
 * qu'il refuse d'en faire.
 *
 * Deux règles tiennent tout le fichier.
 *
 * **Vide n'est pas zéro.** Un support sans hypothèse s'en remet à celle de
 * l'écran des projections ; un support à 0 % dit que son capital ne bouge pas.
 * Les confondre ferait projeter à plat un compte dont personne n'a rien dit.
 *
 * **Le formulaire pose le premier palier, et ne relit jamais les suivants.** Un
 * taux est daté (`SavingRate`) et s'empile, alors que ce formulaire écrase ce
 * qu'il touche : relire le taux courant dans son champ ferait d'une correction
 * de libellé une réécriture du passé du compte. La modification d'un taux vit
 * donc sur la fiche, où chaque palier porte sa date.
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
    expect(payload?.rate).toBeUndefined()
  })

  it('écrit le taux et sa nature quand il est posé', () => {
    const { payload } = built({ rateText: '2,5', rateKind: 'guaranteed' })
    expect(payload?.rate?.rateBp).toBe(250)
    expect(payload?.rate?.kind).toBe('guaranteed')
  })

  it('distingue zéro pour cent d’une absence d’hypothèse', () => {
    // Un compte courant rend zéro : c'est une réponse, pas un silence.
    const { payload } = built({ rateText: '0' })
    expect(payload?.rate?.rateBp).toBe(0)
  })

  it('refuse un taux illisible au lieu de l’avaler', () => {
    // Un taux tapé puis ignoré se découvre des mois plus tard, devant une
    // projection qui ne l'a jamais pris.
    const { payload, errors } = built({ rateText: '450' })
    expect(payload).toBe(null)
    expect(errors.rate).toBeDefined()
  })

  /* Le palier part du jour du relevé quand il y en a un : un support ouvert
     avec « 12 400 € au 31 décembre » sert son taux depuis ce 31 décembre, et le
     dater d'aujourd'hui laisserait les mois d'intervalle sans taux. */
  it('date le premier palier du relevé d’ouverture, quand il est saisi', () => {
    const { payload } = built({ rateText: '2,5', amountText: '1240', valueDate: '2025-12-31' })
    expect(payload?.rate?.from).toBe('2025-12-31')
  })

  /* La modification ne relit ni la valeur ni le taux, et pour la même raison :
     les deux s'empilent, datés, alors que ce formulaire écrase. */
  it('ne relit aucun taux sur un support qui existe déjà', () => {
    expect(supportDraftFrom(support({ id: 's-1' })).rateText).toBe('')
    expect(supportDraftFrom(support({ id: 's-1' })).rateKind).toBe('assumed')
  })
})
