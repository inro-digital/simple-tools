import State from '../utils/state.ts'
import { formatDisplayTime } from './utils.ts'

/** State returned via `countdown.state` or `countdown.addEventListener` */
export interface CountdownState {
  /* The time formatted as a pretty string */
  display: string
  /* ms elapsed since the timer started; does not include pause time */
  elapsed: number
  /* Is true when both `start` and `pause` have been called */
  isPaused: boolean
  /** Is true when `start` has been called, and `stop` has not been called. */
  isStarted: boolean
  /* ms remaining before the timer resolves. (total - elapsed) */
  remaining: number
  /* total ms of the timer will have been counting down */
  total: number
}

export interface CountdownOptions {
  /* Number that we count down from */
  initialMS?: number
  /* Frequency that listeners are called while the timer is counting */
  resolutionMS?: number
}

/**
 * @module
 * A timer that counts down from a given number. All public methods trigger
 * event listeners. Additionally, if the timer is running, event listeners
 * will trigger every `resolutionMS` interval.
 *
 * @example Basic Usage
 * ```ts
 * import Countdown, { CountdownState } from '@inro/simple-tools/countdown'
 * const timer = new Countdown({ initialMS: 70_000 }) // 70s timer
 * timer.addEventListener((state: CountdownState) => {
 *   console.log(state.display) // "1:10.0"
 *   console.log(state.remaining) // 70000
 * })
 *
 * document.getElementById('#start').onclick = () => timer.start()
 * document.getElementById('#pause').onclick = () => timer.pause()
 * document.getElementById('#stop').onclick = () => timer.stop()
 * document.getElementById('#reset').onclick = () => timer.reset()
 * ```
 */
export default class Countdown extends State<CountdownState> {
  #elapsedBeforePauseMS: number
  #initialMS: number
  #interval: number | undefined
  #resolutionMS: number | undefined
  #startMS: number | undefined

  /* Timer resolution defaults to 10ms */
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

  /**
   * Starts the timer. If resolutionMS is provided, this also starts calling
   * listeners on interval. If the time remaining reaches zero, the timer
   * will automatically run the `.stop()` method (it will, however, not reset
   * to default automatically).
   */
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

  /** Pauses the timer, and clears the interval */
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
    if (!this.state.isStarted) return
    clearInterval(this.#interval)
    this.#elapsedBeforePauseMS = 0
    this.#interval = undefined
    this.#startMS = undefined

    this.state.isPaused = false
    this.state.isStarted = false
  }

  /** Stops the timer, and clears the interval. It does not reset time. */
  stop() {
    this.#stop()
    this.notify()
  }

  /**
   * Resets to initial state. If provided options, it will override the
   * initial settings
   */
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
