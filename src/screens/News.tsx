import changelogEn from '../../CHANGELOG.en.md?raw'
import changelogFr from '../../CHANGELOG.md?raw'
import { parseChangelog } from '../i18n/changelog'
import { useI18n } from '../i18n/i18n'
import { SubScreen } from '../ui/Screens'

const releases = { 'fr-FR': parseChangelog(changelogFr), 'en-GB': parseChangelog(changelogEn) }

export function News() {
  const { t, locale } = useI18n()
  return (
    <SubScreen title={t.news.title} back="/settings" backLabel={t.news.back} className="news">
      {releases[locale].map((release) => (
        <section key={release.version} className="release" aria-labelledby={`v-${release.version}`}>
          <div className="between between--baseline">
            <h2 id={`v-${release.version}`} className="num release__version">
              {release.version}
            </h2>
            <span className="release__date">{release.date}</span>
          </div>
          <ul className="release__items">
            {release.items.map((item) => (
              <li key={item}>
                <span className="release__bullet" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </SubScreen>
  )
}
