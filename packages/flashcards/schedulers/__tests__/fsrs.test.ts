import { assert, assertEquals } from '@std/assert'
import FsrsScheduler from '../fsrs.ts'
import type { Subject } from '../../types.ts'
import { getNow } from '../../utils/datetime.ts'

Deno.test('FsrsScheduler.add - initializes a new assignment correctly', () => {
  const fsrs = new FsrsScheduler()
  const subject: Subject = {
    id: 'test-subject',
    learnKeys: ['front'],
    quizKeys: ['back'],
    data: { front: 'Test Front', back: 'Test Back' },
  }

  const assignment = fsrs.add(subject)

  assertEquals(assignment.subjectId, 'test-subject')
  assertEquals(assignment.markedCompleted, false)
  assert(
    assignment.difficulty !== undefined,
    'difficulty should be initialized',
  )
  assert(assignment.stability !== undefined, 'stability should be initialized')
  assert(assignment.interval === 0, 'interval should start at 0')
  assert(assignment.repetition === 0, 'repetition should start at 0')
})

Deno.test('FsrsScheduler.filter - filters out completed cards', () => {
  const fsrs = new FsrsScheduler()
  const subject: Subject = {
    id: 'test-subject',
    learnKeys: [],
    quizKeys: [],
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
    learnKeys: [],
    quizKeys: [],
    data: {},
  }

  // Card due today
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
    learnKeys: [],
    quizKeys: [],
    data: {},
  }

  // New card with default parameters
  const assignment = fsrs.add(subject)

  // Update with "Good" rating (3)
  const updatedAssignment = fsrs.update(3, subject, assignment)

  // Verify updated values
  assert(updatedAssignment.repetition === 1, 'repetition should be incremented')
  assert(updatedAssignment.interval !== undefined, 'interval should be defined')
  assert(
    updatedAssignment.lastStudiedAt !== undefined,
    'lastStudiedAt should be set',
  )
  assert(
    updatedAssignment.stability !== undefined,
    'stability should be updated',
  )
  assert(
    updatedAssignment.difficulty !== undefined,
    'difficulty should be updated',
  )
})

Deno.test('FsrsScheduler.update - resets repetition on Again (1) rating', () => {
  const fsrs = new FsrsScheduler()
  const subject: Subject = {
    id: 'test-subject',
    learnKeys: [],
    quizKeys: [],
    data: {},
  }

  // Card with some history
  const assignment = {
    ...fsrs.add(subject),
    repetition: 3,
    interval: 10,
  }

  // Update with "Again" rating (1)
  const updatedAssignment = fsrs.update(1, subject, assignment)

  // Verify updated values
  assertEquals(
    updatedAssignment.repetition,
    0,
    'repetition should be reset to 0',
  )
  assert(updatedAssignment.interval !== undefined, 'interval should be defined')
  assert(
    updatedAssignment.lastStudiedAt !== undefined,
    'lastStudiedAt should be updated',
  )
})

Deno.test('FsrsScheduler.sort - sorts by due date with oldest first', () => {
  const fsrs = new FsrsScheduler()
  const subject: Subject = {
    id: 'test-subject',
    learnKeys: [],
    quizKeys: [],
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
    fsrs.sort([subject, assignmentDueYesterday], [
      subject,
      assignmentDueTomorrow,
    ]) < 0,
    true,
    'Card due yesterday should come before card due tomorrow',
  )
})
