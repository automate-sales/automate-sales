import dotenv from 'dotenv';
dotenv.config();

import logger from '../../logger';
import { Router, Request } from 'express';
import { downloadFileAsArrayBuffer, validateMetaSignature } from 'sdk/whatsapp';
import { getUserProfile, handleMessage, parseMessage } from 'sdk/instagram';
import { Server as SocketIOServer } from 'socket.io';
import { createReceivedChat, updateChat } from '../utils/prisma';
import { uploadFileToS3 } from 'sdk/s3';


const mediaTypes = [
    'image',
    'video',
    'audio',
    'file'
]

export default function(io: SocketIOServer){
    const router: Router = Router();

    type SpecialRequest = Request & { rawBody: string }

    // Verify a instagram webhook
    router.get("/webhook", (req, res) => {
        logger.info(req, 'instagram verify webhook request')
        const verify_token = process.env.instagram_VERIFY_TOKEN;
        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];
        // Check if a token and mode were sent
        if (mode && token) {
            if (mode === "subscribe" && token === verify_token) {
                logger.info('instagram webhook verified succesfully')
                return res.status(200).send(challenge);
            } else {
                logger.fatal('Failed to verify instagram webhook')
                return res.sendStatus(403);
            }
        } else return res.status(200).json({ error: "Invalid verification request" });
    });

    // recieves an instagram message webhook event
    router.post("/webhook", async (req, res) => {
        const body = req.body;
        logger.info(body, 'instagram webhook received ')
        console.log('WEBHOOK BODY ', body)
        try {
            // VALIDATE WEBHOOK
            const rawBody = (req as SpecialRequest).rawBody;
            const signature = req.headers['x-hub-signature']
            if(process.env.NODE_ENV != 'test' && !validateMetaSignature(rawBody, String(signature))) return res.status(200).send('Unauthorized');
            if (!body.object || body.object !== "instagram") return res.status(200).send('Incorrect format. This endpoint expects an instagram webhook event');

            body.entry.forEach(async function(entry:any) {
            // Handle Page Changes event
                if ("changes" in entry) {
                    if (entry.changes[0].field === "comments") {
                        let change = entry.changes[0].value;
                        if (entry.changes[0].value) console.log("Got a comments event");
                        //return receiveMessage.handlePrivateReply("comment_id", change.id);
                        console.log("comment_id", change.id)
                    }
                }

                if (!("messaging" in entry)) {
                    console.warn("No messaging field in entry. Possibly a webhook test.");
                    return;
                }
                // Iterate over webhook events - there may be multiple
                entry.messaging.forEach(async function(webhookEvent:any) {
                    let senderIgsid = webhookEvent.sender.id;
                    let user = { source_id: senderIgsid } as { [key: string]: any }
                    // users = getUsersByIgsid(senderIgsid);
                    var users = null as { [key: string]: any } | null;
                    if (!users) {
                        let userProfile = await getUserProfile(senderIgsid);
                        if (userProfile) {
                            user.name = userProfile.username
                            user.source_name = userProfile.username
                        }
                    }
                    console.log('USER PROFILE ', user)
                    let obj = await parseMessage(webhookEvent);
                    logger.info(obj, 'EMITTING NEW MESSAGE')
                    let chat = await createReceivedChat(obj, { wa_id: user.source_id, profile: {name: user.name } });
                    
                    if(obj.type && mediaTypes.includes(obj.type)){
                        const arrayBuffer = await downloadFileAsArrayBuffer(obj.text)
                        const fileName = obj.name
                        const key = `media/chats/${chat.id}/${fileName}`
                        const s3Url = await uploadFileToS3(arrayBuffer, key);
                        const newObj = {
                            media: s3Url,
                            name: fileName,
                            text: fileName
                        }
                        chat = await updateChat(chat.id, newObj)
                    }
                    
                    logger.info(chat, 'CHAT CREATED')
                    //io.emit('new_message', chat)

                    console.log(obj, 'IG MESSAGE')
                    return obj;
                });
            });
           
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


    // sends a message through instagram business
    router.post("/message", async (req, res, next) => {
        console.log('MESSAGE ENDPOINT TRIGERRED ')
        /* try{
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
            const phoneNumber = chat.contact.instagram_id
            
            
            //logger.info(template, 'template objECT')
            const igMessage = await sendMessage(phoneNumber, chat.text, media, template)
            
            
            
            //logger.info(igMessage, 'instagram message!!!')
            chat = await updateChat(chat.id, { instagram_id: reqType == 'json' ? obj.instagram_id : igMessage.messages[0].id, status: 'pending' })
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
        } */
    })
    return router
}

