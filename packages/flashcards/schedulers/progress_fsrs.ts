/**
 * @module
 * An FSRS scheduler that includes level-based subject introduction and threshold
 * properties like the static scheduler. This combines features of both the
 * static and FSRS schedulers.
 */
import {
  defaultFsrsParams,
  type FsrsParams,
  FsrsQuality,
  FsrsScheduler,
} from './fsrs.ts'
import {
  defaultProgressThresholds,
  ProgressScheduler,
  type ProgressThresholds,
} from './progress.ts'
import type { Assignment, Subject } from '../types.ts'
import { DAY_MS } from '../../utils/datetime.ts'

/**
 * Data that is necessary to include in the subject's `data` property, in order
 * for this scheduler to function.
 */
export interface FsrsProgressSubjectData {
  /** Level that a subject is unlocked */
  level: number
  /** Represents which SRS system to use for thresholds */
  srsId: number
  /** An array of subject ids that need to be passed before this subject is unlocked */
  requiredSubjects?: string[]
  /** Order in which the subject is displayed */
  position?: number
}

/**
 * FSRS SRS configuration that combines FSRS params with progress thresholds
 */
export interface FsrsThresholds extends ProgressThresholds {
  /** Custom FSRS parameters for this SRS level, if undefined, use default */
  fsrsParams?: FsrsParams
}

/**
 * Default SRS thresholds; includes a normal-paced and a fast-paced config.
 * Threshold cut-offs are based on repetition count.
 */
export const defaultFsrsThresholds: Record<number, FsrsThresholds> = {
  1: {
    id: 1,
    name: 'Default',
    unlocksAt: 0,
    startsAt: 1,
    passesAt: 3, // Threshold for "remembers decently well" to unlock content
    completesAt: 10, // Threshold for "solid retention, unlikely to forget"
    fsrsParams: {
      // deno-fmt-ignore
      w: [
        0.5, 1, 3.5, 10, 24, 0.89138288, 5.5, 0.5, 6, 1.5, 4.5, 9, 1, 2, 5,
        1.5, 9, 0, 0, 0, -0.2,
      ],
      requestRetention: 0.65, // Lower retention for more aggressive intervals
      maximumInterval: 100, // Lower maximum to prevent excessive intervals
      enableShortTerm: true,
    },
  },
  2: {
    id: 2,
    name: 'Fast',
    unlocksAt: 0,
    startsAt: 1,
    passesAt: 3,
    completesAt: 10,
    fsrsParams: {
      // deno-fmt-ignore
      w: [
        0.6, 1.5, 2.5, 6, 12, 0.64863672, 3, 0.3, 3, 1, 3, 6, 0.8, 1.5, 3, 1,
        6, 0, 0, 0, -0.2,
      ],
      requestRetention: 0.55, // Lower retention for faster initial intervals
      maximumInterval: 60, // Lower maximum to prevent excessive intervals
      enableShortTerm: true,
    },
  },
}

/**
 * A scheduler for working with the fsrs algorithm, while retaining the nice
 * gamification features of the static scheduler
 * @example
 * ```ts
 * const scheduler = new FsrsProgressScheduler({ userLevel: 1 })
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
export class FsrsProgressScheduler extends ProgressScheduler<FsrsQuality> {
  /** Initialize with user level and srs definitions */
  constructor({ srs, userLevel, fsrsParams }: Partial<{
    srs: Record<number, FsrsThresholds>
    userLevel: number
    fsrsParams: Partial<FsrsParams>
  }> = {}) {
    const srsConfig = srs || defaultFsrsThresholds

    // Use the first SRS config for FSRS params, or provided params, or defaults
    const firstSrs = Object.values(srsConfig)[0]
    const effectiveFsrsParams = fsrsParams || firstSrs?.fsrsParams ||
      defaultFsrsParams

    super({
      scheduler: new FsrsScheduler(effectiveFsrsParams),
      userLevel: userLevel || 0,
      thresholds: firstSrs || defaultProgressThresholds,
      progressExtractor: (assignment) => assignment?.repetition || 0,
    })
  }

  /** Sort by level, then by due date, then by position within level */
  override sort(
    [subjectA, assignmentA]: [Subject, Assignment],
    [subjectB, assignmentB]: [Subject, Assignment],
  ): number {
    const dataA = subjectA.data as FsrsProgressSubjectData
    const dataB = subjectB.data as FsrsProgressSubjectData

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

    const positionDiff = (dataA.position ?? 0) - (dataB.position ?? 0)
    if (positionDiff !== 0) return positionDiff

    return Math.random() - 0.5
  }

  /** Override update to use hardcoded intervals for Quality.Good ratings */
  override update(
    rating: FsrsQuality,
    subject: Subject,
    assignment: Assignment,
  ): Assignment {
    // First let the base scheduler (via ProgressScheduler) handle the update
    const baseResult = super.update(rating, subject, assignment)

    // Override interval with hardcoded values for Quality.Good if applicable
    const { srsId } = subject.data as FsrsProgressSubjectData
    const repetition = assignment.repetition || 0

    if (rating === FsrsQuality.Good) {
      let hardcodedInterval: number | undefined

      if (srsId === 1) {
        const defaultIntervals = [0.5, 1, 3, 7, 14, 23, 35, 50, 65, 85]
        if (repetition < defaultIntervals.length) {
          hardcodedInterval = defaultIntervals[repetition]
        }
      } else if (srsId === 2) {
        const fastIntervals = [0.5, 1, 2, 5, 12, 25, 40, 55]
        if (repetition < fastIntervals.length) {
          hardcodedInterval = fastIntervals[repetition]
        }
      }

      if (hardcodedInterval !== undefined) {
        const now = baseResult.lastStudiedAt || new Date()
        const availableAt = new Date(
          now.getTime() + (hardcodedInterval * DAY_MS),
        )

        return {
          ...baseResult,
          interval: hardcodedInterval,
          availableAt,
        }
      }
    }

    return baseResult
  }
}

export { defaultFsrsParams, type FsrsParams, FsrsQuality }
