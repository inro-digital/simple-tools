import { assert, assertEquals } from '@std/assert'
import type { Assignment, Subject } from '../../types.ts'
import StaticProgressScheduler from '../static_progress.ts'
import FsrsProgressScheduler, {
  Quality as FsrsQuality,
} from '../fsrs_progress.ts'
import Sm2ProgressScheduler, { Quality as Sm2Quality } from '../sm2_progress.ts'
import ProgressScheduler from '../progress_scheduler.ts'
import StaticIntervalScheduler from '../static_intervals.ts'
import FsrsScheduler from '../fsrs.ts'
import Sm2Scheduler from '../sm2.ts'
import {
  efactorExtractor,
  type ProgressThresholds,
  repetitionExtractor,
} from '../../utils/progress.ts'

const testSubject: Subject = {
  id: 'test-subject',
  learnCards: ['front'],
  quizCards: ['back'],
  data: {
    level: 1,
    position: 0,
    intervalSystemId: 1,
    srsId: 1,
    front: 'Test question',
    back: 'Test answer',
  },
}

const customThresholds: ProgressThresholds = {
  id: 1,
  name: 'Custom',
  unlocksAt: 0,
  startsAt: 1,
  passesAt: 2,
  completesAt: 5,
}

Deno.test('Composable System - Any scheduler can be wrapped with progress', () => {
  // Wrap pure FSRS with progress tracking
  const fsrsWithProgress = new ProgressScheduler({
    scheduler: new FsrsScheduler(),
    userLevel: 1,
    thresholds: customThresholds,
    progressExtractor: repetitionExtractor,
  })

  // Wrap pure SM2 with progress tracking
  const sm2WithProgress = new ProgressScheduler({
    scheduler: new Sm2Scheduler(),
    userLevel: 1,
    thresholds: customThresholds,
    progressExtractor: repetitionExtractor,
  })

  // Wrap static intervals with progress tracking
  const staticWithProgress = new ProgressScheduler({
    scheduler: new StaticIntervalScheduler(),
    userLevel: 1,
    thresholds: customThresholds,
    progressExtractor: efactorExtractor,
  })

  // All should create assignments with progress data
  const fsrsAssignment = fsrsWithProgress.add(testSubject)
  const sm2Assignment = sm2WithProgress.add(testSubject)
  const staticAssignment = staticWithProgress.add(testSubject)

  assert(fsrsAssignment.unlockedAt, 'FSRS assignment has unlock date')
  assert(sm2Assignment.unlockedAt, 'SM2 assignment has unlock date')
  assert(staticAssignment.unlockedAt, 'Static assignment has unlock date')

  // All should respect level filtering
  const higherLevelSubject = {
    ...testSubject,
    data: { ...testSubject.data, level: 5 },
  }
  assert(
    !fsrsWithProgress.filter(higherLevelSubject, fsrsAssignment),
    'FSRS respects level filtering',
  )
  assert(
    !sm2WithProgress.filter(higherLevelSubject, sm2Assignment),
    'SM2 respects level filtering',
  )
  assert(
    !staticWithProgress.filter(higherLevelSubject, staticAssignment),
    'Static respects level filtering',
  )
})

Deno.test('Composable System - Different progress extractors work correctly', () => {
  // Test repetition-based progress (FSRS, SM2)
  const fsrsScheduler = new ProgressScheduler({
    scheduler: new FsrsScheduler(),
    userLevel: 1,
    thresholds: customThresholds,
    progressExtractor: repetitionExtractor,
  })

  let fsrsAssignment = fsrsScheduler.add(testSubject)
  fsrsAssignment = fsrsScheduler.update(
    FsrsQuality.Good,
    testSubject,
    fsrsAssignment,
  )
  fsrsAssignment = fsrsScheduler.update(
    FsrsQuality.Good,
    testSubject,
    fsrsAssignment,
  )
  assert(fsrsAssignment.passedAt, 'FSRS assignment passed after 2 reps')

  // Test efactor-based progress (Static)
  const staticScheduler = new ProgressScheduler({
    scheduler: new StaticIntervalScheduler(),
    userLevel: 1,
    thresholds: customThresholds,
    progressExtractor: efactorExtractor,
  })

  let staticAssignment = staticScheduler.add(testSubject)
  staticAssignment = staticScheduler.update(true, testSubject, staticAssignment)
  staticAssignment = staticScheduler.update(true, testSubject, staticAssignment)
  assert(staticAssignment.passedAt, 'Static assignment passed after efactor 2')
})

