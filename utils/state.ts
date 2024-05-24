export default class State<InternalState> {
  #state: InternalState
  #watchers: Array<(state: InternalState) => void> = []

  constructor(prevState: InternalState) {
    this.#state = prevState
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

  addEventListener(func: (state: InternalState) => void) {
    this.#watchers.push(func)
  }

  removeEventListener(func: (state: InternalState) => void) {
    this.#watchers = this.#watchers.filter((watcher) => watcher === func)
  }
}
