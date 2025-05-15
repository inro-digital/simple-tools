# Simple Tools

[![JSR Badge](https://jsr.io/badges/@inro/simple-tools)](https://jsr.io/@inro/simple-tools)
[![Source Badge](https://img.shields.io/badge/https%3A%2F%2Fgit.sr.ht%2F~inro%2Fsimple-tools?label=source&color=black)](https://git.sr.ht/~inro/simple-tools)

Javascript versions of the basic apps you expect to find built-in to your OS. The intention is that these utilities have simple state management that gives you the tools to power UI apps for common tasks.

## Import

### In the Browser

Use it with web via a simple import:

```js
import Countdown from 'https://esm.sh/jsr/@inro/simple-tools/countdown'
```

### Everywhere else

- npm: `npx jsr add @inro/simple-tools`
- deno: `deno add @inro/simple-tools`
- bun: `bunx jsr add @inro/simple-tools`
- yarn: `yarn dlx jsr add @inro/simple-tools`
- pnpm: `pnpm dlx jsr add @inro/simple-tools`

## Usage

Every one of our tools has a simple api.
You can always get the current state either directly or via listener.
Here's an example of our `Countdown` timer:

```ts
import Countdown, { CountdownState } from '@inro/simple-tools/countdown'
const timer = new Countdown({ initialMS: 30_000 })

timer.addEventListener((state: CountdownState) => {
  console.log(state.display) // "0:30.0"
  console.log(state.remaining) // 30000
})

timer.start()

setTimeout(() => {
  timer.pause()
  console.log(timer.state.remaining) // 29000

  timer.stop()
  timer.reset()
}, 1000)
```

The `.state` accessor, and the `.addEventListener` that returns state is available in every module. Even the calculator! Here are some examples of apis we have for our other modules:

### Calculator

```js
import Calculator from '@inro/simple-tools/calculator'
const calc = new Calculator()

calc.add(5)
calc.subtract(3)
calc.multiply(2)
calc.divide(5)

console.log(calc.state.value) // 0.8
console.log(calc.state.display) // "0 + 5 - 3 * 2 / 5"
console.log(calc.state.history)
/**
 * [
 *   { operator: initial, value: 0 },
 *   { operator: add, value: 5 },
 *   { operator: subtract, value: 3 },
 *   { operator: multiply, value: 2 },
 *   { operator: divide, value: 5 },
 * ]
 */
```

### Stopwatch

```ts
import Stopwatch, { StopwatchState } from '@inro/simple-tools/stopwatch'
const timer = new Stopwatch()

timer.addEventListener((state: StopwatchState) => {
  console.log(state.display) // "0:00.0"
  console.log(state.elapsed) // 0
})

timer.start()

setTimeout(() => {
  timer.lap()
  timer.pause()
  console.log(timer.state.laps)
  timer.stop()
}, 5000)
```

### Todolist

```js
import Todolist from '@inro/simple-tools/todolist'

const list = new Todolist({
  todos: [{
    name: 'Task 1',
    description: 'Description 1',
    isDone: false,
  }],
})

list.edit(0, { name: 'Updated Task 1', isDone: true })
list.add('Task 2', 'desc')
list.remove(0)

// [{ name: Task 2, description: "desc", isDone: false}]
console.log(list.state.todos)
```

## TODO

In no particular order:

- Audio/Podcast Player
- Notepad
- Workout Timer
