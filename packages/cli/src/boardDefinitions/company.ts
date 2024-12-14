export default {
    // ID INFO
    name: {
        title: "Empresa",
        description: "Nombre común de la empresa",
        column_type: "text"
    },
    item_id: {
        title: "ID",
        description: "identificador único de la empresa en monday",
        column_type: "item_id"
    }, //hidden
    quickbooks_id: {
        title: "Quickbooks ID",
        description: "ID del cliente en Quickbooks",
        column_type: 'text'
    }, //hidden
    // STATE
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
        title: "Teléfono",
        description: "Número de teléfono de la empresa",
        column_type: "phone"
    },
    email: {
        title: "Correo",
        description: "Correo electronico de la persona",
        column_type: "email"
    },
    instagram: {
        title: "Instagram",
        description: "Cuenta de instagram de la empresa",
        column_type: "text"
    },
    website: {
        title: "Pagina Web",
        description: "Pagina web de la empresa",
        column_type: "text"
    },
    address: {
        title: "Direccion",
        description: "Dirección de la empresa",
        column_type: "location"
    },
    apartment: {
        title: "Piso/Oficina",
        description: "Piso / numero de la oficina en el edificio, o el numero de casa",
        column_type: "text"
    },         
    razon_social: {
        title: "Razón Social",
        description: "Razón social de la empresa",
        column_type: "text"
    },
    nombre_comercial: {
        title: "Nombre Comercial",
        description: "Nombre bajo el cual la empresa realiza sus operaciones comerciales, el nombre detallado en el aviso de operacion",
        column_type: "text"
    },
    ruc: {
        title: "RUC",
        description: "Registro Único de Contribuyentes de la empresa",
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
    sector: {
        title: "Sector",
        description: "Sector al que pertenece la empresa",
        column_type: "dropdown",
        labels: {
            1: "tecnología",
            2: "construcción",
            3: "salud",
            4: "educación",
            5: "energía",
            6: "finanzas",
            7: "alimentación y agricultura",
            8: "turismo y hospitalidad",
            9: "transporte",
            10: "bienes raíces",
            11: "medios y comunicación",
            12: "moda y textil",
            13: "químico y farmacéutico",
            14: "minero",
            15: "retail y comercio",
            16: "arte y entretenimiento",
            17: "servicios profesionales",
            18: "manufactura",
            19: "seguridad",
            20: "deportes y recreación",
            21: "diseño",
            22: "arquitectura",
            23: "producción audiovisual",
            24: "publicidad y marketing",
            25: "consultoría",
            26: "informática",
            27: "derecho y legal",
            28: "recursos humanos",
            29: "ingeniería"
        }
    },
    multinational: {
        title: "Multinacional",
        description: "Casilla que contiene un gancho si la empresa es una multinacional",
        column_type: "checkbox"
    },
    government: {
        title: "Gabierno",
        description: "Casilla que contiene un gancho si la empresa es algun departamento del gobierno",
        column_type: "checkbox"
    },
    size: {
        title: "Tamaño",
        description: "Cantidad aproximada de empleados que trabajan en la empresa",
        column_type: "numbers"
    },
    nationality: {
        title: "Nacionalidad",
        description: "País de donde proviene la Empresa",
        column_type: "country"
    },
    
    // SATISFACTION
    satisfaction: {
        title: "Satisfaccion",
        description: "Satisfaccion de la empresa con nuestros productos y servicios",
        column_type: "rating"
    },
    testimonial: {
        title: "Testimonio",
        description: "Si la empresa nos ha dejado un testimonio para utilizar en nuestra pagina web",
        column_type: "checkbox"
    },
    comments: {
        title: "Comentarios",
        description: "Comentarios sobre la empresa",
        column_type: "long_text"
    },

    // ACTIONS
    quickbooks_link: {
        title: "Quickbooks ID",
        description: "Enlace al cliente en quickbooks",
        column_type: "link"
    },
    /* create_quote: {
        title: "Crear Cotizacion",
        description: "Enlace para crear una cotizacion para dicha empresa en quickbooks",
        column_type: "link"
    }, */
    convert_customer: {
        title: "Convertir Contacto",
        description: "Convierte la empresa en un contacto",
        column_type: "button"
    },

    // ITEM HISTORY
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
    
};
