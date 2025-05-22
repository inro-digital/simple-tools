import { assert, assertEquals } from '@std/assert'
import type { Assignment, Subject } from '../../types.ts'
import FsrsLevelsScheduler, { Quality } from '../fsrs_levels.ts'
import { assertSnapshot } from '@std/testing/snapshot'
import { assertInstanceOf } from '@std/assert/instance-of'
import { assertFalse } from '@std/assert/false'
import { DAY_MS } from '../../../utils/datetime.ts'

const subjects: Subject[] = [
  {
    id: 'subject-1',
    learnCards: ['front'],
    quizCards: ['back'],
    data: {
      level: 1,
      srsId: 1,
      position: 0,
      front: 'What is 2+2?',
      back: '4',
    },
  },
  {
    id: 'subject-2',
    learnCards: ['front'],
    quizCards: ['back'],
    data: {
      level: 1,
      srsId: 1,
      position: 1,
      front: 'What is 3+3?',
      back: '6',
    },
  },
  {
    id: 'subject-3',
    learnCards: ['front'],
    quizCards: ['back'],
    data: {
      level: 2,
      srsId: 2,
      position: 0,
      front: 'What is the capital of France?',
      back: 'Paris',
    },
  },
]

Deno.test('FsrsLevelsScheduler - initialize scheduler', () => {
  const scheduler = new FsrsLevelsScheduler({ userLevel: 1 })
  assertEquals(scheduler.userLevel, 1)
})

Deno.test('FsrsLevelsScheduler - add new assignment', () => {
  const scheduler = new FsrsLevelsScheduler({ userLevel: 1 })
  const assignment = scheduler.add(subjects[0])

  assertEquals(assignment.subjectId, 'subject-1')
  assertEquals(assignment.markedCompleted, false)
  assertEquals(assignment.difficulty, 0.3)
  assertEquals(assignment.stability, 0)
  assertEquals(assignment.interval, 0)
  assertEquals(assignment.repetition, 0)
  assertInstanceOf(assignment.unlockedAt, Date)
  assertInstanceOf(assignment.availableAt, Date)
})

Deno.test('FsrsLevelsScheduler - filter by level', () => {
  const scheduler = new FsrsLevelsScheduler({ userLevel: 1 })
  const assignment1 = scheduler.add(subjects[0])
  assert(scheduler.filter(subjects[0], assignment1), 'lvl1 visible')

  const assignment3 = scheduler.add(subjects[2])
  assertFalse(scheduler.filter(subjects[2], assignment3), 'lvl2 hidden')

  scheduler.userLevel = 2
  assert(scheduler.filter(subjects[2], assignment3), 'lvl2 visible')
})

Deno.test('FsrsLevelsScheduler - update assignment with Default SRS', async (t) => {
  const scheduler = new FsrsLevelsScheduler({ userLevel: 2 })
  const assignment = scheduler.add(subjects[0])
  const intervals = []

  let updated = scheduler.update(Quality.Good, subjects[0], assignment)
  intervals.push(updated.interval)
  assertEquals(updated.subjectId, 'subject-1')
  assertEquals(updated.repetition, 1, '1 rep')
  assertInstanceOf(updated.startedAt, Date)
  assertInstanceOf(updated.lastStudiedAt, Date)
  assertInstanceOf(updated.availableAt, Date)
  assertEquals(updated.passedAt, undefined, 'not passed, needs 3 reps')

  assertEquals(typeof updated.interval, 'number')
  assertEquals(updated?.interval && updated?.interval > 0, true)

  // Study to reach passesAt threshold (3 repetitions)
  updated = scheduler.update(Quality.Good, subjects[0], updated)
  intervals.push(updated.interval)
  updated = scheduler.update(Quality.Good, subjects[0], updated)
  intervals.push(updated.interval)

  assertEquals(updated.repetition, 3, '3 reps')
  assertInstanceOf(updated.passedAt, Date, 'passed after 3 reps')
  assertEquals(updated.completedAt, undefined, 'not completed (needs 10 reps)')

  // Study to reach completesAt threshold
  for (let i = 0; i < 7; i++) {
    updated = scheduler.update(Quality.Good, subjects[0], updated)
    intervals.push(updated.interval)
  }

  assertEquals(updated.repetition, 10, '10 reps')
  assert(updated.completedAt, 'completed after 10')
  await assertSnapshot(t, intervals)
})

