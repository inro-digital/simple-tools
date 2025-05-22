/**
 * @module
 * A flashcard deck helps us maintain the state for any flashcard-based app.
 * By using a custom scheduler, the sky is the limit! However, we also provide
 * some commonly-used schedulers that could be helpful.
 */
import { associateBy } from '@std/collections'
import { isToday } from '../utils/datetime.ts'
import State from '../utils/state.ts'
import Scheduler from './scheduler.ts'
import {
  type Assignment,
  CardSortMethod,
  CardState,
  SessionStatus,
  SessionType,
  type Subject,
} from './types.ts'

export { Scheduler }
export * from './types.ts'

const { Learn, Quiz } = SessionType
const { Active, Completed, Inactive } = SessionStatus
const { Paired, Random, Sequential } = CardSortMethod
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
  /** Maximum amount of new cards within a day */
  learnLimit: number | null
  /** Maximum amount of quizzes within a day */
  reviewLimit: number | null
  /** Status of the current session */
  sessionStatus: SessionStatus
  /** Is this study session a quiz or for teaching? */
  sessionType: SessionType | null
  /** Method to determine the order of cards within a session */
  cardSortMethod: CardSortMethod
  /** Specific order of card types to show (null means random) */
  cardSortOrder: string[] | null
  /** Maximum number of subjects to include in a learn session */
  learnSessionSize: number | null
  /** Maximum number of subjects to include in a review session */
  reviewSessionSize: number | null
  /** All available subjectId/cardType pairs (session independent) */
  allPending: [string, string][]
}

