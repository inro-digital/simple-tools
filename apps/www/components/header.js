const jsrLink = 'https://jsr.io/@inro/simple-tools'
const codeLink = 'https://git.sr.ht/~inro/simple-tools'

export default function ({ attrs }) {
  return {
    view: () =>
      m('header', [
        m('nav', [
          m('li', [
            m('a[href=#]', { onclick: () => history.back() }, `↩︎${attrs.name}`),
          ]),
          m('ul.links', [
            m('li', m('a', { href: jsrLink }, 'jsr')),
            m('li', m('a', { href: codeLink }, 'code')),
          ]),
        ]),
      ]),
  }
}
