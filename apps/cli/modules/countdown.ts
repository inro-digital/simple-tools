import { Command } from 'jsr:@cliffy/command@1.0.0-rc.7'
import { keypress } from 'jsr:@cliffy/keypress@1.0.0-rc.7'
import Countdown from 'jsr:@inro/simple-tools/countdown'

const encoder = new TextEncoder()
const LINE_CLEAR = encoder.encode('\r\u001b[K')

export default new Command()
  .arguments('<time:string>')
  .description('Start timer that counts down from a given time')
  .action(async (_, time: string) => {
    const timer = new Countdown({ initialMS: parseTime(time) })

    timer.addEventListener((state) => {
      const frame = encoder.encode(state.display)
      const writeData = new Uint8Array(LINE_CLEAR.length + frame.length)
      writeData.set(LINE_CLEAR)
      writeData.set(frame, LINE_CLEAR.length)
      Deno.stdout.writeSync(writeData)
    })

    console.log('Countdown\n')
    console.log('- Press "spacebar" to pause/resume')
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

      if (event.ctrlKey && event.key === 'c') Deno.exit(0)
    }
  })

function parseTime(time: string): number {
  const splitTime = time.split(':')
  if (splitTime.length === 2) {
    const [minutes, seconds] = splitTime
    return ((parseInt(minutes) * 60) + parseInt(seconds)) * 1000
  } else if (splitTime.length === 3) {
    const [hours, minutes, seconds] = splitTime
    return (
      (parseInt(hours) * 60 * 60) +
      (parseInt(minutes) * 60) +
      parseInt(seconds)
    ) * 1000
  } else {
    return parseInt(time) * 1000 // If number, assume seconds
  }
}
