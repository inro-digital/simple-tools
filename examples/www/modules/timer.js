import Countdown from '@inro/simple-tools/countdown'

const jsrLink = 'https://jsr.io/@inro/simple-tools/doc/countdown/~'
const codeLink = 'https://git.sr.ht/~inro/simple-tools/tree/main/item/timers'

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

    return m('main', [
      m('header', [
        m('h1', m('a', { onclick: () => history.back() }, '<'), 'Timer'),
        m('ul', [
          m('li', m('a', { href: jsrLink }, 'jsr')),
          m('li', m('a', { href: codeLink }, 'code')),
        ]),
      ]),
      m('.timers', {
        style: { overflow: isRunning ? 'hidden' : 'scroll' },
      }, timers),
    ])
  },
}

function Timer(vnode) {
  const { index, initialMS, setIsRunning } = vnode.attrs
  const timer = new Countdown({ initialMS })
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
    bigTime = formatBigDisplayTime(timer.state.remaining, true)
    detailedTime = formatDetailedDisplayTime(timer.state.remaining)
  }

  const onStartStop = () =>
    (timer.state.isStarted && !timer.state.isPaused)
      ? timer.pause()
      : timer.start()

  const onReset = () => {
    timer.stop()
    timer.reset({ initialMS })
    setTime()
    m.redraw()
  }

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

    view: () =>
      m('.timer', [
        m('.big-time', { onclick: onStartStop }, bigTime),
        m('.detailed-time', detailedTime),
        m('div.controls', [
          m('button', {
            onclick: onReset,
            style: `visibility: ${
              timer.state.isStarted && timer.state.isPaused ? '' : 'hidden'
            }`,
          }, 'reset'),
        ]),
      ]),
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
