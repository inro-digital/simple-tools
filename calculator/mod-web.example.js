import Calculator from 'https://esm.sh/jsr/@inro/simple-tools/calculator'

class CalculatorComponent extends HTMLElement {
  constructor() {
    super()

    this.calculator = new Calculator()
    this.calculator.addEventListener(() => this.update())

    this.operators = {
      add: (value) => this.calculator.add(value),
      subtract: (value) => this.calculator.subtract(value),
      multiply: (value) => this.calculator.multiply(value),
      divide: (value) => this.calculator.divide(value),
      reset: (value) => this.calculator.reset(value),
    }
  }

  connectedCallback() {
    this.render()
    this.bindEvents()
  }

  operate(type) {
    const valueInput = this.querySelector('#value')
    const value = parseFloat(valueInput.value)
    if (!isNaN(value) || type === 'reset') {
      this.operators[type](value)
      valueInput.value = ''
    }
  }

  bindEvents() {
    this.querySelector('#add').addEventListener(
      'click',
      () => this.operate('add'),
    )
    this.querySelector('#subtract').addEventListener(
      'click',
      () => this.operate('subtract'),
    )
    this.querySelector('#multiply').addEventListener(
      'click',
      () => this.operate('multiply'),
    )
    this.querySelector('#divide').addEventListener(
      'click',
      () => this.operate('divide'),
    )
    this.querySelector('#reset').addEventListener(
      'click',
      () => this.operate('reset'),
    )
  }

  update() {
    const display = this.querySelector('.calculator .display')
    const state = this.calculator.state
    display.textContent = state.display + ' = ' + +state.value.toFixed(2)
  }

  render() {
    this.innerHTML = `
      <style>
        .calculator {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .calculator input {
          max-width: 200px;
          margin: 20px;
        }
        .calculator .controls {
          display: flex;
          gap: 10px;
        }
      </style>
      <div class="calculator">
        <div class="display">${this.calculator.state.display}</div>
        <input id="value" type="number" placeholder="Enter value" />
        <div class="controls">
          <button id="add">Add</button>
          <button id="subtract">Subtract</button>
          <button id="multiply">Multiply</button>
          <button id="divide">Divide</button>
          <button id="reset">Clear</button>
        </div>
      </div>
    `
  }
}

customElements.define('calculator-component', CalculatorComponent)
