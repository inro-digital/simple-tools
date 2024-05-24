import State from '../utils/state.ts'

export interface StopwatchState {
  display: string
  elapsed: number
  isPaused: boolean
  isStarted: boolean
  laps: Array<{ split: number; total: number }>
}

export interface StopwatchOptions {
  initialMS?: number
  resolutionMS?: number // How often listeners should get called, in ms
}

export default class Stopwatch extends State<StopwatchState> {
  #elapsedBeforePauseMS: number
  #interval: number | undefined
  #resolutionMS: number | undefined
  #startMS: number | undefined

  constructor(options?: StopwatchOptions) {
    super({
      display: formatDisplayTime(options?.initialMS ?? 0),
      elapsed: options?.initialMS ?? 0,
      isPaused: false,
      isStarted: false,
      laps: [],
    })
    this.#elapsedBeforePauseMS = 0
    this.#resolutionMS = options?.resolutionMS ?? 10
  }

  start() {
    this.#startMS = Date.now()
    this.state.isPaused = false
    this.state.isStarted = true

    this.notify()

    if (this.#resolutionMS) {
      this.#interval = setInterval(() => {
        if (!this.#startMS) throw new Error('unexpected no start time')

        const elapsedSincePauseMS = Date.now() - this.#startMS
        this.state.elapsed = this.#elapsedBeforePauseMS + elapsedSincePauseMS
        this.state.display = formatDisplayTime(this.state.elapsed)

        this.notify()
      }, this.#resolutionMS)
    }
  }

  pause() {
    if (!this.state.isStarted) return
    if (!this.#startMS) throw new Error('unexpected no start time')

    clearInterval(this.#interval)

    const elapsedSincePauseMS = Date.now() - this.#startMS
    this.#elapsedBeforePauseMS += elapsedSincePauseMS
    this.#interval = undefined
    this.#startMS = undefined

    this.state.isPaused = true
    this.state.isStarted = true

    this.notify()
  }

  stop() {
    clearInterval(this.#interval)
    this.#elapsedBeforePauseMS = 0
    this.#interval = undefined
    this.#startMS = undefined

    this.state.isPaused = false
    this.state.isStarted = false

    this.notify()
  }

  lap() {
    const total = this.state.elapsed
    const prevTime = this.state.laps[0]?.total ?? 0
    this.state.laps.push({ split: total - prevTime, total })
    this.notify()
  }
}

function formatDisplayTime(ms: number) {
  // Convert ms to a displayable format, e.g., MM:SS.t
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const tenths = Math.floor((ms % 1000) / 100)
  return minutes + ':' + (seconds < 10 ? '0' : '') + seconds + '.' + tenths
}