Deno.test('Composable System - Pre-built schedulers maintain compatibility', () => {
  const staticProgress = new StaticProgressScheduler({ userLevel: 1 })
  const fsrsProgress = new FsrsProgressScheduler({ userLevel: 1 })
  const sm2Progress = new Sm2ProgressScheduler({ userLevel: 1 })

  // All should create compatible assignments
  const staticAssignment = staticProgress.add(testSubject)
  const fsrsAssignment = fsrsProgress.add(testSubject)
  const sm2Assignment = sm2Progress.add(testSubject)

  // All should have required progress fields
  assert(staticAssignment.unlockedAt, 'Static has unlock date')
  assert(fsrsAssignment.unlockedAt, 'FSRS has unlock date')
  assert(sm2Assignment.unlockedAt, 'SM2 has unlock date')

  // All should respect user level
  assertEquals(staticProgress.userLevel, 1)
  assertEquals(fsrsProgress.userLevel, 1)
  assertEquals(sm2Progress.userLevel, 1)

  // User level can be updated
  staticProgress.userLevel = 5
  fsrsProgress.userLevel = 5
  sm2Progress.userLevel = 5

  assertEquals(staticProgress.userLevel, 5)
  assertEquals(fsrsProgress.userLevel, 5)
  assertEquals(sm2Progress.userLevel, 5)
})

Deno.test('Composable System - Progress states work across all schedulers', () => {
  // Test StaticProgressScheduler
  const staticScheduler = new StaticProgressScheduler({ userLevel: 1 })
  let staticAssignment = staticScheduler.add(testSubject)
  assertEquals(
    staticAssignment.passedAt,
    undefined,
    'StaticProgressScheduler: not passed initially',
  )
  assertEquals(
    staticAssignment.completedAt,
    undefined,
    'StaticProgressScheduler: not completed initially',
  )

  for (let i = 0; i < 3; i++) {
    staticAssignment = staticScheduler.update(
      true,
      testSubject,
      staticAssignment,
    )
  }
  assert(
    staticAssignment.passedAt,
    'StaticProgressScheduler: passed after 3 updates',
  )
  assertEquals(
    staticAssignment.completedAt,
    undefined,
    'StaticProgressScheduler: not completed at 3 reps',
  )

  for (let i = 0; i < 7; i++) {
    staticAssignment = staticScheduler.update(
      true,
      testSubject,
      staticAssignment,
    )
  }
  assert(
    staticAssignment.completedAt,
    'StaticProgressScheduler: completed after 10 updates',
  )

  // Test FsrsProgressScheduler
  const fsrsScheduler = new FsrsProgressScheduler({ userLevel: 1 })
  let fsrsAssignment = fsrsScheduler.add(testSubject)
  assertEquals(
    fsrsAssignment.passedAt,
    undefined,
    'FsrsProgressScheduler: not passed initially',
  )
  assertEquals(
    fsrsAssignment.completedAt,
    undefined,
    'FsrsProgressScheduler: not completed initially',
  )

  for (let i = 0; i < 3; i++) {
    fsrsAssignment = fsrsScheduler.update(
      FsrsQuality.Good,
      testSubject,
      fsrsAssignment,
    )
  }
  assert(
    fsrsAssignment.passedAt,
    'FsrsProgressScheduler: passed after 3 updates',
  )
  assertEquals(
    fsrsAssignment.completedAt,
    undefined,
    'FsrsProgressScheduler: not completed at 3 reps',
  )

  for (let i = 0; i < 7; i++) {
    fsrsAssignment = fsrsScheduler.update(
      FsrsQuality.Good,
      testSubject,
      fsrsAssignment,
    )
  }
  assert(
    fsrsAssignment.completedAt,
    'FsrsProgressScheduler: completed after 10 updates',
  )

  // Test Sm2ProgressScheduler
  const sm2Scheduler = new Sm2ProgressScheduler({ userLevel: 1 })
  let sm2Assignment = sm2Scheduler.add(testSubject)
  assertEquals(
    sm2Assignment.passedAt,
    undefined,
    'Sm2ProgressScheduler: not passed initially',
  )
  assertEquals(
    sm2Assignment.completedAt,
    undefined,
    'Sm2ProgressScheduler: not completed initially',
  )

  for (let i = 0; i < 3; i++) {
    sm2Assignment = sm2Scheduler.update(
      Sm2Quality.Correct,
      testSubject,
      sm2Assignment,
    )
  }
  assert(sm2Assignment.passedAt, 'Sm2ProgressScheduler: passed after 3 updates')
  assertEquals(
    sm2Assignment.completedAt,
    undefined,
    'Sm2ProgressScheduler: not completed at 3 reps',
  )

  for (let i = 0; i < 7; i++) {
    sm2Assignment = sm2Scheduler.update(
      Sm2Quality.Correct,
      testSubject,
      sm2Assignment,
    )
  }
  assert(
    sm2Assignment.completedAt,
    'Sm2ProgressScheduler: completed after 10 updates',
  )
})

