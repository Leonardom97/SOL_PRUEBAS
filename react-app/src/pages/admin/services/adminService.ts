import api from '../../../services/api';

export interface Usuario {
    id: number;
    cedula: string;
    nombre1: string;
    nombre2?: string;
    apellido1: string;
    apellido2?: string;
    email?: string;
    roles?: string; // Comma separated string from API
    estado_us: '1' | '0'; // API uses '1' or '0'
    last_login?: string;
}

export interface Colaborador {
    id: number;
    cedula: string;
    nombres: string;
    apellidos: string;
    empresa: string;
    cargo: string;
    area: string;
    sub_area: string;
    telefono?: string;
    email?: string;
    estado: 'a' | 'i';
}

export const adminService = {
    // --- Usuarios ---
    getUsuarios: async () => {
        try {
            const response = await api.get('/m_admin/php/usuarios_api.php?action=listar');
            return response.data;
        } catch (error) {
            console.error('Error fetching usuarios:', error);
            throw error;
        }
    },

    saveUsuario: async (payload: Partial<Usuario> & { tipo?: string }) => {
        const url = '/m_admin/php/usuarios_api.php';
        // Payload typically includes action: 'crear' or 'editar'
        // But let's check legacy code. Ideally we pass basic fields.
        const response = await api.post(url, payload);
        return response.data;
    },

    deleteUsuario: async (id: number) => {
        const response = await api.post('/m_admin/php/usuarios_api.php', { action: 'eliminar', id });
        return response.data;
    },

    toggleUsuarioStatus: async (id: number, nuevoEstado: 'a' | 'i') => {
        const response = await api.post('/m_admin/php/usuarios_api.php', { action: 'cambiar_estado', id, estado: nuevoEstado });
        return response.data;
    },

    resetPassword: async (id: number) => {
        const response = await api.post('/m_admin/php/usuarios_api.php', { action: 'reset_password', id });
        return response.data;
    },

    // --- Colaboradores ---
    getColaboradores: async () => {
        try {
            const response = await api.get('/m_admin/php/colaboradores_api.php?action=listar');
            return response.data;
        } catch (error) {
            console.error('Error fetching colaboradores:', error);
            throw error;
        }
    },

    saveColaborador: async (payload: Partial<Colaborador>) => {
        const response = await api.post('/m_admin/php/colaboradores_api.php', payload);
        return response.data;
    },

    deleteColaborador: async (id: number) => {
        const response = await api.post('/m_admin/php/colaboradores_api.php', { action: 'eliminar', id });
        return response.data;
    },

    // --- Roles ---
    getRoles: async () => {
        // Hardcoded based on project knowledge or fetch from API if exists
        return ['Administrador', 'Usuario', 'Consultor', 'Capacitador', 'Porteria', 'Laboratorio', 'Logistica'];
    }
};
