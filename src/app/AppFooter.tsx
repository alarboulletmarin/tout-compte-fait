import { Link } from 'react-router-dom'
import { t } from '@/i18n/strings'
import { tpl } from '@/i18n/format'
import { cn } from '@/lib/cn'
import { ExternalIcon } from '@/ui/Icons'
import { ABOUT_PATH, LEGAL_NOTICE_PATH, PRIVACY_PATH, TERMS_PATH } from './routes'
import { REPO_URL, VERSION } from './meta'

/* La classe des liens de texte du repo — soulignés, et hauts de 44px pour la
   cible tactile du DS §8, même quand le libellé ne fait qu'une ligne. */
export const LINK =
  't-label inline-flex min-h-11 w-fit items-center gap-1 rounded-input underline underline-offset-2'

/**
 * Le pied de la présentation.
 *
 * L'app ne disait nulle part d'où elle vient : ni dépôt, ni licence, ni
 * version. Ces trois-là ne valent pas un écran, mais ils valent d'être quelque
 * part — et le bas de la page qui présente l'app est cet endroit.
 *
 * La page « à propos » ne le rend pas : sa tuile « Le projet » porte déjà les
 * mêmes liens, et les deux se seraient retrouvés l'un sous l'autre sur mobile.
 *
 * **Pas de lien vers le styleguide.** Il y figurait, et il n'avait rien à y
 * faire : c'est un livrable de conception, pas une destination pour quelqu'un
 * qui découvre l'app et cherche à savoir ce qu'elle fait. Il vit sur « à
 * propos », à côté du dépôt et de la licence, où son lecteur est déjà celui qui
 * vient de lire que le code est ouvert.
 */
export function AppFooter() {
  return (
    <footer className="flex flex-col gap-1 border-t border-border pt-5">
      {/* Les trois pages juridiques sont ici et pas ailleurs : c'est le seul
          endroit de l'app qu'un visiteur qui ne crée aucun foyer traverse, et
          l'obligation de se rendre identifiable ne commence pas à la création du
          premier. Libellés courts — « Mentions » plutôt que « Mentions
          légales » — parce que cinq liens entiers ne tiennent pas sur deux
          lignes à 320px, et qu'aucun n'a le droit d'y être tronqué. */}
      <nav aria-label={t.nav.about} className="flex flex-wrap items-center gap-x-5">
        <Link to={ABOUT_PATH} className={LINK}>
          {t.nav.about}
        </Link>
        <Link to={LEGAL_NOTICE_PATH} className={LINK}>
          {t.legal.shortNotice}
        </Link>
        <Link to={PRIVACY_PATH} className={LINK}>
          {t.legal.privacy}
        </Link>
        <Link to={TERMS_PATH} className={LINK}>
          {t.legal.shortTerms}
        </Link>
        <ExternalLink href={REPO_URL}>{t.about.repo}</ExternalLink>
      </nav>
      <p className="t-axis text-muted">
        {tpl(t.about.version, VERSION)} · {t.about.license}
      </p>
    </footer>
  )
}

/**
 * Un lien qui quitte l'app.
 *
 * `target="_blank"` n'est pas une préférence : le manifeste déclare
 * `display: 'standalone'`, donc l'app installée n'a pas de barre d'adresse ni de
 * bouton retour. Ouvrir GitHub dans la fenêtre remplacerait l'app par un site
 * dont plus rien ne permet de revenir.
 *
 * Le nom accessible le dit — le soulignement annonce un lien, jamais qu'il
 * change de fenêtre —, et la flèche sortante le montre à l'œil.
 */
export function ExternalLink({
  href,
  children,
  className,
}: {
  href: string
  children: string
  className?: string
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={cn(LINK, className)}>
      {children}
      <ExternalIcon size={14} />
      <span className="sr-only-text"> {t.about.newWindow}</span>
    </a>
  )
}
