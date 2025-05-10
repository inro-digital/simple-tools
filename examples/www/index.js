import Calculator from './modules/calculator.js'
import Countdown from './modules/countdown.js'
import Stopwatch from './modules/stopwatch.js'
import Todolist from './modules/todolist.js'

const Main = {
  view: () =>
    m('main', [
      m('h1', 'Simple Tools'),
      m(
        'p',
        'Javascript versions of the basic apps you expect to find built into \
      your OS. The intention is that these utilities have simple state management \
      that gives you the tools to power UI apps for common tasks.',
      ),
      m('ul', [
        m('li', m('a', { href: '/#!/calculator' }, 'calculator')),
        m('li', m('a', { href: '/#!/countdown' }, 'countdown')),
        m('li', m('a', { href: '/#!/stopwatch' }, 'stopwatch')),
        m('li', m('a', { href: '/#!/todolist' }, 'todolist')),
      ]),
    ]),
}

m.route(document.body, '/main', {
  '/main': Main,
  '/calculator': Calculator,
  '/countdown': Countdown,
  '/stopwatch': Stopwatch,
  '/todolist': Todolist,
})
