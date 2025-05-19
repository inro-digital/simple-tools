/**
 * @module stores data in IndexedDB
 */
import Storage, { type StorageProps } from '../storage.ts'

/**
 * A mechanism for using IndexedDB as a Storage instance.
 * ```ts
 * import IndexDBStorage from '@inro/simple-tools/storage/idb'
 *
 * const storage = new IndexDBStorage<{ data: string[] }>({
 *   name: 'myData',
 *   defaultValue: { data: [] },
 *   deserialize: (str) => JSON.parse(str),
 *   serialize: (obj) => JSON.stringify(obj),
 *   verify: (obj) => Array.isArray(obj?.data),
 * }, {
 *   dbName: 'MyAppDB',
 *   dbVersion: 1,
 *   storeName: 'myStore'
 * });
 * ```
 */
export default class IndexDBStorage<T> extends Storage<T> {
  /** Database name */
  #dbName: string
  /** Database version */
  #dbVersion: number
  /** Object store name */
  #storeName: string
  /** Database connection */
  #dbConnection: Promise<IDBDatabase> | null = null

  /**
   * Initializes storage
   * @param props Storage properties
   * @param options IndexDB specific options
   */
  constructor(
    props: StorageProps<T>,
    options: { dbName: string; dbVersion?: number; storeName?: string } = {
      dbName: 'SimpleToolsDB',
      dbVersion: 1,
      storeName: 'keyValueStore',
    },
  ) {
    super(props)
    this.#dbName = options.dbName
    this.#dbVersion = options.dbVersion || 1
    this.#storeName = options.storeName || 'keyValueStore'
  }

  /** Gets or creates a database connection */
  #getDB(): Promise<IDBDatabase> {
    if (this.#dbConnection) return this.#dbConnection

    this.#dbConnection = new Promise<IDBDatabase>((resolve, reject) => {
      const request = globalThis.indexedDB.open(this.#dbName, this.#dbVersion)

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`))
        this.#dbConnection = null
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(this.#storeName)) {
          db.createObjectStore(this.#storeName)
        }
      }

      request.onsuccess = () => resolve(request.result)
    })

    return this.#dbConnection
  }

  /** Perform a transaction on the object store */
  #transaction = async <R>(
    mode: IDBTransactionMode,
    callback: (store: IDBObjectStore) => IDBRequest<R>,
  ): Promise<R> => {
    const db = await this.#getDB()
    return new Promise<R>((resolve, reject) => {
      const transaction = db.transaction(this.#storeName, mode)
      const store = transaction.objectStore(this.#storeName)
      const request = callback(store)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /** Check if a value exists in storage */
  override async has(): Promise<boolean> {
    try {
      const result = await this.#transaction(
        'readonly',
        (store) => store.getKey(this.name),
      )
      return result !== undefined
    } catch (error) {
      console.error('IndexDBStorage.has error:', error)
      return false
    }
  }

  /** Retrieve a value from storage */
  override async get(): Promise<T> {
    try {
      const result = await this.#transaction<string | null | undefined>(
        'readonly',
        (store) => store.get(this.name),
      )

      if (result == null) return this.defaultValue
      return this.safeParse(result as string)
    } catch (error) {
      console.error('IndexDBStorage.get error:', error)
      return this.defaultValue
    }
  }

  /** Add a value to storage */
  override async set(value: T): Promise<boolean> {
    if (!this.verify(value)) throw new Error('invalid value')

    try {
      await this.#transaction(
        'readwrite',
        (store) =>
          store.put(
            value != null ? this.serialize(value) : String(value),
            this.name,
          ),
      )
      return true
    } catch (error) {
      console.error('IndexDBStorage.set error:', error)
      throw error
    }
  }

  /** Remove a value from storage */
  override async remove(): Promise<boolean> {
    try {
      await this.#transaction('readwrite', (store) => store.delete(this.name))
      return true
    } catch (error) {
      console.error('IndexDBStorage.remove error:', error)
      return false
    }
  }

  /** Close the database connection */
  async close(): Promise<void> {
    if (this.#dbConnection) {
      const db = await this.#dbConnection
      db.close()
      this.#dbConnection = null
    }
  }
}
