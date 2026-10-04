import {NAV_APP_META} from '../../prototype/fixtures/navigation.js'

/** Owns the For You landing screen — the app-scoped parameterization of
 *  the old Dashboard view. Static markup, cloned into the content host once
 *  at shell construction; activate({app}) stamps the per-app title,
 *  breadcrumb and subtitle, attachAndShowView toggles visibility. */
export function createForYou({t}) {
  let root = null
  const view = () => (root = root || document.querySelector('.foryou-view'))

  return {
    id: 'foryou',
    get roots() {
      const el = view()
      return el ? [el] : []
    },
    activate({app} = {}) {
      const el = view()
      if (!el) return
      const name = app || 'Dashboard'
      const meta = NAV_APP_META[name]
      const description = meta ? meta.description : 'Overview and key activity'
      const crumb = el.querySelector('[data-foryou-app]')
      const title = el.querySelector('[data-foryou-title]')
      const subtitle = el.querySelector('[data-foryou-subtitle]')
      /* data-i18n carries the English key so locale switches re-translate
         the dynamic strings exactly like static ones. */
      if (crumb) {
        crumb.dataset.i18n = name
        crumb.textContent = t(name)
      }
      if (title) {
        title.dataset.i18n = name
        title.textContent = t(name)
      }
      if (subtitle) {
        subtitle.dataset.i18n = description
        subtitle.textContent = t(description)
      }
    },
    deactivate() {},
    dispose() {
      root = null
    },
  }
}
