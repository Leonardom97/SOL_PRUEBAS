import api from './api';

export interface DashboardData {
    ok: boolean;
    usuarios: number;
    colaboradores: number;
    capacitaciones_total: number;
    fecha_corte: string | null;
    pesadas_count: number;
    capacitaciones_mes: number;
    evaluaciones_realizadas: number;
    chart_pesadas: { fecha: string; total: number }[];
    chart_productos: { nombre_producto: string; total: number }[];
    chart_evaluaciones_tema: { tema: string; total: number }[];
    capacitaciones_recientes: { nombre: string; fecha: string; asistentes: number }[];
    agronomia_recientes?: { nombre: string; fecha: string; asistentes: number }[]; // Check if API provides this
}

export const dashboardService = {
    getDashboardStats: async (periodCap = 'month', periodPesadasKPI = 'month', periodPesadasChart = 'month') => {
        try {
            const response = await api.get(`/php/panel.php?period_capacitaciones=${periodCap}&period_pesadas_kpi=${periodPesadasKPI}&period_pesadas_chart=${periodPesadasChart}`);
            return response.data as DashboardData;
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            throw error;
        }
    }
};
