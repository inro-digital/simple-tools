import { Command } from '@cliffy/command'
import Todolist from '@inro/simple-tools/todolist'
import LocalStorage from '@inro/simple-tools/storage/local-storage'

const cache = new LocalStorage({
  name: 'todos',
  defaultValue: {},
  deserialize: (str) => JSON.parse(str),
  serialize: (val) => JSON.stringify(val),
  verify: (_val) => true,
})
const todolist = new Todolist({}, { cache })
await todolist.waitUntilReady()

export default new Command()
  .description('Add, remove, and mark todos using their number id')
  .arguments('[index:number]')
  .action((_, index = 0) => {
    if (index > 0) {
      const num = index - 1
      const todo = todolist.state.todos[num]
      if (todo) {
        todolist.edit(num, { isDone: !todo.isDone })
      }
    }
    logTodos()
  })
  .command(
    'add',
    new Command()
      .arguments('[...args:string]')
      .description('Adds a todo item')
      .action((_, ...args: string[]) => {
        todolist.add(args.join(' '), '')
        logTodos()
      }),
  )
  .command(
    'remove',
    new Command()
      .description('Remove a todo by id')
      .arguments('<index:number>')
      .action((_, index) => {
        const actual = index - 1
        const todo = todolist.state.todos[actual]
        if (todo) todolist.remove(actual)
        logTodos()
      }),
  )

function logTodos() {
  const items = todolist.state.todos.map((todo, index) => {
    const checkbox = todo.isDone ? '[x]' : '[ ]'
    return `${checkbox} ${index + 1}. ${todo.name}`
  })
  console.log(items.join('\n'))
}
