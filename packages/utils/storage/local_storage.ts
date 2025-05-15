import Storage, { type StorageProps } from '../storage.ts'

/**
 * A mechanism for using localStorage as a Storage instance.
 */
export default class LocalStorage<T> extends Storage<T> {
  /** Initializes storage */
  constructor(props: StorageProps<T>) {
    super(props)
  }

  /** Check if a value exists in storage */
  override has(): Promise<boolean> {
    return Promise.resolve(globalThis.localStorage.getItem(this.name) !== null)
  }

  /** Retrieve a value from storage */
  override get(): Promise<T> {
    const value = globalThis.localStorage.getItem(this.name)
    if (value == null) return Promise.resolve(this.defaultValue)
    return Promise.resolve(this.safeParse(value))
  }

  /** Add a value to storage */
  override set(value: T): Promise<boolean> {
    if (!this.verify(value)) throw new Error('invalid value')
    try {
      globalThis.localStorage.setItem(
        this.name,
        value != null ? this.serialize(value) : String(value),
      )
      return Promise.resolve(true)
    } catch (err: unknown) {
      if (err instanceof Error && err.name == 'QuotaExceededError') {
        throw new Error('Local-storage is full.', { cause: err })
      }
      throw err
    }
  }

  /** Remove a value from storage */
  override remove(): Promise<boolean> {
    globalThis.localStorage.removeItem(this.name)
    return Promise.resolve(true)
  }
}
