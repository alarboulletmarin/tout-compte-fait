/* ============================================================================
 * D'où part la simulation : de l'épargne réelle, ou de rien.
 *
 * C'est le branchement que l'écran n'avait pas, et son absence coûtait plus
 * qu'elle ne protégeait : l'app connaissait le capital d'un livret et les 350 €
 * qui y tombent tous les mois, et on les retapait à la main deux écrans plus
 * loin. Le cahier §4.6 ter interdisait de *lire* pour être sûr de ne pas
 * *écrire* — mais ce sont deux choses, et seule la seconde met le document en
 * danger.
 *
 * **Le sens est unique, et rien dans cet écran ne l'inverse.** Les deux chiffres
 * repris s'affichent en **lecture**, pas dans des champs : on ne tape jamais
 * par-dessus l'épargne, donc on ne peut pas croire qu'on la modifie. Qui veut
 * essayer autre chose appuie sur « Modifier pour cette simulation », qui recopie
 * les valeurs dans la saisie et repasse en simulation libre — le lien est coupé,
 * et il se voit.
 *
 * **Le rendement n'est jamais repris.** Le capital et les versements sont des
 * faits ; un rendement futur n'en est pas un, et un support n'en porte pas.
 * Préremplir 3 % sous prétexte qu'un livret est à 3 % aujourd'hui serait
 * exactement le tour des simulateurs de vente que cet écran existe pour ne pas
 * être.
 *
 * **Une liste par personne, jamais un total du foyer.** Deux personnes qui ont
 * 12 000 € et 8 000 € de côté n'ont pas 20 000 € (cahier §4.6 bis) : les
 * supports sont donc rangés sous leur propriétaire, et « toute l'épargne » est
 * toujours celle de quelqu'un.
 * ==========================================================================*/

