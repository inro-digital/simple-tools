import { assert, assertEquals } from '@std/assert'
import { FakeTime } from '@std/testing/time'
import Flashcards, { StudyMode } from './mod.ts'
import StaticScheduler from './schedulers/static.ts'
import subjects from './__data__/subjects_01.json' with { type: 'json' }
import srs from './__data__/srs_01.json' with { type: 'json' }

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
    mode: StudyMode.Learn,
    scheduler: new StaticScheduler({ srs, userLevel: 2 }),
    subjects,
  })
  assertEquals(deck.getLearnable().length, 4) // Levels 1-2, but not 3
  assertEquals(deck.getQuizzable().length, 0)
  assertEquals(deck.state.currSubject?.id, '1') // Loads first
  deck.submit()
  assertEquals(deck.getLearnable().length, 3) // First item is now learned
  assertEquals(deck.getQuizzable().length, 1)
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
  assertEquals(deck.getQuizzable().length, 1, 'starts with 1 quizzable')
  assertEquals(deck.state.currSubject?.id, '1', 'first item loads')
  deck.submit() // Once to marked as completed reading card
  deck.submit() // Once to confirm
  deck.submit() // Once to marked as completed meaning card
  deck.submit() // Once to confirm
  assertEquals(deck.state.currSubject, null, 'no more left!')
  assertEquals(deck.state.assignments['1'].efactor, 1, '++efactor')
  assertEquals(deck.getQuizzable().length, 0, 'no more left!')
})

Deno.test('max learns', () => {
  const time = new FakeTime(new Date())
  const deck = new Flashcards<boolean>({
    assignments: {},
    checkAnswer: () => true,
    checkComplete: () => true,
    mode: StudyMode.Learn,
    maxLearns: 1,
    maxReviews: 1,
    scheduler: new StaticScheduler({ srs, userLevel: 2 }),
    subjects,
  })
  assertEquals(deck.getLearnable().length, 1)
  deck.submit()
  assertEquals(deck.getLearnable().length, 0)
  time.tick(oneDayMS)
  assertEquals(deck.getLearnable().length, 1)
})
