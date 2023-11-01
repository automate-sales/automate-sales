const ENV = process.env.NODE_ENV || 'development';
import dotenv from 'dotenv';
dotenv.config({ path: `.env.${ENV}` });

import logger from '../../logger';
import express, { Router, Request, Response } from 'express';
const router: Router = Router();

type SpecialRequest = Request & { rawBody: string }

// Verify a whatsapp webhook
router.get("/webhook", (req, res) => {
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
    }
});

// recieves a whatsapp business webhook event
// creates a chat in monday.com
router.post("/webhook", async (req, res) => {
    const body = req.body;
    logger.info(body, 'whatsapp webhook request: ')
    try{
        // VALIDATE WEBHOOK
        const rawBody = (req as SpecialRequest).rawBody;
        const signature = req.headers['x-hub-signature']
        //if(!validateMetaSignature(rawBody, signature)) return res.status(200).send('Unauthorized');
        if (!body.object || !body.entry?.[0]?.changes?.[0]?.value) return res.status(200).send('Incorrect format. This endpoint expects a whatsapp webhook event');
        
        // PROCESS EVENTS
        for(let entry of body.entry){
            for(let change of entry.changes){
                const value = change.value
                if(value){
                    if(value.messages){
                        console.log('MESSAGE RECEIVED')
                        for(let message of value.messages){
                            console.log('MESSAGE ID: ', message.id)
                        }
                    } else if(value.statuses){
                        console.log('STATUS UPDATE')
                        for(let status of value.statuses){
                            console.log('STATUS ID: ', status.id)
                        }
                    } else {
                        logger.info(value, 'recieved a unrecognized whatsapp event')
                        return res.status(200).send('Unrecognized whatsapp event')
                    }
                }
            }
        }
       
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
    const { messageType, file } = req.body;
    try {
            if(messageType === 'template'){
                logger.debug('Sending a template message ...')
            } 
            else if(mediaTypes.includes(messageType)){
                if(!file) logger.warn('No file was found in the message')
                else {
                    logger.debug('Sending a media message ...')
                }
            }
            else {
                logger.debug('Sending a text message ...')
            }
            return res.status(200).send('success')
    }  catch(err){
        logger.error(err)
        const errorMessage = err instanceof Error ? 
        err.message? err.message : JSON.stringify(err) :
        `Unknown error: ${err}`
        return res.status(500).send(errorMessage)
    }
})

export default router;