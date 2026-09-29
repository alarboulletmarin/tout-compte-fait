import qrcode from 'qrcode-generator'

/** Un code QR prêt à dessiner : tracé SVG des modules sombres, marge blanche comprise. */
export interface QrImage {
  /** Côté en modules, marge comprise (viewBox). */
  size: number
  path: string
}

/** Marge blanche imposée par la norme, en modules. */
const QUIET = 4

/**
 * Dessine chaque texte (alphanumérique QR : majuscules, chiffres, « space$%*+-./: »)
 * avec une correction d'erreur moyenne. Tous les codes ont la même taille, celle du plus
 * gros, pour que l'image ne saute pas d'une trame à l'autre.
 */
export function qrImages(texts: readonly string[]): QrImage[] {
  const make = (text: string, version: number) => {
    const qr = qrcode(version as Parameters<typeof qrcode>[0], 'M')
    qr.addData(text, 'Alphanumeric')
    qr.make()
    return qr
  }
  const version = Math.max(1, ...texts.map((text) => (make(text, 0).getModuleCount() - 17) / 4))
  return texts.map((text) => {
    const qr = make(text, version)
    const n = qr.getModuleCount()
    let path = ''
    for (let row = 0; row < n; row++) {
      // Une barre par suite de modules sombres : bien moins de tracé qu'un carré par module
      for (let col = 0; col < n; col++) {
        if (!qr.isDark(row, col)) continue
        let end = col
        while (end + 1 < n && qr.isDark(row, end + 1)) end++
        path += `M${col + QUIET} ${row + QUIET}h${end - col + 1}v1h${col - end - 1}z`
        col = end
      }
    }
    return { size: n + 2 * QUIET, path }
  })
}
