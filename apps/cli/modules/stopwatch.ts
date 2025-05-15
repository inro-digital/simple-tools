import { Command } from '@cliffy/command'
import { keypress } from '@cliffy/keypress'
import Stopwatch from '@inro/simple-tools/stopwatch'

const encoder = new TextEncoder()
const LINE_CLEAR = encoder.encode('\r\u001b[K')

export default new Command()
  .description('Stopwatch')
  .action(async (_) => {
    const timer = new Stopwatch()

    timer.addEventListener((state) => writeLine(state.display))

    console.log('Stopwatch\n')
    console.log('- Press "spacebar" to pause/resume')
    console.log('- Press "L" to log a lap')
    console.log('- Press "return" to reset the timer\n')

    timer.start()

    for await (const event of keypress()) {
      const { isPaused, isStarted } = timer.state
      if (event.key === 'space') {
        if (isStarted && !isPaused) timer.pause()
        else timer.start()
      }

      if (event.key === 'return') {
        timer.stop()
        timer.reset()
      }

      if (isStarted && event.key === 'l') {
        timer.lap()
        const idx = timer.state.laps.length - 1
        const { splitDisplay, totalDisplay } = timer.state.laps[idx]
        writeLine(`- lap ${idx + 1}: ${splitDisplay}  ${totalDisplay}\n`)
      }

      if (event.ctrlKey && event.key === 'c') {
        Deno.exit(0)
      }
    }
  })

function writeLine(str: string) {
  const frame = encoder.encode(str)
  const writeData = new Uint8Array(LINE_CLEAR.length + frame.length)
  writeData.set(LINE_CLEAR)
  writeData.set(frame, LINE_CLEAR.length)
  Deno.stdout.writeSync(writeData)
}
