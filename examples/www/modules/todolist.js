import Todolist from 'https://esm.sh/jsr/@inro/simple-tools/todolist'

const jsrLink = 'https://jsr.io/@inro/simple-tools/doc/todolist/~'
const codeLink = 'https://git.sr.ht/~inro/simple-tools/tree/main/item/todolist'

const list = new Todolist()

let name = ''
let description = ''

export default {
  view: () => {
    const items = list.state.todos.map((todo, index) =>
      m('div.todo', [
        m('input.toggle[type=checkbox]', {
          'data-index': index,
          checked: todo.isDone ? 'checked' : '',
          onclick: (event) => {
            list.toggle(parseInt(event.target.dataset.index, 10))
          },
        }),
        m(
          'span',
          `${todo.name}${todo.description ? (': ' + todo.description) : ''}`,
        ),
        m('button.remove', {
          'data-index': index,
          onclick: (event) => {
            list.remove(parseInt(event.target.dataset.index, 10))
          },
        }, 'Remove'),
      ])
    )

    return m('main', [
      m('header', [
        m('h1', [m('a', { onclick: () => history.back() }, '<'), 'Todolist']),
        m('ul', [
          m('li', m('a', { href: jsrLink }, 'jsr')),
          m('li', m('a', { href: codeLink }, 'code')),
        ]),
      ]),
      m('article', [
        m('div', { class: 'controls' }, [
          m('input#id[type=text][placeholder=Name]', {
            value: name,
            onchange: (e) => name = e.target.value,
          }),
          m('input#description[type=text][placeholder=Description]', {
            value: description,
            onchange: (e) => description = e.target.value,
          }),
          m('button#add', {
            onclick: () => {
              list.add(name, description)
              name = ''
              description = ''
            },
          }, 'add'),
        ]),
        m('ul.list', items),
      ]),
    ])
  },
}
