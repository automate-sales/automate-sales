export const cocoaToMs = (cocoaTimestamp: number) => {
    const cocoaEpochInMilliseconds = Date.UTC(2001, 0, 1); // January 1, 2001 in milliseconds
    return cocoaEpochInMilliseconds + cocoaTimestamp * 1000;
}

export const cocoaToDate = (cocoaTimestamp: number) => {
    const cocoaEpoch = new Date('2001-01-01T00:00:00Z');
    const millisecondsSinceCocoaEpoch = cocoaTimestamp * 1000; // Convert seconds to milliseconds
    return new Date(cocoaEpoch.getTime() + millisecondsSinceCocoaEpoch);
}

// migrate VCARD and overwrite name in contacts

// generate chats json
// migrate chats from json to monday.com
/* async function migrateChats(chatsPath){
    const chats = JSON.parse(readFileSync(chatsPath, 'utf8'))
    for(let c of chats){
        // create or update in monday.com
        if(c.chat_type !== 'other'){
            // connect the contact
            let chatName = c.text ? c.text.substring(0, 24) : `${c.chat_type} de ${c.phone_number}`
            let phoneObj = normalizePhoneNumber(c.phone_number)

            let colVals = c
            colVals.chat_status = colVals.direction === "incoming" ? "received" : "delivered"
            if(colVals.direction === "incoming") colVals.responded = {
                checked: "true"
            }
            colVals['message_date_ms'] = getMsTimestamp(c.message_date)
            colVals['message_date'] = getMondayDateTime(getDate(c.message_date))
            colVals['phone_number'] = {
                phone: phoneObj.e164Format, 
                countryShortName: phoneObj.countryCode
            }
            let contactRes = await contactsByPhone(boardIds.Contact, phoneObj.e164Format)
            let contact = contactRes?.data?.items_page_by_column_values?.items?.length > 0 ? contactRes.data.items_page_by_column_values.items[0] : null;
            if(contact) colVals[relationFields.Chat.link_to_contactos] = {item_ids : [Number(contact.id)]}
            let { media, mime_type, ...otherCols } = colVals
            const itemRes = await mondayCreateItem(boardIds.Chat, chatName , otherCols)
            logger.info(itemRes, 'Created new chat: ')
            const itemId = itemRes.data.create_item.id
            if(media) {
                const mediaPath = `whatsapp_backup/Message/${media}`
                if(existsSync(mediaPath)){
                    const buffer = readFileSync(mediaPath)
                    await uploadFileMonday(itemId, buffer, 'media', mime_type)
                } else console.error(`File ${mediaPath} does not exist`)
            }            
        }
    }
    return chats
} */