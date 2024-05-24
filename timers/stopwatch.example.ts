import Stopwatch from '../stopwatch.ts'
import { readKeypress } from 'https://deno.land/x/keypress@0.0.11/mod.ts'
import { writeAll } from 'jsr:@std/io/write_all'

const stopwatch = new Stopwatch()

console.log('Stopwatch Example\n')
console.log('- Press "spacebar" to pause/resume')
console.log('- Press "L" to log a lap')
console.log('- Press "return" to reset the timer\n')

stopwatch.addEventListener(async (state: StopwatchState) => {
  const text = `${state.display}`
  await writeAll(Deno.stdout, new TextEncoder().encode(text + '\r'))
})

stopwatch.start()

for await (const keypress of readKeypress()) {
  const { isPaused, isStarted } = stopwatch.state
  if (keypress.key === 'space') {
    if (isStarted && !isPaused) stopwatch.pause()
    else stopwatch.start()
  }

  if (keypress.key === 'return') stopwatch.stop()

  if (isStarted && keypress.key === 'l') {
    stopwatch.lap()
    const idx = stopwatch.state.laps.length - 1
    const { splitDisplay, totalDisplay } = stopwatch.state.laps[idx]
    console.log(`lap ${idx + 1}: ${splitDisplay} / ${totalDisplay}`)
  }

  if (keypress.ctrlKey && keypress.key === 'c') {
    Deno.exit(0)
  }
}
