/**
 * @module
 * A scheduler that combines SM2 algorithm with progress tracking and level-based unlocking.
 * This demonstrates how any scheduler can be easily composed with progress tracking.
 */
import Sm2Scheduler, { Quality } from './sm2.ts'
import ProgressScheduler from './progress_scheduler.ts'
import {
  defaultProgressThresholds,
  type ProgressThresholds,
  sm2ProgressExtractor,
} from '../utils/progress.ts'

/**
 * Combined subject data for SM2 + progress tracking
 */
export interface Sm2ProgressSubjectData {
  /** Level that a subject is unlocked */
  level: number
  /** An array of subject ids that need to be passed before this subject is unlocked */
  requiredSubjects?: string[]
  /** Order in which the subject is displayed */
  position?: number
}

/**
 * A scheduler that combines SM2 algorithm with progress tracking
 * @example
 * ```ts
 * const scheduler = new Sm2ProgressScheduler({ userLevel: 1 })
 * const subject = {
 *   id: 'vocab-1',
 *   learnCards: ['word'],
 *   quizCards: ['definition'],
 *   data: {
 *     level: 1,
 *     position: 0,
 *     word: 'serendipity',
 *     definition: 'pleasant surprise',
 *   },
 * }
 * let assignment = scheduler.add(subject)
 * assignment = scheduler.update(Quality.Correct, subject, assignment)
 * ```
 */
export default class Sm2ProgressScheduler extends ProgressScheduler<number> {
  /** Initialize with user level and optional progress thresholds */
  constructor({ userLevel, thresholds }: Partial<{
    userLevel: number
    thresholds: ProgressThresholds
  }> = {}) {
    // Create the base SM2 scheduler
    const baseScheduler = new Sm2Scheduler()

    super({
      scheduler: baseScheduler,
      userLevel: userLevel || 0,
      thresholds: thresholds || defaultProgressThresholds,
      progressExtractor: sm2ProgressExtractor, // SM2 uses repetition count, ignoring starting efactor
    })
  }
}

export { Quality }
