import { Link, useNavigate } from 'react-router-dom'
import {
  RECURRENCES_PATH,
  RECURRENCE_NEW_PATH,
  MEMBER_NEW_PATH,
  MORE_PATH,
  SPLIT_PATH,
  recurrenceEditPath,
  memberPath,
} from '@/app/routes'
import type { MemberIncome } from '@/domain/split'
import { t } from '@/i18n/strings'
import { formatMoney, formatPercent, tpl } from '@/i18n/format'
import { setHouseholdName } from '@/store/actions'
import {
  useHouseholdName,
  useMemberIncomes,
  useMemberSharesOfIncome,
  useMembers,
  useUnassignedIncomes,
} from '@/store/selectors'
import { Button } from '@/ui/Button'
import { Eyebrow } from '@/ui/Eyebrow'
import { Field, TextInput } from '@/ui/Field'
import { ChevronRight, PeopleIcon } from '@/ui/Icons'
import { ListRow } from '@/ui/ListRow'
import { PageTitle } from '@/ui/PageTitle'
import { Tile } from '@/ui/Tile'
import { useCurrency } from '@/ui/currency'
import { useDraftField } from '@/ui/useDraftField'

/**
 * Ce que la ligne d'un membre dit de son revenu, en une lecture.
 *
 * Le revenu ne se saisit pas : il se lit sur les récurrences de ressources du
 * membre, et il n'y a qu'une vérité. Quand il ne se lit pas, la ligne dit
 * *laquelle* des trois raisons c'est — les gestes qui les corrigent ne sont pas
 * les mêmes, et ils vivent sur la fiche du membre, un cran plus bas.
 *
 * Le pourcentage est nu ici : « 54,1 % des charges communes » ne tient pas sur
 * une ligne de liste à 390px, et la phrase entière s'y coupait au milieu. Ce
 * qu'elle qualifie se lit sur la fiche, où il y a la place de le dire.
 */
function incomeOf(
  read: MemberIncome | undefined,
  shareBp: number | undefined,
  currency: string,
): string {
  if (read?.income != null) {
    const amount = formatMoney(read.income, currency, false)
    if (shareBp === undefined) return amount
    return `${amount} · ${formatPercent(shareBp / 10_000, 1)}`
  }
  if (read?.gap === 'unpriced') return t.settings.memberIncomeUnpriced
  if (read?.gap === 'zero') return t.settings.memberIncomeZero
  return t.settings.memberNoIncome
}

/**
 * Les personnes : le nom affiché, et qui compose le foyer.
 *
 * La section vivait en tête des réglages, et elle y montrait tout à la fois —
 * un champ par prénom, un bouton de retrait par ligne, un formulaire d'ajout
 * ouvert en permanence, et deux liens d'explication. Consulter, créer et
 * modifier s'y faisaient dans le même écran, avec le même poids visuel.
 *
 * Ici, la liste se lit ; le reste s'ouvre. Chaque membre est une ligne qu'on
 * touche pour aller à sa fiche, où son prénom se change et où son retrait — le
 * geste qui touche le plus d'endroits à la fois — se pose à part.
 */
export function PeoplePage() {
  const navigate = useNavigate()
  const name = useHouseholdName()
  const members = useMembers()
  const incomes = useMemberIncomes()
  const unassigned = useUnassignedIncomes()
  const shares = useMemberSharesOfIncome()
  const currency = useCurrency()

  /* Le nom se lit en tête de chaque écran, et il est facultatif : il ne se
     demande plus au premier lancement. Vide, `Nav` masque la ligne — d'où
     `allowEmpty`, sans quoi on ne pourrait plus revenir en arrière après
     l'avoir rempli une fois. */
  const householdDraft = useDraftField(name, setHouseholdName, { allowEmpty: true })

  const incomeMap = new Map(incomes.map((income) => [income.memberId, income]))

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <PageTitle
        title={t.settings.household}
        onBack={() => {
          void navigate(MORE_PATH)
        }}
      />

      <Tile>
        <Field label={t.settings.householdName} hint={t.settings.householdHint} optional>
          {(id) => (
            <TextInput
              id={id}
              placeholder={t.settings.householdPlaceholder}
              maxLength={40}
              {...householdDraft}
            />
          )}
        </Field>
      </Tile>

      <Tile className="gap-3">
        <Eyebrow icon={PeopleIcon}>{t.settings.members}</Eyebrow>

        {members.length === 0 ? (
          <p className="t-label">{t.settings.membersEmpty}</p>
        ) : (
          /* La liste déborde du cadre de la tuile de ce que la rangée reprend en
             marge intérieure : la pastille tombe alors sur la ligne de
             l'étiquette du groupe, et le fond de survol dépasse le texte. */
          <ul className="-mx-3 flex flex-col">
            {members.map((member) => (
              <li key={member.id} className="flex flex-col">
                <ListRow
                  color={member.color}
                  label={member.name}
                  meta={incomeOf(incomeMap.get(member.id), shares?.get(member.id), currency)}
                  trailing={<ChevronRight size={16} className="text-muted" aria-hidden="true" />}
                  onClick={() => {
                    void navigate(memberPath(member.id))
                  }}
                />
              </li>
            ))}
          </ul>
        )}

        {/* Un salaire resté « en commun » ne compte dans le revenu de
            personne : il rentre bien sur le mois, mais il ne pèse dans aucune
            part, et rien nulle part ne le disait. C'est la première explication
            d'une répartition qui ne se calcule pas. */}
        {members.length > 0 && unassigned.length > 0 && (
          <div className="flex flex-col gap-1 rounded-inner bg-surface-2 px-3 py-2">
            <p className="t-label">
              {tpl(
                unassigned.length > 1
                  ? t.settings.incomeUnassignedMany
                  : t.settings.incomeUnassignedOne,
                unassigned.map((recurrence) => recurrence.label).join(', '),
              )}
            </p>
            {/* Droit sur la récurrence quand il n'y en a qu'une : le nom est déjà
                dans la phrase, le répéter en lien ne dirait rien de plus. */}
            <Link
              to={
                unassigned.length === 1 && unassigned[0] !== undefined
                  ? recurrenceEditPath(unassigned[0].id)
                  : RECURRENCES_PATH
              }
              className="t-label underline underline-offset-2"
            >
              {t.settings.incomeUnassignedFix}
            </Link>
          </div>
        )}

        <Button
          variant="secondary"
          className="w-fit"
          onClick={() => {
            void navigate(MEMBER_NEW_PATH)
          }}
        >
          {t.settings.memberAdd}
        </Button>

        {/* D'où vient le revenu de chacun, et où se vérifie ce qu'il en
            découle. Deux explications qui restent, sous le filet plutôt que
            dans une tuile à elles : la première dit pourquoi aucun champ
            « revenu » n'existe ici — un comportement qu'on ne devine pas —, la
            seconde est la seule porte permanente vers la répartition. */}
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <p className="t-label">
            {t.settings.memberIncomeHint}{' '}
            <Link to={RECURRENCE_NEW_PATH} className="underline underline-offset-2">
              {t.settings.memberIncomeLink}
            </Link>
          </p>
          {/* Sans membre il n'y a personne à qui donner une part, et l'écran
              renverrait ici même. Un seul suffit : sa part vaut 100 %, et
              l'écran Répartition reste là où le pot se vérifie ligne à ligne. */}
          {members.length > 0 && (
            <Link
              to={SPLIT_PATH}
              className="t-label inline-flex min-h-11 w-fit items-center rounded-input underline underline-offset-2"
            >
              {t.settings.splitLink}
            </Link>
          )}
        </div>
      </Tile>
    </div>
  )
}
