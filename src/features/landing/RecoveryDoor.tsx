import { useState } from 'react'
import { today } from '@/domain/date'
import { t } from '@/i18n/strings'
import { download } from '@/lib/download'
import { loadRawDocument } from '@/persistence/db'
import { toRawBlob, unreadableFilename } from '@/persistence/transfer'
import { useStore } from '@/store/store'
import { Button } from '@/ui/Button'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { ImportControl } from '@/features/settings/ImportControl'
import { toast } from '@/ui/toast'

/**
 * Ce qu'on propose quand la base contient quelque chose que l'app ne sait pas
 * lire. Le docblock de `LandingDoors` promettait déjà que le message
 * d'hydratation atterrirait ici ; il n'atterrissait nulle part, et l'app
 * repartait sur l'onboarding sans un mot — la question suivante réécrivant le
 * document par-dessus celui qu'elle n'avait pas su ouvrir.
 *
 * Les quatre recours sont dans l'ordre de ce qu'ils sauvent : importer récupère
 * tout, la copie brute conserve ce qu'on ne comprend pas, recharger ne coûte
 * rien à essayer, effacer ne se défait pas.
 */
export function RecoveryDoor({ message }: { message: string }) {
  const discardUnreadable = useStore((s) => s.discardUnreadable)
  const [confirming, setConfirming] = useState(false)

  const saveRaw = async (): Promise<void> => {
    const raw = await loadRawDocument()
    if (raw === undefined || raw === null) {
      toast(t.storage.recoverRawEmpty)
      return
    }
    download(toRawBlob(raw), unreadableFilename(today()))
    toast(t.storage.recoverRawDone)
  }

  return (
    /* `div.tile` et non `<Tile>` : celui-ci ne prend pas de `role`, et une
       alerte que les lecteurs d'écran ne nomment pas n'en est pas une. */
    <div role="alert" className="tile flex flex-col gap-4 border-danger p-5 md:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="t-section text-danger-text">{t.storage.recoverTitle}</h2>
        <p className="t-body">{message}</p>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <p className="t-label">{t.storage.recoverImportHint}</p>
        <ImportControl variant="primary" className="w-fit" />
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <p className="t-label">{t.storage.recoverRawHint}</p>
        <Button
          variant="secondary"
          className="w-fit"
          onClick={() => {
            void saveRaw()
          }}
        >
          {t.storage.recoverRaw}
        </Button>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <p className="t-label">{t.storage.recoverReloadHint}</p>
        <Button
          variant="secondary"
          className="w-fit"
          onClick={() => {
            location.reload()
          }}
        >
          {t.storage.recoverReload}
        </Button>
      </div>

      {/* Deux pas, comme un import : il reste quelque chose après. Pas les trois
          de la réinitialisation, dont les questions énumèrent ce qui part —
          ici, personne ne sait ce qu'il y avait. */}
      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <p className="t-label">{t.storage.discardHint}</p>
        <Button
          variant="ghost"
          className="w-fit"
          onClick={() => {
            setConfirming(true)
          }}
        >
          {t.storage.discard}
        </Button>
        <ConfirmDialog
          open={confirming}
          title={t.storage.discard}
          steps={[
            { question: t.storage.discardConfirm1, action: t.common.confirm },
            { question: t.storage.discardConfirm2, action: t.storage.discard },
          ]}
          onCancel={() => {
            setConfirming(false)
          }}
          onConfirm={() => {
            void discardUnreadable().then(() => {
              setConfirming(false)
              toast(t.storage.discarded)
            })
          }}
        />
      </div>
    </div>
  )
}
