import {Command, Flags, Args} from '@oclif/core'
import { createMondayBoard, createMondayColumns } from 'sdk/monday'
import { config } from 'dotenv';
import contact from '../../boardDefinitions/contact'
config();

function getBoardDefinition(boardName: string) {
  switch(boardName) {
    case 'contacts':
      return contact;
    default:
      return null;
  }
}

export default class Generate extends Command {
  static args = {
    name: Args.string({description: 'Name of the board', required: true, options: [
      'contacts',
      'companies',
      'deals',
      'tasks'
    ]})
  }

  static description = 'Generate a monday.com board'

  static flags = {
    workspace: Flags.integer({char: 'w', description: 'workspace id of the workspace where you want to create the board'})
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Generate)
    this.log(`creating board ${args.name} in workspace ${flags.workspace || 'default'} ...`)
    const mondayBoard = await createMondayBoard(args.name, flags.workspace)
    const boardId = mondayBoard.data.create_board.id
    const boardDefinition = getBoardDefinition(args.name)
    await createMondayColumns(boardId, boardDefinition)
    this.log(`board created with id ${boardId}`)
  }
}



