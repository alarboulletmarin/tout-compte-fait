/* ============================================================================
 * La figure de la simulation : trois aires empilées, et une borne au-dessus.
 *
 * **Ce qu'elle montre n'est pas un capital, c'est sa composition.** Le sommet de
 * la pile est le capital projeté, et les trois couches disent d'où il vient : ce
 * qu'il y avait au départ, ce qu'on a versé depuis, ce que le taux a produit.
 * Un trait unique aurait répondu à « combien j'aurai » et à rien d'autre —
 * or « ≈ 42 000 € » impressionne, quand « 12 000 € versés et 6 000 € de
 * rendement » informe. C'est la même identité que l'écran d'épargne applique au
 * passé (`charts/GrowthAreas`), tournée vers l'avenir.
 *
 * **La borne haute est un trait tireté, jamais une seconde pile.** Empiler
 * l'écart entre les deux hypothèses l'aurait posé au-dessus d'un rendement qui
 * peut être négatif — en euros d'aujourd'hui, un taux sous l'inflation creuse la
 * couche du rendement sous zéro —, et la pile n'aurait alors plus rien sommé.
 * Le tireté dit d'ailleurs ce qu'il est : une hypothèse, et non une mesure
 * (DS §2.3 — une distinction qui ne survit pas au niveau de gris n'en est pas
 * une).
 *
 * **Recharts, et c'est la seule figure de l'app qui ne soit pas écrite à la
 * main.** Les cinq autres (`src/charts`) sont du SVG maison, ce qui leur va :
 * elles tracent une série connue d'avance, sans curseur continu ni infobulle.
 * Celle-ci est un instrument qu'on manipule — on tire un taux, une cadence, une
 * durée, et on regarde ce que ça fait sur cinq cents points —, et la
 * bibliothèque apporte exactement ce qui coûterait le plus à réécrire :
 * l'échelle, l'axe, l'infobulle au doigt et la navigation au clavier. Elle
 * voyage avec l'écran, qui se charge à la demande, et ne pèse donc sur le
 * premier chargement de personne.
 * ==========================================================================*/

