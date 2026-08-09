import { useNavigate } from 'react-router-dom'
import { SAVINGS_SUPPORTS_PATH, SUPPORT_NEW_PATH, VALUATIONS_PATH, supportPath } from '@/app/routes'
import { ZERO, type Money } from '@/domain/money'
import { latestValuation } from '@/domain/saving'
import type { SavingSupport, SavingValuation } from '@/domain/types'
import { t } from '@/i18n/strings'
import { NO_VALUE, tpl } from '@/i18n/format'
import {
  useCategoryMap,
  useSavingValuations,
  useSavingsBySupport,
  useSupportsByAttention,
  useSupportsDue,
} from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Button } from '@/ui/Button'
import { Dot } from '@/ui/Dot'
import { Eyebrow } from '@/ui/Eyebrow'
import { Plus } from '@/ui/Icons'
import { Row, RowGroup } from '@/ui/RowGroup'
import { freshness } from './freshness'

/**
 * Les rangées elles-mêmes, partagées entre la vue d'ensemble et l'écran
 * dédié : un nom, une pastille, ce à quoi le compte sert, l'âge du dernier
 * relevé, la dernière valeur et ce que le mois y a mis en net. Deux lectures du
 * même stock ne doivent pas pouvoir diverger sur ce qu'une rangée affiche.
 *
 * **Le rôle passe devant l'âge du relevé** dans la description, et c'est
 * l'ordre des deux questions : à quoi sert ce compte se lit avant depuis quand
 * on ne l'a pas revu. Un compte sans rôle ne dit rien — pas « aucun rôle », qui
 * ferait d'un silence une catégorie : la question se pose sur le formulaire et
 * dans la tuile d'autonomie, là où elle change un chiffre, et pas une fois par
 * ligne.
 */
function SupportRows({
  supports,
  valuations,
  netOf,
}: {
  supports: readonly SavingSupport[]
  valuations: readonly SavingValuation[]
  netOf: ReadonlyMap<string, Money>
}) {
  const categories = useCategoryMap()

  return (
    <RowGroup>
      {supports.map((support) => {
        const latest = latestValuation(valuations, support.id)
        const net = netOf.get(support.id) ?? ZERO
        const color = categories.get(support.categoryId)?.color ?? 'var(--cat-rest)'
        const age = freshness(latest?.date ?? null, support.pace)

        return (
          <Row
            key={support.id}
            leading={<Dot color={color} />}
            label={support.label}
            description={
              support.role === undefined
                ? age
                : `${t.savings.roleLabel[support.role]} · ${age}`
            }
            trailing={
              <span className="flex flex-col items-end gap-0.5">
                {/* « — » et jamais « 0 € » : zéro est une information
                    financière réelle, l'absence de relevé n'en est pas une. */}
                {latest === null ? (
                  <span className="t-num-body text-muted">{NO_VALUE}</span>
                ) : (
                  <Amount value={latest.amount} />
                )}
                {net !== ZERO && <Amount value={net} size="label" tone="muted" signed />}
              </span>
            }
            to={supportPath(support.id)}
          />
        )
      })}
    </RowGroup>
  )
}

/**
 * L'aperçu de `/epargne` : le stock, sans sa gestion.
 *
 * Relever ses comptes et en ouvrir un sont des gestes de patrimoine, plus
 * rares qu'un versement — ils vivent sur l'écran dédié (`SupportsSection`,
 * juste dessous), pas sur la vue d'ensemble, qui ne fait que dire où l'argent
 * est et renvoyer vers eux. « Gérer » est la seule action de cette rangée-ci.
 */
export function SupportsOverview() {
  const navigate = useNavigate()
  const supports = useSupportsByAttention()
  const valuations = useSavingValuations()
  const slices = useSavingsBySupport()
  const due = useSupportsDue()
  const netOf = new Map(slices.map((slice) => [slice.supportId, slice.total]))

  const shown = supports.filter(
    (support) =>
      !support.archived ||
      latestValuation(valuations, support.id) !== null ||
      netOf.has(support.id),
  )

  /* Un écran vide est une invitation, pas une absence (DS §7) : la section ne
     s'efface pas, elle propose le seul geste qui la peuplerait. Elle ne mène
     pas vers « Gérer » dans ce cas — il n'y aurait rien à y gérer. */
  if (shown.length === 0) {
    return (
      <section className="flex flex-col gap-3">
        <Eyebrow>{t.savings.supports}</Eyebrow>
        <p className="t-label">{t.savings.supportsEmpty}</p>
        <Button
          size="sm"
          variant="ghost"
          className="w-fit"
          onClick={() => {
            void navigate(SUPPORT_NEW_PATH)
          }}
        >
          <Plus size={18} />
          {t.savings.supportAdd}
        </Button>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Eyebrow>{t.savings.supports}</Eyebrow>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            void navigate(SAVINGS_SUPPORTS_PATH)
          }}
        >
          {t.nav.manage}
        </Button>
      </div>

      {due.length > 0 && (
        <span className="t-label">
          {due.length === 1 ? t.savings.valuesDueOne : tpl(t.savings.valuesDue, due.length)}
        </span>
      )}

      <SupportRows supports={shown} valuations={valuations} netOf={netOf} />
    </section>
  )
}

