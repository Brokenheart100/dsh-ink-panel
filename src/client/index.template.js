/**
 * dsh-ink-panel — browser half of the bundle.
 *
 * The stylesheets in src/styles/*.css and the modules in src/client/*.js are
 * concatenated into this wrapper by scripts/build.mjs. Everything runs inside
 * one module factory so the modules can share state without imports; the only
 * dependency is react from the browser module table.
 */

window.__ModuleLoader__.load({
  id: 'dsh-ink-panel',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const CSS = [
__THEME_CSS__
    ].join('')

__CLIENT_CODE__

    return { inject, apply }
  },
})