Deno.test('Composable System - Required subjects work across all schedulers', () => {
  const prerequisiteSubject: Subject = {
    id: 'prerequisite',
    learnCards: ['front'],
    quizCards: ['back'],
    data: {
      level: 1,
      position: 0,
      intervalSystemId: 1,
      srsId: 1,
      front: 'Prerequisite',
      back: 'Answer',
    },
  }

  const dependentSubject: Subject = {
    id: 'dependent',
    learnCards: ['front'],
    quizCards: ['back'],
    data: {
      level: 1,
      position: 1,
      intervalSystemId: 1,
      srsId: 1,
      requiredSubjects: ['prerequisite'],
      front: 'Dependent',
      back: 'Answer',
    },
  }

  // Test StaticProgressScheduler
  const staticScheduler = new StaticProgressScheduler({ userLevel: 1 })
  const staticPrereqAssignment = staticScheduler.add(prerequisiteSubject)
  const staticBaseAssignment = staticScheduler.add(dependentSubject)
  const staticDependentAssignment = {
    ...staticBaseAssignment,
    startedAt: undefined,
  }

  const staticAll: Record<string, Assignment> = {
    [prerequisiteSubject.id]: staticPrereqAssignment,
    [dependentSubject.id]: staticDependentAssignment,
  }

  assert(
    !staticScheduler.filterLearnable(
      dependentSubject,
      staticDependentAssignment,
      staticAll,
    ),
    'StaticProgressScheduler: blocks learning without prerequisites',
  )

  let staticUpdatedPrereq = staticPrereqAssignment
  for (let i = 0; i < 3; i++) {
    staticUpdatedPrereq = staticScheduler.update(
      true,
      prerequisiteSubject,
      staticUpdatedPrereq,
    )
  }
  staticAll[prerequisiteSubject.id] = staticUpdatedPrereq

  assert(
    staticScheduler.filterLearnable(
      dependentSubject,
      staticDependentAssignment,
      staticAll,
    ),
    'StaticProgressScheduler: allows learning with met prerequisites',
  )

  // Test FsrsProgressScheduler
  const fsrsScheduler = new FsrsProgressScheduler({ userLevel: 1 })
  const fsrsPrereqAssignment = fsrsScheduler.add(prerequisiteSubject)
  const fsrsBaseAssignment = fsrsScheduler.add(dependentSubject)
  const fsrsDependentAssignment = {
    ...fsrsBaseAssignment,
    startedAt: undefined,
  }

  const fsrsAll: Record<string, Assignment> = {
    [prerequisiteSubject.id]: fsrsPrereqAssignment,
    [dependentSubject.id]: fsrsDependentAssignment,
  }

  assert(
    !fsrsScheduler.filterLearnable(
      dependentSubject,
      fsrsDependentAssignment,
      fsrsAll,
    ),
    'FsrsProgressScheduler: blocks learning without prerequisites',
  )

  let fsrsUpdatedPrereq = fsrsPrereqAssignment
  for (let i = 0; i < 3; i++) {
    fsrsUpdatedPrereq = fsrsScheduler.update(
      FsrsQuality.Good,
      prerequisiteSubject,
      fsrsUpdatedPrereq,
    )
  }
  fsrsAll[prerequisiteSubject.id] = fsrsUpdatedPrereq

  assert(
    fsrsScheduler.filterLearnable(
      dependentSubject,
      fsrsDependentAssignment,
      fsrsAll,
    ),
    'FsrsProgressScheduler: allows learning with met prerequisites',
  )

  // Test Sm2ProgressScheduler
  const sm2Scheduler = new Sm2ProgressScheduler({ userLevel: 1 })
  const sm2PrereqAssignment = sm2Scheduler.add(prerequisiteSubject)
  const sm2BaseAssignment = sm2Scheduler.add(dependentSubject)
  const sm2DependentAssignment = { ...sm2BaseAssignment, startedAt: undefined }

  const sm2All: Record<string, Assignment> = {
    [prerequisiteSubject.id]: sm2PrereqAssignment,
    [dependentSubject.id]: sm2DependentAssignment,
  }

  assert(
    !sm2Scheduler.filterLearnable(
      dependentSubject,
      sm2DependentAssignment,
      sm2All,
    ),
    'Sm2ProgressScheduler: blocks learning without prerequisites',
  )

  let sm2UpdatedPrereq = sm2PrereqAssignment
  for (let i = 0; i < 3; i++) {
    sm2UpdatedPrereq = sm2Scheduler.update(
      Sm2Quality.Correct,
      prerequisiteSubject,
      sm2UpdatedPrereq,
    )
  }
  sm2All[prerequisiteSubject.id] = sm2UpdatedPrereq

  assert(
    sm2Scheduler.filterLearnable(
      dependentSubject,
      sm2DependentAssignment,
      sm2All,
    ),
    'Sm2ProgressScheduler: allows learning with met prerequisites',
  )
})

