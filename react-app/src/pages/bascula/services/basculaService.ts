import api from '../../../services/api';

export interface CatalogoItem {
    codigo: string | number;
    nombre: string;
}

export interface Pesada {
    codigo: string;
    placa: string;
    conductor: string;
    producto: string;
    peso_bruto: string | number;
    peso_tara: string | number;
    peso_neto: string | number;
    fecha_entrada: string;
    fecha_salida?: string;
    estado: 'Activo' | 'Cerrado' | 'Anulado';
    Estado?: 'Activo' | 'Cerrado' | 'Anulado'; // Legacy API sometimes returns capitalized
}

export interface WeighingData {
    weight: number;
    stable: boolean;
}

export const basculaService = {
    // Scale Operations
    readWeight: async (): Promise<WeighingData> => {
        const response = await api.get('/m_bascula/assets/php/escala_api.php?action=leer_peso');
        if (response.data.success) {
            return {
                weight: parseFloat(response.data.weight),
                stable: response.data.stable
            };
        }
        throw new Error(response.data.error || 'Error reading weight');
    },

    tareScale: async () => {
        const response = await api.post('/m_bascula/assets/php/escala_api.php?action=tara');
        if (!response.data.success) {
            throw new Error(response.data.error || 'Error taring scale');
        }
        return response.data;
    },

    testConnection: async () => {
        const response = await api.get('/m_bascula/assets/php/escala_api.php?action=test');
        return response.data;
    },

    // Catalogs
    getTransacciones: async () => {
        const response = await api.get('/m_bascula/assets/php/config_api.php?action=transacciones');
        return response.data.data as CatalogoItem[];
    },

    getProductos: async () => {
        const response = await api.get('/m_bascula/assets/php/config_api.php?action=productos_select');
        return response.data.data as CatalogoItem[];
    },

    getDocOrigen: async () => {
        const response = await api.get('/m_bascula/assets/php/config_api.php?action=doc_origen');
        return response.data.data as CatalogoItem[];
    },

    getSiembras: async () => {
        const response = await api.get('/m_bascula/assets/php/config_api.php?action=siembras');
        return response.data.data as CatalogoItem[];
    },

    getProcedencia: async (condicion: string) => {
        const response = await api.get(`/m_bascula/assets/php/config_api.php?action=procedencia&condicion=${condicion}`);
        return response.data.data as CatalogoItem[];
    },

    getPlacasByProcedencia: async (condicion: string) => {
        const response = await api.get(`/m_bascula/assets/php/vehiculos_api.php?action=placas&condicion=${condicion}`);
        return response.data.data as CatalogoItem[]; // Returns {codigo: placa, nombre: placa} usually
    },

    getVehiculoInfo: async (placa: string) => {
        const response = await api.get(`/m_bascula/assets/php/vehiculos_api.php?action=info_completa&placa=${placa}`);
        return response.data.data;
    },

    getDocumentNumber: async (transaccion: string, procedencia: string, siembra: string) => {
        const response = await api.get(`/m_bascula/assets/php/config_api.php?action=num_documento&transaccion=${transaccion}&procedencia=${procedencia}&siembra=${siembra}`);
        return response.data.num_documento;
    },

    // Weighing Operations
    createEntrada: async (data: any) => {
        const response = await api.post('/m_bascula/assets/php/pesadas_api.php?action=insertar', data);
        if (!response.data.success) {
            throw new Error(response.data.error || 'Error creating entry');
        }
        return response.data;
    },

    searchByPlaca: async (placa: string) => {
        const response = await api.get(`/m_bascula/assets/php/pesadas_api.php?action=por_placa&placa=${placa}`);
        if (!response.data.success) {
            throw new Error(response.data.error || 'Error searching vehicle');
        }
        return response.data.data;
    },

    createSalida: async (data: any) => {
        const response = await api.post('/m_bascula/assets/php/pesadas_api.php?action=actualizar_salida', data);
        if (!response.data.success) {
            throw new Error(response.data.error || 'Error creating exit');
        }
        return response.data;
    },

    getRecentWeighings: async () => {
        const response = await api.get('/m_bascula/assets/php/pesadas_api.php?action=listar');
        return response.data.data as Pesada[];
    },

    getReports: async (startDate: string, endDate: string) => {
        const response = await api.get(`/m_bascula/assets/php/pesadas_api.php?action=detallado&fecha_inicio=${startDate}&fecha_fin=${endDate}`);
        if (!response.data.success) {
            // Some legacy APIs return success: false with empty data if no results
            return [];
        }
        return response.data.data;
    }
};
