export default class State<InternalState> {
  #state: InternalState
  #watchers: Array<(state: InternalState) => void> = []

  constructor(prevState: InternalState) {
    this.#state = prevState
  }

  get state(): InternalState {
    return this.#state
  }

  notify() {
    this.#watchers.forEach((cb) => cb(this.state))
  }

  addEventListener(func: (state: InternalState) => void) {
    this.#watchers.push(func)
  }

  removeEventListener(func: (state: InternalState) => void) {
    this.#watchers = this.#watchers.filter((watcher) => watcher === func)
  }
}
