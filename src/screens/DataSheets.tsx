import { useRef, useState } from 'react'
import { useLocation } from 'wouter'
import { useI18n } from '../i18n/i18n'
import { downloadExport } from '../storage/files'
import { useStore } from '../storage/store'
import { parseExport, type ExportFile } from '../storage/transfer'
import { FileIcon, WarningIcon } from '../ui/icons'
import { Sheet } from '../ui/Sheet'
import { useToast } from '../ui/Toast'

type ImportState = { kind: 'confirm'; file: ExportFile; name: string } | { kind: 'error' } | null

/**
 * Import d'un export : lecture et validation d'abord, puis confirmation
 * (sauf au premier lancement, où il n'y a rien à remplacer) ou « Import impossible ».
 * Renvoie l'action qui ouvre le sélecteur et les éléments à afficher.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useImportFlow({ confirm }: { confirm: boolean }) {
  const { t } = useI18n()
  const { update } = useStore()
  const [, navigate] = useLocation()
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<ImportState>(null)

  function pick() {
    setState(null)
    if (!input.current) return
    // Rechoisir le même fichier doit redéclencher la lecture
    input.current.value = ''
    input.current.click()
  }

  async function load(file: File | undefined) {
    if (!file) return
    const result = parseExport(await file.text())
    if (!result.ok) return setState({ kind: 'error' })
    if (confirm) setState({ kind: 'confirm', file: result.file, name: file.name })
    else replace(result.file)
  }

  function replace(file: ExportFile) {
    update(() => file.data)
    setState(null)
    navigate('/', { replace: true })
    toast({ message: t.importSheet.replaced })
  }

  const element = (
    <>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => load(e.target.files?.[0])}
      />
      {state?.kind === 'confirm' && (
        <ConfirmSheet
          file={state.file}
          name={state.name}
          onReplace={() => replace(state.file)}
          onClose={() => setState(null)}
        />
      )}
      {state?.kind === 'error' && <ErrorSheet onRetry={pick} onClose={() => setState(null)} />}
    </>
  )

  return { pick, element }
}

function ConfirmSheet(props: {
  file: ExportFile
  name: string
  onReplace: () => void
  onClose: () => void
}) {
  const { t, locale } = useI18n()
  const { data } = useStore()
  const { household, charges } = props.file.data
  const names = household.members.map((m, i) => m.name.trim() || t.memberFallback(i))
  const date = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' }).format(
    new Date(props.file.exportedAt),
  )

  return (
    <Sheet open onClose={props.onClose} labelledBy="import-title">
      <h2 id="import-title" className="sheet__title">
        {t.importSheet.title}
      </h2>
      <div className="file-card">
        <FileIcon />
        <div className="file-card__text">
          <span className="num file-card__name">{props.name}</span>
          <span className="file-card__meta">
            {t.importSheet.summary(date, t.chargesCount(charges.length), names)}
          </span>
        </div>
      </div>
      <p className="sheet__text">{t.importSheet.warning}</p>
      <div className="stack stack--8">
        <button type="button" className="button button--primary" onClick={props.onReplace}>
          {t.importSheet.replace}
        </button>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => downloadExport(data)}
        >
          {t.importSheet.exportFirst}
        </button>
        <button type="button" className="button-plain" onClick={props.onClose} data-autofocus>
          {t.importSheet.cancel}
        </button>
      </div>
    </Sheet>
  )
}

function ErrorSheet(props: { onRetry: () => void; onClose: () => void }) {
  const { t } = useI18n()
  return (
    <Sheet open onClose={props.onClose} labelledBy="import-error-title">
      <h2 id="import-error-title" className="sheet__title">
        {t.importSheet.errorTitle}
      </h2>
      <div className="sheet__error">
        <WarningIcon />
        <p>{t.errors.importFailed}</p>
      </div>
      <p className="sheet__text">{t.importSheet.errorKept}</p>
      <div className="stack stack--8">
        <button type="button" className="button button--primary" onClick={props.onRetry}>
          {t.importSheet.another}
        </button>
        <button type="button" className="button-plain" onClick={props.onClose}>
          {t.importSheet.close}
        </button>
      </div>
    </Sheet>
  )
}

export function EraseSheet(props: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const { data, reset } = useStore()
  const [, navigate] = useLocation()

  async function erase() {
    await reset()
    navigate('/', { replace: true })
  }

  return (
    <Sheet open={props.open} onClose={props.onClose} labelledBy="erase-title">
      <h2 id="erase-title" className="sheet__title">
        {t.eraseSheet.title}
      </h2>
      <p className="sheet__text">{t.eraseSheet.text(t.eraseSheet.charges(data.charges.length))}</p>
      <div className="stack stack--8">
        <button
          type="button"
          className="button button--secondary"
          onClick={() => downloadExport(data)}
        >
          {t.importSheet.exportFirst}
        </button>
        <button type="button" className="button button--danger" onClick={erase}>
          {t.eraseSheet.confirm}
        </button>
        <button type="button" className="button-plain" onClick={props.onClose} data-autofocus>
          {t.importSheet.cancel}
        </button>
      </div>
    </Sheet>
  )
}
