import { assert } from '@std/assert'
import State from './state.ts'

Deno.bench('Successive state access', () => {
  const counts = new State({ counts: { one: 1 } })
  for (let i = 0; i < 1_000_000; i++) {
    assert(counts.state.counts)
    assert(counts.state.counts.one)
  }
})

Deno.bench('Successive state access, reactive', () => {
  const counts = new State({ counts: { one: 1 } }, { isReactive: true })
  for (let i = 0; i < 1_000_000; i++) {
    assert(counts.state.counts)
    assert(counts.state.counts.one)
  }
})

Deno.bench('Successive nested proxies', () => {
  const inner = new State({ counts: { one: 1 } })
  const outer = new State({ counts: inner.state.counts })
  for (let i = 0; i < 1_000_000; i++) {
    assert(outer.state.counts)
    assert(outer.state.counts.one)
  }
})

Deno.bench('Successive nested proxies, reactive', () => {
  const inner = new State({ counts: { one: 1 } }, { isReactive: true })
  const outer = new State({ counts: inner.state.counts }, { isReactive: true })

  for (let i = 0; i < 1_000_000; i++) {
    assert(outer.state.counts)
    assert(outer.state.counts.one)
  }
})
