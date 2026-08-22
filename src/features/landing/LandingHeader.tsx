import { t } from '@/i18n/strings'
import { Button } from '@/ui/Button'

/**
 * La barre du haut de la présentation : la marque, et l'action qu'on est venu
 * chercher.
 *
 * **Pleine largeur, hors du cadre de page.** C'est la seule bande de l'app à
 * l'être, et c'est ce qui la sépare du contenu : un filet à 1px sur toute la
 * largeur dit « ici commence la page », là où une bordure arrêtée à `max-w-5xl`
 * aurait l'air d'une tuile mal fermée.
 *
 * **La marque est le favicon lui-même**, en 26px et `aria-hidden` : le nom
 * écrit à côté porte déjà le sens (DS §9.2), et l'anneau signature y est déjà
 * dessiné aux couleurs de la marque. Un `Ring` de 26px aurait demandé une
 * épaisseur qui n'existe nulle part — le token n'en pose qu'une, 12px, qui
 * ferait de cette taille-là une tache.
 *
 * **Deux éléments et pas trois.** La langue et le thème sont restés dans le
 * contenu, alignés à droite au-dessus du titre : les trois ensemble faisaient
 * 540px et passaient à la ligne dès 480, ce qui donnait une barre de trois
 * rangées là où le design en demande une de 56px. Ils gardent leur place en
 * tête pour la raison qui les y avait mis — celui qui lit dans la mauvaise
 * langue lit depuis le haut.
 *
 * Le bouton disparaît là où il mentirait : tant que l'hydratation n'a pas
 * répondu on ne sait pas encore quoi proposer, et devant un document illisible
 * « Créer mon suivi » écraserait ce qu'on n'a pas su ouvrir.
 */
export function LandingHeader({ action }: { action?: { label: string; onAction: () => void } }) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 md:px-8">
        <span className="flex min-w-0 items-center gap-2">
          <img src="/favicon.svg" alt="" aria-hidden="true" width={26} height={26} />
          {/* `t-body font-semibold` : Archivo 600 à 15px, ce que l'échelle du
              DS §3 pose pour un libellé de cette force — la même valeur que le
              prototype, sans inventer une graisse de plus. */}
          <span className="t-body truncate font-semibold">{t.app.name}</span>
        </span>

        {action !== undefined && (
          <Button size="sm" onClick={action.onAction}>
            {action.label}
          </Button>
        )}
      </div>
    </header>
  )
}
