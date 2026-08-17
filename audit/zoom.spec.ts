/* ============================================================================
 * Le zoom navigateur, à 200 % et 400 % — WCAG 1.4.4 et 1.4.10.
 *
 * Zoomer n'est pas rétrécir la fenêtre : le texte grandit *et* la surface CSS
 * diminue, ce qui met sous tension des choses qu'un simple redimensionnement
 * ne touche pas — un libellé qui tenait sur une ligne en prend deux, une
 * pilule à hauteur fixe déborde de son cadre.
 *
 * On le simule comme le critère le définit : à 200 %, un écran de 1280 offre
 * 640px de surface CSS ; à 400 %, 320. Le `deviceScaleFactor` reproduit
 * l'agrandissement, la taille du viewport la surface qui reste.
 *
 * Ce qu'on cherche : un débordement horizontal, et des textes qui se
 * chevauchent — deux boîtes de texte qui se recouvrent alors qu'aucune n'est
 * censée passer devant l'autre.
 * ==========================================================================*/

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { type Page, test } from '@playwright/test'
import { APP_ROUTES, type AuditRoute, PUBLIC_ROUTES } from './routes'
import { loadExample, seedPreferences, settle } from './session'

const OUT = path.resolve(import.meta.dirname)

/* 1280 est la largeur de référence du critère. À 200 % il reste 640px de
   surface CSS, à 400 % il en reste 320. */
const LEVELS = [
  { zoom: 200, width: 640, height: 512 },
  { zoom: 400, width: 320, height: 256 },
] as const

type ZoomRow = {
  route: string
  slug: string
  zoom: number
  overflowX: number
  overlaps: { a: string; b: string; area: number }[]
  clipped: string[]
}

/** Ce qui se chevauche et ce qui se fait couper, une fois zoomé. */
function probeZoom(): { overflowX: number; overlaps: ZoomRow['overlaps']; clipped: string[] } {
  const doc = document.documentElement
  const describe = (el: Element): string =>
    `${el.tagName.toLowerCase()}${
      typeof el.className === 'string' && el.className.trim() !== ''
        ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}`
        : ''
    }«${(el.textContent ?? '').trim().slice(0, 24)}»`

  /* Un élément est-il réellement montré ? Sa boîte ne suffit pas à le dire :
     les groupes repliés de l'app gardent leurs lignes dans le DOM, avec une
     boîte pleine, sous un parent qui les coupe. Comptées telles quelles, ces
     lignes-là se « chevauchent » toutes entre elles et noieraient les vrais
     chevauchements sous des dizaines de faux. Un ancêtre qui coupe doit donc
     contenir l'élément pour que celui-ci compte. */
  const shown = (el: Element): boolean => {
    const r = el.getBoundingClientRect()
    for (let p: Element | null = el.parentElement; p !== null; p = p.parentElement) {
      const s = getComputedStyle(p)
      if (s.overflow === 'visible' && s.overflowX === 'visible' && s.overflowY === 'visible') {
        continue
      }
      const pr = p.getBoundingClientRect()
      if (r.bottom <= pr.top + 1 || r.top >= pr.bottom - 1) return false
      if (r.right <= pr.left + 1 || r.left >= pr.right - 1) return false
    }
    return true
  }

  /* Les feuilles de texte : un élément qui porte du texte et aucun enfant qui
     en porte. Ce sont elles qui se chevauchent visiblement. */
  const leaves = [...document.querySelectorAll('main *, header *')].filter((el) => {
    if ((el.textContent ?? '').trim() === '') return false
    if ([...el.children].some((c) => (c.textContent ?? '').trim() !== '')) return false
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) return false
    const s = getComputedStyle(el)
    if (s.visibility === 'hidden' || s.position === 'fixed' || s.position === 'absolute') {
      return false
    }
    return shown(el)
  })

  const overlaps: ZoomRow['overlaps'] = []
  for (let i = 0; i < leaves.length && overlaps.length < 8; i += 1) {
    for (let j = i + 1; j < leaves.length && overlaps.length < 8; j += 1) {
      const a = leaves[i]?.getBoundingClientRect()
      const b = leaves[j]?.getBoundingClientRect()
      if (a === undefined || b === undefined) continue
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left)
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
      /* Deux pixels de tolérance : les boîtes de ligne se touchent souvent
         d'un demi-pixel sans que rien ne se recouvre à l'œil. */
      if (w > 2 && h > 2) {
        const first = leaves[i]
        const second = leaves[j]
        if (first === undefined || second === undefined) continue
        overlaps.push({
          a: describe(first),
          b: describe(second),
          area: Math.round(w * h),
        })
      }
    }
  }

  /* Ce qu'un parent coupe : un texte plus large que la boîte qui le contient
     et dont le débordement est masqué se lit tronqué. `text-overflow` mis à
     `ellipsis` est un choix, pas un défaut — on ne retient que les coupes
     franches. */
  const clipped: string[] = []
  for (const el of leaves) {
    const s = getComputedStyle(el)
    if (s.textOverflow === 'ellipsis') continue
    if (s.overflow === 'visible' && s.overflowX === 'visible') continue
    if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2) {
      clipped.push(describe(el))
      if (clipped.length >= 6) break
    }
  }

  return { overflowX: Math.max(0, doc.scrollWidth - doc.clientWidth), overlaps, clipped }
}

async function atZoom(
  page: Page,
  route: AuditRoute,
  level: (typeof LEVELS)[number],
  rows: ZoomRow[],
): Promise<void> {
  await page.setViewportSize({ width: level.width, height: level.height })
  await page.goto(route.path, { waitUntil: 'domcontentloaded' })
  await settle(page)
  const probe = await page.evaluate(probeZoom)
  rows.push({ route: route.path, slug: route.slug, zoom: level.zoom, ...probe })
}

test('zoom 200 % et 400 %', async ({ browser }) => {
  test.setTimeout(45 * 60_000)
  const rows: ZoomRow[] = []
  for (const level of LEVELS) {
    const context = await browser.newContext({
      locale: 'fr-FR',
      reducedMotion: 'reduce',
      /* L'agrandissement lui-même : le texte est rendu à deux ou quatre fois
         sa taille physique, comme sous un zoom navigateur. */
      deviceScaleFactor: level.zoom / 100,
    })
    await seedPreferences(context, 'fr', 'light')
    const page = await context.newPage()
    for (const route of PUBLIC_ROUTES) await atZoom(page, route, level, rows)
    await loadExample(page, 'fr')
    for (const route of APP_ROUTES) await atZoom(page, route, level, rows)
    await context.close()
  }
  await mkdir(path.join(OUT, 'zoom'), { recursive: true })
  await writeFile(path.join(OUT, 'zoom', 'fr-light.json'), `${JSON.stringify(rows, null, 2)}\n`, 'utf8')
})
