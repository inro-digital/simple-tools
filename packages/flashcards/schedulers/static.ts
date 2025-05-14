/**
 * A scheduler with statically-tiered due-dates
 */
import { type Assignment, defaultAssignment, type Subject } from '../types.ts'
import Scheduler from '../scheduler.ts'
import { getNow } from '../utils/datetime.ts'

export interface System {
  unlocksAt: number
  startsAt: number
  passesAt: number
  completesAt: number
  stages: number[]
}

export interface Options {
  srs: Record<number, System>
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
  #srs: Record<number, System> = {}
  #userLevel: number = 0

  constructor({ srs, userLevel }: Partial<Options>) {
    super()
    this.#srs = srs || this.#srs
    this.#userLevel = userLevel || this.#userLevel
  }

  /** Ensure that repetition is an int */
  override add(subject: Subject): Assignment {
    const { srsId = 1 } = subject.data as SubjectData
    const srs = this.#srs[srsId]
    if (!srs) throw new Error(`No SRS srs defined for ${srsId}`)

    return {
      ...defaultAssignment,
      efactor: 0,
      subjectId: subject.id,
      availableAt: getNow(srs.stages[0]),
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
    [subjectA, assignmentA]: [Subject, Assignment],
    [subjectB, assignmentB]: [Subject, Assignment],
  ): number {
    const dataA = subjectA.data as SubjectData
    const dataB = subjectB.data as SubjectData
    if (dataA?.level && !dataB?.level) return -1
    if (dataB?.level && dataA?.level) return 1
    if (dataA?.level !== dataB?.level) return dataA.level - dataB.level
    const startedA = assignmentA?.startedAt
    const startedB = assignmentB?.startedAt
    if (startedA && !startedB) return -1
    if (startedB && !startedA) return 1
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
      const { efactor = 0, passedAt } = assignment
      const stage = efactor + 1
      const isPassed = stage >= srs.passesAt
      return {
        ...assignment,
        availableAt: this.#getStageInterval(srsId, stage),
        passedAt: passedAt || (isPassed ? getNow() : undefined),
        efactor: stage,
      }
    } else {
      const stage = Math.max(1, (assignment?.efactor || 1) - 1)
      const stageInterval = this.#getStageInterval(srsId, stage)
      const tomorrow = getNow(86400) // 1-day do-over to recover lost stage

      return {
        ...assignment,
        availableAt: stageInterval
          ? stageInterval < tomorrow ? stageInterval : tomorrow
          : undefined,
        subjectId: subject.id,
        efactor: stage,
      }
    }
  }

  #getStageInterval(srsId: number, stageNum: number): Date | undefined {
    const system = this.#srs[srsId]
    if (!system) throw new Error('No srs system found')
    const stageInterval = system.stages[stageNum]
    if (stageInterval == null) return undefined
    return getNow(stageInterval)
  }
}
