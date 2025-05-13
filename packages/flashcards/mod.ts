import { associateBy } from '@std/collections/associate-by'
import State from '../utils/state.ts'

export interface Assignment {
  /** subject is available to be studied */
  availableAt?: number
  /** subject is mastered, and should not be shown it */
  completedAt?: number
  /** number representing expertise */
  efactor?: number
  /** number represeting time until next study; usually seconds or days */
  interval?: number
  /** last datetime the card was updated */
  lastStudied?: Date
  /** user has manually marked subject as completed; reversible */
  markedCompleted: boolean
  /**  dependent subjects can now be shown */
  passedAt?: number
  /** number representing times answer correctly */
  repetition?: number
  /** The ID of the subject this applies to*/
  subjectId: string
  /** user has learned the subject */
  startedAt?: number
  /** subject is available to be learned */
  unlockedAt?: number
  type: string
}

export const defaultAssignment: Assignment = {
  subjectId: '0',
  markedCompleted: false,
  type: '',
}

export interface Subject {
  id: string
  type: string
  created: string
  updated: string
  hidden?: string
  /** Data properties we should learn against */
  learnKeys: string[]
  /** Data properties we should quiz against */
  quizKeys: string[]
  data: unknown
}

export enum CardState {
  Failure = 'Failure',
  Pending = 'Pending',
  Success = 'Success',
}
const { Failure, Pending, Success } = CardState

export interface FlashcardsState {
  assignments: Assignment[]
  assignmentsById: Record<string, Assignment>
  subjects: Subject[]
  subjectsById: Record<string, Subject>
  currAssignment: Assignment | null
  currCardState: CardState | null
  currCardType: string | null
  currSubject: Subject | null
  /** Subjects that have been answered incorrectly */
  currFailures: Set<string>
  /** Order of pending subjectId/type pair, may have dupes if multiple tags */
  currPending: [string, string][]
  /** Subjects that have been answered correctly */
  currSuccesses: Set<string>
  /** Is this study session a quiz or for teaching? */
  isLearnMode: boolean
}

export const defaultState: FlashcardsState = {
  assignments: [],
  assignmentsById: {},
  subjects: [],
  subjectsById: {},
  isLearnMode: false,
  currAssignment: null,
  currCardState: null,
  currCardType: null,
  currSubject: null,
  currFailures: new Set(),
  currPending: [],
  currSuccesses: new Set(),
}

export type SubjectFilter = (
  subject: Subject,
  assignment: Assignment,
) => boolean

export interface FlashcardOptions {
  assignments: Assignment[]
  subjects: Subject[]
  isLearnMode: boolean
  filterAvailable?: SubjectFilter
  filterLearnable?: SubjectFilter
  filterQuizzable?: SubjectFilter
}

