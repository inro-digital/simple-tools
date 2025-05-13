import Countdown from 'https://esm.sh/jsr/@inro/simple-tools/countdown'

const jsrLink = 'https://jsr.io/@inro/simple-tools/doc/countdown/~'
const codeLink = 'https://git.sr.ht/~inro/simple-tools/tree/main/item/timers'

let initialMS = 60_000
const countdown = new Countdown({ initialMS })

// @todo: demonstrate watching vars + drawing with requestAnimationFrame
countdown.addEventListener(() => m.redraw())

export default {
  view: () => {
    const startPause = (countdown.state.isStarted && !countdown.state.isPaused)
      ? m('button', { onclick: () => countdown.pause() }, 'pause')
      : m('button', { onclick: () => countdown.start() }, 'start')

    const reset = (countdown.state.isStarted && countdown.state.isPaused)
      ? m('button', {
        onclick: () => {
          countdown.stop()
          countdown.reset({ initialMS })
        },
      }, 'reset')
      : undefined
    const input = (!countdown.state.isStarted)
      ? m('input[type=number]', {
        value: initialMS / 1000,
        onchange: (e) => {
          initialMS = parseInt(e.target.value) * 1000
          console.log(initialMS)
          countdown.reset({ initialMS })
        },
      })
      : undefined

    return m('main', [
      m('header', [
        m('h1', [m('a', { onclick: () => history.back() }, '<'), 'Countdown']),
        m('h1', 'Countdown'),
        m('ul', [
          m('li', m('a', { href: jsrLink }, 'jsr')),
          m('li', m('a', { href: codeLink }, 'code')),
        ]),
      ]),
      m('article', [
        m('h1.display', countdown.state.display),
        input,
        m('div.controls', [startPause, reset]),
      ]),
    ])
  },
}
