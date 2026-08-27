import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import {
  DIRECTION_PARAM,
  NATURE_PARAM,
  directionFromParam,
  entryNewPath,
  natureFromParam,
} from '@/app/routes'
import { ZERO } from '@/domain/money'
import { memberRequired } from '@/domain/split'
import { t } from '@/i18n/strings'
import { addEntry } from '@/store/actions'
import { useCategories, useCurrentYm, useEntries, useKindOf, useMembers } from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Button } from '@/ui/Button'
import { Chip } from '@/ui/Chip'
import { InlineError } from '@/ui/InlineError'
import { Keypad } from '@/ui/Keypad'
import { amountFromKeys } from '@/ui/keypad'
import { PageTitle } from '@/ui/PageTitle'
import { kindsOfNature } from '@/ui/categoryKinds'
import { toast } from '@/ui/toast'
import { useBackTo } from '@/ui/useBackTo'
import { defaultDateFor } from './defaultDate'
import { quickCategories } from './quickEntry'

/**
 * La saisie rapide — un montant, une catégorie, et c'est écrit.
 *
 * **Un écran plein avec son URL, et non la feuille du prototype.** Le DS §6 est
 * catégorique : « un formulaire ou une fiche est un écran plein avec son URL,
 * jamais une feuille modale » ; la feuille est réservée à ce qui se lit et se
 * referme, et à la question fermée d'une confirmation. Celle-ci saisit, et elle
 * écrit dans le document. La règle vaut d'autant plus ici qu'un pavé numérique,
 * une rangée de pilules et un chiffre héros ne tiennent pas dans les deux tiers
 * bas d'un écran de 320 points sans que quelque chose sorte du cadre.
 *
 * **Elle ne remplace pas `/depense`, elle le précède.** Le formulaire complet
 * reste à un doigt, en bas, et il est le seul à porter la date, le libellé
 * libre, la note, le rythme, la case « à partager » et le support d'épargne. La
 * même grammaire que le chemin rapide des récurrences : une porte courte, un
 * formulaire derrière, et jamais deux écrans qui font la même chose à moitié.
 *
 * **L'épargne n'a pas de version rapide, et c'est une décision.** Sa question
 * n'est pas « quelle catégorie » mais « où va l'argent » : le support porte à
 * lui seul le poste et la personne, et une pilule de catégorie posée à sa place
 * produirait un mouvement d'épargne rattaché à rien. Le geste part donc
 * directement au formulaire, qui sait le poser.
 *
 * **Le membre est demandé quand le domaine l'exige, et seulement là.** Une
 * dépense que personne ne s'attribue est commune par règle ; un revenu, lui,
 * n'apparaîtrait dans le mois de personne (`memberRequired`). Les pilules
 * suivent donc exactement cette frontière, plutôt qu'un champ de plus.
 */
export function QuickEntryPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const ym = useCurrentYm()
  const entries = useEntries()
  const categories = useCategories()
  const kindOf = useKindOf()
  const members = useMembers()

  const [keys, setKeys] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [memberId, setMemberId] = useState('')
  const [tried, setTried] = useState(false)

  const direction = directionFromParam(params.get(DIRECTION_PARAM))
  const nature = natureFromParam(params.get(NATURE_PARAM), params.get(DIRECTION_PARAM))
  const full = entryNewPath({ direction })

  const shown = useMemo(
    () => quickCategories(entries, categories, kindOf, kindsOfNature(nature)),
    [entries, categories, kindOf, nature],
  )

  const amount = amountFromKeys(keys)
  const needsMember =
    members.length > 0 && memberRequired(direction, kindOf(categoryId), memberId, undefined)

  const error =
    amount === null || amount <= ZERO
      ? t.entry.amountRequired
      : categoryId === ''
        ? t.entry.categoryRequired
        : needsMember
          ? t.entry.memberRequired
          : null

  const goBack = useBackTo()

  /* Voir l'en-tête : l'épargne se saisit au formulaire, qui demande le support.
     Le renvoi est un `replace` — cette URL-là n'a rien à laisser dans
     l'historique, elle n'a jamais rien montré. */
  if (nature === 'saving') {
    return <Navigate to={entryNewPath({ direction: 'out', saving: true })} replace />
  }

  const save = (): void => {
    setTried(true)
    if (error !== null || amount === null) return
    addEntry({
      /* Le libellé est le nom de la catégorie : la saisie rapide n'a pas de
         champ de texte, et la pilule *est* la description de la ligne. Elle se
         renomme ensuite depuis la ligne, qui ouvre sa fiche. */
      label: categories.find((one) => one.id === categoryId)?.label ?? '',
      categoryId,
      ...(memberId === '' ? {} : { memberId }),
      direction,
      amount,
      date: defaultDateFor(ym),
      /* Confirmée : on saisit ce qui vient d'avoir lieu, pas une prévision. Le
         formulaire fait le même choix sur une ligne neuve. */
      status: 'confirmed',
    })
    toast(direction === 'in' ? t.entry.addedIn : t.entry.addedOut)
    goBack()
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <PageTitle title={direction === 'in' ? t.entry.addIn : t.entry.addOut} onBack={goBack} />

      {/* Le cadre de la tuile, qu'elle n'avait pas : `.tile` ne pose aucun
          rembourrage — c'est l'appelant qui le donne, et celui-ci l'avait
          oublié. Le chiffre, les pilules et le pavé partaient donc du bord
          arrondi. Les valeurs sont celles de `Tile.PADDING`, DS §4. */}
      <section className="tile flex flex-col gap-4 p-5 md:p-6">
        {/* Le chiffre part de zéro et suit la frappe : la même place et la même
            taille que sur la carte de la revue, et il dit la vérité — il n'y a
            pas encore de montant. */}
        <span className="fit-box block">
          <Amount value={amount ?? ZERO} direction={direction} size="hero-fit" />
        </span>

        <div role="group" aria-label={t.entry.category} className="flex flex-wrap gap-2">
          {shown.map((category) => (
            <Chip
              key={category.id}
              color={category.color}
              active={categoryId === category.id}
              onClick={() => {
                setCategoryId(category.id)
              }}
            >
              {category.label}
            </Chip>
          ))}
        </div>

        {/* Seulement là où le domaine l'exige : une dépense que personne ne
            s'attribue est commune, et lui demander un propriétaire poserait une
            question dont la réponse par défaut est déjà juste. */}
        {needsMember && (
          <div role="group" aria-label={t.entry.member} className="flex flex-wrap gap-2">
            {members.map((member) => (
              <Chip
                key={member.id}
                color={member.color}
                active={memberId === member.id}
                onClick={() => {
                  setMemberId(member.id)
                }}
              >
                {member.name}
              </Chip>
            ))}
          </div>
        )}

        <Keypad value={keys} onChange={setKeys} label={t.entry.amount} onSubmit={save} />
      </section>

      <div className="flex flex-col gap-2">
        {/* L'erreur au-dessus du bouton, jamais à la place. Le motif est écrit
            une fois dans `ui/InlineError` : trois écrans le posaient. */}
        <InlineError message={tried ? error : null} />
        <Button full onClick={save}>
          {direction === 'in' ? t.entry.addIn : t.entry.addOut}
        </Button>
        <Button
          variant="ghost"
          full
          onClick={() => {
            void navigate(full)
          }}
        >
          {t.entry.quickFull}
        </Button>
        {/* Ce que la saisie engage, dit là où on la fait — et c'est la phrase du
            design, mot pour mot. */}
        <span className="t-axis text-center">{t.entry.quickPrivacy}</span>
      </div>
    </div>
  )
}
