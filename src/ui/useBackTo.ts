import { useLocation, useNavigate } from 'react-router-dom'

/**
 * Le retour d'un écran ouvert par-dessus un autre : l'écran précédent quand il
 * existe, sinon `fallback`.
 *
 * Arrivé par un lien direct ou un rechargement, il n'y a pas d'écran précédent
 * dans l'app — revenir en arrière sortirait du site. `location.key` vaut
 * `'default'` sur la toute première entrée de l'historique, et sur elle seule :
 * c'est la garde que six écrans de saisie recopiaient mot pour mot, écrite une
 * fois.
 *
 * Le repli est un chemin fixe plutôt qu'un « rien » : un bouton de retour qui
 * ne fait rien est la seule chose qu'un bouton ne doit jamais être.
 */
export function useBackTo(fallback = '/'): () => void {
  const navigate = useNavigate()
  const location = useLocation()

  return () => {
    if (location.key === 'default') void navigate(fallback)
    else void navigate(-1)
  }
}