/**
 * Où l'argent est placé — un support par **rangée**, et non par tuile.
 *
 * Une tuile `2x2` prend toute la largeur sous 768px : quatre supports faisaient
 * quatre écrans de défilement, et une grille dont rien ne se range par deux
 * n'est plus un bento mais une pile de cartes (DS §5). Ce qu'il y a à lire ici —
 * un nom, une pastille, une date, un montant — est mot pour mot la définition de
 * `ListRow` au DS §6, et `RowGroup` en fait une liste qui tient sur un écran
 * quel que soit le nombre de comptes.
 *
 * Le titulaire quitte la rangée : l'écran ne montre jamais que les supports
 * d'une seule personne (`useScopedSavingSupports` sous un filtre individuel), et
 * le bandeau comme le capital la nomment déjà. La place sert à ce qu'on ne
 * savait pas dire — depuis quand ce chiffre n'a pas bougé.
 *
 * **Les deux gestes du patrimoine vivent ici**, et pas en tête d'écran : relever
 * ses comptes et ouvrir un support sont des gestes de gestion, plus rares qu'un
 * versement, et les poser à côté des actions transactionnelles donnait quatre
 * boutons de même poids au-dessus du premier chiffre. Ils sont sur la section
 * parce qu'ils ne peuvent pas être ailleurs : une rangée mène à sa fiche, et une
 * liste n'admet pas de bouton dans ses lignes.
 */
export function SupportsSection({
  heading = true,
}: {
  /**
   * L'écran dédié (`/epargne/supports`) porte déjà le même mot dans son
   * titre : répéter l'intitulé juste dessous ne le distinguerait de rien,
   * quand `/epargne` en a besoin pour se faire reconnaître au milieu des
   * autres sections de la vue d'ensemble.
   */
  heading?: boolean
} = {}) {
  const navigate = useNavigate()
  const supports = useSupportsByAttention()
  const valuations = useSavingValuations()
  const slices = useSavingsBySupport()
  const due = useSupportsDue()
  const netOf = new Map(slices.map((slice) => [slice.supportId, slice.total]))

  /* Un support archivé sort des formulaires, pas de la lecture : il reste
     visible tant qu'il a un relevé ou un mouvement dans le mois. */
  const shown = supports.filter(
    (support) =>
      !support.archived ||
      latestValuation(valuations, support.id) !== null ||
      netOf.has(support.id),
  )

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {heading && <Eyebrow>{t.savings.supports}</Eyebrow>}
        {/* Relever ses comptes sans ouvrir quatre fiches. C'est le geste réel —
            un relevé de banque donne tous les chiffres en même temps, donc on
            met tout à jour, on ne met pas à jour le Livret A. Corriger un seul
            chiffre à une autre date reste sur la fiche du support.

            **Le poids du bouton dit s'il y a quelque chose à faire.** Posé en
            `secondary` en permanence, il laissait entendre un rituel mensuel —
            qui n'est la bonne cadence d'aucun support : un livret se relève une
            fois l'an, un PEA au trimestre. Un écran qui réclame une mise à jour
            dont il n'a pas besoin ne produit que de la culpabilité. Le geste
            reste atteignable quand rien n'est dû, mais en `ghost`, comme
            « Ajouter un support » : c'est le poids qui dit la fréquence. */}
        {shown.length > 0 && (
          <Button
            size="sm"
            variant={due.length > 0 ? 'secondary' : 'ghost'}
            onClick={() => {
              void navigate(VALUATIONS_PATH)
            }}
          >
            {t.savings.valuesUpdate}
          </Button>
        )}
      </div>

      {/* Le décompte, et non une alerte : un capital qu'on n'a pas revu n'est
          pas une erreur (DS §2.3). Il ne s'écrit que lorsqu'il y a quelque
          chose à écrire — le reste du temps, la section se tait. */}
      {due.length > 0 && (
        <span className="t-label">
          {due.length === 1 ? t.savings.valuesDueOne : tpl(t.savings.valuesDue, due.length)}
        </span>
      )}

      {/* Un écran vide est une invitation, pas un constat (DS §7). La section
          disparaissait quand la personne n'avait aucun support, y compris quand
          des versements du mois disaient qu'elle en aurait besoin. */}
      {shown.length === 0 ? (
        <p className="t-label">{t.savings.supportsEmpty}</p>
      ) : (
        <SupportRows supports={shown} valuations={valuations} netOf={netOf} />
      )}

      {/* Sous le groupe et en `ghost` : ouvrir un compte se fait une fois, pas
          tous les mois, et le poids du bouton dit cette fréquence. */}
      <Button
        size="sm"
        variant="ghost"
        className="w-fit"
        onClick={() => {
          void navigate(SUPPORT_NEW_PATH)
        }}
      >
        <Plus size={18} />
        {t.savings.supportAdd}
      </Button>
    </section>
  )
}
