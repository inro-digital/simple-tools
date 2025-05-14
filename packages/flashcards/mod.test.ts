import { assertEquals } from '@std/assert/equals'
import Flashcards from './mod.ts'
import StaticScheduler, { type Srs } from './schedulers/static.ts'

const srs: Record<number, Srs> = {
  [1]: {
    id: 1,
    name: 'SRS 1',
    unlocksAt: 0,
    startsAt: 1,
    passesAt: 2,
    completesAt: 6,
    intervals: [0, 10, 100, 1000, 10000],
  },
}

Deno.test('initializes flashcards', () => {
  const deck = new Flashcards<boolean>({
    assignments: [],
    isLearnMode: true,
    scheduler: new StaticScheduler({ srs, userLevel: 2 }),
    subjects: [],
    checkAnswer: () => true,
    checkPassing: () => true,
  })
  assertEquals(deck.getAvailable().length, 0)
})
