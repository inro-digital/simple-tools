import { assertEquals } from '@std/assert/equals'
import { assertSpyCall, assertSpyCalls, spy } from '@std/testing/mock'
import Calculator, { Operator } from './mod.ts'

const { Add, Divide, Initial, Multiply, Subtract } = Operator

Deno.test('initializes', () => {
  const calculator = new Calculator()
  assertEquals(calculator.state, {
    display: '0',
    history: [{ operator: Initial, value: 0 }],
    value: 0,
  })
})

Deno.test('operators', () => {
  const calculator = new Calculator()
  calculator.add(5)
  assertEquals(calculator.state.value, 5, 'adds')
  calculator.subtract(3)
  assertEquals(calculator.state.value, 2, 'subtracts')
  calculator.multiply(2)
  assertEquals(calculator.state.value, 4, 'multiplies')
  calculator.divide(5)
  assertEquals(calculator.state.value, 0.8, 'divides')
  calculator.reset()
  assertEquals(calculator.state.value, 0, 'resets')
  calculator.reset(3)
  assertEquals(calculator.state.value, 3, 'resets to number')
})

Deno.test('history', () => {
  const calculator = new Calculator()
  calculator.reset(1)
  calculator.add(5)
  calculator.subtract(3)
  calculator.multiply(2)
  calculator.divide(5)
  assertEquals(calculator.state.history, [
    { operator: Initial, value: 1 },
    { operator: Add, value: 5 },
    { operator: Subtract, value: 3 },
    { operator: Multiply, value: 2 },
    { operator: Divide, value: 5 },
  ])
  calculator.reset()
  assertEquals(calculator.state.history, [{ operator: Initial, value: 0 }])
})

Deno.test('display', () => {
  const calculator = new Calculator()
  calculator.add(5)
  calculator.subtract(3)
  calculator.multiply(2)
  calculator.divide(5)
  assertEquals(calculator.state.display, '0 + 5 - 3 × 2 ÷ 5')
  calculator.reset()
  assertEquals(calculator.state.display, '0')
})

Deno.test('events', () => {
  const calculator = new Calculator()
  const listener = spy()
  calculator.addEventListener(listener)
  calculator.add(5)
  assertSpyCall(listener, 0, {
    args: [{
      display: '0 + 5',
      history: [
        { operator: Initial, value: 0 },
        { operator: Add, value: 5 },
      ],
      value: 5,
    }],
  })

  calculator.subtract(3)
  calculator.multiply(2)
  calculator.divide(5)
  calculator.reset(2)
  assertSpyCalls(listener, 5)
})
