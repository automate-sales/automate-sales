export default {
    // ID INFO
    name: {
        title: "Nombre",
        description: "Nombre del contacto o lead + fecha",
        column_type: "text"
    },
    item_id: {
        title: "ID",
        description: "id del chat en monday",
        column_type: "item_id"
    },
    whatsapp_id: {
        title: "Whatsapp ID",
        description: "ID unico del chat en whatsapp",
        column_type: "text"
    }, //hidden
    // MESSAGE CONTENT
    chat_status: {
        title: "Estado",
        description: "Estado del chat",
        column_type: "status",
        labels: {
            6: "new", //default
            1: "pending",
            2: "sent",
            4: "delivered",
            7: "read",
            3: "received",
            5: "failed",
            
        }
    },
    direction: {
        title: "Direccion",
        description: "Si el mensaje esta siendo enviado o recibido",
        column_type: "status",
        labels: {
            1: "incoming",
            2: "outgoing" //default
        }
    },
    chat_type: {
        title: "Tipo",
        description: "Tipo de mensaje text/media",
        column_type: "status",
        labels: {
            1: "template",
            2: "location",
            3: "audio",
            4: "image",
            5: "video",
            6: "contact",
            7: "location",
            8: "link",
            9: "document",
            10: "sticker",
            11: "other",
            12: "media",
            13: "text" //default
        }
    },
    template: {
        title: "Plantilla",
        description: "El nombre de la plantilla de whatsapp utilizada",
        column_type: "status",
        labels: {
            1: "re_engagement"
            //default blank
        }
    },
    text: {
        title: "Texto",
        description: "Texto del chat",
        column_type: "text"
    },
    media: {
        title: "Medios",
        description: "Media (como imágenes, videos, etc.) enviados en el chat",
        column_type: "file"
    },
    location: {
        title: "Ubicacion",
        description: "Ubicacion enviada en el chat",
        column_type: "location"
    },
    link: {
        title: "Enlace",
        description: "Enlace enviado en el chat",
        column_type: "link"
    },
    link_title: {
        title: "Titulo de Enlace",
        description: "Titulo del Enlace enviado en el chat",
        column_type: "text"
    },
    link_description: {
        title: "Descripcion de Enlace",
        description: "Descripcion del Enlace enviado en el chat",
        column_type: "text"
    },
    link_image: {
        title: "Imagen de Enlace",
        description: "URL de la imagen del Enlace enviado en el chat",
        column_type: "text"
    },
    contact_name: {
        title: "Nombre Contacto",
        description: "Nombre del contacto enviado en el chat",
        column_type: "text"
    },
    contact_phone: {
        title: "Telefono Contacto",
        description: "Numero de telefono del contacto enviado en el chat",
        column_type: "phone"
    },
    message_date: {
        title: "Fecha del Mensaje",
        description: "Fecha en que se envió/recibió el mensaje",
        column_type: "date"
    },
    message_date_ms: {
        title: "Fecha del Mensaje (ms)",
        description: "La fecha del mensaje como un número en milisegundos",
        column_type: "numbers"
    }, //hidden
    phone_number: {
        title: "Telefono",
        description: "Numero de telefono del cliente que envió/recibió el mensaje",
        column_type: "phone"
    },

    // ANALYSIS
    language: {
        title: "Idioma",
        description: "Idioma detectado del chat",
        column_type: "text"
    },
    sentiment: {
        title: "Sentimiento",
        description: "Sentimiento detectado del chat",
        column_type: "status",
        labels: {
            1: "positive",
            2: "negative",
            3: "neutral"
        }
    },
    insights: {
        title: "Insights",
        description: "Insights detectados del chat",
        column_type: "dropdown",
        labels: {
            1: "sarcasm",
            2: "sexual language",
            3: "foul language",
            4: "slang",
            5: "gratitude",
            6: "regret",
            7: "happiness",
            8: "anger",
            9: "sadness",
            10: "confusion",
            11: "excitement",
            12: "fear",
            13: "love",
            14: "optimism",
            15: "pessimism",
            16: "formality",
            17: "informality",
            18: "urgency",
            19: "relaxation"
        }  
    },
    responded: {
        title: "Respondido?",
        description: "una casilla que contiene un ganchito si el mensaje ya fue respondido",
        column_type: "checkbox"
    },
    response_time: {
        title: "Tiempo Respuesta",
        description: "Tiempo que transcurre desde que se recibe un mensaje hasta que algún agente responda",
        column_type: "time_tracking"
    },
    
    // ITEM HISTORY
    assigned_to: {
        title: "Asignado a",
        description: "Colaborador asignado para atender el mensaje",
        column_type: "people"
    },
    responded_by: {
        title: "Respondido por",
        description: "Colaborador que atendió el mensaje",
        column_type: "people"
    },
    assigned_to_email: {
        title: "Asignado a",
        description: "Colaborador asignado para atender el mensaje",
        column_type: "text"
    },
    responded_by_email: {
        title: "Respondido por",
        description: "Colaborador que atendió el mensaje",
        column_type: "text"
    },

    creation_log: {
        title: "Creacion",
        description: "Historial de las acciones que se han tomado sobre el item",
        column_type: "creation_log"
    },
    last_updated: {
        title: "Actualizacion",
        description: "Información sobre la ultima actualizacion tomada sobre el item",
        column_type: "last_updated"
    }, //hidden

    // BOARD CONNECTIONS
    connect_boards: {
        title: "Cliente",
        description: "Many-to-One relation entre chat y Lead o contacto. Lead o contacto que envió o recibió el chat",
        column_type: "board_relation"
    }
};