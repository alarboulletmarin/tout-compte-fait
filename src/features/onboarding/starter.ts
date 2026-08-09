/* Ce que la troisième étape propose de poser, et ce qu'elle en tire.
 *
 * Séparé du composant pour la raison qui vaut partout ailleurs : c'est du
 * calcul pur — des montants saisis vers des payloads de récurrences —, donc ça
 * se teste sans monter un écran. Le composant ne fait que lire des champs.
 *
 * Les deux lignes ne sont pas choisies au hasard. Un salaire par personne est
 * ce qui fait parler le prorata : le revenu d'un membre ne se déclare nulle
 * part, il se lit sur ses récurrences de nature `resource` (voir
 * `domain/split.ts`). Le toit est la charge commune la plus répandue, et la
 * première qui rende le partage lisible — mais elle ne suppose pas un loyer :
 * on peut être hébergé, verser une participation, ou ne rien payer du tout, et
 * la ligne le dit plutôt que de faire de « Loyer » une évidence.
 */

import { type ISODate, type YearMonth, startOfMonth } from '@/domain/date'
import { type Money, parseAmount } from '@/domain/money'
import type { Direction, Member, Recurrence } from '@/domain/types'
import { tpl } from '@/i18n/format'
import { t } from '@/i18n/strings'

/* Les identifiants du catalogue d'amorçage (`persistence/defaults.ts`). Ils
   sont stables, mais on ne s'y fie pas les yeux fermés : la ligne se tait si la
   catégorie manque, plutôt que de poser une récurrence sur un identifiant mort
   — `repairedCategory` existe pour rattraper ce cas, ce n'est pas une raison
   de le fabriquer. */
const SALARY_CATEGORY = 'salary'
const RENT_CATEGORY = 'rent'

/** La ligne de qui est seul·e, et n'a pas d'id de membre pour la nommer. */
const SOLO_KEY = 'solo'
const RENT_KEY = 'rent'

/** Une ligne de l'étape : ce qu'on demande, et où va la réponse. */
export type StarterLine = {
  /** Clé de saisie : l'id du membre pour un salaire, un mot fixe sinon. */
  key: string
  /** Ce que le champ demande. */
  label: string
  /** Ce qu'il faut ajouter sous le champ, quand le libellé ne suffit pas. */
  hint?: string
  /** Ce que la récurrence portera comme nom — voir `starterSalaryLabel`. */
  recurrenceLabel: string
  categoryId: string
  direction: Direction
  /** À qui la ligne revient. Absent sur le loyer, qui est commun. */
  memberId?: string
}

/**
 * Les lignes proposées : un salaire par membre, puis le toit.
 *
 * Sans membre, une seule ligne de revenu et pas de propriétaire : seul·e, on
 * n'a besoin d'être nommé nulle part, et demander à quelqu'un de se désigner
 * lui-même serait la seule question de l'app à n'avoir aucune conséquence.
 */
export function starterLines(members: readonly Member[]): StarterLine[] {
  const salaries: StarterLine[] =
    members.length === 0
      ? [
          {
            key: SOLO_KEY,
            label: t.onboarding.starterSalarySolo,
            recurrenceLabel: t.onboarding.starterSalaryLabel,
            categoryId: SALARY_CATEGORY,
            direction: 'in',
          },
        ]
      : members.map((member) => ({
          key: member.id,
          label: tpl(t.onboarding.starterSalaryOf, member.name),
          recurrenceLabel: t.onboarding.starterSalaryLabel,
          categoryId: SALARY_CATEGORY,
          direction: 'in',
          memberId: member.id,
        }))

  return [
    ...salaries,
    {
      key: RENT_KEY,
      label: t.onboarding.starterRent,
      hint: t.onboarding.starterRentHint,
      recurrenceLabel: t.onboarding.starterRentLabel,
      categoryId: RENT_CATEGORY,
      direction: 'out',
    },
  ]
}

/** Le montant d'une ligne, ou `null` si le champ est vide ou illisible. */
export function starterAmount(
  amounts: Readonly<Record<string, string>>,
  key: string,
): Money | null {
  const amount = parseAmount(amounts[key] ?? '')
  /* Zéro et négatif ne sont pas des erreurs à signaler ici — l'étape est
     facultative, et rien de ce qu'on y laisse ne bloque. Ils ne posent
     simplement aucune récurrence. */
  return amount === null || amount <= 0 ? null : amount
}

/**
 * Les récurrences que ces montants décrivent — mensuelles, ancrées au 1er.
 *
 * Le jour ne se demande pas (voir `t.onboarding.starterDayNote`) : un champ de
 * plus par ligne aurait fait de cette étape le questionnaire que le cahier
 * §4.1 refuse. Le 1er est le défaut, il est annoncé, et il se corrige d'une
 * reprise depuis la fiche.
 *
 * Le loyer ne porte ni membre ni `shared` : `defaultShared` le rend commun
 * puisque c'est une charge que personne ne s'attribue. C'est la règle du
 * formulaire de saisie, appliquée et non recopiée.
 *
 * `knows` dit si la catégorie existe encore dans le document. La question n'est
 * pas rhétorique au premier lancement — le catalogue vient d'être posé — mais
 * `repairedCategory` existe pour rattraper les identifiants morts, ce qui n'est
 * pas une raison d'en fabriquer.
 */
export function starterRecurrences(
  lines: readonly StarterLine[],
  amounts: Readonly<Record<string, string>>,
  knows: (categoryId: string) => boolean,
  ym: YearMonth,
): Omit<Recurrence, 'id'>[] {
  const startedOn: ISODate = startOfMonth(ym)

  return lines.flatMap((line) => {
    const amount = starterAmount(amounts, line.key)
    if (amount === null || !knows(line.categoryId)) return []

    return [
      {
        label: line.recurrenceLabel,
        categoryId: line.categoryId,
        ...(line.memberId === undefined ? {} : { memberId: line.memberId }),
        direction: line.direction,
        amount,
        period: { unit: 'month' as const, every: 1, anchorDay: 1 },
        startedOn,
      },
    ]
  })
}
