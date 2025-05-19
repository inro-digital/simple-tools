/**
 * @module stores data using Tauri's storage plugin
 * Note: This requires the Tauri store plugin to be set up in your project.
 *
 * @reference https://tauri.app/plugin/store/
 */
import Storage, { type StorageProps } from '../storage.ts'
import { load, type Store } from '@tauri-apps/plugin-store'

const isTauri = () =>
  typeof (globalThis as Record<string, unknown>).__TAURI_INTERNALS__ !==
    'undefined'

/**
 * Extended storage props for Tauri with additional configuration options
 */
export interface TauriStorageProps<T> extends StorageProps<T> {
  /** The store file name to use, defaults to 'app-storage.dat' */
  storeName?: string
  /** Additional options for the Tauri store plugin */
  options?: {
    /** Custom path to store the file (optional) */
    path?: string
  }
}

/**
 * A Storage implementation that uses Tauri's store plugin.
 * @example
 * ```ts
 * import TauriStorage from '@inro/simple-tools/storage/tauri'
 *
 * type Settings = { theme: string, fontSize: number }
 * const storage = new TauriStorage<Settings>({
 *   name: 'app-settings',
 *   defaultValue: { theme: 'light', fontSize: 16 },
 *   deserialize: (str) => JSON.parse(str),
 *   serialize: (settings) => JSON.stringify(settings),
 *   verify: (settings) =>
 *     typeof settings === 'object' &&
 *     settings !== null &&
 *     'theme' in settings,
 *   storeName: 'app-data.dat',
 * })
 * await storage.set({ theme: 'dark', fontSize: 18 })
 * const settings = await storage.get()
 * ```
 */
export default class TauriStorage<T> extends Storage<T> {
  #store: Store | null = null
  #name: string
  #options: {
    path?: string
  }

  /** Initializes Tauri storage */
  constructor(props: TauriStorageProps<T>) {
    super(props)
    this.#name = props.storeName || 'app-storage.dat'
    this.#options = props.options || {}
  }

  /** Gets the Tauri store instance, initializing it if necessary */
  async #getStore(): Promise<Store> {
    if (!this.#store) {
      if (!isTauri()) throw new Error('Can only be used in a Tauri environment')
      try {
        this.#store = await load(this.#name, {
          ...this.#options,
          autoSave: true,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        throw new Error(`Failed to initialize: ${msg}`)
      }
    }
    return this.#store
  }

  /** Check if a value exists in storage */
  override async has(): Promise<boolean> {
    try {
      const store = await this.#getStore()
      const keys = await store.keys()
      return keys.includes(this.name)
    } catch (err) {
      console.error('Error checking key existence in Tauri store:', err)
      return false
    }
  }

  /** Retrieve a value from storage */
  override async get(): Promise<T> {
    try {
      const store = await this.#getStore()
      const value = await store.get(this.name)

      if (value === null || value === undefined) {
        return this.defaultValue
      }

      // If the value is already a string, parse it; otherwise, stringify it first
      const strValue = typeof value === 'string' ? value : JSON.stringify(value)
      const parsed = this.safeParse(strValue)

      return parsed
    } catch (err) {
      console.error('Error retrieving from Tauri store:', err)
      return this.defaultValue
    }
  }

  /** Add a value to storage */
  override async set(value: T): Promise<boolean> {
    if (!this.verify(value)) {
      throw new Error('invalid value')
    }

    try {
      const store = await this.#getStore()
      const serialized = value != null ? this.serialize(value) : String(value)
      await store.set(this.name, serialized)

      return true
    } catch (err) {
      console.error('Error setting value in Tauri store:', err)
      throw err
    }
  }

  /** Remove a value from storage */
  override async remove(): Promise<boolean> {
    try {
      const store = await this.#getStore()
      await store.delete(this.name)

      return true
    } catch (err) {
      console.error('Error removing value from Tauri store:', err)
      return false
    }
  }
}
