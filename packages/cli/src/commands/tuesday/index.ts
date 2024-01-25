import {Args, Command, Flags} from '@oclif/core'

export default class Monday extends Command {
  static args = {
    person: Args.string({description: 'Person to say hello to', required: true}),
  }

  static description = 'Say hello'

  static examples = [
    `$ oex hello friend --from oclif
hello friend from oclif! (./src/commands/hello/index.ts)
`,
  ]

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Monday)

    this.log(`hello ${args.person} from ${flags.from}! (./src/commands/hello/index.ts)`)
  }
}
