import { creditors, debtors, type Split } from '../domain/split'
import type { Messages } from '../i18n/fr'
import { at } from '../domain/at'

/** Récap en texte brut, prêt à partager ou copier. */
export function recapText(
  t: Messages,
  names: readonly string[],
  split: Split,
  euros: (cents: number) => string,
): string {
  const lines = [t.recap.heading]
  // Les créditeurs d'abord, comme sur l'écran des virements
  for (const i of [...creditors(split), ...debtors(split)]) {
    const parts: string[] = []
    // Le joint, sauf pour qui n'y vire rien quand d'autres se remboursent entre eux
    if (at(split.toJoint, i) > 0 || split.reimbursements.length === 0) {
      parts.push(t.recap.onJoint(euros(at(split.toJoint, i))))
    }
    for (const r of split.reimbursements) {
      if (r.from === i) parts.push(t.recap.toPerson(euros(r.amount), names[r.to] ?? ''))
    }
    lines.push(t.recap.line(names[i] ?? '', parts.length > 0 ? parts.join(' + ') : t.recap.nothing))
  }
  lines.push(t.recap.total(euros(split.joint)))
  return lines.join('\n')
}
