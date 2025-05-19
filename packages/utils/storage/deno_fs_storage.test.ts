import { assertEquals, assertRejects } from '@std/assert'
import { join } from '@std/path'
import DenoFsStorage from './deno_fs_storage.ts'

const TEST_DIR = join(Deno.makeTempDirSync(), 'deno-fs-storage-test')
const filePath = join(TEST_DIR, 'test-data.json')

function createTestStorage() {
  cleanup()
  Deno.mkdirSync(TEST_DIR, { recursive: true })

  return new DenoFsStorage<{ count: number }>({
    name: filePath,
    defaultValue: { count: 0 },
    deserialize: (str) => JSON.parse(str),
    serialize: (data) => JSON.stringify(data),
    verify: (data) =>
      typeof data === 'object' && data !== null && 'count' in data,
  })
}

function cleanup() {
  try {
    Deno.removeSync(TEST_DIR, { recursive: true })
  } catch {
    // Ignore errors if directory doesn't exist
  }
}

Deno.test('DenoFsStorage class initialization', () => {
  const storage = createTestStorage()
  assertEquals(storage.name, filePath)
  assertEquals(storage.defaultValue, { count: 0 })
  cleanup()
})

Deno.test('has() returns false when file does not exist', async () => {
  const storage = createTestStorage()
  assertEquals(await storage.has(), false)
  cleanup()
})

Deno.test('has() returns true when file exists', async () => {
  const storage = createTestStorage()
  await storage.set({ count: 1 })
  assertEquals(await storage.has(), true)
  cleanup()
})

Deno.test('get() returns defaultValue when file does not exist', async () => {
  const storage = createTestStorage()
  assertEquals(await storage.get(), { count: 0 })
  cleanup()
})

Deno.test('set() and get() works with valid data', async () => {
  const storage = createTestStorage()
  await storage.set({ count: 5 })
  assertEquals(await storage.get(), { count: 5 })
  cleanup()
})

Deno.test('set() creates parent directories if they do not exist', async () => {
  const nestedPath = join(TEST_DIR, 'nested', 'path', 'test-data.json')
  const storage = new DenoFsStorage<{ count: number }>({
    name: nestedPath,
    defaultValue: { count: 0 },
    deserialize: (str) => JSON.parse(str),
    serialize: (data) => JSON.stringify(data),
    verify: (data) =>
      typeof data === 'object' && data !== null && 'count' in data,
  })

  await storage.set({ count: 10 })
  assertEquals(await storage.get(), { count: 10 })
  cleanup()
})

Deno.test('set() rejects invalid values', async () => {
  const storage = createTestStorage()
  await assertRejects(
    async () => {
      // deno-lint-ignore no-explicit-any
      await storage.set({ invalid: true } as any)
    },
    Error,
    'invalid value',
  )
  cleanup()
})

Deno.test('remove() works as expected', async () => {
  const storage = createTestStorage()
  await storage.set({ count: 5 })
  const result = await storage.remove()
  assertEquals(result, true)
  assertEquals(await storage.has(), false)
  cleanup()
})

Deno.test('remove() succeeds when file does not exist', async () => {
  const storage = createTestStorage()
  const result = await storage.remove()
  assertEquals(result, true)
  cleanup()
})

Deno.test('safeParse handles parsing correctly', () => {
  const storage = createTestStorage()
  assertEquals(storage.safeParse('{"count":5}'), { count: 5 }, 'parses JSON')
  assertEquals(storage.safeParse(''), { count: 0 }, 'Handles empty strings')
  assertEquals(storage.safeParse('blah'), { count: 0 }, 'invalid JSON')
  cleanup()
})
