import { assert, assertEquals, assertNotEquals } from '@std/assert'
import BasicScheduler from '../basic.ts'
import type { Assignment, Subject } from '../../types.ts'

const subjectA = {
  id: 'my-subject',
  type: '',
  learnKeys: [],
  quizKeys: [],
  data: {},
}

Deno.test('init', () => {
  const scheduler = new BasicScheduler()
  const assignment = scheduler.add(subjectA)
  assertEquals(assignment.repetition, 0, 'should set default repetition')
})

Deno.test('filter', () => {
  const scheduler = new BasicScheduler()
  let assignmentA = scheduler.add(subjectA)
  assert(scheduler.filter(subjectA, assignmentA) === true, 'true by default')

  for (let i = 0; i < 5; i++) {
    assignmentA = scheduler.update(1, subjectA, assignmentA)
  }
  assert(
    scheduler.filter(subjectA, assignmentA) === false,
    'no longer true if reps > 3',
  )
})

Deno.test('sort', () => {
  const scheduler = new BasicScheduler()
  const assignmentA = scheduler.add(subjectA)
  let a: [Subject, Assignment] = [subjectA, assignmentA]

  const subjectB = {
    id: 'my-subject',
    type: '',
    learnKeys: ['count'],
    quizKeys: ['count'],
    data: { count: 1 },
  }
  const b: [Subject, Assignment] = [
    subjectB,
    scheduler.update(1, subjectB, scheduler.add(subjectB)),
  ]

  assert(scheduler.sort(a, b) < 0, 'sort by least # of repetitions')

  a = [subjectA, scheduler.update(1, subjectA, assignmentA)]
  let sum = 0
  for (let i = 0; i < 100; i++) sum += scheduler.sort(a, b)
  assertNotEquals(sum, -100, 'sort randomly if the same repetition')
})

Deno.test('update', () => {
  const scheduler = new BasicScheduler()
  let assignmentA = scheduler.add(subjectA)

  assignmentA = scheduler.update(1, subjectA, assignmentA)
  assertEquals(assignmentA.repetition, 1, 'increment rep if success')

  assignmentA = scheduler.update(0, subjectA, assignmentA)
  assertEquals(assignmentA.repetition, 0, 'decrement on failure')

  assignmentA = scheduler.update(1, subjectA, assignmentA)
  assertEquals(assignmentA.repetition, 1, 'increment rep if success')
  assignmentA = scheduler.update(1, subjectA, assignmentA)
  assertEquals(assignmentA.repetition, 2, 'increment rep if success')
})