import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Money } from '@/domain/money'
import { formatRoundedMoney, tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'
import { Dot } from '@/ui/Dot'
import { useCurrency } from '@/ui/currency'
import type { SimulationPoint } from './model'
import { formatDuration } from './duration'

/* La lettre des graduations : celle de `.t-axis` — mono, 11px, atténuée —, que
   les cinq figures maison portent déjà. Elle se pose en attribut SVG et non en
   classe : Recharts rend ses `<text>` lui-même. */
const AXIS_TEXT = {
  fill: 'var(--text-muted)',
  fontSize: 11,
  fontFamily: 'var(--font-mono)',
} as const

/* Les trois teintes des couches, dans l'ordre de la pile — les mêmes que la
   figure du passé, pour que la même question se lise du même œil des deux
   côtés : le gris du capital déjà là, le violet de ce qui sort de la poche, le
   lime de ce que le compte produit tout seul. Ce sont des tokens et non des
   couleurs écrites : une palette a le droit de les dire autrement. */
const INITIAL = 'var(--surface-2)'
const PAID = 'var(--accent-2)'
const GAIN = 'var(--accent)'

/**
 * Le pas des graduations de l'axe, en années — et il tombe sur un compte rond.
 *
 * Quatre intervalles au plus : sur un téléphone de 320 points, l'axe dispose
 * d'environ 250 pixels utiles, et « 10 ans » en occupe cinquante. Au-delà,
 * Recharts masque les étiquettes qui se chevauchent — ce qui donne un axe gradué
 * à 4, 6 puis 10 ans, dont le pas n'est plus lisible.
 *
 * Le pas se prend donc dans une liste de nombres ronds plutôt que par division :
 * un horizon de vingt-cinq ans gradué tous les sept ans est exact et illisible,
 * alors que tous les dix ans se lit sans compter. Le dernier repère n'a pas à
 * tomber sur l'horizon — l'axe s'y arrête de toute façon, et le chiffre
 * d'arrivée est écrit en toutes lettres deux tuiles plus haut.
 */
const NICE_STEPS = [1, 2, 5, 10, 25] as const

function tickEvery(years: number): number {
  return NICE_STEPS.find((step) => years / step <= 4) ?? years
}

export type SimulationChartProps = {
  points: readonly SimulationPoint[]
  months: number
  /** Une seule hypothèse : pas de borne haute à tracer. */
  single: boolean
  /** Tous les taux en jeu sont contractuels : la pile n'est pas une hypothèse. */
  guaranteed: boolean
  /** La lecture textuelle, pour qui n'a pas la figure. */
  srText: string
}

export function SimulationChart({
  points,
  months,
  single,
  guaranteed,
  srText,
}: SimulationChartProps) {
  const currency = useCurrency()
  const money = (value: Money): string => formatRoundedMoney(value, currency)
  const years = Math.max(1, Math.round(months / 12))
  const step = tickEvery(years) * 12
  const ticks = points.filter((point) => point.month % step === 0).map((point) => point.month)

  const layers = [
    { id: 'initial', label: projection.layerInitial, color: INITIAL },
    { id: 'paid', label: projection.layerPaid, color: PAID },
    { id: 'gain', label: projection.layerGain, color: GAIN },
    ...(single ? [] : [{ id: 'high', label: projection.layerHigh, color: GAIN }]),
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {/* La lecture textuelle du cahier §5, et elle ne remplace pas le tableau :
          celui-ci est à un appui et donne les chiffres ligne à ligne. Elle dit
          ce que la figure trace et où elle arrive, ce qu'une liste de cinq cents
          points ne dirait pas mieux. */}
      <p className="sr-only">{srText}</p>

      {/* Une figure nommée, et non une image : `role="img"` masquerait ce
          qu'elle contient, or Recharts y pose un curseur qui se déplace aux
          flèches et annonce ce qu'il porte. Le nom dit ce qu'on regarde ; le
          paragraphe ci-dessus dit ce qu'elle raconte. */}
      <figure
        className="m-0 min-h-0 flex-1"
        aria-label={tpl(projection.chartLabel, formatDuration(months))}
      >
        {/* `minHeight` est un plancher, pas une hauteur : sur une fenêtre
            basse, un cadre flexible peut se réduire à rien, et une figure de
            zéro pixel ne dit rien à personne. */}
        <ResponsiveContainer width="100%" height="100%" minHeight={100}>
          <ComposedChart
            data={points}
            /* Aucune marge à gauche : l'axe des montants porte sa propre
               largeur, et une marge par-dessus rognerait la figure sur un
               écran de 320 points. En haut, deux pixels pour que le trait de
               la borne haute ne se coupe pas en deux sur le bord. */
            margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
            /* Le clavier, et Recharts s'en charge : la figure devient
               focalisable et les flèches déplacent le curseur d'un rang à
               l'autre, en annonçant ce qu'il porte. */
            accessibilityLayer
          >
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="month"
              type="number"
              domain={[0, months]}
              ticks={ticks}
              tickFormatter={(value: number) =>
                value === 0 ? projection.start : formatDuration(value)
              }
              tick={AXIS_TEXT}
              stroke="var(--border)"
              /* Les étiquettes de l'axe ne se serrent pas : plutôt qu'une
                 graduation coupée, on en met moins (`tickEvery`). */
              interval="preserveStartEnd"
              minTickGap={8}
            />
            <YAxis
              width={52}
              tickFormatter={(value: number) => money(value as Money)}
              tick={AXIS_TEXT}
              stroke="var(--border)"
              /* Trois graduations : l'axe dit l'ordre de grandeur, le chiffre
                 exact se lit à l'infobulle et au tableau. */
              tickCount={4}
            />
            <Tooltip
              /* Le curseur suit le doigt comme la souris. Il est tireté, comme
                 les trois autres tracés de l'app. */
              cursor={{ stroke: 'var(--text-muted)', strokeDasharray: '3 3' }}
              content={(props) => {
                const month = typeof props.label === 'number' ? props.label : null
                const point = points.find((one) => one.month === month)
                if (!props.active || point === undefined) return null
                return <ChartTip point={point} single={single} />
              }}
            />
            <Area
              type="monotone"
              dataKey="initial"
              stackId="capital"
              stroke="none"
              fill={INITIAL}
              fillOpacity={1}
              isAnimationActive={false}
              name={projection.layerInitial}
            />
            <Area
              type="monotone"
              dataKey="paid"
              stackId="capital"
              stroke="none"
              fill={PAID}
              fillOpacity={0.85}
              isAnimationActive={false}
              name={projection.layerPaid}
            />
            <Area
              type="monotone"
              dataKey="gain"
              stackId="capital"
              stroke="none"
              fill={GAIN}
              fillOpacity={0.45}
              isAnimationActive={false}
              name={projection.layerGain}
            />
            {!single && (
              <Line
                type="monotone"
                dataKey="high"
                dot={false}
                stroke={GAIN}
                strokeWidth={2}
                /* Tireté parce que c'est une hypothèse, et plein seulement là
                   où un contrat garantit ce qu'il annonce. */
                {...(guaranteed ? {} : { strokeDasharray: '5 4' })}
                isAnimationActive={false}
                name={projection.layerHigh}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </figure>

      {/* La légende, en texte et en pastilles : la couleur ne porte jamais seule
          une distinction (DS §2.3). Elle ne se replie pas — trois mots sur une
          ligne coûtent moins que la question « c'est quoi le violet ? ». */}
      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {layers.map((layer) => (
          /* La lettre de l'axe, et non celle du texte : quatre entrées à 13px
             passent à la ligne sur un écran de 320 points, et une légende de
             deux lignes coûte à la figure qu'elle nomme. */
          <li key={layer.id} className="t-axis flex items-center gap-1.5">
            <Dot color={layer.color} />
            {layer.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * Ce que l'infobulle dit d'un rang : la durée, puis les trois couches et leur
 * somme.
 *
 * Dans le même ordre que la pile, de bas en haut : c'est la seule façon de
 * pouvoir suivre du doigt sur la figure ce qu'on lit dans la boîte.
 */
function ChartTip({ point, single }: { point: SimulationPoint; single: boolean }) {
  const currency = useCurrency()
  const money = (value: Money): string => formatRoundedMoney(value, currency)
  const rows = [
    ...(point.initial === 0 ? [] : [{ label: projection.layerInitial, value: point.initial }]),
    { label: projection.layerPaid, value: point.paid },
    { label: projection.layerGain, value: point.gain },
  ]

  return (
    <div className="surface rounded-inner border border-border bg-surface px-3 py-2 shadow-tile">
      <p className="t-label">
        {point.month === 0 ? projection.start : tpl(projection.chartAt, formatDuration(point.month))}
      </p>
      <p className="t-body font-medium">
        {single
          ? tpl(projection.approx, money(point.total))
          : tpl(projection.rangeShort, money(point.total), money(point.high))}
      </p>
      <ul className="mt-1 flex flex-col">
        {rows.map((row) => (
          <li key={row.label} className="t-label flex justify-between gap-3">
            <span>{row.label}</span>
            <span className="t-num-label tnum">{money(row.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
