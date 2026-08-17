import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'md' | 'sm'

export type ButtonProps = {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  full?: boolean
  className?: string
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'>

/* Lime et violet ne sont jamais une `color` : ils remplissent le fond, et le
   texte prend --accent-fg / --accent-2-fg.

   L'état pressé n'était nulle part, alors que le DS §6 l'exige sur tout ce
   qu'on peut actionner : « la moitié des écrans n'a pas de curseur », et un
   bouton qui n'a qu'un survol ne répond pas au doigt. Le fond s'assombrit là où
   il y en a un ; là où il n'y en a pas, le fond *est* le pressé. */
const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-fg hover:brightness-95 active:brightness-90',
  secondary: 'bg-surface-2 text-text hover:brightness-[0.97] active:brightness-[0.94]',
  ghost: 'bg-transparent text-text hover:bg-surface-2 active:bg-surface-2',
  danger: 'bg-danger-fill text-danger-fg hover:brightness-95 active:brightness-90',
}

/* Les deux tailles font 44px de haut : le DS §8 impose cette cible tactile.
   `sm` se distingue par sa densité horizontale, pas par sa hauteur. */
const SIZE: Record<ButtonSize, string> = {
  md: 'h-11 px-5 text-[15px]',
  sm: 'h-11 px-3.5 text-[13px]',
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  full = false,
  type = 'button',
  disabled,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-input font-medium',
        /* Le retrait accompagne l'assombrissement, et il porte à lui seul le
           pressé de la variante `secondary` en thème sombre, où `--surface-2`
           est presque noir et où l'assombrir ne se voit pas. `scale` et non
           `transform` : `scale-*` est posé sur la propriété du même nom,
           et une transition déclarée sur `transform` ne la verrait pas. */
        'transition-[filter,background-color,scale] duration-[var(--dur)] ease-ds',
        'active:scale-[0.98]',
        'disabled:pointer-events-none disabled:opacity-40',
        VARIANT[variant],
        SIZE[size],
        full && 'w-full',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

/** Bouton réduit à une icône. Conserve la cible tactile de 44px du DS §8. */
export function IconButton({
  children,
  label,
  variant = 'ghost',
  className,
  ...rest
}: {
  children: ReactNode
  label: string
  variant?: ButtonVariant
  className?: string
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'aria-label'>) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'hit inline-flex items-center justify-center rounded-chip',
        'transition-colors duration-[var(--dur)] ease-ds',
        'disabled:pointer-events-none disabled:opacity-40',
        VARIANT[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}
