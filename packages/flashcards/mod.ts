import { associateBy } from '@std/collections/associate-by'
import State from '../utils/state.ts'
import Scheduler from './scheduler.ts'
import { type Assignment, CardState, type Subject } from './types.ts'

export { Scheduler }
export * from './types.ts'

const { Failure, Pending, Success } = CardState

/** The current state of flashcard study */
export interface FlashcardsState<Quality> {
  /** All assignments, as an array */
  assignments: Assignment[]
  /** All assignments, as an id/assignment record */
  assignmentsById: Record<string, Assignment>
  /** All subjects, as an array */
  subjects: Subject[]
  /** All subjects, as an id/assignment record */
  subjectsById: Record<string, Subject>
  /** Current assignment to answer */
  currAssignment: Assignment | null
  /** Whether the current card is passed/failed/pending answer */
  currCardState: CardState | null
  /** Each subject can have one card type per key */
  currCardType: string | null
  /** If a card is answered, what's the quality of the answer */
  currQuality: Quality | null
  /** The current subject to answer */
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

/**
 * Flashcard Class
 * @example Basic Usage
 * ```ts
 * import Flashcards from '@inro/simple-tools/flashcards'
 * import Sm2Scheduler from '@inro/simple-tools/flashcards/sm2'
 * const subjects = [{
 *   id: "1",
 *   learnKeys: ["answers"],
 *   quizKeys: ["answers"],
 *   data: {
 *     question: "What is your favorite color?",
 *     answers: ["blue"]
 *   }
 * }]
 *
 * type Quality = boolean
 * const deck = new Flashcards<Quality>({
 *   assignments: [],
 *   checkAnswer: (answer, subject) => subject.data.answers.includes(answer),
 *   checkPassing: (quality) => quality,
 *   scheduler: new Sm2Scheduler(),
 *   subjects,
 * })
 * console.log(deck.getAvailable().length) // 1
 * console.log(deck.state.currSubject?.id) // 1
 * deck.submit('blue')
 * assert(deck.state.assignmentsById['1'].startedAt) // 1
 */
export default class Flashcards<Q> extends State<FlashcardsState<Q>> {
  #scheduler: Scheduler<Q>
  #checkAnswer: (answer: string, subject: Subject) => Q
  #checkComplete: (quality: Q) => boolean

  /**
   * Flashcards are represented by:
   *  @property subjects: Static content to learn
   *   - assignments: Dynamic data representing user's learning progress
   *   - scheduler: Determines when/which subjects to display next
   *   - checkAnswer: Determines quality of answers (correct/incorrect, 1-5, etc)
   *   - checkComplete: Determines whether a subject should be shown again soon
   */
  constructor({ assignments, subjects, isLearnMode, ...options }: {
    /** All assignments, as an array */
    assignments: Assignment[]
    /** All subjects, as an array */
    subjects: Subject[]
    /** Is this study session a quiz or for teaching? */
    isLearnMode: boolean
    /** Scheduler for deciding which subjects to quiz/learn */
    scheduler: Scheduler<Q>
    /** Function to determine how well a user answered */
    checkAnswer: (answer: string, subject: Subject) => Q
    /** Check if the card should repeat within the same session */
    checkComplete: (quality: Q) => boolean
  }) {
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
    this.#checkComplete = options.checkComplete

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

  /** Reset the card state to be unanswered */
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
      const isPassing = this.#checkComplete(this.state.currQuality)
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
