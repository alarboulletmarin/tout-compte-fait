/* ============================================================================
 * Tout ce que l'écran ne dit plus dans son flux.
 *
 * Sept paragraphes y vivaient : le taux constant, le taux net, la fiscalité, la
 * convention de fin de mois, l'inflation, les arrondis, ce que l'écran fait des
 * données. Chacun était juste et chacun avait sa raison d'être ; ensemble, ils
 * transformaient une lecture en notice — de la documentation financière
 * intercalée entre des champs de saisie, que personne ne lit précisément parce
 * qu'elle est partout.
 *
 * Ils sont donc **derrière une porte, mais tous derrière la même** : on les lit
 * une fois, d'affilée, quand on se demande d'où sort le chiffre. C'est le motif
 * de `features/dashboard/MetricInfo.tsx`, qui explique un chiffre du mois de la
 * même façon.
 *
 * **Ce qui n'y est pas descendu, et ne descendra pas** : la réserve. Elle reste
 * sous le résultat, en clair, et ne se replie jamais (cahier §4.6 ter) — une
 * mise en garde qu'il faut ouvrir pour lire n'en est plus une.
 * ==========================================================================*/

import { projection } from '@/i18n/projection'
import { Eyebrow } from '@/ui/Eyebrow'
import { Sheet } from '@/ui/Sheet'

/** Les sections, dans l'ordre où les questions se posent. */
const sections = (): { title: string; body: string }[] => [
  { title: projection.explainRate, body: projection.explainRateBody },
  { title: projection.explainNet, body: projection.explainNetBody },
  { title: projection.explainMethod, body: projection.explainMethodBody },
  { title: projection.explainSum, body: projection.explainSumBody },
  { title: projection.explainInflation, body: projection.explainInflationBody },
  { title: projection.explainRounding, body: projection.explainRoundingBody },
  { title: projection.explainData, body: projection.explainDataBody },
]

export function ExplainSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={projection.explain} pullToClose>
      <div className="flex flex-col gap-4">
        {sections().map((section, index) => (
          <section
            key={section.title}
            /* Un filet entre deux sections, jamais avant la première : c'est la
               règle de `RowGroup`, et une feuille n'a pas de raison d'en avoir
               une autre. */
            className={index === 0 ? 'flex flex-col gap-2' : 'flex flex-col gap-2 border-t border-border pt-4'}
          >
            <Eyebrow>{section.title}</Eyebrow>
            <p className="t-body">{section.body}</p>
          </section>
        ))}
      </div>
    </Sheet>
  )
}
