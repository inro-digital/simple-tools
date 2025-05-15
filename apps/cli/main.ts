import { Command } from 'jsr:@cliffy/command@1.0.0-rc.7'
import Countdown from './modules/countdown.ts'
import Stopwatch from './modules/stopwatch.ts'

await new Command()
  .name('simple-tools')
  .version('0.0.13')
  .description('Command line versions of Simple Tools')
  .command('countdown', Countdown)
  .command('stopwatch', Stopwatch)
  .parse(Deno.args)
