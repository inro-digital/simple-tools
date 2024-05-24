import State from '../utils/state.ts'

export enum Operator {
  Add = 'add',
  Divide = 'divide',
  Equals = 'equals',
  Initial = 'initial',
  Multiply = 'multiply',
  Subtract = 'subtract',
}

export const OPERATOR_SYMBOLS: { [name: string]: string } = Object.freeze({
  [Operator.Add]: '+',
  [Operator.Subtract]: '-',
  [Operator.Multiply]: '×',
  [Operator.Divide]: '÷',
  [Operator.Equals]: '=',
})

export interface Diff {
  operator: Operator
  value: number
}

export interface CalculatorState {
  display: string
  history: Diff[]
  value: number
}

export default class Calculator extends State<CalculatorState> {
  constructor(initialValue?: number) {
    super({
      display: '0',
      history: [{
        operator: Operator.Initial,
        value: initialValue || 0,
      }],
      value: 0,
    })
  }

  add(value: number) {
    this.state.history.push({ operator: Operator.Add, value })
    this.state.value += value
    this.state.display = getDisplay(this.state.history)
    this.notify()
  }

  clear(initialValue?: number) {
    this.state.history = [{
      operator: Operator.Initial,
      value: initialValue || 0,
    }]
    this.state.value = initialValue || 0
    this.state.display = getDisplay(this.state.history)
    this.notify()
  }

  divide(value: number) {
    this.state.history.push({ operator: Operator.Divide, value })
    this.state.value = this.state.value / value
    this.state.display = getDisplay(this.state.history)
    this.notify()
  }

  multiply(value: number) {
    this.state.history.push({ operator: Operator.Multiply, value })
    this.state.value = this.state.value * value
    this.state.display = getDisplay(this.state.history)
    this.notify()
  }

  subtract(value: number) {
    this.state.history.push({ operator: Operator.Subtract, value })
    this.state.value = this.state.value - value
    this.state.display = getDisplay(this.state.history)
    this.notify()
  }
}

function getDisplay(history: Diff[]) {
  if (history.length === 1) return String(history[0].value)

  let display = ''

  history.forEach((diff) => {
    if (diff.operator === Operator.Initial) display += String(diff.value)
    else display += ` ${OPERATOR_SYMBOLS[diff.operator]} ${diff.value}`
  })

  return display + ' ='
}
