import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import * as XLSX from 'xlsx';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import {
    FileSpreadsheet,
    Users,
    GraduationCap,
    Clock,
    AlertCircle,
    CheckCircle,
    Filter,
    X
} from 'lucide-react';

// Interfaces based on dashboard.js data
interface DashboardData {
    ac_id: string;
    ac_cedula: string;
    nombre_completo: string;
    cargo_nombre: string;
    sub_area_nombre?: string;
    tema_nombre: string;
    estado: 'al_dia' | 'proximo_vencer' | 'pendiente' | 'vencida';
    situacion?: string;
    ultima_capacitacion?: string;
    proxima_capacitacion?: string;
    dias_restantes?: number | string; // API might return "string" or number
    rol_capacitador_nombre: string;
    frecuencia_meses: number;
    id_tema: number;
    ac_id_cargo: number;
    ac_sub_area: string;
    id_rol_capacitador: number;
}

interface FilterOption {
    id: string | number;
    name: string;
}

const CapacitacionesDashboard = () => {
    // State
    const [data, setData] = useState<DashboardData[]>([]);
    const [filteredData, setFilteredData] = useState<DashboardData[]>([]);
    const [loading, setLoading] = useState(true);

    // Stats
    const [stats, setStats] = useState({
        totalPersonas: 0,
        alDia: 0,
        pendientes: 0,
        vencidas: 0,
        realizadas: 0,
        asistentes: 0,
        pendientesEval: 0
    });

    const [chartData, setChartData] = useState<{ tema: string, total: number }[]>([]);

    // Filters State
    const [filters, setFilters] = useState({
        cargos: [] as FilterOption[],
        subAreas: [] as FilterOption[],
        temas: [] as FilterOption[],
        roles: [] as FilterOption[]
    });

    const [activeFilters, setActiveFilters] = useState({
        estado: '',
        situacion: '',
        cargo: '',
        subArea: '',
        tema: '',
        rol: '',
        fechaDesde: '',
        fechaHasta: ''
    });

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [mallaRes, filtersRes, statsRes] = await Promise.all([
                api.get('/m_capacitaciones/assets/php/malla_api.php?action=get_malla'),
                api.get('/m_capacitaciones/assets/php/malla_api.php?action=get_filters'),
                api.get('/m_capacitaciones/assets/php/malla_api.php?action=get_evaluation_dashboard_stats')
            ]);

            if (mallaRes.data.success) {
                const mappedData = mallaRes.data.data as DashboardData[];
                setData(mappedData);
                setFilteredData(mappedData);
                calculateLocalStats(mappedData);
            }

            if (filtersRes.data.success) {
                setFilters({
                    cargos: filtersRes.data.data.cargos.map((c: { id: number; cargo: string }) => ({ id: c.id, name: c.cargo })),
                    subAreas: filtersRes.data.data.sub_areas.map((s: { id_area: string; sub_area: string }) => ({ id: s.id_area, name: s.sub_area })),
                    temas: filtersRes.data.data.temas.map((t: { id: number; nombre: string }) => ({ id: t.id, name: t.nombre })),
                    roles: filtersRes.data.data.roles.map((r: { id: number; nombre: string }) => ({ id: r.id, name: r.nombre }))
                });
            }

            if (statsRes.data.success) {
                // Update eval specific stats
                setStats(prev => ({
                    ...prev,
                    realizadas: statsRes.data.cards.realizadas,
                    asistentes: statsRes.data.cards.asistentes,
                    pendientesEval: statsRes.data.cards.pendientes
                }));
                setChartData(statsRes.data.chartData);
            }

        } catch (error) {
            console.error("Error loading dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    const calculateLocalStats = (currentData: DashboardData[]) => {
        const uniqueEmployees = new Set(currentData.map(d => d.ac_id)).size;
        const alDia = currentData.filter(d => d.estado === 'al_dia').length;
        const pendientes = currentData.filter(d => ['pendiente', 'proximo_vencer'].includes(d.estado)).length;
        const vencidas = currentData.filter(d => d.estado === 'vencida').length;

        setStats(prev => ({
            ...prev,
            totalPersonas: uniqueEmployees,
            alDia,
            pendientes,
            vencidas
        }));
    };

    // Filter Logic
    useEffect(() => {
        let res = [...data];

        if (activeFilters.estado) res = res.filter(d => d.estado === activeFilters.estado);
        if (activeFilters.situacion) res = res.filter(d => d.situacion === activeFilters.situacion);
        if (activeFilters.cargo) res = res.filter(d => d.ac_id_cargo == Number(activeFilters.cargo));
        if (activeFilters.subArea) res = res.filter(d => d.ac_sub_area == activeFilters.subArea);
        if (activeFilters.tema) res = res.filter(d => d.id_tema == Number(activeFilters.tema));
        if (activeFilters.rol) res = res.filter(d => d.id_rol_capacitador == Number(activeFilters.rol));

        if (activeFilters.fechaDesde || activeFilters.fechaHasta) {
            res = res.filter(d => {
                if (!d.ultima_capacitacion) return false;
                const date = new Date(d.ultima_capacitacion);
                let valid = true;
                if (activeFilters.fechaDesde && date < new Date(activeFilters.fechaDesde)) valid = false;
                // Set end date to end of day
                if (activeFilters.fechaHasta) {
                    const endDate = new Date(activeFilters.fechaHasta);
                    endDate.setHours(23, 59, 59);
                    if (date > endDate) valid = false;
                }
                return valid;
            });
        }

        setFilteredData(res);
        setCurrentPage(1);
    }, [activeFilters, data]);

    const handleFilterChange = (key: string, value: string) => {
        setActiveFilters(prev => ({ ...prev, [key]: value }));
    };

    const clearFilters = () => {
        setActiveFilters({
            estado: '', situacion: '', cargo: '', subArea: '', tema: '', rol: '', fechaDesde: '', fechaHasta: ''
        });
    };

    // Pagination Logic
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Export Logic
    const exportExcel = (type: 'detailed' | 'summary') => {
        if (filteredData.length === 0) return;

        if (type === 'detailed') {
            const ws = XLSX.utils.json_to_sheet(filteredData.map(d => ({
                'Estado': d.estado,
                'Colaborador': d.nombre_completo,
                'Cargo': d.cargo_nombre,
                'Tema': d.tema_nombre,
                'Última Cap.': d.ultima_capacitacion,
                'Próxima Cap.': d.proxima_capacitacion
            })));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Detalle");
            XLSX.writeFile(wb, "Capacitaciones_Detalle.xlsx");
        } else {
            // Summary logic (simplified for React)
            // Group by employee
            const summary: any = {};
            filteredData.forEach(d => {
                if (!summary[d.ac_id]) {
                    summary[d.ac_id] = {
                        Nombre: d.nombre_completo,
                        Cargo: d.cargo_nombre,
                        Total: 0, AlDia: 0, Pendiente: 0
                    };
                }
                summary[d.ac_id].Total++;
                if (d.estado === 'al_dia') summary[d.ac_id].AlDia++;
                else summary[d.ac_id].Pendiente++;
            });
            const ws = XLSX.utils.json_to_sheet(Object.values(summary));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Resumen");
            XLSX.writeFile(wb, "Capacitaciones_Resumen.xlsx");
        }
    };

    const getStatusBadge = (estado: string) => {
        const classes = {
            al_dia: 'bg-green-100 text-green-800',
            proximo_vencer: 'bg-yellow-100 text-yellow-800',
            pendiente: 'bg-gray-100 text-gray-800',
            vencida: 'bg-red-100 text-red-800'
        };
        const labels = {
            al_dia: 'Al Día',
            proximo_vencer: 'Próximo a Vencer',
            pendiente: 'Pendiente',
            vencida: 'Vencida'
        };
        // @ts-ignore
        return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${classes[estado] || classes.pendiente}`}>{labels[estado] || estado}</span>;
    };

    return (
        <div className="space-y-6 animate-fade-in-up pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Dashboard de Capacitaciones</h2>
                    <p className="text-gray-500 text-sm">Visión general del estado de formación</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => exportExcel('summary')} className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition">
                        <FileSpreadsheet size={18} /> Resumen
                    </button>
                    <button onClick={() => exportExcel('detailed')} className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition">
                        <FileSpreadsheet size={18} /> Detallado
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Personas" value={stats.totalPersonas} icon={<Users size={24} />} color="blue" />
                <StatCard title="Capacitados (Al Día)" value={stats.alDia} icon={<GraduationCap size={24} />} color="green" />
                <StatCard title="Pendientes" value={stats.pendientes} icon={<Clock size={24} />} color="yellow" />
                <StatCard title="Vencidas" value={stats.vencidas} icon={<AlertCircle size={24} />} color="red" />
            </div>

            {/* Eval Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Evaluaciones Realizadas" value={stats.realizadas} icon={<CheckCircle size={20} />} color="green" isSmall />
                <StatCard title="Asistentes c/ Eval" value={stats.asistentes} icon={<Users size={20} />} color="indigo" isSmall />
                <StatCard title="Evals Pendientes" value={stats.pendientesEval} icon={<Clock size={20} />} color="orange" isSmall />
            </div>

            {/* Chart Section */}
            {chartData.length > 0 && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-80">
                    <h3 className="font-semibold text-gray-700 mb-4">Evaluaciones Programadas por Tema</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="tema" hide />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-2 mb-4 text-gray-700 font-medium">
                    <Filter size={18} /> Filtros
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <select className="form-select" value={activeFilters.estado} onChange={e => handleFilterChange('estado', e.target.value)}>
                        <option value="">Estado: Todos</option>
                        <option value="al_dia">Al Día</option>
                        <option value="proximo_vencer">Próximo a Vencer</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="vencida">Vencida</option>
                    </select>
                    <select className="form-select" value={activeFilters.cargo} onChange={e => handleFilterChange('cargo', e.target.value)}>
                        <option value="">Cargo: Todos</option>
                        {filters.cargos.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select className="form-select" value={activeFilters.tema} onChange={e => handleFilterChange('tema', e.target.value)}>
                        <option value="">Tema: Todos</option>
                        {filters.temas.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <button onClick={clearFilters} className="text-red-500 text-sm hover:underline flex items-center gap-1">
                        <X size={16} /> Limpiar Filtros
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="bg-gray-50 text-gray-700 uppercase font-medium">
                            <tr>
                                <th className="px-4 py-3">Estado</th>
                                <th className="px-4 py-3">Colaborador</th>
                                <th className="px-4 py-3">Cargo</th>
                                <th className="px-4 py-3">Tema</th>
                                <th className="px-4 py-3">Última Cap.</th>
                                <th className="px-4 py-3">Días Restantes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={6} className="text-center py-8">Cargando datos...</td></tr>
                            ) : paginatedData.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-8">No hay registros encontrados.</td></tr>
                            ) : (
                                paginatedData.map((row, idx) => (
                                    <tr key={`${row.ac_id}-${row.id_tema}-${idx}`} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">{getStatusBadge(row.estado)}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900">
                                            {row.nombre_completo}
                                            <div className="text-xs text-gray-400">{row.ac_cedula}</div>
                                        </td>
                                        <td className="px-4 py-3">{row.cargo_nombre}</td>
                                        <td className="px-4 py-3">{row.tema_nombre}</td>
                                        <td className="px-4 py-3">{row.ultima_capacitacion ? new Date(row.ultima_capacitacion).toLocaleDateString() : '-'}</td>
                                        <td className="px-4 py-3 font-semibold">
                                            {row.dias_restantes !== null ?
                                                <span className={Number(row.dias_restantes) < 0 ? 'text-red-600' : 'text-gray-600'}>
                                                    {row.dias_restantes} días
                                                </span>
                                                : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex justify-between items-center p-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredData.length)} de {filteredData.length}</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                            className="text-sm border rounded p-1"
                        >
                            <option value="10">10</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                        </select>
                    </div>
                    <div className="flex gap-1">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                        >Ant</button>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                        >Sig</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper Component for Stats
interface StatCardProps {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    color: 'blue' | 'green' | 'yellow' | 'red' | 'indigo' | 'orange';
    isSmall?: boolean;
}

const StatCard = ({ title, value, icon, color, isSmall }: StatCardProps) => {
    const colorClasses: Record<string, string> = {
        blue: 'border-l-4 border-blue-500 text-blue-500',
        green: 'border-l-4 border-green-500 text-green-500',
        yellow: 'border-l-4 border-yellow-500 text-yellow-500',
        red: 'border-l-4 border-red-500 text-red-500',
        indigo: 'border-l-4 border-indigo-500 text-indigo-500',
        orange: 'border-l-4 border-orange-500 text-orange-500',
    };

    return (
        <div className={`bg-white rounded-lg shadow-sm p-4 ${colorClasses[color] || ''} flex items-center justify-between`}>
            <div>
                <div className={`font-bold text-gray-500 uppercase ${isSmall ? 'text-xs' : 'text-xs'}`}>{title}</div>
                <div className={`${isSmall ? 'text-xl' : 'text-2xl'} font-bold text-gray-800`}>{value}</div>
            </div>
            <div className="opacity-80">{icon}</div>
        </div>
    );
};

export default CapacitacionesDashboard;
