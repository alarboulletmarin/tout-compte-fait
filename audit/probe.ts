/* ============================================================================
 * Ce qu'on mesure dans une page, une fois qu'elle a fini d'arriver.
 *
 * Une seule fonction, sérialisée telle quelle vers le navigateur : elle ne peut
 * donc rien lire de son module, et tout ce dont elle a besoin est écrit dedans.
 * Une passe unique plutôt qu'une question par mesure — dix allers-retours
 * prendraient les valeurs à dix instants différents de la même page.
 * ==========================================================================*/

export type Probe = {
  scrollWidth: number
  clientWidth: number
  overflowingSelectors: string[]
  scrollHeight: number
  tinyTargets: { selector: string; w: number; h: number; label: string }[]
  smallTargets: number
  hiddenUnderFixed: number
  /** Nombre de repères d'en-tête de carte visibles — la répétition se compte. */
  eyebrowCount: number
  /** Rails qui défilent latéralement, et si un bord montre qu'il y a une suite. */
  scrollRails: { selector: string; scrollWidth: number; clientWidth: number }[]
}

export function probePage(): Probe {
  const doc = document.documentElement
  const vw = doc.clientWidth
  const vh = doc.clientHeight

  const describe = (el: Element): string => {
    const cls =
      typeof el.className === 'string' && el.className.trim() !== ''
        ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}`
        : ''
    return `${el.tagName.toLowerCase()}${el.id === '' ? '' : `#${el.id}`}${cls}`
  }

  /* Ce qui pousse le document au-delà du viewport. On absout ce qui défile chez
     soi — un rail d'onglets a le droit d'être plus large que son cadre — et ce
     qu'un parent coupe : le débordement ne sort alors pas de la page. */
  const overflowingSelectors: string[] = []
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    if (r.right <= vw + 1 && r.left >= -1) continue
    if (getComputedStyle(el).position === 'fixed') continue
    let clipped = false
    for (let p: Element | null = el.parentElement; p !== null; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX
      if (ox === 'hidden' || ox === 'auto' || ox === 'scroll' || ox === 'clip') {
        clipped = true
        break
      }
    }
    if (clipped) continue
    overflowingSelectors.push(
      `${describe(el)} [${String(Math.round(r.left))}..${String(Math.round(r.right))}]`,
    )
    if (overflowingSelectors.length >= 6) break
  }

  /* Les cibles interactives et leur taille réelle. 24×24 est le plancher de
     WCAG 2.5.8 ; 44×44 est l'objectif de qualité du DS. */
  const tinyTargets: Probe['tinyTargets'] = []
  let smallTargets = 0
  const interactive = document.querySelectorAll(
    'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=switch], [role=checkbox], [role=radio], [tabindex]:not([tabindex="-1"])',
  )
  for (const el of interactive) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    const style = getComputedStyle(el)
    if (style.visibility === 'hidden' || style.opacity === '0') continue
    const w = Math.round(r.width)
    const h = Math.round(r.height)
    if (w < 24 || h < 24) {
      tinyTargets.push({
        selector: describe(el),
        w,
        h,
        label: (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40),
      })
    } else if (w < 44 || h < 44) {
      smallTargets += 1
    }
  }

  /* Ce que la barre fixe du bas recouvre **une fois la page défilée à fond**.
     La nuance n'est pas de forme : mesurée sans défiler, la question « le
     dernier bloc passe-t-il sous la barre ? » répond oui sur toute page plus
     haute qu'un écran, ce qui ne dit rien. Ce qui compte est ce qu'on ne peut
     pas atteindre en défilant — c'est-à-dire le rembourrage bas qui manque.
     L'appelant a défilé avant d'appeler ; ici on ne fait que mesurer. */
  let hiddenUnderFixed = 0
  const fixedBottom = [...document.querySelectorAll('body *')].filter((el) => {
    if (getComputedStyle(el).position !== 'fixed') return false
    const r = el.getBoundingClientRect()
    return r.height > 0 && r.bottom > vh - 8 && r.width > vw / 2
  })
  if (fixedBottom.length > 0) {
    const barTop = Math.min(...fixedBottom.map((el) => el.getBoundingClientRect().top))
    const main = document.querySelector('main') ?? document.body

    /* Le bas **réellement visible** d'un élément, et non le bas de sa boîte.
       La nuance a coûté une mesure fausse : les groupes repliés de l'écran du
       mois gardent une boîte de six cents pixels que leur parent coupe, et les
       compter faisait dire au harnais qu'un demi-écran passait sous la barre
       alors que rien n'y passe. Un ancêtre qui coupe borne donc son enfant. */
    const visibleBottom = (el: Element): number => {
      let bottom = el.getBoundingClientRect().bottom
      for (let p: Element | null = el.parentElement; p !== null; p = p.parentElement) {
        const oy = getComputedStyle(p).overflowY
        if (oy !== 'visible') bottom = Math.min(bottom, p.getBoundingClientRect().bottom)
      }
      return bottom
    }

    /* On ne retient que ce qui porte vraiment un texte : un conteneur vide qui
       passerait sous la barre n'y perd rien. */
    let lowest = Number.NEGATIVE_INFINITY
    for (const el of main.querySelectorAll('*')) {
      const r = el.getBoundingClientRect()
      if (r.height === 0 || r.width === 0) continue
      if ((el.textContent ?? '').trim() === '') continue
      lowest = Math.max(lowest, visibleBottom(el))
    }
    if (Number.isFinite(lowest)) hiddenUnderFixed = Math.max(0, Math.round(lowest - barTop))
  }

  /* Les rails qui défilent latéralement : filtres, onglets, tableaux. */
  const scrollRails: Probe['scrollRails'] = []
  for (const el of document.querySelectorAll('body *')) {
    const ox = getComputedStyle(el).overflowX
    if (ox !== 'auto' && ox !== 'scroll') continue
    if (el.scrollWidth <= el.clientWidth + 1) continue
    scrollRails.push({
      selector: describe(el),
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    })
    if (scrollRails.length >= 6) break
  }

  return {
    scrollWidth: doc.scrollWidth,
    clientWidth: vw,
    overflowingSelectors,
    scrollHeight: Math.max(doc.scrollHeight, document.body.scrollHeight),
    tinyTargets: tinyTargets.slice(0, 12),
    smallTargets,
    hiddenUnderFixed,
    eyebrowCount: document.querySelectorAll('.t-eyebrow, .eyebrow-pill').length,
    scrollRails,
  }
}
