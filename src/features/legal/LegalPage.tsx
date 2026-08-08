import { Link } from 'react-router-dom'
import { ExternalLink, LINK } from '@/app/AppFooter'
import { REPO_URL, THIRD_PARTY_URL } from '@/app/meta'
import { LEGAL_NOTICE_PATH, legalRoutes, PRIVACY_PATH, TERMS_PATH } from '@/app/routes'
import { type LegalDocument, legalNotice, privacyPolicy, terms } from '@/i18n/legal'
import { t } from '@/i18n/strings'
import { tpl } from '@/i18n/format'
import { PageTitle } from '@/ui/PageTitle'
import { Tile } from '@/ui/Tile'

/**
 * Les trois pages juridiques, rendues par un seul composant.
 *
 * Même gabarit que « à propos » et que les réglages — une colonne de tuiles à
 * `max-w-3xl` —, parce que c'est le gabarit de tout ce qui se lit plutôt que de
 * se manipuler. Une tuile par section : elle donne au texte la largeur de la
 * prose et sépare les sujets sans qu'on ait à inventer une règle de titre.
 *
 * Rien de leur contenu n'est ici : tout vient de `i18n/legal.ts`, qui voyage
 * dans le même morceau chargé à la demande. C'est ce qui permet à ces quelques
 * kilo-octets de prose de ne peser sur le premier chargement de personne.
 *
 * Le titre, lui, vient de la table des routes et non du document : c'est le
 * même mot que le lien du pied de page, et deux copies en auraient fait deux
 * mots différents au premier changement d'avis.
 *
 * Les trois se renvoient l'une à l'autre en pied : on arrive ici par un lien du
 * pied de page, et on cherche presque toujours celle d'à côté.
 */
function LegalDoc({ path, doc }: { path: string; doc: LegalDocument }) {
  const title = legalRoutes().find((route) => route.path === path)?.label ?? ''

  return (
    <>
      <PageTitle title={title} />
      <div className="flex max-w-3xl flex-col gap-4">
        <Tile className="gap-3">
          <p className="t-body">{doc.intro}</p>
          <p className="t-axis text-muted">{tpl(t.legal.updated, doc.updated)}</p>
        </Tile>

        {doc.sections.map((section) => (
          <Tile key={section.heading} className="gap-3">
            <h2 className="t-section">{section.heading}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="t-body">
                {paragraph}
              </p>
            ))}
          </Tile>
        ))}

        <Tile className="gap-3">
          <h2 className="t-section">{t.legal.alsoRead}</h2>
          <div className="flex flex-wrap items-center gap-x-5">
            {legalRoutes().filter((route) => route.path !== path).map((route) => (
              <Link key={route.path} to={route.path} className={LINK}>
                {route.label}
              </Link>
            ))}
            {/* Fichier statique, donc un vrai départ de l'app : `ExternalLink`
                l'ouvre à côté, ce qui est la seule façon de revenir quand l'app
                est installée et n'a pas de bouton retour. */}
            <ExternalLink href={THIRD_PARTY_URL}>{t.legal.thirdParty}</ExternalLink>
            <ExternalLink href={REPO_URL}>{t.about.repo}</ExternalLink>
          </div>
        </Tile>
      </div>
    </>
  )
}

export function LegalNoticePage() {
  return <LegalDoc path={LEGAL_NOTICE_PATH} doc={legalNotice} />
}

export function PrivacyPage() {
  return <LegalDoc path={PRIVACY_PATH} doc={privacyPolicy} />
}

export function TermsPage() {
  return <LegalDoc path={TERMS_PATH} doc={terms} />
}
