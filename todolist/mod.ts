import State from '../utils/state.ts'

/**
 * An individual todo with pretty generic values
 * @todo allow adding arbitrary values. Also add scheduling/reminder data.
 */
export interface Todo {
  name: string
  description: string
  isDone: boolean
}

/** State returned via `todolist.state` or `todolist.addEventListener` */
export interface TodolistState {
  todos: Todo[]
}

/**
 * @module
 * A simple todolist. All public methods trigger event listeners
 *
 * @example Basic list
 * ```ts
 * import Todolist, { TodolistState } from '@inro/simple-tools/todolist'
 * const list = new Todolist()
 * list.addEventListener((state: TodolistState) => {
 *   console.log(state.todos)
 * })
 *
 * list.add("name", "descriptiooooon")
 * list.edit(0, { desciption: "desc"})
 *
 * console.log(list.state.todos[0].description) // "desc"
 * console.log(list.state.todos[0].isDone) // false
 *
 * list.toggle(0)
 * console.log(list.state.todos[0].isDone) // true
 *
 * list.remove(0)
 * console.log(list.state.todos) // []
 * ```
 */
export default class Todolist extends State<TodolistState> {
  #initialTodos: Todo[]

  /* You can feed an initial state to the todolist */
  constructor({ todos = [] }: Partial<TodolistState> = {}) {
    super({ todos })
    this.#initialTodos = todos
  }

  /* Add a todo */
  add(name: string, description: string) {
    this.state.todos.push({ name, description, isDone: false })
    this.notify()
  }

  /**
   * Add a todo
   * @param index The index where the todo is; names are not unique
   * @param properties A subset of Todo properties to override existing values
   */
  edit(index: number, properties: Partial<Todo>) {
    this.state.todos[index] = { ...this.state.todos[index], ...properties }
    this.notify()
  }

  /**
   * Remove a todo
   * @param index The index where the todo is located
   */
  remove(index: number) {
    this.state.todos.splice(index, 1)
    this.notify()
  }

  /**
   * A helper that is basically just todolist.edit(index, { isDone })
   * @param index The index where the todo is located.
   * @param togglState To force `isDone` to be a value. Inverses the existing value if omitted.
   */
  toggle(index: number, toggleState?: boolean) {
    const isDone = toggleState ?? !this.state.todos[index].isDone
    this.edit(index, { isDone })
  }

  /** Resets the todolist to its initial state. Can override values via params. */
  reset({ todos }: Partial<TodolistState> = {}) {
    this.state.todos = todos ?? [...this.#initialTodos]
  }
}
