/**
 * @module stores data as a json documents on the fs
 */
import Storage, { type StorageProps } from '../storage.ts'
import { ensureFile } from '@std/fs/ensure-file'

/**
 * A mechanism for using Deno's file system as a Storage instance.
 * The `name` property can be used as a path for the data file.
 */
export default class DenoFsStorage<T> extends Storage<T> {
  /** Initializes storage */
  constructor(props: StorageProps<T>) {
    super(props)
  }

  /** Check if a value exists in storage */
  override async has(): Promise<boolean> {
    try {
      await Deno.stat(this.name)
      return true
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return false
      }
      throw error
    }
  }

  /** Retrieve a value from storage */
  override async get(): Promise<T> {
    try {
      const value = await Deno.readTextFile(this.name)
      return this.safeParse(value)
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return this.defaultValue
      }
      throw error
    }
  }

  /** Add a value to storage */
  override async set(value: T): Promise<boolean> {
    if (!this.verify(value)) throw new Error('invalid value')

    try {
      // Ensure the file and parent directories exist
      await ensureFile(this.name)

      // Write the serialized value to the file
      await Deno.writeTextFile(
        this.name,
        value != null ? this.serialize(value) : String(value),
      )
      return true
    } catch (error) {
      throw new Error(
        `Failed to write to file: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    }
  }

  /** Remove a value from storage */
  override async remove(): Promise<boolean> {
    try {
      await Deno.remove(this.name)
      return true
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        // If the file doesn't exist, we can consider it successfully removed
        return true
      }
      throw error
    }
  }
}
