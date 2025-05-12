/**
 * @module
 * A simple calculator that stores history. All public methods trigger the
 * calculator event listener
 */
import State from '../utils/state.ts'

/** The names of the operations that Calculator supports */
export enum Operator {
  Add = 'add',
  Divide = 'divide',
  Equals = 'equals',
  Initial = 'initial',
  Multiply = 'multiply',
  Subtract = 'subtract',
}
const { Add, Divide, Equals, Initial, Multiply, Subtract } = Operator

/** Operator strings used for rendering state.history as a string */
const OperatorSymbols: { [name: string]: string } = Object.freeze({
  [Add]: '+',
  [Subtract]: '-',
  [Multiply]: '×',
  [Divide]: '÷',
  [Equals]: '=',
})

/** Describes a change in calculator value */
export interface Diff {
  operator: Operator
  value: number
}

/** State returned via `calculator.state` or `calculator.addEventListener` */
export interface CalculatorState {
  /** String rendering of the history used to determine current value */
  display: string
  /** An array of history diffs that describe how we deduced `state.value` */
  history: Diff[]
  /** The current value of the calculator. */
  value: number
}

/**
 * Calculator Class
 * @example Basic Usage
 * ```ts
 * import Calculator from '@inro/simple-tools/calculator'
 * const calc = new Calculator()
 * calc.add(5)
 * calc.add(6)
 * console.log(calc.state.value) // 11
 * console.log(calc.state.display) // "5 + 6 ="
 * console.log(calc.state.history) // history of diffs
 * ```
 *
 * @example Using event listener
 * ```ts
 * import Calculator, { CalculatorState } from '@inro/simple-tools/calculator'
 * const calc = new Calculator()
 * calc.addEventListener((state: CalculatorState) => {
 *   // function that returns the current state
 * })
 * calc.subtract(5) // triggers the event listener
 * ```
 */
export default class Calculator extends State<CalculatorState> {
  #initialValue: number

  constructor(value: number = 0) {
    super({
      display: '0',
      history: [{ operator: Initial, value }],
      value,
    }, { isReactive: true })
    this.#initialValue = value
  }

  /** Adds a value to the current calculator value */
  add(value: number) {
    this.batch(() => {
      this.state.history.push({ operator: Add, value })
      this.state.value += value
      this.state.display = getDisplay(this.state.history)
    })
  }

  /** Subtracts a value from the current calculator value */
  subtract(value: number) {
    this.batch(() => {
      this.state.history.push({ operator: Subtract, value })
      this.state.value -= value
      this.state.display = getDisplay(this.state.history)
    })
  }

  /** Divides a value from the current calculator value */
  divide(value: number) {
    this.batch(() => {
      this.state.history.push({ operator: Divide, value })
      this.state.value /= value
      this.state.display = getDisplay(this.state.history)
    })
  }

  /** Multiplies a current to the current calculator value */
  multiply(value: number) {
    this.batch(() => {
      this.state.history.push({ operator: Multiply, value })
      this.state.value *= value
      this.state.display = getDisplay(this.state.history)
    })
  }

  /**
   * Resets the value and the history
   * @param initialValue can be used to set the starting calculator value. It
   */
  reset(value: number = this.#initialValue) {
    this.batch(() => {
      this.state.value = value
      this.state.history = [{ operator: Initial, value }]
      this.state.display = getDisplay(this.state.history)
    })
  }
}

function getDisplay(history: Diff[]) {
  let display = ''

  history.forEach((diff) => {
    if (diff.operator === Initial) {
      display += String(diff.value)
    } else {
      display += ` ${OperatorSymbols[diff.operator]} ${diff.value}`
    }
  })

  return display
}
