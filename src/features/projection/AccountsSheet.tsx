/* ============================================================================
 * Les comptes qu'on simule, et ce que le document sait de chacun.
 *
 * **C'est la feuille qui remplace le « point de départ ».** L'écran demandait
 * d'où partir — une simulation libre, un support, toute l'épargne d'une
 * personne —, ce qui posait trois questions pour une : *quels comptes*. Une
 * liste de cases y répond une fois, et elle répond mieux : deux comptes sur cinq
 * n'étaient exprimables par aucune des trois origines.
 *
 * **Chaque case porte ce qu'elle vaut**, et c'est ce qui rend la lecture
 * unitaire possible sans quitter l'écran : le capital d'où le compte part, ce
 * qu'il vaut à l'arrivée, et ce qui manque au calcul — un compte sans relevé,
 * une règle qui s'arrête, un plafond déjà atteint. Cocher un seul compte fait de
 * tout l'écran la trajectoire de ce compte-là.
 *
 * **Rien ne descend dans le document.** Cocher un compte ne le modifie pas, et
 * la feuille le dit en tête : ce qui se règle ici vit dans `localStorage`.
 * ==========================================================================*/

import type { Money } from '@/domain/money'
import type { ProjectionPart } from '@/domain/projectionStart'
import { formatMoney, formatRoundedMoney, tpl } from '@/i18n/format'
import { projection } from '@/i18n/projection'
import { Button } from '@/ui/Button'
import { Checkbox } from '@/ui/Field'
import { Sheet } from '@/ui/Sheet'
import { useCurrency } from '@/ui/currency'
import type { SupportRun } from './model'

export type AccountsSheetProps = {
  open: boolean
  onClose: () => void
  parts: readonly ProjectionPart[]
  /** Les comptes cochés. `null` : tous, parce que personne n'a encore choisi. */
  picked: readonly string[] | null
  onPick: (ids: string[]) => void
  /** Les trajectoires calculées, pour dire à chaque compte où il arrive. */
  runs: readonly SupportRun[]
}

export function AccountsSheet({ open, onClose, parts, picked, onPick, runs }: AccountsSheetProps) {
  const currency = useCurrency()
  const money = (value: Money): string => formatRoundedMoney(value, currency)
  /* Ce qui **entre** dans le calcul s'écrit exactement, et sans « ≈ » : un
     capital relevé est un fait, et l'arrondi du modèle ne s'applique qu'à ce qui
     en sort. */
  const exact = (value: Money): string => formatMoney(value, currency, false)
  const isPicked = (id: string): boolean => picked === null || picked.includes(id)
  const all = parts.every((part) => isPicked(part.supportId))

  const toggle = (id: string, next: boolean): void => {
    const current = parts.filter((part) => isPicked(part.supportId)).map((part) => part.supportId)
    onPick(next ? [...current, id] : current.filter((one) => one !== id))
  }

  return (
    <Sheet open={open} onClose={onClose} title={projection.accounts} pullToClose>
      <div className="flex flex-col gap-4">
        <p className="t-label">{projection.accountsHint}</p>

        {parts.length > 1 && (
          <Button
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={() => {
              onPick(all ? [] : parts.map((part) => part.supportId))
            }}
          >
            {all ? projection.accountNone : projection.accountAll}
          </Button>
        )}

        <ul className="flex flex-col">
          {parts.map((part, index) => {
            const run = runs.find((one) => one.supportId === part.supportId)
            return (
              <li
                key={part.supportId}
                /* Un filet entre deux comptes, jamais avant le premier : la
                   règle de `RowGroup`, et une feuille n'en a pas d'autre. */
                className={index === 0 ? 'py-2' : 'border-t border-border py-2'}
              >
                <Checkbox
                  checked={isPicked(part.supportId)}
                  onChange={(next) => {
                    toggle(part.supportId, next)
                  }}
                  label={part.label}
                />
                <div className="flex flex-col gap-1 pl-9">
                  {/* Où il part, et où il arrive. Les deux ensemble, parce que
                      c'est l'écart entre eux qu'on vient chercher. */}
                  <p className="t-label">
                    {part.capital === null ? projection.accountNoValue : exact(part.capital)}
                    {run !== undefined &&
                      ` · ${
                        run.arrival.low === run.arrival.high
                          ? tpl(projection.accountArrival, money(run.arrival.low))
                          : tpl(
                              projection.accountArrivalRange,
                              money(run.arrival.low),
                              money(run.arrival.high),
                            )
                      }`}
                  </p>

                  {/* D'où sort le versement proposé. Un montant repris sans sa
                      provenance est un montant qu'il faut croire sur parole. */}
                  {part.rules > 0 && (
                    <p className="t-label">
                      {part.rules === 1
                        ? projection.accountRulesOne
                        : tpl(projection.accountRules, part.rules)}
                    </p>
                  )}
                  {part.ending > 0 && (
                    <p className="t-label">
                      {part.ending === 1
                        ? projection.accountEndingOne
                        : tpl(projection.accountEnding, part.ending)}
                    </p>
                  )}
                  {part.variable && <p className="t-label">{projection.accountVariable}</p>}

                  {/* Le plafond du contrat : sur ce qui est versé, jamais sur le
                      solde. Il ne s'annonce que là où il existe. */}
                  {part.cap !== null && (
                    <p className="t-label">
                      {part.room === null || part.room > 0
                        ? tpl(projection.accountCap, exact(part.cap), exact(part.room ?? part.cap))
                        : tpl(projection.accountCapFull, exact(part.cap))}
                    </p>
                  )}
                  {run?.capped === true && (
                    <p className="t-label">{projection.accountCapped}</p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>

        {/* D'où sortent les capitaux, une fois pour toute la feuille : un
            montant repris sans sa provenance est un montant qu'il faut croire
            sur parole. Une ligne par compte l'aurait répété cinq fois. */}
        <p className="t-label border-t border-border pt-3">{projection.accountFrom}</p>
        {parts.some((part) => part.cap !== null) && (
          <p className="t-label">{projection.capNote}</p>
        )}
      </div>
    </Sheet>
  )
}