Deno.test('Composable System - Pure schedulers work without progress', () => {
  const pureStatic = new StaticIntervalScheduler()
  const pureFsrs = new FsrsScheduler()
  const pureSm2 = new Sm2Scheduler()

  // Pure schedulers should work without level/progress data
  const simpleSubject: Subject = {
    id: 'simple',
    learnCards: ['q'],
    quizCards: ['a'],
    data: {
      intervalSystemId: 1,
      q: 'Question?',
      a: 'Answer',
    },
  }

  const staticAssignment = pureStatic.add(simpleSubject)
  const fsrsAssignment = pureFsrs.add(simpleSubject)
  const sm2Assignment = pureSm2.add(simpleSubject)

  // Should not have progress data
  assertEquals(staticAssignment.unlockedAt, undefined)
  assertEquals(fsrsAssignment.unlockedAt, undefined)
  assertEquals(sm2Assignment.unlockedAt, undefined)

  // Should still be updatable
  const updatedStatic = pureStatic.update(true, simpleSubject, staticAssignment)
  const updatedFsrs = pureFsrs.update(
    FsrsQuality.Good,
    simpleSubject,
    fsrsAssignment,
  )
  const updatedSm2 = pureSm2.update(
    Sm2Quality.Correct,
    simpleSubject,
    sm2Assignment,
  )

  assert(
    updatedStatic.interval !== undefined,
    'Static still calculates intervals',
  )
  assert(updatedFsrs.interval !== undefined, 'FSRS still calculates intervals')
  assert(updatedSm2.interval !== undefined, 'SM2 still calculates intervals')
})
