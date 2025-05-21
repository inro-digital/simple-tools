/**
 * @module
 * An FSRS scheduler that includes level-based subject introduction and threshold
 * properties like the static scheduler. This combines features of both the
 * static and FSRS schedulers.
 */
import { FSRS } from 'ts-fsrs'
import { getNow } from '../../utils/datetime.ts'
import Scheduler from '../scheduler.ts'
import type { Assignment, Subject } from '../types.ts'
import { defaultParams, type Params, Quality } from './fsrs.ts'
import type { SubjectData } from './static.ts'

export { defaultParams, type Params, Quality, type SubjectData }

/**
 * Default SRS thresholds; includes a normal-paced and a fast-paced config.
 * Threshold cut-offs are based on repetition num.
 */
export const defaultSRS: Record<number, FsrsSrs> = {
  [1]: {
    id: 1,
    name: 'Default',
    unlocksAt: 0,
    startsAt: 1,
    passesAt: 3, // Threshold for "remembers decently well" to unlock content
    completesAt: 10, // Threshold for "solid retention, unlikely to forget"
  },
  [2]: {
    id: 2,
    name: 'Fast',
    unlocksAt: 0,
    startsAt: 1,
    passesAt: 3, // Same threshold as Default for content unlocking
    completesAt: 8, // Faster completion threshold than Default
    fsrsParams: {
      // deno-fmt-ignore
      w: [
        0.3, 0.5, 2.0, 5.0, 4.5, 0.9, 0.8, 0.01, 1.3,
        0.14, 0.9, 2.0, 0.05, 0.3, 1.2, 0.25, 2.5
      ],
      requestRetention: 0.85,
      maximumInterval: 36500,
    },
  },
}

/** Srs defines the intervals used, and cutoffs */
export interface FsrsSrs {
  /** Identifier for the srs system */
  id: number
  /** Display name for the srs system */
  name: string
  /**
   * Once this interval is reached, an assignment is "unlocked".
   * This generally means that an assignement is available to the user.
   */
  unlocksAt: number
  /**
   * Once this interval is reached, an assignment is "started".
   * This generally means that a user has seen/learned the assignment.
   */
  startsAt: number
  /**
   * Once this interval is reached, an assignment is "passed".
   * This generally means that dependent assignments become unlocked.
   */
  passesAt: number
  /**
   * Once this interval is reached, an assignment is complete.
   * This generally means that a user has demonstrated "mastery", and this that
   * this assignment no longer needs to be shown.
   */
  completesAt: number
  /** Custom FSRS parameters for this SRS level, if undefined, use default */
  fsrsParams?: Params
}

/**
 * A scheduler for working with the fsrs algorithm, while retaining the nice
 * gamification features of the static scheduler
 * @example
 * ```ts
 * const scheduler = new FsrsLevelsScheduler({ userLevel: 1 })
 * const subject = {
 *   id: 'math-1',
 *   learnCards: ['question'],
 *   quizCards: ['answer'],
 *   data: {
 *     level: 1,
 *     srsId: 1,
 *     position: 0,
 *     question: 'What is 2+2?',
 *     answer: '4',
 *   },
 * }
 * let assignment1 = scheduler.add(subject)
 * assignment1 = scheduler.update(3, subject, assignment1)
 * ```
 */
export default class FsrsLevelsScheduler extends Scheduler<number> {
  #srs: Record<number, FsrsSrs> = defaultSRS
  #fsrsInstances: Record<number, FSRS> = {}
  /** A user's level. They should start at 1; 0 just means not initialized */
  userLevel: number = 0