Deno.test('FsrsLevelsScheduler - update assignment with Fast SRS', async (t) => {
  const scheduler = new FsrsLevelsScheduler({ userLevel: 2 })
  const assignment = scheduler.add(subjects[2]) // Using subject with srsId: 2 (Fast)
  const intervals = []

  let updated = scheduler.update(Quality.Good, subjects[2], assignment)
  intervals.push(updated.interval)
  assertEquals(updated.repetition, 1, '1 rep')
  assertEquals(updated.passedAt, undefined, 'not passed, needs 3 reps')

  // Study to reach passesAt threshold (3 repetitions)
  updated = scheduler.update(Quality.Good, subjects[2], updated)
  intervals.push(updated.interval)
  updated = scheduler.update(Quality.Good, subjects[2], updated)
  intervals.push(updated.interval)

  assertEquals(updated.repetition, 3, '3 reps')
  assertInstanceOf(updated.passedAt, Date, 'passed after 3 reps')
  assertEquals(updated.completedAt, undefined, 'not completed (needs 8 reps)')

  // Continue studying to reach completesAt threshold (8 repetitions)
  for (let i = 0; i < 7; i++) {
    updated = scheduler.update(Quality.Good, subjects[2], updated)
    intervals.push(updated.interval)
  }

  assertEquals(updated.repetition, 10, '10 reps')
  assertInstanceOf(updated.completedAt, Date, 'completed after 10')
  await assertSnapshot(t, intervals)
})

Deno.test('FsrsLevelsScheduler - failed card resets repetition', () => {
  const scheduler = new FsrsLevelsScheduler({ userLevel: 2 })

  const initial = scheduler.add(subjects[0])
  const updated1 = scheduler.update(Quality.Good, subjects[0], initial)
  const updated2 = scheduler.update(Quality.Hard, subjects[0], updated1)

  assertEquals(updated2.repetition, 2)

  const failed = scheduler.update(Quality.Again, subjects[0], updated2)
  assertEquals(failed.repetition, 0, 'repetition resets on failure')

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 2)
  assertEquals(failed.availableAt !== null, true, 'not available yet')
  assertEquals(failed.availableAt!.getTime() < tomorrow.getTime(), true, 'soon')
})

Deno.test('FsrsLevelsScheduler - sort works correctly', () => {
  const scheduler = new FsrsLevelsScheduler({ userLevel: 2 })

  const assignment1 = scheduler.add(subjects[0]) // level 1, position 0
  const assignment2 = scheduler.add(subjects[1]) // level 1, position 1
  const assignment3 = scheduler.add(subjects[2]) // level 2, position 0

  assert(
    scheduler.sort([subjects[0], assignment1], [subjects[2], assignment3]) < 0,
    'level 1 before level 2',
  )

  // Position 0 should come before position 1 within same level
  assert(
    scheduler.sort([subjects[0], assignment1], [subjects[1], assignment2]) < 0,
    'same level - position 0 before position 1',
  )

  const now = new Date()
  const futureDate = new Date(now)
  futureDate.setDate(futureDate.getDate() + 5)
  const furtherDate = new Date(now)
  furtherDate.setDate(furtherDate.getDate() + 10)

  const a1Modified = { ...assignment1, availableAt: furtherDate }
  const a2Modified = { ...assignment2, availableAt: futureDate }

  assert(
    scheduler.sort([subjects[1], a2Modified], [subjects[0], a1Modified]) < 0,
    'earlier due date with equal everything else',
  )
})
Deno.test('FsrsLevelsScheduler - fractional day intervals', () => {
  const scheduler = new FsrsLevelsScheduler({ userLevel: 2 })
  const assignment = scheduler.add(subjects[0])
  const updated = scheduler.update(Quality.Hard, subjects[0], assignment)

  assert(updated.interval)
  assert(typeof updated.interval, 'number')
  assertEquals(updated.interval >= 0.25, true, 'interval can be fractional')

  // Check that availableAt is calculated correctly using fractional days
  const now = new Date()
  const minExpectedTime = new Date(now.getTime() + (0.25 * DAY_MS)).getTime()

  assertInstanceOf(updated.availableAt, Date)
  assert(
    updated.availableAt!.getTime() >= minExpectedTime,
    'fractional days applied to availableAt',
  )
})

