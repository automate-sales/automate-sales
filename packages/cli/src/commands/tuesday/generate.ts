import {Command} from '@oclif/core'
import { mondayRequest } from 'sdk/monday.js'

async function createMondayColumns(board_id: string, boardDefinition: any) {
    for (const columnKey in boardDefinition) {
        let column = boardDefinition[columnKey];
        let query = '';
        if (column.column_type === 'status') {
            query = `
            mutation {
                create_column(
                    board_id: ${board_id}
                    id: "${columnKey}"
                    title: "${column.title}"
                    column_type: status
                    description: "${column.description}"
                    defaults: ${JSON.stringify(JSON.stringify(
                        {labels: column.labels}
                    ))}
                ) {
                    id
                }
            }`;
        } else if (column.column_type === 'dropdown') {
            // Convert the labels format for dropdown
            let dropdownLabels = [];
            for (const labelKey in column.labels) {
                dropdownLabels.push({ id: parseInt(labelKey), name: column.labels[labelKey] });
            }

            query = `
            mutation {
                create_column(
                    board_id: ${board_id}
                    id: "${columnKey}"
                    title: "${column.title}"
                    column_type: dropdown
                    description: "${column.description}"
                    defaults: ${JSON.stringify(JSON.stringify(
                        { settings: {
                            labels: dropdownLabels
                        }}
                    ))}
                ) {
                    id
                }
            }`;
        } else {
            query = `
            mutation {
                create_column(
                    board_id: ${board_id}
                    id: "${columnKey}"
                    title: "${column.title}"
                    column_type: ${column.column_type}
                    description: "${column.description}"
                ) {
                    id
                    title
                    description
                }
            }`;
        }
        try{
            let res = await mondayRequest(query, '2023-10')
            if('error_code' in res){
                console.error(`Error creating column ${columnKey}: `, res)
            } else console.log(`Succesfully created column ${columnKey}`)
        } catch(err) {
            console.error(`Error creating column ${columnKey}: `, err)
        }
    }
    return 'All Done!'
}

export default class Generate extends Command {
  static args = {}

  static description = 'Say hello world'

  static examples = [
    `<%= config.bin %> <%= command.id %>
hello world! (./src/commands/hello/world.ts)
`,
  ]

  static flags = {}

  async run(): Promise<void> {
    this.log('hello world Puto')
  }
}


