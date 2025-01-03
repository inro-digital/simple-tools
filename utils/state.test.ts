import { assertEquals } from 'jsr:@std/assert/equals'
import { assertSpyCall, assertSpyCalls, spy } from 'jsr:@std/testing/mock'
import State from './state.ts'

Deno.test('sets and gets state', () => {
  interface InternalState {
    count: number
  }

  class Counter extends State<InternalState> {
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
  interface InternalState {
    count: number
  }

  class Counter extends State<InternalState> {
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
