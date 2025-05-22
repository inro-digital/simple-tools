/**
 * The subject is the concept being taught. The "permanent" data that is
 * likely provided from a relatively static resource.
 */
export interface Subject {
  /** unique id for a subject */
  id: string
  /** subject is no longer being used */
  hiddenAt?: Date
  /** Data properties we should learn against */
  learnCards: string[]
  /** Data properties we should quiz against */
  quizCards: string[]
  /** Data associated with a subject */
  // deno-lint-ignore no-explicit-any
  data: any
}

/**
 * The assignment is the mastery of a subject, and is the data updated when a
 * user answers a card. This includes all data needed to schedule the next
 * study, as well as dates representing checkpoints/targets.
 */
export interface Assignment {
  /** subject is available to be studied */
  availableAt?: Date
  /** subject is mastered, and should not be shown it */
  completedAt?: Date
  /** difficulty factor for FSRS algorithm (0-1) */
  difficulty?: number
  /** number representing expertise */
  efactor?: number
  /** number represeting time until next study; usually seconds or days */
  interval?: number
  /** number represeting times user remembered incorrectly */
  lapses?: number
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
  /** stability factor for FSRS algorithm */
  stability?: number
  /** eg New, Learning, Review, Relearning */
  state?: number | string
  /** Keeps track of the current step during the (re)learning stages */
  steps?: number
  /** user has learned the subject */
  startedAt?: Date
  /** subject is available to be learned */
  unlockedAt?: Date
}

/** How well a card is answered */
export enum CardState {
  Failure = 'Failure',
  Pending = 'Pending',
  Success = 'Success',
}

/**
 * The order in which cards are shown within a session relative to subjects.
 * Used in conjunction with cardSortOrder, which defines the order of cards
 * are shown relative to themselves
 */
export enum CardSortMethod {
  /** All cards of a subject should be shown together */
  'Paired' = 'Paired',
  /** All cards are shown in a random order */
  'Random' = 'Random',
  /** All cards of a type should be shown together */
  'Sequential' = 'Sequential',
}

/** Whether the current session can have a correct/incorrect state */
export enum SessionType {
  /** Cards cannot fail; scheduler will add a new assignment */
  'Learn' = 'Learn',
  /** Cards can fail; the scheduler will update an existing assignment */
  'Quiz' = 'Quiz',
}

/** Status of the current session */
export enum SessionStatus {
  'Active' = 'Active',
  'Completed' = 'Completed',
  'Inactive' = 'Inactive',
}
