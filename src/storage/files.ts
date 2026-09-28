import type { AppData } from '../domain/data'
import { exportFileName, serializeExport } from './transfer'

function exportFile(data: AppData): File {
  return new File([serializeExport(data)], exportFileName(), { type: 'application/json' })
}

/** Enregistre l'export dans les téléchargements. */
export function downloadExport(data: AppData): void {
  const file = exportFile(data)
  const url = URL.createObjectURL(file)
  const link = Object.assign(document.createElement('a'), { href: url, download: file.name })
  link.click()
  // Laisse au navigateur le temps de lancer le téléchargement
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * « Envoyer vers… » : feuille de partage du système avec le fichier,
 * ou téléchargement si le navigateur ne sait pas partager de fichier.
 * Renvoie false quand on s'est rabattu sur le téléchargement.
 */
export async function shareExport(data: AppData): Promise<boolean> {
  const file = exportFile(data)
  if (!navigator.canShare?.({ files: [file] })) {
    downloadExport(data)
    return false
  }
  try {
    await navigator.share({ files: [file], title: file.name })
    return true
  } catch (error) {
    // Partage annulé par l'utilisateur : rien à faire. Tout autre échec : téléchargement.
    if (error instanceof DOMException && error.name === 'AbortError') return true
    downloadExport(data)
    return false
  }
}
