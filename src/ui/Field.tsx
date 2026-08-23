import { type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, useId } from 'react'
import { cn } from '@/lib/cn'
import { t } from '@/i18n/strings'
import { Check, ChevronDown } from './Icons'

/* La lettre d'un contrôle est celle du corps — 15px, DS §3 —, **sauf sur
   iOS**, où `styles/base.css` la remonte à 16px pour tous les champs. Ce n'est
   pas une variante de style : sous 16px, WebKit zoome le cadrage à la mise au
   point et ne le rend pas. Le pourquoi et le pourquoi-pas-autrement sont
   écrits là-bas, à côté de la règle. */
const CONTROL = cn(
  'w-full rounded-input bg-surface-2 px-3.5 text-[15px] text-text',
  'border border-transparent outline-none',
  'placeholder:text-muted',
  'transition-colors duration-[var(--dur)] ease-ds',
  'disabled:opacity-40',
)

/**
 * Le plafond d'un contrôle dont le contenu a une longueur bornée.
 *
 * `w-full` sur tout ce qui se saisit donnait la même boîte à un taux annuel de
 * quatre caractères et à une note de cent quarante : 316px sur un téléphone de
 * 390, mesuré sur les trois formulaires de l'app. Le DS §5 tranche déjà la
 * question pour les tuiles — « le format suit le contenu, jamais l'inverse » —,
 * et rien ne justifie que la règle s'arrête au bord d'un formulaire.
 *
 * Ce n'est pas qu'une affaire de vide : un montant est aligné à droite, si bien
 * que dans une boîte pleine largeur le chiffre qu'on tape se pose à 280px de
 * l'étiquette qui le nomme. La colonne devient une pile de dalles identiques où
 * plus rien ne distingue ce qui prend deux caractères de ce qui en prend cent.
 *
 * **Mesuré, pas décidé.** « 12 345 678,90 » dans la fonte du champ demande 97px,
 * soit 125 avec le cadre — un capital restant dû, le plus gros chiffre de
 * l'app, en réclame moins. Un `input[type=date]` veut 156px de largeur
 * intrinsèque sous Chrome, et davantage sous Safari iOS, qui écrit « 22
 * septembre 2026 » en toutes lettres au lieu d'une date en chiffres. 12rem
 * couvre les deux et laisse de l'air aux deux.
 *
 * **Un plafond, jamais une largeur.** `max-width` borne le `w-full` sans entrer
 * en concurrence avec lui ; deux `width` sur le même élément se départageraient
 * par l'ordre d'`utilities.css`, `cn` ne fusionnant rien du tout — il
 * concatène. C'est exactement le piège que la colonne de `PendingSection` a déjà
 * rencontré, et c'est pour ça que le champ y garde sa largeur de colonne : 96px,
 * sous ce plafond, qui ne la touche donc pas.
 *
 * Ce que ce plafond ne borne pas : les textes libres, les notes et les `Select`,
 * dont le contenu n'a pas de longueur connue — un libellé de catégorie ou un nom
 * de foyer prend la place qu'il prend.
 */
const BOUNDED = 'max-w-48'

export type FieldProps = {
  label: string
  children: (id: string, describedBy: string | undefined) => ReactNode
  hint?: string
  error?: string
  optional?: boolean
  /** Marque le champ comme obligatoire, en pendant exact de `optional`. */
  required?: boolean
  className?: string
}

/**
 * Enveloppe libellé + aide + erreur. Le contrôle reste piloté par l'appelant.
 *
 * La mention se lit dans le libellé, donc dans le nom accessible du contrôle :
 * un lecteur d'écran annonce « Montant · obligatoire » sans qu'on ait à poser
 * un `aria-required` en plus.
 */
