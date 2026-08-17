import { afterEach, describe, expect, it, vi } from 'vitest'
import { en } from './en'
import { fr } from './fr'
import { applyLocale, currentLocale, setCatalog, subscribeLocale, t } from './strings'
import { monthName, monthNamesShort, weekdayName, weekdayNames, weekdayNarrow } from './format'

afterEach(() => {
  setCatalog('fr', fr)
})

/**
 * La forme d'un catalogue, ramenée à ses chemins de feuilles.
 *
 * Le type `Strings` tient déjà cette promesse à la compilation — c'est tout
 * l'intérêt de le dériver du français. Ce test la tient à l'exécution, et il
 * n'est pas redondant : un `as Strings` posé un jour de fatigue dans une
 * traduction ferait taire le compilateur sans rien réparer, et ce qui manque ne
 * se verrait qu'à l'écran, en anglais, sur un écran qu'on n'ouvre pas souvent.
 */
function paths(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') return [prefix]
  if (Array.isArray(value)) return value.flatMap((item, i) => paths(item, `${prefix}[${String(i)}]`))
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, child]) =>
      paths(child, prefix === '' ? key : `${prefix}.${key}`),
    )
  }
  return [`${prefix} = ${typeof value}`]
}

describe('les deux catalogues', () => {
  it('portent exactement les mêmes clés', () => {
    expect(paths(en).sort()).toEqual(paths(fr).sort())
  })

  /* Une chaîne vide passe le typage et ne se voit qu'à l'endroit précis où elle
     manque — un bouton sans mot, une aide sans phrase. La traduction se compare
     au français plutôt qu'à une règle absolue : `householdPlaceholder` est vide
     des deux côtés, et c'est délibéré (le champ n'a pas d'exemple à proposer). */
  it('n’ont de chaîne vide que là où le français en a une', () => {
    const blanks = (catalog: unknown): string[] => {
      const found: string[] = []
      const walk = (node: unknown, path: string): void => {
        if (typeof node === 'string') {
          if (node.trim() === '') found.push(path)
          return
        }
        if (typeof node !== 'object' || node === null) return
        for (const [key, child] of Object.entries(node)) {
          walk(child, path === '' ? key : `${path}.${key}`)
        }
      }
      walk(catalog, '')
      return found.sort()
    }
    expect(blanks(en)).toEqual(blanks(fr))
  })

  /* Les gabarits portent des « %s » que `tpl` remplit dans l'ordre. Une
     traduction qui en perd un affiche une phrase tronquée — « Add the income to
     split the costs » sans le prénom —, et qui en ajoute un rend un trou. */
  it('portent le même nombre de « %s » dans chaque gabarit', () => {
    const holes = (text: string): number => (text.match(/%s/g) ?? []).length
    const walk = (a: unknown, b: unknown, path: string): string[] => {
      if (typeof a === 'string' && typeof b === 'string') {
        /* L'anglais accorde une fois là où le français accorde deux : voir
           `credits.monthsLeft`, dont la troisième valeur est ignorée par `tpl`.
           On vérifie donc qu'aucune traduction n'en demande *plus* que le
           français, ce qui produirait un trou vide. */
        return holes(b) > holes(a) ? [path] : []
      }
      if (Array.isArray(a) && Array.isArray(b)) {
        return a.flatMap((item, i) => walk(item, b[i], `${path}[${String(i)}]`))
      }
      if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
        return Object.keys(a).flatMap((key) =>
          walk(
            (a as Record<string, unknown>)[key],
            (b as Record<string, unknown>)[key],
            path === '' ? key : `${path}.${key}`,
          ),
        )
      }
      return []
    }
    expect(walk(fr, en, '')).toEqual([])
  })

  /* Les douze mois et les sept jours ne vivent plus dans les catalogues : ils
     viennent d'`Intl` (`i18n/format.ts`), qui les possède exactement et les
     tiendra pour toute langue ajoutée. Ce qui se vérifie ici n'est donc plus
     une longueur de table mais le fait que le moteur réponde dans les deux
     langues — un `Intl` amputé de ses données rendrait des dates brutes, et le
     calendrier afficherait des nombres à la place des jours. */
  it('tirent leurs mois et leurs jours d’Intl, dans les deux langues', () => {
    for (const [locale, catalog, janvier, lundi] of [
      ['fr', fr, 'janvier', 'lundi'],
      ['en', en, 'January', 'Monday'],
    ] as const) {
      setCatalog(locale, catalog)
      expect(monthName(1)).toBe(janvier)
      expect(weekdayName(1)).toBe(lundi)
      expect(monthNamesShort()).toHaveLength(12)
      expect(weekdayNames()).toHaveLength(7)
      /* Sept initiales, même si elles se répètent : « M » vaut mardi et
         mercredi en français, et c'est la grille qui porte le nom complet. */
      expect(Array.from({ length: 7 }, (_, i) => weekdayNarrow(i + 1))).toHaveLength(7)
    }
    setCatalog('fr', fr)
  })
})

