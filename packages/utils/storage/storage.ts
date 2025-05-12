/**
 * Essentially, extends https://github.com/BYOJS/storage for more type-safety
 * around objects by forcing declaration of verifying/parsing/stringifying.
 */

export interface StorageProps<T> {
  defaultValue: T
  parse: (str: string) => T
  stringify: (toStringify: T) => string
  verify: (toCheck: unknown) => boolean
}

export default class Storage<T> implements StorageProps<T> {
  constructor(props: StorageProps<T>) {
    this.defaultValue = props.defaultValue
    this.parse = props.parse
    this.stringify = props.stringify
    this.verify = props.verify
  }

  defaultValue: T
  parse: (str: string) => T
  stringify: (toStringify: T) => string
  verify: (toCheck: unknown) => boolean

  has(_name: string): Promise<boolean> {
    throw new Error('not implemented')
  }

  get(_name: string): Promise<T> {
    throw new Error('not implemented')
  }

  set(_name: string, _value: T): Promise<boolean> {
    throw new Error('not implemented')
  }

  remove(_name: string): Promise<boolean> {
    throw new Error('not implemented')
  }

  keys(): Promise<string[]> {
    throw new Error('not implemented')
  }

  entries(): Promise<Array<[string, T]>> {
    throw new Error('not implemented')
  }

  safeParse(toParse: string | null): T {
    try {
      if (!toParse) return this.defaultValue
      return this.parse(toParse)
    } catch {
      return this.defaultValue
    }
  }
}
