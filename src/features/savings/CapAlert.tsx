import type { CapNotice } from '@/features/operations/useOperationForm'
import { formatDate, formatMoney, tpl } from '@/i18n/format'
import { t } from '@/i18n/strings'
import { Button } from '@/ui/Button'
import { useCurrency } from '@/ui/currency'
import { type Money, ZERO } from '@/domain/money'

/**
 * Ce que le plafond d'un support dit d'un versement qu'on est en train de
 * saisir — et, quand il le dépasse, les deux seules façons d'aller plus loin.
 *
 * **Pourquoi ce n'est pas un message d'erreur sous le champ.** Une erreur se
 * corrige : on retape, elle disparaît. Un dépassement de plafond ne se corrige
 * pas, il se tranche — soit on verse ce qui reste, soit on verse quand même
 * parce que la banque, elle, a accepté. Un texte rouge sans geste laisserait
 * exactement la situation qu'il dénonce : quelqu'un qui insiste et qui passe.
 *
 * **Et pourquoi « Verser quand même » existe.** La place que l'app calcule est
 * sous-estimée par construction — le plafond porte sur les versements cumulés
 * depuis l'ouverture, l'app ne connaît que le capital, intérêts acquis compris
 * (cahier §4.6 bis). Un refus sans issue finirait donc par refuser un versement
 * réel, et le premier réflexe devant un refus injustifié est d'effacer le
 * plafond : on aurait protégé le chiffre en perdant l'information. L'app arrête
 * la main, chiffre le dépassement, et laisse trancher.
 *
 * En rouge, et c'est le seul endroit de l'épargne qui y a droit : le DS §2.3
 * réserve l'alerte aux dépassements, et c'en est un — à la différence d'un
 * relevé qui vieillit, qui n'est pas une erreur.
 */
export function CapAlert({
  cap,
  onClip,
  onAccept,
}: {
  cap: CapNotice
  /** Ramener le montant à la place restante. */
  onClip: () => void
  /** Assumer le dépassement et laisser passer l'enregistrement. */
  onAccept: () => void
}) {
  const currency = useCurrency()
  /* Un plafond est un nombre écrit dans un contrat : il s'écrit exact, comme
     sur la fiche du support. */
  const exact = (value: Money): string => formatMoney(value, currency, false)

  if (cap.excess === null) return <CapForecast cap={cap} />

  const { cap: ceiling, room, over } = cap.excess
  const full = room <= ZERO

  return (
    <div
      role="alert"
      className="flex flex-col gap-2 rounded-inner border border-danger bg-surface-2 p-3"
    >
      <p className="t-body font-semibold text-danger-text">
        {full ? tpl(t.savings.capReached, exact(ceiling)) : tpl(t.savings.capOver, exact(over))}
      </p>
      <p className="t-label">
        {full
          ? tpl(t.savings.capNoRoomBody, exact(over))
          : tpl(t.savings.capRoomBody, exact(room), exact(ceiling))}
      </p>

      {cap.blocking ? (
        <>
          {/* L'aide dit pourquoi le second bouton existe, sinon « verser quand
              même » se lit comme une invitation à ignorer l'app. */}
          <p className="t-label">{t.savings.capApproximate}</p>
          <div className="flex flex-wrap gap-2">
            {!full && (
              <Button type="button" variant="secondary" size="sm" onClick={onClip}>
                {tpl(t.savings.capClip, exact(room))}
              </Button>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={onAccept}>
              {t.savings.capAnyway}
            </Button>
          </div>
        </>
      ) : (
        // Une fois assumé, l'encadré reste : il dit ce qui va être enregistré,
        // et le retirer ferait disparaître le chiffre au moment de valider.
        <p className="t-label">{tpl(t.savings.capAccepted, exact(over))}</p>
      )}
    </div>
  )
}

/**
 * Ce qu'une règle fera du plafond — une annonce, jamais un refus.
 *
 * Poser un versement mensuel qui finira par remplir un livret n'a rien de
 * fautif : c'est le geste normal, et la seule chose qui manquait à l'écran
 * était de dire **quand**. Sans couleur, donc, et sans bouton : il n'y a rien à
 * trancher tant que la place est là.
 */
function CapForecast({ cap }: { cap: CapNotice }) {
  const currency = useCurrency()
  const exact = (value: Money): string => formatMoney(value, currency, false)

  if (cap.fill === null || cap.state.kind !== 'room') return null
  const ceiling = exact(cap.state.cap)

  if (cap.fill.dues === 0) return <p className="t-label">{tpl(t.savings.capFillNone, ceiling)}</p>

  return (
    <p className="t-label">
      {cap.fill.dues === 1
        ? tpl(t.savings.capFillOne, ceiling, formatDate(cap.fill.date))
        : tpl(t.savings.capFillMany, ceiling, formatDate(cap.fill.date), cap.fill.dues)}
      {cap.fill.clipped ? ` ${t.savings.capFillClipped}` : ''}
    </p>
  )
}