import type { Money } from '@/domain/money'
import type { ProjectionSource, ProjectionStart } from '@/domain/projectionStart'
import type { Member, SavingSupport } from '@/domain/types'
import { NO_VALUE, de, formatMoney, tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'
import { Button } from '@/ui/Button'
import { Field, Select } from '@/ui/Field'
import { useCurrency } from '@/ui/currency'

/* Deux clés d'option, et un séparateur qui ne peut pas apparaître dans un
   identifiant : `makeId` rend un UUID, qui ne porte que des chiffres, des
   lettres et des tirets. */
const FREE = 'free'
const key = (source: ProjectionSource): string =>
  source.kind === 'free' ? FREE : `${source.kind}:${source.id}`

function parseKey(value: string): ProjectionSource {
  const [kind, id] = value.split(':')
  if ((kind === 'member' || kind === 'support') && id !== undefined && id !== '') {
    return { kind, id }
  }
  return { kind: 'free' }
}

export type SourceSelectProps = {
  source: ProjectionSource
  onChange: (next: ProjectionSource) => void
  /** Ce que l'origine choisie rapporte. Vide en simulation libre. */
  start: ProjectionStart
  members: readonly Member[]
  /** Les supports proposables — les archivés n'en sont pas. */
  supports: readonly SavingSupport[]
  /** Recopie les chiffres dans la saisie et repasse en libre. */
  onDetach: () => void
  /** Le mode inverse calcule le versement : il ne reprend que le capital. */
  showMonthly: boolean
}

export function SourceSelect({
  source,
  onChange,
  start,
  members,
  supports,
  onDetach,
  showMonthly,
}: SourceSelectProps) {
  const currency = useCurrency()
  /* À l'euro près, et **pas** au format arrondi des projections : ces deux
     chiffres-là ne sortent pas d'un modèle, ce sont des faits — un relevé, des
     règles récurrentes. Écrire « ≈ 8,5 k€ » sous « Épargne actuelle » ferait
     passer pour une estimation ce que l'écran Épargne affiche au centime deux
     écrans plus haut, et donnerait deux réponses à « combien j'ai ». Le « ≈ »
     commence à la sortie du calcul, pas à son entrée. */
  const money = (value: Money): string => formatMoney(value, currency, false)
  const alone = members.length === 1

  return (
    <div className="flex flex-col gap-3">
      <Field label={projection.source}>
        {(id, describedBy) => (
          <Select
            id={id}
            aria-describedby={describedBy}
            value={key(source)}
            onChange={(event) => {
              onChange(parseKey(event.target.value))
            }}
          >
            <option value={FREE}>{projection.sourceFree}</option>
            {members.map((member) => {
              const owned = supports.filter((support) => support.memberId === member.id)
              /* Une personne sans support n'a rien à projeter : la proposer
                 offrirait une origine qui rend un capital vide. */
              if (owned.length === 0) return null
              const all = (
                <option value={key({ kind: 'member', id: member.id })}>
                  {alone ? projection.sourceMine : tpl(projection.sourceMember, de(member.name))}
                </option>
              )
              const each = owned.map((support) => (
                <option key={support.id} value={key({ kind: 'support', id: support.id })}>
                  {support.label}
                </option>
              ))
              /* Seul du foyer, personne n'a besoin qu'on lui rappelle à qui
                 sont ses livrets : le groupe disparaît, les options restent. */
              return alone ? (
                <optgroup key={member.id} label={projection.source}>
                  {all}
                  {each}
                </optgroup>
              ) : (
                <optgroup key={member.id} label={member.name}>
                  {all}
                  {each}
                </optgroup>
              )
            })}
          </Select>
        )}
      </Field>

      {source.kind !== 'free' && (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          {/* En lecture, jamais dans un champ : c'est ce qui dit qu'on regarde
              l'épargne et qu'on ne l'édite pas.
              Chaque chiffre porte sa provenance juste en dessous. Un montant
              repris sans elle est un montant qu'il faut croire sur parole —
              « 616 €/mois » n'apprend pas qu'il est la somme de trois règles, ni
              lesquelles ont été écartées. */}
          <dl className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="t-body">{projection.sourceCapital}</dt>
                <dd className="t-num-body tnum shrink-0">
                  {/* `NO_VALUE` et non un cadratin recopié : un support sans
                      relevé n'a pas de valeur, et cette absence-là doit se lire
                      du même signe que partout ailleurs dans l'app. Surtout pas
                      un zéro — zéro est une information financière. */}
                  {start.capital === null ? NO_VALUE : money(start.capital)}
                </dd>
              </div>
              {/* Ce que le chiffre est, puis ce qui lui manque. Un support sans
                  relevé n'est pas un support à zéro. */}
              {start.capital === null ? (
                <p className="t-label">{projection.sourceNoValue}</p>
              ) : (
                <p className="t-label">
                  {start.valued === 1
                    ? projection.sourceFromOne
                    : tpl(projection.sourceFrom, start.valued)}
                </p>
              )}
              {start.unvalued === 1 && start.capital !== null && (
                <p className="t-label">{projection.sourceUnvaluedOne}</p>
              )}
              {start.unvalued > 1 && start.capital !== null && (
                <p className="t-label">{tpl(projection.sourceUnvalued, start.unvalued)}</p>
              )}
            </div>

            {showMonthly && (
              <div className="flex flex-col gap-0.5">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="t-body">{projection.sourceMonthly}</dt>
                  <dd className="t-num-body tnum shrink-0">
                    {tpl(projection.perMonth, money(start.monthly))}
                  </dd>
                </div>
                {start.rules === 0 ? (
                  <p className="t-label">{projection.sourceNoMonthly}</p>
                ) : (
                  <>
                    <p className="t-label">
                      {start.rules === 1
                        ? projection.sourceRulesOne
                        : tpl(projection.sourceRules, start.rules)}
                    </p>
                    {/* Les versements ponctuels sont la question qu'on se pose
                        juste après avoir lu ce chiffre, et la réponse n'est pas
                        celle qu'on attend : ils bougent le capital, pas la
                        mensualité. Autant le dire à sa place. */}
                    <p className="t-label">{projection.sourceOneOff}</p>
                  </>
                )}
                {/* Le piège du module, dit là où il se produit. */}
                {start.ending === 1 && <p className="t-label">{projection.sourceEndingOne}</p>}
                {start.ending > 1 && (
                  <p className="t-label">{tpl(projection.sourceEnding, start.ending)}</p>
                )}
                {start.variable && <p className="t-label">{projection.sourceVariable}</p>}
              </div>
            )}
          </dl>

          {/* Le détail, compte par compte : les deux chiffres au-dessus sont
              des sommes, et « 616 €/mois » ne dit pas sur quels comptes ça
              part. La dernière ligne les redonne exactement — `recomposes`
              (`domain/projectionStart.ts`) le garantit, et vide `parts` quand ce
              n'est pas le cas, si bien que le tableau disparaît plutôt que de
              proposer des colonnes qui ne font pas le total.
              Les montants s'écrivent **exacts** : ce sont des faits relevés et
              des versements programmés, et le « ≈ » commence à la première
              capitalisation. */}
          {start.parts.length > 1 && (
            <div className="overflow-x-auto border-t border-border pt-3">
              <table className="w-full border-collapse text-left" aria-label={projection.sourceParts}>
                <thead>
                  <tr className="t-axis">
                    <th scope="col" className="py-2 pr-3 font-normal">
                      {projection.sourceParts}
                    </th>
                    <th scope="col" className="py-2 pr-3 text-right font-normal">
                      {projection.sourcePartCapital}
                    </th>
                    {showMonthly && (
                      <th scope="col" className="py-2 text-right font-normal">
                        {projection.sourcePartMonthly}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {start.parts.map((part) => (
                    <tr key={part.supportId} className="border-t border-border">
                      <th scope="row" className="t-body py-2 pr-3 font-normal">
                        {part.label}
                      </th>
                      <td className="t-num-body tnum py-2 pr-3 text-right whitespace-nowrap">
                        {/* Un support sans relevé n'a pas de capital, et ce
                            n'est pas zéro : le tiret le dit, comme partout. */}
                        {part.capital === null ? NO_VALUE : money(part.capital)}
                      </td>
                      {showMonthly && (
                        <td className="t-num-body tnum py-2 text-right whitespace-nowrap">
                          {tpl(projection.perMonth, money(part.monthly))}
                        </td>
                      )}
                    </tr>
                  ))}
                  <tr className="border-t border-border">
                    <th scope="row" className="t-body py-2 pr-3 font-normal">
                      {projection.sourcePartTotal}
                    </th>
                    <td className="t-num-body tnum py-2 pr-3 text-right whitespace-nowrap">
                      {start.capital === null ? NO_VALUE : money(start.capital)}
                    </td>
                    {showMonthly && (
                      <td className="t-num-body tnum py-2 text-right whitespace-nowrap">
                        {tpl(projection.perMonth, money(start.monthly))}
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <p className="t-label">{projection.sourceNote}</p>
          <p className="t-label">{projection.sourceNoRate}</p>

          <Button variant="secondary" size="sm" className="w-fit" onClick={onDetach}>
            {projection.sourceEdit}
          </Button>
        </div>
      )}
    </div>
  )
}
