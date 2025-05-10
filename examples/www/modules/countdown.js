import Countdown from 'https://esm.sh/jsr/@inro/simple-tools/countdown'

const jsrLink = 'https://jsr.io/@inro/simple-tools/doc/countdown/~'
const codeLink = 'https://git.sr.ht/~inro/simple-tools/tree/main/item/timers'

const countdown = new Countdown({ initialMS: 60000 })

// @todo: demonstrate watching vars + drawing with requestAnimationFrame
countdown.addEventListener(() => m.redraw())

export default {
  view: function () {
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
        m('div', { class: 'display' }, countdown.state.display),
        m('div', { class: 'controls' }, [
          m(
            'button',
            { id: 'start', onclick: () => countdown.start() },
            'start',
          ),
          m(
            'button',
            { id: 'pause', onclick: () => countdown.pause() },
            'pause',
          ),
          m('button', {
            id: 'stop',
            onclick: () => {
              countdown.stop()
              countdown.reset()
            },
          }, 'stop'),
        ]),
      ]),
    ])
  },
}
