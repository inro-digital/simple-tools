/**
 * @module
 * A scheduler that combines FSRS algorithm with progress tracking and level-based unlocking.
 * This replaces the original FsrsLevelsScheduler by composing FsrsScheduler with ProgressScheduler.
 */
import FsrsScheduler, { defaultParams, type Params, Quality } from './fsrs.ts'
import ProgressScheduler from './progress_scheduler.ts'
import {
  defaultProgressThresholds,
  type ProgressThresholds,
  repetitionExtractor,
} from '../utils/progress.ts'

/**
 * Combined subject data for FSRS + progress tracking
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
export interface FsrsSrs extends ProgressThresholds {
  /** Custom FSRS parameters for this SRS level, if undefined, use default */
  fsrsParams?: Params
}

/**
 * Default SRS thresholds; includes a normal-paced and a fast-paced config.
 * Threshold cut-offs are based on repetition count.
 */
export const defaultSRS: Record<number, FsrsSrs> = {
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
 * A scheduler for working with the FSRS algorithm, while retaining the nice
 * gamification features of progress tracking
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
 * assignment1 = scheduler.update(Quality.Good, subject, assignment1)
 * ```
 */
export default class FsrsProgressScheduler extends ProgressScheduler<number> {
  /** Initialize with user level and srs definitions */
  constructor({ srs, userLevel, fsrsParams }: Partial<{
    srs: Record<number, FsrsSrs>
    userLevel: number
    fsrsParams: Partial<Params>
  }> = {}) {
    const srsConfig = srs || defaultSRS

    // Use the first SRS config for FSRS params, or provided params, or defaults
    const firstSrs = Object.values(srsConfig)[0]
    const effectiveFsrsParams = fsrsParams || firstSrs?.fsrsParams ||
      defaultParams

    // Create the base FSRS scheduler
    const baseScheduler = new FsrsScheduler(effectiveFsrsParams)

    // Use the first SRS config for thresholds (could be made more sophisticated)
    const firstThresholds = firstSrs || defaultProgressThresholds

    super({
      scheduler: baseScheduler,
      userLevel: userLevel || 0,
      thresholds: firstThresholds,
      progressExtractor: repetitionExtractor, // FSRS uses repetition count
    })
  }
}

export { defaultParams, type Params, Quality }
