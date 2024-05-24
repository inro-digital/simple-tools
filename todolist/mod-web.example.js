import Todolist from 'https://esm.sh/jsr/@inro/simple-tools/todolist'

class TodolistComponent extends HTMLElement {
  constructor() {
    super()
    this.todolist = new Todolist()
    this.todolist.addEventListener(() => this.update())
  }

  connectedCallback() {
    this.render()
    this.bindEvents()
  }

  bindEvents() {
    const nameInput = this.querySelector('#name')
    const descriptionInput = this.querySelector('#description')

    this.querySelector('#add').addEventListener('click', () => {
      if (nameInput.reportValidity() && descriptionInput.reportValidity()) {
        this.todolist.add(nameInput.value, descriptionInput.value)
        nameInput.value = ''
        descriptionInput.value = ''
      }
    })

    this.addEventListener('click', (event) => {
      if (event.target.matches('.remove')) {
        const index = event.target.dataset.index
        this.todolist.remove(parseInt(index, 10))
      } else if (event.target.matches('.toggle')) {
        const index = event.target.dataset.index
        this.todolist.toggle(parseInt(index, 10))
      }
    })
  }

  update() {
    const todoListElement = this.querySelector('.todolist .list')
    todoListElement.innerHTML = this.todolist.state.todos.map((todo, index) => `
      <div class="todo">
        <input type="checkbox" class="toggle" data-index="${index}" ${
      todo.isDone ? 'checked' : ''
    }>
        <span>${todo.name}${
      todo.description ? (': ' + todo.description) : ''
    }</span>
        <button class="remove" data-index="${index}">Remove</button>
      </div>
    `).join('')
  }

  render() {
    this.innerHTML = `
      <style>
        .todolist {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .todolist .controls {
          margin-bottom: 10px;
        }
        .todolist .list {
          width: 100%;
        }
        .todolist .todo {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 5px;
        }
      </style>
      <div class="todolist">
        <div class="controls">
          <input id="name" type="text" placeholder="name" />
          <input id="description" type="text" placeholder="description" />
          <button id="add">Add</button>
        </div>
        <div class="list"></div>
      </div>
    `
  }
}

customElements.define('todolist-component', TodolistComponent)
