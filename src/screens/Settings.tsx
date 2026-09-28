import { Link } from 'wouter'
import { useI18n } from '../i18n/i18n'
import { useStore } from '../storage/store'
import { TabScreen } from '../ui/Screens'

// ponytail: seule la section Organisation ; thème, langue, données et à propos arrivent en phase 5
export function Settings() {
  const { t } = useI18n()
  const { categories } = useStore().data

  return (
    <TabScreen kicker={t.settings.kicker} className="settings">
      <section className="stack stack--8" aria-labelledby="settings-organisation">
        <h2 id="settings-organisation" className="section-title">
          {t.settings.organisation}
        </h2>
        <div className="group">
          <Link href="/settings/categories" className="group__row">
            <span>{t.settings.categories}</span>
            <span className="group__value">{categories.length}</span>
          </Link>
        </div>
      </section>
    </TabScreen>
  )
}
