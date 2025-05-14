/**
 * The subject is the concept being taught. The "permanent" data that is
 * likely provided from a relatively static resource.
 */
export interface Subject {
  id: string
  type: string
  hidden?: string
  /** Data properties we should learn against */
  learnKeys: string[]
  /** Data properties we should quiz against */
  quizKeys: string[]
  data: unknown
}

/**
 * The assignment is the mastery of a subject, and is the data updated when a
 * user answers a card.
 */
export interface Assignment {
  /** subject is available to be studied */
  availableAt?: Date
  /** subject is mastered, and should not be shown it */
  completedAt?: Date
  /** number representing expertise */
  efactor?: number
  /** number represeting time until next study; usually seconds or days */
  interval?: number
  /** last datetime the card was updated */
  lastStudiedAt?: Date
  /** user has manually marked subject as completed; reversible */
  markedCompleted: boolean
  /**  dependent subjects can now be shown */
  passedAt?: Date
  /** number representing times answer correctly */
  repetition?: number
  /** The ID of the subject this applies to*/
  subjectId: string
  /** user has learned the subject */
  startedAt?: Date
  type: string
  /** subject is available to be learned */
  unlockedAt?: Date
}

export const defaultAssignment: Assignment = {
  subjectId: '0',
  markedCompleted: false,
  type: '',
}

export enum CardState {
  Failure = 'Failure',
  Pending = 'Pending',
  Success = 'Success',
}

export type SubjectFilter = (
  subject: Subject,
  assignment: Assignment,
) => boolean
