/**
 * @module
 * A scheduler that uses predefined static intervals for scheduling reviews.
 * This is the pure interval calculation part extracted from the original StaticScheduler.
 */
import { getNow } from '../../utils/datetime.ts'
import type { Assignment, Subject } from '../types.ts'
import Scheduler from '../scheduler.ts'

/**
 * Static interval system configuration
 */
export interface StaticIntervalSystem {
  /** Identifier for the interval system */
  id: number
  /** Display name for the interval system */
  name: string
  /** An array of seconds, indicating how long to wait between intervals */
  intervals: number[]
}

/**
 * Data that subjects need in their `data` property for static intervals
 */
export interface StaticIntervalSubjectData {
  /** Represents which interval system to use */
  intervalSystemId: number
}

/**
 * Default interval systems
 */
export const defaultIntervalSystems: Record<number, StaticIntervalSystem> = {
  1: {
    id: 1,
    name: 'Default',
    intervals: [
      0,
      86400,
      259200,
      604800,
      1209600,
      1987200,
      3024000,
      4320000,
      5616000,
      7344000,
    ], // 0s, 1d, 3d, 1w, 2w, 23d, 35d, 50d, 65d, 85d
  },
  2: {
    id: 2,
    name: 'Fast',
    intervals: [0, 43200, 172800, 432000, 1036800, 2160000, 3456000, 4752000], // 0s, 12h, 2d, 5d, 12d, 25d, 40d, 55d
  },
}

/**
 * A scheduler that uses static, predefined intervals for scheduling
 */
export default class StaticIntervalScheduler extends Scheduler<boolean> {
  #intervalSystems: Record<number, StaticIntervalSystem> =
    defaultIntervalSystems

  /** Initialize with interval system definitions */
  constructor(
    { intervalSystems }: {
      intervalSystems?: Record<number, StaticIntervalSystem>
    } = {},
  ) {
    super()
    this.#intervalSystems = intervalSystems || this.#intervalSystems
  }

  /** Create a new assignment with initial interval */
  override add(subject: Subject): Assignment {
    const { intervalSystemId } = subject.data as StaticIntervalSubjectData
    const system = this.#intervalSystems[intervalSystemId]
    if (!system) {
      throw new Error(`No interval system defined for ${intervalSystemId}`)
    }

    return {
      subjectId: subject.id,
      markedCompleted: false,
      efactor: 0, // Using efactor as stage/index into intervals array
      interval: system.intervals[0],
      availableAt: getNow(system.intervals[0]),
      lastStudiedAt: getNow(),
    }
  }

  /** Filter out assignments that aren't due yet */
  override filter(_subject: Subject, assignment: Assignment): boolean {
    if (assignment?.markedCompleted) return false
    if (!assignment?.availableAt) return true
    return assignment.availableAt <= getNow()
  }

  /** Only show items that haven't been started */
  override filterLearnable(_subject: Subject, assignment: Assignment): boolean {
    if (assignment?.startedAt) return false
    return this.filter(_subject, assignment)
  }

  /** Only show items that have been started and are due */
  override filterQuizzable(_subject: Subject, assignment: Assignment): boolean {
    if (!assignment?.startedAt) return false
    return this.filter(_subject, assignment)
  }

  /** Sort randomly by default */
  override sort(): number {
    return Math.random() - 0.5
  }

  /**
   * Update assignment based on quality (correct/incorrect)
   * @param isCorrect true if answer was correct, false if incorrect
   */
  override update(
    isCorrect: boolean,
    subject: Subject,
    assignment: Assignment,
  ): Assignment {
    const { intervalSystemId } = subject.data as StaticIntervalSubjectData
    const system = this.#intervalSystems[intervalSystemId]
    if (!system) {
      throw new Error(`No interval system defined for ${intervalSystemId}`)
    }

    if (isCorrect) {
      const { efactor: prevStage = 0 } = assignment
      const efactor = prevStage + 1
      const interval = this.#getInterval(intervalSystemId, efactor)

      return {
        ...assignment,
        availableAt: interval !== undefined ? getNow(interval) : undefined,
        efactor,
        interval,
        lastStudiedAt: getNow(),
      }
    } else {
      // Move back one stage, but minimum stage is 1 (not 0)
      const efactor = Math.max(1, (assignment?.efactor || 1) - 1)
      const interval = this.#getInterval(intervalSystemId, efactor)
      const intervalDate = interval !== undefined ? getNow(interval) : undefined
      const tomorrow = getNow(86_400) // 1-day do-over to recover lost stage

      return {
        ...assignment,
        availableAt:
          interval !== undefined && intervalDate && intervalDate < tomorrow
            ? intervalDate
            : tomorrow,
        efactor,
        interval,
        lastStudiedAt: getNow(),
      }
    }
  }

  #getInterval(intervalSystemId: number, stage: number): number | undefined {
    const system = this.#intervalSystems[intervalSystemId]
    if (!system) throw new Error('No interval system found')
    const interval = system.intervals[stage]
    return interval
  }
}
