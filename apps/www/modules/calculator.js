import Calculator, { Operator } from '@inro/simple-tools/calculator'
import Header from '../components/header.js'

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
  view: () => [
    m(Header, { name: 'Calculator' }),
    m('main.calculator', [
      m('h1.display', calc.state.display + ' = ' + calc.state.value),
      m('input[type=number]', {
        value,
        onchange: (e) => value = parseInt(e.target.value),
      }),
      m('.controls', [
        m('.nums', [
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
            m('button#reset', { onclick: () => calc.reset(value || 0) }, 'C'),
            m('button', { onclick: submit }, '='),
          ]),
        ]),
        m('.methods', [
          m('button', { onclick: () => submit(Operator.Divide) }, '÷'),
          m('button', { onclick: () => submit(Operator.Multiply) }, '×'),
          m('button', { onclick: () => submit(Operator.Subtract) }, '−'),
          m('button', { onclick: () => submit(Operator.Add) }, '+'),
        ]),
      ]),
    ]),
  ],
}
