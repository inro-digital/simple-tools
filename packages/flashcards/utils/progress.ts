/**
 * @module
 * Progress tracking system for flashcard schedulers that handles level-based
 * unlocking, subject dependencies, and progress thresholds.
 */
import { getNow } from '../../utils/datetime.ts'
import type { Assignment, Subject } from '../types.ts'

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

/**
 * Default progress extractor that uses repetition count
 */
export const repetitionExtractor: ProgressExtractor = (assignment) =>
  assignment.repetition || 0

/**
 * Progress extractor for efactor-based systems (like static scheduler)
 */
export const efactorExtractor: ProgressExtractor = (assignment) =>
  assignment.efactor || 0

/**
 * Progress extractor for SM2 scheduler (uses repetition, ignoring starting efactor of 2.5)
 */
export const sm2ProgressExtractor: ProgressExtractor = (assignment) =>
  assignment.repetition || 0

/**
 * Progress tracking system that can be composed with any scheduler
 */
export class ProgressTracker {
  /** A user's level. They should start at 1; 0 just means not initialized */
  userLevel: number = 0
  /** Progress thresholds configuration */
  thresholds: ProgressThresholds
  /** Function to extract progress value from assignment */
  progressExtractor: ProgressExtractor

  constructor({
    userLevel = 0,
    thresholds = defaultProgressThresholds,
    progressExtractor = repetitionExtractor,
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

  /**
   * Check if subject meets requirements and is learnable
   */
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

  /**
   * Check if subject is quizzable (learned but not completed)
   */
  filterQuizzable(subject: Subject, assignment: Assignment): boolean {
    if (!this.filterByLevel(subject, assignment)) return false

    // Check if assignment has meaningful learning progress
    // Use the progress extractor to determine if learning has occurred
    const progressValue = this.progressExtractor(assignment)
    const hasProgress = progressValue > 0
    if (!hasProgress) return false // Not learned yet

    return true
  }

  /**
   * Sort subjects by level, then position
   */
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

  /**
   * Update progress states based on current progress value
   */
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

  /**
   * Initialize progress states for a new assignment
   */
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
