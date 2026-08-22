import { t } from '@/i18n/strings'
import { landing } from '@/i18n/landing'
import { ExampleControl } from '@/features/settings/ExampleControl'
import { Button } from '@/ui/Button'
import { DataIcon, type IconComponent, RecurrencesIcon, ShareIcon } from '@/ui/Icons'
import { LandingTiles } from './LandingTiles'

/** Un argument : un repère, et la phrase qu'il repère. */
type Point = { icon: IconComponent; text: string }

const POINTS = (): Point[] => [
  { icon: DataIcon, text: landing.pointLocalTitle },
  { icon: RecurrencesIcon, text: landing.pointRecurringTitle },
  { icon: ShareIcon, text: landing.pointExportTitle },
]

/**
 * La promesse et sa démonstration, côte à côte.
 *
 * **Deux colonnes, et la droite est plafonnée.** `minmax(0, 1fr)` puis
 * `minmax(0, 440px)` : au-delà, les tuiles deviennent plus larges que celles du
 * vrai tableau de bord, et la page cesse de montrer l'app qu'elle prétend
 * montrer. En dessous de 1024px la grille retombe sur une colonne — le texte
 * d'abord, les tuiles ensuite, ce qui est l'ordre de lecture (DS §5).
 *
 * **Le titre est `t.app.tagline`, pas une phrase à lui.** La promesse du produit
 * s'écrit à un seul endroit ; une seconde formule ici en ferait une seconde
 * vérité, et c'est déjà ce que dit l'en-tête de `i18n/landing.ts`. Le maximum de
 * 18 caractères par ligne vient du design et se tient à `max-w-[18ch]`.
 *
 * **Trois arguments, un repère chacun** (DS §9.1, emploi « repère ») : ils
 * nomment ce que l'app fait et que les autres ne font pas. Le quatrième — le
 * prix — est plus bas, dans les questions, parce qu'il demande une réponse et
 * pas une ligne.
 *
 * Les trois portes ne se valent pas et ne se présentent donc pas pareil :
 * « Créer mon suivi » est le bouton primaire, « Charger l'exemple » le
 * secondaire, et « Entrer sans rien charger » un fantôme sous les arguments —
 * c'est un raccourci pour qui sait déjà ce qu'il fait.
 */
export function LandingHero({
  onStart,
  onEnterEmpty,
}: {
  /** Ouvre la file de questions. Absent, la page ne propose rien à écrire. */
  onStart?: () => void
  onEnterEmpty?: () => void
}) {
  return (
    <div className="grid items-center gap-6 lg:grid-cols-[1fr_440px] lg:gap-8">
      <div className="flex min-w-0 flex-col gap-5">
        <h1 className="t-hero-fit max-w-[18ch] text-pretty">{t.app.tagline}</h1>
        <p className="t-body max-w-[48ch] text-muted">{landing.intro}</p>

        {onStart !== undefined && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={onStart}>{landing.start}</Button>
              {/* Aucune confirmation : rien n'a encore été enregistré, et faire
                  confirmer la perte de rien n'apprend qu'une chose — que les
                  questions de cette app ne veulent rien dire. */}
              <ExampleControl confirm={false} />
            </div>
            <span className="t-axis">{landing.exampleHint}</span>
          </div>
        )}

        <ul className="flex flex-col gap-2">
          {POINTS().map((point) => (
            <li key={point.text} className="flex items-start gap-2">
              <point.icon size={16} className="mt-0.5 shrink-0" />
              <span className="t-label min-w-0">{point.text}</span>
            </li>
          ))}
        </ul>

        {onEnterEmpty !== undefined && (
          <Button variant="ghost" size="sm" className="w-fit" onClick={onEnterEmpty}>
            {landing.enterEmpty}
          </Button>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <LandingTiles />
        {/* La seule chose qui empêche la grille de mentir, et elle dit aussi
            quoi faire de l'aveu : charger l'exemple rend tous ces chiffres
            vrais. En texte lisible et non en filigrane — un avertissement qu'on
            ne peut pas lire n'en est pas un. */}
        <span className="t-axis text-center">{landing.sample}</span>
      </div>
    </div>
  )
}
