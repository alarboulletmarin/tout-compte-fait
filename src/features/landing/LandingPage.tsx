import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppFooter } from '@/app/AppFooter'
import { ONBOARDING_PATH } from '@/app/routes'
import { t } from '@/i18n/strings'
import { landing } from '@/i18n/landing'
import { useStore } from '@/store/store'
import { ExampleControl } from '@/features/settings/ExampleControl'
import { ImportControl } from '@/features/settings/ImportControl'
import { SchemaControl } from '@/features/settings/SchemaControl'
import { Button } from '@/ui/Button'
import { Eyebrow } from '@/ui/Eyebrow'
import { DataIcon, RecurrencesIcon } from '@/ui/Icons'
import { Tile } from '@/ui/Tile'
import { InstallBanner } from './InstallBanner'
import { LandingProof } from './LandingProof'
import { LandingQuestions } from './LandingQuestions'
import { LandingTiles } from './LandingTiles'
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
 * « à propos ». Ce qu'elle propose, lui, dépend de l'état : les trois portes
 * remplacent des données, et n'ont rien à faire devant quelqu'un qui en a.
 */
export function LandingPage() {
  const status = useStore((s) => s.status)
  const error = useStore((s) => s.error)
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

  return (
    /* `px-4 md:px-8` — le cadre exact d'`AppShell`. Les tuiles de démonstration
       font alors très précisément la largeur de celles du vrai mois, ce que la
       page prétend montrer ; et sur une 2×1 à 320px, ces huit pixels sont huit
       pour cent de la place disponible. */
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-10 md:px-8 md:py-14">
      <header className="flex flex-col gap-5">
        {/* L'étiquette colle à ce qu'elle nomme, comme partout ailleurs — la
            colonne latérale et l'en-tête des deux questions la posent juste
            au-dessus de leur titre. Laissée dans le `gap-5` du bloc, elle se
            détachait à la même distance que le paragraphe : cinq éléments à
            intervalle égal ne font plus une hiérarchie, ils font une liste. */}
        <div className="flex flex-col gap-2">
          <span className="t-eyebrow text-muted">{t.app.name}</span>
          <h1 className="t-hero-fit max-w-[16ch]">{t.app.tagline}</h1>
        </div>
        <p className="t-body max-w-prose">{landing.intro}</p>

        {/* Tant que l'hydratation n'a pas répondu, on ne sait pas encore quoi
            proposer. Rien plutôt qu'un bouton qui changerait de sens sous le
            doigt — la lecture de la base se compte en dizaines de
            millisecondes, et un libellé qui se corrige se remarque plus qu'une
            rangée qui apparaît. */}
        {/* Rien non plus quand le document ne se lit pas : « Créer mon suivi »
            écraserait ce qu'on n'a pas su ouvrir, et le bloc de récupération
            juste dessous porte déjà les quatre recours, dans leur ordre. */}
        {status !== 'loading' && !unreadable && (
          <>
            {empty ? (
              /* La rangée et sa légende, en colonne : « Charger l'exemple » dit
                 le geste sans dire pourquoi on le ferait, et la phrase qui le
                 disait — `landing.exampleHint` — était écrite depuis le début
                 sans être branchée nulle part. Sous les deux boutons plutôt
                 qu'à côté du second : une légende posée dans une rangée qui
                 passe à la ligne à 320px se retrouve un jour au-dessus de ce
                 qu'elle légende. */
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={() => {
                      void navigate(ONBOARDING_PATH)
                    }}
                  >
                    {landing.start}
                  </Button>
                  {/* Aucune confirmation : rien n'a encore été enregistré, et
                      faire confirmer la perte de rien n'apprend qu'une chose —
                      que les questions de cette app ne veulent rien dire. */}
                  <ExampleControl confirm={false} />
                </div>
                <p className="t-label">{landing.exampleHint}</p>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => {
                    void navigate('/')
                  }}
                >
                  {landing.open}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Les deux moitiés de la même réponse, dans un seul bloc. La première
            dit d'où ne viennent pas les données ; la seconde dit pourquoi c'est
            gratuit, et son silence se lisait comme un piège. Le raisonnement
            était écrit dans le README — « aucun backend, donc aucun coût de
            fonctionnement » — et n'avait jamais atteint la page qui en a
            besoin. `gap-1` : elles se répondent, elles ne font pas deux points
            d'une liste. */}
        <div className="flex flex-col gap-1">
          <p className="t-label">{landing.privacy}</p>
          <p className="t-label">{landing.free}</p>
        </div>

        {/* Juste sous les phrases qui disent qu'il n'y a ni compte ni serveur :
            ce sont elles qui posent la question à laquelle l'installation
            répond — s'il n'y a de copie nulle part, qu'est-ce qui garde
            celle-ci ? Elle ne s'affiche que quand le navigateur a de quoi la
            tenir. */}
        <InstallBanner />
      </header>

      {/* Avant les tuiles de démonstration : une alerte sous une grille de
          chiffres inventés n'est pas une alerte, c'est une note de bas de page. */}
      {unreadable && <RecoveryDoor message={error.message} />}

      <div className="flex flex-col gap-3">
        <LandingTiles />
        {/* La seule chose qui empêche la grille de mentir. En texte lisible et
            non en filigrane : un avertissement qu'on ne peut pas lire n'en est
            pas un. Il couvre aussi les chiffres de `LandingProof`, qui sont
            ceux du même foyer et le disent en toutes lettres — deux
            avertissements sur une page n'en font pas un plus fort. */}
        <p className="t-label">{landing.sample}</p>
      </div>

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
  )
}

/**
 * Le raisonnement, en prose et hors de la grille.
 *
 * Il vivait dans les tuiles, et les faisait déborder par le bas à 320px : le DS
 * §5 plafonne une tuile à un eyebrow, un chiffre, une lecture secondaire et une
 * visualisation, et trois lignes d'explication n'entrent dans aucune des quatre
 * cases. Posées ici, elles ont la largeur du texte et la hauteur qu'elles
 * demandent — et la grille au-dessus redevient ce qu'elle est : la démonstration
 * elle-même, qui n'a pas à se commenter.
 */
function LandingPrinciples() {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="t-section">{landing.principles}</h2>
      {/* Deux colonnes et non quatre : à `max-w-5xl`, quatre blocs de prose
          tombent sous 230px de large, où une ligne ne porte plus que cinq mots.
          `gap-4` comme toute grille de contenu de l'app — une gouttière propre
          à cette page se serait vue contre celle du bento, juste au-dessus. */}
      <div className="grid gap-4 lg:grid-cols-2">
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
 * celle qui a déjà tout écrit ailleurs. La troisième — celle qui veut seulement
 * voir — est servie tout en haut, à côté du bouton principal : c'est une porte
 * d'entrée, pas un recours, et le même bouton deux fois sur un même écran ne se
 * lit plus comme deux occasions mais comme une redite.
 *
 * Toutes trois vivaient sous le formulaire des deux questions, en petits
 * caractères. Leur argument était déjà qu'aucune n'a de raison de créer d'abord
 * un foyer qu'elle remplacera dans la foulée — il ne s'affaiblit pas en
 * remontant ici, il s'accomplit : « ici » désignait l'écran d'arrivée, et
 * l'écran d'arrivée est désormais cette page. Le message d'erreur de
 * l'hydratation, qui promet l'import, atterrit lui aussi sur cette page — mais
 * dans `RecoveryDoor`, qui remplace ce bloc plutôt que de s'ajouter à lui :
 * réparer et commencer ne se proposent pas côte à côte, et deux boutons
 * « Importer un fichier » sur un même écran ne font pas deux occasions.
 *
 * Pas de `BentoGrid` : ce sont des actions, pas des lectures. La grille bento
 * impose des hauteurs de rangée faites pour des chiffres, et un bouton ancré au
 * bas d'une tuile de 188px s'y retrouve à flotter loin du texte qu'il sert.
 */
function LandingDoors() {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="t-section">{landing.doors}</h2>
      <div className="grid gap-4 lg:grid-cols-2">
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
