import Calculator from 'https://esm.sh/jsr/@inro/simple-tools/calculator'

class CalculatorComponent extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })

    this.calculator = new Calculator()
    this.calculator.addEventListener(() => this.update())

    this.operators = {
      add: (value) => this.calculator.add(value),
      subtract: (value) => this.calculator.subtract(value),
      multiply: (value) => this.calculator.multiply(value),
      divide: (value) => this.calculator.divide(value),
      clear: (value) => this.calculator.clear(value),
    }
  }

  connectedCallback() {
    this.render()
    this.bindEvents()
  }

  operate(type) {
    const valueInput = this.shadowRoot.querySelector('#value')
    const value = parseFloat(valueInput.value)
    if (!isNaN(value) || type === 'clear') {
      this.operators[type](value)
      valueInput.value = ''
    }
  }

  bindEvents() {
    this.shadowRoot.querySelector('#add').addEventListener(
      'click',
      () => this.operate('add'),
    )
    this.shadowRoot.querySelector('#subtract').addEventListener(
      'click',
      () => this.operate('subtract'),
    )
    this.shadowRoot.querySelector('#multiply').addEventListener(
      'click',
      () => this.operate('multiply'),
    )
    this.shadowRoot.querySelector('#divide').addEventListener(
      'click',
      () => this.operate('divide'),
    )
    this.shadowRoot.querySelector('#clear').addEventListener(
      'click',
      () => this.operate('clear'),
    )
  }

  update() {
    const display = this.shadowRoot.querySelector('.display')
    const state = this.calculator.state
    display.textContent = state.display + ' ' + +state.value.toFixed(2)
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .calculator {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .controls {
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
          <button id="clear">Clear</button>
        </div>
      </div>
    `
  }
}

customElements.define('calculator-component', CalculatorComponent)