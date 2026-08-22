import { type ReactNode, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { RECURRENCES_PATH, RECURRENCE_FULL_NEW_PATH } from '@/app/routes'
import { ZERO } from '@/domain/money'
import type { CategoryKind } from '@/domain/types'
import { t } from '@/i18n/strings'
import { formatMonthDay, tpl } from '@/i18n/format'
import { addRecurrence } from '@/store/actions'
import { useCategoryMap, useCurrentYm, useKindOf, useMembers } from '@/store/selectors'
import { memberPatch } from '@/features/split/memberDraft'
import { SharedField } from '@/features/split/SharedField'
import { Amount } from '@/ui/Amount'
import { Button, IconButton } from '@/ui/Button'
import { CategorySelect } from '@/ui/CategorySelect'
import { Chip } from '@/ui/Chip'
import { Disclosure } from '@/ui/Disclosure'
import { Field, Select, TextInput } from '@/ui/Field'
import { Close } from '@/ui/Icons'
import { InlineError } from '@/ui/InlineError'
import { Keypad } from '@/ui/Keypad'
import { amountFromKeys } from '@/ui/keypad'
import { PageTitle } from '@/ui/PageTitle'
import { StepBar } from '@/ui/StepBar'
import { toast } from '@/ui/toast'
import { useHotkeys } from '@/ui/useHotkeys'
import { LAST_DAY, describePeriod } from './period'
import {
  DAY_SHORTCUTS,
  type QuickRuleDraft,
  buildQuickRule,
  emptyQuickRule,
  isValidDay,
  knownRuleKinds,
  quickRuleDay,
  quickRuleError,
  quickRuleLabel,
  quickStartedOn,
} from './quickRule'

/** L'ordre des cartes. Voir l'en-tête du composant pour la quatrième. */
const STEPS = ['what', 'amount', 'when', 'details'] as const
type Step = (typeof STEPS)[number]

/**
 * Le catalogue entier dans la liste des « Précisions ».
 *
 * `CategorySelect` déduit d'ordinaire sa liste du sens, parce qu'un formulaire
 * de dépense n'a pas à proposer « Salaires ». Ici c'est l'inverse : le sens
 * n'est pas encore connu — il se **déduit** de la catégorie choisie —, et
 * restreindre la liste reviendrait à demander d'abord ce qu'on cherche à
 * apprendre.
 */
const ALL_KINDS: readonly CategoryKind[] = ['resource', 'charge', 'debt', 'saving']

/** L'avancement : quatre segments et un compteur, comme la file de la revue. */
function Progress({ index, onQuit }: { index: number; onQuit: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <IconButton label={t.quickRule.quit} onClick={onQuit}>
        <Close />
      </IconButton>
      {/* Décoratifs, et ils le disent : ils dessinent ce que le compteur écrit
          à côté d'eux en chiffres (`ui/StepBar`). */}
      <StepBar index={index} total={STEPS.length} />
      <span className="t-axis tnum shrink-0">
        {tpl(t.quickRule.counter, index + 1, STEPS.length)}
      </span>
    </div>
  )
}

/** Une ligne du récapitulatif : ce qu'on demande, ce qui a été répondu. */
function Recap({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <span className="t-label">{label}</span>
      <span className="t-body min-w-0 text-right">{children}</span>
    </div>
  )
}

/**
 * Écrire une règle en quelques cartes — `/recurrences/nouveau`.
 *
 * **Trois cartes du design, et une quatrième qui n'y était pas.** Le design
 * demande *nature*, *montant*, *jour*. Une `Recurrence` en veut davantage :
 * `categoryId` est obligatoire, le sens s'en déduit, et sans membre ni `shared`
 * la répartition ne sait rien ranger — depuis que `/flux` classe chaque ligne
 * par catégorie, par « commune » et par membre, une règle écrite sans eux
 * n'atterrit pas « quelque part », elle atterrit **au mauvais endroit**, et une
 * charge sans propriétaire se retrouve découpée entre tout le monde.
 *
 * La quatrième carte n'est donc pas une question de plus : c'est un
 * **récapitulatif**, qui montre ce que les trois premières ont déjà décidé et
 * garde le reste replié. On ne l'ouvre que si l'on n'est pas d'accord — ou si
 * l'app a besoin d'une réponse qu'elle ne peut pas deviner, auquel cas elle
 * s'ouvre toute seule et le dit.
 *
 * **Ce chemin ne remplace pas le formulaire, il s'ajoute à lui.** Sept cadences
 * vivent dans `period.ts`, un montant peut être variable — c'est de lui que
 * dépend toute la file variable de la revue —, une règle a une date de fin, un
 * support d'épargne, une note. Trois cartes qui porteraient tout cela seraient
 * le formulaire, en plus long. Il reste à un doigt, sur la première carte,
 * avant qu'on ait rien saisi (`RECURRENCE_FULL_NEW_PATH`) — et de toute façon
 * la règle se reprend ensuite depuis sa fiche.
 *
 * **Les puces portent de vrais identifiants du catalogue** (voir `quickRule`),
 * et se taisent quand la catégorie a été supprimée.
 */
export function RecurrenceQuickPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const ym = useCurrentYm()
  const categories = useCategoryMap()
  const kindOf = useKindOf()
  const members = useMembers()

  const [draft, setDraft] = useState<QuickRuleDraft>(emptyQuickRule)
  const [step, setStep] = useState<Step>('what')
  /* L'erreur ne se découvre qu'après avoir essayé d'avancer : la signaler à la
     frappe reprocherait un champ vide qu'on n'a pas encore fini de remplir. */
  const [tried, setTried] = useState(false)
  const [open, setOpen] = useState(false)

  const kinds = useMemo(() => knownRuleKinds((id) => categories.has(id)), [categories])
  const patch = (next: Partial<QuickRuleDraft>): void => {
    setDraft((current) => ({ ...current, ...next }))
  }

  const amount = amountFromKeys(draft.keys)
  const kind = kindOf(draft.categoryId)
  const index = STEPS.indexOf(step)
  const error = quickRuleError(step, draft, { amount, kind, hasMembers: members.length > 0 })

  const quit = (): void => {
    /* Arrivé par un lien direct ou un rechargement, il n'y a pas d'écran
       précédent dans l'app : revenir en arrière sortirait du site. Même règle
       que le formulaire complet. */
    if (location.key === 'default') void navigate(RECURRENCES_PATH)
    else void navigate(-1)
  }

  useHotkeys({ Escape: quit })

  const next = (): void => {
    setTried(true)
    if (error !== null) {
      // Ce qui manque à la dernière carte est replié : l'ouvrir, sans quoi le
      // message désignerait un champ que rien ne montre.
      if (step === 'details') setOpen(true)
      return
    }
    setTried(false)
    if (step === 'details') {
      if (amount === null) return
      addRecurrence(buildQuickRule(draft, kinds, { amount, kind, ym }))
      toast(t.recurrences.added)
      quit()
      return
    }
    setStep(STEPS[index + 1] ?? 'details')
  }

  const back = (): void => {
    setTried(false)
    setStep(STEPS[index - 1] ?? 'what')
  }

  /* La puce choisit la catégorie du même geste : c'est tout son intérêt, et
     c'est ce que le prototype ne faisait pas — ses cinq puces étaient des
     libellés en dur. Le nom libre, lui, ne la choisit pas : « mutuelle » ne
     désigne aucune catégorie de façon fiable, et deviner mal rangerait la
     ligne dans la mauvaise section de `/flux`. */
  const pick = (id: string, categoryId: string): void => {
    if (draft.kindId === id) patch({ kindId: null, categoryId: '' })
    else patch({ kindId: id, categoryId })
  }

  const day = quickRuleDay(draft)
  const label = quickRuleLabel(draft, kinds)
  const cadence = isValidDay(day)
    ? describePeriod({ unit: 'month', every: 1, anchorDay: day }, quickStartedOn(ym, day))
    : ''

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      {/* Le titre ne s'affiche pas : chaque carte porte le sien, qui est la
          question du moment. Il existe quand même — un écran sans `<h1>` ne se
          repère pas au lecteur d'écran et ne s'annonce pas en changeant. */}
      <PageTitle title={t.quickRule.title} hidden />
      <Progress index={index} onQuit={quit} />

      <section className="tile flex flex-col gap-4">
        <h2 className="t-section">{t.quickRule.steps[step].title}</h2>
        <p className="t-label">{t.quickRule.steps[step].body}</p>

        {step === 'what' && (
          <div className="flex flex-col gap-4">
            <div role="group" aria-label={t.quickRule.kindsLabel} className="flex flex-wrap gap-2">
              {kinds.map((one) => (
                <Chip
                  key={one.id}
                  color={categories.get(one.categoryId)?.color ?? 'var(--cat-rest)'}
                  active={draft.kindId === one.id}
                  onClick={() => {
                    pick(one.id, one.categoryId)
                  }}
                >
                  {one.label}
                </Chip>
              ))}
            </div>
            <Field label={t.quickRule.name} optional>
              {(id) => (
                <TextInput
                  id={id}
                  value={draft.name}
                  placeholder={t.quickRule.namePlaceholder}
                  maxLength={60}
                  onChange={(event) => {
                    patch({ name: event.target.value })
                  }}
                />
              )}
            </Field>
          </div>
        )}

        {step === 'amount' && (
          <div className="flex flex-col gap-4">
            {/* Le chiffre part de zéro et suit la frappe : c'est la même place
                et la même taille que sur la carte de la revue, et il dit la
                vérité — il n'y a pas encore de montant. */}
            <span className="fit-box block">
              <Amount value={amount ?? ZERO} size="hero-fit" />
            </span>
            <Keypad
              value={draft.keys}
              onChange={(keys) => {
                patch({ keys })
              }}
              label={t.entry.amount}
              onSubmit={next}
            />
          </div>
        )}

        {step === 'when' && (
          <div className="flex flex-col gap-4">
            {/* Des pilules et non une bascule : un `Segmented` doit toujours
                être sur une de ses positions, et le champ libre juste dessous
                permet précisément d'en sortir — le 17 n'y a pas de case. Ce
                sont donc des raccourcis, ce qu'ils sont. */}
            <div role="group" aria-label={t.quickRule.dayShortcuts} className="flex flex-wrap gap-2">
              {DAY_SHORTCUTS.map((shortcut) => (
                <Chip
                  key={shortcut}
                  active={day === shortcut}
                  onClick={() => {
                    patch({ dayText: String(shortcut) })
                  }}
                >
                  {/* « 31 » se dit « dernier jour » : le quantième est borné et
                      jamais reporté, donc 31 *est* la fin du mois quel qu'il
                      soit — c'est déjà ce qu'écrit `describePeriod`. */}
                  {shortcut >= LAST_DAY
                    ? t.recurrences.summary.lastDay
                    : formatMonthDay(shortcut)}
                </Chip>
              ))}
            </div>
            <Field label={t.recurrences.form.monthDay} hint={t.recurrences.form.monthDayHint}>
              {(id, describedBy) => (
                <TextInput
                  id={id}
                  aria-describedby={describedBy}
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  value={draft.dayText}
                  invalid={tried && error !== null}
                  /* 6rem : un quantième d'un ou deux chiffres, exactement la
                     largeur que le DS §6 lui donne. */
                  className="w-24"
                  onChange={(event) => {
                    patch({ dayText: event.target.value })
                  }}
                />
              )}
            </Field>
            {cadence !== '' && <p className="t-axis">{cadence}</p>}
          </div>
        )}

        {step === 'details' && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col divide-y divide-border">
              <Recap label={t.entry.label}>{label}</Recap>
              <Recap label={t.entry.amount}>
                <Amount value={amount ?? ZERO} />
              </Recap>
              <Recap label={t.recurrences.form.period}>{cadence}</Recap>
              <Recap label={t.entry.category}>
                {categories.get(draft.categoryId)?.label ?? t.quickRule.noCategory}
              </Recap>
              {members.length > 0 && (
                <Recap label={t.entry.member}>
                  {members.find((one) => one.id === draft.memberId)?.name ?? t.shell.everyone}
                </Recap>
              )}
            </div>

            {/* Replié : ce qui est déjà juste n'a pas à être redemandé, et ce
                qui ne l'est pas se lit trois lignes plus haut. Ouvert d'office
                quand une réponse manque — voir `next`. */}
            <div className="-mx-2">
              <Disclosure title={t.quickRule.details} open={open} onOpenChange={setOpen}>
                <div className="flex flex-col gap-4 px-2 pb-2">
                  <Field
                    label={t.entry.category}
                    required
                    {...(tried && draft.categoryId === ''
                      ? { error: t.entry.categoryRequired }
                      : {})}
                  >
                    {(id, describedBy) => (
                      <CategorySelect
                        id={id}
                        aria-describedby={describedBy}
                        direction="out"
                        kinds={ALL_KINDS}
                        value={draft.categoryId}
                        onChange={(event) => {
                          patch({ categoryId: event.target.value })
                        }}
                      />
                    )}
                  </Field>

                  {members.length > 0 && (
                    <Field label={t.entry.member} optional>
                      {(id, describedBy) => (
                        <Select
                          id={id}
                          aria-describedby={describedBy}
                          value={draft.memberId}
                          onChange={(event) => {
                            patch(memberPatch(event.target.value))
                          }}
                        >
                          <option value="">{t.shell.everyone}</option>
                          {members.map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.name}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Field>
                  )}

                  {/* `SharedField` décide seul de son affichage : rien à
                      écarter ici pour un revenu ou une épargne. */}
                  <SharedField
                    categoryId={draft.categoryId}
                    memberId={draft.memberId}
                    value={draft.shared}
                    onChange={(shared) => {
                      patch({ shared })
                    }}
                  />
                </div>
              </Disclosure>
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-col gap-2">
        {/* L'erreur au-dessus du bouton, jamais à la place. Le motif est écrit
            une fois dans `ui/InlineError` : trois écrans le posaient. */}
        <InlineError message={tried ? error : null} />
        <Button full onClick={next}>
          {step === 'details' ? t.quickRule.write : t.common.next}
        </Button>
        {index > 0 && (
          <Button variant="ghost" full onClick={back}>
            {t.quickRule.back}
          </Button>
        )}
        {step === 'what' && (
          /* La sortie vers le formulaire complet, et elle est ici plutôt que
             partout : à la première carte, rien n'est encore saisi, donc rien
             ne se perd. Plus loin, ce qui manque se règle depuis la fiche de la
             règle une fois écrite — c'est ce que dit la ligne du bas. */
          <Button
            variant="ghost"
            full
            onClick={() => {
              void navigate(RECURRENCE_FULL_NEW_PATH)
            }}
          >
            {t.quickRule.fullForm}
          </Button>
        )}
        <span className="t-axis text-center">
          {step === 'details' ? t.quickRule.footDetails : t.quickRule.foot}
        </span>
      </div>
    </div>
  )
}
