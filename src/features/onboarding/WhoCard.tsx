import { useId, useState } from 'react'
import type { Member } from '@/domain/types'
import { enumerate, tpl } from '@/i18n/format'
import { t } from '@/i18n/strings'
import { Button, IconButton } from '@/ui/Button'
import { Dot } from '@/ui/Dot'
import { Field, TextInput } from '@/ui/Field'
import { Close } from '@/ui/Icons'
import { Segmented } from '@/ui/Segmented'

type Who = 'solo' | 'multi'

/**
 * La première carte : combien on est, et qui.
 *
 * **Elle écrit tout de suite.** Chaque prénom ajouté devient un `Member` du
 * document — pas une chaîne retenue jusqu'à la fin. C'est ce qui fait que la
 * pastille porte sa vraie couleur, que la file s'allonge d'une carte de revenu
 * sous le doigt, et que « Revenir » ne perd rien. Rien n'est enregistré pour
 * autant : tant que le statut vaut « onboarding », `mutate` ne programme aucune
 * écriture (`store/store.ts`).
 *
 * **Repasser en « Je vis seul » retire les prénoms**, et c'est la seule façon
 * de tenir la décision : solo veut dire zéro membre, parce que tout l'aval —
 * `scopeToMember`, `memberCharges` — a un chemin solo explicite qui n'existe
 * que là. Un document « solo » avec deux membres oubliés serait un document à
 * plusieurs qui s'ignore.
 *
 * **La liste comprend qui répond**, et le hint le dit. Ce n'est pas une
 * préférence d'écriture : le prorata pèse les revenus des *membres*
 * (`domain/split.ts`), donc un revenu posé sans propriétaire ne compte pas au
 * dénominateur. Un foyer de deux dont l'un ne serait pas membre verrait l'autre
 * porter 100 % des charges communes — et l'app n'aurait aucun moyen de le dire.
 * L'alternative aurait été d'inventer un membre « moi » dans le dos de qui
 * répond ; la demander est plus honnête, et c'est une case de plus, pas une
 * question de plus.
 */
export function WhoCard({
  multi,
  members,
  onMode,
  onAdd,
  onRemove,
}: {
  multi: boolean
  members: readonly Member[]
  onMode: (multi: boolean) => void
  onAdd: (name: string) => void
  onRemove: (id: string) => void
}) {
  const [name, setName] = useState('')
  const hintId = useId()
  const trimmed = name.trim()

  const submit = (): void => {
    if (trimmed.length === 0) return
    onAdd(trimmed)
    setName('')
  }

  const names = members.map((member) => member.name)

  return (
    <div className="flex flex-col gap-4">
      <Segmented<Who>
        options={[
          { value: 'solo', label: t.onboarding.whoSolo },
          { value: 'multi', label: t.onboarding.whoMulti },
        ]}
        value={multi ? 'multi' : 'solo'}
        onChange={(next) => {
          onMode(next === 'multi')
        }}
        label={t.onboarding.whoLabel}
        /* `Segmented` se dit `inline-flex` pour se serrer sur ses positions ;
           dans une colonne, c'est `align-items: stretch` qui décide, et il
           l'étirait sur toute la largeur — 163px de pilule vide à 390px, 317 à
           1440, soit près de la moitié du contrôle. Une bascule qui traîne un
           fond derrière sa dernière position ne se lit plus comme un choix à
           deux positions, mais comme une piste dont il manque les autres. */
        className="self-start"
      />

      {multi && (
        <div className="flex flex-col gap-4">
          {members.length === 0 ? (
            <p className="t-label">{t.onboarding.namesEmpty}</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex h-11 items-center gap-2 rounded-chip bg-surface-2 pr-2 pl-3"
                >
                  <Dot color={member.color} />
                  <span className="t-label">{member.name}</span>
                  <IconButton
                    label={tpl(t.onboarding.namesRemove, member.name)}
                    onClick={() => {
                      onRemove(member.id)
                    }}
                  >
                    <Close size={16} />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}

          {/* Un `<form>` : c'est ce qui fait qu'Entrée valide, sans écouteur de
              touche à écrire ni à neutraliser dans les champs voisins.

              **Il passe en colonne pour porter l'aide**, et c'est le même parti
              qu'`ExtrasCard` prend pour porter son refus. `items-end` aligne le
              bouton sur le bas de son voisin ; tant que ce voisin est un champ
              nu, ce bas *est* la ligne de saisie et les deux se posent côte à
              côte. Un `hint` dans le `Field` rallonge ce bas de deux lignes :
              le bouton tombait alors 43px plus bas, à côté de la phrase d'aide
              et non du champ — mesuré à 390px, et c'est ce qu'on voyait.
              La phrase se pose donc sous la rangée entière, où elle ne décale
              plus rien. Elle reste le `aria-describedby` du champ : ce qui
              change est l'endroit où elle se dessine, pas ce qu'un lecteur
              d'écran annonce en arrivant dessus. */}
          <form
            className="flex flex-col gap-1.5"
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
          >
            <div className="flex flex-wrap items-end gap-2">
              <Field label={t.onboarding.namesLabel} className="flex-1">
                {(id) => (
                  <TextInput
                    id={id}
                    aria-describedby={hintId}
                    value={name}
                    placeholder={t.onboarding.namesPlaceholder}
                    maxLength={24}
                    onChange={(event) => {
                      setName(event.target.value)
                    }}
                  />
                )}
              </Field>
              <Button type="submit" variant="secondary" disabled={trimmed.length === 0}>
                {t.onboarding.namesAdd}
              </Button>
            </div>
            <p id={hintId} className="t-label">
              {t.onboarding.namesHint}
            </p>
          </form>

          {/* La règle de partage, dite là où elle se décide, et une seule fois.
              Elle n'a pas de carte à elle : le modèle ne connaît que le prorata
              des revenus (`memberShares`), donc une carte de partage
              n'offrirait aucun choix — elle serait la seule de la file à ne rien
              demander. La phrase se relit ensuite dans le récapitulatif. */}
          {members.length > 0 && (
            <p className="t-axis">
              {tpl(
                members.length === 1 ? t.onboarding.namesShareOne : t.onboarding.namesShare,
                enumerate(names),
              )}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
