import { assertEquals } from '@std/assert/equals'
import { assertSpyCall, assertSpyCalls, spy } from '@std/testing/mock'
import Todolist from './mod.ts'
import LocalStorage from '../utils/storage/local_storage.ts'

Deno.test('initializes', () => {
  const todolist = new Todolist()
  assertEquals(todolist.state, { todos: [] })
})

Deno.test('add', () => {
  const todolist = new Todolist()
  todolist.add('Task 1', 'Description 1')
  assertEquals(todolist.state.todos, [
    { name: 'Task 1', description: 'Description 1', isDone: false },
  ])
})

Deno.test('edit', () => {
  const todolist = new Todolist({
    todos: [{
      name: 'Task 1',
      description: 'Description 1',
      isDone: false,
    }],
  })
  todolist.edit(0, { name: 'Updated Task 1', isDone: true })
  assertEquals(todolist.state.todos[0], {
    name: 'Updated Task 1',
    description: 'Description 1',
    isDone: true,
  })
})

Deno.test('remove', () => {
  const todolist = new Todolist({
    todos: [{
      name: 'Task 1',
      description: 'Description 1',
      isDone: false,
    }],
  })
  todolist.remove(0)
  assertEquals(todolist.state.todos, [])
})

Deno.test('toggle', () => {
  const todolist = new Todolist({
    todos: [{
      name: 'Task 1',
      description: 'Description 1',
      isDone: false,
    }],
  })
  todolist.toggle(0)
  assertEquals(todolist.state.todos[0].isDone, true)
  todolist.toggle(0)
  assertEquals(todolist.state.todos[0].isDone, false)
  todolist.toggle(0, true)
  assertEquals(todolist.state.todos[0].isDone, true)
})

Deno.test('events', () => {
  const todolist = new Todolist()
  const listener = spy()
  todolist.addEventListener(listener)

  todolist.add('Task 1', 'Description 1')

  assertSpyCall(listener, 0, {
    args: [{
      todos: [{ name: 'Task 1', description: 'Description 1', isDone: false }],
    }],
  })

  todolist.edit(0, { name: 'Updated Task 1' })
  todolist.remove(0)
  assertSpyCalls(listener, 3)
})

Deno.test('todolist: utilizes storage', async () => {
  const storage = new LocalStorage({
    name: 'todos',
    defaultValue: {},
    deserialize: (str) => JSON.parse(str),
    serialize: (val) => JSON.stringify(val),
    verify: (_val) => true,
  })
  const todolist = new Todolist({}, { storage })
  await todolist.waitUntilReady()
  todolist.reset()
  todolist.add('Task 1', 'Description 1')
  await todolist.waitUntilReady()
  assertEquals(todolist.state, JSON.parse(localStorage.getItem('todos') || ''))
})
