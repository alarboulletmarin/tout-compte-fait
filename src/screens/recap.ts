import type { Split } from '../domain/split'
import type { Messages } from '../i18n/fr'

/** Récap en texte brut, prêt à partager ou copier. */
export function recapText(
  t: Messages,
  names: readonly [string, string],
  split: Split,
  euros: (cents: number) => string,
): string {
  const lines = [t.recap.heading]
  const r = split.reimbursement
  if (!r) {
    lines.push(t.recap.toJoint(names[0], euros(split.toJoint[0])))
    lines.push(t.recap.toJoint(names[1], euros(split.toJoint[1])))
  } else {
    lines.push(t.recap.nothing(names[r.to]))
    lines.push(
      split.joint > 0
        ? t.recap.both(names[r.from], euros(split.joint), names[r.to], euros(r.amount))
        : t.recap.direct(names[r.from], names[r.to], euros(r.amount)),
    )
  }
  lines.push(t.recap.total(euros(split.joint)))
  return lines.join('\n')
}
