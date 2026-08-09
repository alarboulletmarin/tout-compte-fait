import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { currentYm } from '@/domain/date'
import { t } from '@/i18n/strings'
import { isKnownFragile, useStorageHealth } from '@/persistence/health'
import { addMember, addRecurrence, removeMember, renameMember } from '@/store/actions'
import { useCategoryMap, useMembers } from '@/store/selectors'
import { useStore } from '@/store/store'
import { Tile } from '@/ui/Tile'
import { MembersStep } from './MembersStep'
import { SavingsPreview, SavingsStep } from './SavingsStep'
import { StarterStep } from './StarterStep'
import { StepProgress } from './StepProgress'
import { MembersPreview, StarterPreview } from './StepPreview'
import { starterLines, starterRecurrences } from './starter'

const LAST_STEP = 3

/**
 * Une question, une proposition, puis l'app est utilisable. Le jeu de
 * catégories par défaut est déjà posé par le document initial : il n'y a rien
 * à demander de plus.
 *
 * Le nom ne se demande plus. Il ouvrait l'onboarding et il était la seule
 * réponse *exigée* de toute l'app — pour un libellé de barre latérale, que
 * `Nav` sait très bien laisser vide puisqu'il affiche déjà le nom de l'app
 * au-dessus. Il vit désormais dans les réglages, facultatif. La question qui
 * ouvrait l'app demandait par la même occasion à quelqu'un qui vit chez ses
 * parents de nommer un foyer qui n'est pas le sien.
 *
 * La seconde étape n'est pas une question, c'est une offre — voir
 * `StarterStep`. La première pose les personnes ; celle-ci donne à l'app de
 * quoi parler dès le premier écran, et se saute d'un bouton visible.
 *
 * L'écran ne fait plus que ça. Les trois façons de ne pas commencer par une page
 * blanche — restaurer un export, partir de ses notes, charger un exemple —
 * vivaient sous ce formulaire ; elles sont désormais sur la présentation, donc
 * *avant* qu'on demande quoi que ce soit, ce qui est exactement ce que leur
 * argument réclamait. Le retour de l'en-tête y ramène d'un geste.
 *
 * Chaque question porte son aperçu : à gauche ce qu'on répond, à droite ce que
 * la réponse change. Sous 1024px l'aperçu passe dessous — la question reste la
 * tâche, et c'est elle qui doit tomber sous le pouce.
 */
export function OnboardingPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const members = useMembers()
  const categories = useCategoryMap()
  const finishOnboarding = useStore((s) => s.finishOnboarding)
  const navigate = useNavigate()
  const fragile = useStorageHealth(isKnownFragile)

  /* Les montants de la seconde étape vivent ici plutôt que dans l'étape :
     l'aperçu posé à côté les lit à chaque frappe, et deux états qui décrivent
     la même saisie auraient fini par diverger d'un chiffre. */
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const lines = useMemo(() => starterLines(members), [members])

  /* `replace`, pour que le retour ramène à la présentation et non à un
     formulaire dont le document est déjà créé. Naviguer plutôt que laisser le
     filet `*` d'`AppRoutes` rediriger : le filet marcherait, au prix d'un rendu
     intermédiaire à l'URL des questions et d'une animation d'entrée jouée deux
     fois. */
  const open = (): void => {
    finishOnboarding()
    void navigate('/', { replace: true })
  }

  /* Poser les règles *avant* d'ouvrir, et c'est ce qui fait que le mois arrive
     déjà écrit : tant que le statut est « onboarding », rien ne s'enregistre et
     aucun mois n'est ouvert, si bien que ces récurrences n'ont encore aucune
     échéance. C'est `finishOnboarding` qui ouvre le mois courant, et c'est là
     que leurs échéances naissent — à confirmer, comme n'importe quel mois qui
     s'ouvre. */
  /* Ce que la deuxième étape a décidé, retenu jusqu'à la fin plutôt que posé
     tout de suite : revenir en arrière depuis la troisième étape et repartir
     poserait sinon les mêmes récurrences une seconde fois. La réponse voyage,
     l'écriture n'a lieu qu'une fois. */
  const [keepStarter, setKeepStarter] = useState(false)

  const finish = (): void => {
    if (keepStarter) {
      for (const payload of starterRecurrences(
        lines,
        amounts,
        (id) => categories.has(id),
        currentYm(),
      )) {
        addRecurrence(payload)
      }
    }
    open()
  }

  return (
    /* Le cadre d'`AppShell`, comme la présentation et la coquille d'« à propos ».
       Le `px-5` d'origine datait de la carte `max-w-md` centrée : l'écran est
       devenu une page à deux colonnes, et trois écrans voisins à trois marges
       différentes se voient dès qu'on passe de l'un à l'autre. */
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center gap-8 px-4 py-10 md:px-8">
      <StepProgress
        step={step}
        {...(step === 1
          ? {}
          : {
              onBack: () => {
                setStep(step === 3 ? 2 : 1)
              },
            })}
      />

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Tile>
          {step === 1 && (
            <MembersStep
              members={members}
              onAdd={(name) => {
                addMember(name)
              }}
              onRename={renameMember}
              onRemove={removeMember}
              onNext={() => {
                setStep(2)
              }}
            />
          )}
          {step === 2 && (
            <StarterStep
              lines={lines}
              amounts={amounts}
              onAmount={(key, value) => {
                setAmounts((current) => ({ ...current, [key]: value }))
              }}
              onSubmit={() => {
                setKeepStarter(true)
                setStep(3)
              }}
              onSkip={() => {
                setKeepStarter(false)
                setStep(3)
              }}
            />
          )}
          {step === 3 && <SavingsStep onSubmit={finish} onSkip={finish} />}
        </Tile>

        {step === 1 && <MembersPreview members={members} />}
        {step === 2 && <StarterPreview lines={lines} amounts={amounts} members={members} />}
        {step === 3 && <SavingsPreview />}
      </div>

      <div className="flex flex-col gap-1">
        <p className="t-label">{t.onboarding.privacy}</p>
        {/* La contrepartie du local-first, à la dernière étape : elle ne se
            découvrait qu'au bout de trente jours, par un bandeau. Ici parce que
            c'est le moment où la promesse de la ligne au-dessus est faite, et
            là seulement pour ne pas la répéter trois fois.
            Elle se durcit d'un cran là où le navigateur a déjà dit qu'il ne
            s'engageait pas — et là seulement : voir `isKnownFragile`. */}
        {step === LAST_STEP && (
          <p className="t-label">
            {fragile ? t.onboarding.backupFragile : t.onboarding.backup}
          </p>
        )}
      </div>
    </div>
  )
}
