import { colors } from '@cliffy/ansi/colors'
import { ansi } from '@cliffy/ansi'
import { Command } from '@cliffy/command'
import { keypress } from '@cliffy/keypress'
import PomodoroTimer from '@inro/simple-tools/pomodoro'

const encoder = new TextEncoder()

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
      resolutionMS: 300,
    })

    let lineCount = 0

    function renderState() {
      const state = timer.state

      if (lineCount > 0) {
        // Clear previous output by moving to top and erasing down
        Deno.stdout.writeSync(encoder.encode(
          ansi.cursorTo(0, 0).eraseDown().toString(),
        ))
      }

      // Add bold formatting to title and main timer info
      // Add color based on period type
      const periodColor = state.periodType.includes('focus')
        ? colors.red
        : colors.green

      const lines = [
        colors.bold.underline.white('Pomodoro Timer\n'),
        periodColor.bold(`${state.periodType.toUpperCase()}`) + ' – ' +
        colors.bold.white(colors.bold(`${state.display}`)) +
        (state.isPaused ? ` – ${colors.bold.yellow('PAUSED')}` : ''),
        '',
        colors.dim(`Completed: ${state.completedFocusPeriods}`),
        colors.dim(`Next long break: ${state.periodsUntilLongBreak}`),
      ]

      lines.push(
        '\n' + colors.dim('Controls:'),
        colors.dim('- Press "spacebar" to pause/resume'),
        colors.dim('- Press "return" to reset the timer'),
        colors.dim('- Press "s" to skip to next period'),
        colors.dim('- Press Ctrl+C to exit'),
        '',
      )

      const output = lines.join('\n')
      Deno.stdout.writeSync(encoder.encode(output))
      lineCount = output.split('\n').length

      if (state.isComplete) {
        Deno.stdout.writeSync(encoder.encode(
          '\n\n' + colors.bold.green('Pomodoro session complete! 🎉') + '\n',
        ))
        Deno.exit(0)
      }
    }

    Deno.stdout.writeSync(encoder.encode(
      ansi.cursorHide.cursorTo(0, 0).eraseScreen().toString(),
    ))

    timer.addEventListener(() => {
      renderState()
    })

    renderState()

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

      if (event.key === 's') {
        timer.skipPeriod()
      }

      if (event.ctrlKey && event.key === 'c') {
        Deno.stdout.writeSync(encoder.encode(ansi.cursorShow().toString()))
        timer.dispose()
        Deno.exit(0)
      }
    }
  })
