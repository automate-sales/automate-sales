export default {
    // ID INFO
    name: {
        title: "Tarea",
        description: "Nombre de la tarea",
        column_type: "text"
    },
    description: {
        title: "Descripcion",
        description: "Descripcion de la tarea",
        column_type: "long_text"
    },
    item_id: {
        title: "ID",
        description: "id de la tarea en monday",
        column_type: "item_id"
    }, //hidden
    task_status: {
        title: "Status",
        description: "Status de la tarea",
        column_type: 'status',
        labels: {
            1: 'backlog', //default
            2: 'stashed',
            3: 'current_sprint', 
            4: 'in_progress',
            5: 'blocked',
            6: 'done'
        }
    },
    task_type: {
        title: "Tipo",
        description: "Tipo de la tarea",
        column_type: 'status',
        labels: {
            1: 'admin', //default
            2: 'reminder'
        }
    },
    task_area: {
        title: "Area",
        description: "area de la tarea",
        column_type: 'status',
        labels: {
            1: 'general', //default
            2: 'compras',
            3: 'devolucion',
            4: 'contabilidad',
            5: 'marketing',
            6: 'tramites'
        }
    },
    task_priority: {
        title: "Prioridad",
        description: "prioridad de la tarea",
        column_type: 'status',
        labels: {
            1: 'low', //default
            2: 'medium',
            3: 'high'
        }
    },
    due_date: {
        title: "Fecha Entrega",
        description: "Fecha de entrega de la tarea",
        column_type: "date"
    },
    duration: {
        title: "Duracion",
        description: "Tiempo de duracion de la tarea",
        column_type: "time_tracking"
    },
    agent: {
        title: "Encargado",
        description: "Colaborador encargado de la tarea",
        column_type: "people"
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
    } //hidden
};