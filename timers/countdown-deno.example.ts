import { writeAll } from 'jsr:@std/io/write_all'
import { readKeypress } from 'https://deno.land/x/keypress@0.0.11/mod.ts'
import Countdown from 'jsr:@inro/simple-tools/countdown.ts'

const countdown = new Countdown({ initialMS: 30_000 })

console.log('Countdown Example\n')
console.log('- Press "spacebar" to pause/resume')
console.log('- Press "return" to reset the timer\n')

countdown.addEventListener(async (state: CountdownState) => {
  const text = `${state.display}`
  await writeAll(Deno.stdout, new TextEncoder().encode(text + '\r'))
})

countdown.start()

for await (const keypress of readKeypress()) {
  const { isPaused, isStarted } = countdown.state
  if (keypress.key === 'space') {
    if (isStarted && !isPaused) countdown.pause()
    else countdown.start()
  }

  if (keypress.key === 'return') {
    countdown.stop()
    countdown.reset()
  }

  if (keypress.ctrlKey && keypress.key === 'c') {
    Deno.exit(0)
  }
}
