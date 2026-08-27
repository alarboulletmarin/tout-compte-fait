import { type ReactNode, useMemo } from 'react'
import { MonthFilterOverrideContext } from '@/store/filterOverride'
import { useMembers } from '@/store/selectors'
import type { MonthFilter } from '@/store/store'
import { useStore } from '@/store/store'

/**
 * Pose la portée individuelle sur tout l'arbre qu'il couvre : le filtre du
 * mois quand il porte déjà une personne connue, la première personne sinon —
 * **sans jamais écrire le filtre**. Voir `individualScope.ts`, qui porte la
 * doctrine ; le composant vit dans son propre fichier, comme
 * `ScreenTitleProvider` à côté de `screenTitle.ts`.
 *
 * `null` — donc aucune portée — quand le foyer n'a encore personne : il n'y a
 * alors rien à filtrer, tout est déjà à la seule personne qui saisit, et
 * l'écran d'épargne dit de toute façon qu'il faut quelqu'un avant de poser un
 * support.
 *
 * Le filtre déjà connu passe **par référence** : les caches en aval
 * (`memoLast`) reconnaissent deux lectures identiques à leurs arguments, et
 * une copie à chaque rendu les ferait recalculer pour rien.
 */
export function IndividualScope({ children }: { children: ReactNode }) {
  const members = useMembers()
  const stored = useStore((s) => s.filter)

  const known = stored.kind === 'member' && members.some((m) => m.id === stored.memberId)
  const fallback = members[0]?.id

  const value = useMemo<MonthFilter | null>(() => {
    if (known) return stored
    return fallback === undefined ? null : { kind: 'member', memberId: fallback }
  }, [known, stored, fallback])

  return (
    <MonthFilterOverrideContext.Provider value={value}>
      {children}
    </MonthFilterOverrideContext.Provider>
  )
}
