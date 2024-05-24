import State from '../utils/state.ts'
import { formatDisplayTime } from './utils.ts'

export interface CountdownState {
  display: string
  elapsed: number
  isPaused: boolean
  isStarted: boolean
  remaining: number
  total: number
}

export interface CountdownOptions {
  initialMS?: number
  resolutionMS?: number // How often listeners should get called, in ms
}

export default class Countdown extends State<CountdownState> {
  #elapsedBeforePauseMS: number
  #interval: number | undefined
  #resolutionMS: number | undefined
  #startMS: number | undefined

  constructor(options?: CountdownOptions) {
    super({
      display: formatDisplayTime(options?.initialMS ?? 0),
      elapsed: 0,
      isPaused: false,
      isStarted: false,
      remaining: options?.initialMS ?? 0,
      total: options?.initialMS ?? 0,
    })
    this.#elapsedBeforePauseMS = 0
    this.#resolutionMS = options?.resolutionMS ?? 10
  }

  start() {
    // Prevent #startMS update and additional setInterval if already running
    if (this.state.isStarted && !this.state.isPaused) return

    this.#startMS = Date.now()
    this.state.isPaused = false
    this.state.isStarted = true

    this.notify()

    if (this.#resolutionMS) {
      this.#interval = setInterval(() => {
        if (!this.#startMS) throw new Error('unexpected no start time')

        const elapsedSincePauseMS = Date.now() - this.#startMS
        this.state.elapsed = this.#elapsedBeforePauseMS + elapsedSincePauseMS
        this.state.remaining = this.state.total - this.state.elapsed

        if (this.state.remaining <= 0) {
          this.state.remaining = 0
          this.#stop()
        }

        this.state.display = formatDisplayTime(this.state.remaining)
        this.notify()
      }, this.#resolutionMS)
    }
  }

  pause() {
    if (!this.state.isStarted || this.state.isPaused) return
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

  #stop() {
    clearInterval(this.#interval)
    this.#elapsedBeforePauseMS = 0
    this.#interval = undefined
    this.#startMS = undefined

    this.state.isPaused = false
    this.state.isStarted = false
    this.state.elapsed = 0
    this.state.remaining = this.state.total
    this.state.display = formatDisplayTime(this.state.remaining)
  }

  stop() {
    if (!this.state.isStarted) return

    this.#stop()
    this.notify()
  }
}
