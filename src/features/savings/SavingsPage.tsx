import { useNavigate } from 'react-router-dom'
import { MonthFilterChips } from '@/app/MonthHeader'
import {
  PEOPLE_PATH,
  SAVINGS_ANALYSIS_PATH,
  SAVINGS_MONTH_PATH,
  SUPPORT_NEW_PATH,
} from '@/app/routes'
import { ZERO, add } from '@/domain/money'
import { savingLeft } from '@/domain/stats'
import { t } from '@/i18n/strings'

import {
  useKindTotals,
  useMemberMap,
  useMembers,
  useScopedSavingSupports,
} from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { EmptyState } from '@/ui/EmptyState'
import { Eyebrow } from '@/ui/Eyebrow'
import { NavCalendar, YearsIcon } from '@/ui/Icons'
import { PageTitle } from '@/ui/PageTitle'
import { Row, RowGroup } from '@/ui/RowGroup'
import { Tile } from '@/ui/Tile'
import { CapitalTile } from './CapitalTile'
import { CoverageTile } from './CoverageTile'
import { GoalsSection } from './GoalsSection'
import { SupportsOverview } from './SupportsSection'
import { useIndividualScope } from './individualScope'

/**
 * La porte de l'analyse — une rangée, et **aucun chiffre**.
 *
 * Elle en portait deux : le cumul des versements de l'année, et l'écart avec
 * l'année d'avant. Ils sont partis avec la lecture qu'ils résumaient — du flux
 * pur, qui comptait ce qui sort du compte courant sans jamais dire ce que ça
 * avait produit. Ce que l'écran dédié dit maintenant est d'une autre nature : de
 * quoi le capital est fait.
 *
 * Ce chiffre-là ne peut pas remonter ici, et c'est un arbitrage d'octets assumé.
 * Il se calcule mois par mois sur toute la fenêtre (`domain/savingSeries.ts`) ;
 * en écrire un seul résultat sur cette page ferait entrer ce module dans le
 * graphe initial que `scripts/size.mjs` plafonne — pour une ligne de teaser, sur
 * un écran qui ne s'y arrête pas.
 */
function AnalysisPreview() {
  return (
    <RowGroup>
      <Row
        label={t.savings.analysis}
        description={t.savings.analysisPreview}
        icon={YearsIcon}
        to={SAVINGS_ANALYSIS_PATH}
      />
    </RowGroup>
  )
}

/**
 * Ce que le mois permet d'y mettre — **une tuile**, et un écran derrière elle.
 *
 * La page en portait quatre blocs : la capacité et sa cascade, les deux boutons
 * de versement, la ventilation par compte. Quatre blocs de flux au milieu d'un
 * écran de patrimoine, et surtout quatre blocs qui dépendent du mois affiché au
 * milieu de trois qui n'en dépendent pas. Il n'en reste que le seul chiffre
 * qu'on vient chercher en arrivant — ce qu'il reste à placer — et la porte de
 * `/epargne/mois`, où la question se pose entière.
 */
function MonthPreview() {
  const navigate = useNavigate()
  const totals = useKindTotals(true)

  return (
    <Tile
      onClick={() => {
        void navigate(SAVINGS_MONTH_PATH)
      }}
    >
      <Eyebrow icon={NavCalendar}>{t.savings.month}</Eyebrow>
      <Amount value={savingLeft(totals)} size="tile-fit" />
      <span className="t-label">{t.savings.left}</span>
    </Tile>
  )
}

/**
 * L'écran de l'épargne — celui qu'ouvre la tuile Capacité du mois.
 *
 * **Une vue d'ensemble, et elle conclut.** Elle empilait neuf blocs et ne disait
 * jamais *si ça va* : on y lisait « 18 320 € », « 6,4 mois », « 320 € restants »,
 * et rien n'en sortait. Une app de suivi d'épargne se juge exactement là-dessus —
 * la banque affiche déjà le solde, ce qu'on lui demande en plus est un jugement.
 * Les objectifs sont donc au centre optique, et non en bas de page : c'est le
 * seul bloc qui rende un verdict.
 *
 * **Le patrimoine et le mois ne se lisent plus ensemble.** Le premier se
 * consulte au trimestre et est ancré sur aujourd'hui ; le second se consulte à
 * la semaine et dépend du mois affiché. Les alterner faisait changer l'œil trois
 * fois de registre, et posait un navigateur de mois au-dessus d'une page dont la
 * moitié ne le suivait pas. Le mois est passé derrière une tuile et son écran
 * (`/epargne/mois`), et **l'en-tête de mois a disparu d'ici** — c'est la règle
 * que `CreditsPage` applique déjà : un navigateur de mois qui ne change rien à
 * l'écran vaut moins que son absence.
 *
 * **L'écran ne concourt pas sur « combien j'ai ».** La banque y répond mieux,
 * plus vite et sans qu'on recopie quoi que ce soit ; ce que l'app est seule à
 * savoir, c'est ce que ce capital tient face aux charges qu'elle connaît, et où
 * l'on en est de ce qu'on vise. Ce sont les deux lectures que personne d'autre
 * ne produit, et ce sont elles qui rendent un relevé utile.
 *
 * Les deux lectures ne s'additionnent jamais. Une valorisation n'est pas une
 * opération — elle n'entre ni dans le solde du mois, ni dans la capacité, ni
 * dans le versé — et un versement n'écrase aucune valorisation : sur un
 * placement, la valeur bouge aussi avec le marché.
 *
 * **La lecture est individuelle, et elle n'a pas d'autre forme.** L'épargne est
 * le seul chiffre de l'app qui n'a aucun sens au foyer : deux personnes qui ont
 * 12 000 € et 8 000 € de côté n'ont pas « 20 000 € ». L'écran ne propose donc ni
 * « Tout le monde » ni « Commun », seulement les personnes, et il s'assure
 * qu'une est choisie (`useIndividualScope`). Mais **un contrôle à une seule
 * valeur n'est pas un contrôle** : la rangée de pilules s'efface en solo, où
 * elle n'était qu'un bruit permanent.
 */
