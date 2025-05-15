import Storage, { type StorageProps } from '../storage.ts'

export default class LocalStorage<T> extends Storage<T> {
  constructor(props: StorageProps<T>) {
    super(props)
  }

  override has(): Promise<boolean> {
    return Promise.resolve(globalThis.localStorage.getItem(this.name) !== null)
  }

  override get(): Promise<T> {
    const value = globalThis.localStorage.getItem(this.name)
    if (value == null) return Promise.resolve(this.defaultValue)
    return Promise.resolve(this.safeParse(value))
  }

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

  override remove(): Promise<boolean> {
    globalThis.localStorage.removeItem(this.name)
    return Promise.resolve(true)
  }
}
