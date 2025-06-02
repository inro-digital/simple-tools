/**
 * @module
 * A scheduler wrapper that adds progress tracking and level-based unlocking
 * to any underlying scheduler implementation.
 */
import type { Assignment, Subject } from '../types.ts'
import Scheduler from '../scheduler.ts'
import { DAY_MS, getNow } from '../../utils/datetime.ts'

/**
 * Data that subjects need in their `data` property to work with progress tracking
 */
export interface ProgressSubjectData {
  /** Level that a subject is unlocked */
  level: number
  /** An array of subject ids that need to be passed before this subject is unlocked */
  requiredSubjects?: string[]
  /** Order in which the subject is displayed */
  position?: number
}

/**
 * Configuration for progress thresholds
 */
export interface ProgressThresholds {
  /** Identifier for the progress system */
  id: number
  /** Display name for the progress system */
  name: string
  /**
   * Once this threshold is reached, an assignment is "unlocked".
   * This generally means that an assignment is available to the user.
   */
  unlocksAt: number
  /**
   * Once this threshold is reached, an assignment is "started".
   * This generally means that a user has seen/learned the assignment.
   */
  startsAt: number
  /**
   * Once this threshold is reached, an assignment is "passed".
   * This generally means that dependent assignments become unlocked.
   */
  passesAt: number
  /**
   * Once this threshold is reached, an assignment is complete.
   * This generally means that a user has demonstrated "mastery", and that
   * this assignment no longer needs to be shown.
   */
  completesAt: number
}

/**
 * Function type for extracting progress value from an assignment
 */
export type ProgressExtractor = (assignment: Assignment) => number

/**
 * Default progress thresholds based on repetition count
 */
export const defaultProgressThresholds: ProgressThresholds = {
  id: 1,
  name: 'Default',
  unlocksAt: 0,
  startsAt: 1,
  passesAt: 3,
  completesAt: 10,
}

/** Progress tracking system that can be composed with any scheduler */
class ProgressTracker {
  /** A user's level. They should start at 1; 0 just means not initialized */
  userLevel: number = 0
  /** Progress thresholds configuration */
  thresholds: ProgressThresholds
  /** Function to extract progress value from assignment */
  progressExtractor: ProgressExtractor

  constructor({
    userLevel = 0,
    thresholds = defaultProgressThresholds,
    progressExtractor = (assignment) => assignment?.repetition || 0,
  }: {
    userLevel?: number
    thresholds?: ProgressThresholds
    progressExtractor?: ProgressExtractor
  } = {}) {
    this.userLevel = userLevel
    this.thresholds = thresholds
    this.progressExtractor = progressExtractor
  }

  /**
   * Check if subject is at appropriate level and not completed
   */
  filterByLevel(subject: Subject, assignment: Assignment): boolean {
    const { level = 0 } = subject.data as ProgressSubjectData
    if (level > this.userLevel) return false
    if (assignment?.markedCompleted || assignment?.completedAt) return false
    return true
  }

  /** Check if subject meets requirements and is learnable */
  filterLearnable(
    subject: Subject,
    assignment: Assignment,
    allAssignments?: Record<string, Assignment>,
  ): boolean {
    if (!this.filterByLevel(subject, assignment)) return false

    // Check if assignment has meaningful learning progress
    // Use the progress extractor to determine if learning has occurred
    const progressValue = this.progressExtractor(assignment)
    const hasStarted = progressValue > 0
    if (hasStarted) return false // Already has learning progress

    const { requiredSubjects = [] } = subject.data as ProgressSubjectData
    if (requiredSubjects.length > 0 && allAssignments) {
      const allRequiredPassed = requiredSubjects.every((reqSubjectId) => {
        const reqAssignment = allAssignments[reqSubjectId]
        return reqAssignment && reqAssignment.passedAt !== undefined
      })
      if (!allRequiredPassed) return false
    }

    return true
  }

  /** Check if subject is quizzable (learned but not completed) */
  filterQuizzable(subject: Subject, assignment: Assignment): boolean {
    if (!this.filterByLevel(subject, assignment)) return false

    // Check if assignment has meaningful learning progress
    // Use the progress extractor to determine if learning has occurred
    const progressValue = this.progressExtractor(assignment)
    const hasProgress = progressValue > 0
    if (!hasProgress) return false // Not learned yet

    return true
  }

  /** Sort subjects by level, then position */
  sort(
    [subjectA, _assignmentA]: [Subject, Assignment],
    [subjectB, _assignmentB]: [Subject, Assignment],
  ): number {
    const dataA = subjectA.data as ProgressSubjectData
    const dataB = subjectB.data as ProgressSubjectData

    // First sort by level
    if (dataA?.level && !dataB?.level) return -1
    if (dataB?.level && !dataA?.level) return 1
    if (dataA?.level !== dataB?.level) return dataA.level - dataB.level

    // Then sort by position within level
    return (dataA.position ?? 0) - (dataB.position ?? 0)
  }

