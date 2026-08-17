import { sum } from '@/domain/money'
import { OTHER_CATEGORY } from '@/domain/stats'
import { t } from '@/i18n/strings'
import { formatMoney, formatPercent, tpl } from '@/i18n/format'

import { useFamilyMap, useSpendingByFamily } from '@/store/selectors'
import { familyColor } from '@/persistence/defaults'
import { Amount } from '@/ui/Amount'
import { Dot } from '@/ui/Dot'
import { Eyebrow } from '@/ui/Eyebrow'
import { BreakdownIcon } from '@/ui/Icons'
import { Ring, type RingSegment } from '@/ui/Ring'
import { Tile } from '@/ui/Tile'
import { useCurrency } from '@/ui/currency'
import { DONUT_SIZE, DONUT_SLICES, DONUT_THICKNESS } from './donut'

/**
 * Où part l'argent, par famille — le donut du DS §6.
 *
 * Par famille et non par catégorie : à une quarantaine de catégories, six parts
 * plus un gros « Autres » ne répondent plus à la question. Et hors épargne : un
 * versement sort du compte mais reste au foyer, l'inscrire ici ferait passer un
 * mois où l'on a mis 300 € de côté pour un mois dispendieux.
 *
 * Un « Mis de côté » se lisait sous l'anneau. Il n'y est plus, pour deux
 * raisons. Au foyer, il additionnait des épargnes individuelles, ce que le
 * reste de l'app refuse de faire : deux personnes qui placent 300 € et 900 €
 * n'ont pas « 1 200 € de côté », elles ont deux décisions séparées. Et il se
 * lisait au seul confirmé quand l'anneau au-dessus compte aussi les prévues :
 * deux chiffres voisins sur deux bases différentes se lisent comme une erreur.
 * Ce qu'une personne a placé se dit sur la tuile « Capacité d'épargne », sous
 * un filtre par membre, et se détaille sur l'écran de l'épargne.
 */
/** Ouvrir une part sur les lignes qui la composent. */
export type ShowFamily = (familyId: string) => void

export function BreakdownTile({ onShowFamily }: { onShowFamily?: ShowFamily }) {
  const slices = useSpendingByFamily(DONUT_SLICES)
  const families = useFamilyMap()
  const currency = useCurrency()

  const labelOf = (id: string): string =>
    id === OTHER_CATEGORY ? t.common.other : (families.get(id)?.label ?? t.common.other)
  const colorOf = (id: string): string =>
    id === OTHER_CATEGORY ? 'var(--cat-rest)' : familyColor(id)

  if (slices.length === 0) {
    return (
      <Tile span="2x2" className="justify-between">
        <Eyebrow icon={BreakdownIcon}>{t.dashboard.spending}</Eyebrow>
        <p className="t-label">{t.dashboard.noBreakdown}</p>
      </Tile>
    )
  }

  const segments: RingSegment[] = slices.map((slice) => ({
    id: slice.categoryId,
    value: slice.share,
    color: colorOf(slice.categoryId),
    label: labelOf(slice.categoryId),
  }))
  const total = sum(slices.map((slice) => slice.total))
  const spoken = slices
    .map((slice) => `${labelOf(slice.categoryId)} ${formatPercent(slice.share)}`)
    .join(', ')

  return (
    <Tile span="2x2" className="gap-3">
      <Eyebrow icon={BreakdownIcon}>{t.dashboard.spending}</Eyebrow>
      <div className="flex min-h-0 flex-1 items-center gap-4">
        <Ring
          size={DONUT_SIZE}
          thickness={DONUT_THICKNESS}
          segments={segments}
          label={t.dashboard.spending}
          srText={tpl(t.dashboard.srBreakdown, spoken)}
          className="shrink-0"
        >
          <Amount value={total} size="label" direction="out" withCents={false} />
        </Ring>
        {/* Toutes les parts de l'anneau, sans exception : une couleur dans
            l'anneau que la légende ne nomme pas ne veut rien dire.

            Chaque part **s'ouvre**, sur les lignes qu'elle compte. Les deux
            tuiles de flux mènent depuis longtemps à la liste filtrée sur leur
            nature — « le clic montre exactement ce que le chiffre compte »
            (cahier §4.4 bis) —, mais celle-ci ne menait nulle part : voir
            « Logement 890 € » et vouloir savoir ce qu'il y a dedans était un
            geste sans réponse.

            Le lien est sur la ligne et non sur la tuile : une tuile cliquable
            qui contient une liste enferme celle-ci dans un bouton, ce que le
            DS §6 refuse et que trois autres tuiles ont déjà eu à défaire. Et
            une tuile entière ne saurait de toute façon pas *laquelle* des sept
            parts on visait.

            « Autres » ne s'ouvre pas : ce n'est pas une famille mais le reste
            de la liste, et l'ouvrir promettrait un filtre qui n'existe pas. */}
        {/* Sans gouttière, et c'est ce qui permet aux rangées d'être visables.
            Chaque part est une cible de 24px de haut — le plancher de WCAG
            2.5.8, que la ligne serrée sur son texte violait à 18,2px, mesuré à
            toutes les largeurs. Cinq rangées de 24 tiennent dans les ~125px que
            la 2×2 laisse à sa légende ; les mêmes avec 4px de gouttière n'y
            tiennent pas. Rien n'est perdu au change : la pastille et le libellé
            gardent leur place, et le survol dessine le bloc de la rangée, ce
            qui dit mieux qu'une gouttière où commence et où finit la cible. */}
        <ul className="flex min-w-0 flex-1 flex-col">
          {slices.map((slice) => {
            const openable = onShowFamily !== undefined && slice.categoryId !== OTHER_CATEGORY
            const row = (
              <>
                <Dot color={colorOf(slice.categoryId)} />
                <span className="t-label min-w-0 flex-1 truncate text-left">
                  {labelOf(slice.categoryId)}
                </span>
                <span className="t-axis tnum shrink-0">{formatPercent(slice.share)}</span>
              </>
            )
            return (
              <li key={slice.categoryId}>
                {openable ? (
                  <button
                    type="button"
                    className="flex min-h-6 w-full items-center gap-2 rounded-inner transition-colors duration-[var(--dur)] ease-ds hover:bg-surface-2"
                    aria-label={tpl(t.dashboard.showFamily, labelOf(slice.categoryId))}
                    onClick={() => {
                      onShowFamily(slice.categoryId)
                    }}
                  >
                    {row}
                  </button>
                ) : (
                  /* Même hauteur que ses voisines cliquables : une rangée plus
                     courte que les autres se lirait comme une rangée d'un autre
                     genre, alors qu'elle n'est que la seule qui n'ouvre rien. */
                  <span className="flex min-h-6 items-center gap-2">{row}</span>
                )}
              </li>
            )
          })}
        </ul>
      </div>
      <p className="sr-only-text">{formatMoney(total, currency)}</p>
    </Tile>
  )
}
