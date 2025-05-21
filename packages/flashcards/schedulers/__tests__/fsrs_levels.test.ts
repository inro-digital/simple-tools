import { assert, assertEquals } from '@std/assert'
import type { Subject } from '../../types.ts'
import FsrsLevelsScheduler, { Quality } from '../fsrs_levels.ts'

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
  assertEquals(assignment.unlockedAt instanceof Date, true)
  assertEquals(assignment.availableAt instanceof Date, true)
})

Deno.test('FsrsLevelsScheduler - filter by level', () => {
  const scheduler = new FsrsLevelsScheduler({ userLevel: 1 })
  const assignment1 = scheduler.add(subjects[0])
  assertEquals(scheduler.filter(subjects[0], assignment1), true, 'lvl1 visible')

  const assignment3 = scheduler.add(subjects[2])
  assertEquals(scheduler.filter(subjects[2], assignment3), false, 'lvl2 hidden')

  scheduler.userLevel = 2
  assertEquals(scheduler.filter(subjects[2], assignment3), true, 'lvl2 visible')
})

Deno.test('FsrsLevelsScheduler - update assignment with Default SRS', () => {
  const scheduler = new FsrsLevelsScheduler({ userLevel: 2 })
  const assignment = scheduler.add(subjects[0])

  const updated = scheduler.update(Quality.Good, subjects[0], assignment)
  assertEquals(updated.subjectId, 'subject-1')
  assertEquals(updated.repetition, 1, '1 rep')
  assertEquals(updated.startedAt instanceof Date, true)
  assertEquals(updated.lastStudiedAt instanceof Date, true)
  assertEquals(updated.availableAt instanceof Date, true)
  assertEquals(updated.passedAt, undefined, 'not passed, needs 3 reps')

  assertEquals(typeof updated.interval, 'number')
  assertEquals(updated?.interval && updated?.interval > 0, true)

  // Study to reach passesAt threshold (3 repetitions)
  const updated2 = scheduler.update(Quality.Good, subjects[0], updated)
  const updated3 = scheduler.update(Quality.Good, subjects[0], updated2)

  assertEquals(updated3.repetition, 3, '3 reps')
  assertEquals(updated3.passedAt instanceof Date, true, 'passed after 3 reps')
  assertEquals(updated3.completedAt, undefined, 'not completed (needs 10 reps)')

  // Study to reach completesAt threshold (10 repetitions)
  const updated4 = scheduler.update(Quality.Good, subjects[0], updated3)
  const updated5 = scheduler.update(Quality.Good, subjects[0], updated4)
  const updated6 = scheduler.update(Quality.Good, subjects[0], updated5)
  const updated7 = scheduler.update(Quality.Good, subjects[0], updated6)
  const updated8 = scheduler.update(Quality.Good, subjects[0], updated7)
  const updated9 = scheduler.update(Quality.Good, subjects[0], updated8)
  const updated10 = scheduler.update(Quality.Good, subjects[0], updated9)

  assertEquals(updated10.repetition, 10, '10 reps')
  assertEquals(
    updated10.completedAt instanceof Date,
    true,
    'completed after 10 reps',
  )
})

Deno.test('FsrsLevelsScheduler - update assignment with Fast SRS', () => {
  const scheduler = new FsrsLevelsScheduler({ userLevel: 2 })
  const assignment = scheduler.add(subjects[2]) // Using subject with srsId: 2 (Fast)

  const updated = scheduler.update(Quality.Good, subjects[2], assignment)
  assertEquals(updated.repetition, 1, '1 rep')
  assertEquals(updated.passedAt, undefined, 'not passed, needs 3 reps')

  // Study to reach passesAt threshold (3 repetitions)
  const updated2 = scheduler.update(Quality.Good, subjects[2], updated)
  const updated3 = scheduler.update(Quality.Good, subjects[2], updated2)

  assertEquals(updated3.repetition, 3, '3 reps')
  assertEquals(updated3.passedAt instanceof Date, true, 'passed after 3 reps')
  assertEquals(updated3.completedAt, undefined, 'not completed (needs 8 reps)')

  // Continue studying to reach completesAt threshold (8 repetitions)
  const updated4 = scheduler.update(Quality.Good, subjects[2], updated3)
  const updated5 = scheduler.update(Quality.Good, subjects[2], updated4)
  const updated6 = scheduler.update(Quality.Good, subjects[2], updated5)
  const updated7 = scheduler.update(Quality.Good, subjects[2], updated6)
  const updated8 = scheduler.update(Quality.Good, subjects[2], updated7)

  assertEquals(updated8.repetition, 8, '8 reps')
  assertEquals(
    updated8.completedAt instanceof Date,
    true,
    'completed after 8 reps',
  )
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

  assertEquals(
    scheduler.sort([subjects[0], assignment1], [subjects[2], assignment3]) < 0,
    true,
    'level 1 before level 2',
  )

  // Position 0 should come before position 1 within same level
  assertEquals(
    scheduler.sort([subjects[0], assignment1], [subjects[1], assignment2]) < 0,
    true,
    'same level - position 0 before position 1',
  )

  const now = new Date()
  const futureDate = new Date(now)
  futureDate.setDate(futureDate.getDate() + 5)
  const furtherDate = new Date(now)
  furtherDate.setDate(furtherDate.getDate() + 10)

  const a1Modified = { ...assignment1, availableAt: furtherDate }
  const a2Modified = { ...assignment2, availableAt: futureDate }

  assertEquals(
    scheduler.sort([subjects[1], a2Modified], [subjects[0], a1Modified]) < 0,
    true,
    'earlier due date with equal everything else',
  )
})

Deno.test('FsrsLevelsScheduler - fractional day intervals', () => {
  const scheduler = new FsrsLevelsScheduler({ userLevel: 2 })
  const assignment = scheduler.add(subjects[0])

  // Test that the updated interval can be a fraction of a day
  const updated = scheduler.update(Quality.Hard, subjects[0], assignment)

  assert(updated.interval)
  assertEquals(typeof updated.interval, 'number')
  assertEquals(updated.interval >= 0.25, true, 'interval can be fractional')

  // Check that availableAt is calculated correctly using fractional days
  const now = new Date()
  const minExpectedTime = new Date(now.getTime() + (0.25 * 24 * 60 * 60 * 1000))
    .getTime()

  assertEquals(updated.availableAt instanceof Date, true)
  assertEquals(
    updated.availableAt!.getTime() >= minExpectedTime,
    true,
    'fractional days applied to availableAt',
  )
})
