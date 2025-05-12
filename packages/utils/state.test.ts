import { assertEquals } from '@std/assert/equals'
import { assertSpyCall, assertSpyCalls, spy } from '@std/testing/mock'
import LocalStorage from './storage/local_storage.ts'
import State from './state.ts'

Deno.test('sets and gets state', () => {
  class Counter extends State<{ count: number }> {
    constructor(count: number = 0) {
      super({ count })
    }
    increment() {
      this.state.count++
    }
  }

  const counter = new Counter(0)
  assertEquals(counter.state.count, 0)
  counter.increment()
  assertEquals(counter.state.count, 1)
})

Deno.test('watches value', () => {
  class Counter extends State<{ count: number }> {
    constructor(count: number = 0) {
      super({ count })
    }
    increment() {
      this.state.count++
      this.notify()
    }
  }

  const counter = new Counter(0)
  const listener = spy()
  counter.addEventListener(listener)
  counter.increment()
  assertSpyCalls(listener, 1)
  assertSpyCall(listener, 0, { args: [{ count: 1 }] })

  counter.removeEventListener(listener.original)
  counter.increment()
  assertSpyCalls(listener, 1)
})

Deno.test('watches nested reactive values', () => {
  class Counter extends State<{ counters: { count: number } }> {
    constructor(count: number = 0) {
      super({ counters: { count } }, { isReactive: true })
    }
    increment() {
      this.state.counters.count++
    }
  }

  const counter = new Counter(0)
  const listener = spy()
  counter.addEventListener(listener)
  counter.increment()
  assertSpyCalls(listener, 1)
  assertSpyCall(listener, 0, { args: [{ counters: { count: 1 } }] })
})

Deno.test('watches reactive deletes', () => {
  class Counter extends State<{ count: number | undefined }> {
    constructor(count: number = 0) {
      super({ count }, { isReactive: true })
    }
    increment() {
      this.state.count = (this.state.count || 0) + 1
    }
  }

  const counter = new Counter(1)
  const listener = spy()
  counter.addEventListener(listener)
  delete counter.state.count
  counter.increment()
  assertSpyCalls(listener, 2)
  assertSpyCall(listener, 0, { args: [{}] })
  assertSpyCall(listener, 1, { args: [{ count: 1 }] })
})

Deno.test('can batch changes to reduce notifies', () => {
  class Counter extends State<{ count: number | undefined }> {
    constructor(count: number = 0) {
      super({ count }, { isReactive: true })
    }
    increment() {
      this.state.count = (this.state.count || 0) + 1
    }
  }

  const counter = new Counter(0)
  const listener = spy()
  counter.addEventListener(listener)
  counter.batch(() => {
    counter.increment()
    delete counter.state.count
    counter.increment()
    counter.notify() // Should do nothing
    counter.increment()
  })
  assertSpyCalls(listener, 1)
  assertSpyCall(listener, 0, { args: [{ count: 2 }] })
})

Deno.test('can use save/load to interact with storage', async () => {
  type CountState = { count: number }

  const store = new LocalStorage<CountState | null>({
    defaultValue: null,
    verify: (_val) => true,
    parse: (str: string) => str ? JSON.parse(str) : null,
    stringify: (count: CountState | null) => JSON.stringify(count),
  })

  class Counter extends State<CountState> {
    constructor(count: number = 0) {
      super({ count })
    }
  }

  const counter = new Counter(0)
  const rand = Math.floor(Math.random() * 100)
  counter.state.count = rand

  const saved = counter.save((state) => store.set('counter', state))
  assertEquals(counter.saving, true, 'Should signal saving during processing')
  await saved
  assertEquals(counter.saving, false, 'Should stop saving after processing')
  assertEquals(await store.get('counter'), { count: rand }, 'Recover state')

  counter.state.count = 0

  const load = counter.load(async () => {
    return await store.get('counter') || { count: 0 }
  })
  assertEquals(counter.loading, true, 'Should signal loading during processing')
  await load
  assertEquals(counter.loading, false, 'Should stop loading after processing')
  assertEquals(counter.state, { count: rand })
})
