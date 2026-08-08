import { type Money, ZERO } from '@/domain/money'
import { t } from '@/i18n/strings'
import { de, tpl } from '@/i18n/format'
import { useSavingTotal } from '@/store/selectors'
import { Amount } from '@/ui/Amount'
import { Eyebrow } from '@/ui/Eyebrow'
import { SavingsIcon } from '@/ui/Icons'
import { Tile } from '@/ui/Tile'

/** Une lecture secondaire de la tuile : son terme à gauche, son chiffre à droite. */
function Line({ label, value, signed = false }: { label: string; value: Money; signed?: boolean }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="t-label min-w-0 flex-1 truncate">{label}</span>
      <Amount value={value} size="body" signed={signed} className="shrink-0" />
    </div>
  )
}

/**
 * Ce que l'épargne vaut — le **capital**, et rien d'autre.
 *
 * « Capital d'épargne » et non « Épargne d'Alix » : le mot « épargne » nomme
 * aussi bien ce qu'on possède, ce qu'on verse et ce que le budget dégage, et
 * l'écran affiche les trois. Trois notions sous une étiquette commune ne
 * s'apprennent pas — c'est le vocabulaire qui les sépare, pas les paragraphes
 * qu'on ajouterait ensuite pour rattraper la confusion.
 *
 * **La personne reste nommée**, mais sous le chiffre plutôt que dans
 * l'étiquette : un total de cette taille sans propriétaire à côté se lit comme
 * une somme du foyer — celle que cet écran existe précisément pour ne pas
 * montrer (cahier §4.6 bis) —, et l'étiquette, elle, porte une notion qui ne
 * change pas d'une personne à l'autre.
 *
 * Le total ne porte que sur les supports dont une valeur a été relevée, et il
 * dit combien n'en ont pas : additionner une inconnue comme un zéro donnerait
 * un patrimoine faux annoncé comme exact, ce qui est pire que pas de chiffre.
 *
 * **Et ce qui a bougé depuis les relevés, quand il y a quelque chose.** Verser
 * 200 € par mois pendant six mois sans jamais relever sa valeur laissait un
 * total figé à son chiffre de départ, alors que l'app connaît les 1 200 € partis
 * dessus : les taire n'est pas de la prudence, c'est cacher ce qu'on sait. Le
 * chiffre s'affiche donc — nommé « estimée » et **sous** le relevé qui reste le
 * fait. La réserve qui l'accompagne, elle, est descendue dans la légende du
 * calcul : elle explique une méthode, et une tuile qui porte sept lectures n'en
 * porte plus aucune (DS §5).
 */
export function CapitalTile({ net, owner }: { net: Money; owner: string | null }) {
  const total = useSavingTotal()

  return (
    <Tile variant="accent" className="gap-2">
      <Eyebrow icon={SavingsIcon}>{t.savings.total}</Eyebrow>

      {total.valued === 0 ? (
        <p className="t-body">{t.savings.totalNone}</p>
      ) : (
        <>
          <Amount value={total.known} size="hero-fit" />
          <span className="t-label">
            {owner === null ? t.savings.totalHint : tpl(t.savings.totalHintOf, de(owner))}
          </span>
          {/* Jamais fondu dans le total : l'écran doit pouvoir dire « 32 450 €
              sur les supports relevés » sans laisser croire que c'est tout.
              Tu ne le dis pas quand *aucun* support n'est relevé : la phrase
              au-dessus l'annonce déjà, et deux fois la même absence se lit
              comme deux absences. */}
          {total.unvalued > 0 && (
            <span className="t-label">
              {total.unvalued === 1
                ? t.savings.totalMissingOne
                : tpl(t.savings.totalMissing, total.unvalued)}
            </span>
          )}
        </>
      )}

      {/* Le cumul de ce qui est parti depuis les relevés. Il ne remplace pas le
          chiffre du dessus — celui-là est un fait, daté ; celui-ci ne connaît
          pas ce que le marché a fait. */}
      {total.movedSince !== ZERO && (
        <div className="mt-1 flex flex-col gap-1 border-t border-border pt-3">
          <Line label={t.savings.estimated} value={total.estimated} />
          <Line label={t.savings.movedSinceTotal} value={total.movedSince} signed />
        </div>
      )}

      {/* Le pont entre les deux lectures de l'écran : ce que le mois a ajouté au
          capital. À zéro il ne dit rien que la section d'en dessous ne dise
          mieux, et il disparaît — une tuile de stock n'a pas à porter une ligne
          de flux vide. */}
      {net !== ZERO && (
        <div className="mt-1 border-t border-border pt-3">
          <Line label={t.savings.netMonth} value={net} signed />
        </div>
      )}
    </Tile>
  )
}
