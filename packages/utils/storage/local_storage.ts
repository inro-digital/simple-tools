import Storage, { type StorageProps } from './storage.ts'

export default class LocalStorage<T> extends Storage<T> {
  constructor(props: StorageProps<T>) {
    super(props)
  }

  override has(name: string): Promise<boolean> {
    return Promise.resolve(globalThis.localStorage.getItem(name) !== null)
  }

  override get(name: string): Promise<T> {
    const value = globalThis.localStorage.getItem(name)
    return Promise.resolve(this.safeParse(value))
  }

  override set(name: string, value: T): Promise<boolean> {
    if (!this.verify(value)) throw new Error('invalid value')
    try {
      globalThis.localStorage.setItem(
        name,
        value != null ? this.stringify(value) : String(value),
      )
      return Promise.resolve(true)
    } catch (err: unknown) {
      if (err instanceof Error && err.name == 'QuotaExceededError') {
        throw new Error('Local-storage is full.', { cause: err })
      }
      throw err
    }
  }

  override remove(name: string): Promise<boolean> {
    globalThis.localStorage.removeItem(name)
    return Promise.resolve(true)
  }

  override keys(): Promise<string[]> {
    const storeKeys: string[] = []
    for (let i = 0; i < globalThis.localStorage.length; i++) {
      const key = globalThis.localStorage.key(i)
      if (key) storeKeys.push(key)
    }
    return Promise.resolve(storeKeys)
  }

  override entries(): Promise<Array<[string, T]>> {
    const storeEntries: Array<[string, T]> = []
    for (let i = 0; i < globalThis.localStorage.length; i++) {
      const name = globalThis.localStorage.key(i)
      if (typeof name === 'string') {
        const valueStr = globalThis.localStorage.getItem(name)
        if (valueStr != null) storeEntries.push([name, this.parse(valueStr)])
      }
    }
    return Promise.resolve(storeEntries)
  }
}