  /** Initialize with user level and srs interval definitions */
  constructor({ srs, userLevel, fsrsParams }: Partial<{
    srs: Record<number, FsrsSrs>
    userLevel: number
    fsrsParams: Params
  }> = {}) {
    super()
    this.#srs = srs || this.#srs || defaultSRS
    this.userLevel = userLevel || this.userLevel

    // Initialize FSRS instances for each SRS system
    Object.entries(this.#srs).forEach(([idStr, srsSystem]) => {
      const id = Number(idStr)
      this.#fsrsInstances[id] = new FSRS(
        srsSystem.fsrsParams || fsrsParams || defaultParams,
      )
    })
  }

  /**
   * Initializes a new assignment
   */
  override add(subject: Subject): Assignment {
    const { srsId } = subject.data as SubjectData
    const srs = this.#srs[srsId]
    if (!srs) throw new Error(`No SRS system defined for ${srsId}`)

    const now = getNow()

    return {
      subjectId: subject.id,
      markedCompleted: false,
      difficulty: 0.3,
      stability: 0,
      lastStudiedAt: now,
      interval: 0,
      repetition: 0,
      unlockedAt: now,
      availableAt: now,
      startedAt: now,
    }
  }

  /**
   /** Should filter out subjects that user is not high enough level to see,
    * have been completed, or are not yet due
    */
  override filter(subject: Subject, assignment: Assignment): boolean {
    const { level = 0 } = subject.data as SubjectData

    // Check level and completion status
    if (level > this.userLevel) return false
    if (assignment?.markedCompleted || assignment?.completedAt) return false

    // Check if it's due - compare time instead of just date for fractional intervals
    if (
      assignment?.availableAt &&
      assignment.availableAt.getTime() > getNow().getTime()
    ) {
      return false
    }

    return true
  }

  /**
   * Filters out subjects that have already been learned or have unmet requirements
   * @param subject The subject to check
   * @param assignment The assignment for the subject
   * @param allAssignments Optional map of all assignments by subjectId to check requirements
   */
  override filterLearnable(
    subject: Subject,
    assignment: Assignment,
    allAssignments?: Record<string, Assignment>,
  ): boolean {
    if (!this.filter(subject, assignment)) return false
    if (assignment?.startedAt) return false // Already learned

    const { requiredSubjects = [] } = subject.data as SubjectData
    if (requiredSubjects.length > 0 && allAssignments) {
      const allRequiredPassed = requiredSubjects.every((reqSubjectId) => {
        const reqAssignment = allAssignments[reqSubjectId]
        return reqAssignment && reqAssignment.passedAt !== undefined
      })
      if (!allRequiredPassed) return false
    }

    return true
  }

  /**
   * Filters out subjects that haven't already been learned or aren't due
   * @param subject The subject to check
   * @param assignment The assignment for the subject
   */
  override filterQuizzable(
    subject: Subject,
    assignment: Assignment,
  ): boolean {
    if (!this.filter(subject, assignment)) return false
    if (!assignment?.startedAt) return false // Not learned yet, so can't quiz
    if (!assignment?.availableAt) return false // Not available, so can't quiz
    // Compare time instead of just date to handle fractional day intervals
    return assignment.availableAt.getTime() <= getNow().getTime()
  }

  /** Sort by level, then by due date, then by position within level */
  override sort(
    [subjectA, assignmentA]: [Subject, Assignment],
    [subjectB, assignmentB]: [Subject, Assignment],
  ): number {
    const dataA = subjectA.data as SubjectData
    const dataB = subjectB.data as SubjectData

    // First sort by level
    if (dataA?.level && !dataB?.level) return -1
    if (dataB?.level && !dataA?.level) return 1
    if (dataA?.level !== dataB?.level) return dataA.level - dataB.level

    // Then sort by due date (if available)
    const dueA = assignmentA?.availableAt
    const dueB = assignmentB?.availableAt
    if (!dueA && dueB) return -1
    if (!dueB && dueA) return 1
    if (dueA && dueB) {
      const timeA = dueA.getTime()
      const timeB = dueB.getTime()
      if (timeA !== timeB) return timeA - timeB
    }

    // Then sort by position within level
    const positionDiff = (dataA.position ?? 0) - (dataB.position ?? 0)
    if (positionDiff !== 0) return positionDiff

    // Random if all else is equal
    return Math.random() - 0.5
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
    rating: number,
    subject: Subject,
    assignment: Assignment,
  ): Assignment {
    const { srsId } = subject.data as SubjectData
    const srs = this.#srs[srsId]
    if (!srs) throw new Error(`No SRS system defined for ${srsId}`)

    const boundedRating = Math.min(
      Math.max(Math.round(rating), Quality.Again),
      Quality.Easy,
    )

    const now = getNow()
    const lastStudiedAt = assignment.lastStudiedAt || now
    const fsrs = this.#fsrsInstances[srsId]

    // Create card input for FSRS
    const card = {
      due: assignment.availableAt || now,
      stability: assignment.stability || 0,
      difficulty: assignment.difficulty || 0.3,
      elapsed_days: (now.getTime() - lastStudiedAt.getTime()) /
        (1000 * 60 * 60 * 24),
      scheduled_days: assignment.interval || 0,
      reps: assignment.repetition || 0,
      lapses: 0,
      state: assignment.repetition === 0 ? 0 : 2, // 0 = New, 2 = Review
      learning_steps: 0,
    }

    try {
      // Get scheduling information from FSRS
      // deno-lint-ignore no-explicit-any
      const result = fsrs.repeat(card, now) as any

      // Extract the result based on the rating
      // deno-lint-ignore no-explicit-any
      const scheduled = result[boundedRating.toString()] as any

      if (!scheduled || !scheduled.card) return assignment

      // Calculate new values
      // Use FSRS natural pacing with minimum interval of 6 hours (0.25 days)
      const newInterval = Math.max(0.25, scheduled.card.scheduled_days)
      const newRepetition = boundedRating === Quality.Again
        ? 0
        : (assignment.repetition || 0) + 1

      // Calculate threshold states based on repetition count
      const isPassed = newRepetition >= srs.passesAt
      const isCompleted = newRepetition >= srs.completesAt

      // Calculate next available date - convert days to milliseconds for more precise intervals
      const nextAvailableDate = new Date(
        now.getTime() + (newInterval * 24 * 60 * 60 * 1000),
      )

      return {
        ...assignment,
        stability: scheduled.card.stability,
        difficulty: scheduled.card.difficulty,
        lastStudiedAt: now,
        interval: newInterval,
        repetition: newRepetition,
        availableAt: nextAvailableDate,
        passedAt: isPassed && !assignment.passedAt ? now : assignment.passedAt,
        completedAt: isCompleted ? now : assignment.completedAt,
      }
    } catch (error) {
      console.error('FSRS error:', error)

      // Fallback implementation if FSRS fails - allow shorter intervals for better pacing
      let newInterval = Math.max(0.25, (assignment.interval || 0) * 2.5) // easy
      if (boundedRating === Quality.Again) newInterval = 0.25 // 6 hours
      else if (boundedRating === Quality.Hard) newInterval = 1 // 1 day
      else if (boundedRating === Quality.Good) newInterval = 3 // 3 days

      const newRepetition = boundedRating === Quality.Again
        ? 0
        : (assignment.repetition || 0) + 1
      const isPassed = newRepetition >= srs.passesAt
      const isCompleted = newRepetition >= srs.completesAt

      const nextAvailableDate = new Date(
        now.getTime() + (newInterval * 24 * 60 * 60 * 1000),
      )

      return {
        ...assignment,
        stability: (assignment.stability || 0) + (boundedRating - 1),
        difficulty: Math.max(
          0.1,
          Math.min(
            1.0,
            (assignment.difficulty || 0.3) - (0.1 * (boundedRating - 3)),
          ),
        ),
        lastStudiedAt: now,
        interval: newInterval,
        repetition: newRepetition,
        availableAt: nextAvailableDate,
        passedAt: isPassed && !assignment.passedAt ? now : assignment.passedAt,
        completedAt: isCompleted ? now : assignment.completedAt,
      }
    }
  }
}
