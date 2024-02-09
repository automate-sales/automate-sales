import dotenv from 'dotenv';
dotenv.config();

import logger from '../../logger';
import { Router, Request } from 'express';
import { validateMetaSignature } from 'sdk/whatsapp';
import { getUserProfile, handleMessage } from 'sdk/instagram';
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

    // recieves an instagram message webhook event
    router.post("/webhook", async (req, res) => {
        var users = {} as { [key: string]: any }
        const body = req.body;
        logger.info('whatsapp webhook received')
        try {
            // VALIDATE WEBHOOK
            const rawBody = (req as SpecialRequest).rawBody;
            const signature = req.headers['x-hub-signature']
            if(process.env.NODE_ENV != 'test' && !validateMetaSignature(rawBody, String(signature))) return res.status(200).send('Unauthorized');
            // Check if this is an event from a page subscription
            if (body.object && body.object === "instagram") {
                body.entry.forEach(async function(entry:any) {
                // Handle Page Changes event
                    if ("changes" in entry) {
                        //let receiveMessage = new Receive();
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
                        // Discard uninteresting events
                        if ("message" in webhookEvent && webhookEvent.message.is_echo === true) {
                            console.log("Got an echo");
                            return;
                        }

                        // Get the sender IGSID
                        let senderIgsid = webhookEvent.sender.id;
                        let user = {
                            igsid: senderIgsid,
                            name: "",
                            profilePic: ""
                        }

                        if (!(senderIgsid in users)) {
                        // First time seeing this user
                            let userProfile = await getUserProfile(senderIgsid);
                            if (userProfile) {
                                user.name = userProfile.name;
                                user.profilePic = userProfile.profilePic;
                                users[senderIgsid] = user;
                                console.log(`Created new user profile`);
                                console.dir(user);
                            }
                        }

                        const msg = handleMessage(user, webhookEvent)
                        console.log(msg, 'IG MESSAGE')
                        return msg;
                    });
                });
            } else {
                // Return a '404 Not Found' if event is not recognized
                console.warn(`Unrecognized POST to webhook.`);
                res.sendStatus(404);
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


    // sends a message through whatsapp business
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
            const phoneNumber = chat.contact.whatsapp_id
            
            
            //logger.info(template, 'template objECT')
            const igMessage = await sendMessage(phoneNumber, chat.text, media, template)
            
            
            
            //logger.info(igMessage, 'whatsapp message!!!')
            chat = await updateChat(chat.id, { whatsapp_id: reqType == 'json' ? obj.whatsapp_id : igMessage.messages[0].id, status: 'pending' })
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

