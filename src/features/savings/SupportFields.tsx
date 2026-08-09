import type { ReactNode } from 'react'
import { parseAmount } from '@/domain/money'
import type { SavingPace } from '@/domain/types'
import { t } from '@/i18n/strings'
import { formatDate, formatMoney, tpl } from '@/i18n/format'
import { useCategoriesByFamily, useMembers } from '@/store/selectors'
import { Disclosure } from '@/ui/Disclosure'
import { AmountInput, DateInput, Field, Select, TextInput } from '@/ui/Field'
import { Segmented } from '@/ui/Segmented'
import { useCurrency } from '@/ui/currency'
import { useDisclosureGroup } from '@/ui/useDisclosureGroup'
import type { SupportDraft, SupportErrors } from './supportDraft'

/**
 * Les deux sections qu'on replie. Stables d'un rendu à l'autre —
 * `useDisclosureGroup` l'exige, et une liste reconstruite à chaque tour
 * rouvrirait tout à la première frappe.
 */
const SECTIONS = ['contract', 'value'] as const

/**
 * Les champs d'un support d'épargne — les mêmes partout où l'on en crée un.
 *
 * Le nom d'abord, parce que c'est lui qui compte : « Livret A », « PEA
 * Boursorama ». Le propriétaire ensuite, jamais facultatif — une épargne est
 * toujours à quelqu'un. Le type ne sert qu'à ranger et à colorer : c'est une
 * catégorie du catalogue, celle-là même sous laquelle les mouvements du support
 * se rangeront, et non un second classement à tenir d'accord avec le premier.
 *
 * **Trois questions debout, le reste replié — et pourquoi pas des étapes.**
 * Le formulaire posait ses neuf champs à plat, dont cinq facultatifs : sur un
 * téléphone, ouvrir un livret demandait deux écrans de défilement pour trois
 * réponses obligatoires. Un assistant en quatre écrans aurait supprimé le
 * défilement en le remplaçant par des taps, et surtout il aurait fait passer
 * les cinq facultatifs pour des passages obligés — « Suivant » sous un champ
 * vide se lit comme une exigence. L'onboarding a des étapes parce qu'il raconte
 * une première fois ; ce formulaire-ci se rouvre pour corriger un libellé.
 *
 * **Replié n'est pas caché**, et c'est la condition pour que ce dessin tienne :
 * chaque section porte en résumé ce qu'elle contient — la cadence, le taux, le
 * plafond —, si bien qu'on lit ses réponses sans rien déplier. Une section qui
 * porte une erreur s'ouvre d'elle-même : un message rouge sous un pli fermé
 * serait un refus sans cause visible.
 *
 * **Aucun objectif, aucune échéance.** Ce formulaire répond à « combien j'ai,
 * et où », et s'arrête là. La cadence n'y déroge pas : elle dit quand un relevé
 * sera attendu, jamais ce que le support rapportera d'ici là — c'est le champ
 * qui permet à l'écran de **se taire**, et non de projeter.
 *
 * **Une hypothèse de rendement, en revanche, et il faut dire pourquoi elle ne
 * contredit pas ce qui précède.** Le formulaire refusait tout taux au motif
 * qu'un champ inutilisé serait une promesse posée dans le modèle (cahier §2).
 * Celui-ci n'est pas inutilisé : le simulateur le lit. Et il ne promet rien que
 * son propriétaire n'ait tapé — l'app ne connaît aucun produit, ne lit aucun
 * cours, et ne pose aucun défaut. Il ne change ni le capital, ni la valeur
 * estimée, ni la couverture, ni un total du mois : un rendement n'est pas un
 * mouvement, et l'aide du champ le dit, parce qu'un taux posé sur une fiche
 * d'épargne se lit spontanément comme un calcul qui va se mettre à tourner.
 *
 * **Le taux suit le relevé : à la création seulement.** Il s'empile daté, comme
 * une valorisation, et ce formulaire écrase ce qu'il touche — le reprendre ici
 * ferait d'une correction de libellé une réécriture du passé du compte, c'est-
 * à-dire exactement ce que le taux daté existe pour empêcher. Ensuite, il se
 * change depuis la fiche, où chaque palier porte sa date.
 */
