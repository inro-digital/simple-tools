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
  assertEquals(sched.update(1, sA, aA), aA)
})