export default class Flashcards extends State<FlashcardsState> {
  #checkAnswer = (_answer: string, _subject: Subject) => true
  #checkIsPassing = (_assignment: Assignment) => false
  #getAvailableAt = (grade: CardState, _assignment: Assignment) => {
    if (grade === CardState.Success) return Date.now() + (24 * 60 * 60 * 1000)
    else return Date.now() + (24 * 60 * 60 * 1000)
  }
  #filterAvailable: SubjectFilter
  #filterLearnable: SubjectFilter
  #filterQuizzable: SubjectFilter

  constructor(
    { assignments, subjects, isLearnMode, ...options }: FlashcardOptions,
  ) {
    super({
      ...defaultState,
      assignments,
      isLearnMode,
      subjects,
      assignmentsById: associateBy<Assignment>(assignments, (a) => a.subjectId),
      subjectsById: associateBy<Subject>(subjects, (a) => a.id),
    }, { isReactive: true })

    this.#filterAvailable = options.filterAvailable ?? (() => true)
    this.#filterLearnable = options.filterLearnable ?? (() => true)
    this.#filterQuizzable = options.filterQuizzable ?? (() => true)

    this.state.currPending =
      (isLearnMode ? this.getLearnable() : this.getQuizzable())
        .flatMap(({ learnKeys, quizKeys, id }) => {
          return (isLearnMode ? learnKeys : quizKeys)
            .map((learnId) => [id, learnId] as [string, string])
        })
  }

  /** All subjects that can be learned or studied */
  getAvailable(): Subject[] {
    return this.state.subjects
      .filter((subject) => {
        const assignment = this.state.assignmentsById[subject.id]
        if (assignment?.markedCompleted || assignment?.completedAt) return false
        return this.#filterAvailable(subject, assignment)
      })
  }

  /** Get subjects that are ready to be learned */
  getLearnable(): Subject[] {
    return this.getAvailable()
      .filter((subject) => {
        const assignment = this.state.assignmentsById[subject.id]
        if (assignment?.startedAt) return false // Already learned
        return this.#filterLearnable(subject, assignment)
      })
  }

  /** Get subjects that are ready to be quizzed */
  getQuizzable(): Subject[] {
    return this.getAvailable()
      .filter((subject) => {
        const assignment = this.state.assignmentsById[subject.id]
        return this.#filterQuizzable(subject, assignment)
      })
  }

  /** Get all learned subjects */
  getStarted(): Subject[] {
    return this.state.subjects.filter((subject: Subject) => {
      const assignment = this.state.assignmentsById[subject.id]
      return assignment?.startedAt || assignment?.markedCompleted
    })
  }

  redo() {
    this.state.currCardState = Pending
  }

  /**
   * User submits their answer. This is a two-step process; if a user submits
   * an answer on a Pending card, we will set the card state to Success/Failure,
   * and the answer will be submitted on the next submit.
   */
  submit(answer: string): void {
    const { currAssignment, currCardState, currSubject, isLearnMode } =
      this.state
    if (!currSubject) return
    if (!isLearnMode && !currAssignment) {
      throw new Error('trying to quiz, but there is no assignment')
    }
    if (isLearnMode) {
      // If we are in "learn" mode, there is no checking.
      // We just need to set as learned, stage 0, and go next.
      const assignment: Assignment = {
        markedCompleted: false,
        subjectId: currSubject.id,
        startedAt: currAssignment?.startedAt ?? Date.now(),
        type: currSubject.type,
        unlockedAt: currAssignment?.unlockedAt ?? Date.now(),
      }
      assignment.availableAt = this.#getAvailableAt(Success, assignment)
      this.state.assignmentsById[currSubject.id] = assignment
    } else if (currCardState === Pending) {
      // If unanswered, don't submit answer. Just set to an answered state.
      const isCorrect = this.#checkAnswer(answer, currSubject)
      this.state.currCardState = isCorrect ? Success : Failure
    } else if (currCardState === Failure) {
      if (!this.#hasPreviouslyFailed()) {
        const availableAt = this.#getAvailableAt(Failure, currAssignment!)
        this.state.assignmentsById[currSubject.id] = {
          ...currAssignment!,
          availableAt,
        }
      }
      this.state.currFailures.add(currSubject.id)
    } else if (currCardState === Success && this.#isComplete()) {
      const { passedAt, startedAt, unlockedAt } = currAssignment!
      const isPassed = this.#checkIsPassing(currAssignment!)
      const availableAt = this.#getAvailableAt(Failure, currAssignment!)
      this.state.assignmentsById[currSubject.id] = {
        ...currAssignment!,
        availableAt,
        passedAt: passedAt ?? (isPassed ? Date.now() : undefined),
        startedAt: startedAt ?? Date.now(),
        unlockedAt: unlockedAt ?? Date.now(),
      }

      this.state.currSuccesses.add(currSubject.id)
    } else {
      throw new Error('Invalid State')
    }

    this.#loadAndShiftNext()
  }

  /* Has the current card already been failed? */
  #hasPreviouslyFailed() {
    const currId = this.state.currSubject?.id
    return Boolean(currId && this.state.currFailures.has(currId))
  }

  #isComplete() {
    const currId = this.state.currSubject?.id
    return !this.state.currPending
      .some(([subjectId]) => subjectId === currId)
  }

  /* Loads the next pending card */
  #loadNext() {
    const [subjectId, cardType] = this.state.currPending[0]
    this.state.currSubject = this.state.subjectsById[subjectId] ?? null
    this.state.currCardState = subjectId ? Pending : null
    this.state.currCardType = cardType ?? null
  }

  /* Loads the next pending card, and pops it out of currPending */
  #loadAndShiftNext() {
    if (!this.state.currPending?.length) return
    const prev = this.state.currPending.shift()
    if (prev && this.state.currCardState === Failure) {
      this.state.currPending.push(prev)
    }
    this.#loadNext()
  }
}
