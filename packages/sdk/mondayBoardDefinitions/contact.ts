export default {
    // ID INFO
    name: {
        title: "Contacto",
        description: "Nombre del Contacto",
        column_type: "text"
    },
    item_id: {
        title: "ID",
        description: "id del item en monday",
        column_type: "item_id"
    }, //hidden
    website_id: {
        title: "Website ID",
        description: "Id del lead en el website",
        column_type: "text"
    }, //hidden
    user_id: {
        title: "User ID",
        description: "Id del usuario en el website",
        column_type: "text"
    }, //hidden
    quickbooks_id: {
        title: "Quickbooks ID",
        description: "ID del cliente en Quickbooks",
        column_type: 'text'
    }, //hidden
    // CONTACT ORIGIN
    contact_status: {
        title: "Status",
        description: "Status del contacto",
        column_type: 'status',
        labels: {
            1: 'customer',
            2: 'quote_generated',
            4: 'negotiation',
            5: 'prospect', //default
            6: 'loyalty',
            7: 'deferred'
        }
    },
    contact_date: {
        title: "Fecha Contacto",
        description: "Fecha en la que el cliente hizo contacto inicial",
        column_type: "date"
    },
    prospect_date: {
        title: "Fecha Prospecto",
        description: "Fecha en la que el lead se convierte en un prospecto",
        column_type: "date"
    },
    contact_source: {
        title: "Fuente",
        description: "Canal donde el cliente nos encontro",
        column_type: "status",
        labels: {
            1: "whatsapp",
            2: "iphone",
            3: "wave",
            4: "instagram",
            5: "phone",
            6: "website",
            7: "quickbooks",
            8: "other",
            9: "store", //default
        }
    },

    // CONTACT INFORMATION
    phone_number: {
        title: "Telefono",
        description: "Numero de telefono de la persona",
        column_type: "phone"
    },
    email: {
        title: "Correo",
        description: "Correo electronico de la persona",
        column_type: "email"
    },
    whatsapp_name: {
        title: "Perfil Whatsapp",
        description: "Nombre del contacto en su perfil de whatsapp",
        column_type: "text"
    },
    profile_picture: {
        title: "Imagen de Perfil",
        description: "Imagen del perfil del contacto",
        column_type: "file"
    },
    instagram: {
        title: "Instagram",
        description: "Cuenta de instagram de la persona",
        column_type: "text"
    },    
    address: {
        title: "Direccion",
        description: "Direccion de la persona",
        column_type: "location"
    },
    apartment: {
        title: "Piso/Apt",
        description: "Piso/apartamento en el edificio o numero de casa",
        column_type: "text"
    },
    cedula: {
        title: "Cedula",
        description: "numero de cedula o pasaporte de la persona",
        column_type: "text"
    },

    // INTERESTS
    brands: {
        title: "Marcas",
        description: "Marcas en las que la persona esta interesada",
        column_type: "dropdown",
        labels: {
            1: "ergonomica",
            2: "naural"
        }
    },

    // DEMOGRAPHIC INFORMATION
    gender: {
        title: "Genero",
        description: "Genero de la persona",
        column_type: "status",
        labels: {
            1: "male",
            2: "female",
            3: "other"
            // blank default
        }
    },
    age: {
        title: "Edad",
        description: "Edad de la persona",
        column_type: "numbers"
    },
    nationality: {
        title: "Nacionalidad",
        description: "Nacionalidad de la persona",
        column_type: "country"
    },
    job: {
        title: "Profesion",
        description: "Profesion de la persona",
        column_type: "text"
    },

    // SATISFACTION
    satisfaction: {
        title: "Satisfaccion",
        description: "Satisfaccion de la persona con nuestros productos y servicios",
        column_type: "rating"
    },
    google_review: {
        title: "Google Review",
        description: "Si la persona nos ha dejado un google review",
        column_type: "checkbox"
    },
    comments: {
        title: "Comentarios",
        description: "Comentarios sobre la persona",
        column_type: "long_text"
    },

    // ACTIONS
    chat_link: {
        title: "Chat App",
        description: "Enlace para abrir el chat con la persona en la app de chat",
        column_type: "link"
    },
    quickbooks_link: {
        title: "Quickbooks ID",
        description: "Enlace al cliente en quickbooks",
        column_type: "link"
    },
    create_quote: {
        title: "Crear Cotizacion",
        description: "Enlace para crear una cotizacion para dicho contacto en quickbooks",
        column_type: "link"
    },
    convert_company: {
        title: "Convertir Empresa",
        description: "Convierte el contacto en una empresa",
        column_type: "button"
    },
    
    // TIME TRACKING METRICS
    prospecting_time: {
        title: "Tiempo de prospecto",
        description: "Tiempo que transcurre desde que se crea un lead nuevo hasta que se convierte en un contacto",
        column_type: 'time_tracking'
    },
    conversion_time: {
        title: "Tiempo de Conversion",
        description: "Tiempo que transcurre desde que se crea un lead nuevo hasta que se convierte a un cliente",
        column_type: 'time_tracking'
    },
    
    // ITEM HISTORY
    last_chat_time: {
        title: "Fecha del Ultimo Mensaje (ms)",
        description: "La fecha del mensaje como un número en milisegundos",
        column_type: "numbers"
    }, //hidden
    last_chat_text: {
        title: "Ultimo Mensaje",
        description: "Resumen del ultimo mensaje enviado o recibido",
        column_type: "text"
    },
    agent: {
        title: "Encargado",
        description: "Colaborador encargado de atender a la persona",
        column_type: "people"
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
    },

    // BOARD CONNECTIONS
    link_to_chats: {
        title: "Chats",
        description: "One-to-Many relation entre contacto y chat. Mensajes intercambiados con la persona por whatsapp",
        column_type: "board_relation"
    },
    link_to_empresas: {
        title: "Empresa",
        description: "Many-to-One relation entre contacto y empresa. Empresa en la que el contacto trabaja",
        column_type: 'board_relation'
    },
    link_to_deals: {
        title: "Deals",
        description: "Many-to-Many relation entre contacto y deal. Deals en los que la persona ha participado",
        column_type: 'board_relation'
    },
    link_to_cotizaciones: {
        title: "Cotizaciones",
        description: "One-to-Many relation entre contacto y cotizacion. Cotizaciones que se han creado para la persona",
        column_type: 'board_relation'
    },
    link_to_facturas: {
        title: "Facturas",
        description: "One-to-Many relation entre contacto y factura. Facturas que se han creado para la persona",
        column_type: 'board_relation'
    },
    link_to_entregas: {
        title: "Entregas", 
        description: "One-to-Many relation entre contacto y entrega", 
        column_type: "board_relation" 
    },

    // MIRROR
    mirror9: {
        title: "Cotizacion Status Mirror",
        description: "Status de la cotizacion",
        column_type: 'mirror'
    },
    cotizacion_status: {
        title: "Cotizacion Status",
        description: "Status de la cotizacion",
        column_type: 'status',
        labels: {
            1: 'invoiced',
            2: 'rejected',
            4: 'sent',
            5: 'generated',
            // default
        }
    },
};