Deno.test('FsrsLevelsScheduler - requiredSubjects', () => {
  const scheduler = new FsrsLevelsScheduler({ userLevel: 10 })

  const prerequisiteSubject: Subject = {
    id: 'prerequisite-subject',
    learnCards: ['front'],
    quizCards: ['back'],
    data: {
      level: 1,
      srsId: 1,
      position: 0,
      front: 'Basic question',
      back: 'Basic answer',
    },
  }

  const dependentSubject: Subject = {
    id: 'dependent-subject',
    learnCards: ['front'],
    quizCards: ['back'],
    data: {
      level: 2,
      srsId: 1,
      position: 0,
      requiredSubjects: ['prerequisite-subject'],
      front: 'Advanced question',
      back: 'Advanced answer',
    },
  }

  const prerequisiteAssignment = scheduler.add(prerequisiteSubject)
  const baseAssignment = scheduler.add(dependentSubject)

  const dependentAssignment = { ...baseAssignment, startedAt: undefined }

  const all: Record<string, Assignment> = {
    [prerequisiteSubject.id]: prerequisiteAssignment,
    [dependentSubject.id]: dependentAssignment,
  }

  assertFalse(
    scheduler.filterLearnable(dependentSubject, dependentAssignment, all),
    'Subject with unmet prerequisites should not be learnable',
  )

  let updatedPrereqAssignment = prerequisiteAssignment
  for (let i = 0; i < 3; i++) { // Need 3 reps to reach passesAt
    updatedPrereqAssignment = scheduler.update(
      Quality.Good,
      prerequisiteSubject,
      updatedPrereqAssignment,
    )
  }

  assertInstanceOf(
    updatedPrereqAssignment.passedAt,
    Date,
    'Prereq passes on 3 reps',
  )

  all[prerequisiteSubject.id] = updatedPrereqAssignment
  assert(
    scheduler.filterLearnable(dependentSubject, dependentAssignment, all),
    'Subject with met prerequisites should be learnable',
  )

  const multiPrereqSubject: Subject = {
    id: 'multi-prereq-subject',
    learnCards: ['front'],
    quizCards: ['back'],
    data: {
      level: 3,
      srsId: 1,
      position: 0,
      requiredSubjects: ['prerequisite-subject', 'dependent-subject'],
      front: 'Complex question',
      back: 'Complex answer',
    },
  }

  const baseMultiPrereqAssignment = scheduler.add(multiPrereqSubject)
  const multiPrereqAssignment = {
    ...baseMultiPrereqAssignment,
    startedAt: undefined,
  }
  all[multiPrereqSubject.id] = multiPrereqAssignment

  assertFalse(
    scheduler.filterLearnable(multiPrereqSubject, multiPrereqAssignment, all),
    'Subject with partially met prerequisites should not be learnable',
  )

  let updatedDependentAssignment = { ...baseAssignment }
  for (let i = 0; i < 3; i++) {
    updatedDependentAssignment = scheduler.update(
      Quality.Good,
      dependentSubject,
      updatedDependentAssignment,
    )
  }

  all[dependentSubject.id] = updatedDependentAssignment

  assert(
    scheduler.filterLearnable(multiPrereqSubject, multiPrereqAssignment, all),
    'Subject with all prerequisites met should be learnable',
  )
})
