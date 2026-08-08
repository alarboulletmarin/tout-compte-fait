import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MonthHeader } from '@/app/MonthHeader'
import { RECURRENCES_PATH, RECURRENCE_NEW_PATH, SETTINGS_PEOPLE_PATH } from '@/app/routes'
import type { YearMonth } from '@/domain/date'
import { sum } from '@/domain/money'
import { totalToPay } from '@/domain/split'
import type { MemberShare } from '@/domain/split'
import type { Entry, Member } from '@/domain/types'
import { fr } from '@/i18n/fr'
import {
  formatDayMonthShort,
  formatMoney,
  formatPercent,
  formatSignedMoney,
  formatYearMonth,
  de,
  tpl,
} from '@/i18n/format'
import {
  useCategoryMap,
  useMemberIncomes,
  useMemberMap,
  useMembers,
  useMonthSplit,
  useUnassignedIncomes,
} from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Button } from '@/ui/Button'
import { Disclosure } from '@/ui/Disclosure'
import { Dot } from '@/ui/Dot'
import { EmptyState } from '@/ui/EmptyState'
import { Eyebrow } from '@/ui/Eyebrow'
import { SplitIcon } from '@/ui/Icons'
import { ListRow } from '@/ui/ListRow'
import { PageTitle } from '@/ui/PageTitle'
import { Tile } from '@/ui/Tile'
import { useCurrency } from '@/ui/currency'
import { useDisclosureGroup } from '@/ui/useDisclosureGroup'

/* Les deux sections repliables de l'écran. Nommées, parce qu'elles servent à
   la fois de clé de groupe et de repère de lecture entre leur déclaration et
   leur rendu, à deux cents lignes d'écart. */
const SETTLEMENT_KEY = 'settlement'
const DETAIL_KEY = 'detail'

