import Calculator from 'https://esm.sh/jsr/@inro/simple-tools/calculator'

const jsrLink = 'https://jsr.io/@inro/simple-tools/doc/calculator/~'
const codeLink =
  'https://git.sr.ht/~inro/simple-tools/tree/main/item/calculator'

const calc = new Calculator()

let value = 0

export default {
  view: function () {
    return m('main', [
      m('header', [
        m('h1', [m('a', { onclick: () => history.back() }, '<'), 'Calculator']),
        m('ul', [
          m('li', m('a', { href: jsrLink }, 'jsr')),
          m('li', m('a', { href: codeLink }, 'code')),
        ]),
      ]),
      m('article', [
        m(
          'div',
          { class: 'display' },
          calc.state.display + ' = ' + calc.state.value,
        ),
        m('input', {
          id: 'value',
          type: 'number',
          placeholder: 'Enter Value',
          onchange: (e) => value = parseInt(e.target.value),
        }),
        m('div', { class: 'controls' }, [
          m('button', { id: 'add', onclick: () => calc.add(value) }, 'add'),
          m(
            'button',
            { id: 'subtract', onclick: () => calc.subtract(value) },
            'subtract',
          ),
          m(
            'button',
            { id: 'multiply', onclick: () => calc.multiply(value) },
            'multiply',
          ),
          m(
            'button',
            { id: 'divide', onclick: () => calc.divide(value) },
            'divide',
          ),
          m(
            'button',
            { id: 'reset', onclick: () => calc.reset(value || 0) },
            'reset',
          ),
        ]),
      ]),
    ])
  },
}
