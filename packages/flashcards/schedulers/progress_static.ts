/**
 * @module
 * A scheduler with statically-tiered due-dates
 */
import {
  type StaticIntervals,
  StaticQuality,
  StaticScheduler,
} from './static.ts'
import {
  defaultProgressThresholds,
  ProgressScheduler,
  type ProgressThresholds,
} from './progress.ts'

/**
 * Data that is necessary to include in the subject's `data` property, in order
 * for this scheduler to function.
 */
export interface StaticProgressSubjectData {
  /** Level that a subject is unlocked */
  level: number
  /** Represents which srs interval to use */
  srsId: number
  /** An array of subject ids that need to be passed before this subject is unlocked */
  requiredSubjects?: string[]
  /** Order in which the subject is displayed */
  position?: number
}

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

/** Default SRS configurations */
export const defaultSRS: Record<number, Srs> = {
  1: {
    id: 1,
    name: 'Default',
    // deno-fmt-ignore
    intervals: [ 0, 86400, 259200, 604800, 1209600, 1987200, 3024000, 4320000, 5616000, 7344000 ],
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

/** A scheduler that utilizes static interval definitions */
export class StaticProgressScheduler extends ProgressScheduler<StaticQuality> {
  /** Initialize with user level and srs interval definitions */
  constructor({ srs, userLevel }: Partial<{
    srs: Record<number, Srs>
    userLevel: number
  }> = {}) {
    const srsConfig = srs || defaultSRS
    const intervalSystems: Record<number, StaticIntervals> = {}
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

    super({
      scheduler: new StaticScheduler({ intervalSystems }),
      userLevel: userLevel || 0,
      thresholds: Object.values(thresholds)[0] || defaultProgressThresholds,
      progressExtractor: (assignment) => {
        if (!assignment) return 0
        // If assignment has been started, it has progress regardless of efactor
        if (assignment.startedAt) return assignment.efactor || 1
        return assignment?.efactor || 0
      },
    })
  }
}

export { StaticQuality }