/** « Alix », « Alix et Camille », « Alix, Camille et Sacha ». */
function enumerate(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} et ${names.at(-1) ?? ''}`
}


/** Ce qui manque pour répartir : la phrase, le geste, et où il mène. */
type Missing = { message: string; hint: string; actionLabel: string; path: string }

/**
 * Ce qui manque pour répartir, nommé — et le geste qui va avec.
 *
 * Sans personne à nommer, le prorata bloque quand même : chacun porte une
 * ressource, mais toutes à zéro. La phrase le disait alors sans sujet —
 * « Ajoute le revenu de  pour répartir les charges ».
 *
 * Trois impasses, et elles n'appellent pas le même geste. Le revenu qui manque
 * n'existe pas encore ; ou bien il existe et n'est pas chiffré — un salaire à
 * montant variable dont aucune échéance ne dit encore le montant ; ou bien il
 * est chiffré à zéro, ce qui n'est pas un revenu mais un chiffre qu'on ne sait
 * pas lire. Envoyer « ajouter un revenu » dans les deux derniers cas fait créer
 * un doublon là où il ne manque qu'un montant.
 */
function missingIncomes(unknown: readonly Member[], unpriced: number, zero: number): Missing {
  const names = unknown.map((member) => member.name)
  const who = de(enumerate(names))

  // Tous les revenus manquants sont déclarés à zéro : le chiffre est là, c'est
  // lui qui ne dit rien.
  if (zero > 0 && zero === names.length) {
    return {
      message: tpl(names.length === 1 ? fr.split.zeroOne : fr.split.zeroMany, who),
      hint: fr.split.zeroHint,
      actionLabel: fr.split.goToSubscriptions,
      path: RECURRENCES_PATH,
    }
  }

  // Tous les revenus manquants sont des variables non chiffrés, ou à zéro : les
  // récurrences sont là, il n'y a qu'un montant à poser.
  if (unpriced > 0 && unpriced + zero === names.length) {
    return {
      message: tpl(names.length === 1 ? fr.split.unpricedOne : fr.split.unpricedMany, who),
      hint: fr.split.unpricedHint,
      actionLabel: fr.split.goToSubscriptions,
      path: RECURRENCES_PATH,
    }
  }

  return {
    message:
      names.length === 0
        ? fr.split.missingNone
        : tpl(names.length === 1 ? fr.split.missingOne : fr.split.missingMany, who),
    hint: fr.split.missingHint,
    actionLabel: fr.split.goToIncome,
    path: RECURRENCE_NEW_PATH,
  }
}

/**
 * Une part, et le calcul qui la produit.
 *
 * Le résultat vient en dernier, après les termes qui le donnent : c'est l'ordre
 * dans lequel le calcul se fait, et le seul qui permette de le suivre. Annoncé
 * d'abord, « À verser » se croit sur parole, et les lignes en dessous ne sont
 * plus qu'une justification qu'on ne lit pas.
 */
function ShareRow({ share, previousYm }: { share: MemberShare; previousYm: YearMonth }) {
  const members = useMemberMap()
  const currency = useCurrency()
  const member = members.get(share.memberId)

  return (
    <li className="flex flex-col gap-1 border-t border-border py-3">
      <div className="flex items-center gap-2">
        <Dot color={member?.color ?? 'var(--cat-rest)'} />
        <span className="t-body min-w-0 flex-1 truncate font-medium">{member?.name ?? ''}</span>
        {/* Le prorata, à côté du revenu dont il sort : le pourcentage seul est
            ce que la tuile du tableau de bord montrait déjà, et il ne dit pas
            d'où il vient. */}
        <span className="t-axis tnum shrink-0">{formatPercent(share.shareBp / 10_000, 1)}</span>
      </div>

      {/* Le membre seul porte 100 % sans qu'aucun revenu soit exigé : le sien
          peut valoir zéro ici, et « Revenu 0,00 € » se lirait comme une donnée
          quand c'est une absence. */}
      {share.income > 0 && (
        <div className="flex items-baseline justify-between gap-3">
          <span className="t-axis min-w-0">{fr.split.income}</span>
          <span className="t-axis tnum shrink-0">{formatMoney(share.income, currency, false)}</span>
        </div>
      )}

      {/* Sans report, ces deux lignes ne disent rien : « Sa part du mois »
          recopierait à l'identique le « À verser » juste dessous, et une
          régularisation à zéro laisserait croire à un rattrapage là où les
          comptes tombaient justes. */}
      {share.adjustment !== 0 && (
        <>
          {/* Avec ses centimes, contrairement au revenu : c'est le premier
              terme de la soustraction qu'on lit juste en dessous, et arrondi il
              ne tombe plus juste — « 521 € − 45,60 € » ne fait pas 475,20 €.
              Ces trois lignes n'existent que pour être vérifiables. */}
          <div className="flex items-baseline justify-between gap-3">
            <span className="t-axis min-w-0">{fr.split.settlementShare}</span>
            <span className="t-axis tnum shrink-0">{formatMoney(share.due, currency)}</span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            {/* Le libellé passe à la ligne, il ne se tronque pas : c'est lui qui
                porte l'argument de la carte, et « Régularisation de sep… » ne
                porte plus rien. Le DS §5 tranche le cas — c'est au format d'être
                choisi pour le libellé, jamais au libellé d'être raboté. */}
            <span className="t-axis min-w-0">
              {tpl(fr.split.settlement, de(formatYearMonth(previousYm)))}
            </span>
            {/* Signé, et sans `direction` : ce n'est pas un flux dont on lirait
                la valeur absolue, c'est un écart dont le signe est toute la
                lecture — la règle qu'applique déjà `MemberShareTile`. */}
            <span className="t-axis tnum shrink-0">
              {formatSignedMoney(share.adjustment, currency)}
            </span>
          </div>
        </>
      )}

      <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="t-label">{fr.split.due}</span>
        {/* Une sortie tant que c'en est une, et un solde sinon : un mois sans
            charge commune ne laisse que le report, et celui qui a tout avancé
            le mois d'avant reçoit alors au lieu de verser. `direction`
            afficherait la valeur absolue et la ferait annoncer « sortie » —
            donc « 282,56 € à verser » à qui on doit cette somme. Le cas
            ordinaire ne bouge pas d'un pixel ni d'un mot. */}
        <Amount
          value={share.toPay}
          size="body"
          {...(share.toPay < 0 ? {} : { direction: 'out' as const })}
        />
      </div>
    </li>
  )
}

/**
 * Le détail de la répartition du mois — l'écran qu'ouvre la tuile.
 *
 * Il montre le calcul plutôt que son seul résultat : c'est ce qui rend un
 * partage acceptable entre deux personnes. Le total des parts est affiché à
 * côté du total des charges, et les deux sont égaux au centime — c'est ce que
 * garantit la répartition aux plus forts restes, et le montrer vaut mieux que
 * de l'affirmer.
 */
export function SplitPage() {
  const { total, entries, shares, unknown, previousYm, advanced } = useMonthSplit()
  const incomes = useMemberIncomes()
  const unassigned = useUnassignedIncomes()
  const members = useMembers()
  const memberMap = useMemberMap()
  const categories = useCategoryMap()
  const currency = useCurrency()
  const navigate = useNavigate()
  const settlement = shares?.some((share) => share.adjustment !== 0) ?? false

  /* Nommé une fois, rendu à deux endroits : il ouvre la carte des parts quand
     il y en a, et tient seul le mois sans charge commune — où il n'y a pas de
     carte pour le porter. */
  const subtitle = members.length === 1 ? fr.split.subtitleSolo : fr.split.subtitle

  /* Les clés disent ce qui est **rendu**, pas ce que l'écran sait faire : la
     section du report n'existe que sur un mois qui en porte un. Figées à deux,
     « tout replier » se serait proposé sur un mois sans report pour refermer
     une section absente du DOM — un geste sans effet, ce qui est la seule
     chose qu'un bouton ne doit jamais être. */
  const showSettlement = settlement && advanced.length > 0
  const keys = useMemo(
    () => (showSettlement ? [SETTLEMENT_KEY, DETAIL_KEY] : [DETAIL_KEY]),
    [showSettlement],
  )
  const disclosure = useDisclosureGroup(keys, false)

  /** La date, et le nom de qui a avancé la dépense quand il y en a un. */
  const metaOf = (entry: Entry): string => {
    const day = formatDayMonthShort(entry.date)
    const name = entry.memberId === undefined ? undefined : memberMap.get(entry.memberId)?.name
    return name === undefined ? day : `${day} · ${tpl(fr.split.advancedBy, name)}`
  }

  /* Droit sur « Personnes », et non sur la page de réglages : c'est là que les
     membres se gèrent depuis qu'elle n'est plus qu'une entrée, et l'écran
     renvoie ici précisément parce qu'il en manque un. */
  const goToSettings = (): void => {
    void navigate(SETTINGS_PEOPLE_PATH)
  }

  // Sans aucun membre, il n'y a personne à qui donner une part. Un seul
  // suffit en revanche : sa part vaut 100 %, et l'écran reste le seul endroit
  // où le pot se vérifie ligne à ligne — la tuile « Part du foyer » y mène.
  if (members.length === 0) {
    return (
      <>
        <PageTitle title={fr.split.title} />
        <EmptyState
          message={fr.split.soloTitle}
          actionLabel={fr.split.goToSettings}
          onAction={goToSettings}
        >
          <p className="t-label max-w-xs">{fr.split.soloHint}</p>
        </EmptyState>
      </>
    )
  }

  if (shares === null) {
    const missing = missingIncomes(
      unknown,
      incomes.filter((income) => income.gap === 'unpriced').length,
      incomes.filter((income) => income.gap === 'zero').length,
    )
    return (
      <>
        <PageTitle title={fr.split.title} />
        {/* Le mois compte jusque dans cette impasse : les revenus se lisent sur
            le mois affiché, et une récurrence qui démarre le mois prochain
            laisse celui-ci sans répartition. Sans navigation, il fallait
            repasser par l'écran du mois pour s'en apercevoir. */}
        <MonthHeader withMemberFilter={false} />
        <EmptyState
          message={missing.message}
          actionLabel={missing.actionLabel}
          onAction={() => {
            void navigate(missing.path)
          }}
        >
          <p className="t-label max-w-sm">{missing.hint}</p>
          {unassigned.length > 0 && (
            <p className="t-label max-w-sm">
              {tpl(
                unassigned.length > 1
                  ? fr.settings.incomeUnassignedMany
                  : fr.settings.incomeUnassignedOne,
                unassigned.map((r) => r.label).join(', '),
              )}
            </p>
          )}
        </EmptyState>
      </>
    )
  }

  return (
    <>
      <PageTitle title={fr.split.title} />
      {/* L'écran lit `ym` du store — les charges communes, les revenus et le
          report du mois précédent en dépendent tous — et n'offrait aucun moyen
          d'en changer : vérifier la répartition de juillet imposait de repasser
          par l'écran du mois. Sans filtre par membre : cet écran montre les
          parts de tout le monde, et n'en garder qu'une le viderait de ce qu'il
          existe pour dire. */}
      <MonthHeader withMemberFilter={false} />

      <div className="flex max-w-3xl flex-col gap-4">
        <Tile variant="accent">
          <Eyebrow icon={SplitIcon}>{fr.split.total}</Eyebrow>
          <Amount value={total} size="tile" className="mt-3" />
          <span className="t-label mt-1">{fr.split.totalHint}</span>
        </Tile>

        {total <= 0 ? (
          <>
            <p className="t-label">{subtitle}</p>
            <p className="t-label">{fr.split.nothing}</p>
          </>
        ) : (
          <>
            {/* La carte qu'on lit d'un trait, et non une tuile par membre.
                Le partage se vérifie ligne à ligne : ce qui le prouve, c'est de
                voir les parts et leur somme sans quitter le même cadre. Éclatée
                en une tuile chacun avec la vérification trois blocs plus bas,
                elle demandait de retenir deux chiffres pour constater qu'ils
                tombent — c'est-à-dire de la croire sur parole, exactement ce
                qu'un partage entre deux personnes ne fait pas.
                Hors grille bento, et c'est ce qui l'autorise : le DS §5 y
                plafonne une tuile à quatre éléments, quand celle-ci prend la
                hauteur que la liste demande. La page de présentation montre la
                même, pour la même raison.
                Sans eyebrow : le titre de l'écran dit déjà « Répartition », et
                une étiquette qui le répète deux blocs plus bas n'est plus un
                repère. C'est le sous-titre qui ouvre la carte — sans lui, le
                filet de la première part flotterait en tête de tuile sans rien
                séparer. */}
            <Tile className="gap-3">
              <p className="t-label">{subtitle}</p>

              <ul className="flex flex-col">
                {shares.map((share) => (
                  <ShareRow key={share.memberId} share={share} previousYm={previousYm} />
                ))}
              </ul>

              <div className="flex flex-wrap items-baseline justify-between gap-x-3 border-t border-border pt-3">
                <span className="t-body">{fr.split.checkTotal}</span>
                {/* Ce que chacun verse, report compris : les régularisations
                    s'annulent d'un membre à l'autre, et la vérification reste
                    donc vraie au centime — c'est ce qu'elle sert à montrer. */}
                <Amount value={totalToPay(shares)} size="body" direction="out" />
              </div>
              <p className="t-label">{fr.split.checkHint}</p>
            </Tile>

            {/* Le geste des trois autres écrans à listes repliables, au même
                bouton et au même libellé qui bascule (DS §6). Sans lui, chaque
                section se refermait à la main, et rien ne disait qu'elles
                allaient ensemble.
                Pas d'eyebrow à sa gauche, contrairement à l'écran du mois ou
                aux réglages : là-bas l'en-tête et les sections partagent une
                tuile, ici les deux `Disclosure` sont deux tuiles distinctes.
                Inventer un titre de section pour loger un bouton ajouterait à
                l'écran un élément qu'il n'a pas. */}
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={disclosure.toggleAll}>
                {disclosure.anyOpen ? fr.split.collapseAll : fr.split.expandAll}
              </Button>
            </div>

            {/* Le report s'ouvre comme le pot lui-même : une régularisation
                qu'on ne peut pas vérifier ne se vérifie pas, et c'est celle
                qu'on discute le plus. */}
            {showSettlement && (
              <Tile className="p-2! md:p-2!">
                <Disclosure
                  open={disclosure.isOpen(SETTLEMENT_KEY)}
                  onOpenChange={(open) => {
                    disclosure.setOpen(SETTLEMENT_KEY, open)
                  }}
                  title={
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="t-body truncate">
                        {tpl(fr.split.settlementDetail, formatYearMonth(previousYm))}
                      </span>
                      <span className="t-axis shrink-0">
                        {tpl(
                          advanced.length > 1 ? fr.split.detailCount : fr.split.detailCountOne,
                          advanced.length,
                        )}
                      </span>
                    </span>
                  }
                  trailing={
                    <Amount
                      value={sum(advanced.map((e) => e.amount))}
                      size="body"
                      direction="out"
                    />
                  }
                >
                  <ul className="flex flex-col">
                    {advanced.map((entry) => (
                      <li key={entry.id}>
                        <ListRow
                          color={categories.get(entry.categoryId)?.color ?? 'var(--cat-rest)'}
                          label={entry.label}
                          meta={metaOf(entry)}
                          trailing={<Amount value={entry.amount} direction="out" />}
                        />
                      </li>
                    ))}
                  </ul>
                  <p className="t-label mt-2">{fr.split.settlementHint}</p>
                  <p className="t-label">{fr.split.settlementNotACost}</p>
                </Disclosure>
              </Tile>
            )}

            {/* Le chiffre s'ouvre : une dépense qui n'a rien à faire dans le
                pot commun ne se repère qu'en la voyant. */}
            <Tile className="p-2! md:p-2!">
              <Disclosure
                open={disclosure.isOpen(DETAIL_KEY)}
                onOpenChange={(open) => {
                  disclosure.setOpen(DETAIL_KEY, open)
                }}
                title={
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="t-body truncate">{fr.split.detail}</span>
                    <span className="t-axis shrink-0">
                      {tpl(
                        entries.length > 1 ? fr.split.detailCount : fr.split.detailCountOne,
                        entries.length,
                      )}
                    </span>
                  </span>
                }
                trailing={<Amount value={total} size="body" direction="out" />}
              >
                <ul className="flex flex-col">
                  {entries.map((entry) => (
                    <li key={entry.id}>
                      <ListRow
                        color={categories.get(entry.categoryId)?.color ?? 'var(--cat-rest)'}
                        label={entry.label}
                        meta={metaOf(entry)}
                        planned={entry.status === 'planned'}
                        trailing={<Amount value={entry.amount} direction="out" />}
                      />
                    </li>
                  ))}
                </ul>
              </Disclosure>
            </Tile>

          </>
        )}

        <Tile className="gap-2">
          <Eyebrow>{fr.split.method}</Eyebrow>
          <p className="t-body mt-1">{fr.split.methodFormula}</p>
          <p className="t-label">{fr.split.methodIncome}</p>
          <p className="t-label">{fr.split.methodVariable}</p>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            <li className="t-label">{fr.split.methodIncluded}</li>
            <li className="t-label">{fr.split.methodFlagged}</li>
          </ul>
          <p className="t-label">{fr.split.methodExcluded}</p>
        </Tile>

        <p className="sr-only-text">{formatMoney(total, currency)}</p>
      </div>
    </>
  )
}
