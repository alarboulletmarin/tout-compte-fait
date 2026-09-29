import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n/i18n'
import { useStore } from '../storage/store'
import { encodeFrames, Receiver } from '../storage/sync'
import type { ExportFile } from '../storage/transfer'
import { WarningIcon } from '../ui/icons'
import type { QrImage } from '../ui/qr'
import { Sheet } from '../ui/Sheet'
import { useQrScanner } from '../ui/useQrScanner'
import { useWakeLock } from '../ui/useWakeLock'

/** Quatre images par seconde : lisible par une caméra, et sous le seuil des scintillements gênants. */
const FRAME_MS = 250

/** Appareil « parent » : montre les données en code QR animé, que l'autre appareil filme. */
export function SendSheet(props: { onClose: () => void }) {
  const { t } = useI18n()
  const { data } = useStore()
  const [images, setImages] = useState<QrImage[] | 'failed' | null>(null)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  useWakeLock(true)

  useEffect(() => {
    let active = true
    // Le générateur de QR n'est chargé qu'à l'ouverture de cette feuille
    Promise.all([encodeFrames(data), import('../ui/qr')]).then(
      ([frames, { qrImages }]) => active && setImages(qrImages(frames)),
      () => active && setImages('failed'),
    )
    return () => {
      active = false
    }
  }, [data])

  const count = Array.isArray(images) ? images.length : 0
  useEffect(() => {
    if (count < 2 || paused) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), FRAME_MS)
    return () => clearInterval(timer)
  }, [count, paused])

  const image = Array.isArray(images) ? images[index % count] : undefined

  return (
    <Sheet open onClose={props.onClose} labelledBy="send-title">
      <h2 id="send-title" className="sheet__title">
        {t.sync.sendTitle}
      </h2>
      <ol className="sync__steps">
        {t.sync.sendSteps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {image ? (
        <>
          <div className="qr" role="img" aria-label={t.sync.qrLabel(index + 1, count)}>
            <svg viewBox={`0 0 ${image.size} ${image.size}`} shapeRendering="crispEdges">
              <path d={image.path} />
            </svg>
          </div>
          <div className="sync__meter">
            <span className="num" aria-hidden="true">
              {t.sync.frame(index + 1, count)}
            </span>
            {count > 1 && (
              <button
                type="button"
                className="button-plain"
                aria-pressed={paused}
                onClick={() => setPaused((p) => !p)}
              >
                {paused ? t.sync.resume : t.sync.pause}
              </button>
            )}
          </div>
        </>
      ) : images === 'failed' ? (
        <div className="sheet__error">
          <WarningIcon />
          <p>{t.sync.sendFailed}</p>
        </div>
      ) : (
        <p className="sheet__text" role="status">
          {t.sync.preparing}
        </p>
      )}
      <p className="sheet__text">{t.sync.local}</p>
      <button type="button" className="button button--primary" onClick={props.onClose}>
        {t.sync.done}
      </button>
    </Sheet>
  )
}

interface Progress {
  got: number
  count: number
  have: readonly boolean[]
}

/** Appareil « enfant » : filme le code de l'autre appareil, puis rend les données reçues. */
export function ReceiveSheet(props: {
  onClose: () => void
  onReceived: (file: ExportFile) => void
}) {
  const { t } = useI18n()
  const video = useRef<HTMLVideoElement>(null)
  const [receiver, setReceiver] = useState(() => new Receiver())
  const [progress, setProgress] = useState<Progress | null>(null)
  const [failure, setFailure] = useState<'invalid' | 'newer' | null>(null)
  useWakeLock(true)

  const { onReceived } = props
  const status = useQrScanner(video, failure === null, async (text) => {
    const result = await receiver.accept(text)
    if (result.kind === 'progress') setProgress(result)
    else if (result.kind === 'done') onReceived(result.file)
    else if (result.kind === 'failed') setFailure(result.reason)
  })

  function retry() {
    setReceiver(new Receiver())
    setProgress(null)
    setFailure(null)
  }

  const problem =
    failure === 'newer'
      ? t.sync.newer
      : failure === 'invalid'
        ? t.sync.invalid
        : status === 'denied'
          ? t.sync.denied
          : status === 'unavailable'
            ? t.sync.unavailable
            : null

  return (
    <Sheet open onClose={props.onClose} labelledBy="receive-title">
      <h2 id="receive-title" className="sheet__title">
        {t.sync.receiveTitle}
      </h2>
      <p className="sheet__text">{t.sync.receiveSteps}</p>
      {problem ? (
        <>
          <div className="sheet__error" role="alert">
            <WarningIcon />
            <p>{problem}</p>
          </div>
          <div className="stack stack--8">
            {failure && (
              <button type="button" className="button button--primary" onClick={retry}>
                {t.sync.retry}
              </button>
            )}
            <button type="button" className="button-plain" onClick={props.onClose} data-autofocus>
              {t.sync.close}
            </button>
          </div>
        </>
      ) : (
        <>
          <video
            ref={video}
            className="scanner"
            aria-label={t.sync.camera}
            playsInline
            muted
            autoPlay
          />
          {progress ? (
            <div
              className="sync__meter sync__meter--column"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={progress.count}
              aria-valuenow={progress.got}
              aria-valuetext={t.sync.progress(progress.got, progress.count)}
            >
              <span className="num">{t.sync.progress(progress.got, progress.count)}</span>
              <span className="sync__cells" aria-hidden="true">
                {progress.have.map((have, i) => (
                  <span key={i} className={have ? 'sync__cell sync__cell--on' : 'sync__cell'} />
                ))}
              </span>
            </div>
          ) : (
            <p className="sheet__text" role="status">
              {status === 'scanning' ? t.sync.aim : t.sync.starting}
            </p>
          )}
          <button type="button" className="button-plain" onClick={props.onClose} data-autofocus>
            {t.sync.close}
          </button>
        </>
      )}
    </Sheet>
  )
}
