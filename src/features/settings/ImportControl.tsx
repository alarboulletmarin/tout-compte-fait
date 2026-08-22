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
      {/* Retiré de l'arbre d'accessibilité, et pas seulement caché à l'œil.
          `sr-only` ne cache qu'aux yeux : le champ restait annoncé et atteignable
          au clavier, sans nom — axe le relevait en gravité critique (WCAG 4.1.2).
          Lui donner un `aria-label` aurait fait deux entrées pour un seul geste,
          l'une nommée « Importer » et l'autre « Choisir un fichier », posées l'une
          sur l'autre. Le bouton juste dessous est le contrôle, il porte déjà son
          nom ; ceci n'est que le mécanisme qu'il déclenche. */}
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
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
              /* Et seulement si l'écriture a abouti. `replaceData` ne rejette
                 pas quand elle rate — elle allume le bandeau et pousse son
                 message rouge, puis rend normalement —, si bien que le `.catch`
                 d'en dessous ne voyait jamais ce cas-là : « Importé » s'affichait
                 en vert sur un document qui n'avait pas atteint le disque. On
                 relit donc l'état plutôt que d'attendre une exception qui ne
                 vient pas. */
              if (useStore.getState().error === null) {
                toast(pending.migrated ? t.settings.importMigrated : t.settings.imported)
              }
            })
            /* Le filet du reste : tout ce qui casse **avant** l'écriture — la
               base qu'on n'arrive pas à ouvrir, un miroir de préférences qui
               lève. Ces cas-là rejettent vraiment. */
            .catch(() => {
              setPending(null)
              toast(t.settings.importFailed, 'danger')
            })
        }}
      />
    </>
  )
}
