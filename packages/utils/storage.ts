/**
 * @module
 * Creates a common interface for interacting with different storage mechanisms.
 * Specifically, designed for dealing with key-value mechanisms where the value
 * is a collection entity. So if you want to deal with two different items in
 * LocalStorage, you would create TWO LocalStorage classes; one for each key.
 *
 * Provides type-safety by forcing declaration of serialization mechanisms
 */

/**
 * Provided functionality to tell storage how to interact with your data
 */
export interface StorageProps<T> {
  /** Default value, if the item doesn't exist within storage */
  defaultValue: T
  /** Function for deserializing data from the external data source */
  deserialize: (str: string) => T
  /** Key name that external data is stored under */
  name: string
  /** Function for serializing data to external data source */
  serialize: (toSerialize: T) => string
  /** Function for determining whether a value matches our expected data */
  // deno-lint-ignore no-explicit-any
  verify: (toCheck: any) => boolean
}

/**
 * Storage Class is not meant to be used by itself. Extend it with different
 * functionality and different storage systems.
 *
 * @example
 * ```ts
 * import LocalStorage from '@inro/simple-tools/storage/local-storage'
 *
 * const store = new LocalStorage<{ count: number } | null>({
 *   name: 'count',
 *   defaultValue: null,
 *   deserialize: (str) => str ? JSON.parse(str) : null,
 *   serialize: (state) => JSON.stringify(state),
 *   verify: (state) => Boolean(state?.count),
 * })
 * await store.set({ count: 5 })
 * await store.get()
 * ````
 */
export default class Storage<T> implements StorageProps<T> {
  /** Initializes storage with props */
  constructor(props: StorageProps<T>) {
    this.name = props.name
    this.defaultValue = props.defaultValue
    this.deserialize = props.deserialize
    this.serialize = props.serialize
    this.verify = props.verify
  }

  /** Key for finding in storage */
  name: string

  /** Default value if there is no value in storage */
  defaultValue: T

  /** Transform from database entity to js object */
  deserialize: (str: string) => T

  /** Transform from js object to database entity */
  serialize: (toStringify: T) => string

  /** Predicate function that returns true if it is the correct entity */
  verify: (toCheck: unknown) => boolean

  /** Check if a value exists in storage */
  has(): Promise<boolean> {
    throw new Error('not implemented')
  }

  /** Retrieve a value from storage */
  get(): Promise<T> {
    throw new Error('not implemented')
  }

  /** Add a value to storage */
  set(_value: T): Promise<boolean> {
    throw new Error('not implemented')
  }

  /** Remove a value from storage */
  remove(): Promise<boolean> {
    throw new Error('not implemented')
  }

  /** Deserialize, returning defaultValue if an error occurs */
  safeParse(toParse: string): T {
    try {
      if (!toParse) return this.defaultValue
      return this.deserialize(toParse)
    } catch {
      return this.defaultValue
    }
  }
}
