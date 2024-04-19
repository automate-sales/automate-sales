import {Args, Command, Flags} from '@oclif/core'

export default class Hello extends Command {
  static args = {
    action: Args.string({description: 'Person to say hello to', required: true}),
    name: Args.string({description: 'Name of the board', required: true, options: [
      'contacts',
      'companies',
      'deals',
      'tasks'
    ]})
  }

  static description = 'Say hello'

  static examples = [
    `$ oex hello friend --from oclif
hello friend from oclif! (./src/commands/hello/index.ts)
`,
  ]

  static flags = {
    workspace: Flags.integer({char: 'w', description: 'workspace id of the workspace where you want to create the board'})
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Hello)

    this.log(`the default monday command was run`)
  }
}
