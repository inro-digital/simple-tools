/**
 * @module
 * A scheduler that combines SM2 algorithm with progress tracking and level-based unlocking.
 * This demonstrates how any scheduler can be easily composed with progress tracking.
 */
import { Sm2Quality, Sm2Scheduler } from './sm2.ts'
import {
  defaultProgressThresholds,
  ProgressScheduler,
  type ProgressThresholds,
} from './progress.ts'

/** Combined subject data for SM2 + progress tracking */
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
 * import { Sm2ProgressScheduler, Sm2Quality } from '@inro/simple-tools/flashcards/schedulers'
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
 * assignment = scheduler.update(Sm2Quality.Correct, subject, assignment)
 * ```
 */
export class Sm2ProgressScheduler extends ProgressScheduler<Sm2Quality> {
  /** Initialize with user level and thresholds */
  constructor({ userLevel, thresholds }: Partial<{
    userLevel: number
    thresholds: ProgressThresholds
  }> = {}) {
    super({
      scheduler: new Sm2Scheduler(),
      userLevel: userLevel || 0,
      thresholds: thresholds || defaultProgressThresholds,
      progressExtractor: (assignment) => assignment?.repetition || 0,
    })
  }
}

export { Sm2Quality }
