/* ============================================================================
 * Une pilule de réglage : ce que vaut le réglage, et la porte pour le changer.
 *
 * **Elle dit sa valeur, pas son nom.** « 3 comptes », « 2,40 % – 5 %»,
 * « 10 ans », « Sans inflation » : une rangée de boutons qui annonceraient
 * « Comptes », « Rendement », « Durée » obligerait à ouvrir chaque feuille pour
 * savoir ce qu'on est en train de lire — c'est-à-dire à ouvrir les cinq. Le nom,
 * lui, va dans l'étiquette accessible, où il précède la valeur : ce qui se lit à
 * l'œil se lit à l'oreille (DS §8), et « Durée, 10 ans » est exactement ce qu'un
 * lecteur d'écran doit annoncer.
 *
 * **Pourquoi une rangée de pilules et pas des rangées de liste.** Cinq `Row` de
 * 56 points en font 280, sur un écran qui doit tenir la réponse, la figure et
 * la réserve sans défiler. Les pilules passent à la ligne, portent leur valeur,
 * et laissent la figure respirer. Le repère d'action est celui du DS §6 pour ce
 * qui ouvre une feuille — un chevron aurait promis une navigation.
 *
 * Un champ illisible se signale ici aussi, et sans couleur seule : la pilule
 * prend le trait du danger **et** un point d'exclamation dans son étiquette
 * accessible. Sans quoi une faute de frappe rangée dans une feuille fermée
 * resterait invisible.
 * ==========================================================================*/

import { cn } from '@/lib/cn'

export type SettingPillProps = {
  /** Le nom du réglage — pour l'oreille, jamais affiché. */
  label: string
  /** Ce que vaut le réglage, affiché tel quel. */
  value: string
  /** Un champ du réglage est illisible : la pilule le porte. */
  invalid?: boolean
  onClick: () => void
}

export function SettingPill({ label, value, invalid = false, onClick }: SettingPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label} : ${value}`}
      className={cn(
        'inline-flex min-h-11 items-center gap-2 rounded-chip px-3.5 text-[13px]',
        // Une pilule tient sur une ligne : c'est la rangée qui passe à la ligne,
        // jamais le libellé qui se coupe en deux.
        'whitespace-nowrap',
        'transition-colors duration-[var(--dur)] ease-ds',
        invalid ? 'bg-surface-2 text-danger-text ring-1 ring-danger' : 'bg-surface-2 text-text',
      )}
    >
      {value}
    </button>
  )
}
