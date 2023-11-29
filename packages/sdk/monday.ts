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
    boardId: number, // monday.com board ID
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
                    text
                    value
                }
            }
        }`
        const res = await mondayRequest(mutation)
        console.info(' RESPONSE FROM MONDAY!!!! ', res)
        return res
    }catch(err: any){
        throw new Error(err)
    }
}

// update a monday.com item with the itemData provided
export async function mondayUpdateItem(
    boardId: number, // id of the monday.com board
    itemId: number, // pulse Id of the item to be updated
    columnValues: { [key:string]: any } // column values as a key pairs with valid values
){
    try{
        const mutation = `mutation {
            change_multiple_column_values(
                item_id: ${itemId}, 
                board_id: ${boardId}, 
                column_values: ${JSON.stringify(JSON.stringify(columnValues))}
            ) {
                id
            }
        }`
        return await mondayRequest(mutation)
    } catch(err){
        throw err
    }
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