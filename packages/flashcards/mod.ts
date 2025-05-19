import { associateBy } from '@std/collections'
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
import { isToday } from './utils/datetime.ts'

export { Scheduler }
export * from './types.ts'

const { Learn, Quiz } = SessionType
const { Failure, Pending, Success } = CardState
const { Active, Completed, Inactive } = SessionStatus
const { Paired, Random, Sequential } = CardSortMethod

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
  mode: SessionType
  /** Maximum amount of new cards within a day */
  learnLimit: number | null
  /** Maximum amount of quizzes within a day */
  reviewLimit: number | null
  /** Status of the current session */
  sessionStatus: SessionStatus
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
    subjects: Record<string, Subject> | Subject[]
    scheduler: Scheduler<Q>
    allowRedos?: boolean
    mode?: SessionType
    checkAnswer: (answer: string, subject: Subject) => Q
    checkComplete: (quality: Q) => boolean
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
      mode: options.mode ?? Quiz,
      learnLimit: Math.max(0, options.learnLimit ?? 0) || null,
      reviewLimit: Math.max(0, options.reviewLimit ?? 0) || null,
      sessionStatus: Inactive,
      cardSortMethod: options.cardSortMethod ?? Paired,
      cardSortOrder: options.cardSortOrder ?? null,
      learnSessionSize: options.learnSessionSize ?? null,
      reviewSessionSize: options.reviewSessionSize ?? null,
      allPending: [],
    }, { isReactive: true })

    this.#subjects = Array.isArray(options.subjects)
      ? associateBy(options.subjects, (subject) => subject.id)
      : options.subjects

    this.#scheduler = options.scheduler
    this.#checkAnswer = options.checkAnswer
    this.#checkComplete = options.checkComplete
    this.#numLearnedToday = 0
    this.#numReviewedToday = 0

    this.batch((state) => {
      state.allPending =
        (options.mode === Learn ? this.getLearnable() : this.getQuizzable())
          .flatMap(({ learnCards, quizCards, id }) => {
            return (options.mode === Learn ? learnCards : quizCards)
              .map((cardType) => [id, cardType] as [string, string])
          })

      // Auto-start a session if needed
      if (state.allPending.length > 0) this.startSession(options.mode ?? Quiz)
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
      const { currAssignment, currSubject, mode, sessionStatus } = state
      if (!currSubject) return
      if (sessionStatus === Inactive) {
        this.startSession(mode)
        return
      }

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
   * Start a new study session with the specified mode
   * @param mode The study mode to use for this session
   * @returns True if session was started, false if no cards are available
   */
  startSession(mode: SessionType = this.state.mode): boolean {
    return this.batch<boolean>((state) => {
      state.mode = mode
      state.currFailures = new Set()
      state.currSuccesses = new Set()
      state.currPending = []
      state.currSubject = null
      state.currAssignment = null
      state.currCardState = null
      state.currCardType = null
      state.currQuality = null

      const available = mode === Learn
        ? this.getLearnable()
        : this.getQuizzable()
      if (!available.length) {
        state.sessionStatus = Inactive
        return false
      }

      // Get subjects for this session based on session size limits
      const sessionSize = mode === Learn
        ? state.learnSessionSize
        : state.reviewSessionSize
      const subjectsForSession = sessionSize
        ? available.slice(0, sessionSize)
        : available

      const sessionCards: [string, string][] = subjectsForSession.flatMap(
        ({ learnCards, quizCards, id }) => {
          return (mode === Learn ? learnCards : quizCards)
            .map((cardType) => [id, cardType] as [string, string])
        },
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
}
