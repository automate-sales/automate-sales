const ENV = process.env.NODE_ENV || 'development';
import dotenv from 'dotenv';
dotenv.config({ path: `.env.${ENV}` });

import logger from '../../logger';
import express, { Router, Request, Response } from 'express';

import { downloadFileAsArrayBuffer, generateMediaId, generateMessage, getFromWhatsappMediaAPI, parseMessage, sendMessage, validateMetaSignature } from 'sdk/whatsapp';
import { getTypeFromMime, uploadFileToS3 } from "sdk/s3"
import type  { ChatItem, ChatObject, WhatsappMediaObject, WhatsappWebhook } from 'sdk/types'
import { createReceivedChat, createSentChat, updateChat, updateChatByWaId } from '../utils/prisma';

import { Server as SocketIOServer } from 'socket.io';

import formidable from 'formidable';

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
        logger.info(body, 'whatsapp webhook requestion: ')
        try{
            // VALIDATE WEBHOOK
            const rawBody = (req as SpecialRequest).rawBody;
            const signature = req.headers['x-hub-signature']
            if(!validateMetaSignature(rawBody, String(signature))) return res.status(200).send('Unauthorized');
            if (!body.object || !body.entry?.[0]?.changes?.[0]?.value) return res.status(200).send('Incorrect format. This endpoint expects a whatsapp webhook event');
            
            logger.info('BODY VALIDATED')
            // PROCESS EVENTS
            for(let entry of body.entry){
                for(let change of entry.changes){
                    const value = change.value
                    logger.info(value, 'recieved a whatsapp event')
                    if(value){
                        // process a message
                        if(value.messages){
                            const wa_contact = value.contacts[0]
                            logger.info('MESSAGE RECEIVED')
                            for(let message of value.messages){
                                logger.info(`MESSAGE ID: ${message.id}`)
                                let obj = await parseMessage(message)
                                obj.status = 'received'
                                logger.info(obj, 'OBJECT: ')
                                const chat = await createReceivedChat(obj, wa_contact)
                                logger.info(chat, 'CHAT: ')
                                if(message.type && mediaTypes.includes(message.type)){
                                    //upload to s3
                                    logger.info(chat.media, 'media file! ')
                                    const media = message[message.type] as WhatsappMediaObject
                                    logger.info(chat.media, 'media file')
                                    const mediaRes = await getFromWhatsappMediaAPI(media.id)
                                    const arrayBuffer = await downloadFileAsArrayBuffer(mediaRes.url)
                                    const fileName = `${generateMediaId()}.${media.mime_type.split('/')[1]}`
                                    const key = `media/chats/${chat.id}/${fileName}`
                                    const s3Url = await uploadFileToS3(arrayBuffer, key);
                                    const obj = {
                                        media: s3Url,
                                        name: fileName,
                                        text: fileName,
                                        type: getTypeFromMime(media.mime_type)
                                    }
                                    await updateChat(chat.id, obj)
                                    logger.info(res, 'chat updated with media')
                                }
                                // return socket event
                                io.emit('new_message', chat)
                            }
                        // process a status update
                        } else if(value.statuses){
                            logger.info('STATUS UPDATE')
                            for(let status of value.statuses){
                                logger.info(status, 'STATUS: ')
                                const chat = await updateChatByWaId(status.id, { status: status.status })
                                io.emit('status_update', chat)
                            }
                        } else {
                            logger.info(value, 'recieved a unrecognized whatsapp event')
                        }
                    }
                }
            }
            return res.status(200).send('Message recieved')
        
        } catch(err){
            logger.error(err)
            const errorMessage = err instanceof Error ? 
            err.message? err.message : JSON.stringify(err) :
            `Unknown error: ${err}`
            if(ENV == 'production') return res.status(500).send(errorMessage)
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
            logger.info('MESSAGE ENDPOINT TRIGERRED ')
            const { fields, files } = await formPromise(req)
            logger.info(fields, 'form fields')
            const contactId = fields?.contact_id? fields.contact_id[0] : null
            if(!contactId) throw new Error('No contact_id found in form data')
            let obj = generateMessage(fields, files)
            const {media, ...item} = obj
            let chat = await createSentChat(item, contactId)
            logger.info(chat, 'CHAT ! ')
            if(media && media.size > 0){
                //upload to s3
                logger.info(media, 'media file')
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
                logger.info(res, 'chat updated with media')
            }
            const phoneNumber = chat.contact.whatsapp_id
            const whatsappMessage = await sendMessage(phoneNumber, chat.text, media)
            logger.info(whatsappMessage, 'whatsapp message')
            chat = await updateChat(chat.id, { whatsapp_id: whatsappMessage.messages[0].id, status: 'pending' })
            io.emit('new_message', chat)
            return res.status(200).send('Message sent')
        } catch(err){
            logger.error(err)
            const errorMessage = err instanceof Error ? 
            err.message? err.message : JSON.stringify(err) :
            `Unknown error: ${err}`
            return res.status(500).send(errorMessage)
        }
    })
    return router
}