/** items[index], ou une erreur : un indice de membre hors foyer est un bug, pas une valeur absente. */
export function at<T>(items: readonly T[], index: number): T {
  const item = items[index]
  if (item === undefined) throw new RangeError(`indice ${index} hors de 0…${items.length - 1}`)
  return item
}
