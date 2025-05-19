/**
 * @module
 * A basic scheduler that helps us to demonstrate how one is built. You probably
 * will find one of the other schedulers to be a bit more useful.
 */
import Scheduler from '../scheduler.ts'
import type { Assignment, Subject } from '../types.ts'

/** A basic scheduler to demonstrate usage */
export default class BasicScheduler extends Scheduler<number> {
  /** Ensure that repetition is an int */
  override add(subject: Subject): Assignment {
    return { markedCompleted: false, repetition: 0, subjectId: subject.id }
  }

  /** If answered correctly 3 times, skip it! */
  override filter(_subject: Subject, assignment: Assignment): boolean {
    if (assignment?.markedCompleted) return false
    return (assignment?.repetition ?? 0) < 3
  }

  /** Sort by least-repeated. If they are the same, then sort randomly! */
  override sort(
    [_subjectA, a]: [Subject, Assignment],
    [_subjectB, b]: [Subject, Assignment],
  ): number {
    if (!a.repetition) return -1
    if (!b.repetition) return 1
    return (a.repetition - b.repetition) || (Math.random() - 0.5)
  }

  /**
   * If answered correctly, increment the repetition
   * If answered incorrectly, decrement the repetition
   */
  override update(
    qualityInput: number,
    _subject: Subject,
    assignment: Assignment,
  ): Assignment {
    const repetition = assignment?.repetition ?? 0
    if (qualityInput) return { ...assignment, repetition: repetition + 1 }
    else return { ...assignment, repetition: Math.max(repetition - 1, 0) }
  }
}
