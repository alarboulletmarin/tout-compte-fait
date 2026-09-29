/** Version de package.json, injectée par Vite. */
declare const __APP_VERSION__: string

/** Détecteur de codes-barres natif (Chrome, Android) : absent des types DOM. */
interface BarcodeDetector {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>
}
declare const BarcodeDetector:
  { new (options?: { formats?: string[] }): BarcodeDetector } | undefined
