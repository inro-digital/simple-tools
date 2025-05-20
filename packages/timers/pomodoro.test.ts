import { assertEquals } from '@std/assert/equals'
import { FakeTime } from '@std/testing/time'
import PomodoroTimer from './pomodoro.ts'

Deno.test('initializes with default options', () => {
  const timer = new PomodoroTimer()

  assertEquals(timer.state, {
    display: '25:00',
    periodType: 'focus',
    completedFocusPeriods: 0,
    periodsUntilLongBreak: 4,
    isPaused: false,
    isStarted: false,
    isComplete: false,
  })
})

Deno.test('initializes with custom options', () => {
  const timer = new PomodoroTimer({
    focusMinutes: 30,
    shortBreakMinutes: 7,
    longBreakMinutes: 20,
    periodsBeforeLongBreak: 3,
    cycles: 2,
  })

  assertEquals(timer.state, {
    display: '30:00',
    periodType: 'focus',
    completedFocusPeriods: 0,
    periodsUntilLongBreak: 3,
    isPaused: false,
    isStarted: false,
    isComplete: false,
  })
})

Deno.test('cycles through periods correctly', () => {
  const time = new FakeTime()

  try {
    const timer = new PomodoroTimer({
      focusMinutes: 1,
      shortBreakMinutes: 1,
      longBreakMinutes: 2,
      periodsBeforeLongBreak: 2,
      cycles: 1,
    })

    // Start first focus period
    timer.start()
    assertEquals(timer.state.periodType, 'focus')
    assertEquals(timer.state.completedFocusPeriods, 0)
    assertEquals(timer.state.periodsUntilLongBreak, 2)

    // Skip to first short break
    timer.skipPeriod()
    assertEquals(timer.state.periodType, 'shortBreak')
    assertEquals(timer.state.completedFocusPeriods, 1)
    assertEquals(timer.state.periodsUntilLongBreak, 1)

    // Skip to second focus period
    timer.skipPeriod()
    assertEquals(timer.state.periodType, 'focus')
    assertEquals(timer.state.completedFocusPeriods, 1)
    assertEquals(timer.state.periodsUntilLongBreak, 1)

    // Skip to long break
    timer.skipPeriod()
    assertEquals(timer.state.periodType, 'longBreak')
    assertEquals(timer.state.completedFocusPeriods, 2)
    assertEquals(timer.state.periodsUntilLongBreak, 2)

    // Cycle should complete after long break
    timer.skipPeriod()
    assertEquals(timer.state.isComplete, true)
  } finally {
    time.restore()
  }
})

Deno.test('pause and resume functionality', () => {
  const time = new FakeTime()

  try {
    const timer = new PomodoroTimer({
      focusMinutes: 1,
    })

    timer.start()
    assertEquals(timer.state.isStarted, true)
    assertEquals(timer.state.isPaused, false)

    timer.pause()
    assertEquals(timer.state.isPaused, true)
    assertEquals(timer.state.isStarted, true)

    timer.start()
    assertEquals(timer.state.isPaused, false)
    assertEquals(timer.state.isStarted, true)
  } finally {
    time.restore()
  }
})

Deno.test('stop and reset functionality', () => {
  const time = new FakeTime()

  try {
    const timer = new PomodoroTimer({
      focusMinutes: 1,
    })

    timer.start()
    time.tick(30000) // 30 seconds in
    timer.stop()

    assertEquals(timer.state.isStarted, false)
    assertEquals(timer.state.isPaused, false)

    timer.reset()
    assertEquals(timer.state, {
      display: '1:00',
      periodType: 'focus',
      completedFocusPeriods: 0,
      periodsUntilLongBreak: 4,
      isPaused: false,
      isStarted: false,
      isComplete: false,
    })
  } finally {
    time.restore()
  }
})
