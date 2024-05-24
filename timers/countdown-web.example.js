import Countdown from 'https://esm.sh/jsr/@inro/simple-tools/countdown'

class CountdownComponent extends HTMLElement {
  constructor() {
    super()
    this._initialMS = 60000

    this.countdown = new Countdown({ initialMS: this._initialMS })

    this.countdown.addEventListener(() => this.update())
  }

  static get observedAttributes() {
    return ['initial-ms']
  }

  attributeChangedCallback(name, _oldValue, newValue) {
    if (name === 'initial-ms') {
      this._initialMS = Number(newValue)
      this.countdown = new Countdown({ initialMS: this._initialMS })
      this.countdown.addEventListener(() => this.update())
      this.update()
    }
  }

  connectedCallback() {
    this.render()
    this.startButton = this.querySelector('#start')
    this.pauseButton = this.querySelector('#pause')
    this.stopButton = this.querySelector('#stop')

    this.startButton.addEventListener('click', () => this.countdown.start())
    this.pauseButton.addEventListener('click', () => this.countdown.pause())
    this.stopButton.addEventListener('click', () => this.countdown.stop())
  }

  update() {
    const display = this.querySelector('.display')
    if (display) display.textContent = this.countdown.state.display
  }

  render() {
    this.innerHTML = `
      <style>
        .countdown {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .countdown .display {
          margin: 20px;
        }
        .controls {
          display: flex;
          gap: 10px;
        }
      </style>
      <div class="countdown">
        <div class="display">${this.countdown.state.display}</div>
        <div class="controls">
          <button id="start">Start</button>
          <button id="pause">Pause</button>
          <button id="stop">Stop</button>
        </div>
      </div>
    `
  }
}

customElements.define('countdown-component', CountdownComponent)
