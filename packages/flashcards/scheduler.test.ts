import { assertEquals, assertThrows } from '@std/assert'
import Scheduler from './scheduler.ts'

const aA = { subjectId: 'a', markedCompleted: false }
const sA = {
  id: 'a',
  learnCards: [],
  quizCards: [],
  data: {},
}

Deno.test('Scheduler stubs', () => {
  const sched = new Scheduler()
  assertThrows(() => sched.add(sA))
  assertEquals(sched.filter(sA, aA), true)
  assertEquals(sched.filterLearnable(sA, aA), true)
  assertEquals(sched.filterQuizzable(sA, aA), true)
  assertEquals(
    sched.sort([sA, aA], [{ ...sA, id: 'b' }, { ...aA, subjectId: 'b' }]),
    0,
  )

  // New methods
  const sPair: [typeof sA, typeof aA] = [sA, aA]
  const tPair: [typeof sA, typeof aA] = [{ ...sA, id: 'b' }, {
    ...aA,
    subjectId: 'b',
  }]
  assertEquals(
    sched.sortLearnable(sPair, tPair),
    0,
    'sortLearnable falls back to sort',
  )

  // Test multiple calls to verify random behavior
  const results = Array(10).fill(0).map(() => sched.sortQuizzable(sPair, tPair))

  // At least one result should be different from others (random behavior)
  const allSame = results.every((val) => val === results[0])
  assertEquals(allSame, false, 'sortQuizzable should use random sort')

  assertEquals(sched.update(1, sA, aA), aA)
})
