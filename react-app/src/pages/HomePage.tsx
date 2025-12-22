import React, { useState, useEffect } from 'react';
import { Users, Truck, GraduationCap, Calendar, ClipboardCheck, Package } from 'lucide-react';
import { dashboardService, type DashboardData } from '../services/dashboardService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';

const HomePage = () => {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [periodPesadas, setPeriodPesadas] = useState('month');

    useEffect(() => {
        const loadDashboard = async () => {
            try {
                const stats = await dashboardService.getDashboardStats('month', 'month', periodPesadas);
                // Transform data for charts if necessary
                setData(stats);
            } catch (error) {
                console.error("Dashboard load failed", error);
            } finally {
                setLoading(false);
            }
        };
        loadDashboard();

        // Refresh every minute
        const interval = setInterval(loadDashboard, 60000);
        return () => clearInterval(interval);
    }, [periodPesadas]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!data) return <div>Error loading dashboard</div>;

    const COLORS = ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b'];

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Panel de Control</h1>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Usuarios Activos" value={data.usuarios} icon={Users} color="blue" />
                <KpiCard title="Colaboradores" value={data.colaboradores} icon={Users} color="green" />
                <KpiCard title="Pesadas (Hoy)" value={data.pesadas_count} icon={Truck} color="indigo" />
                <KpiCard title="Capacitaciones (Mes)" value={data.capacitaciones_mes} icon={GraduationCap} color="yellow" />
                <KpiCard title="Evaluaciones OK" value={data.evaluaciones_realizadas} icon={ClipboardCheck} color="purple" />
                <KpiCard title="Fecha Corte" value={formatDate(data.fecha_corte)} icon={Calendar} color="red" isDate />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Weighings Chart (Wide) */}
                <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-700">Resumen de Pesajes</h3>
                        <select
                            className="text-sm border-none bg-gray-50 rounded px-2 py-1 font-medium text-gray-600 focus:ring-0 cursor-pointer hover:bg-gray-100"
                            value={periodPesadas}
                            onChange={(e) => setPeriodPesadas(e.target.value)}
                        >
                            <option value="week">Semana</option>
                            <option value="month">Mes</option>
                            <option value="year">Año</option>
                        </select>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.chart_pesadas}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="fecha" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                <RechartsTooltip
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Line type="monotone" dataKey="total" stroke="#4e73df" strokeWidth={3} dot={{ r: 4, fill: '#4e73df', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Products Chart (Narrow) */}
                <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                    <h3 className="font-bold text-gray-700 mb-4">Top 5 Productos</h3>
                    <div className="h-64 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.chart_productos}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="total"
                                >
                                    {data.chart_productos.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                                <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 gap-6">
                <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                    <h3 className="font-bold text-gray-700 mb-4">Evaluaciones por Tema</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.chart_evaluaciones_tema}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="tema" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} interval={0} />
                                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                                <RechartsTooltip cursor={{ fill: '#f3f4f6' }} />
                                <Bar dataKey="total" fill="#4e73df" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Tables Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Recent Trainings */}
                <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-blue-500" />
                        Capacitaciones Recientes
                    </h3>
                    <div className="overflow-hidden rounded-lg border border-gray-100">
                        <table className="w-full text-sm">
                            <thead className="bg-blue-50 text-blue-800">
                                <tr>
                                    <th className="px-4 py-2 text-left">Nombre</th>
                                    <th className="px-4 py-2 text-left">Fecha</th>
                                    <th className="px-4 py-2 text-center">Asistentes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.capacitaciones_recientes.length > 0 ? (
                                    data.capacitaciones_recientes.map((item, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="px-4 py-2">{item.nombre}</td>
                                            <td className="px-4 py-2 text-gray-500">{formatDate(item.fecha)}</td>
                                            <td className="px-4 py-2 text-center font-medium bg-gray-50">{item.asistentes}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-4 text-center text-gray-400">Sin capacitaciones recientes</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Placeholder for Agronomia or other recent activity */}
                <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-green-500" />
                        Accesos Recientes (Portería)
                    </h3>
                    <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg text-gray-400">
                        <span>Próximamente: Datos de Portería en tiempo real</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const KpiCard = ({ title, value, icon: Icon, color }: { title: string, value: string | number, icon: React.ElementType, color: string, isDate?: boolean }) => {
    const colorClasses: { [key: string]: string } = {
        blue: 'text-blue-600 border-l-blue-600',
        green: 'text-green-600 border-l-green-600',
        indigo: 'text-indigo-600 border-l-indigo-600',
        yellow: 'text-yellow-600 border-l-yellow-600',
        purple: 'text-purple-600 border-l-purple-600',
        red: 'text-red-600 border-l-red-600',
    };

    const bgClasses: { [key: string]: string } = {
        blue: 'bg-blue-50',
        green: 'bg-green-50',
        indigo: 'bg-indigo-50',
        yellow: 'bg-yellow-50',
        purple: 'bg-purple-50',
        red: 'bg-red-50',
    };

    return (
        <div className={`bg-white rounded-lg shadow p-4 border-l-4 ${colorClasses[color].split(' ')[1]}`}>
            <div className="flex justify-between items-center">
                <div>
                    <h4 className={`text-xs font-bold uppercase mb-1 ${colorClasses[color].split(' ')[0]}`}>{title}</h4>
                    <div className="text-xl font-bold text-gray-800">{value}</div>
                </div>
                <div className={`p-3 rounded-full ${bgClasses[color]}`}>
                    <Icon className={`w-6 h-6 ${colorClasses[color].split(' ')[0]}`} />
                </div>
            </div>
        </div>
    );
};

const formatDate = (isoString: string | null) => {
    if (!isoString) return '--';
    // Handle both YYYY-MM-DD and just date
    try {
        const date = new Date(isoString);
        return new Intl.DateTimeFormat('es-CO').format(date);
    } catch {
        return isoString;
    }
};

export default HomePage;
