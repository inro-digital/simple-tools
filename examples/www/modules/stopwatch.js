import Stopwatch from 'https://esm.sh/jsr/@inro/simple-tools/stopwatch'

const jsrLink = 'https://jsr.io/@inro/simple-tools/doc/stopwatch/~'
const codeLink = 'https://git.sr.ht/~inro/simple-tools/tree/main/item/timers'

const stopwatch = new Stopwatch()

// @todo: demonstrate watching vars + drawing with requestAnimationFrame
stopwatch.addEventListener(() => m.redraw())

export default {
  view: function () {
    const laps = stopwatch.state.laps.map(
      (lap) =>
        m('div', `Lap: ${lap.totalDisplay} (Split: ${lap.splitDisplay})`),
    )

    return m('main', [
      m('header', [
        m('h1', [m('a', { onclick: () => history.back() }, '<'), 'Stopwatch']),
        m('ul', [
          m('li', m('a', { href: jsrLink }, 'jsr')),
          m('li', m('a', { href: codeLink }, 'code')),
        ]),
      ]),
      m('article', [
        m('div', { class: 'display' }, stopwatch.state.display),
        m('div', { class: 'controls' }, [
          m(
            'button',
            { id: 'start', onclick: () => stopwatch.start() },
            'start',
          ),
          m(
            'button',
            { id: 'pause', onclick: () => stopwatch.pause() },
            'pause',
          ),
          m('button', { id: 'lap', onclick: () => stopwatch.lap() }, 'lap'),
          m('button', {
            id: 'stop',
            onclick: () => {
              stopwatch.stop()
              stopwatch.reset()
            },
          }, 'stop'),
        ]),
        m('div', { class: 'laps' }, laps),
      ]),
    ])
  },
}
