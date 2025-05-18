import type { Assignment, Subject } from '../types.ts'
import Scheduler from '../scheduler.ts'
import { getNow, isSameDay } from '../utils/datetime.ts'
import { FSRS } from 'ts-fsrs'

const defaultParameters = {
  w: [
    0.4,
    0.6,
    2.4,
    5.8,
    4.93,
    0.94,
    0.86,
    0.01,
    1.49,
    0.14,
    0.94,
    2.18,
    0.05,
    0.34,
    1.26,
    0.29,
    2.61,
  ],
  requestRetention: 0.9,
  maximumInterval: 36500,
}

/**
 * Free Spaced Repetition Scheduler (FSRS) Algorithm
 * @reference https://github.com/open-spaced-repetition/fsrs4anki/discussions/3
 * @reference https://github.com/open-spaced-repetition/fsrs.js
 */
export default class FsrsScheduler extends Scheduler<number> {
  private fsrs: FSRS

  constructor(params = defaultParameters) {
    super()
    this.fsrs = new FSRS(params)
  }

  /**
   * Initializes a new assignment with default FSRS values
   */
  override add(subject: Subject): Assignment {
    return {
      subjectId: subject.id,
      markedCompleted: false,
      difficulty: 0.3,
      stability: 0,
      lastStudiedAt: getNow(),
      interval: 0,
      repetition: 0,
    }
  }

  /**
   * Only show cards that have a due date today or in the past
   */
  override filter(_subject: Subject, assignment: Assignment): boolean {
    if (assignment?.markedCompleted) return false
    const due = getDueDate(assignment)
    return !due || (due <= getNow())
  }

  /**
   * Sort by due date (oldest first). If same day, sort randomly
   */
  override sort(
    [_subjectA, assignmentA]: [Subject, Assignment],
    [_subjectB, assignmentB]: [Subject, Assignment],
  ): number {
    const aDue = getDueDate(assignmentA)
    const bDue = getDueDate(assignmentB)
    if (!aDue && bDue) return -1
    if (!bDue && aDue) return 1
    if (!aDue || !bDue) return (Math.random() - 0.5)
    if (isSameDay(aDue, bDue)) return (Math.random() - 0.5)
    return (aDue.getTime() - bDue.getTime())
  }

  /**
   * Updates the card's scheduling based on the FSRS algorithm.
   * The rating is on a scale of 1-4:
   * 1 = Again
   * 2 = Hard
   * 3 = Good
   * 4 = Easy
   */
  override update(
    rating: number,
    _subject: Subject,
    assignment: Assignment,
  ): Assignment {
    // Ensure rating is between 1-4
    const boundedRating = Math.min(Math.max(Math.round(rating), 1), 4)

    const now = getNow()
    const lastStudiedAt = assignment.lastStudiedAt || now

    // Create card input for FSRS
    const card = {
      due: assignment.lastStudiedAt ? getDueDate(assignment) || now : now,
      stability: assignment.stability || 0,
      difficulty: assignment.difficulty || 0.3,
      elapsed_days: (now.getTime() - lastStudiedAt.getTime()) /
        (1000 * 60 * 60 * 24),
      scheduled_days: assignment.interval || 0,
      reps: assignment.repetition || 0,
      lapses: 0,
      state: assignment.repetition === 0 ? 0 : 2, // 0 = New, 2 = Review
      learning_steps: 0,
    }

    try {
      // Get scheduling information from FSRS
      // deno-lint-ignore no-explicit-any
      const result = this.fsrs.repeat(card, now) as any

      // Extract the result based on the rating
      // deno-lint-ignore no-explicit-any
      const scheduled = result[boundedRating.toString()] as any

      if (!scheduled || !scheduled.card) return assignment

      return {
        ...assignment,
        stability: scheduled.card.stability,
        difficulty: scheduled.card.difficulty,
        lastStudiedAt: now,
        interval: scheduled.card.scheduled_days,
        repetition: (boundedRating === 1)
          ? 0
          : (assignment.repetition || 0) + 1,
      }
    } catch (error) {
      console.error('FSRS error:', error)
      // Fallback implementation if FSRS fails
      const newInterval = boundedRating === 1
        ? 1
        : boundedRating === 2
        ? 3
        : boundedRating === 3
        ? 7
        : Math.round((assignment.interval || 0) * 2.5)

      return {
        ...assignment,
        stability: assignment.stability || 0 + (boundedRating - 1),
        difficulty: Math.max(
          0.1,
          Math.min(
            1.0,
            (assignment.difficulty || 0.3) - (0.1 * (boundedRating - 3)),
          ),
        ),
        lastStudiedAt: now,
        interval: newInterval,
        repetition: (boundedRating === 1)
          ? 0
          : (assignment.repetition || 0) + 1,
      }
    }
  }
}

/**
 * Calculate due date for an assignment
 */
function getDueDate(assignment: Assignment): Date | undefined {
  if (!assignment.lastStudiedAt) return undefined
  const due = new Date(assignment.lastStudiedAt)
  due.setDate(due.getDate() + (assignment.interval || 0))
  return due
}
