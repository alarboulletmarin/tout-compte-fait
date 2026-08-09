import { useState } from 'react'
import { today } from '@/domain/date'
import { t } from '@/i18n/strings'
import { download } from '@/lib/download'
import { canClearAppCaches, clearAppCaches } from '@/lib/reinstall'
import { loadRawDocument } from '@/persistence/db'
import { exportFilename, toRawBlob } from '@/persistence/transfer'
import { Button } from '@/ui/Button'

/**
 * Ce qui s'affiche à la place d'un écran blanc.
 *
 * Il n'a le droit d'importer presque rien : pas de routeur — il vit au-dessus
 * du `BrowserRouter` —, pas de store, pas de coquille. N'importe lequel de ces
 * modules peut être ce qui vient de casser, et un écran de secours qui plante
 * n'est pas un écran de secours.
 *
 * L'export lit **les octets du disque**, jamais `useStore.getState().data` : au
 * moment d'un crash, le document en mémoire est le suspect, et il n'y a aucune
 * raison de faire passer un sauvetage par `migrateDocument`, qui peut lever. Le
 * contraste avec `StorageAlert` est exact et voulu — là-bas l'écriture a
 * échoué, donc c'est le disque qui est en retard et la mémoire qui est bonne.
 *
 * Le fichier porte le nom d'un export ordinaire, parce que c'en est un : il se
 * réimporte tel quel.
 */
export function CrashScreen() {
  const [message, setMessage] = useState<string | null>(null)

  const rescue = async (): Promise<void> => {
    try {
      const raw = await loadRawDocument()
      if (raw === undefined || raw === null) {
        setMessage(t.storage.crashExportEmpty)
        return
      }
      download(toRawBlob(raw), exportFilename(today()))
      setMessage(null)
    } catch {
      setMessage(t.storage.crashExportFailed)
    }
  }

  return (
    <div
      role="alert"
      className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center gap-5 px-4 py-10"
    >
      <div className="flex flex-col gap-2">
        <span className="t-eyebrow text-muted">{t.app.name}</span>
        <h1 className="t-section">{t.storage.crashTitle}</h1>
      </div>
      <p className="t-body">{t.storage.crashBody}</p>

      <div className="flex flex-col gap-3">
        <Button
          className="w-fit"
          onClick={() => {
            void rescue()
          }}
        >
          {t.storage.crashExport}
        </Button>
        {message !== null && <p className="t-label text-danger-text">{message}</p>}
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-5">
        <Button
          variant="secondary"
          className="w-fit"
          onClick={() => {
            location.reload()
          }}
        >
          {t.storage.crashReload}
        </Button>
      </div>

      {/* Sans service worker, il n'y a rien à réinstaller — et rien à proposer :
          un bouton qui ne peut rien faire inquiète pour rien. */}
      {canClearAppCaches() && (
        <div className="flex flex-col gap-3 border-t border-border pt-5">
          <p className="t-label">{t.storage.crashCachesHint}</p>
          <Button
            variant="ghost"
            className="w-fit"
            onClick={() => {
              void clearAppCaches().then(() => {
                location.reload()
              })
            }}
          >
            {t.storage.crashCaches}
          </Button>
        </div>
      )}
    </div>
  )
}
