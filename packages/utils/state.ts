/**
 * @module
 * Generic state and listener class used by all the simple-tools. This helps us:
 * 1. Get event listening for free in all of our tools for UI hookin
 * 2. Help define a structure for public state
 */

export interface Options {
  isReactive: boolean
}

export const DefaultOptions: Options = {
  isReactive: false,
}

/**
 * State Class
 * @example Basic Usage (See more in state.test.ts)
 * ```ts
 * import State from '@inro/simple-tools/state'
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
 *
 * @example Reactive
 * ```ts
 * import State from '@inro/simple-tools/state'
 *
 * class Counter extends State<{ count: number }> {
 *   constructor(count: number = 0) {
 *     super({ count }, { isReactive: true })
 *   }
 *   increment() {
 *     this.state.count++ // Changes to state automatically trigger notify
 *   }
 * }
 *
 * const counter = new Counter(0)
 * counter.addEventListener((state) => { console.log(state.count) })
 * counter.increment() // triggers notification
 *
 * // Use batch if you only want to notify once for multiple changes
 * counter.batch(() => {
 *   counter.increment()
 *   counter.increment()
 * })
 * ```
 */
export default class State<InternalState extends object> {
  #isBatchingUpdates = false
  #isPendingNotification = false
  #options: Options = DefaultOptions
  #proxiedObjects = new WeakSet<object>()
  #state: InternalState
  #watchers: Array<(state: InternalState) => void> = []
  error: Error | null = null
  loading = false

  /**
   * Define public state on initialization
   * @param state The initial state for the app
   */
  constructor(state: InternalState, options?: Partial<Options>) {
    this.#options = { ...this.#options, ...options }
    this.#state = this.#createReactive(state, this.#options)
  }

  /**
   * Runs the provided function in a batch update context
   * @param updateFn Function that will make updates to the state
   */
  batch(updateFn: (state: InternalState) => void): void {
    this.#isBatchingUpdates = true
    try {
      updateFn(this.state)
    } finally {
      this.#isBatchingUpdates = false
      if (this.#isPendingNotification) {
        this.notify()
        this.#isPendingNotification = false
      }
    }
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
    if (this.#isBatchingUpdates) {
      this.#isPendingNotification = true
      return
    }
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

  #createReactive<T extends object>(obj: T, options: Options): T {
    // deno-lint-ignore no-this-alias
    const manager = this

    if (this.#proxiedObjects.has(obj)) return obj

    const proxy = new Proxy(obj, {
      // deno-lint-ignore no-explicit-any
      get(target: any, prop: string | symbol) {
        const value = target[prop]
        if (isPlainObject(value)) {
          target[prop] = manager.#createReactive(value, options)
        }
        return target[prop]
      },
      // deno-lint-ignore no-explicit-any
      set(target, prop: string | symbol, value: any) {
        target[prop] = value
        if (options.isReactive) {
          if (manager.#isBatchingUpdates) {
            manager.#isPendingNotification = true
          } else {
            manager.notify()
          }
        }
        return true
      },
      deleteProperty(target, prop: string | symbol) {
        delete target[prop]
        if (options.isReactive) {
          if (manager.#isBatchingUpdates) {
            manager.#isPendingNotification = true
          } else {
            manager.notify()
          }
        }
        return true
      },
    })

    this.#proxiedObjects.add(proxy)
    return proxy as T
  }
}

function isPlainObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
