import { assertEquals } from '@std/assert'
import LocalStorage from './local_storage.ts'

function createTestStorage() {
  cleanup()
  return new LocalStorage<{ count: number }>({
    name: 'local-storage-test',
    defaultValue: { count: 0 },
    deserialize: (str) => JSON.parse(str),
    serialize: (data) => JSON.stringify(data),
    verify: (data) =>
      typeof data === 'object' && data !== null && 'count' in data,
  })
}

function cleanup() {
  localStorage.removeItem('local-storage-test')
}

Deno.test('LocalStorage class initialization', () => {
  const storage = createTestStorage()
  assertEquals(storage.name, 'local-storage-test')
  assertEquals(storage.defaultValue, { count: 0 })
  cleanup()
})

Deno.test('safeParse handles parsing correctly', () => {
  const storage = createTestStorage()
  assertEquals(storage.safeParse('{"count":5}'), { count: 5 }, 'parses JSON')
  assertEquals(storage.safeParse(''), { count: 0 }, 'Handles empty strings')
  assertEquals(storage.safeParse('blah'), { count: 0 }, 'invalid JSON')
  cleanup()
})

Deno.test('has() returns false when item does not exist', async () => {
  const storage = createTestStorage()
  assertEquals(await storage.has(), false)
  cleanup()
})

Deno.test('get() returns defaultValue when item does not exist', async () => {
  const storage = createTestStorage()
  assertEquals(await storage.get(), { count: 0 })
  cleanup()
})

Deno.test('set() rejects invalid values', async () => {
  const storage = createTestStorage()
  try {
    // deno-lint-ignore no-explicit-any
    await storage.set({ invalid: true } as any)
    assertEquals(true, false, 'Should throw error for invalid data')
  } catch (error) {
    if (error instanceof Error) {
      assertEquals(error.message, 'invalid value')
    } else {
      assertEquals(true, false, 'Expected an Error instance')
    }
  }
  cleanup()
})

Deno.test('remove() works as expected', async () => {
  const storage = createTestStorage()
  const result = await storage.remove()
  assertEquals(result, true)
  cleanup()
})
