import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import { ChatItem, ChatObject, WhatsAppMediaUploadResponse, WhatsAppMessageResponse, WhatsappMediaResponse, WhatsappMessage } from './types';
import { getLinkProps, isLink, normalizePhoneNumber } from './utils';
import { File } from 'formidable';
import { createReadStream } from 'fs'
import FormData from 'form-data';
import axios from 'axios';
import { getTypeFromMime } from './s3';
import { convertWebmToOgg } from './media';
import {v4} from 'uuid'

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
            //mimeType: media.mime_type,
            text: filename || caption || media.mime_type,
            name: filename || media.mime_type
        } as any
    }  
}

export const generateMediaId =()=> {
    const min = 1000000000;
    const max = 9999999999;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const parseMessage = async (message: WhatsappMessage): Promise<ChatItem> => {
    console.log('parsing message')
    let chat = {} as ChatItem
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

const extractParams = (templateBody: string) => {
    console.log('extracting params from: ', templateBody)
    const matches = templateBody.match(/{{(.*?)}}/g);
    const params = matches ? matches.map(match => match.slice(2, -2)) : [];
    console.log('params: ', params)
    return params
}

export const generateMessage = ( fields: {[key: string]: any}, files: any) => {
    console.log('generating message ', fields, files)
    const messageType = fields?.type?.length > 0 ? fields.type[0] : null as string | null
    if(!messageType) throw new Error('No message type found in form data')
    let chat = {
        type: messageType,
        direction: 'outgoing',
        chatDate: new Date()
    } as ChatObject

    console.log('CHAT OBJECT ', chat)
    const text = fields?.text?.length > 0 ? fields.text[0] : null as string | null
    switch(messageType){
        case 'text':
            if(!text) throw new Error('No text found in text message')
            chat.text = text
            chat.name = text.substring(0, 24)
            const link = isLink(text)
            if(link){
                //const linkProps = getLinkProps(link)
                chat.type = 'link'
                chat.link = { url: link }
            }
            return chat;
        case 'contacts':
            const contact = fields.contact as string
            if(!contact) throw new Error('No contact found in contacts message')
            const contactObj = JSON.parse(contact)
            chat.contact_object = contactObj
            console.log(contactObj)
            return chat;
        case 'location':
            const location = fields.location as string
            if(!location) throw new Error('No location found in location message')
            const locationObj = JSON.parse(location)
            chat.location = locationObj
            return chat;
        case 'media':
            console.log('CHAT IS MEDIA !!!!! ')
            chat.media = files.file[0] as File | null
            return chat;
        case 'template':
            const templateName = fields.template[0] as string
            if(!templateName) throw new Error('No template found in template message')
            chat.text = text
            chat.name = templateName
            chat.template = {
                name: templateName,
                params: extractParams(text || ''),
                language: 'es'
            }
            return chat;
        default:
            throw new Error(`Unrecognized message type: ${messageType}`)
    }
}

export async function sendMessage(
    phone?: string |null, // valid phone number with whatsapp for the recipient of the message
    message?: string | null, // text body of the message
    media?: null| File, // id of the whatsapp media object
    template?: {
        name: string, // name of the template
        params: string[], // array of strings for the template parameters
        language?: string
    } | null // template name
): Promise<WhatsAppMessageResponse>{
    if(!message && !media && !template || !phone) throw new Error('Must provide a message or media and a phone number')
    //console.log('WHATSAP MEDIA FILE: ', media)
    //console.log('template: ', template)
    if(process.env.NODE_ENV == 'test') return {
        messaging_product: 'whatsapp',
        contacts: [{
            input: '50767474627',
            wa_id: '50767474627',
        }],
        messages: [{
            id: `wamid.${v4()}`
        }]
    }
    else {
        if(media && media.mimetype?.startsWith('audio/webm')) {
        media = await convertWebmToOgg(media)
        console.log('CONVERTED MEDIA FILE: ', media)
        } 
        const mediaId = process.env.NODE_ENV !== 'test' ? media ? await uploadToWhatsAppMediaAPI(media) : null : null
        console.log('MEDIA ID: ', mediaId)
        const fileName = media?.originalFilename || media?.mimetype ? `${media?.newFilename}.${media?.mimetype?.split('/')[1]}` : media?.newFilename
        const url = `https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_ID}/messages`
        const messageType = template ? 'template' : getTypeFromMime(media?.mimetype)
        const data = {
            messaging_product: "whatsapp",
            to: phone,
            type: messageType,
            ...(message? {text: {body: message}} : {}),
            ...(media? {[messageType]: {id: mediaId, ...(messageType === 'document'? {filename: fileName} : {})}} : {}),
            ...(template? {template: {
                name: template.name,
                language: {
                    code: template.language || 'es'
                },
                ...(template.params? {
                    components: [
                        {
                        "type": "body",
                        "parameters": template.params.map(param => {
                                return {
                                    "type": "text",
                                    "text": param
                                }
                            })
                        }
                    ]
                } : {})
            }} : {}),
        }
        const res = await fetch(url , {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN}`
            },
            body: JSON.stringify(data)
        });
        if(res.ok){
            return await res.json() as WhatsAppMessageResponse;
        } else {
            const errorTxt = await res.text()
            throw new Error(errorTxt)
        }
    }
}

export async function getFromWhatsappMediaAPI(mediaId: string, url: string | null=null): Promise<WhatsappMediaResponse>{
    if(process.env.NODE_ENV == 'test') return {
        messaging_product: 'whatsapp',
        url: url || '',
        mime_type: 'image/jpeg',
        sha256: 'sha256',
        id: mediaId,
        file_size: 123456
    }
    const res = await fetch(`https://graph.facebook.com/v18.0/${mediaId}/`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN}`
        }
    });
    if(res.ok){
        return await res.json() as WhatsappMediaResponse;
    } else {
        const errorTxt = await res.text()
        throw new Error(errorTxt)
    }
}

export const downloadFileAsArrayBuffer = async (url: URL | string): Promise<ArrayBuffer> => {
    try {
        const response = await axios(
            String(url),
            {
                responseType: 'arraybuffer',
                ...(process.env.NODE_ENV != 'test' && {headers: {
                    'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN}`
                }})

            }
        );
        return response.data;
    } catch (error) {
        console.error('Error downloading the file:', error);
        throw error;
    }
};

export async function uploadToWhatsAppMediaAPI(file: File) {
    console.log('UPLOADING TO WHATSAPP MEDIA API ', file)
    const fileStream = createReadStream(file.filepath);
    const fileName = file.originalFilename || file.mimetype ? `${file.newFilename}.${file.mimetype?.split('/')[1]}` : file.newFilename
    const formData = new FormData();
    formData.append('file', fileStream, fileName);
    formData.append('type', file.mimetype);
    formData.append('messaging_product', 'whatsapp');
    const headers = {
        'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
        ...formData.getHeaders() // This sets the 'Content-Type' header to 'multipart/form-data'
    }
    console.log('HEADERS: ', headers)
    try {
        const mediaResponse = await axios.post(
            `https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_ID}/media`,
            formData,
            { headers }
        );
        console.log('RESPONSE !!!!: ', mediaResponse)
        if(mediaResponse.status !== 200) {
            throw new Error(`Error uploading to the whatsapp media API: ${mediaResponse.statusText}`)
        }
        if (!mediaResponse.data.id) throw new Error('Failed to upload the PDF to WhatsApp Media API');
        return mediaResponse.data.id;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error response data:', error.response?.data);
        }
        throw error;
    }
    
}





