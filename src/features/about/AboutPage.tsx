import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, LINK } from '@/app/AppFooter'
import { CHANGELOG_URL, DOCS_URL, LICENSE_URL, REPO_URL, THIRD_PARTY_URL, VERSION } from '@/app/meta'
import { LANDING_PATH, legalRoutes, styleguideRoute } from '@/app/routes'
import { t } from '@/i18n/strings'
import { tpl } from '@/i18n/format'
import { DataIcon, HouseholdIcon, InfoIcon, RecurrencesIcon, ShieldIcon } from '@/ui/Icons'
import { PageTitle } from '@/ui/PageTitle'
import { Tile } from '@/ui/Tile'

/**
 * Ce que l'app dit d'elle-même : ce qu'elle fait, comment elle marche, où vont
 * les données, et d'où vient le code.
 *
 * Elle ne lit jamais le statut du foyer : c'est le routeur qui décide de la
 * coquille — `AppShell` quand la navigation existe, `PlainShell` avant. Une
 * page qui doit connaître l'état de l'app pour savoir quoi afficher redevient
 * un composant de routage.
 *
 * Même gabarit que les réglages — une colonne de tuiles à `max-w-3xl` — parce
 * que c'est le gabarit de tout ce qui se lit plutôt que de se manipuler.
 */
export function AboutPage() {
  return (
    <>
      <PageTitle title={t.nav.about} />
      <div className="flex max-w-3xl flex-col gap-4">
        <Tile className="gap-3">
          <SectionHead icon={<HouseholdIcon size={18} />} title={t.about.what} />
          <p className="t-body">{t.about.whatBody}</p>
          <p className="t-body">{t.about.whatNotBank}</p>
          <p className="t-body">{t.about.whatOffline}</p>
        </Tile>

        <Tile className="gap-3">
          <SectionHead icon={<RecurrencesIcon size={18} />} title={t.about.how} />
          <ul className="flex flex-col gap-3">
            <li className="t-body">{t.about.howRecurring}</li>
            <li className="t-body">{t.about.howForecast}</li>
            <li className="t-body">{t.about.howSplit}</li>
            <li className="t-body">{t.about.howKinds}</li>
          </ul>
        </Tile>

        <Tile className="gap-3">
          <SectionHead icon={<DataIcon size={18} />} title={t.about.data} />
          <p className="t-body">{t.about.dataBody}</p>
          <p className="t-body">{t.about.dataLimit}</p>
        </Tile>

        {/* Juste après « tes données » : c'est la phrase qu'on vient de lire —
            rien ne sort de cet appareil — que ces trois pages développent, et le
            seul endroit où elles ont une chance d'être ouvertes autrement que
            par obligation. */}
        <Tile className="gap-3">
          <SectionHead icon={<ShieldIcon size={18} />} title={t.legal.notice} />
          <p className="t-body">{t.legal.aboutLead}</p>
          <div className="flex flex-wrap items-center gap-x-5">
            {legalRoutes().map((route) => (
              <Link key={route.path} to={route.path} className={LINK}>
                {route.label}
              </Link>
            ))}
          </div>
        </Tile>

        {/* Cette tuile *est* le pied de page de cet écran : elle porte déjà le
            dépôt, la licence et la version. Y ajouter l'`AppFooter` de la
            présentation les aurait dits deux fois à trois centimètres d'écart —
            sur mobile, les deux liens GitHub se retrouvaient l'un sous l'autre. */}
        <Tile className="gap-3">
          <SectionHead icon={<InfoIcon size={18} />} title={t.about.project} />
          <p className="t-body">{t.about.projectBody}</p>
          <div className="flex flex-wrap items-center gap-x-5">
            <ExternalLink href={REPO_URL}>{t.about.repo}</ExternalLink>
            <ExternalLink href={LICENSE_URL}>{t.about.license}</ExternalLink>
            {/* Les fontes sont sous OFL 1.1, qui demande d'être distribuée avec
                elles : ce lien n'est pas un ornement, c'est ce qui rend la
                distribution conforme. Il mène au fichier servi avec l'app, et
                non à une page qui le décrirait. */}
            <ExternalLink href={THIRD_PARTY_URL}>{t.legal.thirdParty}</ExternalLink>
            {/* Le styleguide est ici et nulle part ailleurs côté utilisateur :
                c'est un livrable de conception, et son lecteur est celui qui
                vient de lire que le code est ouvert — pas celui qui arrive sur
                la présentation pour savoir ce que fait l'app. */}
            <Link to={styleguideRoute().path} className={LINK}>
              {styleguideRoute().label}
            </Link>
            <ExternalLink href={DOCS_URL}>{t.about.docs}</ExternalLink>
            <Link to={LANDING_PATH} className={LINK}>
              {t.about.seeLanding}
            </Link>
          </div>
          {/* La version ne disait pas ce qu'elle apporte. Elle mène désormais au
              journal, qui le dit — c'est aussi ce que demande `UpdatePrompt`
              quand il propose de recharger. */}
          <div className="flex flex-wrap items-center gap-x-5">
            <p className="t-axis text-muted">{tpl(t.about.version, VERSION)}</p>
            <ExternalLink href={CHANGELOG_URL}>{t.about.changelog}</ExternalLink>
          </div>
        </Tile>
      </div>
    </>
  )
}

/** L'en-tête d'une section : un glyphe de repère et un titre, jamais un eyebrow
 *  — ces tuiles portent du texte suivi, pas un chiffre à étiqueter (DS §6). */
function SectionHead({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <h2 className="t-section flex items-center gap-2">
      {icon}
      {title}
    </h2>
  )
}
