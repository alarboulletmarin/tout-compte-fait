import { type ReactNode, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MonthHeader } from '@/app/MonthHeader'
import { RECURRENCE_NEW_PATH } from '@/app/routes'
import { type Money, ZERO, add, sub, sum } from '@/domain/money'
import { isCommon } from '@/domain/split'
import { entriesOfMonth } from '@/domain/stats'
import type { Entry } from '@/domain/types'
import { t } from '@/i18n/strings'
import { de, formatDayMonthShort, formatMoney, formatPercent, tpl } from '@/i18n/format'
import {
  useCategoryMap,
  useCurrentYm,
  useEntries,
  useIsCommonFilter,
  useIsCurrentMonth,
  useKindOf,
  useMemberFilter,
  useMemberMap,
  useMonthSplit,
  useMonthTotals,
  useRestToLive,
  useScopedMonthEntries,
} from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { EmptyState } from '@/ui/EmptyState'
import { Eyebrow } from '@/ui/Eyebrow'
import { ForecastIcon } from '@/ui/Icons'
import { ListRow } from '@/ui/ListRow'
import { PageTitle } from '@/ui/PageTitle'
import { Tile } from '@/ui/Tile'
import { useCurrency } from '@/ui/currency'

/** Une ligne de l'écran : l'entrée telle qu'on la lit, et ce qu'on écrit dessous. */
type Line = { entry: Entry; meta: string }

/** Une section : son titre, son total, ses lignes, et la règle qui les tient. */
type Section = {
  key: string
  title: string
  total: Money
  /** Omis, le montant se lit comme un solde et porte son signe (DS §3). */
  direction?: 'in' | 'out'
  lines: Line[]
  /** Ce que la section dit sous elle : la règle de partage, les sous-totaux. */
  meta: string | null
}

/**
 * La tuile de tête : où le mois atterrit, et ce qu'il en reste d'ici la paie.
 *
 * **Le design appelait « reste à vivre » ce que le code appelle
 * « prévisionnel »**, et les deux ne sont pas le même chiffre : `restToLive`
 * (`stats.ts`) arrête le solde **la veille de la prochaine rentrée d'argent**,
 * quand `revenus − charges` court jusqu'au 31. Sur un foyer payé le 28, l'écart
 * vaut presque un mois de charges — sous le même mot. Les deux lectures
 * s'affichent donc toutes les deux, avec les libellés et les phrases de
 * `SituationSection`, qui les porte déjà sur l'écran du mois : deux noms pour un
 * chiffre, ou deux chiffres sous un nom, se lisent l'un comme l'autre comme une
 * erreur de calcul.
 *
 * Le reste à vivre se lit depuis aujourd'hui : sur un mois passé son horizon est
 * derrière, sur un mois à venir il est encore devant. Il se calcule dans les
 * deux cas et ne veut rien dire ni dans l'un ni dans l'autre — d'où la tuile qui
 * mène alors avec le prévisionnel, plutôt qu'avec un chiffre faux. C'est déjà la
 * règle de la rangée « Reste à vivre » du mois.
 *
 * Sur le pot commun, la tuile s'efface entière, pour la raison qui y efface le
 * solde : le pot n'a aucun revenu, et une soustraction de charges à des
 * ressources y vaudrait les charges, au signe près.
 */
function HeadTile({ scope }: { scope: string }) {
  const totals = useMonthTotals()
  const remaining = useRestToLive()
  const thisMonth = useIsCurrentMonth()

  const same = remaining === totals.forecastBalance
  const hint = same ? t.dashboard.remainingSame : t.dashboard.remainingHint

  /* La lecture qui mène, et celle qui l'accompagne. Sur un autre mois il n'y en
     a qu'une : `restToLive` y répondrait quand même, et sa réponse ne
     désignerait rien. */
  const lead = thisMonth
    ? { label: t.dashboard.remaining, value: remaining, hint }
    : { label: t.dashboard.forecast, value: totals.forecastBalance, hint: t.dashboard.forecastHint }

  return (
    <Tile className="gap-2">
      <Eyebrow icon={ForecastIcon}>{`${lead.label} ${scope}`}</Eyebrow>
      {/* `fit-box` : le chiffre se taille sur la tuile, qui prend ici toute la
          largeur de la page — c'est le gabarit du chiffre héros du DS §3. */}
      <span className="fit-box block">
        <Amount
          value={lead.value}
          size="hero-fit"
          tone={lead.value < ZERO ? 'danger' : 'default'}
        />
      </span>
      <span className="t-label">{lead.hint}</span>

      {thisMonth && (
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 border-t border-border pt-3">
          <span className="t-body">{t.dashboard.forecast}</span>
          <Amount value={totals.forecastBalance} size="body" />
          <span className="t-label w-full">{t.dashboard.forecastHint}</span>
        </div>
      )}
    </Tile>
  )
}

