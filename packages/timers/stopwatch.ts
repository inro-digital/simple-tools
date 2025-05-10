/**
 * @module
 * A timer that counts up from a given number. All public methods trigger
 * event listeners. Additionally, if the timer is running, event listeners
 * will trigger every `resolutionMS` interval.
 */

import State from '../utils/state.ts'
import { formatDisplayTime as defaultTimeFormatter } from './utils.ts'

/** Lap data that is saved as a history. It is deleted on `reset` */
export interface Lap {
  /** ms elapsed since the last lap was logged */
  split: number
  /** The split time formatted as a pretty string */
  splitDisplay: string
  /** ms elapsed since the beginning of the stopwatch (elapsed - prevSplit) */
  total: number
  /** The total time formatted as a pretty string */
  totalDisplay: string
}

/** State returned via `stopwatch.state` or `stopwatch.addEventListener` */
export interface StopwatchState {
  /** The time formatted as a pretty string */
  display: string
  /** ms elapsed since the timer started; does not include pause time */
  elapsed: number
  /** Is true when both `start` and `pause` have been called */
  isPaused: boolean
  /** Is true when `start` has been called, and `stop` has not been called. */
  isStarted: boolean
  laps: Array<Lap>
}

export interface StopwatchOptions {
  /* Number that we count up from */
  initialMS: number
  /* Frequency that listeners are called while the timer is counting */
  resolutionMS: number
  /* For custom formatting for `state.display` */
  formatDisplayTime: (elapsed: number) => string
}

/**
 * Stopwatch Class
 * @example Basic Usage
 * ```ts
 * import Stopwatch, { StopwatchState } from '@inro/simple-tools/stopwatch'
 * const timer = new Stopwatch()
 * timer.addEventListener((state: CountdownState) => {
 *   console.log(state.display) // "0:00.0"
 *   console.log(state.elapsed) // 0
 *   console.log(state.laps) // []
 * })
 *
 * document.getElementById('#start').onclick = () => timer.start()
 * document.getElementById('#pause').onclick = () => timer.pause()
 * document.getElementById('#stop').onclick = () => timer.stop()
 * document.getElementById('#reset').onclick = () => timer.reset()
 * document.getElementById('#lap').onclick = () => timer.lap()
 * ```
 */
export default class Stopwatch extends State<StopwatchState> {
  #elapsedBeforePauseMS: number
  #formatDisplayTime: (elapsed: number) => string
  #initialMS: number
  #interval: number | undefined
  #resolutionMS: number | undefined
  #startMS: number | undefined

  /* Timer resolution defaults to 10ms */
  constructor(options: Partial<StopwatchOptions> = {}) {
    const {
      initialMS = 0,
      resolutionMS = 10,
      formatDisplayTime = defaultTimeFormatter,
    } = options

    super({
      display: formatDisplayTime(initialMS),
      elapsed: initialMS,
      isPaused: false,
      isStarted: false,
      laps: [],
    })
    this.#elapsedBeforePauseMS = 0
    this.#initialMS = initialMS
    this.#resolutionMS = resolutionMS
    this.#formatDisplayTime = formatDisplayTime
  }

  /**
   * Starts the timer. If resolutionMS is provided, this also starts calling
   * listeners on interval.
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
        this.state.display = this.#formatDisplayTime(this.state.elapsed)

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
    if (!this.state.isStarted) return
    this.#stop()
    this.notify()
  }

  /**
   * Resets to initial state. If provided options, it will override the
   * initial settings
   */
  reset(options: Partial<StopwatchOptions> = {}) {
    const { initialMS, resolutionMS, formatDisplayTime } = options

    this.#stop()
    this.#formatDisplayTime = formatDisplayTime ?? this.#formatDisplayTime
    this.#initialMS = initialMS ?? this.#initialMS
    this.#resolutionMS = resolutionMS ?? this.#resolutionMS

    this.state.elapsed = this.#initialMS
    this.state.isPaused = false
    this.state.isStarted = false
    this.state.laps = []
    this.state.display = this.#formatDisplayTime(this.state.elapsed)

    this.notify()
  }

  /** Logs a lap. This does not affect timer counting at all. */
  lap() {
    const total = this.state.elapsed
    const prevTime = this.state.laps[0]?.total ?? 0
    const split = total - prevTime
    this.state.laps.push({
      split,
      splitDisplay: this.#formatDisplayTime(split),
      total,
      totalDisplay: this.#formatDisplayTime(total),
    })
    this.notify()
  }
}
