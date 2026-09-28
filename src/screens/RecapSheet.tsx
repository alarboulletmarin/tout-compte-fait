import { Fragment } from 'react'
import { useI18n } from '../i18n/i18n'
import { useStore } from '../storage/store'
import { ShareIcon } from '../ui/icons'
import { Sheet } from '../ui/Sheet'
import { useToast } from '../ui/Toast'
import { useNames } from './common'
import { recapText } from './recap'

// Montants du texte, pour les afficher en Martian Mono (« 1 431,29 € » ou « €1,431.29 »)
const AMOUNT = /(€\s?\d[\d,.\u00a0 ]*\d|\d[\d,.\u00a0 ]*\d\s?€)/

export function RecapSheet(props: { open: boolean; onClose: () => void }) {
  const { t, euros } = useI18n()
  const { split } = useStore()
  const names = useNames()
  const toast = useToast()
  const text = recapText(t, names, split, euros)
  const canShare = typeof navigator.share === 'function'

  async function share() {
    try {
      await navigator.share({ text })
      props.onClose()
    } catch {
      // Partage annulé : la feuille reste ouverte, « Copier » reste possible
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      toast({ message: t.recap.copied })
      props.onClose()
    } catch {
      toast({ message: t.recap.copyFailed })
    }
  }

  return (
    <Sheet open={props.open} onClose={props.onClose} labelledBy="recap-title">
      <h2 id="recap-title" className="sheet__title">
        {t.recap.title}
      </h2>
      <div className="recap">
        {text.split(AMOUNT).map((part, i) => (
          <Fragment key={i}>{i % 2 ? <span className="num">{part}</span> : part}</Fragment>
        ))}
      </div>
      <p className="sheet__text">{t.recap.hint}</p>
      <div className="stack stack--8">
        {canShare && (
          <button type="button" className="button button--primary button--icon" onClick={share}>
            <ShareIcon />
            {t.recap.share}
          </button>
        )}
        <button
          type="button"
          className={`button ${canShare ? 'button--secondary' : 'button--primary'}`}
          onClick={copy}
        >
          {t.recap.copy}
        </button>
      </div>
    </Sheet>
  )
}
