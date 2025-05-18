import type { Assignment, Subject } from '../types.ts'
import Scheduler from '../scheduler.ts'
import { getNow, isSameDay } from '../utils/datetime.ts'

const defaultEfactor = 2.5
const defaultRepetition = 0
const defaultInterval = 0

export enum Quality {
  Blackout = 0,
  Incorrect = 1,
  AlmostCorrect = 2,
  BarelyCorrect = 3,
  Correct = 4,
  Perfect = 5,
}

/**
 * Supermemo2 Algorithm
 * @reference https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-obtained-in-working-with-the-supermemo-method
 * @reference https://super-memory.com/english/ol/sm2.htm
 */
export default class Sm2 extends Scheduler<number> {
  /**
   * 1. Ensures repetition and interval start at 0.
   * 2. Ensures that EF starts at 2.5
   */
  override add(subject: Subject): Assignment {
    return {
      efactor: defaultEfactor,
      interval: defaultInterval,
      markedCompleted: false,
      repetition: defaultRepetition,
      subjectId: subject.id,
    }
  }

  /**
   * Only show cards that have a due date today, or in the past
   * After each repetition session of a given day repeat again all items that scored below four
   */
  override filter(_subject: Subject, assignment: Assignment): boolean {
    if (assignment?.markedCompleted) return false
    const due = getDueDate(assignment)
    return !due || (due <= getNow())
  }

  /**
   * Sort by lastStudied. If they are the same day, sort randomly
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
   * Interval(1):=1
   * Interval(2):=6
   * for n>2: Interval(n):=Interval(n-1)*EF
   *
   * EF’:=EF+(0.1-(5-quality)*(0.08+(5-quality)*0.02))
   *
   * If the quality response was lower than 3 then start repetitions for the
   * item from the beginning without changing the E-Factor
   */
  override update(
    qualityInput: number,
    _subject: Subject,
    assignment: Assignment,
  ): Assignment {
    const prevLastStudiedAt = assignment.lastStudiedAt
    const prevRepetition = assignment.repetition ?? defaultRepetition
    const prevInterval = assignment.interval ?? defaultInterval
    const prevEfactor = assignment.efactor ?? defaultEfactor
    const quality = Math.min(qualityInput, 5)
    const efactorModifier = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
    const efactor = Math.max(1.3, prevEfactor + efactorModifier)
    const lastStudiedAt = getNow()

    if (quality < 4) {
      const studiedToday = isSameDay(
        prevLastStudiedAt || lastStudiedAt,
        lastStudiedAt,
      )
      return {
        ...assignment,
        efactor: (quality < 3) ? prevEfactor : efactor,
        lastStudiedAt,
        interval: studiedToday ? 0 : Math.min(1, prevInterval),
        repetition: 0,
      }
    } else if (prevRepetition === 0) {
      return {
        ...assignment,
        efactor,
        lastStudiedAt,
        interval: 1,
        repetition: 1,
      }
    } else if (prevRepetition === 1) {
      return {
        ...assignment,
        efactor,
        lastStudiedAt,
        interval: 6,
        repetition: 2,
      }
    } else {
      return {
        ...assignment,
        efactor,
        lastStudiedAt,
        interval: Math.round(prevInterval * prevEfactor),
        repetition: prevRepetition + 1,
      }
    }
  }
}

function getDueDate(assignment: Assignment): Date | undefined {
  if (!assignment.lastStudiedAt) return undefined
  const due = new Date(assignment.lastStudiedAt)
  due.setDate(due.getDate() + (assignment.interval ?? defaultInterval))
  return due
}
