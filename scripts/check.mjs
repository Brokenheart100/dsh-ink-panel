/**
 * Contract check for the built client.js: loads it in a stubbed browser, then
 * walks the states the real app can produce (toggle, paper mode, app theme)
 * and asserts the DOM attributes, locale, slots and stylesheet.
 * Run `node scripts/check.mjs` after `node scripts/build.mjs`.
 */
import { readFileSync, readdirSync } from 'node:fs'
import vm from 'node:vm'

const root = new URL('../', import.meta.url)
const failures = []
const pass = (name, ok, extra) => {
  if (!ok) failures.push(name + (extra ? ' — ' + extra : ''))
}

/* --- stylesheet sanity ---------------------------------------------------- */
const styleFiles = readdirSync(new URL('src/styles/', root)).filter((f) => f.endsWith('.css')).sort()
let css = ''
for (const file of styleFiles) css += readFileSync(new URL('src/styles/' + file, root), 'utf8')

pass('styles: starts with palette', styleFiles[0] === '00-palette.css', styleFiles[0])
pass('styles: brace balance', css.split('{').length === css.split('}').length, css.split('{').length + ' vs ' + css.split('}').length)
pass('styles: no literal rgba', !/rgba?\(\s*\d/.test(css), (css.match(/rgba?\(\s*\d[^)]*\)/) || [''])[0])
pass('styles: night palette', css.includes("html[data-dsh-ink][data-dsh-ink-theme='night']"))
const literalHex = styleFiles.filter((f) => f !== '00-palette.css' && /#[0-9a-f]{6}\b/i.test(readFileSync(new URL('src/styles/' + f, root), 'utf8')))
pass('styles: only palette declares hex', literalHex.length === 0, literalHex.join(','))
pass('styles: table cell padding', /html\[data-dsh-ink\] td \{\n[^}]*padding:/.test(css))
pass('styles: outer table cells keep padding', /table td:first-child \{\n  border-left: 0;\n  padding-left: 15px;/.test(css))
pass('styles: switch thumb follows palette', /\[role='switch'\] \{\n  --dsw-alias-switch-thumb: var\(--ip-ink\);/.test(css))

/* --- browser stub --------------------------------------------------------- */
const attrs = {}
const bodyAttrs = { style: { values: {}, setProperty(k, v) { this.values[k] = v } } }
let storage = {}
const cleanups = []
const slots = []
const slotNames = []
const locales = {}
let observerCallback = null
let storageHandler = null

const documentElement = {
  attrs,
  setAttribute: (name, value) => { attrs[name] = String(value) },
  removeAttribute: (name) => { delete attrs[name] },
  getAttribute: (name) => (name in attrs ? attrs[name] : null),
}
const document = {
  documentElement,
  body: Object.assign(bodyAttrs, {
    hasAttribute: (name) => name in bodyAttrs,
  }),
  head: { children: [], append(node) { this.children.push(node) } },
  createElement: () => ({
    dataset: {},
    style: {},
    textContent: '',
    remove() {
      const index = document.head.children.indexOf(this)
      if (index >= 0) document.head.children.splice(index, 1)
    },
  }),
}

const moduleHolder = {}
const window = {
  localStorage: {
    getItem: (key) => (key in storage ? storage[key] : null),
    setItem: (key, value) => { storage[key] = String(value) },
  },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  addEventListener: (name, fn) => { if (name === 'storage') storageHandler = fn },
  removeEventListener: () => { storageHandler = null },
  __ModuleLoader__: { load: (definition) => { moduleHolder.definition = definition } },
}

class MutationObserver {
  constructor(callback) { this.callback = callback }
  observe() { observerCallback = this.callback }
  disconnect() { observerCallback = null }
}

const sandbox = { window, document, MutationObserver, console, setTimeout, clearTimeout }
sandbox.globalThis = sandbox
vm.createContext(sandbox)
vm.runInContext(readFileSync(new URL('client.js', root), 'utf8'), sandbox, { filename: 'client.js' })

const definition = moduleHolder.definition
pass('module: id is the package name', definition && definition.id === 'dsh-ink-panel', definition && definition.id)

const React = { createElement: () => ({}), useState: (value) => [value, () => {}], useEffect: () => {} }
const api = definition.factory(() => React)
pass('module: inject list', JSON.stringify(api.inject) === JSON.stringify(['slots', 'locale']), JSON.stringify(api.inject))

const ctx = {
  effect(fn) { cleanups.push(fn()) },
  locale: { register(namespace, dictionary) { locales[namespace] = dictionary } },
  slots: {
    inject(name, register) { slotNames.push(name); register() },
    register(meta) { slots.push(meta); return () => {} },
  },
}
api.apply(ctx)

pass('effect: three cleanups', cleanups.length === 3, String(cleanups.length))
pass('dom: root attribute', attrs['data-dsh-ink'] === 'on', JSON.stringify(attrs))
pass('dom: paper attribute', attrs['data-dsh-ink-theme'] === 'day', attrs['data-dsh-ink-theme'])
pass('dom: caption probe', bodyAttrs.style.values['--dsh-ink-panel'] === '1', bodyAttrs.style.values['--dsh-ink-panel'])
pass('style: injected', document.head.children.length === 1 && document.head.children[0].textContent.length > 20000, String(document.head.children[0] && document.head.children[0].textContent.length))
pass('locale: registered', !!locales['ink-panel'] && locales['ink-panel'].zh['row.title'] === '墨线漫画主题', Object.keys(locales))
pass('locale: night copy', !!locales['ink-panel'] && locales['ink-panel'].zh['mode.night'] === '夜墨')
pass('slots: two mounts', JSON.stringify(slotNames) === JSON.stringify(['settings.general.item', 'conversation.composer.dock']), JSON.stringify(slotNames))
pass('slots: meta', slots.length === 2 && slots.every((s) => s.id === 'ink-panel' && s.locale === 'ink-panel') && slots[0].order === 12 && slots[1].order === 40, JSON.stringify(slots))

storageHandler({ key: 'dsh.ink-panel.mode', newValue: 'night' })
pass('state: manual night', attrs['data-dsh-ink-theme'] === 'night', attrs['data-dsh-ink-theme'])

storageHandler({ key: 'dsh.ink-panel.mode', newValue: 'auto' })
pass('state: auto follows day', attrs['data-dsh-ink-theme'] === 'day', attrs['data-dsh-ink-theme'])

bodyAttrs['data-ds-dark-theme'] = ''
observerCallback()
pass('state: auto follows app dark', attrs['data-dsh-ink-theme'] === 'night', attrs['data-dsh-ink-theme'])

delete bodyAttrs['data-ds-dark-theme']
observerCallback()
pass('state: auto returns to day', attrs['data-dsh-ink-theme'] === 'day', attrs['data-dsh-ink-theme'])

storageHandler({ key: 'dsh.ink-panel.enabled', newValue: 'off' })
pass('state: off strips attributes', !('data-dsh-ink' in attrs) && !('data-dsh-ink-theme' in attrs), JSON.stringify(attrs))
pass('state: off caption probe', bodyAttrs.style.values['--dsh-ink-panel'] === '0', bodyAttrs.style.values['--dsh-ink-panel'])

for (const cleanup of cleanups.reverse()) if (typeof cleanup === 'function') cleanup()
pass('unload: attributes removed', !('data-dsh-ink' in attrs) && !('data-dsh-ink-theme' in attrs), JSON.stringify(attrs))
pass('unload: observer stopped', observerCallback === null)
pass('unload: style removed', document.head.children.length === 0)

if (failures.length) {
  console.error('FAIL\n' + failures.map((line) => ' - ' + line).join('\n'))
  process.exit(1)
}
console.log('ALL_PASS (' + styleFiles.length + ' stylesheets, ' + String(css.length) + ' css bytes)')
