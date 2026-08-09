import { useState } from 'react'
import { history } from '@/i18n/history'
import { Eyebrow } from '@/ui/Eyebrow'
import { CompareIcon } from '@/ui/Icons'
import { Segmented, type SegmentedOption } from '@/ui/Segmented'
import { Tile } from '@/ui/Tile'
import { MonthCompare, type MonthPick } from './MonthCompare'
import { YearCompare } from './YearCompare'

type CompareMode = 'months' | 'years'

const modes = (): readonly SegmentedOption<CompareMode>[] => [
  { value: 'months', label: history.compareModeMonths },
  { value: 'years', label: history.compareModeYears },
]

/**
 * Comparer deux périodes — une seule à la fois.
 *
 * Les deux comparatifs vivaient dans deux grandes tuiles empilées, chacune avec
 * son cadre, son étiquette et ses sélecteurs. Ils répondent pourtant à une
 * seule intention — poser deux périodes l'une contre l'autre —, et deux cadres
 * identiques l'un sous l'autre en font deux fonctions sans rapport, dont la
 * seconde n'est atteinte qu'après avoir fait défiler la première en entier.
 * Une tuile, une bascule, et la page perd une carte et la moitié de sa hauteur.
 *
 * La bascule est celle du thème (`Segmented`) : un groupe de boutons radio, aux
 * flèches et au parcours clavier que l'APG demande. Pas d'onglets — il n'y a
 * pas de panneau à nommer, le contenu suit immédiatement dans le document, et
 * chaque corps se présente par son premier contrôle.
 *
 * **Les choix vivent ici et non dans les corps.** La bascule démonte celui
 * qu'elle quitte : un aller-retour vers « Années » aurait perdu le couple de
 * mois qu'on venait de poser, ce que deux tuiles côte à côte ne faisaient pas.
 * Le regroupement ne doit pas coûter ça.
 */
export function CompareSection() {
  const [mode, setMode] = useState<CompareMode>('months')
  const [monthPick, setMonthPick] = useState<MonthPick | null>(null)
  const [yearPick, setYearPick] = useState<number | null>(null)

  return (
    <Tile className="gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Eyebrow icon={CompareIcon}>{history.compare}</Eyebrow>
        <Segmented
          options={modes()}
          value={mode}
          onChange={setMode}
          label={history.compareAxis}
        />
      </div>

      {mode === 'months' ? (
        <MonthCompare pick={monthPick} onPick={setMonthPick} />
      ) : (
        <YearCompare pick={yearPick} onPick={setYearPick} />
      )}
    </Tile>
  )
}
