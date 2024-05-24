import Stopwatch from 'https://esm.sh/jsr/@inro/simple-tools/stopwatch'

class StopwatchComponent extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.stopwatch = new Stopwatch()
    this.stopwatch.addEventListener(() => this.update())
  }

  connectedCallback() {
    this.render()
    this.startButton = this.shadowRoot.querySelector('#start')
    this.pauseButton = this.shadowRoot.querySelector('#pause')
    this.stopButton = this.shadowRoot.querySelector('#stop')
    this.lapButton = this.shadowRoot.querySelector('#lap')

    this.startButton.addEventListener('click', () => this.stopwatch.start())
    this.pauseButton.addEventListener('click', () => this.stopwatch.pause())
    this.stopButton.addEventListener('click', () => this.stopwatch.stop())
    this.lapButton.addEventListener('click', () => this.stopwatch.lap())
  }

  update() {
    const display = this.shadowRoot.querySelector('.display')
    const laps = this.shadowRoot.querySelector('.laps')
    display.textContent = this.stopwatch.state.display
    laps.innerHTML = this.stopwatch.state.laps.map(
      (lap) =>
        `<div>Lap: ${lap.totalDisplay} (Split: ${lap.splitDisplay})</div>`,
    ).join('')
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        .stopwatch {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .controls {
          display: flex;
          gap: 10px;
        }
      </style>
      <div class="stopwatch">
        <div class="display">${this.stopwatch.state.display}</div>
        <div class="controls">
          <button id="start">Start</button>
          <button id="pause">Pause</button>
          <button id="stop">Stop</button>
          <button id="lap">Lap</button>
        </div>
        <div class="laps"></div>
      </div>
    `
  }
}

customElements.define('stopwatch-component', StopwatchComponent)
