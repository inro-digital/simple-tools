import { assertEquals } from '@std/assert/equals'
import Flashcards from './mod.ts'
import BasicScheduler from './schedulers/basic.ts'

Deno.test('initializes flashcards', () => {
  const deck = new Flashcards({
    isLearnMode: true,
    assignments: [],
    subjects: [],
    scheduler: new BasicScheduler(),
  })
  assertEquals(deck.getAvailable().length, 0)
})
