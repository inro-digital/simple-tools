import Stopwatch from 'https://esm.sh/jsr/@inro/simple-tools/stopwatch'

class StopwatchComponent extends HTMLElement {
  constructor() {
    super()
    this.stopwatch = new Stopwatch()
    this.stopwatch.addEventListener(() => this.update())
  }

  connectedCallback() {
    this.render()
    this.startButton = this.querySelector('#start')
    this.pauseButton = this.querySelector('#pause')
    this.stopButton = this.querySelector('#stop')
    this.lapButton = this.querySelector('#lap')

    this.startButton.addEventListener('click', () => this.stopwatch.start())
    this.pauseButton.addEventListener('click', () => this.stopwatch.pause())
    this.stopButton.addEventListener('click', () => this.stopwatch.stop())
    this.lapButton.addEventListener('click', () => this.stopwatch.lap())
  }

  update() {
    const display = this.querySelector('.display')
    const laps = this.querySelector('.laps')
    display.textContent = this.stopwatch.state.display
    laps.innerHTML = this.stopwatch.state.laps.map(
      (lap) =>
        `<div>Lap: ${lap.totalDisplay} (Split: ${lap.splitDisplay})</div>`,
    ).join('')
  }

  render() {
    this.innerHTML = `
      <style>
        .stopwatch {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .stopwatch .display {
          margin: 20px;
        }
        .stopwatch .controls {
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
