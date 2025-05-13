import Stopwatch from 'https://esm.sh/jsr/@inro/simple-tools/stopwatch'

const jsrLink = 'https://jsr.io/@inro/simple-tools/doc/stopwatch/~'
const codeLink = 'https://git.sr.ht/~inro/simple-tools/tree/main/item/timers'

const stopwatch = new Stopwatch()

// @todo: demonstrate watching vars + drawing with requestAnimationFrame
stopwatch.addEventListener(() => m.redraw())

export default {
  view: () => {
    const laps = stopwatch.state.laps.map(
      (lap) =>
        m('div', `Lap: ${lap.totalDisplay} (Split: ${lap.splitDisplay})`),
    )
    const startPause = (stopwatch.state.isStarted && !stopwatch.state.isPaused)
      ? m('button', { onclick: () => stopwatch.pause() }, 'pause')
      : m('button', { onclick: () => stopwatch.start() }, 'start')

    const reset = (stopwatch.state.isStarted && stopwatch.state.isPaused)
      ? m('button', {
        onclick: () => {
          stopwatch.stop()
          stopwatch.reset()
        },
      }, 'reset')
      : undefined

    return m('main', [
      m('header', [
        m('h1', [m('a', { onclick: () => history.back() }, '<'), 'Stopwatch']),
        m('ul', [
          m('li', m('a', { href: jsrLink }, 'jsr')),
          m('li', m('a', { href: codeLink }, 'code')),
        ]),
      ]),
      m('article', [
        m('h1.display', stopwatch.state.display),
        m('div.controls', [
          startPause,
          m('button.lap', { onclick: () => stopwatch.lap() }, 'lap'),
          reset,
        ]),
        m('div.laps', laps),
      ]),
    ])
  },
}
