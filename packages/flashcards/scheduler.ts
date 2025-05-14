import type { Assignment, Subject } from './types.ts'

/**
 * @module
 * The purpose of the scheduler is to update Assignments. It schedules when
 * we should next show
 */

/**
 * The scheduler class expects to be defined with a `Quality` type that defines
 * the grading scale.
 */
export default class Scheduler<Quality> {
  /**
   * Adds a new assignment; to be used when a user "learns" a new item.
   * Therefore, assume no existing assignment
   */
  add(this: Scheduler<Quality>, _subject: Subject): Assignment {
    throw new Error('add is not implemented')
  }

  /**
   * To be used as a predicate to filter an array of subject/assignments.
   * Helps determine what cards will be shown in a given timeframe.
   */
  filter(
    this: Scheduler<Quality>,
    _subject: Subject,
    _assignment: Assignment,
  ): boolean {
    return true
  }

  /**
   * A predicate for `.sort` methods, to help determine card priority
   */
  sort(
    this: Scheduler<Quality>,
    _a: [Subject, Assignment],
    _b: [Subject, Assignment],
  ): number {
    return 0
  }

  /**
   * This is the scheduler's grading algorithm, and is expected to update the
   * Scheduling with updated stats
   */
  update(
    this: Scheduler<Quality>,
    _quality: Quality,
    _subject: Subject,
    assignment: Assignment,
  ): Assignment {
    return assignment
  }
}
