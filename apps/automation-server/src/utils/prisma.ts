import { Chat, PrismaClient } from "database"
import type { ChatObject, WhatsappContact } from "sdk/types"
import { normalizePhoneNumber } from "sdk/utils"
const prisma = new PrismaClient()


const contactObject = (contact: WhatsappContact)=> {
    const name = contact.profile.name || contact.wa_id
    const whatsapp_id = contact.wa_id
    const PhoneNumberObj = normalizePhoneNumber(whatsapp_id)
    const phone_number = PhoneNumberObj?.e164Format || whatsapp_id
    const country = PhoneNumberObj?.countryName || null
    return {
        whatsapp_id,
        name,
        phone_number,
        country
    }
}

export const getOrCreateContact = async(contact: WhatsappContact, chatDate: Date)=> {
    const whatsapp_id = contact.wa_id
    const res = await prisma.contact.upsert({
        where: { whatsapp_id },
        update: { last_chat_date: chatDate },
        create: {
            ...contactObject(contact),
            last_chat_date: chatDate,
        }
    })
    return res
}

export const createChat = async(chat: ChatObject, contact: WhatsappContact)=> {
    const whatsapp_id = contact.wa_id
    const result = await prisma.$transaction(async (prisma) => {
        // Create or connect the contact and create the chat
        const newChat = await prisma.chat.create({
            data: {
                ...chat,
                contact: {
                    connectOrCreate: {
                        where: { whatsapp_id },
                        create: {
                            ...contactObject(contact),
                            last_chat_date: chat.chatDate,
                        }
                    },
                },
            },
        });

        // If the contact already exists, update the last_chat_date
        if (newChat.contact_id) {
            await prisma.contact.update({
                where: { id: newChat.contact_id },
                data: { last_chat_date: chat.chatDate },
            });
        }
        return newChat;
    });
    return result;
}