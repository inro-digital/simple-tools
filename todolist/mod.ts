import State from '../utils/state.ts'

export interface Todo {
  name: string
  description: string
  isDone: boolean
}

export interface TodolistState {
  todos: Todo[]
}

export default class Todolist extends State<TodolistState> {
  constructor(todos?: Todo[]) {
    super({ todos: todos ?? [] })
  }
  add(name: string, description: string) {
    this.state.todos.push({ name, description, isDone: false })
    this.notify()
  }
  edit(index: number, properties: Partial<Todo>) {
    this.state.todos[index] = { ...this.state.todos[index], ...properties }
    this.notify()
  }
  remove(index: number) {
    this.state.todos.splice(index, 1)
    this.notify()
  }
  toggle(index: number, toggleState?: boolean) {
    const isDone = toggleState ?? !this.state.todos[index].isDone
    this.edit(index, { isDone })
  }
}
