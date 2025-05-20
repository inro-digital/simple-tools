import { Command } from '@cliffy/command'
import { keypress } from '@cliffy/keypress'
import PomodoroTimer from '@inro/simple-tools/pomodoro'

const encoder = new TextEncoder()
const LINE_CLEAR = encoder.encode('\r\u001b[K')

export default new Command()
  .name('pomodoro')
  .description('Start a Pomodoro timer with customizable periods')
  .option('-f, --focus-minutes <minutes:number>', 'Duration of focus periods', {
    default: 25,
  })
  .option('-s, --short-break <minutes:number>', 'Duration of short breaks', {
    default: 5,
  })
  .option('-l, --long-break <minutes:number>', 'Duration of long breaks', {
    default: 15,
  })
  .option(
    '-p, --periods <count:number>',
    'Number of focus periods before long break',
    { default: 4 },
  )
  .option('-c, --cycles <count:number>', 'Number of full cycles to complete', {
    default: 1,
  })
  .action(async (options) => {
    const timer = new PomodoroTimer({
      focusMinutes: options.focusMinutes,
      shortBreakMinutes: options.shortBreak,
      longBreakMinutes: options.longBreak,
      periodsBeforeLongBreak: options.periods,
      cycles: options.cycles,
    })

    // Function to render the current state
    function renderState() {
      console.log(timer.state.display)
      const state = timer.state
      const lines = [
        `\nPeriod: ${state.periodType.toUpperCase()}`,
        `Time Remaining: ${state.display}`,
        `Completed Focus Periods: ${state.completedFocusPeriods}`,
        `Periods until long break: ${state.periodsUntilLongBreak}`,
        state.isPaused ? '\nPAUSED' : '',
        '\n',
      ]

      // Clear previous lines and write new state
      const output = lines.join('\n')
      const frame = encoder.encode(output)
      const writeData = new Uint8Array(LINE_CLEAR.length + frame.length)
      writeData.set(LINE_CLEAR)
      writeData.set(frame, LINE_CLEAR.length)
      Deno.stdout.writeSync(writeData)

      if (state.isComplete) {
        console.log('\nPomodoro session complete! 🎉')
        Deno.exit(0)
      }
    }
    console.log(timer)
    timer.addEventListener(() => {
      renderState()
    })

    console.log('Pomodoro Timer\n')
    console.log('Controls:')
    console.log('- Press "spacebar" to pause/resume')
    console.log('- Press "return" to reset the timer')
    console.log('- Press "s" to skip to next period')
    console.log('- Press Ctrl+C to exit\n')

    timer.start()

    // Handle keyboard input
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

      if (event.key === 's') {
        timer.skipPeriod()
      }

      if (event.ctrlKey && event.key === 'c') {
        timer.dispose()
        Deno.exit(0)
      }
    }
  })
