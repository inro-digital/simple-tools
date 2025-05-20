/**
 * @module
 * An interval timer that alternates between work and rest periods.
 * All public methods trigger event listeners. Additionally, if the timer is running,
 * event listeners will trigger every `resolutionMS` interval.
 */
import State from '../utils/state.ts'
import { formatDisplayTime as defaultTimeFormatter } from './utils.ts'
import Countdown from './countdown.ts'

/** Represents a single interval in the timer sequence */
export interface Interval {
  /** Duration of this interval in milliseconds */
  duration: number
  /** Type of interval (e.g., "work", "rest") */
  type: string
  /** Custom label for this interval (optional) */
  label?: string
}

/** State returned via `intervalTimer.state` or `intervalTimer.addEventListener` */
export interface IntervalTimerState {
  /** The currently active interval's time formatted as a pretty string */
  display: string
  /** ms elapsed in the current interval */
  elapsed: number
  /** ms remaining in the current interval */
  remaining: number
  /** Is true when both `start` and `pause` have been called */
  isPaused: boolean
  /** Is true when `start` has been called, and `stop` has not been called. */
  isStarted: boolean
  /** The current interval being executed */
  currentInterval: Interval
  /** Index of the current interval in the intervals array */
  currentIntervalIndex: number
  /** Number of completed full cycles through all intervals */
  completedCycles: number
  /** Total number of cycles to complete (-1 for infinite) */
  totalCycles: number
  /** All intervals in the sequence */
  intervals: Array<Interval>
  /** Whether the timer has completed all cycles */
  isComplete: boolean
}

/** Options for initializing a new interval timer */
export interface IntervalTimerOptions {
  /** Array of interval objects defining the sequence */
  intervals: Array<Interval>
  /** Number of times to cycle through all intervals (-1 for infinite) */
  cycles: number
  /** Frequency that listeners are called while the timer is counting */
  resolutionMS: number
  /** For custom formatting for `state.display` */
  formatDisplayTime: (remaining: number) => string
}

/**
 * IntervalTimer Class
 * @example Basic Usage
 * ```ts
 * import IntervalTimer, { IntervalTimerState } from '@inro/simple-tools/interval'
 *
 * const timer = new IntervalTimer({
 *   intervals: [
 *     { duration: 30000, type: 'work' },
 *     { duration: 10000, type: 'rest' },
 *   ],
 *   cycles: 4
 * })
 *
 * timer.addEventListener((state: IntervalTimerState) => {
 *   console.log(`${state.currentInterval.label}: ${state.display}`)
 *   console.log(`Cycle ${state.completedCycles + 1} of ${state.totalCycles}`)
 * })
 *
 * const start = () => timer.start()
 * const pause = () => timer.pause()
 * const stop = () => timer.stop()
 * const reset = () => timer.reset()
 * const skip = () => timer.skipToNextInterval()
 * ```
 */
