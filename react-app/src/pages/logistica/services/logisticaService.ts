import api from '../../../services/api';
import type { ProgramacionItem, Finca, Acopio, Cajon, Vehiculo, Conductor, Viaje, SaveProgramacionPayload, SaveRemisionPayload } from '../types';

const LOGISTICA_API = 'm_logistica/assets/php/programacion_api.php';
const REMISION_API = 'm_logistica/assets/php/remision_api.php';
const PORTERIA_API = 'm_porteria/assets/php/porteria_api.php';

export const logisticaService = {
    // --- Programación ---

    getProgramacion: async (semana: string): Promise<ProgramacionItem[]> => {
        try {
            const response = await api.get(`${LOGISTICA_API}?action=get_programacion&semana=${semana}`);
            return response.data.data;
        } catch (error) {
            console.error('Error fetching programacion:', error);
            throw error;
        }
    },

    getMasterData: async (): Promise<{ fincas: Finca[], acopios: Acopio[], cajones: Cajon[] }> => {
        try {
            const response = await api.get(`${LOGISTICA_API}?action=get_master_data`);
            return response.data.data;
        } catch (error) {
            console.error('Error fetching master data:', error);
            throw error;
        }
    },

    saveProgramacion: async (data: SaveProgramacionPayload): Promise<{ status: string; message?: string }> => {
        try {
            const response = await api.post(`${LOGISTICA_API}?action=save_programacion`, data);
            return response.data;
        } catch (error) {
            console.error('Error saving programacion:', error);
            throw error;
        }
    },

    // --- Viajes ---

    getViajes: async (programacionId: string): Promise<Viaje[]> => {
        try {
            const response = await api.get(`${LOGISTICA_API}?action=get_viajes&programacion_id=${programacionId}`);
            return response.data.data;
        } catch (error) {
            console.error('Error fetching viajes:', error);
            throw error;
        }
    },

    getVehiculosDisponibles: async (): Promise<Vehiculo[]> => {
        try {
            const response = await api.get(`${PORTERIA_API}?action=get_vehiculos`);
            // Filter as per legacy JS: en_planta and activo
            // However, legacy JS filtered on client side.
            return response.data.data.filter((v: Vehiculo) => v.ubicacion_actual === 'en_planta' && v.estado_vehiculo === 'activo');
        } catch (error) {
            console.error('Error fetching vehiculos:', error);
            throw error;
        }
    },

    getConductoresDisponibles: async (): Promise<Conductor[]> => {
        try {
            const response = await api.get(`${PORTERIA_API}?action=get_conductores`);
            return response.data.data.filter((c: Conductor) => c.estado_conductor === 'activo');
        } catch (error) {
            console.error('Error fetching conductores:', error);
            throw error;
        }
    },

    saveViaje: async (programacionId: string, vehiculoId: string, conductorId: string): Promise<any> => {
        try {
            const response = await api.post(`${LOGISTICA_API}?action=save_viaje`, {
                programacion_id: programacionId,
                vehiculo_id: vehiculoId,
                conductor_id: conductorId
            });
            return response.data;
        } catch (error) {
            console.error('Error assigning viaje:', error);
            throw error;
        }
    },

    // --- Remisíon ---

    getViajesActivos: async (): Promise<any[]> => {
        try {
            const response = await api.get(`${REMISION_API}?action=get_viajes_activos`);
            return response.data.data;
        } catch (error) {
            console.error('Error creating remission:', error);
            throw error;
        }
    },

    saveRemision: async (data: SaveRemisionPayload): Promise<any> => {
        try {
            const response = await api.post(`${REMISION_API}?action=save_remision`, data);
            return response.data;
        } catch (error) {
            console.error('Error saving remission:', error);
            throw error;
        }
    }
};