export function SavingsPage() {
  const navigate = useNavigate()
  const totals = useKindTotals(true)
  const members = useMembers()
  const memberMap = useMemberMap()
  const supports = useScopedSavingSupports()
  /* Pose une personne quand aucune ne l'est. Le filtre est posé même quand la
     rangée ne s'affiche pas : sans lui, l'écran lirait le foyer entier en solo,
     c'est-à-dire la somme que cet écran existe pour ne pas montrer. */
  const owner = useIndividualScope()

  const noFlow = add(totals.resource, add(totals.charge, add(totals.debt, totals.saving))) === ZERO
  const nothing = noFlow && supports.length === 0

  return (
    <>
      <PageTitle title={t.savings.title} />

      {/* Un contrôle à une seule valeur n'est pas un contrôle : la rangée ne
          s'affiche qu'à partir de deux personnes. */}
      {members.length > 1 && (
        <div className="mb-5">
          <MonthFilterChips personsOnly />
        </div>
      )}

      {nothing ? (
        /* Deux vides, deux causes, deux gestes — et le premier avait perdu le
           sien. « Un support est toujours à quelqu'un » se disait sans bouton,
           dans le seul écran de l'app à énoncer ce manque sans offrir d'y
           aller, pendant que la répartition et les deux formulaires d'épargne
           renvoient tous les trois au foyer avec le même libellé. */
        <EmptyState
          message={members.length === 0 ? t.savings.supportsNoMember : t.savings.supportsEmpty}
          {...(members.length === 0
            ? {
                actionLabel: t.split.goToSettings,
                onAction: () => {
                  void navigate(PEOPLE_PATH)
                },
              }
            : {
                actionLabel: t.savings.supportAdd,
                onAction: () => {
                  void navigate(SUPPORT_NEW_PATH)
                },
              })}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {/* Un seul chiffre héros : le capital. C'est la question qu'on se pose
              en arrivant, et la seule qui mérite cette taille. */}
          <CapitalTile
            net={totals.saving}
            owner={owner === null ? null : (memberMap.get(owner)?.name ?? null)}
          />

          {/* Deux lectures de rang égal, côte à côte : ce que le capital tient,
              et ce que le mois permet d'y mettre. L'autonomie **qualifie** le
              chiffre du dessus, elle ne rivalise pas avec lui — et le mois n'est
              plus qu'une porte.

              **Une grille ordinaire, et non la bento du DS §5.** Celle-ci pose
              des rangées d'une hauteur fixe — 88px sous 768 — pour des tuiles
              qui déclarent leur format ; l'autonomie porte un repli
              d'explication et ne rentre dans aucune. Mesuré : elle y était
              coupée de 203px en hauteur. Ce qu'on veut ici n'est pas un format
              de bento, c'est deux colonnes qui prennent la hauteur de ce
              qu'elles portent.

              **Et empilées sous 640px.** Deux colonnes y laissent ~140px
              chacune, quand le DS lui-même plafonne l'eyebrow d'une tuile
              étroite à treize caractères : « Combien de temps je tiens » en fait
              vingt-cinq. Côte à côte à 320, la rangée ne dirait plus rien de ce
              qu'elle nomme. */}
          <div className="grid gap-4 sm:grid-cols-2">
            <CoverageTile />
            <MonthPreview />
          </div>

          {/* Ce qui conclut à gauche, ce qui détaille à droite — au-delà de
              768px seulement. L'ordre du DOM ne bouge pas d'une ligne : les
              objectifs restent le premier bloc lu, et les deux autres le
              suivent dans leur ordre, empilés dans la colonne voisine plutôt
              que dessous. C'est exactement la hiérarchie que la pile disait
              déjà, rendue visible d'un coup d'œil au lieu de se découvrir en
              faisant défiler. */}
          <div className="cols">
            {/* Le seul bloc qui conclut, et c'est pourquoi il passe devant la
                liste des comptes : « à l'heure » ou « sept mois de retard » est ce
                qu'aucun relevé de banque ne dit, quand « où c'est placé » se lit
                ailleurs et en mieux. */}
            <GoalsSection />

            <div className="cols-stack">
              {/* Un aperçu, pas la gestion : relever un compte ou en ouvrir un se
                  fait sur l'écran dédié, vers lequel ce bloc renvoie. Les comptes y
                  sont rangés par ce qu'ils demandent, pas par ce qu'ils pèsent. */}
              <SupportsOverview />

              {/* « Est-ce que ça monte, au fond ? » — la réponse s'y arrête, elle ne
                  s'y décide pas : un aperçu et un lien vers `/epargne/analyse`, où
                  vivent le tracé, sa fenêtre et le cumul de l'année. */}
              <AnalysisPreview />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
