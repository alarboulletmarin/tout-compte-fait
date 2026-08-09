import { t } from '@/i18n/strings'
import { tpl } from '@/i18n/format'
import type { ImportNotice } from '@/persistence/validate'

/** Au-delà, la liste recouvre la question qu'elle est censée éclairer. */
const SHOWN = 6

/** « Entrée « Loyer » », ou son rang quand la ligne n'avait pas de nom. */
function subject(notice: ImportNotice): string {
  const collection = t.settings.reportCollection[notice.collection]
  return notice.label === undefined
    ? tpl(t.settings.reportRanked, collection, notice.index + 1)
    : tpl(t.settings.reportNamed, collection, notice.label)
}

function Group({ notices, title }: { notices: readonly ImportNotice[]; title: string }) {
  if (notices.length === 0) return null
  const extra = notices.length - SHOWN

  return (
    <div className="flex flex-col gap-1">
      <p className="t-label">{title}</p>
      <ul className="flex flex-col gap-0.5">
        {notices.slice(0, SHOWN).map((notice) => (
          <li key={`${notice.collection}-${String(notice.index)}-${notice.reason}`} className="t-label">
            {tpl(t.settings.reportLine, subject(notice), t.settings.reportReason[notice.reason])}
          </li>
        ))}
      </ul>
      {/* Un « et 12 de plus » vaut mieux qu'une liste tronquée sans le dire :
          le compte, lui, reste juste. */}
      {extra > 0 && <p className="t-label">{tpl(t.settings.reportMore, extra)}</p>}
    </div>
  )
}

/**
 * Ce que la lecture du fichier a écarté et réparé, dit avant qu'on confirme.
 *
 * Une entrée illisible disparaissait en silence — dans un geste qui remplace
 * tout le document, c'est-à-dire au seul moment où l'on ne peut plus comparer
 * avec ce qu'il y avait avant. Le fichier avait l'air d'être passé.
 *
 * Les deux groupes ne disent pas la même chose et ne se mélangent pas : une
 * ligne écartée n'arrivera pas, une ligne réparée arrive autrement. La première
 * demande de vérifier le fichier, la seconde de vérifier l'app une fois
 * l'import fait.
 */
export function ImportReport({ notices }: { notices: readonly ImportNotice[] }) {
  if (notices.length === 0) return null

  const discarded = notices.filter((n) => n.kind === 'discarded')
  const repaired = notices.filter((n) => n.kind === 'repaired')

  return (
    <div className="flex flex-col gap-3 rounded-input border border-border p-3">
      <Group
        notices={discarded}
        title={
          discarded.length === 1
            ? t.settings.reportDiscardedOne
            : tpl(t.settings.reportDiscarded, discarded.length)
        }
      />
      <Group
        notices={repaired}
        title={
          repaired.length === 1
            ? t.settings.reportRepairedOne
            : tpl(t.settings.reportRepaired, repaired.length)
        }
      />
    </div>
  )
}
