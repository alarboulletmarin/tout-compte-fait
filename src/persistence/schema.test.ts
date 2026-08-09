/* ============================================================================
 * Les migrations qui **convertissent** — et il n'y en a que deux.
 *
 * La plupart des marches du pipeline se contentent d'inscrire un numéro : le
 * champ qu'elles introduisent est facultatif, et c'est le domaine qui décide de
 * son absence à la lecture. Deux font autre chose : la v8 sépare le support de
 * la catégorie, la v12 sort le taux du support. Une conversion peut perdre des
 * données, en inventer, ou ne pas rendre le même document deux fois de suite —
 * trois défauts qu'aucun test de lecture ne verrait.
 * ==========================================================================*/

import { describe, expect, it } from 'vitest'
import { RATE_ORIGIN } from '@/domain/savingRate'
import { CURRENT_SCHEMA_VERSION, migrateDocument } from './schema'

/** Un document v11 minimal : une personne, un livret d'épargne, un taux posé. */
const v11 = () => ({
  schemaVersion: 11,
  household: { name: 'Maison', members: [{ id: 'm-1', name: 'Alix', color: 'var(--member-1)' }] },
  families: [{ id: 'fam-savings', label: 'Versements', kind: 'saving' }],
  categories: [
    {
      id: 'passbook',
      label: 'Livrets',
      familyId: 'fam-savings',
      icon: '',
      color: 'var(--cat-5)',
      direction: 'out',
      archived: false,
    },
  ],
  recurrences: [],
  entries: [],
  debts: [],
  advances: [],
  savingSupports: [
    {
      id: 's-livret',
      label: 'Livret A',
      memberId: 'm-1',
      categoryId: 'passbook',
      archived: false,
      rateBp: 250,
      rateKind: 'guaranteed',
    },
    { id: 's-pea', label: 'PEA', memberId: 'm-1', categoryId: 'passbook', archived: false },
  ],
  savingValuations: [],
  months: [],
  settings: { theme: 'system', palette: 'classique', currency: 'EUR', monthStartsOn: 1 },
})

describe('v11 → v12 : le taux quitte le support', () => {
  it('rend un palier par taux, et un seul', () => {
    const { data } = migrateDocument(v11())
    expect(data.savingRates).toEqual([
      {
        id: 'rate-s-livret',
        supportId: 's-livret',
        rateBp: 250,
        kind: 'guaranteed',
        from: RATE_ORIGIN,
      },
    ])
  })

  it('n’invente aucun taux pour un support qui n’en portait pas', () => {
    const { data } = migrateDocument(v11())
    expect(data.savingRates.filter((rate) => rate.supportId === 's-pea')).toEqual([])
  })

  it('date le palier de l’origine, jamais du jour de l’import', () => {
    /* Le scalaire n'avait pas de date parce qu'il valait « depuis toujours ».
       Le dater d'aujourd'hui inventerait un changement de taux que personne n'a
       décidé, et couperait en deux la courbe d'un support qui n'a jamais servi
       qu'un seul taux. */
    const { data } = migrateDocument(v11())
    expect(data.savingRates[0]?.from).toBe(RATE_ORIGIN)
  })

  it('retire le champ du support plutôt que de le laisser à côté', () => {
    const { data } = migrateDocument(v11())
    const support = data.savingSupports.find((one) => one.id === 's-livret')
    expect(support).toBeDefined()
    expect(Object.keys(support ?? {})).not.toContain('rateBp')
    expect(Object.keys(support ?? {})).not.toContain('rateKind')
  })

  it('rend le même document à chaque lecture', () => {
    /* Une migration non déterministe ferait diverger deux imports du même
       fichier, et rendrait ce test-ci le seul endroit où on s'en apercevrait. */
    expect(migrateDocument(v11()).data).toEqual(migrateDocument(v11()).data)
  })

  it('ne retouche pas un document déjà à la version courante', () => {
    const { data } = migrateDocument(v11())
    const again = migrateDocument({ ...data, schemaVersion: CURRENT_SCHEMA_VERSION })
    expect(again.data.savingRates).toEqual(data.savingRates)
    expect(again.migrated).toBe(false)
  })

  it('lit un taux fractionnaire comme une absence, plutôt que de l’arrondir', () => {
    const doc = v11()
    doc.savingSupports[0] = { ...doc.savingSupports[0], rateBp: 2.5 } as never
    expect(migrateDocument(doc).data.savingRates).toEqual([])
  })
})
