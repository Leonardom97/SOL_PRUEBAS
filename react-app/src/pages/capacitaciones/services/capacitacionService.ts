import api from '../../../services/api';

export interface ConsultaCapacitacion {
    id: number;
    capacitador: string;
    cedula: string;
    tema: string;
    lugar: string;
    actividad: string;
    proceso: string;
    fecha: string;
    hora_inicio?: string;
    hora_final?: string;
    duracion_total?: string;
    observaciones?: string;
    total_asistentes: number;
    aprobados?: number;
    no_aprobados?: number;
    creado_por_nombre: string;
    editado_por_nombre: string;
}

export interface ConsultaPorPersona {
    id: number;
    cedula: string;
    nombres_apellidos: string;
    cargo: string;
    sub_area: string;
    capacitaciones_realizadas: number;
    capacitaciones_pendientes: number;
    total_esperadas: number;
    evaluaciones_realizadas: number;
    evaluaciones_asignadas: number;
}


interface CatalogItem {
    id: number | string;
    nombre: string;
    activo: boolean | number;
}



export const capacitacionService = {
    // --- Master Data (Config) ---
    getMasterData: async (): Promise<{ temas: any[], procesos: any[], lugares: any[], tipos: any[] }> => {
        try {
            const [temas, procesos, lugares, tipos] = await Promise.all([
                api.get('/m_capacitaciones/assets/php/cap_control_api.php?action=list_temas'),
                api.get('/m_capacitaciones/assets/php/cap_control_api.php?action=list_procesos'),
                api.get('/m_capacitaciones/assets/php/cap_control_api.php?action=list_lugares'),
                api.get('/m_capacitaciones/assets/php/cap_control_api.php?action=list_tactividad')
            ]);
            return {
                temas: temas.data.temas || [],
                procesos: procesos.data.procesos || [],
                lugares: lugares.data.lugares || [],
                tipos: tipos.data.tactividad || []
            };
        } catch (error) {
            console.error('Error fetching master data', error);
            throw error;
        }
    },

    saveMasterData: async (type: 'tema' | 'proceso' | 'lugar' | 'tactividad', action: 'add' | 'update' | 'activar' | 'inactivar', data: Partial<CatalogItem>) => {
        const tableMap: any = { tema: 'cap_tema', proceso: 'cap_proceso', lugar: 'cap_lugar', tactividad: 'cap_tipo_actividad' };
        const payload = {
            action,
            table: tableMap[type],
            ...data
        };
        // Use items_formulario.php for all these operations based on legacy items_formularios.js
        const response = await api.post('/m_capacitaciones/assets/php/items_formulario.php', payload);
        return response.data;
    },

    // --- Sesiones (Formularios) ---
    getSesiones: async (page = 1, limit = 10, search = '') => {
        const response = await api.get(`/m_capacitaciones/assets/php/ed_formulario_api.php?action=listar&limit=${limit}&page=${page}&search=${search}`);
        return response.data;
    },

    getSesionById: async (id: string) => {
        const response = await api.get(`/m_capacitaciones/assets/php/ed_formulario_api.php?action=leer_formulario&id=${id}`);
        return response.data;
    },

    saveSesion: async (data: any) => {
        // action=save_formulario for create, update_formulario for edit
        const action = data.id ? 'actualizar_formulario' : 'save_formulario';
        const response = await api.post(data.id ? '/m_capacitaciones/assets/php/ed_formulario_api.php' : '/m_capacitaciones/assets/php/formulario_api.php', {
            action,
            ...data
        });
        return response.data;
    },

    deleteSesion: async (id: string) => {
        const response = await api.post('/m_capacitaciones/assets/php/ed_formulario_api.php', { action: 'eliminar', id });
        return response.data;
    },

    // --- Asistentes ---
    addAsistente: async (idFormulario: string, cedula: string, estado: string) => {
        const response = await api.post('/m_capacitaciones/assets/php/ed_formulario_api.php', {
            action: 'agregar_asistente',
            id_formulario: idFormulario,
            cedula,
            estado_aprobacion: estado
        });
        return response.data;
    },

    removeAsistente: async (idAsistente: string) => {
        const response = await api.post('/m_capacitaciones/assets/php/ed_formulario_api.php', {
            action: 'eliminar_asistente',
            id: idAsistente
        });
        return response.data;
    },

    searchColaborador: async (cedula: string) => {
        const response = await api.get(`/m_capacitaciones/assets/php/formulario_api.php?action=get_colaborador&cedula=${cedula}`);
        return response.data;
    },

    // --- Evaluaciones (Builder) ---
    getEvaluacionStructure: async (idFormulario: string) => {
        const response = await api.get(`/m_capacitaciones/assets/php/evaluacion_api.php?action=get_structure&id_formulario=${idFormulario}`);
        return response.data;
    },

    saveEvaluacionStructure: async (payload: { id_formulario: string; titulo: string; instrucciones: string; multimedia: any; preguntas: any[] }) => {
        const response = await api.post('/m_capacitaciones/assets/php/evaluacion_api.php?action=save_structure', payload);
        return response.data;
    },

    uploadMultimedia: async (file: File, previousPath?: string) => {
        const formData = new FormData();
        formData.append('file', file);
        if (previousPath) formData.append('previous_path', previousPath);
        formData.append('action', 'upload_multimedia');

        const response = await api.post('/m_capacitaciones/assets/php/evaluacion_api.php', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    getEvaluacion: async (idHeader: number, idFormulario: number) => {
        const response = await api.get(`/m_capacitaciones/assets/php/evaluacion_api.php?action=get_evaluacion&id_header=${idHeader}&id_formulario=${idFormulario}`);
        return response.data;
    },

    // --- Consultas ---
    getConsultasCapacitacion: async (): Promise<ConsultaCapacitacion[]> => {
        try {
            const response = await api.get('/m_capacitaciones/assets/php/consultas_capacitacion_api.php');
            return response.data;
        } catch (error) {
            console.error('Error fetching consultas capacitacion:', error);
            throw error;
        }
    },

    getConsultasPorPersona: async (): Promise<ConsultaPorPersona[]> => {
        try {
            const response = await api.get('/m_capacitaciones/assets/php/consultas_por_persona_api.php');
            return response.data;
        } catch (error) {
            console.error('Error fetching consultas por persona:', error);
            throw error;
        }
    }
};
