/**
 * @module
 * A scheduler with statically-tiered due-dates
 */
import { getNow } from '../../utils/datetime.ts'
import type { Assignment, Subject } from '../types.ts'
import Scheduler from '../scheduler.ts'

/** Srs defines the intervals used, and cutoffs */
export interface Srs {
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
  /** An array of seconds, indicating how long to wait between intervals */
  intervals: number[]
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
 * A scheduler that utilizes static interval definitions
 */
export default class StaticScheduler extends Scheduler<boolean> {
  #srs: Record<number, Srs> = {}
  /** A user's level. They should start at 1; 0 just means not initialized */
  userLevel: number = 0

  /** Initialize with user level and srs interval definitions */
  constructor({ srs, userLevel }: Partial<{
    srs: Record<number, Srs>
    userLevel: number
  }> = {}) {
    super()
    this.#srs = srs || this.#srs
    this.userLevel = userLevel || this.userLevel
  }

  /** Ensure that repetition is an int */
  override add(subject: Subject): Assignment {
    const { srsId } = subject.data as SubjectData
    const srs = this.#srs[srsId]
    if (!srs) throw new Error(`No SRS srs defined for ${srsId}`)

    return {
      availableAt: getNow(srs.intervals[0]),
      efactor: 0,
      markedCompleted: false,
      subjectId: subject.id,
      interval: srs.intervals[0],
      startedAt: getNow(),
      unlockedAt: getNow(),
    }
  }

  /**
   * Should filter out subjects that user is not high enough level to see, or
   * have been completed
   */
  override filter(subject: Subject, assignment: Assignment): boolean {
    const { level = 0 } = subject.data as SubjectData
    if (level > this.userLevel) return false
    if (assignment?.markedCompleted || assignment?.completedAt) return false
    return true
  }

  /** Filters out subjects that have already been learned */
  override filterLearnable(subject: Subject, assignment: Assignment): boolean {
    if (!this.filter(subject, assignment)) return false
    if (assignment?.startedAt) return false // Already learned
    return true
  }

  /** Filters out subjects that haven't already been learned */
  override filterQuizzable(subject: Subject, assignment: Assignment): boolean {
    if (!this.filter(subject, assignment)) return false
    if (!assignment?.startedAt) return false // Not learned yet, so can't quiz.
    if (!assignment?.availableAt) return false // Not available, so can't quiz
    return assignment.availableAt <= getNow()
  }

  /** Sort by level, and then sort by position within level */
  override sort(
    [subjectA, _assignmentA]: [Subject, Assignment],
    [subjectB, _assignmentB]: [Subject, Assignment],
  ): number {
    const dataA = subjectA.data as SubjectData
    const dataB = subjectB.data as SubjectData
    if (dataA?.level && !dataB?.level) return -1
    if (dataB?.level && !dataA?.level) return 1
    if (dataA?.level !== dataB?.level) return dataA.level - dataB.level
    return (dataA.position ?? 0) - (dataB.position ?? 0)
  }

  /**
   * quality - true means a user was correct, false is incorrect
   * efactor - the `stage` that the assignment is on. On update, the lowest
   * stage we can get is 1. Stage 0 is reserved for new subjects, and should
   * default to being immediately available.
   */
  override update(
    isCorrect: boolean,
    subject: Subject,
    assignment: Assignment,
  ): Assignment {
    const { srsId } = subject.data as SubjectData
    const srs = this.#srs[srsId]
    if (!srs) throw new Error(`No SRS srs defined for ${srsId}`)
    if (isCorrect) {
      const { efactor: prevEfactor = 0, passedAt } = assignment
      const efactor = prevEfactor + 1
      const isPassed = efactor >= srs.passesAt
      const interval = this.#getInterval(srsId, efactor)
      return {
        ...assignment,
        availableAt: getNow(interval),
        efactor,
        interval,
        passedAt: passedAt || (isPassed ? getNow() : undefined),
      }
    } else {
      const efactor = Math.max(1, (assignment?.efactor || 1) - 1)
      const interval = this.#getInterval(srsId, efactor)
      const intervalDate = getNow(interval)
      const tomorrow = getNow(86_400) // 1-day do-over to recover lost stage

      return {
        ...assignment,
        availableAt: interval
          ? intervalDate < tomorrow ? intervalDate : tomorrow
          : undefined,
        efactor,
        interval,
        subjectId: subject.id,
      }
    }
  }

  #getInterval(srsId: number, efactor: number): number | undefined {
    const system = this.#srs[srsId]
    if (!system) throw new Error('No srs system found')
    const interval = system.intervals[efactor]
    if (interval == null) return undefined
    return interval
  }
}
