/* ============================================================================
 * Le focus clavier — visible, et jamais recouvert.
 *
 * WCAG 2.4.7 demande qu'il se voie, 2.4.11 qu'aucun élément fixe ne le cache.
 * Les deux se mesurent, et aucun des deux ne se lit dans le CSS : un anneau
 * déclaré peut être rogné par un `overflow`, et un élément parfaitement visible
 * au chargement peut passer sous la barre du bas une fois qu'on tabule jusqu'à
 * lui.
 *
 * Le harnais tabule donc **réellement**, sur toute la page, et regarde à chaque
 * arrêt : l'élément a-t-il un anneau, et son rectangle est-il entièrement dans
 * le viewport une fois le navigateur l'y ayant amené ?
 * ==========================================================================*/

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { type Page, test } from '@playwright/test'
import { APP_ROUTES, type AuditRoute, PUBLIC_ROUTES } from './routes'
import { loadExample, seedPreferences, settle } from './session'

const OUT = path.resolve(import.meta.dirname)

/* Deux largeurs : celle où une barre d'onglets fixe peut recouvrir un focus, et
   celle où c'est une colonne latérale qui borde. */
const WIDTHS = [
  { width: 375, height: 812 },
  { width: 1280, height: 900 },
] as const

/** Combien d'arrêts on visite par écran. Au-delà, on répète des rangées. */
const STOPS = 40

type Finding = {
  route: string
  slug: string
  width: number
  /** L'élément qui a le focus, décrit. */
  target: string
  kind: 'invisible' | 'covered'
  detail: string
}

async function walk(page: Page, route: AuditRoute, findings: Finding[]): Promise<void> {
  for (const viewport of WIDTHS) {
    await page.setViewportSize(viewport)
    await page.goto(route.path, { waitUntil: 'domcontentloaded' })
    await settle(page)
    await page.evaluate(() => {
      document.body.focus()
    })

    const seen = new Set<string>()
    for (let stop = 0; stop < STOPS; stop += 1) {
      await page.keyboard.press('Tab')
      const state = await page.evaluate(() => {
        const el = document.activeElement
        if (el === null || el === document.body) return null
        const r = el.getBoundingClientRect()
        const describe =
          el.tagName.toLowerCase() +
          (typeof el.className === 'string' && el.className.trim() !== ''
            ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}`
            : '') +
          `«${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 28)}»`

        /* L'anneau : un `outline` d'au moins un pixel, ou une ombre qui en tient
           lieu. Le DS pose `outline: 2px solid var(--focus)` sur
           `:focus-visible`, mais un composant peut le remplacer.

           **Et il n'est pas toujours sur l'élément qui a le focus**, ce que le
           premier essai a pris pour cinquante et un défauts. Deux composants le
           posent ailleurs, à dessein : une tuile à lien étendu le dessine sur la
           tuile — `.tile:has(> .tile-stretch:focus-visible)` —, parce que le
           cadre porte `overflow: hidden` et rognerait l'anneau du lien ; un
           champ le dessine sur le cadre voisin, par `peer-focus-visible`, pour
           qu'il entoure la rangée entière et non la boîte de saisie. On regarde
           donc l'élément, ses ancêtres, et ses frères. */
        const hasRing = (node: Element): boolean => {
          const s = getComputedStyle(node)
          const w = Number.parseFloat(s.outlineWidth)
          return (s.outlineStyle !== 'none' && w >= 1) || s.boxShadow !== 'none'
        }
        let ring = hasRing(el)
        for (let p = el.parentElement; p !== null && !ring; p = p.parentElement) {
          if (p === document.body) break
          ring = hasRing(p)
        }
        if (!ring && el.parentElement !== null) {
          ring = [...el.parentElement.children].some((sib) => sib !== el && hasRing(sib))
        }

        /* Recouvert : un élément fixe passe devant lui. On interroge le point
           au centre de sa boîte — si ce n'est pas lui ni un de ses enfants qui
           répond, c'est qu'il est dessous. */
        const cx = Math.round(r.left + r.width / 2)
        const cy = Math.round(r.top + r.height / 2)
        const onTop = document.elementFromPoint(cx, cy)
        const covered =
          r.width > 0 &&
          r.height > 0 &&
          onTop !== null &&
          !el.contains(onTop) &&
          !onTop.contains(el) &&
          getComputedStyle(onTop).position === 'fixed'

        return {
          describe,
          ring,
          covered,
          outOfView:
            r.height > 0 && (r.top < 0 || r.bottom > document.documentElement.clientHeight),
          rect: `${String(Math.round(r.top))}..${String(Math.round(r.bottom))}`,
        }
      })

      if (state === null) break
      if (seen.has(state.describe)) continue
      seen.add(state.describe)

      if (!state.ring) {
        findings.push({
          route: route.path,
          slug: route.slug,
          width: viewport.width,
          target: state.describe,
          kind: 'invisible',
          detail: 'aucun anneau de focus',
        })
      }
      if (state.covered) {
        findings.push({
          route: route.path,
          slug: route.slug,
          width: viewport.width,
          target: state.describe,
          kind: 'covered',
          detail: `recouvert par un élément fixe, boîte ${state.rect}`,
        })
      }
    }
  }
}

test('focus visible et non masqué', async ({ browser }) => {
  test.setTimeout(45 * 60_000)
  const context = await browser.newContext({ locale: 'fr-FR', reducedMotion: 'reduce' })
  await seedPreferences(context, 'fr', 'light')
  const page = await context.newPage()
  const findings: Finding[] = []

  for (const route of PUBLIC_ROUTES) await walk(page, route, findings)
  await loadExample(page, 'fr')
  for (const route of APP_ROUTES) await walk(page, route, findings)

  await mkdir(path.join(OUT, 'focus'), { recursive: true })
  await writeFile(
    path.join(OUT, 'focus', 'fr-light.json'),
    `${JSON.stringify(findings, null, 2)}\n`,
    'utf8',
  )
  await context.close()
})
