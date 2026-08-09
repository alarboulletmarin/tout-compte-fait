/* ============================================================================
 * Le seul endroit d'où l'écran des projections lit le document.
 *
 * **Ici et pas dans `store/selectors.ts`**, contrairement à tous les autres
 * sélecteurs de l'app, et c'est une question de poids : ce fichier-là est lu par
 * presque tous les composants, donc il vit dans le graphe initial que
 * `scripts/size.mjs` plafonne — quand cet écran-ci part à la demande
 * (`app/Routes.tsx`) et emporte déjà sa prose et son tracé SVG. Y poser un
 * sélecteur ramènerait `domain/savingProjection.ts` dans le premier chargement
 * de tout le monde, pour un écran que personne n'ouvre en arrivant. C'est le
 * motif de `features/savings/individualScope.ts`, qui lit le store de la même
 * façon et pour la même raison.
 *
 * Il ne lit que des tranches déjà exposées, et n'invente aucune règle de
 * portée : `useScopedSavingSupports` applique le filtre du bandeau, exactement
 * comme l'écran Épargne.
 * ==========================================================================*/

import { useMemo } from 'react'
import { activeSupports, latestValuation } from '@/domain/saving'
import { type SupportBasis, supportBases } from '@/domain/savingProjection'
import {
  useEntries,
  useRecurrences,
  useSavingSupports,
  useSavingValuations,
  useScopedSavingSupports,
} from '@/store/selectors'

/**
 * Le point de départ et les versements de chaque support de la personne lue.
 *
 * **Les archivés en sortent.** Un support archivé est un compte clôturé : son
 * dernier relevé reste vrai à sa date, mais rien ne l'alimentera plus, et le
 * projeter sur dix ans ferait grossir un compte fermé. C'est la règle
 * d'`activeSupports`, que suivent déjà les formulaires — la liste de l'écran
 * Épargne, elle, les garde parce qu'elle raconte le passé, pas l'avenir.
 */
export function useSupportBases(): SupportBasis[] {
  const supports = useScopedSavingSupports()
  const valuations = useSavingValuations()
  const entries = useEntries()
  const recurrences = useRecurrences()

  return useMemo(
    () => supportBases(activeSupports(supports), valuations, entries, recurrences),
    [supports, valuations, entries, recurrences],
  )
}

/**
 * Le foyer a-t-il **de quoi partir** — au moins un support relevé.
 *
 * C'est ce qui décide de la lecture ouverte à l'arrivée, tant que personne n'a
 * choisi. La question porte sur tous les supports et non sur ceux de la personne
 * filtrée : un filtre laissé sur « Commun » ailleurs dans l'app — où l'épargne
 * ne rend rien, par définition — ne doit pas conclure que le foyer n'épargne
 * pas. Le filtre décide de **qui** on lit, pas de ce que l'app sait faire.
 */
export function useHasProjectableSupport(): boolean {
  const supports = useSavingSupports()
  const valuations = useSavingValuations()

  return useMemo(
    () =>
      activeSupports(supports).some(
        (support) => latestValuation(valuations, support.id) !== null,
      ),
    [supports, valuations],
  )
}