/**
 * Flashcard Class
 * @example Basic Usage
 * ```ts
 * import Flashcards from '@inro/simple-tools/flashcards'
 * import Sm2Scheduler from '@inro/simple-tools/flashcards/sm2'
 * const subjects = [{
 *   id: "1",
 *   learnCards: ["answers"],
 *   quizCards: ["answers"],
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
export default class Flashcards<Q, A> extends State<FlashcardsState<Q>> {
  #subjects: Record<string, Subject> = {}
  #scheduler: Scheduler<Q>
  #checkAnswer: (answer: A, subject: Subject, cardType: string) => Q
  #checkSuccess: (quality: Q) => boolean
  #numLearnedToday: number
  #numReviewedToday: number

  /**
   * Flashcards are represented by:
   *   - subjects: Static content to learn
   *   - assignments: Dynamic data representing user's learning progress
   *   - scheduler: Determines when/which subjects to display next
   *   - checkAnswer: Determines quality of answers (correct/incorrect, 1-5, etc)
   *   - checkSuccess: Determines whether a subject should be shown again soon
   */
  constructor(options: {
    assignments: Record<string, Assignment>
    subjects: Record<string, Subject> | Subject[]
    scheduler: Scheduler<Q>
    allowRedos?: boolean
    checkAnswer: (answer: A, subject: Subject, cardType: string) => Q
    checkSuccess: (quality: Q) => boolean
    learnLimit?: number | null
    reviewLimit?: number | null
    learnSessionSize?: number | null
    reviewSessionSize?: number | null
    cardSortMethod?: CardSortMethod
    cardSortOrder?: string[] | null
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
      learnLimit: Math.max(0, options.learnLimit ?? 0) || null,
      reviewLimit: Math.max(0, options.reviewLimit ?? 0) || null,
      sessionStatus: Inactive,
      sessionType: null,
      cardSortMethod: options.cardSortMethod ?? Paired,
      cardSortOrder: options.cardSortOrder ?? null,
      learnSessionSize: options.learnSessionSize ?? null,
      reviewSessionSize: options.reviewSessionSize ?? null,
      allPending: [],
    }, { isReactive: true })
    this.#scheduler = options.scheduler
    this.#checkAnswer = options.checkAnswer
    this.#checkSuccess = options.checkSuccess
    this.#numLearnedToday = 0
    this.#numReviewedToday = 0
    this.subjects = options.subjects
  }

  /** Swap schedulers */
  set scheduler(scheduler: Scheduler<Q>) {
    this.#scheduler = scheduler
    this.#updatePending()
  }

  /** Update subjects */
  set subjects(subjects: Record<string, Subject> | Subject[]) {
    this.#subjects = Array.isArray(subjects)
      ? associateBy(subjects, (subject) => subject.id)
      : subjects
    this.#updatePending()
  }

  /** Subjects by Id */
  get subjects(): Record<string, Subject> {
    return this.#subjects
  }

  /** All subjects */
  get all(): Subject[] {
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
  get available(): Subject[] {
    return this.all
      .filter((s) => this.#scheduler.filter(s, this.state.assignments[s.id]))
  }

  /** Get subjects that are ready to be learned */
  get learnable(): Subject[] {
    const { assignments, learnLimit } = this.state
    const learnable = this.available
      .filter((s) =>
        this.#scheduler.filterLearnable(s, assignments[s.id], assignments)
      )
    if (!learnLimit) return learnable
    return learnable.slice(0, Math.max(0, learnLimit - this.#numLearnedToday))
  }

  /** Get subjects that are ready to be quizzed */
  get quizzable(): Subject[] {
    const { assignments, reviewLimit } = this.state
    const quizzable = this.available
      .filter((s) =>
        this.#scheduler.filterQuizzable(s, assignments[s.id], assignments)
      )
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
  submit(answer: A): void {
    this.batch((state) => {
      const { currAssignment, currSubject, sessionType, sessionStatus } = state
      if (!currSubject || !sessionType) return
      if (sessionStatus === Inactive) {
        this.startSession(sessionType)
        return
      }

      // If this is a new concept, create an assignment and load next
      if (sessionType === Learn || !currAssignment) {
        const assignment = this.#scheduler.add(currSubject)
        state.assignments[currSubject.id] = assignment
        this.#loadAndShiftNext()
        return
      }

      if (state.currCardState === Pending) {
        state.currQuality = this.#checkAnswer(
          answer,
          currSubject,
          state.currCardType!,
        )
        state.currCardState = this.#checkSuccess(state.currQuality)
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

      // Also update allPending when a card is successfully learned/reviewed
      if (state.currCardState === Success) {
        const currId = currSubject.id
        const currType = state.currCardType
        state.allPending = state.allPending.filter(
          ([id, type]) => !(id === currId && type === currType),
        )
      }

      this.#loadAndShiftNext()
    })
  }

  /**
   * Start a new study session with the specified sessionType
   * @param sessionType The study sessionType to use for this session
   * @returns True if session was started, false if no cards are available
   */
  startSession(sessionType: SessionType): boolean {
    return this.batch<boolean>((state) => {
      state.currFailures = new Set()
      state.currSuccesses = new Set()
      state.currPending = []
      state.currSubject = null
      state.currAssignment = null
      state.currCardState = null
      state.currCardType = null
      state.currQuality = null
      state.sessionType = sessionType
      const isQuiz = sessionType === Quiz

      const available = isQuiz
        ? this.quizzable.sort((a, b) =>
          this.#scheduler.sortQuizzable(
            [a, state.assignments[a.id]],
            [b, state.assignments[b.id]],
          )
        )
        : this.learnable.sort((a, b) =>
          this.#scheduler.sortLearnable(
            [a, state.assignments[a.id]],
            [b, state.assignments[b.id]],
          )
        )
      if (!available.length) {
        state.sessionStatus = Inactive
        return false
      }

      const sessionSize = isQuiz
        ? state.reviewSessionSize
        : state.learnSessionSize

      const subjectsForSession = sessionSize
        ? available.slice(0, sessionSize)
        : available

      const sessionCards: [string, string][] = subjectsForSession.flatMap(
        ({ learnCards, quizCards, id }) =>
          (isQuiz ? quizCards : learnCards)
            .map((cardType) => [id, cardType] as [string, string]),
      )

      if (state.cardSortMethod === Paired) {
        sessionCards.sort((a, b) => a[0].localeCompare(b[0]))
      } else if (state.cardSortMethod === Sequential) {
        if (state.cardSortOrder) {
          sessionCards.sort((a, b) => {
            const indexA = state.cardSortOrder!.indexOf(a[1])
            const indexB = state.cardSortOrder!.indexOf(b[1])
            return (indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA) -
              (indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB)
          })
        } else {
          // Group by card type but randomize within each group
          const cardsByType = new Map<string, [string, string][]>()
          sessionCards.forEach((card) => {
            const cardType = card[1]
            if (!cardsByType.has(cardType)) cardsByType.set(cardType, [])
            cardsByType.get(cardType)!.push(card)
          })

          cardsByType.forEach((cards) => {
            for (let i = cards.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1))
              ;[cards[i], cards[j]] = [cards[j], cards[i]]
            }
          })

          sessionCards.splice(
            0,
            sessionCards.length,
            ...Array.from(cardsByType.values()).flat(),
          )
        }
      } else if (state.cardSortMethod === Random) {
        for (let i = sessionCards.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[sessionCards[i], sessionCards[j]] = [
            sessionCards[j],
            sessionCards[i],
          ]
        }
      }

      state.currPending = sessionCards
      state.sessionStatus = Active

      this.#loadNext(state)
      return true
    })
  }

  /** Has the current card already been failed? */
  #hasPreviouslyFailed() {
    const currId = this.state.currSubject?.id
    return Boolean(currId && this.state.currFailures.has(currId))
  }

  /** Is this the last remaining card for the current subject? */
  #isLastRemainingCard() {
    const currId = this.state.currSubject?.id
    return this.state.currPending
      .filter(([subjectId]) => subjectId === currId).length <= 1
  }

  /* Loads the next pending card */
  #loadNext(state: FlashcardsState<Q>) {
    const [subjectId, cardType] = state.currPending[0] || []
    state.currSubject = this.#subjects[subjectId] ?? null
    state.currAssignment = state.assignments[subjectId] ?? null
    state.currCardState = subjectId ? Pending : null
    state.currCardType = cardType ?? null

    if (!subjectId && state.sessionStatus === Active) {
      state.sessionStatus = Completed
    }
  }

  /* Loads the next pending card, and pops it out of currPending */
  #loadAndShiftNext() {
    if (!this.state.currPending?.length) {
      // End of session
      this.batch((state) => {
        if (state.sessionStatus === Active) {
          state.sessionStatus = Completed
          state.currSubject = null
          state.currAssignment = null
          state.currCardState = null
          state.currCardType = null
        }
      })
      return
    }

    this.batch((state) => {
      const prev = state.currPending.shift()
      if (prev && state.currCardState === Failure) {
        state.currPending.push(prev)
      }
      this.#loadNext(state)
    })
  }

  #updatePending() {
    this.batch((state) => {
      const isQuiz = state.sessionType === Quiz

      state.allPending = (isQuiz ? this.quizzable : this.learnable)
        .flatMap(({ learnCards, quizCards, id }) =>
          (isQuiz ? quizCards : learnCards)
            .map((cardType) => [id, cardType] as [string, string])
        )
    })
  }
}