  /** Update progress states based on current progress value */
  updateProgressStates(assignment: Assignment): Assignment {
    const progressValue = this.progressExtractor(assignment)
    const now = getNow()

    const isPassed = progressValue >= this.thresholds.passesAt
    const isCompleted = progressValue >= this.thresholds.completesAt

    return {
      ...assignment,
      passedAt: isPassed && !assignment.passedAt ? now : assignment.passedAt,
      completedAt: isCompleted ? now : assignment.completedAt,
    }
  }

  /** Initialize progress states for a new assignment */
  initializeAssignment(subjectId: string): Partial<Assignment> {
    const now = getNow()
    return {
      subjectId,
      markedCompleted: false,
      unlockedAt: now,
      startedAt: now,
    }
  }
}

/**
 * A scheduler that wraps another scheduler with progress tracking functionality
 */
export class ProgressScheduler<Quality> extends Scheduler<Quality> {
  private baseScheduler: Scheduler<Quality>
  private progressTracker: ProgressTracker

  /** Initialize with the wrapped scheduler, and progress params */
  constructor({
    scheduler,
    userLevel = 0,
    thresholds = defaultProgressThresholds,
    progressExtractor = (assignment) => assignment?.repetition || 0,
  }: {
    scheduler: Scheduler<Quality>
    userLevel?: number
    thresholds?: ProgressThresholds
    progressExtractor?: ProgressExtractor
  }) {
    super()
    this.baseScheduler = scheduler
    this.progressTracker = new ProgressTracker({
      userLevel,
      thresholds,
      progressExtractor,
    })
  }

  /** Get the user's current level */
  get userLevel(): number {
    return this.progressTracker.userLevel
  }

  /** Set the user's level */
  set userLevel(level: number) {
    this.progressTracker.userLevel = level
  }

  /**
   * Add a new assignment using the base scheduler, then apply progress tracking
   */
  override add(subject: Subject): Assignment {
    const baseAssignment = this.baseScheduler.add(subject)
    const baseTime = baseAssignment.lastStudiedAt || getNow()

    return {
      ...baseAssignment,
      ...this.progressTracker.initializeAssignment(subject.id),
      availableAt: baseAssignment.availableAt ||
        (baseAssignment.interval !== undefined
          ? new Date(baseTime.getTime() + (baseAssignment.interval * DAY_MS))
          : baseTime),
    }
  }

  /** Filter using both base scheduler and progress tracking */
  override filter(subject: Subject, assignment: Assignment): boolean {
    if (!this.progressTracker.filterByLevel(subject, assignment)) return false
    return this.baseScheduler.filter(subject, assignment)
  }

  /** Filter learnable items using progress tracking requirements */
  override filterLearnable(
    subject: Subject,
    assignment: Assignment,
    allAssignments?: Record<string, Assignment>,
  ): boolean {
    if (
      !this.progressTracker.filterLearnable(subject, assignment, allAssignments)
    ) return false

    return this.baseScheduler.filterLearnable(
      subject,
      assignment,
      allAssignments,
    )
  }

  /** Filter quizzable items using both schedulers */
  override filterQuizzable(
    subject: Subject,
    assignment: Assignment,
    allAssignments?: Record<string, Assignment>,
  ): boolean {
    if (
      !this.baseScheduler.filterQuizzable(subject, assignment, allAssignments)
    ) return false
    return this.progressTracker.filterQuizzable(subject, assignment)
  }

  /** Sort using progress tracker first, then base scheduler for tie-breaking */
  override sort(
    a: [Subject, Assignment],
    b: [Subject, Assignment],
  ): number {
    const progressSort = this.progressTracker.sort(a, b)
    return (progressSort !== 0) ? progressSort : this.baseScheduler.sort(a, b)
  }

  /** Sort learnable items using progress tracker first */
  override sortLearnable(
    a: [Subject, Assignment],
    b: [Subject, Assignment],
  ): number {
    const progressSort = this.progressTracker.sort(a, b)
    return (progressSort !== 0)
      ? progressSort
      : this.baseScheduler.sortLearnable(a, b)
  }

  /** Sort quizzable items - let base scheduler handle this primarily */
  override sortQuizzable(
    a: [Subject, Assignment],
    b: [Subject, Assignment],
  ): number {
    return this.baseScheduler.sortQuizzable(a, b)
  }

  /** Update assignment using base scheduler, then apply progress tracking */
  override update(
    quality: Quality,
    subject: Subject,
    assignment: Assignment,
  ): Assignment {
    const updated = this.baseScheduler.update(quality, subject, assignment)

    // Always recalculate availableAt based on interval for consistency
    const baseTime = updated.lastStudiedAt || getNow()

    return this.progressTracker.updateProgressStates({
      ...updated,
      availableAt: updated.interval !== undefined
        ? new Date(baseTime.getTime() + (updated.interval * DAY_MS))
        : (updated.availableAt || baseTime),
    })
  }
}