export function Field({
  label,
  children,
  hint,
  error,
  optional,
  required,
  className,
}: FieldProps) {
  const id = useId()
  const helpId = `${id}-help`
  const describedBy = error ?? hint ? helpId : undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="t-label text-text">
        {label}
        {required === true && <span className="text-muted"> · {t.common.required}</span>}
        {optional === true && <span className="text-muted"> · {t.common.optional}</span>}
      </label>
      {children(id, describedBy)}
      {(error ?? hint) !== undefined && (
        <p id={helpId} className={cn('t-label', error !== undefined && 'text-danger-text')}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
}

export type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
  invalid?: boolean
  className?: string
}

export function TextInput({ invalid = false, className, ...rest }: TextInputProps) {
  return (
    <input
      className={cn(CONTROL, 'h-11', invalid && 'border-danger', className)}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  )
}

/** Saisie de montant : tabular-nums et clavier numérique, sans exception. */
export function AmountInput({ invalid = false, className, ...rest }: TextInputProps) {
  return (
    <input
      className={cn(
        CONTROL,
        BOUNDED,
        'tnum h-11 text-right font-medium',
        invalid && 'border-danger',
        className,
      )}
      inputMode="decimal"
      autoComplete="off"
      aria-invalid={invalid || undefined}
      {...rest}
    />
  )
}

/**
 * Saisie de date — le contrôle natif, et rien d'autre.
 *
 * Il existe pour la même raison qu'`AmountInput` : une date a une longueur
 * connue, et poser `type="date"` sur un `TextInput` laissait chaque appelant
 * décider de sa largeur, c'est-à-dire n'en décider aucun. Sept écrans, sept
 * champs pleine largeur pour dix caractères.
 *
 * Natif plutôt qu'un sélecteur écrit à la main : il apporte le clavier de la
 * plateforme, le format local — Safari iOS écrit « 8 août 2026 » là où Chrome
 * écrit « 08/08/2026 » — et la saisie au clavier, qu'aucune reconstitution ne
 * rend aussi bien.
 */
export function DateInput({ invalid = false, className, ...rest }: TextInputProps) {
  return (
    <input
      type="date"
      className={cn(CONTROL, BOUNDED, 'h-11', invalid && 'border-danger', className)}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  )
}

export type CheckboxProps = {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
  /** Une phrase sous le libellé, quand la case demande à être expliquée. */
  hint?: string
  /**
   * La case dit ce qui est vrai sans qu'on puisse le changer. À n'employer
   * qu'avec un `hint` qui dit pourquoi : une case grisée sans raison se lit
   * comme une panne.
   */
  disabled?: boolean
  className?: string
}

/**
 * Case à cocher — un attribut vrai ou faux, pas un choix entre deux modes.
 *
 * `Segmented` sert à choisir parmi des positions qui s'excluent ; une case dit
 * qu'une chose est vraie ou ne l'est pas, et un formulaire qui empilerait trois
 * bascules pour poser trois booléens ne se lirait plus.
 *
 * La case native reste dans le DOM, seulement masquée : c'est elle qui porte
 * l'état pour un lecteur d'écran et qui répond à la barre d'espace. Le carré
 * dessiné n'est qu'un décor, d'où son `aria-hidden`.
 */
export function Checkbox({
  checked,
  onChange,
  label,
  hint,
  disabled = false,
  className,
}: CheckboxProps) {
  const id = useId()
  const helpId = `${id}-help`

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={id}
        className={cn(
          /* Le carré se pose sur la **première ligne** du libellé, pas au
             milieu du bloc. `items-center` le centrait sur la hauteur totale :
             sur un libellé de deux lignes — « Charge commune, à partager entre
             les membres », à 390px — il tombait pile entre les deux, à 23px du
             haut là où la première ligne se centre à 11. Une case posée dans
             l'interligne n'appartient plus à rien.
             La hauteur vient donc du rembourrage et non d'un `min-height` :
             sous `items-start`, un plancher de 44px aurait collé le libellé en
             haut d'une boîte trop grande dès qu'il tient sur une ligne, ce qui
             est le cas courant. `py-3` sur une ligne de 22,5px rend 46,5px —
             au-dessus du plancher tactile du DS §8, et le carré reste centré
             sur le mot qu'il coche. */
          'flex items-start gap-3 py-3 text-[15px] text-text',
          // Verrouillée, la case garde sa couleur de texte pleine, contrairement
          // aux boutons désactivés qui passent à 40 % : elle n'est pas hors
          // service, elle informe — atténuer ce qu'on met là pour être lu, et
          // sous le plancher AA du DS §8, reviendrait à le cacher. C'est le
          // curseur, l'attribut natif et la phrase d'aide qui disent qu'on n'y
          // touche pas.
          disabled ? 'cursor-default' : 'cursor-pointer',
        )}
      >
        {/* `min-h-6` : la hauteur d'une ligne de libellé, dans laquelle le
            carré se recentre. Sans elle, `items-start` l'alignerait sur le haut
            du glyphe et non sur le milieu du mot. */}
        <span className="relative inline-flex min-h-6 shrink-0 items-center justify-center">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            aria-describedby={hint === undefined ? undefined : helpId}
            onChange={(event) => {
              onChange(event.target.checked)
            }}
            className={cn(
              'peer absolute size-6 opacity-0',
              disabled ? 'cursor-default' : 'cursor-pointer',
            )}
          />
          <span
            aria-hidden="true"
            className={cn(
              'flex size-6 items-center justify-center rounded-[7px] border',
              'transition-colors duration-[var(--dur)] ease-ds',
              'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
              'peer-focus-visible:outline-[var(--focus)]',
              checked ? 'border-transparent bg-accent text-accent-fg' : 'border-border bg-surface-2',
            )}
          >
            {checked && <Check size={16} />}
          </span>
        </span>
        {label}
      </label>
      {hint !== undefined && (
        <p id={helpId} className="t-label">
          {hint}
        </p>
      )}
    </div>
  )
}

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> & {
  children: ReactNode
  className?: string
  /** Même signalement qu'un champ texte : bordure d'alerte et `aria-invalid`. */
  invalid?: boolean
}

/**
 * Une liste déroulante — et le chevron qui dit qu'elle en est une.
 *
 * Le contrôle natif est repeint (`appearance: none`) pour porter la forme des
 * autres champs : même rayon, même fond, même hauteur. Ce que le repeint enlève
 * est la flèche du système, et elle n'était remplacée par rien — trente-six
 * pixels de rembourrage lui étaient réservés à droite, et ils restaient vides.
 * Une liste déroulante avait donc exactement l'aspect d'un champ de saisie :
 * rien n'annonçait qu'il y avait quelque chose à ouvrir.
 *
 * Le chevron est posé par-dessus, sans souris (`pointer-events-none`) pour que
 * l'appui traverse jusqu'au `select`, et masqué à l'oreille : un lecteur d'écran
 * annonce déjà « liste », et un glyphe de plus ne l'apprendrait pas mieux.
 * L'enveloppe porte la largeur, le `select` la remplit — un plafond posé par
 * l'appelant borne donc les deux d'un coup.
 */
export function Select({ children, className, invalid = false, ...rest }: SelectProps) {
  return (
    <span className={cn('relative flex w-full items-center', className)}>
      <select
        className={cn(CONTROL, 'h-11 appearance-none pr-9', invalid && 'border-danger')}
        aria-invalid={invalid || undefined}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute right-3 text-muted"
      />
    </span>
  )
}
