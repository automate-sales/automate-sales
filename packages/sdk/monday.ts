import dotenv from 'dotenv';
dotenv.config();

// make a request to the monday.com API
// returns a succesful response in the format response = { data: [queryName]: []|{} }
export async function mondayRequest(
    query: string, // valid monday.com graphQL query or mutation to execute
    apiVersion: '2023-07' | '2023-10'='2023-07', // monday.com API version, 2023-07 or 2023-10
    browser:boolean=false, // true if request is made from browser, false if made from server
    tags: string[] | null = null // tags to add to the request
){
    try{

        const res = await fetch("https://api.monday.com/v2", {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': process.env.MONDAY_API_KEY || '',
                'API-Version' : apiVersion
            },
            body: JSON.stringify({
                'query': query
            }),
            //cache: 'no-store',
            ...(browser? {mode: 'no-cors'} : {}),
            ...(tags? { next: {tags: tags} } : {})
        });
        console.info('MONDAY RESPONSE ', res)
        if(res.ok){
            const result = await res.json();
            if('error_code' in result) throw new Error(result.error_message)
            else if('errors' in result) throw new Error(result.errors[0].message)
            else return result
        } else {
            const errorTxt = await res.text()
            throw new Error(errorTxt)
        }
    }catch(err: any){
        throw new Error(err)
    }
}

// finds a monday item by its pulse id
// returns a succesful response in the format response = { data: items: []|{} }
export async function getItem(
    pulseId: number, // monday.com pulseId
    assets: boolean=false // set to true and return an assets block for the given item
){
    try{
        const assetsBlock = `assets {
                    public_url
                    id
                    name
                }`
        const query = `query {
            items (ids: ${pulseId}) {  
                id
                name
                board {
                    id
                }
                column_values {
                    id
                    title
                    value
                    text
                }
                ${assets? assetsBlock : ''}
            }
        }`
        return await mondayRequest(query)
    } catch(err){
        throw err
    }
}

// create an item in a given board with given column values
// returns a succesful response in the format response = { data: create_item: {id:123, name:'', columnValues:[{}]} }
export async function mondayCreateItem(
    boardId: number | string, // monday.com board ID
    itemName: string, // monday.com item pulseId
    columnValues: { [key:string]: any } // column values for the item in key value pairs with correct values
){   
    console.info('CREATING THE ITEM IN MONDAY.COM ***') 
    try{
        const mutation = `mutation {
            create_item(
                item_name: "${itemName}"
                board_id: ${boardId}
                column_values: ${JSON.stringify(JSON.stringify(columnValues))}
            ) {
                id
                name
                column_values {
                    id
                    type
                    title
                    value
                    text
                }
            }
        }`
        const data = await mondayRequest(mutation)
        return data.data.create_item
    }catch(err: any){
        throw new Error(err)
    }
}

// update a monday.com item with the itemData provided
export async function mondayUpdateItem(
    boardId: number | string, // id of the monday.com board
    itemId: number, // pulse Id of the item to be updated
    columnValues: { [key:string]: any } // column values as a key pairs with valid values
){
    console.info('UPDATING THE ITEM IN MONDAY.COM ***')
    try{
        const mutation = `mutation {
            change_multiple_column_values(
                item_id: ${itemId}, 
                board_id: ${boardId}, 
                column_values: ${JSON.stringify(JSON.stringify(columnValues))}
            ){
                id
                name
                column_values {
                    id
                    type
                    title
                    value
                    text
                }
            } 
        }`
        console.log('MUTATION: ', mutation)
        console.log('boardId: ', boardId)
        const data = await mondayRequest(mutation)
        console.log('DATA: ', data)
        return data.data.change_multiple_column_values
    } catch(err){
        throw err
    }
}
type ColumnValue = {
    id: string;
    type: string;
    title: string;
    value: string | null;
    text: string | null;
};

type MondayApiResponse = {
    id: string;
    name: string;
    column_values: ColumnValue[];
};

type ProcessedColumn = string | number | Date | string[] | number[] | null;

type ProcessedContact = {
    id: string;
    name: string;
    columns: { [key: string]: ProcessedColumn };
};

