/** Owns the "Not in this prototype" screen: what a sidebar leaf, quick-list
 *  entry or search result opens when the prototype has no view for it.
 *  Navigation always names the requested screen and its app and offers a
 *  way back to the app's For You page — it never shows another screen's
 *  content in its place.
 *
 *  The view is cloned from its template on first activation and detached
 *  again on deactivate, so no other page's show/hide pass ever has to know
 *  about it. */
export function createPlaceholder({t, locale, openForYou}) {
  let root = null
  let current = {label: '', app: ''}
  let unsubscribeLocale = null

  const mount = () => {
    if (root) return root
    root = document.querySelector('.placeholder-tpl').content.firstElementChild.cloneNode(true)
    const backToApp = event => {
      event.preventDefault()
      openForYou(current.app)
    }
    root.querySelector('[data-placeholder-app]').addEventListener('click', backToApp)
    root.querySelector('[data-placeholder-back]').addEventListener('click', backToApp)
    return root
  }

  /* Labels come from the nav tree or the URL: textContent only, and the
     translated nav label when one exists. */
  const render = () => {
    if (!root) return
    const {label, app} = current
    /* a view mounted after the last locale switch has not been through the
       shell's data-i18n pass */
    root.querySelectorAll('[data-i18n]').forEach(node => {
      node.textContent = t(node.dataset.i18n)
    })
    const screenName = label ? t(label) : t('Not in this prototype')
    const appName = t(app)
    root.querySelector('[data-placeholder-app]').textContent = appName
    root.querySelector('[data-placeholder-crumb]').textContent = screenName
    root.querySelector('[data-placeholder-title]').textContent = screenName
    root.querySelector('[data-placeholder-back]').textContent = t('Back to {app}').replace('{app}', appName)
  }

  return {
    id: 'placeholder',
    get roots() {
      return root ? [root] : []
    },
    activate({label = '', app = 'Dashboard'} = {}) {
      current = {label, app}
      const el = mount()
      const pageContent = document.querySelector('.page-content')
      if (!el.isConnected) pageContent.append(el)
      el.hidden = false
      render()
      unsubscribeLocale ??= locale.subscribe(render)
    },
    deactivate() {
      unsubscribeLocale?.()
      unsubscribeLocale = null
      root?.remove()
    },
    dispose() {
      this.deactivate()
      root = null
    },
  }
}
