/**
 * A scheduler with statically-tiered due-dates
 */
import { type Assignment, defaultAssignment, type Subject } from '../types.ts'
import Scheduler from '../scheduler.ts'
import { getNow } from '../utils/datetime.ts'

export interface Srs {
  id: number
  name: string
  unlocksAt: number
  startsAt: number
  passesAt: number
  completesAt: number
  intervals: number[]
}

export interface Options {
  srs: Record<number, Srs>
  userLevel: number
}

export interface SubjectData {
  level: number
  position: number
  srsId: number
}

/**
 * A basic scheduler to demonstrate usage
 */
export default class StaticScheduler extends Scheduler<boolean> {
  #srs: Record<number, Srs> = {}
  #userLevel: number = 0

  constructor({ srs, userLevel }: Partial<Options>) {
    super()
    this.#srs = srs || this.#srs
    this.#userLevel = userLevel || this.#userLevel
  }

  /** Ensure that repetition is an int */
  override add(subject: Subject): Assignment {
    const { srsId } = subject.data as SubjectData
    const srs = this.#srs[srsId]
    if (!srs) throw new Error(`No SRS srs defined for ${srsId}`)

    return {
      ...defaultAssignment,
      efactor: 0,
      subjectId: subject.id,
      availableAt: getNow(srs.intervals[0]),
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
    if (level > this.#userLevel) return false
    if (assignment?.markedCompleted || assignment?.completedAt) return false
    return true
  }

  override sort(
    [subjectA, _assignmentA]: [Subject, Assignment],
    [subjectB, _assignmentB]: [Subject, Assignment],
  ): number {
    const dataA = subjectA.data as SubjectData
    const dataB = subjectB.data as SubjectData
    if (dataA?.level && !dataB?.level) return -1
    if (dataB?.level && !dataA?.level) return 1
    if (dataA?.level !== dataB?.level) return dataA.level - dataB.level
    return dataA.position - dataB.position
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
      const tomorrow = getNow(86400) // 1-day do-over to recover lost stage

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
