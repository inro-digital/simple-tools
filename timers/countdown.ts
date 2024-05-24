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
  #initialMS: number
  #interval: number | undefined
  #resolutionMS: number | undefined
  #startMS: number | undefined

  constructor({ initialMS = 0, resolutionMS = 10 }: CountdownOptions = {}) {
    super({
      display: formatDisplayTime(initialMS),
      elapsed: 0,
      isPaused: false,
      isStarted: false,
      remaining: initialMS,
      total: initialMS,
    })
    this.#elapsedBeforePauseMS = 0
    this.#initialMS = initialMS
    this.#resolutionMS = resolutionMS
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

        // Countdown is complete
        if (this.state.remaining <= 0) {
          this.state.elapsed = this.state.total
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
  }

  stop() {
    if (!this.state.isStarted) return
    this.#stop()
    this.notify()
  }

  reset(options: CountdownOptions = {}) {
    this.#stop()
    this.#initialMS = options?.initialMS ?? this.#initialMS
    this.#resolutionMS = options?.resolutionMS ?? this.#resolutionMS

    this.state.elapsed = 0
    this.state.isPaused = false
    this.state.isStarted = false
    this.state.remaining = this.#initialMS
    this.state.total = this.#initialMS

    this.state.display = formatDisplayTime(this.state.remaining)

    this.notify()
  }
}
