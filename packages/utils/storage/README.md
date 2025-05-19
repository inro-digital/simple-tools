# Storage Utilities

This directory contains storage implementations that follow the common `Storage<T>` interface defined in the parent directory.

## Available Storage Implementations

### LocalStorage

The `LocalStorage` class provides a simple wrapper around the browser's `localStorage` API.

```ts
import LocalStorage from './local_storage.ts'

const storage = new LocalStorage<User>({
  name: 'current-user',
  defaultValue: null,
  deserialize: (str) => JSON.parse(str),
  serialize: (user) => JSON.stringify(user),
  verify: (user) => user === null || (typeof user === 'object' && 'id' in user),
})

await storage.set({ id: 1, name: 'User' })
const user = await storage.get()
```

### TauriStorage

The `TauriStorage` class provides persistent storage using Tauri's store plugin.

> **Note:** This requires the Tauri store plugin to be set up in your project.
> See: https://tauri.app/plugin/store/

```ts
import TauriStorage from './tauri_storage.ts'

const storage = new TauriStorage<Settings>({
  name: 'app-settings',
  defaultValue: { theme: 'light', fontSize: 16 },
  deserialize: (str) => JSON.parse(str),
  serialize: (settings) => JSON.stringify(settings),
  verify: (settings) =>
    typeof settings === 'object' &&
    settings !== null &&
    'theme' in settings,
  // Optional configuration
  storeName: 'app-data.dat',
})

await storage.set({ theme: 'dark', fontSize: 18 })
const settings = await storage.get()
```

## Deno File System Storage

For Deno environments, there's also a filesystem-based storage implementation:

```ts
import DenoFsStorage from './deno_fs_storage.ts'

const storage = new DenoFsStorage<TodoList>({
  name: 'todos',
  defaultValue: [],
  deserialize: (str) => JSON.parse(str),
  serialize: (todos) => JSON.stringify(todos),
  verify: (todos) => Array.isArray(todos),
})

await storage.set([{ id: 1, text: 'Learn Deno', completed: false }])
const todos = await storage.get()
```

## Creating a Custom Storage Implementation

You can create your own storage implementation by extending the base `Storage<T>` class:

```ts
import Storage, { type StorageProps } from '../storage.ts'

export default class CustomStorage<T> extends Storage<T> {
  constructor(props: StorageProps<T>) {
    super(props)
  }

  override async has(): Promise<boolean> {
    // Implementation
  }

  override async get(): Promise<T> {
    // Implementation
  }

  override async set(value: T): Promise<boolean> {
    // Implementation
  }

  override async remove(): Promise<boolean> {
    // Implementation
  }
}
```
