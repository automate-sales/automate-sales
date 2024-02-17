import { Prisma, PrismaClient, ChatItem, ChatSource } from "database"
import type { WhatsappContact } from "sdk/types"
import { normalizePhoneNumber } from "sdk/utils"
const prisma = new PrismaClient()


const contactObject = (contact: WhatsappContact, source: ChatSource)=> {
    const name = contact.profile.name || contact.wa_id
    const source_id = contact.wa_id
    const PhoneNumberObj = normalizePhoneNumber(source_id)
    const phone_number = PhoneNumberObj?.e164Format || source_id
    const country = PhoneNumberObj?.countryName || null
    return {
        source_id,
        name,
        phone_number,
        country,
        contact_source: source,
        source_name: name
    }
}

export const getOrCreateContact = async(contact: WhatsappContact, chatDate: Date)=> {
    const source_id = contact.wa_id
    const res = await prisma.contact.upsert({
        where: { source_id },
        update: { last_chat_date: chatDate },
        create: {
            ...contactObject(contact),
            last_chat_date: chatDate,
        }
    })
    return res
}

export const createReceivedChat = async(chat: ChatItem, contact: WhatsappContact)=> {
    const source_id = contact.wa_id
    const result = await prisma.$transaction(async (prisma) => {
        // Create or connect the contact and create the chat
        const newChat = await prisma.chat.create({
            data: {
                ...chat,
                contact: {
                    connectOrCreate: {
                        where: { source_id },
                        create: {
                            ...contactObject(contact, chat.chat_source),
                            last_chat_date: chat.chatDate,
                        }
                    },
                },
            },
            include: { contact: true },
        });

        // If the contact already exists, update the last_chat_date
        if (newChat.contact_id) {
            await prisma.contact.update({
                where: { id: newChat.contact_id },
                data: { 
                    last_chat_date: chat.chatDate,
                    last_chat_text: chat.text 
                },
            });
        }
        return newChat;
    });
    return result;
}

export const createSentChat = async(chat: ChatItem, contactId: string)=> {
    const result = await prisma.$transaction(async (prisma) => {
        // Create or connect the contact and create the chat
        const newChat = await prisma.chat.create({
            data: {
                ...chat,
                contact: {connect: { id: contactId } },
            },
            include: { contact: true },
        });
        // update the contacts last_chat_date
        await prisma.contact.update({
            where: { id: newChat.contact_id },
            data: { last_chat_date: chat.chatDate }
        });
        return newChat;
    });
    return result;
}

export const updateChat = async(chatId: number, fields: { [key: string]: any })=> {
    return await prisma.chat.update({
        where: { id: chatId },
        data: fields as Prisma.ChatUpdateInput,
        include: { contact: true },
    })
}
export const updateContact = async(contactId: string, fields: { [key: string]: any })=> {
    return await prisma.contact.update({
        where: { id: contactId },
        data: fields as Prisma.ContactUpdateInput
    })
}

export const updateChatByWaId = async(waId: string, fields: { [key: string]: any })=> {
    return await prisma.chat.update({
        where: { source_id: waId },
        data: fields as Prisma.ChatUpdateInput,
        include: { contact: true },
    })
}

export const updateChatStatus = async(waId: string, status: string)=> {
    const currentChat = await prisma.chat.findUnique({
        where: { source_id: waId },
        include: { contact: true }
    });
    console.log('CURRENT CHAT!!!: ', currentChat?.status)
    console.log('NEW STATUS!!!: ', status)
    if (currentChat && currentChat.status === 'delivered' && status === 'sent') {
        console.log(`Skipping update for ${waId} as the status is already 'delivered'`);
        return currentChat;
    }
    return await updateChatByWaId(waId, { status: status });
}

export const setRespondedChats = async (
    agent: string, 
    contact_id: string, 
    chat_id: number
) => {
    // Fetch all unresponded chats up to a certain chat_id
    const chats = await prisma.chat.findMany({
        where: {
            direction: 'incoming',
            responded: false,
            contact_id: contact_id,
            id: { lte: chat_id }
        }
    });

    // Update all fetched chats in parallel
    const updatePromises = chats.map(chat => {
        return prisma.chat.update({
            where: { id: chat.id },
            data: { 
                responded: true, 
                respondedAt: new Date(),
                responded_by: agent
            }
        });
    });
    return Promise.all(updatePromises);
}

export const setSeenByChats = async (agent: string, contact_id: string) => {
    const latestChats = await prisma.chat.findMany({
        where: {
            direction: 'incoming',
            responded: false,
            contact_id: contact_id,
        },
        orderBy: { createdAt: 'desc' },
        take: 10
    });
    const updatePromises = latestChats.map(item => {
        return prisma.chat.update({
            where: { id: item.id },
            data: { 
                seen_by: {
                    [agent]: new Date(),
                    ...(typeof item.seen_by === 'object' && item.seen_by !== null ? item.seen_by : {})
                }
            }
        });
    });
    return Promise.all(updatePromises);
}
