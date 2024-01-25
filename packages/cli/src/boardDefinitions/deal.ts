export default {
     // ID INFO
     name: {
        title: "Deal",
        description: "Una descripcion corta del deal, puede ser algo como el nombre del cliente y lo que se le esta cotizando",
        column_type: "text"
    },
    item_id: {
        title: "ID",
        description: "id del deal en monday",
        column_type: "item_id"
    }, //hidden
    
    // DEAL CONTENT
    deal_status: {
        title: "Estado",
        description: "Estado del deal",
        column_type: "status",
        labels: {
            1: "success",
            2: "rejected",
            3: "negotiation",
            4: "quote_generated",
            5: "discovery" //default
        }
    },
    priority: {
        title: "Prioridad",
        description: "Nivel de prioridad del deal",
        column_type: "status",
        labels: {
            2: "executive",
            3: "high",
            4: "medium",
            5: "low" //default
        }
    },
    deal_value: {
        title: "Valor del Deal",
        description: "Valor monetario del deal",
        column_type: "numbers"
    },
    comments: {
        title: "Comentarios",
        description: "Comentarios sobre el deal",
        column_type: "text"
    },
    start_date: {
        title: "Fecha de inicio",
        description: "Fecha en que inició el deal",
        column_type: "date"
    },
    estimated_close_date: {
        title: "Fecha estimada de cierre",
        description: "Fecha estimada de cierre del deal",
        column_type: "date"
    },
    close_date: {
        title: "Fecha de cierre",
        description: "Fecha en que se cerró el deal",
        column_type: "date"
    },
    source: {
        title: "Fuente",
        description: "Fuente del deal",
        column_type: "status",
        labels: {
            1: "manual",
            2: "quickbooks",
            3: "ecommerce"
        }
    },
    brands: {
        title: "Marcas",
        description: "Marcas que se incluyen en el deal",
        column_type: "dropdown",
        labels: {
            1: "ergonomica",
            2: "naural"
        }
    },

    // ANALYSIS
    total_time: {
        title: "Tiempo total",
        description: "Tiempo total de cierre, desde que se crea un deal hasta que se cierra o se rechaza",
        column_type: "time_tracking"
    },
    quote_time: {
        title: "Tiempo de confirmación de cotización",
        description: "Tiempo que tarda un deal en pasar de quote_sent a cerrado o negociación",
        column_type: "time_tracking"
    },
    negotiation_time: {
        title: "Tiempo de negociación",
        description: "Tiempo promedio que un deal pasa en estado de negociación",
        column_type: "time_tracking"
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
    // deal also contains a mirror column to estimate_status
    // BOARD CONNECTIONS
    link_to_empresas: {
        title: "Empresa",
        description: "Many-to-One relation entre deal y empresa. Empresa asociada al deal",
        column_type: "board_relation"
    },
    link_to_contactos: {
        title: "Contactos",
        description: "Many-to-Many relation entre deal y contacto. Contactos relacionados con el deal",
        column_type: "board_relation"
    },
    board_relation: {
        title: "Cotizaciones",
        description: "One-to-Many relation entre deal y cotizacion. Cotizaciones asociadas al deal",
        column_type: "board_relation"
    },
    link_to_facturas: {
        title: "Facturas",
        description: "One-to-Many relation entre deal y factura. Facturas relacionadas con el deal",
        column_type: "board_relation"
    },

    // MIRROR
    mirror5: {
        title: "Cotizacion Status Mirror",
        description: "Status de la cotizacion",
        column_type: 'mirror'
    },
};