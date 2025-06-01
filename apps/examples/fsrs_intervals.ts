import { FSRS } from 'ts-fsrs'
import { DAY_MS, getNow } from '../../packages/utils/datetime.ts'
import {
  defaultFsrsThresholds,
  FsrsProgressScheduler,
  FsrsQuality,
  type Subject,
} from '@inro/simple-tools/flashcards'

// Create a test subject
const subject: Subject = {
  id: 'test-subject',
  learnCards: ['front'],
  quizCards: ['back'],
  data: {
    level: 1,
    srsId: 1, // Default SRS
    position: 0,
    front: 'Test Question',
    back: 'Test Answer',
  },
}

// Create a fast SRS subject
const fastSubject: Subject = {
  id: 'fast-subject',
  learnCards: ['front'],
  quizCards: ['back'],
  data: {
    level: 1,
    srsId: 2, // Fast SRS
    position: 0,
    front: 'Fast Test Question',
    back: 'Fast Test Answer',
  },
}

/**
 * Test the progression of intervals for both SRS systems
 * Expected intervals for Default SRS: [0.5, 1, 3, 7, 14, 23, 35, 50, 65, 85]
 * Expected intervals for Fast SRS: [0.5, 1, 2, 5, 12, 25, 40, 55]
 */
function main() {
  console.log('=== Testing Default SRS Progression ===')
  console.log('Expected intervals: [0.5, 1, 3, 7, 14, 23, 35, 50, 65, 85]')

  const defaultScheduler = new FsrsProgressScheduler({ userLevel: 1 })
  let assignment = defaultScheduler.add(subject)
  const defaultIntervals = []

  // Simulate 15 repetitions to see the progression
  for (let i = 0; i < 15; i++) {
    assignment = defaultScheduler.update(FsrsQuality.Good, subject, assignment)
    defaultIntervals.push(assignment.interval)

    console.log(`Repetition ${i + 1}: Interval = ${assignment.interval} days`)

    if (i + 1 === defaultFsrsThresholds[1].passesAt) {
      console.log(`  * Passed threshold reached at repetition ${i + 1}`)
    }

    if (i + 1 === defaultFsrsThresholds[1].completesAt) {
      console.log(`  * Completion threshold reached at repetition ${i + 1}`)
    }
  }

  console.log('\n=== Testing Fast SRS Progression ===')
  console.log('Expected intervals: [0.5, 1, 2, 5, 12, 25, 40, 55]')

  const fastScheduler = new FsrsProgressScheduler({ userLevel: 1 })
  let fastAssignment = fastScheduler.add(fastSubject)
  const fastIntervals = []

  // Simulate 12 repetitions for Fast SRS
  for (let i = 0; i < 12; i++) {
    fastAssignment = fastScheduler.update(
      FsrsQuality.Good,
      fastSubject,
      fastAssignment,
    )
    fastIntervals.push(fastAssignment.interval)

    console.log(
      `Repetition ${i + 1}: Interval = ${fastAssignment.interval} days`,
    )

    if (i + 1 === defaultFsrsThresholds[2].passesAt) {
      console.log(`  * Passed threshold reached at repetition ${i + 1}`)
    }

    if (i + 1 === defaultFsrsThresholds[2].completesAt) {
      console.log(`  * Completion threshold reached at repetition ${i + 1}`)
    }
  }

  // Compare with raw FSRS parameters
  console.log('\n=== Direct FSRS Calculations (Default SRS) ===')
  testDirectFsrs(1)

  console.log('\n=== Direct FSRS Calculations (Fast SRS) ===')
  testDirectFsrs(2)

  // Summary
  console.log('\n=== Summary ===')
  console.log('Default SRS intervals:', JSON.stringify(defaultIntervals))
  console.log('Fast SRS intervals:', JSON.stringify(fastIntervals))
}

/**
 * Test using FSRS directly without the scheduler
 */
function testDirectFsrs(srsId: number) {
  const srs = defaultFsrsThresholds[srsId]
  const fsrs = new FSRS(srs.fsrsParams!)
  const now = getNow()

  let state = {
    due: now,
    stability: 0,
    difficulty: 0.3,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    last_review: now,
    state: 1, // New
    learning_steps: 0,
  }

  const intervals = []

  for (let i = 0; i < (srsId === 1 ? 15 : 12); i++) {
    const result = fsrs.repeat(state, now)[FsrsQuality.Good]

    if (!result.card) {
      console.log(`No card returned for repetition ${i + 1}`)
      continue
    }

    const interval = result.card.scheduled_days
    intervals.push(interval)
    console.log(`Repetition ${i + 1}: Interval = ${interval} days`)

    // Update state for next iteration
    state = {
      due: new Date(now.getTime() + (interval * DAY_MS)),
      stability: result.card.stability,
      difficulty: result.card.difficulty,
      elapsed_days: interval,
      scheduled_days: interval,
      reps: state.reps + 1,
      lapses: state.lapses,
      last_review: now,
      state: result.card.state,
      learning_steps: result.card.learning_steps || 0,
    }
  }

  console.log('Direct FSRS intervals:', JSON.stringify(intervals))
}

// Run the test
if (import.meta.main) {
  main()
}
