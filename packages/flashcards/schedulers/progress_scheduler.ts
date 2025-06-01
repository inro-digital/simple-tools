/**
 * @module
 * A scheduler wrapper that adds progress tracking and level-based unlocking
 * to any underlying scheduler implementation.
 */
import type { Assignment, Subject } from '../types.ts'
import Scheduler from '../scheduler.ts'
import { DAY_MS, getNow } from '../../utils/datetime.ts'
import {
  defaultProgressThresholds,
  type ProgressExtractor,
  type ProgressThresholds,
  ProgressTracker,
  repetitionExtractor,
} from '../utils/progress.ts'

/**
 * A scheduler that wraps another scheduler with progress tracking functionality
 */
export default class ProgressScheduler<Quality> extends Scheduler<Quality> {
  private baseScheduler: Scheduler<Quality>
  private progressTracker: ProgressTracker

  constructor({
    scheduler,
    userLevel = 0,
    thresholds = defaultProgressThresholds,
    progressExtractor = repetitionExtractor,
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

  /**
   * Get the user's current level
   */
  get userLevel(): number {
    return this.progressTracker.userLevel
  }

  /**
   * Set the user's level
   */
  set userLevel(level: number) {
    this.progressTracker.userLevel = level
  }

  /**
   * Add a new assignment using the base scheduler, then apply progress tracking
   */
  override add(subject: Subject): Assignment {
    const baseAssignment = this.baseScheduler.add(subject)
    const progressData = this.progressTracker.initializeAssignment(subject.id)

    // Calculate availableAt if not set by base scheduler
    const baseTime = baseAssignment.lastStudiedAt || getNow()
    const availableAt = baseAssignment.availableAt ||
      (baseAssignment.interval !== undefined
        ? new Date(baseTime.getTime() + (baseAssignment.interval * DAY_MS))
        : baseTime)

    return {
      ...baseAssignment,
      ...progressData,
      availableAt,
    }
  }

  /**
   * Filter using both base scheduler and progress tracking
   */
  override filter(subject: Subject, assignment: Assignment): boolean {
    // Apply progress-based filtering first (level, completion)
    if (!this.progressTracker.filterByLevel(subject, assignment)) return false

    // Then check if base scheduler accepts it
    return this.baseScheduler.filter(subject, assignment)
  }

  /**
   * Filter learnable items using progress tracking requirements
   */
  override filterLearnable(
    subject: Subject,
    assignment: Assignment,
    allAssignments?: Record<string, Assignment>,
  ): boolean {
    // Apply progress-based learnable filtering first (includes level checks)
    if (
      !this.progressTracker.filterLearnable(subject, assignment, allAssignments)
    ) return false

    // Then check base scheduler's learnable filter
    return this.baseScheduler.filterLearnable(
      subject,
      assignment,
      allAssignments,
    )
  }

  /**
   * Filter quizzable items using both schedulers
   */
  override filterQuizzable(
    subject: Subject,
    assignment: Assignment,
    allAssignments?: Record<string, Assignment>,
  ): boolean {
    // First check base scheduler's quizzable filter (timing, due dates, etc.)
    if (
      !this.baseScheduler.filterQuizzable(subject, assignment, allAssignments)
    ) return false

    // Then apply progress-based quizzable filtering (has learning progress)
    return this.progressTracker.filterQuizzable(subject, assignment)
  }

  /**
   * Sort using progress tracker first, then base scheduler for tie-breaking
   */
  override sort(
    a: [Subject, Assignment],
    b: [Subject, Assignment],
  ): number {
    // First sort by progress (level and position)
    const progressSort = this.progressTracker.sort(a, b)
    if (progressSort !== 0) return progressSort

    // If progress sort is equal, use base scheduler's sort
    return this.baseScheduler.sort(a, b)
  }

  /**
   * Sort learnable items using progress tracker first
   */
  override sortLearnable(
    a: [Subject, Assignment],
    b: [Subject, Assignment],
  ): number {
    // First sort by progress (level and position)
    const progressSort = this.progressTracker.sort(a, b)
    if (progressSort !== 0) return progressSort

    // If progress sort is equal, use base scheduler's learnable sort
    return this.baseScheduler.sortLearnable(a, b)
  }

  /**
   * Sort quizzable items - let base scheduler handle this primarily
   */
  override sortQuizzable(
    a: [Subject, Assignment],
    b: [Subject, Assignment],
  ): number {
    return this.baseScheduler.sortQuizzable(a, b)
  }

  /**
   * Update assignment using base scheduler, then apply progress tracking
   */
  override update(
    quality: Quality,
    subject: Subject,
    assignment: Assignment,
  ): Assignment {
    // First let the base scheduler update the assignment
    const updatedAssignment = this.baseScheduler.update(
      quality,
      subject,
      assignment,
    )

    // Always recalculate availableAt based on interval for consistency
    const baseTime = updatedAssignment.lastStudiedAt || getNow()
    const availableAt = updatedAssignment.interval !== undefined
      ? new Date(baseTime.getTime() + (updatedAssignment.interval * DAY_MS))
      : (updatedAssignment.availableAt || baseTime)

    const finalAssignment = {
      ...updatedAssignment,
      availableAt,
    }

    // Then apply progress state updates
    return this.progressTracker.updateProgressStates(finalAssignment)
  }
}
