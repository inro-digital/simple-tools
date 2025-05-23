/**
 * @module
 * A scheduler implementing Free Spaced Repetition Scheduler (FSRS).
 * @reference https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler
 * @reference https://github.com/open-spaced-repetition/ts-fsrs
 */
import {
  default_maximum_interval,
  default_request_retention,
  default_w,
  FSRS,
  State,
} from 'ts-fsrs'
import { DAY_MS, getNow, isSameDay } from '../../utils/datetime.ts'
import Scheduler from '../scheduler.ts'
import type { Assignment, Subject } from '../types.ts'

/** Quality levels for FSRS */
export enum Quality {
  /** Complete failure to recall */
  Again = 1,
  /** Recalled with significant difficulty */
  Hard = 2,
  /** Recalled with some effort */
  Good = 3,
  /** Recalled with no effort */
  Easy = 4,
}

/** Custom Adjustments to the algorithm */
export interface Params {
  /** Weights affet things like initial intervale length, growth rate, impact of difficulty, etc */
  w: readonly number[]
  /** Target retention rate (85% == aims for you to remember 85% of the cards) */
  requestRetention: number
  /** maximum interval between reviews  */
  maximumInterval: number
  enableShortTerm: boolean
}

/** Default parameters of the Fsrs scheduler */
export const defaultParams: Params = {
  w: default_w,
  requestRetention: default_request_retention,
  maximumInterval: default_maximum_interval,
  enableShortTerm: false,
}

/**
 * A scheduler for working with the fsrs algorithm
 * @example
 * ```
 *   import FsrsScheduler, { Quality } from '@inro/simple-tools/flashcards/schedulers/fsrs'
 *   const scheduler = new FsrsScheduler()
 *
 *   // Create FSRS scheduler with custom parameters
 *   const customScheduler = new FsrsScheduler({
 *     requestRetention: 0.85, // Target retention rate (0-1)
 *     maximumInterval: 36500, // Maximum interval in days
 *     w: [0.4, 0.6, 2.4, 5.8],
 *   })
 *   const assignment = scheduler.add(subject)
 *   const updatedAssignment = scheduler.update(Quality.Good, subject, assignment)
 * ```
 */
export default class FsrsScheduler extends Scheduler<number> {
  private fsrs: FSRS

  /** Initialize with fsrs params */
  constructor(params: Partial<Params> = defaultParams) {
    super()
    this.fsrs = new FSRS({
      ...defaultParams,
      w: params.w,
      request_retention: params.requestRetention,
      enable_short_term: params.enableShortTerm,
      maximum_interval: params.maximumInterval,
    })
  }

  /**
   * Initializes a new assignment with default FSRS values
   */
  override add(subject: Subject): Assignment {
    return {
      subjectId: subject.id,
      markedCompleted: false,
      difficulty: 0.3,
      stability: 0,
      lapses: 0,
      lastStudiedAt: getNow(),
      interval: 0,
      repetition: 0,
      steps: 0,
      state: State.New,
      startedAt: getNow(),
    }
  }

  override filter(subject: Subject, assignment: Assignment): boolean {
    return this.filterLearnable(subject, assignment) ||
      this.filterQuizzable(subject, assignment)
  }

  /** Only show cards that haven't been started */
  override filterLearnable(_subject: Subject, assignment: Assignment): boolean {
    if (assignment?.startedAt) return false
    return true
  }

  /**
   * Only show cards that have a due date today or in the past
   */
  override filterQuizzable(_subject: Subject, assignment: Assignment): boolean {
    if (!assignment?.startedAt) return false
    if (assignment?.markedCompleted) return false
    const due = getDueDate(assignment)
    return !due || (due <= getNow())
  }

  /**
   * Sort by due date (oldest first). If same day, sort randomly.
   */
  override sort(
    [_subjectA, assignmentA]: [Subject, Assignment],
    [_subjectB, assignmentB]: [Subject, Assignment],
  ): number {
    if (!assignmentA) return -1
    if (!assignmentB) return 1
    const aDue = getDueDate(assignmentA)
    const bDue = getDueDate(assignmentB)
    if (!aDue && bDue) return -1
    if (!bDue && aDue) return 1
    if (!aDue || !bDue) return (Math.random() - 0.5)
    if (isSameDay(aDue, bDue)) return (Math.random() - 0.5)
    return (aDue.getTime() - bDue.getTime())
  }

  /**
   * Updates the card's scheduling based on the FSRS algorithm.
   * The rating is on a scale of 1-4:
   * 1 = Again
   * 2 = Hard
   * 3 = Good
   * 4 = Easy
   */
  override update(
    ratingValue: number,
    _subject: Subject,
    assignment: Assignment,
  ): Assignment {
    const rating: Quality = Math.min(Math.max(Math.round(ratingValue), 1), 4)

    const now = getNow()
    const lastStudiedAt = assignment.lastStudiedAt || now
    const {
      lapses = 0,
      interval = 0,
      repetition = 0,
      stability = 0,
      difficulty = 0.3,
    } = assignment

    try {
      const result = this.fsrs.repeat({
        due: assignment.lastStudiedAt ? getDueDate(assignment) || now : now,
        stability,
        difficulty,
        elapsed_days: (now.getTime() - lastStudiedAt.getTime()) / DAY_MS,
        scheduled_days: interval,
        reps: repetition + lapses,
        lapses,
        last_review: assignment.lastStudiedAt,
        state: assignment.state as State,
        learning_steps: assignment.steps || 0,
      }, now)[rating]

      if (!result.card) return assignment

      const isOld = assignment.startedAt &&
        ((getNow().getTime() - assignment.startedAt.getTime()) > (DAY_MS * 20))

      return {
        ...assignment,
        state: (repetition > 5)
          ? State.Review
          : (isOld ? State.Learning : State.Relearning),
        stability: result.card.stability,
        difficulty: result.card.difficulty,
        interval: result.card.scheduled_days,
        lapses: (rating < Quality.Good) ? lapses + 1 : lapses,
        lastStudiedAt: now,
        repetition: (rating === 1) ? 0 : repetition + 1,
        steps: result.card.learning_steps,
      }
    } catch (error) {
      console.error('FSRS error:', error)
      // Fallback implementation if FSRS fails
      let newInterval = Math.max(0.25, interval * 2.5) // easy
      if (rating === Quality.Again) newInterval = 0.25 // 6 hours
      else if (rating === Quality.Hard) newInterval = 1 // 1 day
      else if (rating === Quality.Good) newInterval = 3 // 3 days

      return {
        ...assignment,
        stability: stability + (rating - 1),
        difficulty: Math.max(
          0.1,
          Math.min(
            1.0,
            difficulty - (0.1 * (rating - 3)),
          ),
        ),
        lapses: (rating < Quality.Good) ? lapses + 1 : lapses,
        lastStudiedAt: now,
        interval: newInterval,
        repetition: (rating === 1) ? 0 : repetition + 1,
      }
    }
  }
}

/**
 * Calculate due date for an assignment
 */
function getDueDate(assignment: Assignment): Date | undefined {
  if (!assignment.lastStudiedAt) return undefined
  const due = new Date(assignment.lastStudiedAt)
  due.setDate(due.getDate() + (assignment.interval || 0))
  return due
}
