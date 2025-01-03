import { assertEquals } from '@std/assert/equals'
import { assertSpyCalls, spy } from '@std/testing/mock'
import { FakeTime } from '@std/testing/time'
import Countdown from './countdown.ts'

Deno.test('initializes', () => {
  const countdown = new Countdown({ initialMS: 30000 })

  assertEquals(countdown.state, {
    display: '0:30.0',
    elapsed: 0,
    isPaused: false,
    isStarted: false,
    remaining: 30000,
    total: 30000,
  })
})

Deno.test('start, pause, stop', () => {
  const time = new FakeTime()

  try {
    const countdown = new Countdown({ initialMS: 30000 })
    const listener = spy()

    countdown.addEventListener(listener)

    countdown.start()
    time.tick(10_000)
    countdown.pause()
    time.tick(10_000) // Shouldn't call listeners or update time
    countdown.start()
    time.tick(1000)
    countdown.stop()
    countdown.reset()

    assertSpyCalls(listener, 1105) // 1100 for time, 4 for start/pauses/stop
    assertEquals(listener.calls[261].args[0], {
      display: '0:27.3',
      elapsed: 2610,
      isPaused: false,
      isStarted: true,
      remaining: 27390,
      total: 30000,
    })

    // Timer during paused state
    assertEquals(listener.calls[1001].args, [{
      display: '0:20.0',
      elapsed: 10000,
      isPaused: true,
      isStarted: true,
      remaining: 20000,
      total: 30000,
    }])

    // Timer should resume
    assertEquals(listener.calls[1100].args, [{
      display: '0:19.0',
      elapsed: 10980,
      isPaused: false,
      isStarted: true,
      remaining: 19020,
      total: 30000,
    }])

    // Timer stopped and reset
    assertEquals(listener.calls[1104].args, [{
      display: '0:30.0',
      elapsed: 0,
      isPaused: false,
      isStarted: false,
      remaining: 30000,
      total: 30000,
    }])
  } finally {
    time.restore()
  }
})

Deno.test('countdown reaches zero', () => {
  const time = new FakeTime()

  try {
    const countdown = new Countdown({ initialMS: 1000 })
    const listener = spy()

    countdown.addEventListener(listener)

    countdown.start()
    time.tick(500)
    assertEquals(countdown.state.remaining, 500)

    time.tick(500)
    assertEquals(countdown.state.remaining, 0)
    assertEquals(countdown.state.isStarted, false)
    assertEquals(countdown.state.display, '0:00.0')

    // 99 for time, 1 for start and finish
    // Not 100, because 100th tick is the "stop" tick
    assertSpyCalls(listener, 101)
  } finally {
    time.restore()
  }
})

Deno.test('custom displayTime formatter', () => {
  const time = new FakeTime()

  try {
    const countdown = new Countdown({
      initialMS: 1000,
      formatDisplayTime: (remaining) => String(remaining),
    })

    countdown.start()
    time.tick(500)
    assertEquals(countdown.state.display, '500')
  } finally {
    time.restore()
  }
})
