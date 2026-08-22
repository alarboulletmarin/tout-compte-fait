import { cn } from '@/lib/cn'

/**
 * La barre de segments d'une file de cartes.
 *
 * Trois écrans posent maintenant la même file — la revue d'un mois, l'écriture
 * d'une règle, les questions du premier lancement — et la dessinaient chacun à
 * leur façon, avec les mêmes trois classes et le même ternaire à trois
 * branches. Une quatrième copie aurait fini par diverger d'une teinte.
 *
 * **Les segments sont décoratifs, et ils le disent.** Ils dessinent ce que le
 * compteur écrit à côté d'eux en chiffres — les annoncer ferait lire six
 * éléments vides à un lecteur d'écran pour apprendre « trois sur six », qui est
 * déjà là. Le DS §8 pose la règle : une nuance ne porte jamais seule ce qu'elle
 * dit, et ici c'est le compteur voisin qui la porte. La barre n'a donc ni nom
 * ni rôle, et c'est délibéré — l'appelant est responsable d'écrire le compteur.
 *
 * Trois états, trois couleurs : fait (lime), en cours (violet), à venir
 * (surface). Le violet et non le lime sur la carte courante, parce que le lime
 * signifie « acquis » partout ailleurs dans l'app.
 */
export function StepBar({
  index,
  total,
  className,
}: {
  /** Rang de la carte affichée, à partir de zéro. */
  index: number
  total: number
  className?: string
}) {
  return (
    <span aria-hidden="true" className={cn('flex flex-1 gap-1', className)}>
      {Array.from({ length: total }, (_, step) => (
        <span
          key={step}
          className={cn(
            'h-1 flex-1 rounded-chip transition-colors duration-[var(--dur)] ease-ds',
            step < index ? 'bg-accent' : step === index ? 'bg-accent-2' : 'bg-surface-2',
          )}
        />
      ))}
    </span>
  )
}
