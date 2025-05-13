import Calculator from './modules/calculator.js'
import Timer from './modules/timer.js'
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
        m('li', m('a', { href: '/#!/timer' }, 'timer')),
        m('li', m('a', { href: '/#!/todolist' }, 'todolist')),
      ]),
    ]),
}

m.route(document.body, '/main', {
  '/main': Main,
  '/calculator': Calculator,
  '/timer': Timer,
  '/todolist': Todolist,
})
