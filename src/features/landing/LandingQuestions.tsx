import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, LINK } from '@/app/AppFooter'
import { DOCS_URL, REPO_URL } from '@/app/meta'
import { LEGAL_NOTICE_PATH } from '@/app/routes'
import { t } from '@/i18n/strings'
import { landing } from '@/i18n/landing'

/**
 * Les quatre objections que la page ne traitait pas, et de quoi les vérifier.
 *
 * Ce sont les questions que se pose vraiment quelqu'un devant une app de
 * finances sans compte : *et si je change de téléphone ? et si je perds mon
 * navigateur ? c'est gratuit, donc où est le piège ? qui es-tu ?* Les deux
 * premières étaient traitées en une demi-phrase dans `landing.installBody`, les
 * deux autres nulle part — alors que ce sont elles qui décident.
 *
 * **Ouvertes, et non repliées.** Un `Disclosure` par question aurait fait une
 * section plus courte, mais quelqu'un de méfiant n'a pas à cliquer pour obtenir
 * la réponse qui lèverait sa méfiance : une objection cachée derrière un chevron
 * reste une objection. C'est aussi ce que dit le DS §6 des repères — on ne pose
 * pas un geste là où il n'y a rien à décider.
 *
 * **En prose et hors tuile**, comme `LandingPrinciples` : quatre réponses de
 * quatre lignes ne rentrent dans aucune des cases du DS §5, et une réponse
 * tronquée par le bas d'une tuile vaudrait moins que pas de réponse du tout.
 *
 * Le bloc de vérification ferme la section plutôt que d'être une cinquième
 * entrée : il ne répond pas à une question de plus, il dit comment répondre
 * soi-même à toutes les autres. C'est aussi le seul endroit du produit d'où le
 * cahier des charges et le design system sont atteignables par quelqu'un qui ne
 * crée aucun foyer — « à propos » les liait déjà, mais il faut y aller.
 */
export function LandingQuestions() {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="t-section">{landing.questions}</h2>

      {/* Deux colonnes et non quatre, comme les principes : à `max-w-5xl`,
          quatre blocs de prose tombent sous 230px de large, où une ligne ne
          porte plus que cinq mots. */}
      <div className="cols">
        <Answer title={landing.deviceTitle} body={landing.deviceBody} />
        <Answer title={landing.lossTitle} body={landing.lossBody} />
        <Answer title={landing.catchTitle} body={landing.catchBody} />
        <Answer title={landing.whoTitle} body={landing.whoBody}>
          {/* La phrase renvoie aux mentions légales : une affirmation qui
              désigne une page se clique, sinon elle demande de la croire sur
              parole — ce que cette section-ci existe précisément pour éviter.
              Le pied de page la porte aussi, trois sections plus bas. */}
          <Link to={LEGAL_NOTICE_PATH} className={LINK}>
            {t.legal.notice}
          </Link>
        </Answer>
      </div>

      <div className="flex max-w-prose flex-col gap-2">
        <h3 className="t-body font-semibold">{landing.verifyTitle}</h3>
        <p className="t-label">{landing.verifyBody}</p>
        <div className="flex flex-wrap items-center gap-x-5">
          <ExternalLink href={REPO_URL}>{t.about.repo}</ExternalLink>
          <ExternalLink href={DOCS_URL}>{t.about.docs}</ExternalLink>
        </div>
      </div>
    </section>
  )
}

/**
 * Une question et sa réponse. Le titre est un `h3` : ce sont des sections de la
 * page, pas des libellés — un lecteur d'écran doit pouvoir sauter de l'une à
 * l'autre sans traverser les réponses.
 */
function Answer({
  title,
  body,
  children,
}: {
  title: string
  body: string
  children?: ReactNode
}) {
  return (
    <div className="flex max-w-prose flex-col gap-2">
      <h3 className="t-body font-semibold">{title}</h3>
      <p className="t-label">{body}</p>
      {children}
    </div>
  )
}