export function SupportFields({
  draft,
  patch,
  errors,
  /**
   * À la création seulement : un relevé et un taux s'empilent, ils ne se
   * réécrivent pas ici. Les deux vont ensemble — le premier palier prend la
   * date du premier relevé.
   */
  withValue = true,
  autoFocus = false,
}: {
  draft: SupportDraft
  patch: (next: Partial<SupportDraft>) => void
  errors: SupportErrors
  withValue?: boolean
  autoFocus?: boolean
}) {
  const members = useMembers()
  const groups = useCategoriesByFamily(['saving'])
  const currency = useCurrency()
  const sections = useDisclosureGroup(SECTIONS, false)

  /* Une section qui porte une erreur s'ouvre, et se rouvre tant qu'elle la
     porte : un message rouge sous un pli fermé est un refus sans cause. */
  const contractError = errors.rate !== undefined || errors.cap !== undefined
  const valueError = errors.amount !== undefined

  /* Un plafond et un relevé sont des nombres écrits dans un contrat ou sur un
     relevé de banque : ils s'écrivent exacts, comme sur la fiche du support. */
  const exact = (text: string): string | null => {
    const parsed = parseAmount(text)
    return parsed === null ? null : formatMoney(parsed, currency, false)
  }

  /* Ce que la section repliée porte en résumé — ses réponses, jamais un compte
     de champs. C'est ce qui permet de plier sans rien cacher. */
  const capSummary = exact(draft.capText)
  const contractSummary = [
    draft.pace === 'yearly' ? t.savings.paceYearly : t.savings.paceQuarterly,
    draft.rateText.trim() === '' ? null : `${draft.rateText.trim()} ${t.savings.ratePerYear}`,
    capSummary === null ? null : tpl(t.savings.capSummary, capSummary),
  ]
    .filter((part) => part !== null)
    .join(' · ')

  const valueAmount = exact(draft.amountText)
  const valueSummary =
    valueAmount === null
      ? t.savings.sectionValueEmpty
      : `${valueAmount} · ${formatDate(draft.valueDate)}`

  return (
    <>
      <Field
        label={t.savings.supportLabel}
        required
        {...(errors.label === undefined ? {} : { error: errors.label })}
      >
        {(id, describedBy) => (
          <TextInput
            id={id}
            aria-describedby={describedBy}
            value={draft.label}
            invalid={errors.label !== undefined}
            placeholder={t.savings.supportLabelPlaceholder}
            maxLength={40}
            autoFocus={autoFocus}
            onChange={(event) => {
              patch({ label: event.target.value })
            }}
          />
        )}
      </Field>

      <Field
        label={t.savings.supportOwner}
        required
        {...(errors.member === undefined ? {} : { error: errors.member })}
      >
        {(id, describedBy) => (
          <Select
            id={id}
            aria-describedby={describedBy}
            value={draft.memberId}
            invalid={errors.member !== undefined}
            onChange={(event) => {
              patch({ memberId: event.target.value })
            }}
          >
            <option value="">{t.savings.supportOwnerPlaceholder}</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field
        label={t.savings.supportKind}
        required
        hint={t.savings.supportKindHint}
        {...(errors.category === undefined ? {} : { error: errors.category })}
      >
        {(id, describedBy) => (
          <Select
            id={id}
            aria-describedby={describedBy}
            value={draft.categoryId}
            invalid={errors.category !== undefined}
            onChange={(event) => {
              patch({ categoryId: event.target.value })
            }}
          >
            <option value="">{t.entry.categoryPlaceholder}</option>
            {groups.map((group) => (
              <optgroup key={group.family.id} label={group.family.label}>
                {group.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        )}
      </Field>

      <Field label={t.savings.supportNote} optional>
        {(id) => (
          <TextInput
            id={id}
            value={draft.note}
            placeholder={t.savings.supportNotePlaceholder}
            maxLength={140}
            onChange={(event) => {
              patch({ note: event.target.value })
            }}
          />
        )}
      </Field>

      {/* Ce que le contrat dit du compte, et que personne n'a besoin de revoir
          pour corriger un libellé : la cadence des relevés, l'hypothèse de
          rendement, le plafond de versements. Les trois sont facultatifs — la
          cadence a une réponse par défaut —, et leur résumé les rend lisibles
          repliés. */}
      <Section
        title={t.savings.sectionContract}
        summary={contractSummary}
        open={sections.isOpen('contract') || contractError}
        onOpenChange={(open) => {
          sections.setOpen('contract', open)
        }}
      >
        {/* La cadence, et non un rendement : elle ne sert à projeter aucune
            valeur, seulement à savoir quand l'écran doit réclamer un relevé et
            quand il doit se taire. C'est une question à laquelle on répond sans
            rien consulter — « est-ce que ce compte bouge tout seul ? » — d'où
            deux réponses et pas un champ libre, et une présélection plutôt qu'une
            case vide : elle n'exige rien de plus qu'un regard. */}
        <Field label={t.savings.supportPace} hint={t.savings.supportPaceHint}>
          {(id, describedBy) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              value={draft.pace}
              onChange={(event) => {
                patch({ pace: event.target.value as SavingPace })
              }}
            >
              <option value="yearly">{t.savings.paceYearly}</option>
              <option value="quarterly">{t.savings.paceQuarterly}</option>
            </Select>
          )}
        </Field>

        {/* Vide veut dire « je m'en remets à l'hypothèse du simulateur », jamais
            « zéro pour cent » — les deux existent, et les confondre ferait
            projeter à plat un support dont personne n'a rien dit. */}
        {withValue && (
          <>
            <Field
              label={t.savings.supportRate}
              optional
              hint={t.savings.supportRateHint}
              {...(errors.rate === undefined ? {} : { error: errors.rate })}
            >
              {(id, describedBy) => (
                <span className="flex items-center gap-2">
                  <TextInput
                    id={id}
                    aria-describedby={describedBy}
                    className="max-w-24"
                    inputMode="decimal"
                    value={draft.rateText}
                    invalid={errors.rate !== undefined}
                    onChange={(event) => {
                      patch({ rateText: event.target.value })
                    }}
                  />
                  {/* L'unité au bord du champ : « 3 » posé seul sous un libellé ne
                      dit pas s'il s'agit d'un pourcentage ou d'un montant. */}
                  <span className="t-label shrink-0" aria-hidden="true">
                    {t.savings.ratePerYear}
                  </span>
                </span>
              )}
            </Field>

            {/* La nature ne se demande qu'une fois un taux posé : sans chiffre,
                elle ne qualifie rien. Elle ne change aucun calcul — elle change ce
                que le taux engage, et c'est celui qui coche qui l'affirme. */}
            {draft.rateText.trim() !== '' && (
              <div className="flex flex-col gap-2">
                <Segmented
                  options={[
                    { value: 'guaranteed' as const, label: t.savings.supportRateGuaranteed },
                    { value: 'assumed' as const, label: t.savings.supportRateAssumed },
                  ]}
                  value={draft.rateKind}
                  onChange={(rateKind) => {
                    patch({ rateKind })
                  }}
                  label={t.savings.supportRateKind}
                  className="w-fit"
                />
                {draft.rateKind === 'guaranteed' && (
                  <p className="t-label">{t.savings.supportRateGuaranteedHint}</p>
                )}
              </div>
            )}
          </>
        )}

        {/* Le plafond, lui, s'affiche **aussi en modification** — contrairement au
            taux et au relevé, qui s'empilent. Un plafond ne réécrit rien : il ne
            borne que ce qui reste à verser, donc l'avenir, et le corriger n'a
            aucune conséquence rétroactive à protéger.
            Il n'est plus décoratif : la saisie d'un versement s'y arrête, et une
            règle qui remplirait le compte cesse d'y poser des échéances. */}
        <Field
          label={t.savings.supportCap}
          optional
          hint={t.savings.supportCapHint}
          {...(errors.cap === undefined ? {} : { error: errors.cap })}
        >
          {(id, describedBy) => (
            <AmountInput
              id={id}
              aria-describedby={describedBy}
              value={draft.capText}
              invalid={errors.cap !== undefined}
              onChange={(event) => {
                patch({ capText: event.target.value })
              }}
            />
          )}
        </Field>
      </Section>

      {/* Le premier relevé est facultatif, et son absence a un sens : on ne
          connaît pas le capital. Le laisser vide n'écrit rien — surtout pas
          zéro, qui dirait « ce livret est vide ».
          Sans placeholder : « 0,00 » dans un champ vide est précisément le
          chiffre qu'on ne veut pas voir enregistré, et un champ de relevé ne
          peut pas se permettre de le suggérer. */}
      {withValue && (
        <Section
          title={t.savings.sectionValue}
          summary={valueSummary}
          open={sections.isOpen('value') || valueError}
          onOpenChange={(open) => {
            sections.setOpen('value', open)
          }}
        >
          <Field
            label={t.savings.valueInitial}
            optional
            hint={t.savings.valueHint}
            {...(errors.amount === undefined ? {} : { error: errors.amount })}
          >
            {(id, describedBy) => (
              <AmountInput
                id={id}
                aria-describedby={describedBy}
                value={draft.amountText}
                invalid={errors.amount !== undefined}
                onChange={(event) => {
                  patch({ amountText: event.target.value })
                }}
              />
            )}
          </Field>

          {/* La date du relevé, et non celle du jour : on saisit souvent le
              chiffre d'un relevé qui date de la semaine dernière, et le dater
              d'aujourd'hui décalerait toute la courbe. */}
          {draft.amountText.trim() !== '' && (
            <Field label={t.savings.valueDate} required>
              {(id) => (
                <DateInput
                  id={id}
                  value={draft.valueDate}
                  onChange={(event) => {
                    if (event.target.value !== '') patch({ valueDate: event.target.value })
                  }}
                />
              )}
            </Field>
          )}
        </Section>
      )}
    </>
  )
}

/**
 * Une section repliée du formulaire : son titre, ce qu'elle contient en résumé,
 * et ses champs.
 *
 * Le résumé vit dans l'en-tête plutôt que sous elle, et il reste lisible
 * replié : c'est lui qui fait que plier ne cache rien. Il passe à la ligne sous
 * le titre plutôt que de se ranger à droite — un « Une fois par an · 3 %/an ·
 * plafond 22 950 € » posé au bord droit se fait trancher au premier téléphone.
 */
function Section({
  title,
  summary,
  open,
  onOpenChange,
  children,
}: {
  title: string
  summary: string
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <Disclosure
      open={open}
      onOpenChange={onOpenChange}
      className="-mx-3 border-t border-border pt-2"
      title={
        <span className="flex min-w-0 flex-col">
          <span className="t-body">{title}</span>
          {!open && <span className="t-label truncate">{summary}</span>}
        </span>
      }
    >
      <div className="flex flex-col gap-4 px-3 pt-3 pb-1">{children}</div>
    </Disclosure>
  )
}
