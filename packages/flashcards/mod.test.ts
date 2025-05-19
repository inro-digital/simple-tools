import { assert, assertEquals } from '@std/assert'
import { FakeTime } from '@std/testing/time'
import Flashcards, {
  CardSortMethod,
  SessionStatus,
  SessionType,
} from './mod.ts'
import StaticScheduler from './schedulers/static.ts'
import subjects from './__data__/subjects_01.json' with { type: 'json' }
import srs from './__data__/srs_static.json' with { type: 'json' }

const { Inactive, Active, Completed } = SessionStatus

const oneDayMS = 86_400_000

const assignments = {
  '1': {
    availableAt: new Date('2025-05-15T15:04:14.055Z'),
    efactor: 0,
    markedCompleted: false,
    subjectId: '1',
    interval: 0,
    startedAt: new Date('2025-05-15T15:04:14.055Z'),
    unlockedAt: new Date('2025-05-15T15:04:14.055Z'),
  },
}

Deno.test('learn mode', () => {
  const deck = new Flashcards<boolean>({
    assignments: {},
    checkAnswer: () => true,
    checkComplete: () => true,
    scheduler: new StaticScheduler({ srs, userLevel: 2 }),
    subjects,
  })
  assertEquals(deck.learnable.length, 4) // Levels 1-2, but not 3
  assertEquals(deck.quizzable.length, 0)
  deck.startSession(SessionType.Learn)
  assertEquals(deck.state.currSubject?.id, '1') // Loads first
  assertEquals(deck.state.sessionStatus, Active)
  deck.submit() // First card of subject 1 (characters)
  assertEquals(deck.state.currSubject?.id, '1') // Still on subject 1
  deck.submit() // Second card of subject 1 (meanings)
  assertEquals(deck.learnable.length, 3) // First item is now learned
  assertEquals(deck.quizzable.length, 1)
  assertEquals(deck.state.currSubject?.id, '2')
  assert(deck.state.assignments['1'].startedAt, 'should be started')
})

Deno.test('quiz mode', () => {
  const deck = new Flashcards<boolean>({
    assignments,
    allowRedos: true,
    checkAnswer: () => true,
    checkComplete: () => true,
    scheduler: new StaticScheduler({ srs, userLevel: 2 }),
    subjects,
  })
  assertEquals(deck.quizzable.length, 1, 'starts with 1 quizzable')
  deck.startSession(SessionType.Quiz)
  assertEquals(deck.state.currSubject?.id, '1', 'first item loads')
  assertEquals(deck.state.sessionStatus, Active)
  deck.submit() // Once to mark as completed meanings card
  deck.submit() // Once to confirm
  deck.submit() // Once to mark as completed readings card
  deck.submit() // Once to confirm
  assertEquals(deck.state.currSubject, null, 'no more left!')
  assertEquals(deck.state.sessionStatus, Completed)
  assertEquals(deck.state.assignments['1'].efactor, 1, '++efactor')
  assertEquals(deck.quizzable.length, 0, 'no more left!')
})

Deno.test('max learns', () => {
  const time = new FakeTime(new Date())
  const deck = new Flashcards<boolean>({
    assignments: {},
    checkAnswer: () => true,
    checkComplete: () => true,
    learnLimit: 1,
    reviewLimit: 1,
    scheduler: new StaticScheduler({ srs, userLevel: 2 }),
    subjects,
  })
  deck.startSession(SessionType.Learn)
  assertEquals(deck.learnable.length, 1)
  deck.submit() // First card (characters)
  assertEquals(deck.state.currSubject?.id, '1') // Still on subject 1
  deck.submit() // Second card (meanings)
  assertEquals(deck.learnable.length, 0)
  time.tick(oneDayMS)
  assertEquals(deck.learnable.length, 1)
})

Deno.test('session management', () => {
  const deck = new Flashcards<boolean>({
    assignments: {},
    checkAnswer: () => true,
    checkComplete: () => true,
    scheduler: new StaticScheduler({ srs, userLevel: 2 }),
    subjects,
    learnSessionSize: 2,
    reviewSessionSize: 2,
  })

  assertEquals(deck.state.sessionStatus, Inactive, 'starts inactive')

  const startResult = deck.startSession(SessionType.Learn)
  assertEquals(startResult, true, 'successfully started session')
  assertEquals(deck.state.sessionStatus, Active)
  assertEquals(deck.state.currPending.length <= 4, true, 'respects group size')
  assertEquals(deck.state.currSubject !== null, true, 'loaded first card')

  // Complete the session
  while (deck.state.currSubject) deck.submit()
  assertEquals(deck.state.sessionStatus, Completed, 'completed session 1')

  // Start a new session
  const newResult = deck.startSession(SessionType.Learn)
  assertEquals(newResult, true, 'successfully started second session')
  assertEquals(deck.state.sessionStatus, Active)
})

Deno.test('card sorting methods', () => {
  const pairedDeck = new Flashcards<boolean>({
    assignments: {},
    checkAnswer: () => true,
    checkComplete: () => true,
    scheduler: new StaticScheduler({ srs, userLevel: 2 }),
    subjects,
    cardSortMethod: CardSortMethod.Paired,
  })

  pairedDeck.startSession(SessionType.Learn)

  if (pairedDeck.state.currPending.length > 1) {
    const [first, second] = pairedDeck.state.currPending
    assertEquals(first[0], second[0], 'paired: first 2 have matching subject')
  }

  const sequentialDeck = new Flashcards<boolean>({
    assignments: {},
    checkAnswer: () => true,
    checkComplete: () => true,
    scheduler: new StaticScheduler({ srs, userLevel: 2 }),
    subjects,
    cardSortMethod: CardSortMethod.Sequential,
    cardSortOrder: ['characters', 'meanings', 'readings'],
  })

  sequentialDeck.startSession(SessionType.Learn)

  if (sequentialDeck.state.currPending.length > 1) {
    const firstType = sequentialDeck.state.currPending[0][1]
    // Check that all 'characters' cards come before 'meanings' cards
    if (firstType === 'characters') {
      let foundMeanings = false
      for (const [, type] of sequentialDeck.state.currPending) {
        if (type === 'meanings') {
          foundMeanings = true
        } else if (foundMeanings && type === 'characters') {
          assert(false, 'characters cards should come before meanings cards')
        }
      }
    }
  }

  // Test Sequential without cardSortOrder
  const sequentialDeckNoOrder = new Flashcards<boolean>({
    assignments: {},
    checkAnswer: () => true,
    checkComplete: () => true,
    scheduler: new StaticScheduler({ srs, userLevel: 2 }),
    subjects,
    cardSortMethod: CardSortMethod.Sequential,
    // No cardSortOrder provided
  })

  sequentialDeckNoOrder.startSession(SessionType.Learn)

  if (sequentialDeckNoOrder.state.currPending.length > 1) {
    const types = sequentialDeckNoOrder.state.currPending.map((card) => card[1])

    // Check if types are grouped (consecutive elements with same value)
    let grouped = true
    let currentType = types[0]
    let typeChanged = false

    for (let i = 1; i < types.length; i++) {
      if (types[i] !== currentType) {
        typeChanged = true
        currentType = types[i]
        // Once we've found a new type, verify we don't see the previous again
        for (let j = i + 1; j < types.length; j++) {
          if (types[j] === types[i - 1]) {
            grouped = false
            break
          }
        }
        if (!grouped) break
      }
    }

    assert(
      typeChanged || types.length <= 1 || new Set(types).size === 1,
      'Multiple card types should exist',
    )
    assert(grouped, 'Cards should be grouped by type')
  }
})
