import State from '../utils/state.ts'
import Scheduler from './scheduler.ts'
import { type Assignment, CardState, StudyMode, type Subject } from './types.ts'
import { isToday } from './utils/datetime.ts'

export { Scheduler }
export * from './types.ts'

const { Learn, Quiz } = StudyMode
const { Failure, Pending, Success } = CardState

/** The current state of flashcard study */
export interface FlashcardsState<Quality> {
  /** Assignments by Id */
  assignments: Record<string, Assignment>
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
  /** Turns answer submission into a two-step process: 1. grade, 2. submit */
  allowRedos: boolean
  /** Is this study session a quiz or for teaching? */
  mode: StudyMode
  /** Maximum amount of new cards within a day */
  learnLimit: number | null
  /** Maximum amount of quizzes within a day */
  reviewLimit: number | null
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
 *   assignments: {},
 *   checkAnswer: (answer, subject) => subject.data.answers.includes(answer),
 *   checkPassing: (quality) => quality,
 *   scheduler: new Sm2Scheduler(),
 *   subjects,
 * })
 * console.log(deck.getAvailable().length) // 1
 * console.log(deck.state.currSubject?.id) // 1
 * deck.submit('blue')
 * assert(deck.state.assignments['1'].startedAt) // 1
 */
export default class Flashcards<Q> extends State<FlashcardsState<Q>> {
  #subjects: Record<string, Subject>
  #scheduler: Scheduler<Q>
  #checkAnswer: (answer: string, subject: Subject) => Q
  #checkComplete: (quality: Q) => boolean
  #numLearnedToday: number
  #numReviewedToday: number

  /**
   * Flashcards are represented by:
   *   - subjects: Static content to learn
   *   - assignments: Dynamic data representing user's learning progress
   *   - scheduler: Determines when/which subjects to display next
   *   - checkAnswer: Determines quality of answers (correct/incorrect, 1-5, etc)
   *   - checkComplete: Determines whether a subject should be shown again soon
   */
  constructor(options: {
    assignments: Record<string, Assignment>
    subjects: Record<string, Subject>
    scheduler: Scheduler<Q>
    allowRedos?: boolean
    mode?: StudyMode
    checkAnswer: (answer: string, subject: Subject) => Q
    checkComplete: (quality: Q) => boolean
    learnLimit?: number | null
    reviewLimit?: number | null
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
      assignments: options.assignments,
      allowRedos: options.allowRedos ?? false,
      mode: options.mode ?? Quiz,
      learnLimit: Math.max(0, options.learnLimit ?? 0) || null,
      reviewLimit: Math.max(0, options.reviewLimit ?? 0) || null,
    }, { isReactive: true })

    this.#subjects = options.subjects
    this.#scheduler = options.scheduler
    this.#checkAnswer = options.checkAnswer
    this.#checkComplete = options.checkComplete
    this.#numLearnedToday = 0
    this.#numReviewedToday = 0

    this.batch((state) => {
      state.currPending =
        (options.mode === Learn ? this.getLearnable() : this.getQuizzable())
          .flatMap(({ learnKeys, quizKeys, id }) => {
            return (options.mode === Learn ? learnKeys : quizKeys)
              .map((learnId) => [id, learnId] as [string, string])
          })

      this.#loadNext(state)
    })
  }

  /** Subjects by Id */
  get subjects(): Record<string, Subject> {
    return this.#subjects
  }

  /** All subjects */
  getAll(): Subject[] {
    this.#numLearnedToday = 0
    this.#numReviewedToday = 0

    return Object.keys(this.#subjects)
      .map((id) => {
        const { lastStudiedAt, startedAt } = this.state.assignments[id] || {}
        if (isToday(startedAt)) this.#numLearnedToday++
        else if (isToday(lastStudiedAt)) this.#numReviewedToday++
        return this.#subjects[id]
      })
  }

  /** All subjects that can be learned or studied */
  getAvailable(): Subject[] {
    return this.getAll()
      .filter((s) => this.#scheduler.filter(s, this.state.assignments[s.id]))
  }

  /** Get subjects that are ready to be learned */
  getLearnable(): Subject[] {
    const { assignments, learnLimit } = this.state
    const learnable = this.getAvailable()
      .filter((s) => this.#scheduler.filterLearnable(s, assignments[s.id]))
    if (!learnLimit) return learnable
    return learnable.slice(0, Math.max(0, learnLimit - this.#numLearnedToday))
  }

  /** Get subjects that are ready to be quizzed */
  getQuizzable(): Subject[] {
    const { assignments, reviewLimit } = this.state
    const quizzable = this.getAvailable()
      .filter((s) => this.#scheduler.filterQuizzable(s, assignments[s.id]))
    if (!reviewLimit) return quizzable
    return quizzable.slice(0, Math.max(0, reviewLimit - this.#numReviewedToday))
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
    this.batch((state) => {
      const { currAssignment, currSubject, mode } = state
      if (!currSubject) return

      // If this is a new concept, create an assignment and load next
      if (mode === Learn || !currAssignment) {
        const assignment = this.#scheduler.add(currSubject)
        state.assignments[currSubject.id] = assignment
        this.#loadAndShiftNext()
        return
      }

      if (state.currCardState === Pending) {
        state.currQuality = this.#checkAnswer(answer, currSubject)
        state.currCardState = this.#checkComplete(state.currQuality)
          ? Success
          : Failure
        // If allowing redos, don't submit answer. Just set to an answered state.
        if (state.allowRedos) return
      }

      if (state.currCardState === Failure) {
        if (!this.#hasPreviouslyFailed()) {
          state.assignments[currSubject.id] = this.#scheduler.update(
            state.currQuality!,
            currSubject,
            currAssignment!,
          )
        }
        state.currFailures.add(currSubject.id)
      } else if (state.currCardState === Success) {
        if (this.#isLastRemainingCard()) {
          state.assignments[currSubject.id] = this.#scheduler.update(
            state.currQuality!,
            currSubject,
            currAssignment!,
          )
          state.currSuccesses.add(currSubject.id)
        }
      } else {
        throw new Error('Invalid State')
      }

      this.#loadAndShiftNext()
    })
  }

  /** Has the current card already been failed? */
  #hasPreviouslyFailed() {
    const currId = this.state.currSubject?.id
    return Boolean(currId && this.state.currFailures.has(currId))
  }

  /** There is no more cards for the subject */
  #isLastRemainingCard() {
    const currId = this.state.currSubject?.id
    return this.state.currPending
      .filter(([subjectId]) => subjectId === currId).length <= 1
  }

  /* Loads the next pending card */
  #loadNext(state: FlashcardsState<Q>) {
    const [subjectId, cardType] = this.state.currPending[0] || []
    state.currSubject = this.#subjects[subjectId] ?? null
    state.currAssignment = state.assignments[subjectId] ?? null
    state.currCardState = subjectId ? Pending : null
    state.currCardType = cardType ?? null
  }

  /* Loads the next pending card, and pops it out of currPending */
  #loadAndShiftNext() {
    if (!this.state.currPending?.length) return
    this.batch((state) => {
      const prev = state.currPending.shift()
      if (prev && state.currCardState === Failure) {
        state.currPending.push(prev)
      }
      this.#loadNext(state)
    })
  }
}
