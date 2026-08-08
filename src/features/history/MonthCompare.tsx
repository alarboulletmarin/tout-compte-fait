import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import type { YearMonth } from '@/domain/date'
import { type CategoryDelta, compareMonths, splitDeltas } from '@/domain/history'
import { sum } from '@/domain/money'
import { coveredMonths } from '@/domain/month'
import type { KindOf } from '@/domain/stats'
import { isSpending } from '@/domain/types'
import { fr } from '@/i18n/fr'
import { history } from '@/i18n/history'
import { formatDelta, formatYearMonthShort, tpl } from '@/i18n/format'
import { useCategoryMap, useEntries, useKindOf, useMonthScope } from '@/store/selectors'
import { useStore } from '@/store/store'
import { Amount } from '@/ui/Amount'
import { Disclosure } from '@/ui/Disclosure'
import { Dot } from '@/ui/Dot'
import { Field, Select } from '@/ui/Field'

/** Le couple de mois qu'on compare. Il vit sur la section (voir `CompareSection`). */
export type MonthPick = { left: YearMonth; right: YearMonth }

export type MonthCompareProps = {
  pick: MonthPick | null
  onPick: (next: MonthPick) => void
}

function MonthSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: YearMonth
  options: readonly YearMonth[]
  onChange: (next: YearMonth) => void
}) {
  return (
    /* `min-w-0` et non `flex-1` : les deux sélecteurs vivent désormais dans une
       grille à deux colonnes égales, et une piste de grille ne descend pas sous
       la largeur intrinsèque de son contenu — celle de la plus longue option —
       sans qu'on l'y autorise. Sans lui, la rangée déborderait la tuile au lieu
       de se partager sa largeur. */
    <Field label={label} className="min-w-0">
      {(id) => (
        <Select
          id={id}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
          }}
        >
          {options.map((month) => (
            /* Forme courte : à 320px une demi-tuile ne laisse qu'une soixantaine
               de pixels de texte au contrôle, et un `<select>` fermé tronque au
               lieu d'abréger. */
            <option key={month} value={month}>
              {formatYearMonthShort(month)}
            </option>
          ))}
        </Select>
      )}
    </Field>
  )
}

/** Une ligne : la catégorie, ce qu'elle pèse, et comment on le lit. */
function DeltaRow({
  color,
  label,
  children,
}: {
  color: string
  label: string
  children: ReactNode
}) {
  return (
    <li className="flex items-center gap-3 py-2">
      <Dot color={color} />
      <span className="t-body min-w-0 flex-1 truncate">{label}</span>
      <span className="flex shrink-0 flex-col items-end">{children}</span>
    </li>
  )
}

/**
 * Écart par catégorie entre deux mois — ce qui a bougé d'abord, le reste replié.
 *
 * La liste montrait l'union des catégories des deux mois, zéros compris : sur
 * un catalogue réel, quinze lignes à « 0,00 € · 0 % » pour deux vraies
 * variations, et la tuile la plus haute de l'écran pour la lecture la moins
 * dense. Une catégorie qui n'a pas bougé n'est pourtant pas sans intérêt — elle
 * ne l'est qu'en tant qu'*écart*. Elle passe donc derrière un repli, où on lit
 * d'elle la seule chose qu'elle ait à dire : ce qu'elle coûte, des deux côtés.
 */
export function MonthCompare({ pick, onPick }: MonthCompareProps) {
  const entries = useEntries()
  const months = useStore((s) => s.data.months)
  const available = useMemo(() => coveredMonths({ entries, months }), [entries, months])

  /* Le garde passe devant tout ce qui lirait un mois. Il venait après le calcul
     du mois de repli — `addMonthsToYm(last, -1)` sur une liste vide —, or
     `parseYm('')` lève : un document sans aucune entrée ni aucun mois ouvert
     faisait tomber l'écran avant d'atteindre la phrase qui l'explique. */
  const last = available.at(-1)
  const beforeLast = available.at(-2)
  if (last === undefined || beforeLast === undefined) {
    return <p className="t-label">{history.compareSingleMonth}</p>
  }

  return (
    <MonthCompareBody
      available={available}
      fallback={{ left: beforeLast, right: last }}
      pick={pick}
      onPick={onPick}
    />
  )
}

