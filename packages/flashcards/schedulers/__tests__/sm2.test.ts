import { assert, assertEquals, assertNotEquals } from '@std/assert'
import { FakeTime } from 'jsr:@std/testing/time'
import Sm2Scheduler from '../sm2.ts'

const ms = 1500000000000
const oneDayMS = 86_400_000

const sA = {
  id: 'my-subject',
  learnKeys: [],
  quizKeys: [],
  data: {},
}

Deno.test('add', () => {
  const sched = new Sm2Scheduler()
  const assignment = sched.add(sA)
  assertEquals(assignment.efactor, 2.5)
  assertEquals(assignment.repetition, 0)
  assertEquals(assignment.interval, 0)
})

Deno.test('filter', () => {
  const time = new FakeTime(ms)
  const sched = new Sm2Scheduler()
  let aA = sched.add(sA)

  try {
    assert(sched.filter(sA, aA), 'true by default')

    for (let i = 0; i < 3; i++) aA = sched.update(3, sA, aA)
    assert(sched.filter(sA, aA), 'still true for all reps < quality 4')

    aA = sched.update(4, sA, aA)
    assert(sched.filter(sA, aA) === false, 'false for quality >= 4')
    time.tick(oneDayMS)
    assert(sched.filter(sA, aA), 'true again after the interval passes')

    for (let i = 0; i < 3; i++) aA = sched.update(5, sA, aA)

    time.tick(oneDayMS * 10)
    assert(!sched.filter(sA, aA), 'false after waiting some time < interval')

    time.tick(oneDayMS * 20)
    assert(sched.filter(sA, aA), 'true again after waiting for full interval')
  } finally {
    time.restore()
  }
})

Deno.test('sort', () => {
  const sched = new Sm2Scheduler()
  const sB = {
    id: 'my-subject',
    type: '',
    learnKeys: ['count'],
    quizKeys: ['count'],
    data: { count: 1 },
  }
  let aA = sched.add(sA)
  let aB = sched.add(sB)
  aA = sched.update(4, sA, aA) // int = 1
  aB = sched.update(4, sB, aB) // int = 1

  let sum = 0
  for (let i = 0; i < 100; i++) sum += sched.sort([sA, aA], [sB, aB])
  assertNotEquals(sum, -100, 'On the same day, sort randomly')

  aA = sched.update(2, sA, aA) // int = 0
  aB = sched.update(4, sB, aB) // int = 4
  assert(sched.sort([sA, aA], [sB, aB]) < 0, 'sort by due date')
})

Deno.test('sched.update', () => {
  const sched = new Sm2Scheduler()
  const time = new FakeTime(ms)
  const lastStudiedAt = new Date(ms)
  let aA = sched.add(sA)

  try {
    aA = sched.update(5, sA, aA)
    assertEquals(aA.efactor, 2.6, 'First success')
    assertEquals(aA.repetition, 1, 'First success')
    assertEquals(aA.lastStudiedAt, lastStudiedAt, 'First success')

    aA = sched.update(5, sA, aA)
    assertEquals(aA.efactor, 2.7, 'Second success')
    assertEquals(aA.repetition, 2, 'Second success')
    assertEquals(aA.interval, 6, 'Second success')
    assertEquals(aA.lastStudiedAt, lastStudiedAt, 'Second success')

    aA = sched.update(5, sA, aA)
    assertEquals(aA.interval, 16, 'third rep: int')
    aA = sched.update(5, sA, aA)
    assertEquals(aA.interval, 45, 'fourth rep: int')
    aA = sched.update(5, sA, aA)
    assertEquals(aA.repetition, 5, 'fifth rep: rep')

    assertEquals(aA.efactor, 3.0000000000000004)
    aA = sched.update(0, sA, aA)
    assertEquals(aA.efactor, 3.0000000000000004, 'quality < 3 maintains ef')
    assertEquals(aA.repetition, 0, 'quality < 3 resets reps')
    assertEquals(aA.interval, 0, 'quality < 3 resets interval')

    aA = sched.update(3, sA, aA)
    assertEquals(aA.efactor, 2.8600000000000003, 'quality == 3 updates ef')
    assertEquals(aA.repetition, 0, 'quality == 3 resets reps')
    assertEquals(aA.interval, 0, 'quality == 3 resets interval')

    for (let i = 0; i < 3; i++) aA = sched.update(5, sA, aA)
    time.tick(oneDayMS)
    assertEquals(aA.interval, 18, 'reset interval for next test')

    aA = sched.update(3, sA, aA)
    assertEquals(aA.lastStudiedAt, new Date(ms + oneDayMS), 'day++')
    assertEquals(aA.interval, 1, 'next-day q < 4 sets int = 1')

    for (let i = 0; i < 15; i++) aA = sched.update(3, sA, aA)
    assertEquals(aA.efactor, 1.3, 'EF should never drop below 1.3')
  } finally {
    time.restore()
  }
})
