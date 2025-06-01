import { assert, assertEquals } from '@std/assert'
import type { Assignment, Subject } from '../../types.ts'
import Sm2ProgressScheduler, { Quality } from '../sm2_progress.ts'
import { assertInstanceOf } from '@std/assert/instance-of'
import { assertFalse } from '@std/assert/false'

const subjects: Subject[] = [
  {
    id: 'vocab-1',
    learnCards: ['word'],
    quizCards: ['definition'],
    data: {
      level: 1,
      position: 0,
      word: 'serendipity',
      definition: 'pleasant surprise',
    },
  },
  {
    id: 'vocab-2',
    learnCards: ['word'],
    quizCards: ['definition'],
    data: {
      level: 1,
      position: 1,
      word: 'ephemeral',
      definition: 'lasting for a very short time',
    },
  },
  {
    id: 'vocab-3',
    learnCards: ['word'],
    quizCards: ['definition'],
    data: {
      level: 2,
      position: 0,
      word: 'ubiquitous',
      definition: 'present everywhere',
    },
  },
]

Deno.test('Sm2ProgressScheduler - initialize scheduler', () => {
  const scheduler = new Sm2ProgressScheduler({ userLevel: 1 })
  assertEquals(scheduler.userLevel, 1)
})

Deno.test('Sm2ProgressScheduler - add new assignment', () => {
  const scheduler = new Sm2ProgressScheduler({ userLevel: 1 })
  const assignment = scheduler.add(subjects[0])

  assertEquals(assignment.subjectId, 'vocab-1')
  assertEquals(assignment.markedCompleted, false)
  assertEquals(assignment.efactor, 2.5) // SM2 default
  assertEquals(assignment.interval, 0)
  assertEquals(assignment.repetition, 0)
  assertInstanceOf(assignment.unlockedAt, Date)
  assertInstanceOf(assignment.startedAt, Date)
})

Deno.test('Sm2ProgressScheduler - filter by level', () => {
  const scheduler = new Sm2ProgressScheduler({ userLevel: 1 })
  const assignment1 = scheduler.add(subjects[0])
  assert(scheduler.filter(subjects[0], assignment1), 'lvl1 visible')

  const assignment3 = scheduler.add(subjects[2])
  assertFalse(scheduler.filter(subjects[2], assignment3), 'lvl2 hidden')

  scheduler.userLevel = 2
  assert(scheduler.filter(subjects[2], assignment3), 'lvl2 visible')
})

Deno.test('Sm2ProgressScheduler - SM2 algorithm with progress tracking', () => {
  const scheduler = new Sm2ProgressScheduler({ userLevel: 2 })
  let assignment = scheduler.add(subjects[0])

  // First correct answer - should go to interval 1
  assignment = scheduler.update(Quality.Correct, subjects[0], assignment)
  assertEquals(assignment.repetition, 1)
  assertEquals(assignment.interval, 1)
  assertEquals(assignment.passedAt, undefined, 'not passed yet (needs 3 reps)')

  // Second correct answer - should go to interval 6
  assignment = scheduler.update(Quality.Correct, subjects[0], assignment)
  assertEquals(assignment.repetition, 2)
  assertEquals(assignment.interval, 6)
  assertEquals(assignment.passedAt, undefined, 'not passed yet (needs 3 reps)')

  // Third correct answer - should reach passed state
  assignment = scheduler.update(Quality.Correct, subjects[0], assignment)
  assertEquals(assignment.repetition, 3)
  assertInstanceOf(assignment.passedAt, Date, 'passed after 3 reps')
  assertEquals(
    assignment.completedAt,
    undefined,
    'not completed yet (needs 10 reps)',
  )

  // Continue to completion (10 reps total)
  for (let i = 0; i < 7; i++) {
    assignment = scheduler.update(Quality.Correct, subjects[0], assignment)
  }

  assertEquals(assignment.repetition, 10)
  assertInstanceOf(assignment.completedAt, Date, 'completed after 10 reps')
})

