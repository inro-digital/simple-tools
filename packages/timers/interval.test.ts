import { assertEquals } from '@std/assert/equals'
import { FakeTime } from '@std/testing/time'
import IntervalTimer from './interval.ts'

Deno.test('initializes with default options', () => {
  const timer = new IntervalTimer({
    intervals: [
      { duration: 30000, type: 'work' },
      { duration: 10000, type: 'rest' },
    ],
  })

  assertEquals(timer.state, {
    display: '0:30.0',
    elapsed: 0,
    remaining: 30000,
    isPaused: false,
    isStarted: false,
    currentInterval: { duration: 30000, type: 'work' },
    currentIntervalIndex: 0,
    completedCycles: 0,
    totalCycles: 1,
    intervals: [
      { duration: 30000, type: 'work' },
      { duration: 10000, type: 'rest' },
    ],
    isComplete: false,
  })
})

Deno.test('initializes with custom options', () => {
  const timer = new IntervalTimer({
    intervals: [
      { duration: 25 * 60 * 1000, type: 'work', label: 'Focus Time' },
      { duration: 5 * 60 * 1000, type: 'rest', label: 'Short Break' },
    ],
    cycles: 4,
    resolutionMS: 100,
  })

  assertEquals(timer.state, {
    display: '25:00.0',
    elapsed: 0,
    remaining: 25 * 60 * 1000,
    isPaused: false,
    isStarted: false,
    currentInterval: {
      duration: 25 * 60 * 1000,
      type: 'work',
      label: 'Focus Time',
    },
    currentIntervalIndex: 0,
    completedCycles: 0,
    totalCycles: 4,
    intervals: [
      { duration: 25 * 60 * 1000, type: 'work', label: 'Focus Time' },
      { duration: 5 * 60 * 1000, type: 'rest', label: 'Short Break' },
    ],
    isComplete: false,
  })
})

Deno.test('throws error with empty intervals array', () => {
  try {
    new IntervalTimer({ intervals: [] })
    throw new Error('Should have thrown an error for empty intervals array')
  } catch (error: unknown) {
    if (error instanceof Error) {
      assertEquals(
        error.message,
        'IntervalTimer requires at least one interval',
      )
    } else {
      throw error
    }
  }
})

Deno.test('basic interval progression test', () => {
  const time = new FakeTime()

  try {
    const timer = new IntervalTimer({
      intervals: [
        { duration: 1000, type: 'work' },
        { duration: 500, type: 'rest' },
      ],
      cycles: 1,
    })

    timer.start()
    assertEquals(timer.state.currentIntervalIndex, 0, 'first interval')
    assertEquals(timer.state.currentInterval.type, 'work', 'starts work')

    timer.skipToNextInterval()

    assertEquals(timer.state.currentIntervalIndex, 1, 'second interval')
    assertEquals(timer.state.currentInterval.type, 'rest', 'starts rest')
  } finally {
    time.restore()
  }
})

Deno.test('skipToNextInterval works correctly', () => {
  const time = new FakeTime()

  try {
    const timer = new IntervalTimer({
      intervals: [
        { duration: 5000, type: 'work' },
        { duration: 3000, type: 'rest' },
      ],
      cycles: 2,
    })

    timer.start()
    time.tick(2000)
    timer.skipToNextInterval()

    assertEquals(timer.state.currentIntervalIndex, 1, 'second interval')
    assertEquals(timer.state.currentInterval.type, 'rest')
    assertEquals(timer.state.isStarted, false)

    timer.start()
    assertEquals(timer.state.isStarted, true, 'is re-started')

    timer.skipToNextInterval()
    assertEquals(timer.state.currentIntervalIndex, 0, 'wraps to first interval')
    assertEquals(timer.state.completedCycles, 1, 'increments cycle')

    timer.start()
    assertEquals(timer.state.isStarted, true, 'starts 3rd time')
  } finally {
    time.restore()
  }
})

Deno.test('reset returns timer to initial state', () => {
  const time = new FakeTime()

  try {
    const timer = new IntervalTimer({
      intervals: [
        { duration: 5000, type: 'work' },
        { duration: 3000, type: 'rest' },
      ],
      cycles: 1,
    })

    timer.start()
    time.tick(6000) // Complete first interval and into second
    timer.reset()

    // Check state is back to initial
    assertEquals(timer.state.isStarted, false)
    assertEquals(timer.state.isPaused, false)
    assertEquals(timer.state.currentIntervalIndex, 0)
    assertEquals(timer.state.elapsed, 0)
    assertEquals(timer.state.remaining, 5000)
    assertEquals(timer.state.completedCycles, 0)
  } finally {
    time.restore()
  }
})

Deno.test('reset with new options', () => {
  const timer = new IntervalTimer({
    intervals: [
      { duration: 10000, type: 'work' },
      { duration: 5000, type: 'rest' },
    ],
    cycles: 2,
  })

  timer.reset({
    intervals: [
      { duration: 20000, type: 'work', label: 'New Work' },
      { duration: 10000, type: 'rest', label: 'New Rest' },
    ],
    cycles: 3,
  })

  assertEquals(timer.state, {
    display: '0:20.0',
    elapsed: 0,
    remaining: 20000,
    isPaused: false,
    isStarted: false,
    currentInterval: { duration: 20000, type: 'work', label: 'New Work' },
    currentIntervalIndex: 0,
    completedCycles: 0,
    totalCycles: 3,
    intervals: [
      { duration: 20000, type: 'work', label: 'New Work' },
      { duration: 10000, type: 'rest', label: 'New Rest' },
    ],
    isComplete: false,
  })
})

// Test pause functionality
Deno.test('pause and resume functionality', () => {
  const time = new FakeTime()

  try {
    const timer = new IntervalTimer({
      intervals: [{ duration: 5000, type: 'work' }],
    })

    timer.start()
    time.tick(2000)

    timer.pause()
    assertEquals(timer.state.isPaused, true)
    assertEquals(timer.state.isStarted, true)

    time.tick(1000)
    assertEquals(timer.state.elapsed, 2000, 'paused; still at 2s')

    timer.start()
    assertEquals(timer.state.isPaused, false)

    time.tick(1000)
    assertEquals(timer.state.elapsed, 3000, '3s')
  } finally {
    time.restore()
  }
})

Deno.test('custom formatDisplayTime', () => {
  const timer = new IntervalTimer({
    intervals: [{ duration: 10000, type: 'work' }],
    formatDisplayTime: (remaining) => `${remaining / 1000}s remaining`,
  })

  assertEquals(timer.state.display, '10s remaining', 'formats time')
})