describe('le catalogue actif', () => {
  it('part en français', () => {
    expect(currentLocale()).toBe('fr')
    expect(t.common.add).toBe(fr.common.add)
  })

  it('change de langue, et le dit à ses abonnés', async () => {
    let notified = 0
    const stop = subscribeLocale(() => {
      notified += 1
    })

    await applyLocale('en')

    expect(currentLocale()).toBe('en')
    expect(t.common.add).toBe('Add')
    expect(notified).toBe(1)
    stop()
  })

  /* La liaison est vivante : un module qui a écrit `import { t }` voit la
     nouvelle valeur sans rien faire. C'est ce qui permet aux cent vingt-quatre
     appelants de ne pas s'abonner — et c'est donc ce qu'il faut vérifier ici,
     parce que rien d'autre ne le vérifie. */
  it('remplace `t` pour ceux qui l’ont déjà importé', async () => {
    const before = t.nav.month
    await applyLocale('en')
    expect(t.nav.month).not.toBe(before)
    expect(t.nav.month).toBe(en.nav.month)
  })

  it('ne prévient personne quand la langue demandée est déjà là', async () => {
    let notified = 0
    const stop = subscribeLocale(() => {
      notified += 1
    })
    await applyLocale('fr')
    expect(notified).toBe(0)
    stop()
  })
})

/**
 * Le morceau qui n'arrive pas.
 *
 * Un catalogue est un `import()` : hors ligne, ou sur un déploiement dont les
 * anciens morceaux ont disparu, il échoue. L'app doit alors rester dans sa
 * langue par défaut — pas s'arrêter, pas s'afficher à moitié traduite, et pas
 * signaler l'incident par un rejet que personne n'attrape.
 */
describe('quand le catalogue n’arrive pas', () => {
  it('reste dans la langue en place, sans rejeter', async () => {
    vi.doMock('./en', () => {
      throw new Error('réseau')
    })
    vi.resetModules()
    const strings = await import('./strings')

    await expect(strings.applyLocale('en')).resolves.toBe('fr')
    expect(strings.currentLocale()).toBe('fr')
    expect(strings.t.common.add).toBe(fr.common.add)

    vi.doUnmock('./en')
    vi.resetModules()
  })
})

/**
 * Les quatre catalogues chargés à la demande, éprouvés comme le principal.
 *
 * Leur forme est déjà tenue par le type — chaque `.en.ts` déclare le type dérivé
 * de son français —, mais **pas leurs gabarits** : un « %s » perdu à la
 * traduction compile parfaitement et rend une phrase amputée à l'écran. C'est le
 * seul défaut de traduction que le compilateur ne peut pas voir, et il vaut pour
 * les cinq catalogues.
 */
describe('les catalogues chargés à la demande', () => {
  /* Le français de ces quatre-là n'est pas exporté : il est lu par la liaison
     vivante, en français, avant toute bascule. */
  const cases = async (): Promise<{ name: string; fr: unknown; en: unknown }[]> => [
    { name: 'history', fr: (await import('./history')).history, en: (await import('./history.en')).en },
    { name: 'landing', fr: (await import('./landing')).landing, en: (await import('./landing.en')).en },
    {
      name: 'projection',
      fr: (await import('./projection')).projection,
      en: (await import('./projection.en')).en,
    },
    {
      name: 'legal',
      fr: (await import('./legal')).privacyPolicy,
      en: (await import('./legal.en')).privacyPolicy,
    },
  ]

  it('portent les mêmes clés que leur français', async () => {
    for (const { name, fr: french, en: english } of await cases()) {
      expect(paths(english).sort(), name).toEqual(paths(french).sort())
    }
  })

  it('n’en perdent aucun « %s »', async () => {
    const holes = (value: unknown): number =>
      typeof value === 'string' ? (value.match(/%s/g) ?? []).length : 0
    for (const { name, fr: french, en: english } of await cases()) {
      const flatten = (node: unknown, into: Map<string, unknown>, path = ''): void => {
        if (typeof node === 'string') {
          into.set(path, node)
          return
        }
        if (typeof node !== 'object' || node === null) return
        for (const [key, child] of Object.entries(node)) {
          flatten(child, into, path === '' ? key : `${path}.${key}`)
        }
      }
      const a = new Map<string, unknown>()
      const b = new Map<string, unknown>()
      flatten(french, a)
      flatten(english, b)
      const lost = [...a].filter(([key, value]) => holes(b.get(key)) !== holes(value)).map(([k]) => k)
      expect(lost, name).toEqual([])
    }
  })
})
