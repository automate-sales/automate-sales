import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import { ChatObject, WhatsappMessage } from './types';
import { getLinkProps, isLink, normalizePhoneNumber } from './utils';

export const validateMetaSignature = (payload: string, signature: string) => {
    const hash = crypto.createHmac('sha1', process.env.META_APP_SECRET as string).update(payload).digest('hex');
    const sig = signature?.split('sha1=')[1]
    console.log('SIG: ', sig)
    console.log('HASH: ', hash)
    return sig === hash;
};

export const cocoaToMs = (cocoaTimestamp: number) => {
    const cocoaEpochInMilliseconds = Date.UTC(2001, 0, 1); // January 1, 2001 in milliseconds
    return cocoaEpochInMilliseconds + cocoaTimestamp * 1000;
}

export const cocoaToDate = (cocoaTimestamp: number) => {
    const cocoaEpoch = new Date('2001-01-01T00:00:00Z');
    const millisecondsSinceCocoaEpoch = cocoaTimestamp * 1000; // Convert seconds to milliseconds
    return new Date(cocoaEpoch.getTime() + millisecondsSinceCocoaEpoch);
}

export const secondsToDate = (timestamp: string) => {
    return new Date(parseInt(timestamp) * 1000)
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

const mediaTypes = [
    'image',
    'video',
    'audio',
    'document',
    'sticker'
]


const parseMediaChat =(message: WhatsappMessage)=> {
    const media = message[message.type] || null
    const mediaType = message.type
    if(mediaTypes.includes(mediaType) && media && 'id' in media){
        const caption = 'caption' in media ? String(media.caption) : null
        const filename = 'filename' in media ? String(media.filename) : null
        return {
            media: media.id,
            mimeType: media.mime_type,
            text: filename || caption || media.mime_type,
            name: filename || media.mime_type
        }
    }  
}

export const parseMessage = async (message: WhatsappMessage): Promise<ChatObject> => {
    console.log('parsing message')
    let chat = {} as ChatObject
    if(message && message[message.type]){
        chat.type = message.type
        chat.whatsapp_id = message.id
        chat.direction = 'incoming'
        chat.chatDate = secondsToDate(message.timestamp)
        switch (message.type) {
            case 'text':
                const body = message.text?.body? message.text.body : null
                if(!body) throw new Error('No body found in text message')
                chat.text = body
                chat.name = body.substring(0, 24)
                const link = isLink(body)
                if(link){
                    const linkProps = await getLinkProps(link)
                    chat.type = 'link'
                    chat.link = linkProps
                }
                return chat;
            case 'contacts':
                const contact = message.contacts ? message.contacts[0] : null
                if(!contact) throw new Error('No contact found in contacts message')
                const contactName = contact.name.formatted_name || contact.name.first_name
                const contactPhone = contact.phones[0].phone 
                const phoneNumberObj = normalizePhoneNumber(contactPhone)
                chat.contact_object = {
                    name: contactName,
                    phone: phoneNumberObj?.e164Format,
                    countryShortName: phoneNumberObj?.countryCode
                }
                chat.text = `${contactName} ${contactPhone}`
                chat.name = `contact: ${contactName}`
                return chat;
            case 'location':
                chat.location = message.location
                chat.text = message.location?.address
                chat.name = `location: ${message.location?.name}`
                return chat;
            case 'audio':
                return {...chat, ...parseMediaChat(message)}
            case 'image':
                return {...chat, ...parseMediaChat(message)}
            case 'video':
                return {...chat, ...parseMediaChat(message)}
            case 'document':
                return {...chat, ...parseMediaChat(message)}
            case 'sticker':
                return {...chat, ...parseMediaChat(message)}
            default:
                throw new Error(`Unrecognized message type: ${message.type}`)
        } 
    } else throw new Error(`Message type not found: ${message.type}`)
}