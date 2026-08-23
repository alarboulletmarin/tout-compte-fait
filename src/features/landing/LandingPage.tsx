import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppFooter } from '@/app/AppFooter'
import { PublicPreferences } from '@/app/PublicPreferences'
import { ONBOARDING_PATH } from '@/app/routes'
import { landing } from '@/i18n/landing'
import { useStore } from '@/store/store'
import { ImportControl } from '@/features/settings/ImportControl'
import { SchemaControl } from '@/features/settings/SchemaControl'
import { Eyebrow } from '@/ui/Eyebrow'
import { DataIcon, RecurrencesIcon } from '@/ui/Icons'
import { Tile } from '@/ui/Tile'
import { InstallBanner } from './InstallBanner'
import { LandingHeader } from './LandingHeader'
import { LandingHero } from './LandingHero'
import { LandingProof } from './LandingProof'
import { LandingQuestions } from './LandingQuestions'
import { RecoveryDoor } from './RecoveryDoor'

/**
 * La première page de l'app, et sa vitrine.
 *
 * Elle existe parce que l'écran d'arrivée était une question posée d'emblée :
 * on demandait de répondre avant d'avoir dit ce que l'app suit, où vont les
 * données, ni pourquoi elle vaut la peine d'être remplie.
 *
 * Elle vit au-dessus du gate, à une URL stable, et répond donc dans les deux
 * états — c'est ce qui permet de la lier depuis le dépôt, et d'y revenir depuis
 * « à propos ». Ce qu'elle propose, lui, dépend de l'état : les portes
 * remplacent des données, et n'ont rien à faire devant quelqu'un qui en a.
 *
 * **Trois bandes, et une seule est plein cadre.** L'en-tête et le pied prennent
 * toute la largeur, sur `--surface` et séparés par un filet : ce sont les deux
 * bornes de la page. Entre les deux, le contenu garde le cadre d'`AppShell`
 * (`max-w-5xl`, `px-4 md:px-8`) — les tuiles de démonstration font alors
 * exactement la largeur de celles du vrai mois, ce que la page prétend montrer.
 *
 * **Ce que le design resserre, et ce qui reste dessous.** La maquette s'arrête
 * au bloc du haut : promesse, trois tuiles, contrepartie. Ce bloc-là est la
 * page, et il répond à qui décide en dix secondes. Ce qui le suit répond à qui
 * décide autrement : les quatre principes en prose, la démonstration du calcul
 * (`LandingProof`), les objections (`LandingQuestions`) et les deux portes qui
 * évitent la page blanche. Rien de tout cela n'a de place dans une colonne de
 * 440px, et rien de tout cela n'a été remplacé par la maquette — la supprimer
 * aurait fait de la présentation la seule page du produit à ne rien prouver.
 */
export function LandingPage() {
  const status = useStore((s) => s.status)
  const error = useStore((s) => s.error)
  const finishOnboarding = useStore((s) => s.finishOnboarding)
  const navigate = useNavigate()

  /* Ouverte les mains vides, elle s'efface dès qu'il y a quelque chose à
     montrer : c'est ce que « charger l'exemple » promet, et `replaceData`
     bascule le statut sans toucher à l'URL — sans ça, le clic n'aurait produit
     à l'écran que la disparition du bouton qu'on vient de toucher.
     Ouverte volontairement depuis « à propos », elle reste : on ne renvoie pas
     quelqu'un d'où il vient.
     Le drapeau se lève dans l'effet et non au premier rendu : cette page vit
     au-dessus du gate, donc elle monte pendant que `hydrate` lit encore la
     base. À cet instant le statut vaut « loading » et non « onboarding » — le
     figer au montage revenait à répondre non à chaque fois. */
  const sawEmpty = useRef(false)
  useEffect(() => {
    if (status === 'onboarding') {
      sawEmpty.current = true
      return
    }
    if (status === 'ready' && sawEmpty.current) void navigate('/', { replace: true })
  }, [status, navigate])

  const empty = status === 'onboarding'
  /* Un document existe et ne se lit pas. Le statut est le même que celui d'un
     appareil neuf — l'app n'a rien d'utilisable à montrer — mais ce qu'on
     propose n'a rien à voir : ici on répare, on ne commence pas. */
  const unreadable = error?.kind === 'read'
  /* Tant que l'hydratation n'a pas répondu, on ne sait pas encore quoi
     proposer. Rien plutôt qu'un bouton qui changerait de sens sous le doigt —
     la lecture de la base se compte en dizaines de millisecondes, et un libellé
     qui se corrige se remarque plus qu'une rangée qui apparaît. */
  const decided = status !== 'loading' && !unreadable

  const start = (): void => {
    void navigate(ONBOARDING_PATH)
  }

  /* La troisième porte, et la seule qui n'écrit rien qu'un document vide.
     `finishOnboarding` pose le catalogue par défaut, ouvre le mois courant et
     referme la porte derrière lui : on atterrit sur un mois sans une ligne,
     dont l'état vide dit la suite — « Août est vide → Écrire une récurrence ».
     Le gate n'est pas touché pour autant (F19) : c'est le **statut** qui décide
     de l'écran, et il vient de passer à « prêt ». */
  const enterEmpty = (): void => {
    finishOnboarding()
    void navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <LandingHeader
        {...(decided
          ? {
              action: empty
                ? { label: landing.start, onAction: start }
                : {
                    label: landing.open,
                    onAction: () => {
                      void navigate('/')
                    },
                  },
            }
          : {})}
      />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-8 md:px-8 md:py-12">
        {/* Les deux réglages publics, en tête et à droite : ce sont des
            accessoires, mais celui qui lit dans la mauvaise langue lit depuis
            le haut. Hors de l'en-tête, où ils faisaient passer la barre de 56px
            à trois rangées sur un téléphone. */}
        <PublicPreferences />

        {/* Avant tout le reste : une alerte posée sous une grille de chiffres
            inventés n'est pas une alerte, c'est une note de bas de page. */}
        {unreadable && <RecoveryDoor message={error.message} />}

        <LandingHero
          {...(decided && empty ? { onStart: start, onEnterEmpty: enterEmpty } : {})}
        />

        {/* Juste sous les arguments qui disent qu'il n'y a ni compte ni
            serveur : ce sont eux qui posent la question à laquelle
            l'installation répond — s'il n'y a de copie nulle part, qu'est-ce
            qui garde celle-ci ? Elle ne s'affiche que quand le navigateur a de
            quoi la tenir. */}
        <InstallBanner />

        <LandingPrinciples />

        {/* Ce que les principes viennent d'affirmer, démontré : le prorata, la
            régularisation, la vérification à zéro et la cascade de la capacité.
            Après eux et pas avant — un calcul posé avant qu'on ait dit ce qu'il
            calcule ne prouve rien. */}
        <LandingProof />

        <LandingQuestions />

        {/* Pas sous le bloc de récupération, qui porte déjà l'import : deux
            boutons du même nom sur un écran ne font pas deux occasions. */}
        {empty && !unreadable && <LandingDoors />}

        <AppFooter />
      </div>

      {/* Le pied de la maquette : la contrepartie, seule, centrée, sur la
          bande qui ferme la page. `mt-auto` la colle au bas de la fenêtre
          quand le contenu ne la remplit pas — ce qui arrive à l'état illisible,
          où la page se réduit au bloc de récupération. */}
      <div className="mt-auto border-t border-border bg-surface px-4 py-4 md:px-8">
        <p className="t-axis mx-auto max-w-prose text-center">{landing.counterpart}</p>
      </div>
    </div>
  )
}

