/**
 * @module
 * A scheduler that combines static intervals with progress tracking and level-based unlocking.
 * This replaces the original StaticScheduler by composing StaticIntervalScheduler with ProgressScheduler.
 */
import StaticIntervalScheduler, {
  type StaticIntervalSystem,
} from './static_intervals.ts'
import ProgressScheduler from './progress_scheduler.ts'
import {
  defaultProgressThresholds,
  efactorExtractor,
  type ProgressThresholds,
} from '../utils/progress.ts'

/**
 * Combined subject data for static intervals + progress tracking
 */
export interface StaticProgressSubjectData {
  /** Level that a subject is unlocked */
  level: number
  /** Represents which interval system to use */
  intervalSystemId: number
  /** An array of subject ids that need to be passed before this subject is unlocked */
  requiredSubjects?: string[]
  /** Order in which the subject is displayed */
  position?: number
}

/**
 * SRS configuration that combines interval systems with progress thresholds
 */
export interface Srs extends StaticIntervalSystem, ProgressThresholds {}

/**
 * Default SRS configurations that match the original StaticScheduler
 */
export const defaultSRS: Record<number, Srs> = {
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
    ],
    unlocksAt: 0,
    startsAt: 1,
    passesAt: 3,
    completesAt: 10,
  },
  2: {
    id: 2,
    name: 'Fast',
    intervals: [0, 43200, 172800, 432000, 1036800, 2160000, 3456000, 4752000],
    unlocksAt: 0,
    startsAt: 1,
    passesAt: 3,
    completesAt: 10,
  },
}

/**
 * A scheduler that utilizes static interval definitions with progress tracking
 */
export default class StaticProgressScheduler
  extends ProgressScheduler<boolean> {
  /** Initialize with user level and srs interval definitions */
  constructor({ srs, userLevel }: Partial<{
    srs: Record<number, Srs>
    userLevel: number
  }> = {}) {
    const srsConfig = srs || defaultSRS

    // Extract interval systems from SRS config
    const intervalSystems: Record<number, StaticIntervalSystem> = {}
    const thresholds: Record<number, ProgressThresholds> = {}

    Object.entries(srsConfig).forEach(([id, config]) => {
      const numId = Number(id)
      intervalSystems[numId] = {
        id: config.id,
        name: config.name,
        intervals: config.intervals,
      }
      thresholds[numId] = {
        id: config.id,
        name: config.name,
        unlocksAt: config.unlocksAt,
        startsAt: config.startsAt,
        passesAt: config.passesAt,
        completesAt: config.completesAt,
      }
    })

    // Create the base static interval scheduler
    const baseScheduler = new StaticIntervalScheduler({ intervalSystems })

    // Use the first SRS config for thresholds (could be made more sophisticated)
    const firstThresholds = Object.values(thresholds)[0] ||
      defaultProgressThresholds

    super({
      scheduler: baseScheduler,
      userLevel: userLevel || 0,
      thresholds: firstThresholds,
      progressExtractor: efactorExtractor, // Static scheduler uses efactor as stage
    })
  }
}
