import dotenv from 'dotenv';
dotenv.config();

/* import { ChatItem, InstagramMessageResponse, InstagramMediaResponse, InstagramMessage } from './types';
import axios from 'axios';
import { File } from 'formidable';
import { createReadStream } from 'fs';
import FormData from 'form-data'; */

const ENV_VARS = [
    "PAGE_ID",
    "APP_ID",
    "PAGE_ACCESS_TOKEN",
    "APP_SECRET",
    "VERIFY_TOKEN"
];

export const config = {
    // Messenger Platform API
    apiDomain: "https://graph.facebook.com",
    apiVersion: "v19.0",
  
    // Page and Application information
    pageId: process.env.IG_PAGE_ID,
    appId: process.env.META_APP_ID,
    pageAccesToken: process.env.IG_ACCESS_TOKEN,
    appSecret: process.env.META_APP_SECRET,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
  
    // URL of your app domain. Will be automatically updated.
    appUrl: process.env.NEXT_PUBLIC_SERVER_URL,
  
    // Preferred port (default to 3000)
    port: process.env.PORT || 8000,
  
    // Optionally set a locale
    locale: process.env.LOCALE,
  
    // Base URL for Messenger Platform API calls
    get apiUrl() {
      return `${this.apiDomain}/${this.apiVersion}`;
    },
  
    // URL of webhook endpoint
    get webhookUrl() {
      return `${this.appUrl}/webhook`;
    },
  
    checkEnvVariables: function() {
      ENV_VARS.forEach(function(key) {
        if (!process.env[key]) {
          console.warn(`WARNING: Missing required environment variable ${key}`);
        }
      });
    }
};

export const getUserProfile = async (senderIgsid: string)=> {
    let url = new URL(`${config.apiUrl}/${senderIgsid}`);
    if (config.pageAccesToken) {
        url.search = new URLSearchParams({
          access_token: config.pageAccesToken,
          fields: "name,profile_pic"
        }).toString()
    }
    let response = await fetch(url);
    if (response.ok) {
      let userProfile = await response.json();
      console.log(`User profile: ${userProfile}`);
      return {
        name: userProfile.name,
        profilePic: userProfile.profile_pic
      };
    } else {
      console.warn(
        `Could not load profile for ${senderIgsid}: ${response.statusText}`
      );
      return null;
    }
}

const handleTextMessage =(user: any, event: any)=> {
    console.log(
      `Received text from user '${user.name}' (${user.igsid}):\n`,
      event.message.text
    );
    let message = event.message.text.trim().toLowerCase();
    console.log("Received message:", message);
    let response;
    return response;
}

// Handle mesage events with attachments
const handleAttachmentMessage =(user: any, event:any)=> {
    let response;

    // Get the attachment
    let attachment = event.message.attachments[0];
    console.log("Received attachment:", `${attachment} for ${user.igsid}`);

    return response;
}

const handleQuickReply =(user: any, event:any)=> {
    // Get the payload of the quick reply
    let response;
    let quickReply = event.message.quick_reply.payload;
    console.log("Received quick reply:", `${quickReply} for ${user.igsid}`);
    return response;
}

const handlePostback =(user: any, event:any)=> {
    let postback = event.postback;
    let response;
    // Check for the special Get Starded with referral
    let payload;
    if (postback.referral && postback.referral.type == "OPEN_THREAD") {
      payload = postback.referral.ref;
    } else {
      // Get the payload of the postback
      payload = postback.payload;
    }
    console.log("Received postback:", `${payload} for ${user.igsid}`);
    return response
  }

  // Handles referral events
  const handleReferral =(user:any, event:any)=> {
    // Get the payload of the postback
    let payload = event.referral.ref.toUpperCase();
    let response;
    console.log("Received referral:", `${payload} for ${user.igsid}`);
    return response;
  }

export const handleMessage =(user:any, event: any)=> {

    let responses;

    try {
      if (event.message) {
        let message = event.message;

        if (message.is_echo) {
          return;
        } else if (message.quick_reply) {
          responses = handleQuickReply(user, event);
        } else if (message.attachments) {
          responses = handleAttachmentMessage(user, event);
        } else if (message.text) {
          responses = handleTextMessage(user, event);
        }
      } else if (event.postback) {
        responses = handlePostback(user, event);
      } else if (event.referral) {
        responses = handleReferral(user, event);
      }
    } catch (error) {
      console.error(error);
      responses = {
        text: `An error has occured: '${error}'. We have been notified and \
        will fix the issue shortly!`
      };
    }

    if (!responses) {
      return;
    }

    /* if (Array.isArray(responses)) {
      let delay = 0;
      for (let response of responses) {
        this.sendMessage(response, delay * 2000);
        delay++;
      }
    } else {
      this.sendMessage(responses);
    } */
  }

/* export const parseMessage = async (message: WhatsappMessage): Promise<ChatItem> => {
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


export const sendMessage = async (
    recipientId: string, // Instagram User ID for the recipient of the message
    message: string | null = null, // Text body of the message
    media?: null| File, // id of the whatsapp media object
    quickReplyOptions: string[] | null = null // Optional quick reply options for the message
): Promise<InstagramMessageResponse> => {
    if (!recipientId || (!message && !media)) throw new Error('Must provide a recipient ID and a message or media ID');
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
        
        let data = {
            recipient: { id: recipientId },
            message: {}
        };

        if (message) {
            data.message = { text: message };
        }

        if (mediaId) {
            data.message = { attachment: { type: 'image', payload: { attachment_id: mediaId } } }; // Example for image, adjust accordingly for video
        }

        if (quickReplyOptions) {
            data.message.quick_replies = quickReplyOptions.map(option => ({
                content_type: 'text',
                title: option,
                payload: option.toUpperCase(),
            }));
        }

        const url = `https://graph.facebook.com/v13.0/me/messages?access_token=${process.env.INSTAGRAM_PAGE_ACCESS_TOKEN}`;
        
        try {
            const response = await axios.post(url, data);
            return response.data;
        } catch (error) {
            console.error('Failed to send message:', error);
            throw new Error('Failed to send Instagram message');
        }
    }
};

export const uploadMedia = async (file: File): Promise<string> => {
    const fileStream = createReadStream(file.filepath);
    const formData = new FormData();
    formData.append('file', fileStream);
    formData.append('type', file.type); // Adjust according to the file type, e.g., 'image' or 'video'
    const url = `https://graph.facebook.com/v13.0/me/message_attachments?access_token=${process.env.INSTAGRAM_PAGE_ACCESS_TOKEN}`;

    try {
        const response = await axios.post(url, formData, { headers: formData.getHeaders() });
        return response.data.attachment_id; // The ID to be used when sending the message
    } catch (error) {
        console.error('Failed to upload media:', error);
        throw new Error('Failed to upload media to Instagram');
    }
}; */