/**
 * Le raisonnement, en prose et hors de la grille.
 *
 * Il vivait dans les tuiles, et les faisait déborder par le bas à 320px : le DS
 * §5 plafonne une tuile à un eyebrow, un chiffre, une lecture secondaire et une
 * visualisation, et trois lignes d'explication n'entrent dans aucune des quatre
 * cases. Posées ici, elles ont la largeur du texte et la hauteur qu'elles
 * demandent — et les tuiles au-dessus redeviennent ce qu'elles sont : la
 * démonstration elle-même, qui n'a pas à se commenter.
 */
function LandingPrinciples() {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="t-section">{landing.principles}</h2>
      {/* Deux colonnes et non quatre : à `max-w-5xl`, quatre blocs de prose
          tombent sous 230px de large, où une ligne ne porte plus que cinq mots.
          `gap-4` comme toute grille de contenu de l'app — une gouttière propre
          à cette page se serait vue contre celle des tuiles, juste au-dessus. */}
      <div className="cols">
        {[
          { title: landing.monthTitle, body: landing.monthBody },
          { title: landing.splitTitle, body: landing.splitBody },
          { title: landing.kindsTitle, body: landing.kindsBody },
          { title: landing.privacyTitle, body: landing.privacyBody },
        ].map((item) => (
          <div key={item.title} className="flex max-w-prose flex-col gap-2">
            <h3 className="t-body font-semibold">{item.title}</h3>
            <p className="t-label">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/**
 * Deux façons de ne pas commencer par une page blanche, pour les deux personnes
 * qui arrivent ici sans rien à saisir : celle qui restaure une sauvegarde, et
 * celle qui a déjà tout écrit ailleurs. Les deux autres — celle qui veut
 * seulement voir, et celle qui veut entrer les mains vides — sont servies dans
 * le bloc du haut, à côté du bouton principal : ce sont des portes d'entrée,
 * pas des recours, et le même bouton deux fois sur un même écran ne se lit plus
 * comme deux occasions mais comme une redite.
 *
 * Leur argument est qu'aucune n'a de raison de créer d'abord un foyer qu'elle
 * remplacera dans la foulée. Le message d'erreur de l'hydratation atterrit lui
 * aussi sur cette page — mais dans `RecoveryDoor`, qui remplace ce bloc plutôt
 * que de s'ajouter à lui : réparer et commencer ne se proposent pas côte à
 * côte, et deux boutons « Importer un fichier » sur un même écran ne font pas
 * deux occasions.
 *
 * Pas de `BentoGrid` : ce sont des actions, pas des lectures. La grille bento
 * impose des hauteurs de rangée faites pour des chiffres, et un bouton ancré au
 * bas d'une tuile de 188px s'y retrouve à flotter loin du texte qu'il sert.
 */
function LandingDoors() {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="t-section">{landing.doors}</h2>
      <div className="cols">
        <Tile className="gap-3">
          <Eyebrow icon={DataIcon}>{landing.importTitle}</Eyebrow>
          <p className="t-label">{landing.importHint}</p>
          <ImportControl />
        </Tile>

        <Tile className="gap-3">
          <Eyebrow icon={RecurrencesIcon}>{landing.schemaTitle}</Eyebrow>
          <p className="t-label">{landing.schemaHint}</p>
          <SchemaControl />
        </Tile>
      </div>
    </section>
  )
}
