/*
 * Wiring: stylesheet, copy, persisted state plus appearance tracking, and the
 * two mount points. Every resource is registered through ctx.effect so that
 * unloading the bundle restores the app exactly as it was.
 */

const inject = ['slots', 'locale']

function apply(ctx) {
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.pluginCss = 'dsh-ink-panel/theme.css'
    style.textContent = CSS
    document.head.append(style)
    return () => style.remove()
  }, 'ink-panel: stylesheet')

  ctx.effect(() => ctx.locale.register(NAMESPACE, { zh, en }), 'ink-panel: copy')

  ctx.effect(() => {
    enabled = readStored()
    mode = readMode()
    appDark = detectAppDark()
    paint()

    const body = document.body
    const observer = typeof MutationObserver === 'function' && body
      ? new MutationObserver(() => setAppDark(detectAppDark()))
      : null
    if (observer) observer.observe(body, { attributes: true, attributeFilter: [DARK_BODY_ATTRIBUTE] })

    const media = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)')
    const onMedia = () => setAppDark(detectAppDark())
    if (media && typeof media.addEventListener === 'function') media.addEventListener('change', onMedia)

    const onStorage = (event) => {
      if (event.key === STORAGE_KEY) {
        enabled = event.newValue !== 'off'
        paint()
        emit()
      } else if (event.key === MODE_KEY) {
        mode = MODES.indexOf(event.newValue) >= 0 ? event.newValue : 'auto'
        paint()
        emit()
      }
    }
    window.addEventListener('storage', onStorage)

    return () => {
      window.removeEventListener('storage', onStorage)
      if (media && typeof media.removeEventListener === 'function') media.removeEventListener('change', onMedia)
      if (observer) observer.disconnect()
      listeners.clear()
      document.documentElement.removeAttribute(ATTRIBUTE)
      document.documentElement.removeAttribute(THEME_ATTRIBUTE)
    }
  }, 'ink-panel: skin state')

  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'ink-panel',
    order: 12,
    locale: NAMESPACE,
  }, InkRow))

  ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
    name: 'conversation.composer.dock',
    id: 'ink-panel',
    order: 40,
    locale: NAMESPACE,
  }, InkDock))
}
