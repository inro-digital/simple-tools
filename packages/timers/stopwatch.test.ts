import { assertEquals } from '@std/assert/equals'
import { assertSpyCalls, spy } from '@std/testing/mock'
import { FakeTime } from '@std/testing/time'
import Stopwatch from './stopwatch.ts'

Deno.test('initializes', () => {
  const stopwatch = new Stopwatch()

  assertEquals(stopwatch.state, {
    display: '0:00.0',
    elapsed: 0,
    isPaused: false,
    isStarted: false,
    laps: [],
  })
})

Deno.test('start, pause, stop', () => {
  const time = new FakeTime()

  try {
    const stopwatch = new Stopwatch()
    const listener = spy()

    stopwatch.addEventListener(listener)

    stopwatch.start()
    time.tick(10_000)
    stopwatch.pause()
    time.tick(10_000) // Shouldn't call listeners or update time
    stopwatch.start()
    time.tick(1000)
    stopwatch.stop()
    stopwatch.reset()

    assertSpyCalls(listener, 1105) // 1100 for time, 4 for start/pauses/stop
    assertEquals(listener.calls[261].args, [{
      display: '0:02.6',
      elapsed: 2610,
      isPaused: false,
      isStarted: true,
      laps: [],
    }])

    // Timer during paused state
    assertEquals(listener.calls[1001].args, [{
      display: '0:10.0',
      elapsed: 10_000,
      isPaused: true,
      isStarted: true,
      laps: [],
    }])

    // Timer should resume
    assertEquals(listener.calls[1100].args, [{
      display: '0:10.9',
      elapsed: 10_980,
      isPaused: false,
      isStarted: true,
      laps: [],
    }])

    // Timer stopped and reset
    assertEquals(listener.calls[1104].args, [{
      display: '0:00.0',
      elapsed: 0,
      isPaused: false,
      isStarted: false,
      laps: [],
    }])
  } finally {
    time.restore()
  }
})

Deno.test("start, pause, stop shouldn't run if already in state", () => {
  const time = new FakeTime()

  try {
    const stopwatch = new Stopwatch()
    const listener = spy()

    stopwatch.addEventListener(listener)

    stopwatch.start()
    stopwatch.start() // Does Nothing
    time.tick(10_000)
    stopwatch.pause()
    stopwatch.pause() // Does Nothing
    time.tick(10_000) // Shouldn't call listeners or update time
    stopwatch.start()
    stopwatch.start() // Does Nothing
    time.tick(1000)
    stopwatch.stop()
    stopwatch.stop() // Does Nothing
    stopwatch.reset()

    assertSpyCalls(listener, 1105) // 1100 for time, 4 for start/pauses/stop
    assertEquals(listener.calls[261].args, [{
      display: '0:02.6',
      elapsed: 2610,
      isPaused: false,
      isStarted: true,
      laps: [],
    }])

    // Timer during paused state
    assertEquals(listener.calls[1001].args, [{
      display: '0:10.0',
      elapsed: 10_000,
      isPaused: true,
      isStarted: true,
      laps: [],
    }])

    // Timer should resume
    assertEquals(listener.calls[1100].args, [{
      display: '0:10.9',
      elapsed: 10_980,
      isPaused: false,
      isStarted: true,
      laps: [],
    }])

    // Timer stopped and reset
    assertEquals(listener.calls[1104].args, [{
      display: '0:00.0',
      elapsed: 0,
      isPaused: false,
      isStarted: false,
      laps: [],
    }])
  } finally {
    time.restore()
  }
})

Deno.test('laps', () => {
  const time = new FakeTime()

  try {
    const stopwatch = new Stopwatch()

    stopwatch.start()
    time.tick(1000)
    stopwatch.lap()
    time.tick(1100)
    stopwatch.lap()
    time.tick(1200)
    stopwatch.lap()
    stopwatch.pause()

    assertEquals(stopwatch.state.laps, [
      {
        split: 1000,
        splitDisplay: '0:01.0',
        total: 1000,
        totalDisplay: '0:01.0',
      },
      {
        split: 1100,
        splitDisplay: '0:01.1',
        total: 2100,
        totalDisplay: '0:02.1',
      },
      {
        split: 2300,
        splitDisplay: '0:02.3',
        total: 3300,
        totalDisplay: '0:03.3',
      },
    ])
  } finally {
    time.restore()
  }
})

Deno.test('custom displayTime formatter', () => {
  const time = new FakeTime()

  try {
    const stopwatch = new Stopwatch({
      formatDisplayTime: (remaining) => String(remaining),
    })

    stopwatch.start()
    time.tick(500)
    assertEquals(stopwatch.state.display, '500')
  } finally {
    time.restore()
  }
})
