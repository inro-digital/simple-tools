import Countdown from '@inro/simple-tools/countdown'
import Stopwatch from '@inro/simple-tools/stopwatch'
import Header from '../components/header.js'

let isRunning = false

export default {
  view: () => {
    const timers = [...Array(91).keys()].reverse()
      .map((min, i) =>
        m(Timer, {
          key: i,
          index: i,
          initialMS: 60000 * min,
          setIsRunning: (value) => {
            isRunning = value
          },
        })
      )

    return [
      m(Header, { name: 'Timer' }),
      m('div.timers', {
        style: { overflow: isRunning ? 'hidden' : 'scroll' },
      }, timers),
    ]
  },
}

function Timer(vnode) {
  const { index, initialMS, setIsRunning } = vnode.attrs
  const isStopwatch = index == 90
  const timer = isStopwatch ? new Stopwatch() : new Countdown({ initialMS })
  let bigTime, detailedTime
  let isRunning = false
  let isRendering = false

  const loop = () => {
    isRendering = true
    if (isRunning) {
      setTime()
      m.redraw()
      requestAnimationFrame(loop)
    } else {
      isRendering = false
    }
  }

  const setTime = () => {
    const time = isStopwatch ? timer.state.elapsed : timer.state.remaining
    console.log(isStopwatch)
    bigTime = formatBigDisplayTime(time, !isStopwatch)
    detailedTime = formatDetailedDisplayTime(time)
  }

  const onStartStop = () =>
    (timer.state.isStarted && !timer.state.isPaused)
      ? timer.pause()
      : timer.start()

  return {
    oninit: function () {
      setTime()
      timer.addEventListener((state) => {
        const prevIsRunning = isRunning
        isRunning = state.isStarted && !state.isPaused
        if (isRunning !== prevIsRunning) {
          setIsRunning(isRunning)
          if (isRunning && !isRendering) loop()
        }
      })
    },

    oncreate: function () {
      if (index === 89) vnode.dom.scrollIntoView(true)
    },

    view: () => {
      const showReset = timer.state.isStarted && timer.state.isPaused
      const showLaps = timer.state.isStarted && isStopwatch
      const laps = isStopwatch
        ? timer.state?.laps.map(
          (lap, i) => m('li.lap', `Lap ${i + 1} – ${lap.totalDisplay}`),
        )
        : []

      return m('.timer', [
        m('h1.big-time', { onclick: onStartStop }, bigTime),
        m('h2.detailed-time', {
          style: `visibility: ${timer.state.isStarted ? '' : 'hidden'}`,
        }, detailedTime),
        m('div.controls', [
          m('button', {
            style: {
              display: (isStopwatch && !timer.state.isPaused)
                ? 'none'
                : 'inline',
              visibility: showReset ? '' : 'hidden',
              margin: '1em',
            },
            onclick: () => {
              timer.stop()
              timer.reset({ initialMS })
              setTime()
              m.redraw()
            },
          }, 'reset'),
          m('button', {
            style: {
              display: (!isStopwatch) ? 'none' : 'inline',
              visibility: showLaps ? '' : 'hidden',
              margin: '1em',
            },
            onclick: () => timer.lap(),
          }, 'lap'),
          m('ul.laps', laps),
        ]),
      ])
    },
  }
}

const pad = (num) => num.toString().padStart(2, '0')

function formatDetailedDisplayTime(ms) {
  const [hours, minutes, seconds, mils] = splitTime(ms)
  let text = ''
  if (hours > 0) text += pad(hours) + ':'
  text += pad(minutes) + ':'
  text += pad(seconds)
  if (!hours && !minutes) text += '.' + pad(mils)
  return text
}

function formatBigDisplayTime(ms, isCountdown) {
  const [hours, minutes, seconds] = splitTime(ms)
  const hourMinutes = Math.abs((hours * 60) + minutes)
  if (isCountdown && hourMinutes) return Math.ceil(hourMinutes + (seconds / 60))
  if (!isCountdown && !hourMinutes && !seconds) return '+'
  return minutes || seconds
}

function splitTime(ms) {
  const absMs = Math.abs(ms)
  const mils = Math.floor((absMs % 1000) / 10)
  const seconds = Math.floor(absMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  return [hours % 60, minutes % 60, seconds % 60, mils]
}
