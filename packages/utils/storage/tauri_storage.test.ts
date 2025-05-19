import { assertEquals } from '@std/assert'
import TauriStorage from './tauri_storage.ts'

Deno.test.ignore('TauriStorage - Basic operations', async () => {
  globalThis.__TAURI_INTERNALS__ = {}

  const storage = new TauriStorage<{ count: number }>({
    name: 'test-key',
    defaultValue: { count: 0 },
    deserialize: (str) => JSON.parse(str),
    serialize: (obj) => JSON.stringify(obj),
    verify: (obj) => typeof obj?.count === 'number',
  })

  await storage.set({ count: 5 })
  assertEquals(await storage.has(), true, 'Key should exist after setting')
  assertEquals(await storage.get(), { count: 5 }, 'Get should return value')

  await storage.remove()
  assertEquals(await storage.has(), false, 'Key should not exist after removal')
  assertEquals(await storage.get(), { count: 0 }, 'Should return default value')
})

// Restore the original import function when tests are done
Deno.test('Cleanup', () => {
  delete globalThis.__TAURI_INTERNALS__
})
