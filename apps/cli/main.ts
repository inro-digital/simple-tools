import { Command } from '@cliffy/command'
import Countdown from './modules/countdown.ts'
import Pomodoro from './modules/pomodoro.ts'
import Stopwatch from './modules/stopwatch.ts'
import Todolist from './modules/todolist.ts'

await new Command()
  .name('simple-tools')
  .version('0.1.9')
  .description('Command line versions of Simple Tools')
  .command('countdown', Countdown)
  .command('pomodoro', Pomodoro)
  .command('stopwatch', Stopwatch)
  .command('todos', Todolist)
  .parse(Deno.args)
