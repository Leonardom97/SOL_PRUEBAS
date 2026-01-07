import api from '../../../services/api';
import type {
    SaveHumedadPayload,
    SaveYodoPayload,
    SaveBombeoPayload,
    SaveDespachoPayload,
    Tanque,
    Variedad,
    RegistroDiario,
    SaveRegistroPayload,
    MedicionCalculoPayload,
    CierreDiaPayload,
    LugarMuestreo,
    Secador,
    Colaborador,
    SaveAcidezPayload
} from '../types';

const LAB_API = 'm_laboratorio/assets/php/laboratorio_api.php';

export const laboratorioService = {
    // --- Tanques ---
    getTanques: async (): Promise<Tanque[]> => {
        try {
            const response = await api.get(`${LAB_API}?action=get_tanques`);
            return response.data;
        } catch (error) {
            console.error('Error fetching tanques:', error);
            throw error;
        }
    },

    saveTanque: async (data: Partial<Tanque>): Promise<{ success: boolean; message?: string; error?: string }> => {
        try {
            const response = await api.post(`${LAB_API}?action=save_tanque`, data);
            return response.data;
        } catch (error) {
            console.error('Error saving tanque:', error);
            throw error;
        }
    },

    getVariedades: async (): Promise<Variedad[]> => {
        try {
            const response = await api.get(`${LAB_API}?action=get_variedades`);
            return response.data;
        } catch (error) {
            console.error('Error fetching variedades:', error);
            throw error;
        }
    },

    getRegistrosHoy: async (fecha: string): Promise<RegistroDiario[]> => {
        try {
            const response = await api.get(`${LAB_API}?action=get_registros_hoy&fecha=${fecha}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching registros diario:', error);
            throw error;
        }
    },

    getRegistrosHistorico: async (id_tanque: string | number, fecha_desde: string, fecha_hasta: string): Promise<RegistroDiario[]> => {
        try {
            const response = await api.get(
                `${LAB_API}?action=get_registros_diarios&id_tanque=${id_tanque}&fecha_desde=${fecha_desde}&fecha_hasta=${fecha_hasta}`
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching historico:', error);
            throw error;
        }
    },

    getInventarioAnterior: async (id_tanque: string, fecha: string): Promise<{ inventario_final: string }> => {
        try {
            const response = await api.get(`${LAB_API}?action=get_inventario_anterior&id_tanque=${id_tanque}&fecha=${fecha}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching previous inventory:', error);
            return { inventario_final: '0' };
        }
    },

    saveRegistroDiario: async (data: SaveRegistroPayload): Promise<{ success: boolean; message?: string; error?: string }> => {
        try {
            const response = await api.post(`${LAB_API}?action=save_registro_diario`, data);
            return response.data;
        } catch (error) {
            console.error('Error saving registro diario:', error);
            throw error;
        }
    },

    saveMedicionCalculo: async (data: MedicionCalculoPayload): Promise<{ success: boolean; error?: string }> => {
        try {
            const response = await api.post(`${LAB_API}?action=save_medicion_calculo`, data);
            return response.data;
        } catch (error) {
            console.error('Error saving measurement calculation:', error);
            throw error;
        }
    },

    cerrarRegistroDiario: async (data: CierreDiaPayload): Promise<{ success: boolean; error?: string }> => {
        try {
            const response = await api.post(`${LAB_API}?action=cerrar_registro_diario`, data);
            return response.data;
        } catch (error) {
            console.error('Error closing daily record:', error);
            throw error;
        }
    },

    // --- Calidad ---
    getLugaresMuestreo: async (): Promise<LugarMuestreo[]> => {
        try {
            const response = await api.get(`${LAB_API}?action=get_lugares_muestreo`);
            return response.data;
        } catch (error) {
            console.error('Error fetching lugares muestreo:', error);
            throw error;
        }
    },

    getSecadores: async (): Promise<Secador[]> => {
        try {
            const response = await api.get(`${LAB_API}?action=get_secadores`);
            return response.data;
        } catch (error) {
            console.error('Error fetching secadores:', error);
            throw error;
        }
    },

    getColaborador: async (cedula: string): Promise<Colaborador | null> => {
        try {
            const response = await api.get(`${LAB_API}?action=get_colaborador&cedula=${cedula}`);
            if (response.data && response.data.ac_id) {
                return response.data;
            }
            return null;
        } catch (error) {
            console.error('Error searching collaborator:', error);
            return null;
        }
    },

    saveMedicionAcidez: async (data: SaveAcidezPayload): Promise<{ success: boolean; id?: string; error?: string }> => {
        try {
            const response = await api.post(`${LAB_API}?action=save_medicion_acidez`, data);
            return response.data;
        } catch (error) {
            console.error('Error saving acidez:', error);
            throw error;
        }
    },

    saveMedicionHumedad: async (data: SaveHumedadPayload): Promise<{ success: boolean; id?: string; error?: string }> => {
        try {
            const response = await api.post(`${LAB_API}?action=save_medicion_humedad`, data);
            return response.data;
        } catch (error) {
            console.error('Error saving humedad:', error);
            throw error;
        }
    },

    saveMedicionYodo: async (data: SaveYodoPayload): Promise<{ success: boolean; id?: string; error?: string }> => {
        try {
            const response = await api.post(`${LAB_API}?action=save_medicion_yodo`, data);
            return response.data;
        } catch (error) {
            console.error('Error saving yodo:', error);
            throw error;
        }
    },

    saveMedicionBombeo: async (data: SaveBombeoPayload): Promise<{ success: boolean; id?: string; error?: string }> => {
        try {
            const response = await api.post(`${LAB_API}?action=save_medicion_bombeo`, data);
            return response.data;
        } catch (error) {
            console.error('Error saving bombeo:', error);
            throw error;
        }
    },

    saveMedicionDespacho: async (data: SaveDespachoPayload): Promise<{ success: boolean; id?: string; error?: string }> => {
        try {
            const response = await api.post(`${LAB_API}?action=save_medicion_despacho`, data);
            return response.data;
        } catch (error) {
            console.error('Error saving despacho:', error);
            throw error;
        }
    },

    getAllMediciones: async (params: {
        id_tanque?: string;
        fecha_desde?: string;
        fecha_hasta?: string;
        tipo?: string;
        tipo_origen?: string
    }) => {
        try {
            const query = new URLSearchParams(params as any).toString();
            const response = await api.get(`${LAB_API}?action=get_all_mediciones&${query}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching all mediciones:', error);
            throw error;
        }
    }
};
