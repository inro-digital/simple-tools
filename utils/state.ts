/**
 * Generic state and listener class used by all the simple-tools. This helps us:
 * 1. Get event listening for free in all of our tools for UI hookin
 * 2. Help define a structure for public state
 *
 * @example Basic Usage (See more in state.test.ts)
 * ```ts
 * import State from '@inro/simple-tools/countdown'
 *
 * class Counter extends State<{ count: number }> {
 *   constructor(count: number = 0) {
 *     super({ count }) // Super params are the initial value of `this.state`
 *   }
 *   increment() {
 *     this.state.count++
 *     this.notify() // Triggers all listeners
 *   }
 * }
 *
 * const counter = new Counter(0)
 * counter.addEventListener((state) => { console.log(state.count) })
 * counter.increment()
 * ```
 */
export default class State<InternalState> {
  #state: InternalState
  #watchers: Array<(state: InternalState) => void> = []

  /**
   * Define public state on initialization
   * @param state The initial state for the app
   */
  constructor(state: InternalState) {
    this.#state = state
  }

  /**
   * Returns a reference to the state.
   * This is used for easy editing state as well.
   */
  get state(): InternalState {
    return this.#state
  }

  /**
   * Notify only returns a COPY of the state.
   * This is because notify is often used to track history over time,
   * so a reference to a mutating state is not useful.
   */
  notify() {
    this.#watchers.forEach((cb) => cb({ ...this.#state }))
  }

  /** Adds an event listener. Triggered by `this.notify` */
  addEventListener(func: (state: InternalState) => void) {
    this.#watchers.push(func)
  }

  /** Removes an event listener. */
  removeEventListener(func: (state: InternalState) => void) {
    this.#watchers = this.#watchers.filter((watcher) => watcher === func)
  }
}
