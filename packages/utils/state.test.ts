import { assertEquals } from 'jsr:@std/assert/equals'
import { assertSpyCall, assertSpyCalls, spy } from 'jsr:@std/testing/mock'
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
