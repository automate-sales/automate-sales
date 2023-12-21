import dotenv from 'dotenv';
dotenv.config();

import logger from '../../logger';
import { Router, Request } from 'express';
import { analyzeSentiment, extractDemographicData, extractTextFromAudio } from 'sdk/openai';
import { convertToMondayColumnValues, createOrUpdateContact, getMondayDateTime, mondayCreateItem } from 'sdk/monday';

import { downloadFileAsArrayBuffer, generateMediaId, generateMessage, getFromWhatsappMediaAPI, parseMessage, sendMessage, validateMetaSignature } from 'sdk/whatsapp';
import { getTypeFromMime, uploadFileToS3 } from "sdk/s3"
import type  { WhatsappMediaObject, WhatsappWebhook } from 'sdk/types'
import { createReceivedChat, createSentChat, setRespondedChats, updateChat, updateChatByWaId, updateChatStatus, updateContact } from '../utils/prisma';

import { Server as SocketIOServer } from 'socket.io';

import formidable from 'formidable';

import chatBoard from 'sdk/mondayBoardDefinitions/chat'
import contactBoard from 'sdk/mondayBoardDefinitions/contact'

export default function(io: SocketIOServer){
    const router: Router = Router();

    type SpecialRequest = Request & { rawBody: string }

    // Verify a whatsapp webhook
    router.get("/webhook", (req, res) => {
        logger.info(req, 'whatsapp verify webhook request')
        const verify_token = process.env.WHATSAPP_VERIFY_TOKEN;
        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];
        // Check if a token and mode were sent
        if (mode && token) {
        if (mode === "subscribe" && token === verify_token) {
            logger.info('Whatsapp webhook verified succesfully')
            return res.status(200).send(challenge);
        } else {
            logger.fatal('Failed to verify whatsapp webhook')
            return res.sendStatus(403);
        }
        } else return res.status(200).json({ error: "Invalid verification request" });
    });

    // recieves a whatsapp business webhook event
    // creates a chat in monday.com
    router.post("/webhook", async (req, res) => {
        const body = req.body as WhatsappWebhook;
        logger.info('whatsapp webhook received')
        try{
            // VALIDATE WEBHOOK
            const rawBody = (req as SpecialRequest).rawBody;
            const signature = req.headers['x-hub-signature']
            if(process.env.NODE_ENV != 'test' && !validateMetaSignature(rawBody, String(signature))) return res.status(200).send('Unauthorized');
            if (!body.object || !body.entry?.[0]?.changes?.[0]?.value) return res.status(200).send('Incorrect format. This endpoint expects a whatsapp webhook event');
            
            logger.info(body, 'BODY VALIDATED')
            // PROCESS EVENTS
            for(let entry of body.entry){
                for(let change of entry.changes){
                    const value = change.value
                    //logger.info(value, 'recieved a whatsapp event')
                    if(value){
                        // process a message
                        if(value.messages){
                            const wa_contact = value.contacts[0]
                            for(let message of value.messages){
                                let obj = await parseMessage(message)
                                obj.status = 'received'
                                //logger.info(obj, 'OBJECT: ')
                                // lead = get or create lead
                                let chat = await createReceivedChat(obj, wa_contact)
                                //logger.info(chat, 'CHAT: ')

                                // PERHAPS MAKE THIS OPTIONAL, like try catch and log the error failed to upload media.
                                if(message.type && mediaTypes.includes(message.type)){
                                    const media = message[message.type] as WhatsappMediaObject
                                    //logger.info(chat.media, 'media file')
                                    // must have test version
                                    const mediaUrl = process.env.NODE_ENV == 'test' ? media.url : null
                                    const mediaRes = await getFromWhatsappMediaAPI(media.id, mediaUrl)
                                    //logger.info(mediaRes, 'media response \n MEDIA RESPONSE')
                                    const arrayBuffer = await downloadFileAsArrayBuffer(mediaRes.url)
                                    //logger.info(arrayBuffer, 'ARRAY BUFFER')
                                    const fileName = message.document?.filename || `${generateMediaId()}.${media.mime_type.split('/')[1]}`
                                    const key = `media/chats/${chat.id}/${fileName}`
                                    const s3Url = await uploadFileToS3(arrayBuffer, key);
                                    const obj = {
                                        media: s3Url,
                                        name: fileName,
                                        text: fileName,
                                        type: getTypeFromMime(media.mime_type)
                                    }
                                    chat = await updateChat(chat.id, obj)
                                }
                                // return socket event

                                logger.info(chat, 'EMITTING NEW MESSAGE')
                                io.emit('new_message', chat)


                                // POST PROCESSING
                                //logger.info(chat, 'POST PROCESSING CHAT: ')
                                // analyze w chat gpt
                                if(chat.type == 'text' && process.env.SENTIMENT_ANALYSIS){
                                    const gptResponse = await analyzeSentiment(chat.text || '')
                                    const analyzedChat = gptResponse && await updateChat(chat.id, gptResponse)
                                    //logger.info(analyzedChat, 'ANALYZED CHAT: ')
                                }
                                if(chat.type == 'text' && process.env.DATA_EXTRACTION){
                                    const extractedData = await extractDemographicData(chat.contact.last_chat_text || '', chat.text || '')
                                    //logger.info(extractedData, 'EXTRACTED DATA: ')
                                    extractedData && await updateContact(chat.contact_id, extractedData)
                                }
                                if(process.env.CRM_INTEGRATION){
                                    // create or update a contact
                                    const mondayContact = await createOrUpdateContact(chat.contact)                                    // create a chat
                                    const mondayChat = await mondayCreateItem(5244743938, chat.name || '', {
                                        text: chat.text || '',
                                        direction: chat.direction || '',
                                        chat_status: chat.status || '',
                                        chat_type: chat.type || '',
                                        message_date: getMondayDateTime(chat.chatDate),
                                        message_date_ms: chat.chatDate?.getTime(),
                                        phone_number: chat.contact.phone_number || '',
                                        sentiment: chat.sentiment || '',
                                        language: chat.language || '',
                                        connect_boards: { item_ids: [mondayContact.id] }
                                    })
                                }
                            }


                        // process a status update
                        } else if(value.statuses){
                            //logger.info('STATUS UPDATE')
                            for(let status of value.statuses){
                                //logger.info(status, 'STATUS: ')
                                const chat = await updateChatStatus(status.id, status.status)
                                // update in CRM
                                io.emit('status_update', chat)
                            }
                        } else {
                            logger.info(value, 'recieved a unrecognized whatsapp event')
                        }
                    }

                    // update in crm
                    // lead
                    // chat
                }
            }
            return res.status(200).send('Message recieved')
        
        } catch(err){
            logger.error(err)
            const errorMessage = err instanceof Error ? 
            err.message? err.message : JSON.stringify(err) :
            `Unknown error: ${err}`
            if(process.env.NODE_ENV == 'production') return res.status(500).send(errorMessage)
            else return res.status(200).send(errorMessage)
        }
    });

    const mediaTypes = [
        'image',
        'video',
        'audio',
        'contact',
        'document',
        'sticker',
        'media'
    ]

    const formPromise = (req: Request): Promise<{ fields: formidable.Fields<string>, files: formidable.Files<string> }> => {
        return new Promise((resolve, reject) => {
            const form = formidable({
                allowEmptyFiles: true,
                minFileSize: 0
            })
            form.parse(req, (err, fields, files) => {
                if (err) reject(err)
                resolve({ fields, files })
            })
        })
    }

    // sends a message through whatsapp business
    router.post("/message", async (req, res, next) => {
        console.log('MESSAGE ENDPOINT TRIGERRED ')
        try{
            let reqType, fields, files, contactId, obj, agent;
            if (req.headers['content-type'] === 'application/json') {
                reqType = 'json';
                console.log('Processing JSON body');
                fields = req.body;
                files = {}; // Assuming no files in JSON request
                contactId = fields?.contact_id;
                console.log('CONTACT ID  ', contactId)
                delete fields.contact_id;
                agent = ''
                obj = fields
            } else {
                // Process using formidable for form data
                reqType = 'form'
                console.log('Processing form data using formidable');
                const formResults = await formPromise(req);
                fields = formResults.fields;
                files = formResults.files;
                contactId = fields?.contact_id ? fields.contact_id[0] : null;
                agent = fields?.agent? fields.agent[0] : ''
                obj = generateMessage(fields, files)
            }
            if(!contactId) throw new Error('No contact_id found in form data')
            
            console.log('MESSAGE OBJECT ', obj)
            
            const {media, template, ...item} = obj
            //logger.info(item, 'CREATING CHAT ')
            let chat = await createSentChat(item, contactId)
            //logger.info(chat, 'CHAT ! ')
            if(media && media.size > 0){
                //upload to s3
                //logger.info(media, 'media file')
                const fileName = media.originalFilename || media.mimetype ? `${media.newFilename}.${media.mimetype?.split('/')[1]}` : media.newFilename
                const key = `media/chats/${chat.id}/${fileName}`
                const s3Url = await uploadFileToS3(media, key);
                const obj = {
                    media: s3Url,
                    name: fileName,
                    text: fileName,
                    type: getTypeFromMime(media.mimetype)
                }
                chat = await updateChat(chat.id, obj)
                //logger.info(res, 'chat updated with media')
            }
            const phoneNumber = chat.contact.whatsapp_id
            //logger.info(template, 'template objECT')
            const whatsappMessage = await sendMessage(phoneNumber, chat.text, media, template)
            //logger.info(whatsappMessage, 'whatsapp message!!!')
            chat = await updateChat(chat.id, { whatsapp_id: reqType == 'json' ? obj.whatsapp_id : whatsappMessage.messages[0].id, status: 'pending' })
            await updateContact(chat.contact_id, { last_chat_date: chat.chatDate, last_chat_text: chat.text })
            io.emit('new_message', chat)
            
            // set responded chats
            await setRespondedChats(
                agent,
                chat.contact_id,
                chat.id,
            )
            if(process.env.CRM_INTEGRATION){
                // create in monday.com
                const mondayItem = await mondayCreateItem(5244743938, chat.name || '', {
                    text: chat.text || '',
                    direction: chat.direction || '',
                    chat_status: chat.status || '',
                    chat_type: chat.type || '',
                    message_date: getMondayDateTime(chat.chatDate),
                    message_date_ms: chat.chatDate?.getTime(),
                    phone_number: chat.contact.phone_number || ''
                })
                //logger.info(mondayItem, 'MONDAY ITEM: ')
            }

            return res.status(200).send('Message sent')
        } catch(err){
            const errorMessage = err instanceof Error ? 
            err.message? err.message : JSON.stringify(err) :
            `Unknown error: ${err}`
            logger.error(errorMessage)
            return res.status(500).send(errorMessage)
        }
    })
    return router
}

