import { assertEquals } from '@std/assert/equals'
import Flashcards from './mod.ts'

Deno.test('initializes flashcards', () => {
  const deck = new Flashcards({
    isLearnMode: true,
    assignments: [],
    subjects: [],
  })
  assertEquals(deck.getAvailable().length, 0)
})
