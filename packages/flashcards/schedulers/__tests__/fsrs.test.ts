import { assert, assertEquals } from '@std/assert'
import { assertSnapshot } from '@std/testing/snapshot'
import { getNow, setMockTime } from '../../../utils/datetime.ts'
import type { Subject } from '../../types.ts'
import FsrsScheduler, { Quality } from '../fsrs.ts'
import type { Assignment } from '../../mod.ts'

const { Good, Easy, Again, Hard } = Quality

Deno.test('FsrsScheduler.add - initializes a new assignment correctly', () => {
  const fsrs = new FsrsScheduler()
  const subject: Subject = {
    id: 'test-subject',
    learnCards: ['front'],
    quizCards: ['back'],
    data: { front: 'Test Front', back: 'Test Back' },
  }

  const assignment = fsrs.add(subject)

  assertEquals(assignment.subjectId, 'test-subject')
  assertEquals(assignment.markedCompleted, false)
  assert(assignment.difficulty !== undefined, 'difficulty initialized')
  assert(assignment.stability !== undefined, 'stability should be initialized')
  assert(assignment.interval === 0, 'interval should start at 0')
  assert(assignment.repetition === 0, 'repetition should start at 0')
})

Deno.test('FsrsScheduler.filter - filters out completed cards', () => {
  const fsrs = new FsrsScheduler()
  const subject: Subject = {
    id: 'test-subject',
    learnCards: [],
    quizCards: [],
    data: {},
  }
  const assignment = {
    subjectId: 'test-subject',
    markedCompleted: true,
    interval: 0,
    repetition: 0,
  }

  assertEquals(fsrs.filter(subject, assignment), false)
})

Deno.test('FsrsScheduler.filter - includes cards due today or earlier', () => {
  const fsrs = new FsrsScheduler()
  const subject: Subject = {
    id: 'test-subject',
    learnCards: [],
    quizCards: [],
    data: {},
  }

  const now = getNow()
  const yesterdayAssignment = {
    subjectId: 'test-subject',
    markedCompleted: false,
    lastStudiedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // yesterday
    interval: 1,
    repetition: 1,
  }

  assertEquals(fsrs.filter(subject, yesterdayAssignment), true)
})

Deno.test('FsrsScheduler.update - updates card with rating 3 (Good)', () => {
  const fsrs = new FsrsScheduler()
  const subject: Subject = {
    id: 'test-subject',
    learnCards: [],
    quizCards: [],
    data: {},
  }
  const assignment = fsrs.add(subject)
  const updatedAssignment = fsrs.update(Good, subject, assignment)
  assert(updatedAssignment.repetition === 1, 'repetition should be incremented')
  assert(updatedAssignment.interval !== undefined, 'interval should be defined')
  assert(updatedAssignment.lastStudiedAt !== undefined, 'lastStudiedAt is set')
  assert(updatedAssignment.stability !== undefined, 'stability is updated')
  assert(updatedAssignment.difficulty !== undefined, 'difficulty is updated')
})

Deno.test('FsrsScheduler.update - resets repetition on Again (1) rating', () => {
  const fsrs = new FsrsScheduler()
  const subject: Subject = {
    id: 'test-subject',
    learnCards: [],
    quizCards: [],
    data: {},
  }

  const assignment = { ...fsrs.add(subject), repetition: 3, interval: 10 }

  const updatedAssignment = fsrs.update(Again, subject, assignment)
  assertEquals(updatedAssignment.repetition, 0, 'repetition should be reset')
  assert(updatedAssignment.interval !== undefined, 'interval should be defined')
  assert(updatedAssignment.lastStudiedAt !== undefined, 'lastStudiedAt exists')
})

Deno.test('FsrsScheduler.sort - sorts by due date with oldest first', () => {
  const fsrs = new FsrsScheduler()
  const subject: Subject = {
    id: 'test-subject',
    learnCards: [],
    quizCards: [],
    data: {},
  }

  const now = getNow()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const assignmentDueYesterday = {
    subjectId: 'test-subject-1',
    markedCompleted: false,
    lastStudiedAt: new Date(yesterday),
    interval: 0,
    repetition: 1,
  }

  const assignmentDueTomorrow = {
    subjectId: 'test-subject-2',
    markedCompleted: false,
    lastStudiedAt: new Date(yesterday),
    interval: 2,
    repetition: 1,
  }

  // Should sort with the older due date first
  assertEquals(
    fsrs.sort(
      [subject, assignmentDueYesterday],
      [subject, assignmentDueTomorrow],
    ) < 0,
    true,
    'Card due yesterday should come before card due tomorrow',
  )
})

Deno.test('FsrsScheduler.update - intervals', async (t) => {
  try {
    const testDate = new Date()
    setMockTime(testDate)

    const fsrs = new FsrsScheduler()
    const subject: Subject = {
      id: 'test-subject',
      learnCards: [],
      quizCards: [],
      data: {},
    }

    let assignment: Assignment = fsrs.add(subject)

    const intervals = [assignment.interval]
    ;[
      Hard,
      Again,
      Good,
      Good,
      Hard,
      Hard,
      Hard,
      Good,
      Easy,
      Easy,
      Easy,
      Easy,
      Easy,
      Again,
      Easy,
      Easy,
    ].forEach(
      (grade) => {
        assignment = fsrs.update(grade, subject, assignment)
        intervals.push(assignment.interval)
        const advanceDays = assignment.interval! + (10 / (24 * 60))

        testDate.setDate(testDate.getDate() + Math.floor(advanceDays))
        testDate.setHours(
          testDate.getHours() + Math.floor((advanceDays % 1) * 24),
        )
      },
    )
    await assertSnapshot(t, intervals, 'intervals')
  } finally {
    setMockTime(null)
  }
})

Deno.test('FsrsScheduler.update - Good/Easy intervals', async (t) => {
  try {
    const testDate = new Date('2024-01-01')
    setMockTime(testDate)

    const fsrs = new FsrsScheduler()
    const subject1: Subject = {
      id: 'test-subject',
      learnCards: [],
      quizCards: [],
      data: {},
    }
    const subject2: Subject = {
      id: 'test-subject',
      learnCards: [],
      quizCards: [],
      data: {},
    }

    let assignment1: Assignment = fsrs.add(subject1)
    let assignment2: Assignment = fsrs.add(subject2)

    const intervals1 = [assignment1.interval]
    const intervals2 = [assignment2.interval]
    for (let i = 0; i < 3; i++) {
      assignment1 = fsrs.update(Good, subject1, assignment1)
      assignment2 = fsrs.update(Easy, subject2, assignment2)
      intervals1.push(assignment1.interval)
      intervals2.push(assignment2.interval)
      const maxTime = Math.max(assignment1.interval!, assignment2.interval!)
      const advanceDays = maxTime + (10 / (24 * 60))
      testDate.setDate(testDate.getDate() + Math.floor(advanceDays))
      testDate.setHours(
        testDate.getHours() + Math.floor((advanceDays % 1) * 24),
      )
      setMockTime(testDate)
    }
    await assertSnapshot(t, intervals1, 'good')
    await assertSnapshot(t, intervals2, 'easy')
  } finally {
    setMockTime(null)
  }
})
