export type CountryCodeDict = {
    [key: string]: {
        code: string,
        name: string,
        lengths: number[]
    }
}


export type PhoneNumberObj = {
    e164Format: string,
    countryCode: string,
    countryName: string,
    code: string,
    error?: string
}

export type WhatsappContact = {
    profile: {
        name: string;
    };
    wa_id: string;
}

export type WhatsappMessage = {
    from: string;
    id: string;
    timestamp: string;
    type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'location' | 'contacts';
    text?: {
        body: string;
    };
    image?: {
        caption: string;
        id: string;
        mime_type: string;
    };
    video?: {
        caption: string;
        id: string;
        mime_type: string;
    };
    audio?: {
        id: string;
        mime_type: string;
    };
    document?: {
        caption: string;
        id: string;
        filename: string;
        mime_type: string;
    };
    sticker?: {
        caption: string;
        id: string;
        mime_type: string;
    };
    location?: {
        longitude: string;
        latitude: string;
        name?: string;
        address?: string;
    };
    contacts?: Array<{
        name: {
            formatted_name: string;
            first_name?: string;
            last_name?: string;
        };
        phones: Array<{
            phone: string;
            type: string;
        }>;
        wa_id: string;
    }>
}

export type WhatsappStatus = {
    id: string;
    recipient_id: string;
    status: 'sent' | 'delivered' | 'read' | 'failed';
    timestamp: number;
    conversation: {
        id: string;
        origin: {
            type: string;
        };
    };
}

export type WhatsappWebhook = {
    object: string;
    entry: Array<{
        id: string;
        time: number;
        changes: Array<{
            value: {
                messaging_product: string;
                metadata: {
                    display_phone_number: string;
                    phone_number_id: string;
                };
                contacts: Array<WhatsappContact>;
                messages?: Array<WhatsappMessage>;
                statuses?: Array<WhatsappStatus>;
            };
            field: string;
        }>;
    }>;
};


export type ChatObject = {
    whatsapp_id: string,
    name: string,
    type: any,
    direction: any,
    chatDate: Date,
    text?: string,
    link?: any,
    contact_object?: any,
    location?: any,
    media?: any,
    mimeType?: string,
    status?: any,
}