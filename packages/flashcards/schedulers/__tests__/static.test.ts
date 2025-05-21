import { assert, assertEquals } from '@std/assert'
import type { Assignment, Subject } from '../../types.ts'
import StaticScheduler, { type Srs } from '../static.ts'

const srs: Record<number, Srs> = {
  [1]: {
    id: 1,
    name: 'SRS 1',
    unlocksAt: 0,
    startsAt: 1,
    passesAt: 2,
    completesAt: 6,
    intervals: [0, 10, 100, 1000, 10000],
  },
  [2]: {
    id: 2,
    name: 'SRS 2',
    unlocksAt: 0,
    startsAt: 1,
    passesAt: 2,
    completesAt: 6,
    intervals: [0, 20, 200, 2000, 20000],
  },
}

const sA: Subject = {
  id: 'my-subject-a',
  learnCards: [],
  quizCards: [],
  data: {
    level: 1,
    position: 2,
    srsId: 1,
  },
}

const sB = {
  id: 'my-subject-b',
  learnCards: [],
  quizCards: [],
  data: {
    level: 3,
    position: 1,
    srsId: 1,
  },
}

const sC = {
  id: 'my-subject-c',
  learnCards: [],
  quizCards: [],
  data: {
    level: 3,
    position: 2,
    srsId: 1,
  },
}

Deno.test('init', () => {
  const sched = new StaticScheduler({ srs, userLevel: 2 })
  const assignment = sched.add(sA)
  assert(assignment.availableAt, 'should be available')
  assertEquals(assignment.efactor, 0, 'should start at efactor 0')
  assertEquals(assignment.interval, 0, 'should start at efactor 0')
})

Deno.test('filter', () => {
  const sched = new StaticScheduler({ srs, userLevel: 2 })
  let aA = { ...sched.add(sA), markedCompleted: true }
  assert(sched.filter(sA, aA) === false, 'false if marked complete')

  aA = { ...sched.add(sA), markedCompleted: false, completedAt: new Date() }
  assert(sched.filter(sA, aA) === false, 'false if completed')

  assert(sched.filter(sA, sched.add(sA)) === true, 'true if lower level')
  assert(sched.filter(sB, sched.add(sB)) === false, 'false if higher level')
})

Deno.test('sort', () => {
  const sched = new StaticScheduler({ srs, userLevel: 2 })
  const aA = sched.add(sA)
  const aB = sched.add(sB)
  const aC = sched.add(sC)
  assert(sched.sort([sA, aA], [sB, aB]) < 0, 'sort by level')
  assert(sched.sort([sB, aB], [sA, aA]) > 0, 'sort by level')

  assert(sched.sort([sB, aB], [sC, aC]) < 0, 'sort by lessonOrder')
  assert(sched.sort([sC, aC], [sB, aB]) > 0, 'sort by lessonOrder')
})

Deno.test('requiredSubjects', () => {
  const sched = new StaticScheduler({ srs, userLevel: 10 })

  const subjectWithPrereq: Subject = {
    id: 'subject-with-prereq',
    learnCards: [],
    quizCards: [],
    data: {
      level: 5,
      position: 1,
      srsId: 1,
      requiredSubjects: ['my-subject-a'],
    },
  }

  const assignmentA = sched.add(sA)
  const assignmentWithPrereq = {
    ...sched.add(subjectWithPrereq),
    startedAt: undefined,
  }

  const all: Record<string, Assignment> = {
    [sA.id]: assignmentA,
    [subjectWithPrereq.id]: assignmentWithPrereq,
  }

  assert(
    !sched.filterLearnable(subjectWithPrereq, assignmentWithPrereq, all),
    'Subject with unmet prerequisites should not be learnable',
  )

  const passedAssignmentA = { ...assignmentA, passedAt: new Date(), efactor: 2 }

  all[sA.id] = passedAssignmentA

  assert(
    sched.filterLearnable(subjectWithPrereq, assignmentWithPrereq, all),
    'Subject with met prerequisites should be learnable',
  )

  const subjectWithMultiPrereqs: Subject = {
    id: 'subject-with-multi-prereqs',
    learnCards: [],
    quizCards: [],
    data: {
      level: 5,
      position: 2,
      srsId: 1,
      requiredSubjects: ['my-subject-a', 'my-subject-b'],
    },
  }

  const assignmentWithMultiPrereqs = {
    ...sched.add(subjectWithMultiPrereqs),
    startedAt: undefined,
  }
  all[subjectWithMultiPrereqs.id] = assignmentWithMultiPrereqs

  const assignmentB = sched.add(sB)
  all[sB.id] = assignmentB

  assert(
    !sched.filterLearnable(
      subjectWithMultiPrereqs,
      assignmentWithMultiPrereqs,
      all,
    ),
    'Subject with partially met prerequisites should not be learnable',
  )

  const passedAssignmentB = { ...assignmentB, passedAt: new Date(), efactor: 2 }
  all[sB.id] = passedAssignmentB

  assert(
    sched.filterLearnable(
      subjectWithMultiPrereqs,
      assignmentWithMultiPrereqs,
      all,
    ),
    'Subject with all prerequisites met should be learnable',
  )
})

Deno.test('update', () => {
  const sched = new StaticScheduler({ srs, userLevel: 2 })

  const success = sched.update(true, sA, sched.add(sA))
  assertEquals(success.efactor, 1, 'on success: efactor++')
  assertEquals(success.interval, srs[1].intervals[1], 'on success: interval')

  const success2 = sched.update(true, sA, success)
  assertEquals(success2.efactor, 2, 'on success: efactor++')
  assertEquals(success2.interval, srs[1].intervals[2], 'on success: interval')

  const failure = sched.update(false, sA, success2)
  assertEquals(failure.efactor, 1, 'on fail: efactor--')
  assertEquals(failure.interval, srs[1].intervals[1], 'on fail: interval')
})
