import { assertEquals, assertThrows } from '@std/assert'
import Storage from './storage.ts'

Deno.test('Storage base class initialization', () => {
  const props = {
    name: 'storage-test',
    defaultValue: { value: 'default' },
    deserialize: (str: string) => JSON.parse(str),
    serialize: (obj: unknown) => JSON.stringify(obj),
    verify: (obj: unknown) => Boolean((obj as { value: string })?.value),
  }

  const storage = new Storage(props)
  assertEquals(storage.name, 'storage-test')
  assertEquals(storage.defaultValue, { value: 'default' })
  assertEquals(storage.serialize({ value: 'test' }), '{"value":"test"}')
  assertEquals(storage.deserialize('{"value":"test"}'), { value: 'test' })
  assertEquals(storage.verify({ value: 'test' }), true)
  assertEquals(storage.verify({ other: 'property' }), false)
})

Deno.test('Storage base methods throw errors when not implemented', () => {
  const storage = new Storage({
    name: 'storage-test',
    defaultValue: null,
    deserialize: (str: string) => JSON.parse(str),
    serialize: (obj: unknown) => JSON.stringify(obj),
    verify: () => true,
  })

  assertThrows(() => storage.has(), Error, 'not implemented')
  assertThrows(() => storage.get(), Error, 'not implemented')
  assertThrows(() => storage.set({ test: 'value' }), Error, 'not implemented')
  assertThrows(() => storage.remove(), Error, 'not implemented')
})

Deno.test('safeParse returns defaultValue for invalid input', () => {
  const storage = new Storage({
    name: 'storage-test',
    defaultValue: { default: true },
    deserialize: (str: string) => JSON.parse(str),
    serialize: (obj: unknown) => JSON.stringify(obj),
    verify: () => true,
  })

  assertEquals(storage.safeParse(''), { default: true })
  assertEquals(storage.safeParse('invalid json'), { default: true })
  assertEquals(storage.safeParse('{"valid":"json"}'), { valid: 'json' })
})
