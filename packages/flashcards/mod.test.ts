import { assert, assertEquals } from '@std/assert'
import Flashcards from './mod.ts'
import StaticScheduler from './schedulers/static.ts'

import subjects from './__data__/subjects_01.json' with { type: 'json' }
import srs from './__data__/srs_01.json' with { type: 'json' }

Deno.test('initializes flashcards', () => {
  const deck = new Flashcards<boolean>({
    assignments: [],
    checkAnswer: () => true,
    checkPassing: () => true,
    isLearnMode: true,
    scheduler: new StaticScheduler({ srs, userLevel: 2 }),
    subjects,
  })
  assertEquals(deck.getAvailable().length, 4) // Levels 1-2, but not 3
  assertEquals(deck.state.currSubject?.id, '1') // Loads first
  deck.submit()
  assertEquals(deck.state.currSubject?.id, '2')
  assert(deck.state.assignmentsById['1'].startedAt)
})
