import { t } from '@/i18n/strings'
import { cn } from '@/lib/cn'
import { BackspaceIcon } from './Icons'
import { MAX_KEYS } from './keypad'
import { useHotkeys } from './useHotkeys'

/** Une touche : ce qu'elle écrit, et ce qu'elle dit. */
type Key = { keys: string; label: string }

const DIGITS: Key[] = [
  { keys: '1', label: '1' },
  { keys: '2', label: '2' },
  { keys: '3', label: '3' },
  { keys: '4', label: '4' },
  { keys: '5', label: '5' },
  { keys: '6', label: '6' },
  { keys: '7', label: '7' },
  { keys: '8', label: '8' },
  { keys: '9', label: '9' },
  /* « 00 » avant « 0 », comme sur un terminal de paiement : la saisie part des
     centimes, donc passer d'un montant rond à ses deux zéros est le geste le
     plus fréquent du pavé. */
  { keys: '00', label: '00' },
  { keys: '0', label: '0' },
]

/**
 * Le pavé numérique — le seul objet de la refonte qui n'existait nulle part.
 *
 * **Il ne sait rien de ce qu'on saisit.** Pas de devise, pas de centimes, pas de
 * séparateur : une chaîne de chiffres entre, une chaîne de chiffres sort, et
 * c'est l'appelant qui décide ce qu'elle vaut — `amountFromKeys` juste au-dessus
 * fait la conversion que les trois écrans qui l'emploient partagent. Un pavé qui
 * saurait convertir aurait à savoir dans quelle langue et dans quelle devise, et
 * l'app est bilingue.
 *
 * **La frappe au clavier l'alimente**, et elle passe par `useHotkeys`, qui est
 * le seul endroit du dépôt à décider quand un raccourci se tait : dans un champ,
 * sous un modificateur, derrière une feuille ouverte. Sans cette garde, un pavé
 * monté quelque part sur la page volerait les chiffres du premier formulaire
 * ouvert — c'est précisément le piège que le handoff signale.
 *
 * Les deux touches d'issue sont facultatives et appartiennent à l'appelant :
 * « Entrée » valide *son* action principale, « Échap » referme *sa* surface.
 * Le pavé se contente de les brancher quand elles existent, pour qu'une seule
 * touche n'ait jamais deux propriétaires.
 */
export function Keypad({
  value,
  onChange,
  label,
  onSubmit,
  onClose,
  className,
}: {
  /** La chaîne de chiffres saisie. Jamais un montant. */
  value: string
  onChange: (keys: string) => void
  /** Nom accessible du groupe de touches — ce qu'on est en train de saisir. */
  label: string
  /** « Entrée ». Absent, la touche reste à qui l'a prise ailleurs. */
  onSubmit?: () => void
  /** « Échap ». Même règle. */
  onClose?: () => void
  className?: string
}) {
  const press = (keys: string): void => {
    /* La touche « 00 » ne dépasse pas non plus : elle écrit ce qui tient, ce
       qui vaut mieux que de ne rien écrire à un chiffre de la borne. */
    const next = `${value}${keys}`.slice(0, MAX_KEYS)
    /* Les zéros de tête ne s'accumulent pas : « 0 » puis « 5 » vaut cinq
       centimes, pas « 05 », et la chaîne doit se lire comme le montant. */
    onChange(next.replace(/^0+(?=\d)/, ''))
  }

  const erase = (): void => {
    onChange(value.slice(0, -1))
  }

  useHotkeys({
    ...Object.fromEntries(
      /* Les dix chiffres, du pavé numérique comme du rang du haut : `key` rend
         le caractère dans les deux cas, donc rien à distinguer. */
      Array.from({ length: 10 }, (_, digit) => [
        String(digit),
        () => {
          press(String(digit))
        },
      ]),
    ),
    Backspace: erase,
    /* « Suppr » efface aussi : sur un clavier sans retour arrière à portée —
       un pavé externe, un clavier compact — c'est la touche qu'on trouve, et
       il n'y a rien à droite du curseur qu'elle pourrait effacer d'autre. */
    Delete: erase,
    Enter: onSubmit,
    Escape: onClose,
  })

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Un groupe et non une liste : les douze touches n'ont pas d'ordre à
          annoncer, elles composent un seul contrôle, et son nom dit lequel. */}
      <div role="group" aria-label={label} className="grid max-w-xs grid-cols-3 gap-2">
        {DIGITS.map((key) => (
          <button
            key={key.keys}
            type="button"
            onClick={() => {
              press(key.keys)
            }}
            /* `t-section` et non un 19px inventé : l'échelle du DS §3 ne porte
               pas cette taille-là, et la plus proche est celle des titres de
               section — 20px en 600, à un pixel de la maquette. `tnum` parce
               que les douze touches doivent avoir la même chasse, sans quoi la
               grille se décale d'une colonne à l'autre. */
            className="t-section tnum flex h-14 items-center justify-center rounded-inner bg-surface-2 transition-[filter,background-color,scale] duration-[var(--dur)] ease-ds active:scale-[0.98] active:brightness-95"
          >
            {key.label}
          </button>
        ))}
        <button
          type="button"
          onClick={erase}
          /* Le glyphe seul : le nom passe donc sur le contrôle (DS §9.2). Un
             « ⌫ » nu n'aurait pas de nom du tout, et sa fonte n'est garantie
             nulle part. */
          aria-label={t.keypad.erase}
          className="flex h-14 items-center justify-center rounded-inner bg-surface-2 transition-[filter,background-color,scale] duration-[var(--dur)] ease-ds active:scale-[0.98] active:brightness-95"
        >
          <BackspaceIcon size={20} />
        </button>
      </div>
      {/* Le clavier ne s'annonce pas tout seul : cette ligne est la seule chose
          qui dise qu'il marche, et elle est à sa place — sous le pavé, là où
          l'œil arrive après avoir cherché la touche. */}
      <span className="t-axis">{t.keypad.hint}</span>
    </div>
  )
}
