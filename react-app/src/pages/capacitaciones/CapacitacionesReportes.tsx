import React, { useState, useEffect } from 'react';
import { FileText, Download, Filter, User, RefreshCw } from 'lucide-react';
import { capacitacionService, type ConsultaCapacitacion, type ConsultaPorPersona } from './services/capacitacionService';
import { exportToCSV } from '../../utils/exportUtils';

const CapacitacionesReportes: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'capacitaciones' | 'personas'>('capacitaciones');
    const [loading, setLoading] = useState(false);

    // Data State
    const [consultas, setConsultas] = useState<ConsultaCapacitacion[]>([]);
    const [personas, setPersonas] = useState<ConsultaPorPersona[]>([]);

    // Filters
    const [filters, setFilters] = useState<any>({});

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'capacitaciones') {
                const data = await capacitacionService.getConsultasCapacitacion();
                setConsultas(data);
            } else {
                const data = await capacitacionService.getConsultasPorPersona();
                setPersonas(data);
            }
        } catch (error) {
            console.error("Error loading data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key: string, value: string) => {
        setFilters((prev: any) => ({ ...prev, [key]: value }));
    };

    const getFilteredData = () => {
        if (activeTab === 'capacitaciones') {
            return consultas.filter(item => {
                return Object.keys(filters).every(key => {
                    if (!filters[key]) return true;
                    const itemValue = String((item as any)[key] || '').toLowerCase();
                    return itemValue.includes(filters[key].toLowerCase());
                });
            });
        } else {
            return personas.filter(item => {
                return Object.keys(filters).every(key => {
                    if (!filters[key]) return true;
                    const itemValue = String((item as any)[key] || '').toLowerCase();
                    return itemValue.includes(filters[key].toLowerCase());
                });
            });
        }
    };

    const filteredData = getFilteredData();

    const handleExport = () => {
        const filename = activeTab === 'capacitaciones' ? 'reporte_capacitaciones' : 'reporte_por_persona';
        exportToCSV(filteredData, filename);
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <FileText className="w-8 h-8 text-blue-600" />
                    Consultas y Reportes
                </h1>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    title="Exportar a CSV"
                >
                    <Download className="w-4 h-4" />
                    Exportar
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-gray-200">
                <button
                    onClick={() => { setActiveTab('capacitaciones'); setFilters({}); }}
                    className={`pb-2 px-4 font-medium flex items-center gap-2 transition-colors ${activeTab === 'capacitaciones'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <RefreshCw className="w-4 h-4" />
                    Capacitaciones Realizadas
                </button>
                <button
                    onClick={() => { setActiveTab('personas'); setFilters({}); }}
                    className={`pb-2 px-4 font-medium flex items-center gap-2 transition-colors ${activeTab === 'personas'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <User className="w-4 h-4" />
                    Por Colaborador
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-100">
                <div className="flex items-center gap-2 mb-4 text-gray-600">
                    <Filter className="w-4 h-4" />
                    <span className="font-medium">Filtros</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {activeTab === 'capacitaciones' ? (
                        <>
                            <input
                                type="text"
                                placeholder="Filtrar por Tema..."
                                className="border rounded p-2 text-sm"
                                onChange={(e) => handleFilterChange('tema', e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="Filtrar por Capacitador..."
                                className="border rounded p-2 text-sm"
                                onChange={(e) => handleFilterChange('capacitador', e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="Filtrar por Fecha..."
                                className="border rounded p-2 text-sm"
                                onChange={(e) => handleFilterChange('fecha', e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="Filtrar por Lugar..."
                                className="border rounded p-2 text-sm"
                                onChange={(e) => handleFilterChange('lugar', e.target.value)}
                            />
                        </>
                    ) : (
                        <>
                            <input
                                type="text"
                                placeholder="Filtrar por Cédula..."
                                className="border rounded p-2 text-sm"
                                onChange={(e) => handleFilterChange('cedula', e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="Filtrar por Nombre..."
                                className="border rounded p-2 text-sm"
                                onChange={(e) => handleFilterChange('nombres_apellidos', e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="Filtrar por Cargo..."
                                className="border rounded p-2 text-sm"
                                onChange={(e) => handleFilterChange('cargo', e.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="Filtrar por Área..."
                                className="border rounded p-2 text-sm"
                                onChange={(e) => handleFilterChange('sub_area', e.target.value)}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Cargando datos...</div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-700 font-medium border-b">
                                <tr>
                                    {activeTab === 'capacitaciones' ? (
                                        <>
                                            <th className="px-4 py-3">ID</th>
                                            <th className="px-4 py-3">Fecha</th>
                                            <th className="px-4 py-3">Tema</th>
                                            <th className="px-4 py-3">Capacitador</th>
                                            <th className="px-4 py-3">Lugar</th>
                                            <th className="px-4 py-3">Asistentes</th>
                                            <th className="px-4 py-3">Registrado Por</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="px-4 py-3">Cédula</th>
                                            <th className="px-4 py-3">Colaborador</th>
                                            <th className="px-4 py-3">Cargo</th>
                                            <th className="px-4 py-3">Área</th>
                                            <th className="px-4 py-3 text-center">Realizadas</th>
                                            <th className="px-4 py-3 text-center">Pendientes</th>
                                            <th className="px-4 py-3 text-center">Evaluaciones</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredData.length > 0 ? filteredData.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        {activeTab === 'capacitaciones' ? (
                                            <>
                                                <td className="px-4 py-3 text-gray-600">#{item.id}</td>
                                                <td className="px-4 py-3">{item.fecha}</td>
                                                <td className="px-4 py-3 font-medium text-blue-600">{item.tema}</td>
                                                <td className="px-4 py-3">{item.capacitador}</td>
                                                <td className="px-4 py-3">{item.lugar}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-blue-100 bg-blue-600 rounded-full">
                                                        {item.total_asistentes}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-500">
                                                    {item.creado_por_nombre}
                                                    {item.editado_por_nombre && (
                                                        <div className="text-gray-400 italic">Ed: {item.editado_por_nombre}</div>
                                                    )}
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-4 py-3 text-gray-600">{item.cedula}</td>
                                                <td className="px-4 py-3 font-medium">{item.nombres_apellidos}</td>
                                                <td className="px-4 py-3">{item.cargo}</td>
                                                <td className="px-4 py-3 text-xs">{item.sub_area}</td>
                                                <td className="px-4 py-3 text-center text-green-600 font-bold">{item.capacitaciones_realizadas}</td>
                                                <td className="px-4 py-3 text-center text-orange-500 font-bold">{item.capacitaciones_pendientes}</td>
                                                <td className="px-4 py-3 text-center text-gray-600">
                                                    {item.evaluaciones_realizadas} / {item.evaluaciones_asignadas}
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-8 text-center text-gray-500 italic">
                                            No se encontraron registros
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="bg-gray-50 px-4 py-3 border-t text-xs text-gray-500 flex justify-between items-center">
                    <span>Mostrando {filteredData.length} registros</span>
                    <span>Generado el {new Date().toLocaleDateString()}</span>
                </div>
            </div>
        </div>
    );
};

export default CapacitacionesReportes;
