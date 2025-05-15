import type Storage from './storage.ts'

/**
 * @module
 * Generic state and listener class used by all the simple-tools. This helps us:
 * 1. Get event listening for free in all of our tools for UI hookin
 * 2. Help define a structure for public state
 *
 * State is meant to be extended into Classes, and used with an Object state
 */

/** Options to modify how State works */
export interface Options<T> {
  /** Optional storage mechanism for saving state outside of memory */
  storage?: Storage<T>
  /** `.notify` should be triggered on any state change */
  isReactive: boolean
}

/**
 * Default options for State. Add these during state construction:
 * `super(defaultState, options)`
 */
export const DefaultOptions: Options<unknown> = {
  /** Handle notifies manually by default */
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
  #storage?: Storage<InternalState>
  #isBatchingUpdates = false
  #isPendingNotification = false
  #options = DefaultOptions as Options<InternalState>
  #proxiedObjects = new WeakSet<object>()
  #state: InternalState
  #watchers: Array<(state: InternalState) => void> = []

  /** Error returned from load/save */
  error: Error | null = null
  /** State has initial value successfully loaded */
  initialized = false
  /** State is currently loading data */
  loading = false
  /** State is currently saving data */
  saving = false

  /**
   * Define public state on initialization
   * @param state The initial state for the app
   */
  constructor(state: InternalState, options?: Partial<Options<InternalState>>) {
    this.#options = { ...this.#options, ...options }
    this.#state = this.#createReactive(state, this.#options)
    if (!options?.storage) {
      this.initialized = true
    } else {
      this.#storage = options.storage
      this.load(async () => {
        const intialState = (await this.#storage?.get()) ?? state
        this.initialized = true
        return intialState
      })
    }
  }

  /**
   * Returns a reference to the state.
   * This is used for easy editing state as well.
   */
  get state(): InternalState {
    return this.#state
  }

  /** Adds an event listener. Triggered by `this.notify` */
  addEventListener(func: (state: InternalState) => void) {
    this.#watchers.push(func)
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

  /** Load state from somewhere */
  async load(loader: () => Promise<InternalState>): Promise<void> {
    this.loading = true
    this.notify()
    try {
      const result = await loader()
      this.#state = { ...this.#state, ...result }
      this.error = null
    } catch (err) {
      this.error = err as Error
    } finally {
      this.loading = false
      this.notify()
    }
  }

  /**
   * Notify only returns a COPY of the state.
   * This is because notify is often used to track history over time,
   * so a reference to a mutating state is not useful.
   */
  notify({ bypassSave = false }: { bypassSave?: boolean } = {}) {
    if (this.#isBatchingUpdates) {
      this.#isPendingNotification = true
      return
    }
    if (this.initialized && this.#storage && !bypassSave) {
      this.save(async () => {
        await this.#storage?.set(this.#state)
        return true
      })
    }
    this.#watchers.forEach((cb) => cb({ ...this.#state }))
  }

  /** Removes an event listener. */
  removeEventListener(func: (state: InternalState) => void) {
    this.#watchers = this.#watchers.filter((watcher) => watcher === func)
  }

  /** Saves state to somewhere */
  async save(saver: (state: InternalState) => Promise<boolean>): Promise<void> {
    this.saving = true
    this.notify({ bypassSave: true })
    try {
      await saver(this.#state)
      this.error = null
    } catch (err) {
      this.error = err as Error
    } finally {
      this.saving = false
      this.notify({ bypassSave: true })
    }
  }

  /** Resolves the next time that state is ready */
  waitUntilReady(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.initialized && !this.loading && !this.saving) resolve(true)
      const listener = () => {
        if (!this.initialized && !this.loading && !this.saving) {
          this.removeEventListener(listener)
          resolve(true)
        }
      }
      this.addEventListener(listener)
    })
  }

  #createReactive<T extends object>(
    obj: T,
    options: Options<InternalState>,
  ): T {
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
