import { type YearMonth, addMonthsToYm, currentYm } from '@/domain/date'
import { formatMonthName, tpl } from '@/i18n/format'
import { t } from '@/i18n/strings'
import { Segmented } from '@/ui/Segmented'

type Start = 'current' | 'next'

/**
 * Le point de départ : à partir de quel mois les règles courent.
 *
 * **Ce n'est pas le choix d'ouvrir un mois ou l'autre.** On peut ouvrir le mois
 * suivant ; on ne peut pas *ne pas* ouvrir le mois courant — `hydrate` le
 * rouvre à chaque lancement, et l'app en fait un invariant : l'ouverture d'un
 * mois n'est jamais une tâche pour l'utilisateur. Ce que cette carte décide,
 * c'est le 1er de quel mois porte les récurrences, donc à partir de quand elles
 * produisent des échéances — et, en sortant de la file, quel mois s'affiche.
 *
 * Le mois courant reste donc ouvert dans les deux cas. « Le mois prochain »
 * signifie simplement qu'il restera vide, ce que la phrase du dessous dit en le
 * nommant plutôt qu'en le laissant découvrir.
 */
export function StartCard({ value, onChange }: { value: Start; onChange: (next: Start) => void }) {
  const current: YearMonth = currentYm()
  const next: YearMonth = addMonthsToYm(current, 1)
  const currentName = formatMonthName(current)
  const nextName = formatMonthName(next)

  return (
    /* `gap-4` comme les cinq autres cartes de la file : celle-ci empilait à
       12px, et la phrase de conséquence remontait donc de 4px sous la bascule
       quand on traversait l'onboarding. */
    <div className="flex flex-col gap-4">
      <Segmented<Start>
        options={[
          { value: 'current', label: t.onboarding.startCurrent },
          { value: 'next', label: t.onboarding.startNext },
        ]}
        value={value}
        onChange={onChange}
        label={t.onboarding.startMonthLabel}
        /* Voir `WhoCard` : dans une colonne, l'`inline-flex` de `Segmented` ne
           suffit pas à le serrer sur ses positions, et il partait sur toute la
           largeur — 127px de pilule vide à 390px, 281 à 1440. */
        className="self-start"
      />
      {/* La conséquence, nommée avec les vrais mois : « le mois prochain » ne
          dit pas lequel, et c'est précisément ce qu'on veut vérifier avant de
          répondre. Les noms passent par `format.ts` — ils changent de langue. */}
      <p className="t-axis">
        {value === 'current'
          ? tpl(t.onboarding.startCurrentHint, currentName)
          : tpl(t.onboarding.startNextHint, nextName, currentName)}
      </p>
    </div>
  )
}
