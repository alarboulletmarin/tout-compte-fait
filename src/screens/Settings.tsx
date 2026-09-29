import { useState, type ReactNode } from 'react'
import { Link } from 'wouter'
import { LOCALES } from '../i18n/format'
import { useI18n } from '../i18n/i18n'
import { downloadExport, shareExport } from '../storage/files'
import { readPref, THEMES, writePref, type Theme } from '../storage/prefs'
import { useStore } from '../storage/store'
import { syncSupported } from '../storage/sync'
import { TabScreen } from '../ui/Screens'
import { HAPTICS, hapticsSupported, tap } from '../ui/haptics'
import { switchTheme } from '../ui/theme'
import { useToast } from '../ui/Toast'
import { EraseSheet, useImportFlow } from './DataSheets'
import { ReceiveSheet, SendSheet } from './SyncSheets'

const REPOSITORY = 'https://github.com/alarboulletmarin/tout-compte-fait'
const LICENCE = `${REPOSITORY}/blob/main/LICENSE`
const LANGUAGE_NAMES = { 'fr-FR': 'Français', 'en-GB': 'English' } as const

export function Settings() {
  const { t, locale, setLocale } = useI18n()
  const { data } = useStore()
  const toast = useToast()
  const [theme, setTheme] = useState(() => readPref('theme', THEMES, 'system'))
  const [haptics, setHaptics] = useState(() => readPref('haptics', HAPTICS, 'on'))
  const [erasing, setErasing] = useState(false)
  const [sync, setSync] = useState<'send' | 'receive' | null>(null)
  const importFlow = useImportFlow({ confirm: true })

  function chooseTheme(next: Theme, button: HTMLElement) {
    setTheme(next)
    writePref('theme', next)
    // Le cercle part du bouton touché (son centre : même chose au clavier)
    const box = button.getBoundingClientRect()
    switchTheme(next, { x: box.left + box.width / 2, y: box.top + box.height / 2 })
  }

  function toggleHaptics() {
    const next = haptics === 'on' ? 'off' : 'on'
    setHaptics(next)
    writePref('haptics', next)
    if (next === 'on') tap()
  }

  function exportData() {
    downloadExport(data)
    toast({ message: t.settings.exported })
  }

  async function sendTo() {
    // Sans partage de fichier, on s'est rabattu sur le téléchargement
    if (!(await shareExport(data))) toast({ message: t.settings.exported })
  }

  return (
    <TabScreen title={t.nav.settings} kicker={t.settings.kicker} className="settings">
      <h1 className="visually-hidden">{t.nav.settings}</h1>
      <Section id="theme" title={t.settings.theme}>
        <div className="segmented segmented--padded">
          {THEMES.map((value) => (
            <button
              key={value}
              type="button"
              className="segment"
              aria-pressed={theme === value}
              onClick={(event) => chooseTheme(value, event.currentTarget)}
            >
              {t.settings.themes[value]}
            </button>
          ))}
        </div>
      </Section>

      <Section id="language" title={t.settings.language}>
        <div className="segmented segmented--padded">
          {LOCALES.map((value) => (
            <button
              key={value}
              type="button"
              className="segment"
              lang={value.slice(0, 2)}
              aria-pressed={locale === value}
              onClick={() => setLocale(value)}
            >
              {LANGUAGE_NAMES[value]}
            </button>
          ))}
        </div>
      </Section>

      {hapticsSupported() && (
        <Section id="haptics" title={t.settings.haptics}>
          <button
            type="button"
            role="switch"
            aria-checked={haptics === 'on'}
            className="group__row"
            onClick={toggleHaptics}
          >
            <span>{t.settings.hapticsLabel}</span>
            <span className="group__value">
              {haptics === 'on' ? t.settings.on : t.settings.off}
            </span>
          </button>
        </Section>
      )}

      <Section id="organisation" title={t.settings.organisation}>
        <Link href="/settings/categories" className="group__row">
          <span>{t.settings.categories}</span>
          <span className="group__value">{data.categories.length}</span>
        </Link>
      </Section>

      <Section id="data" title={t.settings.data}>
        <button type="button" className="group__row" onClick={exportData}>
          <span>{t.settings.export}</span>
          <span className="group__value">{t.settings.exportHint}</span>
        </button>
        <button type="button" className="group__row" onClick={importFlow.pick}>
          <span>{t.settings.import}</span>
        </button>
        <button type="button" className="group__row" onClick={sendTo}>
          <span>{t.settings.sendTo}</span>
        </button>
        <button
          type="button"
          className="group__row group__row--danger"
          onClick={() => setErasing(true)}
        >
          <span>{t.settings.erase}</span>
        </button>
      </Section>

      {syncSupported() && (
        <Section id="device" title={t.sync.section}>
          <button type="button" className="group__row" onClick={() => setSync('send')}>
            <span>{t.sync.send}</span>
            <span className="group__value">{t.sync.sendHint}</span>
          </button>
          <button type="button" className="group__row" onClick={() => setSync('receive')}>
            <span>{t.sync.receive}</span>
            <span className="group__value">{t.sync.receiveHint}</span>
          </button>
        </Section>
      )}

      <Section id="about" title={t.settings.about}>
        <Link href="/settings/news" className="group__row">
          <span>{t.settings.news}</span>
          <span className="group__value">v{__APP_VERSION__}</span>
        </Link>
        <ExternalRow href={REPOSITORY} label={t.settings.source} value="GitHub" />
        <ExternalRow href={LICENCE} label={t.settings.licence} value="AGPL-3.0" />
      </Section>

      <p className="settings__promise">{t.settings.promise}</p>

      {importFlow.element}
      {sync === 'send' && <SendSheet onClose={() => setSync(null)} />}
      {sync === 'receive' && (
        <ReceiveSheet
          onClose={() => setSync(null)}
          onReceived={(file) => {
            setSync(null)
            importFlow.propose(file, t.sync.deviceName, true)
          }}
        />
      )}
      <EraseSheet open={erasing} onClose={() => setErasing(false)} />
    </TabScreen>
  )
}

function Section(props: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="stack stack--8" aria-labelledby={`settings-${props.id}`}>
      <h2 id={`settings-${props.id}`} className="section-title">
        {props.title}
      </h2>
      <div className="group">{props.children}</div>
    </section>
  )
}

function ExternalRow(props: { href: string; label: string; value: string }) {
  const { t } = useI18n()
  return (
    <a href={props.href} className="group__row" target="_blank" rel="noopener noreferrer">
      <span>{props.label}</span>
      <span className="group__value">
        {props.value}
        <span className="visually-hidden"> {t.settings.newTab}</span>
      </span>
    </a>
  )
}