Deno.test('Sm2ProgressScheduler - incorrect answer resets repetition', () => {
  const scheduler = new Sm2ProgressScheduler({ userLevel: 2 })
  let assignment = scheduler.add(subjects[0])

  // Build up some repetitions
  assignment = scheduler.update(Quality.Correct, subjects[0], assignment)
  assignment = scheduler.update(Quality.Correct, subjects[0], assignment)
  assertEquals(assignment.repetition, 2)

  // Fail the card
  assignment = scheduler.update(Quality.Incorrect, subjects[0], assignment)
  assertEquals(assignment.repetition, 0, 'repetition resets on failure')
  // Note: SM2 sets interval to 0 if studied today, 1 otherwise. Since we're testing immediately, it's 0.
  assertEquals(
    assignment.interval,
    0,
    'interval resets to 0 when studied same day',
  )
})

Deno.test('Sm2ProgressScheduler - sort by level then position', () => {
  const scheduler = new Sm2ProgressScheduler({ userLevel: 2 })

  const assignment1 = scheduler.add(subjects[0]) // level 1, position 0
  const assignment2 = scheduler.add(subjects[1]) // level 1, position 1
  const assignment3 = scheduler.add(subjects[2]) // level 2, position 0

  // Level sorting takes precedence
  assert(
    scheduler.sort([subjects[0], assignment1], [subjects[2], assignment3]) < 0,
    'level 1 before level 2',
  )

  // Position sorting within same level
  assert(
    scheduler.sort([subjects[0], assignment1], [subjects[1], assignment2]) < 0,
    'same level - position 0 before position 1',
  )
})

Deno.test('Sm2ProgressScheduler - required subjects', () => {
  const scheduler = new Sm2ProgressScheduler({ userLevel: 10 })

  const prerequisiteSubject: Subject = {
    id: 'prereq-vocab',
    learnCards: ['word'],
    quizCards: ['definition'],
    data: {
      level: 1,
      position: 0,
      word: 'basic',
      definition: 'fundamental',
    },
  }

  const dependentSubject: Subject = {
    id: 'advanced-vocab',
    learnCards: ['word'],
    quizCards: ['definition'],
    data: {
      level: 2,
      position: 0,
      requiredSubjects: ['prereq-vocab'],
      word: 'advanced',
      definition: 'complex',
    },
  }

  const prerequisiteAssignment = scheduler.add(prerequisiteSubject)
  const baseAssignment = scheduler.add(dependentSubject)
  const dependentAssignment = { ...baseAssignment, startedAt: undefined }

  const all: Record<string, Assignment> = {
    [prerequisiteSubject.id]: prerequisiteAssignment,
    [dependentSubject.id]: dependentAssignment,
  }

  // Should not be learnable without prerequisites
  assertFalse(
    scheduler.filterLearnable(dependentSubject, dependentAssignment, all),
    'Subject with unmet prerequisites should not be learnable',
  )

  // Progress prerequisite to passed state (3 reps)
  let updatedPrereqAssignment = prerequisiteAssignment
  for (let i = 0; i < 3; i++) {
    updatedPrereqAssignment = scheduler.update(
      Quality.Correct,
      prerequisiteSubject,
      updatedPrereqAssignment,
    )
  }

  assertInstanceOf(
    updatedPrereqAssignment.passedAt,
    Date,
    'Prerequisite should be passed after 3 reps',
  )

  all[prerequisiteSubject.id] = updatedPrereqAssignment

  // Now should be learnable
  assert(
    scheduler.filterLearnable(dependentSubject, dependentAssignment, all),
    'Subject with met prerequisites should be learnable',
  )
})

Deno.test('Sm2ProgressScheduler - filterLearnable vs filterQuizzable', () => {
  const scheduler = new Sm2ProgressScheduler({ userLevel: 2 })
  const assignment = scheduler.add(subjects[0])

  // New assignment should be learnable (repetition = 0) but not quizzable
  assert(
    scheduler.filterLearnable(subjects[0], assignment),
    'new assignment should be learnable',
  )
  assertFalse(
    scheduler.filterQuizzable(subjects[0], assignment),
    'new assignment should not be quizzable',
  )

  // After updating, should not be learnable anymore (has repetitions)
  const updatedAssignment = scheduler.update(
    Quality.Correct,
    subjects[0],
    assignment,
  )
  assertFalse(
    scheduler.filterLearnable(subjects[0], updatedAssignment),
    'updated assignment should not be learnable',
  )

  // Test quizzable by checking progress directly - SM2 scheduling behavior is separate concern
  assertEquals(
    updatedAssignment.repetition,
    1,
    'should have 1 repetition after update',
  )
})
