import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LANDING_PATH } from '@/app/routes'
import { t } from '@/i18n/strings'
import { tpl } from '@/i18n/format'
import { isKnownFragile, useStorageHealth } from '@/persistence/health'
import { addMember, addRecurrence, removeMember } from '@/store/actions'
import { useCategoryMap, useKindOf, useMembers } from '@/store/selectors'
import { useStore } from '@/store/store'
import { Button } from '@/ui/Button'
import { ChevronLeft } from '@/ui/Icons'
import { PageTitle } from '@/ui/PageTitle'
import { StepBar } from '@/ui/StepBar'
import { AmountCard } from './AmountCard'
import { ExtrasCard } from './ExtrasCard'
import { StartCard } from './StartCard'
import { SummaryCard } from './SummaryCard'
import { WhoCard } from './WhoCard'
import {
  type ExtraCharge,
  type OnboardingCard,
  type OnboardingDraft,
  emptyOnboardingDraft,
  onboardingCards,
  onboardingCategories,
  onboardingRecurrences,
  onboardingTotals,
  startYm,
} from './queue'

/** Le titre de la carte affichée. Il est la question, il n'y a rien au-dessus. */
function cardTitle(card: OnboardingCard): string {
  switch (card.kind) {
    case 'who':
      return t.onboarding.whoTitle
    case 'income':
      return card.name === undefined
        ? t.onboarding.incomeSoloTitle
        : tpl(t.onboarding.incomeOfTitle, card.name)
    case 'rent':
      return t.onboarding.rentTitle
    case 'extras':
      return t.onboarding.extrasTitle
    case 'start':
      return t.onboarding.startMonthTitle
    case 'summary':
      return t.onboarding.summaryTitle
  }
}

/** Ce que la carte explique sous son titre. */
function cardBody(card: OnboardingCard): string {
  switch (card.kind) {
    case 'who':
      return t.onboarding.whoBody
    case 'income':
      return t.onboarding.incomeBody
    case 'rent':
      return t.onboarding.rentBody
    case 'extras':
      return t.onboarding.extrasBody
    case 'start':
      return t.onboarding.startMonthBody
    case 'summary':
      return t.onboarding.summaryBody
  }
}

/**
 * Le premier lancement : une file de cartes dont le nombre dépend des réponses.
 *
 * **Même grammaire que la revue et que l'écriture d'une règle** : une barre de
 * segments et un compteur en haut, une question par carte, un pied à trois
 * boutons — l'action principale, « Revenir », « Plus tard ». Trois écrans qui
 * font la même chose ne peuvent pas la faire de trois façons, et la barre est
 * désormais un composant partagé (`ui/StepBar`).
 *
 * **La file se recalcule à chaque rendu.** Ajouter un prénom ajoute une carte de
 * revenu, en retirer un la retire, et repasser en solo ramène la file à six
 * cartes. C'est `onboardingCards` qui le décide, à partir des membres du
 * document — pas d'une liste figée au montage, qui aurait fini par compter une
 * carte de plus que ce qu'on affiche.
 *
 * **Rien ne s'enregistre avant la fin.** Les membres sont écrits dans le
 * document dès qu'on les nomme, mais `mutate` ne programme aucune écriture tant
 * que le statut vaut « onboarding » : c'est `finishOnboarding` qui ouvre la
 * porte, et c'est aussi lui qui ouvre le mois courant. Les récurrences sont
 * posées **juste avant**, si bien que leurs échéances naissent à l'ouverture du
 * mois — à confirmer, comme n'importe quel mois qui s'ouvre.
 *
 * **Le point de départ choisit le mois affiché, pas le mois ouvert.** Voir
 * `StartCard` : le mois courant s'ouvre de toute façon. Ce qui change est le 1er
 * de quel mois porte les règles, et `setYm` fait suivre l'affichage — en ouvrant
 * au passage le mois suivant, ce qui est exactement ce qu'on vient de demander.
 *
 * **Il n'y a pas de carte de partage.** Le modèle ne connaît qu'une règle, le
 * prorata des revenus (`domain/split.ts`), et une carte qui n'offrirait aucun
 * choix serait la seule de la file à ne rien demander. La règle s'énonce là où
 * elle se décide — sous la question du foyer — et se relit dans le
 * récapitulatif.
 */
