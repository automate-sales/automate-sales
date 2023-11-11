const ENV = process.env.NODE_ENV || 'development';
import dotenv from 'dotenv';
dotenv.config({ path: `.env.${ENV}` });

import logger from '../../logger';
import express, { Router, Request, Response } from 'express';

import { parseMessage, validateMetaSignature } from 'sdk/whatsapp';
import type  { WhatsappWebhook } from 'sdk/types'
import { createChat, getOrCreateContact } from '../utils/prisma';

import { Server as SocketIOServer } from 'socket.io';

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
                        const wa_contact = value.contacts[0]
                        // process a message
                        if(value.messages){
                            logger.info('MESSAGE RECEIVED')
                            for(let message of value.messages){
                                logger.info(`MESSAGE ID: ${message.id}`)
                                let obj = await parseMessage(message)
                                obj.status = 'received'
                                logger.info(obj, 'OBJECT: ')
                                const chat = await createChat(obj, wa_contact)
                                logger.info(chat, 'CHAT: ')
                                // return socket event
                                io.emit('new_message', chat)
                            }
                        // process a status update
                        } else if(value.statuses){
                            logger.info('STATUS UPDATE')
                            for(let status of value.statuses){
                                logger.info('STATUS ID: ', status.id)
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

    // sends a message through whatsapp business
    router.post("/message", async (req, res) => {
        logger.debug(req, 'whatsapp message request')
        const { type, message } = req.body;
        try {
                switch(type){
                    case 'text':
                        console.log('sending text message ', message)
                        break;
                    case 'media':
                        // send media message
                        break;
                    case 'template':
                        // send template message
                        break;
                    default:
                        //return res.status(400).send('Invalid message type')
                        console.log('sending text message ', message)
                        break;
                }
                return res.status(200).json({ message: 'Message sent succesfully' })
        }  catch(err){
            logger.error(err)
            const errorMessage = err instanceof Error ? 
            err.message? err.message : JSON.stringify(err) :
            `Unknown error: ${err}`
            return res.status(500).send(errorMessage)
        }
    })
    return router
}