export default class IntervalTimer extends State<IntervalTimerState> {
  #currentCountdown!: Countdown
  #formatDisplayTime: (remaining: number) => string
  #resolutionMS: number
  /** Event listener function for countdown state changes */
  #countdownListener: (
    countdownState: import('./countdown.ts').CountdownState,
  ) => void
  #isDisposed = false

  /** Timer resolution defaults to 10ms */
  constructor(options: Partial<IntervalTimerOptions> = {}) {
    const {
      intervals = [],
      cycles = 1,
      resolutionMS = 10,
      formatDisplayTime = defaultTimeFormatter,
    } = options

    if (intervals.length === 0) {
      throw new Error('IntervalTimer requires at least one interval')
    }

    const firstInterval = intervals[0]

    super({
      display: formatDisplayTime(firstInterval.duration),
      elapsed: 0,
      remaining: firstInterval.duration,
      isPaused: false,
      isStarted: false,
      currentInterval: firstInterval,
      currentIntervalIndex: 0,
      completedCycles: 0,
      totalCycles: cycles,
      intervals: [...intervals],
      isComplete: false,
    })

    this.#formatDisplayTime = formatDisplayTime
    this.#resolutionMS = Math.max(resolutionMS, 1)

    // Create the countdown listener
    this.#countdownListener = (countdown) => {
      if (this.#isDisposed) return

      this.state.display = countdown.display
      this.state.elapsed = countdown.elapsed
      this.state.remaining = countdown.remaining
      this.state.isPaused = countdown.isPaused
      this.state.isStarted = countdown.isStarted

      const isComplete = countdown.remaining <= 0 &&
        !countdown.isStarted &&
        this.state.isStarted &&
        !this.state.isPaused
      if (isComplete) this.#advanceToNextInterval()

      this.notify()
    }

    // Initialize the countdown for the first interval
    this.#createAndSetupCountdown(firstInterval.duration)
  }

  /** Starts the timer. If the timer is paused, it will resume. */
  start() {
    if (this.state.isStarted && !this.state.isPaused) return
    if (this.state.isComplete) return
    const completedAllCycles = this.state.totalCycles > 0 &&
      this.state.completedCycles >= this.state.totalCycles
    if (completedAllCycles) {
      this.state.isComplete = true
      this.notify()
      return
    }

    this.#currentCountdown.start()
    this.state.isPaused = false
    this.state.isStarted = true

    this.notify()
  }

  /** Pauses the timer. */
  pause() {
    if (!this.state.isStarted || this.state.isPaused) return

    this.#currentCountdown.pause()
    this.state.isPaused = true

    this.notify()
  }

  /** Stops the timer. Does not reset the timer. */
  stop() {
    if (!this.state.isStarted) return

    this.#currentCountdown.stop()
    this.state.isPaused = false
    this.state.isStarted = false

    this.notify()
  }

  /**
   * Resets to initial state. If provided options, it will override the
   * initial settings.
   */
  reset(options: Partial<IntervalTimerOptions> = {}) {
    const {
      intervals = this.state.intervals,
      cycles = this.state.totalCycles,
      resolutionMS,
      formatDisplayTime,
    } = options

    this.stop()

    this.#formatDisplayTime = formatDisplayTime ?? this.#formatDisplayTime
    this.#resolutionMS = Math.max(resolutionMS ?? this.#resolutionMS, 1)

    const firstInterval = intervals[0]

    this.state.display = this.#formatDisplayTime(firstInterval.duration)
    this.state.elapsed = 0
    this.state.remaining = firstInterval.duration
    this.state.isPaused = false
    this.state.isStarted = false
    this.state.currentInterval = firstInterval
    this.state.currentIntervalIndex = 0
    this.state.completedCycles = 0
    this.state.totalCycles = cycles
    this.state.intervals = [...intervals]
    this.state.isComplete = false

    this.#createAndSetupCountdown(firstInterval.duration)

    this.notify()
  }

  /** Manually skips to the next interval */
  skipToNextInterval() {
    if (!this.state.isStarted || this.state.isComplete) return
    this.#advanceToNextInterval()
    this.notify()
  }

  /**
   * Disposes of the timer, cleaning up any resources and event listeners.
   * Call this method when the timer is no longer needed to prevent memory leaks.
   */
  dispose() {
    if (this.#isDisposed) return
    this.stop()

    if (this.#currentCountdown) {
      this.#currentCountdown.removeEventListener(this.#countdownListener)
    }

    this.#isDisposed = true
  }

  /**
   * Creates a new countdown and sets up the listener
   * @param duration Duration for the countdown in milliseconds
   */
  #createAndSetupCountdown(duration: number) {
    if (this.#currentCountdown) {
      this.#currentCountdown.removeEventListener(this.#countdownListener)
    }

    if (this.#isDisposed) return

    this.#currentCountdown = new Countdown({
      initialMS: duration,
      resolutionMS: this.#resolutionMS,
      formatDisplayTime: this.#formatDisplayTime,
    })

    this.#currentCountdown.addEventListener(this.#countdownListener)
  }

  /** Advances to the next interval, updating cycles. */
  #advanceToNextInterval() {
    this.#currentCountdown.stop()

    let nextIntervalIndex = this.state.currentIntervalIndex + 1
    let nextCycleCount = this.state.completedCycles
    if (nextIntervalIndex >= this.state.intervals.length) {
      nextIntervalIndex = 0
      nextCycleCount += 1

      const completedAllCycles = this.state.totalCycles > 0 &&
        nextCycleCount >= this.state.totalCycles

      if (completedAllCycles) {
        this.state.isComplete = true
        this.state.isStarted = false
        this.state.completedCycles = nextCycleCount
        this.notify()
        return
      }
    }

    this.state.completedCycles = nextCycleCount

    const nextInterval = this.state.intervals[nextIntervalIndex]
    this.state.currentIntervalIndex = nextIntervalIndex
    this.state.currentInterval = nextInterval
    this.state.completedCycles = nextCycleCount

    this.#createAndSetupCountdown(nextInterval.duration)

    if (this.state.isStarted && !this.state.isPaused) {
      this.#currentCountdown.start()
      this.state.isStarted = true
    }
  }
}