function processMondayApiResponse(response: MondayApiResponse): ProcessedContact {
    const result: ProcessedContact = {
        id: response.id,
        name: response.name,
        columns: {}
    };

    response.column_values.forEach(col => {
        switch (col.type) {
            case 'numeric':
            case 'rating':
                result.columns[col.title] = col.text ? Number(col.text) : null;
                break;
            case 'date':
                result.columns[col.title] = col.text ? new Date(col.text) : null;
                break;
            case 'board-relation':
                if (col.value) {
                    const parsedValue = JSON.parse(col.value);
                    result.columns[col.title] = parsedValue.linkedPulseIds 
                        ? parsedValue.linkedPulseIds.map((pulse: { linkedPulseId: number }) => pulse.linkedPulseId)
                        : [];
                } else {
                    result.columns[col.title] = [];
                }
                break;
            case 'dropdown':
                result.columns[col.title] = col.text ? col.text.split(', ') : [];
                break;
            default:
                result.columns[col.title] = col.text;
        }
    });

    return result;
}


type BoardDefinition = {
    [key: string]: {
        title: string;
        column_type: string;
        labels?: { [key: number]: string };
    };
};

type Relation = {
    field: string;
    value: any;
};

type Chat = {
    // Define properties based on your model
    [key: string]: any;
};

export function convertToMondayColumnValues(chat: Chat, boardDef: BoardDefinition, relations?: Relation[]): any {
    let columnValues: { [key: string]: any } = {};

    Object.keys(chat).forEach(key => {
        if (key in boardDef) {
            const columnType = boardDef[key].column_type;

            switch (columnType) {
                case 'text':
                case 'email':
                case 'status':
                case 'link':
                    columnValues[key] = chat[key] || '';
                    break;
                case 'date':
                    columnValues[key] = chat[key] ? { date: chat[key].toISOString() } : null;
                    break;
                case 'checkbox':
                    columnValues[key] = chat[key] ? 'true' : 'false';
                    break;
                case 'numbers':
                    columnValues[key] = chat[key] ? chat[key].toString() : '';
                    break;
                case 'dropdown':
                    break;
                default:
                    break;
            }
        }
    });

    // Handle relations
    relations && relations.forEach(relation => {
        if (relation.field in boardDef) {
            columnValues[relation.field] = { item_ids: [relation.value] }
        }
    });

    console.log('columnValues: ', columnValues)
    return columnValues;
}



/* export async function mondayCreateSubItem(
    parentItemId, // monday.com pulse id of parent item
    itemName, // monday.com item pulseId
    columnValues // column values for the item in key value pairs with correct values
){   
    logger.info('CREATING THE SUB ITEM ***') 
    try{
        const mutation = `mutation {
            create_subitem(
                parent_item_id: ${parentItemId}
                item_name: "${itemName}"
                column_values: ${JSON.stringify(JSON.stringify(columnValues))}
            ) {
                id
                name
                column_values {
                    id
                    text
                    value
                }
            }
        }`
        const res = await mondayRequest(mutation)
        logger.info(res, 'RESPONSE')
        return res
    }catch(err){
        throw new Error(err)
    }
} */

// returns the current date time in format required for monday.com date column
export const getMondayDateTime = (date: Date | null=null) => {
    const now = date || new Date();
    const year = now.getUTCFullYear();
    const month = (now.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = now.getUTCDate().toString().padStart(2, '0');
    const hours = now.getUTCHours().toString().padStart(2, '0');
    const minutes = now.getUTCMinutes().toString().padStart(2, '0');
    const seconds = now.getUTCSeconds().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}


const getContactByWebsiteId = async(boardId: string, websiteId: string)=> {
    const query = `query {
        boards (ids: ${boardId}){
          items_page (limit: 1, query_params: {rules: [{column_id: "website_id", compare_value: ["${websiteId}"]}], operator: and}) {
            cursor
            items {
              id 
              name 
              column_values {
                id
                value
                text
                type
              }
            }
          }
        }
    }`
    const data = await mondayRequest(query, '2023-10')
    return data.data.boards[0].items_page.items.length > 0 ? data.data.boards[0].items_page.items[0] : null
}

export const createOrUpdateContact = async (contact: any) => {
    try{
        console.log('contact: ', contact)
        // get contact by website id
        const existingContact = await getContactByWebsiteId(process.env.MONDAY_CONTACTS_BOARD_ID || '', contact.id)
        console.log('existingContact: ', existingContact)
        // if contact exists, update it
        let res = null
        if(existingContact){
            res = await mondayUpdateItem(process.env.MONDAY_CONTACTS_BOARD_ID || '', Number(existingContact.id), {
                email: contact.email,
                website_id: contact.id
            })
            console.log('updatedContact: ', res)
        } else {
            res = await mondayCreateItem(process.env.MONDAY_CONTACTS_BOARD_ID || '', contact.name, {
                email: contact.email,
                website_id: contact.id
            })
            console.log('createdContact: ', JSON.stringify(res, null, 2))
        }
        return res
    }catch(err){
        throw new Error(err as string);
    }
}