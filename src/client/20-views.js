/*
 * Views: the seal button in the composer dock and the settings row with the
 * on/off switch plus a three-way paper picker.
 */

const useTranslate = (translate) => (typeof translate === 'function' ? translate : (key) => key)

function InkDock({ t: translate }) {
  const t = useTranslate(translate)
  const { enabled, paper } = useInkState()
  const label = paper === 'night' ? t('mode.night') : t('mode.day')
  return h('button', {
    type: 'button',
    className: 'dsh-ink-dock',
    'aria-pressed': enabled,
    title: t('dock.title') + ' · ' + label,
    onClick: () => setSkin(!enabled, true),
  },
    h('span', { className: 'dsh-ink-dock-seal', 'aria-hidden': 'true' }, '\u58a8'),
    h('span', null, t('dock.label')),
  )
}

function ModePicker({ t: translate }) {
  const t = useTranslate(translate)
  const { mode } = useInkState()
  return h('div', { className: 'dsh-ink-modes', role: 'radiogroup', 'aria-label': t('row.appearance') },
    MODES.map((value) => h('button', {
      key: value,
      type: 'button',
      role: 'radio',
      'aria-checked': mode === value,
      className: mode === value ? 'dsh-ink-mode is-on' : 'dsh-ink-mode',
      onClick: () => setMode(value),
    }, t('mode.' + value))),
  )
}

function InkRow({ t: translate }) {
  const t = useTranslate(translate)
  const { enabled, paper } = useInkState()
  const swatches = { day: ['#f4ecdc', '#171310', '#c2382b'], night: ['#14110e', '#f2e9d8', '#e05a45'] }[paper]
  return h('div', { className: 'dsh-ink-row' },
    h('div', { className: 'dsh-ink-row-copy' },
      h('div', { className: 'dsh-ink-row-title' },
        t('row.title'),
        h('span', { className: 'dsh-ink-swatches', 'aria-hidden': 'true' },
          swatches.map((color, index) => h('i', { key: index, style: { background: color } })),
        ),
      ),
      h('div', { className: 'dsh-ink-row-desc' }, t('row.description')),
      h('div', { className: 'dsh-ink-row-hint' }, t('row.hint')),
    ),
    h('div', { className: 'dsh-ink-row-actions' },
      h('button', {
        type: 'button',
        className: enabled ? 'dsh-ink-switch is-on' : 'dsh-ink-switch',
        'aria-pressed': enabled,
        onClick: () => setSkin(!enabled, true),
      },
        h('span', { className: 'dsh-ink-switch-dot', 'aria-hidden': 'true' }),
        h('span', null, enabled ? t('row.on') : t('row.off')),
      ),
      h(ModePicker, { t: translate }),
    ),
  )
}
