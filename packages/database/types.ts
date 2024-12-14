import { ChatSource } from "@prisma/client";

export type ChatObject = {
    chat_source: ChatSource,
    source_id: string,
    name: string,
    type: any,
    direction: any,
    chatDate: Date,
    text?: string,
    link?: any,
    contact_object?: any,
    location?: any,
    media?: null | File,
    template: {
        name: string,
        params: string[],
        language: string
    },
    mimeType?: string,
    status?: any,
}

export type ChatItem = Omit<ChatObject, 'media' | 'template'> & { media?: string; };
