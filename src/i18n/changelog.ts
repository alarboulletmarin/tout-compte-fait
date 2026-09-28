export interface Release {
  version: string
  date: string
  items: string[]
}

/**
 * Lit CHANGELOG.md : « ## 1.0.0 — date » ouvre une version, « - texte » en est un point.
 * Le reste (titre, paragraphes) est ignoré.
 */
export function parseChangelog(markdown: string): Release[] {
  const releases: Release[] = []
  for (const line of markdown.split('\n')) {
    const heading = /^## +(\S+)(?: +— +(.+))?$/.exec(line.trim())
    if (heading) {
      releases.push({ version: heading[1] ?? '', date: heading[2] ?? '', items: [] })
      continue
    }
    const item = /^- +(.+)$/.exec(line.trim())
    if (item?.[1]) releases.at(-1)?.items.push(item[1])
  }
  return releases
}
