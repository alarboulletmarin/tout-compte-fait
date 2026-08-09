import { useRef, useState } from 'react'
import { t } from '@/i18n/strings'
import { ImportError, type MigrationResult, parseImport } from '@/persistence/transfer'
import { useStore } from '@/store/store'
import { Button, type ButtonVariant } from '@/ui/Button'
import { ConfirmDialog } from '@/ui/ConfirmDialog'
import { toast } from '@/ui/toast'
import { ImportReport } from './ImportReport'

/**
 * Choisir un fichier, le relire, puis confirmer — le geste du cahier §4.8.
 *
 * Le composant vit à part pour être posé aussi bien dans les réglages qu'au
 * premier lancement : quelqu'un qui restaure une sauvegarde sur un nouvel
 * appareil arrive sur l'onboarding, et devait jusqu'ici inventer un foyer
 * avant de pouvoir remplacer ce qu'il venait de créer.
 *
 * Le fichier est lu et validé d'abord : on ne demande de confirmer qu'un import
 * viable, jamais un fichier qui échouera ensuite.
 */
export function ImportControl({
  variant = 'secondary',
  className,
}: {
  variant?: ButtonVariant
  className?: string
}) {
  const replaceData = useStore((s) => s.replaceData)
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<MigrationResult | null>(null)

  const stage = async (file: File): Promise<void> => {
    try {
      setPending(parseImport(await file.text()))
    } catch (error) {
      toast(error instanceof ImportError ? error.message : t.settings.importHint, 'danger')
    }
  }

  return (
    <>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void stage(file)
        }}
      />
      <Button
        variant={variant}
        {...(className === undefined ? {} : { className })}
        onClick={() => {
          fileInput.current?.click()
        }}
      >
        {t.settings.import}
      </Button>

      {/* Deux pas : un import est un effacement déguisé — le fichier arrive,
          tout le reste part —, sans aller jusqu'aux trois de la
          réinitialisation, puisqu'il reste quelque chose après.

          Le rapport est là, sous la question, parce que c'est le dernier
          moment où il sert à quelque chose : après, il n'y a plus rien à quoi
          comparer ce qui manque. */}
      <ConfirmDialog
        open={pending !== null}
        title={t.settings.import}
        steps={[
          { question: t.settings.importConfirm, action: t.common.confirm },
          { question: t.settings.importConfirm2, action: t.settings.import },
        ]}
        details={pending === null ? undefined : <ImportReport notices={pending.notices} />}
        onCancel={() => {
          setPending(null)
        }}
        onConfirm={() => {
          if (pending === null) return
          void replaceData(pending.data)
            .then(() => {
              setPending(null)
              toast(pending.migrated ? t.settings.importMigrated : t.settings.imported)
            })
            // Sans ce filet, un échec d'écriture laissait le toast de réussite
            // s'afficher quand même : on annonçait comme rangé ce qui n'était
            // nulle part.
            .catch(() => {
              setPending(null)
              toast(t.settings.importFailed, 'danger')
            })
        }}
      />
    </>
  )
}