export function OnboardingPage() {
  const members = useMembers()
  const categoryMap = useCategoryMap()
  const kindOf = useKindOf()
  const finishOnboarding = useStore((s) => s.finishOnboarding)
  const setYm = useStore((s) => s.setYm)
  const navigate = useNavigate()
  const fragile = useStorageHealth(isKnownFragile)

  const [draft, setDraft] = useState<OnboardingDraft>(emptyOnboardingDraft)
  const [index, setIndex] = useState(0)

  const cards = onboardingCards(draft.multi, members)
  /* La file peut raccourcir sous le doigt — retirer un prénom depuis la
     première carte en enlève une. Le curseur se borne donc à chaque rendu
     plutôt que d'être corrigé après coup : borné ici, il n'existe jamais
     d'index qui désigne une carte absente. */
  const rank = Math.min(index, cards.length - 1)
  const card = cards[rank] ?? { kind: 'who' as const }

  const categories = useMemo(
    () => onboardingCategories((id) => categoryMap.has(id)),
    [categoryMap],
  )
  const totals = onboardingTotals(draft, cards)

  const patch = (next: Partial<OnboardingDraft>): void => {
    setDraft((current) => ({ ...current, ...next }))
  }

  const finish = (): void => {
    const ym = startYm(draft)
    for (const payload of onboardingRecurrences(draft, cards, categories, kindOf, ym)) {
      addRecurrence(payload)
    }
    finishOnboarding()
    /* Après `finishOnboarding` et jamais avant : `setYm` appelle
       `ensureMonthOpen`, qui refuse d'ouvrir quoi que ce soit tant que le
       statut n'est pas « prêt ». Et seulement si l'on part du mois suivant —
       `setYm(courant)` serait un aller-retour pour rien. */
    if (draft.start === 'next') setYm(ym)
    /* `replace`, pour que le retour du navigateur ramène à la présentation et
       non à une file dont le document est déjà créé. */
    void navigate('/', { replace: true })
  }

  const next = (): void => {
    if (rank >= cards.length - 1) {
      finish()
      return
    }
    setIndex(rank + 1)
  }

  const back = (): void => {
    setIndex(Math.max(0, rank - 1))
  }

  /* Repasser en solo retire les prénoms : solo veut dire zéro membre, et tout
     l'aval — `scopeToMember`, `memberCharges` — a un chemin solo explicite qui
     n'existe que là. Un document « solo » avec deux membres oubliés serait un
     document à plusieurs qui s'ignore. */
  const setMode = (multi: boolean): void => {
    if (!multi) for (const member of members) removeMember(member.id)
    patch({ multi })
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-4 px-4 py-4 md:px-8">
      {/* Le titre ne s'affiche pas : chaque carte porte le sien, qui est la
          question du moment. Il existe quand même — un écran sans `<h1>` ne se
          repère pas au lecteur d'écran et ne s'annonce pas en changeant. */}
      <PageTitle title={t.app.name} hidden />

      <div className="flex items-center gap-3">
        {/* En app installée il n'y a pas de bouton retour du navigateur : sans
            celui-ci, quelqu'un qui veut relire la présentation ou charger
            l'exemple n'a plus qu'à répondre ou à fermer. */}
        <Link
          to={LANDING_PATH}
          aria-label={t.onboarding.backToLanding}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-input text-muted hover:bg-surface-2"
        >
          <ChevronLeft size={18} />
        </Link>
        <StepBar index={rank} total={cards.length} />
        {/* Le compteur porte ce que les segments dessinent : eux sont
            décoratifs, lui est lu. Sa forme longue est le nom accessible. */}
        <span
          className="t-axis tnum shrink-0"
          aria-label={tpl(t.onboarding.progress, rank + 1, cards.length)}
        >
          {tpl(t.onboarding.counter, rank + 1, cards.length)}
        </span>
      </div>

      {/* La question **est** l'écran, elle n'est pas posée dessus.
          Elle a d'abord été une tuile étirée sur la hauteur du cadre, et une
          tuile qui s'étire fait ce que fait une tuile : elle dessine un bord.
          Sur la carte la plus courte — deux positions à choisir — le bord
          enfermait la question en haut de mille pixels de blanc, et le blanc se
          lisait comme une réponse qui manque.
          Elle tient donc maintenant sa hauteur, centrée dans ce qui reste entre
          la barre de progression et le pied : c'est la mise en page de la
          maquette, où l'onboarding n'a aucune tuile — la surface est le fond de
          l'écran, et le contenu s'y centre. La revue a le même parti, à ceci
          près qu'elle garde son cadre : une carte qu'on traverse est un objet
          qui passe, une question qu'on se pose ne l'est pas. */}
      {/* `gap-5` : un titre de section est à 20px de son contenu (DS §4), et
          la question se tenait à 16 de la réponse sur les sept cartes. */}
      <section className="flex flex-1 flex-col justify-center gap-5 py-2">
        <div className="flex flex-col gap-2">
          <h2 className="t-section">{cardTitle(card)}</h2>
          <p className="t-label">{cardBody(card)}</p>
        </div>

        {card.kind === 'who' && (
          <WhoCard
            multi={draft.multi}
            members={members}
            onMode={setMode}
            onAdd={(name) => {
              addMember(name)
            }}
            onRemove={removeMember}
          />
        )}

        {card.kind === 'income' && (
          <AmountCard
            keys={draft.incomes[card.key] ?? ''}
            label={t.onboarding.incomeKeypad}
            onSubmit={next}
            onChange={(keys) => {
              patch({ incomes: { ...draft.incomes, [card.key]: keys } })
            }}
          />
        )}

        {card.kind === 'rent' && (
          <AmountCard
            keys={draft.rent}
            label={t.onboarding.rentKeypad}
            onSubmit={next}
            onChange={(rent) => {
              patch({ rent })
            }}
          />
        )}

        {card.kind === 'extras' && (
          <ExtrasCard
            extras={draft.extras}
            total={totals.extras}
            fallbackLabel={
              categories.fallback === null
                ? null
                : (categoryMap.get(categories.fallback)?.label ?? null)
            }
            onAdd={(extra: ExtraCharge) => {
              patch({ extras: [...draft.extras, extra] })
            }}
            onRemove={(id) => {
              patch({ extras: draft.extras.filter((extra) => extra.id !== id) })
            }}
          />
        )}

        {card.kind === 'start' && (
          <StartCard
            value={draft.start}
            onChange={(start) => {
              patch({ start })
            }}
          />
        )}

        {card.kind === 'summary' && <SummaryCard members={members} totals={totals} />}
      </section>

      <div className="flex flex-col gap-2">
        <Button full onClick={next}>
          {card.kind === 'summary' ? t.onboarding.start : t.common.next}
        </Button>
        <div className="flex gap-2">
          {rank > 0 && (
            <Button variant="ghost" className="flex-1" onClick={back}>
              {t.onboarding.back}
            </Button>
          )}
          {/* « Plus tard » saute la carte sans y répondre, et il est aussi
              visible que l'action principale : c'est la condition que le cahier
              §4.1 met à l'existence de chaque question. Il n'a pas de sens sur
              le récapitulatif, qui ne demande rien. */}
          {card.kind !== 'summary' && (
            <Button variant="ghost" className="flex-1" onClick={next}>
              {t.onboarding.later}
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-1">
          {/* Le jour, annoncé là où il se décide sans se demander : une valeur
              posée à la place de quelqu'un et jamais dite se découvre au premier
              mois faux. */}
          {(card.kind === 'income' || card.kind === 'rent' || card.kind === 'extras') && (
            <p className="t-axis text-center">{t.onboarding.dayNote}</p>
          )}
          <p className="t-axis text-center">{t.onboarding.privacy}</p>
          {/* La contrepartie se dit sur la présentation, avant qu'on arrive
              ici. Ce qui reste est le geste qui la couvre, et il se dit au
              moment de conclure — pas sur chacune des sept cartes.
              Il se durcit d'un cran là où le navigateur a déjà répondu qu'il ne
              s'engageait pas, et là seulement : voir `isKnownFragile`. */}
          {card.kind === 'summary' && (
            <p className="t-axis text-center">
              {fragile ? t.onboarding.backupFragile : t.onboarding.backup}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
