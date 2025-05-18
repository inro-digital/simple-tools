import type { Assignment, Subject } from '../types.ts'
import Scheduler from '../scheduler.ts'
import { getNow } from '../utils/datetime.ts'
import {
  default_maximum_interval,
  default_request_retention,
  default_w,
  FSRS,
} from 'ts-fsrs'

/** Default parameters for the FSRS algorithm */
const defaultParameters = {
  w: default_w,
  requestRetention: default_request_retention,
  maximumInterval: default_maximum_interval,
}

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
  fsrsParams?: {
    w: number[]
    requestRetention: number
    maximumInterval: number
  }
}

/**
 * Data that is necessary to include in the subject's `data` property, in order
 * for this scheduler to function.
 */
export interface SubjectData {
  /** Level that a subject is unlocked */
  level: number
  /** Represents which srs interval to use */
  srsId: number
  /** Order in which the subject is displayed */
  position?: number
}

/**
 * An FSRS scheduler that includes level-based subject introduction and threshold
 * properties like the static scheduler. This combines the best features of both
 * the static and FSRS schedulers.
 */
export default class FsrsLevelsScheduler extends Scheduler<number> {
  #srs: Record<number, FsrsSrs> = {}
  #fsrsInstances: Record<number, FSRS> = {}
  /** A user's level. They should start at 1; 0 just means not initialized */
  userLevel: number = 0

  /** Initialize with user level and srs interval definitions */
  constructor({ srs, userLevel, fsrsParams }: Partial<{
    srs: Record<number, FsrsSrs>
    userLevel: number
    fsrsParams: typeof defaultParameters
  }> = {}) {
    super()
    this.#srs = srs || this.#srs
    this.userLevel = userLevel || this.userLevel

    // Initialize FSRS instances for each SRS system
    Object.entries(this.#srs).forEach(([idStr, srsSystem]) => {
      const id = Number(idStr)
      this.#fsrsInstances[id] = new FSRS(
        srsSystem.fsrsParams || fsrsParams || defaultParameters,
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
    }
  }

  /**
   * Should filter out subjects that user is not high enough level to see,
   * have been completed, or are not yet due
   */
  override filter(subject: Subject, assignment: Assignment): boolean {
    const { level = 0 } = subject.data as SubjectData

    // Check level and completion status
    if (level > this.userLevel) return false
    if (assignment?.markedCompleted || assignment?.completedAt) return false

    // Check if it's due
    if (assignment?.availableAt && assignment.availableAt > getNow()) {
      return false
    }

    return true
  }

  /** Filters out subjects that have already been learned */
  override filterLearnable(subject: Subject, assignment: Assignment): boolean {
    if (!this.filter(subject, assignment)) return false
    if (assignment?.startedAt) return false // Already learned
    return true
  }

  /** Filters out subjects that haven't already been learned or aren't due */
  override filterQuizzable(subject: Subject, assignment: Assignment): boolean {
    if (!this.filter(subject, assignment)) return false
    if (!assignment?.startedAt) return false // Not learned yet, so can't quiz
    if (!assignment?.availableAt) return false // Not available, so can't quiz
    return assignment.availableAt <= getNow()
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

    // Ensure rating is between 1-4
    const boundedRating = Math.min(Math.max(Math.round(rating), 1), 4)

    const now = getNow()
    const lastStudiedAt = assignment.lastStudiedAt || now
    const fsrs = this.#fsrsInstances[srsId]

    // First study session (setting startedAt)
    const startedAt = assignment.startedAt || now

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
      // Ensure minimum interval of 1 day for any studied card
      const newInterval = Math.max(1, Math.round(scheduled.card.scheduled_days))
      const newRepetition = boundedRating === 1
        ? 0
        : (assignment.repetition || 0) + 1

      // Calculate threshold states based on repetition count
      const isPassed = newRepetition >= srs.passesAt
      const isCompleted = newRepetition >= srs.completesAt

      // Calculate next available date
      const nextAvailableDate = new Date(now)
      nextAvailableDate.setDate(nextAvailableDate.getDate() + newInterval)

      return {
        ...assignment,
        stability: scheduled.card.stability,
        difficulty: scheduled.card.difficulty,
        lastStudiedAt: now,
        interval: newInterval,
        repetition: newRepetition,
        startedAt: startedAt,
        availableAt: nextAvailableDate,
        passedAt: isPassed && !assignment.passedAt ? now : assignment.passedAt,
        completedAt: isCompleted ? now : assignment.completedAt,
      }
    } catch (error) {
      console.error('FSRS error:', error)

      // Fallback implementation if FSRS fails
      const newInterval = boundedRating === 1
        ? 1
        : boundedRating === 2
        ? 3
        : boundedRating === 3
        ? 7
        : Math.max(1, Math.round((assignment.interval || 0) * 2.5))

      const newRepetition = boundedRating === 1
        ? 0
        : (assignment.repetition || 0) + 1
      const isPassed = newRepetition >= srs.passesAt
      const isCompleted = newRepetition >= srs.completesAt

      // Calculate next available date
      const nextAvailableDate = new Date(now)
      nextAvailableDate.setDate(nextAvailableDate.getDate() + newInterval)

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
        startedAt: startedAt,
        availableAt: nextAvailableDate,
        passedAt: isPassed && !assignment.passedAt ? now : assignment.passedAt,
        completedAt: isCompleted ? now : assignment.completedAt,
      }
    }
  }
}
