/* Construction de tracés SVG.
 *
 * Une période sans donnée ne vaut pas zéro : elle n'est pas tracée du tout.
 * C'est la règle du cahier §4.7 — « les périodes sans donnée affichent un état
 * vide explicite, pas un graphique à zéro » — appliquée au trait lui-même,
 * qui se coupe au lieu de plonger sur la ligne de base. */

export type Point = { x: number; y: number } | null

/** Trace une polyligne en coupant le trait à chaque trou. */
export function polylinePath(points: readonly Point[]): string {
  const commands: string[] = []
  let penDown = false
  for (const point of points) {
    if (point === null) {
      penDown = false
      continue
    }
    commands.push(`${penDown ? 'L' : 'M'} ${String(point.x)} ${String(point.y)}`)
    penDown = true
  }
  return commands.join(' ')
}

/** Un point isolé entre deux trous ne produirait aucun trait : on le marque. */
export function isolatedPoints(points: readonly Point[]): { x: number; y: number }[] {
  return points.filter((point, index): point is { x: number; y: number } => {
    if (point === null) return false
    return (points[index - 1] ?? null) === null && (points[index + 1] ?? null) === null
  })
}

/**
 * Une aire, fermée sur une base qui peut elle-même être une ligne.
 *
 * Le contour du dessus est la polyligne du haut ; celui du dessous la remonte à
 * l'envers. Quand la base est plate, c'est l'aire simple d'un versé cumulé ;
 * quand elle suit une autre série, c'est la bande d'un empilement — le même
 * code pour les deux, parce que c'est la même figure.
 *
 * Elle vivait dans `ProjectionChart`, qui était son seul appelant. Ils sont deux
 * depuis que l'épargne s'empile elle aussi, et une figure recopiée est une
 * figure qui finit par ne plus se lire pareil d'un graphique à l'autre.
 *
 * Les deux contours doivent avoir la **même longueur** et ne porter aucun trou :
 * une bande n'a pas de sens là où l'un des deux bords manque, et l'appelant
 * coupe donc sa pile avant d'arriver ici.
 */
export function bandPath(
  top: readonly { x: number; y: number }[],
  bottom: readonly { x: number; y: number }[],
): string {
  const first = bottom[0]
  if (top.length === 0 || first === undefined) return ''
  const back = [...bottom].reverse().map((point) => `L ${String(point.x)} ${String(point.y)}`)
  return `${polylinePath(top)} ${back.join(' ')} Z`
}
