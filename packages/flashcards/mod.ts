import { associateBy } from '@std/collections/associate-by'
import State from '../utils/state.ts'
import type Scheduler from './scheduler.ts'
import { type Assignment, CardState, type Subject } from './types.ts'
export * from './types.ts'

const { Failure, Pending, Success } = CardState

export interface FlashcardsState<Quality> {
  assignments: Assignment[]
  assignmentsById: Record<string, Assignment>
  subjects: Subject[]
  subjectsById: Record<string, Subject>
  currAssignment: Assignment | null
  currCardState: CardState | null
  currCardType: string | null
  currQuality: Quality | null
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

export interface FlashcardOptions<Quality> {
  assignments: Assignment[]
  subjects: Subject[]
  isLearnMode: boolean
  scheduler: Scheduler<Quality>
  checkAnswer: (answer: string, subject: Subject) => Quality
  checkPassing: (quality: Quality) => boolean
}

export default class Flashcards<Quality>
  extends State<FlashcardsState<Quality>> {
  #scheduler: Scheduler<Quality>
  #checkAnswer: (answer: string, subject: Subject) => Quality
  #checkPassing: (quality: Quality) => boolean

  constructor(
    { assignments, subjects, isLearnMode, ...options }: FlashcardOptions<
      Quality
    >,
  ) {
    super({
      currAssignment: null,
      currCardState: null,
      currCardType: null,
      currQuality: null,
      currSubject: null,
      currFailures: new Set(),
      currPending: [],
      currSuccesses: new Set(),
      assignments: assignments,
      isLearnMode,
      subjects,
      assignmentsById: associateBy<Assignment>(assignments, (a) => a.subjectId),
      subjectsById: associateBy<Subject>(subjects, (a) => a.id),
    }, { isReactive: true })

    this.#scheduler = options.scheduler
    this.#checkAnswer = options.checkAnswer
    this.#checkPassing = options.checkPassing

    this.state.currPending =
      (isLearnMode ? this.getLearnable() : this.getQuizzable())
        .flatMap(({ learnKeys, quizKeys, id }) => {
          return (isLearnMode ? learnKeys : quizKeys)
            .map((learnId) => [id, learnId] as [string, string])
        })

    this.#loadNext()
  }

  /** All subjects that can be learned or studied */
  getAvailable(): Subject[] {
    return this.state.subjects
      .filter((subject) => {
        const assignment = this.state.assignmentsById[subject.id]
        return this.#scheduler.filter(subject, assignment)
      })
  }

  /** Get subjects that are ready to be learned */
  getLearnable(): Subject[] {
    return this.getAvailable()
      .filter((subject) => {
        const assignment = this.state.assignmentsById[subject.id]
        return this.#scheduler.filterLearnable(subject, assignment)
      })
  }

  /** Get subjects that are ready to be quizzed */
  getQuizzable(): Subject[] {
    return this.getAvailable()
      .filter((subject) => {
        const assignment = this.state.assignmentsById[subject.id]
        return this.#scheduler.filterLearnable(subject, assignment)
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
  submit(answer: string = ''): void {
    const { currAssignment, currCardState, currSubject, isLearnMode } =
      this.state
    if (!currSubject) return
    if (!isLearnMode && !currAssignment) {
      throw new Error('trying to quiz, but there is no assignment')
    }
    if (isLearnMode) {
      const assignment = this.#scheduler.add(currSubject)
      this.state.assignmentsById[currSubject.id] = assignment
    } else if (currCardState === Pending) {
      // If unanswered, don't submit answer. Just set to an answered state.
      this.state.currQuality = this.#checkAnswer(answer, currSubject)
      const isPassing = this.#checkPassing(this.state.currQuality)
      this.state.currCardState = isPassing ? Success : Failure
    } else if (currCardState === Failure) {
      if (!this.#hasPreviouslyFailed()) {
        this.state.assignmentsById[currSubject.id] = this.#scheduler.update(
          this.state.currQuality!,
          currSubject,
          currAssignment!,
        )
      }
      this.state.currFailures.add(currSubject.id)
    } else if (currCardState === Success && this.#isComplete()) {
      this.state.assignmentsById[currSubject.id] = this.#scheduler.update(
        this.state.currQuality!,
        currSubject,
        currAssignment!,
      )
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
