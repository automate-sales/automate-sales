import dotenv from 'dotenv';
import { getLinkProps, isLink } from './utils';
import { ChatItem, ChatObject } from './types';
import { secondsToDate } from './whatsapp';
dotenv.config();
import { v4 } from 'uuid';
import { convertWebmToOgg } from './media';
import { getTypeFromMime } from './s3';

import axios from 'axios';
import { File } from 'formidable';
import { createReadStream } from 'fs';
import FormData from 'form-data';

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
    pageAccesToken: process.env.IG_ACCESS_TOKEN || '',
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
          fields: "id,username"
        }).toString()
    }
    if(process.env.NODE_ENV == 'test') return {
        id: '1234',
        username: 'testuser'
    }
    else {
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
}

export const parseMessage = async (event: any): Promise<any> => {
    const message = event.message
    console.log('parsing message')
    let chat = {
        direction: 'incoming',
        status: 'received',
        type: 'text',
        chat_source: 'instagram',
        source_id: message.mid,
        chatDate: secondsToDate(event.timestamp),
        name: message.text? message.text.substring(0, 24) : '',
        text: message.text? message.text : ''
    } as ChatItem
    if (message.is_echo) {
        return null
    } 
    else if (message.attachments) {
        const mediaUrl = message.attachments[0].payload.url
        const type = message.attachments[0].type
        chat.type = type === 'file' ? 'document' : type
        chat.name = mediaUrl.substring(mediaUrl.lastIndexOf('/') + 1)
        chat.text = mediaUrl
        chat.media = mediaUrl
    } 
    else if (message.reply_to) {
        chat.type = 'reply'
    }
    else if (message.quick_reply) {
        chat.type = 'quick_reply'
    }
    else if (message.text) {
        const link = isLink(message.text)
        if(link){
            const linkProps = await getLinkProps(link)
            chat.type = 'link'
            chat.link = linkProps
        }
    }
    console.log('PARSED MESSAGE: ', chat)
    return chat;
}



export const generateMessage = ( fields: {[key: string]: any}, files: any) => {
    console.log('generating message ', fields, files)
    const messageType = fields?.type?.length > 0 ? fields.type[0] : null as string | null
    if(!messageType) throw new Error('No message type found in form data')
    let chat = {
        type: messageType,
        direction: 'outgoing',
        chat_source: 'instagram',
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
        case 'media':
            chat.media = files.file[0] as File | null
            return chat;
        default:
            throw new Error(`Unrecognized message type: ${messageType}`)
    }
}


export async function uploadToMetaMediaAPI(file: File) {
    console.log('UPLOADING TO WHATSAPP MEDIA API ', file)
    const fileStream = createReadStream(file.filepath);
    const fileName = file.originalFilename || file.mimetype ? `${file.newFilename}.${file.mimetype?.split('/')[1]}` : file.newFilename
    const formData = new FormData();
    const fileType = getTypeFromMime(file.mimetype)
    formData.append('platform', 'instagram');
    formData.append('message', JSON.stringify({
        attachment: {
            type: fileType,
            is_reusable: true
        }
    }));
    // Ensure that the file path and type are correctly specified
    formData.append('filedata', fileStream, fileName);
    formData.append('access_token', config.pageAccesToken);

    try {
        const mediaResponse = await axios.post(
            `https://graph.facebook.com/${config.apiVersion}/${config.pageId}/message_attachments`,
            formData
        );
        console.log('RESPONSE !!!!: ', mediaResponse)
        if(mediaResponse.status !== 200) {
            throw new Error(`Error uploading to the whatsapp media API: ${mediaResponse.statusText}`)
        }
        if (!mediaResponse.data.attachment_id) throw new Error('Failed to upload the PDF to WhatsApp Media API');
        return mediaResponse.data.attachment_id;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error response data:', error.response?.data);
        }
        throw error;
    }
    
}

export const sendMessage = async (
    recipientId: string, // Instagram User ID for the recipient of the message
    message: string | null = null, // Text body of the message
    media?: null| File, // id of the whatsapp media object
    quickReplyOptions: string[] | null = null // Optional quick reply options for the message
): Promise<any> => {
    if (!recipientId || (!message && !media)) throw new Error('Must provide a recipient ID and a message or media ID');
    if(process.env.NODE_ENV == 'test') return {
        "recipient_id": "1234",
        "message_id": `m_${v4()}`
    }
    else {
        if(media && media.mimetype?.startsWith('audio/webm')) {
            media = await convertWebmToOgg(media)
            console.log('CONVERTED MEDIA FILE: ', media)
        }
        const mediaId = process.env.NODE_ENV !== 'test' ? media ? await uploadToMetaMediaAPI(media) : null : null
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
            data.message = { attachment: { type: 'MEDIA_SHARE', payload: { attachment_id: mediaId } } }; // Example for image, adjust accordingly for video
        }

        /* if (quickReplyOptions) {
            data.message.quick_replies = quickReplyOptions.map(option => ({
                content_type: 'text',
                title: option,
                payload: option.toUpperCase(),
            }));
        } */

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
};