/** Le titre d'une section, son total à droite, ses lignes, et sa règle dessous. */
function FlowSection({ section }: { section: Section }) {
  const categories = useCategoryMap()

  return (
    <section className="flex flex-col gap-2">
      {/* Le total passe à la ligne plutôt que de pousser son titre hors du
          cadre : « Charges personnelles » et un montant à six chiffres ne
          tiennent pas ensemble sur les 288px utiles d'un téléphone de 320, et
          un eyebrow est en `nowrap` — il déborderait au lieu de se serrer.
          C'est déjà la parade de l'en-tête de la liste du mois. */}
      <Tile className="gap-2 p-2! md:p-2!">
        {/* L'en-tête **dans** la tuile : le `px-3` d'une `ListRow` pose la
            verticale des montants à 21px du bord de section — un pixel de
            bordure, huit de cadre, douze de rangée —, et 21 n'est pas sur
            l'échelle du DS. Aucun utilitaire posé du dehors ne pouvait donc
            tomber juste, et le total se lisait 19px à droite de la colonne
            qu'il additionne. Dedans, il partage le rembourrage des rangées et
            tombe dessus sans qu'on ait à calculer quoi que ce soit. */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-3 pt-1">
          <Eyebrow className="text-muted">{section.title}</Eyebrow>
          <Amount
            value={section.total}
            size="body"
            {...(section.direction === undefined
              ? { signed: true }
              : { direction: section.direction })}
          />
        </div>

        <ul className="flex flex-col">
          {section.lines.map(({ entry, meta }) => (
            <li key={entry.id}>
              <ListRow
                color={categories.get(entry.categoryId)?.color ?? 'var(--cat-rest)'}
                label={entry.label}
                {...(meta === '' ? {} : { meta })}
                planned={entry.status === 'planned'}
                trailing={<Amount value={entry.amount} direction={entry.direction} />}
              />
            </li>
          ))}
        </ul>
      </Tile>

      {section.meta !== null && <p className="t-axis">{section.meta}</p>}
    </section>
  )
}

/**
 * Le détail de ce qui rentre et de ce qui sort — l'écran au bout des deux
 * tuiles du mois.
 *
 * Les tuiles Revenus et Charges portaient chacune un total et ne menaient nulle
 * part : on lisait « 2 480,00 € » sans jamais pouvoir demander « de quoi ? ».
 * C'est ce que cet écran répond, et c'est pourquoi il vit sous l'en-tête de
 * mois comme elles — les deux chiffres qu'il détaille sont ceux du mois affiché
 * et du filtre en cours, pas ceux d'un foyer hors du temps.
 *
 * **La bascule « Le foyer · Alice · Sam » est la rangée de pilules de
 * l'en-tête**, et non un `Segmented` à elle. Un foyer de six donnerait sept
 * positions là où le DS §6 en pose « deux à six » ; la piste défilante existe
 * pour exactement ce besoin. Et surtout elle lit `store.filter` : un second
 * contrôle avec son propre état ferait deux vérités pour un même filtre, et le
 * chiffre de la tuile qui mène ici cesserait d'être celui qu'on retrouve.
 *
 * **Aucun calcul nouveau, et aucune multiplication à l'écran.**
 * `useScopedMonthEntries()` découpe déjà chaque charge commune ligne à ligne —
 * `scopeToMember` alloue au plus fort reste, en centimes entiers, si bien que
 * la somme des parts vaut exactement le total. Une part recalculée ici en
 * flottant ne retomberait pas sur la quote-part annoncée par la Répartition.
 * L'entrée découpée perd en revanche son montant plein : il se retrouve par
 * appariement sur l'`id` avec les entrées du mois, jamais par division.
 *
 * **L'horizon est celui des tuiles : le mois entier, échéances prévues
 * comprises.** `useScopedMonthEntries` rend les prévues avec les confirmées, et
 * les totaux par section se somment donc exactement comme `useMonthFlows` — la
 * même règle que la liste du mois, qui compte le mois entier depuis qu'elle le
 * porte en entier. Deux chiffres du même produit qui ne compteraient pas les
 * mêmes lignes se liraient comme une erreur.
 *
 * Son état vide renvoie à la récurrence et non à la dépense, pour la raison qui
 * vaut sur le mois et sur la revue : un détail vide n'est pas un détail qui
 * manque, c'est un mois que rien ne remplit encore.
 */
export function FlowsPage() {
  const navigate = useNavigate()
  const currency = useCurrency()
  const ym = useCurrentYm()
  const scoped = useScopedMonthEntries()
  const all = useEntries()
  const kindOf = useKindOf()
  const members = useMemberMap()
  const memberFilter = useMemberFilter()
  const common = useIsCommonFilter()
  const { shares } = useMonthSplit()

  /* Les entrées du mois **hors filtre**, par identifiant : c'est là que se lit
     le montant plein d'une charge commune que la portée vient de découper.
     `useMonthEntries` ne peut pas le donner — sous un filtre par membre, il ne
     rend que les lignes à son nom, et une charge commune n'est à personne. */
  const fullAmounts = useMemo(() => {
    const map = new Map<string, Entry>()
    for (const entry of entriesOfMonth(all, ym)) map.set(entry.id, entry)
    return map
  }, [all, ym])

  const scopeName = memberFilter === undefined ? null : (members.get(memberFilter)?.name ?? null)

  const sections = useMemo(() => {
    const income: Line[] = []
    const shared: Line[] = []
    const own: Line[] = []
    const saving: Line[] = []
    let savingNet: Money = ZERO

    for (const entry of scoped) {
      const origin = fullAmounts.get(entry.id)
      const kind = kindOf(entry.categoryId)

      /* Le montant plein n'est écrit que lorsqu'il diffère : seul du foyer, la
         portée rend la ligne entière au membre unique, et « part de X sur
         1 100,00 € » y annoncerait un découpage qui n'a pas eu lieu. */
      const cut = origin !== undefined && origin.amount !== entry.amount
      const who =
        memberFilter === undefined && entry.memberId !== undefined
          ? members.get(entry.memberId)?.name
          : undefined
      const note = entry.note?.trim()
      const meta = [
        formatDayMonthShort(entry.date),
        who,
        note === '' ? undefined : note,
        cut && origin !== undefined && scopeName !== null
          ? tpl(t.flows.share, de(scopeName), formatMoney(origin.amount, currency))
          : undefined,
      ]
        .filter((part) => part !== undefined && part !== '')
        .join(' · ')

      const line = { entry, meta }

      if (kind === 'resource') {
        income.push(line)
        continue
      }
      if (kind === 'saving') {
        saving.push(line)
        savingNet =
          entry.direction === 'in' ? sub(savingNet, entry.amount) : add(savingNet, entry.amount)
        continue
      }
      // Charge ou crédit : la frontière du pot se lit sur l'entrée d'origine,
      // jamais sur la copie découpée — `scopeToMember` lui pose le membre du
      // filtre, ce qui la ferait passer pour une ligne personnelle.
      if (origin !== undefined && isCommon(origin, kindOf)) shared.push(line)
      else own.push(line)
    }

    /* La règle de partage et les coefficients qu'elle produit, sous les charges
       communes : le pourcentage vient de `useMonthSplit`, c'est-à-dire de la
       même allocation qui a découpé les lignes juste au-dessus. */
    const rule =
      shares === null
        ? t.flows.commonRule
        : [
            t.flows.commonRule,
            ...shares.map(
              (share) =>
                `${members.get(share.memberId)?.name ?? ''} ${formatPercent(share.shareBp / 10_000, 1)}`,
            ),
          ].join(' · ')

    /* Le sous-total par personne, sous les charges personnelles : c'est la
       seule lecture que la section n'a pas déjà, et elle répond à « qui porte
       quoi » sans qu'on additionne des lignes de tête. Les lignes que personne
       ne porte tombent sous « Tout le monde », comme dans la liste du mois
       rangée par personne : sans elles, les sous-totaux ne redonneraient plus
       le total de la section. */
    const perMember = new Map<string, Money>()
    for (const { entry } of own) {
      const key = entry.memberId ?? ''
      perMember.set(key, add(perMember.get(key) ?? ZERO, entry.amount))
    }
    const byMember =
      /* Une seule colonne à annoncer, et le sous-total recopie le total de la
         section sous un prénom : c'est la vue d'une personne, ou un foyer dont
         tout le perso est à la même. On se tait plutôt que d'écrire deux fois
         le même chiffre. */
      perMember.size < 2
        ? ''
        : [...perMember.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(
              ([id, total]) =>
                `${members.get(id)?.name ?? t.shell.everyone} ${formatMoney(total, currency, false)}`,
            )
            .join(' · ')

    const built: Section[] = [
      {
        key: 'in',
        title: t.flows.in,
        total: sum(income.map((line) => line.entry.amount)),
        direction: 'in' as const,
        lines: income,
        meta: null,
      },
      {
        key: 'common',
        title: t.flows.common,
        total: sum(shared.map((line) => line.entry.amount)),
        direction: 'out' as const,
        lines: shared,
        meta: rule,
      },
      {
        key: 'own',
        title: t.flows.own,
        total: sum(own.map((line) => line.entry.amount)),
        direction: 'out' as const,
        lines: own,
        meta: byMember === '' ? null : byMember,
      },
      /* L'épargne n'est ni un revenu ni une charge — un versement sort du compte
         mais reste au foyer, et c'est la règle qui l'exclut de `spendingFlow`.
         Elle a pourtant sa section : sans elle, un écran qui prétend détailler
         le mois en tairait des lignes que la liste du mois montre. Son total est
         net, versements moins reprises, comme partout ailleurs. */
      {
        key: 'saving',
        title: t.flows.saving,
        total: savingNet,
        lines: saving,
        meta: null,
      },
    ]

    return built.filter((section) => section.lines.length > 0)
  }, [scoped, fullAmounts, kindOf, members, memberFilter, scopeName, shares, currency])

  let content: ReactNode
  /* Deux vides, et deux phrases : le mois n'a rien, ou le filtre ne laisse
     rien. Le pot commun d'un mois sans charge partagée est le second cas, et
     lui dire « écris une récurrence » serait faux — le mois est plein, c'est la
     lecture qui est vide, et la rangée de pilules juste au-dessus est ce qui la
     défait. La règle est celle de la liste du mois, qui distingue déjà les
     deux. */
  if (fullAmounts.size === 0) {
    content = (
      <EmptyState
        message={t.flows.empty}
        actionLabel={t.recurrences.add}
        onAction={() => {
          void navigate(RECURRENCE_NEW_PATH)
        }}
      />
    )
  } else if (sections.length === 0) {
    content = <EmptyState message={t.flows.filtered} />
  } else {
    content = (
      /* Pas de plafond : le bandeau, les chevrons de `MonthNav` et la piste
         de pilules qui surmontent cet écran vivent dans la boîte de contenu
         entière, et 768px arrêtaient la pile 224px avant eux — le même écran
         se lisait sur deux largeurs. */
      <div className="flex flex-col gap-5">
        {/* Le pot commun n'a pas de solde : il n'a aucun revenu, et une
            soustraction y vaudrait les charges au signe près. */}
        {!common && <HeadTile scope={scopeName === null ? t.flows.scopeHousehold : de(scopeName)} />}
        {sections.map((section) => (
          <FlowSection key={section.key} section={section} />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <PageTitle
        title={t.flows.title}
        onBack={() => {
          void navigate('/')
        }}
      />
      <MonthHeader prorataNote />
      {content}
    </div>
  )
}
