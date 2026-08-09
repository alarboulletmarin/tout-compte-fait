import type { Money } from '@/domain/money'
import { fr } from '@/i18n/fr'
import { Amount } from '@/ui/Amount'
import { Eyebrow } from '@/ui/Eyebrow'
import { Sheet } from '@/ui/Sheet'

export type MetricKey = 'balance' | 'forecast' | 'remaining' | 'memberCharges'

/**
 * Ce qu'une tuile passe à la feuille en s'ouvrant : sa clé, son chiffre, et la
 * lecture secondaire qu'elle n'affiche pas sous 1024px. C'est la tuile qui les
 * porte — elle les a déjà calculés, les refaire ici en ferait deux versions.
 */
export type Metric = {
  key: MetricKey
  value: Money
  hint: string
}

type Explanation = {
  title: string
  /** Ce que le chiffre est, en une phrase. */
  lead: string
  /** Comment il se calcule. */
  calculation: string
  /** Ce qui le sépare de son voisin — la vraie question devant la grille. */
  apart: string
}

const CONTENT: Record<MetricKey, Explanation> = {
  balance: { title: fr.dashboard.balance, ...fr.dashboard.info.balance },
  forecast: { title: fr.dashboard.forecast, ...fr.dashboard.info.forecast },
  remaining: { title: fr.dashboard.remaining, ...fr.dashboard.info.remaining },
  /* Le quatrième n'est pas un solde, et il est ici pour la raison qui a fait
     les trois autres : deux chiffres voisins qui se ressemblent à l'œil sans
     dire la même chose. « Perso et commun » annonce ce que le mois coûte,
     « À verser sur le commun » ce qu'on vire — et les deux diffèrent de la
     régularisation *et* du remboursement d'une avance, sans que rien à l'écran
     ne l'ait jamais dit. La section « ce qui le distingue » existait déjà pour
     exactement cette question ; celui-ci est le cas où elle manquait le plus,
     puisque sa voisine mène à un écran et lui à rien. */
  memberCharges: { title: fr.dashboard.memberCharges, ...fr.dashboard.info.memberCharges },
}

/**
 * Ce que dit un chiffre du tableau de bord, et ce qui le distingue de ses
 * voisins.
 *
 * Quatre soldes portent un chiffre qui se ressemble à l'œil sans dire la même
 * chose. Leur lecture secondaire l'explique — mais une tuile d'une rangée fait
 * 88px, et cette ligne n'y tient pas dans une demi-colonne mobile : sur un
 * téléphone, l'explication existait sans jamais s'afficher.
 *
 * Les deux tuiles de flux ne sont pas de la partie : ce qui rentre et ce qui se
 * paie n'ont pas besoin d'être définis, ils ont besoin d'être détaillés. Elles
 * mènent donc à leurs lignes plutôt qu'à une feuille — et leur seconde lecture
 * se lit sur la tuile même, qui prend deux colonnes sous 1024px pour ça. Une
 * feuille aurait été le second recours ; c'est celui-ci qui a été pris.
 *
 * La feuille reprend donc le chiffre et cette lecture, et pas seulement les
 * phrases : sur téléphone, c'est le seul endroit où « reste 102 € à payer » se
 * lit, et une explication qui parle d'un chiffre qu'on ne voit pas oblige à la
 * refermer pour le retrouver.
 *
 * La phrase vient avant le calcul. L'inverse — ce qu'on lisait d'abord ici —
 * ouvre sur du vocabulaire qu'on n'a pas encore de quoi comprendre. Et le
 * calcul est composé comme du texte : sur quatre chiffres, deux « formules »
 * sont des phrases, et la mono de onze pixels des axes de graphique les
 * réduisait à deux lignes collées.
 */
export function MetricInfo({
  metric,
  onClose,
}: {
  metric: Metric | null
  onClose: () => void
}) {
  const content = metric === null ? null : CONTENT[metric.key]

  return (
    <Sheet open={content !== null} onClose={onClose} title={content?.title ?? ''} pullToClose>
      {content !== null && metric !== null && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <Amount value={metric.value} size="tile" />
            <span className="t-label">{metric.hint}</span>
          </div>

          <p className="t-body">{content.lead}</p>

          <section className="flex flex-col gap-2 border-t border-border pt-4">
            <Eyebrow>{fr.dashboard.info.calculationLabel}</Eyebrow>
            <p className="t-body">{content.calculation}</p>
          </section>

          <section className="flex flex-col gap-2 border-t border-border pt-4">
            <Eyebrow>{fr.dashboard.info.apartLabel}</Eyebrow>
            <p className="t-body">{content.apart}</p>
          </section>
        </div>
      )}
    </Sheet>
  )
}
