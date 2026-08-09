/* ============================================================================
 * L'écran des projections — **deux lectures, une adresse** (cahier §4.6 ter).
 *
 * Il n'en avait qu'une : un simulateur volontairement coupé du document, où l'on
 * tapait quatre nombres. C'était le bon premier étage — un plan qui compare mois
 * après mois le prévu au confirmé ajoute une entité au modèle, donc des
 * migrations et une lecture de plus sur chaque écran d'épargne — mais il laissait
 * l'app incapable de répondre à la question qu'elle est pourtant seule à pouvoir
 * traiter : « ce que **mes** comptes deviennent ». Le capital, elle le connaît ;
 * les versements, elle les pose déjà tous les mois. Seul le taux manquait, et il
 * ne se lit nulle part parce qu'il n'existe nulle part.
 *
 * D'où deux positions, et une seule chose qui les sépare : **d'où partent les
 * chiffres**.
 *
 * - **Mes supports** lit le document — le capital estimé de chaque support, les
 *   récurrences qui l'alimentent — et n'y écrit rien. Les hypothèses qu'on pose
 *   dessus vivent en confort local, comme le thème.
 * - **Chiffres libres** ne lit rien du tout, et reste ce qu'il était : la
 *   question qu'on pose sur un capital qu'on n'a pas encore.
 *
 * La coquille tient ce qui vaut pour les deux : le titre, la phrase de réserve —
 * la seule chose de cet écran qui reste vraie quels que soient les chiffres —,
 * la bascule, et le brouillon persisté qui porte l'horizon et les euros
 * constants. Ce qui distingue les deux lectures vit dans les deux panneaux.
 * ==========================================================================*/

import { useEffect, useState } from 'react'
import { projection } from '@/i18n/projection'
import { PageTitle } from '@/ui/PageTitle'
import { Segmented } from '@/ui/Segmented'
import { Tile } from '@/ui/Tile'
import { Simulator } from './Simulator'
import { SupportsProjection } from './SupportsProjection'
import { type ProjectionDraft, type ProjectionSource, readDraft, writeDraft } from './model'
import { useHasProjectableSupport } from './useSupportBases'

const sources = (): { value: ProjectionSource; label: string }[] => [
  { value: 'supports', label: projection.sourceSupports },
  { value: 'free', label: projection.sourceFree },
]

export function ProjectionPage() {
  /* Les derniers réglages sont relus une seule fois, au montage : ils sont le
     point de départ de la saisie, pas une source qui la piloterait. */
  const [draft, setDraft] = useState<ProjectionDraft>(readDraft)
  /* Sur tous les supports du foyer, et non sur ceux de la personne filtrée :
     c'est la question « l'app a-t-elle de quoi partir », pas « qui regarde-t-on ».
     Un filtre laissé sur « Commun » ailleurs dans l'app ne doit pas décider que
     le foyer n'a pas d'épargne. */
  const projectable = useHasProjectableSupport()

  useEffect(() => {
    writeDraft(draft)
  }, [draft])

  const patch = (next: Partial<ProjectionDraft>): void => {
    setDraft((current) => ({ ...current, ...next }))
  }

  /* Tant que personne n'a choisi, l'écran ouvre la lecture qui a quelque chose à
     montrer : ses comptes s'il y en a un de relevé, le simulateur sinon — qui
     trace quelque chose dès l'arrivée, sans rien demander. Un choix explicite
     l'emporte ensuite, et pour toujours. */
  const source: ProjectionSource = draft.source ?? (projectable ? 'supports' : 'free')

  return (
    <>
      <PageTitle title={projection.title} />

      <div className="flex max-w-3xl flex-col gap-4">
        {/* Sans eyebrow : le titre de l'écran dit déjà « Projections », deux
            centimètres au-dessus, et une étiquette qui le répète n'ajoute qu'un
            mot à relire. */}
        <Tile className="gap-2">
          <p className="t-body">
            {source === 'supports' ? projection.supportsLead : projection.lead}
          </p>
          {/* Elle ne se replie pas et ne s'écarte pas : c'est la seule chose de
              cet écran qui reste vraie quels que soient les chiffres saisis, et
              elle vaut pour les deux lectures — partir de vrais comptes ne rend
              pas un taux moyen plus vrai. */}
          <p className="t-label">{projection.caveat}</p>
        </Tile>

        <Segmented
          options={sources()}
          value={source}
          onChange={(next) => {
            patch({ source: next })
          }}
          label={projection.sourceAxis}
          className="w-fit"
        />

        {source === 'supports' ? (
          <SupportsProjection draft={draft} patch={patch} />
        ) : (
          <Simulator draft={draft} patch={patch} />
        )}
      </div>
    </>
  )
}
