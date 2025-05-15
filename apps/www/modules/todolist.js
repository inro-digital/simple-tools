import Todolist from '@inro/simple-tools/todolist'
import LocalStorage from '@inro/simple-tools/storage/local-storage'

import Header from '../components/header.js'

const storage = new LocalStorage({
  name: 'todos',
  defaultValue: {},
  deserialize: (str) => JSON.parse(str),
  serialize: (val) => JSON.stringify(val),
  verify: (_val) => true,
})

const list = new Todolist({}, { storage })

let name = ''
let description = ''

export default {
  oninit: async () => {
    await list.waitUntilReady()
    m.redraw()
  },
  view: () => {
    return [
      m(Header, { name: 'Todos' }),
      m('main', [
        m('form[style="max-width: 700px; margin: 0 auto;"]', {
          onsubmit: (e) => {
            e.preventDefault()
            list.add(name, description)
            name = ''
            description = ''
          },
        }, [
          m('fieldset[role="group"]', [
            m('input#id[type=text][placeholder=Todo]', {
              value: name,
              onchange: (e) => name = e.target.value,
            }),
            m('input[type="submit"][value="+"]'),
          ]),
        ]),

        m(
          'ul[style=padding: 0;]',
          list.state.todos.map((todo, index) =>
            m('li.todo', {
              style: `
              list-style: none;
              display: flex;
              flex-direction: row;
              justify-content: space-between;
              align-items: center;
              max-width: 700px;
              margin: 10px auto;
              border: 1px solid rgba(100, 100, 100, 0.3);
              padding: 1.5em 2em;
              border-radius: 10px;
            `,
            }, [
              m('div', [
                m('input.toggle[type=checkbox]', {
                  'data-index': index,
                  checked: todo.isDone ? 'checked' : '',
                  onclick: (event) => {
                    list.toggle(parseInt(event.target.dataset.index, 10))
                  },
                }),
                m('span', todo.name),
              ]),
              m('button', {
                style: `
                color: currentcolor;
                background-color: transparent;
                border: transparent;
                padding: 0;
              `,
                'data-index': index,
                onclick: (event) => {
                  list.remove(parseInt(event.target.dataset.index, 10))
                },
              }, '×'),
            ])
          ),
        ),
      ]),
    ]
  },
}
