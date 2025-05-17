import { assert } from '@std/assert'
import State from './state.ts'

Deno.bench('Successive state access', () => {
  type Counts = { counts: { one: number; two: number } }
  const counts = new State<Counts>({ counts: { one: 1, two: 2 } })
  for (let i = 0; i < 10_000_000; i++) {
    assert(counts.state.counts)
    assert(counts.state.counts.one)
    assert(counts.state.counts.two)
  }
})
