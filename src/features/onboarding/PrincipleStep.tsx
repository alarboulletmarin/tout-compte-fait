import { t } from '@/i18n/strings'
import { Button } from '@/ui/Button'
import { Eyebrow } from '@/ui/Eyebrow'
import { Warning } from '@/ui/Icons'
import { Tile } from '@/ui/Tile'

/**
 * Première étape, et la seule qui ne demande rien.
 *
 * L'onboarding ouvrait sur « avec qui tu partages des dépenses ? ». La question
 * est bonne — c'est celle dont tout le reste découle — mais elle arrivait
 * *avant* que rien n'ait été dit : quelqu'un qui vient de cliquer « Créer mon
 * suivi » se retrouvait devant un champ de prénom, sans avoir lu une ligne de
 * ce que l'app fait de ce qu'il va y mettre. La présentation le disait, et on
 * l'a peut-être sautée ; l'app le redisait trois écrans plus loin, en petit.
 *
 * D'où une étape qui ne pose aucune question et n'écrit rien : elle énonce la
 * thèse — on écrit une fois, le mois suivant s'ouvre rempli — puis la
 * contrepartie, dans le même souffle. C'est la règle d'écriture du produit :
 * une promesse et son prix se disent ensemble, sinon la moitié qui arrive plus
 * tard passe pour un aveu.
 *
 * **La contrepartie est une tuile, pas une note.** Elle vivait en `t-label` de
 * 13px sous la dernière étape, c'est-à-dire une fois les trois écrans remplis :
 * apprendre à ce moment-là que tout peut disparaître, c'est l'apprendre trop
 * tard pour en tenir compte. Ici, elle se lit avant qu'on ait saisi quoi que ce
 * soit, et le glyphe d'alerte la marque sans que la tuile crie — le DS §2.3
 * réserve le rouge aux dépassements, et une tuile entière en alerte ferait de
 * la franchise un incident.
 *
 * Le titre prend `t-hero-fit` et non `t-hero` : c'est une phrase de dix mots,
 * et le chiffre héros du DS est calibré pour un nombre. La variante fluide la
 * ramène à la largeur dont elle dispose au lieu de la faire déborder d'un
 * téléphone (DS §3).
 */
export function PrincipleStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        {/* `text-wrap: pretty` : dix mots sur trois lignes finissent souvent par
            un mot seul, et une phrase qui porte la thèse du produit ne se
            termine pas sur un orphelin. */}
        <h1 className="t-hero-fit max-w-[16ch] text-pretty">{t.onboarding.principleTitle}</h1>
        <p className="t-body text-muted max-w-prose text-pretty">
          {t.onboarding.principleBody}
        </p>
      </div>

      <Tile className="gap-3">
        <Eyebrow icon={Warning}>{t.onboarding.principleCatchTitle}</Eyebrow>
        <p className="t-body">{t.onboarding.principleCatch}</p>
      </Tile>

      {/* Un seul bouton, et pas de « passer » : il n'y a rien à passer, aucune
          réponse n'est demandée. Le retour de l'en-tête ramène à la
          présentation, ce qui est la seule autre sortie qu'une lecture
          appelle. */}
      <Button type="button" full onClick={onNext}>
        {t.onboarding.principleNext}
      </Button>
    </div>
  )
}
