import { assertEquals } from '@std/assert'
import FsrsLevelsScheduler from '../fsrs_levels.ts'
import type { Subject } from '../../types.ts'
import srs from '../../__data__/srs_fsrs.json' with { type: 'json' }

const subjects: Subject[] = [
  {
    id: 'subject-1',
    learnKeys: ['front'],
    quizKeys: ['back'],
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
    learnKeys: ['front'],
    quizKeys: ['back'],
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
    learnKeys: ['front'],
    quizKeys: ['back'],
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
  const scheduler = new FsrsLevelsScheduler({ srs, userLevel: 1 })
  assertEquals(scheduler.userLevel, 1)
})

Deno.test('FsrsLevelsScheduler - add new assignment', () => {
  const scheduler = new FsrsLevelsScheduler({ srs, userLevel: 1 })
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
  const scheduler = new FsrsLevelsScheduler({ srs, userLevel: 1 })
  const assignment1 = scheduler.add(subjects[0])
  assertEquals(scheduler.filter(subjects[0], assignment1), true, 'lvl1 visible')

  const assignment3 = scheduler.add(subjects[2])
  assertEquals(scheduler.filter(subjects[2], assignment3), false, 'lvl2 hidden')

  scheduler.userLevel = 2
  assertEquals(scheduler.filter(subjects[2], assignment3), true, 'lvl2 visible')
})

Deno.test('FsrsLevelsScheduler - update assignment', () => {
  const scheduler = new FsrsLevelsScheduler({ srs, userLevel: 2 })
  const assignment = scheduler.add(subjects[0])

  const updated = scheduler.update(3, subjects[0], assignment) // 3 = Good
  assertEquals(updated.subjectId, 'subject-1')
  assertEquals(updated.repetition, 1, '1 rep')
  assertEquals(updated.startedAt instanceof Date, true)
  assertEquals(updated.lastStudiedAt instanceof Date, true)
  assertEquals(updated.availableAt instanceof Date, true)
  assertEquals(updated.passedAt, undefined, 'not passed, needs 3')

  assertEquals(typeof updated.interval, 'number')
  assertEquals(updated?.interval && updated?.interval > 0, true)

  // Study again twice more to reach passesAt threshold
  const updated2 = scheduler.update(3, subjects[0], updated)
  const updated3 = scheduler.update(4, subjects[0], updated2)

  assertEquals(updated3.repetition, 3, '3 reps')
  assertEquals(updated3.passedAt instanceof Date, true, 'passed after 3')
  assertEquals(updated3.completedAt, undefined, 'not completed (needs 6)')

  // Study three more times to reach completesAt threshold
  const updated4 = scheduler.update(3, subjects[0], updated3)
  const updated5 = scheduler.update(3, subjects[0], updated4)
  const updated6 = scheduler.update(3, subjects[0], updated5)

  assertEquals(updated6.repetition, 6, '6 reps')
  assertEquals(updated6.completedAt instanceof Date, true, 'passed after 6')
})

Deno.test('FsrsLevelsScheduler - failed card resets repetition', () => {
  const scheduler = new FsrsLevelsScheduler({ srs, userLevel: 2 })

  const initial = scheduler.add(subjects[0])
  const updated1 = scheduler.update(3, subjects[0], initial)
  const updated2 = scheduler.update(3, subjects[0], updated1)

  assertEquals(updated2.repetition, 2)

  const failed = scheduler.update(1, subjects[0], updated2) // 1 = Failure
  assertEquals(failed.repetition, 0, 'repetition resets on failure')

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 2)
  assertEquals(failed.availableAt !== null, true, 'not available yet')
  assertEquals(failed.availableAt!.getTime() < tomorrow.getTime(), true, 'soon')
})

Deno.test('FsrsLevelsScheduler - sort works correctly', () => {
  const scheduler = new FsrsLevelsScheduler({ srs, userLevel: 2 })

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
