/*
 * State: one persisted enabled flag, one persisted paper mode ('auto' | 'day' |
 * 'night'), and the DOM painting that both controls drive.
 */

const NAMESPACE = 'ink-panel'
const STORAGE_KEY = 'dsh.ink-panel.enabled'
const MODE_KEY = 'dsh.ink-panel.mode'
const ATTRIBUTE = 'data-dsh-ink'
const THEME_ATTRIBUTE = 'data-dsh-ink-theme'
const DARK_BODY_ATTRIBUTE = 'data-ds-dark-theme'
const MODES = ['auto', 'day', 'night']

const listeners = new Set()
let enabled = true
let mode = 'auto'
let appDark = false
let paper = 'day'

const readStored = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

const readMode = () => {
  try {
    const stored = window.localStorage.getItem(MODE_KEY)
    return MODES.indexOf(stored) >= 0 ? stored : 'auto'
  } catch {
    return 'auto'
  }
}

const prefersDark = () => {
  const query = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)')
  return !!(query && query.matches)
}

/* The app declares its appearance on <body data-ds-dark-theme>; the media query
   is only a fallback for the first paint, before the app has stamped it. */
const detectAppDark = () => {
  const body = document.body
  if (body && typeof body.hasAttribute === 'function' && body.hasAttribute(DARK_BODY_ATTRIBUTE)) return true
  return prefersDark()
}

const paint = () => {
  const root = document.documentElement
  paper = mode === 'night' || (mode === 'auto' && appDark) ? 'night' : 'day'
  if (enabled) {
    root.setAttribute(ATTRIBUTE, 'on')
    root.setAttribute(THEME_ATTRIBUTE, paper)
  } else {
    root.removeAttribute(ATTRIBUTE)
    root.removeAttribute(THEME_ATTRIBUTE)
  }
  /* The desktop shell samples body style mutations for the native caption
     probe; touching it makes an instant toggle reach the title bar too. */
  if (document.body) document.body.style.setProperty('--dsh-ink-panel', enabled ? '1' : '0')
}

const persist = (key, value) => {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* private mode: the choice still holds for this page */
  }
}

const emit = () => {
  for (const listener of listeners) {
    try {
      listener()
    } catch {
      /* one broken subscriber must not block the others */
    }
  }
}

const setSkin = (next, save) => {
  if (enabled === next) return
  enabled = next
  if (save) persist(STORAGE_KEY, next ? 'on' : 'off')
  paint()
  emit()
}

const setMode = (next) => {
  if (MODES.indexOf(next) < 0 || mode === next) return
  mode = next
  persist(MODE_KEY, next)
  paint()
  emit()
}

const setAppDark = (next) => {
  if (next === appDark) return
  appDark = next
  paint()
  emit()
}

/* Both controls read the same store; the tuple identity keeps re-renders cheap. */
const useInkState = () => {
  const [value, setValue] = React.useState([enabled, mode, paper])
  React.useEffect(() => {
    const sync = () => setValue([enabled, mode, paper])
    listeners.add(sync)
    sync()
    return () => {
      listeners.delete(sync)
    }
  }, [])
  return { enabled: value[0], mode: value[1], paper: value[2] }
}
