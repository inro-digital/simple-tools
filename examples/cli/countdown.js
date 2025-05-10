import Countdown from 'jsr:@inro/simple-tools/countdown'
import { parseArgs } from 'jsr:@std/cli/parse-args'
import { readKeypress } from 'https://deno.land/x/keypress@0.0.11/mod.ts'

const encoder = new TextEncoder()
const LINE_CLEAR = encoder.encode('\r\u001b[K')

const { s = 30 } = parseArgs(Deno.args)
const initialMS = s * 1000
const countdown = new Countdown({ initialMS })

console.log('Countdown Example\n')
console.log('- Press "spacebar" to pause/resume')
console.log('- Press "return" to reset the timer\n')

countdown.addEventListener((state) => {
  const frame = encoder.encode(state.display)
  const writeData = new Uint8Array(LINE_CLEAR.length + frame.length)
  writeData.set(LINE_CLEAR)
  writeData.set(frame, LINE_CLEAR.length)
  Deno.stdout.writeSync(writeData)
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
