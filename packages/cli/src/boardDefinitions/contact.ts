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
            1: 'lead', //default
            5: 'prospect', 
            2: 'quote_generated',
            4: 'negotiation',
            8: 'customer',
            6: 'loyalty',
            7: 'deferred'
        }
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
            2: "naural",
            3: "icepact"
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
    
    creation_log: {
        title: "Creacion",
        description: "Historial de las acciones que se han tomado sobre el item",
        column_type: "creation_log"
    }, // hidden
    last_updated: {
        title: "Actualizacion",
        description: "Información sobre la ultima actualizacion tomada sobre el item",
        column_type: "last_updated"
    }, //hidden
};