function MonthCompareBody({
  available,
  fallback,
  pick,
  onPick,
}: MonthCompareProps & { available: readonly YearMonth[]; fallback: MonthPick }) {
  const categories = useCategoryMap()
  const kindOf = useKindOf()
  /* La portée de lecture, et non l'identifiant du membre : c'est elle qui sait
     aussi bien découper une charge commune en parts que ne garder que le pot.
     La courbe des douze mois, juste à côté, l'utilise déjà — les deux graphiques
     d'un même écran ne peuvent pas répondre à deux règles. */
  const { entries: scoped } = useMonthScope()
  const [openUnchanged, setOpenUnchanged] = useState(false)

  /* Le choix est une préférence, pas un état : on le garde tant qu'il désigne
     un mois qui existe, et on retombe sur les deux derniers dès qu'il ne le
     désigne plus. Un import ou un jeu d'exemple remplace les données sous le
     composant, et le `<select>` portait alors une valeur absente de sa propre
     liste — c'est-à-dire un contrôle vide sans raison affichée. */
  const left = pick !== null && available.includes(pick.left) ? pick.left : fallback.left
  const right = pick !== null && available.includes(pick.right) ? pick.right : fallback.right

  const deltas = useMemo(() => compareMonths(scoped, left, right, 'out'), [scoped, left, right])
  const { changed, unchanged } = useMemo(() => splitDeltas(deltas), [deltas])
  const net = useMemo(() => sum(changed.map((delta) => delta.delta)), [changed])

  const colorOf = (categoryId: string): string =>
    categories.get(categoryId)?.color ?? 'var(--cat-rest)'
  const labelOf = (categoryId: string): string =>
    categories.get(categoryId)?.label ?? fr.common.other

  return (
    <div className="flex flex-col gap-4">
      {/* Deux colonnes strictement égales : en rangée souple, le second
          sélecteur passait à la ligne et changeait de largeur, si bien que rien
          ne disait plus qu'ils portent la même question.
          Elles se superposent en dessous de 360px, et le seuil est mesuré : une
          demi-tuile y laisse 65px de texte au contrôle, quand « sept. 2026 » en
          demande 70 — le mois s'y ferait trancher, et un `<select>` fermé
          tronque sans le dire. Les cinquante pixels qui manquent sont le cadre
          du contrôle, dont trente-six sont une réserve de chevron que le
          composant ne dessine pas ; les récupérer ici corrigerait un seul écran
          au lieu du composant. Empilés, les deux gardent la même largeur, et
          c'est tout ce que la comparaison leur demande. */}
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
        <MonthSelect
          label={history.compareLeft}
          value={left}
          options={available}
          onChange={(next) => {
            onPick({ left: next, right })
          }}
        />
        <MonthSelect
          label={history.compareRight}
          value={right}
          options={available}
          onChange={(next) => {
            onPick({ left, right: next })
          }}
        />
      </div>

      {deltas.length === 0 ? (
        <p className="t-label">{history.compareEmpty}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {changed.length === 0 ? (
            /* Une phrase, et non quinze lignes de zéros : celles-ci ne disent
               pas « rien n'a bougé », elles le font deviner. */
            <p className="t-label">{history.compareNoChange}</p>
          ) : (
            <>
              {/* Ce que la colonne de droite compte, avant de la lire. La liste
                  ne montre que des **sorties** — `compareMonths(…, 'out')` —,
                  et son signe se lit du mois de référence vers le mois comparé :
                  deux règles qui ne s'écrivaient nulle part, et qu'un « + » ne
                  suffit pas à dire. Une phrase ici plutôt qu'un mot ajouté au
                  compte, qui aurait fait « 2 catégories de sorties ont
                  changé » — le compte porte le combien, pas la définition.
                  Elle ne suit pas les rangées repliées : celles-ci portent un
                  montant, pas un écart, et leur propre phrase le dit déjà. */}
              <p className="t-label">{history.compareScope}</p>

              {/* Le compte et l'écart net sur une seule rangée : combien de
                  catégories ont bougé, et de combien au total. C'est la réponse
                  à « qu'est-ce qui explique la différence » avant même de lire
                  une ligne. L'écart net reste en ton neutre — il additionne des
                  natures différentes, et le rouge y affirmerait plus qu'on ne
                  sait (voir le ton des lignes, plus bas). */}
              <div className="flex items-baseline justify-between gap-3">
                <p className="t-label">
                  {changed.length > 1
                    ? tpl(history.compareChangedMany, changed.length)
                    : history.compareChangedOne}
                </p>
                <Amount value={net} size="body" signed className="shrink-0" />
              </div>

              <ul className="flex flex-col divide-y divide-border">
                {changed.map((delta) => (
                  <DeltaRow
                    key={delta.categoryId}
                    color={colorOf(delta.categoryId)}
                    label={labelOf(delta.categoryId)}
                  >
                    {/* Le rouge dit « ça coûte plus » : il ne vaut que pour les
                        charges et les crédits. Un livret où l'on verse 300 € de
                        plus n'est pas une facture qui flambe — l'écart se lit,
                        sans alarme. Il n'est jamais seul à le dire : `signed`
                        pose le « + », et la lecture accessible d'`Amount` le
                        prononce. */}
                    <Amount
                      value={delta.delta}
                      size="body"
                      signed
                      tone={changedTone(delta, kindOf)}
                    />
                    {/* Le mois de référence était à zéro : il n'y a pas de
                        proportion à écrire, et le cadratin — qui dit « on ne
                        sait pas » — laissait la question ouverte alors qu'on
                        sait très bien ce qui s'est passé. */}
                    <span className="t-axis tnum">
                      {delta.deltaRatio === null
                        ? history.compareAppeared
                        : formatDelta(delta.deltaRatio)}
                    </span>
                  </DeltaRow>
                ))}
              </ul>
            </>
          )}

          {unchanged.length > 0 && (
            /* Replié par défaut, et le compte reste lu : une section qu'il faut
               ouvrir pour savoir si elle vaut la peine ne fait gagner aucun
               défilement (DS §6). Le cadre négatif rend au survol la largeur
               d'une rangée — collé au mot, il se lirait comme une sélection. */
            <Disclosure
              className="-mx-2"
              open={openUnchanged}
              onOpenChange={setOpenUnchanged}
              title={<span className="t-label">{history.compareUnchanged}</span>}
              trailing={<span className="t-axis tnum">{unchanged.length}</span>}
            >
              <p className="t-axis px-3 pb-2">{history.compareUnchangedHint}</p>
              <ul className="flex flex-col divide-y divide-border px-2">
                {unchanged.map((delta) => (
                  <DeltaRow
                    key={delta.categoryId}
                    color={colorOf(delta.categoryId)}
                    label={labelOf(delta.categoryId)}
                  >
                    {/* Le montant commun aux deux mois, et non « 0,00 € · 0 % » :
                        d'une catégorie qui n'a pas bougé, ce qu'on veut savoir
                        est ce qu'elle pèse. */}
                    <Amount value={delta.right} size="body" direction="out" tone="muted" />
                  </DeltaRow>
                ))}
              </ul>
            </Disclosure>
          )}
        </div>
      )}
    </div>
  )
}

function changedTone(delta: CategoryDelta, kindOf: KindOf): 'danger' | 'default' {
  return delta.delta > 0 && isSpending(kindOf(delta.categoryId)) ? 'danger' : 'default'
}
