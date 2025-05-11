import Calculator, {
  Operator,
} from 'https://esm.sh/jsr/@inro/simple-tools/calculator'

const jsrLink = 'https://jsr.io/@inro/simple-tools/doc/calculator/~'
const codeLink =
  'https://git.sr.ht/~inro/simple-tools/tree/main/item/calculator'

let value = 0
let operator

const calc = new Calculator()

calc.addEventListener(() => {
  value = 0
})

function submit(nextOp) {
  if ((calc.state.history.length === 1) && !calc.state.value) calc.reset(value)
  if (operator == Operator.Add) calc.add(value)
  if (operator == Operator.Subtract) calc.subtract(value)
  if (operator == Operator.Multiply) calc.multiply(value)
  if (operator == Operator.Divide) calc.divide(value)
  operator = nextOp
}

function addDigit(toAdd) {
  value = parseInt(String(value) + toAdd)
}

export default {
  view: () =>
    m('main', [
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
          value,
          onchange: (e) => value = parseInt(e.target.value),
        }),
        m('div', {
          class: 'controls',
          style: 'display: flex; flex-direction: row;',
        }, [
          m('div', { class: 'nums' }, [
            m('div', [
              m('button', { onclick: () => addDigit(1) }, 1),
              m('button', { onclick: () => addDigit(2) }, 2),
              m('button', { onclick: () => addDigit(3) }, 3),
            ]),
            m('div', [
              m('button', { onclick: () => addDigit(4) }, 4),
              m('button', { onclick: () => addDigit(5) }, 5),
              m('button', { onclick: () => addDigit(6) }, 6),
            ]),
            m('div', [
              m('button', { onclick: () => addDigit(7) }, 7),
              m('button', { onclick: () => addDigit(8) }, 8),
              m('button', { onclick: () => addDigit(9) }, 9),
            ]),
            m('div', [
              m('button', { onclick: () => value = 0 }, 0),
              m(
                'button',
                { id: 'reset', onclick: () => calc.reset(value || 0) },
                'C',
              ),
            ]),
          ]),
          m('div', {
            class: 'methods',
            style: 'display: flex; flex-direction: column;',
          }, [
            m('button', { onclick: () => submit(Operator.Divide) }, '÷'),
            m('button', { onclick: () => submit(Operator.Multiply) }, '×'),
            m('button', { onclick: () => submit(Operator.Subtract) }, '−'),
            m('button', { onclick: () => submit(Operator.Add) }, '+'),
          ]),
          m('button', { onclick: submit }, '='),
        ]),
      ]),
    ]),
}
